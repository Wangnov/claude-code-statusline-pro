//! ratatui 渲染层

use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Color, Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, List, ListItem, ListState, Paragraph, Tabs, Wrap};
use ratatui::Frame;

use claude_code_statusline_pro::config::ConfigSourceType;

use crate::tui::app::{App, EditBuffer, EditScope, Focus, MessageKind, Mode};
use crate::tui::sections::{FieldKind, SECTIONS};
use crate::tui::{get_field_display, get_mock_label};

pub fn render(frame: &mut Frame, app: &App) {
    let size = frame.area();

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(2), // header
            Constraint::Length(3), // tabs
            Constraint::Min(6),    // body
            Constraint::Length(5), // preview
            Constraint::Length(2), // footer
        ])
        .split(size);

    render_header(frame, chunks[0], app);
    render_tabs(frame, chunks[1], app);
    render_body(frame, chunks[2], app);
    render_preview(frame, chunks[3], app);
    render_footer(frame, chunks[4], app);

    if let Mode::EditText(buffer) = &app.mode {
        render_edit_overlay(frame, size, app, buffer);
    }
    if app.search.is_some() {
        render_search_overlay(frame, size, app);
    }
    if app.widget_new.is_some() {
        render_widget_new_overlay(frame, size, app);
    }
    if app.merge_report_visible {
        render_merge_report(frame, size, app);
    }
    if app.help_visible {
        render_help(frame, size);
    }
}

fn render_header(frame: &mut Frame, area: Rect, app: &App) {
    let scope_label = match app.options.scope {
        EditScope::User => "用户级",
        EditScope::Project => "项目级",
        EditScope::Custom => "自定义",
    };
    let dirty_mark = if app.dirty { " (未保存 *)" } else { "" };

    let line1 = Line::from(vec![
        Span::styled(
            " ccsp config editor ",
            Style::default()
                .fg(Color::Black)
                .bg(Color::Cyan)
                .add_modifier(Modifier::BOLD),
        ),
        Span::raw("  "),
        Span::styled(
            format!("{scope_label}{dirty_mark}"),
            Style::default().fg(Color::Yellow),
        ),
    ]);
    let line2 = Line::from(Span::styled(
        app.options.path.display().to_string(),
        Style::default().fg(Color::DarkGray),
    ));
    frame.render_widget(Paragraph::new(vec![line1, line2]), area);
}

fn render_tabs(frame: &mut Frame, area: Rect, app: &App) {
    let titles: Vec<Line> = SECTIONS
        .iter()
        .map(|s| Line::from(Span::raw(s.title)))
        .collect();
    let tabs = Tabs::new(titles)
        .block(Block::default().borders(Borders::BOTTOM).title(" 分段 "))
        .select(app.section_idx)
        .highlight_style(
            Style::default()
                .fg(Color::Black)
                .bg(Color::Yellow)
                .add_modifier(Modifier::BOLD),
        );
    frame.render_widget(tabs, area);
}

fn render_body(frame: &mut Frame, area: Rect, app: &App) {
    let horizontal = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(55), Constraint::Percentage(45)])
        .split(area);

    if app.is_widgets_tab() {
        render_widget_list(frame, horizontal[0], app);
        render_widget_help(frame, horizontal[1], app);
    } else {
        render_field_list(frame, horizontal[0], app);
        render_field_help(frame, horizontal[1], app);
    }
}

