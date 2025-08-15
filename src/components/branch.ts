import { execSync } from 'node:child_process';
import type {
  BranchComponentConfig,
  BranchStatusIconsConfig,
  ComponentConfig,
  RenderContext,
} from '../config/schema.js';
import type {
  GitBranchInfo,
  GitInfo,
  GitOperationStatus,
  GitService,
  GitStashInfo,
  GitVersionInfo,
  GitWorkingStatus,
} from '../git/index.js';
import {
  createConfiguredGitService,
  createLightweightGitService,
  GitOperationType,
} from '../git/index.js';
import { BaseComponent, type ComponentFactory } from './base.js';

/**
 * 分支组件 | Branch component
 * 显示当前Git分支信息和状态 | Display current Git branch information and status
 *
 * 功能特性 | Features:
 * - 基础分支名显示 | Basic branch name display
 * - 工作区状态显示 | Working directory status display
 * - Git操作状态显示 | Git operation status display
 * - 版本信息显示 | Version information display
 * - 智能图标和颜色系统 | Smart icon and color system
 * - 性能优化和缓存 | Performance optimization and caching
 * - 向后兼容支持 | Backward compatibility support
 */
export class BranchComponent extends BaseComponent {
  private branchConfig: BranchComponentConfig;
  private gitService?: GitService;
  private fallbackToExecSync: boolean = false;

  constructor(name: string, config: BranchComponentConfig) {
    super(name, config);
    this.branchConfig = config;

    // 根据配置初始化GitService | Initialize GitService based on configuration
    this.initializeGitService();
  }

  /**
   * 初始化GitService | Initialize GitService
   * 根据配置决定是否启用GitService以及使用哪种配置 | Decide whether to enable GitService and which configuration to use based on settings
   */
  private initializeGitService(): void {
    // 检查是否有任何增强功能被启用 | Check if any enhanced features are enabled
    const hasEnhancedFeatures =
      this.branchConfig.status?.show_dirty ||
      this.branchConfig.status?.show_ahead_behind ||
      this.branchConfig.status?.show_stash_count ||
      this.branchConfig.status?.show_staged_count ||
      this.branchConfig.status?.show_unstaged_count ||
      this.branchConfig.status?.show_untracked_count ||
      this.branchConfig.operations?.show_merge ||
      this.branchConfig.operations?.show_rebase ||
      this.branchConfig.operations?.show_cherry_pick ||
      this.branchConfig.operations?.show_bisect ||
      this.branchConfig.version?.show_commit_hash ||
      this.branchConfig.version?.show_tag ||
      this.branchConfig.version?.show_commit_time;

    // 只有在启用增强功能时才创建GitService | Only create GitService when enhanced features are enabled
    if (!hasEnhancedFeatures) {
      return;
    }

    try {
      const performance = this.branchConfig.performance;
      const cwd = process.cwd(); // 可以从renderContext中获取 | Can be obtained from renderContext

      if (performance) {
        // 使用自定义性能配置创建GitService | Create GitService with custom performance configuration
        this.gitService = createConfiguredGitService(
          cwd,
          performance.git_timeout || 1000,
          performance.enable_cache !== false
        );

        // 应用详细配置 | Apply detailed configuration
        this.gitService.updateConfig({
          timeout: performance.git_timeout || 1000,
          cache: {
            enabled: performance.enable_cache !== false,
            duration: performance.cache_ttl || 5000,
            cacheTypes: {
              branch: true,
              status: true,
              version: !!this.branchConfig.version,
              stash: !!this.branchConfig.status?.show_stash_count,
            },
          },
          features: {
            fetchComparison: !!this.branchConfig.status?.show_ahead_behind,
            fetchStash: !!this.branchConfig.status?.show_stash_count,
            fetchOperation: this.hasOperationFeatures(),
            fetchVersion: this.hasVersionFeatures(),
          },
        });
      } else {
        // 使用轻量级配置 | Use lightweight configuration
        this.gitService = createLightweightGitService(cwd, 1000);
      }
    } catch (error) {
      // GitService初始化失败，回退到execSync | GitService initialization failed, fallback to execSync
      console.warn('GitService initialization failed, falling back to execSync:', error);
      this.fallbackToExecSync = true;
    }
  }

