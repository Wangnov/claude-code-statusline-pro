/**
 * Git服务主类 | Git service main class
 *
 * 提供完整的Git信息查询和缓存管理功能
 * Provides comprehensive Git information querying and cache management
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join as pathJoin } from 'node:path';
import type { GitCache } from './cache.js';
import { createDefaultCacheConfig, createGitCache } from './cache.js';
import { GitExecutionError, GitSecurityError, secureGitExecutor } from './secure-executor.js';
import type {
  GitBranchInfo,
  GitExecOptions,
  GitExecResult,
  GitInfo,
  GitInfoOptions,
  GitOperationStatus,
  GitServiceConfig,
  GitStashInfo,
  GitVersionInfo,
  GitWorkingStatus,
} from './types.js';
import {
  GitCacheKey,
  GitCorruptError,
  GitError,
  GitNetworkError,
  GitOperationType,
  GitPermissionError,
  GitRepoNotFoundError,
  GitTimeoutError,
} from './types.js';

/**
 * Git服务接口 | Git service interface
 */
export interface GitService {
  /**
   * 获取完整Git信息 | Get complete Git information
   * @param options 查询选项 | Query options
   * @returns Git信息 | Git information
   */
  getGitInfo(options?: GitInfoOptions): Promise<GitInfo>;

  /**
   * 获取分支信息 | Get branch information
   * @param forceRefresh 是否强制刷新 | Whether to force refresh
   * @returns 分支信息 | Branch information
   */
  getBranchInfo(forceRefresh?: boolean): Promise<GitBranchInfo>;

  /**
   * 获取工作区状态 | Get working directory status
   * @param forceRefresh 是否强制刷新 | Whether to force refresh
   * @returns 工作区状态 | Working directory status
   */
  getWorkingStatus(forceRefresh?: boolean): Promise<GitWorkingStatus>;

  /**
   * 获取操作状态 | Get operation status
   * @param forceRefresh 是否强制刷新 | Whether to force refresh
   * @returns 操作状态 | Operation status
   */
  getOperationStatus(forceRefresh?: boolean): Promise<GitOperationStatus>;

  /**
   * 获取版本信息 | Get version information
   * @param forceRefresh 是否强制刷新 | Whether to force refresh
   * @returns 版本信息 | Version information
   */
  getVersionInfo(forceRefresh?: boolean): Promise<GitVersionInfo>;

  /**
   * 获取存储信息 | Get stash information
   * @param forceRefresh 是否强制刷新 | Whether to force refresh
   * @returns 存储信息 | Stash information
   */
  getStashInfo(forceRefresh?: boolean): Promise<GitStashInfo>;

  /**
   * 检查是否在Git仓库中 | Check if in Git repository
   * @returns 是否在Git仓库中 | Whether in Git repository
   */
  isGitRepo(): Promise<boolean>;

  /**
   * 清空缓存 | Clear cache
   */
  clearCache(): void;

  /**
   * 更新配置 | Update configuration
   * @param config 新配置 | New configuration
   */
  updateConfig(config: Partial<GitServiceConfig>): void;

  /**
   * 获取缓存统计 | Get cache statistics
   */
  getCacheStats(): import('./cache.js').GitCacheStats;
}

/**
 * Git服务默认实现 | Default Git service implementation
 */
export class DefaultGitService implements GitService {
  private config: GitServiceConfig;
  private cache: GitCache;
  private isLargeRepo?: boolean;
  private repoSizeCache?: number;

  constructor(config?: Partial<GitServiceConfig>) {
    this.config = this.createDefaultConfig(config);
    this.cache = createGitCache(this.config.cache);
  }

