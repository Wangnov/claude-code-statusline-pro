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
    #[must_use]
    pub const fn new(config: ProjectComponentConfig) -> Self {
        Self { config }
    }

    /// Extract project name from path
    fn extract_project_name(ctx: &RenderContext) -> Option<String> {
        if let Some(worktree_name) = ctx
            .input
            .worktree
            .as_ref()
            .and_then(|worktree| worktree.name.as_deref())
            .or_else(|| {
                ctx.input
                    .workspace
                    .as_ref()
                    .and_then(|workspace| workspace.git_worktree.as_deref())
            })
        {
            return Some(worktree_name.to_string());
        }

        let display_dir = ctx
            .input
            .worktree
            .as_ref()
            .and_then(|worktree| worktree.path.as_deref())
            .or_else(|| ctx.input.project_dir())?;
        let sanitized = display_dir.trim_end_matches(['/', '\\']);

        if sanitized.is_empty() {
            return None;
        }

        let path = Path::new(sanitized);

        path.file_name()
            .and_then(|os| os.to_str().map(std::string::ToString::to_string))
            .or_else(|| {
                sanitized
                    .split(['/', '\\'])
                    .rfind(|segment| !segment.is_empty())
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
        let project_name = Self::extract_project_name(ctx);

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
    use crate::components::TerminalCapabilities;
    use crate::core::{InputData, WorkspaceInfo, WorktreeInfo};
    use std::sync::Arc;

    #[allow(clippy::field_reassign_with_default)]
    fn build_input(configure: impl FnOnce(&mut InputData)) -> InputData {
        let mut input = InputData::default();
        configure(&mut input);
        input
    }

    #[allow(clippy::field_reassign_with_default)]
    fn build_project_config(
        configure: impl FnOnce(&mut ProjectComponentConfig),
    ) -> ProjectComponentConfig {
        let mut config = ProjectComponentConfig::default();
        configure(&mut config);
        config
    }

    fn create_test_context() -> RenderContext {
        let input = build_input(|input| {
            input.workspace = Some(WorkspaceInfo {
                current_dir: Some("/home/user/my-project".to_string()),
                project_dir: Some("/home/user/my-project".to_string()),
                added_dirs: None,
                git_worktree: None,
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
    async fn test_project_name_extraction() {
        let component = ProjectComponent::new(ProjectComponentConfig::default());
        let ctx = create_test_context();

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "my-project");
    }

    #[tokio::test]
    async fn test_project_disabled() {
        let config = build_project_config(|config| {
            config.base.enabled = false;
        });

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
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let output = component.render(&ctx).await;
        assert!(!output.visible);
    }

    #[tokio::test]
    async fn test_project_prefers_worktree_path() {
        let input = build_input(|input| {
            input.workspace = Some(WorkspaceInfo {
                current_dir: Some("/home/user/current-dir".to_string()),
                project_dir: Some("/home/user/original-project".to_string()),
                added_dirs: None,
                git_worktree: Some("feature-x".to_string()),
            });
            input.worktree = Some(WorktreeInfo {
                path: Some("/home/user/.claude/worktrees/feature-x".to_string()),
                ..Default::default()
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let component = ProjectComponent::new(ProjectComponentConfig::default());
        let output = component.render(&ctx).await;

        assert!(output.visible);
        assert_eq!(output.text, "feature-x");
    }

    #[tokio::test]
    async fn test_project_uses_git_worktree_name_for_generic_sessions() {
        let input = build_input(|input| {
            input.workspace = Some(WorkspaceInfo {
                current_dir: Some("/repo/.claude/worktrees/feature-x".to_string()),
                project_dir: Some("/repo".to_string()),
                added_dirs: None,
                git_worktree: Some("feature-x".to_string()),
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let component = ProjectComponent::new(ProjectComponentConfig::default());
        let output = component.render(&ctx).await;

        assert!(output.visible);
        assert_eq!(output.text, "feature-x");
    }

    #[tokio::test]
    async fn test_project_uses_project_root_for_regular_sessions() {
        let input = build_input(|input| {
            input.workspace = Some(WorkspaceInfo {
                current_dir: Some("/home/user/my-project/src".to_string()),
                project_dir: Some("/home/user/my-project".to_string()),
                added_dirs: None,
                git_worktree: None,
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
            preview_mode: false,
        };

        let component = ProjectComponent::new(ProjectComponentConfig::default());
        let output = component.render(&ctx).await;

        assert!(output.visible);
        assert_eq!(output.text, "my-project");
    }
}
