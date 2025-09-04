import type { ComponentConfig, RenderContext, UsageComponentConfig } from '../config/schema.js';
import { getConversationCostDisplay, updateCostFromInput } from '../storage/index.js';
import { BaseComponent, type ComponentFactory } from './base.js';

/**
 * 官方Session数据接口 | Official session data interface
 * 基于官方stdin JSON格式 | Based on official stdin JSON format
 */
interface OfficialSessionData {
  session_id: string;
  transcript_path: string;
  cwd: string;
  model: {
    id: string;
    display_name: string;
  };
  workspace: {
    current_dir: string;
    project_dir: string;
  };
  version: string;
  output_style: {
    name: string;
  };
  cost: {
    total_cost_usd: number;
    total_duration_ms: number;
    total_api_duration_ms: number;
    total_lines_added: number;
    total_lines_removed: number;
  };
  exceeds_200k_tokens: boolean;
}

/**
 * Usage组件 | Usage component
 * 显示Session的成本和代码行数统计 | Display session cost and code line statistics
 */
export class UsageComponent extends BaseComponent {
  private usageConfig: UsageComponentConfig;

  constructor(name: string, config: UsageComponentConfig) {
    super(name, config);
    this.usageConfig = config;
  }

  protected async renderContent(context: RenderContext): Promise<string | null> {
    const { inputData } = context;

    // 检查是否有Mock数据 | Check for mock data
    const mockData = (inputData as Record<string, unknown>).__mock__;
    if (mockData && typeof (mockData as Record<string, unknown>).usageData === 'object') {
      return this.renderMockUsageData(
        (mockData as Record<string, unknown>).usageData as Partial<OfficialSessionData>,
        context
      );
    }

    const sessionId = inputData.sessionId;

    // 如果有官方数据，更新存储 | If official data available, update storage
    if (inputData.cost) {
      try {
        await updateCostFromInput(inputData);
      } catch (error) {
        console.error('Failed to update cost data:', error);
      }
    }

    // 检查是否使用conversation模式 | Check if using conversation mode
    if (sessionId && this.usageConfig.display_mode === 'conversation') {
      // 使用conversation模式，显示跨session累加成本 | Use conversation mode, display cross-session cumulative cost
      return await this.renderConversationCost(sessionId);
    }

    // 非conversation模式，使用官方数据或无数据 | Non-conversation mode, use official data or no data
    if (inputData.cost) {
      return this.formatOfficialUsageDisplay(inputData);
    }

    return this.renderNoData();
  }

  /**
   * 渲染Mock数据 | Render mock data
   */
  private renderMockUsageData(
    mockUsageData: Partial<OfficialSessionData>,
    _context: RenderContext
  ): string | null {
    const defaultUsage: OfficialSessionData = {
      session_id: 'mock-session',
      transcript_path: '/mock/path',
      cwd: '/mock/cwd',
      model: {
        id: 'claude-sonnet-4-20250514',
        display_name: 'Sonnet 4',
      },
      workspace: {
        current_dir: '/mock/cwd',
        project_dir: '/mock/cwd',
      },
      version: '1.0.88',
      output_style: {
        name: 'default',
      },
      cost: {
        total_cost_usd: 0.1234,
        total_duration_ms: 120000,
        total_api_duration_ms: 30000,
        total_lines_added: 25,
        total_lines_removed: 8,
      },
      exceeds_200k_tokens: false,
      ...mockUsageData,
    };

    return this.formatOfficialUsageDisplay(defaultUsage);
  }

  /**
   * 渲染无数据状态 | Render no data state
   */
  private renderNoData(): string | null {
    const icon = this.getIcon('usage');
    return this.formatOutput(icon, '$0.00', 'gray');
  }

  /**
   * 格式化官方使用信息显示 | Format official usage info display
   */
  private formatOfficialUsageDisplay(data: any): string {
    const icon = this.getIcon('usage');
    const displayText = this.buildOfficialDisplayText(data);
    const color = this.getUsageColor(data.cost?.total_cost_usd || 0);

    return this.formatOutput(icon, displayText, color);
  }

  /**
   * 构建官方数据显示文本 | Build official data display text
   */
  private buildOfficialDisplayText(data: any): string {
    const { display_mode, precision, show_lines_added, show_lines_removed } = this.usageConfig;
    const cost = data.cost?.total_cost_usd || 0;
    const linesAdded = data.cost?.total_lines_added || 0;
    const linesRemoved = data.cost?.total_lines_removed || 0;

    let text = this.formatCost(cost, precision);

    // 根据显示模式和配置添加代码行数 | Add code lines based on display mode and config
    if (display_mode === 'conversation' && (show_lines_added || show_lines_removed)) {
      const lineParts: string[] = [];

      if (show_lines_added && linesAdded > 0) {
        lineParts.push(`+${linesAdded}`);
      }

      if (show_lines_removed && linesRemoved > 0) {
        lineParts.push(`-${linesRemoved}`);
      }

      if (lineParts.length > 0) {
        text += ` ${lineParts.join(' ')}`;
      }
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
   * 获取使用信息的颜色 | Get usage info color
   * 基于成本大小决定颜色 | Determine color based on cost amount
   */
  private getUsageColor(cost: number): string {
    // 颜色阈值 | Color thresholds
    if (cost > 1.0) {
      return 'red'; // 高成本 | High cost
    } else if (cost > 0.1) {
      return 'yellow'; // 中等成本 | Medium cost
    } else if (cost > 0) {
      return 'green'; // 低成本 | Low cost
    } else {
      return 'gray'; // 无成本 | No cost
    }
  }

  /**
   * 渲染对话级成本 | Render conversation-level cost
   * 这是同步方法，使用缓存的值 | This is sync method, uses cached value
   */
  private async renderConversationCost(sessionId: string): Promise<string | null> {
    const icon = this.getIcon('usage');

    try {
      // 使用新的conversation cost API
      const costData = await getConversationCostDisplay(sessionId);

      if (costData.cost > 0) {
        const formattedCost = `$${costData.cost.toFixed(this.usageConfig.precision)}`;
        const sessionInfo = costData.sessionCount > 1 ? ` (${costData.sessionCount} sessions)` : '';
        const displayText = `${formattedCost}${sessionInfo}`;

        return this.formatOutput(icon, displayText, 'cyan');
      }
    } catch (error) {
      console.error('Failed to load conversation cost:', error);
    }

    // 如果加载失败或没有数据，显示占位符
    return this.formatOutput(icon, '$0.00', 'gray');
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
