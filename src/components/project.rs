//! Project component implementation
//!
//! Displays the project name extracted from the current directory or workspace.

use super::base::{Component, ComponentFactory, ComponentOutput, RenderContext};
use crate::config::{BaseComponentConfig, Config, ProjectComponentConfig};
use async_trait::async_trait;
use std::path::Path;

/// Project component
pub struct ProjectComponent {
    config: ProjectComponentConfig,
}

impl ProjectComponent {
    #[must_use] pub const fn new(config: ProjectComponentConfig) -> Self {
        Self { config }
    }

    /// Extract project name from path
    fn extract_project_name(&self, ctx: &RenderContext) -> Option<String> {
        // Try to get project directory from input
        let project_dir = ctx.input.project_dir()?;
        let sanitized = project_dir.trim_end_matches(['/', '\\']);

        if sanitized.is_empty() {
            return None;
        }

        let path = Path::new(sanitized);

        path.file_name()
            .and_then(|os| os.to_str().map(std::string::ToString::to_string))
            .or_else(|| {
                sanitized
                    .split(['/', '\\'])
                    .filter(|segment| !segment.is_empty())
                    .next_back()
                    .map(std::string::ToString::to_string)
            })
    }
}

#[async_trait]
impl Component for ProjectComponent {
    fn name(&self) -> &'static str {
        "project"
    }

    fn is_enabled(&self, _ctx: &RenderContext) -> bool {
        self.config.base.enabled
    }

    async fn render(&self, ctx: &RenderContext) -> ComponentOutput {
        // Check if component is enabled
        if !self.is_enabled(ctx) {
            return ComponentOutput::hidden();
        }

        // Extract project name
        let project_name = self.extract_project_name(ctx);

        // Check if we should show when empty
        if project_name.is_none() && !self.config.show_when_empty {
            return ComponentOutput::hidden();
        }

        // Get the project name or default
        let text = project_name.unwrap_or_else(|| "project".to_string());

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

/// Factory for creating Project components
pub struct ProjectComponentFactory;

impl ComponentFactory for ProjectComponentFactory {
    fn create(&self, config: &Config) -> Box<dyn Component> {
        Box::new(ProjectComponent::new(config.components.project.clone()))
    }

    fn name(&self) -> &'static str {
        "project"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{InputData, WorkspaceInfo};
    use std::sync::Arc;

    fn create_test_context() -> RenderContext {
        let mut input = InputData::default();
        input.workspace = Some(WorkspaceInfo {
            current_dir: Some("/home/user".to_string()),
            project_dir: Some("/home/user/my-project".to_string()),
        });

        RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: Default::default(),
        }
    }

    #[tokio::test]
    async fn test_project_name_extraction() {
        let component = ProjectComponent::new(ProjectComponentConfig::default());
        let ctx = create_test_context();

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "my-project");
    }

    #[tokio::test]
    async fn test_project_disabled() {
        let mut config = ProjectComponentConfig::default();
        config.base.enabled = false;

        let component = ProjectComponent::new(config);
        let ctx = create_test_context();

        let output = component.render(&ctx).await;
        assert!(!output.visible);
    }

    #[tokio::test]
    async fn test_project_empty_not_shown() {
        let config = ProjectComponentConfig {
            show_when_empty: false,
            ..Default::default()
        };

        let component = ProjectComponent::new(config);
        let ctx = RenderContext {
            input: Arc::new(InputData::default()),
            config: Arc::new(Config::default()),
            terminal: Default::default(),
        };

        let output = component.render(&ctx).await;
        assert!(!output.visible);
    }
}
