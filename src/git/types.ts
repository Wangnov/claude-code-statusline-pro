/**
 * Git服务类型定义 | Git service type definitions
 *
 * 定义Git操作相关的所有类型接口
 * Defines all type interfaces related to Git operations
 */

// ==================== 基础Git信息类型 ====================

/**
 * Git分支信息 | Git branch information
 */
export interface GitBranchInfo {
  /** 当前分支名 | Current branch name */
  current: string;
  /** 上游分支 | Upstream branch */
  upstream?: string;
  /** 是否是HEAD游离状态 | Whether in detached HEAD state */
  detached: boolean;
  /** 相对上游分支的提交数 | Commits ahead of upstream */
  ahead: number;
  /** 落后上游分支的提交数 | Commits behind upstream */
  behind: number;
}

/**
 * Git工作区状态 | Git working directory status
 */
export interface GitWorkingStatus {
  /** 工作区是否干净 | Whether working directory is clean */
  clean: boolean;
  /** 暂存文件数量 | Number of staged files */
  staged: number;
  /** 未暂存修改文件数量 | Number of unstaged modified files */
  unstaged: number;
  /** 未跟踪文件数量 | Number of untracked files */
  untracked: number;
  /** 冲突文件数量 | Number of conflicted files */
  conflicted: number;
}

/**
 * Git操作状态 | Git operation status
 */
export interface GitOperationStatus {
  /** 当前操作类型 | Current operation type */
  type: GitOperationType;
  /** 操作是否进行中 | Whether operation is in progress */
  inProgress: boolean;
  /** 操作相关的分支 | Branch related to operation */
  branch?: string;
  /** 操作进度信息 | Operation progress info */
  progress?: string;
}

/**
 * Git操作类型枚举 | Git operation type enum
 */
export enum GitOperationType {
  NONE = 'none',
  MERGE = 'merge',
  REBASE = 'rebase',
  CHERRY_PICK = 'cherry-pick',
  REVERT = 'revert',
  BISECT = 'bisect',
  AM = 'am',
  AM_REBASE = 'am-rebase',
}

/**
 * Git版本信息 | Git version information
 */
export interface GitVersionInfo {
  /** 当前提交SHA | Current commit SHA */
  sha: string;
  /** 短SHA | Short SHA */
  shortSha: string;
  /** 提交信息 | Commit message */
  message: string;
  /** 提交时间 | Commit timestamp */
  timestamp: Date;
  /** 作者 | Author */
  author: string;
  /** 最近的标签 | Latest tag */
  latestTag?: string;
  /** 距离标签的提交数 | Commits since tag */
  commitsSinceTag?: number;
}

/**
 * Git存储信息 | Git stash information
 */
export interface GitStashInfo {
  /** 存储条目数量 | Number of stash entries */
  count: number;
  /** 最近的存储信息 | Latest stash info */
  latest?: {
    /** 存储索引 | Stash index */
    index: number;
    /** 存储描述 | Stash description */
    description: string;
    /** 存储分支 | Stash branch */
    branch: string;
  };
}

// ==================== 聚合Git信息类型 ====================

/**
 * 完整Git信息 | Complete Git information
 */
export interface GitInfo {
  /** 是否在Git仓库中 | Whether in Git repository */
  isRepo: boolean;
  /** 分支信息 | Branch information */
  branch: GitBranchInfo;
  /** 工作区状态 | Working directory status */
  status: GitWorkingStatus;
  /** 操作状态 | Operation status */
  operation: GitOperationStatus;
  /** 版本信息 | Version information */
  version: GitVersionInfo;
  /** 存储信息 | Stash information */
  stash: GitStashInfo;
}

// ==================== 配置类型 ====================

/**
 * Git服务配置 | Git service configuration
 */
export interface GitServiceConfig {
  /** Git命令超时时间（毫秒）| Git command timeout in milliseconds */
  timeout: number;
  /** 工作目录 | Working directory */
  cwd: string;
  /** 缓存配置 | Cache configuration */
  cache: GitCacheConfig;
  /** 功能开关 | Feature toggles */
  features: GitFeatureConfig;
}

/**
 * Git缓存配置 | Git cache configuration
 */
