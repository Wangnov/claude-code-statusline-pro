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

import { confirm, select } from '@inquirer/prompts';
import { ConfigLoader } from '../config/loader.js';
import type { Config } from '../config/schema.js';
// 编辑器模块导入 | Editor modules import
import { BranchEditor } from './editors/branch-editor.js';
import { ComponentEditor } from './editors/component-editor.js';
import { ModelEditor } from './editors/model-editor.js';
import { PresetEditor } from './editors/preset-editor.js';
import { StatusEditor } from './editors/status-editor.js';
import { StyleEditor } from './editors/style-editor.js';
import { ThemeEditor } from './editors/theme-editor.js';
import { TokensEditor } from './editors/tokens-editor.js';
import { UsageEditor } from './editors/usage-editor.js';
import { initializeI18n, t } from './i18n.js';
import { LivePreviewEngine } from './preview-engine.js';

// 工具管理器导入 | Tool managers import
import { PreviewManager } from './utils/preview-manager.js';
import { SuggestionManager } from './utils/suggestion-manager.js';
import { ValidationManager } from './utils/validation-manager.js';

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
 * 交互式配置编辑器类
 */
export class ConfigEditor {
  private configLoader: ConfigLoader;
  private previewEngine: LivePreviewEngine | null = null;
  private currentConfig!: Config;
  private options: Required<ConfigEditorOptions>;
  private hasUnsavedChanges = false;

  // 编辑器实例 | Editor instances
  private presetEditor!: PresetEditor;
  private componentEditor!: ComponentEditor;
  private themeEditor!: ThemeEditor;
  private styleEditor!: StyleEditor;
  // TODO: 这些编辑器已初始化但未使用，预留给未来功能
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Reserved for future use
  private branchEditor!: BranchEditor;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Reserved for future use
  private tokensEditor!: TokensEditor;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Reserved for future use
  private modelEditor!: ModelEditor;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Reserved for future use
  private statusEditor!: StatusEditor;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Reserved for future use
  private usageEditor!: UsageEditor;

  // 工具管理器实例 | Tool manager instances
  private previewManager!: PreviewManager;
  private validationManager!: ValidationManager;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Reserved for future use
  private suggestionManager!: SuggestionManager;

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
      // 初始化i18n和配置
      await initializeI18n();
      await this.loadConfiguration();

