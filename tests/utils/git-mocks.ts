/**
 * Git命令Mock工具 | Git command mock utilities
 *
 * 提供可重用的Git命令模拟工具，支持各种Git仓库状态和错误场景
 * Provides reusable Git command mocking utilities for various Git repository states and error scenarios
 */

import type { Mock } from 'vitest';
import { vi } from 'vitest';

/**
 * Git仓库状态接口 | Git repository state interface
 */
export interface MockRepoState {
  /** 是否为Git仓库 | Whether it's a Git repository */
  isGitRepo: boolean;
  /** 当前分支 | Current branch */
  currentBranch: string;
  /** 是否为游离HEAD | Whether in detached HEAD state */
  detached: boolean;
  /** 上游分支 | Upstream branch */
  upstreamBranch?: string;
  /** ahead提交数 | Commits ahead */
  ahead: number;
  /** behind提交数 | Commits behind */
  behind: number;
  /** 工作区状态 | Working directory status */
  workingStatus: {
    staged: string[];
    unstaged: string[];
    untracked: string[];
    conflicted: string[];
  };
  /** 操作状态 | Operation status */
  operation: {
    type: 'none' | 'merge' | 'rebase' | 'cherry-pick' | 'bisect';
    inProgress: boolean;
  };
  /** 版本信息 | Version info */
  version: {
    sha: string;
    shortSha: string;
    message: string;
    author: string;
    timestamp: string;
  };
  /** 存储信息 | Stash info */
  stash: {
    count: number;
    entries: Array<{
      index: number;
      description: string;
      branch: string;
    }>;
  };
  /** 标签信息 | Tag info */
  tags: {
    latest?: string;
    commitsSinceTag?: number;
  };
}

/**
 * Git错误场景类型 | Git error scenario types
 */
export type GitErrorScenario =
  | 'not_git_repo'
  | 'no_upstream'
  | 'permission_denied'
  | 'timeout'
  | 'network_error'
  | 'invalid_branch'
  | 'merge_conflict'
  | 'no_commits'
  | undefined;

/**
 * Mock仓库状态管理器 | Mock repository state manager
 */
export class MockRepoStateManager {
  private state: MockRepoState;
  private errorScenario?: GitErrorScenario;

  constructor() {
    this.state = this.createDefaultState();
  }

  /**
   * 创建默认仓库状态 | Create default repository state
   */
  private createDefaultState(): MockRepoState {
    return {
      isGitRepo: true,
      currentBranch: 'main',
      detached: false,
      upstreamBranch: 'origin/main',
      ahead: 0,
      behind: 0,
      workingStatus: {
        staged: [],
        unstaged: [],
        untracked: [],
        conflicted: [],
      },
      operation: {
        type: 'none',
        inProgress: false,
      },
      version: {
        sha: 'a1b2c3d4e5f6789012345678901234567890abcd',
        shortSha: 'a1b2c3d',
        message: 'Initial commit',
        author: 'Test User',
        timestamp: '1640995200', // 2022-01-01 00:00:00 UTC
      },
      stash: {
        count: 0,
        entries: [],
      },
      tags: {
        latest: 'v1.0.0',
        commitsSinceTag: 5,
      },
    };
  }

  /**
   * 设置仓库状态 | Set repository state
   */
  setState(partialState: Partial<MockRepoState>): void {
    this.state = { ...this.state, ...partialState };
    this.errorScenario = undefined as GitErrorScenario;
  }

  /**
   * 设置错误场景 | Set error scenario
   */
  setErrorScenario(scenario: GitErrorScenario): void {
    this.errorScenario = scenario;
  }

  /**
   * 获取当前状态 | Get current state
   */
  getState(): MockRepoState {
    return { ...this.state };
  }

  /**
   * 重置为默认状态 | Reset to default state
   */
  reset(): void {
    this.state = this.createDefaultState();
    this.errorScenario = undefined as GitErrorScenario;
  }

