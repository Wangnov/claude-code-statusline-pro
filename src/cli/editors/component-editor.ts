/**
 * 基础组件配置编辑器 - Component Configuration Editor
 * 负责组件选择主界面和基础组件配置路由
 *
 * 特性 | Features:
 * - 组件选择主界面 | Component selection main interface
 * - Project组件专用配置 | Project component specific configuration
 * - 通用单个组件配置 | Generic individual component configuration
 * - 组件显示名称辅助方法 | Component display name helper methods
 */

import { confirm, input, select } from '@inquirer/prompts';
import type { ComponentConfig, Config } from '../../config/schema.js';
import { getComponentConfigItemCount } from '../component-config-mapper.js';
import { t } from '../i18n.js';

/**
 * 基础组件编辑器类 | Component Editor Class
 */
export class ComponentEditor {
  private config: Config;
  private hasUnsavedChanges: boolean = false;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * 获取未保存更改状态 | Get unsaved changes status
   */
  getHasUnsavedChanges(): boolean {
    return this.hasUnsavedChanges;
  }

  /**
   * 重置未保存更改状态 | Reset unsaved changes status
   */
  resetUnsavedChanges(): void {
    this.hasUnsavedChanges = false;
  }

  /**
   * 获取更新后的配置 | Get updated configuration
   */
  getUpdatedConfig(): Config {
    return this.config;
  }

  /**
   * 组件配置主界面 - 重构版本，显示配置项数量
   * Component Configuration Main Interface - Refactored version with configuration item counts
   */
  async configureComponents(): Promise<void> {
    // 获取各组件配置项数量
    const componentCounts = {
      project: getComponentConfigItemCount('project'),
      model: getComponentConfigItemCount('model'),
      branch: getComponentConfigItemCount('branch'),
      tokens: getComponentConfigItemCount('tokens'),
      usage: getComponentConfigItemCount('usage'),
      status: getComponentConfigItemCount('status'),
    };

    const componentName = await select({
      message: t('editor.components.title'),
      choices: [
        {
          name: `📁 ${t('editor.components.items.project.name')} (${componentCounts.project}项可配置)`,
          value: 'project',
          description: '项目名称组件 | Project name component',
        },
        {
          name: `🤖 ${t('editor.components.items.model.name')} (${componentCounts.model}+项可配置)`,
          value: 'model',
          description: '模型信息组件，支持深度配置 | Model info component with deep configuration',
        },
        {
          name: `🌿 ${t('editor.components.items.branch.name')} (${componentCounts.branch}+项可配置)`,
          value: 'branch',
          description:
            'Git分支组件，最丰富的配置选项 | Git branch component with richest configuration options',
        },
        {
          name: `📊 ${t('editor.components.items.tokens.name')} (${componentCounts.tokens}+项可配置)`,
          value: 'tokens',
          description:
            'Token使用量组件，支持深度配置 | Token usage component with deep configuration',
        },
        {
          name: `💰 ${t('editor.components.items.usage.name')} (${componentCounts.usage}项可配置)`,
          value: 'usage',
          description: '使用量统计组件 | Usage statistics component',
        },
        {
          name: `✨ ${t('editor.components.items.status.name')} (${componentCounts.status}+项可配置)`,
          value: 'status',
          description:
            '状态指示组件，支持深度配置 | Status indicator component with deep configuration',
        },
        { name: `← ${t('editor.components.items.back')}`, value: 'back' },
      ],
      pageSize: 8,
    });

    if (componentName === 'back') return;

    // 路由到对应的组件配置方法
    switch (componentName) {
      case 'project':
        await this.configureProjectComponent();
        break;
      case 'usage':
        // Usage组件由专用编辑器处理
        console.log('Usage组件配置需要使用专用编辑器');
        break;
      case 'model':
      case 'branch':
      case 'tokens':
      case 'status':
        // 这些组件的高级配置仍在主配置编辑器中
        console.log(`${componentName}组件的高级配置仍在主配置编辑器中处理`);
        break;
      default:
        console.log(`Unknown component: ${componentName}`);
        break;
    }
  }

  /**
   * 配置Project组件 | Configure Project Component
   */
  async configureProjectComponent(): Promise<void> {
    console.log('\n📁 Project组件配置\n');

    // 注意：组件启用状态现在通过预设系统管理
    console.log(`📋 ${t('editor.components.preset_managed')}`);

    const component = this.config.components?.project;

    // 配置图标
    const icon = await input({
      message: '项目图标：',
      default: component?.emoji_icon || '📁',
    });

    // 配置颜色
    const color = await select({
      message: '图标颜色：',
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
      default: component?.icon_color || 'cyan',
    });

    // 更新配置（不修改enabled状态）
    const updatedComponent = {
      enabled: true,
      text_color: 'white' as const,
      show_when_empty: false,
      ...(component || {}),
      emoji_icon: icon,
      icon_color: color as
        | 'cyan'
        | 'green'
        | 'yellow'
        | 'blue'
        | 'magenta'
        | 'red'
        | 'white'
        | 'gray',
    };

    if (!this.config.components) {
      this.config.components = {
        order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
      };
    }

    this.config.components = {
      ...this.config.components,
      project: updatedComponent,
    };

    this.hasUnsavedChanges = true;
    console.log('✅ Project组件配置已更新！');
    await this.waitForKeyPress();
  }

  /**
   * 配置单个组件 | Configure Individual Component
   * 通用的单个组件配置方法
   */
  async configureIndividualComponent(componentName: string): Promise<void> {
    const component = this.config.components?.[
      componentName as keyof typeof this.config.components
    ] as ComponentConfig;

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
      icon,
      color,
    };

    this.config.components = {
      order: this.config.components?.order || [
        'project',
        'model',
        'branch',
        'tokens',
        'usage',
        'status',
      ],
      ...this.config.components,
      [componentName]: updatedComponent,
    };

    this.hasUnsavedChanges = true;

    console.log(t('editor.components.configuration.updated', { component: componentName }));
    await this.waitForKeyPress();
  }

  /**
   * 获取组件显示名称 | Get Component Display Name
   */
  getComponentDisplayName(component: string): string {
    const displayNames: Record<string, string> = {
      project: '📁 项目名称',
      model: '🤖 AI模型',
      branch: '🌿 Git分支',
      tokens: '📊 Token使用',
      usage: '💰 使用量统计',
      status: '⚡ 会话状态',
    };

    return displayNames[component] || component;
  }

  /**
   * 等待按键 | Wait for Key Press
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
}

/**
 * 工厂函数 - 创建组件编辑器实例 | Factory function - Create component editor instance
 */
export function createComponentEditor(config: Config): ComponentEditor {
  return new ComponentEditor(config);
}
