# Changelog

所有关于本项目的重要更改将被记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [3.0.0] - 2025-01-20

这是一个重大版本更新，使用 Rust 完全重写了核心引擎，性能提升 10 倍。

### 🎉 新增功能 (Added)

#### 核心架构
- **Rust 重写**: 使用 Rust 完全重写核心引擎，性能提升 10x
- **原生 Git 集成**: 使用 `git2` 库直接分析仓库，避免频繁的 Shell 调用
- **多层缓存体系**:
  - 组件级内存缓存
  - 会话持久化存储
  - 减少重复解析和 I/O 操作
- **异步运行时**: 基于 Tokio 的多线程异步调度，提升稳定性
- **增量 Transcript 解析**: 按偏移量增量读取 `.jsonl` 文件，避免全量扫描

#### 功能特性
- **三大主题系统**: Classic、Powerline、Capsule 主题
- **智能终端检测**: 自动检测 Nerd Font、Emoji、颜色支持
- **预设系统**: 通过字母组合（PMBTUS）快速配置组件
- **多行小组件系统**:
  - 网格布局支持
  - 静态和 API 数据源
  - 自动检测和过滤器
- **精准 Token 计算**: 与 Claude 官方 API 完全一致
- **智能成本追踪**: Session 和 Conversation 两种模式

#### 包管理
- **新包名**: 从 `claude-code-statusline-pro` 迁移到 `ccsp`
- **兼容包**: 保留旧包名作为兼容层，自动转发到新包
- **多平台二进制**: 支持 6 个平台（linux/macos/windows × x64/arm64）

### 🔄 变更 (Changed)

- **包名变更**: 主包名从 `claude-code-statusline-pro` 改为 `ccsp`
  - 旧命令 `npx claude-code-statusline-pro@latest` 仍可用，但会显示迁移提示
  - 建议更新为 `npx ccsp@latest`
- **配置文件格式**: 从 JSON 迁移到 TOML 格式
- **配置文件路径**:
  - 项目级: `~/.claude/projects/{project-hash}/statusline-pro/config.toml`
  - 用户级: `~/.claude/statusline-pro/config.toml`
- **更新间隔**: 优化到 300ms，符合 Claude Code 官方建议

### 🐛 修复 (Fixed)

- **测试稳定性**: 修复 `test_throttling_behavior` 不稳定的性能测试
- **大型仓库性能**: 通过原生 git2 解决大型仓库的性能问题
- **Token 计算准确性**: 确保与 Claude 官方 API 完全一致

### 🚀 性能优化 (Performance)

- **启动速度**: 通过缓存机制显著提升启动速度
- **内存使用**: 优化内存占用，减少不必要的数据复制
- **I/O 优化**: 增量读取和原子写入，减少磁盘 I/O
- **并发处理**: 多线程异步处理，提升并发性能

### 🧪 测试改进 (Tests)

- **测试覆盖率提升**: 从 5 个测试增加到 21 个测试
- **边界情况测试**:
  - 超长分支名测试
  - 零 token 和最大 token 测试
  - 特殊字符和 Unicode 测试
  - 无效模型 ID 测试
- **错误处理测试**:
  - 无效路径处理
  - 恶意 JSON 数据处理
  - 并发生成测试
  - 快速连续调用测试
- **预设测试**: 测试所有预设组合

### 📚 文档改进 (Documentation)

- **双语文档**: 完整的中英双语 README
- **CHANGELOG**: 添加版本变更日志（本文件）
- **CONTRIBUTING**: 添加贡献指南
- **AGENTS.md**: 添加 AI Agent 开发流程指引

### 🔧 开发体验 (Developer Experience)

- **CI/CD**:
  - 完整的 Rust CI 流程（格式、Clippy、测试、构建）
  - 多平台构建支持（Ubuntu、macOS、Windows）
  - MSRV (Minimum Supported Rust Version) 检查（Rust 1.75）
  - 安全审计（cargo-audit）
- **代码质量**:
  - Clippy 零警告
  - 统一的代码格式
  - 完善的错误处理

### ⚙️ 配置变更 (Configuration)

如果你从旧版本升级，需要注意以下配置变更：

1. **更新 settings.json**:
   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "npx ccsp@latest"
     }
   }
   ```

2. **初始化新配置**:
   ```bash
   npx ccsp@latest config init -w
   ```

3. **迁移旧配置**:
   旧的 JSON 配置需要手动转换为 TOML 格式。参考 `configs/config.template.toml`。

### 🔗 链接

- [GitHub 仓库](https://github.com/wangnov/claude-code-statusline-pro)
- [NPM 包 (ccsp)](https://www.npmjs.com/package/ccsp)
- [NPM 包 (旧名)](https://www.npmjs.com/package/claude-code-statusline-pro)
- [问题反馈](https://github.com/wangnov/claude-code-statusline-pro/issues)

---

## [2.x.x] - 历史版本

之前的版本基于 Node.js 实现，详细变更请参考 Git 提交历史。

主要特性：
- 基础状态栏功能
- Token 显示
- Git 分支显示
- 模型信息显示

---

## 版本说明

### 语义化版本规则

- **主版本号 (Major)**: 不兼容的 API 修改
- **次版本号 (Minor)**: 向下兼容的功能性新增
- **修订号 (Patch)**: 向下兼容的问题修正

### 发布节奏

- 主版本更新：根据重大架构变更
- 次版本更新：每月或当累积足够新功能时
- 修订版更新：根据需要随时发布

### 如何贡献

如果你发现任何问题或有新功能建议，请：
1. 查看 [CONTRIBUTING.md](./CONTRIBUTING.md)
2. 提交 [Issue](https://github.com/wangnov/claude-code-statusline-pro/issues)
3. 提交 [Pull Request](https://github.com/wangnov/claude-code-statusline-pro/pulls)
