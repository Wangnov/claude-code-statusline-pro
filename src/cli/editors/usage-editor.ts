/**
 * Usage组件专用配置编辑器 - Usage Component Specific Configuration Editor
 * 负责Usage组件的深度配置管理
 *
 * 特性 | Features:
 * - Usage组件完整配置管理 | Complete Usage component configuration management
 * - 显示模式配置 | Display mode configuration
 * - 精度设置 | Precision settings
 * - 模型名称显示配置 | Model name display configuration
 */

import { confirm, input, select } from '@inquirer/prompts';
import type { Config } from '../../config/schema.js';
import { t } from '../i18n.js';

/**
 * Usage组件专用编辑器类 | Usage Component Specific Editor Class
 */
export class UsageEditor {
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
   * 配置Usage组件的专用设置 | Configure Usage component specific settings
   */
  async configureUsageComponent(): Promise<void> {
    const component = this.config.components?.usage;

    if (!component) {
      console.log(t('errors.componentNotFound', { component: 'Usage' }));
    }

    console.log(`\n${t('editor.usage.title')}`);
    console.log('📌 注意：组件启用状态由预设管理，此处仅配置显示属性\n');

    let displayMode = component?.display_mode || 'combined';
    let showModel = component?.show_model ?? false;
    let precision = component?.precision ?? 2;
    let icon = component?.emoji_icon || '💰';
    let color = component?.icon_color || 'cyan';

    // 配置显示模式
    displayMode = await select({
      message: t('editor.usage.displayMode.title'),
      choices: [
        { name: t('editor.usage.displayMode.cost'), value: 'cost' },
        { name: t('editor.usage.displayMode.tokens'), value: 'tokens' },
        { name: t('editor.usage.displayMode.combined'), value: 'combined' },
        { name: t('editor.usage.displayMode.breakdown'), value: 'breakdown' },
      ],
      default: component?.display_mode || 'combined',
    });

    // 配置是否显示模型名称
    showModel = await confirm({
      message: t('editor.usage.showModel'),
      default: component?.show_model ?? false,
    });

    // 配置精度（仅在成本相关模式下显示）
    if (displayMode === 'cost' || displayMode === 'combined') {
      precision = await select({
        message: t('editor.usage.precision.title'),
        choices: [
          { name: t('editor.usage.precision.options.0'), value: 0 },
          { name: t('editor.usage.precision.options.1'), value: 1 },
          { name: t('editor.usage.precision.options.2'), value: 2 },
          { name: t('editor.usage.precision.options.3'), value: 3 },
          { name: t('editor.usage.precision.options.4'), value: 4 },
        ],
        default: component?.precision ?? 2,
      });
    }

    // 配置图标
    icon = await input({
      message: t('editor.components.configuration.icon', { component: 'Usage' }),
      default: component?.emoji_icon || '💰',
    });

    // 配置颜色
    color = await select({
      message: t('editor.components.configuration.color', { component: 'Usage' }),
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

    // 更新配置（保持enabled属性）
    const updatedComponent = {
      enabled: component?.enabled ?? true,
      emoji_icon: icon,
      nerd_icon: component?.nerd_icon || '󰊠',
      text_icon: component?.text_icon || '$',
      icon_color: color,
      text_color: component?.text_color || 'white',
      display_mode: displayMode as 'cost' | 'tokens' | 'combined' | 'breakdown',
      show_model: showModel,
      precision,
    };

    // 确保components配置存在
    if (!this.config.components) {
      this.config.components = {
        order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
      };
    }

    this.config.components = {
      ...this.config.components,
      usage: updatedComponent,
    };

    this.hasUnsavedChanges = true;

    console.log(t('editor.usage.updated'));
    console.log('💡 提示：组件启用状态请在预设管理中配置');
    await this.waitForKeyPress();
  }

  /**
   * 获取Usage组件显示模式描述 | Get Usage Component Display Mode Description
   */
  getDisplayModeDescription(mode: string): string {
    const descriptions: Record<string, string> = {
      cost: '💰 仅显示成本 | Cost only',
      tokens: '📊 仅显示Token数量 | Tokens only',
      combined: '🔗 成本和Token组合显示 | Combined cost and tokens',
      breakdown: '📋 详细分解显示 | Detailed breakdown',
    };

    return descriptions[mode] || mode;
  }

  /**
   * 验证精度设置 | Validate Precision Settings
   */
  validatePrecision(precision: number): boolean {
    return precision >= 0 && precision <= 4 && Number.isInteger(precision);
  }

  /**
   * 获取推荐的显示模式 | Get Recommended Display Mode
   * 根据当前配置和使用场景推荐最佳显示模式
   */
  getRecommendedDisplayMode(): string {
    // 基于一些启发式规则推荐显示模式
    // 这里可以根据实际需要添加更复杂的逻辑
    return 'combined'; // 默认推荐组合模式
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
          console.log('\n👋 已退出Usage配置编辑器');
          process.exit(0);
        }

        resolve();
      };

      stdin.on('data', onData);
    });
  }
}

/**
 * 工厂函数 - 创建Usage编辑器实例 | Factory function - Create Usage editor instance
 */
export function createUsageEditor(config: Config): UsageEditor {
  return new UsageEditor(config);
}
