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
import { detect as detectTerminalCapabilities } from '../terminal/detector.js';
import { ConfigEditor } from './config-editor.js';
import { initializeI18n, t } from './i18n.js';
import { formatCliMessage } from './message-icons.js';
import { MockDataGenerator } from './mock-data.js';

// 版本号 - 构建时注入
declare const __PACKAGE_VERSION__: string;
const getVersion = () => __PACKAGE_VERSION__;

const program = new Command();

/**
 * 初始化应用程序 | Initialize application
 */
async function initializeApp(): Promise<void> {
  await initializeI18n();
}

/**
 * 主程序入口点 - Statusline生成器
 * 支持标准输入模式和内联参数覆盖
 */
program
  .name('claude-code-statusline-pro')
  .description(
    'Enhanced statusline for Claude Code with live preview and interactive configuration'
  )
  .version(getVersion())
  .argument('[preset]', 'preset string like PMBT (Project, Model, Branch, Tokens)')
  .option('-p, --preset <preset>', 'component preset override')
  .option('-t, --theme <theme>', 'theme name (classic, powerline, capsule)')
  .option('--no-colors', 'disable colors output')
  .option('--no-emoji', 'disable emoji output')
  .option('--no-icons', 'disable Nerd Font icons')
  .option('-c, --config <path>', 'custom config file path')
  .option('-d, --debug', 'debug mode with verbose output')
  .option(
    '-m, --mock <scenario>',
    'use mock data scenario (dev, critical, error, thinking, complete)'
  )
  .action(async (preset, options) => {
    await initializeApp();
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
          separator_color: config.style?.separator_color || 'white',
          separator_before: config.style?.separator_before || ' ',
          separator_after: config.style?.separator_after || ' ',
          compact_mode: config.style?.compact_mode || false,
          max_width: config.style?.max_width || 0,
        };

        // 更新terminal配置
        if (!config.terminal) {
          config.terminal = {
            force_nerd_font: false,
            force_emoji: false,
            force_text: false,
          };
        }
        if (options.emoji === false) {
          config.terminal.force_emoji = false;
        }
        if (options.icons === false) {
          config.terminal.force_nerd_font = false;
        }
      }

      const generator = new StatuslineGenerator(config);

      // Mock数据模式 - 用于测试和演示
      if (options.mock) {
        const mockGenerator = new MockDataGenerator();
        const mockData = mockGenerator.generate(options.mock);
        const result = await generator.generate(mockData);
        console.log(result);
        process.exit(0);
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
      process.exit(0);
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
  .option('-i, --init', 'initialize new configuration with intelligent terminal detection')
  .option('-t, --theme <theme>', 'specify theme for initialization (classic, powerline, capsule)')
  .action(async (options) => {
    await initializeApp();
    try {
      const configLoader = new ConfigLoader();

      if (options.init) {
        // 初始化配置文件 | Initialize configuration file
        const exists = await configLoader.configExists(options.file);

        if (exists) {
          console.log(formatCliMessage('info', t('config.exists')));
          const overwrite = await confirm({
            message: t('config.overwrite'),
            default: false,
          });

          if (!overwrite) {
            console.log(formatCliMessage('info', t('messages.cancelled')));
            return;
          }
        }

        // 智能终端检测 | Intelligent terminal detection
        console.log(formatCliMessage('info', t('terminal.detection.title')));
        const capabilities = detectTerminalCapabilities();

        // 根据终端能力选择最佳主题 | Select optimal theme based on terminal capabilities
        let selectedTheme: string;
        if (options.theme) {
          selectedTheme = options.theme;
          console.log(formatCliMessage('theme', t('config.theme', { theme: selectedTheme })));
        } else {
          if (capabilities.nerdFont) {
            selectedTheme = 'powerline';
            console.log(
              formatCliMessage(
                'success',
                'Nerd Font detected - using Powerline theme for best experience'
              )
            );
          } else if (capabilities.emoji) {
            selectedTheme = 'classic';
            console.log(formatCliMessage('info', 'Emoji support detected - using Classic theme'));
          } else {
            selectedTheme = 'classic';
            console.log(
              formatCliMessage(
                'warning',
                'Limited terminal capabilities - using Classic theme with text fallback'
              )
            );
          }
        }

        // 创建带有智能配置的默认文件 | Create default file with intelligent configuration
        await configLoader.createDefaultConfig(options.file, selectedTheme, capabilities);

        console.log(formatCliMessage('success', t('config.initialized')));
        console.log(formatCliMessage('folder', t('config.theme', { theme: selectedTheme })));
        console.log(formatCliMessage('info', t('config.customization')));
        return;
      }

      if (options.reset) {
        await resetConfiguration(options.file);
        return;
      }

      const configEditor = new ConfigEditor({
        configPath: options.file,
      });
      await configEditor.startInteractiveMode();
    } catch (error) {
      console.error(
        formatCliMessage('error', 'Configuration error:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

/**
 * 主题子命令 - 主题选择和管理
 */
program
  .command('theme')
  .description('theme management and selection')
  .argument('[name]', 'theme name to apply (classic, powerline, capsule)')
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
      console.log(formatCliMessage('terminal', `Terminal: ${process.env.TERM || 'unknown'}`));
      console.log(
        `Colors: ${capabilities.colors ? formatCliMessage('success', '') : formatCliMessage('error', '')}`
      );
      console.log(
        `Emoji: ${capabilities.emoji ? formatCliMessage('success', '') : formatCliMessage('error', '')}`
      );
      console.log(
        `Nerd Font: ${capabilities.nerdFont ? formatCliMessage('success', '') : formatCliMessage('error', '')}`
      );
      console.log(
        `Interactive TTY: ${process.stdin.isTTY ? formatCliMessage('success', '') : formatCliMessage('error', '')}`
      );

      // 配置诊断
      const configLoader = new ConfigLoader();
      try {
        const _config = await configLoader.load();
        console.log(
          `\n${formatCliMessage('config', 'Configuration:')} ${formatCliMessage('success', 'Valid')}`
        );
        console.log(formatCliMessage('folder', `Config source: ${configLoader.getConfigSource()}`));
      } catch (error) {
        console.log(
          `\n${formatCliMessage('config', 'Configuration:')} ${formatCliMessage('error', 'Invalid')}`
        );
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
    message: t('config.reset.confirm'),
    default: false,
  });

  if (!confirm_reset) {
    console.log(formatCliMessage('info', t('messages.cancelled')));
    return;
  }

  const configLoader = new ConfigLoader();
  await configLoader.resetToDefaults(configPath);
  console.log(formatCliMessage('success', t('config.reset.success')));
}

/**
 * 应用指定主题
 */
async function applyTheme(themeName: string): Promise<void> {
  const configLoader = new ConfigLoader();
  await configLoader.applyTheme(themeName);
  console.log(formatCliMessage('success', t('editor.themes.applied', { theme: themeName })));
}

/**
 * 启动主题选择器
 */
async function startThemeSelector(): Promise<void> {
  await initializeApp();

  const theme = await select({
    message: t('editor.themes.title'),
    choices: [
      { name: t('editor.themes.items.classic.name'), value: 'classic' },
      { name: t('editor.themes.items.powerline.name'), value: 'powerline' },
      { name: t('editor.themes.items.capsule.name'), value: 'capsule' },
      { name: t('editor.themes.items.custom.name'), value: 'custom' },
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
    console.log(`\n${formatCliMessage('goodbye', t('messages.goodbye'))}`);
    process.exit(0);
  } else {
    console.error('Uncaught exception:', error);
    process.exit(1);
  }
});

process.on('SIGINT', () => {
  console.log(`\n${formatCliMessage('goodbye', t('messages.goodbye'))}`);
  process.exit(0);
});

// 解析命令行参数
program.parse();
