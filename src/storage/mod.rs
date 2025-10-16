//! Storage system for statusline-pro
//!
//! Provides persistent storage for session snapshots and incremental metrics.

mod manager;
mod project_resolver;
mod types;

pub use manager::StorageManager;
pub use project_resolver::ProjectResolver;
pub use types::*;

use crate::config::StorageConfig as SettingsConfig;
use anyhow::Result;
use lazy_static::lazy_static;
use std::path::PathBuf;
use std::sync::RwLock;
use tokio::task;

#[derive(Debug, Clone)]
#[derive(Default)]
struct StorageRuntimeState {
    config: types::StorageConfig,
    project_id: Option<String>,
}


lazy_static! {
    static ref STORAGE_RUNTIME: RwLock<StorageRuntimeState> =
        RwLock::new(StorageRuntimeState::default());
}

fn runtime_config() -> types::StorageConfig {
    STORAGE_RUNTIME
        .read()
        .expect("storage runtime state poisoned")
        .config
        .clone()
}

fn runtime_project_id() -> Option<String> {
    STORAGE_RUNTIME
        .read()
        .expect("storage runtime state poisoned")
        .project_id
        .clone()
}

fn update_runtime_config(config: types::StorageConfig) {
    if let Ok(mut state) = STORAGE_RUNTIME.write() {
        state.config = config;
    }
}

fn update_runtime_project_id(project_id: Option<String>) {
    if let Ok(mut state) = STORAGE_RUNTIME.write() {
        state.project_id = project_id;
    }
}

fn convert_settings(settings: &SettingsConfig) -> types::StorageConfig {
    let storage_path = std::env::var("STATUSLINE_STORAGE_PATH")
        .ok()
        .map(PathBuf::from);

    types::StorageConfig {
        enable_conversation_tracking: settings.enable_conversation_tracking,
        storage_path,
        enable_cost_persistence: settings.enable_cost_persistence,
        session_expiry_days: Some(settings.session_expiry_days),
        enable_startup_cleanup: settings.enable_startup_cleanup,
    }
}

/// Initialize the storage system with optional project ID and configuration settings
pub async fn initialize_storage_with_settings(
    project_id: Option<String>,
    settings: &SettingsConfig,
) -> Result<()> {
    let storage_config = convert_settings(settings);
    update_runtime_config(storage_config.clone());

    if let Some(ref id) = project_id {
        update_runtime_project_id(Some(id.clone()));
    }

    let mut manager = StorageManager::new()?;

    if let Some(id) = project_id.clone() {
        manager.set_project_id(id);
    }

    manager.ensure_directories()?;

    if storage_config.enable_startup_cleanup {
        manager.cleanup_old_sessions().await?;
    }

    Ok(())
}

/// Initialize the storage system using default settings
pub async fn initialize_storage(project_id: Option<String>) -> Result<()> {
    initialize_storage_with_settings(project_id, &SettingsConfig::default()).await
}

pub(crate) fn current_runtime_config() -> types::StorageConfig {
    runtime_config()
}

pub(crate) fn current_runtime_project_id() -> Option<String> {
    runtime_project_id()
}

pub(crate) fn set_runtime_project_id(project_id: Option<String>) {
    update_runtime_project_id(project_id);
}

/// Update session snapshot from Claude Code input data.
pub async fn update_session_snapshot(input_data: &serde_json::Value) -> Result<()> {
    let payload = input_data.clone();
    task::spawn_blocking(move || {
        let manager = StorageManager::new()?;
        manager.update_snapshot_from_value(&payload)?;
        Ok::<(), anyhow::Error>(())
    })
    .await??;
    Ok(())
}

/// Get session cost display (single session mode)
pub async fn get_session_cost_display(session_id: &str) -> Result<f64> {
    let session_id = session_id.to_string();
    let snapshot = task::spawn_blocking(move || {
        let manager = StorageManager::new()?;
        manager.get_snapshot(&session_id)
    })
    .await??;

    Ok(snapshot.map_or(0.0, |snap| snap.history.cost.total.total_cost_usd))
}

/// Get conversation cost display (conversation mode)
pub async fn get_conversation_cost_display(session_id: &str) -> Result<f64> {
    get_session_cost_display(session_id).await
}

/// Retrieve cached token usage for a session.
pub async fn get_session_tokens(session_id: &str) -> Result<Option<TokenHistory>> {
    let session_id = session_id.to_string();
    let snapshot = task::spawn_blocking(move || {
        let manager = StorageManager::new()?;
        manager.get_snapshot(&session_id)
    })
    .await??;

    Ok(snapshot.and_then(|snap| snap.history.tokens))
}
