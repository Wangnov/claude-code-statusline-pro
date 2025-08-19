/**
 * 实时预览选择器集成模块
 * 提供与现有编辑器系统的集成接口
 */

import type { ConfigLoader } from '../../config/loader.js';
import type { Config } from '../../config/schema.js';
import { LivePreviewEngine } from '../preview-engine.js';
import type { Choice, PreviewCallback } from './realtime-preview-selector.js';
import {
  createLanguageSelector,
  createThemeSelector,
  realTimePreviewSelector,
} from './realtime-preview-selector.js';

/**
 * 集成配置接口
 */
export interface IntegrationConfig {
  configLoader: ConfigLoader;
  currentConfig: Config;
  onConfigUpdate: (config: Config, hasChanges: boolean) => void;
  waitForKeyPress?: () => Promise<void>;
}

/**
 * 实时预览选择器集成类
 */
export class RealTimePreviewSelectorIntegration {
  private previewEngine?: LivePreviewEngine;

  constructor(private integration: IntegrationConfig) {}

  /**
   * 初始化预览引擎
   */
  async initializePreviewEngine(options?: { configPath?: string }): Promise<void> {
    try {
      const engineOptions: any = {
        refreshInterval: 100, // 快速响应
        maxScenarios: 3, // 减少场景数以提高性能
        debug: false,
        dynamicBanner: false, // 静态模式更适合选择器
      };

      if (options?.configPath) {
        engineOptions.configPath = options.configPath;
      }

      this.previewEngine = new LivePreviewEngine(engineOptions);

      await this.previewEngine.initialize();
    } catch (error) {
      console.error('预览引擎初始化失败:', error);
      // 不抛出错误，允许在没有预览的情况下继续
    }
  }

  /**
   * 创建集成了预览引擎的主题选择器
   */
  createIntegratedThemeSelector(): (message?: string) => Promise<string> {
    const previewCallback: PreviewCallback = async (choice, _index) => {
      if (!this.previewEngine) {
        // 如果没有预览引擎，显示简单的主题信息
        console.log(`\n🎨 主题: ${choice.name}`);
        console.log(`📝 描述: ${choice.description || '无描述'}`);
        return;
      }

      try {
        // 应用主题到配置
        await this.integration.configLoader.applyTheme(choice.value);
        const updatedConfig = await this.integration.configLoader.load();

        // 更新预览引擎配置
        await this.previewEngine.updateConfig(updatedConfig);

        // 触发预览渲染
        const scenarios = this.previewEngine.getAvailableScenarios().slice(0, 2);

        console.log(`\n🎨 预览主题: ${choice.name}`);
        console.log('📟 状态行预览:');

        for (const scenarioId of scenarios) {
          await this.previewEngine.renderStaticPreview([scenarioId]);
        }
      } catch (error) {
        console.error(`❌ 预览主题 ${choice.value} 失败:`, error);
      }
    };

    return createThemeSelector(previewCallback);
  }

  /**
   * 创建集成了语言预览的语言选择器
   */
  createIntegratedLanguageSelector(): (message?: string) => Promise<string> {
    const previewCallback: PreviewCallback = async (choice, _index) => {
      try {
        // 模拟语言切换预览
        const languageMessages: Record<string, Record<string, string>> = {
          'zh-CN': {
            title: '简体中文界面',
            status: '状态行',
            theme: '主题',
            config: '配置',
          },
          en: {
            title: 'English Interface',
            status: 'Status Line',
            theme: 'Theme',
            config: 'Configuration',
          },
          ja: {
            title: '日本語インターフェース',
            status: 'ステータスライン',
            theme: 'テーマ',
            config: '設定',
          },
        };

        const messages = languageMessages[choice.value] || languageMessages.en;

        console.log(`\n🌐 语言预览: ${choice.name}`);
        console.log(`📋 界面元素预览:`);
        console.log(`   ${messages?.title || 'Unknown'}`);
        console.log(`   ${messages?.status || 'Status'}: ✓ 已就绪`);
        console.log(`   ${messages?.theme || 'Theme'}: Classic`);
        console.log(`   ${messages?.config || 'Config'}: 已加载`);
      } catch (error) {
        console.error(`❌ 预览语言 ${choice.value} 失败:`, error);
      }
    };

    return createLanguageSelector(previewCallback);
  }

