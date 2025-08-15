/**
 * 通用测试助手工具 | Common test helper utilities
 *
 * 提供跨测试文件使用的通用工具函数和断言助手
 * Provides common utility functions and assertion helpers for use across test files
 */

import { expect, type Mock, vi } from 'vitest';
import type { GitCacheStats } from '../../src/git/cache.js';
import type { GitInfo, GitServiceConfig } from '../../src/git/types.js';

/**
 * 性能测试数据项类型 | Performance test data item type
 */
interface PerformanceTestDataItem {
  id: number;
  data: string;
  timestamp: number;
  metadata: {
    branch: string;
    commit: string;
  };
}

/**
 * 等待指定时间 | Wait for specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 创建模拟的系统时间 | Create mock system time
 */
export function mockSystemTime(timestamp: number): () => void {
  const originalDateNow = Date.now;
  Date.now = vi.fn(() => timestamp);

  return () => {
    Date.now = originalDateNow;
  };
}

/**
 * 验证Mock调用次数 | Verify mock call count
 */
export function expectCallCount(mock: Mock, expectedCount: number, operation = 'operation'): void {
  expect(mock).toHaveBeenCalledTimes(expectedCount);
  if (expectedCount === 0) {
    console.log(`✓ ${operation}: No calls made as expected`);
  } else {
    console.log(`✓ ${operation}: Called ${expectedCount} time(s) as expected`);
  }
}

/**
 * 验证Git命令调用 | Verify Git command calls
 */
export function expectGitCommand(mock: Mock, command: string, callIndex = -1): void {
  const calls = mock.mock.calls;
  const targetCall = callIndex >= 0 ? calls[callIndex] : calls[calls.length - 1];

  if (!targetCall) {
    throw new Error(`No mock call found at index ${callIndex >= 0 ? callIndex : 'last'}`);
  }

  const actualCommand = targetCall[0];
  expect(actualCommand).toContain(command);
  console.log(`✓ Git command executed: ${actualCommand}`);
}

/**
 * 验证缓存统计 | Verify cache statistics
 */
export function expectCacheStats(
  stats: GitCacheStats,
  expected: Partial<GitCacheStats>,
  description = 'cache stats'
): void {
  Object.entries(expected).forEach(([key, value]) => {
    expect(stats[key as keyof GitCacheStats]).toBe(value);
  });
  console.log(`✓ ${description}:`, {
    hits: stats.hits,
    misses: stats.misses,
    hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
  });
}

/**
 * 验证Git信息结构 | Verify Git info structure
 */
export function expectGitInfoStructure(gitInfo: GitInfo): void {
  // 验证基本结构
  expect(gitInfo).toHaveProperty('isRepo');
  expect(gitInfo).toHaveProperty('branch');
  expect(gitInfo).toHaveProperty('status');
  expect(gitInfo).toHaveProperty('operation');
  expect(gitInfo).toHaveProperty('version');
  expect(gitInfo).toHaveProperty('stash');

  // 验证分支信息结构
  expect(gitInfo.branch).toHaveProperty('current');
  expect(gitInfo.branch).toHaveProperty('detached');
  expect(gitInfo.branch).toHaveProperty('ahead');
  expect(gitInfo.branch).toHaveProperty('behind');

  // 验证状态信息结构
  expect(gitInfo.status).toHaveProperty('clean');
  expect(gitInfo.status).toHaveProperty('staged');
  expect(gitInfo.status).toHaveProperty('unstaged');
  expect(gitInfo.status).toHaveProperty('untracked');
  expect(gitInfo.status).toHaveProperty('conflicted');

  // 验证操作信息结构
  expect(gitInfo.operation).toHaveProperty('type');
  expect(gitInfo.operation).toHaveProperty('inProgress');

  // 验证版本信息结构
  expect(gitInfo.version).toHaveProperty('sha');
  expect(gitInfo.version).toHaveProperty('shortSha');
  expect(gitInfo.version).toHaveProperty('message');
  expect(gitInfo.version).toHaveProperty('timestamp');
  expect(gitInfo.version).toHaveProperty('author');

  // 验证存储信息结构
  expect(gitInfo.stash).toHaveProperty('count');

  console.log('✓ Git info structure is valid');
}

