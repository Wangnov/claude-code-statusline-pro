//! Core module containing fundamental data structures and logic
//!
//! This module provides the core functionality for the statusline generator,
//! including input data parsing, configuration management, and the main
//! generator logic.

pub mod generator;
pub mod input;
pub mod multiline;

// Re-export commonly used types
pub use generator::{GeneratorOptions, StatuslineGenerator};
pub use input::{CostInfo, GitInfo, InputData, ModelInfo, WorkspaceInfo};
pub use multiline::{MultiLineRenderResult, MultiLineRenderer};
