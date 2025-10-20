//! Capsule theme renderer
//!
//! Renders rounded capsules with foreground/background colors mirroring the
//! TypeScript implementation.

use anyhow::Result;

use super::{ansi_bg, ansi_fg, colorize_segment, reapply_background, ThemeRenderer, ANSI_RESET};
use crate::components::{ComponentOutput, RenderContext};

pub struct CapsuleThemeRenderer;

impl CapsuleThemeRenderer {
    const LEFT_CAP: char = '\u{e0b6}';
    const RIGHT_CAP: char = '\u{e0b4}';
    #[must_use]
    pub const fn new() -> Self {
        Self
    }

    fn render_classic_fallback(
        components: &[ComponentOutput],
        context: &RenderContext,
        supports_colors: bool,
    ) -> String {
        let style = &context.config.style;
        let (separator_core, apply_padding) = if style.separator.is_empty() {
            (" | ".trim(), true)
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
            raw_separator.as_str(),
            Some(style.separator_color.as_str()),
            supports_colors,
        );

        let mut parts = Vec::new();
        for component in components {
            let mut part = String::new();

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

            part.push_str(&colorize_segment(
                &component.text,
                component.text_color.as_deref(),
                supports_colors,
            ));

            if !part.is_empty() {
                parts.push(part);
            }
        }

        parts.join(&colored_separator)
    }

    fn compose_content(component: &ComponentOutput) -> String {
        let mut content = String::new();
        if let Some(ref icon) = component.icon {
            if !icon.is_empty() {
                content.push_str(icon);
                if !component.text.is_empty() {
                    content.push(' ');
                }
            }
        }
        content.push_str(&component.text);
        content
    }

    fn should_preserve_internal_colors(component: &ComponentOutput) -> bool {
        let text = component.text.as_str();
        text.contains('█')
            || text.contains('░')
            || text.contains('▓')
            || ["Ready", "Thinking", "Error", "Tool", "Complete"]
                .iter()
                .any(|word| text.contains(word))
    }

    fn render_capsule(content: &str, color: &str, preserve_internal: bool) -> String {
        let mut segment = String::new();

        if let Some(fg) = ansi_fg(color).as_ref() {
            segment.push_str(fg);
        }
        segment.push(Self::LEFT_CAP);
        segment.push_str(ANSI_RESET);

        let bg_seq = ansi_bg(color);
        let fg_seq = ansi_fg("white");

        if let Some(bg) = bg_seq.as_ref() {
            segment.push_str(bg);
        }
        if let Some(fg) = fg_seq.as_ref() {
            segment.push_str(fg);
        }
        segment.push(' ');
        if preserve_internal {
            if let Some(bg) = bg_seq.as_ref() {
                segment.push_str(&reapply_background(content, bg));
            } else {
                segment.push_str(content);
            }
        } else {
            segment.push_str(content);
        }
        segment.push(' ');
        segment.push_str(ANSI_RESET);

        if let Some(fg) = ansi_fg(color).as_ref() {
            segment.push_str(fg);
        }
        segment.push(Self::RIGHT_CAP);
        segment.push_str(ANSI_RESET);

        segment
    }
}

impl ThemeRenderer for CapsuleThemeRenderer {
    fn render(
        &self,
        components: &[ComponentOutput],
        colors: &[String],
        context: &RenderContext,
    ) -> Result<String> {
        if components.is_empty() {
            return Ok(String::new());
        }

        let supports_colors = context.terminal.supports_colors
            && context
                .config
                .style
                .enable_colors
                .is_enabled(context.terminal.supports_colors);
        let use_capsule =
            context.terminal.supports_nerd_font || context.config.terminal.force_nerd_font;

        if !supports_colors || !use_capsule {
            return Ok(Self::render_classic_fallback(
                components,
                context,
                supports_colors,
            ));
        }

        let mut rendered = Vec::with_capacity(components.len());
        let mut color_iter = colors.iter();

        for component in components {
            let rendered_content = Self::compose_content(component);
            let color = color_iter
                .next()
                .cloned()
                .unwrap_or_else(|| "bright_blue".to_string());
            let preserve = Self::should_preserve_internal_colors(component);
            rendered.push(Self::render_capsule(&rendered_content, &color, preserve));
        }

        Ok(rendered.join(" "))
    }

    fn name(&self) -> &'static str {
        "capsule"
    }
}

impl Default for CapsuleThemeRenderer {
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

    fn create_test_context(nerd_font: bool, colors: bool) -> RenderContext {
        let mut config = Config::default();
        config.style.enable_colors = AutoDetect::Bool(colors);

        RenderContext {
            input: Arc::new(InputData::default()),
            config: Arc::new(config),
            terminal: TerminalCapabilities {
                supports_colors: colors,
                supports_emoji: true,
                supports_nerd_font: nerd_font,
            },
        }
    }

    #[test]
    fn test_capsule_theme_with_nerd_font() -> TestResult {
        let theme = CapsuleThemeRenderer::new();
        let ctx = create_test_context(true, true);

        let components = vec![
            ComponentOutput::new("Project".to_string()).with_icon("📁".to_string()),
            ComponentOutput::new("main".to_string()).with_icon("🌿".to_string()),
        ];

        let colors = vec!["blue".to_string(), "green".to_string()];
        let result = theme.render(&components, &colors, &ctx)?;
        assert!(result.contains('\u{e0b6}'));
        assert!(result.contains('\u{e0b4}'));
        Ok(())
    }

    #[test]
    fn test_capsule_theme_without_colors() -> TestResult {
        let theme = CapsuleThemeRenderer::new();
        let ctx = create_test_context(true, false);

        let components = vec![
            ComponentOutput::new("Project".to_string()).with_icon("📁".to_string()),
            ComponentOutput::new("main".to_string()).with_icon("🌿".to_string()),
        ];

        let colors = vec!["blue".to_string(), "green".to_string()];
        let result = theme.render(&components, &colors, &ctx)?;
        assert_eq!(result, "📁 Project | 🌿 main");
        Ok(())
    }
}
