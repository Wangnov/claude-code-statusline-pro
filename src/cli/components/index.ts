/**
 * 实时预览选择器组件模块
 * 导出所有相关的类型、函数和组件
 */

// 主要组件
export {
  realTimePreviewSelector,
  createThemeSelector,
  createLanguageSelector,
  createSelector,
  select,
} from './realtime-preview-selector.js';

// 类型定义
export type {
  Choice,
  PreviewCallback,
  RealTimePreviewSelectorConfig,
} from './realtime-preview-selector.js';

// 集成模块
export {
  RealTimePreviewSelectorIntegration,
  createIntegration,
  initializeIntegratedSelectors,
} from './integration.js';

// 集成配置类型
export type {
  IntegrationConfig,
} from './integration.js';

// 示例和使用方法
export {
  exampleThemeSelection,
  exampleLanguageSelection,
  exampleCustomSelector,
  exampleWithPreviewEngine,
  runAllExamples,
} from './example-usage.js';