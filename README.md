# Claude Code Statusline Pro

[![npm version](https://badge.fury.io/js/claude-code-statusline-pro.svg)](https://badge.fury.io/js/claude-code-statusline-pro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)](https://github.com/wangnov/claude-code-statusline-pro)

Claude Code 增强版可配置状态栏，支持TOML配置、主题系统和跨平台兼容  
Enhanced configurable statusline for Claude Code with TOML configuration, themes, and cross-platform support.

## ✨ 特性 Features

- 🎨 **TOML配置**: 易读的配置文件，支持注释 | **TOML Configuration**: Easy-to-read configuration with comments
- 🎭 **主题系统**: 内置主题(简洁/详细/开发者)+自定义主题 | **Theme System**: Built-in themes (minimal/verbose/developer) + custom themes  
- 📊 **可视化进度条**: 显示85%最佳区域vs15%后备区域上下文使用情况 | **Visual Progress Bar**: Shows 85% optimal vs 15% backup context usage
- 🌈 **跨平台支持**: Windows、macOS、Linux兼容，智能表情/颜色检测 | **Cross-Platform**: Windows, macOS, Linux compatible with smart emoji/color detection
- ⚡ **性能优化**: 缓存优化和可配置解析 | **Performance**: Optimized with caching and configurable parsing
- 🔧 **高度灵活**: 可自定义颜色、图标、顺序、阈值 | **Flexible**: Customizable colors, icons, order, thresholds
- 📱 **终端自适应**: 自动检测终端能力 | **Terminal Adaptive**: Auto-detects terminal capabilities

## 🚀 安装和配置 Installation & Setup

### 推荐方式 Recommended Methods

**方式1：使用npx (无需安装) | Method 1: Using npx (no installation required)**

**方式2：全局安装 | Method 2: Global installation**

```bash
# 全局安装 Global install
npm install -g claude-code-statusline-pro
```

### Claude Code 配置 Configuration

**配置选项 Configuration Options:**

**1. 项目级配置 (推荐) | Project-level Config (Recommended)**
在项目根目录创建 `.claude/settings.json` | Create `.claude/settings.json` in project root:

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx claude-code-statusline-pro"
  }
}
```

**2. 用户级配置 (全局) | User-level Config (Global)**  
在家目录创建 `.claude/settings.json` | Create `.claude/settings.json` in home directory:

```json
{
  "statusLine": {
    "type": "command",
    "command": "claude-code-statusline-pro"
  }
}
```

**配置优先级 Priority Order:**
1. 项目级 `.claude/settings.json` (最高优先级 | Highest priority)
2. 用户级 `~/.claude/settings.json` (全局默认 | Global fallback)

**使用建议 Usage Recommendations:**
- ✅ **项目级**: 团队协作项目，确保一致的状态栏配置
- ✅ **用户级**: 个人全局配置，所有项目共享设置

### 其他安装方式 Alternative Methods

**从源码安装 | Install from source**

```bash
# 克隆仓库 Clone repository
git clone https://github.com/wangnov/claude-code-statusline-pro.git
cd claude-code-statusline-pro
npm install

# Claude Code配置 Claude Code configuration
{
  "statusLine": {
    "type": "command",
    "command": "/path/to/claude-code-statusline-pro/claude-code-statusline.js"
  }
}
```

## 🎨 配置管理 Configuration

### 快速开始 Quick Start

```bash
# 创建默认配置 Create default config (全局安装后 after global install)
claude-statusline-config init

# 或使用npx Or using npx
npx claude-statusline-config init

# 测试配置 Test configuration
claude-statusline-config test

# 查看当前配置 View current config
claude-statusline-config show

# 预览主题 Preview themes
claude-statusline-config preview minimal
```

### 配置文件 Configuration File

状态栏使用 `statusline.config.toml` 进行配置  
The statusline uses `statusline.config.toml` for configuration:

```toml
# 组件显示顺序 Component display order
[components]
order = ["project", "model", "branch", "tokens", "status"]

# 启用/禁用组件 Enable/disable components
[components.project]
enabled = true
icon = "📁"
color = "magenta"

# Token显示设置 Token display settings
[components.tokens]
show_progress_bar = true
show_percentage = true
show_absolute = true

# 颜色阈值 Color thresholds
[components.tokens.thresholds]
warning = 60    # 60%时显示黄色 Yellow at 60%
danger = 85     # 85%时显示红色 Red at 85%
backup = 85     # 后备区域开始 Backup zone starts
critical = 95   # 95%时显示🔥图标 🔥 icon at 95%

