import { z } from 'zod';

// ==================== Transcript 相关类型 ====================

/**
 * Token使用信息模式 | Token usage info schema
 */
export const UsageInfoSchema = z.object({
  input_tokens: z.number(),
  cache_creation_input_tokens: z.number(),
  cache_read_input_tokens: z.number(),
  output_tokens: z.number(),
});

export type UsageInfo = z.infer<typeof UsageInfoSchema>;

/**
 * Transcript条目模式 | Transcript entry schema
 */
export const TranscriptEntrySchema = z
  .object({
    type: z.string(),
    message: z
      .object({
        usage: UsageInfoSchema.optional(),
        stop_reason: z.string().optional(),
        content: z.array(z.unknown()).optional(),
      })
      .optional(),
  })
  .passthrough();

export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

// ==================== 基础配置类型 ====================

/**
 * 颜色枚举 | Color enum
 * 支持标准终端颜色和亮色变体 | Supports standard terminal colors and bright variants
 */
const ColorSchema = z.enum([
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'gray',
  'bright_red',
  'bright_green',
  'bright_yellow',
  'bright_blue',
  'bright_magenta',
  'bright_cyan',
  'bright_white',
]);

/**
 * 自动检测选项 | Auto detection option
 * 支持布尔值或'auto'字符串 | Supports boolean or 'auto' string
 */
const AutoDetectSchema = z.union([z.boolean(), z.literal('auto')]);

// ==================== 新增：终端能力配置 ====================

/**
 * 终端能力强制配置 | Terminal capability override config
 * 用于强制指定终端显示能力，覆盖自动检测结果 | Force terminal display capabilities, overriding auto-detection
 */
const TerminalSchema = z.object({
  /** 强制启用Nerd Font图标 | Force enable Nerd Font icons */
  force_nerd_font: z.boolean().default(false),
  /** 强制启用Emoji图标 | Force enable Emoji icons */
  force_emoji: z.boolean().default(false),
  /** 强制启用文本图标 | Force enable text icons */
  force_text: z.boolean().default(false),
});

// ==================== 扩展：样式配置 ====================

/**
 * 样式配置 | Style config
 * 包含分隔符、颜色和显示控制 | Contains separator, color and display controls
 */
const StyleSchema = z.object({
  /** 组件间分隔符 | Component separator */
  separator: z.string().default(' | '),
  /** 启用颜色显示 | Enable color display */
  enable_colors: AutoDetectSchema.default('auto'),
  /** 启用表情符号显示 | Enable emoji display */
  enable_emoji: AutoDetectSchema.default('auto'),
  /** 启用Nerd Font图标显示 | Enable Nerd Font icon display */
  enable_nerd_font: AutoDetectSchema.default('auto'),
  /** 分隔符颜色 | Separator color (新增) */
  separator_color: ColorSchema.default('white'),
  /** 分隔符前空格 | Space before separator (新增) */
  separator_before: z.string().default(' '),
  /** 分隔符后空格 | Space after separator (新增) */
  separator_after: z.string().default(' '),
  /** 紧凑模式 | Compact mode */
  compact_mode: z.boolean().default(false),
  /** 最大宽度限制 | Maximum width limit */
  max_width: z.number().min(0).default(0),
});

// ==================== 重构：基础组件配置 ====================

/**
 * 基础组件配置 | Base component config
 * 支持图标色和文字色分离 | Supports separate icon and text colors
 */
const BaseComponentSchema = z.object({
  /** 是否启用该组件 | Whether to enable this component */
  enabled: z.boolean().default(true),
  /** 图标颜色 | Icon color (重命名，原color) */
  icon_color: ColorSchema.default('white'),
  /** 文字颜色 | Text color (新增) */
  text_color: ColorSchema.default('white'),
  /** Emoji图标 | Emoji icon (重命名，原icon) */
  emoji_icon: z.string(),
  /** Nerd Font图标 | Nerd Font icon */
  nerd_icon: z.string().optional(),
  /** 文本图标 | Text icon */
  text_icon: z.string().optional(),
});

// ==================== 组件配置定义 ====================

/**
 * 项目组件配置 | Project component config
 */
export const ProjectComponentSchema = BaseComponentSchema.extend({
  /** 项目名为空时是否显示 | Show when project name is empty */
  show_when_empty: z.boolean().default(false),
});

/**
 * 模型组件配置 | Model component config
 */