      // 初始化编辑器和管理器 | Initialize editors and managers
      this.initializeEditors();

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
   * 初始化编辑器实例 | Initialize editor instances
   */
  private initializeEditors(): void {
    const editorCallbacks = {
      onConfigUpdate: (config: Config, hasChanges: boolean) => {
        this.currentConfig = config;
        this.hasUnsavedChanges = hasChanges;
      },
      onConfigChange: (hasChanges: boolean) => {
        this.hasUnsavedChanges = hasChanges;
      },
      waitForKeyPress: () => this.waitForKeyPress(),
    };

    // 初始化编辑器 | Initialize editors - 根据实际构造函数签名
    this.branchEditor = new BranchEditor(
      this.currentConfig,
      this.hasUnsavedChanges,
      () => {
        this.hasUnsavedChanges = true;
      },
      () => this.waitForKeyPress()
    );

    this.tokensEditor = new TokensEditor(this.currentConfig);

    this.modelEditor = new ModelEditor(this.currentConfig, editorCallbacks.onConfigChange);

    this.statusEditor = new StatusEditor(this.currentConfig, editorCallbacks.onConfigChange);

    this.presetEditor = new PresetEditor(); // 根据PresetEditor的构造函数
    this.presetEditor.setCurrentConfig(this.currentConfig); // 设置配置

    this.componentEditor = new ComponentEditor(this.currentConfig);

    this.usageEditor = new UsageEditor(this.currentConfig);

    this.themeEditor = new ThemeEditor(
      this.configLoader,
      this.currentConfig,
      editorCallbacks.onConfigUpdate,
      editorCallbacks.waitForKeyPress
    );

    this.styleEditor = new StyleEditor(
      this.currentConfig,
      editorCallbacks.onConfigUpdate,
      editorCallbacks.waitForKeyPress
    );

    // 初始化工具管理器 | Initialize tool managers
    this.previewManager = new PreviewManager();
    this.validationManager = new ValidationManager({
      configPath: this.options.configPath,
    });
    this.suggestionManager = new SuggestionManager();
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
   * 渲染实时预览界面
   */
  private async renderLivePreviewInterface(): Promise<void> {
    await this.previewManager.renderLivePreviewInterface(this.currentConfig);
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
            await this.componentEditor.configureComponents();
            // 配置更新后自动刷新预览，无需确认
            break;
          case 'themes':
            await this.themeEditor.configureThemes();
            // 主题编辑器已集成实时预览，无需额外预览步骤
            break;
          case 'styles':
            await this.styleEditor.configureStyles();
            // 样式配置更新后自动刷新预览，无需确认
            break;
          case 'presets':
            await this.presetEditor.configurePresets();
            // 预设配置更新后自动刷新预览，无需确认
            break;
          case 'preview':
            await this.previewManager.showInteractivePreviewMenu(this.currentConfig);
            break;
          case 'language':
            await this.styleEditor.configureLanguage();
            // 语言编辑器已集成实时预览，无需额外预览步骤
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
    const unsavedIndicator = this.hasUnsavedChanges ? t('editor.menu.unsavedIndicator') : '';

    return await select({
      message: `${t('editor.menu.title')}${unsavedIndicator}`,
      choices: [
        {
          name: t('editor.menu.items.components.name'),
          value: 'components',
          description: t('editor.menu.items.components.description'),
        },
        {
          name: t('editor.menu.items.themes.name'),
          value: 'themes',
          description: t('editor.menu.items.themes.description'),
        },
        {
          name: t('editor.menu.items.styles.name'),
          value: 'styles',
          description: t('editor.menu.items.styles.description'),
        },
        {
          name: t('editor.menu.items.presets.name'),
          value: 'presets',
          description: t('editor.menu.items.presets.description'),
        },
        {
          name: t('editor.menu.items.preview.name'),
          value: 'preview',
          description: t('editor.menu.items.preview.description'),
        },
        {
          name: t('editor.menu.items.language.name'),
          value: 'language',
          description: t('editor.menu.items.language.description'),
        },
        {
          name: t('editor.menu.items.reset.name'),
          value: 'reset',
          description: t('editor.menu.items.reset.description'),
        },
        {
          name: t('editor.menu.items.save.name'),
          value: 'save',
          description: t('editor.menu.items.save.description'),
        },
        {
          name: t('editor.menu.items.exit.name'),
          value: 'exit',
          description: t('editor.menu.items.exit.description'),
        },
      ],
      pageSize: 10,
    });
  }

  /**
   * 显示配置更新后的预览 | Show preview after configuration update
   */
  private async showConfigurationUpdatePreview(updateMessage: string): Promise<void> {
    await this.previewManager.showConfigPreview(this.currentConfig, updateMessage);
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
      console.log('🔍 验证配置中...');

      // 执行配置验证
      const validationResult = this.validationManager.validateConfigCompleteness(
        this.currentConfig
      );
      const themeCompatibilityResult = this.validationManager.validateThemeCompatibility(
        this.currentConfig
      );
      const presetConsistencyResult = this.validationManager.checkPresetConsistency(
        this.currentConfig
      );

      // 合并验证结果
      const allErrors = [
        ...validationResult.errors,
        ...themeCompatibilityResult.errors,
        ...presetConsistencyResult.errors,
      ];

      const allWarnings = [
        ...validationResult.warnings,
        ...themeCompatibilityResult.warnings,
        ...presetConsistencyResult.warnings,
      ];

      const allSuggestions = [
        ...(validationResult.suggestions || []),
        ...(themeCompatibilityResult.suggestions || []),
        ...(presetConsistencyResult.suggestions || []),
      ];

      // 如果有致命错误，阻止保存
      if (allErrors.length > 0) {
        console.log('\n❌ 配置验证失败，发现以下错误:');
        allErrors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });

        const shouldContinue = await confirm({
          message: '配置存在错误，是否强制保存？（不推荐）',
          default: false,
        });

        if (!shouldContinue) {
          console.log('⚠️ 保存已取消，请修复配置错误后重试');
          await this.waitForKeyPress();
          return;
        }
      }

