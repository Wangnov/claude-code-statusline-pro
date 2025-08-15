/**
 * CLI消息图标管理器 | CLI message icon manager
 * 复用终端检测机制，为CLI消息提供三层回退图标系统
 * 支持国际化系统集成，提供多语言消息格式化功能
 *
 * @author wangnov
 * @date 2025-08-12T20:30:20+08:00
 * @updated 2025-08-15 - 添加国际化支持
 */

import type { TerminalCapabilities } from '../terminal/detector.js';
import { detect } from '../terminal/detector.js';
import type { I18nManager, TranslationParams } from './i18n.js';

/**
 * CLI消息图标映射接口 | CLI message icon mapping interface
 */
export interface CliIconMap {
  [iconName: string]: string;
}

/**
 * CLI消息图标管理器构造选项 | CLI message icon manager constructor options
 */
export interface CliMessageIconOptions {
  enableColors?: boolean | 'auto';
  enableEmoji?: boolean | 'auto';
  enableNerdFont?: boolean | 'auto';
  forceNerdFont?: boolean;
  /** 可选的国际化管理器实例 | Optional i18n manager instance */
  i18nManager?: I18nManager;
}

/**
 * CLI消息图标管理器 | CLI message icon manager
 * 为CLI界面提供统一的图标管理，支持三层回退和国际化
 */
export class CliMessageIconManager {
  private capabilities: TerminalCapabilities;
  private icons: CliIconMap;
  private i18nManager?: I18nManager;

  constructor(options: CliMessageIconOptions = {}) {
    if (options.i18nManager) {
      this.i18nManager = options.i18nManager;
    }

    this.capabilities = detect(
      options.enableColors,
      options.enableEmoji,
      options.enableNerdFont,
      options.forceNerdFont || false
    );
    this.icons = this.setupCliIcons();

    // 如果有i18n支持且启用调试模式，输出终端检测信息
    if (this.i18nManager && process.env.CLAUDE_CODE_DEBUG === 'true') {
      this.logTerminalCapabilities();
    }
  }

  /**
   * 获取图标 | Get icon
   */
  public getIcon(iconName: string): string {
    return this.icons[iconName] || '';
  }

  /**
   * 获取本地化的图标描述 | Get localized icon description
   */
  public getLocalizedIconDescription(iconName: string): string {
    if (!this.i18nManager) {
      return iconName; // 回退到图标名称
    }

    // 尝试获取图标描述的翻译
    const descriptionKey = this.getIconDescriptionKey(iconName);
    if (descriptionKey) {
      return this.i18nManager.t(descriptionKey);
    }

    return iconName;
  }

  /**
   * 格式化本地化消息 | Format localized message
   */
  public formatLocalizedMessage(messageKey: string, params?: TranslationParams): string {
    if (!this.i18nManager) {
      return messageKey; // 回退到消息键本身
    }

    try {
      return this.i18nManager.t(messageKey, params);
    } catch (_error) {
      // 翻译失败时回退到英文默认值或消息键
      return messageKey;
    }
  }

  /**
   * 设置CLI图标系统 | Setup CLI icon system
   */
  private setupCliIcons(): CliIconMap {
    // 第一层：Nerd Font图标 (Font Awesome系列) | First tier: Nerd Font icons
    const nerdFontIcons: CliIconMap = {
      // 状态图标 | Status icons
      success: '\uf00c', // fa-check
      error: '\uf00d', // fa-times
      warning: '\uf071', // fa-exclamation-triangle
      info: '\uf05a', // fa-info-circle

      // 功能图标 | Function icons
      config: '\uf013', // fa-cog
      file: '\uf15b', // fa-file-o
      folder: '\uf07b', // fa-folder
      theme: '\uf0c7', // fa-floppy-o
      edit: '\uf044', // fa-edit
      validate: '\uf058', // fa-check-circle
      reset: '\uf0e2', // fa-undo

      // 诊断图标 | Diagnostic icons
      doctor: '\uf0f8', // fa-stethoscope
      platform: '\uf109', // fa-desktop
      terminal: '\uf120', // fa-terminal

      // 交互图标 | Interactive icons
      goodbye: '\uf164', // fa-thumbs-up
      prompt: '\uf059', // fa-question-circle
    };

    // 第二层：Emoji图标 | Second tier: Emoji icons
    const emojiIcons: CliIconMap = {
      // 状态图标 | Status icons
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',

      // 功能图标 | Function icons
      config: '⚙️',
      file: '📄',
      folder: '📁',
      theme: '🎨',
      edit: '✏️',
      validate: '🔍',
      reset: '🔄',

      // 诊断图标 | Diagnostic icons
      doctor: '🔍',
      platform: '💻',
      terminal: '📟',

      // 交互图标 | Interactive icons
      goodbye: '👋',
      prompt: '❓',
    };

    // 第三层：文本图标 | Third tier: Text icons
    const textIcons: CliIconMap = {
      // 状态图标 | Status icons
      success: '[OK]',
      error: '[ERR]',
      warning: '[WARN]',
      info: '[INFO]',

      // 功能图标 | Function icons
      config: '[CFG]',
      file: '[FILE]',
      folder: '[DIR]',
      theme: '[THEME]',
      edit: '[EDIT]',
      validate: '[CHECK]',
      reset: '[RESET]',

      // 诊断图标 | Diagnostic icons
      doctor: '[DIAG]',
      platform: '[PLAT]',
      terminal: '[TERM]',

      // 交互图标 | Interactive icons
      goodbye: '[BYE]',
      prompt: '[?]',
    };

    // 根据终端能力选择图标集 | Select icon set based on capabilities
    if (this.capabilities.nerdFont) {
      return nerdFontIcons;
    } else if (this.capabilities.emoji) {
      return emojiIcons;
    } else {
      return textIcons;
    }
  }

