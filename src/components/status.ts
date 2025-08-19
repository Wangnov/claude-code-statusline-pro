import { existsSync, readFileSync, statSync } from 'node:fs';
import type {
  ComponentConfig,
  ExtendedRenderContext,
  RenderContext,
  StatusComponentConfig,
  TranscriptEntry,
} from '../config/schema.js';
import { BaseComponent, type ComponentFactory } from './base.js';

/**
 * 状态信息类型 | Status info type
 */
type StatusType = 'ready' | 'thinking' | 'tool' | 'error' | 'warning';

/**
 * 状态信息接口 | Status info interface
 */
interface StatusInfo {
  type: StatusType;
  message: string;
  details?: string;
}

/**
 * Status组件 | Status component
 * 显示当前Claude会话状态 | Display current Claude session status
 */
export class StatusComponent extends BaseComponent {
  private statusConfig: StatusComponentConfig;
  private cachedStatus: StatusInfo | null = null;
  private lastTranscriptMtime: number | null = null;

  constructor(name: string, config: StatusComponentConfig) {
    super(name, config);
    this.statusConfig = config;
  }

  protected renderContent(context: RenderContext | ExtendedRenderContext): string | null {
    const { inputData } = context;

    // 检查是否有Mock数据 | Check for mock data
    const mockData = (inputData as Record<string, unknown>).__mock__;
    if (mockData && typeof mockData === 'object' && 'status' in mockData) {
      return this.renderMockStatus((mockData as Record<string, unknown>).status as string);
    }

    if (!inputData.transcriptPath) {
      return this.renderDefaultStatus();
    }

    const statusInfo = this.parseTranscriptStatus(inputData.transcriptPath, context);
    if (!statusInfo) {
      return this.renderDefaultStatus();
    }

    return this.formatStatusDisplay(statusInfo);
  }

  /**
   * 渲染Mock状态 | Render mock status
   */
  private renderMockStatus(status: string): string {
    const statusMap: { [key: string]: { type: StatusType; message: string } } = {
      ready: { type: 'ready', message: 'Ready' },
      thinking: { type: 'thinking', message: 'Thinking...' },
      tool_use: { type: 'tool', message: 'Tool Use' },
      error: { type: 'error', message: 'Error' },
      complete: { type: 'ready', message: 'Complete' },
    };

    const statusInfo = statusMap[status] || { type: 'ready', message: 'Ready' };
    return this.formatStatusDisplay(statusInfo);
  }

  /**
   * 渲染默认状态 | Render default status
   */
  private renderDefaultStatus(): string {
    // 使用BaseComponent的三级图标系统获取ready图标 | Use BaseComponent three-level icon system for ready icon
    const statusIcon = this.getStatusIcon('ready');
    // 使用BaseComponent的颜色系统渲染文本 | Use BaseComponent color system to render text
    const colorName = this.getStatusColor('ready');
    return this.formatOutput(statusIcon, 'Ready', colorName);
  }

  /**
   * 解析transcript状态 | Parse transcript status
   */
  private parseTranscriptStatus(
    transcriptPath: string,
    context: RenderContext | ExtendedRenderContext
  ): StatusInfo | null {
    // 检查文件存在性 | Check file existence
    let fileExists = false;
    try {
      fileExists = existsSync(transcriptPath) && statSync(transcriptPath).isFile();
    } catch (_error) {
      return null;
    }

    if (!fileExists) {
      return { type: 'ready', message: 'Ready' };
    }

    try {
      const stat = statSync(transcriptPath);
      const currentMtime = stat.mtime.getTime();

      // 检查缓存 | Check cache
      const cacheEnabled = context.config.advanced?.cache_enabled ?? true;
      if (cacheEnabled && this.cachedStatus && this.lastTranscriptMtime === currentMtime) {
        return this.cachedStatus;
      }

      const transcript = readFileSync(transcriptPath, 'utf8');
      const lines = transcript.trim().split('\n');

      let lastStopReason: string | null = null;
      let lastToolCall: string | null = null;
      let lastEntryType: string | null = null;
      let assistantError = false;
      let errorDetails = 'Error';
      let _lastAssistantIndex = -1;

      // 查找最新的assistant消息 | Find latest assistant message
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i]?.trim();
        if (!line) continue;

        try {
          const entry = JSON.parse(line) as TranscriptEntry;

          if (!lastEntryType) {
            lastEntryType = entry.type;
          }

          // 查找assistant消息的usage和stop_reason | Find assistant message usage and stop_reason
          if (entry.type === 'assistant' && entry.message && 'usage' in entry.message) {
            lastStopReason = entry.message?.stop_reason || null;
            _lastAssistantIndex = i;

            // 检查是否有错误 | Check for errors
            assistantError = this.isErrorEntry(entry);
            if (assistantError) {
              errorDetails = this.getErrorDetails(entry);
            }
            break;
          }
        } catch (_parseError) {}
      }

