use std::collections::HashMap;

use claude_code_statusline_pro::core::{CostInfo, InputData, ModelInfo, WorkspaceInfo};

/// Predefined mock scenarios for CLI preview mode
pub struct MockDataGenerator {
    scenarios: HashMap<&'static str, InputData>,
}

impl MockDataGenerator {
    pub fn new() -> Self {
        let mut scenarios = HashMap::new();

        scenarios.insert("dev", build_dev_scenario());
        scenarios.insert("critical", build_critical_scenario());
        scenarios.insert("thinking", build_thinking_scenario());
        scenarios.insert("complete", build_complete_scenario());
        scenarios.insert("error", build_error_scenario());

        Self { scenarios }
    }

    pub fn generate(&self, name: &str) -> Option<InputData> {
        self.scenarios.get(name).cloned()
    }

    pub fn available(&self) -> impl Iterator<Item = &'static str> + '_ {
        self.scenarios.keys().copied()
    }
}

fn build_dev_scenario() -> InputData {
    let current_dir = std::env::current_dir()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    InputData {
        session_id: Some("mock-dev-session".to_string()),
        model: Some(ModelInfo {
            id: Some("claude-sonnet-4".to_string()),
            display_name: Some("Claude Sonnet 4".to_string()),
        }),
        workspace: Some(WorkspaceInfo {
            current_dir: Some(current_dir.clone()),
            project_dir: Some(current_dir),
        }),
        cost: Some(CostInfo {
            total_cost_usd: Some(0.023),
            total_duration_ms: Some(12_000),
            total_api_duration_ms: Some(4_500),
            total_lines_added: Some(12),
            total_lines_removed: Some(4),
            input_tokens: Some(1_200),
            output_tokens: Some(640),
            total_tokens: Some(1_840),
            cache_read_tokens: Some(0),
            cache_write_tokens: Some(0),
        }),
        ..Default::default()
    }
}

fn build_critical_scenario() -> InputData {
    InputData {
        session_id: Some("mock-critical-session".to_string()),
        model: Some(ModelInfo {
            id: Some("claude-opus-4.1".to_string()),
            display_name: Some("Claude Opus 4.1".to_string()),
        }),
        workspace: Some(WorkspaceInfo {
            current_dir: Some("/Users/dev/enterprise-app".to_string()),
            project_dir: Some("/Users/dev/enterprise-app".to_string()),
        }),
        cost: Some(CostInfo {
            total_cost_usd: Some(1.284),
            total_duration_ms: Some(185_000),
            total_api_duration_ms: Some(52_000),
            total_lines_added: Some(150),
            total_lines_removed: Some(80),
            input_tokens: Some(90_000),
            output_tokens: Some(35_000),
            total_tokens: Some(125_000),
            cache_read_tokens: Some(12_000),
            cache_write_tokens: Some(2_000),
        }),
        ..Default::default()
    }
}

fn build_thinking_scenario() -> InputData {
    InputData {
        session_id: Some("mock-thinking-session".to_string()),
        model: Some(ModelInfo {
            id: Some("claude-sonnet-4".to_string()),
            display_name: Some("Claude Sonnet 4".to_string()),
        }),
        cost: Some(CostInfo {
            total_cost_usd: Some(0.157),
            total_duration_ms: Some(45_000),
            total_api_duration_ms: Some(12_000),
            total_lines_added: Some(6),
            total_lines_removed: Some(2),
            input_tokens: Some(9_500),
            output_tokens: Some(3_200),
            total_tokens: Some(12_700),
            cache_read_tokens: Some(1_200),
            cache_write_tokens: Some(0),
        }),
        ..Default::default()
    }
}

fn build_complete_scenario() -> InputData {
    InputData {
        session_id: Some("mock-complete-session".to_string()),
        model: Some(ModelInfo {
            id: Some("claude-sonnet-4".to_string()),
            display_name: Some("Claude Sonnet 4".to_string()),
        }),
        cost: Some(CostInfo {
            total_cost_usd: Some(0.452),
            total_duration_ms: Some(98_000),
            total_api_duration_ms: Some(26_000),
            total_lines_added: Some(42),
            total_lines_removed: Some(18),
            input_tokens: Some(24_000),
            output_tokens: Some(12_000),
            total_tokens: Some(36_000),
            cache_read_tokens: Some(3_000),
            cache_write_tokens: Some(800),
        }),
        ..Default::default()
    }
}

fn build_error_scenario() -> InputData {
    InputData {
        session_id: Some("mock-error-session".to_string()),
        model: Some(ModelInfo {
            id: Some("claude-haiku-4".to_string()),
            display_name: Some("Claude Haiku 4".to_string()),
        }),
        cost: Some(CostInfo {
            total_cost_usd: Some(0.089),
            total_duration_ms: Some(18_000),
            total_api_duration_ms: Some(6_000),
            total_lines_added: Some(0),
            total_lines_removed: Some(0),
            input_tokens: Some(6_000),
            output_tokens: Some(1_000),
            total_tokens: Some(7_000),
            cache_read_tokens: Some(0),
            cache_write_tokens: Some(0),
        }),
        ..Default::default()
    }
}
