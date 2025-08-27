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
import { safeExecGit } from '../git/secure-executor.js';
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
      this.branchConfig.status?.show_stash_count;

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
              version: false, // 版本功能已简化移除
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
    return false; // 操作功能已简化移除 | Operation features have been simplified and removed
  }

  /**
   * 检查是否启用了版本相关功能 | Check if version related features are enabled
   */
  private hasVersionFeatures(): boolean {
    return false; // 版本功能已简化移除 | Version features have been simplified and removed
  }

  protected async renderContent(context: RenderContext): Promise<string | null> {
    // 解构context但不使用所有变量 | Destructure context but don't use all variables
    const { inputData, config: _config } = context;

    try {
      // 优先使用简单的.git/HEAD读取方式（官方推荐）| Prefer simple .git/HEAD reading (officially recommended)
      const simpleBranch = await this.renderWithSimpleGitRead(context);
      if (simpleBranch !== null) {
        return simpleBranch;
      }

      // 如果有GitService且未强制回退，使用GitService | If GitService exists and not forced fallback, use GitService
      if (this.gitService && !this.fallbackToExecSync) {
        try {
          return await this.renderWithGitService(context);
        } catch (_gitServiceError) {
          // GitService失败时回退到增强execSync | Fallback to enhanced execSync when GitService fails
          this.fallbackToExecSync = true;
          return await this.renderWithEnhancedExecSync(context);
        }
      } else {
        // 使用增强execSync实现 | Use enhanced execSync implementation
        return await this.renderWithEnhancedExecSync(context);
      }
    } catch (_error) {
      // 最终回退到基础实现 | Final fallback to basic implementation
      return await this.renderWithExecSync(context);
    }
  }

  /**
   * 使用简单的.git/HEAD文件读取（官方推荐方式）| Use simple .git/HEAD file reading (officially recommended)
   */
  private async renderWithSimpleGitRead(context: RenderContext): Promise<string | null> {
    const { inputData } = context;
    const cwd = inputData.workspace?.current_dir || inputData.cwd || process.cwd();
    
    try {
      // 导入fs模块 | Import fs module
      const fs = await import('node:fs');
      const path = await import('node:path');
      
      // 检查.git/HEAD文件 | Check .git/HEAD file
      const gitHeadPath = path.join(cwd, '.git', 'HEAD');
      const headContent = fs.readFileSync(gitHeadPath, 'utf8').trim();
      
      let branchName = '';
      if (headContent.startsWith('ref: refs/heads/')) {
        // 标准分支引用 | Standard branch reference
        branchName = headContent.replace('ref: refs/heads/', '');
      } else if (headContent.match(/^[0-9a-f]{40}$/)) {
        // 分离HEAD状态，显示commit hash前7位 | Detached HEAD state, show first 7 chars of commit hash
        branchName = `HEAD@${headContent.substring(0, 7)}`;
      } else {
        // 其他情况，尝试解析 | Other cases, try to parse
        const parts = headContent.split('/');
        branchName = parts[parts.length - 1] || headContent.substring(0, 8);
      }
      
      if (!branchName) {
        return null;
      }
      
      // 应用最大长度限制 | Apply max length limit
      let displayBranch = branchName;
      const maxLength = this.branchConfig.max_length;
      if (maxLength && displayBranch.length > maxLength) {
        displayBranch = `${displayBranch.substring(0, maxLength - 3)}...`;
      }
      
      // 基础分支名显示 | Basic branch name display
      let result = this.formatOutput(displayBranch);
      
      // 如果启用了状态功能，添加状态信息 | If status features are enabled, add status info
      if (this.hasStatusFeatures()) {
        const statusInfo = await this.getSimpleGitStatus(cwd);
        if (statusInfo) {
          result += statusInfo;
        }
      }
      
      return result;
      
    } catch (error) {
      // .git/HEAD读取失败，检查是否需要显示no-git | .git/HEAD read failed, check if should show no-git
      if (this.branchConfig.show_when_no_git) {
        return this.formatOutput('no-git');
      }
      return null;
    }
  }

  /**
   * 获取简单的Git状态信息 | Get simple Git status information
   */
  private async getSimpleGitStatus(cwd: string): Promise<string> {
    const statusParts: string[] = [];
    
    try {
      // 检查Git工作区是否脏 | Check if Git working directory is dirty
      if (this.branchConfig.status?.show_dirty) {
        try {
          const result = await safeExecGit('status', ['--porcelain'], {
            cwd,
            timeout: 500, // 短超时
            ignoreErrors: true,
          });

          if (result.success && result.stdout.trim()) {
            const dirtyIcon = this.getStatusIcon('dirty');
            const colorName = this.branchConfig.status_colors?.dirty || 'yellow';
            statusParts.push(this.colorize(dirtyIcon, colorName));
          }
        } catch (_error) {
          // 静默处理错误 | Silently handle errors
        }
      }

      // 检查ahead/behind状态 | Check ahead/behind status
      if (this.branchConfig.status?.show_ahead_behind) {
        try {
          const result = await safeExecGit(
            'rev-list',
            ['--left-right', '--count', 'HEAD...@{upstream}'],
            {
              cwd,
              timeout: 500,
              ignoreErrors: true,
            }
          );

          if (result.success && result.stdout.trim() && result.stdout.trim() !== '0\t0') {
            const [aheadStr, behindStr] = result.stdout.trim().split('\t');
            const ahead = Number(aheadStr);
            const behind = Number(behindStr);
            
            if (!Number.isNaN(ahead) && ahead > 0) {
              const aheadIcon = this.getStatusIcon('ahead');
              const colorName = this.branchConfig.status_colors?.ahead || 'cyan';
              statusParts.push(this.colorize(`${aheadIcon}${ahead}`, colorName));
            }
            if (!Number.isNaN(behind) && behind > 0) {
              const behindIcon = this.getStatusIcon('behind');
              const colorName = this.branchConfig.status_colors?.behind || 'magenta';
              statusParts.push(this.colorize(`${behindIcon}${behind}`, colorName));
            }
          } else {
          }
        } catch (_error) {
          // 静默处理错误 | Silently handle errors
        }
      } else {
      }

      // 检查stash数量 | Check stash count
      if (this.branchConfig.status?.show_stash_count) {
        try {
          const result = await safeExecGit('stash', ['list'], {
            cwd,
            timeout: 500,
            ignoreErrors: true,
          });

          if (result.success && result.stdout.trim()) {
            const stashCount = result.stdout.trim().split('\n').length;
            if (stashCount > 0) {
              const stashIcon = this.getStatusIcon('stash');
              statusParts.push(`${stashIcon}${stashCount}`);
            }
          }
        } catch (_error) {
          // 静默处理错误 | Silently handle errors
        }
      }
      
    } catch (_error) {
      // 静默处理错误 | Silently handle errors
    }
    
    return statusParts.join('');
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
   * 使用安全Git执行器的回退实现 | Fallback implementation using secure Git executor
   */
  private async renderWithExecSync(context: RenderContext): Promise<string | null> {
    const { inputData, config } = context;

    let branch = inputData.gitBranch;

    // 如果没有提供分支信息，尝试通过Git命令获取 | If no branch info provided, try to get via Git command
    if (!branch) {
      try {
        const result = await safeExecGit('rev-parse', ['--abbrev-ref', 'HEAD'], {
          cwd: inputData.workspace?.current_dir || inputData.cwd,
          timeout: config.advanced?.git_timeout || 1000,
          ignoreErrors: true,
        });
        branch = result.success ? result.stdout.trim() : 'no-git';
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

    // 已简化移除计数功能 | Simplified by removing count features

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
    return ''; // 操作功能已简化移除 | Operation features have been simplified and removed
  }

  /**
   * 渲染版本信息 | Render version information
   */
  private renderVersionInfo(version: GitVersionInfo): string {
    return ''; // 版本功能已简化移除 | Version features have been simplified and removed
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
        return '✨'; // 简化后直接返回默认图标 | Return default icon after simplification
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
   * 增强的安全Git实现 | Enhanced secure Git implementation
   * 提供基础的Git增强功能，即使GitService不可用 | Provides basic Git enhancements even when GitService is unavailable
   */
  private async renderWithEnhancedExecSync(context: RenderContext): Promise<string | null> {
    const { inputData, config } = context;
    const cwd = inputData.workspace?.current_dir || inputData.cwd || process.cwd();
    const timeout =
      config.advanced?.git_timeout || this.branchConfig.performance?.git_timeout || 1000;

    let branch = inputData.gitBranch;

    // 获取分支名 | Get branch name
    if (!branch) {
      try {
        const result = await safeExecGit('rev-parse', ['--abbrev-ref', 'HEAD'], {
          cwd,
          timeout,
          ignoreErrors: true,
        });
        branch = result.success ? result.stdout.trim() : 'no-git';
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
          const result = await safeExecGit('status', ['--porcelain'], {
            cwd,
            timeout: timeout / 2, // 使用更短的超时 | Use shorter timeout
            ignoreErrors: true,
          });

          if (result.success && result.stdout.trim()) {
            const dirtyIcon = this.getStatusIcon('dirty');
            parts.push(dirtyIcon);
          }
        } catch (_error) {}
      }

      // 检查ahead/behind状态 | Check ahead/behind status
      if (this.branchConfig.status?.show_ahead_behind) {
        try {
          const result = await safeExecGit(
            'rev-list',
            ['--left-right', '--count', 'HEAD...@{upstream}'],
            {
              cwd,
              timeout: timeout / 2,
              ignoreErrors: true,
            }
          );

          if (result.success && result.stdout.trim() && result.stdout.trim() !== '0\t0') {
            const [aheadStr, behindStr] = result.stdout.trim().split('\t');
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
          const result = await safeExecGit('stash', ['list'], {
            cwd,
            timeout: timeout / 2,
            ignoreErrors: true,
          });

          if (result.success && result.stdout.trim()) {
            const stashCount = result.stdout.trim().split('\n').length;
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
      this.branchConfig.status?.show_stash_count
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
