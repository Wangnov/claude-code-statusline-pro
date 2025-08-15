/**
 * Claude Code Statusline Pro - 编辑器基础类 | Editor Base Class
 * 提供编辑器模块的共享接口和基础功能
 *
 * 特性 | Features:
 * - 统一的编辑器上下文管理
 * - 类型安全的配置更新接口
 * - 可复用的基础类实现
 * - 与配置加载器和i18n系统集成
 *
 * @author Claude Code Team
 * @version 2.0.0
 */

import type { ConfigLoader } from '../../config/loader.js';
import type { Config } from '../../config/schema.js';
import type { I18nManager } from '../i18n.js';

/**
 * 编辑器上下文接口 | Editor context interface
 * 提供编辑器运行所需的所有依赖和状态
 */
export interface EditorContext {
  /** 当前配置对象 | Current configuration object */
  currentConfig: Config;

  /** 配置加载器实例 | Configuration loader instance */
  configLoader: ConfigLoader;

  /** 国际化管理器 | Internationalization manager */
  i18n: I18nManager;

  /** 配置更新回调 | Configuration update callback */
  updateConfig: (config: Partial<Config>) => void;

  /** 是否处于调试模式 | Whether in debug mode */
  debug?: boolean;
}

/**
 * 编辑器基础抽象类 | Editor base abstract class
 * 为所有编辑器提供共享的功能和接口
 */
export abstract class BaseEditor {
  /**
   * 构造函数 | Constructor
   * @param context 编辑器上下文 | Editor context
   */
  constructor(protected context: EditorContext) {}

  /**
   * 获取当前配置 | Get current configuration
   */
  protected get currentConfig(): Config {
    return this.context.currentConfig;
  }

  /**
   * 获取配置加载器 | Get configuration loader
   */
  protected get configLoader(): ConfigLoader {
    return this.context.configLoader;
  }

  /**
   * 获取i18n管理器 | Get i18n manager
   */
  protected get i18n(): I18nManager {
    return this.context.i18n;
  }

  /**
   * 获取调试模式状态 | Get debug mode status
   */
  protected get debug(): boolean {
    return this.context.debug || false;
  }

  /**
   * 更新配置 | Update configuration
   * @param config 部分配置对象 | Partial configuration object
   */
  protected updateConfig(config: Partial<Config>): void {
    this.context.updateConfig(config);
  }

  /**
   * 记录调试信息 | Log debug information
   * @param message 调试消息 | Debug message
   * @param data 附加数据 | Additional data
   */
  protected log(message: string, data?: unknown): void {
    if (this.debug) {
      console.error(
        `[${this.constructor.name}] ${message}`,
        data ? JSON.stringify(data, null, 2) : ''
      );
    }
  }

  /**
   * 抽象方法：渲染编辑器界面 | Abstract method: render editor interface
   * 子类必须实现此方法来定义具体的编辑器行为
   */
  abstract render(): Promise<void>;

  /**
   * 抽象方法：处理用户输入 | Abstract method: handle user input
   * 子类可以重写此方法来处理特定的输入逻辑
   * @param input 用户输入 | User input
   * @returns 是否继续编辑 | Whether to continue editing
   */
  abstract handleInput?(input: string): Promise<boolean>;

  /**
   * 生命周期方法：编辑器初始化 | Lifecycle method: editor initialization
   * 子类可以重写此方法来执行初始化逻辑
   */
  async initialize(): Promise<void> {
    this.log('编辑器初始化 | Editor initializing');
  }

  /**
   * 生命周期方法：编辑器清理 | Lifecycle method: editor cleanup
   * 子类可以重写此方法来执行清理逻辑
   */
  async cleanup(): Promise<void> {
    this.log('编辑器清理 | Editor cleaning up');
  }
}
