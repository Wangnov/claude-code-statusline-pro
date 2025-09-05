# 主题渲染器模块 | Theme Renderers Module

## 模块概述 | Module Overview

主题渲染器模块包含三套内置主题的具体渲染实现，每个渲染器负责将组件结果转换为特定主题风格的最终输出。

## 渲染器实现 | Renderer Implementations

### Classic 渲染器 | Classic Renderer
- **文件**: `classic.ts`
- **风格**: 简洁分隔符，经典终端风格
- **特点**: 
  - 使用简单的文本分隔符
  - 高度兼容各种终端环境
  - 轻量级渲染逻辑
  - 清晰的组件边界

### Powerline 渲染器 | Powerline Renderer
- **文件**: `powerline.ts`
- **风格**: 三角箭头无缝连接，现代化设计
- **特点**:
  - 使用 Powerline 字符（）创建无缝连接
  - 支持 24位真彩色背景渐变
  - 动态背景色计算和前景色自适应
  - 高度视觉化的现代外观

### Capsule 渲染器 | Capsule Renderer  
- **文件**: `capsule.ts`
- **风格**: 圆角胶囊设计，柔和美观
- **特点**:
  - 使用圆角字符创建胶囊效果
  - 每个组件独立显示
  - 柔和的视觉分离
  - 清新的现代设计

## 渲染器接口 | Renderer Interface

### 核心方法 | Core Methods
```typescript
interface ThemeRenderer {
  /** 渲染组件结果为最终字符串 */
  render(components: ComponentResult[], context: RenderContext): string;
  
  /** 获取渲染器名称 */
  getName(): string;
  
  /** 检查是否支持特定特性 */
  supportsFeature(feature: string): boolean;
}
```

### 渲染上下文 | Render Context
- `TerminalCapabilities` - 终端能力信息
- `StyleConfig` - 样式配置信息
- `ThemeConfig` - 主题配置信息
- 其他渲染所需的环境信息

## 渲染流程 | Rendering Flow

### 通用渲染流程 | Common Rendering Flow
1. **预处理**: 过滤和验证组件结果
2. **样式计算**: 根据主题配置计算样式
3. **内容渲染**: 将组件内容转换为主题风格
4. **后处理**: 应用全局样式和优化
5. **输出生成**: 生成最终的字符串输出

### Powerline 特殊处理 | Powerline Special Processing
1. **背景色计算**: 动态计算组件背景色
2. **箭头渲染**: 计算相邻组件的箭头颜色
3. **渐变处理**: 实现平滑的颜色过渡
4. **边界处理**: 处理首尾组件的特殊情况

## 开发指南 | Development Guide

### 实现新渲染器
```typescript
class CustomRenderer implements ThemeRenderer {
  getName(): string {
    return 'custom';
  }
  
  supportsFeature(feature: string): boolean {
    // 声明支持的特性
    return ['gradient', 'nerd_font'].includes(feature);
  }
  
  render(components: ComponentResult[], context: RenderContext): string {
    // 实现自定义渲染逻辑
    return components
      .filter(comp => comp.success && comp.content)
      .map(comp => this.renderComponent(comp, context))
      .join(' ');
  }
  
  private renderComponent(component: ComponentResult, context: RenderContext): string {
    // 组件级渲染逻辑
  }
}
```

### 扩展现有渲染器
1. 在对应的渲染器文件中添加新功能
2. 确保与现有渲染逻辑的兼容性
3. 添加新的配置选项支持
4. 更新特性支持声明

### 测试和调试
- 在不同终端环境中测试渲染效果
- 验证颜色和特殊字符的正确显示
- 测试极端情况和边界条件
- 确保渲染性能和内存效率

### 最佳实践
- 保持渲染器的职责单一和清晰
- 实现合理的降级和错误处理
- 优化渲染算法的性能
- 提供丰富的配置选项和灵活性