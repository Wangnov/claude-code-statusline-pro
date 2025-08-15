/**
 * Git缓存系统单元测试 | Git cache system unit tests
 *
 * 专门测试缓存机制的详细功能，包括命中率、过期清理、选择性缓存等
 * Specifically tests detailed caching functionality including hit rates, expiration cleanup, selective caching
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createDefaultCacheConfig,
  createGitCache,
  MemoryGitCache,
} from '../../../src/git/cache.js';
import { type GitCacheConfig, GitCacheKey } from '../../../src/git/types.js';
import {
  createMemoryTest,
  createPerformanceTest,
  generateCommitMessage,
  generateGitSha,
  generatePerformanceTestData,
  testConcurrency,
  wait,
} from '../../utils/test-helpers.js';

describe('Git Cache System', () => {
  let cache: MemoryGitCache;
  let config: GitCacheConfig;

  beforeEach(() => {
    config = createDefaultCacheConfig();
    cache = new MemoryGitCache(config);
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Cache Configuration', () => {
    it('should create cache with default configuration', () => {
      const defaultCache = createGitCache();
      expect(defaultCache).toBeInstanceOf(MemoryGitCache);
      console.log('✓ Cache created with default configuration');
    });

    it('should create cache with custom configuration', () => {
      const customConfig: Partial<GitCacheConfig> = {
        enabled: true,
        duration: 10000,
        cacheTypes: {
          branch: true,
          status: false,
          version: true,
          stash: false,
        },
      };

      const customCache = createGitCache(customConfig);
      expect(customCache).toBeInstanceOf(MemoryGitCache);
      console.log('✓ Cache created with custom configuration');
    });

    it('should respect disabled cache configuration', () => {
      const disabledConfig: GitCacheConfig = {
        ...config,
        enabled: false,
      };

      const disabledCache = new MemoryGitCache(disabledConfig);

      // 尝试设置和获取缓存
      disabledCache.set(GitCacheKey.BRANCH_INFO, { current: 'main' });
      const result = disabledCache.get(GitCacheKey.BRANCH_INFO);

      expect(result).toBeUndefined();
      console.log('✓ Disabled cache configuration respected');
    });
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve data', () => {
      const testData = { current: 'main', detached: false, ahead: 0, behind: 0 };

      cache.set(GitCacheKey.BRANCH_INFO, testData);
      const retrieved = cache.get(GitCacheKey.BRANCH_INFO);

      expect(retrieved).toEqual(testData);
      console.log('✓ Data stored and retrieved correctly');
    });

    it('should return undefined for non-existent keys', () => {
      const result = cache.get(GitCacheKey.BRANCH_INFO);
      expect(result).toBeUndefined();
      console.log('✓ Non-existent keys return undefined');
    });

    it('should check if cache has valid items', () => {
      const testData = { current: 'main' };

      expect(cache.has(GitCacheKey.BRANCH_INFO)).toBe(false);

      cache.set(GitCacheKey.BRANCH_INFO, testData);
      expect(cache.has(GitCacheKey.BRANCH_INFO)).toBe(true);

      console.log('✓ Cache has() method works correctly');
    });

    it('should delete specific cache items', () => {
      const testData = { current: 'main' };

      cache.set(GitCacheKey.BRANCH_INFO, testData);
      expect(cache.has(GitCacheKey.BRANCH_INFO)).toBe(true);

      cache.delete(GitCacheKey.BRANCH_INFO);
      expect(cache.has(GitCacheKey.BRANCH_INFO)).toBe(false);

      console.log('✓ Cache delete() method works correctly');
    });

    it('should clear all cache items', () => {
      cache.set(GitCacheKey.BRANCH_INFO, { current: 'main' });
      cache.set(GitCacheKey.WORKING_STATUS, { clean: true });
      cache.set(GitCacheKey.VERSION_INFO, { sha: 'abc123' });

      cache.clear();

      expect(cache.has(GitCacheKey.BRANCH_INFO)).toBe(false);
      expect(cache.has(GitCacheKey.WORKING_STATUS)).toBe(false);
      expect(cache.has(GitCacheKey.VERSION_INFO)).toBe(false);

      console.log('✓ Cache clear() method works correctly');
    });
  });

  describe('Cache Expiration', () => {
    it('should expire items after configured duration', async () => {
      const shortDurationConfig: GitCacheConfig = {
        ...config,
        duration: 100, // 100ms
      };
      const shortCache = new MemoryGitCache(shortDurationConfig);

      const testData = { current: 'main' };
      shortCache.set(GitCacheKey.BRANCH_INFO, testData);

      // 立即检查应该存在
      expect(shortCache.has(GitCacheKey.BRANCH_INFO)).toBe(true);

      // 等待过期
      await wait(150);

      // 过期后应该不存在
      expect(shortCache.has(GitCacheKey.BRANCH_INFO)).toBe(false);
      expect(shortCache.get(GitCacheKey.BRANCH_INFO)).toBeUndefined();

      console.log('✓ Cache items expire correctly');
    });

    it('should cleanup expired items automatically', async () => {
      const shortDurationConfig: GitCacheConfig = {
        ...config,
        duration: 50, // 50ms
      };
      const shortCache = new MemoryGitCache(shortDurationConfig);

      // 添加多个缓存项
      shortCache.set(GitCacheKey.BRANCH_INFO, { current: 'main' });
      shortCache.set(GitCacheKey.WORKING_STATUS, { clean: true });

      let stats = shortCache.getStats();
      expect(stats.totalItems).toBe(2);
      expect(stats.validItems).toBe(2);

      // 等待过期
      await wait(100);

      // 手动触发清理
      shortCache.cleanup();

      stats = shortCache.getStats();
      expect(stats.totalItems).toBe(0);
      expect(stats.expiredItems).toBe(0);

      console.log('✓ Expired items cleaned up automatically');
    });

    it('should allow custom expiration times', () => {
      const testData = { current: 'main' };
      const customDuration = 200;

      cache.set(GitCacheKey.BRANCH_INFO, testData, customDuration);

      // 验证缓存项存在
      expect(cache.has(GitCacheKey.BRANCH_INFO)).toBe(true);
      console.log('✓ Custom expiration times accepted');
    });
  });

  describe('Selective Caching', () => {
    it('should respect cache type configuration', () => {
      const selectiveConfig: GitCacheConfig = {
        ...config,
        cacheTypes: {
          branch: true,
          status: false,
          version: true,
          stash: false,
        },
      };
      const selectiveCache = new MemoryGitCache(selectiveConfig);

      // 尝试缓存各种类型的数据
      selectiveCache.set(GitCacheKey.BRANCH_INFO, { current: 'main' }); // 应该被缓存
      selectiveCache.set(GitCacheKey.WORKING_STATUS, { clean: true }); // 应该被跳过
      selectiveCache.set(GitCacheKey.VERSION_INFO, { sha: 'abc123' }); // 应该被缓存
      selectiveCache.set(GitCacheKey.STASH_INFO, { count: 0 }); // 应该被跳过

      expect(selectiveCache.has(GitCacheKey.BRANCH_INFO)).toBe(true);
      expect(selectiveCache.has(GitCacheKey.WORKING_STATUS)).toBe(false);
      expect(selectiveCache.has(GitCacheKey.VERSION_INFO)).toBe(true);
      expect(selectiveCache.has(GitCacheKey.STASH_INFO)).toBe(false);

      console.log('✓ Selective caching configuration respected');
    });

    it('should always cache full info regardless of configuration', () => {
      const selectiveConfig: GitCacheConfig = {
        ...config,
        cacheTypes: {
          branch: false,
          status: false,
          version: false,
          stash: false,
        },
      };
      const selectiveCache = new MemoryGitCache(selectiveConfig);

      const fullInfo = {
        isRepo: true,
        branch: { current: 'main' },
        status: { clean: true },
        operation: { type: 'none', inProgress: false },
        version: { sha: 'abc123' },
        stash: { count: 0 },
      };

      selectiveCache.set(GitCacheKey.FULL_INFO, fullInfo);
      expect(selectiveCache.has(GitCacheKey.FULL_INFO)).toBe(true);

      console.log('✓ Full info always cached regardless of configuration');
    });
  });

  describe('Cache Statistics', () => {
    it('should track hit and miss statistics', () => {
      const testData = { current: 'main' };

      // 初始统计应该为0
      let stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);

      // 缓存未命中
      cache.get(GitCacheKey.BRANCH_INFO);
      stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0);

      // 设置缓存
      cache.set(GitCacheKey.BRANCH_INFO, testData);

      // 缓存命中
      cache.get(GitCacheKey.BRANCH_INFO);
      stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);

      console.log('✓ Hit/miss statistics tracked correctly');
    });

    it('should provide comprehensive cache statistics', () => {
      // 添加一些缓存项
      cache.set(GitCacheKey.BRANCH_INFO, { current: 'main' });
      cache.set(GitCacheKey.WORKING_STATUS, { clean: true });

      const stats = cache.getStats();

      expect(stats).toHaveProperty('totalItems');
      expect(stats).toHaveProperty('validItems');
      expect(stats).toHaveProperty('expiredItems');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');

      expect(stats.totalItems).toBe(2);
      expect(stats.validItems).toBe(2);
      expect(stats.expiredItems).toBe(0);

      console.log('✓ Comprehensive cache statistics provided', {
        totalItems: stats.totalItems,
        validItems: stats.validItems,
        expiredItems: stats.expiredItems,
        hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
      });
    });

    it('should reset statistics when cache is cleared', () => {
      const testData = { current: 'main' };

      // 产生一些统计数据
      cache.set(GitCacheKey.BRANCH_INFO, testData);
      cache.get(GitCacheKey.BRANCH_INFO); // 命中
      cache.get(GitCacheKey.WORKING_STATUS); // 未命中

      let stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);

      // 清空缓存
      cache.clear();

      stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.totalItems).toBe(0);

      console.log('✓ Statistics reset when cache cleared');
    });
  });

  describe('Performance Tests', () => {
    it('should handle rapid cache operations efficiently', async () => {
      const performanceTest = createPerformanceTest(
        () => {
          // 执行大量缓存操作
          for (let i = 0; i < 1000; i++) {
            const key = i % 2 === 0 ? GitCacheKey.BRANCH_INFO : GitCacheKey.WORKING_STATUS;
            const data = generatePerformanceTestData(1)[0];

            cache.set(key, data);
            cache.get(key);
            cache.has(key);
          }
        },
        100, // 100ms limit
        'rapid cache operations'
      );

      await performanceTest();
    });

    it('should maintain consistent performance with large datasets', async () => {
      const largeDataset = generatePerformanceTestData(1000);

      const performanceTest = createPerformanceTest(
        () => {
          // 缓存大量数据
          largeDataset.forEach((data, index) => {
            const key = index % 2 === 0 ? GitCacheKey.BRANCH_INFO : GitCacheKey.VERSION_INFO;
            cache.set(key, data);
          });

          // 随机访问
          for (let i = 0; i < 100; i++) {
            const randomIndex = Math.floor(Math.random() * largeDataset.length);
            const key = randomIndex % 2 === 0 ? GitCacheKey.BRANCH_INFO : GitCacheKey.VERSION_INFO;
            cache.get(key);
          }
        },
        200, // 200ms limit
        'large dataset operations'
      );

      await performanceTest();
    });

    it('should handle concurrent access safely', async () => {
      const testData = { current: 'main' };

      const concurrentOperations = async () => {
        return Promise.all([
          // 并发写入
          Promise.resolve(cache.set(GitCacheKey.BRANCH_INFO, testData)),
          Promise.resolve(cache.set(GitCacheKey.WORKING_STATUS, { clean: true })),

          // 并发读取
          Promise.resolve(cache.get(GitCacheKey.BRANCH_INFO)),
          Promise.resolve(cache.get(GitCacheKey.WORKING_STATUS)),

          // 并发检查
          Promise.resolve(cache.has(GitCacheKey.BRANCH_INFO)),
          Promise.resolve(cache.has(GitCacheKey.WORKING_STATUS)),
        ]);
      };

      // 执行多轮并发操作
      const results = await testConcurrency(
        concurrentOperations,
        10,
        'concurrent cache operations'
      );

      expect(results).toHaveLength(10);
      console.log('✓ Concurrent access handled safely');
    });

    it('should manage memory efficiently', async () => {
      const memoryTest = createMemoryTest(
        () => {
          // 创建和销毁大量缓存项
          for (let i = 0; i < 1000; i++) {
            const data = generatePerformanceTestData(10);
            cache.set(GitCacheKey.BRANCH_INFO, data);

            if (i % 100 === 0) {
              cache.clear();
            }
          }
        },
        5 * 1024 * 1024, // 5MB limit
        'memory-intensive cache operations'
      );

      await memoryTest();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined data gracefully', () => {
      cache.set(GitCacheKey.BRANCH_INFO, null);
      cache.set(GitCacheKey.WORKING_STATUS, undefined);

      expect(cache.get(GitCacheKey.BRANCH_INFO)).toBe(null);
      expect(cache.get(GitCacheKey.WORKING_STATUS)).toBe(undefined);
      expect(cache.has(GitCacheKey.BRANCH_INFO)).toBe(true);
      expect(cache.has(GitCacheKey.WORKING_STATUS)).toBe(true);

      console.log('✓ Null and undefined data handled gracefully');
    });

    it('should handle very large data objects', () => {
      const largeData = {
        files: Array.from({ length: 10000 }, (_, i) => `file${i}.ts`),
        commits: Array.from({ length: 1000 }, (_, i) => ({
          sha: generateGitSha(),
          message: generateCommitMessage(),
          author: `Author ${i}`,
          timestamp: Date.now() + i,
        })),
      };

      cache.set(GitCacheKey.VERSION_INFO, largeData);
      const retrieved = cache.get(GitCacheKey.VERSION_INFO);

      expect(retrieved).toEqual(largeData);
      console.log('✓ Large data objects handled correctly');
    });

    it('should handle rapid expiration edge cases', async () => {
      const veryShortConfig: GitCacheConfig = {
        ...config,
        duration: 1, // 1ms
      };
      const rapidCache = new MemoryGitCache(veryShortConfig);

      rapidCache.set(GitCacheKey.BRANCH_INFO, { current: 'main' });

      // 即使在非常短的过期时间内，也应该能正确处理
      expect(rapidCache.has(GitCacheKey.BRANCH_INFO)).toBe(true);

      await wait(10);
      expect(rapidCache.has(GitCacheKey.BRANCH_INFO)).toBe(false);

      console.log('✓ Rapid expiration edge cases handled');
    });

    it('should handle disabled cache types gracefully', () => {
      const partialConfig: GitCacheConfig = {
        ...config,
        cacheTypes: {
          branch: true,
          status: false,
          version: false,
          stash: false,
        },
      };
      const partialCache = new MemoryGitCache(partialConfig);

      // 尝试缓存禁用的类型不应该抛出错误
      expect(() => {
        partialCache.set(GitCacheKey.WORKING_STATUS, { clean: true });
        partialCache.set(GitCacheKey.VERSION_INFO, { sha: 'abc' });
        partialCache.set(GitCacheKey.STASH_INFO, { count: 0 });
      }).not.toThrow();

      console.log('✓ Disabled cache types handled gracefully');
    });
  });
});
