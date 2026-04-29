//! Tokens component implementation
//!
//! Displays token usage information with cached transcript statistics and adaptive progress bars.

use std::fmt::Write;

use async_trait::async_trait;

use super::base::{Component, ComponentFactory, ComponentOutput, RenderContext};
use crate::config::{BaseComponentConfig, Config, TokensComponentConfig};
use crate::storage;
use crate::utils::model_parser::parse_model_id;

#[derive(Clone, Debug)]
struct TokenUsageInfo {
    used: u64,
    total: u64,
    percentage: Option<f64>,
}

/// Tokens component
pub struct TokensComponent {
    config: TokensComponentConfig,
}

impl TokensComponent {
    #[must_use]
    pub const fn new(config: TokensComponentConfig) -> Self {
        Self { config }
    }

    fn usage_from_official_input(&self, ctx: &RenderContext) -> Option<TokenUsageInfo> {
        let context_window = ctx
            .input
            .extra
            .get("context_window")
            .or_else(|| ctx.input.extra.get("contextWindow"))?;
        let current_usage = context_window
            .get("current_usage")
            .or_else(|| context_window.get("currentUsage"));

        let input = current_usage
            .and_then(|usage| {
                usage
                    .get("input_tokens")
                    .or_else(|| usage.get("inputTokens"))
                    .and_then(serde_json::Value::as_u64)
            })
            .unwrap_or(0);
        let cache_creation = current_usage
            .and_then(|usage| {
                usage
                    .get("cache_creation_input_tokens")
                    .or_else(|| usage.get("cacheCreationInputTokens"))
                    .and_then(serde_json::Value::as_u64)
            })
            .unwrap_or(0);
        let cache_read = current_usage
            .and_then(|usage| {
                usage
                    .get("cache_read_input_tokens")
                    .or_else(|| usage.get("cacheReadInputTokens"))
                    .and_then(serde_json::Value::as_u64)
            })
            .unwrap_or(0);

        let used = input + cache_creation + cache_read;

        let percentage = context_window
            .get("used_percentage")
            .or_else(|| context_window.get("usedPercentage"))
            .and_then(serde_json::Value::as_f64);

        if used == 0 && percentage.is_none() && !self.config.show_zero {
            return None;
        }

        let official_total = context_window
            .get("context_window_size")
            .or_else(|| context_window.get("contextWindowSize"))
            .and_then(serde_json::Value::as_u64);
        let model_total = self.model_specific_context_window(ctx);
        let should_override_official_total = matches!(
            (official_total, model_total),
            (Some(200_000), Some(model_window)) if model_window != 200_000
        );
        let total = if should_override_official_total {
            model_total.unwrap_or(200_000)
        } else {
            official_total
                .or(model_total)
                .unwrap_or_else(|| self.context_window_for_model(ctx))
        };
        let percentage = if should_override_official_total && used > 0 {
            None
        } else {
            percentage
        };

        Some(TokenUsageInfo {
            used,
            total,
            percentage,
        })
    }

    async fn fetch_usage_from_cache(&self, ctx: &RenderContext) -> Option<TokenUsageInfo> {
        if let Some(mock_tokens) = ctx
            .input
            .extra
            .get("__mock__")
            .and_then(|mock| mock.get("tokensUsage"))
        {
            let used = mock_tokens
                .get("context_used")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0);
            if used == 0 && !self.config.show_zero {
                return None;
            }
            let window = mock_tokens
                .get("context_window")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or_else(|| self.context_window_for_model(ctx));
            return Some(TokenUsageInfo {
                used,
                total: window,
                percentage: None,
            });
        }

        if let Some(usage) = self.usage_from_official_input(ctx) {
            return Some(usage);
        }

