//! Configuration module
//!
//! This module handles all configuration-related functionality,
//! including schema definitions, loading, and validation.

pub mod component_widgets;
pub mod loader;
pub mod schema;

// Re-export commonly used types
pub use component_widgets::{
    ComponentMultilineConfig, ComponentMultilineMeta, WidgetApiConfig, WidgetApiMethod,
    WidgetConfig, WidgetDetectionConfig, WidgetFilterConfig, WidgetFilterMode, WidgetType,
};
pub use loader::{
    ComponentCopyStats, ConfigLoader, ConfigSource, ConfigSourceType, CreateConfigOptions,
    CreateConfigResult, MergeLayer, MergeReport, TerminalCapabilityHint,
};
pub use schema::{
    AutoDetect, BaseComponentConfig, BranchComponentConfig, ComponentsConfig, Config,
    ModelComponentConfig, MultilineConfig, MultilineRowConfig, ProjectComponentConfig,
    StatusComponentConfig, StorageConfig, StyleConfig, TerminalConfig, TokenIconSetConfig,
    TokensColorConfig, TokensComponentConfig, TokensProgressBarCharsConfig,
    TokensStatusIconsConfig, TokensThresholdsConfig, UsageComponentConfig,
};
