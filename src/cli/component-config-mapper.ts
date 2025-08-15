/**
 * 组件配置映射工具 | Component Configuration Mapper
 *
 * 提供组件配置项的完整映射和分类管理，支持配置项元数据查询和格式化显示。
 * Provides complete mapping and categorization management for component configuration items,
 * supports configuration metadata queries and formatted display.
 */

// ==================== 配置项元数据定义 ====================

/**
 * 配置项元数据接口 | Configuration item metadata interface
 */
export interface ConfigItemMetadata {
  /** 配置键名 | Configuration key */
  key: string;
  /** 配置类型 | Configuration type */
  type: 'boolean' | 'string' | 'number' | 'object' | 'array' | 'enum';
  /** 默认值 | Default value */
  defaultValue: unknown;
  /** 配置描述 | Configuration description */
  description: string;
  /** 配置分类 | Configuration category */
  category: string;
  /** 是否为高级设置 | Whether it's an advanced setting */
  advanced?: boolean;
  /** 枚举可选值 | Enum options (for enum type) */
  options?: readonly string[];
  /** 数值范围 | Number range (for number type) */
  range?: { min?: number; max?: number };
  /** 是否为嵌套配置 | Whether it's a nested configuration */
  nested?: boolean;
  /** 子配置项 | Sub configuration items (for object type) */
  subItems?: ConfigItemMetadata[];
}

/**
 * 组件配置摘要接口 | Component configuration summary interface
 */
export interface ComponentConfigSummary {
  /** 组件名称 | Component name */
  name: string;
  /** 组件显示名称 | Component display name */
  displayName: string;
  /** 总配置项数量 | Total configuration items count */
  totalItems: number;
  /** 基础配置项数量 | Basic configuration items count */
  basicItems: number;
  /** 高级配置项数量 | Advanced configuration items count */
  advancedItems: number;
  /** 配置分类统计 | Configuration categories statistics */
  categoryCounts: Record<string, number>;
}

/**
 * 组件配置映射器类 | Component Configuration Mapper Class
 */
export class ComponentConfigMapper {
  private readonly componentMappings: Map<string, ConfigItemMetadata[]>;
  private readonly categoryDisplayNames: Map<string, string>;

  constructor() {
    this.componentMappings = new Map();
    this.categoryDisplayNames = new Map([
      ['basic', '基础设置 | Basic Settings'],
      ['display', '显示选项 | Display Options'],
      ['advanced', '高级设置 | Advanced Settings'],
      ['performance', '性能优化 | Performance Optimization'],
      ['style', '样式定制 | Style Customization'],
      ['behavior', '行为控制 | Behavior Control'],
      ['icons', '图标配置 | Icon Configuration'],
      ['colors', '颜色配置 | Color Configuration'],
      ['thresholds', '阈值设置 | Threshold Settings'],
    ]);

    this.initializeComponentMappings();
  }