  async getGitInfo(options: GitInfoOptions = {}): Promise<GitInfo> {
    const { forceRefresh = false, only, skip } = options;

    // 检查完整信息缓存 | Check full info cache
    if (!forceRefresh) {
      const cached = this.cache.get<GitInfo>(GitCacheKey.FULL_INFO);
      if (cached) {
        return this.filterGitInfo(cached, only, skip);
      }
    }

    // 检查是否在Git仓库中 | Check if in Git repository
    const isRepo = await this.isGitRepo();
    if (!isRepo) {
      return this.createEmptyGitInfo();
    }

    // 检查是否为大仓库并调整策略 | Check if large repo and adjust strategy
    const isLarge = await this.isLargeRepository();

    // 并行获取各种信息 | Fetch various info in parallel
    const promises: Promise<unknown>[] = [];
    const infoKeys: Array<keyof GitInfo> = [];

    // 基本信息组：始终获取 | Basic info group: always fetch
    if (!skip?.includes('branch')) {
      promises.push(this.getBranchInfo(forceRefresh));
      infoKeys.push('branch');
    }

    if (!skip?.includes('status')) {
      promises.push(this.getWorkingStatus(forceRefresh));
      infoKeys.push('status');
    }

    // 高级信息组：根据配置和仓库大小决定 | Advanced info group: decide based on config and repo size
    if (!skip?.includes('operation') && this.config.features.fetchOperation) {
      // 操作状态检测相对轻量，大仓库也可以执行 | Operation status detection is lightweight, can execute for large repos
      promises.push(this.getOperationStatus(forceRefresh));
      infoKeys.push('operation');
    }

    if (
      !skip?.includes('version') &&
      this.config.features.fetchVersion &&
      (!isLarge || forceRefresh)
    ) {
      // 大仓库时只在强制刷新时获取版本信息 | For large repos, only fetch version info on force refresh
      promises.push(this.getVersionInfo(forceRefresh));
      infoKeys.push('version');
    }

    if (!skip?.includes('stash') && this.config.features.fetchStash) {
      // stash信息相对轻量 | stash info is relatively lightweight
      promises.push(this.getStashInfo(forceRefresh));
      infoKeys.push('stash');
    }

    try {
      // 使用Promise.allSettled以提高容错性 | Use Promise.allSettled for better fault tolerance
      const results = await Promise.allSettled(promises);

      const gitInfo: GitInfo = {
        isRepo: true,
        branch:
          (this.extractResult(results, infoKeys, 'branch') as GitBranchInfo) ||
          this.createEmptyBranchInfo(),
        status:
          (this.extractResult(results, infoKeys, 'status') as GitWorkingStatus) ||
          this.createEmptyWorkingStatus(),
        operation:
          (this.extractResult(results, infoKeys, 'operation') as GitOperationStatus) ||
          this.createEmptyOperationStatus(),
        version:
          (this.extractResult(results, infoKeys, 'version') as GitVersionInfo) ||
          this.createEmptyVersionInfo(),
        stash:
          (this.extractResult(results, infoKeys, 'stash') as GitStashInfo) ||
          this.createEmptyStashInfo(),
      };

      // 使用智能缓存TTL缓存完整信息 | Cache full info with smart cache TTL
      const fullInfoTTL = isLarge ? this.config.cache.duration * 8 : this.config.cache.duration * 2;
      this.cache.set(GitCacheKey.FULL_INFO, gitInfo, fullInfoTTL);

      return this.filterGitInfo(gitInfo, only, skip);
    } catch (_error) {
      // 发生错误时返回空信息 | Return empty info on error
      return this.createEmptyGitInfo();
    }
  }

  async getBranchInfo(forceRefresh = false): Promise<GitBranchInfo> {
    if (!forceRefresh) {
      const cached = this.cache.get<GitBranchInfo>(GitCacheKey.BRANCH_INFO);
      if (cached) return cached;
    }

    try {
      // 并行执行基本命令 | Execute basic commands in parallel
      const baseCommands = [
        this.execGit('rev-parse --abbrev-ref HEAD'),
        this.execGit('rev-parse HEAD', { ignoreErrors: true }), // 检查是否有提交 | Check if there are commits
      ];

      const baseResults = await Promise.allSettled(baseCommands);

      // 解析基本信息 | Parse basic info
      const branchResult = baseResults[0];
      if (!branchResult || branchResult.status === 'rejected') {
        return this.createEmptyBranchInfo();
      }

      const current = (branchResult as PromiseFulfilledResult<GitExecResult>).value.stdout.trim();
      const detached = current === 'HEAD';

      // 初始化返回值 | Initialize return values
      let upstream: string | undefined;
      let ahead = 0;
      let behind = 0;

      // 如果需要获取比较信息且不是游离HEAD | If need comparison info and not detached HEAD
      if (!detached && this.config.features.fetchComparison) {
        try {
          // 并行执行上游相关命令 | Execute upstream related commands in parallel
          const upstreamCommands = [
            this.execGit('rev-parse --abbrev-ref @{upstream}', { ignoreErrors: true }),
            this.execGit('rev-parse @{upstream}', { ignoreErrors: true }), // 检查上游是否存在 | Check if upstream exists
          ];

          const upstreamResults = await Promise.allSettled(upstreamCommands);
          const upstreamResult = upstreamResults[0];

          if (
            upstreamResult &&
            upstreamResult.status === 'fulfilled' &&
            (upstreamResult as PromiseFulfilledResult<GitExecResult>).value.success
          ) {
            upstream = (
              upstreamResult as PromiseFulfilledResult<GitExecResult>
            ).value.stdout.trim();

            // 获取ahead/behind计数 | Get ahead/behind count
            try {
              const countResult = await this.execGit(
                `rev-list --count --left-right ${upstream}...HEAD`
              );
              const counts = countResult.stdout.trim().split('\t');
              behind = parseInt(counts[0] || '0', 10);
              ahead = parseInt(counts[1] || '0', 10);
            } catch {
              // ahead/behind计算失败，但保留upstream信息 | ahead/behind calculation failed, but keep upstream info
            }
          }
        } catch {
          // 忽略上游分支错误 | Ignore upstream errors
        }
      }

      const branchInfo: GitBranchInfo = {
        current,
        detached,
        ahead,
        behind,
        ...(upstream && { upstream }),
      };

      // 使用智能缓存TTL | Use smart cache TTL
      const cacheTTL = await this.getSmartCacheTTL('branch');
      this.cache.set(GitCacheKey.BRANCH_INFO, branchInfo, cacheTTL);
      return branchInfo;
    } catch (_error) {
      return this.createEmptyBranchInfo();
    }
  }

