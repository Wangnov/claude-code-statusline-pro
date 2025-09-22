# 核心模块指南

> 按组件与服务划分责任，确保与现有 TypeScript 版本对齐。

## StatuslineGenerator

```rust
pub struct StatuslineGenerator {
    config: Arc<Config>,
    components: Vec<Box<dyn Component>>,   // 按配置顺序存放
    theme: Box<dyn ThemeRenderer>,
    last_update: Instant,
    last_result: Option<String>,
}
```

- 入口方法 `generate(&mut self, input: &InputData)`：
  1. 300ms 节流（与 TS 相同）。
  2. 构建 `RenderContext`（含配置、终端能力、输入数据）。
  3. 依次调用组件的 `render` 收集输出片段。
  4. 交由 `ThemeRenderer` 组合成最终字符串。
  5. 更新缓存并返回。
- 错误处理：组件失败时记录日志、保留降级输出（与 TypeScript 行为一致）。

## Component trait

```rust
pub trait Component {
    fn name(&self) -> &str;
    fn is_enabled(&self, ctx: &RenderContext) -> bool;
    fn render(&self, ctx: &RenderContext) -> Result<ComponentOutput>;
}
```

- `ComponentOutput` 包含渲染字符串与可选的颜色/图标信息，供主题使用。
- 组件实现应对缺失数据优雅降级（例如无 Git 数据时返回空字符串）。

### 必须迁移的组件

| 组件 | TypeScript 文件 | 说明 |
|------|-----------------|------|
| `Project` | `components/project.ts` | 显示项目/仓库名称，支持 Nerd Font / Emoji / Text 图标 |
| `Model` | `components/model.ts` | 列出当前模型 ID / 别名 |
| `Branch` | `components/branch.ts` | 展示 Git 分支、ahead/behind、状态；缺失时隐藏 |
| `Tokens` | `components/tokens.ts` | 累计 token 使用情况 |
| `Usage` | `components/usage.ts` | 多行/Widget 入口，显示队列与 API 信息 |
| `Status` | `components/status.ts` | 显示 Claude 进程状态（准备、工作中等） |

迁移顺序建议：Project → Model → Branch → Tokens → Status → Usage。

## ThemeRenderer

- `Classic`：用 separator 连接组件，支持颜色与图标。
- `Powerline`：通过 Nerd Font 箭头拼接，需在终端不支持时自动降级。
- `Capsule`：圆角块样式，颜色/边框与配置匹配。

主题必须接受 `ComponentOutput` 并支持颜色禁用、宽度限制等选项。

## 终端子系统

- `terminal::detector`：检测 ANSI 颜色、Emoji、Nerd Font 支持；保留手动覆盖。
- `terminal::renderer`：统一颜色与格式输出，实现文字和图标的安全降级。

## Git / 存储

参见 `git-storage.md`。组件应通过 `GitService` / `StorageManager` 抽象访问数据，避免直接调用命令。

## 配置子系统

- `config::loader`：按优先级加载 TOML，解析多行配置、Widget、主题设置。
- `config::schema`：Serde 结构定义；更新时需同步 TypeScript 版本。

## 错误与日志

- 为每个组件定义 `thiserror` 枚举，提供上下文信息。
- 使用 `tracing` 或简单日志宏，在 `--debug` 模式输出诊断信息。

## 测试建议

- 为每个组件编写输入样例与快照测试。
- StatuslineGenerator 集成测试：构造 `RenderContext`，验证组合结果与 TypeScript 对齐。
- 主题渲染测试：针对颜色禁用、Nerd Font 缺失等场景进行快照对比。

> 若新增组件或主题，请先更新本文档，再实现代码与测试。
