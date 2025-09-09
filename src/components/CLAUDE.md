# 组件模块

## 核心文件
- `base.ts` - BaseComponent抽象基类，所有组件的父类 (290行)
- `project.ts` - 项目组件，显示项目名 (53行)
- `model.ts` - 模型组件，显示Claude模型信息 (141行)
- `branch.ts` - Git分支组件，最复杂的组件 (735行)
- `tokens.ts` - Token使用量组件，支持渐变进度条 (496行)
- `usage.ts` - 使用成本组件，Session级统计 (233行)
- `status.ts` - Claude状态组件 (415行)
- `fake.ts` - 兼容性组件，修复终端显示问题 (57行)

## Widget子系统 🆕
- `widgets/base-widget.ts` - Widget基类，支持Detection和Force控制 (367行)
- `widgets/api-widget.ts` - API数据获取Widget，支持HTTP请求 (274行)
- `widgets/static-widget.ts` - 静态内容Widget (47行)
- `widgets/widget-factory.ts` - Widget工厂，负责Widget创建 (94行)

## BaseComponent基类 (base.ts:34)

### 核心接口
```typescript
abstract class BaseComponent implements Component {
  abstract renderContent(context: RenderContext): string | null
  render(context: RenderContext): ComponentResult | Promise<ComponentResult>
  protected selectIcon(): string           // 三级图标选择逻辑
  get enabled(): boolean                   // 组件启用状态
}
```

### 三级图标系统 (base.ts:105)
```typescript
protected selectIcon(): string {
  // 1. 强制文本模式
  if (forceText) return this.config.text_icon || '';
  
  // 2. 强制/检测 Nerd Font
  if ((forceNerdFont || this.capabilities.nerdFont) && this.config.nerd_icon) {
    return this.config.nerd_icon;
  }
  
  // 3. 检测 Emoji 支持
  if (this.capabilities.emoji && this.config.emoji_icon) {
    return this.config.emoji_icon;
  }
  
  // 4. 文本回退
  return this.config.text_icon || '';
}
```

## 组件工厂模式

每个组件都有对应的Factory类：
```typescript
export class ProjectComponentFactory implements ComponentFactory {
  create(name: string, config: ComponentConfig): Component {
    return new ProjectComponent(name, config as ProjectComponentConfig);
  }
}
```

在`StatuslineGenerator.initializeComponents()`中注册：
```typescript
this.componentRegistry.register('project', new ProjectComponentFactory());
this.componentRegistry.register('model', new ModelComponentFactory());
// ... 其他组件
```

## 各组件特点

### Project组件 (project.ts:29)
- 显示项目目录名称
- 支持路径截断和省略
- 可配置是否显示空项目

### Model组件 (model.ts:49)
- 显示Claude模型信息
- 支持自定义模型名称映射
- 处理display_name和id字段

### Branch组件 (branch.ts:142)
- 最复杂的组件，支持多种Git操作
- 集成GitService，支持缓存
- 支持分支状态显示（clean、dirty、ahead、behind等）
- 分支名简化和截断

### Tokens组件 (tokens.ts:65)
- Token使用情况显示
- RGB渐变进度条
- 支持输入/输出Token分别显示
- 百分比计算和格式化

### Usage组件 (usage.ts:155)
- Session级成本统计
- 依赖StorageManager进行数据持久化
- 支持对话成本累加显示
- 异步渲染，需要await

### Status组件 (status.ts:39)
- Claude会话状态解析
- 支持thinking、error、complete等状态
- 状态图标和文本显示

### Fake组件 (fake.ts:18)
- 解决某些终端首字符变暗问题
- 输出不可见字符进行修复
- 简单的兼容性组件

## 开发新组件步骤
1. 继承`BaseComponent`，实现`renderContent()`抽象方法
2. 创建对应的`ComponentFactory`类
3. 在`StatuslineGenerator.initializeComponents()`中注册
4. 在`src/config/schema.ts`中添加组件配置类型
5. 在配置文件中添加三级图标配置（nerd_icon, emoji_icon, text_icon）

## 重要注意事项
- **异步渲染**: Usage和Branch组件可能异步，需要Promise支持
- **错误处理**: 组件渲染失败应返回`{success: false, error: string}`
- **缓存优化**: Git操作使用5秒缓存，避免频繁调用
- **终端兼容**: 始终实现三级图标回退机制