  async getWorkingStatus(forceRefresh = false): Promise<GitWorkingStatus> {
    if (!forceRefresh) {
      const cached = this.cache.get<GitWorkingStatus>(GitCacheKey.WORKING_STATUS);
      if (cached) return cached;
    }

    try {
      const result = await this.execGit('status --porcelain');
      const lines = result.stdout
        .trim()
        .split('\n')
        .filter((line) => line.length > 0);

      let staged = 0;
      let unstaged = 0;
      let untracked = 0;
      let conflicted = 0;

      for (const line of lines) {
        const status = line.substring(0, 2);

        // 检查各种状态 | Check various statuses
        if (status.includes('U') || status.includes('A') || status.includes('D')) {
          conflicted++;
        } else if (status[0] !== ' ' && status[0] !== '?') {
          staged++;
        } else if (status[1] !== ' ' && status[1] !== '?') {
          unstaged++;
        } else if (status === '??') {
          untracked++;
        }
      }

      const workingStatus: GitWorkingStatus = {
        clean: lines.length === 0,
        staged,
        unstaged,
        untracked,
        conflicted,
      };

      // 使用智能缓存TTL | Use smart cache TTL
      const cacheTTL = await this.getSmartCacheTTL('status');
      this.cache.set(GitCacheKey.WORKING_STATUS, workingStatus, cacheTTL);
      return workingStatus;
    } catch (_error) {
      return this.createEmptyWorkingStatus();
    }
  }

  async getOperationStatus(forceRefresh = false): Promise<GitOperationStatus> {
    if (!forceRefresh) {
      const cached = this.cache.get<GitOperationStatus>(GitCacheKey.OPERATION_STATUS);
      if (cached) return cached;
    }

    try {
      // 获取.git目录路径 | Get .git directory path
      const gitDirResult = await this.execGit('rev-parse --git-dir');
      const gitDir = gitDirResult.stdout.trim();
      const absoluteGitDir = gitDir.startsWith('/') ? gitDir : pathJoin(this.config.cwd, gitDir);

      // 检查各种Git操作状态 | Check various Git operation statuses
      const operationStatus = this.detectGitOperation(absoluteGitDir);

      this.cache.set(GitCacheKey.OPERATION_STATUS, operationStatus);
      return operationStatus;
    } catch (_error) {
      return this.createEmptyOperationStatus();
    }
  }

