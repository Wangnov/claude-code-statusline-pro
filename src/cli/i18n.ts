/**
 * Claude Code Statusline Pro - 国际化系统 | Internationalization System
 * 企业级i18n解决方案，支持中英双语，类型安全，性能优化
 *
 * 特性 | Features:
 * - 自动语言检测与用户配置优先级
 * - 类型安全的翻译键定义和插值支持
 * - 懒加载翻译资源和缓存机制
 * - 与现有配置系统无缝集成
 * - 支持复数形式和动态参数
 *
 * @author Claude Code Team
 * @version 2.0.0
 */

import { ConfigLoader } from '../config/loader.js';

/**
 * 支持的语言类型 | Supported language types
 */
export type SupportedLanguage = 'zh' | 'en';

/**
 * 翻译插值参数 | Translation interpolation parameters
 */
export interface TranslationParams {
  [key: string]: string | number;
}

/**
 * 翻译键定义接口 | Translation key definition interface
 * 使用嵌套结构组织翻译内容，确保类型安全
 */
export interface TranslationKeys {
  // CLI命令描述 | CLI command descriptions
  cli: {
    app: {
      name: string;
      description: string;
      version: string;
    };
    commands: {
      main: {
        description: string;
        arguments: {
          preset: string;
        };
        options: {
          preset: string;
          theme: string;
          noColors: string;
          noEmoji: string;
          noIcons: string;
          config: string;
          debug: string;
          mock: string;
        };
      };
      config: {
        description: string;
        options: {
          file: string;
          reset: string;
          init: string;
          theme: string;
        };
      };
      theme: {
        description: string;
        arguments: {
          name: string;
        };
      };
      validate: {
        description: string;
        arguments: {
          file: string;
        };
      };
      doctor: {
        description: string;
      };
    };
  };

  // 配置编辑器界面 | Configuration editor interface
  editor: {
    title: string;
    subtitle: string;
    preview: {
      title: string;
      scenarios: {
        dev: string;
        critical: string;
        error: string;
      };
    };
    menu: {
      title: string;
      unsavedIndicator: string;
      items: {
        components: {
          name: string;
          description: string;
        };
        themes: {
          name: string;
          description: string;
        };
        styles: {
          name: string;
          description: string;
        };
        presets: {
          name: string;
          description: string;
        };
        preview: {
          name: string;
          description: string;
        };
        language: {
          name: string;
          description: string;
        };
        reset: {
          name: string;
          description: string;
        };
        save: {
          name: string;
          description: string;
        };
        exit: {
          name: string;
          description: string;
        };
      };
    };
    components: {
      title: string;
      items: {
        project: {
          name: string;
          description: string;
        };
        model: {
          name: string;
          description: string;
        };
        branch: {
          name: string;
          description: string;
        };
        tokens: {
          name: string;
          description: string;
        };
        usage: {
          name: string;
          description: string;
        };
        status: {
          name: string;
          description: string;
        };
        back: string;
      };
      configuration: {
        enable: string;
        basic: string;
        preset_managed: string;
        icon: string;
        color: string;
        updated: string;
      };
    };
    themes: {
      title: string;
      items: {
        classic: {
          name: string;
          description: string;
        };
        powerline: {
          name: string;
          description: string;
        };
        capsule: {
          name: string;
          description: string;
        };
        custom: {
          name: string;
          description: string;
        };
        back: string;
      };
      applied: string;
    };
    styles: {
      enableColors: string;
      enableEmoji: string;
      enableNerdFont: string;
      separator: string;
      updated: string;
    };
    presets: {
      title: string;
      items: {
        PMBTUS: string;
        PMBTS: string;
        PMB: string;
        PMBT: string;
        MBT: string;
        custom: string;
        back: string;
      };
      customComponents: string;
      applied: string;
    };
    reset: {
      confirm: string;
      warning: string;
      success: string;
      cancelled: string;
    };
    save: {
      success: string;
      failed: string;
    };
    exit: {
      unsavedTitle: string;
      choices: {
        save: string;
        discard: string;
        cancel: string;
      };
    };
    usage: {
      title: string;
      displayMode: {
        title: string;
        cost: string;
        tokens: string;
        combined: string;
        breakdown: string;
      };
      showModel: string;
      precision: {
        title: string;
        options: {
          '0': string;
          '1': string;
          '2': string;
          '3': string;
          '4': string;
        };
      };
      updated: string;
    };
    language: {
      title: string;
      current: string;
      select: string;
      updated: string;
      immediate: string;
      failed: string;
      noChange: string;
    };
  };

  // 预设管理相关 | Preset management related
  preset: {
    management: {
      title: string;
      apply_builtin: string;
      edit_current: string;
      create_custom: string;
      delete_custom: string;
      preview: string;
    };
    builtin: {
      PMBTUS: string;
      PMBTS: string;
      PMBT: string;
      PMB: string;
      MBT: string;
    };
  };

