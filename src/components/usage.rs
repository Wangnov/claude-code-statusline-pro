//! Usage组件 | Usage component
//!
//! 显示Session的成本和代码行数统计 | Display session cost and code line statistics
//!
//! Following Dennis Ritchie's philosophy of building tools that work together,
//! this component integrates seamlessly with the storage system.

use async_trait::async_trait;
use serde_json;

use crate::components::base::{Component, ComponentFactory, ComponentOutput, RenderContext};
use crate::config::{BaseComponentConfig, Config, UsageComponentConfig};
use crate::storage;

/// Official Session data interface from Claude Code stdin JSON format
#[derive(Debug, Clone, serde::Deserialize)]
pub struct OfficialSessionData {
    pub session_id: Option<String>,
    pub transcript_path: Option<String>,
    pub cwd: Option<String>,
    pub model: Option<OfficialModelData>,
    pub workspace: Option<OfficialWorkspaceData>,
    pub version: Option<String>,
    pub output_style: Option<OfficialOutputStyleData>,
    pub cost: Option<OfficialCostData>,
    pub exceeds_200k_tokens: Option<bool>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct OfficialModelData {
    pub id: String,
    pub display_name: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct OfficialWorkspaceData {
    pub current_dir: String,
    pub project_dir: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct OfficialOutputStyleData {
    pub name: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct OfficialCostData {
    pub total_cost_usd: f64,
    pub total_duration_ms: Option<u64>,
    pub total_api_duration_ms: Option<u64>,
    pub total_lines_added: u64,
    pub total_lines_removed: u64,
}

/// Usage组件 - 显示Session成本统计
pub struct UsageComponent {
    name: String,
    config: UsageComponentConfig,
}

impl UsageComponent {
    /// Create new usage component
    pub fn new(name: String, config: UsageComponentConfig) -> Self {
        Self { name, config }
    }

    /// 渲染Mock数据 | Render mock data
    fn render_mock_usage_data(
        &self,
        mock_usage_data: &serde_json::Value,
        ctx: &RenderContext,
    ) -> ComponentOutput {
        // Default mock usage data
        let default_usage = serde_json::json!({
            "session_id": "mock-session",
            "transcript_path": "/mock/path",
            "cwd": "/mock/cwd",
            "model": {
                "id": "claude-sonnet-4-20250514",
                "display_name": "Sonnet 4"
            },
            "workspace": {
                "current_dir": "/mock/cwd",
                "project_dir": "/mock/cwd"
            },
            "version": "1.0.88",
            "output_style": {
                "name": "default"
            },
            "cost": {
                "total_cost_usd": 0.1234,
                "total_duration_ms": 120000,
                "total_api_duration_ms": 30000,
                "total_lines_added": 25,
                "total_lines_removed": 8
            },
            "exceeds_200k_tokens": false
        });

        // Merge with provided mock data
        let mut merged_data = default_usage;
        if let serde_json::Value::Object(ref mock_obj) = mock_usage_data {
            if let serde_json::Value::Object(ref mut default_obj) = merged_data {
                for (key, value) in mock_obj {
                    default_obj.insert(key.clone(), value.clone());
                }
            }
        }

        self.format_official_usage_display(&merged_data, ctx)
    }

    /// 渲染无数据状态 | Render no data state
    fn render_no_data(&self, ctx: &RenderContext) -> ComponentOutput {
        let icon = self.select_icon(ctx);
        ComponentOutput::new("$0.00")
            .with_icon_color("gray".to_string())
            .with_text_color("gray".to_string())
            .with_icon(icon.unwrap_or_default())
    }

    /// 格式化官方使用信息显示 | Format official usage info display
    fn format_official_usage_display(
        &self,
        data: &serde_json::Value,
        ctx: &RenderContext,
    ) -> ComponentOutput {
        let icon = self.select_icon(ctx);
        let display_text = self.build_official_display_text(data);
        let cost = data
            .get("cost")
            .and_then(|c| c.get("total_cost_usd"))
            .and_then(|c| c.as_f64())
            .unwrap_or(0.0);
        let color = self.get_usage_color(cost);

        ComponentOutput::new(display_text)
            .with_icon_color(color.clone())
            .with_text_color(color)
            .with_icon(icon.unwrap_or_default())
    }

    /// 构建官方数据显示文本 | Build official data display text
    fn build_official_display_text(&self, data: &serde_json::Value) -> String {
        let cost = data
            .get("cost")
            .and_then(|c| c.get("total_cost_usd"))
            .and_then(|c| c.as_f64())
            .unwrap_or(0.0);

        let lines_added = data
            .get("cost")
            .and_then(|c| c.get("total_lines_added"))
            .and_then(|c| c.as_u64())
            .unwrap_or(0);

        let lines_removed = data
            .get("cost")
            .and_then(|c| c.get("total_lines_removed"))
            .and_then(|c| c.as_u64())
            .unwrap_or(0);

        let mut text = self.format_cost(cost, self.config.precision);

        // 根据显示模式和配置添加代码行数 | Add code lines based on display mode and config
        if self.config.display_mode == "conversation"
            && (self.config.show_lines_added || self.config.show_lines_removed)
        {
            let mut line_parts = Vec::new();

            if self.config.show_lines_added && lines_added > 0 {
                line_parts.push(format!("+{}", lines_added));
            }

            if self.config.show_lines_removed && lines_removed > 0 {
                line_parts.push(format!("-{}", lines_removed));
            }

            if !line_parts.is_empty() {
                text.push_str(&format!(" {}", line_parts.join(" ")));
            }
        }

        text
    }

    /// 格式化成本显示 | Format cost display
    fn format_cost(&self, cost: f64, precision: u32) -> String {
        format!("${:.1$}", cost, precision as usize)
    }

    /// 获取使用信息的颜色 | Get usage info color based on cost amount
    fn get_usage_color(&self, cost: f64) -> String {
        if cost > 1.0 {
            "red".to_string() // 高成本 | High cost
        } else if cost > 0.1 {
            "yellow".to_string() // 中等成本 | Medium cost
        } else if cost > 0.0 {
            "green".to_string() // 低成本 | Low cost
        } else {
            "gray".to_string() // 无成本 | No cost
        }
    }

    /// 渲染对话级成本 | Render conversation-level cost (async version)
    async fn render_conversation_cost_async(
        &self,
        session_id: &str,
        ctx: &RenderContext,
    ) -> ComponentOutput {
        let icon = self.select_icon(ctx);

        // 使用新的conversation cost API
        match storage::get_conversation_cost_display(session_id).await {
            Ok(cost) => {
                if cost > 0.0 {
                    let formatted_cost = self.format_cost(cost, self.config.precision);

                    ComponentOutput::new(formatted_cost)
                        .with_icon_color("cyan".to_string())
                        .with_text_color("cyan".to_string())
                        .with_icon(icon.unwrap_or_default())
                } else {
                    ComponentOutput::new("$0.00")
                        .with_icon_color("gray".to_string())
                        .with_text_color("gray".to_string())
                        .with_icon(icon.unwrap_or_default())
                }
            }
            Err(e) => {
                eprintln!("Failed to load conversation cost: {}", e);
                ComponentOutput::new("$0.00")
                    .with_icon_color("gray".to_string())
                    .with_text_color("gray".to_string())
                    .with_icon(icon.unwrap_or_default())
            }
        }
    }
}

#[async_trait]
impl Component for UsageComponent {
    fn name(&self) -> &str {
        &self.name
    }

    fn is_enabled(&self, _ctx: &RenderContext) -> bool {
        self.config.base.enabled
    }

    fn base_config(&self, _ctx: &RenderContext) -> Option<&BaseComponentConfig> {
        Some(&self.config.base)
    }

    async fn render(&self, ctx: &RenderContext) -> ComponentOutput {
        let input_data = &ctx.input;

        // 检查是否有Mock数据 | Check for mock data
        if let Some(mock_data) = input_data.extra.get("__mock__") {
            if let Some(usage_data) = mock_data.get("usageData") {
                return self.render_mock_usage_data(usage_data, ctx);
            }
        }

        let serialized_input = match serde_json::to_value(&**input_data) {
            Ok(value) => Some(value),
            Err(err) => {
                eprintln!("Failed to serialize usage input: {}", err);
                None
            }
        };

        if let Some(session_id) = input_data.session_id.as_deref() {
            if self.config.display_mode == "conversation" {
                return self.render_conversation_cost_async(session_id, ctx).await;
            }
        }

        if let Some(ref value) = serialized_input {
            return self.format_official_usage_display(value, ctx);
        }

        if input_data.cost.is_some() {
            // 存在官方数据但序列化失败时的降级处理 | Graceful fallback when serialization fails
            return self.render_no_data(ctx);
        }

        self.render_no_data(ctx)
    }
}

/// Usage组件工厂 | Usage component factory
pub struct UsageComponentFactory;

impl UsageComponentFactory {
    pub fn new() -> Self {
        Self
    }
}

impl ComponentFactory for UsageComponentFactory {
    fn create(&self, config: &Config) -> Box<dyn Component> {
        Box::new(UsageComponent::new(
            "usage".to_string(),
            config.components.usage.clone(),
        ))
    }

    fn name(&self) -> &str {
        "usage"
    }
}
