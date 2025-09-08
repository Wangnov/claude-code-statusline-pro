import { readFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import toml from 'toml';
import type { CustomComponentFactory, CustomComponentConfig, LoadedComponent } from './types.js';
import { ComponentDiscovery } from './discovery.js';

/**
 * 组件加载器 - 负责加载和初始化组件 | Component Loader - loads and initializes components
 */
export class ComponentLoader {
  private discovery: ComponentDiscovery;
  private loadedComponents = new Map<string, LoadedComponent>();
  private debug: boolean;

  constructor(commandPath?: string, projectId?: string, debug = false) {
    this.discovery = new ComponentDiscovery(commandPath, projectId);
    this.debug = debug;
  }

  /**
   * 加载所有发现的组件 | Load all discovered components
   */
  public async loadComponents(): Promise<void> {
    const discovered = this.discovery.discoverComponents();

    if (this.debug) {
      console.log(`发现 ${discovered.size} 个组件 | Found ${discovered.size} components`);
    }

    for (const [name, info] of discovered) {
      try {
        await this.loadComponent(name, info.path, info.source);
      } catch (error) {
        console.error(`加载组件 ${name} 失败 | Failed to load component ${name}:`, error);
      }
    }
  }

  /**
   * 加载单个组件 | Load single component
   */
  private async loadComponent(
    name: string,
    componentPath: string,
    source: 'command' | 'project' | 'user'
  ): Promise<void> {
    try {
      // 1. 加载配置文件
      const configPath = join(componentPath, 'config.toml');
      const configContent = readFileSync(configPath, 'utf-8');
      const config = toml.parse(configContent) as CustomComponentConfig;

      // 确保enabled字段存在
      if (config.enabled === undefined) {
        config.enabled = true;
      }

      // 2. 动态导入组件模块
      const componentFile = join(componentPath, 'component.js');
      const moduleUrl = pathToFileURL(componentFile).href;
      
      if (this.debug) {
        console.log(`加载组件模块 | Loading component module: ${moduleUrl}`);
      }

      const module = await import(moduleUrl);
      
      // 支持默认导出和命名导出
      const factory: CustomComponentFactory = module.default || module.createComponent;
      
      if (typeof factory !== 'function') {
        throw new Error(`组件 ${name} 必须导出工厂函数 | Component ${name} must export a factory function`);
      }

      // 3. 存储已加载的组件
      this.loadedComponents.set(name, {
        name,
        factory,
        config,
        source
      });

      if (this.debug) {
        console.log(`成功加载组件 ${name} (来源: ${source}) | Successfully loaded component ${name} (source: ${source})`);
      }
    } catch (error) {
      console.error(`加载组件 ${name} 时出错 | Error loading component ${name}:`, error);
      throw error;
    }
  }

  /**
   * 获取所有已加载的组件 | Get all loaded components
   */
  public getLoadedComponents(): Map<string, LoadedComponent> {
    return new Map(this.loadedComponents);
  }

  /**
   * 获取指定组件 | Get specific component
   */
  public getComponent(name: string): LoadedComponent | undefined {
    return this.loadedComponents.get(name);
  }

  /**
   * 获取搜索路径 | Get search paths
   */
  public getSearchPaths() {
    return this.discovery.getSearchPaths();
  }
}