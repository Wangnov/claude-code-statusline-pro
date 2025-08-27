/**
 * Git场景扩展用于CLI Mock数据系统 | Git scenario extensions for CLI mock data system
 *
 * 扩展现有的Mock数据系统，支持各种Git状态场景的测试
 * Extends existing mock data system to support testing of various Git state scenarios
 */

import type { MockScenario } from '../../src/cli/mock-data.js';
import type { InputData } from '../../src/config/schema.js';
import type { MockRepoState } from './git-mocks.js';
import { repoFixtures } from './repo-fixtures.js';

/**
 * Git场景生成器 | Git scenario generator
 */
export class GitScenarioGenerator {
  /**
   * 生成Git场景的Mock数据 | Generate mock data for Git scenarios
   */
  generateGitScenarios(): Map<string, MockScenario> {
    const scenarios = new Map<string, MockScenario>();

    // Git状态场景
    scenarios.set('git-clean', this.createGitCleanScenario());
    scenarios.set('git-dirty', this.createGitDirtyScenario());
    scenarios.set('git-merging', this.createGitMergingScenario());
    scenarios.set('git-detached', this.createGitDetachedScenario());
    scenarios.set('git-no-upstream', this.createGitNoUpstreamScenario());
    scenarios.set('git-ahead-behind', this.createGitAheadBehindScenario());
    scenarios.set('git-stash', this.createGitStashScenario());
    scenarios.set('git-large-project', this.createGitLargeProjectScenario());
    scenarios.set('git-release', this.createGitReleaseScenario());
    scenarios.set('git-hotfix', this.createGitHotfixScenario());

    // Git错误场景
    scenarios.set('git-not-repo', this.createGitNotRepoScenario());
    scenarios.set('git-permission-error', this.createGitPermissionErrorScenario());
    scenarios.set('git-network-error', this.createGitNetworkErrorScenario());

    return scenarios;
  }

  /**
   * 创建干净仓库场景 | Create clean repository scenario
   */
  private createGitCleanScenario(): MockScenario {
    const repoState = repoFixtures.basic.clean();

    return {
      id: 'git-clean',
      name: '干净Git仓库',
      description: '没有未提交更改的干净Git仓库，适合测试基础功能',
      inputData: this.createInputDataFromRepoState(repoState, {
        sessionId: 'git_clean_session',
        workspace: {
          current_dir: '/Users/dev/clean-project',
          project_dir: '/Users/dev/clean-project',
        },
      }),
      tokenUsage: 25,
      expectedStatus: 'ready',
      suggestedTheme: 'classic',
      configOverrides: {
        theme: 'classic',
        components: {
          order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
          branch: {
            enabled: true,
            icon_color: 'white',
            text_color: 'white',
            emoji_icon: '🌿',
            show_when_no_git: false,
            max_length: 20,
            status: {
              show_dirty: true,
              show_ahead_behind: true,
              show_stash_count: false,
            },
            status_colors: {
              clean: 'green',
              dirty: 'yellow',
              ahead: 'cyan',
              behind: 'magenta',
              operation: 'red',
            },
          },
        },
      },
    };
  }

  /**
   * 创建脏仓库场景 | Create dirty repository scenario
   */
  private createGitDirtyScenario(): MockScenario {
    const repoState = repoFixtures.basic.dirty();

    return {
      id: 'git-dirty',
      name: '有修改的仓库',
      description: '包含暂存、未暂存和未跟踪文件的仓库状态',
      inputData: this.createInputDataFromRepoState(repoState, {
        sessionId: 'git_dirty_session',
        workspace: {
          current_dir: '/Users/dev/active-project',
          project_dir: '/Users/dev/active-project',
        },
      }),
      tokenUsage: 45,
      expectedStatus: 'ready',
      suggestedTheme: 'powerline',
      configOverrides: {
        theme: 'powerline',
        components: {
          order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
          branch: {
            enabled: true,
            icon_color: 'white',
            text_color: 'white',
            emoji_icon: '🌿',
            show_when_no_git: false,
            max_length: 20,
            status: {
              show_dirty: true,
              show_stash_count: true,
              show_ahead_behind: true,
            },
            status_colors: {
              dirty: 'yellow',
              clean: 'green',
              ahead: 'cyan',
              behind: 'magenta',
              operation: 'red',
            },
          },
        },
      },
    };
  }

