import type {
  ComponentConfig,
  ExtendedRenderContext,
  ModelComponentConfig,
  RenderContext,
} from '../config/schema.js';
import { BaseComponent, type ComponentFactory } from './base.js';

/**
 * 模型信息接口 | Model info interface
 * 包含模型的上下文窗口大小、短名称和长名称 | Contains model context window size, short name and long name
 */
interface ModelInfo {
  contextWindow: number;
  shortName: string;
  longName: string;
}

/**
 * 模型组件 | Model component
 * 显示当前使用的模型信息，支持三级图标系统和完全配置驱动 | Display current model information with three-level icon system and full configuration-driven approach
 */
export class ModelComponent extends BaseComponent {
  private modelConfig: ModelComponentConfig;

  constructor(name: string, config: ModelComponentConfig) {
    super(name, config);
    this.modelConfig = config;
  }

  /**
   * 渲染组件内容 | Render component content
   * 使用配置驱动的方式渲染模型信息，支持三级图标系统 | Use configuration-driven approach to render model info with three-level icon system
   */
  protected renderContent(context: RenderContext | ExtendedRenderContext): string | null {
    const { inputData } = context;

    // 获取模型ID | Get model ID
    const modelId = inputData.model?.id || inputData.model?.display_name;
    if (!modelId) return null;

    // 获取模型信息 | Get model info
    const modelInfo = this.getModelInfo(modelId);

    // 确定显示名称 | Determine display name
    const displayName = this.modelConfig.show_full_name ? modelInfo.longName : modelInfo.shortName;

    // 使用BaseComponent的formatOutput自动处理图标和颜色 | Use BaseComponent formatOutput to automatically handle icons and colors
    return this.formatOutput(displayName);
  }

  /**
   * 获取模型配置信息 | Get model configuration info
   * 使用精确映射而不是正则匹配，支持短名称和长名称 | Uses exact mapping instead of regex matching, supports short and long names
   */
  private getModelInfo(modelId: string): ModelInfo {
    if (!modelId) {
      return { contextWindow: 200000, shortName: '?', longName: 'Unknown' };
    }

    // 检查精确映射 | Check exact mapping
    const shortMapping = this.modelConfig.mapping || {};
    const longMapping = this.modelConfig.long_name_mapping || {};

    const shortName = shortMapping[modelId] || 'Unknown';
    const longName = longMapping[modelId] || modelId;

    return {
      contextWindow: 200000,
      shortName,
      longName,
    };
  }
}

/**
 * 模型组件工厂 | Model component factory
 * 负责创建ModelComponent实例，实现ComponentFactory接口 | Responsible for creating ModelComponent instances, implements ComponentFactory interface
 */
export class ModelComponentFactory implements ComponentFactory {
  /**
   * 创建模型组件实例 | Create model component instance
   */
  createComponent(name: string, config: ComponentConfig): ModelComponent {
    return new ModelComponent(name, config as ModelComponentConfig);
  }

  /**
   * 获取支持的组件类型 | Get supported component types
   */
  getSupportedTypes(): string[] {
    return ['model'];
  }
}