export interface GitCacheConfig {
  /** 是否启用缓存 | Whether to enable caching */
  enabled: boolean;
  /** 缓存时间（毫秒）| Cache duration in milliseconds */
  duration: number;
  /** 需要缓存的信息类型 | Types of information to cache */
  cacheTypes: {
    branch: boolean;
    status: boolean;
    version: boolean;
    stash: boolean;
  };
}

/**
 * Git功能配置 | Git feature configuration
 */
export interface GitFeatureConfig {
  /** 是否获取分支比较信息 | Whether to fetch branch comparison */
  fetchComparison: boolean;
  /** 是否获取存储信息 | Whether to fetch stash info */
  fetchStash: boolean;
  /** 是否获取操作状态 | Whether to fetch operation status */
  fetchOperation: boolean;
  /** 是否获取版本详情 | Whether to fetch version details */
  fetchVersion: boolean;
}

// ==================== 缓存相关类型 ====================

/**
 * 缓存项 | Cache item
 */
export interface GitCacheItem<T = unknown> {
  /** 缓存的数据 | Cached data */
  data: T;
  /** 缓存时间戳 | Cache timestamp */
  timestamp: number;
  /** 过期时间戳 | Expiration timestamp */
  expires: number;
}

/**
 * 缓存键类型 | Cache key type
 */
export enum GitCacheKey {
  BRANCH_INFO = 'branch_info',
  WORKING_STATUS = 'working_status',
  OPERATION_STATUS = 'operation_status',
  VERSION_INFO = 'version_info',
  STASH_INFO = 'stash_info',
  FULL_INFO = 'full_info',
}

// ==================== 错误类型 ====================

/**
 * Git错误类型 | Git error type
 */
export class GitError extends Error {
  constructor(
    message: string,
    public command?: string,
    public exitCode?: number,
    public stderr?: string
  ) {
    super(message);
    this.name = 'GitError';
  }
}

/**
 * Git超时错误 | Git timeout error
 */
export class GitTimeoutError extends GitError {
  constructor(command: string, timeout: number) {
    super(`Git command timed out after ${timeout}ms: ${command}`, command);
    this.name = 'GitTimeoutError';
  }
}

/**
 * Git仓库未找到错误 | Git repository not found error
 */
export class GitRepoNotFoundError extends GitError {
  constructor(cwd: string) {
    super(`Git repository not found in: ${cwd}`);
    this.name = 'GitRepoNotFoundError';
  }
}

/**
 * Git权限错误 | Git permission error
 */
export class GitPermissionError extends GitError {
  constructor(command: string, path: string) {
    super(`Permission denied for Git command: ${command} in ${path}`, command);
    this.name = 'GitPermissionError';
  }
}

/**
 * Git仓库损坏错误 | Git repository corrupt error
 */
export class GitCorruptError extends GitError {
  constructor(path: string, details?: string) {
    super(
      `Git repository appears to be corrupt: ${path}${details ? ` (${details})` : ''}`,
      undefined,
      128
    );
    this.name = 'GitCorruptError';
  }
}

/**
 * Git网络错误 | Git network error
 */
export class GitNetworkError extends GitError {
  constructor(command: string, details?: string) {
    super(`Git network operation failed: ${command}${details ? ` (${details})` : ''}`, command);
    this.name = 'GitNetworkError';
  }
}

// ==================== 工具类型 ====================

/**
 * Git命令执行选项 | Git command execution options
 */
export interface GitExecOptions {
  /** 工作目录 | Working directory */
  cwd: string;
  /** 超时时间 | Timeout */
  timeout: number;
  /** 是否忽略错误 | Whether to ignore errors */
  ignoreErrors?: boolean;
  /** 环境变量 | Environment variables */
  env?: Record<string, string>;
}

/**
 * Git命令执行结果 | Git command execution result
 */
export interface GitExecResult {
  /** 标准输出 | Standard output */
  stdout: string;
  /** 标准错误 | Standard error */
  stderr: string;
  /** 退出码 | Exit code */
  exitCode: number;
  /** 是否成功 | Whether successful */
  success: boolean;
}

/**
 * Git信息查询选项 | Git info query options
 */
export interface GitInfoOptions {
  /** 是否强制刷新缓存 | Whether to force refresh cache */
  forceRefresh?: boolean;
  /** 只获取特定的信息类型 | Only fetch specific info types */
  only?: Array<keyof GitInfo>;
  /** 跳过特定的信息类型 | Skip specific info types */
  skip?: Array<keyof GitInfo>;
}
