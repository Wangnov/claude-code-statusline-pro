# Git 与存储计划

> 以兼容性为核心，逐步替换 TypeScript 中的 Git CLI 与文件存储封装。

## 现状回顾

- TypeScript 使用 Node `child_process` 调用 `git`，并通过 `.claude/projects/<projectId>/statusline-pro` 目录管理 JSON 缓存。
- 交互场景包括：获取当前分支、ahead/behind、工作区状态、读取历史成本等。
- 所有操作均为同步串行，无异步执行框架。

## 阶段性目标

| 阶段 | 目标 | 说明 |
|------|------|------|
| A | Rust 复刻 CLI 行为 | 使用 `std::process::Command` 调用 `git`，保证输出解析与 TS 等价；文件 IO 使用同步 `std::fs`。 |
| B | 引入 `git2` 优化读取 | 将高频查询（分支、状态、ahead/behind）迁移至 libgit2，保留 CLI 回退路径；确保开启默认 TLS/SSH 特性。 |
| C | 评估进一步优化（可选） | 在性能与稳定性验证后，再考虑 `gitoxide` 或并行操作。 |

## API 设计

```rust
pub struct GitService {
    backend: GitBackend,
}

enum GitBackend {
    Cli,        // 阶段 A 默认
    LibGit2,    // 阶段 B 起按功能逐渐启用
}
```

- `GitService::current_branch(path)` 等接口返回 `Option<String>`，与 TypeScript 一致。
- CLI 解析失败时返回 `GitError::CommandFailed`，并在 `--debug` 模式下输出 stderr。
- 阶段 B 启用 `libgit2` 时，优先实现只读操作（branch/status），写操作仍交由 CLI。

## 存储管理

- 目录结构：`~/.claude/projects/{project_id}/statusline-pro/`
- Rust 初期沿用 JSON 文件读写，使用 `serde_json`。
- Minimal 接口：`save_session_cost`, `load_session_cost`, `list_recent_sessions`。
- 加锁策略：由于操作频率低，可先使用 `std::fs` 原子写（写入临时文件再 rename）。

### JSON 结构

```rust
#[derive(Serialize, Deserialize)]
pub struct SessionCost {
    pub session_id: String,
    pub project_path: String,
    #[serde(default)]
    pub total_cost_usd: f64,
    #[serde(default)]
    pub total_lines_added: u32,
    #[serde(default)]
    pub total_lines_removed: u32,
    // ... 保留其余统计字段
}
```

## 错误处理

- 统一使用 `thiserror` 派生 `GitError` / `StorageError`。
- 对于可恢复错误（仓库未初始化、文件缺失），提供 `Option` 或默认值回退。
- 在 CLI `--debug` 模式下，输出详细命令与路径，方便排查。

## 同步执行与依赖

- 初始阶段不引入 Tokio 或 async 运行时，所有操作基于同步 API。
- 若未来引入并发，需要结合真实性能数据重新设计（例如改用线程池处理 Git 读取）。

## 测试建议

- Git：使用临时目录初始化仓库，验证 CLI 与 libgit2 实现返回一致。
- 存储：通过 `tempfile` 模拟 `.claude` 目录，覆盖读写、损坏文件、并发写等场景。

## 后续探索（可选）

- 引入仓库状态缓存（例如更新频率 <300ms 时命中缓存）。
- 为 `git` 命令提供 `--timeout` 与 `kill` 机制，避免长时间阻塞。
- 结合 `git2` 的远程能力，实现更细粒度的错误与认证提示。
