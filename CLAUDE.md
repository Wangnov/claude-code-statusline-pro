# Claude Code 状态栏增强系统架构指南

## 核心架构

这是一个企业级状态栏生成系统，采用分层架构：

```
CLI层 (src/cli/main.ts)
    ↓
生成器层 (src/core/generator.ts - StatuslineGenerator)
    ↓
组件层 (src/components/ - BaseComponent子类)
    ↓
服务层 (GitService + StorageManager + TerminalDetector)
    ↓
基础层 (Utils + Config + Themes)
```

## 主要执行流程

1. **CLI入口**: `src/cli/main.ts:64` 处理命令行参数
2. **配置加载**: `ConfigLoader.load()` 加载TOML配置
3. **生成器初始化**: `new StatuslineGenerator(config)`
4. **组件注册**: `initializeComponents()` 注册7个组件工厂
5. **状态栏生成**: `generator.generate(inputData)` 执行渲染
6. **主题渲染**: ThemeRenderer 生成最终输出

## 关键类和接口

### StatuslineGenerator (src/core/generator.ts:29)
```typescript
class StatuslineGenerator {
  generate(inputData: InputData): Promise<string>  // 主要接口
  private initializeComponents(): void             // 注册组件工厂
}
```

### BaseComponent (src/components/base.ts:34)
```typescript
abstract class BaseComponent {
  abstract renderContent(context: RenderContext): string | null
  protected selectIcon(): string  // 三级图标选择逻辑
}
```

### ConfigLoader (src/config/loader.ts)
```typescript
class ConfigLoader {
  load(customPath?: string): Promise<Config>
  createDefaultConfig(path: string, theme: string): Promise<void>
}
```

## 🚨 AI Agent开发哲学

### KISS原则 (Keep It Simple, Stupid)
1. **简单优于复杂**: 优先选择简单直接的解决方案
2. **可读性第一**: 代码是给人看的，其次才是给机器执行的
3. **避免过度设计**: 不要为了未来可能的需求而过度设计
4. **单一职责**: 每个函数、类、模块只做一件事

### Linus精神
1. **代码质量至上**: 糟糕的代码是技术债务，好的代码是资产
2. **直接而诚实**: 代码评审时直接指出问题，不要含糊其辞
3. **性能意识**: 始终考虑代码的性能影响
4. **测试驱动**: 没有测试的代码就是坏代码

### AI Agent开发技巧
1. **并行阅读和执行Bash命令**: 充分利用自身的并行工具调用能力，一次性同时并行阅读多个文件，并行调用多个Bash命令以提高效率
2. **谨慎并行编辑**: 在并行Update的时候，要小心谨慎，充分思考
3. **避免一次性输出过长**: 在创建超过1000行的大文档、执行超过1000行的代码删除和修改等长输出的工具调用时，优先选择先创建基础，然后并行调用Update，或使用Multi Update进行丰富完善的方式。而不是一次性输出一整个文档或试图直接编辑1000行的代码，这很有可能会失败
4. **使用SubAgent来扩展**: 面对某些调研代码库、阅读庞大的文档等高上下文消耗的工作，请使用Task工具委派给合适的SubAgent或General Purpose来执行。避免污染自身上下文
5. **SubAgents并行调用**: 在需要执行多个Task的时候，可以并行调用任务互相正交的SubAgents，提高效率

## 📝 TypeScript开发规范

### 常见错误与避免方法

#### 1. 类型不一致问题
**❌ 错误**:
```typescript
function extractProjectId(path: string | null): string | undefined {
  return path ? path.match(/.../)![1] : undefined; // 类型不匹配！
}
```
**✅ 正确**:
```typescript
function extractProjectId(path: string | null): string | null {
  return path ? (path.match(/.../))?.[1] || null : null;
}
```

#### 2. 可选属性处理
**❌ 错误**:
```typescript
const cost: SessionCost = {
  parentSessionId: undefined, // 在strictOptionalProperties下会报错
};
```
**✅ 正确**:
```typescript
const cost: SessionCost = {};
if (parentId) {
  cost.parentSessionId = parentId;
}
```

#### 3. 异步操作处理
**❌ 错误**:
```typescript
async renderContent() {
  updateCostFromInput(data); // 忘记await导致数据丢失
  return this.formatOutput();
}
```
**✅ 正确**:
```typescript
async renderContent() {
  await updateCostFromInput(data); // 必须await
  return this.formatOutput();
}
```

## 🔄 模块依赖关系

### 核心依赖链
- **CLI层** → **生成器层** → **组件层** → **服务层**
- **组件层** ← **配置系统** (Config + Schema)
- **服务层** ← **Git服务** + **存储系统** + **终端检测**
- **主题系统** ← **渲染器** (Classic/Powerline/Capsule)

### 关键设计模式
- **工厂模式**: `ComponentFactory` 负责组件实例创建
- **模板方法**: `BaseComponent` 提供统一渲染流程
- **策略模式**: 三级图标回退 (NerdFont → Emoji → Text)
- **门面模式**: `StatuslineGenerator` 统一外部接口

## 🛠 开发指南

### 添加新组件的完整步骤
1. 继承 `BaseComponent`，实现 `renderContent()`
2. 创建对应的 `ComponentFactory`
3. 在 `StatuslineGenerator.initializeComponents()` 中注册
4. 在 `src/config/schema.ts` 添加配置类型
5. 更新预设映射支持新组件

### 添加新主题
1. 在 `src/themes/types.ts` 定义配置
2. 创建渲染器类实现 `ThemeRenderer` 接口
3. 在 `src/themes/index.ts:createThemeRenderer()` 注册

### 三级图标系统实现
每个组件配置必须包含：
```typescript
{
  nerd_icon: string,    // Nerd Font图标
  emoji_icon: string,   // Emoji图标
  text_icon: string     // 文本回退
}
```

## 📁 重要文件路径
- 主入口: `src/index.ts`
- CLI入口: `src/cli/main.ts:64`
- 核心生成器: `src/core/generator.ts:29`
- 组件基类: `src/components/base.ts:34`
- 配置加载: `src/config/loader.ts`
- Git服务: `src/git/service.ts:39`
- 终端检测: `src/terminal/detector.ts:798`
- 主题引擎: `src/themes/engine.ts:14`
- 项目解析: `src/utils/project-resolver.ts`

## ⚠️ 开发注意事项

### 异步操作
- **存储操作必须await**: `await updateCostFromInput(data)`
- **组件渲染可能异步**: 特别是Usage和Branch组件

### 路径哈希一致性
- 所有模块必须使用 `projectResolver.hashPath()` 
- 位置: `src/utils/project-resolver.ts`

### 缓存系统
- Git操作缓存: 5秒TTL，通过 `cache_enabled` 控制
- 组件渲染频率: 300ms更新间隔

---
**版本**: v2.2.1 | **Node.js**: >=18.0.0 | **系统**: macOS/Linux/Windows