fn render_widget_list(frame: &mut Frame, area: Rect, app: &App) {
    let flat = app.flat_widgets();
    let items: Vec<ListItem> = flat
        .iter()
        .map(|&(fi, ei)| {
            let file = &app.widget_files[fi];
            let entry = &file.entries[ei];
            let enabled_mark = if entry.enabled {
                Span::styled("●", Style::default().fg(Color::Green))
            } else {
                Span::styled("○", Style::default().fg(Color::DarkGray))
            };
            let type_style = if entry.kind == "api" {
                Style::default().fg(Color::LightBlue)
            } else {
                Style::default().fg(Color::Gray)
            };
            let line = Line::from(vec![
                enabled_mark,
                Span::raw(" "),
                Span::styled(
                    format!("{:<14}", file.component),
                    Style::default().fg(Color::Cyan),
                ),
                Span::styled(
                    format!("{:<22}", entry.name),
                    Style::default().fg(Color::White),
                ),
                Span::styled(format!(" [{}]", entry.kind), type_style),
                Span::styled(
                    format!("  r{} c{}", entry.row, entry.col),
                    Style::default().fg(Color::DarkGray),
                ),
            ]);
            ListItem::new(line)
        })
        .collect();

    let title = format!(" Widgets · 共 {} 个 ", flat.len());
    let list = List::new(items)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(title)
                .border_style(Style::default().fg(Color::Yellow)),
        )
        .highlight_style(
            Style::default()
                .bg(Color::DarkGray)
                .add_modifier(Modifier::BOLD),
        )
        .highlight_symbol("▶ ");

    let mut state = ListState::default();
    if !flat.is_empty() {
        state.select(Some(app.widget_cursor.min(flat.len().saturating_sub(1))));
    }
    frame.render_stateful_widget(list, area, &mut state);
}

fn render_widget_help(frame: &mut Frame, area: Rect, app: &App) {
    let mut lines = vec![
        Line::from(Span::styled(
            "Widgets 管理",
            Style::default()
                .fg(Color::Yellow)
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "● 启用   ○ 禁用",
            Style::default().fg(Color::Gray),
        )),
        Line::from(""),
        Line::from("  ↑↓      上下选择"),
        Line::from("  n       新增(输入名字)"),
        Line::from("  Space   切 enabled"),
        Line::from("  t       切 type (static → api → input)"),
        Line::from("  d/Del   删除(无二次确认)"),
        Line::from(""),
    ];

    let flat = app.flat_widgets();
    if let Some(&(fi, ei)) = flat.get(app.widget_cursor) {
        let file = &app.widget_files[fi];
        let entry = &file.entries[ei];
        lines.push(Line::from(Span::styled(
            "— 当前选中 —",
            Style::default().fg(Color::DarkGray),
        )));
        lines.push(Line::from(vec![
            Span::styled("组件: ", Style::default().fg(Color::DarkGray)),
            Span::styled(file.component.clone(), Style::default().fg(Color::Cyan)),
        ]));
        lines.push(Line::from(vec![
            Span::styled("名字: ", Style::default().fg(Color::DarkGray)),
            Span::styled(entry.name.clone(), Style::default().fg(Color::White)),
        ]));
        lines.push(Line::from(vec![
            Span::styled("类型: ", Style::default().fg(Color::DarkGray)),
            Span::styled(entry.kind.clone(), Style::default().fg(Color::LightBlue)),
        ]));
        lines.push(Line::from(vec![
            Span::styled("位置: ", Style::default().fg(Color::DarkGray)),
            Span::styled(
                format!("row {} col {}", entry.row, entry.col),
                Style::default().fg(Color::Magenta),
            ),
        ]));
        lines.push(Line::from(Span::styled(
            format!("文件: {}", file.path.display()),
            Style::default().fg(Color::DarkGray),
        )));
    } else {
        lines.push(Line::from(Span::styled(
            "(未发现任何 widget)",
            Style::default().fg(Color::DarkGray),
        )));
        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled(
            "复制 configs/components/ 下模板到 ~/.claude/statusline-pro/components/,",
            Style::default().fg(Color::Gray),
        )));
        lines.push(Line::from(Span::styled(
            "或 ccsp config init -w 自动复制。",
            Style::default().fg(Color::Gray),
        )));
    }

    let help = Paragraph::new(lines)
        .wrap(Wrap { trim: false })
        .block(Block::default().borders(Borders::ALL).title(" 说明 "));
    frame.render_widget(help, area);
}

