/**
 * Project Resolver - 统一的项目路径解析器
 * 负责所有项目 ID 的获取和路径转换
 *
 * 设计原则：
 * 1. 单一真相源：所有路径哈希逻辑集中在此处
 * 2. 智能优先级：优先使用 stdin 数据，其次自动生成
 * 3. 全局一致性：单例模式确保整个程序生命周期内项目 ID 一致
 */

/**
 * 项目路径解析器
 * 使用单例模式确保全局一致性
 */
export class ProjectResolver {
  private static instance: ProjectResolver;
  private cachedProjectId: string | null = null;

  /**
   * 私有构造函数，防止外部实例化
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): ProjectResolver {
    if (!ProjectResolver.instance) {
      ProjectResolver.instance = new ProjectResolver();
    }
    return ProjectResolver.instance;
  }

  /**
   * 从 transcript 路径设置项目 ID（最高优先级）
   * 当从 stdin 接收到 transcriptPath 时调用
   *
   * @param transcriptPath - Claude Code 传入的 transcript 文件路径
   * 例如：/Users/xxx/.claude/projects/C--Users-xxx-project/xxx.jsonl
   */
  setProjectIdFromTranscript(transcriptPath: string | null | undefined): void {
    if (!transcriptPath) {
      return;
    }

    try {
      // 匹配 /projects/ 后面和下一个 / 之间的内容
      const match = transcriptPath.match(/[/\\]projects[/\\]([^/\\]+)[/\\]/);
      if (match?.[1]) {
        this.cachedProjectId = match[1];
        // Debug log for development
        if (process.env.DEBUG) {
          console.error(
            `[ProjectResolver] Set project ID from transcript: ${this.cachedProjectId}`
          );
        }
      }
    } catch (error) {
      // 静默失败，不影响程序运行
      if (process.env.DEBUG) {
        console.error('[ProjectResolver] Failed to extract project ID from transcript:', error);
      }
    }
  }

  /**
   * 获取项目 ID
   * 智能判断：优先使用缓存的（来自 stdin），否则生成
   *
   * @param fallbackPath - 备选路径，当没有缓存的项目 ID 时使用
   * @returns 项目 ID 字符串
   */
  getProjectId(fallbackPath?: string): string {
    // 优先级 1：使用缓存的项目 ID（来自 stdin）
    if (this.cachedProjectId) {
      return this.cachedProjectId;
    }

    // 优先级 2：根据提供的路径或当前目录生成
    const pathToHash = fallbackPath || process.cwd();
    return this.hashProjectPath(pathToHash);
  }

  /**
   * 直接哈希指定路径（不使用缓存）
   * 用于需要临时生成项目 ID 的场景，如 config -i 命令
   *
   * @param projectPath - 要哈希的项目路径
   * @returns 哈希后的项目 ID
   */
  hashPath(projectPath: string): string {
    return this.hashProjectPath(projectPath);
  }

  /**
   * 统一的路径哈希方法（Windows 兼容）
   * 这是唯一的真相源，所有路径转换都使用此方法
   *
   * macOS/Unix: /Users/name/project -> -Users-name-project
   * Windows: C:\Users\name\project -> C--Users-name-project
   *
   * @param projectPath - 原始项目路径
   * @returns 哈希后的项目 ID
   */
  private hashProjectPath(projectPath: string): string {
    if (!projectPath) {
      throw new Error('Project path cannot be empty');
    }

    let result = projectPath;

    // Windows路径处理：C:\ -> C--
    // 关键：将盘符冒号后的反斜杠一起处理，避免产生三个连字符
    if (/^[A-Za-z]:\\/.test(result)) {
      // 将 "C:\" 替换为 "C--"
      result = result.replace(/^([A-Za-z]):\\/, '$1--');
      // 替换剩余的反斜杠为单个连字符
      result = result.replace(/\\/g, '-');
    } else if (/^[A-Za-z]:\//.test(result)) {
      // 处理 "C:/" 格式（可能在某些环境中出现）
      result = result.replace(/^([A-Za-z]):\//, '$1--');
      result = result.replace(/\//g, '-');
    } else {
      // Unix/macOS 路径：直接替换所有斜杠
      result = result.replace(/[\\/:]/g, '-');
      // 清理多个连续连字符为单个连字符
      result = result.replace(/-+/g, '-');
    }

    // 移除结尾的连字符
    result = result.replace(/-+$/, '');

    return result;
  }

  /**
   * 清除缓存的项目 ID
   * 主要用于测试或需要重置状态的场景
   */
  clearCache(): void {
    this.cachedProjectId = null;
  }

  /**
   * 获取当前缓存的项目 ID（用于调试）
   */
  getCachedProjectId(): string | null {
    return this.cachedProjectId;
  }
}

/**
 * 导出单例实例，方便使用
 */
export const projectResolver = ProjectResolver.getInstance();
