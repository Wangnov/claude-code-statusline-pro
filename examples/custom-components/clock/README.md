# Clock Component | 时钟组件

A simple clock component for Claude Code StatusLine Pro that displays the current time in your status line.

一个简单的时钟组件，用于在状态栏中显示当前时间。

## Features | 功能

- 24-hour or 12-hour format | 支持24小时制和12小时制
- Optional seconds display | 可选的秒显示
- Optional date display | 可选的日期显示
- Customizable colors | 可自定义颜色
- Three-tier icon system (Nerd Font → Emoji → Text) | 三级图标系统

## Configuration | 配置

Edit the `config.toml` file to customize the clock component:

编辑 `config.toml` 文件来自定义时钟组件：

```toml
# Enable/disable the component
enabled = true

# Time format (true for 24h, false for 12h)
format_24h = true

# Show seconds
show_seconds = false

# Show date (MM/DD format)
show_date = false

# Timezone (currently only supports "local")
timezone = "local"
```

## Installation | 安装

1. Copy this folder to one of the following locations | 将此文件夹复制到以下位置之一：
   - User level | 用户级: `~/.claude/statusline-pro/components/clock/`
   - Project level | 项目级: `~/.claude/projects/{project-hash}/statusline-pro/components/clock/`

2. Add the component code mapping in your statusline configuration | 在状态栏配置中添加组件代码映射：
   ```toml
   [custom_components]
   codes = { C = "clock" }
   ```

3. Use in your preset string | 在预设字符串中使用：
   ```toml
   preset = "PMBTC"  # Project, Model, Branch, Tokens, Clock
   ```

## Display Examples | 显示示例

- 24-hour format | 24小时制: `14:30`
- 12-hour format | 12小时制: `2:30 PM`
- With seconds | 带秒: `14:30:45`
- With date | 带日期: `12/25 14:30`

## Customization | 自定义

You can modify the `component.js` file to add more features:
- Different date formats
- Timezone conversion
- Custom formatting
- Animation effects (if terminal supports)

您可以修改 `component.js` 文件来添加更多功能：
- 不同的日期格式
- 时区转换
- 自定义格式
- 动画效果（如果终端支持）

## License | 许可

MIT