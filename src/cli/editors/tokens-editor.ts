/**
 * Tokens组件编辑器 - Tokens Component Editor
 * 拆分自config-editor.ts，专门负责Tokens组件的深度配置
 *
 * 功能特性:
 * - 基础设置：启用/禁用、三级图标系统、双色配置
 * - 渐变和进度条：彩色渐变、进度条宽度、百分比显示
 * - 阈值配置：warning、danger、backup、critical四级阈值
 * - 状态图标：备用和临界状态的emoji/nerd/text三级图标
 * - 上下文窗口：默认窗口和模型专用窗口配置
 */

import { confirm, input, select } from '@inquirer/prompts';
import type { Config, TokensComponentConfig } from '../../config/schema.js';
import { t } from '../i18n.js';

/**
 * Tokens组件编辑器类
 * 继承概念上的BaseEditor功能，专注于Tokens组件配置
 */
export class TokensEditor {
  private currentConfig: Config;
  private hasUnsavedChanges = false;

  constructor(config: Config) {
    this.currentConfig = config;
  }

  /**
   * 获取当前配置
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

  /**
   * Tokens组件高级配置主界面 | Tokens Component Advanced Configuration
   */
  async configureTokensComponentAdvanced(): Promise<void> {
    const tokensConfig = this.currentConfig.components?.tokens;
    if (!tokensConfig) {
      console.log(t('errors.componentNotFound', { component: 'Tokens' }));
      await this.waitForKeyPress();
      return;
    }

    console.log(`\n📊 ${t('component.tokens.advanced')}`);
    console.log(`${t('component.config.categories')}: 5`);
    console.log(`${t('component.config.item_count')}: 12+\n`);

    const category = await select({
      message: `${t('editor.components.items.tokens.name')} - ${t('component.config.deep')}`,
      choices: [
        {
          name: `⚙️  ${t('component.tokens.basic_settings')} | Basic Settings`,
          value: 'basic',
          description: '启用/禁用、图标、颜色配置 | Enable/disable, icons, colors configuration',
        },
        {
          name: `📊 ${t('component.tokens.progress_config')} | Progress Configuration`,
          value: 'progress',
          description:
            '渐变、进度条、百分比、宽度配置 | Gradient, progress bar, percentage, width config',
        },
        {
          name: `🎯 ${t('component.tokens.threshold_config')} | Threshold Configuration`,
          value: 'thresholds',
          description: '警告、危险、临界阈值设置 | Warning, danger, critical threshold settings',
        },
        {
          name: `🎨 ${t('component.tokens.icon_config')} | Icon Configuration`,
          value: 'icons',
          description: '备用和临界状态的三级图标 | Backup and critical status tri-level icons',
        },
        {
          name: `🪟 ${t('component.tokens.context_config')} | Context Windows`,
          value: 'context',
          description: '模型上下文窗口大小配置 | Model context window size configuration',
        },
        {
          name: '← 返回主菜单 | Back to main menu',
          value: 'back',
        },
      ],
    });

    if (category === 'back') return;

    switch (category) {
      case 'basic':
        await this.configureTokensBasic();
        // 配置后立即预览效果
        await this.showConfigPreview('Tokens基础配置更新');
        break;
      case 'progress':
        await this.configureTokensProgress();
        // 配置后立即预览效果
        await this.showConfigPreview('进度条配置更新');
        break;
      case 'thresholds':
        await this.configureTokenThresholds();
        // 配置后立即预览效果
        await this.showConfigPreview('阈值配置更新');
        break;
      case 'icons':
        await this.configureTokensIcons();
        // 配置后立即预览效果
        await this.showConfigPreview('图标配置更新');
        break;
      case 'context':
        await this.configureTokenContextWindows();
        // 配置后立即预览效果
        await this.showConfigPreview('上下文窗口配置更新');
        break;
    }
  }