export const ModelComponentSchema = BaseComponentSchema.extend({
  /** 显示模型全名 | Show full model name */
  show_full_name: z.boolean().default(false),
  /** 自定义模型名映射 | Custom model name mapping (重命名，原custom_names) */
  mapping: z.record(z.string(), z.string()).default({}),
});

/**
 * 分支组件配置 | Branch component config
 */
export const BranchComponentSchema = BaseComponentSchema.extend({
  /** 无Git仓库时是否显示 | Show when not in Git repository */
  show_when_no_git: z.boolean().default(false),
  /** 分支名最大长度 | Maximum length of branch name */
  max_length: z.number().min(1).default(20),
});

// ==================== Token阈值和颜色配置 ====================

/**
 * Token阈值配置 | Token threshold config
 */
const TokenThresholdsSchema = z.object({
  /** 警告阈值 | Warning threshold */
  warning: z.number().min(0).max(100).default(60),
  /** 危险阈值 | Danger threshold */
  danger: z.number().min(0).max(100).default(85),
  /** 后备区域阈值 | Backup area threshold */
  backup: z.number().min(0).max(100).default(85),
  /** 临界阈值 | Critical threshold */
  critical: z.number().min(0).max(100).default(95),
});

/**
 * Token颜色配置 | Token color config
 */
const TokenColorsSchema = z.object({
  /** 安全状态颜色 | Safe state color */
  safe: ColorSchema.default('green'),
  /** 警告状态颜色 | Warning state color */
  warning: ColorSchema.default('yellow'),
  /** 危险状态颜色 | Danger state color */
  danger: ColorSchema.default('red'),
});

// ==================== 重构：Token状态图标三级嵌套结构 ====================

/**
 * Token状态图标三级嵌套配置 | Token status icons nested config
 * 支持emoji、nerd、text三种图标类型 | Supports emoji, nerd, text icon types
 */
const TokenStatusIconsNestedSchema = z.object({
  /** Emoji图标 | Emoji icons */
  emoji: z.object({
    backup: z.string().default('⚡'),
    critical: z.string().default('🔥'),
  }),
  /** Nerd Font图标 | Nerd Font icons */
  nerd: z.object({
    backup: z.string().default(''),
    critical: z.string().default(''),
  }),
  /** 文本图标 | Text icons */
  text: z.object({
    backup: z.string().default('[!]'),
    critical: z.string().default('[X]'),
  }),
});

/**
 * Token组件配置 | Token component config
 */
export const TokenComponentSchema = BaseComponentSchema.extend({
  /** 显示彩色渐变进度条 | Show gradient progress bar (新增) */
  show_gradient: z.boolean().default(false),
  /** 显示进度条 | Show progress bar */
  show_progress_bar: z.boolean().default(true),
  /** 显示百分比 | Show percentage */
  show_percentage: z.boolean().default(true),
  /** 显示原始数字 | Show raw numbers */
  show_raw_numbers: z.boolean().default(false),
  /** 进度条宽度 | Progress bar width (重命名，原progress_bar_width) */
  progress_width: z.number().default(15),
  /** 进度条字符配置 | Progress bar characters */
  progress_bar_chars: z
    .object({
      filled: z.string().default('█'),
      empty: z.string().default('░'),
      backup: z.string().default('▓'),
    })
    .optional(),
  /** Token颜色配置 | Token colors */
  colors: TokenColorsSchema.optional(),
  /** Token阈值配置 | Token thresholds */
  thresholds: TokenThresholdsSchema.optional(),
  /** 状态图标三级嵌套配置 | Status icons nested config (重构) */
  status_icons: TokenStatusIconsNestedSchema.optional(),
  /** 上下文窗口大小映射 | Context window size mapping (新增) */
  context_windows: z.record(z.string(), z.number()).default({
    default: 200000,
  }),
});

// ==================== 重构：状态组件三级嵌套结构 ====================

/**
 * 状态图标三级嵌套配置 | Status icons nested config
 */
