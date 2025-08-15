/**
 * Model编辑器 - Model Component Editor
 * 从config-editor.ts拆分出来的Model组件配置方法
 *
 * 功能:
 * - Model组件高级配置主界面
 * - 显示选项配置
 * - 模型名映射管理（CRUD操作）
 * - 默认映射应用
 */

import { confirm, input, select } from '@inquirer/prompts';
import type { Config } from '../../config/schema.js';
import { t } from '../i18n.js';

/**
 * Model编辑器基类 - 提供Model组件的所有配置功能
 */
export class ModelEditor {
  private currentConfig: Config;
  private hasUnsavedChanges: boolean = false;

  constructor(config: Config, onConfigChange: (hasChanges: boolean) => void) {
    this.currentConfig = config;
    this.hasUnsavedChanges = false;

    // 监听配置变化
    const originalSetChanges = () => this.hasUnsavedChanges;
    Object.defineProperty(this, 'hasUnsavedChanges', {
      get: originalSetChanges,
      set: (value: boolean) => {
        this.hasUnsavedChanges = value;
        onConfigChange(value);
      },
    });
  }

  /**
   * 等待按键 - 工具方法
   */
  private async waitForKeyPress(): Promise<void> {
    console.log('\n按任意键继续...');
    return new Promise<void>((resolve) => {
      const stdin = process.stdin;

      // 设置stdin为原始模式
      if (stdin.isTTY) {
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');
      }

      const onData = (key: string) => {
        // 清理监听器
        stdin.removeListener('data', onData);

        // 恢复stdin模式
        if (stdin.isTTY) {
          stdin.setRawMode(false);
          stdin.pause();
        }

        // Ctrl+C 处理
        if (key === '\u0003') {
          console.log('\n👋 已退出配置编辑器');
          process.exit(0);
        }

        resolve();
      };

      stdin.on('data', onData);
    });
  }

  /**
   * 配置单个组件 - 通用方法（从主编辑器继承）
   */
  private async configureIndividualComponent(componentName: string): Promise<void> {
    const component = this.currentConfig.components?.[
      componentName as keyof typeof this.currentConfig.components
    ] as any;

    if (!component) {
      console.log(t('errors.componentNotFound', { component: componentName }));
      return;
    }

    console.log(
      `\n🔧 ${t('editor.components.configuration.enable', { component: componentName })}`
    );

    // 启用/禁用组件
    const enabled = await confirm({
      message: t('editor.components.configuration.enable', { component: componentName }),
      default: component.enabled,
    });

    // 配置图标
    let icon = component.emoji_icon;
    if (enabled) {
      icon = await input({
        message: t('editor.components.configuration.icon', { component: componentName }),
        default: component.emoji_icon,
      });
    }

    // 配置颜色
    let color = component.icon_color;
    if (enabled) {
      color = await select({
        message: t('editor.components.configuration.color', { component: componentName }),
        choices: [
          { name: t('colors.cyan'), value: 'cyan' },
          { name: t('colors.green'), value: 'green' },
          { name: t('colors.yellow'), value: 'yellow' },
          { name: t('colors.blue'), value: 'blue' },
          { name: t('colors.magenta'), value: 'magenta' },
          { name: t('colors.red'), value: 'red' },
          { name: t('colors.white'), value: 'white' },
          { name: t('colors.gray'), value: 'gray' },
        ],
        default: component.icon_color || 'cyan',
      });
    }

    // 更新配置
    const updatedComponent = {
      ...component,
      enabled,
      emoji_icon: icon,
      icon_color: color,
    };

    this.currentConfig.components = {
      order: this.currentConfig.components?.order || [
        'project',
        'model',
        'branch',
        'tokens',
        'usage',
        'status',
      ],
      ...this.currentConfig.components,
      [componentName]: updatedComponent,
    };

    this.hasUnsavedChanges = true;

    console.log(t('editor.components.configuration.updated', { component: componentName }));
    await this.waitForKeyPress();
  }

  /**
   * Model组件高级配置主界面 | Model Component Advanced Configuration
   */
  async configureModelComponentAdvanced(): Promise<void> {
    const modelConfig = this.currentConfig.components?.model;
    if (!modelConfig) {
      console.log(t('errors.componentNotFound', { component: 'Model' }));
      await this.waitForKeyPress();
      return;
    }

    console.log(`\n🤖 ${t('component.model.advanced')}`);
    console.log(`${t('component.config.categories')}: 3`);
    console.log(`${t('component.config.item_count')}: 8+\n`);

    const category = await select({
      message: `${t('editor.components.items.model.name')} - ${t('component.config.deep')}`,
      choices: [
        {
          name: `⚙️  ${t('component.model.basic_settings')}`,
          value: 'basic',
          description: '启用/禁用、图标、颜色配置 | Enable/disable, icons, colors configuration',
        },
        {
          name: `📝 ${t('component.model.display_options')}`,
          value: 'display',
          description: '显示选项和模型名配置 | Display options and model name configuration',
        },
        {
          name: `🔗 ${t('component.model.mapping_config')}`,
          value: 'mapping',
          description: '自定义模型名映射管理 | Custom model name mapping management',
        },
        {
          name: t('editor.components.items.back'),
          value: 'back',
        },
      ],
    });

    switch (category) {
      case 'basic':
        await this.configureIndividualComponent('model');
        break;
      case 'display':
        await this.configureModelDisplay();
        break;
      case 'mapping':
        await this.configureModelMapping();
        break;
      case 'back':
        return;
    }
  }

