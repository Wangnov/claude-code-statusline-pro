/**
 * 主题系统类型定义 | Theme system type definitions
 * 简化的主题配置，替代复杂的templates结构 | Simplified theme config, replacing complex templates structure
 */

import type { Config } from '../config/schema.js';

/**
 * 主题配置接口 | Theme config interface
 */
export interface ThemeConfig {
  /** 启用彩色渐变 | Enable gradient colors */
  enable_gradient: boolean;
  /** 忽略分隔符设置 | Ignore separator settings */
  ignore_separator: boolean;
  /** 精细进度条 | Fine-grained progress bar */
  fine_progress: boolean;
  /** 胶囊样式 | Capsule style */
  capsule_style: boolean;
}

/**
 * 主题集合配置 | Themes collection config
 */
export interface ThemesConfig {
  /** Classic主题配置 | Classic theme config */
  classic?: ThemeConfig;
  /** Powerline主题配置 | Powerline theme config */
  powerline?: ThemeConfig;
  /** Capsule主题配置 | Capsule theme config */
  capsule?: ThemeConfig;
  /** 用户自定义主题 | Custom themes */
  [key: string]: ThemeConfig | undefined;
}

/**
 * 内置主题定义 | Builtin theme definitions
 */
export const BUILTIN_THEMES: Record<string, ThemeConfig> = {
  classic: {
    enable_gradient: false,
    ignore_separator: false,
    fine_progress: false,
    capsule_style: false,
  },

  powerline: {
    enable_gradient: true,
    ignore_separator: true,
    fine_progress: true,
    capsule_style: false,
  },

  capsule: {
    enable_gradient: true,
    ignore_separator: true,
    fine_progress: true,
    capsule_style: true,
  },
};

/**
 * 主题渲染器接口 | Theme renderer interface
 */
export interface ThemeRenderer {
  /**
   * 渲染状态行 | Render statusline
   */
  renderStatusline(components: string[], colors: string[], config: Config): string;
}

/**
 * 主题应用结果 | Theme application result
 */
export interface ThemeApplicationResult {
  /** 应用后的配置 | Applied config */
  config: Config;
  /** 应用的主题名称 | Applied theme name */
  themeName: string;
  /** 主题配置 | Theme config */
  themeConfig: ThemeConfig;
  /** 是否成功应用 | Successfully applied */
  success: boolean;
  /** 警告信息 | Warning messages */
  warnings?: string[];
}

/**
 * 主题兼容性检查结果 | Theme compatibility check result
 */
export interface ThemeCompatibilityResult {
  /** 是否兼容 | Is compatible */
  compatible: boolean;
  /** 推荐的回退主题 | Recommended fallback theme */
  fallbackTheme?: string;
  /** 兼容性说明 | Compatibility notes */
  notes: string[];
}

/**
 * 验证结果 | Validation result
 */
export interface ValidationResult {
  /** 错误列表 | Error list */
  errors: string[];
  /** 警告列表 | Warning list */
  warnings: string[];
}

/**
 * 分隔符配置 | Separator configuration
 */
export interface SeparatorConfig {
  /** 分隔符字符 | Separator character */
  separator: string;
  /** 分隔符颜色 | Separator color */
  separator_color: string;
  /** 分隔符前空格 | Space before separator */
  separator_before: string;
  /** 分隔符后空格 | Space after separator */
  separator_after: string;
}

/**
 * 主题管理器配置选项 | Theme manager config options
 */
export interface ThemeManagerOptions {
  /** 是否启用严格验证 | Enable strict validation */
  strictValidation?: boolean;
  /** 是否自动回退 | Enable auto fallback */
  autoFallback?: boolean;
  /** 自定义主题 | Custom themes */
  customThemes?: ThemesConfig;
}

/**
 * 主题特性标志 | Theme feature flags
 */
export interface ThemeFeatures {
  /** 是否需要Nerd Font支持 | Requires Nerd Font support */
  requiresNerdFont: boolean;
  /** 是否需要颜色支持 | Requires color support */
  requiresColors: boolean;
  /** 是否支持渐变效果 | Supports gradient effects */
  supportsGradient: boolean;
  /** 是否使用自定义分隔符 | Uses custom separators */
  customSeparators: boolean;
}

/**
 * 主题类型枚举 | Theme type enum
 */
export type ThemeType = 'classic' | 'powerline' | 'capsule' | string;

/**
 * 深度克隆工具类型 | Deep clone utility type
 */
export type DeepClone<T> = T extends object
  ? T extends Array<infer U>
    ? Array<DeepClone<U>>
    : { [K in keyof T]: DeepClone<T[K]> }
  : T;
