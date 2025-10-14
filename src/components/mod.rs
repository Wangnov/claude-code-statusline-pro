//! Component module
//!
//! This module contains all statusline components and the component framework.

pub mod base;
pub mod branch;
pub mod model;
pub mod project;
pub mod status;
pub mod tokens;
pub mod usage;

// Re-export commonly used types
pub use base::{Component, ComponentFactory, ComponentOutput, RenderContext, TerminalCapabilities};
pub use branch::{BranchComponent, BranchComponentFactory};
pub use model::{ModelComponent, ModelComponentFactory};
pub use project::{ProjectComponent, ProjectComponentFactory};
pub use status::{StatusComponent, StatusComponentFactory};
pub use tokens::{TokensComponent, TokensComponentFactory};
pub use usage::{UsageComponent, UsageComponentFactory};
