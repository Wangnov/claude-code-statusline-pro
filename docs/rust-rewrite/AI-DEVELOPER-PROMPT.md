# AI 开发者提示词 - Rust 重写项目

## 项目背景

你将接手 **claude-code-statusline-pro** 的 Rust 重写工作。目标是在保持 TypeScript 版本行为完全一致的前提下，逐步迁移功能并为后续性能优化奠定基础。

## 开始之前

请按以下顺序阅读文档，掌握最新规范：

```
1. CLAUDE.md                                # TypeScript 参考实现
2. docs/old-issues/README.md                # 原实现的已知缺陷清单
3. docs/rust-rewrite/README.md              # 项目概览与原则
4. docs/rust-rewrite/architecture.md        # 模块职责与数据流
5. docs/rust-rewrite/data-structures.md     # STDIN / 配置序列化定义
6. docs/rust-rewrite/core-modules.md        # 组件、主题、终端子系统
7. docs/rust-rewrite/migration-plan.md      # 里程碑与交付物
8. docs/rust-rewrite/git-storage.md         # Git 与存储演进计划
9. docs/rust-rewrite/performance-testing.md # 基准与回归策略
10. rust/SETUP_COMPLETE.md                  # 当前工程脚手架说明
```

## 核心要求

- **功能等价**：Rust 必须与 TypeScript 在同一输入下产出相同的输出。
- **配置兼容**：沿用现有 TOML/JSON 结构，不引入破坏性变更。
- **渐进式优化**：在建立 TypeScript 基线之前，不启用激进优化开关。
- **文档优先**：任何设计变更先更新文档，再提交代码。

## 里程碑概览

1. **A. 兼容性基线**（约 2 周）
   - 完成输入解析、配置加载与六大核心组件。
   - 编写 TS vs Rust 对等测试，确保输出一致。
2. **B. 特性补齐**（约 2~3 周）
   - 迁移主题、多行/Widget（按需）、Git/存储、CLI 子命令。
   - 更新文档和示例，并保持测试通过。
3. **C. 性能与发布**（时间依赖实测）
   - 建立基准数据，按 Profiling 结果选择优化策略。
   - 完善 CI、发布脚本与回滚方案。

## 推荐开发流程

```bash
# 进入 Rust 项目目录
git clone …
cd rust

# 基础检查
cargo fmt
cargo clippy -- -D warnings
cargo test

# 对等测试（示例）
# 需编写脚本比较 TS 与 Rust 输出
```

## 注意事项

- 在着手编码前先对照 `docs/old-issues/README.md` 制定修复计划，确保遗留问题在 Rust 版本中得到处理。
- CLI 参数、降级策略、错误处理需与 `src/cli/main.ts` 等源文件保持一致。
- 未经验证的性能优化（如并行、缓存）不要提前实现。
- 对外行为发生变化前，必须更新 `docs/rust-rewrite` 下的对应文档。

祝编码顺利，记得随时回查 TypeScript 版本作为行为对照。
