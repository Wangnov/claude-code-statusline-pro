//! Storage system types for statusline-pro
//!
//! Defines the snapshot structures that persist Claude Code session data.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Storage configuration mirroring the TypeScript settings
#[derive(Debug, Clone)]
pub struct StorageConfig {
    /// Enable conversation-level cost tracking
    pub enable_conversation_tracking: bool,
    /// Storage directory path (default: ~/.claude)
    pub storage_path: Option<std::path::PathBuf>,
    /// Enable cost persistence
    pub enable_cost_persistence: bool,
    /// Session expiration window in days
    pub session_expiry_days: Option<u32>,
    /// Whether cleanup should run on startup
    pub enable_startup_cleanup: bool,
}

impl Default for StorageConfig {
    fn default() -> Self {
        Self {
            enable_conversation_tracking: true,
            enable_cost_persistence: true,
            storage_path: None,
            session_expiry_days: Some(30),
            enable_startup_cleanup: true,
        }
    }
}

/// Storage paths computed for the current runtime.
#[derive(Debug, Clone)]
pub struct StoragePaths {
    /// User-level config directory
    pub user_config_dir: std::path::PathBuf,
    /// Project-level config directory
    pub project_config_dir: std::path::PathBuf,
    /// Sessions data directory
    pub sessions_dir: std::path::PathBuf,
    /// User config file path
    pub user_config_path: std::path::PathBuf,
    /// Project config file path
    pub project_config_path: std::path::PathBuf,
}

/// Snapshot file persisted for each Claude session.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSnapshot {
    pub meta: SessionMeta,
    #[serde(default)]
    pub latest: serde_json::Value,
    #[serde(default)]
    pub history: SessionHistory,
    #[serde(default)]
    pub transcript_state: TranscriptState,
}

impl SessionSnapshot {
    pub fn new(session_id: &str) -> Self {
        Self {
            meta: SessionMeta {
                session_id: session_id.to_string(),
                project_path: None,
                created_at: Some(Utc::now()),
                last_update_time: Some(Utc::now()),
            },
            latest: serde_json::Value::Null,
            history: SessionHistory::default(),
            transcript_state: TranscriptState::default(),
        }
    }
}

/// Metadata describing a stored session.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMeta {
    pub session_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub project_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_update_time: Option<DateTime<Utc>>,
}

impl Default for SessionMeta {
    fn default() -> Self {
        Self {
            session_id: String::new(),
            project_path: None,
            created_at: Some(Utc::now()),
            last_update_time: Some(Utc::now()),
        }
    }
}

/// Historical aggregates derived from the latest snapshot data.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SessionHistory {
    #[serde(default)]
    pub cost: CostHistory,
    #[serde(default)]
    pub tokens: Option<TokenHistory>,
    #[serde(default)]
    pub model_usage: Vec<ModelUsageEntry>,
}

/// Aggregated cost data broken into buckets.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CostHistory {
    #[serde(default)]
    pub current: CostMetrics,
    #[serde(default)]
    pub accumulated: CostMetrics,
    #[serde(default)]
    pub total: CostMetrics,
}

impl CostHistory {
    pub fn apply(&mut self, new_metrics: &CostMetrics) {
        if self.current.total_cost_usd > 0.0
            && new_metrics.total_cost_usd < self.current.total_cost_usd
        {
            self.accumulated.total_cost_usd += self.current.total_cost_usd;
        }
        if self.current.total_duration_ms > 0
            && new_metrics.total_duration_ms < self.current.total_duration_ms
        {
            self.accumulated.total_duration_ms += self.current.total_duration_ms;
        }
        if self.current.total_api_duration_ms > 0
            && new_metrics.total_api_duration_ms < self.current.total_api_duration_ms
        {
            self.accumulated.total_api_duration_ms += self.current.total_api_duration_ms;
        }
        if self.current.total_lines_added > 0
            && new_metrics.total_lines_added < self.current.total_lines_added
        {
            self.accumulated.total_lines_added += self.current.total_lines_added;
        }
        if self.current.total_lines_removed > 0
            && new_metrics.total_lines_removed < self.current.total_lines_removed
        {
            self.accumulated.total_lines_removed += self.current.total_lines_removed;
        }

        self.current = new_metrics.clone();
        self.total = CostMetrics {
            total_cost_usd: self.current.total_cost_usd + self.accumulated.total_cost_usd,
            total_duration_ms: self.current.total_duration_ms + self.accumulated.total_duration_ms,
            total_api_duration_ms: self.current.total_api_duration_ms
                + self.accumulated.total_api_duration_ms,
            total_lines_added: self.current.total_lines_added + self.accumulated.total_lines_added,
            total_lines_removed: self.current.total_lines_removed
                + self.accumulated.total_lines_removed,
        };
    }
}

/// Cost metrics captured from Claude Code.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CostMetrics {
    #[serde(default)]
    pub total_cost_usd: f64,
    #[serde(default)]
    pub total_duration_ms: u64,
    #[serde(default)]
    pub total_api_duration_ms: u64,
    #[serde(default)]
    pub total_lines_added: u64,
    #[serde(default)]
    pub total_lines_removed: u64,
}

impl CostMetrics {
    pub fn from_cost_value(value: &serde_json::Value) -> Self {
        Self {
            total_cost_usd: value
                .get("total_cost_usd")
                .and_then(|v| v.as_f64())
                .unwrap_or_default(),
            total_duration_ms: value
                .get("total_duration_ms")
                .and_then(|v| v.as_u64())
                .unwrap_or_default(),
            total_api_duration_ms: value
                .get("total_api_duration_ms")
                .and_then(|v| v.as_u64())
                .unwrap_or_default(),
            total_lines_added: value
                .get("total_lines_added")
                .and_then(|v| v.as_u64())
                .unwrap_or_default(),
            total_lines_removed: value
                .get("total_lines_removed")
                .and_then(|v| v.as_u64())
                .unwrap_or_default(),
        }
    }
}

/// Token usage extracted from transcript updates.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TokenHistory {
    #[serde(default)]
    pub input: u64,
    #[serde(default)]
    pub output: u64,
    #[serde(default)]
    pub cache_creation_input: u64,
    #[serde(default)]
    pub cache_read_input: u64,
    #[serde(default)]
    pub context_used: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_message_uuid: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_timestamp: Option<String>,
}

/// Track which models have been observed during this session.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ModelUsageEntry {
    pub id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_used_at: Option<String>,
}

/// Internal transcript processing state.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TranscriptState {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub transcript_path: Option<String>,
    #[serde(default)]
    pub processed_offset: u64,
    #[serde(default)]
    pub processed_messages: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_message_uuid: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_timestamp: Option<String>,
}
