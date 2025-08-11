# Claude Code Statusline Pro

[![npm version](https://badge.fury.io/js/claude-code-statusline-pro.svg)](https://badge.fury.io/js/claude-code-statusline-pro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)](https://github.com/wangnov/claude-code-statusline-pro)

Claude Code增强版可配置状态栏，支持预设系统快速配置组件排布

## ✨ 核心特性

- 🎯 **预设系统**: 通过字母组合快速配置组件 (`PMBTS`, `MT`, `BT`)
- 📊 **可视化进度条**: 85%最佳区域vs15%后备区域上下文使用情况  
- 🧠 **智能状态**: 基于tokens数量精准识别Thinking vs Ready状态
- 🔍 **Debug模式**: 彩色JSON数据显示，便于调试和排错
- 🌈 **跨平台兼容**: Windows、macOS、Linux智能适配
- ⚡ **高性能**: 缓存优化，300ms更新间隔
- 🔧 **完全可配置**: 颜色、图标、阈值、顺序

## 🚀 快速开始

### 安装

```bash
# 推荐：使用npx无需安装
npx claude-code-statusline-pro

# 或全局安装
npm install -g claude-code-statusline-pro
```

### Claude Code配置

在项目根目录或家目录创建 `.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx claude-code-statusline-pro"
  }
}
```

## 🎯 预设系统

通过简单字母组合快速配置状态栏显示内容：

- **P** = project (项目名称)  
- **M** = model (模型信息)
- **B** = branch (Git分支)
- **T** = tokens (Token使用情况)
- **S** = status (状态信息)

### 使用方法

```bash
# 默认所有组件
npx claude-code-statusline-pro PMBTS

# 仅显示模型和token
npx claude-code-statusline-pro MT

# 仅显示分支和token  
npx claude-code-statusline-pro --preset BT

# 使用-p简写
npx claude-code-statusline-pro -p MS

# 查看帮助
npx claude-code-statusline-pro --help
```

### 输出示例

**PMBTS预设（全部组件）：**
```
📁 my-project | 🤖 S4 | 🌿 main | 📊 [████████████░░░] 80.1%(160k/200k) | ✅ Ready
```

**MT预设（模型+Token）：**
```
🤖 S4 | 📊 [████████████░░░] 80.1%(160k/200k)
```

**BT预设（分支+Token）：**
```
🌿 main | 📊 80.1%(160k/200k)
```

## 🎨 配置管理

### TOML配置文件

创建 `statusline.config.toml` 进行详细配置：

```toml
# 默认预设
preset = "PMBTS"

# 组件映射
[preset_mapping]
P = "project"
M = "model" 
B = "branch"
T = "tokens"
S = "status"

# Token阈值配置
[components.tokens.thresholds]
warning = 60    # 60%显示黄色
danger = 85     # 85%显示红色
backup = 85     # 后备区域开始
critical = 95   # 95%显示🔥

# 终端兼容
[style]
enable_colors = "auto"
enable_emoji = "auto"
separator = " | "
```

### 配置管理命令

```bash
# 创建默认配置
npm run config init

# 测试当前配置
npm run config test

# 查看配置详情
npm run config show

# 验证配置语法
npm run config validate
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
- **PowerShell** ⚠️ 自动回退文本模式
- **CMD** ⚠️ 安全回退模式

## 🔧 常见问题

### 测试状态栏

```bash
# 测试命令
echo '{"model":{"id":"claude-sonnet-4"}}' | npx claude-code-statusline-pro

# 测试特定预设
echo '{"model":{"id":"claude-sonnet-4"}}' | npx claude-code-statusline-pro MT
```

### 配置文件位置

按优先级查找：
1. `./statusline.config.toml` (当前目录)
2. `~/.config/claude-statusline/config.toml`
3. 包安装目录默认配置

### Windows问题

- **表情不显示**: 推荐使用Windows Terminal
- **颜色异常**: 设置 `enable_colors = false`
- **编码问题**: 确保终端UTF-8编码

## 🆕 更新日志

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