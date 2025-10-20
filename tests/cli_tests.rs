use assert_cmd::Command;
use claude_code_statusline_pro::storage::ProjectResolver;
use predicates::prelude::*;
use std::fs;
use tempfile::tempdir;

#[test]
fn cli_mock_scenario_runs() {
    let mut cmd = Command::cargo_bin("claude-code-statusline-pro").expect("binary available");
    let assert = cmd.arg("--mock").arg("dev").assert().success();
    assert.stdout(predicate::str::is_empty().not());
}

#[test]
fn cli_config_init_force_creates_files() {
    let temp_home = tempdir().expect("create temp home");
    let mut cmd = Command::cargo_bin("claude-code-statusline-pro").expect("binary available");
    let project_dir = temp_home.path().join("workspace");
    fs::create_dir_all(&project_dir).expect("create project dir");

    cmd.env("HOME", temp_home.path())
        .arg("config")
        .arg("init")
        .arg(project_dir.to_str().unwrap())
        .arg("--with-components")
        .arg("--yes")
        .arg("--theme")
        .arg("classic")
        .assert()
        .success();

    let hashed = ProjectResolver::hash_global_path(project_dir.to_str().unwrap());
    let config_path = temp_home
        .path()
        .join(".claude")
        .join("projects")
        .join(hashed)
        .join("statusline-pro")
        .join("config.toml");
    assert!(config_path.exists(), "project config not created");

    let components_dir = config_path.parent().unwrap().join("components");
    assert!(components_dir.exists(), "components directory missing");
}