  // 组件深度配置相关 | Component deep configuration related
  component: {
    config: {
      deep: string;
      categories: string;
      item_count: string;
    };
    branch: {
      status_display: string;
      operations: string;
      version_info: string;
      performance: string;
    };
    tokens: {
      gradient: string;
      thresholds: string;
      context_windows: string;
      advanced: string;
      basic_settings: string;
      progress_config: string;
      threshold_config: string;
      icon_config: string;
      context_config: string;
      show_gradient: string;
      show_progress_bar: string;
      show_percentage: string;
      show_raw_numbers: string;
      progress_width: string;
      progress_chars: string;
      filled_char: string;
      empty_char: string;
      backup_char: string;
      warning_threshold: string;
      danger_threshold: string;
      backup_threshold: string;
      critical_threshold: string;
      threshold_validation: string;
      threshold_preview: string;
      context_window_default: string;
      context_window_model: string;
      add_model_window: string;
      model_name: string;
      window_size: string;
      emoji_icons: string;
      nerd_icons: string;
      text_icons: string;
      backup_status: string;
      critical_status: string;
    };
    // Model组件配置 | Model component configuration
    model: {
      advanced: string;
      basic_settings: string;
      display_options: string;
      mapping_config: string;
      show_full_name: string;
      model_mapping: string;
      add_mapping: string;
      edit_mapping: string;
      delete_mapping: string;
      mapping_key: string;
      mapping_value: string;
      mapping_preview: string;
      default_mappings: string;
      no_mappings: string;
    };
    // Status组件配置 | Status component configuration
    status: {
      advanced: string;
      basic_settings: string;
      icon_config: string;
      color_config: string;
      error_display: string;
      show_recent_errors: string;
      status_icons: string;
      status_colors: string;
      ready_status: string;
      thinking_status: string;
      tool_status: string;
      error_status: string;
      warning_status: string;
      emoji_icons: string;
      nerd_icons: string;
      text_icons: string;
      ready_color: string;
      thinking_color: string;
      tool_color: string;
      error_color: string;
      warning_color: string;
    };
    order: {
      title: string;
      move_up: string;
      move_down: string;
      confirm: string;
      reset: string;
    };
  };

  // Git状态显示选项 | Git status display options
  git: {
    status: {
      show_dirty: string;
      show_ahead_behind: string;
      show_stash: string;
      show_staged: string;
      show_unstaged: string;
      show_untracked: string;
    };
  };

  // 智能建议相关 | Smart suggestions related
  suggestion: {
    title: string;
    nerd_font_detected: string;
    no_colors: string;
    enable_git_status: string;
  };

  // 系统消息 | System messages
  messages: {
    success: string;
    error: string;
    warning: string;
    info: string;
    loading: string;
    complete: string;
    cancelled: string;
    goodbye: string;
    keyPress: string;
  };

  // 终端能力检测 | Terminal capability detection
  terminal: {
    detection: {
      title: string;
      colors: string;
      emoji: string;
      nerdFont: string;
    };
    capabilities: {
      colors: string;
      emoji: string;
      nerdFont: string;
      interactive: string;
    };
  };

  // 配置管理 | Configuration management
  config: {
    exists: string;
    overwrite: string;
    initialized: string;
    theme: string;
    customization: string;
    validation: {
      valid: string;
      invalid: string;
      failed: string;
    };
    reset: {
      confirm: string;
      success: string;
    };
  };

  // 诊断信息 | Diagnostic information
  diagnosis: {
    title: string;
    platform: string;
    node: string;
    terminal: string;
    configuration: string;
    source: string;
  };

  // 颜色选项 | Color options
  colors: {
    cyan: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    red: string;
    white: string;
    gray: string;
  };

  // 组件名称 | Component names
  componentNames: {
    project: string;
    model: string;
    branch: string;
    tokens: string;
    usage: string;
    status: string;
  };

  // CLI图标系统 | CLI icon system
  icons: {
    // 图标类型描述 | Icon type descriptions
    types: {
      status: {
        success: string;
        error: string;
        warning: string;
        info: string;
      };
      function: {
        config: string;
        file: string;
        folder: string;
        theme: string;
        edit: string;
        validate: string;
        reset: string;
      };
      diagnostic: {
        doctor: string;
        platform: string;
        terminal: string;
      };
      interactive: {
        goodbye: string;
        prompt: string;
      };
    };
    // CLI系统消息 | CLI system messages
    system: {
      terminalDetection: string;
      capabilityCheck: string;
      nerdFontDetected: string;
      nerdFontNotDetected: string;
      emojiDetected: string;
      emojiNotDetected: string;
      colorsDetected: string;
      colorsNotDetected: string;
      usingIconSet: string;
      fallbackToText: string;
    };
  };

  // 错误消息 | Error messages
  errors: {
    configLoadFailed: string;
    configSaveFailed: string;
    configValidationFailed: string;
    inputParseFailed: string;
    terminalNotSupported: string;
    componentNotFound: string;
  };
}

/**
 * 中文翻译资源 | Chinese translation resources
 */
