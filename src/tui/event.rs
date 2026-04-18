//! 事件循环与按键分发

use std::time::Duration;

use anyhow::Result;
use ratatui::backend::Backend;
use ratatui::crossterm::event::{self, Event, KeyCode, KeyEvent, KeyEventKind, KeyModifiers};
use ratatui::Terminal;

use crate::tui::app::{App, Focus, Mode};
use crate::tui::view;

pub async fn run_loop<B: Backend>(terminal: &mut Terminal<B>, app: &mut App) -> Result<()> {
    while !app.should_quit {
        terminal.draw(|frame| view::render(frame, app))?;

        if event::poll(Duration::from_millis(200))? {
            if let Event::Key(key) = event::read()? {
                if key.kind == KeyEventKind::Press {
                    let preview_changed = handle_key(app, key).await?;
                    if preview_changed {
                        app.refresh_preview().await;
                    }
                }
            }
        }
    }
    Ok(())
}

/// 处理一次按键;返回 `true` 表示配置可能已变,需要刷新预览。
async fn handle_key(app: &mut App, key: KeyEvent) -> Result<bool> {
    // 全局 Ctrl 组合
    if key.modifiers.contains(KeyModifiers::CONTROL) {
        return handle_ctrl(app, key).await;
    }

    if app.help_visible {
        match key.code {
            KeyCode::Char('?') | KeyCode::Esc => app.toggle_help(),
            _ => {}
        }
        return Ok(false);
    }

    if app.merge_report_visible {
        match key.code {
            KeyCode::F(2) | KeyCode::Esc => app.toggle_merge_report(),
            _ => {}
        }
        return Ok(false);
    }

    if app.search.is_some() {
        return Ok(handle_search(app, key));
    }

    if app.widget_new.is_some() {
        return Ok(handle_widget_new(app, key));
    }

    match &app.mode {
        Mode::Normal => Ok(handle_normal(app, key)),
        Mode::EditText(_) => Ok(handle_edit_text(app, key)),
    }
}

fn handle_widget_new(app: &mut App, key: KeyEvent) -> bool {
    match key.code {
        KeyCode::Esc => {
            app.widget_close_new_dialog();
            false
        }
        KeyCode::Enter => {
            app.widget_new_commit();
            true
        }
        KeyCode::Backspace => {
            app.widget_new_backspace();
            false
        }
        KeyCode::Char(c) => {
            app.widget_new_insert_char(c);
            false
        }
        _ => false,
    }
}

fn handle_search(app: &mut App, key: KeyEvent) -> bool {
    match key.code {
        KeyCode::Esc => {
            app.close_search();
            false
        }
        KeyCode::Enter => {
            app.search_commit();
            false
        }
        KeyCode::Up => {
            app.search_move(-1);
            false
        }
        KeyCode::Down => {
            app.search_move(1);
            false
        }
        KeyCode::Backspace => {
            app.search_backspace();
            false
        }
        KeyCode::Char(c) => {
            app.search_push_char(c);
            false
        }
        _ => false,
    }
}

