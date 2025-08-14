import { existsSync, readFileSync, statSync } from 'node:fs';
import type {
  ComponentConfig,
  RenderContext,
  TranscriptEntry,
  UsageComponentConfig,
} from '../config/schema.js';
import { BaseComponent, type ComponentFactory } from './base.js';

/**
 * Session使用信息接口 | Session usage info interface
 * 包含完整的Token和成本数据 | Contains complete token and cost data
 */
interface SessionUsageInfo {
  // Token数据 | Token data
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
  
  // 成本数据 | Cost data  
  input_cost: number;
  output_cost: number;
  cache_cost: number;
  total_cost: number;
  
  // 元数据 | Metadata
  model: string;
  session_id: string;
}

/**
 * 模型定价配置接口 | Model pricing configuration interface
 */
interface ModelPricing {
  input: number;           // 输入token价格 ($/M tokens) | Input token price ($/M tokens)
  output: number;          // 输出token价格 ($/M tokens) | Output token price ($/M tokens) 
  cache_creation: number;  // 缓存创建价格 ($/M tokens) | Cache creation price ($/M tokens)
  cache_read: number;      // 缓存读取价格 ($/M tokens) | Cache read price ($/M tokens)
}

/**
 * 官方模型定价映射 | Official model pricing mapping  
 * 基于Claude官方定价文档 | Based on Claude official pricing documentation
 */
const MODEL_PRICING = {
  // Claude Sonnet 4 (新版本) | Claude Sonnet 4 (New version)
  'claude-sonnet-4-20250514': {
    input: 3,              // $3/M tokens
    output: 15,            // $15/M tokens  
    cache_creation: 3.75,  // 1.25x input price
    cache_read: 0.3,       // 0.1x input price
  },
  
  // Claude Sonnet 3.5 (旧版本兼容) | Claude Sonnet 3.5 (Legacy compatibility)
  'claude-3-5-sonnet-20241022': {
    input: 3,
    output: 15,
    cache_creation: 3.75,
    cache_read: 0.3,
  },
  
  // Claude Haiku 3.5 (经济版) | Claude Haiku 3.5 (Economy version)
  'claude-3-5-haiku-20241022': {
    input: 1,
    output: 5,
    cache_creation: 1.25,
    cache_read: 0.1,
  },
  
  // Claude Opus 3 (高级版) | Claude Opus 3 (Premium version) 
  'claude-3-opus-20240229': {
    input: 15,
    output: 75,
    cache_creation: 18.75,
    cache_read: 1.5,
  },
  
  // 默认回退价格 | Default fallback pricing
  default: {
    input: 3,
    output: 15,
    cache_creation: 3.75,
    cache_read: 0.3,
  },
} as const;

// 类型安全的定价访问器 | Type-safe pricing accessor
const getModelPricing = (modelId: string): ModelPricing => {
  const key = modelId as keyof typeof MODEL_PRICING;
  return (MODEL_PRICING as any)[key] || (MODEL_PRICING as any)['default'];
};

/**
 * Usage组件 | Usage component
 * 显示Session级别的累计Token使用和成本信息 | Display session-level cumulative token usage and cost information
 */
export class UsageComponent extends BaseComponent {
  private usageConfig: UsageComponentConfig;
  private cachedUsageData: SessionUsageInfo | null = null;
  private lastCacheKey: string | null = null;

  constructor(name: string, config: UsageComponentConfig) {
    super(name, config);
    this.usageConfig = config;
  }

  protected renderContent(context: RenderContext): string | null {
    const { inputData } = context;

    // 检查是否有Mock数据 | Check for mock data
    const mockData = (inputData as Record<string, unknown>).__mock__;
    if (mockData && typeof (mockData as Record<string, unknown>).usageData === 'object') {
      return this.renderMockUsageData(
        (mockData as Record<string, unknown>).usageData as any,
        context
      );
    }

    if (!inputData.transcriptPath || !inputData.sessionId) {
      return this.renderNoData(context);
    }

    const usageInfo = this.parseSessionUsage(
      inputData.transcriptPath,
      inputData.sessionId,
      inputData.model?.id || 'default',
      context
    );

    if (!usageInfo) {
      return this.renderNoData(context);
    }

    return this.formatUsageDisplay(usageInfo);
  }

  /**
   * 渲染Mock数据 | Render mock data
   */
  private renderMockUsageData(
    mockUsageData: Partial<SessionUsageInfo>,
    _context: RenderContext
  ): string | null {
    const defaultUsage: SessionUsageInfo = {
      input_tokens: 15000,
      output_tokens: 5000,
      cache_creation_tokens: 2000,
      cache_read_tokens: 8000,
      total_tokens: 30000,
      input_cost: 0.045,
      output_cost: 0.075,
      cache_cost: 0.008,
      total_cost: 0.128,
      model: 'claude-sonnet-4-20250514',
      session_id: 'mock-session',
      ...mockUsageData,
    };

    return this.formatUsageDisplay(defaultUsage);
  }

