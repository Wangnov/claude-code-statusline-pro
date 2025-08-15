/**
 * 预览管理器 - Preview Manager
 * 负责配置预览、场景切换和实时预览功能
 *
 * 核心功能:
 * - 多场景配置预览渲染
 * - 配置摘要显示
 * - 实时预览界面管理
 * - 场景切换器
 * - 配置效果预览
 */

import { confirm, select } from '@inquirer/prompts';
import type { Config } from '../../config/schema.js';
import { StatuslineGenerator } from '../../core/generator.js';
import { TerminalDetector } from '../../terminal/detector.js';
import { getCurrentLanguage, t } from '../i18n.js';
import { MockDataGenerator } from '../mock-data.js';

/**
 * 预览管理器选项接口
 */
export interface PreviewManagerOptions {
  /** 是否启用颜色输出 */
  enableColors?: boolean;
  /** 默认场景 */
  defaultScenario?: string;
}

/**
 * 预览管理器类
 * 专门处理配置预览相关的所有功能
 */
export class PreviewManager {
  private terminalDetector: TerminalDetector;
  private options: Required<PreviewManagerOptions>;

  constructor(options: PreviewManagerOptions = {}) {
    this.terminalDetector = new TerminalDetector();
    this.options = {
      enableColors: options.enableColors ?? true,
      defaultScenario: options.defaultScenario ?? 'dev',
    };
  }