/**
 * 创建配置合并助手 | Create configuration merge helper
 */
export function mergeGitConfig(
  base: GitServiceConfig,
  override: Partial<GitServiceConfig>
): GitServiceConfig {
  return {
    ...base,
    ...override,
    cache: {
      ...base.cache,
      ...override.cache,
      cacheTypes: {
        ...base.cache.cacheTypes,
        ...override.cache?.cacheTypes,
      },
    },
    features: {
      ...base.features,
      ...override.features,
    },
  };
}

/**
 * 创建性能测试助手 | Create performance test helper
 */
export function createPerformanceTest<T>(
  operation: () => Promise<T> | T,
  expectedMaxTime: number,
  description = 'operation'
) {
  return async () => {
    const start = process.hrtime.bigint();
    const result = await operation();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000; // Convert to milliseconds

    expect(duration).toBeLessThan(expectedMaxTime);
    console.log(
      `✓ ${description}: Completed in ${duration.toFixed(2)}ms (limit: ${expectedMaxTime}ms)`
    );

    return { result, duration };
  };
}

/**
 * 创建内存使用测试助手 | Create memory usage test helper
 */
export function createMemoryTest<T>(
  operation: () => Promise<T> | T,
  maxMemoryIncrease: number,
  description = 'operation'
) {
  return async () => {
    // 强制垃圾回收（如果可用）
    if (global.gc) {
      global.gc();
    }

    const initialMemory = process.memoryUsage().heapUsed;
    const result = await operation();
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    expect(memoryIncrease).toBeLessThan(maxMemoryIncrease);
    console.log(
      `✓ ${description}: Memory increase ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (limit: ${(maxMemoryIncrease / 1024 / 1024).toFixed(2)}MB)`
    );

    return { result, memoryIncrease };
  };
}

/**
 * 验证错误类型和消息 | Verify error type and message
 */
export function expectError(
  errorFn: () => void | Promise<void>,
  expectedErrorType: string,
  expectedMessage?: string
): void | Promise<void> {
  try {
    const result = errorFn();
    if (result instanceof Promise) {
      return result.then(
        () => {
          throw new Error('Expected error was not thrown');
        },
        (error) => {
          expect(error.name).toBe(expectedErrorType);
          if (expectedMessage) {
            expect(error.message).toContain(expectedMessage);
          }
          console.log(`✓ Expected error thrown: ${error.name} - ${error.message}`);
        }
      );
    }
  } catch (error: unknown) {
    const err = error as Error;
    expect(err.name).toBe(expectedErrorType);
    if (expectedMessage) {
      expect(err.message).toContain(expectedMessage);
    }
    console.log(`✓ Expected error thrown: ${err.name} - ${err.message}`);
    return;
  }

  throw new Error('Expected error was not thrown');
}

/**
 * 创建并发测试助手 | Create concurrency test helper
 */
export async function testConcurrency<T>(
  operation: () => Promise<T>,
  concurrentCount: number,
  description = 'concurrent operations'
): Promise<T[]> {
  console.log(`🔄 Starting ${concurrentCount} ${description}...`);

  const promises = Array.from({ length: concurrentCount }, () => operation());
  const results = await Promise.all(promises);

  console.log(`✓ ${description}: All ${concurrentCount} operations completed successfully`);
  return results;
}

/**
 * 创建超时测试助手 | Create timeout test helper
 */
export function createTimeoutTest<T = unknown>(
  operation: () => Promise<T>,
  timeoutMs: number,
  shouldTimeout = true
) {
  return async (): Promise<T | undefined> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
    });

    if (shouldTimeout) {
      await expect(Promise.race([operation(), timeoutPromise])).rejects.toThrow(
        'Operation timed out'
      );
      console.log(`✓ Operation correctly timed out after ${timeoutMs}ms`);
      return;
    } else {
      const result = await Promise.race([operation(), timeoutPromise]);
      console.log(`✓ Operation completed within ${timeoutMs}ms timeout`);
      return result;
    }
  };
}