fn render_field_list(frame: &mut Frame, area: Rect, app: &App) {
    let section = app.current_section();
    let items: Vec<ListItem> = section
        .fields
        .iter()
        .map(|f| {
            let value = get_field_display(&app.document, f);
            let line = Line::from(vec![
                Span::styled(format!("{:<22}", f.label), Style::default().fg(Color::Cyan)),
                Span::raw(" "),
                Span::styled(value, Style::default().fg(Color::White)),
            ]);
            ListItem::new(line)
        })
        .collect();

    let title = if app.focus == Focus::Fields {
        format!(" 字段 · {} ", section.title)
    } else {
        format!("   字段 · {} ", section.title)
    };
    let border_style = if app.focus == Focus::Fields {
        Style::default().fg(Color::Yellow)
    } else {
        Style::default().fg(Color::DarkGray)
    };

    let list = List::new(items)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(title)
                .border_style(border_style),
        )
        .highlight_style(
            Style::default()
                .bg(Color::DarkGray)
                .add_modifier(Modifier::BOLD),
        )
        .highlight_symbol("▶ ");

    let mut state = ListState::default();
    state.select(Some(app.field_idx));
    frame.render_stateful_widget(list, area, &mut state);
}

fn render_field_help(frame: &mut Frame, area: Rect, app: &App) {
    let mut lines = Vec::new();
    lines.push(Line::from(Span::styled(
        app.current_section().help,
        Style::default().fg(Color::Gray),
    )));
    lines.push(Line::from(""));

    if let Some(field) = app.current_field() {
        lines.push(Line::from(vec![
            Span::styled("字段: ", Style::default().fg(Color::DarkGray)),
            Span::styled(field.label, Style::default().fg(Color::Cyan)),
        ]));
        lines.push(Line::from(vec![
            Span::styled("路径: ", Style::default().fg(Color::DarkGray)),
            Span::styled(field.path, Style::default().fg(Color::White)),
        ]));
        lines.push(Line::from(vec![
            Span::styled("类型: ", Style::default().fg(Color::DarkGray)),
            Span::styled(kind_label(&field.kind), Style::default().fg(Color::Magenta)),
        ]));
        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled(
            field.help,
            Style::default().fg(Color::LightYellow),
        )));

        // Color 字段:渲染当前值 + 色板预览
        if matches!(field.kind, FieldKind::Color) {
            lines.push(Line::from(""));
            let current = crate::tui::io::get_string(&app.document, field.path);
            if let Some(value) = current.as_deref() {
                let color = parse_color_name(value);
                lines.push(Line::from(vec![
                    Span::styled("当前: ", Style::default().fg(Color::DarkGray)),
                    Span::styled("■■■", Style::default().fg(color)),
                    Span::raw("  "),
                    Span::styled(value.to_string(), Style::default().fg(Color::White)),
                ]));
            } else {
                lines.push(Line::from(Span::styled(
                    "当前: (未设置)",
                    Style::default().fg(Color::DarkGray),
                )));
            }
            lines.push(Line::from(Span::styled(
                "色板(Space 循环):",
                Style::default().fg(Color::DarkGray),
            )));
            // 渲染标准色板
            for row_slice in crate::tui::sections::COLOR_PALETTE.chunks(6) {
                let mut spans = vec![Span::raw("  ")];
                for name in row_slice {
                    let color = parse_color_name(name);
                    spans.push(Span::styled("■ ", Style::default().fg(color)));
                    spans.push(Span::styled(
                        format!("{name:<15}"),
                        Style::default().fg(Color::Gray),
                    ));
                }
                lines.push(Line::from(spans));
            }
        }
    }

    // 多行 Tab 下追加 widgets 概览
    if app.current_section().title == "多行" {
        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled(
            "— 检测到的 widgets —",
            Style::default()
                .fg(Color::DarkGray)
                .add_modifier(Modifier::BOLD),
        )));
        if app.widget_summaries.is_empty() {
            lines.push(Line::from(Span::styled(
                "(未发现 components/*.toml。复制 configs/components/ 下模板到 ~/.claude/statusline-pro/components/)",
                Style::default().fg(Color::DarkGray),
            )));
        } else {
            for summary in &app.widget_summaries {
                let names = if summary.widget_names.is_empty() {
                    "(空)".to_string()
                } else {
                    summary.widget_names.join(", ")
                };
                lines.push(Line::from(vec![
                    Span::styled("  ", Style::default()),
                    Span::styled(
                        format!("{}.toml", summary.component),
                        Style::default().fg(Color::Cyan),
                    ),
                    Span::styled(
                        format!(" · {} widgets", summary.widget_names.len()),
                        Style::default().fg(Color::DarkGray),
                    ),
                ]));
                lines.push(Line::from(Span::styled(
                    format!("    path: {}", summary.file_path.display()),
                    Style::default().fg(Color::DarkGray),
                )));
                lines.push(Line::from(Span::styled(
                    format!("    {names}"),
                    Style::default().fg(Color::Gray),
                )));
            }
        }
    }

    let help = Paragraph::new(lines)
        .wrap(Wrap { trim: false })
        .block(Block::default().borders(Borders::ALL).title(" 说明 "));
    frame.render_widget(help, area);
}

