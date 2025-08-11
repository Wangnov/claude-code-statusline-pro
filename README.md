# Claude Code Statusline Pro

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

## 🚀 快速开始 Quick Start

### 安装 Installation

```bash
# 克隆或下载 Clone or download
git clone https://github.com/wangnov/claude-code-statusline-pro.git
cd claude-code-statusline-pro
npm install
```

### Claude Code 配置 Configuration

添加到您的Claude Code设置中 | Add to your Claude Code settings:

```json
{
  "statusLine": {
    "type": "command",
    "command": "/path/to/claude-code-statusline-pro/claude-code-statusline.js"
  }
}
```

### 基本使用 Basic Usage

```bash
# 创建默认配置 Create default config
node statusline-config.js init

# 测试您的设置 Test your setup
node statusline-config.js test

# 查看当前配置 View current config
node statusline-config.js show

# 列出可用主题 List available themes
node statusline-config.js themes

# 预览主题效果 Preview a theme
node statusline-config.js preview minimal
```

## 🎨 配置 Configuration

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
node statusline-config.js preview minimal
# 输出 Output: [M] S4 | [T] 80.1%(160k/200k) | [OK] Ready
```

## 🖥️ Windows兼容性 Windows Compatibility

状态栏包含强大的Windows支持  
The statusline includes robust Windows support:

### **表情检测 Emoji Detection**
```javascript
emoji: enableEmoji === true || 
  (enableEmoji === "auto" && (
    process.platform !== 'win32' ||      // 非Windows系统总是可用 Non-Windows always OK
    process.env.WT_SESSION ||             // Windows Terminal
    process.env.TERM_PROGRAM === 'vscode' || // VS Code
    process.env.ConEmuPID                 // ConEmu
  ))
```

### **安全回退 Safe Fallbacks**
- 表情→文本替代 | Emoji → Text alternatives (`📁` → `[P]`, `🤖` → `[M]`)
- 颜色→优雅降级为纯文本 | Colors → Graceful degradation to plain text
- 进度条→简单百分比显示 | Progress bars → Simple percentage display

### **Windows测试 Windows Testing**

```bash
# 强制Windows兼容模式 Force Windows compatibility mode
node statusline-config.js preview minimal
# 在不支持的终端上显示纯文本输出 Will show text-only output on unsupported terminals
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

## 🔧 故障排除 Troubleshooting

### 常见问题 Common Issues

1. **Claude Code中无输出 No output in Claude Code**
   ```bash
   # 检查权限 Check permissions
   chmod +x claude-code-statusline.js
   
   # 手动测试 Test manually
   echo '{"model":{"id":"claude-sonnet-4"}}' | node claude-code-statusline.js
   ```

2. **表情不工作 Emoji not working**
   - 检查终端：推荐Windows Terminal、VS Code或ConEmu | Check terminal: Windows Terminal, VS Code, or ConEmu recommended
   - 强制文本模式：在配置中设置 `enable_emoji = false` | Force text mode: Set `enable_emoji = false` in config

3. **颜色不工作 Colors not working**
   - 需要现代终端 | Modern terminals required
   - 强制禁用：设置 `enable_colors = false` | Force disable: Set `enable_colors = false`

### Windows特定 Windows Specific

- **PowerShell**: 配合Windows Terminal工作 | Works with Windows Terminal
- **CMD**: 有限的表情支持，自动回退 | Limited emoji support, automatic fallback
- **Git Bash**: 完全支持 | Full support
- **VS Code Terminal**: 完全支持 | Full support

## 📦 发布选项 Distribution Options

### GitHub发布 GitHub Release
1. 标记版本 Tag version: `git tag v1.0.0`
2. 推送 Push: `git push --tags`
3. 创建包含二进制文件的发布 | Create release with binaries

### NPM包 NPM Package
```bash
# 准备npm Prepare for npm
npm pack

# 发布(如果需要) Publish (if desired)
npm publish
```

## 🤝 贡献 Contributing

1. Fork仓库 | Fork the repository
2. 创建功能分支 | Create feature branch
3. 为Windows兼容性添加测试 | Add tests for Windows compatibility
4. 提交拉取请求 | Submit pull request

## 📄 许可证 License

MIT许可证 - 查看LICENSE文件  
MIT License - see LICENSE file

## 🙏 致谢 Acknowledgments

- 为Anthropic的Claude Code构建 | Built for Claude Code by Anthropic
- TOML配置由@iarna/toml提供支持 | TOML configuration powered by @iarna/toml