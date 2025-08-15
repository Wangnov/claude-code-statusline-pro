/**
 * 验证管理器 - Validation Manager
 * 负责配置验证、预设一致性检查和配置迁移功能
 *
 * 核心功能:
 * - 配置完整性验证
 * - 预设一致性检查
 * - 从旧版本配置迁移
 * - 配置架构验证
 * - 组件配置验证
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ConfigLoader } from '../../config/loader.js';
import type { Config } from '../../config/schema.js';
import { TerminalDetector } from '../../terminal/detector.js';
import { defaultPresetManager } from '../preset-manager.js';

/**
 * 验证结果接口 | Validation result interface
 * 从 config-editor.ts 第38-49行迁移
 */
export interface ValidationResult {
  /** 验证是否通过 | Whether validation passed */
  valid: boolean;
  /** 错误信息列表 | Error messages list */
  errors: string[];
  /** 警告信息列表 | Warning messages list */
  warnings: string[];
  /** 建议信息列表 | Suggestion messages list */
  suggestions?: string[];
}

/**
 * 预设一致性检查结果 | Preset consistency check result
 * 从 config-editor.ts 第51-67行迁移
 */
export interface PresetConsistencyResult extends ValidationResult {
  /** 当前预设ID | Current preset ID */
  currentPreset: string;
  /** 预期配置 | Expected configuration */
  expectedConfig?: {
    order: string[];
    enabled: Record<string, boolean>;
  };
  /** 实际配置 | Actual configuration */
  actualConfig?: {
    order: string[];
    enabled: Record<string, boolean>;
  };
}

/**
 * 迁移结果接口 | Migration result interface
 * 从 config-editor.ts 第70-86行迁移
 */
export interface MigrationResult {
  /** 迁移是否成功 | Whether migration succeeded */
  success: boolean;
  /** 迁移后的配置 | Migrated configuration */
  migratedConfig?: Config;
  /** 迁移报告 | Migration report */
  report: {
    itemsMigrated: number;
    itemsSkipped: number;
    itemsError: number;
    details: string[];
  };
  /** 错误信息 | Error messages */
  errors?: string[];
}

/**
 * 验证管理器选项接口
 */
export interface ValidationManagerOptions {
  /** 是否启用严格模式验证 */
  strictMode?: boolean;
  /** 是否允许警告 */
  allowWarnings?: boolean;
  /** 配置文件路径 */
  configPath?: string;
}

/**
 * 验证管理器类
 * 专门处理配置验证相关的所有功能
 */
export class ValidationManager {
  private terminalDetector: TerminalDetector;
  private configLoader: ConfigLoader;
  private options: Required<ValidationManagerOptions>;

  constructor(options: ValidationManagerOptions = {}) {
    this.configLoader = new ConfigLoader();
    this.terminalDetector = new TerminalDetector();
    this.options = {
      strictMode: options.strictMode ?? false,
      allowWarnings: options.allowWarnings ?? true,
      configPath: options.configPath ?? '',
    };
  }