const zhTranslations: TranslationKeys = {
  cli: {
    app: {
      name: 'Claude Code状态行专业版',
      description: '增强的Claude Code状态行，支持实时预览和交互式配置',
      version: '2.0.0',
    },
    commands: {
      main: {
        description: '增强的Claude Code状态行，支持实时预览和交互式配置',
        arguments: {
          preset: '预设字符串，如PMBT（项目、模型、分支、Token）',
        },
        options: {
          preset: '组件预设覆盖',
          theme: '主题名称（classic、powerline、capsule）',
          noColors: '禁用颜色输出',
          noEmoji: '禁用表情符号输出',
          noIcons: '禁用Nerd Font图标',
          config: '自定义配置文件路径',
          debug: '调试模式，显示详细输出',
          mock: '使用模拟数据场景（dev、critical、error、thinking、complete）',
        },
      },
      config: {
        description: '交互式配置，支持实时预览',
        options: {
          file: '配置文件路径',
          reset: '重置为默认配置',
          init: '使用智能终端检测初始化新配置',
          theme: '指定初始化主题（classic、powerline、capsule）',
        },
      },
      theme: {
        description: '主题管理和选择',
        arguments: {
          name: '要应用的主题名称（classic、powerline、capsule）',
        },
      },
      validate: {
        description: '验证配置文件',
        arguments: {
          file: '配置文件路径',
        },
      },
      doctor: {
        description: '诊断环境和配置',
      },
    },
  },
  editor: {
    title: 'Claude Code Statusline Pro v2.0.0',
    subtitle: '🎛️  交互式配置编辑器 - Interactive Configuration Editor',
    preview: {
      title: '✅ 实时预览 - Live Preview (配置变化时自动更新)',
      scenarios: {
        dev: '开发场景',
        critical: '临界场景',
        error: '错误场景',
      },
    },
    menu: {
      title: '配置菜单',
      unsavedIndicator: ' (*)',
      items: {
        components: {
          name: '🧩 组件配置 - 配置显示组件',
          description: '启用/禁用和配置各个状态行组件',
        },
        themes: {
          name: '🎨 主题管理 - 主题管理',
          description: '选择和自定义视觉主题',
        },
        styles: {
          name: '💄 样式设置 - 样式设置',
          description: '配置颜色、图标和视觉元素',
        },
        presets: {
          name: '📋 组件预设 - 组件预设',
          description: '管理组件顺序和预设配置',
        },
        preview: {
          name: '📊 预览当前配置 - Preview Configuration',
          description: '多场景对比预览、性能分析、主题对比',
        },
        language: {
          name: '🌍 语言设置 - Language Settings',
          description: '切换界面语言 (中文/English)',
        },
        reset: {
          name: '🔄 重置配置 - 重置为默认',
          description: '将配置重置为出厂默认值',
        },
        save: {
          name: '💾 保存配置 - 保存配置',
          description: '保存当前配置到文件',
        },
        exit: {
          name: '🚪 退出编辑器 - 退出编辑器',
          description: '退出配置编辑器',
        },
      },
    },
    components: {
      title: '选择要配置的组件：',
      items: {
        project: {
          name: '📁 项目名称 - 项目名称显示',
          description: '显示当前项目名称',
        },
        model: {
          name: '🤖 AI模型 - AI模型信息',
          description: '显示当前AI模型信息',
        },
        branch: {
          name: '🌿 Git分支 - Git分支显示',
          description: '显示Git分支和状态信息',
        },
        tokens: {
          name: '📊 Token使用 - Token使用率和进度',
          description: '显示Token使用情况和进度条',
        },
        usage: {
          name: '💰 使用量统计 - 成本和使用量信息',
          description: '显示使用成本和统计信息',
        },
        status: {
          name: '⚡ 会话状态 - 会话状态指示器',
          description: '显示当前会话状态',
        },
        back: '← 返回主菜单',
      },
      configuration: {
        enable: '启用 {{component}} 组件？',
        basic: '{{component}} 组件基础配置',
        preset_managed: '组件启用状态由预设系统管理，请通过预设管理菜单调整',
        icon: '{{component}} 组件图标：',
        color: '{{component}} 组件颜色：',
        updated: '✅ {{component}} 组件配置已更新！',
      },
    },
    themes: {
      title: '选择主题：',
      items: {
        classic: {
          name: 'Classic主题 - 传统分隔符连接，最大兼容性',
          description: '传统分隔符连接，最大终端兼容性',
        },
        powerline: {
          name: 'Powerline主题 - 箭头无缝连接，需要Nerd Font',
          description: '箭头无缝连接，需要Nerd Font支持',
        },
        capsule: {
          name: 'Capsule主题 - 胶囊形状包装，现代化UI，需要Nerd Font',
          description: '胶囊形状包装，现代化UI，需要Nerd Font',
        },
        custom: {
          name: '自定义主题 - 当前配置',
          description: '使用当前的自定义配置',
        },
        back: '← 返回主菜单',
      },
      applied: '✅ 已应用主题: {{theme}}',
    },
    styles: {
      enableColors: '启用颜色？',
      enableEmoji: '强制启用表情符号？',
      enableNerdFont: '强制启用 Nerd Font 图标？',
      separator: '组件分隔符：',
      updated: '✅ 样式设置已更新！',
    },
    presets: {
      title: '选择组件预设：',
      items: {
        PMBTUS: 'PMBTUS - 项目、模型、分支、Token、使用量、状态',
        PMBTS: 'PMBTS - 项目、模型、分支、Token、状态',
        PMB: 'PMB - 仅项目、模型、分支',
        PMBT: 'PMBT - 项目、模型、分支、Token',
        MBT: 'MBT - 模型、分支、Token',
        custom: '自定义 - 手动配置',
        back: '← 返回主菜单',
      },
      customComponents: '选择要显示的组件：',
      applied: '✅ 已应用预设: {{preset}}',
    },
    reset: {
      confirm: '确定要将所有配置重置为默认值吗？此操作无法撤销。',
      warning: '此操作无法撤销',
      success: '✅ 配置已重置为默认值',
      cancelled: '重置已取消',
    },
    save: {
      success: '✅ 配置保存成功',
      failed: '配置保存失败:',
    },
    exit: {
      unsavedTitle: '您有未保存的更改。您希望如何处理？',
      choices: {
        save: '保存并退出',
        discard: '不保存直接退出',
        cancel: '取消（继续编辑）',
      },
    },
    usage: {
      title: '💰 配置Usage组件:',
      displayMode: {
        title: '选择显示模式：',
        cost: 'cost - 仅显示成本 ($0.05)',
        tokens: 'tokens - 仅显示Token数量 (1.2K tokens)',
        combined: 'combined - 成本+Token ($0.05 (1.2K))',
        breakdown: 'breakdown - 详细分解 (1.2Kin+0.8Kout+0.3Kcache)',
      },
      showModel: '显示模型名称？',
      precision: {
        title: '选择成本显示精度：',
        options: {
          '0': '0位小数 ($1)',
          '1': '1位小数 ($1.2)',
          '2': '2位小数 ($1.23)',
          '3': '3位小数 ($1.234)',
          '4': '4位小数 ($1.2345)',
        },
      },
      updated: '✅ Usage组件配置已更新！',
    },
    language: {
      title: '🌍 语言设置 | Language Settings',
      current: '当前语言 | Current Language',
      select: '选择语言 | Select Language',
      updated: '✅ 语言设置已更新 | Language updated',
      immediate: '界面语言将在下次刷新时生效 | Interface language will take effect on next refresh',
      failed: '语言设置失败 | Failed to change language',
      noChange: '语言没有变化 | No language change',
    },
  },
  preset: {
    management: {
      title: '预设管理',
      apply_builtin: '应用内置预设',
      edit_current: '编辑当前预设',
      create_custom: '创建自定义预设',
      delete_custom: '删除自定义预设',
      preview: '预览预设效果',
    },
    builtin: {
      PMBTUS: '完整配置 - 项目、模型、分支、Token、使用量、状态',
      PMBTS: '标准配置 - 项目、模型、分支、Token、状态',
      PMBT: '开发配置 - 项目、模型、分支、Token',
      PMB: '简洁配置 - 项目、模型、分支',
      MBT: '无项目配置 - 模型、分支、Token',
    },
  },
  component: {
    config: {
      deep: '深度配置',
      categories: '配置分类',
      item_count: '配置项数量',
    },
    branch: {
      status_display: 'Git状态显示',
      operations: 'Git操作检测',
      version_info: '版本信息',
      performance: '性能优化',
    },
    tokens: {
      gradient: '渐变和进度条',
      thresholds: '阈值配置',
      context_windows: '上下文窗口',
      advanced: 'Token组件高级配置',
      basic_settings: '基础设置',
      progress_config: '进度条配置',
      threshold_config: '阈值配置',
      icon_config: '状态图标配置',
      context_config: '上下文窗口配置',
      show_gradient: '启用彩色渐变进度条',
      show_progress_bar: '显示进度条',
      show_percentage: '显示百分比',
      show_raw_numbers: '显示原始数字',
      progress_width: '进度条宽度',
      progress_chars: '进度条字符配置',
      filled_char: '已填充字符',
      empty_char: '空白字符',
      backup_char: '备用字符',
      warning_threshold: '警告阈值 (%)',
      danger_threshold: '危险阈值 (%)',
      backup_threshold: '备用区阈值 (%)',
      critical_threshold: '临界阈值 (%)',
      threshold_validation: '阈值范围必须在 0-100 之间',
      threshold_preview: '阈值预览效果',
      context_window_default: '默认上下文窗口大小',
      context_window_model: '模型专用窗口配置',
      add_model_window: '添加模型窗口配置',
      model_name: '模型名称',
      window_size: '窗口大小 (tokens)',
      emoji_icons: 'Emoji图标配置',
      nerd_icons: 'Nerd Font图标配置',
      text_icons: '文本图标配置',
      backup_status: '备用状态图标',
      critical_status: '临界状态图标',
    },
    // Model组件配置 | Model component configuration
    model: {
      advanced: 'Model组件高级配置',
      basic_settings: '基础设置',
      display_options: '显示选项',
      mapping_config: '模型映射配置',
      show_full_name: '显示模型全名',
      model_mapping: '模型名映射',
      add_mapping: '添加模型映射',
      edit_mapping: '编辑模型映射',
      delete_mapping: '删除模型映射',
      mapping_key: '模型ID',
      mapping_value: '显示名称',
      mapping_preview: '映射预览效果',
      default_mappings: '常用模型映射预设',
      no_mappings: '暂无自定义映射',
    },
    // Status组件配置 | Status component configuration
    status: {
      advanced: 'Status组件高级配置',
      basic_settings: '基础设置',
      icon_config: '状态图标配置',
      color_config: '状态颜色配置',
      error_display: '错误显示配置',
      show_recent_errors: '显示最近错误',
      status_icons: '状态图标设置',
      status_colors: '状态颜色设置',
      ready_status: '就绪状态',
      thinking_status: '思考状态',
      tool_status: '工具使用状态',
      error_status: '错误状态',
      warning_status: '警告状态',
      emoji_icons: 'Emoji图标配置',
      nerd_icons: 'Nerd Font图标配置',
      text_icons: '文本图标配置',
      ready_color: '就绪状态颜色',
      thinking_color: '思考状态颜色',
      tool_color: '工具使用颜色',
      error_color: '错误状态颜色',
      warning_color: '警告状态颜色',
    },
    order: {
      title: '组件排序配置',
      move_up: '上移组件',
      move_down: '下移组件',
      confirm: '确认排序',
      reset: '重置为默认',
    },
  },
  git: {
    status: {
      show_dirty: '显示脏工作区状态',
      show_ahead_behind: '显示ahead/behind计数',
      show_stash: '显示stash数量',
      show_staged: '显示暂存文件数',
      show_unstaged: '显示未暂存文件数',
      show_untracked: '显示未跟踪文件数',
    },
  },
  suggestion: {
    title: '智能配置建议',
    nerd_font_detected: '检测到Nerd Font支持，建议使用Powerline或Capsule主题',
    no_colors: '终端不支持颜色，建议关闭渐变效果',
    enable_git_status: '可以启用Branch组件的精细Git状态显示',
  },
  messages: {
    success: '成功',
    error: '错误',
    warning: '警告',
    info: '信息',
    loading: '加载中...',
    complete: '完成',
    cancelled: '已取消',
    goodbye: '👋 再见！',
    keyPress: '按任意键继续...',
  },
  terminal: {
    detection: {
      title: '🖥️  终端能力检测:',
      colors: '颜色支持',
      emoji: '表情符号',
      nerdFont: 'Nerd Font',
    },
    capabilities: {
      colors: '颜色',
      emoji: '表情符号',
      nerdFont: 'Nerd Font',
      interactive: '交互式TTY',
    },
  },
  config: {
    exists: '配置文件已存在。',
    overwrite: '您要覆盖现有配置吗？',
    initialized: '✅ 配置文件初始化成功',
    theme: '主题：{{theme}}',
    customization: '您可以通过编辑config.toml来自定义配置',
    validation: {
      valid: '✅ 配置有效',
      invalid: '❌ 配置无效',
      failed: '配置验证失败：',
    },
    reset: {
      confirm: '确定要将配置重置为默认值吗？',
      success: '✅ 配置已重置为默认值',
    },
  },
  diagnosis: {
    title: '环境诊断',
    platform: '平台',
    node: 'Node.js',
    terminal: '终端',
    configuration: '配置：',
    source: '配置源：',
  },
  colors: {
    cyan: '青色 (默认)',
    green: '绿色',
    yellow: '黄色',
    blue: '蓝色',
    magenta: '紫红色',
    red: '红色',
    white: '白色',
    gray: '灰色',
  },
  componentNames: {
    project: '项目名称',
    model: 'AI模型',
    branch: 'Git分支',
    tokens: 'Token使用',
    usage: '使用量统计',
    status: '会话状态',
  },
  icons: {
    types: {
      status: {
        success: '成功状态图标',
        error: '错误状态图标',
        warning: '警告状态图标',
        info: '信息状态图标',
      },
      function: {
        config: '配置功能图标',
        file: '文件功能图标',
        folder: '文件夹功能图标',
        theme: '主题功能图标',
        edit: '编辑功能图标',
        validate: '验证功能图标',
        reset: '重置功能图标',
      },
      diagnostic: {
        doctor: '诊断图标',
        platform: '平台图标',
        terminal: '终端图标',
      },
      interactive: {
        goodbye: '告别图标',
        prompt: '提示图标',
      },
    },
    system: {
      terminalDetection: '🖥️  正在检测终端能力...',
      capabilityCheck: '检查终端功能支持',
      nerdFontDetected: 'Nerd Font 支持已检测到',
      nerdFontNotDetected: 'Nerd Font 支持未检测到或检查失败',
      emojiDetected: '完整表情符号支持已检测到',
      emojiNotDetected: '完整表情符号支持未检测到或检查失败',
      colorsDetected: '颜色支持已检测到',
      colorsNotDetected: '颜色支持未检测到',
      usingIconSet: '使用图标集: {{iconSet}}',
      fallbackToText: '回退到文本模式显示',
    },
  },
  errors: {
    configLoadFailed: '配置加载失败',
    configSaveFailed: '配置保存失败',
    configValidationFailed: '配置验证失败',
    inputParseFailed: '输入数据解析失败',
    terminalNotSupported: '交互模式需要TTY终端',
    componentNotFound: '组件 {{component}} 未找到',
  },
};

