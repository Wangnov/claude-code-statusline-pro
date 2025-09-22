# 原 TypeScript 版本遗留问题

> 记录在 Rust 重写过程中需要重点修复的旧实现缺陷，供后续 AI 助手参考。

## 问题清单

### 1. 存储配置更新逻辑失效
- 位置：`src/storage/index.ts:31`、`src/storage/manager.ts:354-355`
- 现象：`initializeStorage` 试图通过 `Object.assign(storageManager.getConfig(), storageConfig)` 更新配置，但 `getConfig()` 返回的是拷贝，内部状态不会被修改。
- 风险：用户在配置文件里修改存储行为（路径、持久化开关等）后，长驻的 `storageManager` 不会应用最新设置，造成数据错放或持久化开关失效。
- 重写建议：在 Rust 端直接对持有的配置结构体进行可变借用更新，或让 `get_config` 返回 `&mut`，杜绝对临时拷贝写入。

### 2. 每次渲染重复加载配置并执行昂贵清理
- 位置：`src/core/generator.ts:76-86`、`src/storage/index.ts:17-35`
- 现象：状态栏每次 `generate()` 都会调用 `initializeStorage`，进而重新解析 TOML 配置并执行 `cleanupOldSessions()` 的磁盘遍历。
- 风险：在 IDE 高频刷新场景下反复触发文件系统 I/O，既拖慢状态栏刷新，也加剧 `.claude/projects` 目录的写入竞争。
- 重写建议：在 Rust 侧将存储初始化封装成一次性步骤，后续渲染只走轻量级读写；清理任务放到定时器或独立命令里。

### 3. 存储子系统残留调试日志污染输出
- 位置：`src/storage/manager.ts:89-202`
- 现象：大量 `console.error("DEBUG: ...")` 永远写向 stderr，即便在正常运行时也会出现。
- 风险：命令行用户、测试脚本和 IDE 解析 stderr 时都会视作错误信息，影响可用性。
- 重写建议：Rust 版本仅在显式 `--debug` 或日志等级允许时输出诊断信息，默认静默。

### 4. Transcript 文件被多处重复读取解析
- 位置：`src/components/tokens.ts:130-190`、`src/components/status.ts:102-170`
- 现象：Tokens 与 Status 组件各自完整读取 transcript 文件并逐行 `JSON.parse`。
- 风险：长会话文件会被同一帧连续解析两遍，CPU 与 I/O 开销翻倍，而且解析逻辑分散难以维护。
- 重写建议：Rust 实现应集中解析 transcript，缓存结构化结果后供多组件共享，避免重复读取。

### 5. `updateThrottling` 选项名存实亡
- 位置：`src/core/generator.ts:22`、`src/core/generator.ts:50-53`、`src/core/generator.ts:390-403`
- 现象：构造参数 `updateThrottling=false` 理应关闭 300ms 节流，但代码只是保持默认间隔，实际行为必须靠 `disableCache`。
- 风险：CLI 入口或测试脚本若尝试禁用节流，会得到与预期不符的缓存结果，调试极不方便。
- 重写建议：在 Rust 中明确定义更新策略：传入 `update_throttling=false` 时直接跳过时间阈值检查。

### 6. 多行组件配置每次渲染都做磁盘扫描
- 位置：`src/core/multi-line-renderer.ts:70-113`、`src/config/component-config-loader.ts:38-126`
- 现象：多行渲染器每次执行都会重新遍历组件配置目录、读取 TOML 并经由 zod 校验。
- 风险：即便配置未变，热路径也持续触发文件系统 I/O 与 JSON Schema 校验，拖慢刷新。
- 重写建议：Rust 侧在初始化阶段加载并缓存组件配置，配合文件监控或显式刷新命令更新缓存。

---

后续在 Rust 重写时，应优先解决以上高优问题，再考虑功能新增或性能微调。
