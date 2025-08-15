/**
 * 样式编辑器 - Style Editor
 * 专门处理样式和语言相关的配置功能
 *
 * 特性:
 * - 样式配置 (颜色、分隔符、终端能力)
 * - 语言设置配置
 * - 终端兼容性配置
 */

import { confirm, input, select } from '@inquirer/prompts';
import type { Config } from '../../config/schema.js';
import { getCurrentLanguage, setLanguage, t } from '../i18n.js';

/**
 * 样式编辑器类
 */
export class StyleEditor {
  constructor(
    private currentConfig: Config,
    private onConfigUpdate: (config: Config, hasChanges: boolean) => void,
    private waitForKeyPress: () => Promise<void>
  ) {}

  /**
   * 配置样式 | Configure Styles
   * 颜色、分隔符、终端能力配置
   */
  async configureStyles(): Promise<void> {
    const style = this.currentConfig.style;

    const enableColors = await confirm({
      message: '启用颜色？',
      default: style?.enable_colors === true,
    });

    const enableEmoji = await confirm({
      message: '强制启用表情符号？',
      default: this.currentConfig.terminal?.force_emoji === true,
    });

    const enableNerdFont = await confirm({
      message: '强制启用 Nerd Font 图标？',
      default: this.currentConfig.terminal?.force_nerd_font === true,
    });

    const separator = await input({
      message: '组件分隔符：',
      default: style?.separator || ' | ',
    });

    // 更新配置
    this.currentConfig.style = {
      separator,
      enable_colors: enableColors,
      enable_emoji: style?.enable_emoji || 'auto',
      enable_nerd_font: style?.enable_nerd_font || 'auto',
      separator_color: 'white',
      separator_before: ' ',
      separator_after: ' ',
      compact_mode: style?.compact_mode || false,
      max_width: style?.max_width || 0,
    };

    // 更新terminal配置
    if (!this.currentConfig.terminal) {
      this.currentConfig.terminal = {
        force_nerd_font: false,
        force_emoji: false,
        force_text: false,
      };
    }
    this.currentConfig.terminal = {
      ...this.currentConfig.terminal,
      force_emoji: enableEmoji,
      force_nerd_font: enableNerdFont,
      force_text: false, // 保持默认值
    };

    this.onConfigUpdate(this.currentConfig, true);

    console.log('✅ 样式设置已更新！');
    await this.waitForKeyPress();
  }

  /**
   * 配置语言设置 | Configure Language Settings
   */
  async configureLanguage(): Promise<void> {
    const currentLang = getCurrentLanguage();

    console.log(`\n${t('editor.language.title')}`);

    // 显示当前语言设置 | Display current language setting
    const currentLangDisplay = currentLang === 'zh' ? '简体中文 (zh)' : 'English (en)';
    console.log(`${t('editor.language.current')}: ${currentLangDisplay}`);
    console.log();

    // 语言选择界面 | Language selection interface
    const selectedLang = await select({
      message: t('editor.language.select'),
      choices: [
        {
          name: '简体中文 (zh) - Chinese Simplified',
          value: 'zh',
          description: '使用中文界面 | Use Chinese interface',
        },
        {
          name: 'English (en) - English',
          value: 'en',
          description: 'Use English interface | 使用英文界面',
        },
        {
          name: t('editor.components.items.back'),
          value: 'back',
        },
      ],
      default: currentLang,
    });

    if (selectedLang === 'back') return;

    // 如果语言有变化，应用新语言设置 | Apply new language setting if changed
    if (selectedLang !== currentLang) {
      try {
        // 设置新语言 | Set new language
        await setLanguage(selectedLang as 'zh' | 'en');

        // 更新配置对象中的语言设置 | Update language setting in config object
        this.currentConfig.language = selectedLang as 'zh' | 'en';
        this.onConfigUpdate(this.currentConfig, true);

        // 显示成功消息 | Display success message
        const newLangDisplay = selectedLang === 'zh' ? '简体中文' : 'English';
        console.log(`${t('editor.language.updated')}: ${newLangDisplay}`);
        console.log(`${t('editor.language.immediate')}`);
      } catch (error) {
        console.error(`${t('editor.language.failed')}:`, error);
      }
    } else {
      console.log(t('editor.language.noChange'));
    }

    await this.waitForKeyPress();
  }
}