  /**
   * Model显示选项配置 | Model Display Options Configuration
   */
  private async configureModelDisplay(): Promise<void> {
    const modelConfig = this.currentConfig.components?.model;
    if (!modelConfig) return;

    console.log(`\n📝 ${t('component.model.display_options')}`);
    console.log(`${t('component.config.item_count')}: 2\n`);

    // 显示当前配置
    console.log('当前配置 | Current Configuration:');
    console.log(
      `  ${t('component.model.show_full_name')}: ${modelConfig.show_full_name ? '✅' : '❌'}`
    );
    console.log(
      `  ${t('component.model.model_mapping')}: ${Object.keys(modelConfig.mapping || {}).length} 项\n`
    );

    // 配置显示全名
    const showFullName = await confirm({
      message: t('component.model.show_full_name'),
      default: modelConfig.show_full_name,
    });

    // 更新配置
    if (this.currentConfig.components?.model) {
      this.currentConfig.components.model.show_full_name = showFullName;
    }

    this.hasUnsavedChanges = true;
    console.log('\n✅ Model显示选项配置已更新 | Model display options updated!');
    await this.waitForKeyPress();
  }

  /**
   * Model映射配置 | Model Mapping Configuration
   */
  private async configureModelMapping(): Promise<void> {
    const modelConfig = this.currentConfig.components?.model;
    if (!modelConfig) return;

    while (true) {
      console.log(`\n🔗 ${t('component.model.mapping_config')}`);

      const currentMappings = modelConfig.mapping || {};
      const mappingCount = Object.keys(currentMappings).length;

      if (mappingCount === 0) {
        console.log(`\n${t('component.model.no_mappings')}`);
      } else {
        console.log('\n当前映射 | Current Mappings:');
        Object.entries(currentMappings).forEach(([key, value], index) => {
          console.log(`  ${index + 1}. ${key} → ${value}`);
        });
      }

      console.log(`\n${t('component.model.default_mappings')}:`);
      console.log('  claude-sonnet-4 → S4');
      console.log('  claude-haiku-3.5 → H3.5');
      console.log('  gpt-4-turbo → GPT4T');
      console.log('  gpt-4o → GPT4O\n');

      const action = await select({
        message: `${t('component.model.model_mapping')} (${mappingCount} 项)`,
        choices: [
          {
            name: `➕ ${t('component.model.add_mapping')}`,
            value: 'add',
            description: '添加新的模型名映射 | Add new model name mapping',
          },
          ...(mappingCount > 0
            ? [
                {
                  name: `✏️  ${t('component.model.edit_mapping')}`,
                  value: 'edit',
                  description: '编辑现有映射 | Edit existing mapping',
                },
                {
                  name: `🗑️  ${t('component.model.delete_mapping')}`,
                  value: 'delete',
                  description: '删除映射 | Delete mapping',
                },
              ]
            : []),
          {
            name: '💡 应用预设映射 | Apply Default Mappings',
            value: 'defaults',
            description: '应用常用模型的简化名称 | Apply simplified names for common models',
          },
          {
            name: t('editor.components.items.back'),
            value: 'back',
          },
        ],
      });

      switch (action) {
        case 'add':
          await this.addModelMapping();
          break;
        case 'edit':
          await this.editModelMapping();
          break;
        case 'delete':
          await this.deleteModelMapping();
          break;
        case 'defaults':
          await this.applyDefaultModelMappings();
          break;
        case 'back':
          return;
      }
    }
  }

  /**
   * 添加模型映射 | Add Model Mapping
   */
  private async addModelMapping(): Promise<void> {
    const modelKey = await input({
      message: `${t('component.model.mapping_key')}:`,
      validate: (value) => {
        if (!value.trim()) return '模型ID不能为空 | Model ID cannot be empty';
        if (this.currentConfig.components?.model?.mapping?.[value]) {
          return '该模型ID已存在 | Model ID already exists';
        }
        return true;
      },
    });

    const modelValue = await input({
      message: `${t('component.model.mapping_value')}:`,
      validate: (value) => {
        if (!value.trim()) return '显示名称不能为空 | Display name cannot be empty';
        return true;
      },
    });

    // 更新配置
    if (!this.currentConfig.components) {
      this.currentConfig.components = {
        order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
      };
    }
    if (!this.currentConfig.components.model) {
      this.currentConfig.components.model = {
        enabled: true,
        icon_color: 'white',
        text_color: 'white',
        emoji_icon: '🤖',
        show_full_name: false,
        mapping: {},
      };
    }
    if (!this.currentConfig.components.model.mapping) {
      this.currentConfig.components.model.mapping = {};
    }

    this.currentConfig.components.model.mapping[modelKey] = modelValue;
    this.hasUnsavedChanges = true;

    console.log(`\n✅ 已添加映射: ${modelKey} → ${modelValue}`);
    await this.waitForKeyPress();
  }

