# Claude Code Statusline Pro - Rust 重写指南

> 面向 Rust 重写参与者的入口文档，强调兼容性优先、循序渐进的落地策略。

## 文档索引

1. [架构说明](./architecture.md) — 模块职责与依赖关系
2. [核心模块指南](./core-modules.md) — 组件、主题、终端子系统
3. [数据模型](./data-structures.md) — STDIN 与配置的 serde 定义
4. [Git / 存储计划](./git-storage.md) — 逐步替换 TypeScript 封装的策略
5. [迁移路线图](./migration-plan.md) — 里程碑与交付物
6. [性能与验证](./performance-testing.md) — 基线与回归方法
7. [发布与运维](./release-strategy.md) — 交叉发布及包管理策略

## 项目目标

- **功能 100% 等价**：Rust 必须对照 TypeScript 的 STDIN → STDOUT 行为逐项对齐。
- **兼容现有配置**：沿用 `.claude` 目录与 TOML 格式，不引入破坏性变更。
- **可验证的性能优化**：在建立 TypeScript 基线后，再针对实测瓶颈做优化。
- **可维护的工程结构**：保持 CI、格式化、Clippy 等基础设施简明可调试。

## 非目标

- 不引入插件系统或新组件。
- 不在未验证收益前启用激进优化（如 `panic = "abort"`、`lto = "fat"`）。
- 不额外扩展 CLI 参数；先确保与现版本完全对齐。

## 推荐工作流

1. **理解现状**：阅读 TypeScript 代码（`src/`）与 Rust 脚手架（`rust/`）。
2. **查阅文档**：按索引顺序阅读上述 Markdown。
3. **实现与验证**：先完成数据解析、配置加载，再迁移核心组件，期间同步补充测试。
4. **性能评估**：建立基准脚本，对照 TypeScript 结果再决定优化手段。

## 参考仓库结构

```
claude-code-statusline-pro/
├── src/                 # TypeScript 版本（保留对照）
├── rust/                # Rust 实现，逐步走向主版本
├── docs/rust-rewrite/   # 本重写计划文档
└── docs/codex-review/   # Codex Review 输出与调研记录
```

有任何与现状不符或需要澄清之处，请先更新文档，再进入开发。保持文档与实现同步，是本重写计划的首要约束。
