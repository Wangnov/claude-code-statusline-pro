//! Base component trait and common structures
//!
//! This module defines the core Component trait that all statusline
//! components must implement, along with common structures used by components.

use crate::{
    config::{BaseComponentConfig, Config},
    core::InputData,
};
use async_trait::async_trait;
use std::sync::Arc;

/// Terminal capabilities for rendering decisions
#[derive(Debug, Clone)]
pub struct TerminalCapabilities {
    /// Whether terminal supports ANSI colors
    pub supports_colors: bool,
    /// Whether terminal supports emoji
    pub supports_emoji: bool,
    /// Whether terminal supports Nerd Font icons
    pub supports_nerd_font: bool,
}

impl Default for TerminalCapabilities {
    fn default() -> Self {
        Self {
            supports_colors: true,
            supports_emoji: true,
            supports_nerd_font: false,
        }
    }
}

/// Context provided to components for rendering
#[derive(Clone)]
pub struct RenderContext {
    /// Input data from stdin
    pub input: Arc<InputData>,
    /// Configuration
    pub config: Arc<Config>,
    /// Terminal capabilities
    pub terminal: TerminalCapabilities,
}

/// Output from a component
#[derive(Debug, Clone)]
pub struct ComponentOutput {
    /// The rendered text
    pub text: String,
    /// Icon to use (already selected based on terminal capabilities)
    pub icon: Option<String>,
    /// Color for the icon
    pub icon_color: Option<String>,
    /// Color for the text
    pub text_color: Option<String>,
    /// The logical component identifier (project/model/...)
    pub component_name: Option<String>,
    /// Whether to show this component (empty/disabled components return None)
    pub visible: bool,
}

impl ComponentOutput {
    /// Create a new visible component output
    pub fn new(text: impl Into<String>) -> Self {
        Self {
            text: text.into(),
            icon: None,
            icon_color: None,
            text_color: None,
            component_name: None,
            visible: true,
        }
    }

    /// Create an invisible/hidden component output
    pub fn hidden() -> Self {
        Self {
            text: String::new(),
            icon: None,
            icon_color: None,
            text_color: None,
            component_name: None,
            visible: false,
        }
    }

    /// Set the icon for this output
    pub fn with_icon(mut self, icon: impl Into<String>) -> Self {
        self.icon = Some(icon.into());
        self
    }

    /// Set the icon color
    pub fn with_icon_color(mut self, color: impl Into<String>) -> Self {
        self.icon_color = Some(color.into());
        self
    }

    /// Set the text color
    pub fn with_text_color(mut self, color: impl Into<String>) -> Self {
        self.text_color = Some(color.into());
        self
    }

    /// Attach the originating component name
    pub fn with_component_name(mut self, name: impl Into<String>) -> Self {
        self.component_name = Some(name.into());
        self
    }

    /// Mutably set the component name
    pub fn set_component_name(&mut self, name: impl Into<String>) {
        self.component_name = Some(name.into());
    }
}

/// Trait that all statusline components must implement
#[async_trait]
pub trait Component: Send + Sync {
    /// Get the component's name
    fn name(&self) -> &str;

    /// Check if this component is enabled
    fn is_enabled(&self, ctx: &RenderContext) -> bool;

    /// Render the component
    async fn render(&self, ctx: &RenderContext) -> ComponentOutput;

    /// Get the base configuration for this component
    fn base_config(&self, ctx: &RenderContext) -> Option<&BaseComponentConfig>;

    /// Select the appropriate icon based on terminal capabilities
    fn select_icon(&self, ctx: &RenderContext) -> Option<String> {
        let config = self.base_config(ctx)?;
        let terminal = &ctx.terminal;
        let style = &ctx.config.style;

        // Check forced modes first
        if ctx.config.terminal.force_text {
            return Some(config.text_icon.clone());
        }
        if ctx.config.terminal.force_nerd_font {
            return Some(config.nerd_icon.clone());
        }
        if ctx.config.terminal.force_emoji {
            return Some(config.emoji_icon.clone());
        }

        // Auto-detect based on terminal capabilities and style settings
        if terminal.supports_nerd_font && style.enable_nerd_font.is_enabled(true) {
            Some(config.nerd_icon.clone())
        } else if terminal.supports_emoji && style.enable_emoji.is_enabled(true) {
            Some(config.emoji_icon.clone())
        } else {
            Some(config.text_icon.clone())
        }
    }
}

/// Factory trait for creating component instances
pub trait ComponentFactory: Send + Sync {
    /// Create a new instance of the component
    fn create(&self, config: &Config) -> Box<dyn Component>;

    /// Get the name of the component this factory creates
    fn name(&self) -> &str;
}