        // preview 模式跳过 storage:`storage::get_session_tokens` 底层
        // `StorageManager::new()` 会 `ensure_directories()`,在用户真实
        // `~/.claude/statusline-pro/...` 下建目录,违反"preview 无副作用"
        // 契约。preview 场景下直接落到下面的 show_zero / None 分支即可,
        // 预览里 token 用量的位置和图标仍然可见,具体数字不需要真实。
        if !ctx.preview_mode {
            if let Some(session_id) = ctx.input.session_id.as_deref() {
                if let Ok(Some(tokens)) = storage::get_session_tokens(session_id).await {
                    let used = tokens.input + tokens.cache_creation_input + tokens.cache_read_input;
                    if used == 0 && !self.config.show_zero {
                        return None;
                    }
                    let window = self.context_window_for_model(ctx);
                    return Some(TokenUsageInfo {
                        used,
                        total: window,
                        percentage: None,
                    });
                }
            }
        }
        if self.config.show_zero {
            let window = self.context_window_for_model(ctx);
            return Some(TokenUsageInfo {
                used: 0,
                total: window,
                percentage: Some(0.0),
            });
        }
        None
    }

    fn context_window_for_model(&self, ctx: &RenderContext) -> u64 {
        self.model_specific_context_window(ctx)
            .unwrap_or_else(|| self.default_context_window())
    }

    fn default_context_window(&self) -> u64 {
        self.config
            .context_windows
            .get("default")
            .copied()
            .unwrap_or(200_000)
    }

    fn model_specific_context_window(&self, ctx: &RenderContext) -> Option<u64> {
        let model = ctx.input.model.as_ref()?;

        if let Some(id) = model.id.as_ref() {
            // Priority 1: Exact match from config
            if let Some(value) = context_window_from_map(&self.config.context_windows, id) {
                return Some(value);
            }

            // Priority 2: Infer from model ID params (e.g., [1m])
            if let Some(parsed) = parse_model_id(id) {
                if let Some(window) = parsed.infer_context_window() {
                    return Some(window);
                }
            }
        }

        None
    }

    fn build_progress_bar(&self, ctx: &RenderContext, percentage: f64) -> Option<String> {
        if !self.config.show_progress_bar {
            return None;
        }

        let width = self.config.progress_width.max(1) as usize;
        let width_f64 = to_f64(width);
        let filled_len = clamp_round_to_usize((percentage / 100.0) * width_f64, width);
        let capped_filled = filled_len.min(width);

        let gradient_enabled = self.config.show_gradient
            || matches!(ctx.config.theme.as_str(), "powerline" | "capsule");
        let supports_colors = ctx.terminal.supports_colors();

        let filled_char = self
            .config
            .progress_bar_chars
            .filled
            .chars()
            .next()
            .unwrap_or('█');
        let empty_char = self
            .config
            .progress_bar_chars
            .empty
            .chars()
            .next()
            .unwrap_or('░');
        let backup_char = self
            .config
            .progress_bar_chars
            .backup
            .chars()
            .next()
            .unwrap_or('▓');

        let mut bar = String::with_capacity(width * 16);
        let mut color_active = false;

        for idx in 0..width {
            if idx < capped_filled {
                let gradient_percentage = if capped_filled == 0 {
                    0.0
                } else {
                    let idx_f64 = to_f64(idx);
                    let capped_filled_f64 = to_f64(capped_filled);

                    ((idx_f64 + 0.5) / capped_filled_f64) * percentage
                }
                .clamp(0.0, 100.0);
                let is_backup = gradient_percentage >= self.config.thresholds.backup;
                let symbol = if is_backup { backup_char } else { filled_char };

                if gradient_enabled && supports_colors {
                    let (r, g, b) = rainbow_gradient_color(gradient_percentage);
                    let _ = write!(bar, "\x1b[38;2;{r};{g};{b}m{symbol}");
                    color_active = true;
                } else {
                    bar.push(symbol);
                }
            } else if gradient_enabled && supports_colors {
                bar.push_str("\x1b[38;2;120;120;120m");
                bar.push(empty_char);
                color_active = true;
            } else {
                bar.push(empty_char);
            }
        }

        if color_active {
            bar.push_str("\x1b[0m");
        }

        Some(bar)
    }

    fn select_status_icon(&self, ctx: &RenderContext, percentage: f64) -> Option<String> {
        let thresholds = &self.config.thresholds;
        let status = if percentage >= thresholds.critical {
            TokenStatusKind::Critical
        } else if percentage >= thresholds.backup {
            TokenStatusKind::Backup
        } else {
            return None;
        };

        let icons = &self.config.status_icons;
        let terminal_cfg = &ctx.config.terminal;
        let terminal = &ctx.terminal;
        let style = &ctx.config.style;

        if terminal_cfg.force_text {
            return icon_for_kind(&icons.text, status).map(std::string::ToString::to_string);
        }
        if terminal_cfg.force_nerd_font {
            if let Some(icon) = icon_for_kind(&icons.nerd, status) {
                return Some(icon.to_string());
            }
        }
        if terminal_cfg.force_emoji {
            if let Some(icon) = icon_for_kind(&icons.emoji, status) {
                return Some(icon.to_string());
            }
        }

        if terminal.supports_nerd_font
            && style
                .enable_nerd_font
                .is_enabled(terminal.supports_nerd_font)
        {
            if let Some(icon) = icon_for_kind(&icons.nerd, status) {
                return Some(icon.to_string());
            }
        }

        if terminal.supports_emoji && style.enable_emoji.is_enabled(terminal.supports_emoji) {
            if let Some(icon) = icon_for_kind(&icons.emoji, status) {
                return Some(icon.to_string());
            }
        }

        icon_for_kind(&icons.text, status).map(std::string::ToString::to_string)
    }

    fn select_color(&self, percentage: f64) -> String {
        let thresholds = &self.config.thresholds;

        if percentage >= thresholds.danger {
            self.config.colors.danger.clone()
        } else if percentage >= thresholds.warning {
            self.config.colors.warning.clone()
        } else {
            self.config.colors.safe.clone()
        }
    }

    fn format_usage(&self, info: &TokenUsageInfo) -> String {
        if self.config.show_raw_numbers {
            format!("({}/{})", info.used, info.total)
        } else {
            let used_k = to_f64(info.used) / 1_000.0;
            let total_k = to_f64(info.total) / 1_000.0;
            format!("({used_k:.1}k/{total_k:.0}k)")
        }
    }
}