  /**
   * Tokens基础设置配置 | Tokens Basic Settings Configuration
   */
  async configureTokensBasic(): Promise<void> {
    const tokensConfig =
      (this.currentConfig.components?.tokens as TokensComponentConfig) ||
      ({
        enabled: true,
        icon_color: 'cyan',
        text_color: 'white',
        emoji_icon: '📊',
        nerd_icon: '',
        text_icon: '[TOK]',
        show_gradient: false,
        show_progress_bar: true,
        show_percentage: true,
        show_raw_numbers: false,
        progress_width: 15,
        context_windows: { default: 200000 },
      } as TokensComponentConfig);

    console.log(`\n⚙️  ${t('component.tokens.basic_settings')}`);
    console.log('📌 注意：组件启用状态由预设管理，此处仅配置显示属性\n');

    let emoji_icon = tokensConfig.emoji_icon || '📊';
    let nerd_icon = tokensConfig.nerd_icon || '';
    let text_icon = tokensConfig.text_icon || '[TOK]';
    let icon_color = tokensConfig.icon_color || 'cyan';
    let text_color = tokensConfig.text_color || 'white';

    emoji_icon = await input({
      message: `${t('component.tokens.emoji_icons')} (Emoji):`,
      default: emoji_icon,
    });

    nerd_icon = await input({
      message: `${t('component.tokens.nerd_icons')} (Nerd Font):`,
      default: nerd_icon,
    });

    text_icon = await input({
      message: `${t('component.tokens.text_icons')} (Text):`,
      default: text_icon,
    });

    icon_color = await select({
      message: 'Icon color:',
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
      default: icon_color,
    });

    text_color = await select({
      message: 'Text color:',
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
      default: text_color,
    });

    // 更新配置（移除enabled管理）
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
      tokens: {
        ...tokensConfig,
        enabled: true,
        emoji_icon,
        nerd_icon,
        text_icon,
        icon_color,
        text_color,
      },
    };

