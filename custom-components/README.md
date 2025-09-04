# 🧩 Custom Components | 自定义组件

欢迎来到 Claude Code Statusline Pro 的自定义组件目录！这里包含了组件示例、模板和开发文档。

## 📂 目录结构

```
custom-components/
├── README.md              # 本文档
├── DEVELOPMENT.md         # 详细的组件开发指南
├── examples/              # 组件示例
│   └── clock/            # 时钟组件示例
│       ├── clock.ts      # 组件源代码
│       ├── clock.config.toml  # 配置示例
│       └── README.md     # 组件说明文档
└── templates/            # 组件模板（待添加）
```

## 🚀 快速开始

### 1. 查看示例

查看 `examples/clock/` 目录中的时钟组件示例，这是一个完整的、可工作的自定义组件实现。

### 2. 创建你的组件

基于时钟组件示例，你可以快速创建自己的组件：

```bash
# 1. 复制时钟组件作为模板
cp -r examples/clock/ examples/my-component/

# 2. 修改组件代码
# 编辑 examples/my-component/my-component.ts

# 3. 测试组件
# 将组件复制到 src/components/ 并注册
```

### 3. 集成到项目

详细的集成步骤请参考 [DEVELOPMENT.md](./DEVELOPMENT.md)

## 📚 可用示例

### 🕐 Clock Component | 时钟组件
- **位置**: `examples/clock/`
- **功能**: 显示当前时间，支持多时区、日期显示、12/24小时制
- **难度**: ⭐ 简单
- **代码行数**: ~200行

### 更多示例即将推出...
- 📊 系统监控组件（CPU、内存、磁盘）
- 🌤️ 天气组件
- 📈 股票行情组件
- 🎵 音乐播放状态组件
- 📝 待办事项计数组件

## 🛠️ 开发资源

### 核心概念

1. **BaseComponent** - 所有组件的基类（`src/components/base.ts`）
2. **ComponentFactory** - 组件工厂接口
3. **ComponentRegistry** - 组件注册表
4. **RenderContext** - 渲染上下文，包含所有必要信息

### 必读文档

- [组件开发指南](./DEVELOPMENT.md) - 详细的开发文档
- [时钟组件README](./examples/clock/README.md) - 完整的示例说明
- [API参考](./DEVELOPMENT.md#api-reference) - API文档

## 💡 组件创意

需要灵感？这里有一些组件创意：

### 实用工具类
- **计时器组件** - 显示会话持续时间
- **文件计数器** - 显示编辑的文件数量
- **Git统计** - 显示今日提交数
- **网络状态** - 显示网络延迟/速度

### 信息展示类
- **IP地址** - 显示本机IP
- **Docker状态** - 显示容器运行状态
- **数据库连接** - 显示数据库状态
- **API健康检查** - 监控API状态

### 个性化类
- **励志名言** - 随机显示名言
- **番茄钟** - 工作/休息计时
- **习惯追踪** - 记录编码时长
- **心情指示器** - 基于提交信息分析

## 🤝 贡献指南

### 提交你的组件

1. Fork 本项目
2. 在 `examples/` 创建你的组件目录
3. 包含以下文件：
   - 组件源代码 (`.ts`)
   - 配置示例 (`.toml`)
   - README文档 (`.md`)
4. 提交 Pull Request

### 组件要求

✅ **必须**：
- 继承自 `BaseComponent`
- 实现 `renderContent` 方法
- 包含完整的类型定义
- 提供配置示例
- 编写README文档

🚫 **避免**：
- 不要修改核心组件代码
- 不要使用外部依赖（除非必要）
- 不要硬编码配置值
- 不要忽略错误处理

## 📄 组件模板

使用以下模板快速开始：

```typescript
import { BaseComponent, ComponentFactory, Component } from '../../src/components/base.js';
import type { ComponentConfig, RenderContext } from '../../src/config/schema.js';

// 扩展配置接口
interface MyComponentConfig extends ComponentConfig {
  // 添加自定义配置项
  custom_option?: string;
}

// 组件类
export class MyComponent extends BaseComponent {
  private myConfig: MyComponentConfig;
  
  constructor(name: string, config: MyComponentConfig) {
    super(name, config);
    this.myConfig = config;
  }

  protected renderContent(context: RenderContext): string | null {
    // 实现你的逻辑
    const data = "My Data";
    return this.formatOutput(data);
  }
}

// 工厂类
export class MyComponentFactory implements ComponentFactory {
  createComponent(name: string, config: ComponentConfig): Component {
    return new MyComponent(name, config as MyComponentConfig);
  }
  
  getSupportedTypes(): string[] {
    return ['mycomponent'];
  }
}

export default MyComponentFactory;
```

## 🐛 调试技巧

1. **使用CLI测试**: `npm run config` 然后选择"实时预览"
2. **查看日志**: 在 `renderContent` 中添加 `console.log`
3. **错误处理**: BaseComponent 会自动捕获错误
4. **性能监控**: 使用 `console.time` 测量渲染时间

## ❓ 常见问题

### Q: 组件没有显示？
A: 检查：
- 组件是否已注册（`src/core/generator.ts`）
- 配置中 `enabled` 是否为 `true`
- 预设字符串是否包含组件字母

### Q: 如何处理异步操作？
A: `renderContent` 支持返回 `Promise<string | null>`

### Q: 如何使用颜色？
A: 使用 `this.renderText(text)` 和 `this.renderIcon()` 自动应用颜色

### Q: 如何选择图标？
A: BaseComponent 自动处理三级图标选择（nerd → emoji → text）

## 📞 获取帮助

- 查看 [开发文档](./DEVELOPMENT.md)
- 参考 [时钟组件示例](./examples/clock/)
- 查看核心组件源码（`src/components/`）
- 提交 Issue 到项目仓库

## 📜 许可证

所有自定义组件示例采用 MIT 许可证，与主项目保持一致。

---

*Happy Coding! 🎉*

*最后更新: 2025-09-04*