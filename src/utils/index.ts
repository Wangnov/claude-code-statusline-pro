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
 * 基础进度条配置接口 | Basic progress bar config interface
 */
export interface ProgressBarOptions {
  /** 进度条长度 | Progress bar length */
  length?: number;
  /** 填充字符 | Fill character */
  fillChar?: string;
  /** 空白字符 | Empty character */
  emptyChar?: string;
  /** 后备区域字符 | Backup area character */
  backupChar?: string;
  /** 警告阈值 | Warning threshold */
  warningThreshold?: number;
  /** 临界阈值 | Critical threshold */
  criticalThreshold?: number;
  /** 后备区域阈值 | Backup area threshold */
  backupThreshold?: number;
}

/**
 * 渐变进度条配置接口 | Gradient progress bar config interface
 */
export interface GradientProgressOptions extends ProgressBarOptions {
  /** 启用渐变 | Enable gradient */
  enableGradient?: boolean;
  /** 颜色映射函数 | Color mapping function */
  colorMapper?: (percentage: number) => string;
}

/**
 * 精细进度条配置接口 | Fine progress bar config interface
 */
export interface FineProgressOptions extends ProgressBarOptions {
  /** 启用精细进度条 | Enable fine progress */
  enableFineProgress?: boolean;
  /** 精细进度字符数组 | Fine progress characters array */
  fineChars?: string[];
}

/**
 * 综合进度条配置接口 | Advanced progress bar config interface
 */
export interface AdvancedProgressOptions extends GradientProgressOptions, FineProgressOptions {
  /** 主题名称 | Theme name */
  theme?: string;
}

/**
 * 生成基础进度条 | Generate basic progress bar
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
 * RGB颜色接口 | RGB color interface
 */
interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * 线性插值 | Linear interpolation
 */
function lerp(start: number, end: number, factor: number): number {
  return Math.round(start + (end - start) * factor);
}

/**
 * RGB颜色插值 | RGB color interpolation
 */
function lerpRGB(color1: RGBColor, color2: RGBColor, factor: number): RGBColor {
  return {
    r: lerp(color1.r, color2.r, factor),
    g: lerp(color1.g, color2.g, factor),
    b: lerp(color1.b, color2.b, factor),
  };
}

/**
 * 1/8精度字符数组 | 1/8 precision characters array
 * 从调研获得：支持精细进度显示的Unicode字符
 */
export const EIGHTH_PRECISION_CHARS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];

/**
 * RGB转256色映射 | RGB to 256-color mapping
 */
function rgbTo256Color(r: number, g: number, b: number): number {
  // 如果是灰度色
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }

  // 6x6x6颜色立方体
  const rLevel = Math.round((r / 255) * 5);
  const gLevel = Math.round((g / 255) * 5);
  const bLevel = Math.round((b / 255) * 5);

  return 16 + 36 * rLevel + 6 * gLevel + bLevel;
}

/**
 * 检测是否支持TrueColor | Detect TrueColor support
 */
function supportsTrueColor(): boolean {
  const colorterm = process.env.COLORTERM;
  const term = process.env.TERM;

  // 检查明确支持TrueColor的环境变量
  if (colorterm === 'truecolor' || colorterm === '24bit') {
    return true;
  }

  // 检查常见支持TrueColor的终端
  if (
    term?.includes('256color') &&
    (term.includes('xterm') || term.includes('screen') || term.includes('tmux'))
  ) {
    // 对于256color终端，假设不支持TrueColor
    return false;
  }

  return colorterm === 'truecolor';
}

/**
 * 获取彩虹渐变颜色 | Get rainbow gradient color
 * 实现平滑的RGB彩虹渐变：绿色→黄绿→黄色→橙色→红色
 * 自动检测终端支持并选择最佳颜色模式
 */
export function getRainbowGradientColor(percentage: number): string {
  // 限制范围在0-100
  const p = Math.max(0, Math.min(100, percentage));

  // 定义低对比度彩虹色彩点 | Define low-contrast rainbow color points
  // 通过降低饱和度和增加基础亮度来减少对比度
  const colors = {
    softGreen: { r: 80, g: 200, b: 80 }, // 0% - 柔和绿色（加入基础红蓝值）
    softYellowGreen: { r: 150, g: 200, b: 60 }, // 25% - 柔和黄绿色
    softYellow: { r: 200, g: 200, b: 80 }, // 50% - 柔和黄色（不是纯黄）
    softOrange: { r: 220, g: 160, b: 60 }, // 75% - 柔和橙色
    softRed: { r: 200, g: 100, b: 80 }, // 100% - 柔和红色（不是纯红）
  };

  let targetColor: RGBColor;

  if (p <= 25) {
    // 0-25%: 柔和绿到柔和黄绿的渐变
    const factor = p / 25;
    targetColor = lerpRGB(colors.softGreen, colors.softYellowGreen, factor);
  } else if (p <= 50) {
    // 25-50%: 柔和黄绿到柔和黄色的渐变
    const factor = (p - 25) / 25;
    targetColor = lerpRGB(colors.softYellowGreen, colors.softYellow, factor);
  } else if (p <= 75) {
    // 50-75%: 柔和黄色到柔和橙色的渐变
    const factor = (p - 50) / 25;
    targetColor = lerpRGB(colors.softYellow, colors.softOrange, factor);
  } else {
    // 75-100%: 柔和橙色到柔和红色的渐变
    const factor = (p - 75) / 25;
    targetColor = lerpRGB(colors.softOrange, colors.softRed, factor);
  }

  // 根据终端支持返回相应的ANSI代码
  if (supportsTrueColor()) {
    // TrueColor支持：使用RGB
    return `\x1b[38;2;${targetColor.r};${targetColor.g};${targetColor.b}m`;
  } else {
    // 256色回退：转换到最接近的256色
    const colorCode = rgbTo256Color(targetColor.r, targetColor.g, targetColor.b);
    return `\x1b[38;5;${colorCode}m`;
  }
}

