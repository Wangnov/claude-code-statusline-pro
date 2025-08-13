/**
 * 主题系统导出 | Theme system exports
 * 统一导出所有主题相关功能 | Unified exports for all theme-related functionality
 */

// 核心类型 | Core types
export type {
  DeepClone,
  SeparatorConfig,
  ThemeApplicationResult,
  ThemeCompatibilityResult,
  ThemeConfig,
  ThemeFeatures,
  ThemeManagerOptions,
  ThemeRenderer,
  ThemesConfig,
  ThemeType,
  ValidationResult,
} from './types.js';

// 内置主题定义 | Builtin theme definitions
import { BUILTIN_THEMES } from './types.js';
export { BUILTIN_THEMES };

// 核心引擎 | Core engine
export { ThemeEngine } from './engine.js';

// 主题管理器 | Theme manager
export { ThemeManager } from './manager.js';
export { CapsuleRenderer } from './renderers/capsule.js';
// 渲染器 | Renderers
export { ClassicRenderer } from './renderers/classic.js';
export { PowerlineRenderer } from './renderers/powerline.js';

// 工厂函数 | Factory functions
import type { Config } from '../config/schema.js';
import type { TerminalCapabilities } from '../terminal/detector.js';
import { ThemeEngine } from './engine.js';
import { ThemeManager } from './manager.js';
import { CapsuleRenderer } from './renderers/capsule.js';
import { ClassicRenderer } from './renderers/classic.js';
import { PowerlineRenderer } from './renderers/powerline.js';
import type { ThemeManagerOptions } from './types.js';

/**
 * 创建主题管理器 | Create theme manager
 */
export function createThemeManager(
  baseConfig: Config,
  options?: ThemeManagerOptions
): ThemeManager {
  return new ThemeManager(baseConfig, options);
}

/**
 * 创建主题引擎 | Create theme engine
 */
export function createThemeEngine(customThemes?: import('./types.js').ThemesConfig): ThemeEngine {
  return new ThemeEngine(customThemes);
}

/**
 * 创建主题渲染器 | Create theme renderer
 */
export function createThemeRenderer(
  themeName: string,
  terminalRenderer?: import('../terminal/colors.js').TerminalRenderer
): import('./types.js').ThemeRenderer | null {
  switch (themeName.toLowerCase()) {
    case 'classic':
      return new ClassicRenderer(terminalRenderer);
    case 'powerline':
      return new PowerlineRenderer(terminalRenderer);
    case 'capsule':
      return new CapsuleRenderer(terminalRenderer);
    default:
      console.warn(`未知的主题渲染器: ${themeName} | Unknown theme renderer: ${themeName}`);
      return null;
  }
}

/**
 * 获取主题兼容性信息 | Get theme compatibility information
 */
export function getThemeCompatibility(
  themeName: string,
  capabilities: TerminalCapabilities
): import('./types.js').ThemeCompatibilityResult {
  const manager = new ThemeManager({} as Config);
  return manager.checkThemeCompatibility(themeName, capabilities);
}

/**
 * 验证主题配置 | Validate theme configuration
 */
export function validateThemeConfig(
  themeName: string,
  themeConfig: import('./types.js').ThemeConfig
): import('./types.js').ValidationResult {
  const manager = new ThemeManager({} as Config);
  return manager.validateThemeConfig(themeName, themeConfig);
}

/**
 * 获取所有内置主题名称 | Get all builtin theme names
 */
export function getBuiltinThemeNames(): string[] {
  return Object.keys(BUILTIN_THEMES);
}

/**
 * 检查是否为内置主题 | Check if is builtin theme
 */
export function isBuiltinTheme(themeName: string): boolean {
  return themeName in BUILTIN_THEMES;
}

/**
 * 获取主题特性信息 | Get theme features information
 */
export function getThemeFeatures(themeName: string): import('./types.js').ThemeFeatures | null {
  const themeConfig = BUILTIN_THEMES[themeName];
  if (!themeConfig) {
    return null;
  }

  return {
    requiresNerdFont: themeConfig.fine_progress || themeConfig.capsule_style,
    requiresColors: themeConfig.enable_gradient,
    supportsGradient: themeConfig.enable_gradient,
    customSeparators: themeConfig.ignore_separator,
  };
}

/**
 * 主题迁移工具函数 | Theme migration utility functions
 */

/**
 * 从templates迁移到themes | Migrate from templates to themes
 */
export function migrateTemplates(
  templates: Record<string, unknown>
): import('./types.js').ThemesConfig {
  const themes: import('./types.js').ThemesConfig = {};

  for (const [templateName, template] of Object.entries(templates)) {
    if (isInternalBuiltinTheme(templateName)) {
      // 类型安全检查：确保template是对象类型 | Type-safe check: ensure template is object type
      if (template && typeof template === 'object' && !Array.isArray(template)) {
        themes[templateName] = extractThemeConfig(template as Record<string, unknown>);
      }
    }
  }

  return themes;
}

/**
 * 检查是否为内置主题（内部使用） | Check if is builtin theme (internal use)
 */
function isInternalBuiltinTheme(name: string): boolean {
  return ['classic', 'powerline', 'capsule'].includes(name);
}

/**
 * 从模板配置中提取主题配置 | Extract theme config from template config
 */
function extractThemeConfig(template: Record<string, unknown>): import('./types.js').ThemeConfig {
  const config: import('./types.js').ThemeConfig = {
    enable_gradient: false,
    ignore_separator: false,
    fine_progress: false,
    capsule_style: false,
  };

  // 安全访问嵌套属性的辅助函数 | Helper function for safe nested property access
  const safeGet = (obj: unknown, path: string[]): unknown => {
    let current = obj;
    for (const key of path) {
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }
    return current;
  };

  // 检测是否启用渐变 | Detect if gradient is enabled
  const progressBarStyle = safeGet(template, ['components', 'tokens', 'progress_bar_style']);
  if (progressBarStyle === 'gradient') {
    config.enable_gradient = true;
  }

  // 检测是否忽略分隔符 | Detect if separator is ignored
  const enableSeparators = safeGet(template, ['style', 'enable_separators']);
  if (enableSeparators === false) {
    config.ignore_separator = true;
  }

  // 检测精细进度条 | Detect fine progress bar
  const nerdProgressChars = safeGet(template, ['components', 'tokens', 'nerd_progress_chars']);
  if (nerdProgressChars !== undefined && nerdProgressChars !== null) {
    config.fine_progress = true;
  }

  // 检测胶囊样式 | Detect capsule style
  const themeType = safeGet(template, ['style', 'theme', 'type']);
  if (themeType === 'capsule') {
    config.capsule_style = true;
  }

  return config;
}

/**
 * 默认导出：主题系统门面 | Default export: theme system facade
 */
export default {
  // 工厂函数 | Factory functions
  createThemeManager,
  createThemeEngine,
  createThemeRenderer,

  // 工具函数 | Utility functions
  getThemeCompatibility,
  validateThemeConfig,
  getBuiltinThemeNames,
  isBuiltinTheme,
  getThemeFeatures,

  // 迁移工具 | Migration utilities
  migrateTemplates,

  // 内置主题 | Builtin themes
  BUILTIN_THEMES,
};
