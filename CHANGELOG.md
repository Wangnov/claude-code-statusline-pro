# CHANGELOG | 更新日志

所有重要变更都将记录在此文件中。该项目遵循[语义化版本](https://semver.org/lang/zh-CN/)规范。

All notable changes to this project will be documented in this file. The project adheres to [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2025-08-15

### 🎉 正式版发布 | Official Release

#### ✨ 新增功能 | New Features

##### 🔍 智能终端能力检测 | Smart Terminal Capability Detection
- **VS Code/Cursor settings.json字体检测** | VS Code/Cursor settings.json font detection
  - 自动读取编辑器配置文件 | Automatically read editor configuration files
  - 支持terminal.integrated.fontFamily | Support terminal.integrated.fontFamily
  - 自动回退到editor.fontFamily | Automatic fallback to editor.fontFamily
  - 支持Windows/macOS/Linux全平台 | Support Windows/macOS/Linux platforms
- **增强的Nerd Font检测** | Enhanced Nerd Font detection
  - 50+种Nerd Font字体模式识别 | 50+ Nerd Font pattern recognition
  - 支持VS Code Portable版本 | Support VS Code Portable version
  - 支持工作区和全局配置 | Support workspace and global configuration
- **智能三级图标回退机制** | Smart three-level icon fallback mechanism
  - Nerd Font图标（最佳体验）| Nerd Font icons (best experience)
  - Emoji图标（良好兼容性）| Emoji icons (good compatibility)
  - 文本图标（最大兼容性）| Text icons (maximum compatibility)

##### 🔧 终端检测修复 | Terminal Detection Fixes
- **修复macOS下emoji回退机制** | Fixed emoji fallback on macOS
- **修复参数传递错误** | Fixed parameter passing errors
- **优化VS Code/Cursor终端检测** | Optimized VS Code/Cursor terminal detection

### 📝 配置改进 | Configuration Improvements
- **自动配置检测优化** | Automatic configuration detection optimization
- **更智能的默认值处理** | Smarter default value handling
- **配置文件注释支持** | Configuration file comment support

### 🐛 问题修复 | Bug Fixes
- **修复detect()函数参数顺序问题** | Fixed detect() function parameter order issue
- **修复配置参数映射错误** | Fixed configuration parameter mapping errors
- **修复Windows路径处理问题** | Fixed Windows path handling issues

### 📚 文档更新 | Documentation Updates
- **更新终端适配文档** | Updated terminal adaptation documentation
- **添加VS Code/Cursor配置说明** | Added VS Code/Cursor configuration instructions
- **完善开发指南** | Improved development guide

---

## [2.0.0-beta.1] - 2025-08-15

### 🚀 重大更新 | Major Updates

#### 🛠️ 交互式配置编辑器 | Interactive Configuration Editor
- **新增完整的可视化配置界面** | Added complete visual configuration interface
- **实时预览功能** | Real-time preview functionality 
- **分类配置管理** | Categorized configuration management
- **中英双语界面支持** | Bilingual Chinese/English interface support

#### 🏗️ CLI模块重构 | CLI Module Refactoring
- **模块化编辑器系统** | Modular editor system
  - `src/cli/editors/` - 专用组件编辑器 | Dedicated component editors
  - `src/cli/utils/` - CLI工具集 | CLI utilities
- **新增核心模块** | New core modules
  - `config-category-ui.ts` - 配置分类界面 | Configuration category UI
  - `component-config-mapper.ts` - 组件配置映射器 | Component configuration mapper
  - `preset-manager.ts` - 预设管理器 | Preset manager
- **国际化支持** | Internationalization support
  - `i18n.ts` - 中英双语消息系统 | Bilingual messaging system

#### 📈 使用量组件 | Usage Component
- **新增usage组件** | Added usage component
- **显示Claude使用统计** | Display Claude usage statistics
- **支持图标和文本模式** | Support for icon and text modes
- **集成到预设系统** | Integrated into preset system (PMBTUS)

### 🔧 CLI增强 | CLI Enhancements

#### 📂 专用编辑器 | Dedicated Editors
- **tokens-editor.ts** - Token组件专用配置界面 | Tokens component configuration
- **branch-editor.ts** - Git分支组件配置 | Git branch component configuration  
- **model-editor.ts** - 模型组件配置 | Model component configuration
- **status-editor.ts** - 状态组件配置 | Status component configuration
- **usage-editor.ts** - 使用量组件配置 | Usage component configuration
- **preset-editor.ts** - 预设创建和管理 | Preset creation and management
- **theme-editor.ts** - 主题配置 | Theme configuration
- **style-editor.ts** - 样式配置 | Style configuration

#### 🔄 预览和验证系统 | Preview and Validation System
- **preview-manager.ts** - 实时预览管理 | Real-time preview management
- **suggestion-manager.ts** - 配置建议系统 | Configuration suggestion system
- **validation-manager.ts** - 配置验证管理 | Configuration validation management

### ⚙️ 技术改进 | Technical Improvements

#### 🏗️ Git集成模块 | Git Integration Module
- **新增`src/git/`目录** | Added `src/git/` directory
- **git/service.ts** - Git服务封装 | Git service wrapper
- **git/cache.ts** - Git命令缓存 | Git command caching
- **git/types.ts** - Git类型定义 | Git type definitions

#### 🧪 测试系统重构 | Test System Refactoring
- **新增`tests/`目录结构** | Added `tests/` directory structure
- **单元测试** | Unit tests
  - `tests/unit/config/` - 配置系统测试 | Configuration system tests
  - `tests/unit/git/` - Git模块测试 | Git module tests
- **测试工具** | Test utilities
  - `git-mocks.ts` - Git模拟工具 | Git mocking utilities
  - `git-scenarios.ts` - Git测试场景 | Git test scenarios
  - `repo-fixtures.ts` - 仓库测试夹具 | Repository test fixtures
  - `test-helpers.ts` - 测试辅助函数 | Test helper functions

#### 📦 依赖和构建优化 | Dependencies and Build Optimization
- **升级依赖包版本** | Updated dependency versions
  - `@inquirer/*` 系列 - 最新交互式CLI组件 | Latest interactive CLI components
  - `commander@14.0.0` - 命令行参数解析 | Command line argument parsing
  - `zod@4.0.17` - 运行时类型验证 | Runtime type validation
- **Biome代码质量工具** | Biome code quality tools
  - `@biomejs/biome@2.1.4` - 代码格式化和质量检查 | Code formatting and quality checking
- **现代化构建系统** | Modern build system
  - `tsup@8.5.0` - 快速TypeScript构建 | Fast TypeScript building
  - `vitest@3.2.4` - 现代测试框架 | Modern testing framework

### 🐛 修复 | Bug Fixes

#### 📊 组件渲染优化 | Component Rendering Optimization
- **修复多组件场景下的显示问题** | Fixed display issues in multi-component scenarios
- **优化组件顺序和间距** | Optimized component order and spacing
- **改进分隔符处理逻辑** | Improved separator handling logic

#### ⚡ 性能优化 | Performance Optimization
- **配置加载性能提升** | Improved configuration loading performance
- **缓存机制优化** | Optimized caching mechanisms
- **减少文件I/O操作** | Reduced file I/O operations

#### 🔧 错误处理增强 | Enhanced Error Handling
- **更友好的错误提示** | More user-friendly error messages
- **异常情况的优雅降级** | Graceful degradation for exceptions
- **配置验证和修复** | Configuration validation and repair

### 💔 破坏性变更 | Breaking Changes

#### 📦 配置格式更新 | Configuration Format Updates
- **预设系统扩展** | Preset system expansion
  - `PMBTS` → `PMBTUS` (新增U=usage组件 | Added U=usage component)
- **组件配置结构调整** | Component configuration structure adjustments
  - 新增`components.usage`配置块 | Added `components.usage` configuration block
  - 更新`preset_mapping`包含usage | Updated `preset_mapping` to include usage

#### 🏗️ 模块重构 | Module Refactoring
- **CLI模块大规模重构** | Major CLI module refactoring
- **某些内部API可能发生变化** | Some internal APIs may have changed
- **建议重新生成配置文件** | Recommend regenerating configuration files

### 🔄 迁移指南 | Migration Guide

#### 从v1.x升级到v2.0 | Upgrading from v1.x to v2.0

1. **更新配置文件** | Update configuration file
   ```bash
   # 备份现有配置 | Backup existing configuration
   cp config.toml config.toml.backup
   
   # 使用新的配置编辑器重新生成 | Regenerate using new configuration editor
   npm run config
   ```

2. **预设更新** | Preset updates
   ```bash
   # 旧的预设 | Old preset
   npx claude-code-statusline-pro PMBTS
   
   # 新的预设（包含usage组件）| New preset (includes usage component)
   npx claude-code-statusline-pro PMBTUS
   ```

3. **CLI命令更新** | CLI command updates
   ```bash
   # 新的交互式配置编辑器 | New interactive configuration editor
   npm run config
   
   # 或直接使用 | Or use directly
   npx claude-code-statusline-pro config
   ```

---

## [1.1.1] - 2025-08-11

### 新功能 | Added
- 🔍 **Debug模式** | Debug mode: 添加`advanced.debug_mode`配置，可显示接收到的JSON数据
- 🧠 **智能状态判断** | Smart status detection: 基于output_tokens数量智能区分Thinking和Ready状态
- 🎨 **彩色JSON显示** | Colored JSON display: Debug模式下JSON数据语法高亮显示

### 改进 | Changed
- 🚀 **状态精度** | Status precision: 修复`stop_reason: null`的状态判断逻辑
- 📊 **新会话显示** | New session display: 无transcript文件时正确显示0%进度条
- 💡 **帮助完善** | Help improvements: 更新`--help`信息包含debug功能说明

### 修复 | Fixed
- ⚡ **性能优化** | Performance optimization: 简化状态判断逻辑，提升响应速度
- 🔧 **错误处理** | Error handling: 增强transcript文件解析的容错性

---

## [1.1.0] - 2025-08-10

### 新功能 | Added
- 🎯 **预设系统** | Preset system: 支持字母组合快速配置 (PMBTS, MT, BT等)
- 📊 **可视化进度条** | Visual progress bar: 双区域Token使用情况显示
- 🔧 **TOML配置支持** | TOML configuration support: 完整的配置文件系统

### 改进 | Changed
- 🌈 **跨平台兼容性** | Cross-platform compatibility: 智能终端检测和适配
- ⚡ **性能优化** | Performance optimization: 缓存机制和更新限制

---

## [1.0.0] - 2025-08-08

### 新功能 | Added
- 🚀 **初始版本发布** | Initial release
- 📁 **项目名称显示** | Project name display
- 🤖 **模型信息显示** | Model information display  
- 🌿 **Git分支显示** | Git branch display
- 📊 **Token使用情况** | Token usage display
- ✅ **状态指示器** | Status indicator

---

## 版本格式说明 | Version Format

- **主版本号** | Major: 不兼容的API修改 | Incompatible API changes
- **次版本号** | Minor: 向下兼容的功能性新增 | Backwards compatible feature additions  
- **修订号** | Patch: 向下兼容的问题修正 | Backwards compatible bug fixes
- **预发布标识** | Pre-release: beta, alpha等测试版本 | Beta, alpha and other test versions

## 贡献指南 | Contributing

如需贡献代码或报告问题，请参考[贡献指南](./CONTRIBUTING.md)。

For code contributions or issue reporting, please refer to the [Contributing Guide](./CONTRIBUTING.md).