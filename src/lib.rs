#![warn(clippy::all, clippy::pedantic, clippy::nursery, clippy::cargo)]
#![deny(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::panic,
    clippy::unimplemented,
    clippy::todo
)]

//! Claude Code Statusline Pro - Library
//!
//! Core library for statusline generation

pub mod components;
pub mod config;
pub mod core;
pub mod git;
pub mod storage;
pub mod terminal;
pub mod themes;
pub mod utils;

/// 库版本
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// 默认配置文件名
pub const CONFIG_FILE_NAME: &str = "config.toml";

/// 用户配置目录路径
pub const USER_CONFIG_DIR: &str = ".claude/statusline-pro";

/// 项目配置目录路径
pub const PROJECT_CONFIG_DIR: &str = ".claude/projects";