  /**
   * 编辑模型映射 | Edit Model Mapping
   */
  private async editModelMapping(): Promise<void> {
    const currentMappings = this.currentConfig.components?.model?.mapping || {};
    const mappingKeys = Object.keys(currentMappings);

    if (mappingKeys.length === 0) {
      console.log('\n暂无可编辑的映射 | No mappings to edit');
      await this.waitForKeyPress();
      return;
    }

    const selectedKey = await select({
      message: '选择要编辑的映射 | Select mapping to edit:',
      choices: mappingKeys.map((key) => ({
        name: `${key} → ${currentMappings[key]}`,
        value: key,
      })),
    });

    const newValue = await input({
      message: `新的显示名称 (${selectedKey}) | New display name:`,
      default: currentMappings[selectedKey] || '',
      validate: (value) => {
        if (!value.trim()) return '显示名称不能为空 | Display name cannot be empty';
        return true;
      },
    });

    // 更新映射
    if (this.currentConfig.components?.model?.mapping) {
      this.currentConfig.components.model.mapping[selectedKey] = newValue;
      this.hasUnsavedChanges = true;
    }

    console.log(`\n✅ 已更新映射: ${selectedKey} → ${newValue}`);
    await this.waitForKeyPress();
  }

  /**
   * 删除模型映射 | Delete Model Mapping
   */
  private async deleteModelMapping(): Promise<void> {
    const currentMappings = this.currentConfig.components?.model?.mapping || {};
    const mappingKeys = Object.keys(currentMappings);

    if (mappingKeys.length === 0) {
      console.log('\n暂无可删除的映射 | No mappings to delete');
      await this.waitForKeyPress();
      return;
    }

    const selectedKey = await select({
      message: '选择要删除的映射 | Select mapping to delete:',
      choices: mappingKeys.map((key) => ({
        name: `${key} → ${currentMappings[key]}`,
        value: key,
      })),
    });

    const confirmDelete = await confirm({
      message: `确定删除映射 "${selectedKey} → ${currentMappings[selectedKey]}" 吗？`,
      default: false,
    });

    if (confirmDelete && this.currentConfig.components?.model?.mapping) {
      delete this.currentConfig.components.model.mapping[selectedKey];
      this.hasUnsavedChanges = true;
      console.log(`\n✅ 已删除映射: ${selectedKey}`);
    } else {
      console.log('\n取消删除 | Deletion cancelled');
    }

    await this.waitForKeyPress();
  }

  /**
   * 应用默认模型映射 | Apply Default Model Mappings
   */
  private async applyDefaultModelMappings(): Promise<void> {
    const defaultMappings = {
      'claude-sonnet-4': 'S4',
      'claude-haiku-3.5': 'H3.5',
      'gpt-4-turbo': 'GPT4T',
      'gpt-4o': 'GPT4O',
      'gemini-pro': 'Gemini',
      'mistral-large': 'Mistral',
    };

    const confirmApply = await confirm({
      message: '确定应用默认映射吗？这将添加常用模型的简化名称。',
      default: true,
    });

    if (confirmApply) {
      // 确保映射对象存在
      if (!this.currentConfig.components) {
        this.currentConfig.components = { order: [] };
      }
      if (!this.currentConfig.components.model) {
        this.currentConfig.components.model = {
          enabled: true,
          icon_color: 'white',
          text_color: 'white',
          emoji_icon: '🤖',
          show_full_name: false,
          mapping: {},
        };
      }
      if (!this.currentConfig.components.model.mapping) {
        this.currentConfig.components.model.mapping = {};
      }

      // 合并默认映射
      Object.assign(this.currentConfig.components.model.mapping, defaultMappings);
      this.hasUnsavedChanges = true;

      console.log('\n✅ 已应用默认模型映射！');
      console.log('添加的映射 | Added mappings:');
      Object.entries(defaultMappings).forEach(([key, value]) => {
        console.log(`  ${key} → ${value}`);
      });
    } else {
      console.log('\n取消应用默认映射 | Cancelled applying default mappings');
    }

    await this.waitForKeyPress();
  }

  /**
   * 获取当前配置 - 供外部访问
   */
  getConfig(): Config {
    return this.currentConfig;
  }

  /**
   * 检查是否有未保存的更改
   */
  hasChanges(): boolean {
    return this.hasUnsavedChanges;
  }
}

/**
 * 工厂函数 - 创建Model编辑器实例
 */
export function createModelEditor(
  config: Config,
  onConfigChange: (hasChanges: boolean) => void
): ModelEditor {
  return new ModelEditor(config, onConfigChange);
}