  /**
   * 预设仓库状态 | Preset repository states
   */
  presets = {
    /** 干净的仓库 | Clean repository */
    clean: () => {
      this.setState({
        workingStatus: {
          staged: [],
          unstaged: [],
          untracked: [],
          conflicted: [],
        },
      });
    },

    /** 脏工作区 | Dirty working directory */
    dirty: () => {
      this.setState({
        workingStatus: {
          staged: ['M  src/file1.ts'],
          unstaged: [' M src/file2.ts', ' D src/file3.ts'],
          untracked: ['?? new-file.txt'],
          conflicted: [],
        },
      });
    },

    /** 合并冲突 | Merge conflict */
    mergeConflict: () => {
      this.setState({
        workingStatus: {
          staged: [],
          unstaged: [],
          untracked: [],
          conflicted: ['UU src/conflict.ts', 'AA src/both-added.ts'],
        },
        operation: {
          type: 'merge',
          inProgress: true,
        },
      });
    },

    /** 游离HEAD | Detached HEAD */
    detachedHead: () => {
      this.setState({
        currentBranch: 'HEAD',
        detached: true,
        ahead: 0,
        behind: 0,
      });
      // 删除 upstreamBranch 属性以满足 exactOptionalPropertyTypes
      delete (this.state as unknown as Record<string, unknown>).upstreamBranch;
    },

    /** 分支ahead/behind | Branch ahead/behind */
    aheadBehind: (ahead = 3, behind = 2) => {
      this.setState({
        ahead,
        behind,
      });
    },

    /** 有stash | With stash */
    withStash: (count = 2) => {
      this.setState({
        stash: {
          count,
          entries: Array.from({ length: count }, (_, i) => ({
            index: i,
            description: `WIP on main: commit ${i + 1}`,
            branch: 'main',
          })),
        },
      });
    },

    /** 非Git仓库 | Not a Git repository */
    notGitRepo: () => {
      this.setErrorScenario('not_git_repo');
    },
  };

  /**
   * 处理Git命令Mock | Handle Git command mock
   */
  handleGitCommand(command: string): string | never {
    if (this.errorScenario) {
      this.throwErrorForScenario(this.errorScenario, command);
    }

    const args = command.replace(/^git\s+/, '').trim();

    // 处理各种Git命令
    if (args === 'rev-parse --git-dir') {
      return '.git';
    }

    if (args === 'rev-parse --abbrev-ref HEAD') {
      return this.state.currentBranch;
    }

    if (args === 'rev-parse --abbrev-ref @{upstream}') {
      if (!this.state.upstreamBranch) {
        throw new Error('fatal: no upstream configured for branch');
      }
      return this.state.upstreamBranch;
    }

    if (args.startsWith('rev-list --count --left-right')) {
      return `${this.state.behind}\t${this.state.ahead}`;
    }

    if (args === 'status --porcelain') {
      const { staged, unstaged, untracked, conflicted } = this.state.workingStatus;
      const lines = [...staged, ...unstaged, ...untracked, ...conflicted];
      return lines.join('\n');
    }

    if (args.startsWith('log -1 --format=')) {
      const { sha, shortSha, message, timestamp, author } = this.state.version;
      return `"${sha}|${shortSha}|${message}|${timestamp}|${author}"`;
    }

    if (args === 'describe --tags --abbrev=0') {
      if (!this.state.tags.latest) {
        throw new Error('fatal: No names found, cannot describe anything.');
      }
      return this.state.tags.latest;
    }

    if (args.startsWith('rev-list --count') && args.includes('..HEAD')) {
      return String(this.state.tags.commitsSinceTag || 0);
    }

    if (args === 'stash list') {
      return this.state.stash.entries
        .map((entry) => `stash@{${entry.index}}: ${entry.description}`)
        .join('\n');
    }

    // 默认返回空字符串
    return '';
  }

