/**
 * 测试仓库状态数据 | Test repository state fixtures
 *
 * 提供各种Git仓库状态的测试数据，支持复杂的Git场景测试
 * Provides test data for various Git repository states, supporting complex Git scenario testing
 */

import type { GitErrorScenario, MockRepoState } from './git-mocks.js';

/**
 * 仓库状态预设集合 | Repository state presets collection
 */
export const repoFixtures = {
  /**
   * 基础状态 | Basic states
   */
  basic: {
    /** 全新的干净仓库 | Fresh clean repository */
    clean: (): MockRepoState => ({
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
        sha: 'abc123def456789012345678901234567890abcd',
        shortSha: 'abc123d',
        message: 'feat: initial commit',
        author: 'Test Developer',
        timestamp: '1672531200', // 2023-01-01 00:00:00 UTC
      },
      stash: {
        count: 0,
        entries: [],
      },
      tags: {
        latest: 'v1.0.0',
        commitsSinceTag: 0,
      },
    }),

    /** 有修改的脏仓库 | Repository with modifications */
    dirty: (): MockRepoState => ({
      ...repoFixtures.basic.clean(),
      workingStatus: {
        staged: ['M  src/components/branch.ts', 'A  src/types/new.ts'],
        unstaged: [' M package.json', ' D old-file.txt'],
        untracked: ['?? temp-file.log', '?? .env.local'],
        conflicted: [],
      },
    }),

    /** 非Git目录 | Non-Git directory */
    notGit: (): MockRepoState => ({
      isGitRepo: false,
      currentBranch: 'no-git',
      detached: false,
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
        sha: '',
        shortSha: '',
        message: '',
        author: '',
        timestamp: '0',
      },
      stash: {
        count: 0,
        entries: [],
      },
      tags: {},
    }),
  },

  /**
   * 分支状态 | Branch states
   */
  branch: {
    /** 游离HEAD状态 | Detached HEAD state */
    detached: (): MockRepoState => {
      const state = {
        ...repoFixtures.basic.clean(),
        currentBranch: 'HEAD',
        detached: true,
        ahead: 0,
        behind: 0,
      };
      // 明确删除 upstreamBranch 属性以满足 exactOptionalPropertyTypes
      delete (state as unknown as Record<string, unknown>).upstreamBranch;
      return state;
    },

    /** 功能分支 | Feature branch */
    feature: (): MockRepoState => ({
      ...repoFixtures.basic.clean(),
      currentBranch: 'feature/user-authentication',
      upstreamBranch: 'origin/feature/user-authentication',
      ahead: 3,
      behind: 1,
    }),

    /** 无上游分支 | No upstream branch */
    noUpstream: (): MockRepoState => {
      const state = {
        ...repoFixtures.basic.clean(),
        currentBranch: 'local-only-branch',
        ahead: 0,
        behind: 0,
      };
      // 明确删除 upstreamBranch 属性以满足 exactOptionalPropertyTypes
      delete (state as unknown as Record<string, unknown>).upstreamBranch;
      return state;
    },

    /** 远程分支落后 | Behind remote branch */
    behind: (): MockRepoState => ({
      ...repoFixtures.basic.clean(),
      ahead: 0,
      behind: 5,
    }),

    /** 本地分支超前 | Ahead of remote branch */
    ahead: (): MockRepoState => ({
      ...repoFixtures.basic.clean(),
      ahead: 3,
      behind: 0,
    }),

    /** 分支分叉 | Diverged branches */
    diverged: (): MockRepoState => ({
      ...repoFixtures.basic.clean(),
      ahead: 2,
      behind: 3,
    }),
  },

  /**
   * 操作状态 | Operation states
   */
  operations: {
    /** 合并进行中 | Merge in progress */
    merging: (): MockRepoState => ({
      ...repoFixtures.basic.dirty(),
      workingStatus: {
        staged: [],
        unstaged: [],
        untracked: [],
        conflicted: ['UU src/config.ts', 'AA README.md'],
      },
      operation: {
        type: 'merge',
        inProgress: true,
      },
    }),

    /** 变基进行中 | Rebase in progress */
    rebasing: (): MockRepoState => ({
      ...repoFixtures.basic.clean(),
      operation: {
        type: 'rebase',
        inProgress: true,
      },
    }),

    /** Cherry-pick进行中 | Cherry-pick in progress */
    cherryPicking: (): MockRepoState => ({
      ...repoFixtures.basic.clean(),
      operation: {
        type: 'cherry-pick',
        inProgress: true,
      },
    }),

    /** Bisect进行中 | Bisect in progress */
    bisecting: (): MockRepoState => ({
      ...repoFixtures.basic.clean(),
      operation: {
        type: 'bisect',
        inProgress: true,
      },
    }),
  },

  /**
   * 存储状态 | Stash states
   */
  stash: {
    /** 单个存储 | Single stash */
    single: (): MockRepoState => ({
      ...repoFixtures.basic.clean(),
      stash: {
        count: 1,
        entries: [
          {
            index: 0,
            description: 'WIP on main: abc123d feat: work in progress',
            branch: 'main',
          },
        ],
      },
    }),

    /** 多个存储 | Multiple stashes */
    multiple: (): MockRepoState => ({
      ...repoFixtures.basic.clean(),
      stash: {
        count: 3,
        entries: [
          {
            index: 0,
            description: 'WIP on main: def456e fix: latest work',
            branch: 'main',
          },
          {
            index: 1,
            description: 'WIP on feature: abc123d feat: feature work',
            branch: 'feature/test',
          },
          {
            index: 2,
            description: 'On main: ghi789f docs: documentation update',
            branch: 'main',
          },
        ],
      },
    }),

    /** 无存储 | No stash */
    empty: (): MockRepoState => ({
      ...repoFixtures.basic.clean(),
      stash: {
        count: 0,
        entries: [],
      },
    }),
  },

  /**
   * 版本状态 | Version states
   */
  version: {
    /** 带标签的版本 | Version with tags */
    tagged: (): MockRepoState => ({
      ...repoFixtures.basic.clean(),
      version: {
        sha: 'v2.1.0-5-gdef456e7890123456789012345678901234',
        shortSha: 'def456e',
        message: 'feat: add new feature for v2.1.0',
        author: 'Release Manager',
        timestamp: '1672617600', // 2023-01-02 00:00:00 UTC
      },
      tags: {
        latest: 'v2.1.0',
        commitsSinceTag: 5,
      },
    }),

    /** 无标签版本 | Version without tags */
    untagged: (): MockRepoState => ({
      ...repoFixtures.basic.clean(),
      tags: {},
    }),

    /** 初始提交 | Initial commit */
    initial: (): MockRepoState => ({
      ...repoFixtures.basic.clean(),
      version: {
        sha: '1a2b3c4d5e6f7890123456789012345678901234',
        shortSha: '1a2b3c4',
        message: 'Initial commit',
        author: 'Initial Author',
        timestamp: '1672531200', // 2023-01-01 00:00:00 UTC
      },
      tags: {},
    }),
  },

  /**
   * 复杂场景 | Complex scenarios
   */
  complex: {
    /** 大型项目状态 | Large project state */
    largeProject: (): MockRepoState => ({
      ...repoFixtures.basic.dirty(),
      currentBranch: 'develop',
      upstreamBranch: 'origin/develop',
      ahead: 12,
      behind: 8,
      workingStatus: {
        staged: [
          'M  src/components/branch.ts',
          'M  src/components/tokens.ts',
          'A  src/git/service.ts',
          'A  src/git/cache.ts',
          'D  old/legacy.ts',
        ],
        unstaged: [
          ' M package.json',
          ' M tsconfig.json',
          ' M vitest.config.ts',
          ' D deprecated/old-feature.ts',
        ],
        untracked: ['?? tests/unit/git/', '?? docs/api.md', '?? .env.development'],
        conflicted: [],
      },
      stash: {
        count: 2,
        entries: [
          {
            index: 0,
            description: 'WIP on develop: abc123d feat: large feature development',
            branch: 'develop',
          },
          {
            index: 1,
            description: 'On feature/refactor: def456e refactor: code organization',
            branch: 'feature/refactor',
          },
        ],
      },
      tags: {
        latest: 'v1.5.2',
        commitsSinceTag: 23,
      },
    }),

    /** 发布准备状态 | Release preparation state */
    releasePrep: (): MockRepoState => ({
      ...repoFixtures.basic.clean(),
      currentBranch: 'release/v2.0.0',
      upstreamBranch: 'origin/release/v2.0.0',
      ahead: 0,
      behind: 0,
      workingStatus: {
        staged: ['M  package.json', 'M  CHANGELOG.md'],
        unstaged: [],
        untracked: [],
        conflicted: [],
      },
      version: {
        sha: 'release-abc123def456789012345678901234567890',
        shortSha: 'rel-abc',
        message: 'chore: prepare for v2.0.0 release',
        author: 'Release Bot',
        timestamp: '1672704000', // 2023-01-03 00:00:00 UTC
      },
      tags: {
        latest: 'v2.0.0-rc.1',
        commitsSinceTag: 2,
      },
    }),
  },

  /**
   * 错误场景 | Error scenarios
   */
  errors: {
    /** 权限问题 | Permission issues */
    permissionDenied: 'permission_denied' as GitErrorScenario,

    /** 网络错误 | Network errors */
    networkError: 'network_error' as GitErrorScenario,

    /** 超时错误 | Timeout errors */
    timeout: 'timeout' as GitErrorScenario,

    /** 无效分支 | Invalid branch */
    invalidBranch: 'invalid_branch' as GitErrorScenario,

    /** 合并冲突 | Merge conflict */
    mergeConflict: 'merge_conflict' as GitErrorScenario,

    /** 无提交 | No commits */
    noCommits: 'no_commits' as GitErrorScenario,
  },
};

