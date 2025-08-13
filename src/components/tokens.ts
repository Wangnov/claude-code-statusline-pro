import { existsSync, readFileSync, statSync } from 'node:fs';
import type {
  ComponentConfig,
  RenderContext,
  TokensComponentConfig,
  TranscriptEntry,
} from '../config/schema.js';
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
        (mockData as Record<string, unknown>).status as string
      );
    }

    if (!inputData.transcriptPath) {
      return this.renderNoTranscript();
    }

    const tokenUsage = this.parseTranscriptFile(inputData.transcriptPath, context);
    if (!tokenUsage) {
      return this.renderNoTranscript();
    }

    return this.formatTokenDisplay(tokenUsage);
  }

  /**
   * 渲染Mock数据 | Render mock token data
   */
  private renderMockTokenData(tokenUsagePercent: number, _status?: string): string | null {
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
    if (this.tokensConfig.show_progress_bar) {
      tokenUsage.progressBar = this.generateProgressBar(tokenUsagePercent);
    }

    return this.formatTokenDisplay(tokenUsage);
  }

  /**
   * 渲染无transcript文件时的显示 | Render display when no transcript file
   */
  private renderNoTranscript(): string | null {
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
      tokenUsage.progressBar = this.generateProgressBar(0);
    }

    return this.formatTokenDisplay(tokenUsage);
  }

  /**
   * 解析transcript文件 | Parse transcript file
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

      let contextUsedTokens = 0;

      // 从最后开始查找最新的assistant消息 | Find latest assistant message from the end
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i]?.trim();
        if (!line) continue;

        try {
          const entry = JSON.parse(line) as TranscriptEntry;

          // 查找包含usage信息的assistant消息 | Find assistant message with usage info
          if (entry.type === 'assistant' && entry.message && 'usage' in entry.message) {
            const usage = entry.message.usage;
            const requiredKeys = [
              'input_tokens',
              'cache_creation_input_tokens',
              'cache_read_input_tokens',
              'output_tokens',
            ];

            if (usage && requiredKeys.every((key) => key in usage)) {
              contextUsedTokens =
                usage.input_tokens +
                usage.cache_creation_input_tokens +
                usage.cache_read_input_tokens +
                usage.output_tokens;
              break;
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
        result.progressBar = this.generateProgressBar(usagePercentage);
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
    return this.tokensConfig.context_window || 200000;
  }

  /**
   * 生成进度条 | Generate progress bar
   */
  private generateProgressBar(usagePercentage: number): string {
    const width = this.tokensConfig.progress_bar_width || 10;
    const filled = Math.round((usagePercentage / 100) * width);
    const _empty = width - filled;

    // 使用配置的进度条字符 | Use configured progress bar characters
    const filledChar = this.tokensConfig.progress_bar_chars?.filled || '█';
    const emptyChar = this.tokensConfig.progress_bar_chars?.empty || '░';
    const backupChar = this.tokensConfig.progress_bar_chars?.backup || '▓';

    // 85%后使用后备区域字符 | Use backup area character after 85%
    let bar = '';
    for (let i = 0; i < width; i++) {
      const segmentPercentage = (i / width) * 100;
      if (i < filled) {
        bar += segmentPercentage >= 85 ? backupChar : filledChar;
      } else {
        bar += emptyChar;
      }
    }

    return bar;
  }

  /**
   * 格式化Token显示 | Format token display
   */
  private formatTokenDisplay(tokenUsage: TokenUsageInfo): string {
    const { contextUsedTokens, contextWindow, usagePercentage, progressBar, warning, critical } =
      tokenUsage;

    const icon = this.getIcon('token');

    // 确定颜色 | Determine color
    let colorName = this.tokensConfig.color || 'yellow';
    if (critical) {
      colorName = 'red';
    } else if (warning) {
      colorName = 'yellow';
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

    // 添加状态指示器 | Add status indicators
    if (critical) {
      displayText += ' 🔥';
    } else if (warning) {
      displayText += ' ⚡';
    }

    return this.formatOutput(icon, displayText, colorName);
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
