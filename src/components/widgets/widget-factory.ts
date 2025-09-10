/**
 * 小组件工厂 | Widget factory
 * 根据配置创建相应类型的小组件 | Creates appropriate widget types based on configuration
 */

import type { WidgetConfig } from '../../config/schema.js';
import type { TerminalCapabilities } from '../../terminal/detector.js';
import { ApiWidget } from './api-widget.js';
import { BaseWidget } from './base-widget.js';
import { StaticWidget } from './static-widget.js';

/**
 * 创建小组件 | Create widget
 */
export function createWidget(config: WidgetConfig, capabilities: TerminalCapabilities): BaseWidget {
  switch (config.type) {
    case 'static':
      return new StaticWidget(config, capabilities);

    case 'api':
      return new ApiWidget(config, capabilities);

    default:
      throw new Error(`不支持的小组件类型: ${config.type}`);
  }
}

/**
 * 验证小组件配置 | Validate widget configuration
 */
export function validateWidgetConfig(config: WidgetConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 通用验证 | Common validation
  if (!config.type) {
    errors.push('缺少必需的type字段');
  }

  if (typeof config.row !== 'number' || config.row < 1) {
    errors.push('row字段必须是大于0的数字');
  }

  if (typeof config.col !== 'number' || config.col < 0) {
    errors.push('col字段必须是大于等于0的数字');
  }

  if (!config.nerd_icon && !config.emoji_icon && !config.text_icon) {
    errors.push('至少需要提供一种图标类型');
  }

  // 类型特定验证 | Type-specific validation
  switch (config.type) {
    case 'static':
      if (!config.content) {
        errors.push('静态小组件必须提供content字段');
      }
      break;

    case 'api':
      if (!config.api) {
        errors.push('API小组件必须提供api配置');
      } else {
        if (!config.api.base_url) {
          errors.push('API配置必须提供base_url');
        }
        if (!config.api.endpoint) {
          errors.push('API配置必须提供endpoint');
        }
        if (!config.api.data_path) {
          errors.push('API配置必须提供data_path');
        }
      }

      if (!config.template) {
        errors.push('API小组件必须提供template字段');
      }
      break;

    default:
      errors.push(`不支持的小组件类型: ${config.type}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 获取支持的小组件类型 | Get supported widget types
 */
export function getSupportedWidgetTypes(): string[] {
  return ['static', 'api'];
}

/**
 * 导出小组件类型 | Export widget types
 */
export { BaseWidget, StaticWidget, ApiWidget };
export type { WidgetConfig };
