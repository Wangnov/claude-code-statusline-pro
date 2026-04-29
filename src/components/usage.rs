//! Usage组件 | Usage component
//!
//! 显示Session的成本和代码行数统计 | Display session cost and code line statistics
//!
//! Following Dennis Ritchie's philosophy of building tools that work together,
//! this component integrates seamlessly with the storage system.

use std::fmt::Write;

use crate::components::base::{Component, ComponentFactory, ComponentOutput, RenderContext};
use crate::config::{BaseComponentConfig, Config, UsageComponentConfig};
use crate::storage;
use async_trait::async_trait;

const AUTO_CURRENCY: &str = "auto";
const DEFAULT_CURRENCY: &str = "USD";

const BUILTIN_ENDPOINT_CURRENCY_RULES: &[(&str, &str)] = &[
    ("open.bigmodel.cn", "CNY"),
    ("api.z.ai", "USD"),
    ("api.deepseek.com", "CNY"),
    ("api.minimaxi.com", "CNY"),
    ("api.minimax.io", "USD"),
    ("api.moonshot.cn", "CNY"),
    ("api.moonshot.ai", "USD"),
    ("dashscope.aliyuncs.com", "CNY"),
    ("dashscope-intl.aliyuncs.com", "USD"),
    ("dashscope-us.aliyuncs.com", "USD"),
    ("ark.cn-beijing.volces.com", "CNY"),
    ("ark.ap-southeast.bytepluses.com", "USD"),
    ("ark.eu-west.bytepluses.com", "USD"),
    ("api.hunyuan.cloud.tencent.com", "CNY"),
    ("qianfan.baidubce.com", "CNY"),
    ("xiaomimimo.com", "USD"),
];

const BUILTIN_MODEL_CURRENCY_RULES: &[(&str, &str)] = &[
    ("deepseek", "CNY"),
    ("mimo", "USD"),
    ("claude", "USD"),
    ("anthropic", "USD"),
    ("openai", "USD"),
    ("gpt", "USD"),
    ("o1", "USD"),
    ("o3", "USD"),
    ("o4", "USD"),
];