  async getVersionInfo(forceRefresh = false): Promise<GitVersionInfo> {
    if (!forceRefresh) {
      const cached = this.cache.get<GitVersionInfo>(GitCacheKey.VERSION_INFO);
      if (cached) return cached;
    }

    try {
      // 并行执行提交信息和标签信息命令 | Execute commit info and tag info commands in parallel
      const commands = [
        this.execGit('log -1 --format="%H|%h|%s|%at|%an"'),
        this.execGit('describe --tags --abbrev=0', { ignoreErrors: true }),
        this.execGit('rev-list --count HEAD', { ignoreErrors: true }), // 总提交数 | Total commit count
      ];

      const results = await Promise.allSettled(commands);

      // 解析提交信息 | Parse commit info
      const commitResult = results[0];
      if (!commitResult || commitResult.status === 'rejected') {
        return this.createEmptyVersionInfo();
      }

      const parts = (commitResult as PromiseFulfilledResult<GitExecResult>).value.stdout
        .trim()
        .replace(/^"|"$/g, '') // 移除引号 | Remove quotes
        .split('|');

      const sha = parts[0] || '';
      const shortSha = parts[1] || '';
      const message = parts[2] || '';
      const timestamp = parts[3] || '0';
      const author = parts[4] || '';

      // 解析标签信息 | Parse tag info
      let latestTag: string | undefined;
      let commitsSinceTag: number | undefined;

      const tagResult = results[1];
      if (
        tagResult &&
        tagResult.status === 'fulfilled' &&
        (tagResult as PromiseFulfilledResult<GitExecResult>).value.success
      ) {
        latestTag = (tagResult as PromiseFulfilledResult<GitExecResult>).value.stdout.trim();

        // 如果有标签，计算距离标签的提交数 | If there's a tag, calculate commits since tag
        try {
          const countResult = await this.execGit(`rev-list --count ${latestTag}..HEAD`);
          commitsSinceTag = parseInt(countResult.stdout.trim(), 10);
        } catch {
          // 忽略计数错误 | Ignore count errors
        }
      }

      const versionInfo: GitVersionInfo = {
        sha,
        shortSha,
        message,
        timestamp: new Date(parseInt(timestamp, 10) * 1000),
        author,
        ...(latestTag && { latestTag }),
        ...(commitsSinceTag !== undefined && { commitsSinceTag }),
      };

      // 使用智能缓存TTL | Use smart cache TTL
      const cacheTTL = await this.getSmartCacheTTL('version');
      this.cache.set(GitCacheKey.VERSION_INFO, versionInfo, cacheTTL);
      return versionInfo;
    } catch (_error) {
      return this.createEmptyVersionInfo();
    }
  }

  async getStashInfo(forceRefresh = false): Promise<GitStashInfo> {
    if (!forceRefresh) {
      const cached = this.cache.get<GitStashInfo>(GitCacheKey.STASH_INFO);
      if (cached) return cached;
    }

    try {
      const result = await this.execGit('stash list');
      const lines = result.stdout
        .trim()
        .split('\n')
        .filter((line) => line.length > 0);

      let latest: { index: number; description: string; branch: string } | undefined;
      if (lines.length > 0) {
        // 解析最新的stash信息 | Parse latest stash info
        // 格式：stash@{0}: WIP on master: 1234567 Commit message
        // 或：stash@{0}: On master: Description
        const match = lines[0]?.match(/stash@\{(\d+)\}: (?:WIP on|On) (\w+): (.+)/);
        if (match?.[1] && match[2] && match[3]) {
          latest = {
            index: parseInt(match[1], 10),
            description: match[3],
            branch: match[2],
          };
        } else {
          // 备用解析，适用于其他格式 | Fallback parsing for other formats
          const fallbackMatch = lines[0]?.match(/stash@\{(\d+)\}: (.+)/);
          if (fallbackMatch?.[1] && fallbackMatch[2]) {
            latest = {
              index: parseInt(fallbackMatch[1], 10),
              description: fallbackMatch[2],
              branch: 'unknown',
            };
          }
        }
      }

      const stashInfo: GitStashInfo = {
        count: lines.length,
        ...(latest && { latest }),
      };

      // 使用智能缓存TTL | Use smart cache TTL
      const cacheTTL = await this.getSmartCacheTTL('stash');
      this.cache.set(GitCacheKey.STASH_INFO, stashInfo, cacheTTL);
      return stashInfo;
    } catch (_error) {
      return this.createEmptyStashInfo();
    }
  }

