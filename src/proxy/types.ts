/**
 * 中转站服务类型定义
 */

/**
 * YesCode使用统计汇总
 */
export interface YesCodeUsageSummary {
  model: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_cost: number;
}

/**
 * YesCode使用统计响应
 */
export interface YesCodeUsageResponse {
  limit: number;
  offset: number;
  period: string;
  summary: YesCodeUsageSummary[];
  total_count: number;
  usage: any[];
}

/**
 * YesCode消费限额响应
 */
export interface YesCodeSpendingResponse {
  daily_spending: number;
  monthly_spending: number;
  total_spending: number;
  daily_limit: number;
  daily_remaining: number;
  team_daily_limit: number;
  team_daily_spending: number;
  team_daily_remaining: number;
}

/**
 * 中转站统计数据
 */
export interface ProxyStats {
  provider: 'yescode' | 'openrouter' | 'custom';
  totalCost: number;
  todayCost: number;
  monthCost: number;
  dailyLimit?: number;
  dailyRemaining?: number;
  modelStats?: Array<{
    model: string;
    requests: number;
    cost: number;
  }>;
}

/**
 * 中转站服务接口
 */
export interface ProxyService {
  /**
   * 获取统计数据
   */
  getStats(): Promise<ProxyStats | null>;
  
  /**
   * 检查是否为该中转站
   */
  isEnabled(): boolean;
}