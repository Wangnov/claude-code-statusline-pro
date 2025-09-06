/**
 * Claude Code Statusline Pro - CLI 主入口
 * Enhanced CLI with live preview, theme management, and real-time feedback
 *
 * 架构设计:
 * - Commander.js 主框架，支持子命令和内联参数
 * - 实时预览引擎，多场景Mock数据展示
 * - 主题选择系统，Inquirer.js用户体验  
 * - 三层用户体验: settings.json内联参数 > CLI命令行配置 > 手动TOML编辑
 */

import fs from 'node:fs';
import path from 'node:path';
import { confirm, select } from '@inquirer/prompts';
import { Command } from 'commander';
import { ConfigLoader } from '../config/loader.js';
import type { InputData } from '../config/schema.js';
import { StatuslineGenerator } from '../core/generator.js';
import { detect as detectTerminalCapabilities } from '../terminal/detector.js';
import { projectResolver } from '../utils/project-resolver.js';
import { initializeI18n, t } from './i18n.js';
import { formatCliMessage } from './message-icons.js';
import { MockDataGenerator } from './mock-data.js';

// 声明构建时注入的全局变量
declare const __PACKAGE_VERSION__: string | undefined;

// 版本号获取函数 - 支持开发和构建模式
const getVersion = (): string => {
  try {
    // 构建模式下的版本号注入
    if (typeof __PACKAGE_VERSION__ !== 'undefined') {
      return __PACKAGE_VERSION__;
    }
  } catch {
    // 忽略错误，继续使用package.json
  }

  // 开发模式从package.json读取
  try {
    const fs = require('node:fs');
    const path = require('node:path');
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch {
    return '2.1.0'; // 备用版本号
  }
};

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
    'Enhanced statusline for Claude Code with live preview and theme management'
  )
  .version(getVersion())
  .argument('[preset]', 'preset string like PMBT (Project, Model, Branch, Tokens)')
  .option('-p, --preset <preset>', 'component preset override')
  .option('-t, --theme <theme>', 'theme name (classic, powerline, capsule)')
  .option('--no-colors', 'disable colors output')
  .option('--no-emoji', 'disable emoji output')
  .option('--no-icons', 'disable Nerd Font icons')
  .option('--force-emoji', 'force enable emoji icons')
  .option('--force-nerd-font', 'force enable Nerd Font icons')
  .option('--force-text', 'force text-only mode (no emoji or icons)')
  .option('-c, --config <path>', 'custom config file path')
  .option('-d, --debug', 'debug mode with verbose output')
  .option(
    '-m, --mock <scenario>',
    'use mock data scenario (dev, critical, error, thinking, complete)'
  )
  .action(async (preset, options) => {
    await initializeApp();
    try {
      // 从stdin读取输入数据以获取projectId
      const inputData = await readStdinData();

      // 从transcriptPath提取项目ID
      const projectId = extractProjectIdFromTranscriptPath(inputData.transcriptPath);

      if (options.debug && projectId) {
        console.error(`Extracted project ID: ${projectId}`);
      }

      // 加载配置，内联参数具有最高优先级
      const configLoader = new ConfigLoader();
      let config = await configLoader.load(options.config);

      // 如果有projectId，重新加载配置
      if (projectId) {
        if (options.debug) {
          console.error(`Reloading config with projectId: ${projectId}`);
        }
        config = await configLoader.loadConfig({
          customPath: options.config,
          projectId,
        });
      }

      // 内联参数覆盖配置
      if (preset || options.preset) {
        const presetValue = preset || options.preset;
        config = { ...config, preset: presetValue };
      }

      if (options.theme) {
        config = { ...config, theme: options.theme };
      }

      // 内联参数覆盖样式和终端配置
      if (
        options.colors === false ||
        options.emoji === false ||
        options.icons === false ||
        options.forceEmoji ||
        options.forceNerdFont ||
        options.forceText
      ) {
        config.style = {
          separator: config.style?.separator || ' | ',
          enable_colors: options.colors === false ? false : config.style?.enable_colors || 'auto',
          enable_emoji:
            options.emoji === false
              ? false
              : options.forceEmoji
                ? true
                : options.forceText
                  ? false
                  : config.style?.enable_emoji || 'auto',
          enable_nerd_font:
            options.icons === false
              ? false
              : options.forceNerdFont
                ? true
                : options.forceText
                  ? false
                  : config.style?.enable_nerd_font || 'auto',
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

        // 处理强制启用选项
        if (options.forceEmoji) {
          config.terminal.force_emoji = true;
        }
        if (options.forceNerdFont) {
          config.terminal.force_nerd_font = true;
        }
        if (options.forceText) {
          config.terminal.force_text = true;
        }

        // 处理禁用选项
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

      // inputData已经在前面读取了

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
 * 配置子命令 - 配置文件管理
 * 支持配置初始化、重置和文件路径显示
 */
program
  .command('config')
  .description('configuration file management and initialization')
  .option('-f, --file <path>', 'config file path')
  .option('-r, --reset', 'reset to default configuration')
  .option(
    '-i, --init [project-path]',
    'initialize configuration for project (current directory if not specified)'
  )
  .option('-g, --global', 'create global user-level configuration (use with --init)')
  .option('-t, --theme <theme>', 'specify theme for initialization (classic, powerline, capsule)')
  .action(async (options) => {
    await initializeApp();
    try {
      const configLoader = new ConfigLoader();

      if (options.init !== undefined) {
        // 确定目标路径 | Determine target path
        let targetConfigPath: string;
        let projectPath: string;

        if (options.global) {
          // 全局用户级配置 | Global user-level configuration
          targetConfigPath = configLoader.getUserConfigPath();
          projectPath = 'global';
          console.log(formatCliMessage('info', '创建全局用户级配置文件'));
        } else {
          // 项目级配置 | Project-level configuration
          if (typeof options.init === 'string') {
            // 指定了项目路径 | Project path specified
            // 如果是绝对路径，直接使用；否则基于当前目录解析
            projectPath = path.isAbsolute(options.init) ? options.init : path.resolve(options.init);
          } else {
            // 使用当前目录 | Use current directory
            projectPath = process.cwd();
          }

          // 验证项目路径是否存在 | Verify project path exists
          if (!fs.existsSync(projectPath)) {
            console.log(formatCliMessage('error', `项目路径不存在: ${projectPath}`));
            process.exit(1);
          }

          targetConfigPath = configLoader.getProjectConfigPathForPath(projectPath);
          // 使用 projectResolver 生成项目ID
          const projectId = projectResolver.hashPath(projectPath);
          console.log(formatCliMessage('info', `为项目创建配置文件: ${projectPath}`));
          console.log(formatCliMessage('folder', `项目ID: ${projectId}`));
        }

        console.log(formatCliMessage('folder', `配置文件路径: ${targetConfigPath}`));

        // 检查配置文件是否已存在 | Check if config file already exists
        if (fs.existsSync(targetConfigPath)) {
          console.log(formatCliMessage('info', '配置文件已存在'));
          const overwrite = await confirm({
            message: '是否覆盖现有配置文件?',
            default: false,
          });

          if (!overwrite) {
            console.log(formatCliMessage('info', '操作已取消'));
            return;
          }
        }

        // 创建目标目录 | Create target directory
        const targetDir = path.dirname(targetConfigPath);
        if (!fs.existsSync(targetDir)) {
          await fs.promises.mkdir(targetDir, { recursive: true });
          console.log(formatCliMessage('success', `创建目录: ${targetDir}`));
        }

        // 智能终端检测 | Intelligent terminal detection
        console.log(formatCliMessage('info', '检测终端能力...'));
        const capabilities = detectTerminalCapabilities();

        // 根据终端能力选择最佳主题 | Select optimal theme based on terminal capabilities
        let selectedTheme: string;
        if (options.theme) {
          selectedTheme = options.theme;
          console.log(formatCliMessage('theme', `使用指定主题: ${selectedTheme}`));
        } else {
          if (capabilities.nerdFont) {
            selectedTheme = 'powerline';
            console.log(
              formatCliMessage('success', '检测到 Nerd Font - 使用 Powerline 主题获得最佳体验')
            );
          } else if (capabilities.emoji) {
            selectedTheme = 'classic';
            console.log(formatCliMessage('info', '检测到 Emoji 支持 - 使用 Classic 主题'));
          } else {
            selectedTheme = 'classic';
            console.log(
              formatCliMessage('warning', '终端能力有限 - 使用 Classic 主题并启用文本回退')
            );
          }
        }

        // 从模板复制配置文件 | Copy configuration from template
        await configLoader.createDefaultConfig(targetConfigPath, selectedTheme, capabilities);

        console.log(formatCliMessage('success', '配置文件初始化成功!'));
        console.log(formatCliMessage('theme', `主题: ${selectedTheme}`));
        console.log(formatCliMessage('folder', `位置: ${targetConfigPath}`));

        if (!options.global) {
          console.log(formatCliMessage('info', '该配置仅对当前项目生效'));
          console.log(formatCliMessage('info', '使用 --global 参数创建全局配置'));
        } else {
          console.log(formatCliMessage('info', '该配置对所有项目生效'));
        }

        return;
      }

      if (options.reset) {
        await resetConfiguration(options.file);
        return;
      }

      console.log(formatCliMessage('info', '交互式配置编辑器功能已被移除'));
      console.log(formatCliMessage('info', '请直接编辑 config.toml 文件进行配置'));
      const configSource = configLoader.getConfigSource();
      console.log(formatCliMessage('folder', `配置文件路径: ${configSource.path || '默认配置'}`));
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
 * 从transcriptPath提取项目ID | Extract project ID from transcriptPath
 * 例如：/Users/wangnov/.claude/projects/-Users-wangnov-claude-code-statusline-pro/xxx.jsonl
 * -> -Users-wangnov-claude-code-statusline-pro
 */
function extractProjectIdFromTranscriptPath(transcriptPath: string | null): string | null {
  if (!transcriptPath) return null;

  try {
    // 匹配 /projects/ 后面和下一个 / 之间的内容
    const match = transcriptPath.match(/\/projects\/([^/]+)\//);
    return match ? match[1] || null : null;
  } catch (error) {
    console.warn('Failed to extract project ID from transcriptPath:', error);
    return null;
  }
}

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
              cost: null,
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
        cost: null,
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
    console.log(formatCliMessage('info', '自定义主题编辑器已被移除'));
    console.log(formatCliMessage('info', '请直接编辑 config.toml 文件来自定义主题'));
    const configLoader = new ConfigLoader();
    const configSource = configLoader.getConfigSource();
    console.log(formatCliMessage('folder', `配置文件路径: ${configSource.path || '默认配置'}`));
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
