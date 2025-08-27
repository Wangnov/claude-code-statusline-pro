import { existsSync, readFileSync, statSync } from 'node:fs';
import type {
  ComponentConfig,
  ExtendedRenderContext,
  RenderContext,
  TokensComponentConfig,
  TranscriptEntry,
} from '../config/schema.js';
import {
  type AdvancedProgressOptions,
  FINE_PROGRESS_CHARS,
  generateAdvancedProgressBar,
  getRainbowGradientColor,
} from '../utils/index.js';
import { BaseComponent, type ComponentFactory } from './base.js';

/**
 * Token使用信息接口 | Token usage info interface
 */
interface TokenUsageInfo {
  contextUsedTokens: number;
  contextWindow: number;
  usagePercentage: number;
  progressBar?: string;
  warning?: boolean;
  critical?: boolean;
}

/**
 * Tokens组件 | Tokens component
 * 显示当前上下文Token使用情况 | Display current context token usage
 */
export class TokensComponent extends BaseComponent {
  private tokensConfig: TokensComponentConfig;
  private cachedTranscriptData: TokenUsageInfo | null = null;
  private lastTranscriptMtime: number | null = null;

  constructor(name: string, config: TokensComponentConfig) {
    super(name, config);
    this.tokensConfig = config;
  }

  protected renderContent(context: RenderContext): string | null {
    const { inputData } = context;

    // 检查是否有Mock数据 | Check for mock data
    const mockData = (inputData as Record<string, unknown>).__mock__;
    if (mockData && typeof (mockData as Record<string, unknown>).tokenUsage === 'number') {
      return this.renderMockTokenData(
        (mockData as Record<string, unknown>).tokenUsage as number,
        (mockData as Record<string, unknown>).status as string,
        context
      );
    }

    if (!inputData.transcriptPath) {
      return this.renderNoTranscript(context);
    }

    const tokenUsage = this.parseTranscriptFile(inputData.transcriptPath, context);
    if (!tokenUsage) {
      return this.renderNoTranscript(context);
    }

    return this.formatTokenDisplay(tokenUsage);
  }

  /**
   * 渲染Mock数据 | Render mock token data
   */
  private renderMockTokenData(
    tokenUsagePercent: number,
    _status?: string,
    context?: RenderContext
  ): string | null {
    const contextWindow = this.getContextWindow();
    const contextUsedTokens = Math.floor((tokenUsagePercent / 100) * contextWindow);

    const tokenUsage: TokenUsageInfo = {
      contextUsedTokens,
      contextWindow,
      usagePercentage: tokenUsagePercent,
      warning: tokenUsagePercent > (this.tokensConfig.thresholds?.warning || 60),
      critical: tokenUsagePercent > (this.tokensConfig.thresholds?.critical || 95),
    };

    // 生成进度条 | Generate progress bar
    if (this.tokensConfig.show_progress_bar && context) {
      tokenUsage.progressBar = this.generateProgressBar(tokenUsagePercent, context);
    }

    return this.formatTokenDisplay(tokenUsage);
  }

  /**
   * 渲染无transcript文件时的显示 | Render display when no transcript file
   */
  private renderNoTranscript(context: RenderContext): string | null {
    const contextWindow = this.getContextWindow();
    const tokenUsage: TokenUsageInfo = {
      contextUsedTokens: 0,
      contextWindow,
      usagePercentage: 0,
      warning: false,
      critical: false,
    };

    // 生成空进度条 | Generate empty progress bar
    if (this.tokensConfig.show_progress_bar) {
      tokenUsage.progressBar = this.generateProgressBar(0, context);
    }

    return this.formatTokenDisplay(tokenUsage);
  }

