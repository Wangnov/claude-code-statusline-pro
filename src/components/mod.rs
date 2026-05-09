//! Component module
//!
//! This module contains all statusline components and the component framework.

pub mod base;
pub mod branch;
pub mod model;
pub mod project;
pub mod rate_limit;
pub mod status;
pub mod tokens;
pub mod usage;

// Re-export commonly used types
pub use base::{
    ColorSupport, Component, ComponentFactory, ComponentOutput, RenderContext, TerminalCapabilities,
};
pub use branch::{BranchComponent, BranchComponentFactory};
pub use model::{ModelComponent, ModelComponentFactory};
pub use project::{ProjectComponent, ProjectComponentFactory};
pub use rate_limit::{RateLimitComponent, RateLimitComponentFactory};
pub use status::{StatusComponent, StatusComponentFactory};
pub use tokens::{TokensComponent, TokensComponentFactory};
pub use usage::{UsageComponent, UsageComponentFactory};
