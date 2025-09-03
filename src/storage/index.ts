/**
 * Storage system for statusline-pro
 * 存储系统主模块
 */

export { EnhancedConfigLoader, enhancedConfigLoader } from './config-loader-enhanced.js';
export { StorageManager, storageManager } from './manager.js';
export { SessionTracker, sessionTracker } from './session-tracker.js';
export * from './types.js';

import { enhancedConfigLoader } from './config-loader-enhanced.js';
import { storageManager } from './manager.js';
import { sessionTracker } from './session-tracker.js';

/**
 * Initialize storage system
 * 初始化存储系统
 */
export async function initializeStorage(): Promise<void> {
  // Load configuration
  const config = await enhancedConfigLoader.loadConfig();

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
 * Get cost display for current session
 * 获取当前会话的成本显示
 */
export async function getCostDisplay(sessionId: string): Promise<{
  cost: number;
  mode: 'session' | 'conversation';
  sessionCount?: number;
}> {
  const config = storageManager.getConfig();

  if (config.costDisplayMode === 'conversation' && config.enableConversationTracking) {
    // Get conversation chain
    const chainInfo = await sessionTracker.getCompleteConversationChain(sessionId);

    // Calculate cost from token usage
    const cost = sessionTracker.calculateTokenCost(chainInfo.tokenUsage);

    return {
      cost,
      mode: 'conversation',
      sessionCount: chainInfo.sessionIds.length,
    };
  }

  // Fall back to session mode
  const result = await storageManager.getCost(sessionId);
  return {
    ...result,
    sessionCount: 1,
  };
}

/**
 * Update cost from Claude Code input data
 * 从Claude Code输入数据更新成本
 */
export async function updateCostFromInput(inputData: any): Promise<void> {
  await storageManager.updateSessionCost(inputData);
}
