//! Powerline theme renderer
//!
//! Reimplements the TypeScript Powerline renderer with proper background colors
//! and Nerd Font separators to ensure visual parity across themes.

use anyhow::Result;

use super::{ansi_bg, ansi_fg, colorize_segment, reapply_background, ThemeRenderer, ANSI_RESET};
use crate::components::{ComponentOutput, RenderContext};

/// Powerline theme renderer
pub struct PowerlineThemeRenderer;

impl PowerlineThemeRenderer {
    const POWERLINE_SEPARATOR: char = '\u{e0b0}';
    const POWERLINE_START: char = '\u{e0d7}';

    #[must_use] pub const fn new() -> Self {
        Self
    }

    fn render_classic_fallback(
        &self,
        components: &[ComponentOutput],
        context: &RenderContext,
        supports_colors: bool,
    ) -> Result<String> {
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

        Ok(parts.join(&colored_separator))
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

    fn is_fake_component(component: &ComponentOutput) -> bool {
        component.text.contains('\u{ec03}')
            || component
                .icon
                .as_ref()
                .is_some_and(|icon| icon.contains('\u{ec03}'))
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

    fn next_visible_color(
        segments: &[(String, Option<String>, bool)],
        current_index: usize,
    ) -> Option<String> {
        segments
            .iter()
            .skip(current_index + 1)
            .find_map(|(_, color, _)| color.clone())
    }

    fn render_segment(
        &self,
        content: &str,
        bg_color: &str,
        next_bg: Option<&str>,
        preserve_internal: bool,
    ) -> String {
        let mut segment = String::new();

        let bg_seq = ansi_bg(bg_color);
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

        if let Some(next) = next_bg {
            segment.push_str(ANSI_RESET);
            if let Some(bg) = ansi_bg(next).as_ref() {
                segment.push_str(bg);
            }
            if let Some(fg) = ansi_fg(bg_color).as_ref() {
                segment.push_str(fg);
            }
            segment.push(Self::POWERLINE_SEPARATOR);
        } else {
            segment.push_str(ANSI_RESET);
            if let Some(fg) = ansi_fg(bg_color).as_ref() {
                segment.push_str(fg);
            }
            segment.push(Self::POWERLINE_SEPARATOR);
            segment.push_str(ANSI_RESET);
        }

        segment
    }
}

impl ThemeRenderer for PowerlineThemeRenderer {
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
        let use_nerd_font =
            context.terminal.supports_nerd_font || context.config.terminal.force_nerd_font;

        if !supports_colors || !use_nerd_font {
            return self.render_classic_fallback(components, context, supports_colors);
        }

        let mut prepared = Vec::with_capacity(components.len());
        let mut color_iter = colors.iter();

        for component in components {
            let is_fake = Self::is_fake_component(component);
            let color = if is_fake {
                None
            } else {
                Some(
                    color_iter
                        .next()
                        .cloned()
                        .unwrap_or_else(|| "blue".to_string()),
                )
            };

            prepared.push((
                Self::compose_content(component),
                color,
                Self::should_preserve_internal_colors(component),
            ));
        }

        // Prepend start symbol (powerline reverse triangle)
        let mut rendered = String::new();
        if let Some((_, Some(color), _)) = prepared.iter().find(|(_, color, _)| color.is_some()) {
            if let Some(fg) = ansi_fg(color).as_ref() {
                rendered.push_str(fg);
            }
            rendered.push(Self::POWERLINE_START);
            rendered.push_str(ANSI_RESET);
        }

        for idx in 0..prepared.len() {
            let (ref content, ref color_opt, preserve_internal) = prepared[idx];
            if color_opt.is_none() {
                rendered.push_str(content);
                continue;
            }

            let color = color_opt.as_ref().unwrap();
            let next_color = Self::next_visible_color(&prepared, idx);
            rendered.push_str(&self.render_segment(
                content,
                color,
                next_color.as_deref(),
                preserve_internal,
            ));
        }

        Ok(rendered)
    }

    fn name(&self) -> &'static str {
        "powerline"
    }
}

impl Default for PowerlineThemeRenderer {
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
    use std::sync::Arc;

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
    fn test_powerline_theme_with_nerd_font() {
        let theme = PowerlineThemeRenderer::new();
        let ctx = create_test_context(true, true);

        let components = vec![
            ComponentOutput::new("Project".to_string()).with_icon("📁".to_string()),
            ComponentOutput::new("main".to_string()).with_icon("🌿".to_string()),
        ];

        let colors = vec!["blue".to_string(), "green".to_string()];
        let result = theme.render(&components, &colors, &ctx).unwrap();
        assert!(result.contains('\u{e0b0}'));
        assert!(result.contains('\u{e0d7}'));
    }

    #[test]
    fn test_powerline_theme_without_colors() {
        let theme = PowerlineThemeRenderer::new();
        let ctx = create_test_context(true, false);

        let components = vec![
            ComponentOutput::new("Project".to_string()).with_icon("📁".to_string()),
            ComponentOutput::new("main".to_string()).with_icon("🌿".to_string()),
        ];

        let colors = vec!["blue".to_string(), "green".to_string()];
        let result = theme.render(&components, &colors, &ctx).unwrap();
        assert_eq!(result, "📁 Project | 🌿 main");
    }
}
