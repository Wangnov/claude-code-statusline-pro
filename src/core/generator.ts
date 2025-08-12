import { ComponentRegistry } from '../components/base.js';
import { BranchComponentFactory } from '../components/branch.js';
import { ModelComponentFactory } from '../components/model.js';
import { ProjectComponentFactory } from '../components/project.js';
import { StatusComponentFactory } from '../components/status.js';
import { TokensComponentFactory } from '../components/tokens.js';
import type { ComponentConfig, Config, InputData, RenderContext } from '../config/schema.js';
import { TerminalRenderer } from '../terminal/colors.js';
import { detect, getCapabilityInfo } from '../terminal/detector.js';

/**
 * 生成器选项 | Generator options
 */
export interface GeneratorOptions {
  preset?: string;
  updateThrottling?: boolean;
  disableCache?: boolean;
}

/**
 * 核心状态行生成器 | Core statusline generator
 * 整合所有组件，生成最终的状态行 | Integrates all components to generate the final statusline
 */
export class StatuslineGenerator {
  private config: Config;
  private componentRegistry: ComponentRegistry;
  private renderer?: TerminalRenderer;
  private lastUpdate: number = 0;
  private lastResult: string | null = null;
  private updateInterval: number = 300; // 官方建议的300ms更新间隔 | Official 300ms update interval
  private disableCache: boolean = false;

  constructor(config: Config, options: GeneratorOptions = {}) {
    this.config = config;
    this.componentRegistry = new ComponentRegistry();
    this.initializeComponents();

    if (options.updateThrottling !== false) {
      this.updateInterval = 300;
    }

    this.disableCache = options.disableCache || false;
  }

  /**
   * 初始化组件注册表 | Initialize component registry
   */
  private initializeComponents(): void {
    // 注册所有组件工厂 | Register all component factories
    this.componentRegistry.register('project', new ProjectComponentFactory());
    this.componentRegistry.register('model', new ModelComponentFactory());
    this.componentRegistry.register('branch', new BranchComponentFactory());
    this.componentRegistry.register('tokens', new TokensComponentFactory());
    this.componentRegistry.register('status', new StatusComponentFactory());
  }

  /**
   * 生成状态行 | Generate statusline
   */
  public async generate(inputData: InputData): Promise<string> {
    try {
      // 检查更新频率限制 | Check update rate limit
      if (!this.shouldUpdate()) {
        return this.lastResult || '';
      }

      // 检测终端能力 | Detect terminal capabilities
      const capabilities = detect(
        this.config.style?.enable_colors,
        this.config.style?.enable_emoji,
        this.config.style?.enable_nerd_font,
        this.config.experimental?.force_nerd_font
      );

      // 初始化终端渲染器 | Initialize terminal renderer
      this.renderer = new TerminalRenderer(capabilities, this.config);

      // 创建渲染上下文 | Create render context
      const context: RenderContext = {
        inputData,
        config: this.config,
        capabilities,
        colors: this.renderer.getColors(),
        icons: this.renderer.getIcons(),
      };

      // 获取组件顺序 | Get component order
      const componentOrder = this.getComponentOrder();

      // 生成各组件内容 | Generate component content
      const componentResults: string[] = [];

      for (const componentName of componentOrder) {
        const componentConfig = this.getComponentConfig(componentName);
        if (!componentConfig || !componentConfig['enabled']) {
          continue;
        }

        const component = this.componentRegistry.create(
          componentName,
          componentName,
          componentConfig as ComponentConfig
        );

        if (component) {
          try {
            const result = await component.render(context);
            if (result.success && result.content) {
              componentResults.push(result.content);
            } else if (!result.success && result.error) {
              console.error(`Component ${componentName} failed:`, result.error);
            }
          } catch (error) {
            console.error(`Error rendering component ${componentName}:`, error);
          }
        }
      }

      // 合并组件结果 | Combine component results
      const separator = this.config.style?.separator || ' ';
      const result = componentResults.join(separator);

      // 缓存结果 | Cache result
      this.lastResult = result;

      return result;
    } catch (error) {
      console.error('Error generating statusline:', error);
      // 返回简化的错误状态 | Return simplified error status
      return this.generateFallbackStatus(inputData);
    }
  }

  /**
   * 获取组件顺序 | Get component order
   */
  private getComponentOrder(): string[] {
    const components = this.config.components;

    // 如果配置了组件顺序，使用配置的顺序 | If component order is configured, use configured order
    if (components?.order && Array.isArray(components.order)) {
      return components.order;
    }

    // 使用预设系统解析组件顺序 | Use preset system to parse component order
    const preset = this.config.preset || 'PMBTS';
    return this.parsePreset(preset);
  }

  /**
   * 解析预设字符串 | Parse preset string
   */
  private parsePreset(preset: string): string[] {
    const mapping = this.config.preset_mapping || {
      P: 'project',
      M: 'model',
      B: 'branch',
      T: 'tokens',
      S: 'status',
    };

    return preset
      .split('')
      .map((char) => mapping[char as keyof typeof mapping])
      .filter(Boolean);
  }

  /**
   * 获取组件配置 | Get component configuration
   */
  private getComponentConfig(componentName: string): Record<string, unknown> | null {
    const components = this.config.components;
    if (!components) return null;

    return (components as Record<string, unknown>)[componentName] as Record<string, unknown> | null;
  }

  /**
   * 检查是否应该更新 | Check if should update
   */
  private shouldUpdate(): boolean {
    // 如果禁用缓存，总是允许更新 | Always allow update if cache is disabled
    if (this.disableCache) {
      return true;
    }

    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) {
      return false;
    }
    this.lastUpdate = now;
    return true;
  }

  /**
   * 生成后备状态 | Generate fallback status
   */
  private generateFallbackStatus(inputData: InputData): string {
    try {
      // 基本的无颜色状态行 | Basic colorless statusline
      const parts: string[] = [];

      // 项目名 | Project name
      if (inputData.workspace?.project_dir) {
        const projectName = inputData.workspace.project_dir.split('/').pop();
        if (projectName) {
          parts.push(`[P] ${projectName}`);
        }
      }

      // 模型 | Model
      if (inputData.model?.id) {
        const modelName = inputData.model.id.includes('sonnet') ? 'S4' : 'M';
        parts.push(`[M] ${modelName}`);
      }

      // 状态 | Status
      parts.push('[S] Ready');

      return parts.join(' ');
    } catch (_error) {
      return '[ERR] Statusline Error';
    }
  }

  /**
   * 更新配置 | Update configuration
   */
  public updateConfig(newConfig: Config): void {
    this.config = newConfig;
    // 清除缓存 | Clear cache
    this.lastResult = null;
    this.lastUpdate = 0;
  }

  /**
   * 获取当前配置 | Get current configuration
   */
  public getConfig(): Config {
    return { ...this.config };
  }

  /**
   * 获取终端能力信息 | Get terminal capability info
   */
  public getTerminalCapabilities() {
    return getCapabilityInfo();
  }

  /**
   * 强制刷新 | Force refresh
   */
  public forceRefresh(): void {
    this.lastUpdate = 0;
    this.lastResult = null;
  }
}
