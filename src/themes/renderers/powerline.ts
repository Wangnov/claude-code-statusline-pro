/**
 * Powerline主题渲染器 | Powerline theme renderer
 * 使用三角形箭头连接组件，创建无缝的视觉效果 | Uses triangular arrows to connect components, creating seamless visual effects
 */

import type { Config } from '../../config/schema.js';
import type { TerminalRenderer } from '../../terminal/colors.js';
import type { ThemeRenderer } from '../types.js';

/**
 * 去除ANSI颜色代码，提取纯文本 | Remove ANSI color codes, extract plain text
 */
function stripAnsiCodes(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * 将hex颜色转换为RGB值 | Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * 生成标准24位真色彩ANSI前景色序列 | Generate standard 24-bit true color ANSI foreground sequence
 */
function createTrueColorFg(color: string): string {
  if (color === 'transparent' || !color) return '';
  
  const rgb = hexToRgb(color);
  if (!rgb) {
    // 回退到基础颜色名称映射 | Fallback to basic color name mapping
    const colorMap: Record<string, string> = {
      'black': '\x1b[38;2;0;0;0m',
      'red': '\x1b[38;2;255;0;0m',
      'green': '\x1b[38;2;0;255;0m',
      'yellow': '\x1b[38;2;255;255;0m',
      'blue': '\x1b[38;2;0;0;255m',
      'magenta': '\x1b[38;2;255;0;255m',
      'cyan': '\x1b[38;2;0;255;255m',
      'white': '\x1b[38;2;255;255;255m',
    };
    return colorMap[color] || '';
  }
  
  return `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m`;
}

/**
 * 生成标准24位真色彩ANSI背景色序列 | Generate standard 24-bit true color ANSI background sequence
 */
function createTrueColorBg(color: string): string {
  if (color === 'transparent' || !color) return '';
  
  const rgb = hexToRgb(color);
  if (!rgb) {
    // 回退到基础颜色名称映射 | Fallback to basic color name mapping
    const colorMap: Record<string, string> = {
      'black': '\x1b[48;2;0;0;0m',
      'red': '\x1b[48;2;255;0;0m',
      'green': '\x1b[48;2;0;255;0m',
      'yellow': '\x1b[48;2;255;255;0m',
      'blue': '\x1b[48;2;0;0;255m',
      'magenta': '\x1b[48;2;255;0;255m',
      'cyan': '\x1b[48;2;0;255;255m',
      'white': '\x1b[48;2;255;255;255m',
    };
    return colorMap[color] || '';
  }
  
  return `\x1b[48;2;${rgb.r};${rgb.g};${rgb.b}m`;
}

/**
 * Powerline主题渲染器类 | Powerline theme renderer class
 */
export class PowerlineRenderer implements ThemeRenderer {
  private terminalRenderer: TerminalRenderer | undefined;

  // Powerline字符定义 | Powerline character definitions
  private readonly POWERLINE_SEPARATOR = '\uE0B0'; // Nerd Font向右三角箭头 | Nerd Font right triangle arrow
  private readonly POWERLINE_START = '\uE0D7'; // Nerd Font nf-ple-pixelated_squares_big_mirrored | Nerd Font nf-ple-pixelated_squares_big_mirrored
  private readonly FALLBACK_SEPARATOR = '> '; // 回退箭头字符 | Fallback arrow character
  private readonly FALLBACK_START = '🔥 '; // 回退火焰字符 | Fallback fire character

  constructor(terminalRenderer?: TerminalRenderer) {
    this.terminalRenderer = terminalRenderer ?? undefined;
  }

  /**
   * 渲染状态行 | Render statusline
   */
  renderStatusline(components: string[], colors: string[], config: Config): string {
    // 过滤空组件并准备数据 | Filter empty components and prepare data
    const validData = this.prepareComponentData(components, colors);

    if (validData.length === 0) {
      return '';
    }

    // 检查Nerd Font支持 | Check Nerd Font support
    const useNerdFont = this.shouldUseNerdFont(config);
    const separator = useNerdFont ? this.POWERLINE_SEPARATOR : this.FALLBACK_SEPARATOR;
    const startSymbol = useNerdFont ? this.POWERLINE_START : this.FALLBACK_START;

    // 检查是否启用渐变 | Check if gradient is enabled
    const enableGradient = config.themes?.powerline?.enable_gradient ?? true;

    // 渲染所有段落 | Render all segments
    const segments: string[] = [];

    // 添加开头符号段落 | Add start symbol segment
    if (this.terminalRenderer && enableGradient) {
      const firstColor = validData[0]?.color || 'blue';
      const startSegment = this.renderStartSegment(startSymbol, firstColor);
      segments.push(startSegment);
    }

    for (let i = 0; i < validData.length; i++) {
      const currentData = validData[i];
      if (!currentData) continue;

      const { content, color } = currentData;
      const nextData = i < validData.length - 1 ? validData[i + 1] : undefined;
      const nextColor = nextData?.color;

      const segment = this.renderPowerlineSegment(content, color, nextColor, separator, enableGradient);
      segments.push(segment);
    }

    return segments.join('');
  }

  /**
   * 准备组件数据 | Prepare component data
   */
  private prepareComponentData(
    components: string[],
    colors: string[]
  ): Array<{ content: string; color: string }> {
    const validData: Array<{ content: string; color: string }> = [];

    for (let i = 0; i < components.length; i++) {
      const rawContent = components[i];
      const color = colors[i] || 'blue'; // 默认颜色 | Default color

      if (rawContent?.trim()) {
        // 检查是否是有内部颜色的组件 | Check if component has internal colors
        const content = this.shouldPreserveInternalColors(rawContent.trim())
          ? rawContent.trim()  // 保留原始内容和颜色 | Preserve original content with colors
          : stripAnsiCodes(rawContent.trim()); // 去除ANSI代码用于重新着色 | Strip ANSI for re-coloring

        if (content) {
          validData.push({ content, color });
        }
      }
    }

    return validData;
  }

  /**
   * 判断组件是否应该保留内部颜色 | Determine if component should preserve internal colors
   */
  private shouldPreserveInternalColors(content: string): boolean {
    // Tokens组件包含进度条：检查是否包含进度条字符 | Tokens component with progress bar
    if (content.includes('█') || content.includes('░') || content.includes('▓')) {
      return true;
    }

    // Status组件：检查是否包含常见状态词 | Status component: check for common status words
    const statusWords = ['Ready', 'Thinking', 'Error', 'Tool', 'Complete'];
    if (statusWords.some(word => content.includes(word))) {
      return true;
    }

    return false;
  }

  /**
   * 检查是否应该使用Nerd Font | Check if should use Nerd Font
   */
  private shouldUseNerdFont(config: Config): boolean {
    // 检查配置和终端能力 | Check config and terminal capabilities
    if (config.terminal?.force_nerd_font === true) {
      return true;
    }

    if (this.terminalRenderer) {
      const capabilities = this.terminalRenderer.getCapabilities();
      return capabilities.nerdFont;
    }

    // 默认启用，除非显式禁用 | Enable by default unless explicitly disabled
    return true;
  }

  /**
   * 渲染开头段落 | Render start segment
   * 基于Oh My Posh最佳实践：第一个符号只有前景色，没有背景色
   */
  private renderStartSegment(startSymbol: string, color: string): string {
    if (!this.terminalRenderer) {
      return startSymbol;
    }

    // 基于Oh My Posh调研：第一个符号只设置前景色，背景色透明
    // Based on Oh My Posh research: first symbol only sets foreground, background transparent
    const colorInfo = this.terminalRenderer.getColors();
    const fg = createTrueColorFg(color);
    const reset = '\x1b[0m';

    // 使用不换行空格前缀 + 前景色 + 符号 + 重置，不设置背景色
    // Non-breaking space prefix + foreground + symbol + reset, no background color
    return `\u00A0${fg}${startSymbol}${reset}`;
  }

  /**
   * 渲染Powerline段落 | Render Powerline segment
   */
  private renderPowerlineSegment(
    content: string,
    bgColor: string,
    nextBgColor: string | undefined,
    separator: string,
    enableGradient: boolean = true
  ): string {
    if (!this.terminalRenderer) {
      // 没有终端渲染器时的简单渲染 | Simple rendering without terminal renderer
      return nextBgColor ? ` ${content} ${separator}` : ` ${content}`;
    }

    // 使用标准24位真色彩ANSI序列 | Use standard 24-bit true color ANSI sequences
    const bg = createTrueColorBg(bgColor);
    const fg = createTrueColorFg('white'); // 内容文字用白色
    const reset = '\x1b[0m';

    // 处理有内部颜色的内容 | Handle content with internal colors
    let processedContent = content;
    if (this.shouldPreserveInternalColors(content)) {
      // 对于有内部颜色的组件，需要在每个reset后重新应用背景色
      // For components with internal colors, need to reapply background after each reset
      processedContent = content.replace(/\x1b\[0m/g, `${reset}${bg}`);

      // 确保内容开始和结束都有正确的背景色 | Ensure content starts and ends with correct background
      if (!processedContent.startsWith(`${bg}`)) {
        processedContent = `${bg}${processedContent}`;
      }
      if (!processedContent.endsWith(`${bg}`)) {
        processedContent = `${processedContent}${bg}`;
      }
    }

    // 内容部分：背景色+处理后的内容 | Content part: bg color + processed content
    let segment = `${bg}${fg} ${processedContent} `;

    // 添加Powerline箭头分隔符 - 基于Oh My Posh颜色继承原理
    // Add Powerline arrow separator - based on Oh My Posh color inheritance principle
    if (nextBgColor) {
      // 中间分隔符：当前背景色作为箭头前景色，下一个背景色作为箭头背景色
      // Middle separator: current bg as arrow fg, next bg as arrow bg
      const arrowFg = createTrueColorFg(bgColor);
      const arrowBg = createTrueColorBg(nextBgColor);
      segment += `${reset}${arrowBg}${arrowFg}${separator}`;
    } else {
      // 最后分隔符：当前背景色作为箭头前景色，透明背景
      // Last separator: current bg as arrow fg, transparent background
      const arrowFg = createTrueColorFg(bgColor);
      segment += `${reset}${arrowFg}${separator}${reset}`;
    }

    return segment;
  }

  /**
   * 设置终端渲染器 | Set terminal renderer
   */
  setTerminalRenderer(renderer: TerminalRenderer): void {
    this.terminalRenderer = renderer;
  }

  /**
   * 获取主题特性 | Get theme features
   */
  getThemeFeatures(): {
    requiresNerdFont: boolean;
    requiresColors: boolean;
    supportsGradient: boolean;
    customSeparators: boolean;
  } {
    return {
      requiresNerdFont: true, // Powerline最好需要Nerd Font | Powerline works best with Nerd Font
      requiresColors: true, // 需要颜色支持 | Requires color support
      supportsGradient: true, // 支持渐变效果 | Supports gradient effects
      customSeparators: true, // 使用自定义分隔符 | Uses custom separators
    };
  }

  /**
   * 验证组件兼容性 | Validate component compatibility
   */
  validateComponentCompatibility(components: string[]): {
    compatible: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // 检查组件数量 | Check component count
    if (components.length > 6) {
      warnings.push(
        'Powerline主题建议不超过6个组件以保持视觉整洁 | Powerline theme recommends no more than 6 components for visual clarity'
      );
    }

    // 检查组件长度 | Check component length
    const longComponents = components.filter((c) => c.length > 20);
    if (longComponents.length > 0) {
      warnings.push(
        '某些组件内容过长，可能影响Powerline视觉效果 | Some components are too long, may affect Powerline visual effects'
      );
    }

    return {
      compatible: true,
      warnings,
    };
  }

  /**
   * 获取推荐的组件颜色方案 | Get recommended component color scheme
   */
  getRecommendedColorScheme(): Record<string, string> {
    return {
      project: 'blue',
      model: 'cyan',
      branch: 'green',
      tokens: 'yellow',
      status: 'magenta',
    };
  }
}
