//! TUI 配置编辑器(v1)
//!
//! 架构:
//! - `sections`:静态字段元数据
//! - `io`:`toml_edit::DocumentMut` 读写,保留注释
//! - `preview`:用当前配置 + mock 数据生成预览行
//! - `app`:状态机
//! - `view`:ratatui 渲染
//! - `event`:按键分发
//!
//! 进入方式:`ccsp config edit [--global | --file <path>] [--mock <scenario>]`

#![allow(
    clippy::too_many_lines,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::module_name_repetitions
)]

mod app;
mod event;
mod io;
mod preview;
mod sections;
mod view;
mod widgets;

use std::io::IsTerminal;

use anyhow::{bail, Result};
use ratatui::crossterm::event::{DisableMouseCapture, EnableMouseCapture};
use ratatui::crossterm::execute;
use ratatui::crossterm::terminal::{
    disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen,
};
use ratatui::prelude::CrosstermBackend;
use ratatui::Terminal;
use toml_edit::DocumentMut;

pub use app::{EditOptions, EditScope};

use crate::tui::sections::{Field, FieldKind};

/// 启动 TUI 编辑器。
pub async fn run(options: EditOptions) -> Result<()> {
    if !std::io::stdin().is_terminal() || !std::io::stdout().is_terminal() {
        bail!("`config edit` 需要交互式终端(TTY),当前 stdin/stdout 不是 TTY。");
    }

    // 先构造 App。任何 IO / 解析错误要在进入 raw mode 之前发生,
    // 否则错误返回路径会把用户终端留在 raw mode + alternate screen 里。
    let mut app = app::App::from_options(options).await?;

    enable_raw_mode()?;
    let mut stdout = std::io::stdout();
    if let Err(err) = execute!(stdout, EnterAlternateScreen, EnableMouseCapture) {
        // execute! 失败不代表前面的 control sequence 一个都没写出:如果
        // EnterAlternateScreen 已经成功、EnableMouseCapture 才失败,用户的
        // 终端现在就卡在 alt screen + raw mode 里,我们这里只 disable_raw_mode
        // 不够,alt screen 和鼠标捕获必须一起关掉。和下面 Terminal::new 失败
        // 路径对齐。反向 execute! 本身也可能失败,用 let _ 忽略,优先把原始
        // 错误吐出去让用户知道到底哪里挂了。
        let _ = execute!(stdout, LeaveAlternateScreen, DisableMouseCapture);
        let _ = disable_raw_mode();
        return Err(err.into());
    }

    // 从这里起必须保证 cleanup 被执行
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = match Terminal::new(backend) {
        Ok(t) => t,
        Err(err) => {
            let mut out = std::io::stdout();
            let _ = execute!(out, LeaveAlternateScreen, DisableMouseCapture);
            let _ = disable_raw_mode();
            return Err(err.into());
        }
    };

    let loop_result = event::run_loop(&mut terminal, &mut app).await;

    // 无论 loop 成功还是失败都恢复终端
    let _ = disable_raw_mode();
    let _ = execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    );
    let _ = terminal.show_cursor();

    loop_result
}

/// 把当前字段的值格式化成"显示文本"(用于列表右侧)。
pub(crate) fn get_field_display(doc: &DocumentMut, field: &Field) -> String {
    match field.kind {
        FieldKind::Text | FieldKind::Enum(_) | FieldKind::Color => {
            io::get_string(doc, field.path).map_or_else(|| "—".to_string(), |v| format!("\"{v}\""))
        }
        FieldKind::Bool => io::get_bool(doc, field.path).map_or_else(
            || "—".to_string(),
            |v| if v { "true" } else { "false" }.to_string(),
        ),
        FieldKind::Int { .. } => {
            io::get_int(doc, field.path).map_or_else(|| "—".to_string(), |v| v.to_string())
        }
        FieldKind::Float { .. } => {
            io::get_float(doc, field.path).map_or_else(|| "—".to_string(), |v| format!("{v:.2}"))
        }
    }
}

/// mock 场景的中文友好标签。
pub(crate) fn get_mock_label(name: &str) -> String {
    match name {
        "dev" => "dev · 开发会话".to_string(),
        "critical" => "critical · 高负载".to_string(),
        "thinking" => "thinking · 思考中".to_string(),
        "complete" => "complete · 已完成".to_string(),
        "error" => "error · 错误态".to_string(),
        other => other.to_string(),
    }
}