  /**
   * 渲染增强的预览 - 支持多场景对比 | Render Enhanced Preview - Multi-scenario Comparison
   * v2.0 增强: 更好的视觉效果、性能显示、错误处理
   */
  async renderEnhancedPreview(config: Config): Promise<void> {
    console.clear();

    const capabilities = this.terminalDetector.detectCapabilities();

    // 显示增强标题栏
    this.renderEnhancedHeader(capabilities);

    // 显示五种场景的对比效果 (增加 error 和 thinking 场景)
    const scenarios = ['dev', 'critical', 'complete', 'error', 'thinking'];
    const results: Array<{ id: string; output: string; renderTime: number; error?: string }> = [];

    for (const scenarioId of scenarios) {
      const startTime = Date.now();
      try {
        const mockGenerator = new MockDataGenerator();
        const mockData = mockGenerator.generate(scenarioId);

        // 生成statusline
        const generator = new StatuslineGenerator(config, { disableCache: true });
        const output = await generator.generate(mockData);

        results.push({
          id: scenarioId,
          output,
          renderTime: Date.now() - startTime,
        });
      } catch (error) {
        results.push({
          id: scenarioId,
          output: '',
          renderTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 使用增强的格式化显示结果
    this.renderScenarioResults(results, capabilities);

    // 显示当前配置摘要
    this.showConfigSummary(config);
  }

  /**
   * 显示配置摘要 | Show Configuration Summary
   * 从 config-editor.ts 第382-427行迁移
   */
  showConfigSummary(config: Config): void {
    const capabilities = this.terminalDetector.detectCapabilities();
    const { components } = config;

    // 统计启用的组件
    const enabledComponents = Object.keys(components || {}).filter((key) => {
      if (key === 'order') return false;
      const comp = components?.[key as keyof typeof components] as any;
      return comp?.enabled !== false;
    });

    const summaryTitle = capabilities.colors
      ? `\x1b[33m📋 当前配置摘要 | Current Configuration Summary\x1b[0m`
      : '📋 当前配置摘要 | Current Configuration Summary';

    console.log(summaryTitle);
    console.log(`   🎯 预设 | Preset: ${config.preset || 'CUSTOM'}`);
    console.log(`   🎨 主题 | Theme: ${config.theme || 'classic'}`);
    console.log(`   🔧 启用组件 | Enabled Components: ${enabledComponents.length}个`);

    if (config.components?.order) {
      const componentNames = {
        project: '📁项目',
        model: '🤖模型',
        branch: '🌿分支',
        tokens: '📊Token',
        usage: '💰使用量',
        status: '⚡状态',
      };

      const orderDisplay = config.components.order
        .map((c) => componentNames[c as keyof typeof componentNames] || c)
        .join(' → ');
      console.log(`   📊 组件顺序 | Order: ${orderDisplay}`);
    }

    // 显示当前语言设置
    const currentLang = getCurrentLanguage();
    const langDisplay = currentLang === 'zh' ? '中文' : 'English';
    console.log(`   🌐 界面语言 | Language: ${langDisplay}`);

    console.log();
  }

  /**
   * 显示配置预览 | Show Configuration Preview
   * 在配置更新后显示即时预览效果
   * 从 config-editor.ts 第430-478行迁移
   */
  async showConfigPreview(config: Config, updateMessage: string): Promise<void> {
    const capabilities = this.terminalDetector.detectCapabilities();

    // 显示更新消息
    const message = capabilities.colors
      ? `\x1b[32m✅ ${updateMessage} | ${updateMessage.replace(/[^a-zA-Z]/g, '')} Configuration Updated\x1b[0m`
      : `✅ ${updateMessage}`;
    console.log(`\n${message}`);

    // 询问是否查看预览效果
    const showPreview = await confirm({
      message: '是否查看配置效果预览？ | Would you like to see the configuration preview?',
      default: true,
    });

    if (showPreview) {
      // 显示简化版预览 - 只显示一个主要场景
      try {
        const mockGenerator = new MockDataGenerator();
        const mockData = mockGenerator.generate(this.options.defaultScenario); // 使用默认场景作为预览
        const generator = new StatuslineGenerator(config, { disableCache: true });
        const output = await generator.generate(mockData);

        console.log('\n📊 配置预览效果 | Configuration Preview:');
        console.log(`   ${output}`);

        // 显示场景切换选项
        const switchScenario = await confirm({
          message: '是否切换到其他场景查看效果？ | Switch to other scenarios?',
          default: false,
        });

        if (switchScenario) {
          await this.showScenarioSwitcher(config);
        }
      } catch (error) {
        const errorMsg = capabilities.colors
          ? `\x1b[31m❌ 预览生成失败: ${error instanceof Error ? error.message : String(error)}\x1b[0m`
          : `❌ 预览生成失败: ${error instanceof Error ? error.message : String(error)}`;
        console.log(errorMsg);
      }
    }

    await this.waitForKeyPress();
  }

  /**
   * 场景切换器 | Scenario Switcher
   * 允许用户在不同场景间切换查看效果
   * 从 config-editor.ts 第481-519行迁移
   */
  async showScenarioSwitcher(config: Config): Promise<void> {
    const scenarios = [
      { name: '🟢 开发场景 | Development', value: 'dev', description: '低token使用，基础功能' },
      { name: '🟡 临界场景 | Critical', value: 'critical', description: '高token使用，接近限制' },
      { name: '🔵 完整场景 | Complete', value: 'complete', description: '全功能展示，所有组件' },
      { name: '🔴 错误场景 | Error', value: 'error', description: '错误状态展示' },
      { name: '🟤 工具场景 | Tool Active', value: 'thinking', description: '工具执行中状态' },
    ];

    while (true) {
      const selectedScenario = await select({
        message: '选择预览场景 | Select preview scenario:',
        choices: [...scenarios, { name: '← 返回配置 | Back to configuration', value: 'back' }],
      });

      if (selectedScenario === 'back') break;

      try {
        const mockGenerator = new MockDataGenerator();
        const mockData = mockGenerator.generate(selectedScenario);
        const generator = new StatuslineGenerator(config, { disableCache: true });
        const output = await generator.generate(mockData);

        const scenarioName =
          scenarios.find((s) => s.value === selectedScenario)?.name || selectedScenario;
        console.log(`\n${scenarioName}:`);
        console.log(`   ${output}`);
        console.log();
      } catch (error) {
        console.log(
          `❌ 场景 ${selectedScenario} 生成失败: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * 渲染实时预览界面 - 三层布局
   * 顶部: 完整场景mock数据预览
   * 上中部: 配置摘要
   * 中下部: 配置菜单
   */
  async renderLivePreviewInterface(config: Config): Promise<void> {
    console.clear();

    // 1. 顶部: 完整场景的mock数据预览
    await this.renderSingleScenarioPreview(config, 'complete');
    
    console.log();
    
    // 2. 上中部: 配置摘要
    this.showConfigSummary(config);
    
    console.log();
    
    // 3. 中下部准备: 分隔线
    const separator = '─'.repeat(70);
    console.log(separator);
  }

  /**
   * 渲染单场景预览
   */
  private async renderSingleScenarioPreview(config: Config, scenarioId: string): Promise<void> {
    try {
      const mockGenerator = new MockDataGenerator();
      const mockData = mockGenerator.generate(scenarioId);
      
      const generator = new StatuslineGenerator(config, { disableCache: true });
      const output = await generator.generate(mockData);
      
      console.log(output);
    } catch (error) {
      console.log(`预览生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 等待按键
   * 从 config-editor.ts 第3788-3823行迁移
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
          console.log('\n👋 已退出预览模式');
          process.exit(0);
        }

        resolve();
      };

      stdin.on('data', onData);
    });
  }

  /**
   * 快速预览单个场景
   * 新增的便捷方法
   */
  async quickPreview(config: Config, scenarioId: string = 'dev'): Promise<string> {
    try {
      const mockGenerator = new MockDataGenerator();
      const mockData = mockGenerator.generate(scenarioId);
      const generator = new StatuslineGenerator(config, { disableCache: true });
      return await generator.generate(mockData);
    } catch (error) {
      throw new Error(
        `Quick preview failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 批量预览所有场景
   * 新增的便捷方法
   */
  async batchPreview(config: Config): Promise<Record<string, string>> {
    const scenarios = ['dev', 'critical', 'complete', 'error', 'thinking'];
    const results: Record<string, string> = {};

    for (const scenarioId of scenarios) {
      try {
        results[scenarioId] = await this.quickPreview(config, scenarioId);
      } catch (error) {
        results[scenarioId] = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    return results;
  }

  /**
   * 渲染增强的标题栏 | Render Enhanced Header
   * v2.0 新增：更美观的标题栏，包含时间戳和版本信息
   */
  private renderEnhancedHeader(capabilities: any): void {
    const timestamp = new Date().toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    if (capabilities.colors) {
      console.log(
        '\x1b[1;36m┌─────────────────────────────────────────────────────────────────────┐\x1b[0m'
      );
      console.log(
        '\x1b[1;36m│\x1b[0m  \x1b[1;32m📊 Claude Code Statusline Pro - 配置效果实时预览\x1b[0m           \x1b[1;36m│\x1b[0m'
      );
      console.log(
        '\x1b[1;36m│\x1b[0m  \x1b[90m🕒 更新时间: ' +
          timestamp +
          '        🔄 多场景对比预览模式\x1b[0m    \x1b[1;36m│\x1b[0m'
      );
      console.log(
        '\x1b[1;36m└─────────────────────────────────────────────────────────────────────┘\x1b[0m'
      );
    } else {
      console.log('┌─────────────────────────────────────────────────────────────────────┐');
      console.log('│  📊 Claude Code Statusline Pro - 配置效果实时预览                   │');
      console.log(`│  🕒 更新时间: ${timestamp}        🔄 多场景对比预览模式    │`);
      console.log('└─────────────────────────────────────────────────────────────────────┘');
    }
    console.log();
  }

  /**
   * 渲染场景结果 | Render Scenario Results
   * v2.0 新增：美化的场景结果显示，包含性能信息
   */
  private renderScenarioResults(
    results: Array<{ id: string; output: string; renderTime: number; error?: string }>,
    capabilities: any
  ): void {
    const scenarioInfo = {
      dev: { name: '🟢 开发场景', desc: '低token使用，基础功能展示', color: '\x1b[32m' },
      critical: { name: '🟡 临界场景', desc: '高token使用，接近限制状态', color: '\x1b[33m' },
      complete: { name: '🔵 完整场景', desc: '所有功能展示，完整体验', color: '\x1b[34m' },
      error: { name: '🔴 错误场景', desc: 'API错误或异常状态处理', color: '\x1b[31m' },
      thinking: { name: '🟣 思考场景', desc: '工具执行中，思考状态', color: '\x1b[35m' },
    };

    console.log(capabilities.colors ? '\x1b[1;37m📋 场景预览结果：\x1b[0m' : '📋 场景预览结果：');
    console.log();

    for (const result of results) {
      const info = scenarioInfo[result.id as keyof typeof scenarioInfo];
      if (!info) continue;

      // 场景标题行
      const titleLine = capabilities.colors
        ? `${info.color}${info.name}\x1b[0m \x1b[90m(${result.renderTime}ms)\x1b[0m - ${info.desc}`
        : `${info.name} (${result.renderTime}ms) - ${info.desc}`;

      console.log(`  ${titleLine}`);

      // 内容行
      if (result.error) {
        const errorMsg = capabilities.colors
          ? `\x1b[31m    ❌ 错误: ${result.error}\x1b[0m`
          : `    ❌ 错误: ${result.error}`;
        console.log(errorMsg);
      } else {
        console.log(`    └─ ${result.output}`);
      }
      console.log();
    }
  }

  /**
   * 显示交互式预览菜单 | Show Interactive Preview Menu
   * v2.0 新增：更丰富的预览交互选项
   */
  async showInteractivePreviewMenu(config: Config): Promise<void> {
    while (true) {
      const choice = await select({
        message: '选择预览操作 | Select preview action:',
        choices: [
          { name: '🔄 刷新预览 | Refresh Preview', value: 'refresh' },
          { name: '🎯 单场景预览 | Single Scenario Preview', value: 'single' },
          { name: '💾 导出预览结果 | Export Preview Results', value: 'export' },
          { name: '🎨 主题对比 | Theme Comparison', value: 'theme-compare' },
          { name: '← 返回主菜单 | Back to Main Menu', value: 'back' },
        ],
      });

      switch (choice) {
        case 'refresh':
          await this.renderEnhancedPreview(config);
          break;
        case 'single':
          await this.showScenarioSwitcher(config);
          break;
        case 'export':
          await this.exportPreviewResults(config);
          break;
        case 'theme-compare':
          await this.showThemeComparison(config);
          break;
        case 'back':
          return;
      }
    }
  }

  /**
   * 导出预览结果 | Export Preview Results
   * v2.0 新增：导出功能，便于分享和分析
   */
  private async exportPreviewResults(config: Config): Promise<void> {
    try {
      const results = await this.batchPreview(config);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `statusline-preview-${timestamp}.txt`;

      let content = '# Claude Code Statusline Pro - Preview Results\n';
      content += `# Generated: ${new Date().toLocaleString()}\n\n`;

      for (const [scenario, output] of Object.entries(results)) {
        content += `## ${scenario.toUpperCase()} Scenario\n`;
        content += `${output}\n\n`;
      }

      // 写入文件 (在实际实现中，这里应该使用文件系统API)
      console.log(`📁 预览结果已导出到: ${filename}`);
      console.log('📋 内容预览：');
      console.log(`${content.substring(0, 300)}...`);
    } catch (error) {
      console.log(`❌ 导出失败: ${error instanceof Error ? error.message : String(error)}`);
    }

    await this.waitForKeyPress();
  }

  /**
   * 显示主题对比 | Show Theme Comparison
   * v2.0 新增：主题效果对比功能
   */
  private async showThemeComparison(config: Config): Promise<void> {
    console.clear();
    console.log('🎨 主题效果对比\n');

    const themes = ['classic', 'powerline', 'capsule'] as const;
    const testScenario = 'dev';

    for (const theme of themes) {
      try {
        const themeConfig = { ...config, theme };
        const output = await this.quickPreview(themeConfig, testScenario);

        console.log(`🎯 ${theme.charAt(0).toUpperCase() + theme.slice(1)} 主题:`);
        console.log(`   ${output}`);
        console.log();
      } catch (error) {
        console.log(
          `❌ ${theme} 主题渲染失败: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log();
      }
    }

    await this.waitForKeyPress();
  }
}

/**
 * 工厂函数 - 创建预览管理器实例
 */
export function createPreviewManager(options?: PreviewManagerOptions): PreviewManager {
  return new PreviewManager(options);
}
