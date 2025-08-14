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
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI色彩码需要控制字符匹配
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * 将hex颜色转换为RGB值 | Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result?.[1] && result[2] && result[3]
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * 生成标准24位真色彩ANSI前景色序列 | Generate standard 24-bit true color ANSI foreground sequence
 */
function _createTrueColorFg(color: string): string {
  if (color === 'transparent' || !color) return '';

  const rgb = hexToRgb(color);
  if (!rgb) {
    // 使用与之前一致的柔和颜色映射 | Use consistent soft color mapping as before
    const colorMap: Record<string, string> = {
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
    return colorMap[color] || '';
  }

  return `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m`;
}

/**
 * 生成标准24位真色彩ANSI背景色序列 | Generate standard 24-bit true color ANSI background sequence
 */
function _createTrueColorBg(color: string): string {
  if (color === 'transparent' || !color) return '';

  const rgb = hexToRgb(color);
  if (!rgb) {
    // 恢复原来的ANSI颜色映射 | Restore original ANSI color mapping
    const colorMap: Record<string, string> = {
      black: '\x1b[40m',
      red: '\x1b[41m',
      green: '\x1b[42m',
      yellow: '\x1b[43m',
      blue: '\x1b[44m',
      magenta: '\x1b[45m',
      cyan: '\x1b[46m',
      white: '\x1b[47m',
      gray: '\x1b[100m',
      bright_red: '\x1b[101m',
      bright_green: '\x1b[102m',
      bright_yellow: '\x1b[103m',
      bright_blue: '\x1b[104m',
      bright_magenta: '\x1b[105m',
      bright_cyan: '\x1b[106m',
      bright_white: '\x1b[107m',
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
  private readonly POWERLINE_START = '\uE0D7'; // Nerd Font powerline开头反三角 | Nerd Font powerline leading reverse triangle
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
    const _startSymbol = useNerdFont ? this.POWERLINE_START : this.FALLBACK_START;

    // 检查是否启用渐变 | Check if gradient is enabled
    const enableGradient = config.themes?.powerline?.enable_gradient ?? true;

    // 检查是否有fake组件 | Check if there's a fake component
    const _hasFakeComponent = validData.length > 0 && validData[0]?.color === 'transparent';

    // 渲染所有段落 | Render all segments
    const segments: string[] = [];
    let isFirstRealComponent = true; // 标记是否为第一个真实组件

    for (let i = 0; i < validData.length; i++) {
      const currentData = validData[i];
      if (!currentData) continue;

      const { content, color } = currentData;
      const nextData = i < validData.length - 1 ? validData[i + 1] : undefined;
      const nextColor = nextData?.color;

      // 如果是fake组件，直接渲染并跳过
      if (color === 'transparent') {
        segments.push(content);
        continue;
      }

      const segment = this.renderPowerlineSegment(
        content,
        color,
        nextColor,
        separator,
        enableGradient,
        isFirstRealComponent && useNerdFont // 传递是否需要起始字符
      );
      segments.push(segment);

      // 第一个真实组件处理完毕，后续组件不再是第一个
      isFirstRealComponent = false;
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
    let colorIndex = 0; // 独立的颜色索引，跳过fake组件

    for (let i = 0; i < components.length; i++) {
      const rawContent = components[i];

      if (rawContent?.trim()) {
        // 检测fake组件 - 包含单独的powerline字符且被黑色包围
        const isFakeComponent = this.isFakeComponent(rawContent.trim());

        if (isFakeComponent) {
          // fake组件：直接输出原始内容，不参与主题渲染，不占用颜色
          validData.push({ content: rawContent.trim(), color: 'transparent' });
          continue;
        }

        // 正常组件：使用颜色索引
        const color = colors[colorIndex] || 'blue'; // 默认颜色 | Default color
        colorIndex++; // 递增颜色索引

        // 检查是否是有内部颜色的组件 | Check if component has internal colors
        const content = this.shouldPreserveInternalColors(rawContent.trim())
          ? rawContent.trim() // 保留原始内容和颜色 | Preserve original content with colors
          : stripAnsiCodes(rawContent.trim()); // 去除ANSI代码用于重新着色 | Strip ANSI for re-coloring

        if (content) {
          validData.push({ content, color });
        }
      }
    }

    return validData;
  }

  /**
   * 检测是否是fake组件 | Detect if it's a fake component
   */
  private isFakeComponent(content: string): boolean {
    // 检测包含私有Unicode字符且被黑色ANSI代码包围的fake组件
    return content.includes('\uEC03') && content.includes('\x1b[30m');
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
    if (statusWords.some((word) => content.includes(word))) {
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
   * 渲染Powerline段落 | Render Powerline segment
   */
  private renderPowerlineSegment(
    content: string,
    bgColor: string,
    nextBgColor: string | undefined,
    separator: string,
    _enableGradient: boolean = true,
    needsStartSymbol: boolean = false
  ): string {
    // 特殊处理fake组件 - 直接返回原始内容，不添加powerline装饰
    if (bgColor === 'transparent') {
      return content; // 直接返回原始fake组件内容
    }

    if (!this.terminalRenderer) {
      // 没有终端渲染器时的简单渲染 | Simple rendering without terminal renderer
      return nextBgColor ? ` ${content} ${separator}` : ` ${content}`;
    }

    // 获取颜色代码，新系统确保前景色和背景色完全匹配 | Get color codes, new system ensures fg and bg colors match perfectly
    const reset = this.terminalRenderer.getReset();
    const bg = this.terminalRenderer.getBackgroundColor(bgColor);
    const fg = this.terminalRenderer.getForegroundColor('white');

    // 关键修复：起始字符的前景色必须与第一个组件的背景色完全匹配 | Key fix: start symbol foreground must perfectly match first component background
    let segment = '';
    if (needsStartSymbol) {
      // 使用新的颜色方案系统，确保E0D7前景色与组件背景色精确匹配
      // Use new color scheme system to ensure E0D7 foreground exactly matches component background
      const startFg = this.terminalRenderer.getForegroundColor(bgColor);

      // 调试信息：可选择性启用
      if (process.env.DEBUG_POWERLINE_COLORS) {
        console.error(`[PowerlineRenderer] Start symbol color debug:
  bgColor: ${bgColor}
  startFg: ${JSON.stringify(startFg)}
  bg: ${JSON.stringify(bg)}
  True color support: ${this.terminalRenderer.getTrueColorSupport()}
  Color detection: ${JSON.stringify(this.terminalRenderer.getColorDetectionDetails())}`);
      }

      segment += `${startFg}${this.POWERLINE_START}${reset}`;
    }

    // 处理有内部颜色的内容 | Handle content with internal colors
    let processedContent = content;
    if (this.shouldPreserveInternalColors(content)) {
      // 对于有内部颜色的组件，需要在每个reset后重新应用背景色
      // For components with internal colors, need to reapply background after each reset
      // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI reset序列需要控制字符匹配
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
    segment += `${bg}${fg} ${processedContent} `;

    // 添加Powerline箭头分隔符 - 使用新的颜色方案系统确保完美匹配
    // Add Powerline arrow separator - use new color scheme system for perfect matching
    if (nextBgColor) {
      // 中间分隔符：使用新颜色系统确保颜色精确匹配
      // Middle separator: use new color system for precise color matching
      const arrowFg = this.terminalRenderer.getForegroundColor(bgColor);
      const arrowBg = this.terminalRenderer.getBackgroundColor(nextBgColor);
      segment += `${reset}${arrowBg}${arrowFg}${separator}`;
    } else {
      // 最后分隔符：使用新颜色系统确保颜色精确匹配
      // Last separator: use new color system for precise color matching
      const arrowFg = this.terminalRenderer.getForegroundColor(bgColor);
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