  /**
   * 验证配置完整性 | Validate Configuration Completeness
   * 检查配置对象的完整性和有效性
   */
  validateConfigCompleteness(config: Config): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    try {
      // 1. 验证基本配置结构
      this.validateBasicStructure(config, result);

      // 2. 验证主题配置
      this.validateThemeConfiguration(config, result);

      // 3. 验证组件配置
      this.validateComponentsConfiguration(config, result);

      // 4. 验证样式配置
      this.validateStyleConfiguration(config, result);

      // 5. 验证终端配置
      this.validateTerminalConfiguration(config, result);

      // 6. 验证依赖关系
      this.validateDependencies(config, result);

      // 检查是否有致命错误
      result.valid = result.errors.length === 0;
    } catch (error) {
      result.valid = false;
      result.errors.push(`配置验证异常: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * 验证主题兼容性 | Validate Theme Compatibility
   * 检查主题设置与终端能力的兼容性
   */
  validateThemeCompatibility(config: Config): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    try {
      // 检测终端能力
      const capabilities = this.terminalDetector.detectCapabilities();

      // 验证Powerline主题兼容性
      if (config.theme === 'powerline') {
        if (!capabilities.nerdFont && !config.terminal?.force_nerd_font) {
          result.warnings.push('Powerline主题建议使用Nerd Font，当前终端可能不支持');
          result.suggestions?.push(
            '建议在terminal配置中设置force_nerd_font=true或使用支持Nerd Font的终端'
          );
        }

        // 检查是否启用了gradient但终端不支持颜色
        if (config.themes?.powerline?.enable_gradient && !capabilities.colors) {
          result.warnings.push('启用了渐变效果但终端不支持颜色显示');
          result.suggestions?.push('建议在样式配置中禁用颜色或使用支持颜色的终端');
        }
      }

      // 验证Capsule主题兼容性
      if (config.theme === 'capsule') {
        if (!capabilities.nerdFont && !config.terminal?.force_nerd_font) {
          result.warnings.push('Capsule主题建议使用Nerd Font，当前终端可能不支持');
          result.suggestions?.push(
            '建议在terminal配置中设置force_nerd_font=true或使用支持Nerd Font的终端'
          );
        }

        if (config.themes?.capsule?.capsule_style && !capabilities.colors) {
          result.warnings.push('Capsule样式需要颜色支持，当前终端可能无法正确显示');
        }
      }

      // 验证渐变功能兼容性
      if (config.components?.tokens && (config.components.tokens as any).show_gradient) {
        if (!capabilities.colors) {
          result.errors.push('Token渐变功能需要终端颜色支持，当前终端不支持颜色');
          result.suggestions?.push('请禁用Token渐变功能或使用支持颜色的终端');
        }
      }

      // 验证Emoji兼容性
      if (config.style?.enable_emoji === true || config.style?.enable_emoji === 'auto') {
        if (!capabilities.emoji && config.style?.enable_emoji === true) {
          result.warnings.push('强制启用了Emoji但终端可能不支持');
          result.suggestions?.push('建议将enable_emoji设置为"auto"以允许自动检测');
        }
      }

      // 验证终端强制选项冲突
      const forceOptions = [
        config.terminal?.force_emoji,
        config.terminal?.force_nerd_font,
        config.terminal?.force_text,
      ].filter(Boolean).length;

      if (forceOptions > 1) {
        result.errors.push('不能同时强制启用多个终端特性选项');
        result.suggestions?.push('请只选择一个force_*选项，或使用auto检测');
      }

      result.valid = result.errors.length === 0;
    } catch (error) {
      result.valid = false;
      result.errors.push(
        `主题兼容性验证异常: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return result;
  }

  /**
   * 检查预设一致性 | Check Preset Consistency
   * 验证当前配置是否与应用的预设一致
   * 现在基于components.order来判断组件启用状态，而不是enabled属性
   */
  checkPresetConsistency(config: Config): PresetConsistencyResult {
    const result: PresetConsistencyResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      currentPreset: config.preset || 'CUSTOM',
    };

    try {
      const presetId = config.preset;
      if (!presetId || presetId === 'CUSTOM') {
        // 为自定义配置推荐预设
        const components = config.components || { order: [] };
        const recommended = defaultPresetManager.recommendPreset(components);
        if (recommended.length > 0) {
          result.suggestions?.push(`建议应用预设: ${recommended.slice(0, 3).join(', ')}`);
          result.suggestions?.push('应用预设可以统一管理组件启用状态');
        }
        result.warnings.push('当前使用自定义配置，建议应用预设以统一管理组件状态');
        return result;
      }

      // 使用PresetManager的新方法进行验证
      const consistency = defaultPresetManager.validatePresetConsistency(config);

      if (!consistency.isConsistent) {
        result.valid = false;
        result.errors.push(...consistency.issues);

        if (consistency.recommendedPresets.length > 0) {
          result.suggestions?.push(
            `推荐预设: ${consistency.recommendedPresets.slice(0, 3).join(', ')}`
          );
        }
      }

      // 获取预设定义用于显示期望配置
      const presetDefinition = defaultPresetManager.getPresetDefinition(presetId);
      if (presetDefinition) {
        const expectedOrder = presetDefinition.order;
        const expectedEnabled = presetDefinition.enabled;

        // 获取实际配置（基于components.order）
        const actualOrder = config.components?.order || [];
        const actualEnabled: Record<string, boolean> = {};

        const allComponents = ['project', 'model', 'branch', 'tokens', 'usage', 'status'];
        for (const component of allComponents) {
          // 新逻辑：通过components.order判断组件是否启用
          actualEnabled[component] = actualOrder.includes(component);
        }

        result.expectedConfig = { order: expectedOrder, enabled: expectedEnabled };
        result.actualConfig = { order: actualOrder, enabled: actualEnabled };

        // 检查组件顺序一致性
        if (JSON.stringify(expectedOrder) !== JSON.stringify(actualOrder)) {
          result.warnings.push('组件排序与预设不一致');
          result.suggestions?.push(`预期排序: ${expectedOrder.join(' → ')}`);
          result.suggestions?.push(`实际排序: ${actualOrder.join(' → ')}`);
        }

        // 检查启用状态一致性
        for (const component of allComponents) {
          const expectedState = expectedEnabled[component] ?? false;
          const actualState = actualEnabled[component] ?? false;

          if (expectedState !== actualState) {
            const stateText = expectedState ? '启用' : '禁用';
            result.warnings.push(`组件 "${component}" 应为${stateText}状态`);
          }
        }
      } else {
        result.valid = false;
        result.errors.push(`找不到预设定义: ${presetId}`);
      }

      // 如果有警告但没有错误，标记为有效但不一致
      result.valid = result.errors.length === 0;
    } catch (error) {
      result.valid = false;
      result.errors.push(
        `预设一致性检查异常: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return result;
  }

  /**
   * 从旧版本配置迁移 | Migrate From Legacy Configuration
   * 将旧版本的配置格式迁移到新版本
   */
  migrateFromLegacyConfig(legacyConfigPath?: string): MigrationResult {
    const result: MigrationResult = {
      success: false,
      report: {
        itemsMigrated: 0,
        itemsSkipped: 0,
        itemsError: 0,
        details: [],
      },
      errors: [],
    };

    try {
      // 1. 查找旧配置文件
      const legacyPath = legacyConfigPath || this.findLegacyConfigFile();
      if (!legacyPath) {
        result.report.details.push('未找到旧版本配置文件');
        result.success = true; // 没有旧配置不算失败
        return result;
      }

      result.report.details.push(`发现旧配置文件: ${legacyPath}`);

      // 2. 读取旧配置
      const legacyConfig = this.readLegacyConfig(legacyPath);
      if (!legacyConfig) {
        result.errors?.push('无法读取旧配置文件');
        return result;
      }

      // 3. 执行迁移
      const migratedConfig = this.performMigration(legacyConfig, result);
      if (!migratedConfig) {
        result.errors?.push('配置迁移失败');
        return result;
      }

      result.migratedConfig = migratedConfig;
      result.success = true;
      result.report.details.push(`成功迁移 ${result.report.itemsMigrated} 个配置项`);
    } catch (error) {
      result.success = false;
      result.errors?.push(
        `迁移过程异常: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return result;
  }

  /**
   * 验证基本配置结构
   */
  private validateBasicStructure(config: Config, result: ValidationResult): void {
    // 检查必要的顶级属性
    if (!config.theme) {
      result.warnings.push('未设置主题，将使用默认主题 classic');
    }

    if (!config.preset) {
      result.suggestions?.push('建议设置预设以便于管理组件配置');
    }

    // 检查版本兼容性
    if (config.version && config.version !== '2.0.0') {
      result.warnings.push(`配置版本 ${config.version} 可能不兼容当前版本 2.0.0`);
    }
  }

  /**
   * 验证主题配置
   */
  private validateThemeConfiguration(config: Config, result: ValidationResult): void {
    const supportedThemes = ['classic', 'powerline', 'capsule'];

    if (config.theme && !supportedThemes.includes(config.theme)) {
      result.errors.push(`不支持的主题: ${config.theme}`);
      result.suggestions?.push(`支持的主题: ${supportedThemes.join(', ')}`);
    }

    // 验证主题特定配置
    if (config.themes) {
      for (const [themeName, _themeConfig] of Object.entries(config.themes)) {
        if (!supportedThemes.includes(themeName)) {
          result.warnings.push(`未知的主题配置: ${themeName}`);
        }
      }
    }
  }

  /**
   * 验证组件配置
   */
  private validateComponentsConfiguration(config: Config, result: ValidationResult): void {
    if (!config.components) {
      result.errors.push('缺少组件配置');
      return;
    }

    const supportedComponents = ['project', 'model', 'branch', 'tokens', 'usage', 'status'];
    const configuredComponents = Object.keys(config.components).filter((key) => key !== 'order');

    // 检查未知组件
    for (const component of configuredComponents) {
      if (!supportedComponents.includes(component)) {
        result.warnings.push(`未知的组件: ${component}`);
      }
    }

    // 检查组件顺序
    if (!config.components.order || config.components.order.length === 0) {
      result.warnings.push('未设置组件显示顺序');
      result.suggestions?.push('建议设置 components.order 来控制组件显示顺序');
    } else {
      // 检查顺序中的无效组件
      for (const component of config.components.order) {
        if (!supportedComponents.includes(component)) {
          result.errors.push(`组件顺序中包含无效组件: ${component}`);
        }
      }
    }

    // 验证特定组件配置
    this.validateTokensComponent(config, result);
    this.validateBranchComponent(config, result);
  }

  /**
   * 验证样式配置
   */
  private validateStyleConfiguration(config: Config, result: ValidationResult): void {
    if (config.style) {
      const style = config.style;

      // 检查颜色配置
      if (
        style.enable_colors !== undefined &&
        typeof style.enable_colors !== 'boolean' &&
        style.enable_colors !== 'auto'
      ) {
        result.errors.push('enable_colors 必须为 boolean 或 "auto"');
      }

      // 检查最大宽度
      if (
        style.max_width !== undefined &&
        (typeof style.max_width !== 'number' || style.max_width < 0)
      ) {
        result.errors.push('max_width 必须为非负数');
      }
    }
  }

  /**
   * 验证终端配置
   */
  private validateTerminalConfiguration(config: Config, result: ValidationResult): void {
    if (config.terminal) {
      const terminal = config.terminal;

      // 检查强制选项的冲突
      const forceOptions = [terminal.force_emoji, terminal.force_nerd_font, terminal.force_text];
      const activeForceOptions = forceOptions.filter((option) => option === true).length;

      if (activeForceOptions > 1) {
        result.errors.push('不能同时强制启用多个终端特性选项');
      }
    }
  }

  /**
   * 验证Tokens组件配置
   */
  private validateTokensComponent(config: Config, result: ValidationResult): void {
    const tokensConfig = config.components?.tokens as any;
    if (!tokensConfig) return;

    // 验证阈值配置
    if (tokensConfig.thresholds) {
      const thresholds = tokensConfig.thresholds;
      const values = [
        thresholds.warning,
        thresholds.danger,
        thresholds.backup,
        thresholds.critical,
      ].filter((v) => v !== undefined);

      for (let i = 1; i < values.length; i++) {
        if (values[i] <= values[i - 1]) {
          result.errors.push('Tokens阈值必须递增排列');
          break;
        }
      }

      // 检查阈值范围
      for (const [key, value] of Object.entries(thresholds)) {
        if (typeof value === 'number' && (value < 0 || value > 100)) {
          result.errors.push(`${key}阈值必须在0-100之间`);
        }
      }
    }

    // 验证进度条宽度
    if (tokensConfig.progress_width !== undefined) {
      const width = tokensConfig.progress_width;
      if (typeof width !== 'number' || width < 5 || width > 50) {
        result.errors.push('进度条宽度必须在5-50之间');
      }
    }

    // 验证上下文窗口配置
    if (tokensConfig.context_windows) {
      const windows = tokensConfig.context_windows;
      for (const [model, size] of Object.entries(windows)) {
        if (typeof size !== 'number' || size <= 0) {
          result.errors.push(`模型 ${model} 的上下文窗口大小必须为正数`);
        }
      }
    }
  }

  /**
   * 验证Branch组件配置
   */
  private validateBranchComponent(config: Config, result: ValidationResult): void {
    const branchConfig = config.components?.branch as any;
    if (!branchConfig) return;

    // 验证性能配置
    if (branchConfig.performance) {
      const perf = branchConfig.performance;

      if (
        perf.cache_ttl !== undefined &&
        (typeof perf.cache_ttl !== 'number' || perf.cache_ttl < 0)
      ) {
        result.errors.push('Branch组件缓存TTL必须为非负数');
      }

      if (
        perf.git_timeout !== undefined &&
        (typeof perf.git_timeout !== 'number' || perf.git_timeout <= 0)
      ) {
        result.errors.push('Branch组件Git超时时间必须为正数');
      }

      if (
        perf.large_repo_threshold !== undefined &&
        (typeof perf.large_repo_threshold !== 'number' || perf.large_repo_threshold <= 0)
      ) {
        result.errors.push('Branch组件大仓库阈值必须为正数');
      }
    }
  }

  /**
   * 验证依赖关系
   */
  private validateDependencies(config: Config, result: ValidationResult): void {
    // 检查主题与终端特性的依赖
    if (config.theme === 'powerline' || config.theme === 'capsule') {
      const hasNerdFont =
        config.terminal?.force_nerd_font === true || config.style?.enable_nerd_font === true;
      if (!hasNerdFont) {
        result.warnings.push(`${config.theme} 主题建议启用 Nerd Font 以获得最佳效果`);
      }
    }

    // 检查渐变功能与颜色支持的依赖
    if (config.components?.tokens && (config.components.tokens as any).show_gradient === true) {
      if (config.style?.enable_colors === false) {
        result.warnings.push('Token渐变功能需要启用颜色支持');
      }
    }
  }

  /**
   * 查找旧配置文件
   */
  private findLegacyConfigFile(): string | null {
    const possiblePaths = [
      'statusline.config.toml',
      join(process.cwd(), 'statusline.config.toml'),
      join(process.cwd(), '.config', 'statusline.config.toml'),
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    return null;
  }

  /**
   * 读取旧配置文件
   */
  private readLegacyConfig(path: string): any {
    try {
      const content = readFileSync(path, 'utf-8');

      // 简单的TOML解析器 - 这里可以替换为专门的TOML库
      // 目前实现基本的TOML解析功能
      return this.parseSimpleToml(content);
    } catch (error) {
      console.warn(`读取旧配置文件失败: ${path}`, error);
      return null;
    }
  }

  /**
   * 简单的TOML解析器 - 支持基本的TOML格式
   * 注意：这是一个简化版本，完整的TOML解析需要专门的库
   */
  private parseSimpleToml(content: string): any {
    const result: any = {};
    const lines = content.split('\n');
    let currentSection: any = result;
    let currentSectionPath: string[] = [];

    for (let line of lines) {
      line = line.trim();

      // 跳过空行和注释
      if (!line || line.startsWith('#')) continue;

      // 处理节（section）
      if (line.startsWith('[') && line.endsWith(']')) {
        const sectionName = line.slice(1, -1);
        const pathParts = sectionName.split('.');

        // 重置到根对象
        currentSection = result;
        currentSectionPath = [];

        // 创建嵌套对象路径
        for (const part of pathParts) {
          if (!currentSection[part]) {
            currentSection[part] = {};
          }
          currentSection = currentSection[part];
          currentSectionPath.push(part);
        }
        continue;
      }

      // 处理键值对
      const equalIndex = line.indexOf('=');
      if (equalIndex === -1) continue;

      const key = line.slice(0, equalIndex).trim();
      const value = line.slice(equalIndex + 1).trim();

      // 解析值的类型
      const parsedValue = this.parseTomlValue(value);
      currentSection[key] = parsedValue;
    }

    return result;
  }

  /**
   * 解析TOML值的类型
   */
  private parseTomlValue(value: string): any {
    // 移除首尾空格
    value = value.trim();

    // 布尔值
    if (value === 'true') return true;
    if (value === 'false') return false;

    // 字符串（带引号）
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    // 数组（简化版本）
    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1);
      if (!arrayContent.trim()) return [];

      return arrayContent.split(',').map((item) => {
        const trimmed = item.trim();
        return this.parseTomlValue(trimmed);
      });
    }

    // 数字
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return value.includes('.') ? parseFloat(value) : parseInt(value, 10);
    }

    // 默认作为字符串处理
    return value;
  }

