# 自定义组件开发目录

## 目录结构
- `DEVELOPMENT.md` - 组件开发详细指南
- `README.md` - 自定义组件使用说明
- `STDIN-DATA-GUIDE.md` - Claude Code 输入数据格式指南
- `examples/` - 组件示例目录
  - `clock/` - 时钟组件示例

## 开发自定义组件的核心步骤
1. 继承 `BaseComponent` 基类
2. 实现 `renderContent()` 方法
3. 创建对应的 `ComponentFactory`
4. 在配置系统中注册新组件类型
5. 更新Schema验证

## 重要接口
- `BaseComponent` - 位于 `src/components/base.ts`
- `Component` - 组件接口定义
- `ComponentFactory` - 工厂模式接口
- `ComponentConfig` - 组件配置接口

## 三级图标回退系统
自定义组件必须支持：
- `nerd_icon` - Nerd Font图标
- `emoji_icon` - Emoji图标  
- `text_icon` - 纯文本回退

## 集成到主系统
新组件需要在以下位置注册：
- `src/core/generator.ts` 的组件初始化
- `src/config/schema.ts` 的配置Schema
- 预设系统中的组件映射