  /**
   * 格式化消息与图标 | Format message with icon
   * 支持翻译键和直接文本消息
   */
  public format(iconName: string, message: string, params?: TranslationParams): string {
    const icon = this.getIcon(iconName);

    // 尝试作为翻译键处理，如果失败则作为直接文本处理
    let processedMessage = message;
    if (this.i18nManager && message.includes('.')) {
      // 如果消息包含点号，尝试作为翻译键处理
      try {
        const translated = this.i18nManager.t(message, params);
        if (translated !== message) {
          processedMessage = translated;
        }
      } catch {
        // 翻译失败，保持原消息
      }
    }

    return icon ? `${icon} ${processedMessage}` : processedMessage;
  }

  /**
   * 获取终端能力信息 | Get terminal capabilities
   */
  public getCapabilities(): TerminalCapabilities {
    return { ...this.capabilities };
  }

  /**
   * 强制刷新终端检测 | Force refresh terminal detection
   */
  public refresh(options: CliMessageIconOptions = {}): void {
    this.capabilities = detect(
      options.enableColors,
      options.enableEmoji,
      options.enableNerdFont,
      options.forceNerdFont || false
    );
    this.icons = this.setupCliIcons();
  }

  /**
   * 记录终端能力检测信息 | Log terminal capabilities detection info
   */
  private logTerminalCapabilities(): void {
    if (!this.i18nManager) return;

    console.log(this.i18nManager.t('icons.system.terminalDetection'));

    // 颜色支持
    const colorsMessage = this.capabilities.colors
      ? this.i18nManager.t('icons.system.colorsDetected')
      : this.i18nManager.t('icons.system.colorsNotDetected');
    console.log(`   ${this.capabilities.colors ? '✅' : '❌'} ${colorsMessage}`);

    // Emoji支持
    const emojiMessage = this.capabilities.emoji
      ? this.i18nManager.t('icons.system.emojiDetected')
      : this.i18nManager.t('icons.system.emojiNotDetected');
    console.log(`   ${this.capabilities.emoji ? '✅' : '❌'} ${emojiMessage}`);

    // Nerd Font支持
    const nerdFontMessage = this.capabilities.nerdFont
      ? this.i18nManager.t('icons.system.nerdFontDetected')
      : this.i18nManager.t('icons.system.nerdFontNotDetected');
    console.log(`   ${this.capabilities.nerdFont ? '✅' : '❌'} ${nerdFontMessage}`);

    // 使用的图标集
    const iconSetName = this.capabilities.nerdFont
      ? 'Nerd Font'
      : this.capabilities.emoji
        ? 'Emoji'
        : 'Text';
    console.log(`   ${this.i18nManager.t('icons.system.usingIconSet', { iconSet: iconSetName })}`);
    console.log();
  }

  /**
   * 获取图标描述翻译键 | Get icon description translation key
   */
  private getIconDescriptionKey(iconName: string): string | null {
    // 状态图标
    if (['success', 'error', 'warning', 'info'].includes(iconName)) {
      return `icons.types.status.${iconName}`;
    }

    // 功能图标
    if (['config', 'file', 'folder', 'theme', 'edit', 'validate', 'reset'].includes(iconName)) {
      return `icons.types.function.${iconName}`;
    }

    // 诊断图标
    if (['doctor', 'platform', 'terminal'].includes(iconName)) {
      return `icons.types.diagnostic.${iconName}`;
    }

    // 交互图标
    if (['goodbye', 'prompt'].includes(iconName)) {
      return `icons.types.interactive.${iconName}`;
    }

    return null;
  }
}

/**
 * 全局CLI图标管理器实例 | Global CLI icon manager instance
 */
let globalCliIconManager: CliMessageIconManager | null = null;

/**
 * 获取全局CLI图标管理器 | Get global CLI icon manager
 */
export function getCliIconManager(i18nManager?: I18nManager): CliMessageIconManager {
  if (!globalCliIconManager) {
    const options: CliMessageIconOptions = {};
    if (i18nManager) {
      options.i18nManager = i18nManager;
    }
    globalCliIconManager = new CliMessageIconManager(options);
  }
  return globalCliIconManager;
}

/**
 * 初始化全局CLI图标管理器 | Initialize global CLI icon manager
 * 用于手动设置i18n支持或重新初始化
 */
export function initializeCliIconManager(options?: CliMessageIconOptions): void {
  globalCliIconManager = new CliMessageIconManager(options);
}

/**
 * 便捷函数：格式化CLI消息 | Convenience function: format CLI message
 * 支持翻译键和参数插值，完全向后兼容
 */
export function formatCliMessage(
  iconName: string,
  message: string,
  params?: TranslationParams
): string {
  return getCliIconManager().format(iconName, message, params);
}

/**
 * 便捷函数：格式化本地化CLI消息 | Convenience function: format localized CLI message
 * 专门用于翻译键的消息格式化
 */
export function formatLocalizedCliMessage(
  iconName: string,
  messageKey: string,
  params?: TranslationParams
): string {
  const manager = getCliIconManager();
  const localizedMessage = manager.formatLocalizedMessage(messageKey, params);
  return manager.format(iconName, localizedMessage);
}

/**
 * 便捷函数：获取CLI图标 | Convenience function: get CLI icon
 */
export function getCliIcon(iconName: string): string {
  return getCliIconManager().getIcon(iconName);
}

/**
 * 便捷函数：获取CLI图标描述 | Convenience function: get CLI icon description
 */
export function getCliIconDescription(iconName: string): string {
  return getCliIconManager().getLocalizedIconDescription(iconName);
}