async fn handle_ctrl(app: &mut App, key: KeyEvent) -> Result<bool> {
    // 文本编辑模式里只放行安全的 Ctrl 组合:
    // - Ctrl+A / Ctrl+E 行首/行尾(编辑器自己的键)
    // - Ctrl+Q 直接退出(用户放弃编辑,可接受)
    // - Ctrl+T 会改 section_idx/field_idx,把 buffer 指向另一个字段后的
    //   Enter 会把错误内容写进新字段。必须拒绝。
    // - Ctrl+S 如果直接放行,save() 看到的是 *还没 commit 的 document*;
    //   写盘后报 "已保存",但用户刚打的字只在 EditBuffer 里,退出就丢了。
    //   策略和 Ctrl+T 一致:显式报错,不做隐式 commit-then-save(commit
    //   可能因类型校验失败而回滚 buffer,那时再 save 等于把脏旧 doc 写盘,
    //   产生"明明提示更新失败却还是保存成功"的矛盾 UX)。
    if matches!(app.mode, Mode::EditText(_)) {
        match key.code {
            KeyCode::Char('a') => {
                app.edit_home();
                return Ok(false);
            }
            KeyCode::Char('e') => {
                app.edit_end();
                return Ok(false);
            }
            KeyCode::Char('t') => {
                app.notify_error("编辑进行中,请先 Enter 提交或 Esc 取消,再切 scope");
                return Ok(false);
            }
            KeyCode::Char('s') => {
                app.notify_error("编辑进行中,请先 Enter 提交或 Esc 取消,再 Ctrl+S 保存");
                return Ok(false);
            }
            KeyCode::Char('r') => {
                // 和 Ctrl+S / Ctrl+T 一样:revert 只会重置 document 和 dirty,
                // 不会清 EditBuffer。如果这里放行,用户会看到"已撤销"的提示,
                // 然后下一下 Enter 就把旧 buffer 的内容原封不动地写进刚刚
                // revert 回来的 document,等于"revert 一下反而写进了旧修改"。
                // 显式 block 并告诉用户怎么操作。
                app.notify_error("编辑进行中,请先 Enter 提交或 Esc 取消,再 Ctrl+R 撤销");
                return Ok(false);
            }
            _ => {}
        }
    }

    match key.code {
        KeyCode::Char('q') => {
            app.request_quit();
            Ok(false)
        }
        KeyCode::Char('s') => {
            app.save().await?;
            Ok(true)
        }
        KeyCode::Char('r') => {
            app.revert();
            Ok(true)
        }
        KeyCode::Char('m') => {
            app.cycle_mock();
            Ok(true)
        }
        KeyCode::Char('t') => {
            app.switch_scope().await;
            Ok(true)
        }
        _ => Ok(false),
    }
}

fn handle_normal(app: &mut App, key: KeyEvent) -> bool {
    // Widgets Tab 有独立的键集合
    if app.is_widgets_tab() {
        return handle_widgets_tab(app, key);
    }

    let mut changed = false;
    match key.code {
        KeyCode::Tab | KeyCode::Right => app.next_tab(),
        KeyCode::BackTab | KeyCode::Left => app.prev_tab(),
        KeyCode::Up => {
            app.focus = Focus::Fields;
            app.prev_field();
        }
        KeyCode::Down => {
            app.focus = Focus::Fields;
            app.next_field();
        }
        KeyCode::Char(' ') => {
            app.space_action();
            changed = true;
        }
        KeyCode::Enter => {
            app.begin_edit();
            changed = matches!(app.mode, Mode::Normal);
        }
        KeyCode::Char('?') => app.toggle_help(),
        KeyCode::Char('/') => app.open_search(),
        KeyCode::F(2) => app.toggle_merge_report(),
        _ => {}
    }
    changed
}

fn handle_widgets_tab(app: &mut App, key: KeyEvent) -> bool {
    match key.code {
        KeyCode::Tab | KeyCode::Right => {
            app.next_tab();
            false
        }
        KeyCode::BackTab | KeyCode::Left => {
            app.prev_tab();
            false
        }
        KeyCode::Up => {
            app.widget_prev();
            false
        }
        KeyCode::Down => {
            app.widget_next();
            false
        }
        KeyCode::Char(' ') => {
            app.widget_toggle_enabled();
            true
        }
        KeyCode::Char('t') => {
            app.widget_cycle_type();
            true
        }
        KeyCode::Char('d') | KeyCode::Delete => {
            app.widget_delete();
            true
        }
        KeyCode::Char('n') => {
            app.widget_open_new_dialog();
            false
        }
        KeyCode::Char('?') => {
            app.toggle_help();
            false
        }
        KeyCode::Char('/') => {
            app.open_search();
            false
        }
        KeyCode::F(2) => {
            app.toggle_merge_report();
            false
        }
        _ => false,
    }
}

fn handle_edit_text(app: &mut App, key: KeyEvent) -> bool {
    // Ctrl 组合键已经在外层 handle_ctrl 里处理了;这里只处理普通键。
    match key.code {
        KeyCode::Esc => {
            app.cancel_edit();
            false
        }
        KeyCode::Enter => {
            app.commit_edit();
            true
        }
        KeyCode::Backspace => {
            app.edit_backspace();
            false
        }
        KeyCode::Delete => {
            app.edit_delete();
            false
        }
        KeyCode::Left => {
            app.edit_move_left();
            false
        }
        KeyCode::Right => {
            app.edit_move_right();
            false
        }
        KeyCode::Home => {
            app.edit_home();
            false
        }
        KeyCode::End => {
            app.edit_end();
            false
        }
        KeyCode::Char(c) => {
            app.edit_insert_char(c);
            false
        }
        _ => false,
    }
}
