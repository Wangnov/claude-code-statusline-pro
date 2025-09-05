# 主题模块

## 核心文件
- `engine.ts` - ThemeEngine类，主题配置应用和特性处理 (274行)
- `manager.ts` - ThemeManager类，主题切换、验证和兼容性检查 (322行)
- `index.ts` - 主题模块导出和工厂函数 (238行)
- `types.ts` - 主题类型定义和内置主题配置 (162行)
- `renderers/` - 三个主题渲染器实现

## 主题引擎 (engine.ts:14)

### 主要接口
```typescript
class ThemeEngine {
  constructor(customThemes?: ThemesConfig)
  applyTheme(baseConfig: Config, themeName: string): ThemeApplicationResult
  getThemeConfig(themeName: string): ThemeConfig | null
  hasTheme(themeName: string): boolean
  registerTheme(name: string, config: ThemeConfig): void
}
```

### 主题配置应用
```typescript
// 主题特性应用流程
private applyThemeFeatures(config: Config, theme: ThemeConfig): void {
  if (theme.enable_gradient) this.enableGradientFeatures(config);
  if (theme.ignore_separator) this.configureIgnoreSeparator(config); 
  if (theme.fine_progress) this.configureFineProgress(config);
  if (theme.capsule_style) this.configureCapsuleStyle(config);
}
```

## 主题管理器 (manager.ts:21)

### 主要接口
```typescript
class ThemeManager {
  constructor(baseConfig: Config, options?: ThemeManagerOptions)
  switchTheme(themeName: string): ThemeApplicationResult        // 切换主题
  checkThemeCompatibility(themeName: string, capabilities: TerminalCapabilities): ThemeCompatibilityResult
  validateThemeConfig(themeName: string, themeConfig: ThemeConfig): ValidationResult
  registerCustomTheme(name: string, config: ThemeConfig): ValidationResult
}
```

### 兼容性检查
- **Nerd Font要求**: fine_progress和capsule_style需要Nerd Font支持
- **颜色支持**: enable_gradient需要颜色终端
- **终端能力**: 自动检查并提供回退建议

## 内置主题配置 (types.ts:39)

### 三个内置主题
```typescript
const BUILTIN_THEMES = {
  classic: {
    enable_gradient: false,
    ignore_separator: false, 
    fine_progress: false,
    capsule_style: false
  },
  
  powerline: {
    enable_gradient: true,
    ignore_separator: true,
    fine_progress: true,
    capsule_style: false
  },
  
  capsule: {
    enable_gradient: true,
    ignore_separator: true,
    fine_progress: true,
    capsule_style: true
  }
};
```

### 主题特性说明
- **enable_gradient**: 启用Token组件的RGB渐变进度条
- **ignore_separator**: 清空常规分隔符，使用渲染器特殊分隔符
- **fine_progress**: 精细进度条，使用八分之一精度字符
- **capsule_style**: 胶囊样式，升级组件颜色为bright_*版本

## 渲染器系统

### 渲染器文件
- `renderers/classic.ts` - Classic主题渲染器 (115行)
- `renderers/powerline.ts` - Powerline主题渲染器 (406行) 
- `renderers/capsule.ts` - Capsule主题渲染器 (383行)

### 渲染器接口
```typescript
interface ThemeRenderer {
  renderStatusline(components: string[], colors: string[], config: Config): string
}
```

### 渲染器特点
1. **ClassicRenderer**: 
   - 使用简单文本分隔符连接组件
   - 高兼容性，支持所有终端

2. **PowerlineRenderer**:
   - 使用三角箭头字符 (`\uE0B0`, `\uE0B2`) 创建无缝连接
   - 支持24位真彩色背景渐变
   - 动态背景色计算

3. **CapsuleRenderer**:
   - 使用半圆字符 (`\uE0B6`, `\uE0B4`) 创建胶囊效果
   - 每个组件独立包装
   - 支持Nerd Font和ASCII回退

## 工厂函数 (index.ts:65)

### 核心工厂方法
```typescript
// 创建主题渲染器
function createThemeRenderer(
  themeName: string, 
  terminalRenderer?: TerminalRenderer
): ThemeRenderer | null

// 创建主题管理器  
function createThemeManager(
  baseConfig: Config,
  options?: ThemeManagerOptions
): ThemeManager
```

## 使用方式
```typescript
import { createThemeManager, createThemeRenderer } from '../themes/index.js';

// 1. 创建主题管理器
const themeManager = createThemeManager(config);

// 2. 切换主题
const result = themeManager.switchTheme('powerline');

// 3. 创建渲染器
const renderer = createThemeRenderer('powerline', terminalRenderer);

// 4. 渲染输出
const output = renderer.renderStatusline(components, colors, config);
```

## 重要特性
- **主题隔离**: 每个主题有独立的配置和渲染逻辑
- **动态切换**: 运行时切换主题无需重启
- **兼容性检查**: 自动检查终端能力并提供回退方案
- **自定义扩展**: 支持用户自定义主题注册
- **配置验证**: 严格的主题配置验证和错误处理

## 核心依赖
- **StatuslineGenerator** (`src/core/generator.ts:36`) 使用ThemeEngine.applyThemeFeatures()
- **TerminalRenderer** (`src/terminal/colors.js`) 提供颜色和图标支持
- **ComponentResult** 组件渲染结果作为渲染器输入

## 主题迁移
```typescript
// 从旧template系统迁移到新themes系统
function migrateTemplates(templates: Record<string, unknown>): ThemesConfig
```

## 验证规则
- **主题名称**: 必须以字母开头，只能包含字母、数字和下划线
- **特性依赖**: fine_progress/capsule_style需要Nerd Font支持
- **一致性检查**: fine_progress通常与enable_gradient一起使用