  /**
   * 执行配置迁移
   */
  private performMigration(legacyConfig: any, result: MigrationResult): Config | null {
    try {
      // 创建基础的v2.0配置结构
      const migratedConfig: Partial<Config> = {
        version: '2.0.0',
        theme: 'classic',
        preset: 'PMBTUS',
        components: {
          order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
        },
        experimental: {
          enable_experimental: false,
        },
      };

      let itemsMigrated = 0;

      // 迁移主题设置
      if (legacyConfig.theme) {
        if (['classic', 'powerline', 'capsule'].includes(legacyConfig.theme)) {
          migratedConfig.theme = legacyConfig.theme;
          itemsMigrated++;
          result.report.details.push(`迁移主题设置: ${legacyConfig.theme}`);
        } else {
          result.report.details.push(`跳过无效主题: ${legacyConfig.theme}`);
          result.report.itemsSkipped++;
        }
      }

      // 迁移预设设置
      if (legacyConfig.preset) {
        if (defaultPresetManager.validatePreset(legacyConfig.preset)) {
          migratedConfig.preset = legacyConfig.preset;
          itemsMigrated++;
          result.report.details.push(`迁移预设配置: ${legacyConfig.preset}`);
        } else {
          result.report.details.push(`跳过无效预设: ${legacyConfig.preset}`);
          result.report.itemsSkipped++;
        }
      }

      // 迁移样式配置
      if (legacyConfig.style) {
        migratedConfig.style = {
          separator: ' | ',
          enable_colors: 'auto' as const,
          enable_emoji: 'auto' as const,
          enable_nerd_font: 'auto' as const,
          separator_color: 'white' as const,
          separator_before: ' ',
          separator_after: ' ',
          compact_mode: false,
          max_width: 0,
        };

        if (legacyConfig.style.separator) {
          migratedConfig.style!.separator = legacyConfig.style.separator;
          itemsMigrated++;
          result.report.details.push('迁移分隔符设置');
        }

        if (legacyConfig.style.enable_colors !== undefined) {
          migratedConfig.style!.enable_colors = legacyConfig.style.enable_colors;
          itemsMigrated++;
          result.report.details.push('迁移颜色设置');
        }

        if (legacyConfig.style.enable_emoji !== undefined) {
          migratedConfig.style!.enable_emoji = legacyConfig.style.enable_emoji;
          itemsMigrated++;
          result.report.details.push('迁移Emoji设置');
        }

        if (legacyConfig.style.enable_nerd_font !== undefined) {
          migratedConfig.style!.enable_nerd_font = legacyConfig.style.enable_nerd_font;
          itemsMigrated++;
          result.report.details.push('迁移Nerd Font设置');
        }
      }

      // 迁移终端配置
      if (legacyConfig.terminal) {
        migratedConfig.terminal = {
          force_nerd_font: false,
          force_emoji: false,
          force_text: false,
        };

        (['force_emoji', 'force_nerd_font', 'force_text'] as const).forEach((key) => {
          if (legacyConfig.terminal[key] !== undefined) {
            migratedConfig.terminal![key] = legacyConfig.terminal[key];
            itemsMigrated++;
            result.report.details.push(`迁移终端设置: ${key}`);
          }
        });
      }

      // 迁移组件配置
      if (legacyConfig.components) {
        if (!migratedConfig.components) {
          migratedConfig.components = {
            order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
          };
        }

        // 迁移组件顺序
        if (Array.isArray(legacyConfig.components.order)) {
          migratedConfig.components!.order = legacyConfig.components.order.filter((c: string) =>
            ['project', 'model', 'branch', 'tokens', 'usage', 'status'].includes(c)
          );
          itemsMigrated++;
          result.report.details.push('迁移组件显示顺序');
        }

        // 迁移各个组件的配置
        const componentNames = ['project', 'model', 'branch', 'tokens', 'usage', 'status'];
        for (const componentName of componentNames) {
          if (legacyConfig.components[componentName]) {
            (migratedConfig.components as any)[componentName] = this.migrateComponentConfig(
              componentName,
              legacyConfig.components[componentName]
            );
            itemsMigrated++;
            result.report.details.push(`迁移${componentName}组件配置`);
          }
        }
      }

      // 迁移主题特定配置
      if (legacyConfig.themes) {
        migratedConfig.themes = {};

        ['classic', 'powerline', 'capsule'].forEach((themeName) => {
          if (legacyConfig.themes[themeName]) {
            (migratedConfig.themes as any)[themeName] = legacyConfig.themes[themeName];
            itemsMigrated++;
            result.report.details.push(`迁移${themeName}主题配置`);
          }
        });
      }

      // 迁移高级配置
      if (legacyConfig.advanced) {
        migratedConfig.advanced = {
          cache_enabled: true,
          recent_error_count: 5,
          git_timeout: 1000,
          custom_color_codes: {},
        };

        const advancedFields = [
          'cache_enabled',
          'recent_error_count',
          'git_timeout',
          'custom_color_codes',
        ] as const;
        for (const field of advancedFields) {
          if (legacyConfig.advanced[field] !== undefined) {
            (migratedConfig.advanced as any)[field] = legacyConfig.advanced[field];
            itemsMigrated++;
            result.report.details.push(`迁移高级设置: ${field}`);
          }
        }
      }

      result.report.itemsMigrated = itemsMigrated;
      return migratedConfig as Config;
    } catch (error) {
      result.report.itemsError++;
      result.report.details.push(
        `迁移过程出错: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * 迁移单个组件配置
   */
  private migrateComponentConfig(componentName: string, legacyComponentConfig: any): any {
    const migratedComponentConfig: any = {};

    // 迁移基础属性
    if (legacyComponentConfig.enabled !== undefined) {
      migratedComponentConfig.enabled = legacyComponentConfig.enabled;
    }

    // 迁移颜色配置 (处理v1.x的color -> v2.x的icon_color/text_color)
    if (legacyComponentConfig.color) {
      migratedComponentConfig.icon_color = legacyComponentConfig.color;
      migratedComponentConfig.text_color = legacyComponentConfig.color;
    }

    if (legacyComponentConfig.icon_color) {
      migratedComponentConfig.icon_color = legacyComponentConfig.icon_color;
    }

    if (legacyComponentConfig.text_color) {
      migratedComponentConfig.text_color = legacyComponentConfig.text_color;
    }

    // 迁移图标配置 (处理v1.x的icon -> v2.x的emoji_icon)
    if (legacyComponentConfig.icon) {
      migratedComponentConfig.emoji_icon = legacyComponentConfig.icon;
    }

    if (legacyComponentConfig.emoji_icon) {
      migratedComponentConfig.emoji_icon = legacyComponentConfig.emoji_icon;
    }

    if (legacyComponentConfig.nerd_icon) {
      migratedComponentConfig.nerd_icon = legacyComponentConfig.nerd_icon;
    }

    if (legacyComponentConfig.text_icon) {
      migratedComponentConfig.text_icon = legacyComponentConfig.text_icon;
    }

    // 根据组件类型迁移特定配置
    switch (componentName) {
      case 'tokens':
        this.migrateTokensComponentConfig(legacyComponentConfig, migratedComponentConfig);
        break;
      case 'branch':
        this.migrateBranchComponentConfig(legacyComponentConfig, migratedComponentConfig);
        break;
      case 'model':
        this.migrateModelComponentConfig(legacyComponentConfig, migratedComponentConfig);
        break;
      case 'project':
        this.migrateProjectComponentConfig(legacyComponentConfig, migratedComponentConfig);
        break;
      case 'usage':
        this.migrateUsageComponentConfig(legacyComponentConfig, migratedComponentConfig);
        break;
      case 'status':
        this.migrateStatusComponentConfig(legacyComponentConfig, migratedComponentConfig);
        break;
    }

    return migratedComponentConfig;
  }

  /**
   * 迁移Tokens组件特定配置
   */
  private migrateTokensComponentConfig(legacy: any, migrated: any): void {
    // 迁移渐变和进度条设置
    if (legacy.show_gradient !== undefined) {
      migrated.show_gradient = legacy.show_gradient;
    }

    if (legacy.show_progress_bar !== undefined) {
      migrated.show_progress_bar = legacy.show_progress_bar;
    }

    if (legacy.show_percentage !== undefined) {
      migrated.show_percentage = legacy.show_percentage;
    }

    if (legacy.show_raw_numbers !== undefined) {
      migrated.show_raw_numbers = legacy.show_raw_numbers;
    }

    // 迁移进度条设置 (处理名称变更)
    if (legacy.progress_bar_width !== undefined) {
      migrated.progress_width = legacy.progress_bar_width;
    } else if (legacy.progress_width !== undefined) {
      migrated.progress_width = legacy.progress_width;
    }

    // 迁移阈值配置
    if (legacy.thresholds) {
      migrated.thresholds = { ...legacy.thresholds };
    }

    // 迁移颜色配置
    if (legacy.colors) {
      migrated.colors = { ...legacy.colors };
    }

    // 迁移状态图标配置
    if (legacy.status_icons) {
      migrated.status_icons = { ...legacy.status_icons };
    }

    // 迁移上下文窗口配置
    if (legacy.context_windows) {
      migrated.context_windows = { ...legacy.context_windows };
    }
  }

  /**
   * 迁移Branch组件特定配置
   */
  private migrateBranchComponentConfig(legacy: any, migrated: any): void {
    if (legacy.show_when_no_git !== undefined) {
      migrated.show_when_no_git = legacy.show_when_no_git;
    }

    if (legacy.max_length !== undefined) {
      migrated.max_length = legacy.max_length;
    }

    // 迁移状态、操作、版本信息等配置
    ['status', 'operations', 'version', 'status_icons', 'status_colors', 'performance'].forEach(
      (key) => {
        if (legacy[key]) {
          migrated[key] = { ...legacy[key] };
        }
      }
    );
  }

  /**
   * 迁移Model组件特定配置
   */
  private migrateModelComponentConfig(legacy: any, migrated: any): void {
    if (legacy.show_full_name !== undefined) {
      migrated.show_full_name = legacy.show_full_name;
    }

    // 迁移模型名称映射 (处理名称变更)
    if (legacy.custom_names) {
      migrated.mapping = legacy.custom_names;
    } else if (legacy.mapping) {
      migrated.mapping = legacy.mapping;
    }
  }

  /**
   * 迁移Project组件特定配置
   */
  private migrateProjectComponentConfig(legacy: any, migrated: any): void {
    if (legacy.show_when_empty !== undefined) {
      migrated.show_when_empty = legacy.show_when_empty;
    }
  }

  /**
   * 迁移Usage组件特定配置
   */
  private migrateUsageComponentConfig(legacy: any, migrated: any): void {
    if (legacy.display_mode !== undefined) {
      migrated.display_mode = legacy.display_mode;
    }

    if (legacy.show_model !== undefined) {
      migrated.show_model = legacy.show_model;
    }

    if (legacy.precision !== undefined) {
      migrated.precision = legacy.precision;
    }
  }

  /**
   * 迁移Status组件特定配置
   */
  private migrateStatusComponentConfig(legacy: any, migrated: any): void {
    if (legacy.show_recent_errors !== undefined) {
      migrated.show_recent_errors = legacy.show_recent_errors;
    }

    if (legacy.icons) {
      migrated.icons = { ...legacy.icons };
    }

    if (legacy.colors) {
      migrated.colors = { ...legacy.colors };
    }
  }

  /**
   * 生成验证报告
   */
  generateValidationReport(validationResult: ValidationResult): string {
    const lines: string[] = [];

    lines.push('📋 配置验证报告 | Configuration Validation Report');
    lines.push('='.repeat(50));

    if (validationResult.valid) {
      lines.push('✅ 配置验证通过 | Configuration validation passed');
    } else {
      lines.push('❌ 配置验证失败 | Configuration validation failed');
    }

    lines.push('');

    if (validationResult.errors.length > 0) {
      lines.push('🚨 错误 | Errors:');
      validationResult.errors.forEach((error, index) => {
        lines.push(`  ${index + 1}. ${error}`);
      });
      lines.push('');
    }

    if (validationResult.warnings.length > 0) {
      lines.push('⚠️ 警告 | Warnings:');
      validationResult.warnings.forEach((warning, index) => {
        lines.push(`  ${index + 1}. ${warning}`);
      });
      lines.push('');
    }

    if (validationResult.suggestions && validationResult.suggestions.length > 0) {
      lines.push('💡 建议 | Suggestions:');
      validationResult.suggestions.forEach((suggestion, index) => {
        lines.push(`  ${index + 1}. ${suggestion}`);
      });
    }

    return lines.join('\n');
  }
}

/**
 * 工厂函数 - 创建验证管理器实例
 */
export function createValidationManager(options?: ValidationManagerOptions): ValidationManager {
  return new ValidationManager(options);
}