/**
 * 获取渐变颜色（向后兼容）| Get gradient color (backward compatibility)
 * 重定向到彩虹渐变算法
 */
export function getGradientColor(percentage: number): string {
  return getRainbowGradientColor(percentage);
}

/**
 * 获取简单渐变颜色（向后兼容）| Get simple gradient color (backward compatibility)
 * 返回颜色名称用于不支持RGB的情况
 */
export function getSimpleGradientColor(percentage: number): string {
  if (percentage <= 40) {
    return 'green';
  } else if (percentage <= 70) {
    return 'yellow';
  } else {
    return 'red';
  }
}

/**
 * 默认精细进度字符 | Default fine progress characters
 * 使用八分之一精度Unicode字符
 */
export const FINE_PROGRESS_CHARS = ['⠀', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];

/**
 * 生成精细进度条 | Generate fine progress bar
 * 使用八分之一精度Unicode字符实现更精确的进度显示
 */
export function generateFineProgressBar(
  percentage: number,
  options: FineProgressOptions = {}
): string {
  const {
    length = 10,
    fineChars = FINE_PROGRESS_CHARS,
    emptyChar = '░',
    backupChar = '▓',
    backupThreshold = 85,
  } = options;

  // 计算总的八分之一单位数
  const totalEighths = length * 8;
  const filledEighths = Math.round((percentage / 100) * totalEighths);

  let bar = '';

  for (let i = 0; i < length; i++) {
    const blockStart = i * 8;
    const blockEnd = blockStart + 8;

    if (filledEighths <= blockStart) {
      // 完全空白
      bar += emptyChar;
    } else if (filledEighths >= blockEnd) {
      // 完全填充，判断是否在后备区域
      const blockPercentage = ((i + 1) / length) * 100;
      bar += blockPercentage > backupThreshold ? backupChar : fineChars[8];
    } else {
      // 部分填充
      const blockFilled = filledEighths - blockStart;
      const blockPercentage = ((i + 0.5) / length) * 100;
      const char = blockPercentage > backupThreshold ? backupChar : fineChars[blockFilled];
      bar += char;
    }
  }

  return bar;
}

/**
 * 生成渐变进度条 | Generate gradient progress bar
 * 支持颜色渐变和85%后备区域
 */
export function generateGradientProgressBar(
  percentage: number,
  options: GradientProgressOptions = {}
): { bar: string; segments: Array<{ char: string; color: string }> } {
  const {
    length = 10,
    fillChar = '█',
    emptyChar = '░',
    backupChar = '▓',
    backupThreshold = 85,
    colorMapper = getGradientColor,
  } = options;

  const filled = Math.round((percentage / 100) * length);
  const segments: Array<{ char: string; color: string }> = [];

  for (let i = 0; i < length; i++) {
    if (i < filled) {
      // 已填充的部分 - 计算基于实际使用率的渐变颜色
      // Calculate gradient color based on actual usage percentage, not position in bar
      const segmentPosition = (i + 0.5) / filled; // 0-1 position within filled area
      const gradientPercentage = segmentPosition * percentage; // 映射到实际使用率

      const isBackupArea = gradientPercentage >= backupThreshold;
      const char = isBackupArea ? backupChar : fillChar;
      const color = colorMapper(gradientPercentage);
      segments.push({ char, color });
    } else {
      // 空白部分
      segments.push({ char: emptyChar, color: 'gray' });
    }
  }

  const bar = segments.map((s) => s.char).join('');
  return { bar, segments };
}

/**
 * 生成精细渐变进度条 | Generate fine gradient progress bar
 * 使用1/8精度字符 + RGB彩虹渐变，实现最高质量的进度显示
 */
