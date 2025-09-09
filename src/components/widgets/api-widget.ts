/**
 * API小组件 | API widget
 * 通过HTTP API获取数据并渲染 | Fetches data via HTTP API and renders it
 */

import { BaseWidget } from './base-widget.js';
import type { WidgetConfig } from '../../config/schema.js';
import type { TerminalCapabilities } from '../../terminal/detector.js';

/**
 * API小组件类 | API widget class
 */
export class ApiWidget extends BaseWidget {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_TTL = 5000; // 5秒缓存 | 5-second cache
  
  constructor(config: WidgetConfig, capabilities: TerminalCapabilities) {
    super(config, capabilities);
    
    // 验证配置 | Validate configuration
    if (config.type !== 'api') {
      throw new Error(`API小组件配置类型错误: ${config.type}`);
    }
    
    if (!config.api) {
      throw new Error('API小组件必须提供api配置');
    }
    
    if (!config.template) {
      throw new Error('API小组件必须提供template配置');
    }
  }
  
  /**
   * 渲染API内容 | Render API content
   */
  protected async renderContent(_context?: any): Promise<string | null> {
    try {
      // 获取API数据 | Fetch API data
      const extractedData = await this.fetchApiData();
      
      // 将提取的数据包装成对象以支持模板字段引用
      // Wrap extracted data into an object to support template field references
      const templateData = this.wrapDataForTemplate(extractedData);
      
      // 使用模板渲染 | Render with template
      const rendered = this.renderTemplate(this.config.template!, templateData);
      
      return rendered || null;
    } catch (error) {
      console.warn(`API小组件请求失败:`, error);
      return null; // 失败时不显示 | Don't display on failure
    }
  }
  
  /**
   * 获取API数据 | Fetch API data
   */
  private async fetchApiData(): Promise<any> {
    const apiConfig = this.config.api!;
    const cacheKey = this.buildCacheKey();
    
    // 检查缓存 | Check cache
    const cached = ApiWidget.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < ApiWidget.CACHE_TTL)) {
      return cached.data;
    }
    
    // 构建请求URL | Build request URL
    const url = this.buildRequestUrl();
    
    // 构建请求选项 | Build request options
    const requestOptions = this.buildRequestOptions();
    
    // 发起请求 | Make request
    const response = await this.makeHttpRequest(url, requestOptions);
    
    // 解析响应 | Parse response
    const jsonData = await response.json();
    
    // 提取数据 | Extract data
    const extractedData = this.extractData(jsonData, apiConfig.data_path);
    
    // 缓存结果 | Cache result
    ApiWidget.cache.set(cacheKey, {
      data: extractedData,
      timestamp: Date.now(),
    });
    
    return extractedData;
  }
  
  /**
   * 构建缓存键 | Build cache key
   */
  private buildCacheKey(): string {
    const apiConfig = this.config.api!;
    const parts = [
      apiConfig.base_url,
      apiConfig.endpoint,
      apiConfig.method,
      JSON.stringify(apiConfig.headers),
    ];
    return parts.join('|');
  }
  
  /**
   * 构建请求URL | Build request URL
   */
  private buildRequestUrl(): string {
    const apiConfig = this.config.api!;
    const baseUrl = apiConfig.base_url.replace(/\/$/, ''); // 移除末尾斜杠
    const endpoint = apiConfig.endpoint.replace(/^\//, ''); // 移除开头斜杠
    return `${baseUrl}/${endpoint}`;
  }
  
  /**
   * 构建请求选项 | Build request options
   */
  private buildRequestOptions(): RequestInit {
    const apiConfig = this.config.api!;
    
    return {
      method: apiConfig.method,
      headers: {
        'User-Agent': 'Claude-Code-Statusline/1.0',
        ...apiConfig.headers,
      },
      // 添加超时控制 | Add timeout control
      signal: AbortSignal.timeout(apiConfig.timeout),
    };
  }
  
  /**
   * 发起HTTP请求 | Make HTTP request
   */
  private async makeHttpRequest(url: string, options: RequestInit): Promise<Response> {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP请求失败: ${response.status} ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('请求超时');
        }
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          throw new Error('网络请求失败，请检查网络连接');
        }
      }
      throw error;
    }
  }
  
  /**
   * 使用JSONPath提取数据 | Extract data using JSONPath
   */
  private extractData(jsonData: any, dataPath: string): any {
    try {
      // 简单的JSONPath实现，支持基本的点表示法和数组索引
      // Simple JSONPath implementation supporting basic dot notation and array indexing
      return this.evaluateJsonPath(jsonData, dataPath);
    } catch (error) {
      throw new Error(`数据提取失败: ${dataPath} - ${error}`);
    }
  }
  
  /**
   * 将提取的数据包装为模板可用格式 | Wrap extracted data for template use
   */
  private wrapDataForTemplate(extractedData: any): any {
    // 如果提取的数据是原始值（非对象），需要推断字段名
    if (extractedData !== null && typeof extractedData !== 'object') {
      // 从JSONPath推断字段名 | Infer field name from JSONPath
      const dataPath = this.config.api!.data_path;
      const fieldName = this.extractFieldNameFromPath(dataPath);
      
      // 包装成对象 | Wrap as object
      const wrapped = { [fieldName]: extractedData };
      return wrapped;
    }
    
    // 如果已经是对象，直接返回 | If already an object, return directly
    return extractedData;
  }
  
  /**
   * 从JSONPath中提取字段名 | Extract field name from JSONPath
   */
  private extractFieldNameFromPath(dataPath: string): string {
    // 移除$前缀 | Remove $ prefix
    const normalized = dataPath.replace(/^\$\.?/, '');
    
    // 提取最后一个字段名 | Extract last field name
    const segments = normalized.split(/[.\[\]]/).filter(Boolean);
    return segments[segments.length - 1] || 'value';
  }
  
  /**
   * 评估JSONPath表达式 | Evaluate JSONPath expression
   */
  private evaluateJsonPath(data: any, path: string): any {
    if (!path || path === '$') return data;
    
    // 移除开头的$符号 | Remove leading $ symbol
    const normalizedPath = path.replace(/^\$\.?/, '');
    if (!normalizedPath) return data;
    
    const segments = normalizedPath.split(/[\.\[]/);
    let current = data;
    
    for (const segment of segments) {
      if (!segment) continue;
      
      // 处理数组索引：[0] 或 0]
      if (segment.endsWith(']')) {
        const index = parseInt(segment.replace(']', ''), 10);
        if (isNaN(index)) {
          throw new Error(`无效的数组索引: ${segment}`);
        }
        
        if (!Array.isArray(current)) {
          throw new Error(`尝试在非数组对象上使用索引: ${segment}`);
        }
        
        current = current[index];
      } else {
        // 普通属性访问
        if (current == null || typeof current !== 'object') {
          throw new Error(`无法访问属性 '${segment}' 在 ${typeof current} 类型上`);
        }
        
        current = current[segment];
      }
      
      if (current === undefined) {
        throw new Error(`路径不存在: ${segment}`);
      }
    }
    
    return current;
  }
  
  /**
   * 清除缓存 | Clear cache
   */
  static clearCache(): void {
    ApiWidget.cache.clear();
  }
  
  /**
   * 清理过期缓存 | Clean expired cache
   */
  static cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, item] of ApiWidget.cache.entries()) {
      if (now - item.timestamp > ApiWidget.CACHE_TTL) {
        ApiWidget.cache.delete(key);
      }
    }
  }
}