# 终端兼容性 Terminal compatibility
[style]
enable_colors = "auto"  # true/false/"auto"
enable_emoji = "auto"   # 自动Windows检测 Automatic Windows detection
compact_mode = false
separator = " | "
```

## 🎭 主题 Themes

### 内置主题 Built-in Themes

- **default**: 全功能，包含所有组件 | Full-featured with all components
- **minimal**: 仅模型、令牌、状态(Windows上无表情) | Just model, tokens, status (no emoji on Windows)
- **verbose**: 包含时间戳的详细信息 | All info including timestamps  
- **developer**: 为开发工作流优化 | Optimized for development workflow

### 主题预览 Theme Preview

```bash
# 预览简洁主题 Preview minimal theme
claude-statusline-config preview minimal
# 输出 Output: [M] S4 | [T] 80.1%(160k/200k) | [OK] Ready

# 列出所有主题 List all themes  
claude-statusline-config themes
```

## 🖥️ Windows兼容性 Windows Compatibility

状态栏包含强大的Windows支持，自动检测终端能力  
The statusline includes robust Windows support with automatic terminal detection:

### **智能检测 Smart Detection**
- **Windows Terminal** ✅ 完全支持 Full support
- **VS Code Terminal** ✅ 完全支持 Full support
- **Git Bash** ✅ 完全支持 Full support
- **PowerShell** ⚠️ 自动回退到文本模式 Auto-fallback to text mode
- **CMD** ⚠️ 有限支持，安全回退 Limited support, safe fallback

### **安全回退 Safe Fallbacks**
- 表情→文本替代 | Emoji → Text alternatives (`📁` → `[P]`, `🤖` → `[M]`)
- 颜色→优雅降级为纯文本 | Colors → Graceful degradation to plain text
- 进度条→简单百分比显示 | Progress bars → Simple percentage display

## 📊 输出示例 Output Examples

### 默认主题 Default Theme
```
📁 my-project | 🤖 S4 | 🌿 main | 📊 [████████████░░░] 80.1%(160k/200k) | ✅ Ready
```

### 简洁主题(Windows安全) Minimal Theme (Windows Safe)
```
[M] S4 | [T] 80.1%(160k/200k) | [OK] Ready
```

### 带错误提示 With Error Indication
```
📁 project | 🤖 S4 | 🌿 main | 📊 [████████████▓░░] 90.5%(181k/200k)⚡ | 💭 Thinking (⚠️ Recent Error)
```

## 🛠️ 高级配置 Advanced Configuration

### 自定义颜色 Custom Colors

```toml
[advanced.custom_color_codes]
orange = "\\x1b[38;5;208m"
purple = "\\x1b[38;5;129m"
```

### 性能调优 Performance Tuning

```toml
[advanced]
cache_enabled = true
recent_error_count = 20  # 错误检测范围 Error detection scope
git_timeout = 1000      # Git命令超时(毫秒) Git command timeout (ms)
```

### 实验性功能 Experimental Features

```toml
[experimental]
show_context_health = true    # 上下文使用分析 Context usage analytics
adaptive_colors = true        # 动态颜色调整 Dynamic color adjustment
show_timestamp = true         # 最后更新时间 Last update time
```

## 🔧 故障排除 Troubleshooting

### 常见问题 Common Issues

1. **Claude Code中无输出 No output in Claude Code**
   ```bash
   # 测试命令是否工作 Test if command works
   echo '{"model":{"id":"claude-sonnet-4"}}' | claude-code-statusline-pro
   
   # 或使用npx Or using npx
   echo '{"model":{"id":"claude-sonnet-4"}}' | npx claude-code-statusline-pro
   ```

2. **表情不工作 Emoji not working**
   - 检查终端：推荐Windows Terminal、VS Code或ConEmu | Check terminal: Windows Terminal, VS Code, or ConEmu recommended
   - 强制文本模式：在配置中设置 `enable_emoji = false` | Force text mode: Set `enable_emoji = false` in config

3. **颜色不工作 Colors not working**
   - 需要现代终端 | Modern terminals required
   - 强制禁用：设置 `enable_colors = false` | Force disable: Set `enable_colors = false`

### 配置文件位置 Config File Locations

按优先级查找 | Search priority order:
1. `./statusline.config.toml` (当前目录 current directory)
2. `./.statusline.toml`
3. `~/.config/claude-statusline/config.toml`
4. `~/.statusline.toml`
5. 包安装目录中的默认配置 | Default config in package directory

## 🤝 贡献 Contributing

1. Fork仓库 | Fork the repository
2. 创建功能分支 | Create feature branch
3. 提交更改 | Commit changes
4. 推送分支 | Push branch
5. 创建Pull Request | Create Pull Request

## 📄 许可证 License

MIT许可证 - 查看LICENSE文件  
MIT License - see LICENSE file

## 🙏 致谢 Acknowledgments

- 为Anthropic的Claude Code构建 | Built for Claude Code by Anthropic
- 受官方Python状态栏实现启发 | Inspired by the official Python statusline implementation
- TOML配置由@iarna/toml提供支持 | TOML configuration powered by @iarna/toml

---

⭐ 如果这个项目对您有帮助，请给个Star！  
⭐ If this project helps you, please give it a star!