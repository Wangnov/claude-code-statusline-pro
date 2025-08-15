/**
 * Git模块统一导出 | Git module unified exports
 *
 * 提供完整的Git功能接口和实现
 * Provides complete Git functionality interfaces and implementations
 */

// ==================== 类型导出 ====================

export type {
  // 基础信息类型 | Basic info types
  GitBranchInfo,
  GitCacheConfig,
  // 缓存类型 | Cache types
  GitCacheItem,
  // 错误类型 | Error types
  GitError,
  GitExecOptions,
  GitExecResult,
  GitFeatureConfig,
  GitInfo,
  // 选项类型 | Option types
  GitInfoOptions,
  GitOperationStatus,
  GitRepoNotFoundError,
  // 配置类型 | Configuration types
  GitServiceConfig,
  GitStashInfo,
  GitTimeoutError,
  GitVersionInfo,
  GitWorkingStatus,
} from './types.js';

export {
  GitCacheKey,
  // 枚举类型 | Enum types
  GitOperationType,
} from './types.js';

// ==================== 服务导出 ====================

export type { GitService } from './service.js';

export {
  createGitService,
  DefaultGitService,
} from './service.js';

// 内部使用的导入 | Internal imports for use
import { createGitService } from './service.js';

// ==================== 缓存导出 ====================

export type {
  GitCache,
  GitCacheStats,
} from './cache.js';

export {
  createDefaultCacheConfig,
  createGitCache,
  MemoryGitCache,
} from './cache.js';

// ==================== 便捷工厂函数 ====================

/**
 * 创建配置好的Git服务实例 | Create configured Git service instance
 *
 * @param cwd 工作目录 | Working directory
 * @param timeout Git命令超时时间 | Git command timeout
 * @param enableCache 是否启用缓存 | Whether to enable cache
 * @returns Git服务实例 | Git service instance
 */
export function createConfiguredGitService(
  cwd: string = process.cwd(),
  timeout: number = 1000,
  enableCache: boolean = true
) {
  return createGitService({
    cwd,
    timeout,
    cache: {
      enabled: enableCache,
      duration: 5000, // 5秒缓存 | 5 seconds cache
      cacheTypes: {
        branch: true,
        status: true,
        version: true,
        stash: true,
      },
    },
    features: {
      fetchComparison: true,
      fetchStash: true,
      fetchOperation: true,
      fetchVersion: true,
    },
  });
}

/**
 * 创建轻量级Git服务实例（仅基础功能）| Create lightweight Git service instance (basic features only)
 *
 * @param cwd 工作目录 | Working directory
 * @param timeout Git命令超时时间 | Git command timeout
 * @returns Git服务实例 | Git service instance
 */
export function createLightweightGitService(cwd: string = process.cwd(), timeout: number = 1000) {
  return createGitService({
    cwd,
    timeout,
    cache: {
      enabled: true,
      duration: 3000, // 3秒缓存 | 3 seconds cache
      cacheTypes: {
        branch: true,
        status: true,
        version: false,
        stash: false,
      },
    },
    features: {
      fetchComparison: false,
      fetchStash: false,
      fetchOperation: false,
      fetchVersion: false,
    },
  });
}

/**
 * 创建高性能Git服务实例（启用所有缓存）| Create high-performance Git service instance (enable all caching)
 *
 * @param cwd 工作目录 | Working directory
 * @param timeout Git命令超时时间 | Git command timeout
 * @returns Git服务实例 | Git service instance
 */
export function createHighPerformanceGitService(
  cwd: string = process.cwd(),
  timeout: number = 2000
) {
  return createGitService({
    cwd,
    timeout,
    cache: {
      enabled: true,
      duration: 10000, // 10秒缓存 | 10 seconds cache
      cacheTypes: {
        branch: true,
        status: true,
        version: true,
        stash: true,
      },
    },
    features: {
      fetchComparison: true,
      fetchStash: true,
      fetchOperation: true,
      fetchVersion: true,
    },
  });
}
