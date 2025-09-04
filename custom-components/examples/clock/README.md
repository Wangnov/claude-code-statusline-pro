# 🕐 Clock Component | 时钟组件

一个简单优雅的时钟组件，为你的 Claude Code Statusline Pro 添加时间显示功能。

## ✨ 功能特性

- 🎯 **多种显示模式**：12/24小时制、显示秒数、显示日期
- 🌍 **时区支持**：可配置时区偏移，显示不同地区时间
- 🎨 **完全可定制**：支持自定义图标、颜色、分隔符
- ⚡ **性能优化**：内置缓存机制，可配置更新间隔
- 🔧 **易于集成**：继承自BaseComponent，享受所有基础设施

## 📦 安装步骤

### 1. 复制组件文件

```bash
# 将时钟组件复制到项目组件目录
cp custom-components/examples/clock/clock.ts src/components/clock.ts
```

### 2. 注册组件

编辑 `src/core/generator.ts` 文件，在 `initializeComponents()` 方法中添加：

```typescript
// src/core/generator.ts 第64行后添加
import { ClockComponentFactory } from '../components/clock.js';

private initializeComponents(): void {
  // ... 现有组件注册
  this.componentRegistry.register('status', new StatusComponentFactory());
  
  // 添加时钟组件注册
  this.componentRegistry.register('clock', new ClockComponentFactory());
}
```

### 3. 配置组件

在 `.claude/settings.toml` 或 `.claude/settings.local.toml` 中添加：

```toml
[components.clock]
enabled = true
icon_color = "cyan"
text_color = "bright_white"
nerd_icon = "󰅐"
emoji_icon = "🕐"
text_icon = "[T]"

# 可选配置
format_24h = true
show_seconds = false
show_date = false

# 添加到预设映射
[preset_mapping]
C = "clock"

# 使用包含时钟的预设
preset = "PMCBUS"
```

## ⚙️ 配置选项

### 基础配置（继承自BaseComponent）

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enabled` | boolean | true | 是否启用组件 |
| `icon_color` | string | "white" | 图标颜色 |
| `text_color` | string | "white" | 文字颜色 |
| `nerd_icon` | string | - | Nerd Font图标 |
| `emoji_icon` | string | - | Emoji图标 |
| `text_icon` | string | - | 纯文本图标 |

### 时钟特有配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `format_24h` | boolean | true | 使用24小时制 |
| `show_seconds` | boolean | false | 显示秒数 |
| `show_date` | boolean | false | 显示日期 |
| `date_format` | string | "slash" | 日期格式 ("slash" \| "dash" \| "dot") |
| `timezone_offset` | number | 0 | 时区偏移（小时） |
| `time_separator` | string | ":" | 时间分隔符 |
| `show_ampm` | boolean | false | 显示AM/PM标识 |
| `update_interval` | number | 1000 | 更新间隔（毫秒） |

## 🎨 使用示例

### 基础时钟
```toml
[components.clock]
enabled = true
emoji_icon = "🕐"
```
输出: `🕐 14:30`

### 12小时制带AM/PM
```toml
[components.clock]
format_24h = false
show_ampm = true
emoji_icon = "🕐"
```
输出: `🕐 02:30 PM`

### 显示日期和时间
```toml
[components.clock]
show_date = true
date_format = "dash"
emoji_icon = "📅"
```
输出: `📅 2025-09-04 14:30`

### 精确到秒
```toml
[components.clock]
show_seconds = true
emoji_icon = "⏱️"
```
输出: `⏱️ 14:30:45`

### 东京时间
```toml
[components.clock]
timezone_offset = 9
emoji_icon = "🗾"
```
输出: `🗾 15:30` （UTC+9）

## 🎯 预设集成

时钟组件可以通过预设字符轻松集成到状态行：

```toml
[preset_mapping]
C = "clock"

# 不同的预设组合
preset = "PC"      # 只显示项目和时钟
preset = "PMCB"    # 项目-模型-时钟-分支
preset = "PMCBUS"  # 完整状态行带时钟
preset = "CMP"     # 时钟在最前面
```

## 🔧 高级用法

### 自定义时间格式

如果需要更复杂的时间格式，可以修改组件的 `formatTime()` 方法：

```typescript
private formatTime(date: Date): string {
  // 自定义格式逻辑
  return `${hours}h${minutes}m`;  // 14h30m
}
```

### 添加更多功能

组件易于扩展，例如：
- 添加倒计时功能
- 显示多个时区
- 集成日历事件提醒
- 添加番茄钟功能

## 📝 API 参考

### ClockComponent 类

继承自 `BaseComponent`，实现了 `Component` 接口。

#### 主要方法

- `renderContent(context)` - 渲染组件内容（必须实现）
- `getCurrentTime()` - 获取当前时间（考虑时区）
- `formatTime(date)` - 格式化时间字符串
- `formatDate(date)` - 格式化日期字符串

### ClockComponentFactory 类

实现了 `ComponentFactory` 接口。

#### 方法

- `createComponent(name, config)` - 创建时钟组件实例
- `getSupportedTypes()` - 返回 `['clock']`

## 🐛 调试

### 使用CLI测试

```bash
npm run config
# 选择 "实时预览" 测试组件显示效果
```

### 查看组件输出

```bash
# 直接运行查看状态行输出
echo '{"model":{"id":"claude-3"}}' | node dist/index.js
```

### 常见问题

1. **组件未显示**
   - 检查 `enabled` 是否为 true
   - 确认预设字符串包含 'C'
   - 验证组件是否正确注册

2. **时间不更新**
   - 检查 `update_interval` 设置
   - Claude Code 有默认300ms的更新限制

3. **图标显示异常**
   - 确认终端支持相应的图标类型
   - 检查 `force_emoji`、`force_nerd_font` 设置

## 📄 许可证

MIT License - 与 Claude Code Statusline Pro 项目一致

## 🤝 贡献

欢迎提交改进建议和功能增强！

---

*创建日期: 2025-09-04*  
*版本: 1.0.0*  
*作者: Claude Code Statusline Pro Team*