/**
 * Claude Code Statusline Pro - CLI 主入口
 * Enhanced CLI with live preview, interactive configuration, and real-time feedback
 *
 * 架构设计:
 * - Commander.js 主框架，支持子命令和内联参数
 * - 实时预览引擎，多场景Mock数据展示
 * - 交互式配置界面，Inquirer.js全屏体验
 * - 三层用户体验: settings.json内联参数 > CLI交互配置 > 手动TOML编辑
 */

import { confirm, select } from '@inquirer/prompts';
import { Command } from 'commander';
import { ConfigLoader } from '../config/loader.js';
import type { InputData } from '../config/schema.js';
import { StatuslineGenerator } from '../core/generator.js';
import { ConfigEditor } from './config-editor.js';
import { formatCliMessage } from './message-icons.js';
import { MockDataGenerator } from './mock-data.js';

const program = new Command();

/**
 * 主程序入口点 - Statusline生成器
 * 支持标准输入模式和内联参数覆盖
 */
program
  .name('claude-code-statusline-pro')
  .description(
    'Enhanced statusline for Claude Code with live preview and interactive configuration'
  )
  .version('2.0.0-beta.1')
  .argument('[preset]', 'preset string like PMBT (Project, Model, Branch, Tokens)')
  .option('-p, --preset <preset>', 'component preset override')
  .option('-t, --theme <theme>', 'theme name (minimal, verbose, developer)')
  .option('--no-colors', 'disable colors output')
  .option('--no-emoji', 'disable emoji output')
  .option('--no-icons', 'disable Nerd Font icons')
  .option('-c, --config <path>', 'custom config file path')
  .option('-d, --debug', 'debug mode with verbose output')
  .option('-m, --mock <scenario>', 'use mock data scenario (dev, critical, error)')
  .action(async (preset, options) => {
    try {
      // 加载配置，内联参数具有最高优先级
      const configLoader = new ConfigLoader();
      let config = await configLoader.load(options.config);

      // 内联参数覆盖配置
      if (preset || options.preset) {
        const presetValue = preset || options.preset;
        config = { ...config, preset: presetValue };
      }

      if (options.theme) {
        config = { ...config, theme: options.theme };
      }

      // 内联参数覆盖样式配置
      if (options.colors === false || options.emoji === false || options.icons === false) {
        config.style = {
          separator: config.style?.separator || ' | ',
          enable_colors: options.colors === false ? false : config.style?.enable_colors || 'auto',
          enable_emoji: options.emoji === false ? false : config.style?.enable_emoji || 'auto',
          enable_nerd_font:
            options.icons === false ? false : config.style?.enable_nerd_font || 'auto',
          compact_mode: config.style?.compact_mode || false,
          max_width: config.style?.max_width || 0,
        };
      }

      const generator = new StatuslineGenerator(config);

      // Mock数据模式 - 用于测试和演示
      if (options.mock) {
        const mockGenerator = new MockDataGenerator();
        const mockData = mockGenerator.generate(options.mock);
        const result = await generator.generate(mockData);
        console.log(result);
        return;
      }

      // 标准模式 - 从stdin读取数据
      const inputData = await readStdinData();

      if (options.debug) {
        console.error('Config:', JSON.stringify(config, null, 2));
        console.error('Input:', JSON.stringify(inputData, null, 2));
      }

      const result = await generator.generate(inputData);
      console.log(result);
    } catch (error) {
      if (options.debug) {
        console.error('Error:', error);
      } else {
        console.error('Error:', error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  });

/**
 * 配置子命令 - 交互式配置管理
 * 实时预览系统的核心入口
 */
program
  .command('config')
  .description('interactive configuration with live preview')
  .option('-f, --file <path>', 'config file path')
  .option('-r, --reset', 'reset to default configuration')
  .action(async (options) => {
    try {
      if (options.reset) {
        await resetConfiguration(options.file);
        return;
      }

      const configEditor = new ConfigEditor({
        configPath: options.file,
      });
      await configEditor.startInteractiveMode();
    } catch (error) {
      console.error('Configuration error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * 主题子命令 - 主题选择和管理
 */
program
  .command('theme')
  .description('theme management and selection')
  .argument('[name]', 'theme name to apply (minimal, verbose, developer)')
  .action(async (name) => {
    try {
      if (name) {
        await applyTheme(name);
      } else {
        await startThemeSelector();
      }
    } catch (error) {
      console.error('Theme error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * 验证子命令 - 配置文件验证
 */
program
  .command('validate')
  .description('validate configuration file')
  .argument('[file]', 'config file path')
  .action(async (file) => {
    try {
      const configLoader = new ConfigLoader();
      const _config = await configLoader.load(file);
      console.log(formatCliMessage('success', 'Configuration is valid'));
      console.log(formatCliMessage('folder', `Config source: ${configLoader.getConfigSource()}`));
    } catch (error) {
      console.error(formatCliMessage('error', 'Configuration validation failed:'));
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * 诊断子命令 - 环境诊断
 */
program
  .command('doctor')
  .description('diagnose environment and configuration')
  .action(async () => {
    try {
      const { TerminalDetector } = await import('../terminal/detector.js');
      const detector = new TerminalDetector();
      const capabilities = detector.detectCapabilities();

      console.log(formatCliMessage('doctor', 'Environment Diagnosis'));
      console.log('========================');
      console.log(formatCliMessage('platform', `Platform: ${process.platform}`));
      console.log(`Node.js: ${process.version}`);
      console.log(formatCliMessage('terminal', `Terminal: ${process.env['TERM'] || 'unknown'}`));
      console.log(`Colors: ${capabilities.colors ? formatCliMessage('success', '') : formatCliMessage('error', '')}`);
      console.log(`Emoji: ${capabilities.emoji ? formatCliMessage('success', '') : formatCliMessage('error', '')}`);
      console.log(`Nerd Font: ${capabilities.nerdFont ? formatCliMessage('success', '') : formatCliMessage('error', '')}`);
      console.log(`Interactive TTY: ${process.stdin.isTTY ? formatCliMessage('success', '') : formatCliMessage('error', '')}`);

      // 配置诊断
      const configLoader = new ConfigLoader();
      try {
        const _config = await configLoader.load();
        console.log(`\n${formatCliMessage('config', 'Configuration:')} ${formatCliMessage('success', 'Valid')}`);
        console.log(formatCliMessage('folder', `Config source: ${configLoader.getConfigSource()}`));
      } catch (error) {
        console.log(`\n${formatCliMessage('config', 'Configuration:')} ${formatCliMessage('error', 'Invalid')}`);
        console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      console.error('Diagnosis failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * 从stdin读取输入数据
 */
async function readStdinData(): Promise<InputData> {
  const { parseJson } = await import('../core/parser.js');

  return new Promise((resolve, reject) => {
    let data = '';

    // 处理非交互式环境
    if (!process.stdin.isTTY) {
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => {
        data += chunk;
      });
      process.stdin.on('end', () => {
        try {
          if (data.trim()) {
            const parseResult = parseJson(data.trim());
            if (parseResult.success && parseResult.data) {
              resolve(parseResult.data);
            } else {
              reject(new Error(parseResult.error || 'Failed to parse input data'));
            }
          } else {
            // 没有输入数据时，使用基本默认值
            resolve({
              hookEventName: 'Status',
              sessionId: null,
              transcriptPath: null,
              cwd: process.cwd(),
              model: { id: 'claude-sonnet-4' },
              workspace: { current_dir: process.cwd() },
              gitBranch: null,
            });
          }
        } catch (error) {
          reject(
            new Error(
              `Invalid JSON input: ${error instanceof Error ? error.message : String(error)}`
            )
          );
        }
      });
      process.stdin.on('error', reject);
    } else {
      // 交互式环境，提供默认值
      resolve({
        hookEventName: 'Status',
        sessionId: null,
        transcriptPath: null,
        cwd: process.cwd(),
        model: { id: 'claude-sonnet-4' },
        workspace: { current_dir: process.cwd() },
        gitBranch: null,
      });
    }
  });
}

/**
 * 重置配置文件到默认值
 */
async function resetConfiguration(configPath?: string): Promise<void> {
  const confirm_reset = await confirm({
    message: '确定要将配置重置为默认值吗？',
    default: false,
  });

  if (!confirm_reset) {
    console.log(formatCliMessage('info', '重置已取消。'));
    return;
  }

  const configLoader = new ConfigLoader();
  await configLoader.resetToDefaults(configPath);
  console.log(formatCliMessage('success', '配置已重置为默认值'));
}

/**
 * 应用指定主题
 */
async function applyTheme(themeName: string): Promise<void> {
  const configLoader = new ConfigLoader();
  await configLoader.applyTheme(themeName);
  console.log(formatCliMessage('success', `已应用主题: ${themeName}`));
}

/**
 * 启动主题选择器
 */
async function startThemeSelector(): Promise<void> {
  const theme = await select({
    message: '选择主题：',
    choices: [
      { name: '简洁主题 - 清爽简单', value: 'minimal' },
      { name: '详细主题 - 详细信息', value: 'verbose' },
      { name: '开发者主题 - 便于调试', value: 'developer' },
      { name: '自定义主题 - 编辑当前主题', value: 'custom' },
    ],
  });

  if (theme === 'custom') {
    const configEditor = new ConfigEditor();
    await configEditor.startInteractiveMode();
  } else {
    await applyTheme(theme);
  }
}

// 错误处理和优雅退出
process.on('uncaughtException', (error) => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    console.log(`\n${formatCliMessage('goodbye', 'Goodbye!')}`);
    process.exit(0);
  } else {
    console.error('Uncaught exception:', error);
    process.exit(1);
  }
});

process.on('SIGINT', () => {
  console.log(`\n${formatCliMessage('goodbye', 'Goodbye!')}`);
  process.exit(0);
});

// 解析命令行参数
program.parse();