  /**
   * 创建组件配置选择器
   */
  createComponentSelector(): (message?: string) => Promise<string> {
    return async (message = '选择要配置的组件：') => {
      const choices: Choice[] = [
        {
          name: 'Project组件',
          value: 'project',
          description: '项目名称显示组件',
          category: '基础',
        },
        {
          name: 'Model组件',
          value: 'model',
          description: '模型信息显示组件',
          category: '基础',
        },
        {
          name: 'Branch组件',
          value: 'branch',
          description: 'Git分支信息组件',
          category: '版本控制',
        },
        {
          name: 'Tokens组件',
          value: 'tokens',
          description: 'Token使用量显示组件',
          category: '监控',
        },
        {
          name: 'Status组件',
          value: 'status',
          description: '系统状态指示器',
          category: '监控',
        },
        {
          name: 'Usage组件',
          value: 'usage',
          description: '使用率统计组件',
          category: '监控',
        },
      ];

      const previewCallback: PreviewCallback = async (choice, _index) => {
        try {
          console.log(`\n⚙️ 组件预览: ${choice.name}`);
          console.log(`📝 组件类型: ${choice.value}`);
          console.log(`📁 分类: ${choice.category}`);
          console.log(`📄 描述: ${choice.description}`);

          // 模拟组件配置预览
          const currentConfig = this.integration.currentConfig;
          const componentConfig =
            currentConfig.components && (currentConfig.components as any)[choice.value];

          if (componentConfig) {
            console.log(`⚙️ 当前配置:`);
            console.log(`   启用: ${componentConfig.enabled ? '是' : '否'}`);
            if (componentConfig.format) {
              console.log(`   格式: ${componentConfig.format}`);
            }
            if (componentConfig.style) {
              console.log(`   样式: ${JSON.stringify(componentConfig.style, null, 2)}`);
            }
          } else {
            console.log(`⚠️ 组件未配置`);
          }
        } catch (error) {
          console.error(`❌ 预览组件 ${choice.value} 失败:`, error);
        }
      };

      return realTimePreviewSelector({
        message,
        choices,
        onPreview: previewCallback,
        showDescription: true,
        showCategory: true,
        previewDelay: 80,
        pageSize: 6,
      });
    };
  }

  /**
   * 创建预设选择器
   */
  createPresetSelector(): (message?: string) => Promise<string> {
    return async (message = '选择组件预设：') => {
      const choices: Choice[] = [
        {
          name: 'PMBTS (完整)',
          value: 'PMBTS',
          description: 'Project + Model + Branch + Tokens + Status',
          category: '推荐',
        },
        {
          name: 'PMB (基础)',
          value: 'PMB',
          description: 'Project + Model + Branch',
          category: '简洁',
        },
        {
          name: 'PMBT (开发)',
          value: 'PMBT',
          description: 'Project + Model + Branch + Tokens',
          category: '开发',
        },
        {
          name: 'PM (最简)',
          value: 'PM',
          description: 'Project + Model',
          category: '极简',
        },
        {
          name: 'FULL (所有)',
          value: 'FULL',
          description: 'Project + Model + Branch + Tokens + Status + Usage',
          category: '完整',
        },
      ];

      const previewCallback: PreviewCallback = async (choice, _index) => {
        try {
          console.log(`\n📦 预设预览: ${choice.name}`);
          console.log(`🏷️ 预设值: ${choice.value}`);
          console.log(`📝 描述: ${choice.description}`);

          // 解析预设包含的组件
          const componentMap: Record<string, string> = {
            P: 'Project',
            M: 'Model',
            B: 'Branch',
            T: 'Tokens',
            S: 'Status',
            U: 'Usage',
          };

          if (choice.value === 'FULL') {
            console.log(`📋 包含组件: ${Object.values(componentMap).join(', ')}`);
          } else {
            const components = choice.value
              .split('')
              .map((char) => componentMap[char])
              .filter(Boolean);
            console.log(`📋 包含组件: ${components.join(', ')}`);
          }

          // 模拟预设效果预览
          if (this.previewEngine) {
            console.log(`🔍 正在生成预设预览...`);
            // 这里可以应用预设并生成预览
          }
        } catch (error) {
          console.error(`❌ 预览预设 ${choice.value} 失败:`, error);
        }
      };

      return realTimePreviewSelector({
        message,
        choices,
        onPreview: previewCallback,
        showDescription: true,
        showCategory: true,
        previewDelay: 100,
        pageSize: 5,
      });
    };
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    if (this.previewEngine) {
      this.previewEngine.stopLivePreview();
    }
  }
}

/**
 * 创建集成实例的工厂函数
 */
export function createIntegration(config: IntegrationConfig): RealTimePreviewSelectorIntegration {
  return new RealTimePreviewSelectorIntegration(config);
}

/**
 * 便捷的集成初始化函数
 */
export async function initializeIntegratedSelectors(
  configLoader: ConfigLoader,
  currentConfig: Config,
  onConfigUpdate: (config: Config, hasChanges: boolean) => void,
  options?: {
    enablePreviewEngine?: boolean;
    configPath?: string;
  }
): Promise<RealTimePreviewSelectorIntegration> {
  const integration = createIntegration({
    configLoader,
    currentConfig,
    onConfigUpdate,
  });

  if (options?.enablePreviewEngine !== false) {
    try {
      if (options?.configPath) {
        await integration.initializePreviewEngine({
          configPath: options.configPath,
        });
      } else {
        await integration.initializePreviewEngine();
      }
    } catch (error) {
      console.warn('预览引擎初始化失败，将使用简化预览模式:', error);
    }
  }

  return integration;
}