fn render_preview(frame: &mut Frame, area: Rect, app: &App) {
    let mock_label = get_mock_label(app.current_mock());
    let title = format!(" 实时预览 (mock: {mock_label}) — Ctrl+M 切换场景 ");

    let lines: Vec<Line> = if app.preview_lines.is_empty() {
        vec![Line::from(Span::styled(
            "(无内容)",
            Style::default().fg(Color::DarkGray),
        ))]
    } else {
        app.preview_lines.clone()
    };

    let paragraph = Paragraph::new(lines)
        .block(Block::default().borders(Borders::ALL).title(title))
        .wrap(Wrap { trim: false });
    frame.render_widget(paragraph, area);
}

fn render_footer(frame: &mut Frame, area: Rect, app: &App) {
    let help_line = Line::from(vec![
        Span::styled("^S", Style::default().fg(Color::Yellow)),
        Span::raw(" 保存  "),
        Span::styled("^R", Style::default().fg(Color::Yellow)),
        Span::raw(" 撤销  "),
        Span::styled("^M", Style::default().fg(Color::Yellow)),
        Span::raw(" 切 mock  "),
        Span::styled("Tab", Style::default().fg(Color::Yellow)),
        Span::raw(" 下个分段  "),
        Span::styled("Enter", Style::default().fg(Color::Yellow)),
        Span::raw(" 编辑  "),
        Span::styled("?", Style::default().fg(Color::Yellow)),
        Span::raw(" 帮助  "),
        Span::styled("^Q", Style::default().fg(Color::Yellow)),
        Span::raw(" 退出"),
    ]);

    let status_line = if let Some((msg, kind)) = &app.message {
        let color = match kind {
            MessageKind::Info => Color::Cyan,
            MessageKind::Success => Color::Green,
            MessageKind::Error => Color::Red,
        };
        Line::from(Span::styled(msg.clone(), Style::default().fg(color)))
    } else {
        Line::from("")
    };

    frame.render_widget(Paragraph::new(vec![help_line, status_line]), area);
}

fn render_edit_overlay(frame: &mut Frame, area: Rect, app: &App, buffer: &EditBuffer) {
    let rect = centered_rect(60, 5, area);
    frame.render_widget(Clear, rect);

    let label = app
        .current_field()
        .map_or_else(|| "编辑".to_string(), |f| format!("编辑: {}", f.path));

    // 三段渲染:光标前 + 光标块(高亮光标下字符或末尾方块) + 光标后
    let before = buffer.before_cursor().to_string();
    let after_str = buffer.after_cursor();
    let (cursor_char, rest_after) = match after_str.chars().next() {
        Some(ch) => (ch.to_string(), &after_str[ch.len_utf8()..]),
        None => ("▌".to_string(), ""),
    };

    let cursor_style = Style::default()
        .fg(Color::Black)
        .bg(Color::Yellow)
        .add_modifier(Modifier::BOLD);

    let text = Line::from(vec![
        Span::styled("▶ ", Style::default().fg(Color::Yellow)),
        Span::raw(before),
        Span::styled(cursor_char, cursor_style),
        Span::raw(rest_after.to_string()),
    ]);
    let hint = Line::from(Span::styled(
        "Enter 提交   Esc 取消   ←→/Home/End/Ctrl+A/E 移光标   Delete 删后   Backspace 删前",
        Style::default().fg(Color::DarkGray),
    ));

    let para = Paragraph::new(vec![text, Line::from(""), hint]).block(
        Block::default()
            .borders(Borders::ALL)
            .title(label)
            .border_style(Style::default().fg(Color::Yellow)),
    );
    frame.render_widget(para, rect);
}

