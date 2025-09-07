import https from 'https';

/**
 * 最近请求详情
 */
export interface RecentRequestDetail {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  cost: number;
  timestamp: string;
}

/**
 * YesCode中转站服务
 * 获取今日使用额度和最近请求详情
 */
export class YesCodeService {
  private static instance: YesCodeService | null = null;

  /**
   * 获取单例
   */
  static getInstance(): YesCodeService {
    if (!YesCodeService.instance) {
      YesCodeService.instance = new YesCodeService();
    }
    return YesCodeService.instance;
  }

  /**
   * 检查是否使用YesCode
   */
  isEnabled(): boolean {
    const baseUrl = process.env.ANTHROPIC_BASE_URL;
    return baseUrl?.includes('co.yes.vg') || false;
  }

  /**
   * 获取今日消费
   */
  async getTodaySpending(): Promise<number | null> {
    // 检查是否启用
    if (!this.isEnabled()) {
      return null;
    }

    const apiKey = process.env.ANTHROPIC_AUTH_TOKEN;
    if (!apiKey) {
      return null;
    }

    try {
      const data = await this.fetchUsageData(apiKey, 100);
      return this.calculateTodaySpending(data);
    } catch (error) {
      console.error('Failed to fetch YesCode usage:', error);
      return null;
    }
  }

  /**
   * 获取最近请求详情
   */
  async getRecentRequest(): Promise<RecentRequestDetail | null> {
    // 检查是否启用
    if (!this.isEnabled()) {
      return null;
    }

    const apiKey = process.env.ANTHROPIC_AUTH_TOKEN;
    if (!apiKey) {
      return null;
    }

    try {
      // 获取最近1条记录
      const data = await this.fetchUsageData(apiKey, 1);
      return this.extractRecentRequest(data);
    } catch (error) {
      console.error('Failed to fetch recent request:', error);
      return null;
    }
  }

  /**
   * 请求API数据（支持指定limit）
   */
  private fetchUsageData(apiKey: string, limit: number = 100): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'co.yes.vg',
        path: `/team/stats/usage?period=today&limit=${limit}`,
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }

  /**
   * 计算今日总消费
   */
  private calculateTodaySpending(data: any): number {
    if (!data?.summary || !Array.isArray(data.summary)) {
      return 0;
    }

    // 汇总所有模型的成本
    return data.summary.reduce((total: number, item: any) => {
      return total + (item.total_cost || 0);
    }, 0);
  }

  /**
   * 获取最近请求详情
   */
  async getRecentRequest(): Promise<RecentRequestDetail | null> {
    // 检查是否启用
    if (!this.isEnabled()) {
      return null;
    }

    const apiKey = process.env.ANTHROPIC_AUTH_TOKEN;
    if (!apiKey) {
      return null;
    }

    try {
      // 获取最近1条记录
      const data = await this.fetchUsageData(apiKey, 1);
      return this.extractRecentRequest(data);
    } catch (error) {
      console.error('Failed to fetch recent request:', error);
      return null;
    }
  }

  /**
   * 请求API数据（支持指定limit）
   */
  private fetchUsageData(apiKey: string, limit: number = 100): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'co.yes.vg',
        path: `/team/stats/usage?period=today&limit=${limit}`,
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }

  /**
   * 提取最近请求信息
   */
  private extractRecentRequest(data: any): RecentRequestDetail | null {
    if (!data?.usage || !Array.isArray(data.usage) || data.usage.length === 0) {
      return null;
    }

    const recent = data.usage[0];
    return {
      model: recent.model || 'unknown',
      inputTokens: recent.input_tokens || 0,
      outputTokens: recent.output_tokens || 0,
      cacheCreationTokens: recent.cache_creation_tokens || 0,
      cacheReadTokens: recent.cache_read_tokens || 0,
      cost: recent.cost || 0,
      timestamp: recent.created_at || new Date().toISOString()
    };
  }
}