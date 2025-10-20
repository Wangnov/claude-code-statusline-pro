//! Status component implementation
//!
//! Displays the current status of Claude (ready, thinking, tool, error, etc.),
//! falling back to STDIN metadata when transcript data is unavailable.

use std::fs;
use std::sync::Mutex;
use std::time::SystemTime;

use async_trait::async_trait;
use serde_json::Value;

use super::base::{Component, ComponentFactory, ComponentOutput, RenderContext};
use crate::config::{BaseComponentConfig, Config, StatusComponentConfig};

/// Status types rendered by the component
#[derive(Debug, Clone, PartialEq, Eq)]
enum StatusType {
    Ready,
    Thinking,
    Tool,
    Error,
    Warning,
}

/// Resolved status payload used for rendering
#[derive(Debug, Clone)]
struct StatusInfo {
    status_type: StatusType,
    message: String,
    details: Option<String>,
}

impl StatusInfo {
    fn ready() -> Self {
        Self {
            status_type: StatusType::Ready,
            message: "Ready".to_string(),
            details: None,
        }
    }

    fn thinking() -> Self {
        Self {
            status_type: StatusType::Thinking,
            message: "Thinking".to_string(),
            details: None,
        }
    }

    fn tool(details: Option<String>) -> Self {
        Self {
            status_type: StatusType::Tool,
            message: "Tool".to_string(),
            details,
        }
    }

    fn error(details: Option<String>) -> Self {
        Self {
            status_type: StatusType::Error,
            message: "Error".to_string(),
            details,
        }
    }

    fn warning(message: &str, details: Option<String>) -> Self {
        Self {
            status_type: StatusType::Warning,
            message: message.to_string(),
            details,
        }
    }
}

#[derive(Clone)]
struct TranscriptCache {
    mtime: SystemTime,
    info: StatusInfo,
}

/// Status component
pub struct StatusComponent {
    config: StatusComponentConfig,
    transcript_cache: Mutex<Option<TranscriptCache>>,
}

impl StatusComponent {
    /// Create a new status component
    #[must_use]
    pub const fn new(config: StatusComponentConfig) -> Self {
        Self {
            config,
            transcript_cache: Mutex::new(None),
        }
    }

    /// Resolve status using transcript when available, otherwise fall back to stdin metadata.
    fn resolve_status(&self, ctx: &RenderContext) -> StatusInfo {
        if let Some(path) = ctx.input.transcript_path.as_deref() {
            if let Some(info) = self.parse_transcript_status(path, ctx) {
                return info;
            }
        }

        Self::parse_status_from_input(ctx)
    }

    /// Parse status from stdin metadata (legacy path)
    fn parse_status_from_input(ctx: &RenderContext) -> StatusInfo {
        if let Some(status_str) = ctx.input.extra.get("status").and_then(Value::as_str) {
            return Self::parse_status_string(status_str);
        }

        if let Some(reason_str) = ctx.input.extra.get("stop_reason").and_then(Value::as_str) {
            return Self::parse_stop_reason(reason_str, None);
        }

        if let Some(error) = ctx.input.extra.get("error") {
            let is_error_flag = error.as_bool().unwrap_or(false);
            let error_text = error.as_str().map(std::string::ToString::to_string);
            if is_error_flag || error_text.is_some() {
                return StatusInfo::error(error_text);
            }
        }

        StatusInfo::ready()
    }

    /// Parse transcript lines and infer status (mirrors TypeScript implementation)
    fn parse_transcript_status(&self, path: &str, _ctx: &RenderContext) -> Option<StatusInfo> {
        let metadata = fs::metadata(path).ok()?;
        let modified = metadata.modified().ok()?;

        if let Some(cache) = self
            .transcript_cache
            .lock()
            .ok()
            .and_then(|guard| guard.clone())
        {
            if cache.mtime == modified {
                return Some(cache.info);
            }
        }

        let content = fs::read_to_string(path).ok()?;
        if content.trim().is_empty() {
            let info = StatusInfo::ready();
            self.memoize_transcript(modified, info.clone());
            return Some(info);
        }

        let lines: Vec<&str> = content.lines().collect();
        if lines.is_empty() {
            let info = StatusInfo::ready();
            self.memoize_transcript(modified, info.clone());
            return Some(info);
        }

        let mut last_entry_type: Option<String> = None;
        let mut last_stop_reason: Option<String> = None;
        let mut assistant_error = false;
        let mut assistant_error_detail: Option<String> = None;

        for line in lines.iter().rev() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }

            let Ok(value) = serde_json::from_str::<Value>(trimmed) else {
                continue;
            };

            if last_entry_type.is_none() {
                last_entry_type = value
                    .get("type")
                    .and_then(|v| v.as_str())
                    .map(std::string::ToString::to_string);
            }

