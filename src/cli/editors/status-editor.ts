/**
 * Status编辑器 - Status Component Editor
 * 从config-editor.ts拆分出来的Status组件配置方法
 *
 * 功能:
 * - Status组件高级配置主界面
 * - 五种状态的三级图标配置
 * - 各种状态对应的颜色设置
 * - 错误显示选项配置
 */

import { confirm, input, select } from '@inquirer/prompts';
import type { Config } from '../../config/schema.js';
import { t } from '../i18n.js';

/**
 * Status编辑器基类 - 提供Status组件的所有配置功能
 */
export class StatusEditor {
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
   * Status组件高级配置主界面 | Status Component Advanced Configuration
   */
  async configureStatusComponentAdvanced(): Promise<void> {
    const statusConfig = this.currentConfig.components?.status;
    if (!statusConfig) {
      console.log(t('errors.componentNotFound', { component: 'Status' }));
      await this.waitForKeyPress();
      return;
    }

    console.log(`\n⚡ ${t('component.status.advanced')}`);
    console.log(`${t('component.config.categories')}: 4`);
    console.log(`${t('component.config.item_count')}: 12+\n`);

    const category = await select({
      message: `${t('editor.components.items.status.name')} - ${t('component.config.deep')}`,
      choices: [
        {
          name: `⚙️  ${t('component.status.basic_settings')}`,
          value: 'basic',
          description: '启用/禁用、图标、颜色配置 | Enable/disable, icons, colors configuration',
        },
        {
          name: `🎨 ${t('component.status.icon_config')}`,
          value: 'icons',
          description: '五种状态的三级图标配置 | Three-tier icon configuration for five statuses',
        },
        {
          name: `🌈 ${t('component.status.color_config')}`,
          value: 'colors',
          description: '各种状态对应的颜色设置 | Color settings for various statuses',
        },
        {
          name: `🚨 ${t('component.status.error_display')}`,
          value: 'error',
          description: '错误显示选项配置 | Error display options configuration',
        },
        {
          name: t('editor.components.items.back'),
          value: 'back',
        },
      ],
    });

    switch (category) {
      case 'basic':
        await this.configureIndividualComponent('status');
        break;
      case 'icons':
        await this.configureStatusIcons();
        break;
      case 'colors':
        await this.configureStatusColors();
        break;
      case 'error':
        await this.configureStatusErrorDisplay();
        break;
      case 'back':
        return;
    }
  }

  /**
   * Status图标配置 | Status Icons Configuration
   */
  private async configureStatusIcons(): Promise<void> {
    const statusConfig = this.currentConfig.components?.status;
    if (!statusConfig) return;

    console.log(`\n🎨 ${t('component.status.status_icons')}`);
    console.log(`${t('component.config.item_count')}: 15 (5状态 × 3图标类型)\n`);

    const currentIcons = statusConfig.icons || {
      emoji: {
        ready: '✅',
        thinking: '💭',
        tool: '🔧',
        error: '❌',
        warning: '⚠️',
      },
      nerd: {
        ready: '',
        thinking: '',
        tool: '',
        error: '',
        warning: '',
      },
      text: {
        ready: '[OK]',
        thinking: '[...]',
        tool: '[TOOL]',
        error: '[ERR]',
        warning: '[WARN]',
      },
    };

    // 显示当前图标配置
    console.log('当前图标配置 | Current Icon Configuration:');
    console.log(
      `  ${t('component.status.ready_status')}: ${currentIcons.emoji.ready} ${currentIcons.nerd.ready} ${currentIcons.text.ready}`
    );
    console.log(
      `  ${t('component.status.thinking_status')}: ${currentIcons.emoji.thinking} ${currentIcons.nerd.thinking} ${currentIcons.text.thinking}`
    );
    console.log(
      `  ${t('component.status.tool_status')}: ${currentIcons.emoji.tool} ${currentIcons.nerd.tool} ${currentIcons.text.tool}`
    );
    console.log(
      `  ${t('component.status.error_status')}: ${currentIcons.emoji.error} ${currentIcons.nerd.error} ${currentIcons.text.error}`
    );
    console.log(
      `  ${t('component.status.warning_status')}: ${currentIcons.emoji.warning} ${currentIcons.nerd.warning} ${currentIcons.text.warning}\n`
    );

    const iconType = await select({
      message: `${t('component.status.status_icons')} - 选择图标类型 | Select icon type:`,
      choices: [
        {
          name: `😀 ${t('component.status.emoji_icons')}`,
          value: 'emoji',
          description: 'Emoji图标配置 | Emoji icon configuration',
        },
        {
          name: `⭐ ${t('component.status.nerd_icons')}`,
          value: 'nerd',
          description: 'Nerd Font图标配置 | Nerd Font icon configuration',
        },
        {
          name: `📝 ${t('component.status.text_icons')}`,
          value: 'text',
          description: '文本图标配置 | Text icon configuration',
        },
        {
          name: t('editor.components.items.back'),
          value: 'back',
        },
      ],
    });

    if (iconType === 'back') return;

    // 配置选定类型的图标
    const statuses: Array<keyof typeof currentIcons.emoji> = [
      'ready',
      'thinking',
      'tool',
      'error',
      'warning',
    ];
    const statusNames = {
      ready: t('component.status.ready_status'),
      thinking: t('component.status.thinking_status'),
      tool: t('component.status.tool_status'),
      error: t('component.status.error_status'),
      warning: t('component.status.warning_status'),
    };

    for (const status of statuses) {
      const currentIcon = currentIcons[iconType as keyof typeof currentIcons][status];
      const newIcon = await input({
        message: `${statusNames[status]} ${iconType} 图标:`,
        default: currentIcon,
        validate: (value) => {
          if (!value.trim()) return '图标不能为空 | Icon cannot be empty';
          return true;
        },
      });

      currentIcons[iconType as keyof typeof currentIcons][status] = newIcon;
    }

    // 更新配置
    if (!this.currentConfig.components) {
      this.currentConfig.components = { order: [] };
    }
    if (!this.currentConfig.components.status) {
      this.currentConfig.components.status = {
        enabled: true,
        icon_color: 'white',
        text_color: 'white',
        emoji_icon: '⚡',
        show_recent_errors: true,
      };
    }

    this.currentConfig.components.status.icons = currentIcons;
    this.hasUnsavedChanges = true;

    console.log('\n✅ Status图标配置已更新 | Status icons configuration updated!');
    await this.waitForKeyPress();
  }