const StatusIconsNestedSchema = z.object({
  /** Emoji图标 | Emoji icons */
  emoji: z.object({
    ready: z.string().default('✅'),
    thinking: z.string().default('💭'),
    tool: z.string().default('🔧'),
    error: z.string().default('❌'),
    warning: z.string().default('⚠️'),
  }),
  /** Nerd Font图标 | Nerd Font icons */
  nerd: z.object({
    ready: z.string().default(''),
    thinking: z.string().default(''),
    tool: z.string().default(''),
    error: z.string().default(''),
    warning: z.string().default(''),
  }),
  /** 文本图标 | Text icons */
  text: z.object({
    ready: z.string().default('[OK]'),
    thinking: z.string().default('[...]'),
    tool: z.string().default('[TOOL]'),
    error: z.string().default('[ERR]'),
    warning: z.string().default('[WARN]'),
  }),
});

/**
 * 状态颜色配置 | Status color config
 */
const StatusColorsSchema = z.object({
  ready: ColorSchema.default('green'),
  thinking: ColorSchema.default('yellow'),
  tool: ColorSchema.default('blue'),
  error: ColorSchema.default('red'),
  warning: ColorSchema.default('yellow'),
});

/**
 * 状态组件配置 | Status component config
 */
export const StatusComponentSchema = BaseComponentSchema.extend({
  /** 显示最近错误 | Show recent errors */
  show_recent_errors: z.boolean().default(true),
  /** 状态图标三级嵌套配置 | Status icons nested config (重构) */
  icons: StatusIconsNestedSchema.optional(),
  /** 状态颜色配置 | Status colors */
  colors: StatusColorsSchema.optional(),
});

// ==================== 组件配置集合 ====================

/**
 * 组件配置集合 | Components config collection
 */
const ComponentsSchema = z.object({
  /** 组件显示顺序 | Component display order */
  order: z.array(z.string()).default(['project', 'model', 'branch', 'tokens', 'status']),
  /** 项目组件配置 | Project component config */
  project: ProjectComponentSchema.optional(),
  /** 模型组件配置 | Model component config */
  model: ModelComponentSchema.optional(),
  /** 分支组件配置 | Branch component config */
  branch: BranchComponentSchema.optional(),
  /** Token组件配置 | Token component config */
  tokens: TokenComponentSchema.optional(),
  /** 状态组件配置 | Status component config */
  status: StatusComponentSchema.optional(),
});

// ==================== 简化：主题配置系统 ====================

/**
 * 主题配置 | Theme config
 * 简化的主题配置，替代复杂的templates结构 | Simplified theme config, replacing complex templates structure
 */
const ThemeConfigSchema = z.object({
  /** 启用彩色渐变 | Enable gradient colors */
  enable_gradient: z.boolean().default(false),
  /** 忽略分隔符设置 | Ignore separator settings */
  ignore_separator: z.boolean().default(false),
  /** 精细进度条 | Fine-grained progress bar */
  fine_progress: z.boolean().default(false),
  /** 胶囊样式 | Capsule style */
  capsule_style: z.boolean().default(false),
});

/**
 * 主题集合配置 | Themes collection config
 */
const ThemesSchema = z
  .object({
    /** Classic主题配置 | Classic theme config */
    classic: ThemeConfigSchema.optional(),
    /** Powerline主题配置 | Powerline theme config */
    powerline: ThemeConfigSchema.optional(),
    /** Capsule主题配置 | Capsule theme config */
    capsule: ThemeConfigSchema.optional(),
  })
  .optional();

// ==================== 高级配置 ====================

/**
 * 高级配置 | Advanced config
 */
const AdvancedSchema = z.object({
  /** 启用缓存 | Enable cache */
  cache_enabled: z.boolean().default(true),
  /** 最近错误条数 | Recent error count */
  recent_error_count: z.number().min(1).default(5),
  /** Git命令超时 | Git command timeout */
  git_timeout: z.number().min(100).default(1000),
  /** 自定义颜色代码 | Custom color codes */
  custom_color_codes: z.record(z.string(), z.string()).default({}),
});

/**
 * 实验性配置 | Experimental config
 */
const ExperimentalSchema = z
  .object({
    /** 启用实验性功能 | Enable experimental features */
    enable_experimental: z.boolean().default(false),
  })
  .optional();

// ==================== 预设映射配置 ====================

/**
 * 预设映射配置 | Preset mapping config
 */
const PresetMappingSchema = z
  .object({
    P: z.literal('project'),
    M: z.literal('model'),
    B: z.literal('branch'),
    T: z.literal('tokens'),
    S: z.literal('status'),
  })
  .default({
    P: 'project',
    M: 'model',
    B: 'branch',
    T: 'tokens',
    S: 'status',
  });

// ==================== 主配置Schema ====================