      // 查找最近的工具调用 | Find recent tool calls
      const recentErrorCount = context.config.advanced?.recent_error_count || 5;
      const recentLines = lines.slice(-recentErrorCount);

      for (const line of recentLines) {
        if (!line.trim()) continue;

        try {
          const entry = JSON.parse(line) as TranscriptEntry;

          if (
            'message' in entry &&
            entry.message?.content &&
            Array.isArray(entry.message.content)
          ) {
            const toolUse = entry.message.content.find(
              (item: unknown) =>
                typeof item === 'object' &&
                item !== null &&
                'type' in item &&
                (item as Record<string, unknown>).type === 'tool_use'
            );
            if (toolUse && typeof toolUse === 'object' && 'name' in toolUse) {
              lastToolCall = toolUse.name as string;
            }
          }
        } catch (_parseError) {
          // 忽略单行解析错误 | Ignore single line parse errors
        }
      }

      // 确定状态 | Determine status
      let statusInfo: StatusInfo;

      if (assistantError) {
        statusInfo = { type: 'error', message: errorDetails, details: errorDetails };
      } else if (lastStopReason === 'tool_use') {
        const toolInfo = lastToolCall ? ` ${lastToolCall}` : '';
        statusInfo = {
          type: 'tool',
          message: `Tool${toolInfo}`,
          details: lastToolCall || '',
        };
      } else if (lastStopReason === 'end_turn') {
        statusInfo = { type: 'ready', message: 'Ready' };
      } else if (lastStopReason === null) {
        // 当stop_reason为null时，智能判断 | Smart inference when stop_reason is null
        if (lastEntryType === 'user') {
          statusInfo = { type: 'thinking', message: 'Thinking' };
        } else {
          statusInfo = { type: 'ready', message: 'Ready' };
        }
      } else {
        // 其他未知状态 | Other unknown states
        statusInfo = { type: 'ready', message: 'Ready' };
      }

      // 缓存结果 | Cache result
      if (cacheEnabled) {
        this.cachedStatus = statusInfo;
        this.lastTranscriptMtime = currentMtime;
      }