  /**
   * 创建合并中场景 | Create merge in progress scenario
   */
  private createGitMergingScenario(): MockScenario {
    const repoState = repoFixtures.operations.merging();

    return {
      id: 'git-merging',
      name: '合并进行中',
      description: '正在进行Git合并操作，存在冲突文件',
      inputData: this.createInputDataFromRepoState(repoState, {
        sessionId: 'git_merging_session',
        workspace: {
          current_dir: '/Users/dev/merge-project',
          project_dir: '/Users/dev/merge-project',
        },
      }),
      tokenUsage: 65,
      expectedStatus: 'tool_use',
      suggestedTheme: 'capsule',
      configOverrides: {
        theme: 'capsule',
        components: {
          order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
          branch: {
            enabled: true,
            icon_color: 'white',
            text_color: 'white',
            emoji_icon: '🌿',
            show_when_no_git: false,
            max_length: 20,
            status: {
              show_dirty: true,
              show_ahead_behind: true,
              show_stash_count: false,
            },
            status_colors: {
              operation: 'red',
              dirty: 'yellow',
              clean: 'green',
              ahead: 'cyan',
              behind: 'magenta',
            },
          },
        },
      },
    };
  }

  /**
   * 创建游离HEAD场景 | Create detached HEAD scenario
   */
  private createGitDetachedScenario(): MockScenario {
    const repoState = repoFixtures.branch.detached();

    return {
      id: 'git-detached',
      name: '游离HEAD状态',
      description: '处于游离HEAD状态，通常在查看历史提交时出现',
      inputData: this.createInputDataFromRepoState(repoState, {
        sessionId: 'git_detached_session',
        workspace: {
          current_dir: '/Users/dev/detached-project',
          project_dir: '/Users/dev/detached-project',
        },
      }),
      tokenUsage: 30,
      expectedStatus: 'ready',
      suggestedTheme: 'classic',
      configOverrides: {
        theme: 'classic',
        components: {
          order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
          branch: {
            enabled: true,
            icon_color: 'white',
            text_color: 'white',
            emoji_icon: '🌿',
            show_when_no_git: false,
            max_length: 20,
            status: {
              show_dirty: true,
              show_ahead_behind: true,
              show_stash_count: false,
            },
            status_colors: {
              operation: 'magenta',
              clean: 'green',
              dirty: 'yellow',
              ahead: 'cyan',
              behind: 'magenta',
            },
          },
        },
      },
    };
  }

  /**
   * 创建无上游分支场景 | Create no upstream scenario
   */
  private createGitNoUpstreamScenario(): MockScenario {
    const repoState = repoFixtures.branch.noUpstream();

    return {
      id: 'git-no-upstream',
      name: '无上游分支',
      description: '本地分支没有对应的远程上游分支',
      inputData: this.createInputDataFromRepoState(repoState, {
        sessionId: 'git_no_upstream_session',
        workspace: {
          current_dir: '/Users/dev/local-branch-project',
          project_dir: '/Users/dev/local-branch-project',
        },
      }),
      tokenUsage: 35,
      expectedStatus: 'ready',
      suggestedTheme: 'powerline',
      configOverrides: {
        theme: 'powerline',
        components: {
          order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
          branch: {
            enabled: true,
            icon_color: 'white',
            text_color: 'white',
            emoji_icon: '🌿',
            show_when_no_git: false,
            max_length: 20,
            status: {
              show_ahead_behind: true,
              show_dirty: true,
              show_stash_count: false,
            },
            status_colors: {
              clean: 'green',
              dirty: 'yellow',
              ahead: 'cyan',
              behind: 'magenta',
              operation: 'red',
            },
          },
        },
      },
    };
  }

  /**
   * 创建ahead/behind场景 | Create ahead/behind scenario
   */
  private createGitAheadBehindScenario(): MockScenario {
    const repoState = repoFixtures.branch.diverged();

    return {
      id: 'git-ahead-behind',
      name: '分支分叉状态',
      description: '本地分支既有领先也有落后远程分支的提交',
      inputData: this.createInputDataFromRepoState(repoState, {
        sessionId: 'git_ahead_behind_session',
        workspace: {
          current_dir: '/Users/dev/diverged-project',
          project_dir: '/Users/dev/diverged-project',
        },
      }),
      tokenUsage: 40,
      expectedStatus: 'ready',
      suggestedTheme: 'capsule',
      configOverrides: {
        theme: 'capsule',
        components: {
          order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
          branch: {
            enabled: true,
            icon_color: 'white',
            text_color: 'white',
            emoji_icon: '🌿',
            show_when_no_git: false,
            max_length: 20,
            status: {
              show_ahead_behind: true,
              show_dirty: true,
              show_stash_count: false,
            },
            status_colors: {
              ahead: 'cyan',
              behind: 'magenta',
              clean: 'green',
              dirty: 'yellow',
              operation: 'red',
            },
          },
        },
      },
    };
  }

