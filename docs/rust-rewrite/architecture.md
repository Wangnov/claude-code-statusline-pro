# 架构说明

> 基于现有 TypeScript 实现抽象出的 Rust 版本架构，遵循“先兼容、后优化”原则。

## 顶层流程

```
stdin JSON ──▶ CLI(main.rs) ──▶ 输入解析(core::input)
                  │
                  ├─▶ 配置加载(config::loader)
                  │       └─▶ 默认配置 + 用户覆盖 + 项目覆盖
                  │
                  ├─▶ 终端能力检测(terminal)
                  │       └─▶ Nerd Font / Emoji / Text 降级策略
                  │
                  ├─▶ 状态栏生成器(core::generator)
                  │       ├─▶ 组件 orchestrator
                  │       ├─▶ Git / 存储（按需）
                  │       └─▶ 主题渲染(themes)
                  │
                  └─▶ stdout 输出
```

- **CLI**：使用 `clap` 保持与 TypeScript `src/cli/main.ts` 完全一致的参数与子命令。
- **输入解析**：`serde_json` + `serde` 类型映射，对缺失字段提供默认值。
- **配置加载**：模仿 `ConfigLoader` 搜索顺序：1) CLI 指定；2) 项目目录；3) 用户目录；4) 默认模板。
- **终端能力**：以 TypeScript 的 `terminal/detector.ts` 为准，实现自动检测 + 手动覆盖。
- **生成器**：协调组件顺序、节流策略（300ms 缓冲）、主题渲染与缓存。

## CLI 层

- `claude-code-statusline-pro [preset]`
- 选项：`--preset/-p` `--theme/-t` `--no-colors` `--no-emoji` `--no-icons` `--force-emoji` `--force-nerd-font` `--force-text` `--config/-c` `--debug/-d` `--mock/-m`
- 子命令：`config --init/--reset`、`theme`

Rust 版本需保持选项名称、默认值、互斥/组合逻辑与 TypeScript 实现一致。

## 数据流与模块

| 模块              | Rust 路径               | 职责概述                                                                 |
|-------------------|------------------------|--------------------------------------------------------------------------|
| 输入模型          | `core::input`          | 解析 STDIN JSON，兼容驼峰/蛇形字段，保留 `passthrough` 信息             |
| 配置加载          | `config::loader`       | 读取 TOML，合并默认值、用户配置、项目配置，解析多行组件与主题参数       |
| 组件系统          | `components::*`        | 与 TypeScript 组件等价的 `render(ctx)` 实现，逐个拼接状态栏片段         |
| Git 子系统        | `git::service`         | 初期复用 Shell/CLI 调用；逐步迁移到 `git2`，优先实现查询分支/状态       |
| 存储子系统        | `storage::manager`     | 按需读写 `.claude/projects` 下的 JSON，暂采用同步 IO，对标 TS 逻辑      |
| 终端渲染          | `terminal::*`          | 基于 `crossterm` 的颜色/图标降级、Raw/Alternate 模式处理                 |
| 主题系统          | `themes::*`            | Classic/Powerline/Capsule 等主题渲染器，遵循统一输入数据结构             |

## 缓存与节流

- TypeScript 通过 `lastUpdate` + 缓存字符串避免 300ms 内重复渲染。
- Rust 实现沿用相同策略：`StatuslineGenerator` 维护 `last_result` 与 `Instant`。
- 组件级缓存（如 Git 状态）可以在功能稳定后再引入，以测试结果为准。

## Git / 存储演进

| 阶段 | 目标                                         | 说明                                                         |
|------|----------------------------------------------|--------------------------------------------------------------|
| A    | 兼容现有 CLI 调用                            | 复用 `git` 命令 + 文件系统，确保输出一致                     |
| B    | 引入 `git2` 查询接口                         | 替换分支/状态等高频读取，保留 CLI 回退路径                  |
| C    | 评估 `gitoxide` 或更深层优化（可选）         | 待功能与性能验证后再考虑，谨慎引入                           |

## 错误处理与日志

- 统一使用 `anyhow::Result`，组件内通过 `thiserror` 定义结构化错误。
- CLI `--debug` 模式输出详细日志（stderr），其余情况下保持静默。
- 对于不可恢复错误（配置损坏等），遵循 TypeScript 的回退策略并给出简洁信息。

## 扩展点

- **多行与 Widget**：在基础状态栏迁移完成后实现；保留配置解析但可以先返回占位。
- **性能优化**：在具备基准数据后再调整线程/缓存/编译选项，避免过早优化。
- **国际化**：尊重现有 `i18n` 机制，后续可考虑抽离字符串表。

> 若设计有调整，务必先更新本文件，再同步修改代码，保持“文档即规范”。
