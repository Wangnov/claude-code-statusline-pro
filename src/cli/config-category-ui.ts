/**
 * 分类配置界面框架 | Configuration Category UI Framework
 *
 * 提供通用的分类配置界面，支持多级配置分类、批量选择、格式化显示等功能。
 * Provides a universal configuration category interface with support for multi-level
 * configuration categories, batch selection, formatted display, and other features.
 */

import { checkbox, confirm, input, select } from '@inquirer/prompts';
import { TerminalDetector } from '../terminal/detector.js';
import type { ComponentConfigMapper, ConfigItemMetadata } from './component-config-mapper.js';
import { defaultComponentConfigMapper } from './component-config-mapper.js';
import { getCurrentLanguage, t } from './i18n.js';

// ==================== 类型定义 ====================

/**
 * 分类定义接口 | Category Definition Interface
 */
export interface CategoryDefinition {
  /** 分类ID | Category ID */
  id: string;
  /** 分类显示名称 | Category display name */
  name: string;
  /** 分类描述信息 | Category description */
  description: string;
  /** 分类图标 | Category icon */
  icon?: string;
  /** 配置项数量 | Configuration items count */
  itemCount?: number;
  /** 是否为高级分类 | Whether it's an advanced category */
  advanced?: boolean;
}

/**
 * 配置项接口 | Configuration Item Interface
 */
export interface ConfigItem {
  /** 配置键名 | Configuration key */
  key: string;
  /** 配置类型 | Configuration type */
  type: 'boolean' | 'string' | 'number' | 'enum' | 'object';
  /** 当前值 | Current value */
  value: unknown;
  /** 默认值 | Default value */
  defaultValue: unknown;
  /** 显示标签 | Display label */
  label: string;
  /** 配置描述 | Configuration description */
  description: string;
  /** 是否启用 | Whether enabled */
  enabled?: boolean;
  /** 枚举选项 | Enum options */
  options?: readonly string[] | undefined;
  /** 数值范围 | Number range */
  range?: { min?: number; max?: number } | undefined;
}

/**
 * 配置分组接口 | Configuration Group Interface
 */
export interface ConfigGroup {
  /** 分组名称 | Group name */
  category: string;
  /** 分组显示名称 | Group display name */
  displayName: string;
  /** 配置项列表 | Configuration items list */
  items: ConfigItem[];
  /** 分组图标 | Group icon */
  icon?: string;
  /** 配置项数量 | Items count */
  count: number;
}

/**
 * Checkbox选项接口 | Checkbox Option Interface
 */
export interface CheckboxOption {
  /** 选项名称 | Option name */
  name: string;
  /** 选项值 | Option value */
  value: string;
  /** 选项描述 | Option description */
  description?: string;
  /** 选项图标 | Option icon */
  icon?: string;
  /** 是否默认选中 | Whether checked by default */
  checked?: boolean;
  /** 是否禁用 | Whether disabled */
  disabled?: boolean;
}

/**
 * 配置元数据接口 | Configuration Metadata Interface
 */
export interface ConfigMetadata {
  /** 配置类型 | Configuration type */
  type: 'boolean' | 'string' | 'number' | 'enum' | 'object' | 'array';
  /** 是否为必需配置 | Whether required */
  required?: boolean;
  /** 验证规则 | Validation rules */
  validation?: (value: unknown) => string | true;
  /** 格式化函数 | Formatting function */
  formatter?: (value: unknown) => string;
  /** 配置提示 | Configuration hint */
  hint?: string;
}

// ==================== 主要类 ====================

/**
 * 分类配置界面管理器 | Configuration Category UI Manager
 */
export class ConfigCategoryUI {
  private readonly configMapper: ComponentConfigMapper;
  private readonly terminalDetector: TerminalDetector;

  constructor(configMapper?: ComponentConfigMapper) {
    this.configMapper = configMapper || defaultComponentConfigMapper;
    this.terminalDetector = new TerminalDetector();
  }

  /**
   * 显示分类菜单 | Show category menu
   */
  async showCategoryMenu(component: string, categories: CategoryDefinition[]): Promise<string> {
    const capabilities = this.terminalDetector.detectCapabilities();
    const _currentLang = getCurrentLanguage();

    console.log(`\n🧩 ${t('component.config.deep', { component })}`);

    // 获取组件配置摘要
    const summary = this.configMapper.getComponentConfigSummary(component);
    console.log(`${t('component.config.categories')}: ${categories.length}`);
    console.log(`${t('component.config.item_count')}: ${summary.totalItems}+\n`);

    // 构建选择选项
    const choices = categories.map((category) => {
      const icon = capabilities.emoji ? category.icon || '⚙️' : '';
      const itemCountStr = category.itemCount ? `(${category.itemCount}项)` : '';
      const advancedFlag = category.advanced ? ` ${capabilities.emoji ? '🔧' : '[ADV]'}` : '';

      return {
        name: `${icon} ${category.name}${advancedFlag} ${itemCountStr}`,
        value: category.id,
        description: category.description,
      };
    });

    // 添加返回选项
    choices.push({
      name: t('editor.components.items.back'),
      value: 'back',
      description: '',
    });

    return await select({
      message: `${component.toUpperCase()} - ${t('component.config.categories')}`,
      choices,
      pageSize: 10,
    });
  }