  /**
   * 检查是否启用了操作相关功能 | Check if operation related features are enabled
   */
  private hasOperationFeatures(): boolean {
    return !!(
      this.branchConfig.operations?.show_merge ||
      this.branchConfig.operations?.show_rebase ||
      this.branchConfig.operations?.show_cherry_pick ||
      this.branchConfig.operations?.show_bisect
    );
  }

  /**
   * 检查是否启用了版本相关功能 | Check if version related features are enabled
   */
  private hasVersionFeatures(): boolean {
    return !!(
      this.branchConfig.version?.show_commit_hash ||
      this.branchConfig.version?.show_tag ||
      this.branchConfig.version?.show_commit_time
    );
  }

  protected async renderContent(context: RenderContext): Promise<string | null> {
    // 解构context但不使用所有变量 | Destructure context but don't use all variables
    const { inputData: _inputData, config: _config } = context;

    try {
      // 如果有GitService且未强制回退，使用GitService | If GitService exists and not forced fallback, use GitService
      if (this.gitService && !this.fallbackToExecSync) {
        try {
          return await this.renderWithGitService(context);
        } catch (_gitServiceError) {
          // GitService失败时回退到增强execSync | Fallback to enhanced execSync when GitService fails
          this.fallbackToExecSync = true;
          return this.renderWithEnhancedExecSync(context);
        }
      } else {
        // 使用增强execSync实现 | Use enhanced execSync implementation
        return this.renderWithEnhancedExecSync(context);
      }
    } catch (_error) {
      // 最终回退到基础实现 | Final fallback to basic implementation
      return this.renderWithExecSync(context);
    }
  }

  /**
   * 使用GitService渲染 | Render using GitService
   */
  private async renderWithGitService(context: RenderContext): Promise<string | null> {
    const { inputData } = context;
    const cwd = inputData.workspace?.current_dir || inputData.cwd || process.cwd();

    // 更新GitService的工作目录 | Update GitService working directory
    this.gitService!.updateConfig({ cwd });

    // 获取完整Git信息 | Get complete Git information
    const gitInfo = await this.gitService!.getGitInfo();

    // 如果不在Git仓库中 | If not in Git repository
    if (!gitInfo.isRepo) {
      if (this.branchConfig.show_when_no_git) {
        return this.formatOutput('no-git');
      }
      return null;
    }

    // 渲染增强的分支信息 | Render enhanced branch information
    return this.renderEnhancedBranchInfo(gitInfo);
  }

