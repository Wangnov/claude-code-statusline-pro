/**
 * Claude Code Statusline Pro - 编辑器类型定义 | Editor Type Definitions
 * 定义编辑器模块的共享类型和接口
 *
 * 特性 | Features:
 * - 统一的类型定义和枚举
 * - 验证结果和选项接口
 * - 编辑器状态管理类型
 * - 可扩展的配置项定义
 *
 * @author Claude Code Team
 * @version 2.0.0
 */

/**
 * 编辑器类型枚举 | Editor type enumeration
 */
export enum EditorType {
  /** 组件配置编辑器 | Component configuration editor */
  COMPONENT = 'component',

  /** 主题配置编辑器 | Theme configuration editor */
  THEME = 'theme',

  /** 终端配置编辑器 | Terminal configuration editor */
  TERMINAL = 'terminal',

  /** 全局配置编辑器 | Global configuration editor */
  GLOBAL = 'global',
}

/**
 * 编辑器状态枚举 | Editor state enumeration
 */
export enum EditorState {
  /** 初始化中 | Initializing */
  INITIALIZING = 'initializing',

  /** 运行中 | Running */
  RUNNING = 'running',

  /** 暂停 | Paused */
  PAUSED = 'paused',

  /** 完成 | Completed */
  COMPLETED = 'completed',

  /** 错误 | Error */
  ERROR = 'error',
}

/**
 * 验证结果接口 | Validation result interface
 */
export interface ValidationResult {
  /** 验证是否通过 | Whether validation passed */
  valid: boolean;

  /** 错误列表 | List of errors */
  errors: ValidationError[];

  /** 警告列表 | List of warnings */
  warnings: ValidationWarning[];

  /** 修复建议 | Fix suggestions */
  suggestions?: string[];
}

/**
 * 验证错误接口 | Validation error interface
 */
export interface ValidationError {
  /** 错误代码 | Error code */
  code: string;

  /** 错误消息 | Error message */
  message: string;

  /** 错误路径 | Error path */
  path?: string;

  /** 严重程度 | Severity level */
  severity: 'error' | 'warning';
}

/**
 * 验证警告接口 | Validation warning interface
 */
export interface ValidationWarning {
  /** 警告代码 | Warning code */
  code: string;

  /** 警告消息 | Warning message */
  message: string;

  /** 警告路径 | Warning path */
  path?: string;
}

/**
 * 编辑器选项接口 | Editor options interface
 */
export interface EditorOptions {
  /** 编辑器类型 | Editor type */
  type: EditorType;

  /** 是否显示帮助信息 | Whether to show help information */
  showHelp?: boolean;

  /** 是否启用预览模式 | Whether to enable preview mode */
  enablePreview?: boolean;

  /** 是否自动保存 | Whether to auto-save */
  autoSave?: boolean;

  /** 自动保存间隔（毫秒） | Auto-save interval in milliseconds */
  autoSaveInterval?: number;

  /** 是否在退出时确认 | Whether to confirm on exit */
  confirmOnExit?: boolean;

  /** 初始焦点目标 | Initial focus target */
  initialFocus?: string;

  /** 自定义样式 | Custom styles */
  customStyles?: Record<string, string>;

  /** 调试模式 | Debug mode */
  debug?: boolean;
}

/**
 * 选择项接口 | Selection item interface
 */
export interface SelectionItem<T = unknown> {
  /** 显示标签 | Display label */
  label: string;

  /** 项目值 | Item value */
  value: T;

  /** 描述信息 | Description */
  description?: string;

  /** 是否禁用 | Whether disabled */
  disabled?: boolean;

  /** 是否选中 | Whether selected */
  selected?: boolean;

  /** 图标 | Icon */
  icon?: string;

  /** 快捷键 | Shortcut key */
  shortcut?: string;
}

/**
 * 输入字段接口 | Input field interface
 */
export interface InputField {
  /** 字段名称 | Field name */
  name: string;

  /** 字段标签 | Field label */
  label: string;

  /** 字段类型 | Field type */
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect';

  /** 当前值 | Current value */
  value: unknown;

  /** 默认值 | Default value */
  defaultValue?: unknown;

  /** 是否必填 | Whether required */
  required?: boolean;

  /** 验证规则 | Validation rules */
  validation?: ValidationRule[];

  /** 占位符文本 | Placeholder text */
  placeholder?: string;

  /** 帮助文本 | Help text */
  help?: string;

  /** 选项列表（用于select类型） | Options list (for select type) */
  options?: SelectionItem[];
}

/**
 * 验证规则接口 | Validation rule interface
 */
export interface ValidationRule {
  /** 规则类型 | Rule type */
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'range' | 'custom';

  /** 规则参数 | Rule parameters */
  params?: Record<string, unknown>;

  /** 错误消息 | Error message */
  message: string;

  /** 自定义验证函数 | Custom validation function */
  validator?: (value: unknown) => boolean;
}

/**
 * 编辑器事件接口 | Editor event interface
 */
export interface EditorEvent {
  /** 事件类型 | Event type */
  type: string;

  /** 事件时间戳 | Event timestamp */
  timestamp: number;

  /** 事件数据 | Event data */
  data?: Record<string, unknown>;

  /** 事件源 | Event source */
  source?: string;
}

/**
 * 编辑器回调函数类型 | Editor callback function types
 */
export type EditorCallback<T = unknown> = (result: T) => void | Promise<void>;
export type EditorEventHandler = (event: EditorEvent) => void | Promise<void>;
export type EditorValidator<T = unknown> = (
  value: T
) => ValidationResult | Promise<ValidationResult>;

/**
 * 编辑器配置接口 | Editor configuration interface
 */
export interface EditorConfig {
  /** 编辑器选项 | Editor options */
  options: EditorOptions;

  /** 输入字段列表 | Input fields list */
  fields: InputField[];

  /** 事件处理器 | Event handlers */
  handlers?: Record<string, EditorEventHandler>;

  /** 验证器 | Validators */
  validators?: Record<string, EditorValidator>;

  /** 样式配置 | Style configuration */
  styles?: Record<string, string>;

  /** 本地化配置 | Localization configuration */
  i18n?: Record<string, string>;
}

/**
 * 编辑器结果接口 | Editor result interface
 */
export interface EditorResult<T = unknown> {
  /** 操作是否成功 | Whether operation succeeded */
  success: boolean;

  /** 结果数据 | Result data */
  data?: T;

  /** 错误信息 | Error message */
  error?: string;

  /** 操作类型 | Operation type */
  operation: 'save' | 'cancel' | 'reset' | 'validate';

  /** 修改的字段 | Modified fields */
  modifiedFields?: string[];

  /** 验证结果 | Validation result */
  validation?: ValidationResult;
}