            if value.get("type").and_then(|v| v.as_str()) != Some("assistant") {
                continue;
            }

            let Some(message) = value.get("message") else {
                continue;
            };

            if message.get("usage").is_none() {
                continue;
            }

            last_stop_reason = message
                .get("stop_reason")
                .and_then(|v| v.as_str())
                .map(std::string::ToString::to_string);

            if Self::is_error_entry(&value) {
                assistant_error = true;
                assistant_error_detail = Self::get_error_details(&value);
            }

            break;
        }

        let tool_name = Self::collect_recent_tool_name(&lines).filter(|name| !name.is_empty());

        let info = if assistant_error {
            StatusInfo::error(assistant_error_detail)
        } else if let Some(reason) = last_stop_reason.as_deref() {
            Self::parse_stop_reason(reason, tool_name)
        } else if matches!(last_entry_type.as_deref(), Some("user")) {
            StatusInfo::thinking()
        } else {
            StatusInfo::ready()
        };

        self.memoize_transcript(modified, info.clone());

        Some(info)
    }

    fn memoize_transcript(&self, mtime: SystemTime, info: StatusInfo) {
        if let Ok(mut guard) = self.transcript_cache.lock() {
            *guard = Some(TranscriptCache { mtime, info });
        }
    }

    fn parse_status_string(status: &str) -> StatusInfo {
        let normalized = status.to_lowercase();
        match normalized.as_str() {
            "thinking" | "processing" => StatusInfo::thinking(),
            "tool" | "tool_use" => StatusInfo::tool(None),
            "error" => StatusInfo::error(None),
            "warning" => StatusInfo::warning("Warning", None),
            _ => StatusInfo::ready(),
        }
    }

    fn parse_stop_reason(reason: &str, tool_name: Option<String>) -> StatusInfo {
        match reason {
            "tool_use" => StatusInfo::tool(tool_name),
            "max_tokens" => {
                StatusInfo::warning("Max Tokens", Some("Token limit reached".to_string()))
            }
            "stop_sequence" => StatusInfo::error(Some("Stop sequence encountered".to_string())),
            _ => StatusInfo::ready(),
        }
    }

    fn get_status_icon(&self, status_type: &StatusType, ctx: &RenderContext) -> String {
        let term_cfg = &ctx.config.terminal;
        let style = &ctx.config.style;
        let terminal = &ctx.terminal;

        if term_cfg.force_text {
            return self.status_icon_text(status_type).to_string();
        }
        if term_cfg.force_nerd_font {
            return self.status_icon_nerd(status_type).to_string();
        }
        if term_cfg.force_emoji {
            return self.status_icon_emoji(status_type).to_string();
        }

        if terminal.supports_nerd_font
            && style
                .enable_nerd_font
                .is_enabled(terminal.supports_nerd_font)
        {
            return self.status_icon_nerd(status_type).to_string();
        }

        if terminal.supports_emoji && style.enable_emoji.is_enabled(terminal.supports_emoji) {
            return self.status_icon_emoji(status_type).to_string();
        }

        self.status_icon_text(status_type).to_string()
    }

    fn status_icon_emoji(&self, status_type: &StatusType) -> &str {
        match status_type {
            StatusType::Ready => &self.config.icons.emoji.ready,
            StatusType::Thinking => &self.config.icons.emoji.thinking,
            StatusType::Tool => &self.config.icons.emoji.tool,
            StatusType::Error => &self.config.icons.emoji.error,
            StatusType::Warning => &self.config.icons.emoji.warning,
        }
    }

    fn status_icon_nerd(&self, status_type: &StatusType) -> &str {
        match status_type {
            StatusType::Ready => &self.config.icons.nerd.ready,
            StatusType::Thinking => &self.config.icons.nerd.thinking,
            StatusType::Tool => &self.config.icons.nerd.tool,
            StatusType::Error => &self.config.icons.nerd.error,
            StatusType::Warning => &self.config.icons.nerd.warning,
        }
    }

    fn status_icon_text(&self, status_type: &StatusType) -> &str {
        match status_type {
            StatusType::Ready => &self.config.icons.text.ready,
            StatusType::Thinking => &self.config.icons.text.thinking,
            StatusType::Tool => &self.config.icons.text.tool,
            StatusType::Error => &self.config.icons.text.error,
            StatusType::Warning => &self.config.icons.text.warning,
        }
    }

    fn get_status_color(&self, status_type: &StatusType) -> String {
        match status_type {
            StatusType::Ready => self.config.colors.ready.clone(),
            StatusType::Thinking => self.config.colors.thinking.clone(),
            StatusType::Tool => self.config.colors.tool.clone(),
            StatusType::Error => self.config.colors.error.clone(),
            StatusType::Warning => self.config.colors.warning.clone(),
        }
    }

    fn is_error_entry(entry: &Value) -> bool {
        if entry
            .get("toolUseResult")
            .is_some_and(Self::tool_use_indicates_error)
        {
            return true;
        }

        if let Some(message) = entry.get("message") {
            if Self::is_stop_sequence_message(message)
                && Self::message_contains_matching_text(message, Self::text_indicates_error)
            {
                return true;
            }
        }

        false
    }

    fn get_error_details(entry: &Value) -> Option<String> {
        if let Some(tool_use_result) = entry.get("toolUseResult") {
            if let Some(error_msg) = tool_use_result.get("error").and_then(Value::as_str) {
                return Self::error_detail_from_message(error_msg);
            }
        }

        entry.get("message").and_then(|message| {
            if Self::is_stop_sequence_message(message) {
                Self::message_error_detail(message)
            } else {
                None
            }
        })
    }

    fn collect_recent_tool_name(lines: &[&str]) -> Option<String> {
        const RECENT_WINDOW: usize = 5;

        lines
            .iter()
            .rev()
            .take(RECENT_WINDOW)
            .map(|line| line.trim())
            .filter(|trimmed| !trimmed.is_empty())
            .filter_map(|trimmed| serde_json::from_str::<Value>(trimmed).ok())
            .find_map(|value| Self::extract_tool_use_name(&value))
    }

    fn tool_use_indicates_error(tool_use_result: &Value) -> bool {
        if let Some(error_msg) = tool_use_result.get("error").and_then(Value::as_str) {
            return !Self::is_blocked_error_message(error_msg);
        }

        tool_use_result
            .get("type")
            .and_then(Value::as_str)
            .is_some_and(|ty| ty.eq_ignore_ascii_case("error"))
    }

    fn is_stop_sequence_message(message: &Value) -> bool {
        message
            .get("stop_reason")
            .and_then(Value::as_str)
            .is_some_and(|reason| reason == "stop_sequence")
    }

    fn message_contains_matching_text(message: &Value, predicate: impl Fn(&str) -> bool) -> bool {
        message
            .get("content")
            .and_then(Value::as_array)
            .is_some_and(|items| {
                items
                    .iter()
                    .filter_map(|item| {
                        let item_type = item.get("type").and_then(Value::as_str)?;
                        if item_type != "text" {
                            return None;
                        }
                        item.get("text").and_then(Value::as_str)
                    })
                    .any(predicate)
            })
    }

    fn text_indicates_error(text: &str) -> bool {
        (text.starts_with("API Error: 403") && text.contains("user quota is not enough"))
            || text.contains("filter")
    }

    fn error_detail_from_message(error_msg: &str) -> Option<String> {
        if Self::is_blocked_error_message(error_msg) {
            None
        } else {
            Some(error_msg.to_string())
        }
    }

    fn message_error_detail(message: &Value) -> Option<String> {
        let items = message.get("content").and_then(Value::as_array)?;

        items.iter().find_map(|item| {
            let item_type = item.get("type").and_then(Value::as_str)?;
            if item_type != "text" {
                return None;
            }

            let text = item.get("text").and_then(Value::as_str)?;
            if text.starts_with("API Error: 403") && text.contains("user quota is not enough") {
                Some("403 quota insufficient".to_string())
            } else if text.contains("filter") {
                Some("Filter error".to_string())
            } else {
                None
            }
        })
    }

    fn extract_tool_use_name(value: &Value) -> Option<String> {
        let content = value
            .get("message")
            .and_then(|message| message.get("content"))
            .and_then(Value::as_array)?;

        content.iter().find_map(|item| {
            let item_type = item.get("type").and_then(Value::as_str)?;
            if item_type != "tool_use" {
                return None;
            }
            item.get("name")
                .and_then(Value::as_str)
                .map(std::string::ToString::to_string)
        })
    }

    fn is_blocked_error_message(message: &str) -> bool {
        message.contains("was blocked") || message.contains("For security")
    }
}