  /**
   * 初始化组件配置映射 | Initialize component configuration mappings
   */
  private initializeComponentMappings(): void {
    // Project 组件配置映射
    this.componentMappings.set('project', [
      {
        key: 'enabled',
        type: 'boolean',
        defaultValue: true,
        description: '是否启用项目组件 | Enable project component',
        category: 'basic',
      },
      {
        key: 'icon_color',
        type: 'enum',
        defaultValue: 'white',
        description: '项目图标颜色 | Project icon color',
        category: 'style',
        options: [
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
        ],
      },
      {
        key: 'text_color',
        type: 'enum',
        defaultValue: 'white',
        description: '项目文本颜色 | Project text color',
        category: 'style',
        options: [
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
        ],
      },
      {
        key: 'show_when_empty',
        type: 'boolean',
        defaultValue: false,
        description: '项目名为空时是否显示 | Show when project name is empty',
        category: 'display',
      },
    ]);

    // Model 组件配置映射
    this.componentMappings.set('model', [
      {
        key: 'enabled',
        type: 'boolean',
        defaultValue: true,
        description: '是否启用模型组件 | Enable model component',
        category: 'basic',
      },
      {
        key: 'icon_color',
        type: 'enum',
        defaultValue: 'white',
        description: '模型图标颜色 | Model icon color',
        category: 'style',
        options: [
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
        ],
      },
      {
        key: 'text_color',
        type: 'enum',
        defaultValue: 'white',
        description: '模型文本颜色 | Model text color',
        category: 'style',
        options: [
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
        ],
      },
      {
        key: 'show_full_name',
        type: 'boolean',
        defaultValue: false,
        description: '显示模型全名 | Show full model name',
        category: 'display',
      },
      {
        key: 'mapping',
        type: 'object',
        defaultValue: {},
        description: '自定义模型名映射 | Custom model name mapping',
        category: 'advanced',
        advanced: true,
      },
    ]);

    // Branch 组件配置映射 (最复杂的组件)
    this.componentMappings.set('branch', [
      {
        key: 'enabled',
        type: 'boolean',
        defaultValue: true,
        description: '是否启用分支组件 | Enable branch component',
        category: 'basic',
      },
      {
        key: 'icon_color',
        type: 'enum',
        defaultValue: 'white',
        description: '分支图标颜色 | Branch icon color',
        category: 'style',
        options: [
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
        ],
      },
      {
        key: 'text_color',
        type: 'enum',
        defaultValue: 'white',
        description: '分支文本颜色 | Branch text color',
        category: 'style',
        options: [
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
        ],
      },
      {
        key: 'show_when_no_git',
        type: 'boolean',
        defaultValue: false,
        description: '无Git仓库时是否显示 | Show when not in Git repository',
        category: 'display',
      },
      {
        key: 'max_length',
        type: 'number',
        defaultValue: 20,
        description: '分支名最大长度 | Maximum length of branch name',
        category: 'display',
        range: { min: 1 },
      },
      // 分支状态配置
      {
        key: 'status',
        type: 'object',
        defaultValue: {},
        description: '分支状态配置 | Branch status configuration',
        category: 'advanced',
        nested: true,
        advanced: true,
        subItems: [
          {
            key: 'show_dirty',
            type: 'boolean',
            defaultValue: false,
            description: '显示脏工作区状态 | Show dirty workspace status',
            category: 'display',
          },
          {
            key: 'show_ahead_behind',
            type: 'boolean',
            defaultValue: false,
            description: '显示ahead/behind计数 | Show ahead/behind count',
            category: 'display',
          },
          {
            key: 'show_stash_count',
            type: 'boolean',
            defaultValue: false,
            description: '显示stash数量 | Show stash count',
            category: 'display',
          },
          {
            key: 'show_staged_count',
            type: 'boolean',
            defaultValue: false,
            description: '显示暂存文件数 | Show staged file count',
            category: 'display',
          },
          {
            key: 'show_unstaged_count',
            type: 'boolean',
            defaultValue: false,
            description: '显示未暂存文件数 | Show unstaged file count',
            category: 'display',
          },
          {
            key: 'show_untracked_count',
            type: 'boolean',
            defaultValue: false,
            description: '显示未跟踪文件数 | Show untracked file count',
            category: 'display',
          },
        ],
      },
      // 分支操作配置
      {
        key: 'operations',
        type: 'object',
        defaultValue: {},
        description: '分支操作配置 | Branch operations configuration',
        category: 'advanced',
        nested: true,
        advanced: true,
        subItems: [
          {
            key: 'show_merge',
            type: 'boolean',
            defaultValue: false,
            description: '显示合并状态 | Show merge status',
            category: 'display',
          },
          {
            key: 'show_rebase',
            type: 'boolean',
            defaultValue: false,
            description: '显示变基状态 | Show rebase status',
            category: 'display',
          },
          {
            key: 'show_cherry_pick',
            type: 'boolean',
            defaultValue: false,
            description: '显示cherry-pick状态 | Show cherry-pick status',
            category: 'display',
          },
          {
            key: 'show_bisect',
            type: 'boolean',
            defaultValue: false,
            description: '显示bisect状态 | Show bisect status',
            category: 'display',
          },
        ],
      },
      // 分支版本信息配置
      {
        key: 'version',
        type: 'object',
        defaultValue: {},
        description: '分支版本信息配置 | Branch version information configuration',
        category: 'advanced',
        nested: true,
        advanced: true,
        subItems: [
          {
            key: 'show_commit_hash',
            type: 'boolean',
            defaultValue: false,
            description: '显示提交SHA（短） | Show commit hash (short)',
            category: 'display',
          },
          {
            key: 'show_tag',
            type: 'boolean',
            defaultValue: false,
            description: '显示最近标签 | Show latest tag',
            category: 'display',
          },
          {
            key: 'show_commit_time',
            type: 'boolean',
            defaultValue: false,
            description: '显示最后提交时间 | Show last commit time',
            category: 'display',
          },
          {
            key: 'hash_length',
            type: 'number',
            defaultValue: 7,
            description: 'SHA显示长度 | Hash display length',
            category: 'display',
            range: { min: 4, max: 40 },
          },
        ],
      },
      // 性能配置
      {
        key: 'performance',
        type: 'object',
        defaultValue: {},
        description: '分支性能配置 | Branch performance configuration',
        category: 'performance',
        nested: true,
        advanced: true,
        subItems: [
          {
            key: 'enable_cache',
            type: 'boolean',
            defaultValue: true,
            description: '启用缓存 | Enable cache',
            category: 'performance',
          },
          {
            key: 'cache_ttl',
            type: 'number',
            defaultValue: 5000,
            description: '缓存TTL(毫秒) | Cache TTL (milliseconds)',
            category: 'performance',
            range: { min: 1000, max: 60000 },
          },
          {
            key: 'git_timeout',
            type: 'number',
            defaultValue: 1000,
            description: 'Git命令超时 | Git command timeout',
            category: 'performance',
            range: { min: 100, max: 10000 },
          },
          {
            key: 'parallel_commands',
            type: 'boolean',
            defaultValue: true,
            description: '并行执行Git命令 | Execute Git commands in parallel',
            category: 'performance',
          },
          {
            key: 'lazy_load_status',
            type: 'boolean',
            defaultValue: true,
            description: '懒加载状态信息 | Lazy load status information',
            category: 'performance',
          },
          {
            key: 'skip_on_large_repo',
            type: 'boolean',
            defaultValue: true,
            description: '大仓库时跳过重操作 | Skip heavy operations on large repositories',
            category: 'performance',
          },
          {
            key: 'large_repo_threshold',
            type: 'number',
            defaultValue: 10000,
            description: '大仓库文件数阈值 | Large repository file count threshold',
            category: 'performance',
            range: { min: 1000, max: 100000 },
          },
        ],
      },
    ]);

    // Tokens 组件配置映射
    this.componentMappings.set('tokens', [
      {
        key: 'enabled',
        type: 'boolean',
        defaultValue: true,
        description: '是否启用Token组件 | Enable tokens component',
        category: 'basic',
      },
      {
        key: 'icon_color',
        type: 'enum',
        defaultValue: 'white',
        description: 'Token图标颜色 | Token icon color',
        category: 'style',
        options: [
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
        ],
      },
      {
        key: 'text_color',
        type: 'enum',
        defaultValue: 'white',
        description: 'Token文本颜色 | Token text color',
        category: 'style',
        options: [
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
        ],
      },
      {
        key: 'show_gradient',
        type: 'boolean',
        defaultValue: false,
        description: '显示彩色渐变进度条 | Show gradient progress bar',
        category: 'display',
        advanced: true,
      },
      {
        key: 'show_progress_bar',
        type: 'boolean',
        defaultValue: true,
        description: '显示进度条 | Show progress bar',
        category: 'display',
      },
      {
        key: 'show_percentage',
        type: 'boolean',
        defaultValue: true,
        description: '显示百分比 | Show percentage',
        category: 'display',
      },
      {
        key: 'show_raw_numbers',
        type: 'boolean',
        defaultValue: false,
        description: '显示原始数字 | Show raw numbers',
        category: 'display',
        advanced: true,
      },
      {
        key: 'progress_width',
        type: 'number',
        defaultValue: 15,
        description: '进度条宽度 | Progress bar width',
        category: 'display',
      },
      {
        key: 'progress_bar_chars',
        type: 'object',
        defaultValue: { filled: '█', empty: '░', backup: '▓' },
        description: '进度条字符配置 | Progress bar characters',
        category: 'style',
        advanced: true,
      },
      {
        key: 'thresholds',
        type: 'object',
        defaultValue: { warning: 60, danger: 85, backup: 85, critical: 95 },
        description: 'Token阈值配置 | Token thresholds configuration',
        category: 'thresholds',
        nested: true,
        subItems: [
          {
            key: 'warning',
            type: 'number',
            defaultValue: 60,
            description: '警告阈值 | Warning threshold',
            category: 'thresholds',
            range: { min: 0, max: 100 },
          },
          {
            key: 'danger',
            type: 'number',
            defaultValue: 85,
            description: '危险阈值 | Danger threshold',
            category: 'thresholds',
            range: { min: 0, max: 100 },
          },
          {
            key: 'backup',
            type: 'number',
            defaultValue: 85,
            description: '后备区域阈值 | Backup area threshold',
            category: 'thresholds',
            range: { min: 0, max: 100 },
          },
          {
            key: 'critical',
            type: 'number',
            defaultValue: 95,
            description: '临界阈值 | Critical threshold',
            category: 'thresholds',
            range: { min: 0, max: 100 },
          },
        ],
      },
      {
        key: 'colors',
        type: 'object',
        defaultValue: { safe: 'green', warning: 'yellow', danger: 'red' },
        description: 'Token颜色配置 | Token colors configuration',
        category: 'colors',
        nested: true,
        subItems: [
          {
            key: 'safe',
            type: 'enum',
            defaultValue: 'green',
            description: '安全状态颜色 | Safe state color',
            category: 'colors',
            options: [
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
            ],
          },
          {
            key: 'warning',
            type: 'enum',
            defaultValue: 'yellow',
            description: '警告状态颜色 | Warning state color',
            category: 'colors',
            options: [
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
            ],
          },
          {
            key: 'danger',
            type: 'enum',
            defaultValue: 'red',
            description: '危险状态颜色 | Danger state color',
            category: 'colors',
            options: [
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
            ],
          },
        ],
      },
      {
        key: 'context_windows',
        type: 'object',
        defaultValue: { default: 200000 },
        description: '上下文窗口大小映射 | Context window size mapping',
        category: 'advanced',
        advanced: true,
      },
    ]);

    // Usage 组件配置映射
    this.componentMappings.set('usage', [
      {
        key: 'enabled',
        type: 'boolean',
        defaultValue: true,
        description: '是否启用使用量组件 | Enable usage component',
        category: 'basic',
      },
      {
        key: 'icon_color',
        type: 'enum',
        defaultValue: 'white',
        description: '使用量图标颜色 | Usage icon color',
        category: 'style',
        options: [
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
        ],
      },
      {
        key: 'text_color',
        type: 'enum',
        defaultValue: 'white',
        description: '使用量文本颜色 | Usage text color',
        category: 'style',
        options: [
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
        ],
      },
      {
        key: 'display_mode',
        type: 'enum',
        defaultValue: 'combined',
        description: '显示模式 | Display mode',
        category: 'display',
        options: ['cost', 'tokens', 'combined', 'breakdown'],
      },
      {
        key: 'show_model',
        type: 'boolean',
        defaultValue: false,
        description: '显示模型名称 | Show model name',
        category: 'display',
      },
      {
        key: 'precision',
        type: 'number',
        defaultValue: 2,
        description: '数值精度 | Decimal precision',
        category: 'display',
        range: { min: 0, max: 4 },
      },
    ]);

    // Status 组件配置映射
    this.componentMappings.set('status', [
      {
        key: 'enabled',
        type: 'boolean',
        defaultValue: true,
        description: '是否启用状态组件 | Enable status component',
        category: 'basic',
      },
      {
        key: 'icon_color',
        type: 'enum',
        defaultValue: 'white',
        description: '状态图标颜色 | Status icon color',
        category: 'style',
        options: [
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
        ],
      },
      {
        key: 'text_color',
        type: 'enum',
        defaultValue: 'white',
        description: '状态文本颜色 | Status text color',
        category: 'style',
        options: [
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
        ],
      },
      {
        key: 'show_recent_errors',
        type: 'boolean',
        defaultValue: true,
        description: '显示最近错误 | Show recent errors',
        category: 'display',
      },
      {
        key: 'icons',
        type: 'object',
        defaultValue: {},
        description: '状态图标配置 | Status icons configuration',
        category: 'icons',
        nested: true,
        advanced: true,
      },
      {
        key: 'colors',
        type: 'object',
        defaultValue: {
          ready: 'green',
          thinking: 'yellow',
          tool: 'blue',
          error: 'red',
          warning: 'yellow',
        },
        description: '状态颜色配置 | Status colors configuration',
        category: 'colors',
        nested: true,
      },
    ]);
  }

