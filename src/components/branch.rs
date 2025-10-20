//! Branch component implementation
//!
//! Displays Git branch information with optional status indicators.

use std::collections::HashMap;
use std::fmt::Write as _;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use super::base::{Component, ComponentFactory, ComponentOutput, RenderContext};
use crate::config::{BaseComponentConfig, BranchComponentConfig, Config};
use crate::git::{GitCollectionOptions, GitInfo, GitService};
use async_trait::async_trait;
use tokio::task;

/// Branch component
pub struct BranchComponent {
    config: BranchComponentConfig,
    git_cache: Mutex<HashMap<PathBuf, CachedGitEntry>>,
}

impl BranchComponent {
    #[must_use]
    pub fn new(config: BranchComponentConfig) -> Self {
        Self {
            config,
            git_cache: Mutex::new(HashMap::new()),
        }
    }

    fn resolve_repo_path(ctx: &RenderContext) -> Option<PathBuf> {
        if let Some(project_dir) = ctx.input.project_dir() {
            return Some(PathBuf::from(project_dir));
        }

        if let Some(workspace) = &ctx.input.workspace {
            if let Some(dir) = &workspace.project_dir {
                return Some(PathBuf::from(dir));
            }
            if let Some(dir) = &workspace.current_dir {
                return Some(PathBuf::from(dir));
            }
        }

        ctx.input
            .cwd
            .as_ref()
            .map(|cwd| PathBuf::from(cwd.as_str()))
    }

    async fn load_git_info(&self, ctx: &RenderContext) -> Option<GitInfo> {
        let repo_path = Self::resolve_repo_path(ctx)?;
        let performance = self.config.performance.clone();
        let status_config = self.config.status.clone();
        let include_status = self.status_required();
        let include_stash = status_config.show_stash_count;

        if performance.enable_cache {
            if let Some(info) = self.cached_git_info(repo_path.as_path()) {
                return Some(info);
            }
        }

        let enable_cache = performance.enable_cache;
        let cache_ttl = Duration::from_millis(performance.cache_ttl);
        let path_for_store = repo_path.clone();

        let result = task::spawn_blocking(move || {
            let service = GitService::discover(repo_path)?;

            let mut options = GitCollectionOptions {
                include_status,
                include_stash,
                include_operation: false,
                include_version: false,
            };

            if performance.skip_on_large_repo {
                let entry_count = service.estimate_workdir_entries() as u64;
                if entry_count > performance.large_repo_threshold {
                    options.include_status = false;
                    options.include_stash = false;
                }
            }

            Ok::<GitInfo, anyhow::Error>(service.collect_info_with_options(&options))
        })
        .await;

        match result {
            Ok(Ok(info)) => {
                if enable_cache {
                    self.store_git_info(path_for_store, info.clone(), cache_ttl);
                }
                Some(info)
            }
            _ => None,
        }
    }

    fn cached_git_info(&self, path: &Path) -> Option<GitInfo> {
        let mut guard = self.git_cache.lock().ok()?;
        let now = Instant::now();
        if let Some(entry) = guard.get(path) {
            if entry.expires_at > now {
                return Some(entry.info.clone());
            }
        }
        guard.remove(path);
        None
    }

    fn store_git_info(&self, path: PathBuf, info: GitInfo, ttl: Duration) {
        if ttl.is_zero() {
            return;
        }
        let expires_at = Instant::now() + ttl;
        if let Ok(mut guard) = self.git_cache.lock() {
            guard.insert(path, CachedGitEntry { expires_at, info });
        }
    }

    fn prepare_branch_name(&self, raw: &str) -> String {
        let max_len = self.config.max_length.max(3) as usize;
        if raw.len() > max_len {
            let mut truncated = raw.chars().take(max_len - 3).collect::<String>();
            truncated.push_str("...");
            truncated
        } else {
            raw.to_string()
        }
    }

    /// Get the branch name and status from stdin fallback
    fn get_branch_info(&self, ctx: &RenderContext) -> Option<(String, BranchStatus)> {
        let branch_name = ctx.input.branch()?;

        let mut status = BranchStatus::default();

        if let Some(git) = &ctx.input.git {
            if self.config.status.show_dirty {
                let is_dirty = git.status.as_ref().is_some_and(|s| s == "dirty")
                    || git.staged.unwrap_or(0) > 0
                    || git.unstaged.unwrap_or(0) > 0
                    || git.untracked.unwrap_or(0) > 0;
                status.is_dirty = is_dirty;
            }

            if self.config.status.show_ahead_behind {
                status.ahead = git.ahead.unwrap_or(0);
                status.behind = git.behind.unwrap_or(0);
            }
        }

        Some((self.prepare_branch_name(branch_name), status))
    }