  /**
   * 解析transcript文件 | Parse transcript file
   * 简化版：检测压缩并调整计算区间 | Simplified: detect compression and adjust calculation range
   */
  private parseTranscriptFile(
    transcriptPath: string,
    context: RenderContext
  ): TokenUsageInfo | null {
    // 检查文件存在性 | Check file existence
    let fileExists = false;
    try {
      fileExists = existsSync(transcriptPath) && statSync(transcriptPath).isFile();
    } catch (_error) {
      return null;
    }

    if (!fileExists) {
      return {
        contextUsedTokens: 0,
        contextWindow: this.getContextWindow(),
        usagePercentage: 0,
      };
    }

    try {
      const stat = statSync(transcriptPath);
      const currentMtime = stat.mtime.getTime();

      // 检查缓存 | Check cache
      const cacheEnabled = context.config.advanced?.cache_enabled ?? true;
      if (cacheEnabled && this.cachedTranscriptData && this.lastTranscriptMtime === currentMtime) {
        return this.cachedTranscriptData;
      }

      const transcript = readFileSync(transcriptPath, 'utf8');
      const lines = transcript.trim().split('\n');

      // *** 简单压缩检测：检查第一行是否包含 "type":"summary" ***
      // *** Simple compression detection: check if first line contains "type":"summary" ***
      let startLine = 0;
      if (lines.length > 0 && lines[0]?.includes('"type":"summary"')) {
        startLine = 1; // 从第二行开始计算
        if (context.config.debug) {
          console.error('检测到会话压缩，从第', startLine + 1, '行开始计算token');
        }
      }

      let contextUsedTokens = 0;

      // 在指定范围内查找最大usage值 | Find maximum usage value in specified range
      for (let i = lines.length - 1; i >= startLine; i--) {
        const line = lines[i]?.trim();
        if (!line) continue;

        try {
          const entry = JSON.parse(line) as TranscriptEntry;

          // 查找包含usage信息的assistant消息 | Find assistant message with usage info
          if (entry.type === 'assistant' && entry.message && 'usage' in entry.message) {
            const usage = entry.message.usage;

            if (usage && typeof usage === 'object') {
              const inputTokens = Number(usage.input_tokens) || 0;
              const outputTokens = Number(usage.output_tokens) || 0;
              const cacheCreationTokens = Number(usage.cache_creation_input_tokens) || 0;
              const cacheReadTokens = Number(usage.cache_read_input_tokens) || 0;

              const currentUsage =
                inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens;

              if (currentUsage > 0) {
                contextUsedTokens = Math.max(contextUsedTokens, currentUsage);
              }
            }
          }
        } catch (_parseError) {}
      }

      const contextWindow = this.getContextWindow();
      const usagePercentage = (contextUsedTokens / contextWindow) * 100;

      const result: TokenUsageInfo = {
        contextUsedTokens,
        contextWindow,
        usagePercentage,
        warning: usagePercentage > (this.tokensConfig.thresholds?.warning || 60),
        critical: usagePercentage > (this.tokensConfig.thresholds?.critical || 95),
      };

      // 生成进度条 | Generate progress bar
      if (this.tokensConfig.show_progress_bar) {
        result.progressBar = this.generateProgressBar(usagePercentage, context);
      }

      // 缓存结果 | Cache result
      if (cacheEnabled) {
        this.cachedTranscriptData = result;
        this.lastTranscriptMtime = currentMtime;
      }

      return result;
    } catch (error) {
      console.error('Error parsing transcript file:', error);
      return null;
    }
  }

  /**
   * 获取上下文窗口大小 | Get context window size
   */
  private getContextWindow(): number {
    // 从 context_windows 映射中获取，支持模型特定配置
    const contextWindows = this.tokensConfig.context_windows || { default: 200000 };
    return contextWindows.default || 200000;
  }