  /**
   * Status颜色配置 | Status Colors Configuration
   */
  private async configureStatusColors(): Promise<void> {
    const statusConfig = this.currentConfig.components?.status;
    if (!statusConfig) return;

    console.log(`\n🌈 ${t('component.status.status_colors')}`);
    console.log(`${t('component.config.item_count')}: 5\n`);

    const currentColors = statusConfig.colors || {
      ready: 'green',
      thinking: 'yellow',
      tool: 'blue',
      error: 'red',
      warning: 'yellow',
    };

    // 显示当前颜色配置
    console.log('当前颜色配置 | Current Color Configuration:');
    console.log(`  ${t('component.status.ready_status')}: ${currentColors.ready}`);
    console.log(`  ${t('component.status.thinking_status')}: ${currentColors.thinking}`);
    console.log(`  ${t('component.status.tool_status')}: ${currentColors.tool}`);
    console.log(`  ${t('component.status.error_status')}: ${currentColors.error}`);
    console.log(`  ${t('component.status.warning_status')}: ${currentColors.warning}\n`);

    const colorChoices = [
      { name: '🔴 红色 | Red', value: 'red' },
      { name: '🟢 绿色 | Green', value: 'green' },
      { name: '🟡 黄色 | Yellow', value: 'yellow' },
      { name: '🔵 蓝色 | Blue', value: 'blue' },
      { name: '🟣 洋红 | Magenta', value: 'magenta' },
      { name: '🩵 青色 | Cyan', value: 'cyan' },
      { name: '⚪ 白色 | White', value: 'white' },
      { name: '🖤 灰色 | Gray', value: 'gray' },
    ];

    // 配置各状态颜色
    const statuses: Array<keyof typeof currentColors> = [
      'ready',
      'thinking',
      'tool',
      'error',
      'warning',
    ];
    const statusNames = {
      ready: t('component.status.ready_color'),
      thinking: t('component.status.thinking_color'),
      tool: t('component.status.tool_color'),
      error: t('component.status.error_color'),
      warning: t('component.status.warning_color'),
    };

    for (const status of statuses) {
      const selectedColor = await select({
        message: `${statusNames[status]}:`,
        choices: colorChoices,
        default: currentColors[status],
      });

      currentColors[status] = selectedColor as any;
    }

    // 更新配置
    if (!this.currentConfig.components) {
      this.currentConfig.components = { order: [] };
    }
    if (!this.currentConfig.components.status) {
      this.currentConfig.components.status = {
        enabled: true,
        icon_color: 'white',
        text_color: 'white',
        emoji_icon: '⚡',
        show_recent_errors: true,
      };
    }

    this.currentConfig.components.status.colors = currentColors;
    this.hasUnsavedChanges = true;

    console.log('\n✅ Status颜色配置已更新 | Status colors configuration updated!');
    await this.waitForKeyPress();
  }

  /**
   * Status错误显示配置 | Status Error Display Configuration
   */
  private async configureStatusErrorDisplay(): Promise<void> {
    const statusConfig = this.currentConfig.components?.status;
    if (!statusConfig) return;

    console.log(`\n🚨 ${t('component.status.error_display')}`);
    console.log(`${t('component.config.item_count')}: 1\n`);

    // 显示当前配置
    console.log('当前配置 | Current Configuration:');
    console.log(
      `  ${t('component.status.show_recent_errors')}: ${statusConfig.show_recent_errors ? '✅' : '❌'}\n`
    );

    // 配置显示最近错误
    const showRecentErrors = await confirm({
      message: t('component.status.show_recent_errors'),
      default: statusConfig.show_recent_errors,
    });

    // 更新配置
    if (this.currentConfig.components?.status) {
      this.currentConfig.components.status.show_recent_errors = showRecentErrors;
    }

    this.hasUnsavedChanges = true;
    console.log('\n✅ Status错误显示配置已更新 | Status error display configuration updated!');
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
 * 工厂函数 - 创建Status编辑器实例
 */
export function createStatusEditor(
  config: Config,
  onConfigChange: (hasChanges: boolean) => void
): StatusEditor {
  return new StatusEditor(config, onConfigChange);
}