fn render_help(frame: &mut Frame, area: Rect) {
    let rect = centered_rect(72, 22, area);
    frame.render_widget(Clear, rect);

    let lines = vec![
        Line::from(Span::styled(
            " 快捷键帮助 ",
            Style::default()
                .fg(Color::Black)
                .bg(Color::Cyan)
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from("  Tab / Shift+Tab / ← →    切换分段"),
        Line::from("  ↑ ↓                      字段上下移动"),
        Line::from("  Enter                     编辑当前字段(Color/Int/Float 进文本)"),
        Line::from("  Space                     Bool 翻转 / Enum / Color 循环下一个"),
        Line::from("  /                         跨分段搜索字段"),
        Line::from("  F2                        查看配置合并报告"),
        Line::from("  Ctrl+T                    切换 scope(user ↔ project)"),
        Line::from("  Ctrl+S / Ctrl+R           保存 / 撤销"),
        Line::from("  Ctrl+M                    切换 mock 场景"),
        Line::from("  Ctrl+Q / ? / Esc          退出 / 帮助 / 关闭浮层"),
        Line::from(""),
        Line::from(Span::styled(
            "  — 文本编辑模式下 —",
            Style::default().fg(Color::DarkGray),
        )),
        Line::from("  ← → / Ctrl+A E / Home End  光标移动"),
        Line::from("  Backspace / Delete         删前 / 删后"),
        Line::from("  Enter / Esc                提交 / 放弃"),
        Line::from(""),
        Line::from(Span::styled(
            "  注意:保存前会做一次 TOML → Config 校验,不合法不会写盘。",
            Style::default().fg(Color::DarkGray),
        )),
    ];
    let para = Paragraph::new(lines).block(
        Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(Color::Cyan)),
    );
    frame.render_widget(para, rect);
}

fn render_widget_new_overlay(frame: &mut Frame, area: Rect, app: &App) {
    let Some(dialog) = app.widget_new.as_ref() else {
        return;
    };

    let rect = centered_rect(60, 9, area);
    frame.render_widget(Clear, rect);

    let before = dialog.name.before_cursor().to_string();
    let after = dialog.name.after_cursor();
    let (cursor_char, rest) = match after.chars().next() {
        Some(ch) => (ch.to_string(), &after[ch.len_utf8()..]),
        None => ("▌".to_string(), ""),
    };

    let lines = vec![
        Line::from(Span::styled(
            format!("目标文件: {}", dialog.target_path.display()),
            Style::default().fg(Color::DarkGray),
        )),
        Line::from(Span::styled(
            format!("归属组件: {}", dialog.target_component),
            Style::default().fg(Color::Cyan),
        )),
        Line::from(""),
        Line::from(vec![
            Span::styled("新 widget 名字: ", Style::default().fg(Color::White)),
            Span::raw(before),
            Span::styled(
                cursor_char,
                Style::default()
                    .fg(Color::Black)
                    .bg(Color::Yellow)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::raw(rest.to_string()),
        ]),
        Line::from(""),
        Line::from(Span::styled(
            "默认模板: type=static, row=1, col=0, content=\"new widget\"",
            Style::default().fg(Color::DarkGray),
        )),
        Line::from(Span::styled(
            "Enter 创建   Esc 取消   只允许字母/数字/_/-",
            Style::default().fg(Color::DarkGray),
        )),
    ];

    let para = Paragraph::new(lines).block(
        Block::default()
            .borders(Borders::ALL)
            .title(" 新增 widget ")
            .border_style(Style::default().fg(Color::Yellow)),
    );
    frame.render_widget(para, rect);
}

fn render_search_overlay(frame: &mut Frame, area: Rect, app: &App) {
    let Some(state) = app.search.as_ref() else {
        return;
    };

    let rect = centered_rect(72, 20, area);
    frame.render_widget(Clear, rect);

    let input_line = Line::from(vec![
        Span::styled("/", Style::default().fg(Color::Yellow)),
        Span::raw(state.query.clone()),
        Span::styled("▌", Style::default().fg(Color::Yellow)),
    ]);

    let hint = Line::from(Span::styled(
        format!(
            "命中 {} 项   ↑↓ 移动   Enter 跳转   Esc 关闭",
            state.results.len()
        ),
        Style::default().fg(Color::DarkGray),
    ));

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(2), // 输入 + 提示
            Constraint::Min(1),    // 结果列表
        ])
        .split(rect);

    // 顶部输入
    let top = Paragraph::new(vec![input_line, hint]).block(
        Block::default()
            .borders(Borders::ALL)
            .title(" 搜索字段 ")
            .border_style(Style::default().fg(Color::Yellow)),
    );
    frame.render_widget(top, chunks[0]);

    // 结果列表
    let items: Vec<ListItem> = state
        .results
        .iter()
        .map(|&(si, fi)| {
            let section = &SECTIONS[si];
            let field = &section.fields[fi];
            let line = Line::from(vec![
                Span::styled(
                    format!("[{}] ", section.title),
                    Style::default().fg(Color::Cyan),
                ),
                Span::styled(field.label, Style::default().fg(Color::White)),
                Span::styled(
                    format!("  ({})", field.path),
                    Style::default().fg(Color::DarkGray),
                ),
            ]);
            ListItem::new(line)
        })
        .collect();

    let list = List::new(items)
        .block(Block::default().borders(Borders::ALL))
        .highlight_style(
            Style::default()
                .bg(Color::DarkGray)
                .add_modifier(Modifier::BOLD),
        )
        .highlight_symbol("▶ ");

    let mut list_state = ListState::default();
    if !state.results.is_empty() {
        list_state.select(Some(state.selected));
    }
    frame.render_stateful_widget(list, chunks[1], &mut list_state);
}

