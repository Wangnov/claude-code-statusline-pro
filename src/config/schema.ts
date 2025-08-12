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

// 颜色枚举
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

// 自动检测选项
const AutoDetectSchema = z.union([z.boolean(), z.literal('auto')]);

// 基础组件配置
const BaseComponentSchema = z.object({
  enabled: z.boolean().default(true),
  icon: z.string(),
  nerd_icon: z.string().optional(),
  text_icon: z.string().optional(),
  color: ColorSchema,
});

// 项目组件配置 | Project component config
export const ProjectComponentSchema = BaseComponentSchema.extend({
  show_when_empty: z.boolean().default(false),
});

// 模型组件配置 | Model component config
export const ModelComponentSchema = BaseComponentSchema.extend({
  show_full_name: z.boolean().default(false),
  custom_names: z.record(z.string(), z.string()).default({}),
});

// 分支组件配置 | Branch component config
export const BranchComponentSchema = BaseComponentSchema.extend({
  show_when_no_git: z.boolean().default(false),
  max_length: z.number().min(1).default(20),
});

// Token 阈值配置 | Token threshold config
const TokenThresholdsSchema = z.object({
  warning: z.number().min(0).max(100).default(60),
  danger: z.number().min(0).max(100).default(85),
  backup: z.number().min(0).max(100).default(85),
  critical: z.number().min(0).max(100).default(95),
});

// Token 颜色配置 | Token color config
const TokenColorsSchema = z.object({
  safe: ColorSchema.default('green'),
  warning: ColorSchema.default('yellow'),
  danger: ColorSchema.default('red'),
});

// Token 状态图标配置 | Token status icon config
const TokenStatusIconsSchema = z.object({
  backup: z.string().default('⚡'),
  critical: z.string().default('🔥'),
});

// Token 组件配置 | Token component config
export const TokenComponentSchema = BaseComponentSchema.extend({
  show_progress_bar: z.boolean().default(true),
  show_percentage: z.boolean().default(true),
  show_raw_numbers: z.boolean().default(false),
  context_window: z.number().default(200000),
  progress_bar_width: z.number().default(10),
  progress_bar_chars: z
    .object({
      filled: z.string().default('█'),
      empty: z.string().default('░'),
      backup: z.string().default('▓'),
    })
    .optional(),
  colors: TokenColorsSchema.optional(),
  thresholds: TokenThresholdsSchema.optional(),
  status_icons: TokenStatusIconsSchema.optional(),
  status_nerd_icons: TokenStatusIconsSchema.optional(),
  status_text_icons: TokenStatusIconsSchema.optional(),
});

// 状态图标配置 | Status icon config
const StatusIconsSchema = z.object({
  ready: z.string().default('✅'),
  thinking: z.string().default('💭'),
  tool: z.string().default('🔧'),
  error: z.string().default('❌'),
  warning: z.string().default('⚠️'),
});

// 状态颜色配置 | Status color config
const StatusColorsSchema = z.object({
  ready: ColorSchema.default('green'),
  thinking: ColorSchema.default('yellow'),
  tool: ColorSchema.default('blue'),
  error: ColorSchema.default('red'),
  warning: ColorSchema.default('yellow'),
});

// 状态组件配置 | Status component config
export const StatusComponentSchema = BaseComponentSchema.extend({
  show_recent_errors: z.boolean().default(true),
  icons: StatusIconsSchema.optional(),
  nerd_icons: StatusIconsSchema.optional(),
  text_icons: StatusIconsSchema.optional(),
  colors: StatusColorsSchema.optional(),
});

// 组件配置集合 | Components config collection
const ComponentsSchema = z.object({
  order: z.array(z.string()).default(['project', 'model', 'branch', 'tokens', 'status']),
  project: ProjectComponentSchema.optional(),
  model: ModelComponentSchema.optional(),
  branch: BranchComponentSchema.optional(),
  tokens: TokenComponentSchema.optional(),
  status: StatusComponentSchema.optional(),
});

// 样式配置 | Style config
const StyleSchema = z.object({
  separator: z.string().default(' | '),
  enable_colors: AutoDetectSchema.default('auto'),
  enable_emoji: AutoDetectSchema.default('auto'),
  enable_nerd_font: AutoDetectSchema.default('auto'),
  compact_mode: z.boolean().default(false),
  max_width: z.number().min(0).default(0),
});

// 高级配置 | Advanced config
const AdvancedSchema = z.object({
  cache_enabled: z.boolean().default(true),
  recent_error_count: z.number().min(1).default(5),
  git_timeout: z.number().min(100).default(1000),
  debug_mode: z.boolean().default(false),
  custom_color_codes: z.record(z.string(), z.string()).default({}),
});

