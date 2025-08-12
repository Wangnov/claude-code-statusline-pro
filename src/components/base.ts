import type { ComponentConfig, RenderContext } from '../config/schema.js';

/**
 * 组件渲染结果接口 | Component render result interface
 */
export interface ComponentResult {
  /** 渲染后的字符串内容，null表示不显示 | Rendered string content, null means not displayed */
  content: string | null;
  /** 是否成功渲染 | Whether rendering was successful */
  success: boolean;
  /** 错误信息（如果有） | Error message (if any) */
  error?: string;
}

/**
 * 组件基类接口 | Component base interface
 */
export interface Component {
  /** 组件名称 | Component name */
  readonly name: string;
  /** 是否启用 | Whether enabled */
  readonly enabled: boolean;
  /** 渲染组件 | Render component */
  render(context: RenderContext): ComponentResult | Promise<ComponentResult>;
}

/**
 * 抽象组件基类 | Abstract component base class
 * 提供通用的组件功能和模板方法 | Provides common component functionality and template methods
 */
export abstract class BaseComponent implements Component {
  public readonly name: string;
  protected config: ComponentConfig;
  protected renderContext?: RenderContext;

  constructor(name: string, config: ComponentConfig) {
    this.name = name;
    this.config = config;
  }

  /** 组件是否启用 | Whether component is enabled */
  get enabled(): boolean {
    return this.config.enabled ?? true;
  }

  /**
   * 渲染组件 | Render component
   */
  public render(context: RenderContext): ComponentResult | Promise<ComponentResult> {
    this.renderContext = context;

    // 检查组件是否启用 | Check if component is enabled
    if (!this.enabled) {
      return { content: null, success: true };
    }

    try {
      const content = this.renderContent(context);

      // 处理异步渲染 | Handle async rendering
      if (content instanceof Promise) {
        return content
          .then((result) => ({ content: result, success: true }))
          .catch((error) => ({
            content: null,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }));
      }

      return { content, success: true };
    } catch (error) {
      return {
        content: null,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 渲染组件内容 - 子类需要实现 | Render component content - subclasses need to implement
   */
  protected abstract renderContent(context: RenderContext): string | null | Promise<string | null>;

  /**
   * 获取颜色代码 | Get color code
   */
  protected getColor(colorName: string): string {
    if (!this.renderContext?.colors) return '';
    return this.renderContext.colors[colorName] || '';
  }

  /**
   * 获取重置颜色代码 | Get reset color code
   */
  protected getResetColor(): string {
    if (!this.renderContext?.colors) return '';
    return this.renderContext.colors['reset'] || '';
  }

  /**
   * 获取图标 | Get icon
   */
  protected getIcon(iconName: string): string {
    if (!this.renderContext?.icons) return '';
    return this.renderContext.icons[iconName] || '';
  }

  /**
   * 应用颜色和重置 | Apply color and reset
   */
  protected colorize(content: string, colorName: string): string {
    if (!content) return '';
    if (!this.renderContext?.capabilities?.colors) return content;
    const color = this.getColor(colorName);
    const reset = this.getResetColor();
    return `${color}${content}${reset}`;
  }

  /**
   * 格式化组件输出 | Format component output
   */
  protected formatOutput(icon: string, text: string, colorName?: string): string {
    const formattedText = `${icon} ${text}`;
    return colorName ? this.colorize(formattedText, colorName) : formattedText;
  }
}

/**
 * 组件工厂接口 | Component factory interface
 */
export interface ComponentFactory {
  /** 创建组件实例 | Create component instance */
  createComponent(name: string, config: ComponentConfig): Component;
  /** 获取支持的组件类型 | Get supported component types */
  getSupportedTypes(): string[];
}

/**
 * 组件注册表 | Component registry
 */
export class ComponentRegistry {
  private factories = new Map<string, ComponentFactory>();

  /**
   * 注册组件工厂 | Register component factory
   */
  register(type: string, factory: ComponentFactory): void {
    this.factories.set(type, factory);
  }

  /**
   * 创建组件 | Create component
   */
  create(type: string, name: string, config: ComponentConfig): Component | null {
    const factory = this.factories.get(type);
    if (!factory) {
      console.warn(`Unknown component type: ${type}`);
      return null;
    }
    return factory.createComponent(name, config);
  }

  /**
   * 获取所有注册的组件类型 | Get all registered component types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.factories.keys());
  }
}
