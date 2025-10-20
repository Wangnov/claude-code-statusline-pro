//! Storage Manager for statusline-pro
//!
//! 存储管理器 - 负责会话快照与增量指标的持久化。

use std::fs::{self, File};
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::{Path, PathBuf};

use anyhow::{anyhow, Context, Result};
use chrono::Utc;
use serde_json::Map;
use serde_json::Value;
use tokio::fs as async_fs;

use super::project_resolver::ProjectResolver;
use super::types::{
    CostMetrics, ModelUsageEntry, SessionHistory, SessionSnapshot, StorageConfig, StoragePaths,
    TokenHistory,
};
use super::{current_runtime_config, current_runtime_project_id, set_runtime_project_id};
use crate::utils;

/// Storage Manager responsible for persisting session snapshots.
pub struct StorageManager {
    config: StorageConfig,
    paths: StoragePaths,
    project_id: Option<String>,
}

impl StorageManager {
    /// Create new `StorageManager` using runtime configuration
    ///
    /// # Errors
    ///
    /// Returns an error if required storage directories cannot be created.
    pub fn new() -> Result<Self> {
        let config = current_runtime_config();
        let project_id = current_runtime_project_id();
        Self::with_config(config, project_id)
    }

    /// Create new `StorageManager` with custom configuration and project context
    ///
    /// # Errors
    ///
    /// Returns an error if required storage directories cannot be created.
    pub fn with_config(config: StorageConfig, project_id: Option<String>) -> Result<Self> {
        let paths = Self::initialize_paths(&config, project_id.as_deref());

        let manager = Self {
            config,
            paths,
            project_id,
        };

        manager.ensure_directories()?;
        Ok(manager)
    }

    /// Initialize storage paths based on current project
    fn initialize_paths(config: &StorageConfig, project_id: Option<&str>) -> StoragePaths {
        let base_path = config.storage_path.clone().unwrap_or_else(|| {
            utils::home_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join(".claude")
        });

        let project_hash = project_id.map_or_else(
            || ProjectResolver::get_global_project_id(None),
            str::to_string,
        );

        let project_dir = base_path.join("projects").join(&project_hash);

        StoragePaths {
            user_config_dir: base_path.join("statusline-pro"),
            project_config_dir: project_dir.join("statusline-pro"),
            sessions_dir: project_dir.join("statusline-pro").join("sessions"),
            user_config_path: base_path.join("statusline-pro").join("config.toml"),
            project_config_path: project_dir.join("statusline-pro").join("config.toml"),
        }
    }

    /// Ensure all required directories exist
    ///
    /// # Errors
    ///
    /// Returns an error if storage directories cannot be created.
    pub fn ensure_directories(&self) -> Result<()> {
        let dirs = [
            &self.paths.user_config_dir,
            &self.paths.project_config_dir,
            &self.paths.sessions_dir,
        ];

        for dir in &dirs {
            if !dir.exists() {
                fs::create_dir_all(dir)
                    .with_context(|| format!("Failed to create directory: {}", dir.display()))?;
            }
        }

        Ok(())
    }

    /// Set project ID and reinitialize paths
    pub fn set_project_id(&mut self, project_id: &str) {
        self.project_id = Some(project_id.to_string());

        set_runtime_project_id(self.project_id.clone());
        ProjectResolver::set_global_project_id(Some(project_id));

        self.paths = Self::initialize_paths(&self.config, Some(project_id));
        let _ = self.ensure_directories();
    }

    fn session_file_path(&self, session_id: &str) -> PathBuf {
        self.paths.sessions_dir.join(format!("{session_id}.json"))
    }

    fn load_snapshot(&self, session_id: &str) -> Result<Option<SessionSnapshot>> {
        let path = self.session_file_path(session_id);
        if !path.exists() {
            return Ok(None);
        }

        let content = fs::read_to_string(&path)
            .with_context(|| format!("Failed to read session file: {}", path.display()))?;

        match serde_json::from_str::<SessionSnapshot>(&content) {
            Ok(snapshot) => Ok(Some(snapshot)),
            Err(err) => {
                eprintln!(
                    "[storage] Failed to parse snapshot {}, recreating. Error: {}",
                    path.display(),
                    err
                );
                Ok(None)
            }
        }
    }

