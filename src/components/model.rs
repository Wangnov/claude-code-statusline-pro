//! Model component implementation
//!
//! Displays the AI model name with optional custom mappings.

use super::base::{Component, ComponentFactory, ComponentOutput, RenderContext};
use crate::config::{BaseComponentConfig, Config, ModelComponentConfig};
use async_trait::async_trait;

/// Model component
pub struct ModelComponent {
    config: ModelComponentConfig,
}

impl ModelComponent {
    #[must_use] pub const fn new(config: ModelComponentConfig) -> Self {
        Self { config }
    }

    /// Get the model name to display
    fn get_model_name(&self, ctx: &RenderContext) -> Option<String> {
        let model = ctx.input.model.as_ref()?;

        // Priority 1: Check custom mappings first
        if let Some(id) = &model.id {
            if self.config.show_full_name {
                // Long name mode: check long_name_mapping
                if let Some(mapped) = self.config.long_name_mapping.get(id) {
                    return Some(mapped.clone());
                }
            } else {
                // Short name mode: check mapping
                if let Some(mapped) = self.config.mapping.get(id) {
                    return Some(mapped.clone());
                }
            }

            // Priority 2: Try intelligent parsing fallback
            if let Some(parsed) = self.parse_model_id(id) {
                return Some(if self.config.show_full_name {
                    parsed.long_name()
                } else {
                    parsed.short_name()
                });
            }

            // Priority 3: Final fallback - return original ID
            return Some(id.clone());
        }

        // No ID available, try display_name
        model.display_name.clone()
    }

    /// Parse a model ID into structured components
    ///
    /// Format: {provider}-{series}-{major}-{minor}-{date}[{params}]
    /// Example: claude-sonnet-4-5-20250929[1m]
    fn parse_model_id(&self, id: &str) -> Option<ParsedModelId> {
        // Extract params (e.g., "[1m]") if present
        let (base_id, params) = if let Some(bracket_start) = id.find('[') {
            (&id[..bracket_start], &id[bracket_start..])
        } else {
            (id, "")
        };

        // Split by '-' to get parts
        let parts: Vec<&str> = base_id.split('-').collect();

        // Expect at least: provider-series-major-...-date
        // Minimum 4 parts: provider-series-major-date
        if parts.len() < 4 {
            return None;
        }

        let provider = parts[0];
        let series = parts[1];

        // Determine version: could be major-minor-date or just major-date
        // Look for numeric patterns after series name
        let mut version_parts = Vec::new();
        let mut idx = 2;

        // Collect version numbers (major and optional minor)
        while idx < parts.len() {
            if parts[idx].parse::<u32>().is_ok() {
                // This looks like a version number or date
                // Date is always 8 digits (YYYYMMDD)
                if parts[idx].len() == 8 {
                    // This is the date, stop here
                    break;
                }
                version_parts.push(parts[idx]);
                idx += 1;
            } else {
                // Non-numeric part after series, invalid format
                return None;
            }
        }

        if version_parts.is_empty() {
            return None;
        }

        // Format version: "4-5" -> "4.5", "4" -> "4"
        let version = version_parts.join(".");

        Some(ParsedModelId {
            provider: provider.to_string(),
            series: series.to_string(),
            version,
            params: params.to_string(),
        })
    }
}

/// Parsed model ID components
struct ParsedModelId {
    #[allow(dead_code)]
    provider: String, // "claude", future: "gemini", "gpt", etc.
    series: String,  // "sonnet", "opus", "haiku"
    version: String, // "4.5", "3", "4.1"
    params: String,  // "[1m]" or ""
}

impl ParsedModelId {
    /// Generate short name (e.g., "S4.5[1m]")
    fn short_name(&self) -> String {
        let series_initial = self
            .series
            .chars()
            .next()
            .map(|c| c.to_uppercase().to_string())
            .unwrap_or_default();

        format!("{}{}{}", series_initial, self.version, self.params)
    }

    /// Generate long name (e.g., "Sonnet 4.5[1m]")
    fn long_name(&self) -> String {
        let series_cap = capitalize(&self.series);

        format!("{} {}{}", series_cap, self.version, self.params)
    }
}

