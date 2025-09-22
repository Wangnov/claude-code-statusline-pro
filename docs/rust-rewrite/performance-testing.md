# 性能与验证计划

> 在保证功能等价的基础上，持续收集数据、量化优化效果。

## 1. 需要回答的问题

1. Rust 版本在典型场景下能否达到或优于 TypeScript 的启动/渲染耗时？
2. 引入优化开关（LTO、`panic = "abort"` 等）前后收益如何？
3. 缓存、Git 访问等策略是否真正改善体验？

## 2. 基准策略

### 基线采集

- **环境**：固定操作系统、CPU、Shell；记录硬件与依赖版本。
- **脚本**：对同一 STDIN 数据分别执行
  ```bash
  # TypeScript
  node dist/cli.cjs < sample.json > /tmp/ts.txt

  # Rust
  cargo run --quiet < sample.json > /tmp/rs.txt
  ```
- **指标**：启动时间（冷/热）、RSS 内存、stdout 一致性、Git 操作耗时。

### Criterion 基准（Rust）

- 在 `benches/` 中添加：
  - `cold_start`：`cargo run --release` 子进程 + 输入管道。
  - `hot_render`：复用已初始化的 `StatuslineGenerator`，测量单次 `generate` 耗时。
- 基准仅面向开发环境运行，CI 中执行 `cargo bench --no-run` 验证编译即可。

## 3. 回归验证

| 类型 | 工具 | 说明 |
|------|------|------|
| 兼容性测试 | `cargo test --features compat` | 调用 TypeScript（Node）与 Rust，逐字节比较输出 |
| 单元测试 | `cargo test` | 覆盖配置加载、组件渲染、Git/存储回退等 |
| 静态检查 | `cargo fmt`, `cargo clippy -- -D warnings` | 确保格式与 lint 通过 |
| 集成脚本 | `./rust/verify.sh` / `.bat` | 一键运行格式化、Clippy、测试与示例执行 |

## 4. 优化流程

1. **测量**：对当前实现运行基准脚本，记录数值。
2. **假设**：分析表现瓶颈（例如 Git 调用占比高、字符串拼接慢）。
3. **实验**：编写小型变更验证假设，提交基准结果。
4. **落地**：只有当收益显著且无需牺牲可调试性，才引入编译优化或并行框架。
5. **回归**：更新基准报告并记录在 `docs/performance-reports/`（待建立）。

## 5. 指标建议

- 冷启动时间（P50 / P90）
- 热渲染耗时（单次）
- 内存峰值（RSS）
- Git 查询耗时（可选）

> 在缺乏数据前，不要盲目宣称“10x”提升；所有结论都应附带采样数据与执行环境说明。