#[async_trait]
impl Component for TokensComponent {
    fn name(&self) -> &'static str {
        "tokens"
    }

    fn is_enabled(&self, _ctx: &RenderContext) -> bool {
        self.config.base.enabled
    }

    async fn render(&self, ctx: &RenderContext) -> ComponentOutput {
        if !self.is_enabled(ctx) {
            return ComponentOutput::hidden();
        }

        let Some(usage) = self.fetch_usage_from_cache(ctx).await else {
            return ComponentOutput::hidden();
        };

        let total = usage.total.max(1);
        let percentage = usage
            .percentage
            .unwrap_or_else(|| (to_f64(usage.used) / to_f64(total)) * 100.0);
        let clamped_percentage = percentage.clamp(0.0, 999.9);

        let mut parts = Vec::new();

        if let Some(bar) = self.build_progress_bar(ctx, clamped_percentage) {
            let left = self
                .config
                .progress_bar_chars
                .left_bracket
                .chars()
                .next()
                .unwrap_or('[');
            let right = self
                .config
                .progress_bar_chars
                .right_bracket
                .chars()
                .next()
                .unwrap_or(']');
            parts.push(format!("{left}{bar}{right}"));
        }

        if self.config.show_percentage {
            parts.push(format!("{clamped_percentage:.1}%"));
        }

        parts.push(self.format_usage(&usage));

        if let Some(status_icon) = self.select_status_icon(ctx, clamped_percentage) {
            parts.push(status_icon);
        }

        let text = parts.join(" ");
        let color = self.select_color(clamped_percentage);
        let icon = self.select_icon(ctx);

        ComponentOutput::new(text)
            .with_icon(icon.unwrap_or_default())
            .with_icon_color(color.clone())
            .with_text_color(color)
    }

    fn base_config(&self, _ctx: &RenderContext) -> Option<&BaseComponentConfig> {
        Some(&self.config.base)
    }
}

fn context_window_from_map(
    context_windows: &std::collections::HashMap<String, u64>,
    model_id: &str,
) -> Option<u64> {
    let candidates = model_id_candidates(model_id);

    for candidate in &candidates {
        if let Some(value) = find_exact_context_window(context_windows, candidate) {
            return Some(value);
        }
    }

    find_prefix_context_window(context_windows, &candidates)
}

fn find_exact_context_window(
    context_windows: &std::collections::HashMap<String, u64>,
    candidate: &str,
) -> Option<u64> {
    context_windows
        .iter()
        .find(|(key, _)| {
            !key.eq_ignore_ascii_case("default")
                && !key.ends_with('*')
                && key.eq_ignore_ascii_case(candidate)
        })
        .map(|(_, value)| *value)
}