/// Capitalize first letter of a string
fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => {
            let mut result = first.to_uppercase().to_string();
            result.push_str(&chars.as_str().to_lowercase());
            result
        }
    }
}

#[async_trait]
impl Component for ModelComponent {
    fn name(&self) -> &'static str {
        "model"
    }

    fn is_enabled(&self, _ctx: &RenderContext) -> bool {
        self.config.base.enabled
    }

    async fn render(&self, ctx: &RenderContext) -> ComponentOutput {
        // Check if component is enabled
        if !self.is_enabled(ctx) {
            return ComponentOutput::hidden();
        }

        // Get model name
        let model_name = self.get_model_name(ctx);

        // If no model, hide component
        if model_name.is_none() {
            return ComponentOutput::hidden();
        }

        let text = model_name.unwrap();

        // Select icon
        let icon = self.select_icon(ctx);

        // Create output
        ComponentOutput::new(text)
            .with_icon(icon.unwrap_or_default())
            .with_icon_color(&self.config.base.icon_color)
            .with_text_color(&self.config.base.text_color)
    }

    fn base_config(&self, _ctx: &RenderContext) -> Option<&BaseComponentConfig> {
        Some(&self.config.base)
    }
}

/// Factory for creating Model components
pub struct ModelComponentFactory;

impl ComponentFactory for ModelComponentFactory {
    fn create(&self, config: &Config) -> Box<dyn Component> {
        Box::new(ModelComponent::new(config.components.model.clone()))
    }

    fn name(&self) -> &'static str {
        "model"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{InputData, ModelInfo};
    use std::sync::Arc;