  /**
   * 创建有存储场景 | Create stash scenario
   */
  private createGitStashScenario(): MockScenario {
    const repoState = repoFixtures.stash.multiple();

    return {
      id: 'git-stash',
      name: '有Git存储',
      description: '仓库中有多个Git stash存储项',
      inputData: this.createInputDataFromRepoState(repoState, {
        sessionId: 'git_stash_session',
        workspace: {
          current_dir: '/Users/dev/stash-project',
          project_dir: '/Users/dev/stash-project',
        },
      }),
      tokenUsage: 38,
      expectedStatus: 'ready',
      suggestedTheme: 'powerline',
      configOverrides: {
        theme: 'powerline',
        components: {
          order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
          branch: {
            enabled: true,
            icon_color: 'white',
            text_color: 'white',
            emoji_icon: '🌿',
            show_when_no_git: false,
            max_length: 20,
            status: {
              show_dirty: true,
              show_ahead_behind: true,
              show_stash_count: true,
            },
            status_colors: {
              clean: 'green',
              dirty: 'yellow',
              ahead: 'cyan',
              behind: 'magenta',
              operation: 'red',
            },
          },
        },
      },
    };
  }

  /**
   * 创建大型项目场景 | Create large project scenario
   */
  private createGitLargeProjectScenario(): MockScenario {
    const repoState = repoFixtures.complex.largeProject();

    return {
      id: 'git-large-project',
      name: '大型项目开发',
      description: '复杂的大型项目状态，包含多种Git状态组合',
      inputData: this.createInputDataFromRepoState(repoState, {
        sessionId: 'git_large_project_session',
        workspace: {
          current_dir: '/Users/dev/enterprise-app',
          project_dir: '/Users/dev/enterprise-app',
        },
      }),
      tokenUsage: 75,
      expectedStatus: 'thinking',
      suggestedTheme: 'capsule',
      configOverrides: {
        theme: 'capsule',
        components: {
          order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
          branch: {
            enabled: true,
            icon_color: 'white',
            text_color: 'white',
            emoji_icon: '🌿',
            show_when_no_git: false,
            max_length: 25,
            status: {
              show_dirty: true,
              show_ahead_behind: true,
              show_stash_count: true,
            },
            status_colors: {
              clean: 'green',
              dirty: 'yellow',
              ahead: 'cyan',
              behind: 'magenta',
              operation: 'red',
            },
            performance: {
              enable_cache: true,
              cache_ttl: 10000,
              git_timeout: 1000,
              parallel_commands: true,
              lazy_load_status: true,
              skip_on_large_repo: false,
              large_repo_threshold: 10000,
            },
          },
        },
      },
    };
  }

  /**
   * 创建发布场景 | Create release scenario
   */
  private createGitReleaseScenario(): MockScenario {
    const repoState = repoFixtures.complex.releasePrep();

    return {
      id: 'git-release',
      name: '发布准备',
      description: '准备发布新版本，在release分支上进行最后的修改',
      inputData: this.createInputDataFromRepoState(repoState, {
        sessionId: 'git_release_session',
        workspace: {
          current_dir: '/Users/dev/release-project',
          project_dir: '/Users/dev/release-project',
        },
      }),
      tokenUsage: 50,
      expectedStatus: 'ready',
      suggestedTheme: 'classic',
      configOverrides: {
        theme: 'classic',
        components: {
          order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
          branch: {
            enabled: true,
            icon_color: 'white',
            text_color: 'white',
            emoji_icon: '🌿',
            show_when_no_git: false,
            max_length: 20,
            status: {
              show_dirty: true,
              show_ahead_behind: true,
              show_stash_count: false,
            },
            status_colors: {
              clean: 'green',
              dirty: 'yellow',
              ahead: 'cyan',
              behind: 'magenta',
              operation: 'red',
            },
          },
        },
      },
    };
  }