/**
 * 英文翻译资源 | English translation resources
 */
const enTranslations: TranslationKeys = {
  cli: {
    app: {
      name: 'Claude Code Statusline Pro',
      description:
        'Enhanced statusline for Claude Code with live preview and interactive configuration',
      version: '2.0.0',
    },
    commands: {
      main: {
        description:
          'Enhanced statusline for Claude Code with live preview and interactive configuration',
        arguments: {
          preset: 'preset string like PMBT (Project, Model, Branch, Tokens)',
        },
        options: {
          preset: 'component preset override',
          theme: 'theme name (classic, powerline, capsule)',
          noColors: 'disable colors output',
          noEmoji: 'disable emoji output',
          noIcons: 'disable Nerd Font icons',
          config: 'custom config file path',
          debug: 'debug mode with verbose output',
          mock: 'use mock data scenario (dev, critical, error, thinking, complete)',
        },
      },
      config: {
        description: 'interactive configuration with live preview',
        options: {
          file: 'config file path',
          reset: 'reset to default configuration',
          init: 'initialize new configuration with intelligent terminal detection',
          theme: 'specify theme for initialization (classic, powerline, capsule)',
        },
      },
      theme: {
        description: 'theme management and selection',
        arguments: {
          name: 'theme name to apply (classic, powerline, capsule)',
        },
      },
      validate: {
        description: 'validate configuration file',
        arguments: {
          file: 'config file path',
        },
      },
      doctor: {
        description: 'diagnose environment and configuration',
      },
    },
  },
  editor: {
    title: 'Claude Code Statusline Pro v2.0.0',
    subtitle: '🎛️  Interactive Configuration Editor',
    preview: {
      title: '✅ Live Preview (auto-updates when configuration changes)',
      scenarios: {
        dev: 'Development scenario',
        critical: 'Critical scenario',
        error: 'Error scenario',
      },
    },
    menu: {
      title: 'Configuration Menu',
      unsavedIndicator: ' (*)',
      items: {
        components: {
          name: '🧩 Component Configuration',
          description: 'Enable/disable and configure statusline components',
        },
        themes: {
          name: '🎨 Theme Management',
          description: 'Select and customize visual themes',
        },
        styles: {
          name: '💄 Style Settings',
          description: 'Configure colors, icons and visual elements',
        },
        presets: {
          name: '📋 Component Presets',
          description: 'Manage component order and preset configurations',
        },
        preview: {
          name: '📊 Preview Configuration',
          description: 'Multi-scenario comparison, performance analysis, theme comparison',
        },
        language: {
          name: '🌍 Language Settings | 语言设置',
          description: 'Switch interface language (中文/English)',
        },
        reset: {
          name: '🔄 Reset Configuration',
          description: 'Reset configuration to factory defaults',
        },
        save: {
          name: '💾 Save Configuration',
          description: 'Save current configuration to file',
        },
        exit: {
          name: '🚪 Exit Editor',
          description: 'Exit configuration editor',
        },
      },
    },
    components: {
      title: 'Select component to configure:',
      items: {
        project: {
          name: '📁 Project Name',
          description: 'Display current project name',
        },
        model: {
          name: '🤖 AI Model',
          description: 'Display current AI model information',
        },
        branch: {
          name: '🌿 Git Branch',
          description: 'Display Git branch and status information',
        },
        tokens: {
          name: '📊 Token Usage',
          description: 'Display token usage and progress bar',
        },
        usage: {
          name: '💰 Usage Statistics',
          description: 'Display usage costs and statistics',
        },
        status: {
          name: '⚡ Session Status',
          description: 'Display current session status',
        },
        back: '← Back to main menu',
      },
      configuration: {
        enable: 'Enable {{component}} component?',
        basic: '{{component}} Component Basic Configuration',
        preset_managed:
          'Component enable status is managed by preset system, please adjust via preset management menu',
        icon: '{{component}} component icon:',
        color: '{{component}} component color:',
        updated: '✅ {{component}} component configuration updated!',
      },
    },
    themes: {
      title: 'Select theme:',
      items: {
        classic: {
          name: 'Classic Theme - Traditional separators, maximum compatibility',
          description: 'Traditional separator connection with maximum terminal compatibility',
        },
        powerline: {
          name: 'Powerline Theme - Arrow seamless connection, requires Nerd Font',
          description: 'Arrow seamless connection, requires Nerd Font support',
        },
        capsule: {
          name: 'Capsule Theme - Capsule shape wrapping, modern UI, requires Nerd Font',
          description: 'Capsule shape wrapping with modern UI, requires Nerd Font',
        },
        custom: {
          name: 'Custom Theme - Current configuration',
          description: 'Use current custom configuration',
        },
        back: '← Back to main menu',
      },
      applied: '✅ Applied theme: {{theme}}',
    },
    styles: {
      enableColors: 'Enable colors?',
      enableEmoji: 'Force enable emoji?',
      enableNerdFont: 'Force enable Nerd Font icons?',
      separator: 'Component separator:',
      updated: '✅ Style settings updated!',
    },
    presets: {
      title: 'Select component preset:',
      items: {
        PMBTUS: 'PMBTUS - Project, Model, Branch, Tokens, Usage, Status',
        PMBTS: 'PMBTS - Project, Model, Branch, Tokens, Status',
        PMB: 'PMB - Project, Model, Branch only',
        PMBT: 'PMBT - Project, Model, Branch, Tokens',
        MBT: 'MBT - Model, Branch, Tokens',
        custom: 'Custom - Manual configuration',
        back: '← Back to main menu',
      },
      customComponents: 'Select components to display:',
      applied: '✅ Applied preset: {{preset}}',
    },
    reset: {
      confirm:
        'Are you sure you want to reset all configuration to defaults? This operation cannot be undone.',
      warning: 'This operation cannot be undone',
      success: '✅ Configuration reset to defaults',
      cancelled: 'Reset cancelled',
    },
    save: {
      success: '✅ Configuration saved successfully',
      failed: 'Configuration save failed:',
    },
    exit: {
      unsavedTitle: 'You have unsaved changes. How would you like to proceed?',
      choices: {
        save: 'Save and exit',
        discard: 'Exit without saving',
        cancel: 'Cancel (continue editing)',
      },
    },
    usage: {
      title: '💰 Configure Usage Component:',
      displayMode: {
        title: 'Select display mode:',
        cost: 'cost - Show cost only ($0.05)',
        tokens: 'tokens - Show token count only (1.2K tokens)',
        combined: 'combined - Cost + tokens ($0.05 (1.2K))',
        breakdown: 'breakdown - Detailed breakdown (1.2Kin+0.8Kout+0.3Kcache)',
      },
      showModel: 'Show model name?',
      precision: {
        title: 'Select cost display precision:',
        options: {
          '0': '0 decimal places ($1)',
          '1': '1 decimal place ($1.2)',
          '2': '2 decimal places ($1.23)',
          '3': '3 decimal places ($1.234)',
          '4': '4 decimal places ($1.2345)',
        },
      },
      updated: '✅ Usage component configuration updated!',
    },
    language: {
      title: '🌍 Language Settings | 语言设置',
      current: 'Current Language | 当前语言',
      select: 'Select Language | 选择语言',
      updated: '✅ Language updated | 语言设置已更新',
      immediate: 'Interface language will take effect on next refresh | 界面语言将在下次刷新时生效',
      failed: 'Failed to change language | 语言设置失败',
      noChange: 'No language change | 语言没有变化',
    },
  },
  preset: {
    management: {
      title: 'Preset Management',
      apply_builtin: 'Apply Built-in Preset',
      edit_current: 'Edit Current Preset',
      create_custom: 'Create Custom Preset',
      delete_custom: 'Delete Custom Preset',
      preview: 'Preview Preset Effect',
    },
    builtin: {
      PMBTUS: 'Complete Configuration - Project, Model, Branch, Tokens, Usage, Status',
      PMBTS: 'Standard Configuration - Project, Model, Branch, Tokens, Status',
      PMBT: 'Development Configuration - Project, Model, Branch, Tokens',
      PMB: 'Simple Configuration - Project, Model, Branch',
      MBT: 'No Project Configuration - Model, Branch, Tokens',
    },
  },
  component: {
    config: {
      deep: 'Deep Configuration',
      categories: 'Configuration Categories',
      item_count: 'Configuration Item Count',
    },
    branch: {
      status_display: 'Git Status Display',
      operations: 'Git Operations Detection',
      version_info: 'Version Information',
      performance: 'Performance Optimization',
    },
    tokens: {
      gradient: 'Gradient and Progress Bar',
      thresholds: 'Threshold Configuration',
      context_windows: 'Context Windows',
      advanced: 'Token Component Advanced Configuration',
      basic_settings: 'Basic Settings',
      progress_config: 'Progress Bar Configuration',
      threshold_config: 'Threshold Configuration',
      icon_config: 'Status Icon Configuration',
      context_config: 'Context Window Configuration',
      show_gradient: 'Enable gradient progress bar',
      show_progress_bar: 'Show progress bar',
      show_percentage: 'Show percentage',
      show_raw_numbers: 'Show raw numbers',
      progress_width: 'Progress bar width',
      progress_chars: 'Progress bar characters',
      filled_char: 'Filled character',
      empty_char: 'Empty character',
      backup_char: 'Backup character',
      warning_threshold: 'Warning threshold (%)',
      danger_threshold: 'Danger threshold (%)',
      backup_threshold: 'Backup threshold (%)',
      critical_threshold: 'Critical threshold (%)',
      threshold_validation: 'Threshold must be between 0-100',
      threshold_preview: 'Threshold preview effect',
      context_window_default: 'Default context window size',
      context_window_model: 'Model-specific window configuration',
      add_model_window: 'Add model window configuration',
      model_name: 'Model name',
      window_size: 'Window size (tokens)',
      emoji_icons: 'Emoji icon configuration',
      nerd_icons: 'Nerd Font icon configuration',
      text_icons: 'Text icon configuration',
      backup_status: 'Backup status icon',
      critical_status: 'Critical status icon',
    },
    // Model组件配置 | Model component configuration
    model: {
      advanced: 'Model Component Advanced Configuration',
      basic_settings: 'Basic Settings',
      display_options: 'Display Options',
      mapping_config: 'Model Mapping Configuration',
      show_full_name: 'Show full model name',
      model_mapping: 'Model Name Mapping',
      add_mapping: 'Add Model Mapping',
      edit_mapping: 'Edit Model Mapping',
      delete_mapping: 'Delete Model Mapping',
      mapping_key: 'Model ID',
      mapping_value: 'Display Name',
      mapping_preview: 'Mapping Preview Effect',
      default_mappings: 'Common Model Mappings',
      no_mappings: 'No custom mappings',
    },
    // Status组件配置 | Status component configuration
    status: {
      advanced: 'Status Component Advanced Configuration',
      basic_settings: 'Basic Settings',
      icon_config: 'Status Icon Configuration',
      color_config: 'Status Color Configuration',
      error_display: 'Error Display Configuration',
      show_recent_errors: 'Show recent errors',
      status_icons: 'Status Icon Settings',
      status_colors: 'Status Color Settings',
      ready_status: 'Ready status',
      thinking_status: 'Thinking status',
      tool_status: 'Tool use status',
      error_status: 'Error status',
      warning_status: 'Warning status',
      emoji_icons: 'Emoji icon configuration',
      nerd_icons: 'Nerd Font icon configuration',
      text_icons: 'Text icon configuration',
      ready_color: 'Ready status color',
      thinking_color: 'Thinking status color',
      tool_color: 'Tool use color',
      error_color: 'Error status color',
      warning_color: 'Warning status color',
    },
    order: {
      title: 'Component Order Configuration',
      move_up: 'Move Component Up',
      move_down: 'Move Component Down',
      confirm: 'Confirm Order',
      reset: 'Reset to Default',
    },
  },
  git: {
    status: {
      show_dirty: 'Show Dirty Working Tree Status',
      show_ahead_behind: 'Show Ahead/Behind Count',
      show_stash: 'Show Stash Count',
      show_staged: 'Show Staged Files Count',
      show_unstaged: 'Show Unstaged Files Count',
      show_untracked: 'Show Untracked Files Count',
    },
  },
  suggestion: {
    title: 'Smart Configuration Suggestions',
    nerd_font_detected: 'Nerd Font support detected, recommend using Powerline or Capsule theme',
    no_colors: 'Terminal does not support colors, recommend disabling gradient effects',
    enable_git_status: 'You can enable fine-grained Git status display for Branch component',
  },
  messages: {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    loading: 'Loading...',
    complete: 'Complete',
    cancelled: 'Cancelled',
    goodbye: '👋 Goodbye!',
    keyPress: 'Press any key to continue...',
  },
  terminal: {
    detection: {
      title: '🖥️  Terminal Capability Detection:',
      colors: 'Color support',
      emoji: 'Emoji',
      nerdFont: 'Nerd Font',
    },
    capabilities: {
      colors: 'Colors',
      emoji: 'Emoji',
      nerdFont: 'Nerd Font',
      interactive: 'Interactive TTY',
    },
  },
  config: {
    exists: 'Configuration file already exists.',
    overwrite: 'Do you want to overwrite the existing configuration?',
    initialized: '✅ Configuration file initialized successfully',
    theme: 'Theme: {{theme}}',
    customization: 'You can customize your configuration by editing config.toml',
    validation: {
      valid: '✅ Configuration is valid',
      invalid: '❌ Configuration is invalid',
      failed: 'Configuration validation failed:',
    },
    reset: {
      confirm: 'Are you sure you want to reset configuration to defaults?',
      success: '✅ Configuration reset to defaults',
    },
  },
  diagnosis: {
    title: 'Environment Diagnosis',
    platform: 'Platform',
    node: 'Node.js',
    terminal: 'Terminal',
    configuration: 'Configuration:',
    source: 'Config source:',
  },
  colors: {
    cyan: 'Cyan (default)',
    green: 'Green',
    yellow: 'Yellow',
    blue: 'Blue',
    magenta: 'Magenta',
    red: 'Red',
    white: 'White',
    gray: 'Gray',
  },
  componentNames: {
    project: 'Project',
    model: 'Model',
    branch: 'Branch',
    tokens: 'Tokens',
    usage: 'Usage',
    status: 'Status',
  },
  icons: {
    types: {
      status: {
        success: 'Success status icon',
        error: 'Error status icon',
        warning: 'Warning status icon',
        info: 'Info status icon',
      },
      function: {
        config: 'Configuration function icon',
        file: 'File function icon',
        folder: 'Folder function icon',
        theme: 'Theme function icon',
        edit: 'Edit function icon',
        validate: 'Validate function icon',
        reset: 'Reset function icon',
      },
      diagnostic: {
        doctor: 'Diagnostic icon',
        platform: 'Platform icon',
        terminal: 'Terminal icon',
      },
      interactive: {
        goodbye: 'Goodbye icon',
        prompt: 'Prompt icon',
      },
    },
    system: {
      terminalDetection: '🖥️  Detecting terminal capabilities...',
      capabilityCheck: 'Checking terminal capability support',
      nerdFontDetected: 'Nerd Font support detected',
      nerdFontNotDetected: 'Nerd Font support not detected or check failed',
      emojiDetected: 'Full emoji support detected',
      emojiNotDetected: 'Full emoji support not detected or check failed',
      colorsDetected: 'Color support detected',
      colorsNotDetected: 'Color support not detected',
      usingIconSet: 'Using icon set: {{iconSet}}',
      fallbackToText: 'Falling back to text mode display',
    },
  },
  errors: {
    configLoadFailed: 'Failed to load configuration',
    configSaveFailed: 'Failed to save configuration',
    configValidationFailed: 'Configuration validation failed',
    inputParseFailed: 'Failed to parse input data',
    terminalNotSupported: 'Interactive mode requires TTY terminal',
    componentNotFound: 'Component {{component}} not found',
  },
};

