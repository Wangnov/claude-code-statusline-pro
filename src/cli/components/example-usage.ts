/**
 * 实时预览选择器使用示例
 * 演示如何集成和使用RealTimePreviewSelector组件
 */

import type { Choice, PreviewCallback } from './realtime-preview-selector.js';
import {
  createLanguageSelector,
  createThemeSelector,
  realTimePreviewSelector,
} from './realtime-preview-selector.js';

/**
 * 主题预览示例
 */
export async function exampleThemeSelection(): Promise<void> {
  console.log('🎨 主题选择器示例\n');

  // 定义预览回调
  const themePreviewCallback: PreviewCallback = async (choice, index) => {
    // 模拟主题预览逻辑
    console.log(`\n📋 预览主题: ${choice.name}`);
    console.log(`   主题值: ${choice.value}`);
    console.log(`   索引: ${index}`);

    // 模拟异步预览操作
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 这里可以调用实际的主题预览逻辑
    // 例如: await previewEngine.updateTheme(choice.value);
  };

  // 创建主题选择器
  const themeSelector = createThemeSelector(themePreviewCallback);

  try {
    const selectedTheme = await themeSelector('选择你喜欢的主题：');
    console.log(`\n✅ 已选择主题: ${selectedTheme}`);
  } catch (error) {
    console.error('❌ 主题选择失败:', error);
  }
}

/**
 * 语言选择示例
 */
export async function exampleLanguageSelection(): Promise<void> {
  console.log('🌐 语言选择器示例\n');

  // 定义预览回调
  const languagePreviewCallback: PreviewCallback = async (choice, _index) => {
    console.log(`\n🔤 预览语言: ${choice.name}`);
    console.log(`   语言代码: ${choice.value}`);

    // 模拟语言切换预览
    const mockMessages = {
      'zh-CN': '这是中文界面预览',
      en: 'This is English interface preview',
      ja: 'これは日本語のインターフェースプレビューです',
    };

    const message = mockMessages[choice.value as keyof typeof mockMessages] || '未知语言';
    console.log(`   预览文本: ${message}`);
  };

  // 创建语言选择器
  const languageSelector = createLanguageSelector(languagePreviewCallback);

  try {
    const selectedLanguage = await languageSelector('选择界面语言：');
    console.log(`\n✅ 已选择语言: ${selectedLanguage}`);
  } catch (error) {
    console.error('❌ 语言选择失败:', error);
  }
}

/**
 * 自定义选择器示例
 */
export async function exampleCustomSelector(): Promise<void> {
  console.log('⚙️ 自定义选择器示例\n');

  // 定义自定义选项
  const customChoices: Choice[] = [
    {
      name: '开发模式',
      value: 'development',
      description: '启用详细日志和调试信息',
      category: '环境',
    },
    {
      name: '生产模式',
      value: 'production',
      description: '优化性能，最小化输出',
      category: '环境',
    },
    {
      name: '测试模式',
      value: 'testing',
      description: '启用测试钩子和模拟数据',
      category: '环境',
    },
    {
      name: '维护模式',
      value: 'maintenance',
      description: '系统维护，限制访问',
      category: '特殊',
      disabled: '当前不可用',
    },
  ];

  // 定义预览回调
  const customPreviewCallback: PreviewCallback = async (choice, _index) => {
    console.log(`\n🔍 预览模式: ${choice.name}`);
    console.log(`   模式值: ${choice.value}`);
    console.log(`   分类: ${choice.category || '未分类'}`);

    // 模拟环境配置预览
    const mockConfig = {
      development: { logging: 'verbose', debug: true, minify: false },
      production: { logging: 'error', debug: false, minify: true },
      testing: { logging: 'info', debug: true, mocking: true },
    };

    const config = mockConfig[choice.value as keyof typeof mockConfig];
    if (config) {
      console.log(`   配置预览: ${JSON.stringify(config, null, 2)}`);
    }
  };

  try {
    const selectedMode = await realTimePreviewSelector({
      message: '选择运行模式：',
      choices: customChoices,
      onPreview: customPreviewCallback,
      showDescription: true,
      showCategory: true,
      previewDelay: 75,
      pageSize: 5,
    });

    console.log(`\n✅ 已选择模式: ${selectedMode}`);
  } catch (error) {
    console.error('❌ 模式选择失败:', error);
  }
}

/**
 * 集成预览引擎示例
 */
export async function exampleWithPreviewEngine(): Promise<void> {
  console.log('🔗 集成预览引擎示例\n');

  // 模拟预览引擎
  const mockPreviewEngine = {
    async updateTheme(theme: string): Promise<void> {
      console.log(`🎨 预览引擎: 应用主题 ${theme}`);
      // 模拟主题应用延迟
      await new Promise((resolve) => setTimeout(resolve, 100));
    },

    async renderPreview(): Promise<string> {
      // 模拟状态行渲染
      const mockStatuslines = {
        classic: '→ main | ✓ clean | ◦ typescript | ⚡ ready',
        powerline: ' main  clean  typescript  ready ',
        capsule: '( main )( clean )( typescript )( ready )',
      };

      return mockStatuslines.classic; // 简化示例
    },
  };

  // 集成预览引擎的主题选择
  const integratedPreviewCallback: PreviewCallback = async (choice, _index) => {
    try {
      console.log(`\n🔄 正在预览主题: ${choice.name}`);

      // 调用预览引擎
      await mockPreviewEngine.updateTheme(choice.value);
      const preview = await mockPreviewEngine.renderPreview();

      console.log(`📟 状态行预览: ${preview}`);
      console.log(`⏱️  响应时间: ${Date.now() % 100}ms`);
    } catch (error) {
      console.error(`❌ 预览失败: ${error}`);
      throw error;
    }
  };

  const themeSelector = createThemeSelector(integratedPreviewCallback);

  try {
    const selectedTheme = await themeSelector('选择主题并实时预览：');
    console.log(`\n🎯 最终选择: ${selectedTheme}`);
    console.log('✅ 主题已应用并保存');
  } catch (error) {
    console.error('❌ 集成预览失败:', error);
  }
}

/**
 * 运行所有示例
 */
export async function runAllExamples(): Promise<void> {
  console.log('🚀 实时预览选择器示例演示\n');
  console.log('='.repeat(50));

  try {
    await exampleThemeSelection();
    console.log(`\n${'-'.repeat(50)}\n`);

    await exampleLanguageSelection();
    console.log(`\n${'-'.repeat(50)}\n`);

    await exampleCustomSelector();
    console.log(`\n${'-'.repeat(50)}\n`);

    await exampleWithPreviewEngine();
    console.log(`\n${'='.repeat(50)}`);

    console.log('🎉 所有示例运行完成！');
  } catch (error) {
    console.error('💥 示例运行失败:', error);
    process.exit(1);
  }
}

// 注意：示例代码不会自动运行
// 如需运行示例，请手动调用 runAllExamples() 函数
// 或者创建单独的测试文件来调用这些示例