  /**
   * 根据错误场景抛出对应错误 | Throw corresponding error for scenario
   */
  private throwErrorForScenario(scenario: GitErrorScenario, _command: string): never {
    const error = new Error() as Error & {
      code?: number;
      status?: number;
      stderr?: string;
      killed?: boolean;
      signal?: string | null;
    };

    switch (scenario) {
      case 'not_git_repo':
        error.message = 'fatal: not a git repository (or any of the parent directories): .git';
        error.code = 128;
        break;
      case 'no_upstream':
        error.message = "fatal: no upstream configured for branch 'main'";
        error.code = 128;
        break;
      case 'permission_denied':
        error.message = 'fatal: could not lock config file .git/config: Permission denied';
        error.code = 128;
        break;
      case 'timeout':
        error.message = 'Command timed out';
        error.killed = true;
        error.signal = 'SIGTERM';
        break;
      case 'network_error':
        error.message = "fatal: unable to access 'https://github.com/...': Could not resolve host";
        error.code = 128;
        break;
      case 'invalid_branch':
        error.message =
          "fatal: ambiguous argument 'nonexistent': unknown revision or path not in the working tree.";
        error.code = 128;
        break;
      case 'merge_conflict':
        error.message = 'error: you need to resolve your current index first';
        error.code = 128;
        break;
      case 'no_commits':
        error.message = "fatal: your current branch 'main' does not have any commits yet";
        error.code = 128;
        break;
      default:
        error.message = 'Unknown Git error';
        error.code = 1;
    }

    error.stderr = error.message;
    throw error;
  }
}

/**
 * 创建Git命令Mock实现 | Create Git command mock implementation
 */
export function createGitCommandMock(stateManager: MockRepoStateManager): Mock {
  return vi.fn(
    (command: string, options?: { timeout?: number; cwd?: string; encoding?: string }) => {
      // 检查超时处理
      if (options?.timeout && options.timeout < 100) {
        stateManager.setErrorScenario('timeout');
      }

      // 检查是否为Git命令
      if (!command.startsWith('git ')) {
        throw new Error(`Not a git command: ${command}`);
      }

      try {
        const result = stateManager.handleGitCommand(command);
        return Buffer.from(result);
      } catch (error) {
        // 模拟execSync的错误行为
        const execError = new Error(`Command failed: ${command}`) as Error & {
          status?: number;
          stderr?: Buffer;
          killed?: boolean;
          signal?: string | null;
        };
        const errorObj = error as {
          code?: number;
          stderr?: string;
          message?: string;
          killed?: boolean;
          signal?: string;
        };
        execError.status = errorObj.code || 1;
        execError.stderr = Buffer.from(errorObj.stderr || errorObj.message || '');
        execError.killed = errorObj.killed || false;
        execError.signal = errorObj.signal || null;
        throw execError;
      }
    }
  );
}

/**
 * 测量函数执行时间 | Measure function execution time
 */
export async function measureTime<T>(
  fn: () => Promise<T> | T
): Promise<{ result: T; time: number }> {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  const time = Number(end - start) / 1_000_000; // Convert to milliseconds
  return { result, time };
}

/**
 * 创建缓存命中率测试 | Create cache hit rate test
 */
export function createCacheHitTest<T>(
  fn: () => Promise<T> | T,
  expectedCacheHits: number,
  mockExecSync: Mock
) {
  return async () => {
    const initialCalls = mockExecSync.mock.calls.length;

    // 执行多次相同操作
    const results = [];
    for (let i = 0; i < expectedCacheHits + 1; i++) {
      results.push(await fn());
    }

    const totalCalls = mockExecSync.mock.calls.length - initialCalls;
    const actualCacheHits = expectedCacheHits + 1 - totalCalls;

    return {
      results,
      actualCacheHits,
      expectedCacheHits,
      hitRate: actualCacheHits / (expectedCacheHits + 1),
    };
  };
}
