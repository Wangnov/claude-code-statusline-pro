/**
 * Storage system for statusline-pro
 * 存储系统主模块
 */

export { StorageManager, storageManager } from './manager.js';
export { SessionTracker, sessionTracker } from './session-tracker.js';
export * from './types.js';

import { configLoader } from '../config/loader.js';
import { storageManager } from './manager.js';

/**
 * Initialize storage system
 * 初始化存储系统
 */
export async function initializeStorage(projectId?: string): Promise<void> {
  // Update project ID if provided
  if (projectId) {
    storageManager.updateProjectId(projectId);
  }

  // Load configuration
  const config = await configLoader.loadConfig();

  // Initialize storage manager with config
  if (config && typeof config === 'object' && 'storage' in config) {
    const storageConfig = (config as any).storage;
    // Storage manager is already initialized as singleton
    // Just update its config if needed
    Object.assign(storageManager.getConfig(), storageConfig);
  }

  // Clean up old sessions if configured
  await storageManager.cleanupOldSessions();
}

/**
 * Get session cost display (单session模式)
 * 获取当前session的成本显示
 */
export async function getSessionCostDisplay(sessionId: string): Promise<number> {
  return await storageManager.getSessionCost(sessionId);
}

/**
 * Get conversation cost display (对话级模式)
 * 获取跨session累加的成本显示
 */
export async function getConversationCostDisplay(sessionId: string): Promise<{
  cost: number;
  sessionCount: number;
}> {
  const conversationCost = await storageManager.getConversationCost(sessionId);

  return {
    cost: conversationCost.totalCostUsd,
    sessionCount: conversationCost.sessionCount,
  };
}

/**
 * Update cost from Claude Code input data
 * 从Claude Code输入数据更新成本
 */
export async function updateCostFromInput(inputData: any): Promise<void> {
  await storageManager.updateSessionCost(inputData);
}
