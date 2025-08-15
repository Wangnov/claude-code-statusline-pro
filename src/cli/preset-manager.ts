import type { ComponentsConfig, Config } from '../config/schema.js';

/**
 * 预设定义接口 | Preset definition interface
 */
export interface PresetDefinition {
  /** 预设ID | Preset ID */
  id: string;
  /** 预设名称 | Preset name */
  name: string;
  /** 预设描述 | Preset description */
  description: string;
  /** 组件显示顺序 | Component display order */
  order: string[];
  /** 组件启用状态 | Component enabled state */
  enabled: Record<string, boolean>;
  /** 预设类型 | Preset type */
  type?: 'builtin' | 'custom';
  /** 创建时间 | Creation time */
  createdAt?: string;
}

/**
 * 预设应用结果接口 | Preset application result interface
 */
export interface PresetApplicationResult {
  /** 是否成功 | Whether successful */
  success: boolean;
  /** 错误信息 | Error message */
  error?: string;
  /** 应用的配置 | Applied configuration */
  config?: Partial<Config>;
}

/**
 * 预设管理器类 | Preset manager class
 * 管理内置预设和自定义预设，提供预设应用和验证功能 | Manages built-in and custom presets, provides preset application and validation
 */
export class PresetManager {
  /**
   * 内置预设定义 | Built-in preset definitions
   * 基于字母缩写映射到具体组件名称 | Based on letter abbreviations mapping to specific component names
   */
  public static readonly BUILTIN_PRESETS: Record<string, PresetDefinition> = {
    // 完整配置 (推荐) | Full configuration (recommended)
    PMBTUS: {
      id: 'PMBTUS',
      name: '完整配置 | Full Configuration',
      description:
        '显示所有组件，适合完整的开发环境监控 | Display all components, suitable for comprehensive development monitoring',
      order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
      enabled: {
        project: true,
        model: true,
        branch: true,
        tokens: true,
        usage: true,
        status: true,
      },
      type: 'builtin',
    },

    // 不含使用量 | Without usage
    PMBTS: {
      id: 'PMBTS',
      name: '标准配置 | Standard Configuration',
      description:
        '不显示使用量信息，适合关注核心开发指标 | Hide usage info, focus on core development metrics',
      order: ['project', 'model', 'branch', 'tokens', 'status'],
      enabled: {
        project: true,
        model: true,
        branch: true,
        tokens: true,
        usage: false,
        status: true,
      },
      type: 'builtin',
    },

    // 基础开发配置 | Basic development configuration
    PMBT: {
      id: 'PMBT',
      name: '开发配置 | Development Configuration',
      description:
        '显示项目、模型、分支和Token信息，适合日常开发 | Show project, model, branch and token info, suitable for daily development',
      order: ['project', 'model', 'branch', 'tokens'],
      enabled: {
        project: true,
        model: true,
        branch: true,
        tokens: true,
        usage: false,
        status: false,
      },
      type: 'builtin',
    },

    // 最简配置 | Minimal configuration
    PMB: {
      id: 'PMB',
      name: '简洁配置 | Minimal Configuration',
      description:
        '只显示项目、模型和分支信息，适合简洁界面 | Show only project, model and branch info, suitable for clean interface',
      order: ['project', 'model', 'branch'],
      enabled: {
        project: true,
        model: true,
        branch: true,
        tokens: false,
        usage: false,
        status: false,
      },
      type: 'builtin',
    },

    // 无项目名配置 | Without project name
    MBT: {
      id: 'MBT',
      name: '无项目配置 | No Project Configuration',
      description:
        '不显示项目名，适合单一项目或简化显示 | Hide project name, suitable for single project or simplified display',
      order: ['model', 'branch', 'tokens'],
      enabled: {
        project: false,
        model: true,
        branch: true,
        tokens: true,
        usage: false,
        status: false,
      },
      type: 'builtin',
    },

    // Token监控配置 | Token monitoring configuration
    PMTS: {
      id: 'PMTS',
      name: 'Token监控 | Token Monitoring',
      description:
        '重点关注Token使用情况，适合性能监控 | Focus on token usage, suitable for performance monitoring',
      order: ['project', 'model', 'tokens', 'status'],
      enabled: {
        project: true,
        model: true,
        branch: false,
        tokens: true,
        usage: false,
        status: true,
      },
      type: 'builtin',
    },

    // 分支专注配置 | Branch focused configuration
    PB: {
      id: 'PB',
      name: '分支专注 | Branch Focused',
      description:
        '专注于项目和分支信息，适合Git工作流 | Focus on project and branch info, suitable for Git workflow',
      order: ['project', 'branch'],
      enabled: {
        project: true,
        model: false,
        branch: true,
        tokens: false,
        usage: false,
        status: false,
      },
      type: 'builtin',
    },

    // 模型专注配置 | Model focused configuration
    MT: {
      id: 'MT',
      name: '模型专注 | Model Focused',
      description:
        '专注于模型和Token信息，适合AI模型监控 | Focus on model and token info, suitable for AI model monitoring',
      order: ['model', 'tokens'],
      enabled: {
        project: false,
        model: true,
        branch: false,
        tokens: true,
        usage: false,
        status: false,
      },
      type: 'builtin',
    },
  };