  /**
   * 生成进度条 | Generate progress bar
   * 支持渐变颜色和精细进度条 | Support gradient colors and fine progress bars
   */
  private generateProgressBar(usagePercentage: number, context: RenderContext): string {
    const width = this.tokensConfig.progress_width || 10;

    // 检查主题配置中的特性启用状态 | Check feature enablement in theme configuration
    const themeConfig = context.config.themes;
    const currentTheme = context.config.theme;

    // 对于powerline和capsule主题，默认启用渐变 | Enable gradient by default for powerline and capsule themes
    const isThemeWithGradient = currentTheme === 'powerline' || currentTheme === 'capsule';
    const enableGradient =
      this.tokensConfig.show_gradient ||
      themeConfig?.[currentTheme]?.enable_gradient ||
      isThemeWithGradient; // 新增：主题默认启用

    const enableFineProgress = themeConfig?.[currentTheme]?.fine_progress || false;

    // 调试信息 | Debug info
    if (context.config.debug) {
      console.error('=== 渐变调试信息 ===');
      console.error('show_gradient:', this.tokensConfig.show_gradient);
      console.error('currentTheme:', currentTheme);
      console.error('theme_enable_gradient:', themeConfig?.[currentTheme]?.enable_gradient);
      console.error('isThemeWithGradient:', isThemeWithGradient);
      console.error('enableGradient:', enableGradient);
      console.error('capabilities.colors:', context.capabilities.colors);
      console.error('=====================');
    }

    // 使用配置的进度条字符 | Use configured progress bar characters
    const filledChar = this.tokensConfig.progress_bar_chars?.filled || '█';
    const emptyChar = this.tokensConfig.progress_bar_chars?.empty || '░';
    const backupChar = this.tokensConfig.progress_bar_chars?.backup || '▓';

    // 智能选择渐变模式 | Intelligently select gradient mode
    const useRainbowGradient = enableGradient;
    const useFineGradient = enableFineProgress && context.capabilities.nerdFont && enableGradient;

    // 准备高级进度条选项 | Prepare advanced progress bar options
    const options: AdvancedProgressOptions = {
      length: width,
      fillChar: filledChar,
      emptyChar: emptyChar,
      backupChar: backupChar,
      backupThreshold: 85,
      enableGradient: useRainbowGradient,
      enableFineProgress: useFineGradient,
      fineChars: FINE_PROGRESS_CHARS,
      colorMapper: getRainbowGradientColor, // 使用新的彩虹渐变算法
    };

    // 调试信息：渐变模式 | Debug info: gradient mode
    if (context.config.debug) {
      console.error('=== 渐变模式调试 ===');
      console.error('useRainbowGradient:', useRainbowGradient);
      console.error('useFineGradient:', useFineGradient);
      console.error('capabilities.nerdFont:', context.capabilities.nerdFont);
      console.error('enableFineProgress:', enableFineProgress);
      console.error('====================');
    }

    // 生成高级进度条 | Generate advanced progress bar
    const result = generateAdvancedProgressBar(usagePercentage, options);

    // 如果启用了渐变并且返回了segments，进行彩色渲染
    // If gradient is enabled and segments are returned, perform colored rendering
    if (enableGradient && result.segments && context.capabilities.colors) {
      if (context.config.debug) {
        console.error('=== 彩色渲染调试 ===');
        console.error('result.segments 存在:', !!result.segments);
        console.error('segments数量:', result.segments?.length);
        console.error('前3个segments:', result.segments?.slice(0, 3));
        console.error('==================');
      }
      return this.renderColoredProgressBar(result.segments, context);
    }

    if (context.config.debug) {
      console.error('=== 未渲染彩色原因 ===');
      console.error('enableGradient:', enableGradient);
      console.error('result.segments存在:', !!result.segments);
      console.error('context.capabilities.colors:', context.capabilities.colors);
      console.error('========================');
    }

    return result.bar;
  }

  /**
   * 渲染彩色进度条 | Render colored progress bar
   * 将分段数据渲染为彩色进度条，支持ANSI RGB代码
   */
  private renderColoredProgressBar(
    segments: Array<{ char: string; color: string }>,
    context: RenderContext
  ): string {
    // 检查是否为 ExtendedRenderContext 并且有 renderer
    const extendedContext = context as ExtendedRenderContext;

    const reset = '\x1b[0m'; // ANSI reset code

    const result = segments
      .map((segment) => {
        // 如果color以\x1b开头，说明是ANSI代码，直接使用
        if (segment.color.startsWith('\x1b')) {
          return `${segment.color}${segment.char}${reset}`;
        }
        // 否则使用渲染器的colorize方法（颜色名称）
        if (extendedContext.renderer && context.capabilities.colors) {
          return extendedContext.renderer!.colorize(segment.char, segment.color);
        }
        // 如果都不行，返回原始字符
        return segment.char;
      })
      .join('');

    if (context.config.debug) {
      console.error('=== 渲染结果调试 ===');
      console.error('输出长度:', result.length);
      console.error('包含ANSI代码:', result.includes('\x1b'));
      console.error('前50个字符:', result.substring(0, 50));
      console.error('===================');
    }

    return result;
  }

