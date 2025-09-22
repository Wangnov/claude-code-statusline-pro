//! Claude Code Statusline Pro - Rust Edition
//!
//! Main entry point for the CLI application

use anyhow::Result;
use std::io::{self, Read};

fn main() -> Result<()> {
    // TODO: 实现完整功能
    // 当前仅作为占位符，验证构建系统

    // 读取stdin（Claude Code会传入JSON数据）
    let mut buffer = String::new();
    io::stdin().read_to_string(&mut buffer)?;

    // 暂时输出固定的状态栏格式
    // 格式: project | model | branch | tokens
    println!("📁 project | 🤖 claude-3 | 🌿 main | 📊 0");

    Ok(())
}