  async isGitRepo(): Promise<boolean> {
    try {
      await this.execGit('rev-parse --git-dir');
      return true;
    } catch {
      return false;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  updateConfig(config: Partial<GitServiceConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  getCacheStats(): import('./cache.js').GitCacheStats {
    return this.cache.getStats();
  }

  /**
   * 执行Git命令 | Execute Git command
   * @param command Git命令 | Git command
   * @param options 执行选项 | Execution options
   * @param retries 重试次数 | Retry count
   * @returns 执行结果 | Execution result
   */
  private async execGit(
    command: string,
    options?: Partial<GitExecOptions>,
    retries = 0
  ): Promise<GitExecResult> {
    const execOptions: GitExecOptions = {
      cwd: this.config.cwd,
      timeout: this.config.timeout,
      ignoreErrors: false,
      ...options,
    };

    try {
      // 解析命令和参数 | Parse command and arguments
      const parsedCommand = this.parseGitCommand(command);
      const baseCommand = parsedCommand[0];
      const args = parsedCommand.slice(1);

      if (!baseCommand) {
        throw new GitSecurityError('Empty command after parsing', command);
      }

      // 使用安全执行器 | Use secure executor
      const result = await secureGitExecutor.executeGitCommand(baseCommand, args, execOptions);

      return result;
    } catch (error: unknown) {
      // 处理安全错误 | Handle security errors
      if (error instanceof GitSecurityError) {
        throw new GitSecurityError(`Git security violation: ${error.message}`, error.input);
      }

      if (error instanceof GitExecutionError) {
        // 使用原有的错误处理逻辑 | Use existing error handling logic
        return this.handleLegacyError(error.originalError, command, options, retries);
      }

      // 处理其他错误
      throw error;
    }
  }

  /**
   * 安全解析Git命令字符串为命令和参数数组
   */
  private parseGitCommand(command: string): string[] {
    if (!command || typeof command !== 'string') {
      throw new GitSecurityError('Invalid command format', command);
    }

    // 处理常见的复合命令格式
    const trimmed = command.trim();

    // 处理管道命令（如 "ls-files | wc -l"）
    if (trimmed.includes('|')) {
      // 拆分为多个安全命令执行
      if (trimmed === 'ls-files | wc -l') {
        // 特殊处理这个常见模式，转换为安全的单命令
        return ['ls-files'];
      }
      throw new GitSecurityError('Pipe operations not allowed', command);
    }

    // 简单的空格分割（对于复杂引号处理可以后续改进）
    const parts = trimmed.split(/\s+/).filter((part) => part.length > 0);

    if (parts.length === 0) {
      throw new GitSecurityError('Empty command', command);
    }

    return parts;
  }

  /**
   * 处理传统错误格式（保持向后兼容）
   */
  private async handleLegacyError(
    error: Error,
    command: string,
    options?: Partial<GitExecOptions>,
    retries = 0
  ): Promise<GitExecResult> {
    const execOptions: GitExecOptions = {
      cwd: this.config.cwd,
      timeout: this.config.timeout,
      ignoreErrors: false,
      ...options,
    };

    const fullCommand = `git ${command}`;

    // 增强错误处理和分类 | Enhanced error handling and classification
    const errorObj = error as {
      stderr?: Buffer;
      message?: string;
      killed?: boolean;
      signal?: string;
      status?: number;
    };
    const stderr = errorObj.stderr?.toString() || '';
    const errorMessage = errorObj.message || '';

    // 超时错误 | Timeout error
    if (errorObj.killed && errorObj.signal === 'SIGTERM') {
      // 超时重试机制 | Timeout retry mechanism
      if (retries < 2) {
        await this.delay(500); // 延迟500ms后重试 | Delay 500ms before retry
        return this.execGit(command, options, retries + 1);
      }
      throw new GitTimeoutError(fullCommand, execOptions.timeout);
    }

    // 权限错误 | Permission error
    if (
      errorObj.status === 128 &&
      (errorMessage.includes('Permission denied') || stderr.includes('permission denied'))
    ) {
      throw new GitPermissionError(fullCommand, execOptions.cwd);
    }

    // 仓库损坏错误 | Repository corrupt error
    if (
      errorObj.status === 128 &&
      (stderr.includes('corrupt') || stderr.includes('bad object') || stderr.includes('broken'))
    ) {
      throw new GitCorruptError(execOptions.cwd, stderr);
    }

    // 网络错误 | Network error
    if (
      stderr.includes('Could not resolve host') ||
      stderr.includes('Connection timed out') ||
      stderr.includes('Failed to connect') ||
      stderr.includes('network unreachable')
    ) {
      throw new GitNetworkError(fullCommand, stderr);
    }

    // 仓库不存在错误 | Repository not found error
    if (
      errorObj.status === 128 &&
      (stderr.includes('not a git repository') || errorMessage.includes('not a git repository'))
    ) {
      throw new GitRepoNotFoundError(execOptions.cwd);
    }

    if (!execOptions.ignoreErrors) {
      throw new GitError(errorMessage, fullCommand, errorObj.status || 1, stderr);
    }

    return {
      stdout: '',
      stderr,
      exitCode: errorObj.status || 1,
      success: false,
    };
  }

  /**
   * 安全计算Git仓库文件数量 | Securely count Git repository files
   */
  private async countFilesSecurely(): Promise<GitExecResult> {
    try {
      const result = await this.execGit('ls-files', { ignoreErrors: true, timeout: 2000 });
      if (result.success && result.stdout) {
        // 安全地计算行数（文件数）
        const fileCount = result.stdout
          .trim()
          .split('\n')
          .filter((line) => line.trim().length > 0).length;
        return {
          stdout: fileCount.toString(),
          stderr: '',
          exitCode: 0,
          success: true,
        };
      }
      return result;
    } catch (error) {
      return {
        stdout: '0',
        stderr: error instanceof Error ? error.message : 'Unknown error',
        exitCode: 1,
        success: false,
      };
    }
  }

  /**
   * 延迟函数 | Delay function
   * @param ms 延迟毫秒数 | Delay milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 检测是否为大仓库 | Detect if it's a large repository
   * @returns 是否为大仓库 | Whether it's a large repository
   */
  private async isLargeRepository(): Promise<boolean> {
    // 如果禁用大仓库优化，返回false | If large repo optimization is disabled, return false
    if (!this.config.features.fetchComparison) {
      return false;
    }

    // 使用缓存的结果 | Use cached result
    if (this.isLargeRepo !== undefined) {
      return this.isLargeRepo;
    }

    try {
      // 并行检查仓库大小指标 | Check repository size indicators in parallel
      const sizeChecks = [
        this.execGit('rev-list --all --count', { ignoreErrors: true, timeout: 2000 }),
        this.countFilesSecurely(), // 使用安全的文件计数方法
        this.checkGitDirSize(),
      ];

      const results = await Promise.allSettled(sizeChecks);

      // 检查提交数 | Check commit count
      const commitResult = results[0];
      if (
        commitResult &&
        commitResult.status === 'fulfilled' &&
        typeof (commitResult as PromiseFulfilledResult<unknown>).value === 'object' &&
        (commitResult as PromiseFulfilledResult<GitExecResult>).value.success
      ) {
        const commitCount = parseInt(
          (commitResult as PromiseFulfilledResult<GitExecResult>).value.stdout.trim(),
          10
        );
        if (commitCount > 10000) {
          // 超过10k提交认为大仓库 | More than 10k commits considered large
          this.isLargeRepo = true;
          return true;
        }
      }

      // 检查文件数 | Check file count
      const fileResult = results[1];
      if (
        fileResult &&
        fileResult.status === 'fulfilled' &&
        typeof (fileResult as PromiseFulfilledResult<unknown>).value === 'object' &&
        (fileResult as PromiseFulfilledResult<GitExecResult>).value.success
      ) {
        const fileCount = parseInt(
          (fileResult as PromiseFulfilledResult<GitExecResult>).value.stdout.trim(),
          10
        );
        if (
          fileCount >
          ((this.config.features as { large_repo_threshold?: number }).large_repo_threshold ||
            10000)
        ) {
          this.isLargeRepo = true;
          return true;
        }
      }

      // 检查.git目录大小 | Check .git directory size
      const sizeResult = results[2];
      if (sizeResult && sizeResult.status === 'fulfilled') {
        const gitDirSize = (sizeResult as PromiseFulfilledResult<number>).value;
        if (gitDirSize > 100 * 1024 * 1024) {
          // 超过100MB认为大仓库 | More than 100MB considered large
          this.isLargeRepo = true;
          return true;
        }
      }

      this.isLargeRepo = false;
      return false;
    } catch {
      // 检测失败时保守假设 | Conservative assumption on detection failure
      this.isLargeRepo = false;
      return false;
    }
  }

  /**
   * 检查.git目录大小 | Check .git directory size
   * @returns 目录大小（字节）| Directory size in bytes
   */
  private async checkGitDirSize(): Promise<number> {
    if (this.repoSizeCache !== undefined) {
      return this.repoSizeCache;
    }

    try {
      const gitDirResult = await this.execGit('rev-parse --git-dir');
      const gitDir = gitDirResult.stdout.trim();
      const absoluteGitDir = gitDir.startsWith('/') ? gitDir : pathJoin(this.config.cwd, gitDir);

      // 检查objects目录大小 | Check objects directory size
      const objectsDir = pathJoin(absoluteGitDir, 'objects');
      const size = this.calculateDirectorySize(objectsDir);

      this.repoSizeCache = size;
      return size;
    } catch {
      return 0;
    }
  }

  /**
   * 计算目录大小 | Calculate directory size
   * @param dirPath 目录路径 | Directory path
   * @returns 目录大小 | Directory size
   */
  private calculateDirectorySize(dirPath: string): number {
    try {
      if (!existsSync(dirPath)) {
        return 0;
      }

      const stats = statSync(dirPath);
      if (stats.isFile()) {
        return stats.size;
      }

      // 为避免性能问题，只检查顶层目录 | Only check top-level directory to avoid performance issues
      return stats.size || 0;
    } catch {
      return 0;
    }
  }

  /**
   * 获取智能缓存TTL | Get smart cache TTL
   * @param infoType 信息类型 | Information type
   * @returns 缓存TTL | Cache TTL
   */
  private async getSmartCacheTTL(
    infoType: 'branch' | 'status' | 'version' | 'stash'
  ): Promise<number> {
    const baseTTL = this.config.cache.duration;
    const isLarge = await this.isLargeRepository();

    if (isLarge) {
      // 大仓库延长缓存时间 | Extend cache time for large repositories
      switch (infoType) {
        case 'branch':
          return baseTTL * 6; // 30秒 | 30 seconds
        case 'version':
          return baseTTL * 12; // 60秒 | 60 seconds
        case 'stash':
          return baseTTL * 6; // 30秒 | 30 seconds
        case 'status':
          return baseTTL * 2; // 10秒 | 10 seconds
        default:
          return baseTTL * 4;
      }
    }

    // 小仓库使用正常缓存时间 | Normal cache time for small repositories
    return baseTTL;
  }

  /**
   * 创建默认配置 | Create default configuration
   */
  private createDefaultConfig(config?: Partial<GitServiceConfig>): GitServiceConfig {
    const defaultConfig: GitServiceConfig = {
      timeout: 1000,
      cwd: process.cwd(),
      cache: createDefaultCacheConfig(),
      features: {
        fetchComparison: true,
        fetchStash: true,
        fetchOperation: true,
        fetchVersion: true,
      },
    };

    // 深度合并配置 | Deep merge configuration
    const mergedConfig = {
      ...defaultConfig,
      ...config,
      cache: {
        ...defaultConfig.cache,
        ...(config?.cache || {}),
        cacheTypes: {
          ...defaultConfig.cache.cacheTypes,
          ...(config?.cache?.cacheTypes || {}),
        },
      },
      features: {
        ...defaultConfig.features,
        ...(config?.features || {}),
      },
    };

    return mergedConfig;
  }

  /**
   * 过滤Git信息 | Filter Git information
   */
  private filterGitInfo(
    gitInfo: GitInfo,
    only?: Array<keyof GitInfo>,
    skip?: Array<keyof GitInfo>
  ): GitInfo {
    if (!only && !skip) return gitInfo;

    const result = { ...gitInfo };

    if (only) {
      // 只保留指定的字段 | Only keep specified fields
      const filtered = { isRepo: gitInfo.isRepo } as GitInfo;
      for (const key of only) {
        if (key in gitInfo) {
          (filtered as unknown as Record<string, unknown>)[key] = gitInfo[key];
        }
      }
      return filtered;
    }

    if (skip) {
      // 跳过指定的字段 | Skip specified fields
      for (const key of skip) {
        if (key !== 'isRepo') {
          // 始终保留isRepo字段 | Always keep isRepo field
          delete (result as unknown as Record<string, unknown>)[key];
        }
      }
    }

    return result;
  }

  /**
   * 创建空的Git信息 | Create empty Git information
   */
  private createEmptyGitInfo(): GitInfo {
    return {
      isRepo: false,
      branch: this.createEmptyBranchInfo(),
      status: this.createEmptyWorkingStatus(),
      operation: this.createEmptyOperationStatus(),
      version: this.createEmptyVersionInfo(),
      stash: this.createEmptyStashInfo(),
    };
  }

  private createEmptyBranchInfo(): GitBranchInfo {
    return {
      current: 'no-git',
      detached: false,
      ahead: 0,
      behind: 0,
    };
  }

  private createEmptyWorkingStatus(): GitWorkingStatus {
    return {
      clean: true,
      staged: 0,
      unstaged: 0,
      untracked: 0,
      conflicted: 0,
    };
  }

  private createEmptyOperationStatus(): GitOperationStatus {
    return {
      type: GitOperationType.NONE,
      inProgress: false,
    };
  }

  private createEmptyVersionInfo(): GitVersionInfo {
    return {
      sha: '',
      shortSha: '',
      message: '',
      timestamp: new Date(),
      author: '',
    };
  }

  private createEmptyStashInfo(): GitStashInfo {
    return {
      count: 0,
    };
  }

  /**
   * 检测Git操作状态 | Detect Git operation status
   * @param gitDir Git目录路径 | Git directory path
   * @returns 操作状态 | Operation status
   */
  private detectGitOperation(gitDir: string): GitOperationStatus {
    // 检查MERGE状态 | Check MERGE status
    if (existsSync(pathJoin(gitDir, 'MERGE_HEAD'))) {
      const branch = this.readGitFile(pathJoin(gitDir, 'MERGE_MSG'));
      const mergeBranch = this.extractMergeBranch(branch);
      return {
        type: GitOperationType.MERGE,
        inProgress: true,
        ...(mergeBranch && { branch: mergeBranch }),
        progress: 'Merging',
      };
    }

    // 检查REBASE状态 | Check REBASE status
    const rebaseMergeDir = pathJoin(gitDir, 'rebase-merge');
    const rebaseApplyDir = pathJoin(gitDir, 'rebase-apply');

    if (existsSync(rebaseMergeDir)) {
      const headName = this.readGitFile(pathJoin(rebaseMergeDir, 'head-name'));
      const msgNum = this.readGitFile(pathJoin(rebaseMergeDir, 'msgnum'));
      const end = this.readGitFile(pathJoin(rebaseMergeDir, 'end'));

      const branchName = headName?.replace('refs/heads/', '');
      return {
        type: GitOperationType.REBASE,
        inProgress: true,
        ...(branchName && { branch: branchName }),
        progress: msgNum && end ? `${msgNum}/${end}` : 'Rebasing',
      };
    }

    if (existsSync(rebaseApplyDir)) {
      const headName = this.readGitFile(pathJoin(rebaseApplyDir, 'head-name'));
      const next = this.readGitFile(pathJoin(rebaseApplyDir, 'next'));
      const last = this.readGitFile(pathJoin(rebaseApplyDir, 'last'));

      // 检查是否是AM操作 | Check if it's an AM operation
      const isAm = existsSync(pathJoin(rebaseApplyDir, 'applying'));

      const branchName = headName?.replace('refs/heads/', '');
      return {
        type: isAm ? GitOperationType.AM : GitOperationType.AM_REBASE,
        inProgress: true,
        ...(branchName && { branch: branchName }),
        progress: next && last ? `${next}/${last}` : isAm ? 'Applying' : 'Rebasing',
      };
    }

    // 检查CHERRY_PICK状态 | Check CHERRY_PICK status
    if (existsSync(pathJoin(gitDir, 'CHERRY_PICK_HEAD'))) {
      return {
        type: GitOperationType.CHERRY_PICK,
        inProgress: true,
        progress: 'Cherry-picking',
      };
    }

    // 检查REVERT状态 | Check REVERT status
    if (existsSync(pathJoin(gitDir, 'REVERT_HEAD'))) {
      return {
        type: GitOperationType.REVERT,
        inProgress: true,
        progress: 'Reverting',
      };
    }

    // 检查BISECT状态 | Check BISECT status
    if (existsSync(pathJoin(gitDir, 'BISECT_LOG'))) {
      return {
        type: GitOperationType.BISECT,
        inProgress: true,
        progress: 'Bisecting',
      };
    }

    // 无操作进行中 | No operation in progress
    return {
      type: GitOperationType.NONE,
      inProgress: false,
    };
  }

  /**
   * 安全读取Git文件内容 | Safely read Git file content
   * @param filePath 文件路径 | File path
   * @returns 文件内容或undefined | File content or undefined
   */
  private readGitFile(filePath: string): string | undefined {
    try {
      return readFileSync(filePath, 'utf8').trim();
    } catch {
      return undefined;
    }
  }

  /**
   * 从MERGE_MSG中提取合并分支名 | Extract merge branch from MERGE_MSG
   * @param mergeMsg 合并消息 | Merge message
   * @returns 分支名 | Branch name
   */
  private extractMergeBranch(mergeMsg?: string): string | undefined {
    if (!mergeMsg) return undefined;

    // 匹配 "Merge branch 'feature-name'" 格式
    const match = mergeMsg.match(/Merge branch '([^']+)'/);
    return match?.[1];
  }

  /**
   * 从 Promise.allSettled 结果中提取指定类型的数据 | Extract specific type data from Promise.allSettled results
   * @param results Promise.allSettled结果 | Promise.allSettled results
   * @param infoKeys 信息键名数组 | Info keys array
   * @param targetKey 目标键名 | Target key
   * @returns 提取的数据 | Extracted data
   */
  private extractResult(
    results: PromiseSettledResult<unknown>[],
    infoKeys: Array<keyof GitInfo>,
    targetKey: keyof GitInfo
  ): unknown {
    const index = infoKeys.indexOf(targetKey);
    if (index === -1) return undefined;

    const result = results[index];
    return result?.status === 'fulfilled' ? result.value : undefined;
  }
}

/**
 * 创建Git服务实例 | Create Git service instance
 * @param config 服务配置 | Service configuration
 * @returns Git服务实例 | Git service instance
 */
export function createGitService(config?: Partial<GitServiceConfig>): GitService {
  return new DefaultGitService(config);
}
