use claude_code_statusline_pro::{
    config::Config,
    storage::{self, ProjectResolver, StorageManager},
};
use std::fs;
use std::io::Write;
use std::sync::OnceLock;
use tempfile::tempdir;
use tokio::sync::Mutex;

fn storage_test_mutex() -> &'static Mutex<()> {
    static MUTEX: OnceLock<Mutex<()>> = OnceLock::new();
    MUTEX.get_or_init(|| Mutex::new(()))
}

fn reset_project_resolver() {
    let resolver = ProjectResolver::instance();
    let maybe_guard = resolver.lock();
    if let Ok(mut guard) = maybe_guard {
        guard.clear_cache();
    }
}

async fn init_with_temp_storage(project_id: &str) -> anyhow::Result<tempfile::TempDir> {
    let temp_dir = tempdir()?;
    std::env::set_var("STATUSLINE_STORAGE_PATH", temp_dir.path());
    reset_project_resolver();
    ProjectResolver::set_global_project_id(Some(project_id));

    let config = Config::default();
    storage::initialize_storage_with_settings(Some(project_id.to_string()), &config.storage)
        .await?;

    Ok(temp_dir)
}

#[tokio::test]
async fn test_snapshot_cost_accumulates_on_reset() -> anyhow::Result<()> {
    let _guard = storage_test_mutex().lock().await;
    let project_id = "test-project";
    let temp_dir = init_with_temp_storage(project_id).await?;

    let session_id = "session-cost";

    let first_input = serde_json::json!({
        "session_id": session_id,
        "cost": {
            "total_cost_usd": 1.0,
            "total_duration_ms": 10_000,
            "total_api_duration_ms": 5_000,
            "total_lines_added": 10,
            "total_lines_removed": 2,
            "input_tokens": 1_000,
            "output_tokens": 200,
            "cache_read_tokens": 50,
            "cache_write_tokens": 25
        }
    });
    storage::update_session_snapshot(&first_input).await?;

    let second_input = serde_json::json!({
        "session_id": session_id,
        "cost": {
            "total_cost_usd": 2.0,
            "total_duration_ms": 20_000,
            "total_api_duration_ms": 9_000,
            "total_lines_added": 20,
            "total_lines_removed": 4,
            "input_tokens": 2_000,
            "output_tokens": 400,
            "cache_read_tokens": 70,
            "cache_write_tokens": 30
        }
    });
    storage::update_session_snapshot(&second_input).await?;

    let reset_input = serde_json::json!({
        "session_id": session_id,
        "cost": {
            "total_cost_usd": 0.5,
            "total_duration_ms": 2_000,
            "total_api_duration_ms": 1_000,
            "total_lines_added": 5,
            "total_lines_removed": 1,
            "input_tokens": 500,
            "output_tokens": 100,
            "cache_read_tokens": 40,
            "cache_write_tokens": 10
        }
    });
    storage::update_session_snapshot(&reset_input).await?;

    let total_cost = storage::get_session_cost_display(session_id).await?;
    assert!(
        (total_cost - 2.5).abs() < f64::EPSILON,
        "total cost should include accumulated cycles"
    );

    let manager = StorageManager::new()?;
    let snapshot = manager
        .get_snapshot(session_id)?
        .expect("snapshot should exist");
    assert_eq!(snapshot.history.cost.current.total_cost_usd, 0.5);
    assert_eq!(snapshot.history.cost.accumulated.total_cost_usd, 2.0);
    assert_eq!(snapshot.history.cost.total.total_cost_usd, 2.5);
    assert_eq!(snapshot.history.cost.total.total_lines_added, 25);
    assert_eq!(snapshot.history.cost.total.total_lines_removed, 5);

    std::env::remove_var("STATUSLINE_STORAGE_PATH");
    reset_project_resolver();
    drop(temp_dir);
    Ok(())
}

#[tokio::test]
async fn test_snapshot_updates_tokens_from_transcript() -> anyhow::Result<()> {
    let _guard = storage_test_mutex().lock().await;
    let project_id = "token-project";
    let temp_dir = init_with_temp_storage(project_id).await?;

    let session_id = "token-session";
    let transcript_dir = temp_dir
        .path()
        .join("projects")
        .join(ProjectResolver::hash_global_path(project_id));
    fs::create_dir_all(&transcript_dir)?;
    let transcript_path = transcript_dir.join("token-session.jsonl");

    let mut file = fs::File::create(&transcript_path)?;
    writeln!(
        file,
        r#"{{"type":"assistant","uuid":"msg-1","timestamp":"2025-01-01T00:00:00Z","message":{{"usage":{{"input_tokens":10,"output_tokens":5,"cache_creation_input_tokens":100,"cache_read_input_tokens":20}}}}}}"#
    )?;
    file.flush()?;

    let input = serde_json::json!({
        "session_id": session_id,
        "transcript_path": transcript_path,
        "cost": {
            "total_cost_usd": 0.1
        },
        "model": {
            "id": "claude-sonnet-4-5-20250929",
            "display_name": "Sonnet 4.5"
        }
    });
    storage::update_session_snapshot(&input).await?;

    // Append a compression summary and ensure tokens reset
    let mut file = fs::OpenOptions::new().append(true).open(&transcript_path)?;
    writeln!(
        file,
        r#"{{"isCompactSummary":true,"timestamp":"2025-01-01T00:00:30Z","uuid":"summary-1"}}"#
    )?;
    file.flush()?;

    storage::update_session_snapshot(&input).await?;

    let tokens_after_summary = storage::get_session_tokens(session_id)
        .await?
        .expect("token history should exist after summary");
    assert_eq!(tokens_after_summary.context_used, 0);
    assert_eq!(tokens_after_summary.input, 0);

    // Append another assistant message to verify incremental parsing
    let mut file = fs::OpenOptions::new().append(true).open(&transcript_path)?;
    writeln!(
        file,
        r#"{{"type":"assistant","uuid":"msg-2","timestamp":"2025-01-01T00:01:00Z","message":{{"usage":{{"input_tokens":20,"output_tokens":10,"cache_creation_input_tokens":200,"cache_read_input_tokens":40}}}}}}"#
    )?;
    file.flush()?;

    storage::update_session_snapshot(&input).await?;

    let tokens = storage::get_session_tokens(session_id)
        .await?
        .expect("token history should exist");
    assert_eq!(tokens.input, 20);
    assert_eq!(tokens.output, 10);
    assert_eq!(tokens.cache_creation_input, 200);
    assert_eq!(tokens.cache_read_input, 40);
    assert_eq!(tokens.context_used, 270);
    assert_eq!(tokens.last_message_uuid.as_deref(), Some("msg-2"));

    std::env::remove_var("STATUSLINE_STORAGE_PATH");
    reset_project_resolver();
    drop(temp_dir);
    Ok(())
}