      return statusInfo;
    } catch (error) {
      console.error('Error parsing transcript status:', error);
      return null;
    }
  }

  /**
   * 检测条目是否包含真正的错误 | Detect if entry contains real errors
   */
  private isErrorEntry(entry: Record<string, unknown>): boolean {
    // 检查工具使用结果中的错误，但排除权限相关的阻止 | Check for errors in tool use results, excluding permission-related blocks
    if ((entry as Record<string, unknown>).toolUseResult) {
      const toolUseResult = (entry as Record<string, unknown>).toolUseResult as Record<
        string,
        unknown
      >;
      const errorMsg = toolUseResult.error || toolUseResult;
      if (
        typeof errorMsg === 'string' &&
        (errorMsg.includes('was blocked') || errorMsg.includes('For security'))
      ) {
        return false;
      }
      if (toolUseResult.error || toolUseResult.type === 'error') {
        return true;
      }
    }

    // 检查stop_reason为stop_sequence的API错误 | Check for API errors with stop_reason as stop_sequence
    const message = (entry as Record<string, unknown>).message as
      | Record<string, unknown>
      | undefined;
    if (message?.stop_reason === 'stop_sequence') {
      if (message?.content && Array.isArray(message.content)) {
        for (const item of message.content as Array<Record<string, unknown>>) {
          if (item.type === 'text' && item.text) {
            const text = item.text as string;
            // API Error 403 配额不足 | API Error 403 insufficient quota
            if (text.startsWith('API Error: 403') && text.includes('user quota is not enough')) {
              return true;
            }
            // filter错误 | filter error
            if (text.includes('filter')) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  /**
   * 获取错误详细信息 | Get error details
   */
  private getErrorDetails(entry: Record<string, unknown>): string {
    // 检查stop_reason为stop_sequence的API错误 | Check for API errors with stop_reason as stop_sequence
    const message = (entry as Record<string, unknown>).message as
      | Record<string, unknown>
      | undefined;
    if (message?.stop_reason === 'stop_sequence') {
      if (message?.content && Array.isArray(message.content)) {
        for (const item of message.content as Array<Record<string, unknown>>) {
          if (item.type === 'text' && item.text) {
            const text = item.text as string;
            // API Error 403 配额不足 | API Error 403 insufficient quota
            if (text.startsWith('API Error: 403') && text.includes('user quota is not enough')) {
              return '403配额不足';
            }
            // filter错误 | filter error
            if (text.includes('filter')) {
              return 'Filter错误';
            }
          }
        }
      }
    }
    return 'Error';
  }

  /**
   * 格式化状态显示 | Format status display
   */
  private formatStatusDisplay(statusInfo: StatusInfo): string {
    const { type, message } = statusInfo;

    // 使用BaseComponent的三级图标系统获取状态图标 | Use BaseComponent three-level icon system for status icon
    const statusIcon = this.getStatusIcon(type);

    // 根据状态类型获取颜色名称 | Get color name based on status type
    const colorName = this.getStatusColor(type);

    // 使用BaseComponent的标准formatOutput方法 | Use BaseComponent standard formatOutput method
    return this.formatOutput(statusIcon, message, colorName);
  }

  /**
   * 获取状态图标 | Get status icon
   * 使用三级图标选择逻辑：nerd → emoji → text | Use three-level icon selection: nerd → emoji → text
   * 支持强制参数，与BaseComponent标准集成 | Support force parameters, integrated with BaseComponent standards
   */
  private getStatusIcon(type: StatusType): string {
    const statusIcons = this.statusConfig.icons;

    if (!statusIcons) {
      // 向后兼容：使用硬编码默认值 | Backward compatibility: use hardcoded defaults
      const defaultIcons: Record<StatusType, string> = {
        ready: '✅',
        thinking: '💭',
        tool: '🔧',
        error: '❌',
        warning: '⚠️',
      };
      return defaultIcons[type] || '';
    }

    // 检查是否有强制图标设置（通过renderContext获取配置）
    const context = this.renderContext as ExtendedRenderContext;
    const forceEmoji = context?.config?.terminal?.force_emoji === true;
    const forceNerdFont = context?.config?.terminal?.force_nerd_font === true;
    const forceText = context?.config?.terminal?.force_text === true;

    // 1. 如果强制文本模式
    if (forceText && statusIcons.text?.[type]) {
      return this.renderIcon(statusIcons.text[type]);
    }

    // 2. 如果强制启用Nerd Font
    if (forceNerdFont && statusIcons.nerd?.[type] !== undefined) {
      return this.renderIcon(statusIcons.nerd[type]);
    }

    // 3. 如果强制启用emoji
    if (forceEmoji && statusIcons.emoji?.[type]) {
      return this.renderIcon(statusIcons.emoji[type]);
    }

    // 4. 自动检测模式：优先使用Nerd Font图标（如果支持）
    if (this.capabilities.nerdFont && statusIcons.nerd?.[type] !== undefined) {
      return this.renderIcon(statusIcons.nerd[type]);
    }

    // 5. 自动检测模式：其次使用Emoji图标（如果支持）
    if (this.capabilities.emoji && statusIcons.emoji?.[type]) {
      return this.renderIcon(statusIcons.emoji[type]);
    }

    // 6. 最后回退到文本图标
    if (statusIcons.text?.[type]) {
      return this.renderIcon(statusIcons.text[type]);
    }

    // 最后的回退：硬编码默认值 | Final fallback: hardcoded defaults
    const defaultIcons: Record<StatusType, string> = {
      ready: '[OK]',
      thinking: '[...]',
      tool: '[TOOL]',
      error: '[ERR]',
      warning: '[WARN]',
    };
    return this.renderIcon(defaultIcons[type] || '');
  }

  /**
   * 获取状态颜色 | Get status color
   */
  private getStatusColor(type: StatusType): string {
    const statusColors = this.statusConfig.colors;

    if (statusColors?.[type]) {
      return statusColors[type];
    }

    // 回退到默认颜色 | Fall back to default colors
    const defaultColors: Record<StatusType, string> = {
      ready: 'green',
      thinking: 'yellow',
      tool: 'blue',
      error: 'red',
      warning: 'yellow',
    };

    return defaultColors[type] || 'white';
  }
}

/**
 * Status组件工厂 | Status component factory
 */
export class StatusComponentFactory implements ComponentFactory {
  createComponent(name: string, config: ComponentConfig): StatusComponent {
    return new StatusComponent(name, config as StatusComponentConfig);
  }

  getSupportedTypes(): string[] {
    return ['status'];
  }
}
