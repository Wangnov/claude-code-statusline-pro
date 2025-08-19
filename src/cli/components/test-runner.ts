/**
 * 实时预览选择器测试运行器
 * 用于测试和验证组件功能
 */

import type { Choice, PreviewCallback } from './realtime-preview-selector.js';
import {
  createLanguageSelector,
  createThemeSelector,
  realTimePreviewSelector,
} from './realtime-preview-selector.js';

/**
 * 基础功能测试
 */
async function testBasicSelector(): Promise<void> {
  console.log('🧪 测试基础选择器功能');

  const choices: Choice[] = [
    { name: '选项1', value: 'option1', description: '这是第一个选项' },
    { name: '选项2', value: 'option2', description: '这是第二个选项' },
    { name: '选项3', value: 'option3', description: '这是第三个选项' },
  ];

  const mockPreview: PreviewCallback = async (choice, index) => {
    console.log(`📋 预览: ${choice.name} (索引: ${index})`);
  };

  try {
    const result = await realTimePreviewSelector({
      message: '请选择一个选项：',
      choices,
      onPreview: mockPreview,
      showDescription: true,
    });

    console.log(`✅ 测试通过，选择了: ${result}`);
  } catch (error) {
    console.error(`❌ 基础测试失败:`, error);
    throw error;
  }
}

/**
 * 主题选择器测试
 */
async function testThemeSelector(): Promise<void> {
  console.log('🎨 测试主题选择器');

  const mockThemePreview: PreviewCallback = async (choice, _index) => {
    console.log(`🎨 预览主题: ${choice.name}`);
    console.log(`   值: ${choice.value}`);
    console.log(`   描述: ${choice.description}`);

    // 模拟主题应用延迟
    await new Promise((resolve) => setTimeout(resolve, 50));
    console.log(`   ✓ 主题预览完成`);
  };

  try {
    const themeSelector = createThemeSelector(mockThemePreview);
    const result = await themeSelector('选择主题进行测试：');

    console.log(`✅ 主题选择器测试通过，选择了: ${result}`);
  } catch (error) {
    console.error(`❌ 主题选择器测试失败:`, error);
    throw error;
  }
}

/**
 * 语言选择器测试
 */
async function testLanguageSelector(): Promise<void> {
  console.log('🌐 测试语言选择器');

  const mockLanguagePreview: PreviewCallback = async (choice, _index) => {
    console.log(`🌐 预览语言: ${choice.name}`);
    console.log(`   代码: ${choice.value}`);

    const greetings: Record<string, string> = {
      'zh-CN': '你好',
      en: 'Hello',
      ja: 'こんにちは',
    };

    const greeting = greetings[choice.value] || 'Unknown';
    console.log(`   问候语: ${greeting}`);
  };

  try {
    const languageSelector = createLanguageSelector(mockLanguagePreview);
    const result = await languageSelector('选择语言进行测试：');

    console.log(`✅ 语言选择器测试通过，选择了: ${result}`);
  } catch (error) {
    console.error(`❌ 语言选择器测试失败:`, error);
    throw error;
  }
}

/**
 * 错误处理测试
 */
async function testErrorHandling(): Promise<void> {
  console.log('🚨 测试错误处理');

  const errorPreview: PreviewCallback = async (choice, _index) => {
    if (choice.value === 'error-option') {
      throw new Error('模拟预览错误');
    }
    console.log(`✓ 正常预览: ${choice.name}`);
  };

  const choices: Choice[] = [
    { name: '正常选项', value: 'normal', description: '这个选项工作正常' },
    { name: '错误选项', value: 'error-option', description: '这个选项会触发错误' },
    { name: '另一个正常选项', value: 'normal2', description: '这个选项也工作正常' },
  ];

  try {
    const result = await realTimePreviewSelector({
      message: '测试错误处理（尝试选择错误选项）：',
      choices,
      onPreview: errorPreview,
      showDescription: true,
    });

    console.log(`✅ 错误处理测试通过，最终选择了: ${result}`);
  } catch (error) {
    console.error(`❌ 错误处理测试失败:`, error);
    throw error;
  }
}

/**
 * 性能测试
 */
