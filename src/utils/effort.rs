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

/// The process-global inputs that effort resolution consults.
///
/// Resolution reads an environment variable and the user's home directory, both
/// of which are per-process rather than per-call. Reading them inline forced
/// every test touching effort resolution to mutate `std::env`, which leaked
/// into unrelated tests running in parallel and made them flaky. Capturing the
/// values up front keeps [`resolve_effort_level_with`] a pure function of its
/// arguments, so tests cover each layer by constructing this struct instead.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct EffortEnv {
    /// Raw `CLAUDE_CODE_EFFORT_LEVEL` value, when set.
    pub env_level: Option<String>,
    /// Whether `CLAUDECODE` is present, marking a live Claude Code session.
    pub claude_code_active: bool,
    /// Home directory used to locate the user-level `settings.json`.
    pub home: Option<PathBuf>,
}

impl EffortEnv {
    /// Snapshot the live process environment.
    #[must_use]
    pub fn from_process() -> Self {
        Self {
            env_level: env::var(ENV_KEY).ok(),
            claude_code_active: env::var_os(CLAUDECODE_ENV_KEY).is_some(),
            home: home_dir(),
        }
    }
}

#[must_use]
pub fn resolve_effort_level(input: &InputData) -> Option<EffortLevel> {
    resolve_effort_level_with(input, &EffortEnv::from_process())
}

/// Resolve the effort level from `input` against an explicit environment
/// snapshot, rather than whatever the process environment currently holds.
#[must_use]
pub fn resolve_effort_level_with(input: &InputData, env: &EffortEnv) -> Option<EffortLevel> {
    if !has_claude_code_context(input, env) {
        return None;
    }

    env.env_level
        .as_deref()
        .and_then(EffortLevel::from_value)
        .or_else(|| resolve_settings_effort(input, env))
}

fn has_claude_code_context(input: &InputData, env: &EffortEnv) -> bool {
    env.claude_code_active || input.extra.get("version").and_then(Value::as_str).is_some()
}

fn resolve_settings_effort(input: &InputData, env: &EffortEnv) -> Option<EffortLevel> {
    for path in settings_candidates(input, env) {
        if let Some(level) = read_effort_from_settings(path.as_path()) {
            return Some(level);
        }
    }

    None
}

fn settings_candidates(input: &InputData, env: &EffortEnv) -> Vec<PathBuf> {
    let mut paths = Vec::new();

    if let Some(project_root) = input.project_root_dir().or_else(|| input.project_dir()) {
        let base = Path::new(project_root).join(SETTINGS_DIR);
        paths.push(base.join(SETTINGS_LOCAL_FILE));
        paths.push(base.join(SETTINGS_FILE));
    }

    if let Some(home) = env.home.as_ref() {
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
    fn test_env_takes_priority_over_settings() -> Result<()> {
        let home = tempdir()?;
        let project = tempdir()?;

        write_settings(
            home.path().join(".claude/settings.json"),
            r#"{"effortLevel":"medium"}"#,
        )?;
        write_settings(
            project.path().join(".claude/settings.local.json"),
            r#"{"effortLevel":"low"}"#,
        )?;

        let input = input_with_project(project.path().to_string_lossy().as_ref());
        let env = EffortEnv {
            env_level: Some("xhigh".to_string()),
            home: Some(home.path().to_path_buf()),
            ..EffortEnv::default()
        };

        assert_eq!(
            resolve_effort_level_with(&input, &env),
            Some(EffortLevel::XHigh)
        );
        Ok(())
    }

    #[test]
    fn test_local_settings_override_project_and_user() -> Result<()> {
        let home = tempdir()?;
        let project = tempdir()?;

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
        let env = EffortEnv {
            home: Some(home.path().to_path_buf()),
            ..EffortEnv::default()
        };

        assert_eq!(
            resolve_effort_level_with(&input, &env),
            Some(EffortLevel::High)
        );
        Ok(())
    }

    #[test]
    fn test_settings_support_max_level() -> Result<()> {
        let home = tempdir()?;

        write_settings(
            home.path().join(".claude/settings.json"),
            r#"{"effortLevel":"max"}"#,
        )?;

        let input = input_with_project(home.path().to_string_lossy().as_ref());
        let env = EffortEnv {
            home: Some(home.path().to_path_buf()),
            ..EffortEnv::default()
        };

        assert_eq!(
            resolve_effort_level_with(&input, &env),
            Some(EffortLevel::Max)
        );
        Ok(())
    }

    #[test]
    fn test_no_effort_without_claude_code_context() {
        // Neither `CLAUDECODE` nor a `version` field: nothing to report, even
        // though the env var names a level.
        let input = InputData::default();
        let env = EffortEnv {
            env_level: Some("xhigh".to_string()),
            ..EffortEnv::default()
        };

        assert_eq!(resolve_effort_level_with(&input, &env), None);
    }

    #[test]
    fn test_claudecode_flag_supplies_context() {
        let input = InputData::default();
        let env = EffortEnv {
            env_level: Some("high".to_string()),
            claude_code_active: true,
            ..EffortEnv::default()
        };

        assert_eq!(
            resolve_effort_level_with(&input, &env),
            Some(EffortLevel::High)
        );
    }

    /// Covers the glue between the process environment and [`EffortEnv`]. Every
    /// other test here injects a snapshot, so this is the only one that reads
    /// process-global state — hence `#[serial]`. It deliberately asserts on
    /// `env_level` alone: `home` depends on `HOME`, which other test modules
    /// mutate.
    #[test]
    #[serial]
    fn test_from_process_reads_env_level() {
        let original = env::var_os(ENV_KEY);

        env::set_var(ENV_KEY, "high");
        assert_eq!(EffortEnv::from_process().env_level.as_deref(), Some("high"));

        env::remove_var(ENV_KEY);
        assert_eq!(EffortEnv::from_process().env_level, None);

        restore_env(ENV_KEY, original);
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