    this.hasUnsavedChanges = true;
    console.log('\n✅ Tokens基础配置已更新 | Tokens basic configuration updated!');
    console.log('💡 提示：组件启用状态请在预设管理中配置');
    await this.waitForKeyPress();
  }

  /**
   * Tokens渐变和进度条配置 | Tokens Progress Configuration
   */
  async configureTokensProgress(): Promise<void> {
    const tokensConfig =
      (this.currentConfig.components?.tokens as TokensComponentConfig) ||
      ({
        enabled: true,
        icon_color: 'cyan',
        text_color: 'white',
        emoji_icon: '📊',
        show_gradient: false,
        show_progress_bar: true,
        show_percentage: true,
        show_raw_numbers: false,
        progress_width: 15,
        context_windows: { default: 200000 },
      } as TokensComponentConfig);

    console.log(`\n📊 ${t('component.tokens.progress_config')}`);

    const show_gradient = await confirm({
      message: t('component.tokens.show_gradient'),
      default: tokensConfig.show_gradient ?? false,
    });

    const show_progress_bar = await confirm({
      message: t('component.tokens.show_progress_bar'),
      default: tokensConfig.show_progress_bar ?? true,
    });

    const show_percentage = await confirm({
      message: t('component.tokens.show_percentage'),
      default: tokensConfig.show_percentage ?? true,
    });

    const show_raw_numbers = await confirm({
      message: t('component.tokens.show_raw_numbers'),
      default: tokensConfig.show_raw_numbers ?? false,
    });

    let progress_width = tokensConfig.progress_width ?? 15;
    let progress_bar_chars = tokensConfig.progress_bar_chars || {
      filled: '█',
      empty: '░',
      backup: '▓',
    };

    if (show_progress_bar) {
      const widthInput = await input({
        message: `${t('component.tokens.progress_width')} (5-50):`,
        default: String(progress_width),
        validate: (input) => {
          const num = parseInt(input, 10);
          return num >= 5 && num <= 50 ? true : 'Width must be between 5 and 50';
        },
      });
      progress_width = parseInt(widthInput, 10);

      console.log(`\n${t('component.tokens.progress_chars')}:`);

      const filled = await input({
        message: `${t('component.tokens.filled_char')}:`,
        default: progress_bar_chars.filled,
      });

      const empty = await input({
        message: `${t('component.tokens.empty_char')}:`,
        default: progress_bar_chars.empty,
      });

      const backup = await input({
        message: `${t('component.tokens.backup_char')}:`,
        default: progress_bar_chars.backup,
      });

      progress_bar_chars = { filled, empty, backup };
    }

    // 更新配置
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
      tokens: {
        ...tokensConfig,
        enabled: true,
        show_gradient,
        show_progress_bar,
        show_percentage,
        show_raw_numbers,
        progress_width,
        progress_bar_chars,
      },
    };

    this.hasUnsavedChanges = true;
    console.log('\n✅ Tokens进度条配置已更新 | Tokens progress configuration updated!');
    await this.waitForKeyPress();
  }

  /**
   * Tokens阈值配置 | Tokens Threshold Configuration
   */
  async configureTokenThresholds(): Promise<void> {
    const tokensConfig =
      (this.currentConfig.components?.tokens as TokensComponentConfig) ||
      ({
        enabled: true,
        icon_color: 'cyan',
        text_color: 'white',
        emoji_icon: '📊',
        show_gradient: false,
        show_progress_bar: true,
        show_percentage: true,
        show_raw_numbers: false,
        progress_width: 15,
        context_windows: { default: 200000 },
      } as TokensComponentConfig);
    const currentThresholds = tokensConfig.thresholds || {
      warning: 60,
      danger: 85,
      backup: 85,
      critical: 95,
    };

    console.log(`\n🎯 ${t('component.tokens.threshold_config')}`);
    console.log(`${t('component.tokens.threshold_validation')}`);
    console.log(`${t('component.tokens.threshold_preview')}:\n`);

    const validateThreshold = (input: string): string | true => {
      const num = parseInt(input, 10);
      if (Number.isNaN(num) || num < 0 || num > 100) {
        return t('component.tokens.threshold_validation');
      }
      return true;
    };

    const warningInput = await input({
      message: `${t('component.tokens.warning_threshold')}:`,
      default: String(currentThresholds.warning),
      validate: validateThreshold,
    });
    const warning = parseInt(warningInput, 10);

    const dangerInput = await input({
      message: `${t('component.tokens.danger_threshold')}:`,
      default: String(currentThresholds.danger),
      validate: validateThreshold,
    });
    const danger = parseInt(dangerInput, 10);

    const backupInput = await input({
      message: `${t('component.tokens.backup_threshold')}:`,
      default: String(currentThresholds.backup),
      validate: validateThreshold,
    });
    const backup = parseInt(backupInput, 10);

    const criticalInput = await input({
      message: `${t('component.tokens.critical_threshold')}:`,
      default: String(currentThresholds.critical),
      validate: validateThreshold,
    });
    const critical = parseInt(criticalInput, 10);

    // 显示阈值预览
    console.log('\n📊 Threshold Preview:');
    console.log(
      `  0% ─────── ${warning}% Warning ─────── ${danger}% Danger ─────── ${backup}% Backup ─────── ${critical}% Critical ─────── 100%`
    );

    const thresholds = { warning, danger, backup, critical };

    // 更新配置
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
      tokens: {
        ...tokensConfig,
        enabled: true,
        thresholds,
      },
    };

    this.hasUnsavedChanges = true;
    console.log('\n✅ Tokens阈值配置已更新 | Tokens threshold configuration updated!');
    await this.waitForKeyPress();
  }

  /**
   * Tokens状态图标配置 | Tokens Status Icons Configuration
   */
  async configureTokensIcons(): Promise<void> {
    const tokensConfig =
      (this.currentConfig.components?.tokens as TokensComponentConfig) ||
      ({
        enabled: true,
        icon_color: 'cyan',
        text_color: 'white',
        emoji_icon: '📊',
        show_gradient: false,
        show_progress_bar: true,
        show_percentage: true,
        show_raw_numbers: false,
        progress_width: 15,
        context_windows: { default: 200000 },
      } as TokensComponentConfig);
    const currentIcons = tokensConfig.status_icons || {
      emoji: { backup: '⚡', critical: '🔥' },
      nerd: { backup: '', critical: '' },
      text: { backup: '[!]', critical: '[X]' },
    };

    console.log(`\n🎨 ${t('component.tokens.icon_config')}`);

    console.log(`\n${t('component.tokens.emoji_icons')}:`);
    const backupEmoji = await input({
      message: `${t('component.tokens.backup_status')} (Emoji):`,
      default: currentIcons.emoji.backup,
    });
    const criticalEmoji = await input({
      message: `${t('component.tokens.critical_status')} (Emoji):`,
      default: currentIcons.emoji.critical,
    });

    console.log(`\n${t('component.tokens.nerd_icons')}:`);
    const backupNerd = await input({
      message: `${t('component.tokens.backup_status')} (Nerd Font):`,
      default: currentIcons.nerd.backup,
    });
    const criticalNerd = await input({
      message: `${t('component.tokens.critical_status')} (Nerd Font):`,
      default: currentIcons.nerd.critical,
    });

    console.log(`\n${t('component.tokens.text_icons')}:`);
    const backupText = await input({
      message: `${t('component.tokens.backup_status')} (Text):`,
      default: currentIcons.text.backup,
    });
    const criticalText = await input({
      message: `${t('component.tokens.critical_status')} (Text):`,
      default: currentIcons.text.critical,
    });

    const status_icons = {
      emoji: { backup: backupEmoji, critical: criticalEmoji },
      nerd: { backup: backupNerd, critical: criticalNerd },
      text: { backup: backupText, critical: criticalText },
    };

    // 更新配置
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
      tokens: {
        ...tokensConfig,
        enabled: true,
        status_icons,
      },
    };

    this.hasUnsavedChanges = true;
    console.log('\n✅ Tokens图标配置已更新 | Tokens icon configuration updated!');
    await this.waitForKeyPress();
  }

  /**
   * Tokens上下文窗口配置 | Tokens Context Windows Configuration
   */
  async configureTokenContextWindows(): Promise<void> {
    const tokensConfig =
      (this.currentConfig.components?.tokens as TokensComponentConfig) ||
      ({
        enabled: true,
        icon_color: 'cyan',
        text_color: 'white',
        emoji_icon: '📊',
        show_gradient: false,
        show_progress_bar: true,
        show_percentage: true,
        show_raw_numbers: false,
        progress_width: 15,
        context_windows: { default: 200000 },
      } as TokensComponentConfig);
    const currentWindows = tokensConfig.context_windows || { default: 200000 };

    console.log(`\n🪟 ${t('component.tokens.context_config')}`);

    // 配置默认上下文窗口
    const defaultWindowInput = await input({
      message: `${t('component.tokens.context_window_default')}:`,
      default: String(currentWindows.default || 200000),
      validate: (input) => {
        const num = parseInt(input, 10);
        return num > 0 ? true : 'Context window size must be positive';
      },
    });
    const defaultWindow = parseInt(defaultWindowInput, 10);

    const context_windows: Record<string, number> = { ...currentWindows, default: defaultWindow };

    // 显示现有模型配置
    console.log(`\n${t('component.tokens.context_window_model')}:`);
    const modelKeys = Object.keys(currentWindows).filter((k) => k !== 'default');
    if (modelKeys.length > 0) {
      for (const modelName of modelKeys) {
        const windowSize = currentWindows[modelName as keyof typeof currentWindows];
        console.log(`  ${modelName}: ${windowSize} tokens`);
      }
    } else {
      console.log('  (无模型专用配置 | No model-specific configurations)');
    }

    // 询问是否添加模型专用配置
    const addModel = await confirm({
      message: `${t('component.tokens.add_model_window')}?`,
      default: false,
    });

    if (addModel) {
      const modelName = await input({
        message: `${t('component.tokens.model_name')}:`,
        default: 'claude-sonnet-4',
      });

      const windowSizeInput = await input({
        message: `${t('component.tokens.window_size')}:`,
        default: '200000',
        validate: (input) => {
          const num = parseInt(input, 10);
          return num > 0 ? true : 'Window size must be positive';
        },
      });

      context_windows[modelName] = parseInt(windowSizeInput, 10);
    }

    // 更新配置
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
      tokens: {
        ...tokensConfig,
        enabled: true,
        context_windows,
      },
    };

    this.hasUnsavedChanges = true;
    console.log('\n✅ Tokens上下文窗口配置已更新 | Tokens context window configuration updated!');
    await this.waitForKeyPress();
  }

  /**
   * 显示配置预览 | Show Configuration Preview
   * 简化版本，避免循环依赖
   */
  private async showConfigPreview(updateMessage: string): Promise<void> {
    console.log(`\n✅ ${updateMessage}`);
    console.log('📊 配置已更新，返回主界面查看预览效果');
  }

  /**
   * 等待按键
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
          console.log('\n👋 已退出Tokens配置编辑器');
          process.exit(0);
        }

        resolve();
      };

      stdin.on('data', onData);
    });
  }
}
