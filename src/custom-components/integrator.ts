import type { ComponentConfig, RenderContext } from '../config/schema.js';
import type { ComponentFactory, ComponentResult } from '../components/base.js';
import { BaseComponent } from '../components/base.js';
import { ComponentLoader } from './loader.js';
import type { CustomComponent, CustomComponentsConfig, CustomComponentRenderResult, LoadedComponent } from './types.js';

/**
 * 包装器组件 - 将自定义组件适配为BaseComponent | Wrapper component - adapts custom component to BaseComponent
 */
class CustomComponentWrapper extends BaseComponent {
  private customComponent: CustomComponent;

  constructor(
    id: string,
    config: ComponentConfig,
    private customComponentInstance: CustomComponent
  ) {
    super(id, config);
    this.customComponent = customComponentInstance;
  }

  protected renderContent(context: RenderContext): string | null {
    // 这个方法不会被调用，因为我们重写了render方法
    return null;
  }

  // 重写render方法以使用自定义组件的异步渲染
  public override async render(context: RenderContext): Promise<ComponentResult> {
    try {
      const result = await this.customComponent.render(context);
      
      // 如果自定义组件返回了内容，应用图标和颜色
      if (result.success && result.content) {
        const icon = this.selectIcon();
        const textColor = this.config.text_color || 'white';
        
        // 使用BaseComponent的formatOutput方法，同时应用颜色
        if (icon) {
          // 使用三参数版本：(icon, text, color)
          const formattedContent = this.formatOutput(icon, result.content, textColor);
          return { content: formattedContent, success: true };
        } else {
          // 没有图标时，只应用颜色
          const coloredContent = this.colorize(result.content, textColor);
          return { content: coloredContent, success: true };
        }
      }
      
      return { content: result.content || null, success: result.success };
    } catch (error) {
      return {
        content: null,
        success: false,
        error: `自定义组件渲染失败 | Custom component render failed: ${error}`
      };
    }
  }

  public async cleanup(): Promise<void> {
    if (this.customComponent.cleanup) {
      await this.customComponent.cleanup();
    }
  }
}

/**
 * 自定义组件工厂包装器 | Custom component factory wrapper
 */
class CustomComponentFactoryWrapper implements ComponentFactory {
  constructor(
    private name: string,
    private customFactory: (config: any) => CustomComponent,
    private customConfig: any
  ) {}

  createComponent(id: string, config: ComponentConfig): BaseComponent {
    // 合并配置
    const mergedConfig = { ...this.customConfig, ...config };
    
    // 创建自定义组件实例
    const customComponent = this.customFactory(mergedConfig);
    
    // 包装为BaseComponent
    return new CustomComponentWrapper(id, config, customComponent);
  }

  create(id: string, config: ComponentConfig): BaseComponent {
    return this.createComponent(id, config);
  }

  getSupportedTypes(): string[] {
    return [this.name];
  }
}

/**
 * 自定义组件集成器 - 将自定义组件集成到主系统 | Custom Component Integrator
 */
export class CustomComponentIntegrator {
  private loader: ComponentLoader;
  private componentCodes: Map<string, string> = new Map();
  private debug: boolean;

  constructor(
    commandPath?: string,
    projectId?: string,
    config?: CustomComponentsConfig
  ) {
    this.loader = new ComponentLoader(commandPath, projectId, config?.debug);
    this.debug = config?.debug || false;
    
    // 设置组件代码映射
    if (config?.codes) {
      for (const [code, name] of Object.entries(config.codes)) {
        this.componentCodes.set(code, name);
      }
    }
  }

  /**
   * 初始化并加载所有组件 | Initialize and load all components
   */
  public async initialize(): Promise<void> {
    await this.loader.loadComponents();
    
    if (this.debug) {
      const loaded = this.loader.getLoadedComponents();
      console.log(`集成器初始化完成，已加载 ${loaded.size} 个组件 | Integrator initialized, loaded ${loaded.size} components`);
    }
  }

  /**
   * 注册所有自定义组件到组件注册表 | Register all custom components to registry
   */
  public registerComponents(registry: any): void {
    const components = this.loader.getLoadedComponents();
    
    for (const [name, component] of components) {
      if (!component.config.enabled) {
        if (this.debug) {
          console.log(`跳过禁用的组件 ${name} | Skipping disabled component ${name}`);
        }
        continue;
      }
      
      // 创建工厂包装器
      const factoryWrapper = new CustomComponentFactoryWrapper(
        name,
        component.factory,
        component.config
      );
      
      // 注册到组件注册表
      registry.register(name, factoryWrapper);
      
      if (this.debug) {
        console.log(`注册自定义组件 ${name} | Registered custom component ${name}`);
      }
    }
  }

  /**
   * 解析预设字符串，将自定义组件代码转换为组件名 | Parse preset string
   */
  public parsePreset(preset: string, defaultMapping: Record<string, string>): string[] {
    const result: string[] = [];
    
    if (this.debug) {
      console.log(`解析预设 "${preset}"，组件代码映射:`, Array.from(this.componentCodes.entries()));
    }
    
    for (const char of preset) {
      // 首先检查自定义组件代码
      if (this.componentCodes.has(char)) {
        const componentName = this.componentCodes.get(char)!;
        // 确保组件已加载
        if (this.loader.getComponent(componentName)) {
          if (this.debug) {
            console.log(`找到自定义组件: ${char} -> ${componentName}`);
          }
          result.push(componentName);
          continue;
        } else {
          if (this.debug) {
            console.log(`组件 ${componentName} 未加载`);
          }
        }
      }
      
      // 回退到默认映射
      if (defaultMapping[char]) {
        result.push(defaultMapping[char]);
      } else {
        console.warn(`Unknown preset character: ${char}`);
      }
    }
    
    return result;
  }

  /**
   * 获取所有组件代码映射 | Get all component code mappings
   */
  public getComponentCodes(): Map<string, string> {
    return new Map(this.componentCodes);
  }

  /**
   * 添加组件代码映射 | Add component code mapping
   */
  public addComponentCode(code: string, componentName: string): void {
    if (code.length !== 1) {
      throw new Error('组件代码必须是单个字符 | Component code must be a single character');
    }
    this.componentCodes.set(code, componentName);
  }

  /**
   * 获取已加载的组件 | Get loaded component
   */
  public getLoadedComponent(name: string): LoadedComponent | undefined {
    return this.loader.getComponent(name);
  }
}