  private customPresets: Map<string, PresetDefinition> = new Map();

  /**
   * 构造函数 | Constructor
   */
  constructor() {
    this.loadCustomPresets();
  }

  /**
   * 应用预设到配置 | Apply preset to configuration
   */
  public applyPreset(config: Partial<Config>, presetId: string): PresetApplicationResult {
    try {
      // 验证预设ID | Validate preset ID
      if (!this.validatePreset(presetId)) {
        return {
          success: false,
          error: `无效的预设ID: ${presetId} | Invalid preset ID: ${presetId}`,
        };
      }

      // 获取预设定义 | Get preset definition
      const preset = this.getPresetDefinition(presetId);
      if (!preset) {
        return {
          success: false,
          error: `预设不存在: ${presetId} | Preset not found: ${presetId}`,
        };
      }

      // 深拷贝配置以避免修改原始对象 | Deep copy config to avoid modifying original object
      const updatedConfig: Partial<Config> = JSON.parse(JSON.stringify(config));

      // 设置预设ID | Set preset ID
      updatedConfig.preset = presetId;

      // 初始化组件配置 | Initialize components config
      if (!updatedConfig.components) {
        updatedConfig.components = {
          order: [],
        };
      }

      // 应用组件顺序 | Apply component order
      updatedConfig.components.order = [...preset.order];

      // 应用组件启用状态 | Apply component enabled state
      for (const [componentName, enabled] of Object.entries(preset.enabled)) {
        // 确保组件配置存在 | Ensure component config exists
        if (!updatedConfig.components![componentName as keyof ComponentsConfig]) {
          (updatedConfig.components as any)[componentName] = {};
        }

        // 设置启用状态 | Set enabled state
        const componentConfig = (updatedConfig.components! as any)[componentName];
        if (componentConfig && typeof componentConfig === 'object') {
          componentConfig.enabled = enabled;
        }
      }

      return {
        success: true,
        config: updatedConfig,
      };
    } catch (error) {
      return {
        success: false,
        error: `应用预设失败: ${error instanceof Error ? error.message : String(error)} | Failed to apply preset: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 获取所有可用预设 | Get all available presets
   */
  public getAvailablePresets(): PresetDefinition[] {
    const builtinPresets = Object.values(PresetManager.BUILTIN_PRESETS);
    const customPresets = Array.from(this.customPresets.values());

    return [...builtinPresets, ...customPresets].sort((a, b) => {
      // 内置预设优先 | Built-in presets first
      if (a.type === 'builtin' && b.type !== 'builtin') return -1;
      if (a.type !== 'builtin' && b.type === 'builtin') return 1;

      // 按名称排序 | Sort by name
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * 验证预设ID是否有效 | Validate if preset ID is valid
   */
  public validatePreset(presetId: string): boolean {
    if (!presetId || typeof presetId !== 'string') {
      return false;
    }

    // 检查内置预设 | Check built-in presets
    if (PresetManager.BUILTIN_PRESETS[presetId]) {
      return true;
    }

    // 检查自定义预设 | Check custom presets
    return this.customPresets.has(presetId);
  }

  /**
   * 创建自定义预设 | Create custom preset
   */
  public createCustomPreset(
    name: string,
    order: string[],
    enabled: Record<string, boolean>,
    description?: string
  ): PresetDefinition {
    // 生成唯一ID | Generate unique ID
    const id = this.generateCustomPresetId(name);

    // 创建预设定义 | Create preset definition
    const preset: PresetDefinition = {
      id,
      name,
      description: description || `自定义预设: ${name} | Custom preset: ${name}`,
      order: [...order],
      enabled: { ...enabled },
      type: 'custom',
      createdAt: new Date().toISOString(),
    };

    // 保存到内存 | Save to memory
    this.customPresets.set(id, preset);

    // 持久化保存 | Persist save
    this.saveCustomPresets();

    return preset;
  }

  /**
   * 删除自定义预设 | Delete custom preset
   */
  public deleteCustomPreset(presetId: string): boolean {
    // 不能删除内置预设 | Cannot delete built-in presets
    if (PresetManager.BUILTIN_PRESETS[presetId]) {
      return false;
    }

    // 删除自定义预设 | Delete custom preset
    const deleted = this.customPresets.delete(presetId);
    if (deleted) {
      this.saveCustomPresets();
    }

    return deleted;
  }

  /**
   * 获取预设定义 | Get preset definition
   */
  public getPresetDefinition(presetId: string): PresetDefinition | null {
    // 优先查找内置预设 | Prioritize built-in presets
    const builtinPreset = PresetManager.BUILTIN_PRESETS[presetId];
    if (builtinPreset) {
      return builtinPreset;
    }

    // 查找自定义预设 | Find custom preset
    return this.customPresets.get(presetId) || null;
  }

  /**
   * 获取预设摘要信息 | Get preset summary info
   */
  public getPresetSummary(presetId: string): string {
    const preset = this.getPresetDefinition(presetId);
    if (!preset) {
      return `未知预设 | Unknown preset: ${presetId}`;
    }

    const enabledComponents = Object.entries(preset.enabled)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);

    const componentCount = enabledComponents.length;
    const componentList = enabledComponents.join(', ');

    return `${preset.name} (${componentCount}个组件 | ${componentCount} components): ${componentList}`;
  }

  /**
   * 根据组件配置推荐预设 | Recommend preset based on component configuration
   */
  public recommendPreset(componentsConfig: ComponentsConfig): string[] {
    const enabledComponents = new Set<string>();

    // 分析启用的组件 | Analyze enabled components
    for (const [componentName, config] of Object.entries(componentsConfig)) {
      if (componentName === 'order') continue;

      if (config && typeof config === 'object' && 'enabled' in config) {
        if (config.enabled !== false) {
          enabledComponents.add(componentName);
        }
      }
    }

    // 计算匹配分数 | Calculate match scores
    const recommendations: Array<{ id: string; score: number }> = [];

    for (const preset of this.getAvailablePresets()) {
      let score = 0;
      let totalComponents = 0;

      for (const [componentName, enabled] of Object.entries(preset.enabled)) {
        totalComponents++;
        const isEnabled = enabledComponents.has(componentName);

        if (enabled && isEnabled) {
          score += 2; // 正匹配 | Positive match
        } else if (!enabled && !isEnabled) {
          score += 1; // 负匹配 | Negative match
        } else {
          score -= 1; // 不匹配 | Mismatch
        }
      }

      // 标准化分数 | Normalize score
      const normalizedScore = totalComponents > 0 ? score / totalComponents : 0;
      recommendations.push({ id: preset.id, score: normalizedScore });
    }

    // 按分数降序排序并返回前3个 | Sort by score descending and return top 3
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((r) => r.id);
  }

  /**
   * 生成自定义预设ID | Generate custom preset ID
   */
  private generateCustomPresetId(name: string): string {
    // 基于名称生成基础ID | Generate base ID based on name
    const baseId = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    // 确保唯一性 | Ensure uniqueness
    let id = `custom_${baseId}`;
    let counter = 1;

    while (this.validatePreset(id)) {
      id = `custom_${baseId}_${counter}`;
      counter++;
    }

    return id;
  }

  /**
   * 加载自定义预设 | Load custom presets
   */
  private loadCustomPresets(): void {
    try {
      // 这里可以从文件系统或其他持久化存储加载 | Load from file system or other persistent storage
      // 目前使用内存存储 | Currently using memory storage
      this.customPresets.clear();
    } catch (error) {
      console.warn('Failed to load custom presets:', error);
      this.customPresets.clear();
    }
  }

  /**
   * 保存自定义预设 | Save custom presets
   */
  private saveCustomPresets(): void {
    // 这里可以保存到文件系统或其他持久化存储 | Save to file system or other persistent storage
    // 目前使用内存存储 | Currently using memory storage
    // console.log('Custom presets saved:', Array.from(this.customPresets.keys()));
  }

  /**
   * 获取内置预设的字母映射说明 | Get built-in preset letter mapping description
   */
  public static getPresetMappingDescription(): string {
    return `
预设字母映射 | Preset Letter Mapping:
- P: project  (项目 | Project)
- M: model    (模型 | Model)  
- B: branch   (分支 | Branch)
- T: tokens   (令牌 | Tokens)
- U: usage    (使用量 | Usage)
- S: status   (状态 | Status)

内置预设 | Built-in Presets:
- PMBTUS: 完整配置 (推荐) | Full Configuration (Recommended)
- PMBTS:  标准配置 | Standard Configuration
- PMBT:   开发配置 | Development Configuration
- PMB:    简洁配置 | Minimal Configuration
- MBT:    无项目配置 | No Project Configuration
- PMTS:   Token监控 | Token Monitoring
- PB:     分支专注 | Branch Focused
- MT:     模型专注 | Model Focused
`;
  }

  /**
   * 检查组件是否启用 | Check if component is enabled
   * 通过当前配置的components.order来判断组件是否启用
   */
  public isComponentEnabled(config: Partial<Config>, componentName: string): boolean {
    const order = config.components?.order || [];
    return order.includes(componentName);
  }

  /**
   * 获取所有启用的组件 | Get all enabled components
   */
  public getEnabledComponents(config: Partial<Config>): string[] {
    return config.components?.order || [];
  }

  /**
   * 验证预设与当前配置的一致性 | Validate preset consistency with current configuration
   */
  public validatePresetConsistency(config: Partial<Config>): {
    isConsistent: boolean;
    currentPreset?: string;
    recommendedPresets: string[];
    issues: string[];
  } {
    const issues: string[] = [];
    const currentPreset = config.preset;

    // 如果没有设置预设，推荐预设
    if (!currentPreset) {
      const recommended = this.recommendPreset(config.components || { order: [] });
      return {
        isConsistent: false,
        recommendedPresets: recommended,
        issues: [
          '未设置预设，建议应用合适的预设以管理组件状态 | No preset set, recommend applying suitable preset',
        ],
      };
    }

    // 获取预设定义
    const presetDef = this.getPresetDefinition(currentPreset);
    if (!presetDef) {
      return {
        isConsistent: false,
        currentPreset,
        recommendedPresets: [],
        issues: [`预设不存在: ${currentPreset} | Preset not found: ${currentPreset}`],
      };
    }

    // 检查组件顺序是否一致
    const currentOrder = config.components?.order || [];
    const presetOrder = presetDef.order;

    if (!this.arraysEqual(currentOrder, presetOrder)) {
      issues.push(
        `组件顺序与预设不一致 | Component order differs from preset. 当前: ${currentOrder.join(',')} vs 预设: ${presetOrder.join(',')}`
      );
    }

    // 检查启用状态是否一致
    const enabledComponents = new Set(currentOrder);
    for (const [componentName, expectedEnabled] of Object.entries(presetDef.enabled)) {
      const actualEnabled = enabledComponents.has(componentName);
      if (actualEnabled !== expectedEnabled) {
        issues.push(
          `组件 ${componentName} 启用状态不一致 | Component ${componentName} enabled state inconsistent. 当前: ${actualEnabled} vs 预设: ${expectedEnabled}`
        );
      }
    }

    return {
      isConsistent: issues.length === 0,
      currentPreset,
      recommendedPresets:
        issues.length > 0 ? this.recommendPreset(config.components || { order: [] }) : [],
      issues,
    };
  }

  /**
   * 应用预设时同步删除组件内的enabled属性 | Remove enabled properties from components when applying preset
   */
  public applyPresetAndCleanup(config: Partial<Config>, presetId: string): PresetApplicationResult {
    const result = this.applyPreset(config, presetId);

    if (result.success && result.config) {
      // 清理组件内的enabled属性，因为启用状态现在由preset的components.order控制
      const components = result.config.components;
      if (components) {
        const componentNames = ['project', 'model', 'branch', 'tokens', 'usage', 'status'];
        for (const componentName of componentNames) {
          const componentConfig = (components as any)[componentName];
          if (
            componentConfig &&
            typeof componentConfig === 'object' &&
            'enabled' in componentConfig
          ) {
            delete componentConfig.enabled; // 移除enabled属性
          }
        }
      }
    }

    return result;
  }

  /**
   * 比较两个数组是否相等 | Compare if two arrays are equal
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }

  /**
   * 验证组件顺序的有效性 | Validate component order validity
   */
  public static validateComponentOrder(order: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validComponents = ['project', 'model', 'branch', 'tokens', 'usage', 'status'];
    const duplicates = new Set<string>();
    const seen = new Set<string>();

    for (const component of order) {
      // 检查是否为有效组件 | Check if valid component
      if (!validComponents.includes(component)) {
        errors.push(`无效的组件名: ${component} | Invalid component name: ${component}`);
      }

      // 检查重复 | Check duplicates
      if (seen.has(component)) {
        duplicates.add(component);
      }
      seen.add(component);
    }

    // 添加重复错误 | Add duplicate errors
    if (duplicates.size > 0) {
      errors.push(
        `重复的组件: ${Array.from(duplicates).join(', ')} | Duplicate components: ${Array.from(duplicates).join(', ')}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取组件的默认启用状态 | Get default enabled state for components
   */
  public static getDefaultEnabledState(): Record<string, boolean> {
    return {
      project: true,
      model: true,
      branch: true,
      tokens: true,
      usage: true,
      status: true,
    };
  }

  /**
   * 从预设字符串解析组件 | Parse components from preset string
   * 例如: "PMBT" -> ['project', 'model', 'branch', 'tokens']
   */
  public static parsePresetString(presetString: string): {
    order: string[];
    enabled: Record<string, boolean>;
  } {
    const mapping: Record<string, string> = {
      P: 'project',
      M: 'model',
      B: 'branch',
      T: 'tokens',
      U: 'usage',
      S: 'status',
    };

    const order: string[] = [];
    const enabled = PresetManager.getDefaultEnabledState();

    // 首先全部设为false | First set all to false
    for (const component in enabled) {
      enabled[component] = false;
    }

    // 解析预设字符串 | Parse preset string
    for (const char of presetString.toUpperCase()) {
      const component = mapping[char];
      if (component && !order.includes(component)) {
        order.push(component);
        enabled[component] = true;
      }
    }

    return { order, enabled };
  }
}

/**
 * 默认预设管理器实例 | Default preset manager instance
 */
export const defaultPresetManager = new PresetManager();

/**
 * 便捷函数：应用预设 | Convenience function: apply preset
 */
export function applyPreset(config: Partial<Config>, presetId: string): PresetApplicationResult {
  return defaultPresetManager.applyPreset(config, presetId);
}

/**
 * 便捷函数：获取可用预设 | Convenience function: get available presets
 */
export function getAvailablePresets(): PresetDefinition[] {
  return defaultPresetManager.getAvailablePresets();
}

/**
 * 便捷函数：验证预设 | Convenience function: validate preset
 */
export function validatePreset(presetId: string): boolean {
  return defaultPresetManager.validatePreset(presetId);
}

/**
 * 便捷函数：获取预设定义 | Convenience function: get preset definition
 */
export function getPresetDefinition(presetId: string): PresetDefinition | null {
  return defaultPresetManager.getPresetDefinition(presetId);
}
