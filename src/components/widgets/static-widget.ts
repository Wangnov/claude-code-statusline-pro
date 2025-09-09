/**
 * 静态小组件 | Static widget
 * 显示静态文本内容 | Displays static text content
 */

import type { WidgetConfig } from '../../config/schema.js';
import type { TerminalCapabilities } from '../../terminal/detector.js';
import { BaseWidget } from './base-widget.js';

/**
 * 静态小组件类 | Static widget class
 */
export class StaticWidget extends BaseWidget {
  constructor(config: WidgetConfig, capabilities: TerminalCapabilities) {
    super(config, capabilities);

    // 验证配置 | Validate configuration
    if (config.type !== 'static') {
      throw new Error(`静态小组件配置类型错误: ${config.type}`);
    }

    if (!config.content) {
      throw new Error('静态小组件必须提供content配置');
    }
  }

  /**
   * 渲染静态内容 | Render static content
   */
  protected async renderContent(_context?: any): Promise<string | null> {
    // 静态组件直接返回配置的内容 | Static widget directly returns configured content
    return this.config.content || null;
  }
}
