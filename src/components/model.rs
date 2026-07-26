//! Model component implementation
//!
//! Displays the AI model name with optional custom mappings.

use super::base::{Component, ComponentFactory, ComponentOutput, RenderContext};
use crate::config::{BaseComponentConfig, Config, ModelComponentConfig};
use crate::utils::effort::{
    resolve_effort_level, resolve_effort_level_with, EffortEnv, EffortLevel,
};
use crate::utils::model_parser::parse_model_id;
use async_trait::async_trait;

/// Model component
pub struct ModelComponent {
    config: ModelComponentConfig,
    /// Environment snapshot used to resolve the effort level.
    ///
    /// `None` — the production case — reads the live process environment at
    /// render time. Tests inject an explicit snapshot so they neither depend on
    /// nor race over process-global env state.
    effort_env: Option<EffortEnv>,
}

impl ModelComponent {
    #[must_use]
    pub const fn new(config: ModelComponentConfig) -> Self {
        Self {
            config,
            effort_env: None,
        }
    }

    /// Resolve the effort level, honouring an injected environment when present.
    fn effort_level(&self, ctx: &RenderContext) -> Option<EffortLevel> {
        self.effort_env.as_ref().map_or_else(
            || resolve_effort_level(ctx.input.as_ref()),
            |env| resolve_effort_level_with(ctx.input.as_ref(), env),
        )
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
            if let Some(parsed) = parse_model_id(id) {
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
        let Some(mut text) = self.get_model_name(ctx) else {
            return ComponentOutput::hidden();
        };

        if let Some(level) = self.effort_level(ctx) {
            text.push(' ');
            text.push_str(level.symbol());
        }

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
    use crate::components::TerminalCapabilities;
    use crate::core::{InputData, ModelInfo, WorkspaceInfo};
    use anyhow::Result;
    use serial_test::serial;
    use std::env;
    use std::ffi::OsString;
    use std::fs;
    use std::sync::Arc;
    use tempfile::tempdir;

    #[allow(clippy::field_reassign_with_default)]
    fn build_model_config(
        configure: impl FnOnce(&mut ModelComponentConfig),
    ) -> ModelComponentConfig {
        let mut config = ModelComponentConfig::default();
        configure(&mut config);
        config
    }

    #[allow(clippy::field_reassign_with_default)]
    fn build_input(configure: impl FnOnce(&mut InputData)) -> InputData {
        let mut input = InputData::default();
        configure(&mut input);
        input
    }

    /// Build a component that reports no effort level, keeping name-formatting
    /// tests independent of the process environment.
    fn build_component(config: ModelComponentConfig) -> ModelComponent {
        build_component_with_effort(config, EffortEnv::default())
    }

    /// Build a component whose effort resolution is pinned to `effort_env`
    /// instead of reading `std::env`.
    fn build_component_with_effort(
        config: ModelComponentConfig,
        effort_env: EffortEnv,
    ) -> ModelComponent {
        ModelComponent {
            config,
            effort_env: Some(effort_env),
        }
    }

    fn create_test_context_with_model(
        id: Option<String>,
        display_name: Option<String>,
    ) -> RenderContext {
        let input = build_input(|input| {
            input.model = Some(ModelInfo { id, display_name });
        });

        RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        }
    }

    // ==================== 短名称生成测试 ====================

    #[tokio::test]
    async fn test_short_name_with_params() {
        let component = build_component(ModelComponentConfig::default());
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
        let component = build_component(ModelComponentConfig::default());
        let ctx = create_test_context_with_model(Some("claude-haiku-3-20240307".to_string()), None);

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "H3");
    }

