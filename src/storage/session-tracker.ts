/**
 * Session Tracker for conversation chain analysis
 * 会话追踪器 - 分析对话链
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

/**
 * JSONL entry structure from Claude Code
 * Claude Code的JSONL条目结构
 */
interface JsonlEntry {
  sessionId?: string;
  session_id?: string;
  type?: string;
  message?: {
    role?: string;
    content?: any;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  timestamp?: string;
  parentUuid?: string;
  uuid?: string;
}

/**
 * Token usage statistics
 * Token使用统计
 */
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  totalTokens: number;
}

/**
 * Session chain info
 * 会话链信息
 */
export interface SessionChainInfo {
  sessionIds: string[];
  currentSessionId: string;
  parentSessionIds: string[];
  tokenUsage: TokenUsage;
  messageCount: number;
  startTime?: string | undefined;
  lastUpdateTime?: string | undefined;
}

export class SessionTracker {
  private claudeBasePath: string;

  constructor(claudeBasePath?: string) {
    this.claudeBasePath = claudeBasePath || path.join(os.homedir(), '.claude');
  }

  /**
   * Hash project path to match Claude Code's format
   * 哈希项目路径以匹配Claude Code的格式
   * macOS: /Users/name/project -> -Users-name-project
   * Windows: C:\User\name\project -> C-User-name-project
   */
  private hashProjectPath(projectPath: string): string {
    // 1. 替换所有路径分隔符为连字符
    let result = projectPath.replace(/[\\/:]/g, '-');

    // 2. 清理多个连续连字符为单个连字符
    result = result.replace(/-+/g, '-');

    // 3. 移除结尾的连字符，但保留开头的连字符 (macOS以/开头会产生开头的-)
    result = result.replace(/-+$/, '');

    return result;
  }

  /**
   * Find JSONL file for a session
   * 查找会话的JSONL文件
   */
  private findJsonlFile(sessionId: string): string | null {
    const projectHash = this.hashProjectPath(process.cwd());
    const projectDir = path.join(this.claudeBasePath, 'projects', projectHash);
    const jsonlPath = path.join(projectDir, `${sessionId}.jsonl`);

    if (fs.existsSync(jsonlPath)) {
      return jsonlPath;
    }

    return null;
  }

  /**
   * Parse JSONL file and extract session chain
   * 解析JSONL文件并提取会话链
   */
  async parseSessionChain(sessionId: string): Promise<SessionChainInfo | null> {
    const jsonlPath = this.findJsonlFile(sessionId);

    if (!jsonlPath) {
      return null;
    }

    const sessionIds = new Set<string>();
    const tokenUsage: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheTokens: 0,
      totalTokens: 0,
    };

    let messageCount = 0;
    let startTime: string | undefined;
    let lastUpdateTime: string | undefined;

    try {
      const fileStream = fs.createReadStream(jsonlPath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        if (!line.trim()) continue;

        try {
          const entry: JsonlEntry = JSON.parse(line);

          // Extract session ID
          const entrySessionId = entry.sessionId || entry.session_id;
          if (entrySessionId) {
            sessionIds.add(entrySessionId);
          }

          // Extract timestamps
          if (entry.timestamp) {
            if (!startTime) {
              startTime = entry.timestamp;
            }
            lastUpdateTime = entry.timestamp;
          }

          // Count messages and extract token usage
          if (entry.type === 'assistant' && entry.message) {
            messageCount++;

            if (entry.message.usage) {
              const usage = entry.message.usage;
              tokenUsage.inputTokens += usage.input_tokens || 0;
              tokenUsage.outputTokens += usage.output_tokens || 0;
              tokenUsage.cacheTokens +=
                (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
            }
          }
        } catch {
          // Skip invalid JSON lines
        }
      }

      tokenUsage.totalTokens = tokenUsage.inputTokens + tokenUsage.outputTokens;

      // Build session chain info
      const sessionIdArray = Array.from(sessionIds);
      const currentSession = sessionIdArray[sessionIdArray.length - 1] || sessionId;
      const parentSessions = sessionIdArray.slice(0, -1);

      return {
        sessionIds: sessionIdArray,
        currentSessionId: currentSession,
        parentSessionIds: parentSessions,
        tokenUsage,
        messageCount,
        startTime,
        lastUpdateTime,
      };
    } catch (error) {
      console.error(`Error parsing JSONL file: ${error}`);
      return null;
    }
  }

