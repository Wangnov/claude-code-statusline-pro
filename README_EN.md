# Claude Code Statusline Pro

Enhanced configurable statusline for Claude Code with TOML configuration, themes, and cross-platform support.

## ✨ Features

- 🎨 **TOML Configuration**: Easy-to-read configuration with comments
- 🎭 **Theme System**: Built-in themes (minimal/verbose/developer) + custom themes  
- 📊 **Visual Progress Bar**: Shows 85% optimal vs 15% backup context usage
- 🌈 **Cross-Platform**: Windows, macOS, Linux compatible with smart emoji/color detection
- ⚡ **Performance**: Optimized with caching and configurable parsing
- 🔧 **Flexible**: Customizable colors, icons, order, thresholds
- 📱 **Terminal Adaptive**: Auto-detects terminal capabilities

## 🚀 Quick Start

### Installation

```bash
# Clone or download
git clone https://github.com/wangnov/claude-code-statusline-pro.git
cd claude-code-statusline-pro
npm install
```

### Claude Code Configuration

Add to your Claude Code settings:

```json
{
  "statusLine": {
    "type": "command",
    "command": "/path/to/claude-code-statusline-pro/claude-code-statusline.js"
  }
}
```

### Basic Usage

```bash
# Create default config
node statusline-config.js init

# Test your setup
node statusline-config.js test

# View current config
node statusline-config.js show

# List available themes
node statusline-config.js themes

# Preview a theme
node statusline-config.js preview minimal
```

## 🎨 Configuration

The statusline uses `statusline.config.toml` for configuration:

```toml
# Component display order
[components]
order = ["project", "model", "branch", "tokens", "status"]

# Enable/disable components
[components.project]
enabled = true
icon = "📁"
color = "magenta"

# Token display settings
[components.tokens]
show_progress_bar = true
show_percentage = true
show_absolute = true

# Color thresholds
[components.tokens.thresholds]
warning = 60    # Yellow at 60%
danger = 85     # Red at 85%
backup = 85     # Backup zone starts
critical = 95   # 🔥 icon at 95%

# Terminal compatibility
[style]
enable_colors = "auto"  # true/false/"auto"
enable_emoji = "auto"   # Automatic Windows detection
compact_mode = false
separator = " | "
```

## 🎭 Themes

### Built-in Themes

- **default**: Full-featured with all components
- **minimal**: Just model, tokens, status (no emoji on Windows)
- **verbose**: All info including timestamps  
- **developer**: Optimized for development workflow

### Theme Preview

```bash
# Preview minimal theme
node statusline-config.js preview minimal
# Output: [M] S4 | [T] 80.1%(160k/200k) | [OK] Ready
```

## 🖥️ Windows Compatibility

The statusline includes robust Windows support:

### **Emoji Detection**
```javascript
emoji: enableEmoji === true || 
  (enableEmoji === "auto" && (
    process.platform !== 'win32' ||      // Non-Windows always OK
    process.env.WT_SESSION ||             // Windows Terminal
    process.env.TERM_PROGRAM === 'vscode' || // VS Code
    process.env.ConEmuPID                 // ConEmu
  ))
```

### **Safe Fallbacks**
- Emoji → Text alternatives (`📁` → `[P]`, `🤖` → `[M]`)
- Colors → Graceful degradation to plain text
- Progress bars → Simple percentage display

### **Windows Testing**

```bash
# Force Windows compatibility mode
node statusline-config.js preview minimal
# Will show text-only output on unsupported terminals
```

## 🛠️ Advanced Configuration

### Custom Colors

```toml
[advanced.custom_color_codes]
orange = "\\x1b[38;5;208m"
purple = "\\x1b[38;5;129m"
```

### Performance Tuning

```toml
[advanced]
cache_enabled = true
recent_error_count = 20  # Error detection scope
git_timeout = 1000      # Git command timeout (ms)
```

### Experimental Features

```toml
[experimental]
show_context_health = true    # Context usage analytics
adaptive_colors = true        # Dynamic color adjustment
show_timestamp = true         # Last update time
```

## 📊 Output Examples

### Default Theme
```
📁 my-project | 🤖 S4 | 🌿 main | 📊 [████████████░░░] 80.1%(160k/200k) | ✅ Ready
```

### Minimal Theme (Windows Safe)
```
[M] S4 | [T] 80.1%(160k/200k) | [OK] Ready
```

### With Error Indication
```
📁 project | 🤖 S4 | 🌿 main | 📊 [████████████▓░░] 90.5%(181k/200k)⚡ | 💭 Thinking (⚠️ Recent Error)
```

## 🔧 Troubleshooting

### Common Issues

1. **No output in Claude Code**
   ```bash
   # Check permissions
   chmod +x claude-code-statusline.js
   
   # Test manually
   echo '{"model":{"id":"claude-sonnet-4"}}' | node claude-code-statusline.js
   ```

2. **Emoji not working**
   - Check terminal: Windows Terminal, VS Code, or ConEmu recommended
   - Force text mode: Set `enable_emoji = false` in config

3. **Colors not working**
   - Modern terminals required
   - Force disable: Set `enable_colors = false`

### Windows Specific

- **PowerShell**: Works with Windows Terminal
- **CMD**: Limited emoji support, automatic fallback
- **Git Bash**: Full support
- **VS Code Terminal**: Full support

## 📦 Distribution Options

### GitHub Release
1. Tag version: `git tag v1.0.0`
2. Push: `git push --tags`
3. Create release with binaries

### NPM Package
```bash
# Prepare for npm
npm pack

# Publish (if desired)
npm publish
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for Windows compatibility
4. Submit pull request

## 📄 License

MIT License - see LICENSE file

## 🙏 Acknowledgments

- Built for Claude Code by Anthropic
- TOML configuration powered by @iarna/toml