    /// Format branch display with status indicators
    fn format_branch(&self, name: String, status: &BranchStatus, ctx: &RenderContext) -> String {
        let mut result = name;

        // Add status indicators
        if status.is_dirty {
            let icon = Self::select_status_icon(
                ctx,
                &self.config.status_icons.dirty_emoji,
                &self.config.status_icons.dirty_nerd,
                &self.config.status_icons.dirty_text,
            );
            result.push_str(icon);
        }

        if status.ahead > 0 {
            let icon = Self::select_status_icon(
                ctx,
                &self.config.status_icons.ahead_emoji,
                &self.config.status_icons.ahead_nerd,
                &self.config.status_icons.ahead_text,
            );
            let _ = write!(&mut result, "{}{}", icon, status.ahead);
        }

        if status.behind > 0 {
            let icon = Self::select_status_icon(
                ctx,
                &self.config.status_icons.behind_emoji,
                &self.config.status_icons.behind_nerd,
                &self.config.status_icons.behind_text,
            );
            let _ = write!(&mut result, "{}{}", icon, status.behind);
        }

        if status.stash_count > 0 {
            let icon = Self::select_status_icon(
                ctx,
                &self.config.status_icons.stash_emoji,
                &self.config.status_icons.stash_nerd,
                &self.config.status_icons.stash_text,
            );
            let _ = write!(&mut result, "{}{}", icon, status.stash_count);
        }

        result
    }

    /// Get the appropriate color based on branch status
    fn get_branch_color(&self, status: &BranchStatus) -> &str {
        if status.is_dirty {
            &self.config.status_colors.dirty
        } else {
            &self.config.status_colors.clean
        }
    }

    fn select_status_icon<'a>(
        ctx: &RenderContext,
        emoji_icon: &'a str,
        nerd_icon: &'a str,
        text_icon: &'a str,
    ) -> &'a str {
        let terminal = &ctx.terminal;
        let terminal_cfg = &ctx.config.terminal;
        let style = &ctx.config.style;

        if terminal_cfg.force_text {
            return text_icon;
        }
        if terminal_cfg.force_nerd_font {
            return nerd_icon;
        }
        if terminal_cfg.force_emoji {
            return emoji_icon;
        }

        if terminal.supports_nerd_font
            && style
                .enable_nerd_font
                .is_enabled(terminal.supports_nerd_font)
        {
            return nerd_icon;
        }

        if terminal.supports_emoji && style.enable_emoji.is_enabled(terminal.supports_emoji) {
            return emoji_icon;
        }

        text_icon
    }
}

#[derive(Debug, Default)]
struct BranchStatus {
    is_dirty: bool,
    ahead: i32,
    behind: i32,
    stash_count: i32,
}

#[async_trait]
impl Component for BranchComponent {
    fn name(&self) -> &'static str {
        "branch"
    }

    fn is_enabled(&self, _ctx: &RenderContext) -> bool {
        self.config.base.enabled
    }

    async fn render(&self, ctx: &RenderContext) -> ComponentOutput {
        if !self.is_enabled(ctx) {
            return ComponentOutput::hidden();
        }

        // 优先尝试从stdin输入获取分支信息(适用于有git字段的情况)
        if self.config.performance.lazy_load_status {
            if let Some((name, status)) = self.get_branch_info(ctx) {
                let formatted = self.format_branch(name, &status, ctx);
                let color = self.get_branch_color(&status).to_string();
                return self.build_output(ctx, formatted, color);
            }
            // 如果stdin中没有git信息，继续往下通过libgit2获取
        }

        // 通过libgit2获取完整Git信息
        if let Some(info) = self.load_git_info(ctx).await {
            if !info.is_repo {
                return self.render_no_git(ctx);
            }
            return self.render_from_git_info(ctx, &info);
        }

        // 回退到stdin的git信息(如果存在)
        let branch_info = self.get_branch_info(ctx);

        if branch_info.is_none() && !self.config.show_when_empty {
            return ComponentOutput::hidden();
        }

        let (text, icon_color) = if let Some((name, status)) = branch_info {
            let formatted = self.format_branch(name, &status, ctx);
            let color = self.get_branch_color(&status).to_string();
            (formatted, color)
        } else {
            ("no-git".to_string(), self.config.base.icon_color.clone())
        };

        self.build_output(ctx, text, icon_color)
    }

    fn base_config(&self, _ctx: &RenderContext) -> Option<&BaseComponentConfig> {
        Some(&self.config.base)
    }
}

impl BranchComponent {
    fn build_output(
        &self,
        ctx: &RenderContext,
        text: String,
        icon_color: String,
    ) -> ComponentOutput {
        let icon = self.select_icon(ctx);
        ComponentOutput::new(text)
            .with_icon(icon.unwrap_or_default())
            .with_icon_color(icon_color)
            .with_text_color(&self.config.base.text_color)
    }

    fn render_no_git(&self, ctx: &RenderContext) -> ComponentOutput {
        if !self.config.show_when_no_git {
            return ComponentOutput::hidden();
        }

        self.build_output(
            ctx,
            "no-git".to_string(),
            self.config.base.icon_color.clone(),
        )
    }