#[async_trait]
impl Component for StatusComponent {
    fn name(&self) -> &'static str {
        "status"
    }

    fn is_enabled(&self, _ctx: &RenderContext) -> bool {
        self.config.base.enabled
    }

    async fn render(&self, ctx: &RenderContext) -> ComponentOutput {
        if !self.is_enabled(ctx) {
            return ComponentOutput::hidden();
        }

        let status_info = self.resolve_status(ctx);

        if status_info.status_type == StatusType::Ready && !self.config.show_when_idle {
            return ComponentOutput::hidden();
        }

        let icon = self.get_status_icon(&status_info.status_type, ctx);
        let mut text = status_info.message.clone();

        if let Some(details) = status_info.details.as_ref().filter(|d| !d.is_empty()) {
            let should_show_details = match status_info.status_type {
                StatusType::Ready => self.config.show_recent_errors,
                _ => true,
            };

            if should_show_details {
                text.push_str(" (");
                text.push_str(details);
                text.push(')');
            }
        }

        let color = self.get_status_color(&status_info.status_type);

        ComponentOutput::new(text)
            .with_icon(icon)
            .with_icon_color(color.clone())
            .with_text_color(color)
    }

    fn base_config(&self, _ctx: &RenderContext) -> Option<&BaseComponentConfig> {
        Some(&self.config.base)
    }
}