/**
 * 翻译资源映射 | Translation resource mapping
 */
const translations: Record<SupportedLanguage, TranslationKeys> = {
  zh: zhTranslations,
  en: enTranslations,
};

/**
 * 国际化管理器类 | Internationalization manager class
 */
export class I18nManager {
  private currentLanguage: SupportedLanguage = 'en';
  private configLoader: ConfigLoader;
  private translationCache: Map<string, string> = new Map();

  constructor() {
    this.configLoader = new ConfigLoader();
    this.currentLanguage = this.detectSystemLanguage();
  }

  /**
   * 初始化i18n系统 | Initialize i18n system
   */
  async initialize(): Promise<void> {
    try {
      // 从配置中读取语言设置
      const config = await this.configLoader.loadConfig();
      if (config.language) {
        this.currentLanguage = config.language as SupportedLanguage;
      }
    } catch {
      // 配置加载失败时使用系统检测结果
      this.currentLanguage = this.detectSystemLanguage();
    }
  }

  /**
   * 检测系统语言 | Detect system language
   */
  detectSystemLanguage(): SupportedLanguage {
    // 检查环境变量
    const lang = process.env.LANG || process.env.LC_ALL || process.env.LANGUAGE || '';

    // 检查中文locale
    if (lang.includes('zh') || lang.includes('CN') || lang.includes('TW') || lang.includes('HK')) {
      return 'zh';
    }

    // 默认使用英文
    return 'en';
  }