      // 显示警告（如果有）
      if (allWarnings.length > 0) {
        console.log('\n⚠️ 配置验证警告:');
        allWarnings.forEach((warning, index) => {
          console.log(`  ${index + 1}. ${warning}`);
        });
      }

      // 显示建议（如果有）
      if (allSuggestions.length > 0) {
        console.log('\n💡 配置建议:');
        allSuggestions.forEach((suggestion, index) => {
          console.log(`  ${index + 1}. ${suggestion}`);
        });
      }

      // 如果有警告或建议，询问是否继续
      if (allWarnings.length > 0 || allSuggestions.length > 0) {
        const shouldContinue = await confirm({
          message: '发现配置警告或建议，是否继续保存？',
          default: true,
        });

        if (!shouldContinue) {
          console.log('⚠️ 保存已取消');
          await this.waitForKeyPress();
          return;
        }
      }

      // 执行保存
      await this.configLoader.save(this.currentConfig, this.options.configPath);
      this.hasUnsavedChanges = false;

      console.log('\n✅ 配置保存成功');

      // 如果验证完全通过，显示成功消息
      if (allErrors.length === 0 && allWarnings.length === 0) {
        console.log('✨ 配置验证完全通过');
      }
    } catch (error) {
      console.error('❌ 配置保存失败:', error);
    }

    await this.waitForKeyPress();
  }

  /**
   * 处理退出
   */
  private async handleExit(): Promise<boolean> {
    // 清理所有编辑器资源
    await this.cleanupEditors();

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
   * 清理所有编辑器资源，防止内存泄漏
   */
  private async cleanupEditors(): Promise<void> {
    const editors = [
      this.branchEditor,
      this.tokensEditor,
      this.modelEditor,
      this.statusEditor,
      this.themeEditor,
      this.styleEditor,
      this.componentEditor,
      this.usageEditor,
    ];

    // 并行清理所有编辑器
    const cleanupPromises = editors
      .filter((editor) => editor)
      .map(async (editor) => {
        try {
          if ('cleanup' in editor && typeof editor.cleanup === 'function') {
            await editor.cleanup();
          }
        } catch (error) {
          console.error('编辑器清理错误:', error);
        }
      });

    await Promise.allSettled(cleanupPromises);
  }

  /**
   * 等待按键
   */
  private async waitForKeyPress(): Promise<void> {
    console.log('\n按任意键继续...');
    return new Promise<void>((resolve, reject) => {
      const stdin = process.stdin;
      let cleanup: (() => void) | null = null;

      // 超时处理，防止永久等待
      const timeout = setTimeout(() => {
        if (cleanup) cleanup();
        reject(new Error('等待按键超时'));
      }, 30000); // 30秒超时

      // 设置stdin为原始模式
      if (stdin.isTTY) {
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');
      }

      const onData = (key: string) => {
        if (cleanup) cleanup();

        // Ctrl+C 处理
        if (key === '\u0003') {
          console.log('\n👋 已退出配置编辑器');
          process.exit(0);
        }

        resolve();
      };

      // 定义清理函数
      cleanup = () => {
        clearTimeout(timeout);
        stdin.removeListener('data', onData);

        // 恢复stdin模式
        if (stdin.isTTY) {
          stdin.setRawMode(false);
          stdin.pause();
        }
        cleanup = null;
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