fn render_merge_report(frame: &mut Frame, area: Rect, app: &App) {
    let rect = centered_rect(80, 22, area);
    frame.render_widget(Clear, rect);

    let mut lines = vec![Line::from(Span::styled(
        " 配置合并报告(F2/Esc 关闭) ",
        Style::default()
            .fg(Color::Black)
            .bg(Color::Cyan)
            .add_modifier(Modifier::BOLD),
    ))];
    lines.push(Line::from(""));

    match app.merge_report.as_ref() {
        None => {
            lines.push(Line::from(Span::styled(
                "(合并报告不可用。可能是未加载默认配置或解析失败。)",
                Style::default().fg(Color::DarkGray),
            )));
        }
        Some(report) if report.layers.is_empty() => {
            lines.push(Line::from(Span::styled(
                "当前仅使用内置默认值,未检测到用户或项目级覆盖层。",
                Style::default().fg(Color::Gray),
            )));
        }
        Some(report) => {
            for (i, layer) in report.layers.iter().enumerate() {
                let type_label = match layer.source_type {
                    ConfigSourceType::Default => "内置默认",
                    ConfigSourceType::User => "用户级",
                    ConfigSourceType::Project => "项目级",
                    ConfigSourceType::Custom => "自定义",
                };
                let path_str = layer
                    .path
                    .as_ref()
                    .map_or_else(String::new, |p| format!("  →  {}", p.display()));
                lines.push(Line::from(vec![
                    Span::styled(
                        format!("  {}. ", i + 1),
                        Style::default().fg(Color::DarkGray),
                    ),
                    Span::styled(
                        type_label,
                        Style::default()
                            .fg(Color::Yellow)
                            .add_modifier(Modifier::BOLD),
                    ),
                    Span::styled(path_str, Style::default().fg(Color::Gray)),
                ]));
                if layer.added_keys.is_empty() && layer.updated_keys.is_empty() {
                    lines.push(Line::from(Span::styled(
                        "      (未引入新键或覆盖现有键)",
                        Style::default().fg(Color::DarkGray),
                    )));
                } else {
                    if !layer.added_keys.is_empty() {
                        lines.push(Line::from(vec![
                            Span::styled("      新增键: ", Style::default().fg(Color::DarkGray)),
                            Span::styled(
                                format_key_list(&layer.added_keys),
                                Style::default().fg(Color::Green),
                            ),
                        ]));
                    }
                    if !layer.updated_keys.is_empty() {
                        lines.push(Line::from(vec![
                            Span::styled("      覆盖键: ", Style::default().fg(Color::DarkGray)),
                            Span::styled(
                                format_key_list(&layer.updated_keys),
                                Style::default().fg(Color::LightBlue),
                            ),
                        ]));
                    }
                }
                lines.push(Line::from(""));
            }
        }
    }

    let para = Paragraph::new(lines).wrap(Wrap { trim: false }).block(
        Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(Color::Cyan)),
    );
    frame.render_widget(para, rect);
}

