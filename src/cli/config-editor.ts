/**
 * 交互式配置编辑器 - Interactive Configuration Editor
 * 核心功能: 全屏终端界面、实时预览集成、键盘导航
 *
 * 特性:
 * - Inquirer.js 驱动的交互式界面
 * - 实时预览配置变更效果
 * - 键盘导航和快捷键支持
 * - 配置项验证和错误提示
 * - 多层级配置管理 (组件/样式/主题)
 */

import { checkbox, confirm, input, select } from '@inquirer/prompts';
import { ConfigLoader } from '../config/loader.js';
import type { ComponentConfig, Config } from '../config/schema.js';
import { StatuslineGenerator } from '../core/generator.js';
import { TerminalDetector } from '../terminal/detector.js';
import { MockDataGenerator } from './mock-data.js';
import { LivePreviewEngine } from './preview-engine.js';

/**
 * 配置编辑器选项
 */
export interface ConfigEditorOptions {
  /** 配置文件路径 */
  configPath?: string;
  /** 是否启用实时预览 */
  enableLivePreview?: boolean;
  /** 是否自动保存 */
  autoSave?: boolean;
}

/**
 * 配置菜单项接口
 */
// interface ConfigMenuItem {
//   name: string;
//   value: string;
//   description?: string;
//   section?: string;
// }

/**
 * 交互式配置编辑器类
 */
export class ConfigEditor {
  private configLoader: ConfigLoader;
  private previewEngine: LivePreviewEngine | null = null;
  private terminalDetector: TerminalDetector;
  private currentConfig!: Config;
  private options: Required<ConfigEditorOptions>;
  private hasUnsavedChanges = false;

  constructor(options: ConfigEditorOptions = {}) {
    this.options = {
      configPath: options.configPath || '',
      enableLivePreview: options.enableLivePreview ?? true,
      autoSave: options.autoSave ?? false,
    };

    if (options.configPath) {
      this.options.configPath = options.configPath;
    }

    this.configLoader = new ConfigLoader();
    this.terminalDetector = new TerminalDetector();

    if (this.options.enableLivePreview) {
      this.previewEngine = new LivePreviewEngine({
        configPath: this.options.configPath,
        refreshInterval: 100, // 快速响应配置变更
      });
    }
  }

  /**
   * 启动交互式配置模式
   */
  async startInteractiveMode(): Promise<void> {
    try {
      // 初始化配置
      await this.loadConfiguration();

      // 检查终端兼容性
      this.checkTerminalCompatibility();

      // 初始化预览引擎
      if (this.previewEngine) {
        await this.previewEngine.initialize();
      }

      // 进入主配置循环（包含实时预览）
      await this.runConfigurationLoop();
    } catch (error) {
      console.error('Configuration editor error:', error);
      throw error;
    } finally {
      // 清理资源
      if (this.previewEngine) {
        this.previewEngine.stopLivePreview();
      }
    }
  }

  /**
   * 加载配置
   */
  private async loadConfiguration(): Promise<void> {
    try {
      this.currentConfig = await this.configLoader.load(this.options.configPath);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw error;
    }
  }

  /**
   * 检查终端兼容性
   */
  private checkTerminalCompatibility(): void {
    const capabilities = this.terminalDetector.detectCapabilities();

    if (!process.stdin.isTTY) {
      throw new Error('交互模式需要TTY终端');
    }

    console.log('🖥️  终端能力检测:');
    console.log(`   颜色支持: ${capabilities.colors ? '✅' : '❌'}`);
    console.log(`   表情符号: ${capabilities.emoji ? '✅' : '❌'}`);
    console.log(`   Nerd Font: ${capabilities.nerdFont ? '✅' : '❌'}`);
    console.log();
  }

