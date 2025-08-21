import { ComponentRegistry } from '../components/base.js';
import { BranchComponentFactory } from '../components/branch.js';
import { FakeComponentFactory } from '../components/fake.js';
import { ModelComponentFactory } from '../components/model.js';
import { ProjectComponentFactory } from '../components/project.js';
import { StatusComponentFactory } from '../components/status.js';
import { TokensComponentFactory } from '../components/tokens.js';
import { UsageComponentFactory } from '../components/usage.js';
import type { ComponentConfig, Config, InputData, RenderContext } from '../config/schema.js';
import { TerminalRenderer } from '../terminal/colors.js';
import { detect, getCapabilityInfo } from '../terminal/detector.js';
import { createThemeRenderer } from '../themes/index.js';

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
    this.componentRegistry.register('fake', new FakeComponentFactory());
    this.componentRegistry.register('project', new ProjectComponentFactory());
    this.componentRegistry.register('model', new ModelComponentFactory());
    this.componentRegistry.register('branch', new BranchComponentFactory());
    this.componentRegistry.register('tokens', new TokensComponentFactory());
    this.componentRegistry.register('usage', new UsageComponentFactory());
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
        this.config.terminal?.force_nerd_font
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
        if (!componentConfig || !componentConfig.enabled) {
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

      // 合并组件结果 | Combine component results using theme renderer
      const result = await this.combineComponentsWithTheme(componentResults, context);

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
   * 使用主题渲染器合并组件 | Combine components using theme renderer
   */
  private async combineComponentsWithTheme(
    componentResults: string[],
    _context: RenderContext
  ): Promise<string> {
    // 如果没有组件结果，返回空字符串 | Return empty string if no component results
    if (componentResults.length === 0) {
      return '';
    }

    // 获取主题名称 | Get theme name
    const themeName = this.config.theme || 'classic';

    // 对于classic主题，特殊处理fake组件
    if (themeName === 'classic') {
      return this.combineClassicTheme(componentResults);
    }

    try {
      // 创建主题渲染器 | Create theme renderer
      const themeRenderer = createThemeRenderer(themeName, this.renderer);

      if (themeRenderer) {
        // 提取组件颜色 | Extract component colors
        const colors = this.extractComponentColors();

        // 使用主题渲染器 | Use theme renderer
        return themeRenderer.renderStatusline(componentResults, colors, this.config);
      }
    } catch (error) {
      console.warn(
        `主题渲染器 '${themeName}' 创建失败，使用默认合并 | Theme renderer '${themeName}' creation failed, using default merging:`,
        error
      );
    }

    // 回退到默认合并方式 | Fallback to default merging
    const separator = this.config.style?.separator || ' ';
    return componentResults.join(separator);
  }

  /**
   * Classic主题的特殊组件合并逻辑 | Special component combination logic for Classic theme
   */
  private combineClassicTheme(componentResults: string[]): string {
    if (componentResults.length === 0) {
      return '';
    }

    const separator = this.config.style?.separator || ' ';
    const separatorBefore = this.config.style?.separator_before || ' ';
    const separatorAfter = this.config.style?.separator_after || ' ';

    // 检查第一个组件是否是fake组件（通过检测是否包含私有Unicode字符）
    const firstComponent = componentResults[0];
    const isFakeFirst = firstComponent?.includes('\uEC03');

    if (isFakeFirst) {
      // 如果第一个是fake组件，将它与其余组件分别处理
      const fakeComponent = firstComponent;
      const realComponents = componentResults.slice(1);

      if (realComponents.length === 0) {
        return fakeComponent || '';
      }

      // fake组件直接连接，不加任何分隔符，真实组件之间正常使用分隔符
      const realComponentsJoined = realComponents.join(
        `${separatorBefore}${separator}${separatorAfter}`
      );
      return fakeComponent + realComponentsJoined; // 不在fake组件和第一个真实组件之间添加分隔符
    }

    // 常规组合逻辑
    return componentResults.join(`${separatorBefore}${separator}${separatorAfter}`);
  }

  /**
   * 提取组件颜色 | Extract component colors
   */
  private extractComponentColors(): string[] {
    const colors: string[] = [];
    const componentOrder = this.getComponentOrder();

    // PowerLine主题的推荐背景色方案 | PowerLine theme recommended background colors
    const powerlineColors: Record<string, string> = {
      project: 'blue',
      model: 'cyan',
      branch: 'green',
      tokens: 'yellow',
      status: 'magenta',
    };

    for (const componentName of componentOrder) {
      // 跳过fake组件，它不需要颜色配置
      if (componentName === 'fake') {
        continue;
      }

      const componentConfig = this.getComponentConfig(componentName) as ComponentConfig;
      if (componentConfig?.enabled) {
        // 对于powerline主题，使用专门的背景色方案；其他主题使用图标颜色
        // For powerline theme, use dedicated background colors; other themes use icon colors
        if (this.config.theme === 'powerline') {
          colors.push(powerlineColors[componentName] || 'blue');
        } else {
          colors.push(componentConfig.icon_color || 'blue');
        }
      }
    }

    return colors;
  }

  /**
   * 获取组件顺序 | Get component order
   */
  private getComponentOrder(): string[] {
    const components = this.config.components;
    let componentOrder: string[] = [];

    // 优先级：preset参数 > components.order > 默认
    // Priority: preset parameter > components.order > default
    const preset = this.config.preset;

    // 如果预设不是默认值（PMBTUS），使用预设系统解析组件顺序
    // If preset is not default (PMBTUS), use preset system to parse component order
    if (preset && preset !== 'PMBTUS') {
      componentOrder = this.parsePreset(preset);
    } else if (components?.order && Array.isArray(components.order)) {
      // 否则使用配置的顺序 | Otherwise use configured order
      componentOrder = [...components.order];
    } else {
      // 使用预设系统解析默认顺序 | Use preset system to parse default order
      componentOrder = this.parsePreset(preset || 'PMBTUS');
    }

    // 检查是否需要在开头添加fake组件 | Check if fake component needs to be added at the beginning
    const needsFakeComponent = this.shouldAddFakeComponent(componentOrder);
    if (needsFakeComponent) {
      // 确保fake组件在最前面，如果已经存在则移除重复的 | Ensure fake component is first, remove duplicates if exists
      componentOrder = componentOrder.filter((name) => name !== 'fake');
      componentOrder.unshift('fake');
    }

    return componentOrder;
  }

  /**
   * 检查是否需要添加fake组件 | Check if fake component should be added
   */
  private shouldAddFakeComponent(componentOrder: string[]): boolean {
    // 检查强制非Nerd Font参数：如果强制使用emoji或text模式，则不需要fake组件
    if (this.config.terminal?.force_emoji || this.config.terminal?.force_text) {
      return false;
    }

    // 检查终端能力：只有支持Nerd Font的终端才需要fake组件
    const capabilities = detect(
      this.config.style?.enable_colors,
      this.config.style?.enable_emoji,
      this.config.style?.enable_nerd_font,
      this.config.terminal?.force_nerd_font
    );

    // 只有在支持Nerd Font且有其他组件的情况下才添加fake组件
    return capabilities.nerdFont && componentOrder.length > 0;
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
      U: 'usage',
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

    // 为fake组件提供默认配置 | Provide default configuration for fake component
    if (componentName === 'fake') {
      return {
        enabled: true,
        icon_color: 'bg_default',
        text_color: 'bg_default',
        nerd_icon: '\uE0B0', // Powerline arrow
        emoji_icon: '',
        text_icon: ' ',
      };
    }

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
