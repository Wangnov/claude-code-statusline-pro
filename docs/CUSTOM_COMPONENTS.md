# Custom Components System | 自定义组件系统

## Overview | 概述

Claude Code StatusLine Pro 支持自定义组件系统，允许用户创建和使用自己的状态栏组件。

The custom component system allows users to create and use their own statusline components.

## Architecture | 架构

```
custom-components/
├── discovery.ts    # 组件发现器 - 扫描组件路径
├── loader.ts       # 组件加载器 - 动态加载JS模块
├── integrator.ts   # 组件集成器 - 集成到主系统
└── types.ts        # 类型定义
```

## Component Structure | 组件结构

每个自定义组件必须包含以下文件：

```
clock/
├── component.js    # 主组件文件（JavaScript）
├── config.toml     # 组件配置
└── README.md       # 组件文档（可选）
```

### component.js

组件必须导出一个工厂函数：

```javascript
export default function createClockComponent(config) {
  return {
    name: 'clock',
    
    async render(context) {
      try {
        // 渲染逻辑
        const now = new Date();
        const timeStr = now.toTimeString().slice(0, 5);
        
        return {
          success: true,
          content: timeStr
        };
      } catch (error) {
        return {
          success: false,
          error: `Error: ${error.message}`
        };
      }
    },
    
    async cleanup() {
      // 清理资源（可选）
    }
  };
}
```

### config.toml

组件配置文件：

```toml
# 组件配置
enabled = true

# 三级图标系统
nerd_icon = "󰥔"    # Nerd Font 图标
emoji_icon = "🕐"   # Emoji 图标
text_icon = "[T]"   # 文本回退

# 颜色配置
icon_color = "cyan"
text_color = "white"

# 组件特定配置
format_24h = true
show_seconds = false
```

## Storage Locations | 存储位置

组件存储位置按优先级排序：

1. **命令行指定** (最高优先级)
   ```bash
   --custom-components /path/to/components
   ```

2. **项目级**
   ```
   ~/.claude/projects/{project-hash}/statusline-pro/components/
   ```

3. **用户级** (最低优先级)
   ```
   ~/.claude/statusline-pro/components/
   ```

## Configuration | 配置

### 在配置文件中映射组件代码

```toml
[custom_components]
# 将单字符代码映射到组件名
codes = { C = "clock", W = "weather" }
debug = true  # 启用调试输出
```

### 使用组件

在预设字符串中使用映射的代码：

```toml
preset = "PMBTC"  # Project, Model, Branch, Tokens, Clock
```

或通过命令行：

```bash
npm run dev -- --preset "PMBTC"
```

## Creating a Component | 创建组件

### Step 1: 创建组件目录

```bash
mkdir -p ~/.claude/statusline-pro/components/myclock
```

### Step 2: 编写组件代码

`component.js`:
```javascript
export default function createMyClockComponent(config) {
  return {
    name: 'myclock',
    
    async render(context) {
      const format24h = config.format_24h !== false;
      const now = new Date();
      
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      
      if (!format24h) {
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return {
          success: true,
          content: `${hours}:${minutes} ${ampm}`
        };
      }
      
      return {
        success: true,
        content: `${hours.toString().padStart(2, '0')}:${minutes}`
      };
    }
  };
}
```

### Step 3: 创建配置文件

`config.toml`:
```toml
enabled = true
nerd_icon = "󰥔"
emoji_icon = "⏰"
text_icon = "[C]"
icon_color = "yellow"
text_color = "white"

# 自定义配置
format_24h = true
```

### Step 4: 配置映射

在 `~/.claude/statusline-pro/config.toml` 中：

```toml
[custom_components]
codes = { T = "myclock" }
```

### Step 5: 使用组件

```bash
echo '{"model":{"id":"claude"}}' | npm run dev -- --preset "PMT"
```

## API Reference | API 参考

### Component Interface

```typescript
interface CustomComponent {
  name: string;
  render(context: RenderContext): Promise<CustomComponentRenderResult>;
  cleanup?(): Promise<void>;
}
```

### RenderContext

```typescript
interface RenderContext {
  inputData: InputData;        // Claude Code输入数据
  capabilities: {               // 终端能力
    colors: boolean;
    emoji: boolean;
    nerdFont: boolean;
  };
  config: Config;               // 主配置
  colors: Record<string, string>; // 颜色映射
  icons: Record<string, string>;  // 图标映射
}
```

### RenderResult

```typescript
interface CustomComponentRenderResult {
  success: boolean;
  content?: string;  // 成功时的内容
  error?: string;    // 失败时的错误信息
}
```

## Best Practices | 最佳实践

1. **使用JavaScript而非TypeScript**
   - 运行时直接加载，无需编译
   - 使用ES模块语法 (`export default`)

2. **错误处理**
   - 始终在try-catch中包装渲染逻辑
   - 返回有意义的错误信息

3. **配置优先**
   - 所有可配置项应在config.toml中定义
   - 提供合理的默认值

4. **三级图标系统**
   - 始终提供Nerd Font、Emoji和文本三种图标
   - 确保文本版本可读

5. **性能考虑**
   - 避免在render中执行重型计算
   - 缓存可重用的数据

## Troubleshooting | 故障排除

### 组件未加载

1. 检查文件结构是否正确
2. 确保component.js导出默认函数
3. 验证config.toml语法正确
4. 启用debug模式查看详细日志

### "Unknown preset character" 错误

1. 确认组件代码映射配置正确
2. 检查组件是否成功加载
3. 验证preset字符串中使用的代码

### ES模块警告

在组件目录添加 `package.json`:
```json
{
  "type": "module"
}
```

## Examples | 示例

查看 `examples/custom-components/` 目录获取更多示例组件。

## License | 许可

MIT