  /**
   * 渲染实时预览界面
   */
  private async renderLivePreviewInterface(): Promise<void> {
    console.clear();

    // 显示标题
    const capabilities = this.terminalDetector.detectCapabilities();
    const title = capabilities.colors
      ? '\x1b[1;36mClaude Code Statusline Pro v2.0.0\x1b[0m'
      : 'Claude Code Statusline Pro v2.0.0';
    const subtitle = capabilities.colors
      ? '\x1b[36m🎛️  交互式配置编辑器 - Interactive Configuration Editor\x1b[0m'
      : '🎛️  交互式配置编辑器 - Interactive Configuration Editor';

    console.log(title);
    console.log(subtitle);

    // 显示实时预览区域
    console.log();
    const previewTitle = capabilities.colors
      ? '\x1b[32m✅ 实时预览 - Live Preview (配置变化时自动更新)\x1b[0m'
      : '✅ 实时预览 - Live Preview (配置变化时自动更新)';
    console.log(previewTitle);
    console.log();

    // 渲染预览场景
    const scenarios = ['dev', 'critical', 'error'];

    for (const scenarioId of scenarios) {
      try {
        const mockGenerator = new MockDataGenerator();
        const mockData = mockGenerator.generate(scenarioId);
        const scenario = mockGenerator.getScenario(scenarioId);

        // 生成statusline
        const generator = new StatuslineGenerator(this.currentConfig, { disableCache: true });
        const output = await generator.generate(mockData);

        // 显示场景信息和结果
        const scenarioName = scenario?.name || scenarioId;
        const _description = scenario?.description || '';

        // 紧凑的显示格式
        const scenarioLabel = capabilities.colors
          ? `\x1b[90m场景: ${scenarioName}\x1b[0m`
          : `场景: ${scenarioName}`;

        console.log(`${scenarioLabel}`);
        console.log(output);
        console.log();
      } catch (error) {
        const errorLabel = capabilities.colors
          ? `\x1b[31m场景: ${scenarioId} - 错误\x1b[0m`
          : `场景: ${scenarioId} - 错误`;

        console.log(errorLabel);
        console.log(`❌ 渲染失败: ${error instanceof Error ? error.message : String(error)}`);
        console.log();
      }
    }

    // 分隔线
    const separator = capabilities.colors ? `\x1b[90m${'─'.repeat(70)}\x1b[0m` : '─'.repeat(70);
    console.log(separator);
  }

  /**
   * 运行主配置循环
   */
  private async runConfigurationLoop(): Promise<void> {
    let continueEditing = true;

    while (continueEditing) {
      try {
        // 清屏并显示实时预览
        await this.renderLivePreviewInterface();

        const action = await this.showMainMenu();

        switch (action) {
          case 'components':
            await this.configureComponents();
            break;
          case 'themes':
            await this.configureThemes();
            break;
          case 'styles':
            await this.configureStyles();
            break;
          case 'presets':
            await this.configurePresets();
            break;
          case 'reset':
            await this.resetConfiguration();
            break;
          case 'save':
            await this.saveConfiguration();
            break;
          case 'exit':
            continueEditing = await this.handleExit();
            break;
          default:
            console.log('Unknown action:', action);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'ExitPromptError') {
          continueEditing = await this.handleExit();
        } else {
          console.error('Configuration error:', error);
          await this.waitForKeyPress();
        }
      }
    }
  }

  /**
   * 显示主菜单
   */
  private async showMainMenu(): Promise<string> {
    const unsavedIndicator = this.hasUnsavedChanges ? ' (*)' : '';

    return await select({
      message: `配置菜单${unsavedIndicator}`,
      choices: [
        {
          name: '🧩 组件配置 - 配置显示组件',
          value: 'components',
          description: '启用/禁用和配置各个状态行组件',
        },
        {
          name: '🎨 主题管理 - 主题管理',
          value: 'themes',
          description: '选择和自定义视觉主题',
        },
        {
          name: '💄 样式设置 - 样式设置',
          value: 'styles',
          description: '配置颜色、图标和视觉元素',
        },
        {
          name: '📋 组件预设 - 组件预设',
          value: 'presets',
          description: '管理组件顺序和预设配置',
        },
        {
          name: '🔄 重置配置 - 重置为默认',
          value: 'reset',
          description: '将配置重置为出厂默认值',
        },
        {
          name: '💾 保存配置 - 保存配置',
          value: 'save',
          description: '保存当前配置到文件',
        },
        {
          name: '🚪 退出编辑器 - 退出编辑器',
          value: 'exit',
          description: '退出配置编辑器',
        },
      ],
      pageSize: 10,
    });
  }