  /**
   * 渲染配置区域 | Render configuration section
   */
  renderConfigSection(configs: ConfigItem[]): void {
    const capabilities = this.terminalDetector.detectCapabilities();
    const _currentLang = getCurrentLanguage();

    if (configs.length === 0) {
      console.log(
        `\n${t('messages.no_configs', { default: '暂无可配置项 | No configuration items available' })}`
      );
      return;
    }

    console.log(
      `\n📋 ${t('component.config.current_settings', { default: '当前配置 | Current Settings' })}:`
    );
    console.log(`${t('component.config.item_count')}: ${configs.length}\n`);

    for (const config of configs) {
      const statusIcon = this.getConfigStatusIcon(config, capabilities);
      const valueDisplay = this.formatConfigValue(config);
      const defaultFlag = this.isDefaultValue(config.value, config.defaultValue)
        ? ` ${capabilities.colors ? '\x1b[90m(默认)\x1b[0m' : '(default)'}`
        : '';

      console.log(`  ${statusIcon} ${config.label}: ${valueDisplay}${defaultFlag}`);

      if (config.description && config.description !== config.label) {
        const descColor = capabilities.colors ? '\x1b[90m' : '';
        const resetColor = capabilities.colors ? '\x1b[0m' : '';
        console.log(`    ${descColor}${config.description}${resetColor}`);
      }
    }
    console.log();
  }

  /**
   * 批量checkbox配置 | Batch checkbox configuration
   */
  async batchCheckboxConfig(
    options: CheckboxOption[],
    current: Record<string, boolean>
  ): Promise<Record<string, boolean>> {
    const capabilities = this.terminalDetector.detectCapabilities();

    // 构建checkbox选择项
    const choices = options.map((option) => {
      const icon = capabilities.emoji ? option.icon || '' : '';
      const iconStr = icon ? `${icon} ` : '';

      return {
        name: `${iconStr}${option.name}`,
        value: option.value,
        checked: current[option.value] ?? option.checked ?? false,
        disabled: option.disabled ?? false,
        ...(option.description && { description: option.description }),
      };
    });

    const selectedValues = await checkbox({
      message: t('component.config.select_options', {
        default: '选择要启用的选项 | Select options to enable:',
      }),
      choices,
      pageSize: 12,
      required: false,
    });

    // 构建结果对象
    const result: Record<string, boolean> = {};
    for (const option of options) {
      result[option.value] = selectedValues.includes(option.value);
    }

    return result;
  }

