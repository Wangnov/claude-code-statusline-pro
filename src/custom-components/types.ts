import type { RenderContext } from '../config/schema.js';

/**
 * 自定义组件渲染结果 | Custom component render result
 */
export interface CustomComponentRenderResult {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * 自定义组件接口 - 简化版 | Custom component interface - simplified
 */
export interface CustomComponent {
  /**
   * 组件名称 | Component name
   */
  name: string;

  /**
   * 渲染组件 | Render component
   */
  render(context: RenderContext): Promise<CustomComponentRenderResult>;

  /**
   * 清理资源（可选）| Cleanup resources (optional)
   */
  cleanup?(): Promise<void>;
}

/**
 * 自定义组件工厂函数类型 | Custom component factory function type
 */
export type CustomComponentFactory = (config: CustomComponentConfig) => CustomComponent;

/**
 * 自定义组件配置 | Custom component configuration
 */
export interface CustomComponentConfig {
  enabled: boolean;
  nerd_icon?: string;
  emoji_icon?: string;
  text_icon?: string;
  icon_color?: string;
  text_color?: string;
  [key: string]: unknown;
}

/**
 * 已加载的组件信息 | Loaded component info
 */
export interface LoadedComponent {
  name: string;
  factory: CustomComponentFactory;
  config: CustomComponentConfig;
  source: 'command' | 'project' | 'user';
}

/**
 * 组件搜索路径 | Component search paths
 */
export interface ComponentSearchPaths {
  command?: string; // 命令行指定路径 | Command line specified path
  project?: string; // 项目级路径 | Project level path
  user?: string; // 用户级路径 | User level path
}

/**
 * 自定义组件系统配置 | Custom component system configuration
 */
export interface CustomComponentsConfig {
  /**
   * 组件代码映射 | Component code mappings
   * 例如 | Example: { "C": "clock", "W": "weather" }
   */
  codes?: Record<string, string>;

  /**
   * 是否启用调试模式 | Enable debug mode
   */
  debug?: boolean;
}