/**
 * 生成随机的Git SHA | Generate random Git SHA
 */
export function generateGitSha(length = 40): string {
  const chars = '0123456789abcdef';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * 生成随机的分支名 | Generate random branch name
 */
export function generateBranchName(): string {
  const prefixes = ['feature', 'fix', 'hotfix', 'release', 'develop'];
  const names = ['auth', 'ui', 'api', 'db', 'test', 'docs', 'refactor'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const name = names[Math.floor(Math.random() * names.length)];
  const number = Math.floor(Math.random() * 1000);

  return `${prefix}/${name}-${number}`;
}

/**
 * 生成随机的提交消息 | Generate random commit message
 */
export function generateCommitMessage(): string {
  const types = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'];
  const scopes = ['auth', 'ui', 'api', 'db', 'config', 'core'];
  const actions = ['add', 'update', 'remove', 'fix', 'improve', 'optimize'];
  const subjects = ['functionality', 'performance', 'bug', 'feature', 'component', 'service'];

  const type = types[Math.floor(Math.random() * types.length)];
  const scope = scopes[Math.floor(Math.random() * scopes.length)];
  const action = actions[Math.floor(Math.random() * actions.length)];
  const subject = subjects[Math.floor(Math.random() * subjects.length)];

  return `${type}(${scope}): ${action} ${subject}`;
}

/**
 * 生成随机的文件状态 | Generate random file status
 */
export function generateFileStatuses(count: number): string[] {
  const statuses = ['M ', ' M', 'A ', ' D', '??', 'UU', 'AA'];
  const fileExtensions = ['.ts', '.js', '.json', '.md', '.txt', '.yml'];
  const directories = ['src', 'tests', 'docs', 'config', 'dist', 'assets'];

  return Array.from({ length: count }, () => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const dir = directories[Math.floor(Math.random() * directories.length)];
    const filename = `file${Math.floor(Math.random() * 1000)}`;
    const ext = fileExtensions[Math.floor(Math.random() * fileExtensions.length)];

    return `${status} ${dir}/${filename}${ext}`;
  });
}

/**
 * 生成性能测试数据 | Generate performance test data
 */
export function generatePerformanceTestData(size: number): PerformanceTestDataItem[] {
  return Array.from({ length: size }, (_, i) => ({
    id: i,
    data: generateGitSha(8),
    timestamp: Date.now() + i,
    metadata: {
      branch: generateBranchName(),
      commit: generateCommitMessage(),
    },
  }));
}

/**
 * 验证对象深度相等 | Verify deep object equality
 */
export function expectDeepEqual<T>(actual: T, expected: T, message?: string): void {
  expect(actual).toEqual(expected);
  if (message) {
    console.log(`✓ ${message}`);
  }
}

/**
 * 验证数组包含特定元素 | Verify array contains specific elements
 */
export function expectArrayContains<T>(array: T[], elements: T[], message?: string): void {
  elements.forEach((element) => {
    expect(array).toContain(element);
  });
  if (message) {
    console.log(`✓ ${message}: Array contains expected elements`);
  }
}

/**
 * 验证对象部分匹配 | Verify partial object match
 */
export function expectPartialMatch<T>(actual: T, expected: Partial<T>, message?: string): void {
  expect(actual).toMatchObject(expected);
  if (message) {
    console.log(`✓ ${message}: Partial match successful`);
  }
}

/**
 * 验证异步操作完成 | Verify async operation completion
 */
export async function expectAsyncCompletion<T>(
  operation: Promise<T>,
  timeoutMs = 5000,
  message?: string
): Promise<T> {
  const result = await Promise.race([
    operation,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Async operation timeout')), timeoutMs)
    ),
  ]);

  if (message) {
    console.log(`✓ ${message}: Async operation completed`);
  }

  return result;
}