    fn render_from_git_info(&self, ctx: &RenderContext, info: &GitInfo) -> ComponentOutput {
        let mut status = BranchStatus::default();
        status.is_dirty = !info.status.clean;
        status.ahead = Self::usize_to_i32(info.branch.ahead);
        status.behind = Self::usize_to_i32(info.branch.behind);
        status.stash_count = Self::usize_to_i32(info.stash.count);

        let branch_name = self.prepare_branch_name(&info.branch.current);
        let text = self.format_branch(branch_name, &status, ctx);
        let icon_color = self.get_branch_color(&status).to_string();

        self.build_output(ctx, text, icon_color)
    }
}

impl BranchComponent {
    const fn status_required(&self) -> bool {
        self.config.status.show_dirty || self.config.status.show_ahead_behind
    }

    fn usize_to_i32(value: usize) -> i32 {
        i32::try_from(value).unwrap_or(i32::MAX)
    }
}

/// Factory for creating Branch components
pub struct BranchComponentFactory;

impl ComponentFactory for BranchComponentFactory {
    fn create(&self, config: &Config) -> Box<dyn Component> {
        Box::new(BranchComponent::new(config.components.branch.clone()))
    }

    fn name(&self) -> &'static str {
        "branch"
    }
}

#[derive(Clone)]
struct CachedGitEntry {
    expires_at: Instant,
    info: GitInfo,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::components::TerminalCapabilities;
    use crate::core::{GitInfo, InputData};
    use std::sync::Arc;

    #[allow(clippy::field_reassign_with_default)]
    fn build_input(configure: impl FnOnce(&mut InputData)) -> InputData {
        let mut input = InputData::default();
        configure(&mut input);
        input
    }

    #[allow(clippy::field_reassign_with_default)]
    fn build_branch_config(
        configure: impl FnOnce(&mut BranchComponentConfig),
    ) -> BranchComponentConfig {
        let mut config = BranchComponentConfig::default();
        configure(&mut config);
        config
    }

    fn create_test_context_with_git(branch: &str, ahead: i32, behind: i32) -> RenderContext {
        let input = build_input(|input| {
            input.git = Some(GitInfo {
                branch: Some(branch.to_string()),
                status: None,
                ahead: Some(ahead),
                behind: Some(behind),
                staged: None,
                unstaged: None,
                untracked: None,
            });
        });

        RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
        }
    }

    #[tokio::test]
    async fn test_branch_clean() {
        let component = BranchComponent::new(BranchComponentConfig::default());
        let ctx = create_test_context_with_git("main", 0, 0);

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "main");
        assert_eq!(output.icon_color, Some("green".to_string()));
    }

    #[tokio::test]
    async fn test_branch_with_ahead_behind() {
        let config = build_branch_config(|config| {
            config.status.show_ahead_behind = true;
        });

        let component = BranchComponent::new(config);
        let ctx = create_test_context_with_git("feature", 3, 2);

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert!(output.text.starts_with("feature"));
        assert!(output.text.contains('3')); // ahead count
        assert!(output.text.contains('2')); // behind count
    }

    #[tokio::test]
    async fn test_branch_dirty() {
        let config = build_branch_config(|config| {
            config.status.show_dirty = true;
        });

        let input = build_input(|input| {
            input.git = Some(GitInfo {
                branch: Some("develop".to_string()),
                status: Some("dirty".to_string()),
                ahead: None,
                behind: None,
                staged: None,
                unstaged: None,
                untracked: None,
            });
        });

        let component = BranchComponent::new(config);
        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
        };

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert!(output.text.contains("develop"));
        assert_eq!(output.icon_color, Some("yellow".to_string()));
    }

    #[tokio::test]
    async fn test_branch_disabled() {
        let config = build_branch_config(|config| {
            config.base.enabled = false;
        });

        let component = BranchComponent::new(config);
        let ctx = create_test_context_with_git("main", 0, 0);

        let output = component.render(&ctx).await;
        assert!(!output.visible);
    }

    #[tokio::test]
    async fn test_branch_truncates_long_name() {
        let config = build_branch_config(|config| {
            config.max_length = 6;
        });

        let input = build_input(|input| {
            input.git = Some(GitInfo {
                branch: Some("very-long-branch".to_string()),
                ..Default::default()
            });
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
        };

        let component = BranchComponent::new(config);
        let output = component.render(&ctx).await;
        assert_eq!(output.text, "ver...");
    }

    #[tokio::test]
    async fn test_branch_show_when_no_git() {
        let config = build_branch_config(|config| {
            config.show_when_no_git = true;
        });

        let input = build_input(|input| {
            input.git = None;
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
        };

        let component = BranchComponent::new(config);
        let output = component.render_no_git(&ctx);
        assert!(output.visible);
        assert_eq!(output.text, "no-git");
    }

    #[tokio::test]
    async fn test_branch_lazy_load_prefers_input() {
        let mut config = BranchComponentConfig::default();
        config.performance.lazy_load_status = true;
        config.status.show_dirty = true;

        let ctx = create_test_context_with_git("lazy-main", 1, 0);

        let component = BranchComponent::new(config);
        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert!(output.text.starts_with("lazy-main"));
    }
}