  /**
   * 格式化Token显示 | Format token display
   */
  private formatTokenDisplay(tokenUsage: TokenUsageInfo): string {
    const { contextUsedTokens, contextWindow, usagePercentage, progressBar, warning, critical } =
      tokenUsage;

    const icon = this.renderIcon();

    // 确定颜色 | Determine color
    let colorName = 'yellow'; // 默认颜色
    if (this.tokensConfig.colors?.safe) {
      colorName = this.tokensConfig.colors.safe;
    }
    if (critical && this.tokensConfig.colors?.danger) {
      colorName = this.tokensConfig.colors.danger;
    } else if (warning && this.tokensConfig.colors?.warning) {
      colorName = this.tokensConfig.colors.warning;
    }

    // 按原版格式：[进度条] 百分比 (具体数值) | Format like original: [progressbar] percentage (specific numbers)
    let displayText = '';

    // 1. 添加进度条 (带方括号) | Add progress bar (with brackets)
    if (progressBar) {
      displayText += `[${progressBar}] `;
    }

    // 2. 添加百分比 | Add percentage
    if (this.tokensConfig.show_percentage) {
      displayText += `${usagePercentage.toFixed(1)}% `;
    }

    // 3. 添加具体数值 (更精确的k显示) | Add specific numbers (more precise k display)
    const usedDisplay = this.tokensConfig.show_raw_numbers
      ? contextUsedTokens.toString()
      : `${(contextUsedTokens / 1000).toFixed(1)}k`;

    const totalDisplay = this.tokensConfig.show_raw_numbers
      ? contextWindow.toString()
      : `${(contextWindow / 1000).toFixed(0)}k`;

    displayText += `(${usedDisplay}/${totalDisplay})`;

    // 添加状态指示器 - 使用三级图标系统 | Add status indicators - using three-level icon system
    const statusIcon = this.getStatusIcon(critical ?? false, warning ?? false);
    if (statusIcon) {
      displayText += ` ${statusIcon}`;
    }

    return this.formatOutput(icon, displayText, colorName);
  }

  /**
   * 获取状态图标 - 三级图标选择逻辑 | Get status icon - three-level icon selection logic
   * 支持强制参数和优先级：nerd_icon → emoji_icon → text_icon
   */
  private getStatusIcon(critical: boolean, warning: boolean): string {
    if (!critical && !warning) return '';

    const statusType = critical ? 'critical' : 'backup';
    const statusIcons = this.tokensConfig.status_icons;

    if (!statusIcons) {
      // 向后兼容：使用硬编码默认值 | Backward compatibility: use hardcoded defaults
      return critical ? '🔥' : '⚡';
    }

    // 检查是否有强制图标设置（通过renderContext获取配置）
    const context = this.renderContext as ExtendedRenderContext;
    const forceEmoji = context?.config?.terminal?.force_emoji === true;
    const forceNerdFont = context?.config?.terminal?.force_nerd_font === true;
    const forceText = context?.config?.terminal?.force_text === true;

    // 1. 如果强制文本模式
    if (forceText && statusIcons.text?.[statusType]) {
      return statusIcons.text[statusType];
    }

    // 2. 如果强制启用Nerd Font
    if (forceNerdFont && statusIcons.nerd?.[statusType] !== undefined) {
      return statusIcons.nerd[statusType];
    }

    // 3. 如果强制启用emoji
    if (forceEmoji && statusIcons.emoji?.[statusType]) {
      return statusIcons.emoji[statusType];
    }

    // 4. 自动检测模式：优先使用Nerd Font图标（如果支持）
    if (this.capabilities.nerdFont && statusIcons.nerd?.[statusType] !== undefined) {
      return statusIcons.nerd[statusType];
    }

    // 5. 自动检测模式：其次使用Emoji图标（如果支持）
    if (this.capabilities.emoji && statusIcons.emoji?.[statusType]) {
      return statusIcons.emoji[statusType];
    }

    // 6. 最后回退到文本图标
    if (statusIcons.text?.[statusType]) {
      return statusIcons.text[statusType];
    }

    // 最后的回退：硬编码默认值 | Final fallback: hardcoded defaults
    return critical ? '[X]' : '[!]';
  }
}

/**
 * Tokens组件工厂 | Tokens component factory
 */
export class TokensComponentFactory implements ComponentFactory {
  createComponent(name: string, config: ComponentConfig): TokensComponent {
    return new TokensComponent(name, config as TokensComponentConfig);
  }

  getSupportedTypes(): string[] {
    return ['tokens'];
  }
}
