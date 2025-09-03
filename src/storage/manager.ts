/**
 * Storage Manager for statusline-pro
 * 存储管理器 - 负责配置和成本数据的持久化
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ConversationCost, SessionCost, StorageConfig, StoragePaths } from './types.js';

export class StorageManager {
  private config: StorageConfig;
  private paths: StoragePaths;

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      enableConversationTracking: true,
      costDisplayMode: 'conversation',
      enableCostPersistence: true,
      storagePath: path.join(os.homedir(), '.claude'),
      autoCleanupDays: 30,
      ...config,
    };

    this.paths = this.initializePaths();
    this.ensureDirectories();
  }

  /**
   * Initialize storage paths based on current project
   * 初始化存储路径
   */
  private initializePaths(): StoragePaths {
    const basePath = this.config.storagePath!;
    const projectPath = process.cwd();
    const projectHash = this.hashPath(projectPath);

    return {
      userConfigDir: path.join(basePath, 'statusline-pro'),
      projectConfigDir: path.join(basePath, 'projects', projectHash, 'statusline-pro'),
      sessionsDir: path.join(basePath, 'projects', projectHash, 'statusline-pro', 'sessions'),
      userConfigPath: path.join(basePath, 'statusline-pro', 'config.toml'),
      projectConfigPath: path.join(
        basePath,
        'projects',
        projectHash,
        'statusline-pro',
        'config.toml'
      ),
    };
  }

  /**
   * Hash project path to create unique directory name
   * 哈希项目路径生成唯一目录名
   */
  private hashPath(projectPath: string): string {
    // Use the same format as Claude Code
    // Replace path separators and special characters
    return projectPath.replace(/[\\/:]/g, '-').replace(/^-+|-+$/g, '');
  }

  /**
   * Ensure all required directories exist
   * 确保所有必需的目录存在
   */
  private ensureDirectories(): void {
    const dirs = [this.paths.userConfigDir, this.paths.projectConfigDir, this.paths.sessionsDir];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Save session cost data
   * 保存会话成本数据
   */
  async saveSessionCost(cost: SessionCost): Promise<void> {
    if (!this.config.enableCostPersistence) {
      return;
    }

    const sessionPath = path.join(this.paths.sessionsDir, `${cost.sessionId}.json`);
    await fs.promises.writeFile(sessionPath, JSON.stringify(cost, null, 2), 'utf-8');
  }

  /**
   * Load session cost data
   * 加载会话成本数据
   */
  async loadSessionCost(sessionId: string): Promise<SessionCost | null> {
    const sessionPath = path.join(this.paths.sessionsDir, `${sessionId}.json`);

    if (!fs.existsSync(sessionPath)) {
      return null;
    }

    try {
      const data = await fs.promises.readFile(sessionPath, 'utf-8');
      return JSON.parse(data) as SessionCost;
    } catch {
      return null;
    }
  }

  /**
   * Find parent session from JSONL files
   * 从JSONL文件中查找父会话
   */
  async findParentSession(sessionId: string): Promise<string | null> {
    const projectsDir = path.join(this.config.storagePath!, 'projects');
    const projectHash = this.hashPath(process.cwd());
    const jsonlDir = path.join(projectsDir, projectHash);

    // Look for JSONL file with this sessionId
    const jsonlPath = path.join(jsonlDir, `${sessionId}.jsonl`);

    if (!fs.existsSync(jsonlPath)) {
      return null;
    }

    try {
      const content = await fs.promises.readFile(jsonlPath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      // Parse each line to find different sessionIds
      const sessionIds = new Set<string>();
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.sessionId && entry.sessionId !== sessionId) {
            sessionIds.add(entry.sessionId);
          }
        } catch {
          // Skip invalid JSON lines
        }
      }

      // Return the first different sessionId as parent
      if (sessionIds.size > 0) {
        return Array.from(sessionIds)[0];
      }
    } catch {
      // Error reading file
    }

    return null;
  }

  /**
   * Load conversation cost by tracing session chain
   * 通过追踪会话链加载对话成本
   */
  async loadConversationCost(currentSessionId: string): Promise<ConversationCost> {
    const sessionChain: SessionCost[] = [];
    const visitedSessions = new Set<string>();

    // Trace back through session chain
    let sessionId: string | null = currentSessionId;

    while (sessionId && !visitedSessions.has(sessionId)) {
      visitedSessions.add(sessionId);

      // Load this session's cost
      const sessionCost = await this.loadSessionCost(sessionId);
      if (sessionCost) {
        sessionChain.unshift(sessionCost); // Add to beginning for chronological order
        sessionId = sessionCost.parentSessionId || null;
      } else {
        // Try to find parent from JSONL
        sessionId = await this.findParentSession(sessionId);
      }
    }

    // Aggregate costs
    const aggregated: ConversationCost = {
      sessionIds: sessionChain.map((s) => s.sessionId),
      totalCostUsd: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalLinesAdded: 0,
      totalLinesRemoved: 0,
      startTime: sessionChain[0]?.startTime || new Date().toISOString(),
      lastUpdateTime:
        sessionChain[sessionChain.length - 1]?.lastUpdateTime || new Date().toISOString(),
      sessionCount: sessionChain.length,
    };

    for (const session of sessionChain) {
      aggregated.totalCostUsd += session.totalCostUsd;
      aggregated.totalInputTokens += session.inputTokens;
      aggregated.totalOutputTokens += session.outputTokens;
      aggregated.totalLinesAdded += session.linesAdded;
      aggregated.totalLinesRemoved += session.linesRemoved;
    }

    return aggregated;
  }

  /**
   * Update session cost from Claude Code input data
   * 从Claude Code输入数据更新会话成本
   */
  async updateSessionCost(inputData: any): Promise<void> {
    if (!this.config.enableCostPersistence || !inputData.sessionId) {
      return;
    }

    const sessionId = inputData.sessionId || inputData.session_id;

    // Load existing cost or create new
    let sessionCost = await this.loadSessionCost(sessionId);

    if (!sessionCost) {
      // Find parent session if this is a new session
      const parentSessionId = await this.findParentSession(sessionId);

      sessionCost = {
        sessionId,
        parentSessionId: parentSessionId || undefined,
        projectPath: process.cwd(),
        totalCostUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
        linesAdded: 0,
        linesRemoved: 0,
        startTime: new Date().toISOString(),
        lastUpdateTime: new Date().toISOString(),
      };
    }

    // Update with new data
    if (inputData.cost) {
      sessionCost.totalCostUsd = inputData.cost.total_cost_usd || sessionCost.totalCostUsd;
      sessionCost.linesAdded = inputData.cost.total_lines_added || sessionCost.linesAdded;
      sessionCost.linesRemoved = inputData.cost.total_lines_removed || sessionCost.linesRemoved;
    }

    if (inputData.model) {
      sessionCost.model = {
        id: inputData.model.id,
        displayName: inputData.model.display_name || inputData.model.id,
      };
    }

    sessionCost.lastUpdateTime = new Date().toISOString();

    // Save updated cost
    await this.saveSessionCost(sessionCost);
  }

  /**
   * Get cost based on configured display mode
   * 根据配置的显示模式获取成本
   */
  async getCost(sessionId: string): Promise<{ cost: number; mode: 'session' | 'conversation' }> {
    if (this.config.costDisplayMode === 'conversation' && this.config.enableConversationTracking) {
      const conversationCost = await this.loadConversationCost(sessionId);
      return {
        cost: conversationCost.totalCostUsd,
        mode: 'conversation',
      };
    }

    const sessionCost = await this.loadSessionCost(sessionId);
    return {
      cost: sessionCost?.totalCostUsd || 0,
      mode: 'session',
    };
  }

  /**
   * Clean up old session data
   * 清理旧会话数据
   */
  async cleanupOldSessions(): Promise<void> {
    if (this.config.autoCleanupDays === undefined || this.config.autoCleanupDays === null) {
      return;
    }

    // If autoCleanupDays is 0, don't cleanup (disable feature)
    // Use a negative value to cleanup immediately for testing
    if (this.config.autoCleanupDays === 0) {
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Math.abs(this.config.autoCleanupDays));

    // Ensure directory exists before trying to read it
    if (!fs.existsSync(this.paths.sessionsDir)) {
      return;
    }

    const files = await fs.promises.readdir(this.paths.sessionsDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(this.paths.sessionsDir, file);

      try {
        const stats = await fs.promises.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.promises.unlink(filePath);
        }
      } catch (error) {
        // Skip files that can't be accessed
        console.warn(`Failed to process file ${filePath}:`, error);
      }
    }
  }

  /**
   * Get storage paths
   * 获取存储路径
   */
  getPaths(): StoragePaths {
    return { ...this.paths };
  }

  /**
   * Get storage config
   * 获取存储配置
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const storageManager = new StorageManager();
