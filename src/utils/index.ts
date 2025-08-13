/**
 * 工具函数集合
 * 提供常用的工具函数和辅助方法
 */

/**
 * 格式化字节大小
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

/**
 * 格式化数字为千位分隔符形式
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * 截断字符串到指定长度
 */
export function truncateString(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 获取项目名称从路径
 */
export function getProjectName(projectPath: string): string {
  return projectPath.split('/').filter(Boolean).pop() || 'unknown';
}

/**
 * 计算百分比
 */
export function calculatePercentage(used: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
}

/**
 * 生成进度条
 */
export function generateProgressBar(
  percentage: number,
  length = 10,
  fillChar = '█',
  emptyChar = '░',
  warningThreshold = 60,
  criticalThreshold = 95
): string {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;

  // 根据阈值选择不同的字符
  let progressChar = fillChar;
  if (percentage >= criticalThreshold) {
    progressChar = '🔥'; // 临界状态
  } else if (percentage >= warningThreshold) {
    progressChar = '▓'; // 警告状态
  }

  return progressChar.repeat(filled) + emptyChar.repeat(empty);
}

/**
 * 获取Git分支简化名称
 */
export function simplifyBranchName(branchName: string, maxLength = 20): string {
  // 移除常见前缀
  let simplified = branchName.replace(/^(origin\/|refs\/heads\/|refs\/remotes\/)/, '');

  // 如果太长，截断并保留重要部分
  if (simplified.length > maxLength) {
    const parts = simplified.split(/[-_/]/);
    if (parts.length > 1) {
      // 保留最后一部分和第一部分的前几个字符
      const lastPart = parts[parts.length - 1];
      const firstPart =
        parts[0]?.substring(0, Math.max(3, maxLength - (lastPart?.length || 0) - 3)) || '';
      simplified = `${firstPart}...${lastPart || ''}`;
    } else {
      simplified = truncateString(simplified, maxLength);
    }
  }

  return simplified;
}

/**
 * 深度合并对象
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof result[key] === 'object' &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        result[key] = deepMerge(
          result[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        result[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * 检测操作系统
 */
export function getOS(): 'windows' | 'macos' | 'linux' | 'unknown' {
  const platform = process.platform;
  switch (platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'macos';
    case 'linux':
      return 'linux';
    default:
      return 'unknown';
  }
}

/**
 * 安全的JSON解析
 */
export function safeJsonParse<T = unknown>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 生成随机ID
 */
export function generateId(prefix = '', length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 时间格式化
 */
export function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 获取相对时间描述
 */
export function getRelativeTime(timestamp: string | Date): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diff = now.getTime() - time.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}秒前`;
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  return time.toLocaleDateString('zh-CN');
}