fn find_prefix_context_window(
    context_windows: &std::collections::HashMap<String, u64>,
    candidates: &[String],
) -> Option<u64> {
    context_windows
        .iter()
        .filter_map(|(key, value)| {
            let prefix = key.strip_suffix('*')?;
            if prefix.eq_ignore_ascii_case("default") {
                return None;
            }
            candidates
                .iter()
                .any(|candidate| candidate.starts_with(&prefix.to_ascii_lowercase()))
                .then_some((prefix.len(), *value))
        })
        .max_by_key(|(len, _)| *len)
        .map(|(_, value)| value)
}

fn model_id_candidates(model_id: &str) -> Vec<String> {
    let normalized = model_id.trim().to_ascii_lowercase();
    let mut candidates = vec![normalized.clone()];

    if let Some((_, last)) = normalized.rsplit_once('/') {
        candidates.push(last.to_string());
    }

    candidates
}

fn icon_for_kind(set: &crate::config::TokenIconSetConfig, kind: TokenStatusKind) -> Option<&str> {
    match kind {
        TokenStatusKind::Backup => (!set.backup.is_empty()).then_some(set.backup.as_str()),
        TokenStatusKind::Critical => (!set.critical.is_empty()).then_some(set.critical.as_str()),
    }
}

#[derive(Clone, Copy)]
enum TokenStatusKind {
    Backup,
    Critical,
}

fn rainbow_gradient_color(percentage: f64) -> (u8, u8, u8) {
    let p = percentage.clamp(0.0, 100.0);

    let soft_green = (80.0, 200.0, 80.0);
    let soft_yellow_green = (150.0, 200.0, 60.0);
    let soft_yellow = (200.0, 200.0, 80.0);
    let soft_orange = (220.0, 160.0, 60.0);
    let soft_red = (200.0, 100.0, 80.0);

    let lerp = |start: (f64, f64, f64), end: (f64, f64, f64), t: f64| {
        let clamp_t = t.clamp(0.0, 1.0);
        (
            (end.0 - start.0).mul_add(clamp_t, start.0),
            (end.1 - start.1).mul_add(clamp_t, start.1),
            (end.2 - start.2).mul_add(clamp_t, start.2),
        )
    };

    let (r, g, b) = if p <= 25.0 {
        lerp(soft_green, soft_yellow_green, p / 25.0)
    } else if p <= 50.0 {
        lerp(soft_yellow_green, soft_yellow, (p - 25.0) / 25.0)
    } else if p <= 75.0 {
        lerp(soft_yellow, soft_orange, (p - 50.0) / 25.0)
    } else {
        lerp(soft_orange, soft_red, (p - 75.0) / 25.0)
    };

    let convert = |value: f64| -> u8 {
        #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
        {
            value.clamp(0.0, 255.0).round() as u8
        }
    };

    (convert(r), convert(g), convert(b))
}

fn clamp_round_to_usize(value: f64, max: usize) -> usize {
    let max_f64 = to_f64(max);
    let clamped = value.clamp(0.0, max_f64);

    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let rounded = clamped.round() as usize;

    rounded.min(max)
}

fn to_f64<T: IntoF64>(value: T) -> f64 {
    value.into_f64()
}

trait IntoF64 {
    fn into_f64(self) -> f64;
}

impl IntoF64 for usize {
    fn into_f64(self) -> f64 {
        #[allow(clippy::cast_precision_loss)]
        {
            self as f64
        }
    }
}

impl IntoF64 for u64 {
    fn into_f64(self) -> f64 {
        #[allow(clippy::cast_precision_loss)]
        {
            self as f64
        }
    }
}

/// Factory for creating Tokens components
pub struct TokensComponentFactory;

impl ComponentFactory for TokensComponentFactory {
    fn create(&self, config: &Config) -> Box<dyn Component> {
        Box::new(TokensComponent::new(config.components.tokens.clone()))
    }

    fn name(&self) -> &'static str {
        "tokens"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::components::{ColorSupport, TerminalCapabilities};
    use crate::config::AutoDetect;
    use crate::core::InputData;
    use serde_json::json;
    use std::sync::Arc;

    #[allow(clippy::field_reassign_with_default)]
    fn build_tokens_config(
        configure: impl FnOnce(&mut TokensComponentConfig),
    ) -> TokensComponentConfig {
        let mut config = TokensComponentConfig::default();
        configure(&mut config);
        config
    }