async function testPerformance(): Promise<void> {
  console.log('⚡ 测试性能');

  // 创建大量选项
  const choices: Choice[] = Array.from({ length: 50 }, (_, i) => ({
    name: `选项 ${i + 1}`,
    value: `option-${i + 1}`,
    description: `这是第 ${i + 1} 个选项的描述`,
    category: i % 3 === 0 ? '分类A' : i % 3 === 1 ? '分类B' : '分类C',
  }));

  let previewCount = 0;
  const startTime = Date.now();

  const performancePreview: PreviewCallback = async (choice, _index) => {
    previewCount++;
    const elapsedTime = Date.now() - startTime;
    console.log(`⚡ 预览 #${previewCount}: ${choice.name} (${elapsedTime}ms)`);

    // 模拟一些异步工作
    await new Promise((resolve) => setTimeout(resolve, 10));
  };

  try {
    const result = await realTimePreviewSelector({
      message: '性能测试（大量选项）：',
      choices,
      onPreview: performancePreview,
      showDescription: true,
      showCategory: true,
      pageSize: 10,
      previewDelay: 30,
    });

    const totalTime = Date.now() - startTime;
    console.log(`✅ 性能测试通过`);
    console.log(`   总时间: ${totalTime}ms`);
    console.log(`   预览次数: ${previewCount}`);
    console.log(`   平均响应时间: ${totalTime / previewCount}ms`);
    console.log(`   最终选择: ${result}`);
  } catch (error) {
    console.error(`❌ 性能测试失败:`, error);
    throw error;
  }
}

/**
 * 禁用选项测试
 */
async function testDisabledOptions(): Promise<void> {
  console.log('🚫 测试禁用选项');

  const choices: Choice[] = [
    { name: '可用选项1', value: 'available1', description: '这个选项可以选择' },
    { name: '禁用选项1', value: 'disabled1', description: '这个选项被禁用', disabled: true },
    {
      name: '禁用选项2',
      value: 'disabled2',
      description: '这个选项也被禁用',
      disabled: '功能未实现',
    },
    { name: '可用选项2', value: 'available2', description: '这个选项也可以选择' },
  ];

  const disabledPreview: PreviewCallback = async (choice, _index) => {
    console.log(`📋 预览可用选项: ${choice.name}`);
  };

  try {
    const result = await realTimePreviewSelector({
      message: '测试禁用选项（应该跳过禁用的选项）：',
      choices,
      onPreview: disabledPreview,
      showDescription: true,
    });

    console.log(`✅ 禁用选项测试通过，选择了: ${result}`);
  } catch (error) {
    console.error(`❌ 禁用选项测试失败:`, error);
    throw error;
  }
}

/**
 * 运行所有测试
 */
export async function runAllTests(): Promise<void> {
  console.log('🚀 开始运行实时预览选择器测试套件');
  console.log('='.repeat(60));

  const tests = [
    { name: '基础功能测试', fn: testBasicSelector },
    { name: '主题选择器测试', fn: testThemeSelector },
    { name: '语言选择器测试', fn: testLanguageSelector },
    { name: '错误处理测试', fn: testErrorHandling },
    { name: '性能测试', fn: testPerformance },
    { name: '禁用选项测试', fn: testDisabledOptions },
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const test of tests) {
    try {
      console.log(`\n🏃 运行: ${test.name}`);
      console.log('-'.repeat(40));

      await test.fn();
      passedTests++;

      console.log(`✅ ${test.name} 通过`);
    } catch (error) {
      failedTests++;
      console.error(`❌ ${test.name} 失败:`, error);
    }

    console.log('-'.repeat(40));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 测试结果统计:');
  console.log(`   ✅ 通过: ${passedTests}`);
  console.log(`   ❌ 失败: ${failedTests}`);
  console.log(`   📈 成功率: ${((passedTests / tests.length) * 100).toFixed(1)}%`);

  if (failedTests === 0) {
    console.log('\n🎉 所有测试都通过了！');
  } else {
    console.log(`\n⚠️ 有 ${failedTests} 个测试失败，请检查上面的错误信息。`);
    process.exit(1);
  }
}

// 如果直接运行此文件，执行所有测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch((error) => {
    console.error('💥 测试运行器失败:', error);
    process.exit(1);
  });
}
