import supportsColor from 'supports-color';
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
 * 双色方案接口 | Dual color scheme interface
 */
export interface DualColorScheme {
  fg: string;
  bg: string;
}

/**
 * 颜色方案映射接口 | Color scheme mapping interface
 */
export interface ColorSchemeMap {
  [colorName: string]: DualColorScheme;
}

/**
 * 终端颜色和图标管理器 | Terminal color and icon manager
 */
export class TerminalRenderer {
  private colors: ColorMap;
  private icons: IconMap;
  private capabilities: TerminalCapabilities;
  private colorSchemes: ColorSchemeMap;
  private supportsTrueColor: boolean;

  constructor(capabilities: TerminalCapabilities, config: Config) {
    this.capabilities = capabilities;
    this.supportsTrueColor = this.detectTrueColorSupport();
    this.colorSchemes = this.setupColorSchemes();
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
    return this.colors.reset || '';
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
   * 检测终端24位真彩色支持 | Detect terminal 24-bit true color support
   */
  private detectTrueColorSupport(): boolean {
    // 使用 supports-color 库检测终端颜色支持
    const colorSupport = supportsColor.stdout;

    // 检查是否支持16777216色（24位真彩色）
    if (
      colorSupport &&
      typeof colorSupport === 'object' &&
      'has16m' in colorSupport &&
      colorSupport.has16m
    ) {
      return true;
    }

    // 检查环境变量手动覆盖
    const colorterm = process.env.COLORTERM;
    if (colorterm === 'truecolor' || colorterm === '24bit') {
      return true;
    }

    // 检查 TERM 环境变量
    const term = process.env.TERM;
    if (term && (term.includes('256color') || term.includes('truecolor'))) {
      return true;
    }

    return false;
  }

  /**
   * 设置颜色方案系统 | Setup color scheme system
   */
  private setupColorSchemes(): ColorSchemeMap {
    if (this.supportsTrueColor) {
      // 24位真彩色方案（优先使用）| 24-bit true color scheme (priority)
      return {
        red: {
          fg: '\x1b[38;2;191;97;106m',
          bg: '\x1b[48;2;191;97;106m',
        },
        green: {
          fg: '\x1b[38;2;163;190;140m',
          bg: '\x1b[48;2;163;190;140m',
        },
        yellow: {
          fg: '\x1b[38;2;235;203;139m',
          bg: '\x1b[48;2;235;203;139m',
        },
        blue: {
          fg: '\x1b[38;2;129;161;193m',
          bg: '\x1b[48;2;129;161;193m',
        },
        magenta: {
          fg: '\x1b[38;2;180;142;173m',
          bg: '\x1b[48;2;180;142;173m',
        },
        cyan: {
          fg: '\x1b[38;2;136;192;208m',
          bg: '\x1b[48;2;136;192;208m',
        },
        white: {
          fg: '\x1b[38;2;255;255;255m',
          bg: '\x1b[48;2;255;255;255m',
        },
        black: {
          fg: '\x1b[38;2;0;0;0m',
          bg: '\x1b[48;2;0;0;0m',
        },
      };
    } else {
      // 4位兼容色方案（回退使用）| 4-bit compatible color scheme (fallback)
      return {
        red: {
          fg: '\x1b[91m',
          bg: '\x1b[101m',
        },
        green: {
          fg: '\x1b[92m',
          bg: '\x1b[102m',
        },
        yellow: {
          fg: '\x1b[93m',
          bg: '\x1b[103m',
        },
        blue: {
          fg: '\x1b[94m',
          bg: '\x1b[104m',
        },
        magenta: {
          fg: '\x1b[95m',
          bg: '\x1b[105m',
        },
        cyan: {
          fg: '\x1b[96m',
          bg: '\x1b[106m',
        },
        white: {
          fg: '\x1b[97m',
          bg: '\x1b[107m',
        },
        black: {
          fg: '\x1b[30m',
          bg: '\x1b[40m',
        },
      };
    }
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
      branch: components?.branch?.nerd_icon || '\ue702', // nf-dev-git (git分支)
      token: components?.tokens?.nerd_icon || '\uf080', // fa-bar-chart
      ready: components?.status?.icons?.nerd?.ready || '\uf00c', // fa-check
      thinking: components?.status?.icons?.nerd?.thinking || '\uf110', // fa-spinner
      tool: components?.status?.icons?.nerd?.tool || '\uf0ad', // fa-wrench
      error: components?.status?.icons?.nerd?.error || '\uf00d', // fa-times
      warning: components?.status?.icons?.nerd?.warning || '\uf071', // fa-exclamation-triangle
    };

    // 第二层：Emoji图标 | Second tier: Emoji icons
    const emojiIcons: IconMap = {
      project: components?.project?.emoji_icon || '📁',
      model: components?.model?.emoji_icon || '🤖',
      branch: components?.branch?.emoji_icon || '🌿',
      token: components?.tokens?.emoji_icon || '📊',
      ready: components?.status?.icons?.emoji?.ready || '✅',
      thinking: components?.status?.icons?.emoji?.thinking || '💭',
      tool: components?.status?.icons?.emoji?.tool || '🔧',
      error: components?.status?.icons?.emoji?.error || '❌',
      warning: components?.status?.icons?.emoji?.warning || '⚠️',
    };

    // 第三层：文本图标 | Third tier: Text icons
    const textIcons: IconMap = {
      project: components?.project?.text_icon || '[P]',
      model: components?.model?.text_icon || '[M]',
      branch: components?.branch?.text_icon || '[B]',
      token: components?.tokens?.text_icon || '[T]',
      ready: components?.status?.icons?.text?.ready || '[OK]',
      thinking: components?.status?.icons?.text?.thinking || '[...]',
      tool: components?.status?.icons?.text?.tool || '[TOOL]',
      error: components?.status?.icons?.text?.error || '[ERR]',
      warning: components?.status?.icons?.text?.warning || '[WARN]',
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
   * 获取前景色代码 | Get foreground color code
   */
  public getForegroundColor(colorName: string): string {
    if (!this.capabilities.colors) return '';

    // 优先使用新的颜色方案系统 | Priority use of new color scheme system
    const scheme = this.colorSchemes[colorName];
    if (scheme) {
      return scheme.fg;
    }

    // 回退到原有系统 | Fallback to original system
    return this.getColor(colorName);
  }

  /**
   * 获取背景色代码 | Get background color code
   */
  public getBackgroundColor(colorName: string): string {
    if (!this.capabilities.colors) return '';

    // 优先使用新的颜色方案系统 | Priority use of new color scheme system
    const scheme = this.colorSchemes[colorName];
    if (scheme) {
      return scheme.bg;
    }

    // 回退到原有系统 | Fallback to original system
    const foregroundColor = this.getColor(colorName);
    if (!foregroundColor) return '';

    // 将前景色转换为背景色 | Convert foreground color to background color
    // 前景色范围：30-37 (标准), 90-97 (明亮)
    // 背景色范围：40-47 (标准), 100-107 (明亮)
    const escapeChar = String.fromCharCode(0x1b);
    return foregroundColor
      .replace(new RegExp(`${escapeChar}\\[3([0-7])m`, 'g'), `${escapeChar}[4$1m`) // 30-37 -> 40-47
      .replace(new RegExp(`${escapeChar}\\[9([0-7])m`, 'g'), `${escapeChar}[10$1m`); // 90-97 -> 100-107
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

  /**
   * 获取终端颜色支持信息 | Get terminal color support information
   */
  public getTrueColorSupport(): boolean {
    return this.supportsTrueColor;
  }

  /**
   * 获取颜色方案 | Get color schemes
   */
  public getColorSchemes(): ColorSchemeMap {
    return { ...this.colorSchemes };
  }

  /**
   * 调试方法：获取颜色检测详情 | Debug method: get color detection details
   */
  public getColorDetectionDetails(): {
    supportsTrueColor: boolean;
    supportsColorLibrary: unknown;
    colorterm: string | undefined;
    term: string | undefined;
  } {
    return {
      supportsTrueColor: this.supportsTrueColor,
      supportsColorLibrary: supportsColor.stdout,
      colorterm: process.env.COLORTERM,
      term: process.env.TERM,
    };
  }
}

// 向后兼容的别名
export const ColorSystem = TerminalRenderer;
export const IconSystem = TerminalRenderer;
