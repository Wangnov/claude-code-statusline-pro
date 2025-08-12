import { existsSync, readFileSync, statSync } from 'node:fs';
import type {
  ComponentConfig,
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

  protected renderContent(context: RenderContext): string | null {
    const { inputData } = context;

    // 检查是否有Mock数据 | Check for mock data
    const mockData = (inputData as Record<string, unknown>)['__mock__'];
    if (mockData && typeof mockData === 'object' && 'status' in mockData) {
      return this.renderMockStatus((mockData as Record<string, unknown>)['status'] as string);
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
    const icon = this.getIcon('ready');
    const colorName = this.statusConfig.colors?.ready || 'green';
    return this.formatOutput(icon, 'Ready', colorName);
  }

  /**
   * 解析transcript状态 | Parse transcript status
   */
  private parseTranscriptStatus(transcriptPath: string, context: RenderContext): StatusInfo | null {
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
            lastEntryType = entry['type'];
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
                (item as Record<string, unknown>)['type'] === 'tool_use'
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
    if ((entry as Record<string, unknown>)['toolUseResult']) {
      const toolUseResult = (entry as Record<string, unknown>)['toolUseResult'] as Record<string, unknown>;
      const errorMsg = toolUseResult['error'] || toolUseResult;
      if (
        typeof errorMsg === 'string' &&
        (errorMsg.includes('was blocked') || errorMsg.includes('For security'))
      ) {
        return false;
      }
      if (toolUseResult['error'] || toolUseResult['type'] === 'error') {
        return true;
      }
    }

    // 检查stop_reason为stop_sequence的API错误 | Check for API errors with stop_reason as stop_sequence
    const message = (entry as Record<string, unknown>)['message'] as Record<string, unknown> | undefined;
    if (message?.['stop_reason'] === 'stop_sequence') {
      if (message?.['content'] && Array.isArray(message['content'])) {
        for (const item of message['content'] as Array<Record<string, unknown>>) {
          if (item['type'] === 'text' && item['text']) {
            const text = item['text'] as string;
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
    const message = (entry as Record<string, unknown>)['message'] as Record<string, unknown> | undefined;
    if (message?.['stop_reason'] === 'stop_sequence') {
      if (message?.['content'] && Array.isArray(message['content'])) {
        for (const item of message['content'] as Array<Record<string, unknown>>) {
          if (item['type'] === 'text' && item['text']) {
            const text = item['text'] as string;
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

    // 获取图标和颜色 | Get icon and color
    const icon = this.getIcon(type);
    const colorName = this.statusConfig.colors?.[type] || this.getDefaultColor(type);

    return this.formatOutput(icon, message, colorName);
  }

  /**
   * 获取默认颜色 | Get default color
   */
  private getDefaultColor(type: StatusType): string {
    const colorMap: Record<StatusType, string> = {
      ready: 'green',
      thinking: 'yellow',
      tool: 'blue',
      error: 'red',
      warning: 'yellow',
    };
    return colorMap[type] || 'white';
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
