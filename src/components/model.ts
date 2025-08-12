import type { ComponentConfig, ModelComponentConfig, RenderContext } from '../config/schema.js';
import { BaseComponent, type ComponentFactory } from './base.js';

/**
 * 默认模型配置 | Default model configurations
 */
const DEFAULT_MODEL_CONFIGS = {
  'claude-sonnet-4': { contextWindow: 200000, shortName: 'S4' },
  'claude-sonnet-3.7': { contextWindow: 200000, shortName: 'S3.7' },
  'claude-opus-4.1': { contextWindow: 200000, shortName: 'O4.1' },
  'claude-haiku-3.5': { contextWindow: 200000, shortName: 'H3.5' },
} as const;

/**
 * 模型信息接口 | Model info interface
 */
interface ModelInfo {
  contextWindow: number;
  shortName: string;
}

/**
 * 模型组件 | Model component
 * 显示当前使用的模型信息 | Display current model information
 */
export class ModelComponent extends BaseComponent {
  private modelConfig: ModelComponentConfig;

  constructor(name: string, config: ModelComponentConfig) {
    super(name, config);
    this.modelConfig = config;
  }

  protected renderContent(context: RenderContext): string | null {
    const { inputData } = context;

    // 获取模型信息 | Get model info
    const modelId = inputData.model?.id || inputData.model?.display_name;
    if (!modelId) return null;

    const modelInfo = this.getModelInfo(modelId);

    // 确定显示名称 | Determine display name
    const displayName = this.modelConfig.show_full_name
      ? inputData.model?.display_name || inputData.model?.id || '?'
      : modelInfo.shortName;

    // 获取显示配置 | Get display configuration
    const icon = this.getIcon('model');
    const colorName = this.modelConfig.color || 'blue';

    return this.formatOutput(icon, displayName, colorName);
  }

  /**
   * 获取模型配置信息 | Get model configuration info
   */
  private getModelInfo(modelId: string): ModelInfo {
    if (!modelId) {
      return { contextWindow: 200000, shortName: '?' };
    }

    // 检查自定义名称映射 | Check custom name mapping
    const customNames = this.modelConfig.custom_names || {};

    // 查找预定义配置 | Find predefined configuration
    const modelKey = Object.keys(DEFAULT_MODEL_CONFIGS).find((key) =>
      modelId.toLowerCase().includes(key.toLowerCase())
    );

    if (modelKey) {
      const config = DEFAULT_MODEL_CONFIGS[modelKey as keyof typeof DEFAULT_MODEL_CONFIGS];
      const customName = customNames[modelKey];
      return {
        contextWindow: config.contextWindow,
        shortName: customName || config.shortName,
      };
    }

    // 回退逻辑 - 解析模型名称 | Fallback logic - parse model name
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

    // 检查是否有自定义名称 | Check for custom names
    for (const [key, customName] of Object.entries(customNames)) {
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
 */
export class ModelComponentFactory implements ComponentFactory {
  createComponent(name: string, config: ComponentConfig): ModelComponent {
    return new ModelComponent(name, config as ModelComponentConfig);
  }

  getSupportedTypes(): string[] {
    return ['model'];
  }
}
