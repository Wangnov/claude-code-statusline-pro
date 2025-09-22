# 发布与交叉部署策略

> 在 TypeScript 与 Rust 并存期间，保持用户体验稳定，并提供清晰的迁移路径。

## 阶段规划

1. **双轨维护**（里程碑 A/B）
   - TypeScript 仍为默认发行；Rust 作为实验版（`cargo run` 或 `npm` beta 标签）。
   - 每个特性在 Rust 中上线时，都需附带对等测试与文档说明。

2. **灰度切换**（里程碑 C）
   - 当兼容性与性能目标达成后，提供 `npm install claude-code-statusline-pro@next` / `cargo install` 选项邀请用户试用。
   - 收集反馈问题，维护回滚方案。

3. **正式迁移**
   - 更新 `npm` 包默认入口为 Rust 二进制下载脚本（保留 TypeScript 作为 `legacy` 标签）。
   - 发布 `crate` 到 crates.io，版本号与 npm 对齐。

## 包管理策略

### npm

- 继续使用 `npm/install.js` 下载对应平台二进制；
- TypeScript 版本保留在 `legacy-ts/`，通过 `npm install claude-code-statusline-pro@2` 获取；
- 安装脚本应自动检测平台与架构，下载发布页面二进制。

### Cargo

- `cargo install claude-code-statusline-pro` 提供本地编译路径；
- 发布流程：`cargo publish --dry-run` → 验证 → `cargo publish`。

## 回滚与容灾

- 每次发布需保留前一版本可用的 npm/cargo 包；
- 文档中提供回滚命令示例；
- Git 标签：`v{major}.{minor}.{patch}`，附带变更日志。

## 版本号策略

- TypeScript 与 Rust 共享语义化版本；
- Rust 初期可使用 `3.0.0-alpha`、`3.0.0-beta`，正式发布后进入 `3.x` 稳定系列；
- TypeScript 维护在 `2.x`，仅修复严重问题。

## 文档与示例

- README 须列明：如何选择 TypeScript / Rust 版本、如何验证安装成功；
- 提供 `docs/migration.md`（后续补充）记录差异与迁移步骤；
- 更新 `CHANGELOG` 时标注影响范围与所需操作。

## 支持渠道

- Issue 模板区分“Rust 重写”与“TypeScript 旧版”；
- 对关键问题（兼容性、性能回退）准备 FAQ；
- 发布前后通过社区公告/内部通知同步进展。