/// Factory for creating Status components
pub struct StatusComponentFactory;

impl ComponentFactory for StatusComponentFactory {
    fn create(&self, config: &Config) -> Box<dyn Component> {
        Box::new(StatusComponent::new(config.components.status.clone()))
    }

    fn name(&self) -> &'static str {
        "status"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::components::TerminalCapabilities;
    use crate::core::InputData;
    use anyhow::{Context, Result};
    use serde_json::json;
    use std::io::Write;
    use std::sync::Arc;
    use tempfile::NamedTempFile;

    type TestResult = Result<()>;

    #[allow(clippy::field_reassign_with_default)]
    fn build_status_config(
        configure: impl FnOnce(&mut StatusComponentConfig),
    ) -> StatusComponentConfig {
        let mut config = StatusComponentConfig::default();
        configure(&mut config);
        config
    }

    #[allow(clippy::field_reassign_with_default)]
    fn build_input(configure: impl FnOnce(&mut InputData)) -> InputData {
        let mut input = InputData::default();
        configure(&mut input);
        input
    }

    fn create_test_context(extra: serde_json::Value) -> RenderContext {
        let input = build_input(|input| {
            input.extra = extra;
        });

        RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
        }
    }

    #[tokio::test]
    async fn test_status_ready() -> TestResult {
        let config = build_status_config(|config| {
            config.show_when_idle = true;
        });

        let component = StatusComponent::new(config);
        let ctx = create_test_context(json!({
            "status": "ready"
        }));

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "Ready");
        assert_eq!(output.icon.as_deref(), Some("✅"));
        Ok(())
    }

    #[tokio::test]
    async fn test_status_error_flag() -> TestResult {
        let component = StatusComponent::new(StatusComponentConfig::default());
        let ctx = create_test_context(json!({
            "error": true
        }));

        let output = component.render(&ctx).await;
        assert!(output.visible);
        assert_eq!(output.text, "Error");
        assert_eq!(output.icon_color, Some("red".to_string()));
        Ok(())
    }

    #[tokio::test]
    async fn test_status_hide_when_idle() -> TestResult {
        let component = StatusComponent::new(StatusComponentConfig::default());
        let ctx = create_test_context(json!({}));

        let output = component.render(&ctx).await;
        assert!(!output.visible);
        Ok(())
    }

    #[tokio::test]
    async fn test_status_from_transcript_tool() -> TestResult {
        let mut file = NamedTempFile::new()?;
        writeln!(
            file,
            "{}",
            json!({
                "type": "assistant",
                "message": {
                    "usage": {"input_tokens": 10},
                    "stop_reason": "tool_use",
                    "content": [{"type": "tool_use", "name": "git_status"}]
                }
            })
        )
        .context("failed to write tool transcript")?;

        let input = build_input(|input| {
            input.transcript_path = Some(file.path().to_string_lossy().to_string());
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
        };

        let component = StatusComponent::new(StatusComponentConfig::default());
        let output = component.render(&ctx).await;

        assert!(output.visible);
        assert_eq!(output.text, "Tool (git_status)");
        Ok(())
    }

    #[tokio::test]
    async fn test_status_from_transcript_error_details() -> TestResult {
        let mut file = NamedTempFile::new()?;
        writeln!(
            file,
            "{}",
            json!({
                "type": "assistant",
                "message": {
                    "usage": {"input_tokens": 42},
                    "stop_reason": "end_turn",
                    "content": [{"type": "text", "text": "API Error: 403 user quota is not enough"}]
                },
                "toolUseResult": {
                    "error": "API Error: 403 user quota is not enough"
                }
            })
        )
        .context("failed to write error transcript")?;

        let input = build_input(|input| {
            input.transcript_path = Some(file.path().to_string_lossy().to_string());
        });

        let ctx = RenderContext {
            input: Arc::new(input),
            config: Arc::new(Config::default()),
            terminal: TerminalCapabilities::default(),
        };

        let component = StatusComponent::new(StatusComponentConfig::default());
        let output = component.render(&ctx).await;

        assert!(output.visible);
        assert_eq!(
            output.text,
            "Error (API Error: 403 user quota is not enough)"
        );
        assert_eq!(output.icon_color, Some("red".to_string()));
        Ok(())
    }
}
