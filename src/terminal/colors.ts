import type { Config } from '../config/schema.js';
import type { TerminalCapabilities } from './detector.js';

/**
 * 颜色映射接口 | Color mapping interface
 */
export interface ColorMap {
  [colorName: string]: string;
}

/**
 * 图标映射接口 | Icon mapping interface
 */
export interface IconMap {
  [iconName: string]: string;
}

/**
 * 终端颜色和图标管理器 | Terminal color and icon manager
 */
export class TerminalRenderer {
  private colors: ColorMap;
  private icons: IconMap;
  private capabilities: TerminalCapabilities;

  constructor(capabilities: TerminalCapabilities, config: Config) {
    this.capabilities = capabilities;
    this.colors = this.setupColors(config);
    this.icons = this.setupIcons(config);
  }

  /**
   * 获取颜色代码 | Get color code
   */
  public getColor(colorName: string): string {
    return this.colors[colorName] || '';
  }

  /**
   * 获取图标 | Get icon
   */
  public getIcon(iconName: string): string {
    return this.icons[iconName] || '';
  }

  /**
   * 获取重置颜色代码 | Get reset color code
   */
  public getReset(): string {
    return this.colors['reset'] || '';
  }

  /**
   * 应用颜色 | Apply color
   */
  public colorize(text: string, colorName: string): string {
    if (!text || !this.capabilities.colors) return text;
    const color = this.getColor(colorName);
    const reset = this.getReset();
    return `${color}${text}${reset}`;
  }

  /**
   * 设置颜色系统 | Setup color system
   */
  private setupColors(config: Config): ColorMap {
    // 基础ANSI颜色映射 | Basic ANSI color mapping
    const baseColors: ColorMap = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      dim: '\x1b[2m',
      black: '\x1b[30m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      gray: '\x1b[90m',
      bright_red: '\x1b[91m',
      bright_green: '\x1b[92m',
      bright_yellow: '\x1b[93m',
      bright_blue: '\x1b[94m',
      bright_magenta: '\x1b[95m',
      bright_cyan: '\x1b[96m',
      bright_white: '\x1b[97m',
    };

    // 合并自定义颜色代码 | Merge custom color codes
    const customColors = config.advanced?.custom_color_codes || {};

    // 如果不支持颜色，返回空字符串映射 | If colors not supported, return empty string mapping
    if (!this.capabilities.colors) {
      const emptyColors: ColorMap = {};
      for (const key of Object.keys({ ...baseColors, ...customColors })) {
        emptyColors[key] = '';
      }
      return emptyColors;
    }

    return { ...baseColors, ...customColors };
  }

  /**
   * 设置图标系统 | Setup icon system
   */
  private setupIcons(config: Config): IconMap {
    const components = config.components;

    // 第一层：Nerd Font图标 (Font Awesome系列) | First tier: Nerd Font icons (Font Awesome series)
    const nerdFontIcons: IconMap = {
      project: components?.project?.nerd_icon || '\uf07b', // fa-folder
      model: components?.model?.nerd_icon || '\uf085', // fa-cogs (机器/模型)
      branch: components?.branch?.nerd_icon || '\uf126', // fa-code-branch (git分支)
      token: components?.tokens?.nerd_icon || '\uf080', // fa-bar-chart
      ready: components?.status?.nerd_icons?.ready || '\uf00c', // fa-check
      thinking: components?.status?.nerd_icons?.thinking || '\uf110', // fa-spinner
      tool: components?.status?.nerd_icons?.tool || '\uf0ad', // fa-wrench
      error: components?.status?.nerd_icons?.error || '\uf00d', // fa-times
      warning: components?.status?.nerd_icons?.warning || '\uf071', // fa-exclamation-triangle
    };

    // 第二层：Emoji图标 | Second tier: Emoji icons
    const emojiIcons: IconMap = {
      project: components?.project?.icon || '📁',
      model: components?.model?.icon || '🤖',
      branch: components?.branch?.icon || '🌿',
      token: components?.tokens?.icon || '📊',
      ready: components?.status?.icons?.ready || '✅',
      thinking: components?.status?.icons?.thinking || '💭',
      tool: components?.status?.icons?.tool || '🔧',
      error: components?.status?.icons?.error || '❌',
      warning: components?.status?.icons?.warning || '⚠️',
    };

    // 第三层：文本图标 | Third tier: Text icons
    const textIcons: IconMap = {
      project: components?.project?.text_icon || '[P]',
      model: components?.model?.text_icon || '[M]',
      branch: components?.branch?.text_icon || '[B]',
      token: components?.tokens?.text_icon || '[T]',
      ready: components?.status?.text_icons?.ready || '[OK]',
      thinking: components?.status?.text_icons?.thinking || '[...]',
      tool: components?.status?.text_icons?.tool || '[TOOL]',
      error: components?.status?.text_icons?.error || '[ERR]',
      warning: components?.status?.text_icons?.warning || '[WARN]',
    };

    // 根据能力选择图标集 | Select icon set based on capabilities
    if (this.capabilities.nerdFont) {
      return nerdFontIcons;
    } else if (this.capabilities.emoji) {
      return emojiIcons;
    } else {
      return textIcons;
    }
  }

  /**
   * 获取所有颜色 | Get all colors
   */
  public getColors(): ColorMap {
    return { ...this.colors };
  }

  /**
   * 获取所有图标 | Get all icons
   */
  public getIcons(): IconMap {
    return { ...this.icons };
  }

  /**
   * 获取终端能力 | Get terminal capabilities
   */
  public getCapabilities(): TerminalCapabilities {
    return { ...this.capabilities };
  }

  /**
   * 创建格式化字符串 | Create formatted string
   */
  public format(icon: string, text: string, colorName?: string): string {
    const iconStr = this.getIcon(icon);
    const content = iconStr ? `${iconStr} ${text}` : text;
    return colorName ? this.colorize(content, colorName) : content;
  }
}

// 向后兼容的别名
export const ColorSystem = TerminalRenderer;
export const IconSystem = TerminalRenderer;
