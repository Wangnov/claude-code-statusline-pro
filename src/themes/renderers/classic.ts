/**
 * Classic主题渲染器 | Classic theme renderer
 * 使用传统的分隔符连接组件 | Uses traditional separators to connect components
 */

import type { Config } from '../../config/schema.js';
import type { TerminalRenderer } from '../../terminal/colors.js';
import type { SeparatorConfig, ThemeRenderer } from '../types.js';

/**
 * Classic主题渲染器类 | Classic theme renderer class
 */
export class ClassicRenderer implements ThemeRenderer {
  private terminalRenderer: TerminalRenderer | undefined;

  constructor(terminalRenderer?: TerminalRenderer) {
    this.terminalRenderer = terminalRenderer;
  }

  /**
   * 渲染状态行 | Render statusline
   */
  renderStatusline(components: string[], _colors: string[], config: Config): string {
    // 过滤空组件 | Filter empty components
    const validComponents = components.filter((c) => c.trim());

    if (validComponents.length === 0) {
      return '';
    }

    // 获取分隔符配置 | Get separator configuration
    const separatorConfig = this.extractSeparatorConfig(config);

    // 如果只有一个组件，直接返回 | If only one component, return directly
    if (validComponents.length === 1) {
      return validComponents[0] || '';
    }

    // 构建完整分隔符 | Build complete separator
    const fullSeparator = this.buildFullSeparator(separatorConfig);

    // 连接组件 | Join components
    return validComponents.join(fullSeparator);
  }

  /**
   * 提取分隔符配置 | Extract separator configuration
   */
  private extractSeparatorConfig(config: Config): SeparatorConfig {
    const style = config.style;

    return {
      separator: style?.separator ?? ' | ',
      separator_color: style?.separator_color ?? 'white',
      separator_before: style?.separator_before ?? ' ',
      separator_after: style?.separator_after ?? ' ',
    };
  }

  /**
   * 构建完整分隔符 | Build complete separator
   */
  private buildFullSeparator(separatorConfig: SeparatorConfig): string {
    if (!this.terminalRenderer) {
      // 没有终端渲染器时，使用简单分隔符 | Use simple separator without terminal renderer
      return `${separatorConfig.separator_before}${separatorConfig.separator}${separatorConfig.separator_after}`;
    }

    // 使用终端渲染器着色 | Use terminal renderer for coloring
    const sepColor = this.terminalRenderer.getColor(separatorConfig.separator_color);
    const reset = this.terminalRenderer.getReset();

    const coloredSeparator = `${sepColor}${separatorConfig.separator}${reset}`;

    return `${separatorConfig.separator_before}${coloredSeparator}${separatorConfig.separator_after}`;
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
      requiresNerdFont: false,
      requiresColors: false,
      supportsGradient: false,
      customSeparators: false,
    };
  }

  /**
   * 验证组件兼容性 | Validate component compatibility
   */
  validateComponentCompatibility(_components: string[]): {
    compatible: boolean;
    warnings: string[];
  } {
    // Classic主题兼容所有组件 | Classic theme is compatible with all components
    return {
      compatible: true,
      warnings: [],
    };
  }
}