    fn save_snapshot(&self, snapshot: &SessionSnapshot) -> Result<()> {
        if !self.config.enable_cost_persistence {
            return Ok(());
        }

        let path = self.session_file_path(&snapshot.meta.session_id);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).with_context(|| {
                format!(
                    "Failed to create parent directory for snapshot: {}",
                    parent.display()
                )
            })?;
        }

        let tmp_path = path.with_extension("json.tmp");
        let json_content = serde_json::to_string_pretty(snapshot)
            .with_context(|| "Failed to serialize session snapshot")?;
        fs::write(&tmp_path, json_content).with_context(|| {
            format!("Failed to write snapshot temp file: {}", tmp_path.display())
        })?;
        fs::rename(&tmp_path, &path).with_context(|| {
            format!("Failed to atomically persist snapshot: {}", path.display())
        })?;
        Ok(())
    }

    fn determine_project_path(input: &Value, existing: Option<&str>) -> Option<String> {
        if let Some(workspace) = input
            .get("workspace")
            .or_else(|| input.get("workspaceInfo"))
        {
            if let Some(path) = workspace
                .get("project_dir")
                .or_else(|| workspace.get("projectDir"))
                .and_then(|v| v.as_str())
            {
                return Some(path.to_string());
            }
        }

        if let Some(cwd) = input
            .get("cwd")
            .or_else(|| input.get("currentDir"))
            .and_then(|v| v.as_str())
        {
            return Some(cwd.to_string());
        }

        if let Some(existing) = existing {
            return Some(existing.to_string());
        }

        std::env::current_dir()
            .ok()
            .map(|p| p.to_string_lossy().to_string())
    }

    fn update_model_usage(
        history: &mut SessionHistory,
        model: Option<&Value>,
        timestamp: Option<&str>,
    ) {
        let Some(model) = model else {
            return;
        };
        let Some(id) = model
            .get("id")
            .or_else(|| model.get("model_id"))
            .and_then(|v| v.as_str())
        else {
            return;
        };

        let display_name = model
            .get("display_name")
            .or_else(|| model.get("displayName"))
            .and_then(|v| v.as_str())
            .map(std::string::ToString::to_string);
        let timestamp = timestamp.map(std::string::ToString::to_string);

        if let Some(entry) = history.model_usage.iter_mut().find(|entry| entry.id == id) {
            if display_name.is_some() {
                entry.display_name = display_name;
            }
            if timestamp.is_some() {
                entry.last_used_at = timestamp;
            }
        } else {
            history.model_usage.push(ModelUsageEntry {
                id: id.to_string(),
                display_name,
                last_used_at: timestamp,
            });
        }
    }

    fn read_tokens_from_transcript(
        snapshot: &mut SessionSnapshot,
        transcript_path: &str,
    ) -> Result<()> {
        let path = Path::new(transcript_path);
        if !path.exists() {
            snapshot.transcript_state.transcript_path = Some(transcript_path.to_string());
            return Ok(());
        }

        let metadata = fs::metadata(path)
            .with_context(|| format!("Failed to read transcript metadata: {transcript_path}"))?;
        let file_len = metadata.len();

        let mut offset = snapshot.transcript_state.processed_offset;
        let needs_reset = snapshot.transcript_state.transcript_path.as_deref()
            != Some(transcript_path)
            || offset > file_len;

        let mut processed_messages = if needs_reset {
            0
        } else {
            snapshot.transcript_state.processed_messages
        };

        if needs_reset {
            offset = 0;
        }

        let mut file = File::open(path)
            .with_context(|| format!("Failed to open transcript: {transcript_path}"))?;
        file.seek(SeekFrom::Start(offset))
            .with_context(|| format!("Failed to seek transcript: {transcript_path}"))?;
        let mut reader = BufReader::new(file);

        let mut buffer = String::new();
        let mut current_offset = offset;
        let mut latest_tokens = snapshot.history.tokens.clone();
        Self::process_transcript_stream(
            &mut reader,
            transcript_path,
            &mut buffer,
            &mut current_offset,
            &mut processed_messages,
            &mut latest_tokens,
        )?;

        snapshot.transcript_state.transcript_path = Some(transcript_path.to_string());
        snapshot.transcript_state.processed_offset = current_offset;
        snapshot.transcript_state.processed_messages = processed_messages;

        if let Some(tokens) = latest_tokens {
            snapshot
                .transcript_state
                .last_message_uuid
                .clone_from(&tokens.last_message_uuid);
            snapshot
                .transcript_state
                .last_timestamp
                .clone_from(&tokens.last_timestamp);
            snapshot.history.tokens = Some(tokens);
        }

        Ok(())
    }

    fn process_transcript_stream(
        reader: &mut BufReader<File>,
        transcript_path: &str,
        buffer: &mut String,
        current_offset: &mut u64,
        processed_messages: &mut u64,
        latest_tokens: &mut Option<TokenHistory>,
    ) -> Result<()> {
        loop {
            buffer.clear();
            let bytes_read = reader
                .read_line(buffer)
                .with_context(|| format!("Failed to read transcript line: {transcript_path}"))?;
            if bytes_read == 0 {
                break;
            }

            *current_offset += bytes_read as u64;

            let trimmed = buffer.trim();
            if trimmed.is_empty() {
                continue;
            }

            *processed_messages += 1;

            let value: Value = match serde_json::from_str(trimmed) {
                Ok(v) => v,
                Err(_) => continue,
            };

            if Self::is_compact_summary(&value) {
                *latest_tokens = Some(Self::token_entry_from_summary(&value));
                continue;
            }

            if let Some(entry) = Self::token_entry_from_message(&value) {
                *latest_tokens = Some(entry);
            }
        }

        Ok(())
    }

    fn is_compact_summary(value: &Value) -> bool {
        value
            .get("isCompactSummary")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(false)
    }

    fn token_entry_from_summary(value: &Value) -> TokenHistory {
        TokenHistory {
            last_timestamp: value
                .get("timestamp")
                .and_then(|v| v.as_str())
                .map(std::string::ToString::to_string),
            ..TokenHistory::default()
        }
    }

    fn token_entry_from_message(value: &Value) -> Option<TokenHistory> {
        let is_assistant = value
            .get("type")
            .and_then(|ty| ty.as_str())
            .is_some_and(|ty| ty == "assistant");
        if !is_assistant {
            return None;
        }

        let message = value.get("message")?;
        let usage = message.get("usage")?;

        let input = usage
            .get("input_tokens")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(0);
        let output = usage
            .get("output_tokens")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(0);
        let cache_creation = usage
            .get("cache_creation_input_tokens")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(0);
        let cache_read = usage
            .get("cache_read_input_tokens")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(0);

        let entry = TokenHistory {
            input,
            output,
            cache_creation_input: cache_creation,
            cache_read_input: cache_read,
            context_used: input + output + cache_creation + cache_read,
            last_message_uuid: value
                .get("uuid")
                .and_then(|v| v.as_str())
                .map(std::string::ToString::to_string),
            last_timestamp: value
                .get("timestamp")
                .and_then(|v| v.as_str())
                .map(std::string::ToString::to_string),
        };

        Some(entry)
    }

    fn extract_session_id(input_data: &Value) -> Option<&str> {
        input_data
            .get("session_id")
            .or_else(|| input_data.get("sessionId"))
            .and_then(|v| v.as_str())
    }

    fn extract_cost_value(input_data: &Value) -> Option<&Value> {
        input_data
            .get("cost")
            .or_else(|| input_data.get("sessionCost"))
    }

    fn extract_model(input_data: &Value) -> Option<&Value> {
        input_data
            .get("model")
            .or_else(|| input_data.get("modelInfo"))
    }

    fn extract_timestamp(input_data: &Value) -> Option<&str> {
        input_data
            .get("timestamp")
            .and_then(|v| v.as_str())
            .or_else(|| input_data.get("last_update_time").and_then(|v| v.as_str()))
    }

    fn extract_transcript_path(input_data: &Value) -> Option<&str> {
        input_data
            .get("transcript_path")
            .or_else(|| input_data.get("transcriptPath"))
            .and_then(|v| v.as_str())
    }

    /// Update snapshot from Claude Code input JSON.
    ///
    /// # Errors
    ///
    /// Returns an error when snapshots cannot be persisted, transcript data
    /// cannot be read, or JSON payloads fail to deserialize.
    pub fn update_snapshot_from_value(&self, input_data: &Value) -> Result<SessionSnapshot> {
        if !self.config.enable_cost_persistence {
            return Ok(SessionSnapshot::new("disabled"));
        }

        let session_id = Self::extract_session_id(input_data)
            .ok_or_else(|| anyhow!("No session ID found in input data"))?;

        let mut snapshot = self
            .load_snapshot(session_id)?
            .unwrap_or_else(|| SessionSnapshot::new(session_id));

        snapshot.meta.session_id = session_id.to_string();
        snapshot.meta.project_path =
            Self::determine_project_path(input_data, snapshot.meta.project_path.as_deref());
        snapshot.meta.last_update_time = Some(Utc::now());
        if snapshot.meta.created_at.is_none() {
            snapshot.meta.created_at = Some(Utc::now());
        }

        let mut latest = input_data.clone();
        sanitize_latest_value(&mut latest);
        snapshot.latest = latest;

        if let Some(cost_value) = Self::extract_cost_value(input_data) {
            let metrics = CostMetrics::from_cost_value(cost_value);
            snapshot.history.cost.apply(&metrics);
        }

        if let Some(transcript_path) = Self::extract_transcript_path(input_data) {
            if let Err(err) = Self::read_tokens_from_transcript(&mut snapshot, transcript_path) {
                eprintln!("[storage] Failed to update token usage for session {session_id}: {err}");
            }
        }

        let model_value = Self::extract_model(input_data);
        let input_timestamp = Self::extract_timestamp(input_data);
        let token_timestamp_owned = snapshot
            .history
            .tokens
            .as_ref()
            .and_then(|tokens| tokens.last_timestamp.clone());
        let effective_timestamp = input_timestamp.or(token_timestamp_owned.as_deref());
        Self::update_model_usage(&mut snapshot.history, model_value, effective_timestamp);

        self.save_snapshot(&snapshot)?;
        Ok(snapshot)
    }

    /// # Errors
    ///
    /// Returns an error if the snapshot cannot be loaded from disk or the
    /// underlying storage fails while deserializing previous state.
    pub fn get_snapshot(&self, session_id: &str) -> Result<Option<SessionSnapshot>> {
        self.load_snapshot(session_id)
    }

    /// Clean up old session snapshots based on retention configuration.
    ///
    /// # Errors
    ///
    /// Returns an error if stored session metadata cannot be listed or if
    /// removing expired snapshots fails.
    pub async fn cleanup_old_sessions(&self) -> Result<()> {
        if !self.config.enable_startup_cleanup {
            return Ok(());
        }

        let Some(cleanup_days) = self.config.session_expiry_days else {
            return Ok(());
        };

        if cleanup_days == 0 {
            return Ok(());
        }

        let cutoff_date = Utc::now()
            - chrono::Duration::try_days(i64::from(cleanup_days))
                .unwrap_or_else(|| chrono::Duration::milliseconds(0));

        if !self.paths.sessions_dir.exists() {
            return Ok(());
        }

        let mut entries = async_fs::read_dir(&self.paths.sessions_dir)
            .await
            .with_context(|| "Failed to read sessions directory")?;

        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();

            if !path.extension().is_some_and(|ext| ext == "json") {
                continue;
            }

            if let Ok(metadata) = entry.metadata().await {
                if let Ok(modified) = metadata.modified() {
                    let modified_chrono: chrono::DateTime<Utc> = modified.into();

                    if modified_chrono < cutoff_date {
                        let _ = async_fs::remove_file(&path).await;
                    }
                }
            }
        }

        Ok(())
    }
}