  /**
   * 使用execSync回退实现 | Fallback implementation using execSync
   */
  private renderWithExecSync(context: RenderContext): string | null {
    const { inputData, config } = context;

    let branch = inputData.gitBranch;

    // 如果没有提供分支信息，尝试通过Git命令获取 | If no branch info provided, try to get via Git command
    if (!branch) {
      try {
        branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', {
          cwd: inputData.workspace?.current_dir || inputData.cwd,
          encoding: 'utf8',
          timeout: config.advanced?.git_timeout || 1000,
        }).trim();
      } catch (_error) {
        branch = 'no-git';
      }
    }

    // 检查是否在无Git时显示 | Check if should display when no Git
    if (branch === 'no-git' && !this.branchConfig.show_when_no_git) {
      return null;
    }

    // 截断过长的分支名 | Truncate long branch names
    let displayBranch = branch;
    const maxLength = this.branchConfig.max_length;
    if (maxLength && displayBranch.length > maxLength) {
      displayBranch = `${displayBranch.substring(0, maxLength - 3)}...`;
    }

    // 使用BaseComponent的formatOutput自动处理图标和颜色 | Use BaseComponent formatOutput to automatically handle icons and colors
    return this.formatOutput(displayBranch);
  }

  /**
   * 渲染增强的分支信息 | Render enhanced branch information
   */
  private renderEnhancedBranchInfo(gitInfo: GitInfo): string {
    const parts: string[] = [];

    // 1. 基础分支名 | Basic branch name
    const branchName = this.formatBranchName(gitInfo.branch.current);
    parts.push(branchName);

    // 2. 工作区状态信息 | Working directory status information
    const statusPart = this.renderStatusInfo(gitInfo.status, gitInfo.stash);
    if (statusPart) parts.push(statusPart);

    // 3. ahead/behind信息 | ahead/behind information
    const comparisonPart = this.renderComparisonInfo(gitInfo.branch);
    if (comparisonPart) parts.push(comparisonPart);

    // 4. 操作状态信息 | Operation status information
    const operationPart = this.renderOperationInfo(gitInfo.operation);
    if (operationPart) parts.push(operationPart);

    // 5. 版本信息 | Version information
    const versionPart = this.renderVersionInfo(gitInfo.version);
    if (versionPart) parts.push(versionPart);

    return parts.join('');
  }

  /**
   * 格式化分支名 | Format branch name
   */
  private formatBranchName(branchName: string): string {
    // 截断过长的分支名 | Truncate long branch names
    let displayBranch = branchName;
    const maxLength = this.branchConfig.max_length;
    if (maxLength && displayBranch.length > maxLength) {
      displayBranch = `${displayBranch.substring(0, maxLength - 3)}...`;
    }

    // 应用基础组件的图标和颜色 | Apply base component icons and colors
    return this.formatOutput(displayBranch);
  }

  /**
   * 渲染状态信息 | Render status information
   */
  private renderStatusInfo(status: GitWorkingStatus, stash: GitStashInfo): string {
    if (!this.branchConfig.status) return '';

    const statusParts: string[] = [];
    const statusConfig = this.branchConfig.status;
    const icons = this.branchConfig.status_icons;
    const colors = this.branchConfig.status_colors;

    // 脏工作区状态 | Dirty workspace status
    if (statusConfig.show_dirty && !status.clean) {
      const icon = this.getStatusIcon('dirty', icons);
      const colorName = colors?.dirty || 'yellow';
      statusParts.push(this.colorize(icon, colorName));
    }

    // 暂存文件数 | Staged file count
    if (statusConfig.show_staged_count && status.staged > 0) {
      statusParts.push(`S:${status.staged}`);
    }

    // 未暂存文件数 | Unstaged file count
    if (statusConfig.show_unstaged_count && status.unstaged > 0) {
      statusParts.push(`M:${status.unstaged}`);
    }

    // 未跟踪文件数 | Untracked file count
    if (statusConfig.show_untracked_count && status.untracked > 0) {
      statusParts.push(`?:${status.untracked}`);
    }

    // stash数量 | stash count
    if (statusConfig.show_stash_count && stash.count > 0) {
      const icon = this.getStatusIcon('stash', icons);
      statusParts.push(`${icon}${stash.count}`);
    }

    return statusParts.length > 0 ? statusParts.join('') : '';
  }

  /**
   * 渲染比较信息(ahead/behind) | Render comparison information (ahead/behind)
   */
  private renderComparisonInfo(branch: GitBranchInfo): string {
    if (!this.branchConfig.status?.show_ahead_behind) return '';

    const parts: string[] = [];
    const icons = this.branchConfig.status_icons;
    const colors = this.branchConfig.status_colors;

    if (branch.ahead > 0) {
      const icon = this.getStatusIcon('ahead', icons);
      const colorName = colors?.ahead || 'cyan';
      parts.push(this.colorize(`${icon}${branch.ahead}`, colorName));
    }

    if (branch.behind > 0) {
      const icon = this.getStatusIcon('behind', icons);
      const colorName = colors?.behind || 'magenta';
      parts.push(this.colorize(`${icon}${branch.behind}`, colorName));
    }

    return parts.join('');
  }

  /**
   * 渲染操作状态信息 | Render operation status information
   */
  private renderOperationInfo(operation: GitOperationStatus): string {
    if (!operation.inProgress || !this.branchConfig.operations) return '';

    const operationsConfig = this.branchConfig.operations;
    const colors = this.branchConfig.status_colors;
    const colorName = colors?.operation || 'red';

    let icon = '';
    switch (operation.type) {
      case GitOperationType.MERGE:
        if (operationsConfig.show_merge) icon = '🔀';
        break;
      case GitOperationType.REBASE:
        if (operationsConfig.show_rebase) icon = '📋';
        break;
      case GitOperationType.CHERRY_PICK:
        if (operationsConfig.show_cherry_pick) icon = '🍒';
        break;
      case GitOperationType.BISECT:
        if (operationsConfig.show_bisect) icon = '🔍';
        break;
      default:
        return '';
    }

    return icon ? this.colorize(icon, colorName) : '';
  }

  /**
   * 渲染版本信息 | Render version information
   */
  private renderVersionInfo(version: GitVersionInfo): string {
    if (!this.branchConfig.version) return '';

    const versionConfig = this.branchConfig.version;
    const parts: string[] = [];

    // 提交哈希 | Commit hash
    if (versionConfig.show_commit_hash && version.shortSha) {
      const hashLength = versionConfig.hash_length || 7;
      const displayHash = version.shortSha.substring(0, hashLength);
      parts.push(`@${displayHash}`);
    }

    // 标签信息 | Tag information
    if (versionConfig.show_tag && version.latestTag) {
      parts.push(`#${version.latestTag}`);
    }

    // 提交时间 | Commit time
    if (versionConfig.show_commit_time && version.timestamp) {
      const timeStr = this.formatRelativeTime(version.timestamp);
      parts.push(`(${timeStr})`);
    }

    return parts.length > 0 ? `[${parts.join(' ')}]` : '';
  }

  /**
   * 获取状态图标 | Get status icon
   */
  private getStatusIcon(type: string, icons?: BranchStatusIconsConfig): string {
    if (!icons) {
      // 默认图标 | Default icons
      const defaultIcons: Record<string, string> = {
        dirty: '⚡',
        clean: '✨',
        ahead: '↑',
        behind: '↓',
        stash: '📦',
      };
      return defaultIcons[type] || '';
    }

    // 使用配置的图标 | Use configured icons
    switch (type) {
      case 'dirty':
        return icons.dirty_emoji || '⚡';
      case 'clean':
        return icons.clean_emoji || '✨';
      case 'ahead':
        return icons.ahead_emoji || '↑';
      case 'behind':
        return icons.behind_emoji || '↓';
      case 'stash':
        return icons.stash_emoji || '📦';
      default:
        return '';
    }
  }

  /**
   * 格式化相对时间 | Format relative time
   */
  private formatRelativeTime(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d`;
    } else if (diffHours > 0) {
      return `${diffHours}h`;
    } else {
      return '<1h';
    }
  }

  /**
   * 增强的execSync实现 | Enhanced execSync implementation
   * 提供基础的Git增强功能，即使GitService不可用 | Provides basic Git enhancements even when GitService is unavailable
   */
  private renderWithEnhancedExecSync(context: RenderContext): string | null {
    const { inputData, config } = context;
    const cwd = inputData.workspace?.current_dir || inputData.cwd || process.cwd();
    const timeout =
      config.advanced?.git_timeout || this.branchConfig.performance?.git_timeout || 1000;

    let branch = inputData.gitBranch;

    // 获取分支名 | Get branch name
    if (!branch) {
      try {
        branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', {
          cwd,
          encoding: 'utf8',
          timeout,
        }).trim();
      } catch (_error) {
        branch = 'no-git';
      }
    }

    // 检查是否在无Git时显示 | Check if should display when no Git
    if (branch === 'no-git' && !this.branchConfig.show_when_no_git) {
      return null;
    }

    // 如果不在Git仓库或没有启用增强功能，使用基础显示 | If not in Git repo or no enhanced features, use basic display
    if (branch === 'no-git' || !this.hasStatusFeatures()) {
      return this.formatBasicBranch(branch);
    }

    // 尝试获取增强的Git信息 | Try to get enhanced Git information
    try {
      const parts: string[] = [];

      // 基础分支名 | Basic branch name
      const formattedBranch = this.formatBranchName(branch);
      parts.push(formattedBranch);

      // 检查dirty状态 | Check dirty status
      if (this.branchConfig.status?.show_dirty) {
        try {
          const status = execSync('git status --porcelain 2>/dev/null', {
            cwd,
            encoding: 'utf8',
            timeout: timeout / 2, // 使用更短的超时 | Use shorter timeout
          }).trim();

          if (status) {
            const dirtyIcon = this.getStatusIcon('dirty');
            parts.push(dirtyIcon);
          }
        } catch (_error) {}
      }

      // 检查ahead/behind状态 | Check ahead/behind status
      if (this.branchConfig.status?.show_ahead_behind) {
        try {
          const aheadBehind = execSync(
            'git rev-list --left-right --count HEAD...@{upstream} 2>/dev/null',
            {
              cwd,
              encoding: 'utf8',
              timeout: timeout / 2,
            }
          ).trim();

          if (aheadBehind && aheadBehind !== '0\t0') {
            const [aheadStr, behindStr] = aheadBehind.split('\t');
            const ahead = Number(aheadStr);
            const behind = Number(behindStr);
            if (!Number.isNaN(ahead) && ahead > 0) {
              const aheadIcon = this.getStatusIcon('ahead');
              parts.push(`${aheadIcon}${ahead}`);
            }
            if (!Number.isNaN(behind) && behind > 0) {
              const behindIcon = this.getStatusIcon('behind');
              parts.push(`${behindIcon}${behind}`);
            }
          }
        } catch (_error) {}
      }

      // 检查stash数量 | Check stash count
      if (this.branchConfig.status?.show_stash_count) {
        try {
          const stashList = execSync('git stash list 2>/dev/null', {
            cwd,
            encoding: 'utf8',
            timeout: timeout / 2,
          }).trim();

          if (stashList) {
            const stashCount = stashList.split('\n').length;
            if (stashCount > 0) {
              const stashIcon = this.getStatusIcon('stash');
              parts.push(`${stashIcon}${stashCount}`);
            }
          }
        } catch (_error) {}
      }

      return parts.join('');
    } catch (_error) {
      // 增强功能失败，回退到基础显示 | Enhanced features failed, fallback to basic display
      return this.formatBasicBranch(branch);
    }
  }

  /**
   * 检查是否启用了状态相关功能 | Check if status related features are enabled
   */
  private hasStatusFeatures(): boolean {
    return !!(
      this.branchConfig.status?.show_dirty ||
      this.branchConfig.status?.show_ahead_behind ||
      this.branchConfig.status?.show_stash_count ||
      this.branchConfig.status?.show_staged_count ||
      this.branchConfig.status?.show_unstaged_count ||
      this.branchConfig.status?.show_untracked_count
    );
  }

  /**
   * 格式化基础分支显示 | Format basic branch display
   */
  private formatBasicBranch(branch: string): string {
    return this.formatBranchName(branch);
  }
}

/**
 * 分支组件工厂 | Branch component factory
 */
export class BranchComponentFactory implements ComponentFactory {
  createComponent(name: string, config: ComponentConfig): BranchComponent {
    return new BranchComponent(name, config as BranchComponentConfig);
  }

  getSupportedTypes(): string[] {
    return ['branch'];
  }
}