  /**
   * 配置组件
   */
  private async configureComponents(): Promise<void> {
    const componentName = await select({
      message: '选择要配置的组件：',
      choices: [
        { name: '📁 项目名称 - 项目名称显示', value: 'project' },
        { name: '🤖 AI模型 - AI模型信息', value: 'model' },
        { name: '🌿 Git分支 - Git分支显示', value: 'branch' },
        { name: '📊 Token使用 - Token使用率和进度', value: 'tokens' },
        { name: '⚡ 会话状态 - 会话状态指示器', value: 'status' },
        { name: '← 返回主菜单', value: 'back' },
      ],
    });

    if (componentName === 'back') return;

    await this.configureIndividualComponent(componentName);
  }

  /**
   * 配置单个组件
   */
  private async configureIndividualComponent(componentName: string): Promise<void> {
    const component = this.currentConfig.components?.[
      componentName as keyof typeof this.currentConfig.components
    ] as ComponentConfig;

    if (!component) {
      console.log(`组件 ${componentName} 未找到`);
      return;
    }

    console.log(`\\n🔧 配置 ${componentName} 组件:`);

    // 启用/禁用组件
    const enabled = await confirm({
      message: `启用 ${componentName} 组件？`,
      default: component.enabled,
    });

    // 配置图标
    let icon = component.emoji_icon;
    if (enabled) {
      icon = await input({
        message: `${componentName} 组件图标：`,
        default: component.emoji_icon,
      });
    }

    // 配置颜色
    let color = component.icon_color;
    if (enabled) {
      color = await select({
        message: `${componentName} 组件颜色：`,
        choices: [
          { name: '青色 (默认)', value: 'cyan' },
          { name: '绿色', value: 'green' },
          { name: '黄色', value: 'yellow' },
          { name: '蓝色', value: 'blue' },
          { name: '紫红色', value: 'magenta' },
          { name: '红色', value: 'red' },
          { name: '白色', value: 'white' },
          { name: '灰色', value: 'gray' },
        ],
        default: component.icon_color || 'cyan',
      });
    }

    // 更新配置
    const updatedComponent = {
      ...component,
      enabled,
      icon,
      color,
    };

    this.currentConfig.components = {
      order: this.currentConfig.components?.order || [
        'project',
        'model',
        'branch',
        'tokens',
        'status',
      ],
      ...this.currentConfig.components,
      [componentName]: updatedComponent,
    };

    this.hasUnsavedChanges = true;

    console.log(`✅ ${componentName} 组件配置已更新！`);
    await this.waitForKeyPress();
  }

  /**
   * 配置主题
   */
  private async configureThemes(): Promise<void> {
    const theme = await select({
      message: '选择主题：',
      choices: [
        { name: '简洁主题 - 清爽简单', value: 'minimal' },
        { name: '详细主题 - 详细信息', value: 'verbose' },
        { name: '开发者主题 - 便于调试', value: 'developer' },
        { name: '自定义主题 - 当前配置', value: 'custom' },
        { name: '← 返回主菜单', value: 'back' },
      ],
    });

    if (theme === 'back') return;

    if (theme !== 'custom') {
      await this.configLoader.applyTheme(theme);
      this.currentConfig = await this.configLoader.load();
      this.hasUnsavedChanges = true;
    }

    console.log(`✅ 已应用主题: ${theme}`);
    await this.waitForKeyPress();
  }

  /**
   * 配置样式
   */
  private async configureStyles(): Promise<void> {
    const style = this.currentConfig.style;

    const enableColors = await confirm({
      message: '启用颜色？',
      default: style?.enable_colors === true,
    });

    const enableEmoji = await confirm({
      message: '强制启用表情符号？',
      default: this.currentConfig.terminal?.force_emoji === true,
    });

    const enableNerdFont = await confirm({
      message: '强制启用 Nerd Font 图标？',
      default: this.currentConfig.terminal?.force_nerd_font === true,
    });

    const separator = await input({
      message: '组件分隔符：',
      default: style?.separator || ' | ',
    });

    // 更新配置
    this.currentConfig.style = {
      separator,
      enable_colors: enableColors,
      enable_emoji: style?.enable_emoji || 'auto',
      enable_nerd_font: style?.enable_nerd_font || 'auto',
      separator_color: 'white',
      separator_before: ' ',
      separator_after: ' ',
      compact_mode: style?.compact_mode || false,
      max_width: style?.max_width || 0,
    };

    // 更新terminal配置
    if (!this.currentConfig.terminal) {
      this.currentConfig.terminal = {
        force_nerd_font: false,
        force_emoji: false,
        force_text: false,
      };
    }
    this.currentConfig.terminal = {
      ...this.currentConfig.terminal,
      force_emoji: enableEmoji,
      force_nerd_font: enableNerdFont,
      force_text: false, // 保持默认值
    };

    this.hasUnsavedChanges = true;

    console.log('✅ 样式设置已更新！');
    await this.waitForKeyPress();
  }

