# 📖 Component Development Guide | 组件开发指南

**版本**: 2.2.0  
**日期**: 2025-09-04  
**基于**: Claude Code Statusline Pro

---

## 📚 目录

1. [组件系统架构](#-组件系统架构)
2. [核心接口与类](#-核心接口与类)
3. [创建自定义组件](#-创建自定义组件)
4. [组件配置系统](#️-组件配置系统)
5. [组件注册机制](#-组件注册机制)
6. [API参考](#-api参考)
7. [最佳实践](#-最佳实践)
8. [调试与测试](#-调试与测试)

---

## 🏗️ 组件系统架构

项目采用**工厂模式 + 注册表模式**的组件架构：

```
Component (接口) ← BaseComponent (抽象类) ← 具体组件类
                                            ↓
ComponentFactory (接口) ← 具体工厂类 → ComponentRegistry (注册表)
```

### 核心文件位置
- **基础定义**: `src/components/base.ts`
- **现有组件**: `src/components/*.ts`  
- **配置定义**: `src/config/schema.ts`
- **注册逻辑**: `src/core/generator.ts:55-64`

---

## 🔧 核心接口与类

### 1. Component 接口
**文件**: `src/components/base.ts:19-28`

```typescript
export interface Component {
  readonly name: string;           // 组件名称
  readonly enabled: boolean;        // 是否启用
  render(context: RenderContext | ExtendedRenderContext): 
    ComponentResult | Promise<ComponentResult>;
}
```

### 2. ComponentResult 接口
**文件**: `src/components/base.ts:7-14`

```typescript
export interface ComponentResult {
  content: string | null;  // 渲染内容，null表示不显示
  success: boolean;        // 是否成功
  error?: string;         // 错误信息
}
```

### 3. BaseComponent 抽象类
**文件**: `src/components/base.ts:34-247`

```typescript
export abstract class BaseComponent implements Component {
  public readonly name: string;
  protected config: ComponentConfig;
  protected renderContext?: RenderContext | ExtendedRenderContext;
  protected iconColor: string = '';
  protected textColor: string = '';
  protected capabilities: TerminalCapabilities;

  constructor(name: string, config: ComponentConfig) {
    this.name = name;
    this.config = config;
  }

  // 子类必须实现的抽象方法
  protected abstract renderContent(
    context: RenderContext | ExtendedRenderContext
  ): string | null | Promise<string | null>;
}
```

### 4. ComponentFactory 接口
**文件**: `src/components/base.ts:252-257`

```typescript
export interface ComponentFactory {
  createComponent(name: string, config: ComponentConfig): Component;
  getSupportedTypes(): string[];
}
```

---

## 🎯 创建自定义组件

### 步骤 1: 创建组件类

```typescript
// my-custom-component.ts
import { BaseComponent } from '../src/components/base.js';
import type { ComponentConfig, RenderContext } from '../src/config/schema.js';

export class MyCustomComponent extends BaseComponent {
  
  constructor(name: string, config: ComponentConfig) {
    super(name, config);
  }

  // 唯一必须实现的方法
  protected renderContent(context: RenderContext): string | null {
    const { inputData } = context;
    
    // 你的组件逻辑
    const customData = this.getCustomData(inputData);
    
    // 使用内置格式化方法（自动处理图标和颜色）
    return this.formatOutput(customData);
  }
  
  private getCustomData(inputData: any): string {
    // 实现你的逻辑
    return "Custom Data";
  }
}
```

### 步骤 2: 创建工厂类

```typescript
// my-custom-component.ts (续)
import { ComponentFactory } from '../src/components/base.js';

export class MyCustomComponentFactory implements ComponentFactory {
  createComponent(name: string, config: ComponentConfig): MyCustomComponent {
    return new MyCustomComponent(name, config);
  }
  
  getSupportedTypes(): string[] {
    return ['mycustom'];
  }
}
```

### 步骤 3: 注册组件

在 `src/core/generator.ts:55` 的 `initializeComponents` 方法中添加：

```typescript
private initializeComponents(): void {
  // 现有组件...
  this.componentRegistry.register('project', new ProjectComponentFactory());
  this.componentRegistry.register('model', new ModelComponentFactory());
  
  // 添加你的自定义组件
  this.componentRegistry.register('mycustom', new MyCustomComponentFactory());
}
```

---

## ⚙️ 组件配置系统

### 基础配置结构
**定义位置**: `src/config/schema.ts:114-127`

所有组件都继承基础配置：

```toml
[components.mycustom]
enabled = true           # 是否启用
icon_color = "white"     # 图标颜色
text_color = "white"     # 文字颜色
emoji_icon = "😀"        # Emoji图标
nerd_icon = "\uE0B0"     # Nerd Font图标
text_icon = "[X]"        # 文本图标
```

### 扩展配置

创建自定义配置接口：

```typescript
interface MyCustomComponentConfig extends ComponentConfig {
  // 添加自定义配置项
  custom_option?: string;
  refresh_interval?: number;
  show_details?: boolean;
}
```

### 配置文件示例

在 `.claude/settings.toml` 中：

```toml
[components.mycustom]
enabled = true
icon_color = "cyan"
text_color = "bright_white"
nerd_icon = "󰊤"
emoji_icon = "⚡"
text_icon = "[C]"

# 自定义配置项
custom_option = "value"
refresh_interval = 5000
show_details = true

# 预设映射
[preset_mapping]
C = "mycustom"

# 使用自定义组件
preset = "PMBC"
```

---

## 📦 组件注册机制

### ComponentRegistry 类
**文件**: `src/components/base.ts:262-290`

注册表提供三个方法：

```typescript
class ComponentRegistry {
  register(type: string, factory: ComponentFactory): void
  create(type: string, name: string, config: ComponentConfig): Component | null
  getRegisteredTypes(): string[]
}
```

### 预设映射系统
**文件**: `src/core/generator.ts:339-353`

通过单字母映射组件：

```typescript
const mapping = this.config.preset_mapping || {
  P: 'project',
  M: 'model',
  B: 'branch',
  T: 'tokens',
  U: 'usage',
  S: 'status'
};
```

---

## 📖 API参考

### BaseComponent 提供的辅助方法

**文件**: `src/components/base.ts`

| 方法 | 行号 | 说明 |
|------|------|------|
| `selectIcon()` | 105-139 | 三级图标选择逻辑 |
| `renderIcon(customIcon?)` | 144-153 | 渲染图标（应用颜色） |
| `renderText(text, useTextColor?)` | 158-166 | 渲染文本（应用颜色） |
| `combineIconAndText(icon, text)` | 171-176 | 组合图标和文本 |
| `formatOutput(text, customIcon?)` | 216-237 | 格式化输出（主要方法） |
| `getColorCode(colorName)` | 180-183 | 获取颜色代码 |
| `getResetColor()` | 188-191 | 获取重置颜色代码 |
| `colorize(content, colorName)` | 205-211 | 应用颜色 |

### RenderContext 结构

**文件**: `src/config/schema.ts:648`

```typescript
interface RenderContext {
  inputData: InputData;           // Claude输入数据
  capabilities: {                 // 终端能力
    colors: boolean;
    emoji: boolean;
    nerdFont: boolean;
  };
  colors: Record<string, string>; // 颜色映射表
  icons: Record<string, string>;  // 图标映射表
}
```

### InputData 结构

包含的主要字段：

```typescript
interface InputData {
  hookEventName: string;      // 事件名称
  sessionId: string | null;   // 会话ID
  transcriptPath: string | null; // 记录路径
  cwd: string;                // 当前目录
  model: {                    // 模型信息
    id?: string;
    display_name?: string;
  };
  workspace: {                // 工作区信息
    current_dir: string;
    project_dir: string;
  };
  gitBranch: string | null;   // Git分支
  cost: any | null;           // 成本信息
}
```

---

## ✨ 最佳实践

### 1. 错误处理

```typescript
protected renderContent(context: RenderContext): string | null {
  try {
    // 你的逻辑
    return this.formatOutput(data);
  } catch (error) {
    console.error(`MyComponent error: ${error}`);
    return null; // 返回null隐藏组件
  }
}
```

### 2. 性能优化

```typescript
export class MyComponent extends BaseComponent {
  private cache: Map<string, any> = new Map();
  private lastUpdate: number = 0;
  
  protected renderContent(context: RenderContext): string | null {
    // 使用缓存
    const now = Date.now();
    if (now - this.lastUpdate < 1000) {
      return this.cache.get('result') || null;
    }
    
    // 更新缓存
    const result = this.computeResult();
    this.cache.set('result', result);
    this.lastUpdate = now;
    
    return result;
  }
}
```

### 3. 异步操作

```typescript
protected async renderContent(context: RenderContext): Promise<string | null> {
  const data = await this.fetchData();
  return this.formatOutput(data);
}

private async fetchData(): Promise<string> {
  // 异步获取数据
  const response = await fetch('...');
  return response.text();
}
```

### 4. 配置验证

```typescript
constructor(name: string, config: MyComponentConfig) {
  super(name, config);
  
  // 验证和设置默认值
  this.myConfig = {
    custom_option: config.custom_option || 'default',
    refresh_interval: config.refresh_interval || 5000,
    show_details: config.show_details ?? false,
    ...config
  };
}
```

---

## 🔍 调试与测试

### 使用CLI测试

项目提供了完整的CLI测试工具：

```bash
# 运行CLI配置编辑器
npm run config

# 选择 "实时预览" 测试组件显示效果
```

### 手动测试脚本

创建测试脚本：

```typescript
// test-component.ts
import { StatuslineGenerator } from './src/core/generator.js';
import { ConfigLoader } from './src/config/loader.js';

async function test() {
  const loader = new ConfigLoader();
  const config = await loader.load();
  
  const generator = new StatuslineGenerator(config);
  const result = await generator.generate({
    hookEventName: 'Status',
    sessionId: null,
    transcriptPath: null,
    cwd: process.cwd(),
    model: { id: 'claude-3' },
    workspace: {
      current_dir: process.cwd(),
      project_dir: process.cwd()
    },
    gitBranch: null,
    cost: null
  });
  
  console.log('Result:', result);
}

test();
```

### 日志调试

```typescript
protected renderContent(context: RenderContext): string | null {
  console.log('=== MyComponent Debug ===');
  console.log('Config:', this.config);
  console.log('InputData:', context.inputData);
  console.log('Capabilities:', context.capabilities);
  
  const result = this.computeResult();
  console.log('Result:', result);
  
  return this.formatOutput(result);
}
```

---

## ⚠️ 注意事项

### 必须遵守的规则

1. ✅ **所有组件必须继承 `BaseComponent`** (`src/components/base.ts:34`)
2. ✅ **必须实现 `renderContent` 方法** (`src/components/base.ts:97`)
3. ✅ **使用 `formatOutput` 方法进行输出** (`src/components/base.ts:216`)
4. ✅ **组件名必须唯一**
5. ✅ **支持异步操作**（返回 `Promise<string | null>`）

### 避免的做法

1. ❌ **不要直接修改 `renderContext`**
2. ❌ **不要在构造函数中执行异步操作**
3. ❌ **不要硬编码颜色代码**
4. ❌ **不要忽略错误处理**
5. ❌ **不要在渲染时修改组件状态**

---

## 🚀 下一步

1. 📝 查看 [时钟组件示例](./examples/clock/)
2. 🎨 复制时钟组件作为模板
3. ✏️ 修改组件逻辑实现你的功能
4. 🔧 在配置文件中测试组件
5. 📤 分享你的组件到社区

---

## 📞 支持

- 📖 查看项目文档
- 💬 提交Issue到项目仓库
- 🤝 加入社区讨论

---

*Happy Coding! 🎉*

*文档版本: 1.0.0*  
*最后更新: 2025-09-04*