/**
 * 时钟组件 | Clock Component
 *
 * 一个简单的时钟组件示例，展示当前时间
 * A simple clock component example that displays current time
 *
 * @author Claude Code Statusline Pro
 * @version 1.0.0
 * @date 2025-09-04
 */

import {
  BaseComponent,
  type Component,
  type ComponentFactory,
} from '../../../src/components/base.js';
import type {
  ComponentConfig,
  ExtendedRenderContext,
  RenderContext,
} from '../../../src/config/schema.js';

// ==================== 配置接口定义 ====================

/**
 * 时钟组件配置接口 | Clock component configuration interface
 * 扩展基础组件配置，添加时钟特有的配置项
 */
export interface ClockComponentConfig extends ComponentConfig {
  /** 使用24小时制 | Use 24-hour format */
  format_24h?: boolean;
  /** 显示秒数 | Show seconds */
  show_seconds?: boolean;
  /** 显示日期 | Show date */
  show_date?: boolean;
  /** 日期格式 | Date format ('slash' | 'dash' | 'dot') */
  date_format?: 'slash' | 'dash' | 'dot';
  /** 时区偏移（小时） | Timezone offset (hours) */
  timezone_offset?: number;
  /** 自定义时间分隔符 | Custom time separator */
  time_separator?: string;
  /** 显示上午/下午标识 | Show AM/PM indicator */
  show_ampm?: boolean;
  /** 更新间隔（毫秒） | Update interval (milliseconds) */
  update_interval?: number;
}

// ==================== 组件实现 ====================

/**
 * 时钟组件类 | Clock component class
 * 继承自BaseComponent，实现时间显示功能
 */
export class ClockComponent extends BaseComponent {
  private clockConfig: ClockComponentConfig;
  private lastUpdate: number = 0;
  private cachedResult: string | null = null;

  constructor(name: string, config: ClockComponentConfig) {
    super(name, config);
    this.clockConfig = {
      // 默认配置
      format_24h: true,
      show_seconds: false,
      show_date: false,
      date_format: 'slash',
      timezone_offset: 0,
      time_separator: ':',
      show_ampm: false,
      update_interval: 1000,
      // 用户配置覆盖
      ...config,
    };
  }

  /**
   * 渲染组件内容 | Render component content
   * 核心方法，必须实现
   */
  protected renderContent(_context: RenderContext | ExtendedRenderContext): string | null {
    // 检查更新间隔，避免频繁更新
    const now = Date.now();
    if (this.cachedResult && now - this.lastUpdate < (this.clockConfig.update_interval || 1000)) {
      return this.cachedResult;
    }

    // 获取当前时间
    const currentTime = this.getCurrentTime();

    // 格式化时间字符串
    const timeString = this.formatTime(currentTime);
    const dateString = this.clockConfig.show_date ? this.formatDate(currentTime) : '';

    // 组合日期和时间
    const displayText = dateString ? `${dateString} ${timeString}` : timeString;

    // 使用BaseComponent的formatOutput方法
    // 自动处理图标选择和颜色应用
    const result = this.formatOutput(displayText);

    // 缓存结果
    this.cachedResult = result;
    this.lastUpdate = now;

    return result;
  }

  /**
   * 获取当前时间（考虑时区偏移）| Get current time with timezone offset
   */
  private getCurrentTime(): Date {
    const now = new Date();

    // 应用时区偏移
    if (this.clockConfig.timezone_offset) {
      const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
      const offsetTime = utcTime + this.clockConfig.timezone_offset * 3600000;
      return new Date(offsetTime);
    }

    return now;
  }

  /**
   * 格式化时间 | Format time
   */
  private formatTime(date: Date): string {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    const separator = this.clockConfig.time_separator || ':';
    let ampm = '';

    // 处理12/24小时制
    if (!this.clockConfig.format_24h) {
      ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
    }

    // 格式化时间部分
    const hourStr = hours.toString().padStart(2, '0');
    const minStr = minutes.toString().padStart(2, '0');
    const secStr = seconds.toString().padStart(2, '0');

    // 构建时间字符串
    let timeStr = `${hourStr}${separator}${minStr}`;

    if (this.clockConfig.show_seconds) {
      timeStr += `${separator}${secStr}`;
    }

    if (this.clockConfig.show_ampm && !this.clockConfig.format_24h) {
      timeStr += ` ${ampm}`;
    }

    return timeStr;
  }

  /**
   * 格式化日期 | Format date
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // 根据配置的格式返回日期
    switch (this.clockConfig.date_format) {
      case 'dash':
        return `${year}-${month}-${day}`;
      case 'dot':
        return `${year}.${month}.${day}`;
      default:
        return `${year}/${month}/${day}`;
    }
  }
}

// ==================== 工厂类实现 ====================

/**
 * 时钟组件工厂 | Clock component factory
 * 负责创建ClockComponent实例
 */
export class ClockComponentFactory implements ComponentFactory {
  /**
   * 创建组件实例 | Create component instance
   */
  createComponent(name: string, config: ComponentConfig): Component {
    return new ClockComponent(name, config as ClockComponentConfig);
  }

  /**
   * 获取支持的组件类型 | Get supported component types
   */
  getSupportedTypes(): string[] {
    return ['clock'];
  }
}

// ==================== 导出 ====================

// 默认导出工厂类，方便注册
export default ClockComponentFactory;

// 命名导出，提供灵活性
export { ClockComponent };
