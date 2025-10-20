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
    /// Returns the project directory from workspace, or falls back to cwd
    #[must_use]
    pub fn project_dir(&self) -> Option<&str> {
        self.workspace
            .as_ref()
            .and_then(|w| w.project_dir.as_deref())
            .or(self.cwd.as_deref())
    }

    /// Get the effective git branch
    ///
    /// Prefers git.branch over the legacy `git_branch` field
    #[must_use]
    pub fn branch(&self) -> Option<&str> {
        self.git
            .as_ref()
            .and_then(|g| g.branch.as_deref())
            .or(self.git_branch.as_deref())
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

        data.cwd = Some("/cwd".to_string());
        assert_eq!(data.project_dir(), Some("/cwd"));

        data.workspace = Some(WorkspaceInfo {
            current_dir: None,
            project_dir: Some("/project".to_string()),
        });
        assert_eq!(data.project_dir(), Some("/project"));
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