fn format_key_list(keys: &[String]) -> String {
    const MAX: usize = 10;
    if keys.len() <= MAX {
        keys.join(", ")
    } else {
        let visible = keys
            .iter()
            .take(MAX)
            .cloned()
            .collect::<Vec<_>>()
            .join(", ");
        format!("{visible} … (+{} 项)", keys.len() - MAX)
    }
}

/// 把配置里的颜色名 / hex 字符串映射到 ratatui `Color`。不识别时回退到 `Reset`。
fn parse_color_name(raw: &str) -> Color {
    let s = raw.trim().to_ascii_lowercase();
    match s.as_str() {
        "black" => Color::Black,
        "red" => Color::Red,
        "green" => Color::Green,
        "yellow" => Color::Yellow,
        "blue" => Color::Blue,
        "magenta" => Color::Magenta,
        "cyan" => Color::Cyan,
        "white" => Color::White,
        "gray" | "grey" => Color::DarkGray,
        "bright_black" => Color::DarkGray,
        "bright_red" => Color::LightRed,
        "bright_green" => Color::LightGreen,
        "bright_yellow" => Color::LightYellow,
        "bright_blue" => Color::LightBlue,
        "bright_magenta" => Color::LightMagenta,
        "bright_cyan" => Color::LightCyan,
        "bright_white" => Color::White,
        _ => parse_hex_color(&s).unwrap_or(Color::Reset),
    }
}

fn parse_hex_color(s: &str) -> Option<Color> {
    let hex = s.strip_prefix('#')?;
    if hex.len() != 6 {
        return None;
    }
    let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
    let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
    let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
    Some(Color::Rgb(r, g, b))
}

fn kind_label(kind: &FieldKind) -> String {
    match kind {
        FieldKind::Text => "文本".to_string(),
        FieldKind::Bool => "布尔".to_string(),
        FieldKind::Enum(options) => format!("枚举 [{}]", options.join(" / ")),
        FieldKind::Color => "颜色(Space 循环色板,Enter 手填 hex / 自定义)".to_string(),
        FieldKind::Int { min, max } => format!("整数 [{min}, {max}]"),
        FieldKind::Float { min, max } => format!("浮点 [{min}, {max}]"),
    }
}

fn centered_rect(percent_x: u16, height: u16, r: Rect) -> Rect {
    let vertical = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Min(0),
            Constraint::Length(height),
            Constraint::Min(0),
        ])
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(vertical[1])[1]
}

#[cfg(test)]
mod color_tests {
    use super::{parse_color_name, parse_hex_color};
    use ratatui::style::Color;

    #[test]
    fn test_named_colors() {
        assert_eq!(parse_color_name("red"), Color::Red);
        assert_eq!(parse_color_name("WHITE"), Color::White);
        assert_eq!(parse_color_name("bright_blue"), Color::LightBlue);
        assert_eq!(parse_color_name("gray"), Color::DarkGray);
    }

    #[test]
    fn test_hex_color() {
        assert_eq!(parse_color_name("#808080"), Color::Rgb(0x80, 0x80, 0x80));
        assert_eq!(parse_hex_color("#ff0000"), Some(Color::Rgb(255, 0, 0)));
        assert_eq!(parse_hex_color("#abc"), None); // 3-digit hex not supported
        assert_eq!(parse_hex_color("abc"), None); // no '#'
    }

    #[test]
    fn test_unknown_color_falls_back() {
        assert_eq!(parse_color_name("not-a-color"), Color::Reset);
    }
}