  /**
   * 获取当前语言 | Get current language
   */
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * 设置语言 | Set language
   */
  async setLanguage(language: SupportedLanguage): Promise<void> {
    if (language !== this.currentLanguage) {
      this.currentLanguage = language;
      this.translationCache.clear(); // 清理缓存

      // 保存到配置文件
      try {
        const config = await this.configLoader.loadConfig();
        config.language = language;
        await this.configLoader.save(config);
      } catch (error) {
        // 配置保存失败时只更新内存中的语言设置
        console.warn('Failed to save language setting to config:', error);
      }
    }
  }

  /**
   * 获取翻译文本 | Get translated text
   */
  t(key: string, params?: TranslationParams): string {
    // 检查缓存
    const cacheKey = `${this.currentLanguage}:${key}:${JSON.stringify(params || {})}`;
    const cached = this.translationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 获取翻译
    const translation = this.getNestedTranslation(translations[this.currentLanguage], key);

    if (!translation) {
      // 回退到英文
      const fallback = this.getNestedTranslation(translations.en, key);
      if (fallback) {
        const result = this.interpolate(fallback, params);
        this.translationCache.set(cacheKey, result);
        return result;
      }

      // 如果英文也没有，返回key本身
      console.warn(`Translation not found for key: ${key}`);
      return key;
    }

    const result = this.interpolate(translation, params);
    this.translationCache.set(cacheKey, result);
    return result;
  }