  /**
   * 渲染无数据状态 | Render no data state
   */
  private renderNoData(context: RenderContext): string | null {
    const icon = this.getIcon('usage');
    
    // 显示简单的无数据提示 | Display simple no data message
    const displayText = this.usageConfig.display_mode === 'cost' ? '$0.00' : '0 tokens';
    
    return this.formatOutput(icon, displayText, 'gray');
  }

  /**
   * 解析Session级别的使用信息 | Parse session-level usage information
   * 核心逻辑：累计sessionId下所有assistant消息的usage数据 | Core logic: accumulate usage data from all assistant messages under sessionId
   */
  private parseSessionUsage(
    transcriptPath: string,
    sessionId: string,
    modelId: string,
    context: RenderContext
  ): SessionUsageInfo | null {
    // 检查文件存在性 | Check file existence
    let fileExists = false;
    try {
      fileExists = existsSync(transcriptPath) && statSync(transcriptPath).isFile();
    } catch (_error) {
      return null;
    }

    if (!fileExists) {
      return this.createEmptyUsageInfo(modelId, sessionId);
    }

    try {
      const stat = statSync(transcriptPath);
      const currentMtime = stat.mtime.getTime();
      
      // 复合缓存key：transcriptPath + sessionId + mtime | Composite cache key
      const cacheKey = `${transcriptPath}:${sessionId}:${currentMtime}`;

      // 检查缓存 | Check cache
      const cacheEnabled = context.config.advanced?.cache_enabled ?? true;
      if (cacheEnabled && this.cachedUsageData && this.lastCacheKey === cacheKey) {
        return this.cachedUsageData;
      }

      const transcript = readFileSync(transcriptPath, 'utf8');
      const lines = transcript.trim().split('\n');

      // 累计所有usage数据 | Accumulate all usage data
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalCacheCreationTokens = 0;
      let totalCacheReadTokens = 0;

      // 遍历所有行查找匹配sessionId的assistant消息 | Iterate all lines to find assistant messages matching sessionId
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        try {
          const entry = JSON.parse(trimmedLine) as TranscriptEntry;

          // 检查是否为目标session的assistant消息且包含usage | Check if it's assistant message from target session with usage
          if (
            entry.type === 'assistant' &&
            entry.session_id === sessionId &&
            entry.message &&
            'usage' in entry.message
          ) {
            const usage = entry.message.usage;
            
            // 验证usage数据完整性 | Validate usage data completeness
            const requiredKeys = [
              'input_tokens',
              'cache_creation_input_tokens',
              'cache_read_input_tokens',
              'output_tokens',
            ];

            if (usage && requiredKeys.every((key) => key in usage && typeof (usage as any)[key] === 'number')) {
              totalInputTokens += usage.input_tokens || 0;
              totalOutputTokens += usage.output_tokens || 0; 
              totalCacheCreationTokens += usage.cache_creation_input_tokens || 0;
              totalCacheReadTokens += usage.cache_read_input_tokens || 0;
            }
          }
        } catch (_parseError) {
          // 忽略解析错误的行 | Ignore lines with parse errors
          continue;
        }
      }

      // 计算总token数 | Calculate total tokens
      const totalTokens = totalInputTokens + totalOutputTokens + totalCacheCreationTokens + totalCacheReadTokens;

      // 计算成本 | Calculate costs  
      const pricing = this.getModelPricing(modelId);
      const inputCost = this.calculateCost(totalInputTokens, pricing.input);
      const outputCost = this.calculateCost(totalOutputTokens, pricing.output);
      const cacheCost = this.calculateCost(totalCacheCreationTokens, pricing.cache_creation) +
                        this.calculateCost(totalCacheReadTokens, pricing.cache_read);
      const totalCost = inputCost + outputCost + cacheCost;

      const result: SessionUsageInfo = {
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        cache_creation_tokens: totalCacheCreationTokens,
        cache_read_tokens: totalCacheReadTokens,
        total_tokens: totalTokens,
        input_cost: inputCost,
        output_cost: outputCost,
        cache_cost: cacheCost,
        total_cost: totalCost,
        model: modelId,
        session_id: sessionId,
      };

      // 缓存结果 | Cache result
      if (cacheEnabled) {
        this.cachedUsageData = result;
        this.lastCacheKey = cacheKey;
      }

      return result;
    } catch (error) {
      console.error('Error parsing session usage:', error);
      return null;
    }
  }

  /**
   * 创建空的使用信息 | Create empty usage info
   */
  private createEmptyUsageInfo(modelId: string, sessionId: string): SessionUsageInfo {
    return {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_tokens: 0,
      cache_read_tokens: 0,
      total_tokens: 0,
      input_cost: 0,
      output_cost: 0,
      cache_cost: 0,
      total_cost: 0,
      model: modelId,
      session_id: sessionId,
    };
  }

  /**
   * 获取模型定价配置 | Get model pricing configuration
   */
  private getModelPricing(modelId: string): ModelPricing {
    return getModelPricing(modelId);
  }

  /**
   * 计算成本 | Calculate cost
   * @param tokens Token数量 | Number of tokens
   * @param pricePerMillion 每百万token的价格 | Price per million tokens
   */
  private calculateCost(tokens: number, pricePerMillion: number): number {
    return (tokens / 1_000_000) * pricePerMillion;
  }

  /**
   * 格式化使用信息显示 | Format usage info display
   */
  private formatUsageDisplay(usageInfo: SessionUsageInfo): string {
    const icon = this.getIcon('usage');
    const displayText = this.buildDisplayText(usageInfo);
    const color = this.getUsageColor(usageInfo);
    
    return this.formatOutput(icon, displayText, color);
  }

  /**
   * 构建显示文本 | Build display text
   * 根据display_mode决定显示格式 | Determine display format based on display_mode
   */
  private buildDisplayText(usageInfo: SessionUsageInfo): string {
    const { display_mode, show_model, precision } = this.usageConfig;
    
    let text = '';

    // 添加模型名称前缀 | Add model name prefix
    if (show_model) {
      // 简化模型名显示 | Simplify model name display
      const modelName = this.simplifyModelName(usageInfo.model);
      text += `${modelName} `;
    }

    // 根据显示模式构建内容 | Build content based on display mode
    switch (display_mode) {
      case 'cost':
        text += this.formatCost(usageInfo.total_cost, precision);
        break;
        
      case 'tokens':
        text += this.formatTokens(usageInfo.total_tokens);
        break;
        
      case 'combined':
        text += `${this.formatCost(usageInfo.total_cost, precision)} (${this.formatTokens(usageInfo.total_tokens)})`;
        break;
        
      case 'breakdown':
        text += this.formatBreakdown(usageInfo);
        break;
        
      default:
        // 默认为combined模式 | Default to combined mode
        text += `${this.formatCost(usageInfo.total_cost, precision)} (${this.formatTokens(usageInfo.total_tokens)})`;
    }

    return text;
  }

  /**
   * 格式化成本显示 | Format cost display
   */
  private formatCost(cost: number, precision: number): string {
    return `$${cost.toFixed(precision)}`;
  }

  /**
   * 格式化Token数量显示 | Format token count display
   */
  private formatTokens(tokens: number): string {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K tokens`;
    }
    return `${tokens} tokens`;
  }

  /**
   * 格式化详细分解显示 | Format detailed breakdown display
   * 格式：1.2Kin+0.8Kout+0.3Kcache | Format: 1.2Kin+0.8Kout+0.3Kcache
   */
  private formatBreakdown(usageInfo: SessionUsageInfo): string {
    const parts: string[] = [];

    if (usageInfo.input_tokens > 0) {
      parts.push(`${this.formatTokensShort(usageInfo.input_tokens)}in`);
    }
    
    if (usageInfo.output_tokens > 0) {
      parts.push(`${this.formatTokensShort(usageInfo.output_tokens)}out`);
    }
    
    const cacheTokens = usageInfo.cache_creation_tokens + usageInfo.cache_read_tokens;
    if (cacheTokens > 0) {
      parts.push(`${this.formatTokensShort(cacheTokens)}cache`);
    }

    return parts.join('+') || '0 tokens';
  }

  /**
   * 格式化Token数量（短格式）| Format token count (short format)
   */
  private formatTokensShort(tokens: number): string {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  }

  /**
   * 简化模型名显示 | Simplify model name display
   */
  private simplifyModelName(modelId: string): string {
    // 简化常见的模型名 | Simplify common model names
    const nameMap: Record<string, string> = {
      'claude-sonnet-4-20250514': 'Sonnet-4',
      'claude-3-5-sonnet-20241022': 'Sonnet-3.5',
      'claude-3-5-haiku-20241022': 'Haiku-3.5',
      'claude-3-opus-20240229': 'Opus-3',
    };

    return nameMap[modelId] || modelId.split('-')[1] || modelId;
  }

  /**
   * 获取使用信息的颜色 | Get usage info color
   * 基于成本大小决定颜色 | Determine color based on cost amount
   */
  private getUsageColor(usageInfo: SessionUsageInfo): string {
    const cost = usageInfo.total_cost;
    
    // 颜色阈值 | Color thresholds
    if (cost > 1.0) {
      return 'red';    // 高成本 | High cost
    } else if (cost > 0.1) {
      return 'yellow'; // 中等成本 | Medium cost
    } else if (cost > 0) {
      return 'green';  // 低成本 | Low cost
    } else {
      return 'gray';   // 无成本 | No cost
    }
  }
}

/**
 * Usage组件工厂 | Usage component factory
 */
export class UsageComponentFactory implements ComponentFactory {
  createComponent(name: string, config: ComponentConfig): UsageComponent {
    return new UsageComponent(name, config as UsageComponentConfig);
  }

  getSupportedTypes(): string[] {
    return ['usage'];
  }
}