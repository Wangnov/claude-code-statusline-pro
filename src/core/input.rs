//! Input data structures for STDIN JSON parsing
//!
//! This module defines the data structures used to parse JSON input
//! from Claude Code. All structures use serde for deserialization
//! and are designed to be compatible with the TypeScript version.

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Main input data structure from Claude Code
///
/// This structure represents the JSON data passed to the statusline
/// via STDIN. All fields are optional to handle partial data gracefully.
#[derive(Debug, Clone, Deserialize, Serialize, Default)]
#[serde(rename_all = "snake_case")]
pub struct InputData {
    /// Hook event name (if triggered by a hook)
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hook_event_name: Option<String>,

    /// Session identifier
    #[serde(alias = "sessionId", default, skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,

    /// Path to the transcript file
    #[serde(
        alias = "transcriptPath",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub transcript_path: Option<String>,

    /// Current working directory
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cwd: Option<String>,

    /// Model information
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<ModelInfo>,

    /// Workspace information
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub workspace: Option<WorkspaceInfo>,

    /// Worktree information for `--worktree` sessions
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub worktree: Option<WorktreeInfo>,

    /// Git branch (legacy field, prefer git.branch)
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub git_branch: Option<String>,

    /// Git information
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub git: Option<GitInfo>,

    /// Cost and usage information
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cost: Option<CostInfo>,

    /// Additional fields for future expansion
    #[serde(flatten)]
    pub extra: Value,
}

/// Model information
#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct ModelInfo {
    /// Model identifier (e.g., "claude-3")
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Human-readable model name
    #[serde(
        alias = "displayName",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub display_name: Option<String>,
}

/// Workspace information
#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct WorkspaceInfo {
    /// Current directory path
    #[serde(alias = "currentDir", default, skip_serializing_if = "Option::is_none")]
    pub current_dir: Option<String>,

    /// Project root directory path
    #[serde(alias = "projectDir", default, skip_serializing_if = "Option::is_none")]
    pub project_dir: Option<String>,

    /// Additional directories added to the session
    #[serde(alias = "addedDirs", default, skip_serializing_if = "Option::is_none")]
    pub added_dirs: Option<Vec<String>>,

    /// Linked git worktree name for generic git worktree sessions
    #[serde(
        alias = "gitWorktree",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub git_worktree: Option<String>,
}

/// Worktree information for `--worktree` sessions
#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct WorktreeInfo {
    /// Worktree name
    #[serde(
        alias = "worktreeName",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub name: Option<String>,

    /// Absolute path to the worktree directory
    #[serde(
        alias = "worktreePath",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub path: Option<String>,

    /// Worktree branch name
    #[serde(
        alias = "worktreeBranch",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub branch: Option<String>,

    /// Original cwd before entering the worktree
    #[serde(
        alias = "originalCwd",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub original_cwd: Option<String>,

    /// Original branch before entering the worktree
    #[serde(
        alias = "originalBranch",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub original_branch: Option<String>,
}

/// Git repository information
#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct GitInfo {
    /// Current branch name
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub branch: Option<String>,

    /// Git status (e.g., "clean", "dirty")
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Number of commits ahead of remote
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ahead: Option<i32>,

    /// Number of commits behind remote
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub behind: Option<i32>,

    /// Number of staged files
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub staged: Option<i32>,

    /// Number of unstaged files
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub unstaged: Option<i32>,

    /// Number of untracked files
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub untracked: Option<i32>,
}

/// Cost and usage information
#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct CostInfo {
    /// Total cost in USD
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_cost_usd: Option<f64>,

    /// Total duration in milliseconds
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_duration_ms: Option<i64>,

    /// API call duration in milliseconds
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_api_duration_ms: Option<i64>,

    /// Total lines added
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_lines_added: Option<i32>,

    /// Total lines removed
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_lines_removed: Option<i32>,

    /// Input tokens used
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_tokens: Option<i64>,

    /// Output tokens used
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_tokens: Option<i64>,

    /// Total tokens used
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_tokens: Option<i64>,

    /// Cache read tokens
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cache_read_tokens: Option<i64>,

    /// Cache write tokens
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cache_write_tokens: Option<i64>,
}

impl InputData {
    /// Parse `InputData` from JSON string
    /// # Errors
    ///
    /// Returns an error when the provided JSON payload cannot be parsed into
    /// the expected input schema.
    pub fn from_json(json: &str) -> anyhow::Result<Self> {
        let data: Self = serde_json::from_str(json)?;
        Ok(data)
    }