  /**
   * 获取组件所有可配置项及其类型 | Get all configurable items and their types for a component
   */
  public getComponentConfigOptions(componentName: string): ConfigItemMetadata[] {
    const options = this.componentMappings.get(componentName);
    if (!options) {
      throw new Error(`Unknown component: ${componentName}`);
    }
    return [...options]; // 返回副本避免外部修改
  }

  /**
   * 获取配置分类 | Get configuration categories
   */
  public getConfigCategories(componentName: string): Record<string, ConfigItemMetadata[]> {
    const options = this.getComponentConfigOptions(componentName);
    const categories: Record<string, ConfigItemMetadata[]> = {};

    for (const item of options) {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category]!.push(item);

      // 处理嵌套配置项
      if (item.subItems) {
        for (const subItem of item.subItems) {
          if (!categories[subItem.category]) {
            categories[subItem.category] = [];
          }
          categories[subItem.category]!.push({
            ...subItem,
            key: `${item.key}.${subItem.key}`,
            description: `${item.description} > ${subItem.description}`,
          });
        }
      }
    }

    return categories;
  }

  /**
   * 格式化显示当前配置 | Format display current configuration
   */
  public formatConfigDisplay(componentName: string, config: Record<string, unknown>): string {
    const _options = this.getComponentConfigOptions(componentName);
    const lines: string[] = [];

    lines.push(
      `\n=== ${componentName.toUpperCase()} 组件配置 | ${componentName.toUpperCase()} Component Configuration ===`
    );

    const categories = this.getConfigCategories(componentName);

    for (const [categoryKey, items] of Object.entries(categories)) {
      const categoryName = this.categoryDisplayNames.get(categoryKey) || categoryKey;
      lines.push(`\n📁 ${categoryName}:`);

      for (const item of items) {
        const value = this.getNestedValue(config, item.key);
        const displayValue = this.formatValue(value, item.type);
        const isDefault = this.isDefaultValue(value, item.defaultValue);
        const prefix = isDefault ? '  ✓' : '  •';
        const suffix = isDefault ? ' (默认 | default)' : '';

        lines.push(`${prefix} ${item.key}: ${displayValue}${suffix}`);
        lines.push(`    ${item.description}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 获取配置项数量 | Get configuration items count
   */
  public getConfigItemCount(componentName: string): {
    total: number;
    basic: number;
    advanced: number;
    categories: Record<string, number>;
  } {
    const options = this.getComponentConfigOptions(componentName);
    let total = 0;
    let basic = 0;
    let advanced = 0;
    const categories: Record<string, number> = {};

    const countItems = (items: ConfigItemMetadata[]) => {
      for (const item of items) {
        total++;
        if (item.advanced) {
          advanced++;
        } else {
          basic++;
        }

        categories[item.category] = (categories[item.category] || 0) + 1;

        if (item.subItems) {
          countItems(item.subItems);
        }
      }
    };

    countItems(options);

    return { total, basic, advanced, categories };
  }

  /**
   * 获取单个配置项的元数据 | Get metadata for a single configuration item
   */
  public getConfigMetadata(componentName: string, configKey: string): ConfigItemMetadata | null {
    const options = this.getComponentConfigOptions(componentName);

    const findItem = (items: ConfigItemMetadata[], key: string): ConfigItemMetadata | null => {
      for (const item of items) {
        if (item.key === key) {
          return item;
        }
        if (item.subItems) {
          const found = findItem(
            item.subItems,
            key.startsWith(`${item.key}.`) ? key.substring(item.key.length + 1) : key
          );
          if (found) {
            return found;
          }
        }
      }
      return null;
    };

    return findItem(options, configKey);
  }

  /**
   * 获取组件配置摘要 | Get component configuration summary
   */
  public getComponentConfigSummary(componentName: string): ComponentConfigSummary {
    const counts = this.getConfigItemCount(componentName);

    return {
      name: componentName,
      displayName: this.getComponentDisplayName(componentName),
      totalItems: counts.total,
      basicItems: counts.basic,
      advancedItems: counts.advanced,
      categoryCounts: counts.categories,
    };
  }

  /**
   * 获取所有支持的组件名称 | Get all supported component names
   */
  public getSupportedComponents(): string[] {
    return Array.from(this.componentMappings.keys());
  }

  /**
   * 验证配置项值 | Validate configuration item value
   */
  public validateConfigValue(
    componentName: string,
    configKey: string,
    value: unknown
  ): {
    valid: boolean;
    error?: string;
  } {
    const metadata = this.getConfigMetadata(componentName, configKey);
    if (!metadata) {
      return {
        valid: false,
        error: `配置项不存在 | Configuration item does not exist: ${configKey}`,
      };
    }

    // 类型验证
    switch (metadata.type) {
      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            valid: false,
            error: `期望布尔值，实际为 ${typeof value} | Expected boolean, got ${typeof value}`,
          };
        }
        break;
      case 'string':
        if (typeof value !== 'string') {
          return {
            valid: false,
            error: `期望字符串，实际为 ${typeof value} | Expected string, got ${typeof value}`,
          };
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          return {
            valid: false,
            error: `期望数字，实际为 ${typeof value} | Expected number, got ${typeof value}`,
          };
        }
        if (metadata.range) {
          if (metadata.range.min !== undefined && value < metadata.range.min) {
            return {
              valid: false,
              error: `值不能小于 ${metadata.range.min} | Value cannot be less than ${metadata.range.min}`,
            };
          }
          if (metadata.range.max !== undefined && value > metadata.range.max) {
            return {
              valid: false,
              error: `值不能大于 ${metadata.range.max} | Value cannot be greater than ${metadata.range.max}`,
            };
          }
        }
        break;
      case 'enum':
        if (metadata.options && !metadata.options.includes(value as string)) {
          return {
            valid: false,
            error: `无效选项。可选值: ${metadata.options.join(', ')} | Invalid option. Available values: ${metadata.options.join(', ')}`,
          };
        }
        break;
      case 'object':
        if (value !== null && typeof value !== 'object') {
          return {
            valid: false,
            error: `期望对象，实际为 ${typeof value} | Expected object, got ${typeof value}`,
          };
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return {
            valid: false,
            error: `期望数组，实际为 ${typeof value} | Expected array, got ${typeof value}`,
          };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * 生成配置项清单 | Generate configuration items checklist
   */
  public generateConfigChecklist(componentName: string): string {
    const _options = this.getComponentConfigOptions(componentName);
    const summary = this.getComponentConfigSummary(componentName);
    const lines: string[] = [];

    lines.push(
      `# ${componentName.toUpperCase()} 组件配置清单 | ${componentName.toUpperCase()} Component Configuration Checklist`
    );
    lines.push(`总配置项: ${summary.totalItems} | Total Items: ${summary.totalItems}`);
    lines.push(`基础配置: ${summary.basicItems} | Basic Items: ${summary.basicItems}`);
    lines.push(`高级配置: ${summary.advancedItems} | Advanced Items: ${summary.advancedItems}`);
    lines.push('');

    const categories = this.getConfigCategories(componentName);

    for (const [categoryKey, items] of Object.entries(categories)) {
      const categoryName = this.categoryDisplayNames.get(categoryKey) || categoryKey;
      lines.push(`## ${categoryName}`);
      lines.push('');

      for (const item of items) {
        const required = !item.advanced ? '**必需**' : '可选';
        const typeInfo = this.formatTypeInfo(item);
        lines.push(
          `- [ ] \`${item.key}\` (${required} | ${item.advanced ? 'Optional' : '**Required**'})`
        );
        lines.push(`  - **类型 | Type**: ${typeInfo}`);
        lines.push(`  - **默认值 | Default**: \`${JSON.stringify(item.defaultValue)}\``);
        lines.push(`  - **描述 | Description**: ${item.description}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  // ==================== 私有辅助方法 ====================

  private getComponentDisplayName(componentName: string): string {
    const displayNames: Record<string, string> = {
      project: '项目名称 | Project Name',
      model: '模型信息 | Model Information',
      branch: 'Git分支 | Git Branch',
      tokens: 'Token使用量 | Token Usage',
      usage: '使用统计 | Usage Statistics',
      status: '状态指示 | Status Indicator',
    };
    return displayNames[componentName] || componentName;
  }

  private getNestedValue(obj: Record<string, unknown>, key: string): unknown {
    const keys = key.split('.');
    let current: any = obj;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private formatValue(value: unknown, type: string): string {
    if (value === undefined) {
      return '未设置 | not set';
    }

    if (value === null) {
      return 'null';
    }

    switch (type) {
      case 'boolean':
        return value ? '✅ true' : '❌ false';
      case 'object':
        return `{...} (${Object.keys(value as object).length} 项 | items)`;
      case 'array':
        return `[...] (${(value as unknown[]).length} 项 | items)`;
      default:
        return String(value);
    }
  }

  private isDefaultValue(value: unknown, defaultValue: unknown): boolean {
    if (value === undefined && defaultValue !== undefined) {
      return false;
    }
    return JSON.stringify(value) === JSON.stringify(defaultValue);
  }

  private formatTypeInfo(item: ConfigItemMetadata): string {
    let typeInfo = item.type;

    if (item.options) {
      typeInfo += ` (${item.options.slice(0, 3).join(' | ')}${item.options.length > 3 ? '...' : ''})`;
    }

    if (item.range) {
      const rangeStr = `${item.range.min || '?'}-${item.range.max || '?'}`;
      typeInfo += ` [${rangeStr}]`;
    }

    return typeInfo;
  }
}

// ==================== 导出和便捷函数 ====================

/**
 * 默认组件配置映射器实例 | Default component configuration mapper instance
 */
export const defaultComponentConfigMapper = new ComponentConfigMapper();

/**
 * 获取组件配置项数量 | Get component configuration items count
 */
export function getComponentConfigItemCount(componentName: string): number {
  return defaultComponentConfigMapper.getConfigItemCount(componentName).total;
}

/**
 * 获取组件配置分类数量 | Get component configuration categories count
 */
export function getComponentConfigCategoriesCount(componentName: string): number {
  const categories = defaultComponentConfigMapper.getConfigCategories(componentName);
  return Object.keys(categories).length;
}

/**
 * 格式化组件配置摘要 | Format component configuration summary
 */
export function formatComponentConfigSummary(componentName: string): string {
  const summary = defaultComponentConfigMapper.getComponentConfigSummary(componentName);
  return `${summary.displayName}: ${summary.totalItems}项配置 (${summary.basicItems}基础+${summary.advancedItems}高级) | ${summary.totalItems} items (${summary.basicItems} basic + ${summary.advancedItems} advanced)`;
}

/**
 * 验证组件是否存在 | Validate if component exists
 */
export function isValidComponent(componentName: string): boolean {
  return defaultComponentConfigMapper.getSupportedComponents().includes(componentName);
}
