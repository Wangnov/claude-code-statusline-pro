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

    match &app.mode {
        Mode::Normal => Ok(handle_normal(app, key)),
        Mode::EditText(_) => Ok(handle_edit_text(app, key)),
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
    match key.code {
        KeyCode::Char('q') => {
            app.request_quit();
            Ok(false)
        }
        KeyCode::Char('s') => {
            app.save()?;
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
        KeyCode::Char(c) => {
            app.edit_push_char(c);
            false
        }
        _ => false,
    }
}