  /**
   * 配置项分组显示 | Group configuration items by category
   */
  groupConfigsByCategory(component: string): ConfigGroup[] {
    const categories = this.configMapper.getConfigCategories(component);
    const groups: ConfigGroup[] = [];

    for (const [categoryKey, items] of Object.entries(categories)) {
      const displayName = this.getCategoryDisplayName(categoryKey);
      const configItems = items.map((item) => this.convertToConfigItem(item));

      groups.push({
        category: categoryKey,
        displayName,
        items: configItems,
        icon: this.getCategoryIcon(categoryKey),
        count: configItems.length,
      });
    }

    return groups.sort((a, b) => {
      // 基础配置优先
      if (a.category === 'basic') return -1;
      if (b.category === 'basic') return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }

  /**
   * 格式化配置项显示 | Format configuration item display
   */
  formatConfigItem(_key: string, value: unknown, metadata: ConfigMetadata): string {
    const capabilities = this.terminalDetector.detectCapabilities();

    // 使用自定义格式化函数
    if (metadata.formatter) {
      return metadata.formatter(value);
    }

    // 根据类型格式化
    switch (metadata.type) {
      case 'boolean': {
        const boolValue = Boolean(value);
        if (capabilities.emoji) {
          return boolValue ? '✅ 启用' : '❌ 禁用';
        } else {
          return boolValue ? '[ON]' : '[OFF]';
        }
      }

      case 'string':
        if (value === undefined || value === null || value === '') {
          return capabilities.colors ? '\x1b[90m未设置\x1b[0m' : '(not set)';
        }
        return `"${String(value)}"`;

      case 'number':
        if (typeof value === 'number') {
          return String(value);
        }
        return capabilities.colors ? '\x1b[90m未设置\x1b[0m' : '(not set)';

      case 'enum':
        return value
          ? `"${String(value)}"`
          : capabilities.colors
            ? '\x1b[90m未设置\x1b[0m'
            : '(not set)';

      case 'object':
        if (value && typeof value === 'object') {
          const keys = Object.keys(value as object);
          return `{...} (${keys.length} 项)`;
        }
        return '{}';

      case 'array':
        if (Array.isArray(value)) {
          return `[...] (${value.length} 项)`;
        }
        return '[]';

      default:
        return String(value || '');
    }
  }

  /**
   * 显示配置项详情 | Show configuration item details
   */
  async showConfigItemDetails(component: string, itemKey: string): Promise<void> {
    const metadata = this.configMapper.getConfigMetadata(component, itemKey);
    if (!metadata) {
      console.log(`❌ ${t('errors.configNotFound', { key: itemKey })}`);
      return;
    }

    const capabilities = this.terminalDetector.detectCapabilities();
    const titleColor = capabilities.colors ? '\x1b[1;36m' : '';
    const resetColor = capabilities.colors ? '\x1b[0m' : '';

    console.log(
      `\n${titleColor}📋 ${t('component.config.item_details')} - ${itemKey}${resetColor}`
    );
    console.log(`  📝 ${t('component.config.description')}: ${metadata.description}`);
    console.log(`  🔧 ${t('component.config.type')}: ${metadata.type}`);
    console.log(`  ⭐ ${t('component.config.default')}: ${JSON.stringify(metadata.defaultValue)}`);

    if (metadata.options) {
      console.log(`  📋 ${t('component.config.options')}: ${metadata.options.join(', ')}`);
    }

    if (metadata.range) {
      console.log(
        `  📊 ${t('component.config.range')}: ${metadata.range.min || '?'} - ${metadata.range.max || '?'}`
      );
    }

    if (metadata.advanced) {
      console.log(`  🔧 ${t('component.config.advanced_setting')}`);
    }

    console.log();
  }

  /**
   * 验证配置项值 | Validate configuration item value
   */
  validateConfigValue(
    component: string,
    key: string,
    value: unknown
  ): { valid: boolean; error?: string } {
    return this.configMapper.validateConfigValue(component, key, value);
  }

  /**
   * 批量设置配置项 | Batch set configuration items
   */
  async batchConfigureItems(
    component: string,
    items: ConfigItem[],
    currentConfig: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    console.log(`\n🔧 ${t('component.config.batch_configure', { component })}`);
    const updatedConfig = { ...currentConfig };

    for (const item of items) {
      const newValue = await this.promptForConfigValue(item);
      if (newValue !== undefined) {
        const validation = this.validateConfigValue(component, item.key, newValue);
        if (validation.valid) {
          updatedConfig[item.key] = newValue;
          console.log(
            `✅ ${item.label}: ${this.formatConfigItem(item.key, newValue, { type: item.type })}`
          );
        } else {
          console.error(`❌ ${item.label}: ${validation.error}`);
        }
      }
    }

    return updatedConfig;
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 获取配置状态图标 | Get configuration status icon
   */
  private getConfigStatusIcon(config: ConfigItem, capabilities: any): string {
    if (!capabilities.emoji) {
      return config.enabled !== false ? '✓' : '✗';
    }

    if (config.type === 'boolean') {
      return config.value ? '✅' : '❌';
    } else {
      return config.enabled !== false ? '✓' : '❌';
    }
  }

  /**
   * 格式化配置值显示 | Format configuration value display
   */
  private formatConfigValue(config: ConfigItem): string {
    return this.formatConfigItem(config.key, config.value, { type: config.type });
  }

  /**
   * 判断是否为默认值 | Check if is default value
   */
  private isDefaultValue(value: unknown, defaultValue: unknown): boolean {
    return JSON.stringify(value) === JSON.stringify(defaultValue);
  }

  /**
   * 获取分类显示名称 | Get category display name
   */
  private getCategoryDisplayName(categoryKey: string): string {
    const displayNames: Record<string, string> = {
      basic: '基础设置 | Basic Settings',
      display: '显示选项 | Display Options',
      advanced: '高级设置 | Advanced Settings',
      performance: '性能优化 | Performance Optimization',
      style: '样式定制 | Style Customization',
      behavior: '行为控制 | Behavior Control',
      icons: '图标配置 | Icon Configuration',
      colors: '颜色配置 | Color Configuration',
      thresholds: '阈值设置 | Threshold Settings',
    };
    return displayNames[categoryKey] || categoryKey;
  }

  /**
   * 获取分类图标 | Get category icon
   */
  private getCategoryIcon(categoryKey: string): string {
    const capabilities = this.terminalDetector.detectCapabilities();
    if (!capabilities.emoji) return '';

    const icons: Record<string, string> = {
      basic: '⚙️',
      display: '📊',
      advanced: '🔧',
      performance: '⚡',
      style: '🎨',
      behavior: '🎯',
      icons: '🎭',
      colors: '🌈',
      thresholds: '📏',
    };
    return icons[categoryKey] || '📋';
  }

  /**
   * 转换为配置项格式 | Convert to configuration item format
   */
  private convertToConfigItem(metadata: ConfigItemMetadata): ConfigItem {
    return {
      key: metadata.key,
      type: metadata.type as any,
      value: undefined, // 需要从实际配置中获取
      defaultValue: metadata.defaultValue,
      label: metadata.key,
      description: metadata.description,
      enabled: true,
      ...(metadata.options && { options: metadata.options }),
      ...(metadata.range && { range: metadata.range }),
    };
  }

  /**
   * 提示配置项值输入 | Prompt for configuration item value
   */
  private async promptForConfigValue(item: ConfigItem): Promise<unknown> {
    const currentValue = item.value ?? item.defaultValue;

    switch (item.type) {
      case 'boolean':
        return await confirm({
          message: `${item.label}:`,
          default: Boolean(currentValue),
        });

      case 'enum':
        if (!item.options || item.options.length === 0) {
          return await input({
            message: `${item.label}:`,
            default: String(currentValue || ''),
          });
        }
        return await select({
          message: `${item.label}:`,
          choices: item.options.map((opt) => ({ name: opt, value: opt })),
          default: currentValue,
        });

      case 'number': {
        const numberInput = await input({
          message: `${item.label}:`,
          default: String(currentValue || item.defaultValue || 0),
          validate: (input) => {
            const num = Number(input);
            if (Number.isNaN(num))
              return t('component.config.invalid_number', { default: '请输入有效数字' });

            if (item.range) {
              if (item.range.min !== undefined && num < item.range.min) {
                return t('component.config.min_value', { min: item.range.min });
              }
              if (item.range.max !== undefined && num > item.range.max) {
                return t('component.config.max_value', { max: item.range.max });
              }
            }
            return true;
          },
        });
        return Number(numberInput);
      }

      default:
        return await input({
          message: `${item.label}:`,
          default: String(currentValue || item.defaultValue || ''),
        });
    }
  }
}

// ==================== 导出和便捷函数 ====================

/**
 * 默认分类配置界面实例 | Default category configuration UI instance
 */
export const defaultConfigCategoryUI = new ConfigCategoryUI();

/**
 * 创建分类定义 | Create category definition
 */
export function createCategoryDefinition(
  id: string,
  name: string,
  description: string,
  options?: {
    icon?: string;
    itemCount?: number;
    advanced?: boolean;
  }
): CategoryDefinition {
  return {
    id,
    name,
    description,
    ...options,
  };
}

/**
 * 创建配置项 | Create configuration item
 */
export function createConfigItem(
  key: string,
  type: ConfigItem['type'],
  label: string,
  description: string,
  options?: {
    value?: unknown;
    defaultValue?: unknown;
    enabled?: boolean;
    options?: readonly string[];
    range?: { min?: number; max?: number };
  }
): ConfigItem {
  return {
    key,
    type,
    label,
    description,
    value: options?.value,
    defaultValue: options?.defaultValue ?? null,
    enabled: options?.enabled ?? true,
    ...(options?.options && { options: options.options }),
    ...(options?.range && { range: options.range }),
  };
}

/**
 * 创建checkbox选项 | Create checkbox option
 */
export function createCheckboxOption(
  name: string,
  value: string,
  options?: {
    description?: string;
    icon?: string;
    checked?: boolean;
    disabled?: boolean;
  }
): CheckboxOption {
  return {
    name,
    value,
    ...options,
  };
}

/**
 * 快速创建分类菜单 | Quickly create category menu
 */
export async function showQuickCategoryMenu(
  component: string,
  categories: Array<{
    id: string;
    name: string;
    description: string;
    icon?: string;
    itemCount?: number;
  }>
): Promise<string> {
  const categoryDefinitions = categories.map((cat) =>
    createCategoryDefinition(cat.id, cat.name, cat.description, {
      ...(cat.icon && { icon: cat.icon }),
      ...(cat.itemCount !== undefined && { itemCount: cat.itemCount }),
    })
  );

  return await defaultConfigCategoryUI.showCategoryMenu(component, categoryDefinitions);
}

/**
 * 快速批量checkbox配置 | Quick batch checkbox configuration
 */
export async function quickBatchCheckbox(
  options: Array<{
    name: string;
    value: string;
    description?: string;
    icon?: string;
    checked?: boolean;
  }>,
  current: Record<string, boolean> = {}
): Promise<Record<string, boolean>> {
  const checkboxOptions = options.map((opt) => createCheckboxOption(opt.name, opt.value, opt));
  return await defaultConfigCategoryUI.batchCheckboxConfig(checkboxOptions, current);
}
