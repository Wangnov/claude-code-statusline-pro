/**
 * CLI消息图标管理器 | CLI message icon manager
 * 复用终端检测机制，为CLI消息提供三层回退图标系统
 *
 * @author wangnov
 * @date 2025-08-12T20:30:20+08:00
 */

import type { TerminalCapabilities } from '../terminal/detector.js';
import { detect } from '../terminal/detector.js';

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
}

/**
 * CLI消息图标管理器 | CLI message icon manager
 * 为CLI界面提供统一的图标管理，支持三层回退
 */
export class CliMessageIconManager {
  private capabilities: TerminalCapabilities;
  private icons: CliIconMap;

  constructor(options: CliMessageIconOptions = {}) {
    this.capabilities = detect(
      options.enableColors,
      options.enableEmoji,
      options.enableNerdFont,
      options.forceNerdFont || false
    );
    this.icons = this.setupCliIcons();
  }

  /**
   * 获取图标 | Get icon
   */
  public getIcon(iconName: string): string {
    return this.icons[iconName] || '';
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
   */
  public format(iconName: string, message: string): string {
    const icon = this.getIcon(iconName);
    return icon ? `${icon} ${message}` : message;
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
}

/**
 * 全局CLI图标管理器实例 | Global CLI icon manager instance
 */
let globalCliIconManager: CliMessageIconManager | null = null;

/**
 * 获取全局CLI图标管理器 | Get global CLI icon manager
 */
export function getCliIconManager(): CliMessageIconManager {
  if (!globalCliIconManager) {
    globalCliIconManager = new CliMessageIconManager();
  }
  return globalCliIconManager;
}

/**
 * 便捷函数：格式化CLI消息 | Convenience function: format CLI message
 */
export function formatCliMessage(iconName: string, message: string): string {
  return getCliIconManager().format(iconName, message);
}

/**
 * 便捷函数：获取CLI图标 | Convenience function: get CLI icon
 */
export function getCliIcon(iconName: string): string {
  return getCliIconManager().getIcon(iconName);
}