    #[allow(clippy::field_reassign_with_default)]
    fn build_input(configure: impl FnOnce(&mut InputData)) -> InputData {
        let mut input = InputData::default();
        configure(&mut input);
        input
    }

    fn create_test_context_with_tokens(tokens: i64) -> RenderContext {
        let used = u64::try_from(tokens).unwrap_or(0);

        let input = build_input(|input| {
            input.session_id = Some("mock-session".to_string());
            input.extra = json!({
                "__mock__": {
                    "tokensUsage": {
                        "context_used": used
                    }
                }
            });
        });

        RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        }
    }

    #[tokio::test]
    async fn test_tokens_contains_percentage() {
        let component = TokensComponent::new(TokensComponentConfig::default());
        let ctx = create_test_context_with_tokens(1_000);

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert!(output.text.contains('%'));
    }

    #[tokio::test]
    async fn test_tokens_raw_numbers_format() {
        let config = build_tokens_config(|config| {
            config.show_percentage = false;
            config.show_progress_bar = false;
            config.show_raw_numbers = true;
        });

        let component = TokensComponent::new(config);
        let ctx = create_test_context_with_tokens(1_500);

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert!(output.text.contains("(1500/200000)"));
    }

    #[tokio::test]
    async fn test_tokens_progress_bar_enabled() {
        let config = build_tokens_config(|config| {
            config.show_progress_bar = true;
            config.show_percentage = false;
            config.show_raw_numbers = false;
        });

        let component = TokensComponent::new(config);
        let ctx = create_test_context_with_tokens(50_000);

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert!(output.text.contains('['));
    }

    #[tokio::test]
    async fn test_tokens_progress_bar_gradient() {
        let config = build_tokens_config(|config| {
            config.show_progress_bar = true;
            config.show_percentage = false;
            config.show_raw_numbers = false;
            config.show_gradient = true;
            config.progress_width = 6;
        });

        let component = TokensComponent::new(config);
        let mut ctx = create_test_context_with_tokens(100_000);
        let config = Arc::make_mut(&mut ctx.config);
        config.theme = "classic".to_string();
        config.style.enable_colors = AutoDetect::Bool(true);
        let mut terminal = ctx.terminal.clone();
        terminal.color_support = ColorSupport::TrueColor;
        let ctx = RenderContext { terminal, ..ctx };

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert!(output.text.contains("\x1b[38;2"));
    }

    #[tokio::test]
    async fn test_tokens_zero_hidden() {
        let config = build_tokens_config(|config| {
            config.show_zero = false;
        });

        let component = TokensComponent::new(config);
        let ctx = create_test_context_with_tokens(0);

        let output = component.render(&ctx).await;
        assert!(!output.visible);
    }

    #[tokio::test]
    async fn test_tokens_zero_shown() {
        let config = build_tokens_config(|config| {
            config.show_zero = true;
        });

        let component = TokensComponent::new(config);
        let ctx = create_test_context_with_tokens(0);

        let output = component.render(&ctx).await;
        assert!(output.visible);
    }

    #[tokio::test]
    async fn test_tokens_disabled() {
        let config = build_tokens_config(|config| {
            config.base.enabled = false;
        });

        let component = TokensComponent::new(config);
        let ctx = create_test_context_with_tokens(1000);

        let output = component.render(&ctx).await;
        assert!(!output.visible);
    }

    #[tokio::test]
    async fn test_tokens_mock_context_window_override() {
        let input = build_input(|input| {
            input.session_id = Some("mock-session".to_string());
            input.extra = json!({
                "__mock__": {
                    "tokensUsage": {
                        "context_used": 20u64,
                        "context_window": 100u64
                    }
                }
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let config = build_tokens_config(|config| {
            config.show_progress_bar = false;
            config.show_percentage = false;
            config.show_raw_numbers = true;
        });

        let component = TokensComponent::new(config);
        let output = component.render(&ctx).await;

        assert!(output.visible);
        assert!(output.text.contains("(20/100)"));
    }

    #[tokio::test]
    async fn test_tokens_use_official_context_window_input() {
        let input = build_input(|input| {
            input.session_id = Some("official-session".to_string());
            input.extra = json!({
                "context_window": {
                    "context_window_size": 200_000u64,
                    "used_percentage": 0.5375f64,
                    "current_usage": {
                        "input_tokens": 1_000u64,
                        "output_tokens": 200u64,
                        "cache_creation_input_tokens": 50u64,
                        "cache_read_input_tokens": 25u64
                    }
                }
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let config = build_tokens_config(|config| {
            config.show_progress_bar = false;
            config.show_percentage = false;
            config.show_raw_numbers = true;
        });

        let component = TokensComponent::new(config);
        let output = component.render(&ctx).await;

        assert!(output.visible);
        assert!(output.text.contains("(1075/200000)"));
    }

    #[tokio::test]
    async fn test_tokens_builtin_model_window_overrides_generic_official_input() {
        use crate::core::ModelInfo;

        let input = build_input(|input| {
            input.session_id = Some("deepseek-session".to_string());
            input.model = Some(ModelInfo {
                id: Some("deepseek-v4-pro".to_string()),
                display_name: None,
            });
            input.extra = json!({
                "context_window": {
                    "context_window_size": 200_000u64,
                    "used_percentage": 26.75f64,
                    "current_usage": {
                        "input_tokens": 53_500u64,
                        "cache_creation_input_tokens": 0u64,
                        "cache_read_input_tokens": 0u64
                    }
                }
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let config = build_tokens_config(|config| {
            config.show_progress_bar = false;
            config.show_percentage = true;
            config.show_raw_numbers = true;
        });

        let component = TokensComponent::new(config);
        let output = component.render(&ctx).await;

        assert!(output.visible);
        assert!(output.text.contains("5.3%"));
        assert!(output.text.contains("(53500/1000000)"));
    }

    #[tokio::test]
    async fn test_tokens_specific_official_context_window_overrides_builtin_model_window() {
        use crate::core::ModelInfo;

        let input = build_input(|input| {
            input.session_id = Some("deepseek-session".to_string());
            input.model = Some(ModelInfo {
                id: Some("deepseek-v4-pro".to_string()),
                display_name: None,
            });
            input.extra = json!({
                "context_window": {
                    "context_window_size": 1_048_576u64,
                    "used_percentage": 5.1f64,
                    "current_usage": {
                        "input_tokens": 53_500u64,
                        "cache_creation_input_tokens": 0u64,
                        "cache_read_input_tokens": 0u64
                    }
                }
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let config = build_tokens_config(|config| {
            config.show_progress_bar = false;
            config.show_percentage = false;
            config.show_raw_numbers = true;
        });

        let component = TokensComponent::new(config);
        let output = component.render(&ctx).await;

        assert!(output.visible);
        assert!(output.text.contains("(53500/1048576)"));
    }

    #[tokio::test]
    async fn test_tokens_user_exact_context_window_overrides_builtin_prefix() {
        use crate::core::ModelInfo;

        let input = build_input(|input| {
            input.session_id = Some("deepseek-session".to_string());
            input.model = Some(ModelInfo {
                id: Some("deepseek-v4-pro".to_string()),
                display_name: None,
            });
            input.extra = json!({
                "context_window": {
                    "context_window_size": 200_000u64,
                    "current_usage": {
                        "input_tokens": 10_000u64,
                        "cache_creation_input_tokens": 0u64,
                        "cache_read_input_tokens": 0u64
                    }
                }
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let config = build_tokens_config(|config| {
            config.show_progress_bar = false;
            config.show_percentage = false;
            config.show_raw_numbers = true;
            config
                .context_windows
                .insert("deepseek-v4-pro".to_string(), 777_000);
        });

        let component = TokensComponent::new(config);
        let output = component.render(&ctx).await;

        assert!(output.visible);
        assert!(output.text.contains("(10000/777000)"));
    }

    #[tokio::test]
    async fn test_tokens_namespaced_model_id_uses_builtin_context_window() {
        use crate::core::ModelInfo;

        let input = build_input(|input| {
            input.session_id = Some("mimo-session".to_string());
            input.model = Some(ModelInfo {
                id: Some("xiaomi/mimo-v2.5-pro".to_string()),
                display_name: None,
            });
            input.extra = json!({
                "context_window": {
                    "context_window_size": 200_000u64,
                    "current_usage": {
                        "input_tokens": 10_000u64,
                        "cache_creation_input_tokens": 0u64,
                        "cache_read_input_tokens": 0u64
                    }
                }
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let config = build_tokens_config(|config| {
            config.show_progress_bar = false;
            config.show_percentage = false;
            config.show_raw_numbers = true;
        });

        let component = TokensComponent::new(config);
        let output = component.render(&ctx).await;

        assert!(output.visible);
        assert!(output.text.contains("(10000/1000000)"));
    }

    #[tokio::test]
    async fn test_tokens_use_official_used_percentage_formula() {
        let input = build_input(|input| {
            input.session_id = Some("official-session".to_string());
            input.extra = json!({
                "context_window": {
                    "context_window_size": 200_000u64,
                    "used_percentage": 12.5f64,
                    "current_usage": {
                        "input_tokens": 1_000u64,
                        "output_tokens": 5_000u64,
                        "cache_creation_input_tokens": 10u64,
                        "cache_read_input_tokens": 15u64
                    }
                }
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let config = build_tokens_config(|config| {
            config.show_progress_bar = false;
            config.show_raw_numbers = false;
        });

        let component = TokensComponent::new(config);
        let output = component.render(&ctx).await;

        assert!(output.visible);
        assert!(output.text.contains("12.5%"));
    }

    #[tokio::test]
    async fn test_tokens_render_official_percentage_without_current_usage() {
        let input = build_input(|input| {
            input.session_id = Some("official-session".to_string());
            input.extra = json!({
                "context_window": {
                    "context_window_size": 200_000u64,
                    "used_percentage": 12.5f64
                }
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let config = build_tokens_config(|config| {
            config.show_progress_bar = false;
            config.show_raw_numbers = false;
        });

        let component = TokensComponent::new(config);
        let output = component.render(&ctx).await;

        assert!(output.visible);
        assert!(output.text.contains("12.5%"));
    }

    // ==================== 上下文窗口智能推断测试 ====================

    #[tokio::test]
    async fn test_context_window_infer_1m_model() {
        use crate::core::ModelInfo;

        let input = build_input(|input| {
            input.session_id = Some("mock-session".to_string());
            input.model = Some(ModelInfo {
                id: Some("claude-sonnet-4-5-20250929[1m]".to_string()),
                display_name: None,
            });
            input.extra = json!({
                "__mock__": {
                    "tokensUsage": {
                        "context_used": 100_000u64
                    }
                }
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let config = build_tokens_config(|config| {
            config.show_progress_bar = false;
            config.show_percentage = false;
            config.show_raw_numbers = true;
        });

        let component = TokensComponent::new(config);
        let output = component.render(&ctx).await;

        assert!(output.visible);
        // Should infer 1M context window from [1m] suffix
        assert!(output.text.contains("(100000/1000000)"));
    }

    #[tokio::test]
    async fn test_context_window_exact_match_takes_priority() {
        use crate::core::ModelInfo;

        let input = build_input(|input| {
            input.session_id = Some("mock-session".to_string());
            input.model = Some(ModelInfo {
                id: Some("claude-sonnet-4-5-20250929[1m]".to_string()),
                display_name: None,
            });
            input.extra = json!({
                "__mock__": {
                    "tokensUsage": {
                        "context_used": 50_000u64
                    }
                }
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let config = build_tokens_config(|config| {
            config.show_progress_bar = false;
            config.show_percentage = false;
            config.show_raw_numbers = true;
            // Exact match should take priority over inference
            config
                .context_windows
                .insert("claude-sonnet-4-5-20250929[1m]".to_string(), 500_000);
        });

        let component = TokensComponent::new(config);
        let output = component.render(&ctx).await;

        assert!(output.visible);
        // Should use exact match (500k) instead of inferred (1M)
        assert!(output.text.contains("(50000/500000)"));
    }

    #[tokio::test]
    async fn test_context_window_fallback_to_default() {
        use crate::core::ModelInfo;

        let input = build_input(|input| {
            input.session_id = Some("mock-session".to_string());
            input.model = Some(ModelInfo {
                id: Some("claude-opus-4-1-20250805".to_string()), // No [1m] suffix
                display_name: None,
            });
            input.extra = json!({
                "__mock__": {
                    "tokensUsage": {
                        "context_used": 10_000u64
                    }
                }
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let config = build_tokens_config(|config| {
            config.show_progress_bar = false;
            config.show_percentage = false;
            config.show_raw_numbers = true;
        });

        let component = TokensComponent::new(config);
        let output = component.render(&ctx).await;

        assert!(output.visible);
        // Should fallback to default 200k
        assert!(output.text.contains("(10000/200000)"));
    }
}
