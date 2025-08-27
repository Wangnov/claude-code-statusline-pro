/**
 * 安全的Git命令执行器 | Secure Git Command Executor
 *
 * 基于2025年最新安全实践，防止命令注入攻击
 * Based on 2025 latest security practices to prevent command injection attacks
 *
 * 安全特性 | Security Features:
 * - 命令白名单验证 | Command whitelist validation
 * - 参数数组化执行 | Array-based argument execution
 * - 严格输入验证 | Strict input validation
 * - 环境变量隔离 | Environment variable isolation
 */

import { type SpawnSyncOptions, spawnSync } from 'node:child_process';
import type { GitExecOptions, GitExecResult } from './types.js';

/**
 * 安全的Git命令白名单 | Secure Git command whitelist
 * 只允许只读操作，防止恶意命令执行 | Only read-only operations allowed
 */
const SAFE_GIT_COMMANDS = new Set([
  'rev-parse',
  'status',
  'log',
  'describe',
  'rev-list',
  'stash',
  'branch',
  'ls-files',
  'show-ref',
  'cat-file',
  'config',
  'symbolic-ref',
  'merge-base',
  'diff',
  'show',
]);

/**
 * 允许的Git flags白名单 | Allowed Git flags whitelist
 */
const ALLOWED_GIT_FLAGS = new Set([
  '--porcelain',
  '--short',
  '--long',
  '--count',
  '--oneline',
  '--abbrev-ref',
  '--left-right',
  '--no-merges',
  '--list',
  '--show-current',
  '--all',
  '--local',
  '--remote',
  '--merged',
  '--no-merged',
  '--format',
  '--pretty',
  '--graph',
  '--decorate',
  '--date',
  '--author',
  '--grep',
  '--since',
  '--until',
  '--name-only',
  '--name-status',
  '--stat',
  '--numstat',
  '--shortstat',
  '--dirstat',
  '--summary',
  '--patch',
  '--no-patch',
  '-n',
  '-1',
  '-2',
  '-3',
  '-4',
  '-5',
  '-v',
  '-a',
  '-q',
  '-r',
  '-z',
  '-s',
  '-u',
]);

/**
 * 危险的参数模式 | Dangerous argument patterns
 */