  /**
   * 创建热修复场景 | Create hotfix scenario
   */
  private createGitHotfixScenario(): MockScenario {
    const hotfixState: MockRepoState = {
      ...repoFixtures.basic.clean(),
      currentBranch: 'hotfix/critical-security-fix',
      upstreamBranch: 'origin/hotfix/critical-security-fix',
      ahead: 1,
      behind: 0,
      workingStatus: {
        staged: ['M  src/security/auth.ts'],
        unstaged: [],
        untracked: [],
        conflicted: [],
      },
      version: {
        sha: 'hotfix-abc123def456789012345678901234567890',
        shortSha: 'hotfix-a',
        message: 'fix(security): critical authentication vulnerability',
        author: 'Security Team',
        timestamp: '1672790400', // 2023-01-04 00:00:00 UTC
      },
    };

    return {
      id: 'git-hotfix',
      name: '紧急热修复',
      description: '正在进行紧急安全修复，需要快速发布',
      inputData: this.createInputDataFromRepoState(hotfixState, {
        sessionId: 'git_hotfix_session',
        workspace: {
          current_dir: '/Users/dev/hotfix-project',
          project_dir: '/Users/dev/hotfix-project',
        },
      }),
      tokenUsage: 85,
      expectedStatus: 'tool_use',
      suggestedTheme: 'powerline',
      configOverrides: {
        theme: 'powerline',
        components: {
          order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
          branch: {
            enabled: true,
            icon_color: 'white',
            text_color: 'white',
            emoji_icon: '🌿',
            show_when_no_git: false,
            max_length: 20,
            status: {
              show_dirty: true,
              show_ahead_behind: true,
              show_stash_count: false,
            },
            status_colors: {
              dirty: 'red',
              operation: 'bright_red',
              clean: 'green',
              ahead: 'cyan',
              behind: 'magenta',
            },
          },
        },
      },
    };
  }

  /**
   * 创建非Git仓库场景 | Create non-Git repository scenario
   */
  private createGitNotRepoScenario(): MockScenario {
    const notGitState = repoFixtures.basic.notGit();

    return {
      id: 'git-not-repo',
      name: '非Git目录',
      description: '当前目录不是Git仓库',
      inputData: this.createInputDataFromRepoState(notGitState, {
        sessionId: 'git_not_repo_session',
        workspace: {
          current_dir: '/Users/dev/regular-folder',
          project_dir: '/Users/dev/regular-folder',
        },
      }),
      tokenUsage: 20,
      expectedStatus: 'ready',
      suggestedTheme: 'classic',
      configOverrides: {
        theme: 'classic',
        components: {
          order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
          branch: {
            enabled: true,
            icon_color: 'white',
            text_color: 'white',
            emoji_icon: '🌿',
            show_when_no_git: false, // 不显示非Git状态
            max_length: 20,
            status: {
              show_dirty: true,
              show_ahead_behind: true,
              show_stash_count: false,
            },
            status_colors: {
              clean: 'green',
              dirty: 'yellow',
              ahead: 'cyan',
              behind: 'magenta',
              operation: 'red',
            },
          },
        },
      },
    };
  }

  /**
   * 创建权限错误场景 | Create permission error scenario
   */
  private createGitPermissionErrorScenario(): MockScenario {
    const permissionState = repoFixtures.basic.clean();

    return {
      id: 'git-permission-error',
      name: 'Git权限错误',
      description: '无法访问Git目录或文件，权限被拒绝',
      inputData: this.createInputDataFromRepoState(permissionState, {
        sessionId: 'git_permission_error_session',
        workspace: {
          current_dir: '/restricted/git/repo',
          project_dir: '/restricted/git/repo',
        },
      }),
      tokenUsage: 15,
      expectedStatus: 'error',
      suggestedTheme: 'classic',
      configOverrides: {
        theme: 'classic',
        components: {
          order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
          branch: {
            enabled: true,
            icon_color: 'white',
            text_color: 'white',
            emoji_icon: '🌿',
            show_when_no_git: false,
            max_length: 20,
            status: {
              show_dirty: true,
              show_ahead_behind: true,
              show_stash_count: false,
            },
            status_colors: {
              operation: 'red',
              clean: 'green',
              dirty: 'yellow',
              ahead: 'cyan',
              behind: 'magenta',
            },
          },
        },
      },
    };
  }