export function generateFineGradientProgressBar(
  percentage: number,
  options: AdvancedProgressOptions = {}
): { bar: string; segments: Array<{ char: string; color: string }> } {
  const { length = 15, backupThreshold = 85, colorMapper = getRainbowGradientColor } = options;

  // 计算总精度单位（每个字符位置有8个精度级别）
  const totalUnits = length * 8;
  const filledUnits = Math.round((percentage / 100) * totalUnits);

  const segments: Array<{ char: string; color: string }> = [];

  for (let i = 0; i < length; i++) {
    const unitStart = i * 8;
    const unitEnd = unitStart + 8;

    if (filledUnits <= unitStart) {
      // 完全空白区域 - 使用中性灰色，降低对比度
      segments.push({
        char: '░',
        color: '\x1b[38;2;120;120;120m', // 中性灰色，与背景对比度适中
      });
    } else if (filledUnits >= unitEnd) {
      // 完全填充的位置
      const positionPercentage = ((i + 0.5) / length) * percentage;
      const isBackupArea = positionPercentage >= backupThreshold;

      if (isBackupArea) {
        // 后备区域：使用柔和的橙红色█
        segments.push({
          char: '█',
          color: '\x1b[38;2;180;80;60m', // 柔和橙红色，降低对比度
        });
      } else {
        // 正常区域：使用彩虹渐变█
        segments.push({
          char: '█',
          color: colorMapper(positionPercentage),
        });
      }
    } else {
      // 部分填充的位置 - 使用1/8精度字符
      const unitsInThisPosition = filledUnits - unitStart;
      const charIndex = Math.min(8, Math.max(0, unitsInThisPosition));
      const char = EIGHTH_PRECISION_CHARS[charIndex];

      const positionPercentage = ((i + charIndex / 8) / length) * percentage;
      const isBackupArea = positionPercentage >= backupThreshold;

      if (isBackupArea && char && char !== '') {
        // 后备区域的部分字符：柔和橙红色
        segments.push({
          char,
          color: '\x1b[38;2;180;80;60m', // 柔和橙红色，降低对比度
        });
      } else if (char && char !== '') {
        // 正常区域的部分字符：彩虹渐变
        segments.push({
          char,
          color: colorMapper(positionPercentage),
        });
      } else {
        // 空字符：中性灰色背景
        segments.push({
          char: '▏',
          color: '\x1b[38;2;100;100;100m', // 中性灰色，适中的对比度
        });
      }
    }
  }

  const bar = segments.map((s) => s.char).join('');
  return { bar, segments };
}

/**
 * 生成标准渐变进度条 | Generate standard gradient progress bar
 * 使用█块 + RGB彩虹渐变，适用于不支持精细字符的终端
 */
export function generateStandardGradientProgressBar(
  percentage: number,
  options: AdvancedProgressOptions = {}
): { bar: string; segments: Array<{ char: string; color: string }> } {
  const {
    length = 15,
    fillChar = '█',
    emptyChar = '░',
    backupChar = '▓',
    backupThreshold = 85,
    colorMapper = getRainbowGradientColor,
  } = options;

  const filled = Math.round((percentage / 100) * length);
  const segments: Array<{ char: string; color: string }> = [];

  for (let i = 0; i < length; i++) {
    if (i < filled) {
      // 计算每个字符位置的颜色（基于在已填充部分中的相对位置）
      const relativePosition = i / (filled - 1 || 1); // 避免除以0
      const gradientPercentage = relativePosition * percentage;

      const isBackupArea = gradientPercentage >= backupThreshold;
      const char = isBackupArea ? backupChar : fillChar;

      if (isBackupArea) {
        // 后备区域：柔和橙红色
        segments.push({
          char,
          color: '\x1b[38;2;180;80;60m', // 柔和橙红色，降低对比度
        });
      } else {
        // 正常区域：彩虹渐变
        segments.push({
          char,
          color: colorMapper(gradientPercentage),
        });
      }
    } else {
      // 空白部分：中性灰色，适中对比度
      segments.push({
        char: emptyChar,
        color: '\x1b[38;2;140;140;140m', // 中性灰色，与背景对比适中
      });
    }
  }

  const bar = segments.map((s) => s.char).join('');
  return { bar, segments };
}

/**
 * 生成高级进度条 | Generate advanced progress bar
 * 集成两套渐变模式：精细模式和标准模式
 */
export function generateAdvancedProgressBar(
  percentage: number,
  options: AdvancedProgressOptions = {}
): {
  bar: string;
  segments?: Array<{ char: string; color: string }>;
  color?: string;
} {
  const {
    enableGradient = false,
    enableFineProgress = false,
    // biome-ignore lint/correctness/noUnusedVariables: colorMapper 用于传递给子函数
    colorMapper = getRainbowGradientColor,
  } = options;

  // 如果启用渐变
  if (enableGradient) {
    if (enableFineProgress) {
      // 精细渐变模式：1/8字符 + RGB彩虹渐变
      return generateFineGradientProgressBar(percentage, options);
    } else {
      // 标准渐变模式：█块 + RGB彩虹渐变
      return generateStandardGradientProgressBar(percentage, options);
    }
  }

  // 精细进度条（无渐变）
  if (enableFineProgress) {
    const bar = generateFineProgressBar(percentage, options);
    return { bar };
  }

  // 基础进度条（无渐变无精细）
  const bar = generateProgressBar(
    percentage,
    options.length,
    options.fillChar,
    options.emptyChar,
    options.warningThreshold,
    options.criticalThreshold
  );

  return { bar };
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
 * 深度克隆对象 | Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as T;
  }

  if (typeof obj === 'object') {
    const cloned: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
        cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
      }
    }
    return cloned as T;
  }

  return obj;
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