/**
 * 性能测试数据 | Performance test data
 */
export const performanceFixtures = {
  /** 缓存测试数据 | Cache test data */
  cache: {
    /** 快速连续调用 | Rapid consecutive calls */
    rapidCalls: {
      iterations: 10,
      expectedCacheHits: 9,
      maxExecutionTime: 50, // milliseconds
    },

    /** 缓存过期测试 | Cache expiration test */
    expiration: {
      cacheTTL: 100, // milliseconds
      waitTime: 150, // milliseconds
      expectedRefresh: true,
    },

    /** 大数据集缓存 | Large dataset cache */
    largeDataset: {
      fileCount: 1000,
      expectedCacheSize: 1000,
      maxMemoryUsage: 10 * 1024 * 1024, // 10MB
    },
  },

  /** 超时测试数据 | Timeout test data */
  timeout: {
    /** 快速操作 | Fast operations */
    fast: {
      timeout: 1000,
      expectedDuration: 50,
    },

    /** 慢操作 | Slow operations */
    slow: {
      timeout: 100,
      expectedTimeout: true,
    },
  },
};

/**
 * 配置测试数据 | Configuration test data
 */
export const configFixtures = {
  /** 基础配置 | Basic configuration */
  basic: {
    timeout: 1000,
    cwd: '/test/repo',
    cache: {
      enabled: true,
      duration: 5000,
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
  },

  /** 禁用缓存配置 | Disabled cache configuration */
  noCache: {
    timeout: 1000,
    cwd: '/test/repo',
    cache: {
      enabled: false,
      duration: 5000,
      cacheTypes: {
        branch: false,
        status: false,
        version: false,
        stash: false,
      },
    },
    features: {
      fetchComparison: true,
      fetchStash: true,
      fetchOperation: true,
      fetchVersion: true,
    },
  },

  /** 选择性缓存配置 | Selective cache configuration */
  selectiveCache: {
    timeout: 1000,
    cwd: '/test/repo',
    cache: {
      enabled: true,
      duration: 5000,
      cacheTypes: {
        branch: true,
        status: false, // 禁用状态缓存
        version: true,
        stash: false, // 禁用存储缓存
      },
    },
    features: {
      fetchComparison: true,
      fetchStash: true,
      fetchOperation: false, // 禁用操作获取
      fetchVersion: true,
    },
  },

  /** 性能优化配置 | Performance optimized configuration */
  performance: {
    timeout: 500, // 更短的超时
    cwd: '/test/repo',
    cache: {
      enabled: true,
      duration: 10000, // 更长的缓存时间
      cacheTypes: {
        branch: true,
        status: true,
        version: true,
        stash: true,
      },
    },
    features: {
      fetchComparison: false, // 禁用比较以提高性能
      fetchStash: false, // 禁用存储以提高性能
      fetchOperation: false, // 禁用操作以提高性能
      fetchVersion: false, // 禁用版本以提高性能
    },
  },
};