/// Official Session data interface from Claude Code stdin JSON format
#[derive(Debug, Clone, serde::Deserialize)]
pub struct OfficialSessionData {
    pub session_id: Option<String>,
    pub transcript_path: Option<String>,
    pub cwd: Option<String>,
    pub model: Option<OfficialModelData>,
    pub workspace: Option<OfficialWorkspaceData>,
    pub version: Option<String>,
    pub output_style: Option<OfficialOutputStyleData>,
    pub cost: Option<OfficialCostData>,
    pub exceeds_200k_tokens: Option<bool>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct OfficialModelData {
    pub id: String,
    pub display_name: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct OfficialWorkspaceData {
    pub current_dir: String,
    pub project_dir: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct OfficialOutputStyleData {
    pub name: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct OfficialCostData {
    pub total_cost_usd: f64,
    pub currency: Option<String>,
    pub total_duration_ms: Option<u64>,
    pub total_api_duration_ms: Option<u64>,
    pub total_lines_added: u64,
    pub total_lines_removed: u64,
}

/// Usage组件 - 显示Session成本统计
pub struct UsageComponent {
    name: String,
    config: UsageComponentConfig,
}

impl UsageComponent {
    /// Create new usage component
    #[must_use]
    pub const fn new(name: String, config: UsageComponentConfig) -> Self {
        Self { name, config }
    }

    /// 渲染Mock数据 | Render mock data
    fn render_mock_usage_data(
        &self,
        mock_usage_data: &serde_json::Value,
        ctx: &RenderContext,
    ) -> ComponentOutput {
        // Default mock usage data
        let default_usage = serde_json::json!({
            "session_id": "mock-session",
            "transcript_path": "/mock/path",
            "cwd": "/mock/cwd",
            "model": {
                "id": "claude-sonnet-4-20250514",
                "display_name": "Sonnet 4"
            },
            "workspace": {
                "current_dir": "/mock/cwd",
                "project_dir": "/mock/cwd"
            },
            "version": "1.0.88",
            "output_style": {
                "name": "default"
            },
            "cost": {
                "total_cost_usd": 0.1234,
                "total_duration_ms": 120_000,
                "total_api_duration_ms": 30_000,
                "total_lines_added": 25,
                "total_lines_removed": 8
            },
            "exceeds_200k_tokens": false
        });

        // Merge with provided mock data
        let mut merged_data = default_usage;
        if let serde_json::Value::Object(ref mock_obj) = mock_usage_data {
            if let serde_json::Value::Object(ref mut default_obj) = merged_data {
                for (key, value) in mock_obj {
                    default_obj.insert(key.clone(), value.clone());
                }
            }
        }

        self.format_official_usage_display(&merged_data, ctx)
    }

    /// 渲染无数据状态 | Render no data state
    fn render_no_data(&self, ctx: &RenderContext) -> ComponentOutput {
        let icon = self.select_icon(ctx);
        let currency_prefix = self.resolve_currency_prefix(None);
        ComponentOutput::new(Self::format_cost(
            0.0,
            self.config.precision,
            &currency_prefix,
        ))
        .with_icon_color("gray".to_string())
        .with_text_color("gray".to_string())
        .with_icon(icon.unwrap_or_default())
    }

    /// 格式化官方使用信息显示 | Format official usage info display
    fn format_official_usage_display(
        &self,
        data: &serde_json::Value,
        ctx: &RenderContext,
    ) -> ComponentOutput {
        let icon = self.select_icon(ctx);
        let currency_prefix = self.resolve_currency_prefix(Some(data));
        let display_text = self.build_official_display_text(data, &currency_prefix);
        let cost = data
            .get("cost")
            .and_then(|c| c.get("total_cost_usd"))
            .and_then(serde_json::Value::as_f64)
            .unwrap_or(0.0);
        let color = Self::get_usage_color(cost);

        ComponentOutput::new(display_text)
            .with_icon_color(color.clone())
            .with_text_color(color)
            .with_icon(icon.unwrap_or_default())
    }

    /// 构建官方数据显示文本 | Build official data display text
    fn build_official_display_text(
        &self,
        data: &serde_json::Value,
        currency_prefix: &str,
    ) -> String {
        let cost = data
            .get("cost")
            .and_then(|c| c.get("total_cost_usd"))
            .and_then(serde_json::Value::as_f64)
            .unwrap_or(0.0);

        let lines_added = data
            .get("cost")
            .and_then(|c| c.get("total_lines_added"))
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(0);

        let lines_removed = data
            .get("cost")
            .and_then(|c| c.get("total_lines_removed"))
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(0);

        let mut text = Self::format_cost(cost, self.config.precision, currency_prefix);

        // 根据显示模式和配置添加代码行数 | Add code lines based on display mode and config
        if self.config.display_mode == "conversation"
            && (self.config.show_lines_added || self.config.show_lines_removed)
        {
            let mut line_parts = Vec::new();

            if self.config.show_lines_added && lines_added > 0 {
                line_parts.push(format!("+{lines_added}"));
            }

            if self.config.show_lines_removed && lines_removed > 0 {
                line_parts.push(format!("-{lines_removed}"));
            }

            if !line_parts.is_empty() {
                let _ = write!(text, " {}", line_parts.join(" "));
            }
        }

        text
    }

    /// 格式化成本显示 | Format cost display
    fn format_cost(cost: f64, precision: u32, currency_prefix: &str) -> String {
        let precision = precision as usize;
        format!("{currency_prefix}{cost:.precision$}")
    }

    fn resolve_currency_prefix(&self, data: Option<&serde_json::Value>) -> String {
        Self::currency_prefix_for_code(&self.resolve_currency_code(data))
    }

    fn resolve_currency_code(&self, data: Option<&serde_json::Value>) -> String {
        let configured_currency = self.config.currency.trim();
        if !configured_currency.eq_ignore_ascii_case(AUTO_CURRENCY) {
            return configured_currency.to_string();
        }

        let endpoint = std::env::var("ANTHROPIC_BASE_URL").ok();
        let model_names = data.map_or_else(Vec::new, Self::extract_model_names);

        if let Some(endpoint) = endpoint.as_deref() {
            if let Some(currency) =
                Self::match_endpoint_rules(endpoint, &self.config.currency_endpoint_rules)
            {
                return currency;
            }
        }

        if let Some(currency) =
            Self::match_model_rules(&model_names, &self.config.currency_model_rules)
        {
            return currency;
        }

        if let Some(currency) = data.and_then(Self::extract_cost_currency) {
            return currency.to_string();
        }

        if let Some(endpoint) = endpoint.as_deref() {
            if let Some(currency) = Self::match_builtin_endpoint_rules(endpoint) {
                return currency.to_string();
            }
        }

        if let Some(currency) = Self::match_builtin_model_rules(&model_names) {
            return currency.to_string();
        }

        DEFAULT_CURRENCY.to_string()
    }

    fn extract_cost_currency(data: &serde_json::Value) -> Option<&str> {
        data.get("cost")
            .and_then(|cost| cost.get("currency"))
            .and_then(serde_json::Value::as_str)
            .map(str::trim)
            .filter(|currency| !currency.is_empty())
    }

    fn extract_model_names(data: &serde_json::Value) -> Vec<String> {
        let mut names = Vec::new();

        if let Some(model) = data.get("model") {
            if let Some(model_name) = model.as_str() {
                names.push(model_name.to_string());
            }

            for field in ["id", "display_name", "displayName", "name"] {
                if let Some(model_name) = model.get(field).and_then(serde_json::Value::as_str) {
                    names.push(model_name.to_string());
                }
            }
        }

        names
    }

    fn match_endpoint_rules(
        endpoint: &str,
        rules: &std::collections::HashMap<String, String>,
    ) -> Option<String> {
        let mut entries: Vec<_> = rules.iter().collect();
        entries.sort_by(|(left, _), (right, _)| {
            right.len().cmp(&left.len()).then_with(|| left.cmp(right))
        });

        entries.into_iter().find_map(|(pattern, currency)| {
            Self::endpoint_matches(pattern, endpoint).then(|| currency.clone())
        })
    }

    fn match_model_rules(
        model_names: &[String],
        rules: &std::collections::HashMap<String, String>,
    ) -> Option<String> {
        let mut entries: Vec<_> = rules.iter().collect();
        entries.sort_by(|(left, _), (right, _)| {
            right.len().cmp(&left.len()).then_with(|| left.cmp(right))
        });

        entries.into_iter().find_map(|(pattern, currency)| {
            model_names
                .iter()
                .any(|model_name| Self::model_matches(pattern, model_name))
                .then(|| currency.clone())
        })
    }

    fn match_builtin_endpoint_rules(endpoint: &str) -> Option<&'static str> {
        BUILTIN_ENDPOINT_CURRENCY_RULES
            .iter()
            .find_map(|(pattern, currency)| {
                Self::endpoint_matches(pattern, endpoint).then_some(*currency)
            })
    }

    fn match_builtin_model_rules(model_names: &[String]) -> Option<&'static str> {
        BUILTIN_MODEL_CURRENCY_RULES
            .iter()
            .find_map(|(pattern, currency)| {
                model_names
                    .iter()
                    .any(|model_name| Self::model_matches(pattern, model_name))
                    .then_some(*currency)
            })
    }

    fn endpoint_matches(pattern: &str, endpoint: &str) -> bool {
        let pattern_host = Self::endpoint_host(pattern);
        let endpoint_host = Self::endpoint_host(endpoint);

        if pattern_host.is_empty() || endpoint_host.is_empty() {
            return false;
        }

        endpoint_host == pattern_host
            || endpoint_host
                .strip_suffix(&pattern_host)
                .is_some_and(|prefix| prefix.ends_with('.'))
    }

    fn endpoint_host(endpoint: &str) -> String {
        let normalized = endpoint.trim().to_ascii_lowercase();
        let without_scheme = normalized
            .split_once("://")
            .map_or(normalized.as_str(), |(_, rest)| rest);
        let without_auth = without_scheme
            .rsplit_once('@')
            .map_or(without_scheme, |(_, host)| host);
        let host_with_port = without_auth
            .split(&['/', '?', '#'][..])
            .next()
            .unwrap_or_default();
        host_with_port
            .split(':')
            .next()
            .unwrap_or_default()
            .trim_matches('.')
            .to_string()
    }

    fn model_matches(pattern: &str, model_name: &str) -> bool {
        let pattern = pattern.trim().to_ascii_lowercase();
        let model_name = model_name.trim().to_ascii_lowercase();

        !pattern.is_empty() && (model_name == pattern || model_name.contains(&pattern))
    }

    fn currency_prefix_for_code(currency: &str) -> String {
        let trimmed = currency.trim();
        let normalized = trimmed.to_ascii_uppercase();

        match normalized.as_str() {
            "" | "AUTO" => Self::currency_prefix_for_code(DEFAULT_CURRENCY),
            "USD" | "US$" | "$" => "$".to_string(),
            "CNY" | "RMB" | "CN¥" | "JPY" | "JP¥" | "¥" | "￥" => "¥".to_string(),
            "EUR" | "€" => "€".to_string(),
            "GBP" | "£" => "£".to_string(),
            _ if normalized.chars().all(|ch| ch.is_ascii_alphabetic()) && normalized.len() <= 4 => {
                format!("{normalized} ")
            }
            _ => trimmed.to_string(),
        }
    }

    /// 获取使用信息的颜色 | Get usage info color based on cost amount
    fn get_usage_color(cost: f64) -> String {
        if cost > 1.0 {
            "red".to_string() // 高成本 | High cost
        } else if cost > 0.1 {
            "yellow".to_string() // 中等成本 | Medium cost
        } else if cost > 0.0 {
            "green".to_string() // 低成本 | Low cost
        } else {
            "gray".to_string() // 无成本 | No cost
        }
    }

    /// 渲染对话级成本 | Render conversation-level cost (async version)
    async fn render_conversation_cost_async(
        &self,
        session_id: &str,
        ctx: &RenderContext,
        currency_prefix: &str,
    ) -> ComponentOutput {
        let icon = self.select_icon(ctx);

        // preview 模式下绝对不能走真实 storage:`storage::get_conversation_cost_display`
        // 内部会调 `StorageManager::new()`,其构造会 `ensure_directories()`,
        // 在用户真实的 `~/.claude/statusline-pro/...` 下建目录,违反"preview
        // 无副作用"的契约。返回一个稳定的 $0.00 占位,预览里只是让用户能看到
        // 这个组件会出现在状态行的哪个位置,数字不需要是真实的。
        if ctx.preview_mode {
            return ComponentOutput::new(Self::format_cost(
                0.0,
                self.config.precision,
                currency_prefix,
            ))
            .with_icon_color("gray".to_string())
            .with_text_color("gray".to_string())
            .with_icon(icon.unwrap_or_default());
        }

        // 使用新的conversation cost API
        match storage::get_conversation_cost_display(session_id).await {
            Ok(cost) => {
                if cost > 0.0 {
                    let formatted_cost =
                        Self::format_cost(cost, self.config.precision, currency_prefix);

                    ComponentOutput::new(formatted_cost)
                        .with_icon_color("cyan".to_string())
                        .with_text_color("cyan".to_string())
                        .with_icon(icon.unwrap_or_default())
                } else {
                    ComponentOutput::new(Self::format_cost(
                        0.0,
                        self.config.precision,
                        currency_prefix,
                    ))
                    .with_icon_color("gray".to_string())
                    .with_text_color("gray".to_string())
                    .with_icon(icon.unwrap_or_default())
                }
            }
            Err(e) => {
                eprintln!("Failed to load conversation cost: {e}");
                ComponentOutput::new(Self::format_cost(
                    0.0,
                    self.config.precision,
                    currency_prefix,
                ))
                .with_icon_color("gray".to_string())
                .with_text_color("gray".to_string())
                .with_icon(icon.unwrap_or_default())
            }
        }
    }
}

#[async_trait]
impl Component for UsageComponent {
    fn name(&self) -> &str {
        &self.name
    }

    fn is_enabled(&self, _ctx: &RenderContext) -> bool {
        self.config.base.enabled
    }

    fn base_config(&self, _ctx: &RenderContext) -> Option<&BaseComponentConfig> {
        Some(&self.config.base)
    }

    async fn render(&self, ctx: &RenderContext) -> ComponentOutput {
        let input_data = &ctx.input;

        // 检查是否有Mock数据 | Check for mock data
        if let Some(mock_data) = input_data.extra.get("__mock__") {
            if let Some(usage_data) = mock_data.get("usageData") {
                return self.render_mock_usage_data(usage_data, ctx);
            }
        }

        let serialized_input = match serde_json::to_value(&**input_data) {
            Ok(value) => Some(value),
            Err(err) => {
                eprintln!("Failed to serialize usage input: {err}");
                None
            }
        };

        if let Some(session_id) = input_data.session_id.as_deref() {
            if self.config.display_mode == "conversation" {
                let currency_prefix = self.resolve_currency_prefix(serialized_input.as_ref());
                return self
                    .render_conversation_cost_async(session_id, ctx, &currency_prefix)
                    .await;
            }
        }

        if let Some(ref value) = serialized_input {
            return self.format_official_usage_display(value, ctx);
        }

        if input_data.cost.is_some() {
            // 存在官方数据但序列化失败时的降级处理 | Graceful fallback when serialization fails
            return self.render_no_data(ctx);
        }

        self.render_no_data(ctx)
    }
}

/// Usage组件工厂 | Usage component factory
pub struct UsageComponentFactory;

impl Default for UsageComponentFactory {
    fn default() -> Self {
        Self::new()
    }
}

impl UsageComponentFactory {
    #[must_use]
    pub const fn new() -> Self {
        Self
    }
}

impl ComponentFactory for UsageComponentFactory {
    fn create(&self, config: &Config) -> Box<dyn Component> {
        Box::new(UsageComponent::new(
            "usage".to_string(),
            config.components.usage.clone(),
        ))
    }

    fn name(&self) -> &'static str {
        "usage"
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::*;

    struct EnvVarGuard {
        key: &'static str,
        original: Option<std::ffi::OsString>,
    }

    impl EnvVarGuard {
        fn unset(key: &'static str) -> Self {
            let original = std::env::var_os(key);
            std::env::remove_var(key);
            Self { key, original }
        }
    }

    impl Drop for EnvVarGuard {
        fn drop(&mut self) {
            if let Some(value) = self.original.as_ref() {
                std::env::set_var(self.key, value);
            } else {
                std::env::remove_var(self.key);
            }
        }
    }

    fn component_with_config(config: UsageComponentConfig) -> UsageComponent {
        UsageComponent::new("usage".to_string(), config)
    }

    #[test]
    fn explicit_currency_overrides_upstream_currency() {
        let mut config = UsageComponentConfig {
            currency: "CNY".to_string(),
            ..UsageComponentConfig::default()
        };
        config.precision = 2;
        let component = component_with_config(config);
        let data = serde_json::json!({
            "model": { "id": "claude-sonnet-4" },
            "cost": {
                "total_cost_usd": 1.23,
                "currency": "USD"
            }
        });

        assert_eq!(component.resolve_currency_prefix(Some(&data)), "¥");
    }

    #[test]
    #[serial_test::serial]
    fn upstream_currency_is_used_in_auto_mode() {
        let _env_guard = EnvVarGuard::unset("ANTHROPIC_BASE_URL");
        let component = component_with_config(UsageComponentConfig::default());
        let data = serde_json::json!({
            "model": { "id": "claude-sonnet-4" },
            "cost": {
                "total_cost_usd": 1.23,
                "currency": "EUR"
            }
        });

        assert_eq!(component.resolve_currency_prefix(Some(&data)), "€");
    }

    #[test]
    fn custom_rules_override_upstream_currency_in_auto_mode() {
        let mut config = UsageComponentConfig::default();
        config
            .currency_model_rules
            .insert("deepseek".to_string(), "CNY".to_string());
        let component = component_with_config(config);
        let data = serde_json::json!({
            "model": { "id": "deepseek-v4-pro" },
            "cost": {
                "total_cost_usd": 1.23,
                "currency": "USD"
            }
        });

        assert_eq!(component.resolve_currency_prefix(Some(&data)), "¥");
    }

    #[test]
    fn custom_endpoint_rules_match_urls_and_hosts() {
        let rules = HashMap::from([
            ("api.minimax.io".to_string(), "CNY".to_string()),
            (
                "https://tenant.example.com/v1".to_string(),
                "EUR".to_string(),
            ),
        ]);

        assert_eq!(
            UsageComponent::match_endpoint_rules("https://api.minimax.io/v1", &rules),
            Some("CNY".to_string())
        );
        assert_eq!(
            UsageComponent::match_endpoint_rules("https://tenant.example.com/v1/chat", &rules),
            Some("EUR".to_string())
        );
    }

    #[test]
    fn custom_model_rules_match_case_insensitive_substrings() {
        let rules = HashMap::from([("mimo".to_string(), "USD".to_string())]);
        let model_names = ["Xiaomi-MiMo-V2.5-Pro".to_string()];

        assert_eq!(
            UsageComponent::match_model_rules(&model_names, &rules),
            Some("USD".to_string())
        );
    }

    #[test]
    fn builtin_endpoint_rules_cover_common_cn_and_global_hosts() {
        assert_eq!(
            UsageComponent::match_builtin_endpoint_rules("https://api.deepseek.com/v1"),
            Some("CNY")
        );
        assert_eq!(
            UsageComponent::match_builtin_endpoint_rules("https://api.minimaxi.com/anthropic"),
            Some("CNY")
        );
        assert_eq!(
            UsageComponent::match_builtin_endpoint_rules("https://api.minimax.io/v1"),
            Some("USD")
        );
        assert_eq!(
            UsageComponent::match_builtin_endpoint_rules("https://api.moonshot.cn/v1"),
            Some("CNY")
        );
        assert_eq!(
            UsageComponent::match_builtin_endpoint_rules("https://api.xiaomimimo.com/v1"),
            Some("USD")
        );
    }

    #[test]
    fn builtin_model_rules_cover_deepseek_and_mimo_fallbacks() {
        let deepseek_models = ["deepseek-v4-pro".to_string()];
        let mimo_models = ["mimo-v2-flash".to_string()];

        assert_eq!(
            UsageComponent::match_builtin_model_rules(&deepseek_models),
            Some("CNY")
        );
        assert_eq!(
            UsageComponent::match_builtin_model_rules(&mimo_models),
            Some("USD")
        );
    }

    #[test]
    fn formats_custom_currency_codes_with_separator() {
        assert_eq!(UsageComponent::currency_prefix_for_code("AUD"), "AUD ");
        assert_eq!(UsageComponent::format_cost(1.234, 2, "AUD "), "AUD 1.23");
    }
}
