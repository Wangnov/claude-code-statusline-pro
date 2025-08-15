# Claude Code Statusline Pro

[![npm version](https://badge.fury.io/js/claude-code-statusline-pro.svg)](https://badge.fury.io/js/claude-code-statusline-pro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)](https://github.com/wangnov/claude-code-statusline-pro)

Claude Code增强版可配置状态栏，支持预设系统快速配置组件排布

## ✨ 核心特性

- 🎯 **预设系统**: 通过字母组合快速配置组件 (`PMBTUS`, `MT`, `BT`)
- 🛠️ **交互式配置编辑器**: 全屏可视化配置界面，支持实时预览和分类管理
- 📊 **可视化进度条**: 85%最佳区域vs15%后备区域上下文使用情况  
- 🧠 **智能状态**: 基于tokens数量精准识别Thinking vs Ready状态
- 🔍 **Debug模式**: 彩色JSON数据显示，便于调试和排错
- 🌈 **跨平台兼容**: Windows、macOS、Linux智能适配
- ⚡ **高性能**: 缓存优化，300ms更新间隔
- 🔧 **完全可配置**: 颜色、图标、阈值、顺序
- 🌐 **国际化支持**: 中英双语界面和错误提示
- 📈 **使用量组件**: 新增usage组件，显示Claude使用统计

## 🚀 快速开始

### 安装

```bash
# 推荐：使用npx无需安装
npx claude-code-statusline-pro@latest
```

### Claude Code配置

在项目根目录或家目录创建 `.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx claude-code-statusline-pro@latest"
  }
}
```

## 🎯 预设系统

通过简单字母组合快速配置状态栏显示内容：

- **P** = project (项目名称)  
- **M** = model (模型信息)
- **B** = branch (Git分支)
- **T** = tokens (Token使用情况)
- **U** = usage (使用量统计)
- **S** = status (状态信息)

### 使用方法

```bash
# 默认所有组件
npx claude-code-statusline-pro@latest -preset PMBTUS
```

### 输出示例

**PMBTUS预设（全部组件）：**
```
📁 my-project | 🤖 S4 | 🌿 main | 📊 [████████████░░░] 80.1%(160k/200k) | $21.07 | ✅ Ready
```

**MTU预设（模型+Token+使用量）：**
```
🤖 S4 | 📊 [████████████░░░] 80.1%(160k/200k) | $21.07
```

**BT预设（分支+Token）：**
```
🌿 main | 📊 80.1%(160k/200k)
```

## 🎨 配置管理

### 🛠️ 交互式配置编辑器

全新的可视化配置界面，支持实时预览和分类管理：

```bash
# 启动交互式配置编辑器
npm run config

# 或直接使用
npx claude-code-statusline-pro@latest config
```

**功能特性**：
- 📱 **全屏可视化界面**: 直观的配置管理体验
- 🔄 **实时预览**: 修改配置即时查看效果
- 📂 **分类管理**: 按功能分组的配置选项
- 🌐 **双语支持**: 中英文界面自动切换
- 💾 **智能保存**: 自动验证并保存配置
- 🎛️ **专用编辑器**: 每个组件都有专门的配置界面

**配置分类**：
- **🎯 组件设置**: 启用/禁用组件，调整显示顺序
- **🎨 主题样式**: 三大主题系统和视觉效果
- **📊 Token设置**: 阈值、进度条、状态图标
- **⚙️ 终端配置**: 字体、颜色、兼容性设置
- **🚀 预设管理**: 创建和管理自定义预设

### TOML配置文件

创建 `config.toml` 进行详细配置：

```toml
# 默认预设
preset = "PMBTUS"

# 组件映射
[preset_mapping]
P = "project"
M = "model" 
B = "branch"
T = "tokens"
U = "usage"
S = "status"

# 组件顺序
[components]
order = ["project", "model", "branch", "tokens", "usage", "status"]

# Token阈值配置
[components.tokens.thresholds]
warning = 60    # 60%显示黄色
danger = 85     # 85%显示红色
backup = 85     # 后备区域开始
critical = 95   # 95%显示🔥

# 使用量组件配置
[components.usage]
enabled = true
show_icon = true
icon_emoji = "📈"
icon_nerd = ""
icon_text = "USG"

# 终端兼容
[style]
enable_colors = "auto"
enable_emoji = "auto"
separator = " | "
```

### 配置管理命令

```bash
# 启动交互式配置编辑器
npm run config

# 创建默认配置
npm run config init

# 测试当前配置
npm run config test

# 查看配置详情
npm run config show

# 验证配置语法
npm run config validate

# 重置配置到默认值
npm run config reset

# 导出当前配置
npm run config export
```

## 📊 Token可视化

进度条采用双区域设计：

- **主要区域** (0-85%): 实心块 `█`，最佳使用区域
- **后备区域** (85%-100%): 斜纹块 `▓`，后备上下文区域
- **状态指示器**: ⚡ (进入后备区域), 🔥 (临界状态)

```
[████████████▓░░] 90.5%(181k/200k)⚡
 ↑最佳区域      ↑后备 ↑剩余    ↑状态
```

## 🖥️ 终端兼容

智能检测并自动适配不同终端：

- **Windows Terminal** ✅ 完全支持
- **VS Code Terminal** ✅ 完全支持  
- **Git Bash** ✅ 完全支持
- **PowerShell** ✅ 完全支持
- **CMD** ⚠️ 安全回退模式

## 🔧 常见问题

### 测试状态栏

```bash
# 测试命令
echo '{"model":{"id":"claude-sonnet-4"}}' | npx claude-code-statusline-pro@latest

# 测试特定预设
echo '{"model":{"id":"claude-sonnet-4"}}' | npx claude-code-statusline-pro@latest MT
```

### 配置文件位置

按优先级查找：
1. 包安装目录默认配置

### Windows问题

- **表情不显示**: 推荐使用Windows Terminal
- **颜色异常**: 设置 `enable_colors = false`
- **编码问题**: 确保终端UTF-8编码

## 🆕 更新日志

### v2.0.0-beta.1 (2025-08-15)

#### 🚀 重大更新
- **🛠️ 交互式配置编辑器**: 全新的可视化配置界面，支持实时预览
- **🏗️ CLI模块重构**: 模块化编辑器系统，每个组件都有专用配置界面
- **📈 使用量组件**: 新增usage组件，显示Claude使用统计
- **🌐 国际化支持**: 完整的中英双语界面和错误提示

#### 🔧 CLI增强
- **📂 分类配置管理**: 按功能分组的配置选项界面
- **🎛️ 专用编辑器**: tokens、branch、model等组件的专门编辑器
- **🔄 实时预览系统**: 配置修改即时查看效果
- **💾 智能验证**: 自动验证配置语法和合理性

#### ⚙️ 技术改进
- **🏗️ Git集成模块**: 新增Git服务层和缓存机制
- **🧪 测试系统重构**: 完整的单元测试和集成测试框架
- **📦 依赖更新**: 升级到最新的依赖包和构建工具
- **🔍 代码质量**: 使用Biome进行代码格式化和质量检查

#### 🐛 修复
- **📊 组件渲染**: 修复多组件场景下的显示问题
- **⚡ 性能优化**: 提升配置加载和渲染性能
- **🔧 错误处理**: 增强错误提示和异常处理机制

---

### v1.1.1 (2025-08-11)

#### 新功能
- 🔍 **Debug模式**: 添加`advanced.debug_mode`配置，可显示接收到的JSON数据
- 🧠 **智能状态判断**: 基于output_tokens数量智能区分Thinking和Ready状态
- 🎨 **彩色JSON显示**: Debug模式下JSON数据语法高亮显示

#### 改进
- 🚀 **状态精度**: 修复`stop_reason: null`的状态判断逻辑
- 📊 **新会话显示**: 无transcript文件时正确显示0%进度条
- 💡 **帮助完善**: 更新`--help`信息包含debug功能说明

#### 技术改进
- ⚡ **性能优化**: 简化状态判断逻辑，提升响应速度
- 🔧 **错误处理**: 增强transcript文件解析的容错性

## 📄 许可证

MIT许可证 - 查看LICENSE文件

---

⭐ 如果这个项目对您有帮助，请给个Star！