    fn create_test_context_with_model(
        id: Option<String>,
        display_name: Option<String>,
    ) -> RenderContext {
        let mut input = InputData::default();
        input.model = Some(ModelInfo { id, display_name });

        RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: Default::default(),
        }
    }

    // ==================== 智能解析测试 ====================

    #[test]
    fn test_parse_model_id_with_minor_version_and_params() {
        let component = ModelComponent::new(ModelComponentConfig::default());
        let parsed = component
            .parse_model_id("claude-sonnet-4-5-20250929[1m]")
            .expect("Should parse successfully");

        assert_eq!(parsed.provider, "claude");
        assert_eq!(parsed.series, "sonnet");
        assert_eq!(parsed.version, "4.5");
        assert_eq!(parsed.params, "[1m]");
    }

    #[test]
    fn test_parse_model_id_major_version_only() {
        let component = ModelComponent::new(ModelComponentConfig::default());
        let parsed = component
            .parse_model_id("claude-haiku-3-20240307")
            .expect("Should parse successfully");

        assert_eq!(parsed.provider, "claude");
        assert_eq!(parsed.series, "haiku");
        assert_eq!(parsed.version, "3");
        assert_eq!(parsed.params, "");
    }

    #[test]
    fn test_parse_model_id_with_minor_no_params() {
        let component = ModelComponent::new(ModelComponentConfig::default());
        let parsed = component
            .parse_model_id("claude-opus-4-1-20250805")
            .expect("Should parse successfully");

        assert_eq!(parsed.provider, "claude");
        assert_eq!(parsed.series, "opus");
        assert_eq!(parsed.version, "4.1");
        assert_eq!(parsed.params, "");
    }

    #[test]
    fn test_parse_model_id_invalid_format() {
        let component = ModelComponent::new(ModelComponentConfig::default());

        // Too few parts
        assert!(component.parse_model_id("claude-sonnet").is_none());

        // Non-numeric version
        assert!(component
            .parse_model_id("claude-sonnet-abc-20250929")
            .is_none());
    }

    // ==================== 短名称生成测试 ====================

    #[tokio::test]
    async fn test_short_name_with_params() {
        let component = ModelComponent::new(ModelComponentConfig::default());
        let ctx = create_test_context_with_model(
            Some("claude-sonnet-4-5-20250929[1m]".to_string()),
            None,
        );

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "S4.5[1m]");
    }

    #[tokio::test]
    async fn test_short_name_major_only() {
        let component = ModelComponent::new(ModelComponentConfig::default());
        let ctx = create_test_context_with_model(Some("claude-haiku-3-20240307".to_string()), None);

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "H3");
    }

    #[tokio::test]
    async fn test_short_name_opus() {
        let component = ModelComponent::new(ModelComponentConfig::default());
        let ctx =
            create_test_context_with_model(Some("claude-opus-4-1-20250805".to_string()), None);

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "O4.1");
    }

    // ==================== 长名称生成测试 ====================

    #[tokio::test]
    async fn test_long_name_with_params() {
        let mut config = ModelComponentConfig::default();
        config.show_full_name = true;

        let component = ModelComponent::new(config);
        let ctx = create_test_context_with_model(
            Some("claude-sonnet-4-5-20250929[1m]".to_string()),
            None,
        );

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "Sonnet 4.5[1m]");
    }

    #[tokio::test]
    async fn test_long_name_major_only() {
        let mut config = ModelComponentConfig::default();
        config.show_full_name = true;

        let component = ModelComponent::new(config);
        let ctx = create_test_context_with_model(Some("claude-haiku-3-20240307".to_string()), None);

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "Haiku 3");
    }

    #[tokio::test]
    async fn test_long_name_opus() {
        let mut config = ModelComponentConfig::default();
        config.show_full_name = true;

        let component = ModelComponent::new(config);
        let ctx =
            create_test_context_with_model(Some("claude-opus-4-1-20250805".to_string()), None);

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "Opus 4.1");
    }

    // ==================== 配置映射优先级测试 ====================

    #[tokio::test]
    async fn test_custom_mapping_overrides_parsing() {
        let mut config = ModelComponentConfig::default();
        config.mapping.insert(
            "claude-sonnet-4-5-20250929[1m]".to_string(),
            "CustomS4.5".to_string(),
        );

        let component = ModelComponent::new(config);
        let ctx = create_test_context_with_model(
            Some("claude-sonnet-4-5-20250929[1m]".to_string()),
            None,
        );

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "CustomS4.5");
    }

    #[tokio::test]
    async fn test_long_name_mapping_overrides_parsing() {
        let mut config = ModelComponentConfig::default();
        config.show_full_name = true;
        config.long_name_mapping.insert(
            "claude-opus-4-1-20250805".to_string(),
            "Custom Opus".to_string(),
        );

        let component = ModelComponent::new(config);
        let ctx =
            create_test_context_with_model(Some("claude-opus-4-1-20250805".to_string()), None);

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "Custom Opus");
    }

    // ==================== 回退测试 ====================

    #[tokio::test]
    async fn test_fallback_to_original_id_on_parse_failure() {
        let component = ModelComponent::new(ModelComponentConfig::default());
        let ctx = create_test_context_with_model(Some("invalid-format".to_string()), None);

        let output = component.render(&ctx).await;
        assert!(output.visible);
        // Should return original ID as final fallback
        assert_eq!(output.text, "invalid-format");
    }

    #[tokio::test]
    async fn test_fallback_to_display_name_when_no_id() {
        let component = ModelComponent::new(ModelComponentConfig::default());
        let ctx = create_test_context_with_model(None, Some("Some Model Name".to_string()));

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "Some Model Name");
    }

    // ==================== 边缘情况测试 ====================

    #[tokio::test]
    async fn test_model_disabled() {
        let mut config = ModelComponentConfig::default();
        config.base.enabled = false;

        let component = ModelComponent::new(config);
        let ctx =
            create_test_context_with_model(Some("claude-sonnet-4-5-20250929".to_string()), None);

        let output = component.render(&ctx).await;
        assert!(!output.visible);
    }

    #[tokio::test]
    async fn test_no_model_info() {
        let component = ModelComponent::new(ModelComponentConfig::default());
        let mut input = InputData::default();
        input.model = None;

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: Default::default(),
        };

        let output = component.render(&ctx).await;
        assert!(!output.visible);
    }

    // ==================== 大小写测试 ====================

    #[test]
    fn test_capitalize() {
        assert_eq!(capitalize("sonnet"), "Sonnet");
        assert_eq!(capitalize("OPUS"), "Opus");
        assert_eq!(capitalize("h"), "H");
        assert_eq!(capitalize(""), "");
    }
}
