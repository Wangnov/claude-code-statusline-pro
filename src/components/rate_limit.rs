//! Rate limit component implementation.
//!
//! Displays Claude.ai subscription rate-limit windows from the official
//! Claude Code stdin payload.

use std::time::{SystemTime, UNIX_EPOCH};

use super::base::{Component, ComponentFactory, ComponentOutput, RenderContext};
use crate::config::{BaseComponentConfig, Config, RateLimitComponentConfig};
use crate::core::input::RateLimitWindow;
use async_trait::async_trait;

/// Rate limit component.
pub struct RateLimitComponent {
    config: RateLimitComponentConfig,
}

impl RateLimitComponent {
    #[must_use]
    pub const fn new(config: RateLimitComponentConfig) -> Self {
        Self { config }
    }

    fn render_window(
        &self,
        label: &str,
        window: &RateLimitWindow,
        now_secs: i64,
    ) -> Option<String> {
        let mut parts = Vec::new();

        if let Some(used) = window.used_percentage {
            parts.push(format!("{label} {used:.0}%"));
        } else if window.resets_at.is_some() {
            parts.push(label.to_string());
        }

        if self.config.show_reset {
            if let Some(resets_at) = window.resets_at {
                parts.push(format!(
                    "reset {}",
                    Self::format_reset_duration(resets_at, now_secs)
                ));
            }
        }

        (!parts.is_empty()).then(|| parts.join(" "))
    }

    fn format_reset_duration(resets_at: i64, now_secs: i64) -> String {
        let remaining = resets_at.saturating_sub(now_secs);
        if remaining == 0 {
            return "now".to_string();
        }

        let days = remaining / 86_400;
        let hours = (remaining % 86_400) / 3_600;
        let minutes = ((remaining % 3_600) / 60).max(1);

        if days > 0 {
            if hours > 0 {
                format!("{days}d{hours}h")
            } else {
                format!("{days}d")
            }
        } else if hours > 0 {
            format!("{hours}h{minutes}m")
        } else {
            format!("{minutes}m")
        }
    }

    fn now_secs() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_or(0, |duration| {
                i64::try_from(duration.as_secs()).unwrap_or(i64::MAX)
            })
    }
}

#[async_trait]
impl Component for RateLimitComponent {
    fn name(&self) -> &'static str {
        "rate_limit"
    }

    fn is_enabled(&self, _ctx: &RenderContext) -> bool {
        self.config.base.enabled
    }

    async fn render(&self, ctx: &RenderContext) -> ComponentOutput {
        if !self.is_enabled(ctx) {
            return ComponentOutput::hidden();
        }

        let Some(rate_limits) = ctx.input.rate_limits.as_ref() else {
            return ComponentOutput::hidden();
        };

        let now_secs = Self::now_secs();
        let mut windows = Vec::new();

        if self.config.show_five_hour {
            if let Some(window) = rate_limits.five_hour.as_ref() {
                if let Some(rendered) = self.render_window("5h", window, now_secs) {
                    windows.push(rendered);
                }
            }
        }

        if self.config.show_seven_day {
            if let Some(window) = rate_limits.seven_day.as_ref() {
                if let Some(rendered) = self.render_window("7d", window, now_secs) {
                    windows.push(rendered);
                }
            }
        }

        if windows.is_empty() {
            return ComponentOutput::hidden();
        }

        ComponentOutput::new(windows.join(" | "))
            .with_icon(self.select_icon(ctx).unwrap_or_default())
            .with_icon_color(&self.config.base.icon_color)
            .with_text_color(&self.config.base.text_color)
    }

    fn base_config(&self, _ctx: &RenderContext) -> Option<&BaseComponentConfig> {
        Some(&self.config.base)
    }
}

/// Factory for creating rate limit components.
pub struct RateLimitComponentFactory;

impl ComponentFactory for RateLimitComponentFactory {
    fn create(&self, config: &Config) -> Box<dyn Component> {
        Box::new(RateLimitComponent::new(
            config.components.rate_limit.clone(),
        ))
    }

    fn name(&self) -> &'static str {
        "rate_limit"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::components::TerminalCapabilities;
    use crate::core::input::{InputData, RateLimitsInfo};
    use std::sync::Arc;

    fn context(input: InputData) -> RenderContext {
        RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        }
    }

    #[tokio::test]
    async fn rate_limit_hidden_when_payload_missing() {
        let component = RateLimitComponent::new(RateLimitComponentConfig::default());
        let output = component.render(&context(InputData::default())).await;

        assert!(!output.visible);
    }

    #[tokio::test]
    async fn rate_limit_renders_five_hour_and_seven_day_windows() {
        let component = RateLimitComponent::new(RateLimitComponentConfig {
            show_reset: false,
            ..RateLimitComponentConfig::default()
        });
        let input = InputData {
            rate_limits: Some(RateLimitsInfo {
                five_hour: Some(RateLimitWindow {
                    used_percentage: Some(42.0),
                    resets_at: None,
                }),
                seven_day: Some(RateLimitWindow {
                    used_percentage: Some(7.0),
                    resets_at: None,
                }),
            }),
            ..InputData::default()
        };

        let output = component.render(&context(input)).await;

        assert!(output.visible);
        assert_eq!(output.text, "5h 42% | 7d 7%");
    }

    #[test]
    fn reset_duration_formats_compactly() {
        assert_eq!(RateLimitComponent::format_reset_duration(60, 0), "1m");
        assert_eq!(RateLimitComponent::format_reset_duration(3_660, 0), "1h1m");
        assert_eq!(RateLimitComponent::format_reset_duration(90_000, 0), "1d1h");
    }
}