/**
 * 主配置Schema | Main config schema
 */
export const ConfigSchema = z
  .object({
    /** 预设配置 | Preset configuration */
    preset: z.string().default('PMBTS'),
    /** 主题名称 | Theme name */
    theme: z.enum(['classic', 'powerline', 'capsule']).default('classic'),
    /** 调试模式 | Debug mode (移动自advanced) */
    debug: z.boolean().default(false),
    /** 终端能力配置 | Terminal capabilities config (新增) */
    terminal: TerminalSchema.optional(),
    /** 样式配置 | Style config (扩展) */
    style: StyleSchema.optional(),
    /** 主题集合配置 | Themes config (新增，替代templates) */
    themes: ThemesSchema,
    /** 组件配置 | Components config (重构) */
    components: ComponentsSchema.optional(),
    /** 预设映射配置 | Preset mapping config */
    preset_mapping: PresetMappingSchema.optional(),
    /** 高级配置 | Advanced config (简化) */
    advanced: AdvancedSchema.optional(),
    /** 实验性配置 | Experimental config (新增) */
    experimental: ExperimentalSchema,
  })
  .passthrough(); // 允许额外字段 | Allow additional fields

// ==================== 输入数据Schema ====================

/**
 * 输入数据Schema | Input data schema
 * 支持Claude Code官方输入格式 | Supports Claude Code official input format
 */
export const InputDataSchema = z
  .object({
    /** 钩子事件名 | Hook event name (支持两种格式) */
    hook_event_name: z.string().optional(),
    hookEventName: z.string().optional(),
    /** 会话ID | Session ID (支持两种格式) */
    session_id: z.string().optional(),
    sessionId: z.string().optional(),
    /** Transcript文件路径 | Transcript file path (支持两种格式) */
    transcript_path: z.string().optional(),
    transcriptPath: z.string().optional(),
    /** 当前工作目录 | Current working directory */
    cwd: z.string().optional(),
    /** 模型信息 | Model information */
    model: z
      .object({
        id: z.string().optional(),
        display_name: z.string().optional(),
      })
      .optional(),
    /** 工作区信息 | Workspace information */
    workspace: z
      .object({
        current_dir: z.string().optional(),
        project_dir: z.string().optional(),
      })
      .optional(),
    /** Git分支名 | Git branch name (支持两种格式) */
    gitBranch: z.string().optional(),
    git: z
      .object({
        branch: z.string().optional(),
        status: z.string().optional(),
        ahead: z.number().optional(),
        behind: z.number().optional(),
      })
      .optional(),
  })
  .passthrough() // 允许额外字段 | Allow additional fields
  .transform((data) => ({
    /** 统一的事件名 | Unified event name */
    hookEventName: data.hookEventName || data.hook_event_name || 'Status',
    /** 统一的会话ID | Unified session ID */
    sessionId: data.sessionId || data.session_id || null,
    /** 统一的Transcript路径 | Unified transcript path */
    transcriptPath: data.transcriptPath || data.transcript_path || null,
    /** 统一的工作目录 | Unified working directory */
    cwd: data.cwd || process.cwd(),
    /** 统一的模型信息 | Unified model information */
    model: data.model || {},
    /** 统一的工作区信息 | Unified workspace information */
    workspace: data.workspace || {},
    /** 统一的Git分支 | Unified git branch */
    gitBranch: data.gitBranch || data.git?.branch || null,
  }));

// ==================== 渲染上下文Schema ====================

/**
 * 渲染上下文Schema | Render context schema
 * 包含渲染所需的所有信息 | Contains all information needed for rendering
 */
export const RenderContextSchema = z.object({
  /** 输入数据 | Input data */
  inputData: InputDataSchema,
  /** 终端能力 | Terminal capabilities */
  capabilities: z.object({
    colors: z.boolean(),
    emoji: z.boolean(),
    nerdFont: z.boolean(),
  }),
  /** 颜色映射 | Color mappings */
  colors: z.record(z.string(), z.string()),
  /** 图标映射 | Icon mappings */
  icons: z.record(z.string(), z.string()),
  /** 配置信息 | Configuration */
  config: ConfigSchema,
});

// ==================== 导出类型定义 ====================

/**
 * 基础组件配置类型 | Base component config type
 */
export type ComponentConfig = z.infer<typeof BaseComponentSchema>;

