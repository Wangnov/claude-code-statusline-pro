/**
 * 实时预览选择器组件模块
 * 导出所有相关的类型、函数和组件
 */

// 示例和使用方法
export {
  exampleCustomSelector,
  exampleLanguageSelection,
  exampleThemeSelection,
  exampleWithPreviewEngine,
  runAllExamples,
} from './example-usage.js';
// 集成配置类型
export type { IntegrationConfig } from './integration.js';

// 集成模块
export {
  createIntegration,
  initializeIntegratedSelectors,
  RealTimePreviewSelectorIntegration,
} from './integration.js';
// 类型定义
export type {
  Choice,
  PreviewCallback,
  RealTimePreviewSelectorConfig,
} from './realtime-preview-selector.js';
// 主要组件
export {
  createLanguageSelector,
  createSelector,
  createThemeSelector,
  realTimePreviewSelector,
  select,
} from './realtime-preview-selector.js';