  /**
   * 获取嵌套翻译 | Get nested translation
   */
  private getNestedTranslation(obj: any, key: string): string | undefined {
    const keys = key.split('.');
    let current = obj;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }

    return typeof current === 'string' ? current : undefined;
  }

  /**
   * 字符串插值 | String interpolation
   */
  private interpolate(text: string, params?: TranslationParams): string {
    if (!params) {
      return text;
    }

    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = params[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 检查是否支持指定语言 | Check if language is supported
   */
  isLanguageSupported(language: string): language is SupportedLanguage {
    return language === 'zh' || language === 'en';
  }

  /**
   * 获取支持的语言列表 | Get supported languages
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return ['zh', 'en'];
  }

  /**
   * 清理翻译缓存 | Clear translation cache
   */
  clearCache(): void {
    this.translationCache.clear();
  }

  /**
   * 获取缓存统计信息 | Get cache statistics
   */
  getCacheStats(): { size: number; hits: number } {
    return {
      size: this.translationCache.size,
      hits: 0, // 简化实现，不跟踪命中次数
    };
  }
}

/**
 * 全局i18n管理器实例 | Global i18n manager instance
 */
let globalI18nManager: I18nManager | null = null;

/**
 * 获取全局i18n管理器 | Get global i18n manager
 */
export function getI18nManager(): I18nManager {
  if (!globalI18nManager) {
    globalI18nManager = new I18nManager();
  }
  return globalI18nManager;
}

/**
 * 便捷函数：获取翻译文本 | Convenience function: get translated text
 */
export function t(key: string, params?: TranslationParams): string {
  return getI18nManager().t(key, params);
}

/**
 * 便捷函数：获取当前语言 | Convenience function: get current language
 */
export function getCurrentLanguage(): SupportedLanguage {
  return getI18nManager().getCurrentLanguage();
}

/**
 * 便捷函数：设置语言 | Convenience function: set language
 */
export async function setLanguage(language: SupportedLanguage): Promise<void> {
  return getI18nManager().setLanguage(language);
}

/**
 * 便捷函数：检测系统语言 | Convenience function: detect system language
 */
export function detectSystemLanguage(): SupportedLanguage {
  return getI18nManager().detectSystemLanguage();
}

/**
 * 便捷函数：初始化i18n系统 | Convenience function: initialize i18n system
 */
export async function initializeI18n(): Promise<void> {
  return getI18nManager().initialize();
}
