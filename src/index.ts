/**
 * Claude Code Statusline Pro - 公共API导出
 * Enhanced statusline for Claude Code with TypeScript, live preview, and interactive configuration
 *
 * @version 2.0.0-beta.1
 * @author wangnov
 * @license MIT
 */

// 组件配置映射系统导出 (Component configuration mapping system exports)
export {
  ComponentConfigMapper,
  defaultComponentConfigMapper,
  formatComponentConfigSummary,
  getComponentConfigCategoriesCount,
  getComponentConfigItemCount,
  isValidComponent,
} from './cli/component-config-mapper.js';
export { ConfigEditor, createConfigEditor } from './cli/config-editor.js';
// 国际化系统导出 (I18n system exports)
export {
  getCurrentLanguage,
  getI18nManager,
  I18nManager,
  initializeI18n,
  setLanguage,
  t,
} from './cli/i18n.js';
// CLI 工具导出 (供高级用户使用)
export {
  CliMessageIconManager,
  formatCliMessage,
  formatLocalizedCliMessage,
  getCliIcon,
  getCliIconDescription,
  getCliIconManager,
  initializeCliIconManager,
} from './cli/message-icons.js';
export { MockDataGenerator, mockDataGenerator } from './cli/mock-data.js';
export { createLivePreviewEngine, LivePreviewEngine } from './cli/preview-engine.js';
// 组件系统导出
export { Component, ComponentFactory, ComponentRegistry } from './components/base.js';
export { BranchComponent, BranchComponentFactory } from './components/branch.js';
export { ModelComponent } from './components/model.js';
export { ProjectComponent } from './components/project.js';
export { StatusComponent } from './components/status.js';
export { TokensComponent } from './components/tokens.js';
// 配置系统导出
export { ConfigLoader } from './config/loader.js';

// 主题系统导出 | Theme system exports
export {
  BUILTIN_THEMES,
  CapsuleRenderer,
  ClassicRenderer,
  createThemeEngine,
  createThemeManager,
  createThemeRenderer,
  getBuiltinThemeNames,
  getThemeCompatibility,
  getThemeFeatures,
  isBuiltinTheme,
  migrateTemplates,
  PowerlineRenderer,
  ThemeEngine,
  ThemeManager,
  validateThemeConfig,
} from './themes/index.js';

export type {
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
} from './themes/types.js';

// 类型定义导出
import type { InputData } from './config/schema.js';

export type {
  SupportedLanguage,
  TranslationKeys,
  TranslationParams,
} from './cli/i18n.js';
// CLI和i18n类型导出
export type {
  CliIconMap,
  CliMessageIconOptions,
} from './cli/message-icons.js';
export type {
  ComponentConfig,
  ComponentMetadata,
  // 组件相关类型
  ComponentOptions,
  // 配置相关类型
  Config,
  ConfigEditorOptions,
  InputData,
  // CLI相关类型
  LivePreviewOptions,
  MockScenario,
  RenderContext,
  RenderOptions,
  StyleConfig,
} from './config/schema.js';
export * from './config/schema.js';
// 核心功能导出
export { StatuslineGenerator } from './core/generator.js';
export {
  getDebugInfo,
  mergeInputData,
  parseArguments,
  parseInput,
  parseJson,
  validate,
} from './core/parser.js';
export { ColorSystem, IconSystem, TerminalRenderer } from './terminal/colors.js';
// 终端系统导出
export { TerminalDetector } from './terminal/detector.js';

// 工具函数导出
export * from './utils/index.js';

/**
 * 版本信息
 */
export const VERSION = '2.0.0-beta.1';

/**
 * 默认导出 - 主要的StatuslineGenerator类
 */
export { StatuslineGenerator as default } from './core/generator.js';

/**
 * 快捷工厂函数 - 创建statusline生成器实例
 */
export async function createStatuslineGenerator(configPath?: string) {
  const { ConfigLoader } = await import('./config/loader.js');
  const { StatuslineGenerator } = await import('./core/generator.js');
  const loader = new ConfigLoader();
  const config = await loader.load(configPath);
  return new StatuslineGenerator(config);
}

/**
 * 快捷函数 - 直接生成statusline
 */
export async function generateStatusline(
  inputData: InputData,
  configPath?: string
): Promise<string> {
  const generator = await createStatuslineGenerator(configPath);
  return generator.generate(inputData);
}

/**
 * 类型保护函数 - 检查是否为有效的InputData
 */
export function isValidInputData(data: unknown): data is InputData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'model' in data &&
    typeof (data as Record<string, unknown>).model === 'object'
  );
}

/**
 * 工具函数 - 获取默认配置
 */
export async function getDefaultConfig(): Promise<Record<string, unknown>> {
  const { ConfigLoader } = await import('./config/loader.js');
  const loader = new ConfigLoader();
  return loader.getDefaultConfig();
}

/**
 * 工具函数 - 验证配置
 */
export async function validateConfig(_config: unknown): Promise<boolean> {
  try {
    const { ConfigLoader } = await import('./config/loader.js');
    const loader = new ConfigLoader();
    const result = await loader.validateConfig();
    return result.valid;
  } catch {
    return false;
  }
}