/**
 * 终端配置类型 | Terminal config type
 */
export type TerminalConfig = z.infer<typeof TerminalSchema>;

/**
 * 样式配置类型 | Style config type
 */
export type StyleConfig = z.infer<typeof StyleSchema>;

/**
 * 主题配置类型 | Theme config type
 */
export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;

/**
 * 主题集合配置类型 | Themes config type
 */
export type ThemesConfig = z.infer<typeof ThemesSchema>;

/**
 * 组件配置集合类型 | Components config collection type
 */
export type ComponentsConfig = z.infer<typeof ComponentsSchema>;

/**
 * 高级配置类型 | Advanced config type
 */
export type AdvancedConfig = z.infer<typeof AdvancedSchema>;

/**
 * 实验性配置类型 | Experimental config type
 */
export type ExperimentalConfig = z.infer<typeof ExperimentalSchema>;

/**
 * 预设映射配置类型 | Preset mapping config type
 */
export type PresetMappingConfig = z.infer<typeof PresetMappingSchema>;

// ==================== 组件选项和元数据类型 ====================

/**
 * 组件选项接口 | Component options interface
 */
export interface ComponentOptions {
  id: string;
  enabled?: boolean;
  [key: string]: unknown;
}

/**
 * 组件元数据接口 | Component metadata interface
 */
export interface ComponentMetadata {
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
}

/**
 * 渲染选项接口 | Render options interface
 */
export interface RenderOptions {
  forceColors?: boolean;
  forceEmoji?: boolean;
  forceNerdFont?: boolean;
  maxWidth?: number;
}

// ==================== CLI相关类型定义 ====================

/**
 * 实时预览选项接口 | Live preview options interface
 */
export interface LivePreviewOptions {
  configPath?: string;
  theme?: string;
  refreshInterval?: number;
  maxScenarios?: number;
  debug?: boolean;
  dynamicBanner?: boolean;
}

/**
 * 配置编辑器选项接口 | Config editor options interface
 */
export interface ConfigEditorOptions {
  configPath?: string;
  enableLivePreview?: boolean;
  autoSave?: boolean;
}

/**
 * 模拟场景接口 | Mock scenario interface
 */
export interface MockScenario {
  id: string;
  name: string;
  description: string;
  inputData: InputData;
  tokenUsage?: number;
  expectedStatus?: 'ready' | 'thinking' | 'tool_use' | 'error' | 'complete';
}

// ==================== 主要类型导出 ====================

/**
 * 主配置类型 | Main config type
 */
export type Config = z.infer<typeof ConfigSchema>;

/**
 * 输入数据类型 | Input data type
 */
export type InputData = z.infer<typeof InputDataSchema>;

/**
 * 渲染上下文类型 | Render context type
 */
export type RenderContext = z.infer<typeof RenderContextSchema>;

/**
 * 扩展渲染上下文接口 | Extended render context interface
 * 包含主题系统相关扩展信息 | Contains theme system related extensions
 */
export interface ExtendedRenderContext extends RenderContext {
  /** 主题配置 | Theme configuration */
  theme?: {
    /** 启用渐变效果 | Enable gradient effects */
    enable_gradient?: boolean;
    /** 忽略分隔符 | Ignore separator */
    ignore_separator?: boolean;
    /** 精细进度条 | Fine progress bar */
    fine_progress?: boolean;
    /** 胶囊样式 | Capsule style */
    capsule_style?: boolean;
  };
  /** 渲染器实例 | Renderer instance */
  renderer?: {
    /** 颜色化文本 | Colorize text */
    colorize: (text: string, colorName: string) => string;
    /** 重置颜色 | Reset color */
    reset: () => string;
  };
}

/**
 * 项目组件配置类型 | Project component config type
 */
export type ProjectComponentConfig = z.infer<typeof ProjectComponentSchema>;

/**
 * 模型组件配置类型 | Model component config type
 */
export type ModelComponentConfig = z.infer<typeof ModelComponentSchema>;

/**
 * 分支组件配置类型 | Branch component config type
 */
export type BranchComponentConfig = z.infer<typeof BranchComponentSchema>;

/**
 * Token组件配置类型 | Token component config type
 */
export type TokensComponentConfig = z.infer<typeof TokenComponentSchema>;

/**
 * 状态组件配置类型 | Status component config type
 */
export type StatusComponentConfig = z.infer<typeof StatusComponentSchema>;