fn sanitize_latest_value(value: &mut Value) {
    match value {
        Value::Object(map) => sanitize_object(map),
        Value::Array(items) => {
            for item in items.iter_mut() {
                sanitize_latest_value(item);
            }
            items.retain(|item| match item {
                Value::Null => false,
                Value::Object(obj) => !obj.is_empty(),
                Value::Array(arr) => !arr.is_empty(),
                _ => true,
            });
        }
        _ => {}
    }
}

fn sanitize_object(map: &mut Map<String, Value>) {
    if let Some(Value::Object(cost_map)) = map.get_mut("cost") {
        for key in [
            "input_tokens",
            "output_tokens",
            "total_tokens",
            "cache_read_tokens",
            "cache_write_tokens",
        ] {
            cost_map.remove(key);
        }
        let cost_keys: Vec<String> = cost_map.keys().cloned().collect();
        for key in cost_keys {
            if let Some(value) = cost_map.get_mut(&key) {
                sanitize_latest_value(value);
                if value.is_null()
                    || matches!(value, Value::Object(obj) if obj.is_empty())
                    || matches!(value, Value::Array(arr) if arr.is_empty())
                {
                    cost_map.remove(&key);
                }
            }
        }
        if cost_map.is_empty() {
            map.remove("cost");
        }
    }

    let keys: Vec<String> = map.keys().cloned().collect();
    for key in keys {
        if let Some(value) = map.get_mut(&key) {
            sanitize_latest_value(value);
            if value.is_null()
                || matches!(value, Value::Object(obj) if obj.is_empty())
                || matches!(value, Value::Array(arr) if arr.is_empty())
            {
                map.remove(&key);
            }
        }
    }
}