    /// Parse `InputData` from stdin
    /// # Errors
    ///
    /// Returns an error when stdin cannot be read or the streamed data fails
    /// to deserialize into structured input metadata.
    pub fn from_stdin() -> anyhow::Result<Self> {
        use std::io::{self, Read};
        let mut buffer = String::new();
        io::stdin().read_to_string(&mut buffer)?;

        // Handle empty input by returning default
        if buffer.trim().is_empty() {
            return Ok(Self::default());
        }

        Self::from_json(&buffer)
    }

    /// Get the effective project directory
    ///
    /// Returns the original project root directory for the session.
    #[must_use]
    pub fn project_dir(&self) -> Option<&str> {
        self.project_root_dir().or(self.cwd.as_deref())
    }

    /// Get the effective current directory for the session
    #[must_use]
    pub fn current_dir(&self) -> Option<&str> {
        self.worktree
            .as_ref()
            .and_then(|w| w.path.as_deref())
            .or_else(|| {
                self.workspace
                    .as_ref()
                    .and_then(|w| w.current_dir.as_deref())
            })
            .or(self.cwd.as_deref())
    }

    /// Get the original project root for the session
    #[must_use]
    pub fn project_root_dir(&self) -> Option<&str> {
        self.workspace
            .as_ref()
            .and_then(|w| w.project_dir.as_deref())
            .or_else(|| {
                self.worktree
                    .as_ref()
                    .and_then(|w| w.original_cwd.as_deref())
            })
    }

    /// Get the effective git branch
    ///
    /// Prefers git.branch over the legacy `git_branch` field
    #[must_use]
    pub fn branch(&self) -> Option<&str> {
        self.worktree
            .as_ref()
            .and_then(|w| w.branch.as_deref())
            .or_else(|| {
                self.git
                    .as_ref()
                    .and_then(|g| g.branch.as_deref())
                    .or(self.git_branch.as_deref())
            })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use anyhow::{Context, Result};

    type TestResult = Result<()>;

    #[test]
    fn test_parse_empty_json() -> TestResult {
        let data = InputData::from_json("{}")?;
        assert!(data.session_id.is_none());
        assert!(data.model.is_none());
        Ok(())
    }

    #[test]
    fn test_parse_with_camel_case() -> TestResult {
        let json = r#"{
            "sessionId": "test-123",
            "model": {
                "id": "claude-3",
                "displayName": "Claude 3"
            },
            "workspace": {
                "currentDir": "/home/user",
                "projectDir": "/home/user/project"
            }
        }"#;

        let data = InputData::from_json(json)?;
        assert_eq!(data.session_id, Some("test-123".to_string()));

        let model = data.model.context("expected model information")?;
        assert_eq!(model.id, Some("claude-3".to_string()));
        assert_eq!(model.display_name, Some("Claude 3".to_string()));

        let workspace = data.workspace.context("expected workspace information")?;
        assert_eq!(workspace.current_dir, Some("/home/user".to_string()));
        assert_eq!(
            workspace.project_dir,
            Some("/home/user/project".to_string())
        );
        Ok(())
    }

    #[test]
    fn test_parse_worktree_with_camel_case_fields() -> TestResult {
        let json = r#"{
            "cwd": "/repo/.claude/worktrees/feature-x",
            "workspace": {
                "currentDir": "/repo/.claude/worktrees/feature-x",
                "projectDir": "/repo",
                "gitWorktree": "feature-x"
            },
            "worktree": {
                "worktreeName": "feature-x",
                "worktreePath": "/repo/.claude/worktrees/feature-x",
                "worktreeBranch": "feature/worktree-x",
                "originalCwd": "/repo",
                "originalBranch": "main"
            }
        }"#;

        let data = InputData::from_json(json)?;

        let workspace = data
            .workspace
            .as_ref()
            .context("expected workspace information")?;
        assert_eq!(workspace.git_worktree.as_deref(), Some("feature-x"));

        let worktree = data
            .worktree
            .as_ref()
            .context("expected worktree information")?;
        assert_eq!(worktree.name.as_deref(), Some("feature-x"));
        assert_eq!(
            worktree.path.as_deref(),
            Some("/repo/.claude/worktrees/feature-x")
        );
        assert_eq!(worktree.branch.as_deref(), Some("feature/worktree-x"));
        assert_eq!(worktree.original_cwd.as_deref(), Some("/repo"));
        assert_eq!(worktree.original_branch.as_deref(), Some("main"));