  /**
   * 配置预设
   */
  private async configurePresets(): Promise<void> {
    const preset = await select({
      message: '选择组件预设：',
      choices: [
        { name: 'PMBTS - 项目、模型、分支、Token、状态', value: 'PMBTS' },
        { name: 'PMB - 仅项目、模型、分支', value: 'PMB' },
        { name: 'PMBT - 项目、模型、分支、Token', value: 'PMBT' },
        { name: 'MBT - 模型、分支、Token', value: 'MBT' },
        { name: '自定义 - 手动配置', value: 'custom' },
        { name: '← 返回主菜单', value: 'back' },
      ],
    });

    if (preset === 'back') return;

    if (preset === 'custom') {
      // 自定义组件选择
      const selectedComponents = await checkbox({
        message: '选择要显示的组件：',
        choices: [
          { name: '项目名称', value: 'project' },
          { name: 'AI模型', value: 'model' },
          { name: 'Git分支', value: 'branch' },
          { name: 'Token使用', value: 'tokens' },
          { name: '会话状态', value: 'status' },
        ],
      });

      if (this.currentConfig.components) {
        this.currentConfig.components.order = selectedComponents;
      } else {
        this.currentConfig.components = { order: selectedComponents };
      }
    } else {
      this.currentConfig.preset = preset;
    }

    this.hasUnsavedChanges = true;

    console.log(`✅ 已应用预设: ${preset}`);
    await this.waitForKeyPress();
  }

  /**
   * 重置配置
   */
  private async resetConfiguration(): Promise<void> {
    const confirmReset = await confirm({
      message: '确定要将所有配置重置为默认值吗？此操作无法撤销。',
      default: false,
    });

    if (confirmReset) {
      await this.configLoader.resetToDefaults(this.options.configPath);
      this.currentConfig = await this.configLoader.load();
      this.hasUnsavedChanges = false;

      console.log('✅ 配置已重置为默认值');
    } else {
      console.log('重置已取消');
    }

    await this.waitForKeyPress();
  }

  /**
   * 保存配置
   */
  private async saveConfiguration(): Promise<void> {
    try {
      await this.configLoader.save(this.currentConfig, this.options.configPath);
      this.hasUnsavedChanges = false;
      console.log('✅ 配置保存成功');
    } catch (error) {
      console.error('配置保存失败:', error);
    }

    await this.waitForKeyPress();
  }

  /**
   * 处理退出
   */
  private async handleExit(): Promise<boolean> {
    if (this.hasUnsavedChanges) {
      const action = await select({
        message: '您有未保存的更改。您希望如何处理？',
        choices: [
          { name: '保存并退出', value: 'save' },
          { name: '不保存直接退出', value: 'discard' },
          { name: '取消（继续编辑）', value: 'cancel' },
        ],
      });

      switch (action) {
        case 'save':
          await this.saveConfiguration();
          return false; // Exit
        case 'discard':
          return false; // Exit without saving
        case 'cancel':
          return true; // Continue editing
      }
    }

    return false; // Exit
  }

  /**
   * 等待按键
   */
  private async waitForKeyPress(): Promise<void> {
    console.log('\n按任意键继续...');
    return new Promise<void>((resolve) => {
      const stdin = process.stdin;

      // 设置stdin为原始模式
      if (stdin.isTTY) {
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');
      }

      const onData = (key: string) => {
        // 清理监听器
        stdin.removeListener('data', onData);

        // 恢复stdin模式
        if (stdin.isTTY) {
          stdin.setRawMode(false);
          stdin.pause();
        }

        // Ctrl+C 处理
        if (key === '\u0003') {
          console.log('\n👋 已退出配置编辑器');
          process.exit(0);
        }

        resolve();
      };

      stdin.on('data', onData);
    });
  }
}

/**
 * 工厂函数 - 创建配置编辑器实例
 */
export function createConfigEditor(options?: ConfigEditorOptions): ConfigEditor {
  return new ConfigEditor(options);
}