  /**
   * Calculate token cost based on model pricing
   * 根据模型定价计算token成本
   */
  calculateTokenCost(tokenUsage: TokenUsage, modelId: string = 'claude-3-sonnet'): number {
    // Pricing per million tokens (approximate)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-opus': { input: 15, output: 75 },
      'claude-3-sonnet': { input: 3, output: 15 },
      'claude-3-haiku': { input: 0.25, output: 1.25 },
      'claude-opus-4-1': { input: 15, output: 75 },
      default: { input: 3, output: 15 },
    };

    const modelPricing = pricing[modelId] || pricing.default;
    if (!modelPricing) {
      throw new Error(`Invalid model pricing configuration for ${modelId}`);
    }

    // Calculate cost in USD
    const inputCost = (tokenUsage.inputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (tokenUsage.outputTokens / 1_000_000) * modelPricing.output;

    // Cache tokens are usually cheaper (50% of input cost)
    const cacheCost = (tokenUsage.cacheTokens / 1_000_000) * (modelPricing.input * 0.5);

    return inputCost + outputCost + cacheCost;
  }

  /**
   * Get complete conversation chain by recursively checking parent sessions
   * 递归检查父会话获取完整对话链
   */
  async getCompleteConversationChain(currentSessionId: string): Promise<SessionChainInfo> {
    const allSessions: string[] = [];
    const visitedSessions = new Set<string>();
    const aggregatedUsage: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheTokens: 0,
      totalTokens: 0,
    };

    let totalMessages = 0;
    let conversationStartTime: string | undefined;
    let conversationLastUpdate: string | undefined;

    // Recursively trace back through sessions
    const traceSession = async (sessionId: string) => {
      if (visitedSessions.has(sessionId)) return;
      visitedSessions.add(sessionId);

      const chainInfo = await this.parseSessionChain(sessionId);
      if (!chainInfo) return;

      // Add all session IDs from this file
      for (const sid of chainInfo.sessionIds) {
        if (!allSessions.includes(sid)) {
          allSessions.unshift(sid); // Add to beginning for chronological order
        }
      }

      // Aggregate token usage
      aggregatedUsage.inputTokens += chainInfo.tokenUsage.inputTokens;
      aggregatedUsage.outputTokens += chainInfo.tokenUsage.outputTokens;
      aggregatedUsage.cacheTokens += chainInfo.tokenUsage.cacheTokens;
      totalMessages += chainInfo.messageCount;

      // Update timestamps
      if (
        chainInfo.startTime &&
        (!conversationStartTime || chainInfo.startTime < conversationStartTime)
      ) {
        conversationStartTime = chainInfo.startTime;
      }
      if (
        chainInfo.lastUpdateTime &&
        (!conversationLastUpdate || chainInfo.lastUpdateTime > conversationLastUpdate)
      ) {
        conversationLastUpdate = chainInfo.lastUpdateTime;
      }

      // Recursively check parent sessions
      for (const parentId of chainInfo.parentSessionIds) {
        if (parentId && parentId !== sessionId) {
          await traceSession(parentId);
        }
      }
    };

    await traceSession(currentSessionId);

    aggregatedUsage.totalTokens = aggregatedUsage.inputTokens + aggregatedUsage.outputTokens;

    return {
      sessionIds: allSessions,
      currentSessionId,
      parentSessionIds: allSessions.filter((id) => id !== currentSessionId),
      tokenUsage: aggregatedUsage,
      messageCount: totalMessages,
      startTime: conversationStartTime,
      lastUpdateTime: conversationLastUpdate,
    };
  }
}

// Export singleton instance
export const sessionTracker = new SessionTracker();
