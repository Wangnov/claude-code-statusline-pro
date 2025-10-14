# 问题对比总览

## Claude Code 报告的问题

1. **001 调试日志泄露敏感信息**（`src/storage/manager.ts`）——大量 `console.error` 输出敏感路径、会话 ID 与成本数据。
2. **002 Git Service 性能灾难**（`src/git/service.ts`）——盲目 `Promise.allSettled` 等待所有任务，缺乏失败快返与大仓库优化。
3. **003 StatuslineGenerator 上帝类**（`src/core/generator.ts`）——单文件职责过多、体量庞大，违背单一职责原则。
4. **004 Branch 组件重复逻辑**（`src/components/branch.ts`）——大量复制粘贴的 Git 状态处理代码。
5. **005 静默错误处理**（多文件）——存在空 `catch` 块，吞掉异常。
6. **006 过度的工厂模式**（组件工厂）——七个组件分别拥有重复的工厂实现。
7. **007 类型安全问题**（多文件）——滥用 `as any`/`as unknown`，破坏 TypeScript 保障。
8. **008 Widget 系统复杂度过高**（`src/core/multi-line-renderer.ts` 等）——抽象层过多导致维护困难。
9. **009 ProjectResolver 单例反模式**（`src/utils/project-resolver.ts`）——单例设计增加耦合与测试难度。
10. **010 路径遍历安全风险**（`src/config/loader.ts`, `src/git/secure-executor.ts`）——路径验证不充分，易被绕过。

## Codex 新发现的问题

1. **存储配置未真正生效**（`src/storage/index.ts`）——`Object.assign` 修补的是 `getConfig()` 返回的拷贝，用户配置被全部忽略。
2. **成本字段无法覆盖为 0**（`src/storage/manager.ts`）——使用 `||` 合并数值，导致官方返回 0 时旧值被保留，数据失真。
3. **Usage 组件图标映射缺失**（`src/components/usage.ts` & `src/terminal/colors.ts`）——图标键名不一致，Usage 永远无图标。
4. **多行网格粗暴截断 ANSI**（`src/core/grid-system.ts`）——直接 `substring` 彩色字符串，引发终端污染与花屏。
5. **Widget `enabled` 配置无效**（`src/core/multi-line-renderer.ts`）——遍历时忽略开关，禁用项仍被渲染和执行。
6. **存储初始化被热循环反复执行**（`src/core/generator.ts`）——每帧都会执行 `initializeStorage` 与 `cleanupOldSessions`，带来巨大 IO 压力。

## 关注点差异

- **Claude Code** 更侧重架构与代码风格：类职责、模式滥用、日志安全、类型系统等宏观问题。
- **Codex** 重点在实际行为与性能：配置未应用、数据错误、热路径 IO、UI 图标缺失、ANSI 截断等直接影响功能与体验的问题。

两份问题集互补：Claude Code 指出了结构性的维护风险，Codex 识别了当前实现中尚未被修复的致命运行缺陷，为后续修复优先级提供参考。