// 实验性功能配置 | Experimental features config
const ExperimentalSchema = z.object({
  show_context_health: z.boolean().default(false),
  adaptive_colors: z.boolean().default(false),
  show_timestamp: z.boolean().default(false),
  show_session_info: z.boolean().default(false),
  force_nerd_font: z.boolean().default(false),
});

// 预设映射配置 | Preset mapping config
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

// 模板配置 | Template config
const TemplateConfigSchema = z
  .object({
    description: z.string().optional(),
    style: StyleSchema.partial().optional(),
    components: ComponentsSchema.partial().optional(),
  })
  .passthrough(); // 允许额外字段

const TemplatesSchema = z.record(z.string(), TemplateConfigSchema).optional();

// 主配置 schema | Main config schema
export const ConfigSchema = z
  .object({
    preset: z.string().default('PMBTS'),
    theme: z.string().optional(),
    preset_mapping: PresetMappingSchema.optional(),
    components: ComponentsSchema.optional(),
    style: StyleSchema.optional(),
    advanced: AdvancedSchema.optional(),
    experimental: ExperimentalSchema.optional(),
    templates: TemplatesSchema,
  })
  .passthrough(); // 允许额外字段

// 输入数据 schema | Input data schema
export const InputDataSchema = z
  .object({
    // 支持两种字段名格式
    hook_event_name: z.string().optional(),
    hookEventName: z.string().optional(),
    session_id: z.string().optional(),
    sessionId: z.string().optional(),
    transcript_path: z.string().optional(),
    transcriptPath: z.string().optional(),
    cwd: z.string().optional(),
    model: z
      .object({
        id: z.string().optional(),
        display_name: z.string().optional(),
      })
      .optional(),
    workspace: z
      .object({
        current_dir: z.string().optional(),
        project_dir: z.string().optional(),
      })
      .optional(),
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
  .passthrough() // 允许额外字段
  .transform((data) => ({
    hookEventName: data.hookEventName || data.hook_event_name || 'Status',
    sessionId: data.sessionId || data.session_id || null,
    transcriptPath: data.transcriptPath || data.transcript_path || null,
    cwd: data.cwd || process.cwd(),
    model: data.model || {},
    workspace: data.workspace || {},
    gitBranch: data.gitBranch || data.git?.branch || null,
  }));

// 渲染上下文 schema | Render context schema
export const RenderContextSchema = z.object({
  inputData: InputDataSchema,
  capabilities: z.object({
    colors: z.boolean(),
    emoji: z.boolean(),
    nerdFont: z.boolean(),
  }),
  colors: z.record(z.string(), z.string()),
  icons: z.record(z.string(), z.string()),
  config: ConfigSchema,
});

// 基础组件配置类型 | Base component config type
export type ComponentConfig = z.infer<typeof BaseComponentSchema>;

// 样式配置类型
export type StyleConfig = z.infer<typeof StyleSchema>;

// 主题配置类型 (简化处理)
export interface ThemeConfig {
  name: string;
  style?: Partial<StyleConfig>;
  components?: Partial<z.infer<typeof ComponentsSchema>>;
}

// 组件选项和元数据类型
export interface ComponentOptions {
  id: string;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface ComponentMetadata {
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
}

export interface RenderOptions {
  forceColors?: boolean;
  forceEmoji?: boolean;
  forceNerdFont?: boolean;
  maxWidth?: number;
}

// CLI相关类型定义
export interface LivePreviewOptions {
  configPath?: string;
  theme?: string;
  refreshInterval?: number;
  maxScenarios?: number;
  debug?: boolean;
  dynamicBanner?: boolean;
}

export interface ConfigEditorOptions {
  configPath?: string;
  enableLivePreview?: boolean;
  autoSave?: boolean;
}

export interface MockScenario {
  id: string;
  name: string;
  description: string;
  inputData: InputData;
  tokenUsage?: number;
  expectedStatus?: 'ready' | 'thinking' | 'tool_use' | 'error' | 'complete';
}

// 导出类型定义 | Export type definitions
export type Config = z.infer<typeof ConfigSchema>;
export type InputData = z.infer<typeof InputDataSchema>;
export type RenderContext = z.infer<typeof RenderContextSchema>;
export type ProjectComponentConfig = z.infer<typeof ProjectComponentSchema>;
export type ModelComponentConfig = z.infer<typeof ModelComponentSchema>;
export type BranchComponentConfig = z.infer<typeof BranchComponentSchema>;
export type TokensComponentConfig = z.infer<typeof TokenComponentSchema>;
export type StatusComponentConfig = z.infer<typeof StatusComponentSchema>;
