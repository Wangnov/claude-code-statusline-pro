/**
 * Git缓存机制实现 | Git cache mechanism implementation
 *
 * 提供高效的Git信息缓存，避免重复执行Git命令
 * Provides efficient Git information caching to avoid repeated Git command execution
 */

import type { GitCacheConfig, GitCacheItem } from './types.js';
import { GitCacheKey } from './types.js';

/**
 * Git缓存接口 | Git cache interface
 */
export interface GitCache {
  /**
   * 获取缓存项 | Get cache item
   * @param key 缓存键 | Cache key
   * @returns 缓存的数据或undefined | Cached data or undefined
   */
  get<T>(key: GitCacheKey): T | undefined;

  /**
   * 设置缓存项 | Set cache item
   * @param key 缓存键 | Cache key
   * @param data 要缓存的数据 | Data to cache
   * @param duration 缓存时长（毫秒），可选 | Cache duration in milliseconds, optional
   */
  set<T>(key: GitCacheKey, data: T, duration?: number): void;

  /**
   * 检查缓存项是否存在且有效 | Check if cache item exists and is valid
   * @param key 缓存键 | Cache key
   * @returns 是否有效 | Whether valid
   */
  has(key: GitCacheKey): boolean;

  /**
   * 删除缓存项 | Delete cache item
   * @param key 缓存键 | Cache key
   */
  delete(key: GitCacheKey): void;

  /**
   * 清空所有缓存 | Clear all cache
   */
  clear(): void;

  /**
   * 清理过期缓存 | Cleanup expired cache
   */
  cleanup(): void;

  /**
   * 获取缓存统计信息 | Get cache statistics
   */
  getStats(): GitCacheStats;
}

/**
 * Git缓存统计信息 | Git cache statistics
 */
export interface GitCacheStats {
  /** 总缓存项数 | Total cache items */
  totalItems: number;
  /** 有效缓存项数 | Valid cache items */
  validItems: number;
  /** 过期缓存项数 | Expired cache items */
  expiredItems: number;
  /** 命中次数 | Hit count */
  hits: number;
  /** 未命中次数 | Miss count */
  misses: number;
  /** 命中率 | Hit rate */
  hitRate: number;
}

/**
 * 内存Git缓存实现 | In-memory Git cache implementation
 */
export class MemoryGitCache implements GitCache {
  private cache = new Map<GitCacheKey, GitCacheItem>();
  private config: GitCacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(config: GitCacheConfig) {
    this.config = config;

    // 定期清理过期缓存 | Periodically cleanup expired cache
    if (config.enabled) {
      setInterval(() => this.cleanup(), Math.max(config.duration / 4, 5000));
    }
  }

  get<T>(key: GitCacheKey): T | undefined {
    if (!this.config.enabled) {
      this.stats.misses++;
      return undefined;
    }

    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return undefined;
    }

    const now = Date.now();
    if (now > item.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    return item.data as T;
  }

  set<T>(key: GitCacheKey, data: T, duration?: number): void {
    if (!this.config.enabled) {
      return;
    }

    // 检查是否应该缓存此类型的数据 | Check if should cache this type of data
    if (!this.shouldCache(key)) {
      return;
    }

    const cacheDuration = duration ?? this.config.duration;
    const now = Date.now();

    const item: GitCacheItem<T> = {
      data,
      timestamp: now,
      expires: now + cacheDuration,
    };

    this.cache.set(key, item);
  }

  has(key: GitCacheKey): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    return Date.now() <= item.expires;
  }

  delete(key: GitCacheKey): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): GitCacheStats {
    const now = Date.now();
    let validItems = 0;
    let expiredItems = 0;

    for (const item of this.cache.values()) {
      if (now <= item.expires) {
        validItems++;
      } else {
        expiredItems++;
      }
    }

    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      totalItems: this.cache.size,
      validItems,
      expiredItems,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
    };
  }

  /**
   * 检查是否应该缓存指定类型的数据 | Check if should cache specified type of data
   * @param key 缓存键 | Cache key
   * @returns 是否应该缓存 | Whether should cache
   */
  private shouldCache(key: GitCacheKey): boolean {
    const { cacheTypes } = this.config;

    switch (key) {
      case GitCacheKey.BRANCH_INFO:
        return cacheTypes.branch;
      case GitCacheKey.WORKING_STATUS:
        return cacheTypes.status;
      case GitCacheKey.VERSION_INFO:
        return cacheTypes.version;
      case GitCacheKey.STASH_INFO:
        return cacheTypes.stash;
      case GitCacheKey.FULL_INFO:
        return true; // 总是缓存完整信息 | Always cache full info
      default:
        return true;
    }
  }
}

/**
 * 创建默认Git缓存配置 | Create default Git cache configuration
 * @returns 默认配置 | Default configuration
 */
export function createDefaultCacheConfig(): GitCacheConfig {
  return {
    enabled: true,
    duration: 5000, // 5秒缓存 | 5 seconds cache
    cacheTypes: {
      branch: true,
      status: true,
      version: true,
      stash: true,
    },
  };
}

/**
 * 创建Git缓存实例 | Create Git cache instance
 * @param config 缓存配置 | Cache configuration
 * @returns 缓存实例 | Cache instance
 */
export function createGitCache(config?: Partial<GitCacheConfig>): GitCache {
  const fullConfig = {
    ...createDefaultCacheConfig(),
    ...config,
  };

  return new MemoryGitCache(fullConfig);
}
