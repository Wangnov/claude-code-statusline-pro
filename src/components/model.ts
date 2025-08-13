import type {
  ComponentConfig,
  ExtendedRenderContext,
  ModelComponentConfig,
  RenderContext,
} from '../config/schema.js';
import { BaseComponent, type ComponentFactory } from './base.js';

/**
 * 默认模型配置 | Default model configurations
 * 预定义的模型配置信息，包含上下文窗口大小和缩写名称 | Predefined model configurations with context window sizes and short names
 */
const DEFAULT_MODEL_CONFIGS = {
  'claude-sonnet-4': { contextWindow: 200000, shortName: 'S4' },
  'claude-sonnet-3.7': { contextWindow: 200000, shortName: 'S3.7' },
  'claude-opus-4.1': { contextWindow: 200000, shortName: 'O4.1' },
  'claude-haiku-3.5': { contextWindow: 200000, shortName: 'H3.5' },
} as const;

/**
 * 模型信息接口 | Model info interface
 * 包含模型的上下文窗口大小和显示缩写 | Contains model context window size and display abbreviation
 */
interface ModelInfo {
  contextWindow: number;
  shortName: string;
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
    const displayName = this.modelConfig.show_full_name
      ? inputData.model?.display_name || inputData.model?.id || '?'
      : modelInfo.shortName;

    // 使用BaseComponent的formatOutput自动处理图标和颜色 | Use BaseComponent formatOutput to automatically handle icons and colors
    return this.formatOutput(displayName);
  }

  /**
   * 获取模型配置信息 | Get model configuration info
   * 支持预定义配置和自动解析，优先使用mapping配置的自定义名称 | Supports predefined configurations and auto-parsing, prioritizes custom names from mapping config
   */
  private getModelInfo(modelId: string): ModelInfo {
    if (!modelId) {
      return { contextWindow: 200000, shortName: '?' };
    }

    // 检查自定义名称映射（使用新的mapping字段）| Check custom name mapping (using new mapping field)
    const customMapping = this.modelConfig.mapping || {};

    // 查找预定义配置 | Find predefined configuration
    const modelKey = Object.keys(DEFAULT_MODEL_CONFIGS).find((key) =>
      modelId.toLowerCase().includes(key.toLowerCase())
    );

    if (modelKey) {
      const config = DEFAULT_MODEL_CONFIGS[modelKey as keyof typeof DEFAULT_MODEL_CONFIGS];
      const customName = customMapping[modelKey];
      return {
        contextWindow: config.contextWindow,
        shortName: customName || config.shortName,
      };
    }

    // 智能解析模型名称 | Smart model name parsing
    let shortName = 'Unknown';
    const lowerModelId = modelId.toLowerCase();

    if (lowerModelId.includes('sonnet')) {
      const match = modelId.match(/sonnet[\s-]*(\d+(?:\.\d+)?)/i);
      shortName = match ? `S${match[1]}` : 'S?';
    } else if (lowerModelId.includes('opus')) {
      const match = modelId.match(/opus[\s-]*(\d+(?:\.\d+)?)/i);
      shortName = match ? `O${match[1]}` : 'O?';
    } else if (lowerModelId.includes('haiku')) {
      const match = modelId.match(/haiku[\s-]*(\d+(?:\.\d+)?)/i);
      shortName = match ? `H${match[1]}` : 'H?';
    } else {
      // 提取字母数字字符作为简称 | Extract alphanumeric characters as short name
      shortName = modelId
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 4)
        .toUpperCase();
    }

    // 应用自定义映射（支持部分匹配）| Apply custom mapping (supports partial matching)
    for (const [key, customName] of Object.entries(customMapping)) {
      if (lowerModelId.includes(key.toLowerCase())) {
        shortName = customName;
        break;
      }
    }

    return { contextWindow: 200000, shortName };
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
