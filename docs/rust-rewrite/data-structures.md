# 数据模型

> 采用 `serde` 反序列化，复刻 TypeScript `src/config/schema.ts` 定义的输入与配置结构。

## 1. STDIN JSON（`InputData`）

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct InputData {
    #[serde(default)]
    pub hook_event_name: Option<String>,
    #[serde(alias = "sessionId", default)]
    pub session_id: Option<String>,
    #[serde(alias = "transcriptPath", default)]
    pub transcript_path: Option<String>,
    #[serde(default)]
    pub cwd: Option<String>,
    #[serde(default)]
    pub model: Option<ModelInfo>,
    #[serde(default)]
    pub workspace: Option<WorkspaceInfo>,
    #[serde(default)]
    pub git_branch: Option<String>,
    #[serde(default)]
    pub git: Option<GitInfo>,
    #[serde(default)]
    pub cost: Option<CostInfo>,
    #[serde(flatten)]
    pub extra: serde_json::Value,
}
```

- 使用 `#[serde(alias = ...)]` 兼容驼峰命名。
- 保留 `extra` 以便未来输入扩展（TypeScript 版本同样允许附加字段）。
- 字段多为 `Option<String>` 或 `Option<Number>`，与现行 JSON 保持一致，不做低层布局优化。

### 子结构

```rust
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ModelInfo {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(alias = "displayName", default)]
    pub display_name: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct WorkspaceInfo {
    #[serde(alias = "currentDir", default)]
    pub current_dir: Option<String>,
    #[serde(alias = "projectDir", default)]
    pub project_dir: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GitInfo {
    #[serde(default)]
    pub branch: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub ahead: Option<i32>,
    #[serde(default)]
    pub behind: Option<i32>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct CostInfo {
    #[serde(default)]
    pub total_cost_usd: Option<f64>,
    #[serde(default)]
    pub total_duration_ms: Option<i64>,
    #[serde(default)]
    pub total_api_duration_ms: Option<i64>,
    #[serde(default)]
    pub total_lines_added: Option<i32>,
    #[serde(default)]
    pub total_lines_removed: Option<i32>,
}
```

## 2. 配置文件（TOML）

配置加载按层级合并：默认 → 用户 → 项目 → CLI 覆盖。序列化结构与 TypeScript `schema.ts` 对齐，关键节点如下：

```rust
#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    #[serde(default)]
    pub preset: Option<String>,
    #[serde(default)]
    pub theme: Option<String>,
    #[serde(default)]
    pub components: HashMap<String, ComponentConfig>,
    #[serde(default)]
    pub style: Option<StyleConfig>,
    #[serde(default)]
    pub terminal: Option<TerminalOverrides>,
    #[serde(default)]
    pub multiline: Option<MultilineConfig>,
}
```

- `ComponentConfig` 保留 TypeScript 字段（启用开关、颜色、图标、模板等）。
- `StyleConfig` 支持 `separator`、`enable_colors/emoji/nerd_font`、紧凑模式等。
- `TerminalOverrides` 对应 `force_nerd_font/force_emoji/force_text`。
- `MultilineConfig` 与 Widget 定义仅在需要时解析，可先保留结构体但允许缺省。

## 3. serde 策略

- 对所有 Option 字段使用 `#[serde(default)]`，防止缺失字段导致反序列化失败。
- 保留 `serde_json::Value` 承载未知字段，便于后续调试与扩展。
- 避免使用 `#[repr(C)]`、指针包装或手动内存对齐，这些优化在 serde 场景下无意义。

## 4. 示例输入

```json
{
  "session_id": "abc-123",
  "model": { "id": "claude-3", "display_name": "Claude 3" },
  "workspace": { "current_dir": "/repo", "project_dir": "/repo" },
  "git": { "branch": "main", "ahead": 1, "behind": 0 },
  "cost": { "total_cost_usd": 0.12 }
}
```

## 5. 示例配置

```toml
preset = "PMBT"
theme = "classic"

[components.project]
enabled = true
nerd_icon = "\uf07c"
emoji_icon = "📁"
text_icon = "[P]"

[style]
separator = " | "
enable_colors = "auto"

[terminal]
force_nerd_font = false
force_emoji = false
force_text = false
```

在实现中，应优先编写单元测试验证各层级合并与字段默认值，以保证与 TypeScript 行为完全一致。
