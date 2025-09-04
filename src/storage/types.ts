/**
 * Storage system types for statusline-pro
 * 存储系统类型定义
 */

/**
 * Session cost data structure
 * 会话成本数据结构
 */
export interface SessionCost {
  /** Session ID */
  sessionId: string;
  /** Parent session ID for conversation chain tracking */
  parentSessionId?: string | undefined;
  /** Project path */
  projectPath: string;
  /** Total cost in USD */
  totalCostUsd: number;
  /** Total input tokens */
  inputTokens: number;
  /** Total output tokens */
  outputTokens: number;
  /** Total lines added */
  linesAdded: number;
  /** Total lines removed */
  linesRemoved: number;
  /** Session start time */
  startTime: string;
  /** Last update time */
  lastUpdateTime: string;
  /** Model information */
  model?: {
    id: string;
    displayName: string;
  };
}

/**
 * Conversation cost aggregation
 * 对话成本聚合
 */
export interface ConversationCost {
  /** All session IDs in this conversation */
  sessionIds: string[];
  /** Total cost across all sessions */
  totalCostUsd: number;
  /** Total input tokens */
  totalInputTokens: number;
  /** Total output tokens */
  totalOutputTokens: number;
  /** Total lines added */
  totalLinesAdded: number;
  /** Total lines removed */
  totalLinesRemoved: number;
  /** Conversation start time */
  startTime: string;
  /** Last update time */
  lastUpdateTime: string;
  /** Number of sessions in chain */
  sessionCount: number;
}

/**
 * Storage configuration
 * 存储配置
 */
export interface StorageConfig {
  /** Enable conversation-level cost tracking */
  enableConversationTracking: boolean;
  /** Storage directory path (default: ~/.claude) */
  storagePath?: string | undefined;
  /** Enable cost persistence */
  enableCostPersistence: boolean;
  /** Auto-cleanup old sessions (days) */
  autoCleanupDays?: number | undefined;
}

/**
 * Storage paths
 * 存储路径
 */
export interface StoragePaths {
  /** User-level config directory */
  userConfigDir: string;
  /** Project-level config directory */
  projectConfigDir: string;
  /** Sessions data directory */
  sessionsDir: string;
  /** User config file path */
  userConfigPath: string;
  /** Project config file path */
  projectConfigPath: string;
}
