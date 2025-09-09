/**
 * 多行渲染器 | Multi-line renderer
 * 协调单行preset系统和多行小组件系统 | Coordinates single-line preset system and multi-line widget system
 * 
 * 核心职责：
 * 1. 保持row0的preset系统不变
 * 2. 渲染row1+的小组件系统
 * 3. 组装最终的多行输出
 */

import { GridSystem } from './grid-system.js';
import { ComponentConfigLoader } from '../config/component-config-loader.js';
import { WidgetFactory } from '../components/widgets/widget-factory.js';
import type { Config, RenderContext, MultilineConfig, ComponentMultilineConfig } from '../config/schema.js';

/**
 * 多行渲染结果 | Multi-line render result
 */
export interface MultiLineRenderResult {
  /** 是否成功 | Whether successful */
  success: boolean;
  /** 渲染后的行数组 | Rendered lines array */
  lines: string[];
  /** 错误信息 | Error message */
  error?: string;
  /** 统计信息 | Statistics */
  stats?: {
    totalWidgets: number;
    renderedWidgets: number;
    failedWidgets: number;
  };
}

/**
 * 多行渲染器类 | Multi-line renderer class
 */
export class MultiLineRenderer {
  private config: Config;
  private multilineConfig: MultilineConfig;
  private gridSystem: GridSystem;
  private configBaseDir?: string;
  
  constructor(config: Config, configBaseDir?: string) {
    this.config = config;
    this.multilineConfig = config.multiline || { enabled: false, max_rows: 5, rows: {} };
    this.gridSystem = new GridSystem(this.multilineConfig);
    this.configBaseDir = configBaseDir;
  }
  
  /**
   * 渲染多行内容 | Render multi-line content
   */
  async renderExtensionLines(context: RenderContext): Promise<MultiLineRenderResult> {
    // 检查是否启用多行 | Check if multiline is enabled
    if (!this.multilineConfig.enabled) {
      return {
        success: true,
        lines: [],
      };
    }
    
    try {
      // 获取启用的组件列表 | Get enabled components list
      const enabledComponents = this.config.components?.order?.filter(componentName => {
        const componentConfig = (this.config.components as any)?.[componentName];
        return componentConfig?.enabled !== false; // 默认启用，除非明确设置为false
      }) || [];
      
      // 只加载启用的组件配置 | Load only enabled component configs
      const componentConfigs = await ComponentConfigLoader.loadAllComponentConfigs(
        this.configBaseDir,
        enabledComponents
      );
      
      // 统计信息 | Statistics
      let totalWidgets = 0;
      let renderedWidgets = 0;
      let failedWidgets = 0;
      
      // 清空网格 | Clear grid
      this.gridSystem.clear();
      
      // 渲染所有小组件到网格 | Render all widgets to grid
      for (const [componentName, componentConfig] of componentConfigs) {
        const widgetResults = await this.renderComponentWidgets(
          componentName,
          componentConfig,
          context
        );
        
        totalWidgets += widgetResults.total;
        renderedWidgets += widgetResults.rendered;
        failedWidgets += widgetResults.failed;
      }
      
      // 渲染网格为字符串 | Render grid to strings
      const gridResult = this.gridSystem.render();
      
      if (!gridResult.success) {
        return {
          success: false,
          lines: [],
          error: gridResult.error,
        };
      }
      
      return {
        success: true,
        lines: gridResult.lines,
        stats: {
          totalWidgets,
          renderedWidgets,
          failedWidgets,
        },
      };
    } catch (error) {
      return {
        success: false,
        lines: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * 渲染组件的小组件 | Render component widgets
   */
  private async renderComponentWidgets(
    componentName: string,
    componentConfig: ComponentMultilineConfig,
    context: RenderContext
  ): Promise<{ total: number; rendered: number; failed: number }> {
    let total = 0;
    let rendered = 0;
    let failed = 0;
    
    for (const [widgetName, widgetConfig] of Object.entries(componentConfig.widgets)) {
      total++;
      
      try {
        // 创建小组件 | Create widget
        const widget = WidgetFactory.createWidget(widgetConfig, context.capabilities);
        
        // 渲染小组件 | Render widget
        const result = await widget.render(context);
        
        if (result.success && result.content) {
          // 添加到网格 | Add to grid
          this.gridSystem.setCell(widgetConfig.row, widgetConfig.col, result.content);
          rendered++;
        } else if (result.error) {
          console.warn(`小组件渲染失败: ${componentName}.${widgetName} - ${result.error}`);
          failed++;
        }
      } catch (error) {
        console.error(`小组件创建失败: ${componentName}.${widgetName}`, error);
        failed++;
      }
    }
    
    return { total, rendered, failed };
  }
  
  /**
   * 更新配置 | Update configuration
   */
  updateConfig(config: Config): void {
    this.config = config;
    this.multilineConfig = config.multiline || { enabled: false, max_rows: 5, rows: {} };
    this.gridSystem = new GridSystem(this.multilineConfig);
  }
  
  /**
   * 获取网格统计信息 | Get grid statistics
   */
  getGridStats() {
    return this.gridSystem.getStats();
  }
  
  /**
   * 检查多行是否启用 | Check if multiline is enabled
   */
  isEnabled(): boolean {
    return this.multilineConfig.enabled;
  }
}

/**
 * 创建多行渲染器 | Create multi-line renderer
 */
export function createMultiLineRenderer(config: Config): MultiLineRenderer {
  return new MultiLineRenderer(config);
}