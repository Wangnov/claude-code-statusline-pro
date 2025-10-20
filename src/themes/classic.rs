//! Classic theme renderer
//!
//! Simple theme with plain separators.

use anyhow::Result;

use super::{colorize_segment, ThemeRenderer};
use crate::components::{ComponentOutput, RenderContext};

/// Classic theme renderer
pub struct ClassicThemeRenderer {
    separator: String,
}

impl ClassicThemeRenderer {
    /// Create a new classic theme renderer
    #[must_use]
    pub fn new() -> Self {
        Self {
            separator: " | ".to_string(),
        }
    }

    /// Create with custom separator
    #[must_use]
    pub const fn with_separator(separator: String) -> Self {
        Self { separator }
    }
}

impl ThemeRenderer for ClassicThemeRenderer {
    fn render(
        &self,
        components: &[ComponentOutput],
        _colors: &[String],
        context: &RenderContext,
    ) -> Result<String> {
        let supports_colors = context.terminal.supports_colors
            && context
                .config
                .style
                .enable_colors
                .is_enabled(context.terminal.supports_colors);

        // Determine separator string (respect before/after spacing)
        let style = &context.config.style;
        let (separator_core, apply_padding) = if style.separator.is_empty() {
            (self.separator.trim(), true)
        } else if style.separator == "|" {
            (style.separator.as_str(), true)
        } else {
            (style.separator.as_str(), false)
        };
        let raw_separator = if apply_padding {
            format!(
                "{}{}{}",
                style.separator_before, separator_core, style.separator_after
            )
        } else {
            separator_core.to_string()
        };
        let colored_separator = colorize_segment(
            &raw_separator,
            Some(style.separator_color.as_str()),
            supports_colors,
        );

        // Collect visible components
        let mut parts = Vec::new();

        for component in components {
            if !component.visible {
                continue;
            }

            let mut part = String::new();

            // Add icon if present
            if let Some(ref icon) = component.icon {
                part.push_str(&colorize_segment(
                    icon,
                    component.icon_color.as_deref(),
                    supports_colors,
                ));
                if !component.text.is_empty() {
                    part.push(' ');
                }
            }

            // Add text
            part.push_str(&colorize_segment(
                &component.text,
                component.text_color.as_deref(),
                supports_colors,
            ));

            if !part.is_empty() {
                parts.push(part);
            }
        }

        // Join with separator
        Ok(parts.join(&colored_separator))
    }

    fn name(&self) -> &'static str {
        "classic"
    }
}

impl Default for ClassicThemeRenderer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::components::TerminalCapabilities;
    use crate::config::{AutoDetect, Config};
    use crate::core::InputData;
    use std::error::Error;
    use std::sync::Arc;

    type TestResult = Result<(), Box<dyn Error>>;

    fn create_test_context() -> RenderContext {
        let mut config = Config::default();
        config.style.enable_colors = AutoDetect::Bool(false);

        RenderContext {
            input: Arc::new(InputData::default()),
            config: Arc::new(config),
            terminal: TerminalCapabilities {
                supports_colors: false,
                ..Default::default()
            },
        }
    }

    #[test]
    fn test_classic_theme_basic() -> TestResult {
        let theme = ClassicThemeRenderer::new();
        let ctx = create_test_context();

        let components = vec![
            ComponentOutput::new("Project".to_string()).with_icon("📁".to_string()),
            ComponentOutput::new("main".to_string()).with_icon("🌿".to_string()),
        ];

        let colors = vec![];
        let result = theme.render(&components, &colors, &ctx)?;
        assert_eq!(result, "📁 Project | 🌿 main");
        Ok(())
    }

    #[test]
    fn test_classic_theme_no_icon() -> TestResult {
        let theme = ClassicThemeRenderer::new();
        let ctx = create_test_context();

        let components = vec![
            ComponentOutput::new("Project".to_string()),
            ComponentOutput::new("main".to_string()),
        ];

        let colors = vec![];
        let result = theme.render(&components, &colors, &ctx)?;
        assert_eq!(result, "Project | main");
        Ok(())
    }

    #[test]
    fn test_classic_theme_hidden_components() -> TestResult {
        let theme = ClassicThemeRenderer::new();
        let ctx = create_test_context();

        let components = vec![
            ComponentOutput::new("Visible".to_string()),
            ComponentOutput::hidden(), // This should be skipped
            ComponentOutput::new("Also Visible".to_string()),
        ];

        let colors = vec![];
        let result = theme.render(&components, &colors, &ctx)?;
        assert_eq!(result, "Visible | Also Visible");
        Ok(())
    }

    #[test]
    fn test_classic_theme_custom_separator() -> TestResult {
        let theme = ClassicThemeRenderer::with_separator(" / ".to_string());
        let mut config = Config::default();
        config.style.separator = " / ".to_string();
        config.style.enable_colors = AutoDetect::Bool(false);

        let ctx = RenderContext {
            input: Arc::new(InputData::default()),
            config: Arc::new(config),
            terminal: TerminalCapabilities {
                supports_colors: false,
                ..Default::default()
            },
        };

        let components = vec![
            ComponentOutput::new("One".to_string()),
            ComponentOutput::new("Two".to_string()),
        ];

        let colors = vec![];
        let result = theme.render(&components, &colors, &ctx)?;
        assert_eq!(result, "One / Two");
        Ok(())
    }
}
