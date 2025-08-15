/**
 * 主题编辑器 - Theme Editor
 * 专门处理主题相关的配置功能
 *
 * 特性:
 * - 主题选择和应用
 * - 主题兼容性检查
 * - 主题预览和切换
 */

import { select } from '@inquirer/prompts';
import type { ConfigLoader } from '../../config/loader.js';
import type { Config } from '../../config/schema.js';

/**
 * 主题编辑器类
 */
export class ThemeEditor {
  constructor(
    private configLoader: ConfigLoader,
    private currentConfig: Config,
    private onConfigUpdate: (config: Config, hasChanges: boolean) => void,
    private waitForKeyPress: () => Promise<void>
  ) {}

  /**
   * 配置主题 | Configure Themes
   * 主题选择和应用功能
   */
  async configureThemes(): Promise<void> {
    const theme = await select({
      message: '选择主题：',
      choices: [
        { name: 'Classic主题 - 传统分隔符连接，最大兼容性', value: 'classic' },
        { name: 'Powerline主题 - 箭头无缝连接，需要Nerd Font', value: 'powerline' },
        { name: 'Capsule主题 - 胶囊形状包装，现代化UI，需要Nerd Font', value: 'capsule' },
        { name: '自定义主题 - 当前配置', value: 'custom' },
        { name: '← 返回主菜单', value: 'back' },
      ],
    });

    if (theme === 'back') return;

    if (theme !== 'custom') {
      await this.configLoader.applyTheme(theme);
      this.currentConfig = await this.configLoader.load();
      this.onConfigUpdate(this.currentConfig, true);
    }

    console.log(`✅ 已应用主题: ${theme}`);
    await this.waitForKeyPress();
  }
}
