//! Claude Code effort level resolution helpers.
//!
//! Resolves the configured effort level from Claude Code's supported
//! configuration layers so the statusline can surface it alongside the model.

use crate::core::InputData;
use crate::utils::home_dir;
use serde_json::Value;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

const ENV_KEY: &str = "CLAUDE_CODE_EFFORT_LEVEL";
const CLAUDECODE_ENV_KEY: &str = "CLAUDECODE";
const SETTINGS_DIR: &str = ".claude";
const SETTINGS_FILE: &str = "settings.json";
const SETTINGS_LOCAL_FILE: &str = "settings.local.json";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EffortLevel {
    Low,
    Medium,
    High,
    XHigh,
    Max,
}

impl EffortLevel {
    #[must_use]
    pub fn from_value(value: &str) -> Option<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            "low" => Some(Self::Low),
            "medium" => Some(Self::Medium),
            "high" => Some(Self::High),
            "xhigh" => Some(Self::XHigh),
            "max" => Some(Self::Max),
            _ => None,
        }
    }

    #[must_use]
    pub const fn symbol(self) -> &'static str {
        match self {
            Self::Low => "○",
            Self::Medium => "◐",
            Self::High => "●",
            Self::XHigh => "◉",
            Self::Max => "◈",
        }
    }
}

#[must_use]
pub fn resolve_effort_level(input: &InputData) -> Option<EffortLevel> {
    if !has_claude_code_context(input) {
        return None;
    }

    env::var(ENV_KEY)
        .ok()
        .and_then(|value| EffortLevel::from_value(&value))
        .or_else(|| resolve_settings_effort(input))
}

fn has_claude_code_context(input: &InputData) -> bool {
    env::var_os(CLAUDECODE_ENV_KEY).is_some()
        || input.extra.get("version").and_then(Value::as_str).is_some()
}

fn resolve_settings_effort(input: &InputData) -> Option<EffortLevel> {
    for path in settings_candidates(input) {
        if let Some(level) = read_effort_from_settings(path.as_path()) {
            return Some(level);
        }
    }

    None
}

fn settings_candidates(input: &InputData) -> Vec<PathBuf> {
    let mut paths = Vec::new();

    if let Some(project_root) = input.project_root_dir().or_else(|| input.project_dir()) {
        let base = Path::new(project_root).join(SETTINGS_DIR);
        paths.push(base.join(SETTINGS_LOCAL_FILE));
        paths.push(base.join(SETTINGS_FILE));
    }

    if let Some(home) = home_dir() {
        paths.push(home.join(SETTINGS_DIR).join(SETTINGS_FILE));
    }

    paths
}

fn read_effort_from_settings(path: &Path) -> Option<EffortLevel> {
    let content = fs::read_to_string(path).ok()?;
    let value: Value = serde_json::from_str(&content).ok()?;

    value
        .get("effortLevel")
        .or_else(|| value.get("effort_level"))
        .and_then(Value::as_str)
        .and_then(EffortLevel::from_value)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{InputData, WorkspaceInfo};
    use anyhow::Result;
    use serial_test::serial;
    use std::ffi::OsString;
    use tempfile::tempdir;

    #[test]
    fn test_effort_symbol_mapping() {
        assert_eq!(EffortLevel::Low.symbol(), "○");
        assert_eq!(EffortLevel::Medium.symbol(), "◐");
        assert_eq!(EffortLevel::High.symbol(), "●");
        assert_eq!(EffortLevel::XHigh.symbol(), "◉");
        assert_eq!(EffortLevel::Max.symbol(), "◈");
    }

    #[test]
    #[serial]
    fn test_env_takes_priority_over_settings() -> Result<()> {
        let home = tempdir()?;
        let project = tempdir()?;
        let original_home = env::var_os("HOME");
        let original_effort = env::var_os(ENV_KEY);

        env::set_var("HOME", home.path());
        env::set_var(ENV_KEY, "xhigh");

        write_settings(
            home.path().join(".claude/settings.json"),
            r#"{"effortLevel":"medium"}"#,
        )?;
        write_settings(
            project.path().join(".claude/settings.local.json"),
            r#"{"effortLevel":"low"}"#,
        )?;

        let input = input_with_project(project.path().to_string_lossy().as_ref());
        assert_eq!(resolve_effort_level(&input), Some(EffortLevel::XHigh));

        restore_env("HOME", original_home);
        restore_env(ENV_KEY, original_effort);
        Ok(())
    }

    #[test]
    #[serial]
    fn test_local_settings_override_project_and_user() -> Result<()> {
        let home = tempdir()?;
        let project = tempdir()?;
        let original_home = env::var_os("HOME");
        let original_effort = env::var_os(ENV_KEY);

        env::set_var("HOME", home.path());
        env::remove_var(ENV_KEY);

        write_settings(
            home.path().join(".claude/settings.json"),
            r#"{"effortLevel":"medium"}"#,
        )?;
        write_settings(
            project.path().join(".claude/settings.json"),
            r#"{"effortLevel":"low"}"#,
        )?;
        write_settings(
            project.path().join(".claude/settings.local.json"),
            r#"{"effortLevel":"high"}"#,
        )?;

        let input = input_with_project(project.path().to_string_lossy().as_ref());
        assert_eq!(resolve_effort_level(&input), Some(EffortLevel::High));

        restore_env("HOME", original_home);
        restore_env(ENV_KEY, original_effort);
        Ok(())
    }

    #[test]
    #[serial]
    fn test_settings_support_max_level() -> Result<()> {
        let home = tempdir()?;
        let original_home = env::var_os("HOME");
        let original_effort = env::var_os(ENV_KEY);

        env::set_var("HOME", home.path());
        env::remove_var(ENV_KEY);

        write_settings(
            home.path().join(".claude/settings.json"),
            r#"{"effortLevel":"max"}"#,
        )?;

        let input = input_with_project(home.path().to_string_lossy().as_ref());
        assert_eq!(resolve_effort_level(&input), Some(EffortLevel::Max));

        restore_env("HOME", original_home);
        restore_env(ENV_KEY, original_effort);
        Ok(())
    }

    fn input_with_project(project_dir: &str) -> InputData {
        InputData {
            workspace: Some(WorkspaceInfo {
                current_dir: Some(project_dir.to_string()),
                project_dir: Some(project_dir.to_string()),
                added_dirs: None,
                git_worktree: None,
            }),
            extra: serde_json::json!({
                "version": "2.1.90"
            }),
            ..Default::default()
        }
    }

    fn write_settings(path: PathBuf, content: &str) -> Result<()> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(path, content)?;
        Ok(())
    }

    fn restore_env(key: &str, value: Option<OsString>) {
        if let Some(value) = value {
            env::set_var(key, value);
        } else {
            env::remove_var(key);
        }
    }
}
