# Claude Code Statusline Pro - 开发指引

## 开发流程

在完成任何开发任务并提交修改之前，执行完整 CI 检查：

```bash
make ci
```

这将按顺序执行以下步骤：

1. `make fix` - 自动应用编译器建议
2. `make fmt` - 格式化代码
3. `make clippy-fix` - Clippy 自动修复
4. `make clippy` - Clippy 严格检查
5. `make check` - 编译检查
6. `make test` - 运行测试
7. `make build` - Release 构建

若某一步失败，应先修复问题并重新执行 `make ci`，直至全部通过。

## 常用命令

| 命令 | 说明 |
|------|------|
| `make ci` | 完整 CI 流程（推荐提交前执行） |
| `make quick` | 快速检查（跳过自动修复） |
| `make test` | 仅运行测试 |

> `make bump` 已废弃，版本号由 `cargo release` 管理，见下文。

## 发布流程

本项目采用 `cargo-release` + `cargo-dist` 两阶段发布流程。**crates.io 由 maintainer 本地推送，CI 只负责二进制构建与分发。**

### 前置条件

- 本地已登录 crates.io（`cargo login`），且当前账号对 `claude-code-statusline-pro` 有发布权限
- 仓库已配置 `HOMEBREW_TAP_TOKEN` secret（推 Homebrew formula 到 `Wangnov/homebrew-tap`）

### 阶段 1：准备候选版本

```bash
# 1. 保证主分支干净
make ci
git checkout main && git pull --ff-only

# 2. 生成版本号 bump 的 release commit（不 publish、不打 tag、不 push）
cargo release <patch|minor|major> --execute --no-publish --no-tag --no-push --no-confirm

# 3. 推送 release commit 到 main
git push origin main

# 4. 在 GitHub Actions 手动触发 "Release candidate" workflow
#    使用 release commit 对应的 ref（默认 main 即可）
#    该 workflow 会用 cargo-dist 构建 6 个平台的 archive 并跑 smoke test
```

### 阶段 2：执行正式发布（候选全绿后）

```bash
# 5. 依次推 crates.io → 打 tag → 推 tag
cargo release publish --execute --no-confirm
cargo release tag --execute --no-confirm
cargo release push --execute --no-confirm
```

tag 推送后 CI 自动接管：

1. `release.yml`（cargo-dist 生成）→ 6 平台构建 + GitHub Release + Homebrew formula
2. GitHub Release published 事件触发 `build.yml` → 下载 Release 资产 → 组装 npm 包 → 发布（trusted publishing）

### 发布后验证

```bash
gh release view v<X.Y.Z>                          # GitHub Release 资产齐全？
cargo search claude-code-statusline-pro --limit 1 # crates.io 版本正确？
npm view ccsp version                             # npm 根包版本正确？
npm view @wangnov/ccsp-linux-x64 version          # 平台包抽检
```

### 失败状态清理

若候选全绿、crates.io 推送成功，但 tag 触发的 `release.yml` 失败：

```bash
# 删 tag（本地 + 远端），修完 release.yml 的问题后重新打 tag
git tag -d v<X.Y.Z>
git push origin :v<X.Y.Z>
# 修复 → 在同一 release commit 上
cargo release tag --execute --no-confirm
cargo release push --execute --no-confirm
# crates.io 保持原样；cargo release publish 会识别已发布状态并跳过
```

若需要**作废某个已推送的 crates.io 版本**（通常只在代码 bug 时）：`cargo yank --version <X.Y.Z>`，然后发布下一个 patch 版本。

## 项目结构

- `src/` - Rust 源码
- `npm/` - npm 包配置
- `tests/` - 集成测试
- `.github/workflows/` - CI 配置