    #[tokio::test]
    async fn test_short_name_opus() {
        let component = build_component(ModelComponentConfig::default());
        let ctx =
            create_test_context_with_model(Some("claude-opus-4-1-20250805".to_string()), None);

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "O4.1");
    }

    // ==================== 长名称生成测试 ====================

    #[tokio::test]
    async fn test_long_name_with_params() {
        let config = build_model_config(|config| {
            config.show_full_name = true;
        });

        let component = build_component(config);
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
        let config = build_model_config(|config| {
            config.show_full_name = true;
        });

        let component = build_component(config);
        let ctx = create_test_context_with_model(Some("claude-haiku-3-20240307".to_string()), None);

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "Haiku 3");
    }

    #[tokio::test]
    async fn test_long_name_opus() {
        let config = build_model_config(|config| {
            config.show_full_name = true;
        });

        let component = build_component(config);
        let ctx =
            create_test_context_with_model(Some("claude-opus-4-1-20250805".to_string()), None);

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "Opus 4.1");
    }

    // ==================== 配置映射优先级测试 ====================

    #[tokio::test]
    async fn test_custom_mapping_overrides_parsing() {
        let config = build_model_config(|config| {
            config.mapping.insert(
                "claude-sonnet-4-5-20250929[1m]".to_string(),
                "CustomS4.5".to_string(),
            );
        });

        let component = build_component(config);
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
        let config = build_model_config(|config| {
            config.show_full_name = true;
            config.long_name_mapping.insert(
                "claude-opus-4-1-20250805".to_string(),
                "Custom Opus".to_string(),
            );
        });

        let component = build_component(config);
        let ctx =
            create_test_context_with_model(Some("claude-opus-4-1-20250805".to_string()), None);

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "Custom Opus");
    }

    // ==================== 回退测试 ====================

    #[tokio::test]
    async fn test_fallback_to_original_id_on_parse_failure() {
        let component = build_component(ModelComponentConfig::default());
        let ctx = create_test_context_with_model(Some("invalid-format".to_string()), None);

        let output = component.render(&ctx).await;
        assert!(output.visible);
        // Should return original ID as final fallback
        assert_eq!(output.text, "invalid-format");
    }

    #[tokio::test]
    async fn test_fallback_to_display_name_when_no_id() {
        let component = build_component(ModelComponentConfig::default());
        let ctx = create_test_context_with_model(None, Some("Some Model Name".to_string()));

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "Some Model Name");
    }

    #[tokio::test]
    async fn test_model_appends_effort_symbol_from_env() -> Result<()> {
        let input = build_input(|input| {
            input.model = Some(ModelInfo {
                id: Some("claude-opus-4-1-20250805".to_string()),
                display_name: None,
            });
            input.extra = serde_json::json!({
                "version": "2.1.90"
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let component = build_component_with_effort(
            ModelComponentConfig::default(),
            EffortEnv {
                env_level: Some("xhigh".to_string()),
                ..EffortEnv::default()
            },
        );

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "O4.1 ◉");

        Ok(())
    }

    #[tokio::test]
    async fn test_model_appends_effort_symbol_from_settings() -> Result<()> {
        let home = tempdir()?;
        let project = tempdir()?;

        let settings_path = project.path().join(".claude/settings.local.json");
        if let Some(parent) = settings_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(settings_path, r#"{"effortLevel":"max"}"#)?;

        let input = build_input(|input| {
            input.model = Some(ModelInfo {
                id: Some("claude-sonnet-4-5-20250929".to_string()),
                display_name: None,
            });
            input.workspace = Some(WorkspaceInfo {
                current_dir: Some(project.path().join("src").to_string_lossy().to_string()),
                project_dir: Some(project.path().to_string_lossy().to_string()),
                added_dirs: None,
                git_worktree: None,
            });
            input.extra = serde_json::json!({
                "version": "2.1.90"
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        // `home` is an empty temp dir standing in for the user-level settings
        // location, so the project-level file is what actually resolves.
        let component = build_component_with_effort(
            ModelComponentConfig::default(),
            EffortEnv {
                home: Some(home.path().to_path_buf()),
                ..EffortEnv::default()
            },
        );
        let output = component.render(&ctx).await;

        assert!(output.visible);
        assert_eq!(output.text, "S4.5 ◈");

        Ok(())
    }

    /// Covers the production path: [`ModelComponent::new`] must fall back to the
    /// live process environment. Every other test in this module injects an
    /// [`EffortEnv`], so this is the only one that reads process-global state —
    /// hence `#[serial]`.
    #[tokio::test]
    #[serial]
    async fn test_model_reads_effort_from_process_env() {
        let original_effort = env::var_os("CLAUDE_CODE_EFFORT_LEVEL");
        env::set_var("CLAUDE_CODE_EFFORT_LEVEL", "xhigh");

        let input = build_input(|input| {
            input.model = Some(ModelInfo {
                id: Some("claude-opus-4-1-20250805".to_string()),
                display_name: None,
            });
            input.extra = serde_json::json!({
                "version": "2.1.90"
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let output = ModelComponent::new(ModelComponentConfig::default())
            .render(&ctx)
            .await;

        // Restore before asserting so a failure cannot leak the override.
        restore_env("CLAUDE_CODE_EFFORT_LEVEL", original_effort);

        assert!(output.visible);
        assert_eq!(output.text, "O4.1 ◉");
    }

    // ==================== 边缘情况测试 ====================

    #[tokio::test]
    async fn test_model_disabled() {
        let config = build_model_config(|config| {
            config.base.enabled = false;
        });

        let component = build_component(config);
        let ctx =
            create_test_context_with_model(Some("claude-sonnet-4-5-20250929".to_string()), None);

        let output = component.render(&ctx).await;
        assert!(!output.visible);
    }

    #[tokio::test]
    async fn test_no_model_info() {
        let component = build_component(ModelComponentConfig::default());
        let input = build_input(|input| {
            input.model = None;
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let output = component.render(&ctx).await;
        assert!(!output.visible);
    }

    fn restore_env(key: &str, value: Option<OsString>) {
        if let Some(value) = value {
            env::set_var(key, value);
        } else {
            env::remove_var(key);
        }
    }
}
