/**
 * Claude Code Statusline Pro - 编辑器模块导出 | Editors Module Exports
 * 统一导出所有编辑器相关的类型、接口和实现
 *
 * @author Claude Code Team
 * @version 2.0.0
 */

// 基础编辑器类和接口
export { BaseEditor, type EditorContext } from './base-editor.js';

// 编辑器类型定义
export {
  // 回调函数类型
  type EditorCallback,
  type EditorConfig,
  type EditorEvent,
  type EditorEventHandler,
  type EditorOptions,
  type EditorResult,
  EditorState,
  // 枚举类型
  EditorType,
  type EditorValidator,
  type InputField,
  type SelectionItem,
  type ValidationError,
  // 接口定义
  type ValidationResult,
  type ValidationRule,
  type ValidationWarning,
} from './types.js';