  /**
   * 创建网络错误场景 | Create network error scenario
   */
  private createGitNetworkErrorScenario(): MockScenario {
    const networkErrorState = repoFixtures.basic.clean();

    return {
      id: 'git-network-error',
      name: 'Git网络错误',
      description: '无法连接到远程Git仓库，网络连接问题',
      inputData: this.createInputDataFromRepoState(networkErrorState, {
        sessionId: 'git_network_error_session',
        workspace: {
          current_dir: '/Users/dev/network-error-project',
          project_dir: '/Users/dev/network-error-project',
        },
      }),
      tokenUsage: 25,
      expectedStatus: 'error',
      suggestedTheme: 'powerline',
      configOverrides: {
        theme: 'powerline',
        components: {
          order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
          branch: {
            enabled: true,
            icon_color: 'white',
            text_color: 'white',
            emoji_icon: '🌿',
            show_when_no_git: false,
            max_length: 20,
            status: {
              show_dirty: true,
              show_ahead_behind: true,
              show_stash_count: false,
            },
            status_colors: {
              operation: 'red',
              dirty: 'yellow',
              clean: 'green',
              ahead: 'cyan',
              behind: 'magenta',
            },
          },
        },
      },
    };
  }

  /**
   * 从仓库状态创建输入数据 | Create input data from repository state
   */
  private createInputDataFromRepoState(
    repoState: MockRepoState,
    overrides: Partial<InputData> = {}
  ): InputData {
    return {
      hookEventName: 'Status',
      sessionId: 'default_session',
      model: {
        id: 'claude-sonnet-4',
        display_name: 'Claude Sonnet 4',
      },
      workspace: {
        current_dir: '/Users/dev/project',
        project_dir: '/Users/dev/project',
      },
      transcriptPath: '/tmp/claude_transcript.json',
      cwd: '/Users/dev/project',
      gitBranch: repoState.currentBranch,
      cost: null,
      ...overrides,
    };
  }
}

/**
 * 创建Git场景测试工具 | Create Git scenario testing utilities
 */
export class GitScenarioTester {
  private scenarios: Map<string, MockScenario>;

  constructor() {
    const generator = new GitScenarioGenerator();
    this.scenarios = generator.generateGitScenarios();
  }

  /**
   * 获取所有Git场景 | Get all Git scenarios
   */
  getAllScenarios(): MockScenario[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * 获取特定Git场景 | Get specific Git scenario
   */
  getScenario(id: string): MockScenario | undefined {
    return this.scenarios.get(id);
  }

  /**
   * 获取按类型分组的场景 | Get scenarios grouped by type
   */
  getScenariosByType(): {
    basic: MockScenario[];
    advanced: MockScenario[];
    errors: MockScenario[];
  } {
    const all = this.getAllScenarios();

    return {
      basic: all.filter((s) =>
        ['git-clean', 'git-dirty', 'git-detached', 'git-no-upstream'].includes(s.id)
      ),
      advanced: all.filter((s) =>
        [
          'git-merging',
          'git-ahead-behind',
          'git-stash',
          'git-large-project',
          'git-release',
          'git-hotfix',
        ].includes(s.id)
      ),
      errors: all.filter((s) =>
        ['git-not-repo', 'git-permission-error', 'git-network-error'].includes(s.id)
      ),
    };
  }

  /**
   * 按主题分组场景 | Group scenarios by theme
   */
  getScenariosByTheme(): {
    classic: MockScenario[];
    powerline: MockScenario[];
    capsule: MockScenario[];
  } {
    const all = this.getAllScenarios();

    return {
      classic: all.filter((s) => s.suggestedTheme === 'classic'),
      powerline: all.filter((s) => s.suggestedTheme === 'powerline'),
      capsule: all.filter((s) => s.suggestedTheme === 'capsule'),
    };
  }

  /**
   * 根据Token使用量获取场景 | Get scenarios by token usage
   */
  getScenariosByTokenUsage(): {
    low: MockScenario[]; // < 30%
    medium: MockScenario[]; // 30-60%
    high: MockScenario[]; // 60-80%
    critical: MockScenario[]; // > 80%
  } {
    const all = this.getAllScenarios();

    return {
      low: all.filter((s) => (s.tokenUsage || 0) < 30),
      medium: all.filter((s) => {
        const usage = s.tokenUsage || 0;
        return usage >= 30 && usage < 60;
      }),
      high: all.filter((s) => {
        const usage = s.tokenUsage || 0;
        return usage >= 60 && usage < 80;
      }),
      critical: all.filter((s) => (s.tokenUsage || 0) >= 80),
    };
  }

  /**
   * 创建测试套件 | Create test suite
   */
  createTestSuite(scenarioIds: string[] = []): MockScenario[] {
    const ids = scenarioIds.length > 0 ? scenarioIds : Array.from(this.scenarios.keys());
    return ids.map((id) => this.scenarios.get(id)).filter(Boolean) as MockScenario[];
  }
}
