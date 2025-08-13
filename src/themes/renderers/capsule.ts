/**
 * Capsule主题渲染器 | Capsule theme renderer
 * 使用胶囊形状包装组件，创建现代化的UI效果 | Uses capsule shapes to wrap components, creating modern UI effects
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
 * Capsule主题渲染器类 | Capsule theme renderer class
 */
export class CapsuleRenderer implements ThemeRenderer {
  private terminalRenderer: TerminalRenderer | undefined;

  // 胶囊字符定义 | Capsule character definitions
  private readonly CAPSULE_CHARS = {
    // Nerd Font半圆字符 | Nerd Font semicircle characters
    leftSemicircle: '\uE0B6',  // 左半圆 | Left semicircle
    rightSemicircle: '\uE0B4', // 右半圆 | Right semicircle

    // 圆角字符 | Rounded characters
    leftRounded: '(',
    rightRounded: ')',

    // 方角字符 | Square characters
    leftSquare: '[',
    rightSquare: ']',

    // 回退字符 | Fallback characters
    fallbackLeft: '(',
    fallbackRight: ')',
  };

  constructor(terminalRenderer?: TerminalRenderer) {
    this.terminalRenderer = terminalRenderer;
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

    // 获取胶囊样式配置 | Get capsule style configuration
    const capsuleStyle = this.getCapsuleStyle(config);

    // 检查是否启用渐变 | Check if gradient is enabled
    const enableGradient = config.themes?.capsule?.enable_gradient ?? true;

    // 渲染所有胶囊 | Render all capsules
    const capsules: string[] = [];

    for (let i = 0; i < validData.length; i++) {
      const item = validData[i];
      if (!item) continue;

      const { content, color } = item;
      const isFirst = i === 0;
      const capsule = this.renderCapsuleSegment(content, color, capsuleStyle, enableGradient, isFirst);
      capsules.push(capsule);
    }

    // 使用空格分隔胶囊 | Separate capsules with spaces
    return capsules.join(' ');
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
      const color = colors[i] || 'bright_blue'; // Capsule主题默认使用亮色 | Capsule theme defaults to bright colors

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
   * 获取胶囊样式配置 | Get capsule style configuration
   */
  private getCapsuleStyle(config: Config): {
    useNerdFont: boolean;
    useRounded: boolean;
    useBorder: boolean;
  } {
    const nerdFontEnabled = this.shouldUseNerdFont(config);

    return {
      useNerdFont: nerdFontEnabled,
      useRounded: true, // Capsule主题默认使用圆角 | Capsule theme defaults to rounded
      useBorder: nerdFontEnabled, // 只有在Nerd Font支持时才使用边框 | Only use border when Nerd Font is supported
    };
  }

  /**
   * 检查是否应该使用Nerd Font | Check if should use Nerd Font
   */
  private shouldUseNerdFont(config: Config): boolean {
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
   * 渲染胶囊段落 | Render capsule segment
   */
  private renderCapsuleSegment(
    content: string,
    color: string,
    style: { useNerdFont: boolean; useRounded: boolean; useBorder: boolean },
    enableGradient: boolean = true,
    isFirst: boolean = false
  ): string {
    if (!this.terminalRenderer) {
      // 没有终端渲染器时的简单渲染 | Simple rendering without terminal renderer
      return this.renderSimpleCapsule(content, style);
    }

    // 获取胶囊字符 | Get capsule characters
    const { leftChar, rightChar } = this.selectCapsuleChars(style);
    
    // 获取颜色代码 | Get color codes
    const reset = this.terminalRenderer.getReset();
    const contentFg = this.terminalRenderer.getForegroundColor('white');
    const contentBg = this.terminalRenderer.getBackgroundColor(color);
    
    // 处理有内部颜色的内容 | Handle content with internal colors
    let processedContent = content;
    if (this.shouldPreserveInternalColors(content)) {
      // 对于有内部颜色的组件，需要在每个reset后重新应用背景色
      // For components with internal colors, need to reapply background after each reset
      processedContent = content.replace(/\x1b\[0m/g, `${reset}${contentBg}`);
      
      // 确保内容开始和结束都有正确的背景色 | Ensure content starts and ends with correct background
      if (!processedContent.startsWith(`${contentBg}`)) {
        processedContent = `${contentBg}${processedContent}`;
      }
      if (!processedContent.endsWith(`${contentBg}`)) {
        processedContent = `${processedContent}${contentBg}`;
      }
    }

    // 左半圆直接使用组件颜色作为前景色
    // Left semicircle uses component color directly as foreground
    const leftSemicircleFg = this.terminalRenderer.getForegroundColor(color);

    // 右半圆使用组件本身的前景色
    // Right semicircle uses component's own foreground color  
    const rightSemicircleFg = this.terminalRenderer.getForegroundColor(color);

    // 只有第一个胶囊需要前缀来避免终端渲染问题
    // Only the first capsule needs a prefix to avoid terminal rendering issues
    const invisiblePrefix = isFirst ? '\u00A0' : ''; // 硬编码不换行空格 | Hard-coded non-breaking space
    
    return `${invisiblePrefix}${leftSemicircleFg}${leftChar}${reset}${contentBg}${contentFg} ${processedContent} ${reset}${rightSemicircleFg}${rightChar}${reset}`;
  }

  /**
   * 检查字符串是否包含ANSI颜色代码 | Check if string contains ANSI color codes
   */
  private hasAnsiCodes(str: string): boolean {
    // eslint-disable-next-line no-control-regex
    return /\x1b\[[0-9;]*m/.test(str);
  }

  /**
   * 简单胶囊渲染（无颜色） | Simple capsule rendering (no colors)
   */
  private renderSimpleCapsule(
    content: string,
    style: { useNerdFont: boolean; useRounded: boolean; useBorder: boolean }
  ): string {
    const { leftChar, rightChar } = this.selectCapsuleChars(style);
    return `${leftChar} ${content} ${rightChar}`;
  }

  /**
   * 选择胶囊字符 | Select capsule characters
   */
  private selectCapsuleChars(style: {
    useNerdFont: boolean;
    useRounded: boolean;
    useBorder: boolean;
  }): {
    leftChar: string;
    rightChar: string;
  } {
    if (style.useNerdFont) {
      // 使用Nerd Font半圆字符 | Use Nerd Font semicircle characters
      return {
        leftChar: this.CAPSULE_CHARS.leftSemicircle,
        rightChar: this.CAPSULE_CHARS.rightSemicircle,
      };
    }

    if (style.useRounded) {
      return {
        leftChar: this.CAPSULE_CHARS.leftRounded,
        rightChar: this.CAPSULE_CHARS.rightRounded,
      };
    } else {
      return {
        leftChar: this.CAPSULE_CHARS.leftSquare,
        rightChar: this.CAPSULE_CHARS.rightSquare,
      };
    }
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
      requiresNerdFont: true, // Capsule最好需要Nerd Font | Capsule works best with Nerd Font
      requiresColors: true, // 需要颜色支持 | Requires color support
      supportsGradient: true, // 支持渐变效果 | Supports gradient effects
      customSeparators: true, // 使用自定义分隔符（胶囊形状） | Uses custom separators (capsule shapes)
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
    if (components.length > 5) {
      warnings.push(
        'Capsule主题建议不超过5个组件以避免视觉拥挤 | Capsule theme recommends no more than 5 components to avoid visual crowding'
      );
    }

    // 检查组件长度 | Check component length
    const longComponents = components.filter((c) => c.length > 15);
    if (longComponents.length > 0) {
      warnings.push(
        '某些组件内容过长，胶囊可能显得臃肿 | Some components are too long, capsules may appear bloated'
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
    // Capsule主题使用更亮的颜色 | Capsule theme uses brighter colors
    return {
      project: 'bright_blue',
      model: 'bright_cyan',
      branch: 'bright_green',
      tokens: 'bright_yellow',
      status: 'bright_magenta',
    };
  }

  /**
   * 获取胶囊间距配置 | Get capsule spacing configuration
   */
  getCapsuleSpacing(): {
    betweenCapsules: string;
    insideCapsule: string;
  } {
    return {
      betweenCapsules: ' ', // 胶囊之间的间距 | Spacing between capsules
      insideCapsule: ' ', // 胶囊内部的间距 | Spacing inside capsules
    };
  }
}
