/**
 * 主题编辑器 - Theme Editor
 * 专门处理主题相关的配置功能
 *
 * 特性:
 * - 主题选择和应用
 * - 主题兼容性检查
 * - 主题预览和切换
 * - 实时预览功能集成
 */

import type { ConfigLoader } from '../../config/loader.js';
import type { Config } from '../../config/schema.js';
import type { Choice, PreviewCallback } from '../components/index.js';
import { realTimePreviewSelector } from '../components/index.js';
import { PreviewManager } from '../utils/preview-manager.js';

/**
 * 主题编辑器类
 */
export class ThemeEditor {
  private previewManager: PreviewManager;

  constructor(
    private configLoader: ConfigLoader,
    private currentConfig: Config,
    private onConfigUpdate: (config: Config, hasChanges: boolean) => void,
    _waitForKeyPress: () => Promise<void>
  ) {
    this.previewManager = new PreviewManager();
  }

  /**
   * 配置主题 | Configure Themes
   * 主题选择和应用功能 - 集成实时预览
   */
  async configureThemes(): Promise<void> {
    // 定义主题选择项
    const choices: Choice[] = [
      {
        name: 'Classic主题 - 传统分隔符连接，最大兼容性',
        value: 'classic',
        description: '传统分隔符连接，最大兼容性',
        category: '经典',
      },
      {
        name: 'Powerline主题 - 箭头无缝连接，需要Nerd Font',
        value: 'powerline',
        description: '箭头无缝连接，需要Nerd Font',
        category: '现代',
      },
      {
        name: 'Capsule主题 - 胶囊形状包装，现代化UI，需要Nerd Font',
        value: 'capsule',
        description: '胶囊形状包装，现代化UI，需要Nerd Font',
        category: '现代',
      },
      {
        name: '自定义主题 - 当前配置',
        value: 'custom',
        description: '保持当前自定义配置',
        category: '其他',
      },
      {
        name: '← 返回主菜单',
        value: 'back',
        description: '返回到主配置菜单',
        category: '导航',
      },
    ];

    // 创建预览回调函数
    const onPreview: PreviewCallback = async (choice: Choice, _index: number) => {
      if (choice.value === 'back' || choice.value === 'custom') {
        // 返回和自定义选项无需预览，显示当前配置
        await this.previewManager.updateLivePreview(this.currentConfig);
        return;
      }

      try {
        // 创建临时配置进行预览
        const _tempConfig = { ...this.currentConfig, theme: choice.value };

        // 调用configLoader的applyTheme以确保完整的主题应用逻辑
        // 但是不直接修改当前配置，仅用于预览
        await this.configLoader.applyTheme(choice.value);
        const previewConfig = await this.configLoader.load();

        // 更新实时预览
        await this.previewManager.updateLivePreview(previewConfig);

        // 恢复原始配置，避免预览影响当前状态
        await this.restoreCurrentConfig();
      } catch (error) {
        console.log(
          `预览主题 ${choice.value} 时出错: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };

    // 使用实时预览选择器
    const selectedTheme = await realTimePreviewSelector({
      message: '选择主题（使用上下键预览效果）：',
      choices,
      onPreview,
      previewDelay: 100,
      showDescription: true,
      showCategory: true,
      pageSize: 6,
    });

    // 处理选择结果
    if (selectedTheme === 'back') return;

    if (selectedTheme !== 'custom') {
      // 应用选择的主题
      await this.configLoader.applyTheme(selectedTheme);
      this.currentConfig = await this.configLoader.load();
      this.onConfigUpdate(this.currentConfig, true);

      // 显示应用成功消息，无需等待按键
      console.log(`✅ 已应用主题: ${selectedTheme}`);
    }
  }

  /**
   * 恢复当前配置 | Restore Current Configuration
   * 用于预览后恢复原始配置状态
   */
  private async restoreCurrentConfig(): Promise<void> {
    try {
      // 使用当前配置重新加载，确保预览不会影响原始状态
      if (this.currentConfig.theme) {
        await this.configLoader.applyTheme(this.currentConfig.theme);
      }
    } catch (error) {
      // 静默处理恢复配置的错误，避免影响用户体验
      console.debug(`恢复配置时出错: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