        assert_eq!(
            data.current_dir(),
            Some("/repo/.claude/worktrees/feature-x")
        );
        assert_eq!(data.project_root_dir(), Some("/repo"));
        assert_eq!(data.project_dir(), Some("/repo"));
        assert_eq!(data.branch(), Some("feature/worktree-x"));
        Ok(())
    }

    #[test]
    fn test_parse_with_snake_case() -> TestResult {
        let json = r#"{
            "session_id": "test-456",
            "git": {
                "branch": "main",
                "ahead": 2,
                "behind": 1
            }
        }"#;

        let data = InputData::from_json(json)?;
        assert_eq!(data.session_id, Some("test-456".to_string()));

        let git = data.git.context("expected git info")?;
        assert_eq!(git.branch, Some("main".to_string()));
        assert_eq!(git.ahead, Some(2));
        assert_eq!(git.behind, Some(1));
        Ok(())
    }

    #[test]
    fn test_extra_fields() -> TestResult {
        let json = r#"{
            "session_id": "test",
            "unknown_field": "value",
            "another_field": 123
        }"#;

        let data = InputData::from_json(json)?;
        assert_eq!(data.session_id, Some("test".to_string()));

        // Extra fields should be captured
        let unknown = data
            .extra
            .get("unknown_field")
            .context("missing unknown_field")?;
        assert_eq!(unknown.as_str(), Some("value"));
        Ok(())
    }

    #[test]
    fn test_project_dir_fallback() {
        let mut data = InputData::default();
        assert!(data.project_dir().is_none());
        assert!(data.current_dir().is_none());

        data.cwd = Some("/cwd".to_string());
        assert_eq!(data.project_dir(), Some("/cwd"));
        assert_eq!(data.current_dir(), Some("/cwd"));

        data.workspace = Some(WorkspaceInfo {
            current_dir: Some("/workspace".to_string()),
            project_dir: Some("/project".to_string()),
            added_dirs: None,
            git_worktree: None,
        });
        assert_eq!(data.current_dir(), Some("/workspace"));
        assert_eq!(data.project_dir(), Some("/project"));
        assert_eq!(data.project_root_dir(), Some("/project"));
    }

    #[test]
    fn test_worktree_path_takes_priority() {
        let mut data = InputData {
            cwd: Some("/cwd".to_string()),
            workspace: Some(WorkspaceInfo {
                current_dir: Some("/workspace/current".to_string()),
                project_dir: Some("/workspace/original".to_string()),
                added_dirs: None,
                git_worktree: None,
            }),
            worktree: Some(WorktreeInfo {
                path: Some("/workspace/worktrees/feature-x".to_string()),
                branch: Some("worktree-feature-x".to_string()),
                ..Default::default()
            }),
            ..Default::default()
        };

        assert_eq!(data.current_dir(), Some("/workspace/worktrees/feature-x"));
        assert_eq!(data.project_dir(), Some("/workspace/original"));
        assert_eq!(data.project_root_dir(), Some("/workspace/original"));
        assert_eq!(data.branch(), Some("worktree-feature-x"));

        data.worktree = None;
        assert_eq!(data.current_dir(), Some("/workspace/current"));
        assert_eq!(data.branch(), None);
    }

    #[test]
    fn test_project_root_uses_worktree_original_cwd() {
        let data = InputData {
            cwd: Some("/workspace/worktrees/feature-x".to_string()),
            worktree: Some(WorktreeInfo {
                path: Some("/workspace/worktrees/feature-x".to_string()),
                original_cwd: Some("/workspace/original".to_string()),
                ..Default::default()
            }),
            ..Default::default()
        };

        assert_eq!(data.current_dir(), Some("/workspace/worktrees/feature-x"));
        assert_eq!(data.project_root_dir(), Some("/workspace/original"));
        assert_eq!(data.project_dir(), Some("/workspace/original"));
    }

    #[test]
    fn test_branch_fallback() {
        let mut data = InputData::default();
        assert!(data.branch().is_none());

        data.git_branch = Some("feature".to_string());
        assert_eq!(data.branch(), Some("feature"));

        data.git = Some(GitInfo {
            branch: Some("main".to_string()),
            ..Default::default()
        });
        assert_eq!(data.branch(), Some("main"));
    }
}