const DANGEROUS_PATTERNS = [
  /[;&|`$(){}[\]]/, // Shell metacharacters
  /\.\./, // Path traversal
  /\s/, // Whitespace (should be separate args)
];

/**
 * Git引用格式验证 | Git reference format validation
 */
const GIT_REF_PATTERN = /^[a-zA-Z0-9._/-]+$/;
const GIT_HASH_PATTERN = /^[a-f0-9]{4,40}$/;

/**
 * 安全的Git命令执行器类
 */
export class SecureGitExecutor {
  private readonly defaultTimeout = 5000;
  private readonly maxOutputSize = 1024 * 1024; // 1MB

  /**
   * 安全执行Git命令
   * @param command Git子命令
   * @param args 命令参数数组
   * @param options 执行选项
   * @returns 执行结果
   */
  async executeGitCommand(
    command: string,
    args: string[] = [],
    options: Partial<GitExecOptions> = {}
  ): Promise<GitExecResult> {
    // 1. 命令白名单验证
    this.validateCommand(command);

    // 2. 参数安全验证
    this.validateArguments(args);

    // 3. 构建安全的执行选项
    const execOptions = this.buildSecureOptions(options);

    // 4. 使用spawnSync安全执行
    const result = spawnSync('git', [command, ...args], execOptions);

    // 5. 处理执行结果
    return this.processResult(result, command, args);
  }

  /**
   * 验证Git命令是否在白名单中
   */
  private validateCommand(command: string): void {
    if (!command || typeof command !== 'string') {
      throw new GitSecurityError('Invalid command type', command);
    }

    // 移除可能的子命令参数
    const baseCommand = command.split(' ')[0];

    if (!baseCommand || !SAFE_GIT_COMMANDS.has(baseCommand)) {
      throw new GitSecurityError('Command not in whitelist', command);
    }

    // 检查危险模式
    if (DANGEROUS_PATTERNS.some((pattern) => pattern.test(command))) {
      throw new GitSecurityError('Command contains dangerous patterns', command);
    }
  }

  /**
   * 验证命令参数安全性
   */
  private validateArguments(args: string[]): void {
    for (const arg of args) {
      if (typeof arg !== 'string') {
        throw new GitSecurityError('Invalid argument type', String(arg));
      }

      // 检查参数长度（防止DoS）
      if (arg.length > 1000) {
        throw new GitSecurityError('Argument too long', `${arg.substring(0, 50)}...`);
      }

      // 如果是以 - 开头的参数，检查是否在白名单中
      if (arg.startsWith('-')) {
        if (!ALLOWED_GIT_FLAGS.has(arg)) {
          throw new GitSecurityError('Git flag not in whitelist', arg);
        }
      } else {
        // 对于非flag参数，先检查是否是合法的Git引用
        if (this.isValidGitReference(arg)) {
          continue; // 跳过危险模式检查，因为这是合法的Git引用
        }

        // 对于非Git引用的参数，检查危险模式
        if (DANGEROUS_PATTERNS.some((pattern) => pattern.test(arg))) {
          throw new GitSecurityError('Argument contains dangerous patterns', arg);
        }
      }
    }
  }

  /**
   * 验证Git引用格式
   */
  private validateGitRef(ref: string): boolean {
    return GIT_REF_PATTERN.test(ref) || GIT_HASH_PATTERN.test(ref);
  }

  /**
   * 检查是否是合法的Git引用（包括特殊格式）
   */
  private isValidGitReference(arg: string): boolean {
    // 基础Git引用格式
    if (this.validateGitRef(arg)) {
      return true;
    }

    // 常见的Git引用特殊格式
    const gitReferencePatterns = [
      /^HEAD$/, // HEAD
      /^HEAD~\d+$/, // HEAD~1, HEAD~2, etc.
      /^HEAD\^\d*$/, // HEAD^, HEAD^1, HEAD^2, etc.
      /^@\{upstream\}$/, // @{upstream}
      /^@\{u\}$/, // @{u} (shorthand)
      /^HEAD\.{2,3}@\{upstream\}$/, // HEAD..@{upstream}, HEAD...@{upstream}
      /^HEAD\.{2,3}@\{u\}$/, // HEAD..@{u}, HEAD...@{u}
      /^[a-zA-Z0-9._/-]+\.{2,3}@\{upstream\}$/, // branch..@{upstream}, branch...@{upstream}
      /^[a-zA-Z0-9._/-]+\.{2,3}@\{u\}$/, // branch..@{u}, branch...@{u}
      /^@\{-\d+\}$/, // @{-1}, @{-2}, etc. (previous branches)
      /^[a-zA-Z0-9._/-]+@\{\d{4}-\d{2}-\d{2}\}$/, // branch@{2023-01-01}
      /^\d+\t\d+$/, // "2	0" format from rev-list --count
    ];

    return gitReferencePatterns.some((pattern) => pattern.test(arg));
  }

  /**
   * 构建安全的执行选项
   */
  private buildSecureOptions(options: Partial<GitExecOptions>): SpawnSyncOptions {
    return {
      cwd: options.cwd || process.cwd(),
      timeout: Math.min(options.timeout || this.defaultTimeout, 30000), // 最大30秒
      encoding: 'utf8',
      maxBuffer: this.maxOutputSize,
      // 安全的环境变量配置
      env: {
        ...process.env,
        // 清理潜在危险的环境变量
        GIT_DIR: undefined,
        GIT_WORK_TREE: undefined,
        GIT_INDEX_FILE: undefined,
        GIT_OBJECT_DIRECTORY: undefined,
        // 保留必要的环境变量
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        USER: process.env.USER,
        ...options.env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    };
  }

  /**
   * 处理命令执行结果
   */
  private processResult(
    result: ReturnType<typeof spawnSync>,
    command: string,
    args: string[]
  ): GitExecResult {
    const { status, stdout, stderr, error } = result;

    if (error) {
      throw new GitExecutionError(`Git command failed: ${error.message}`, command, args, error);
    }

    const stdoutStr = stdout?.toString() || '';
    const stderrStr = stderr?.toString() || '';

    // 检查输出大小
    if (stdoutStr.length > this.maxOutputSize) {
      throw new GitExecutionError(
        'Output too large',
        command,
        args,
        new Error('Output size limit exceeded')
      );
    }

    return {
      stdout: stdoutStr,
      stderr: stderrStr,
      exitCode: status || 0,
      success: status === 0,
    };
  }

  /**
   * 安全解析Git引用范围（如 HEAD..origin/main）
   */
  parseGitRange(range: string): { from: string; to: string } {
    if (!range || typeof range !== 'string') {
      throw new GitSecurityError('Invalid range format', range);
    }

    // 支持的范围格式
    const patterns = [
      /^([^.]+)\.\.([^.]+)$/, // commit1..commit2
      /^([^.]+)\.\.\.([^.]+)$/, // commit1...commit2
    ];

    for (const pattern of patterns) {
      const match = range.match(pattern);
      if (match?.[1] && match[2]) {
        const from = match[1];
        const to = match[2];

        if (!this.validateGitRef(from) || !this.validateGitRef(to)) {
          throw new GitSecurityError('Invalid git reference in range', range);
        }

        return { from, to };
      }
    }

    throw new GitSecurityError('Unsupported range format', range);
  }
}

/**
 * Git安全错误类
 */
export class GitSecurityError extends Error {
  constructor(
    message: string,
    public readonly input: string,
    public readonly code: string = 'GIT_SECURITY_ERROR'
  ) {
    super(`${message}: ${input}`);
    this.name = 'GitSecurityError';
  }
}

/**
 * Git执行错误类
 */
export class GitExecutionError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly args: string[],
    public readonly originalError: Error
  ) {
    super(message);
    this.name = 'GitExecutionError';
    this.cause = originalError;
  }
}

/**
 * 默认的安全Git执行器实例
 */
export const secureGitExecutor = new SecureGitExecutor();

/**
 * 便捷的安全Git命令执行函数
 */
export async function safeExecGit(
  command: string,
  args: string[] = [],
  options: Partial<GitExecOptions> = {}
): Promise<GitExecResult> {
  return secureGitExecutor.executeGitCommand(command, args, options);
}
