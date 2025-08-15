#!/usr/bin/env node

/**
 * Claude Code Statusline Pro - 配置管理 CLI 工具 | Configuration Management CLI Tool
 * v2.0.0 重构版：简化命令结构，集成国际化支持，增强配置诊断
 *
 * 核心功能 | Core Features:
 * - init: 智能终端检测和配置初始化
 * - edit: 交互式配置编辑，集成验证和诊断功能
 *
 * @author Claude Code Team
 * @version 2.0.0-beta.1
 */

import { Command } from 'commander';
import { ConfigLoader } from '../config/loader.js';
import { detect as detectTerminalCapabilities } from '../terminal/detector.js';
import { ConfigEditor } from './config-editor.js';
import { initializeI18n, t } from './i18n.js';
import { formatCliMessage } from './message-icons.js';

/**
 * 初始化CLI程序 | Initialize CLI program
 */
async function initializeCLI(): Promise<Command> {
  // 初始化国际化系统 | Initialize i18n system
  await initializeI18n();

  const program = new Command();

  program
    .name('claude-statusline-config')
    .description(t('cli.app.description'))
    .version(t('cli.app.version'));

  return program;
}

/**
 * 配置初始化命令 | Configuration initialization command
 * 智能终端检测，自动选择最佳主题和配置
 */
function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description(t('cli.commands.config.options.init'))
    .option('-f, --force', t('cli.commands.config.options.reset'))
    .option('-t, --theme <theme>', t('cli.commands.config.options.theme'))
    .action(async (options) => {
      try {
        const configLoader = new ConfigLoader();
        const exists = await configLoader.configExists();

        if (exists && !options.force) {
          console.log(formatCliMessage('info', `${t('config.exists')} ${t('config.overwrite')}`));
          return;
        }

        // 智能终端检测 | Intelligent terminal detection
        console.log(formatCliMessage('info', t('terminal.detection.title')));
        const capabilities = detectTerminalCapabilities();

        // 显示检测结果 | Show detection results
        console.log(
          `   ${t('terminal.capabilities.colors')}: ${capabilities.colors ? '✅' : '❌'}`
        );
        console.log(`   ${t('terminal.capabilities.emoji')}: ${capabilities.emoji ? '✅' : '❌'}`);
        console.log(
          `   ${t('terminal.capabilities.nerdFont')}: ${capabilities.nerdFont ? '✅' : '❌'}`
        );
        console.log();

        // 根据终端能力选择最佳主题 | Select optimal theme based on terminal capabilities
        let selectedTheme: string;
        if (options.theme) {
          selectedTheme = options.theme;
          console.log(formatCliMessage('theme', t('config.theme', { theme: selectedTheme })));
        } else {
          if (capabilities.nerdFont) {
            selectedTheme = 'powerline';
            console.log(
              formatCliMessage('success', 'Nerd Font检测成功 - 使用Powerline主题获得最佳体验')
            );
          } else if (capabilities.emoji) {
            selectedTheme = 'classic';
            console.log(formatCliMessage('info', 'Emoji支持检测成功 - 使用Classic主题'));
          } else {
            selectedTheme = 'classic';
            console.log(formatCliMessage('warn', '终端功能有限 - 使用Classic主题和文本回退模式'));
          }
        }

        // 创建带有智能配置的默认文件 | Create default file with intelligent configuration
        await configLoader.createDefaultConfig(undefined, selectedTheme, capabilities);

        console.log(formatCliMessage('success', t('config.initialized')));
        console.log(formatCliMessage('folder', t('config.theme', { theme: selectedTheme })));
        console.log(formatCliMessage('info', t('config.customization')));
      } catch (error) {
        console.error(formatCliMessage('error', `${t('errors.configLoadFailed')}:`), error);
        process.exit(1);
      }
    });
}

/**
 * 配置诊断功能 | Configuration diagnostic functionality
 * 显示配置完整性状态和决策链路
 */
async function showConfigDiagnostics(
  configLoader: ConfigLoader,
  configPath?: string
): Promise<void> {
  try {
    const config = await configLoader.load(configPath);
    const configSource = configLoader.getConfigSource();

    console.log(formatCliMessage('config', t('diagnosis.title')));
    console.log('='.repeat(50));

    // 配置源信息 | Configuration source info
    console.log(t('diagnosis.source') + (configSource || 'default'));
    console.log(t('config.theme', { theme: config.theme || 'classic' }));
    console.log(`${t('editor.presets.applied', { preset: config.preset || 'PMBTS' })}`);
    console.log();

    // 组件启用状态诊断 | Component enable status diagnostic
    console.log(`📊 ${t('editor.components.title')}`);
    const components = Object.entries(config.components || {})
      .filter(([key]) => key !== 'order')
      .map(([name, component]: [string, unknown]) => {
        const comp = component as Record<string, unknown> | null;
        const isEnabled = comp?.enabled === true;
        const statusIcon = isEnabled ? '✅' : '❌';
        const componentName = t(`componentNames.${name}` as keyof typeof t);
        return `   ${statusIcon} ${componentName} (${name})`;
      });

    console.log(components.join('\n'));

    // 终端能力状态 | Terminal capability status
    console.log();
    console.log(`🖥️  ${t('terminal.detection.title')}`);
    const capabilities = detectTerminalCapabilities();
    console.log(`   ${t('terminal.capabilities.colors')}: ${capabilities.colors ? '✅' : '❌'}`);
    console.log(`   ${t('terminal.capabilities.emoji')}: ${capabilities.emoji ? '✅' : '❌'}`);
    console.log(
      `   ${t('terminal.capabilities.nerdFont')}: ${capabilities.nerdFont ? '✅' : '❌'}`
    );
  } catch (error) {
    console.error(formatCliMessage('error', `${t('errors.configLoadFailed')}:`), error);
    throw error;
  }
}

/**
 * 交互式配置编辑命令 | Interactive configuration edit command
 * 集成配置诊断、验证和完整性检查功能
 */
function registerEditCommand(program: Command): void {
  program
    .command('edit')
    .description(t('cli.commands.config.description'))
    .option('-f, --file <path>', t('cli.commands.config.options.file'))
    .option('--diagnose', '显示配置诊断信息后进入编辑模式')
    .action(async (options) => {
      try {
        const configLoader = new ConfigLoader();

        // 配置诊断模式 | Configuration diagnostic mode
        if (options.diagnose) {
          await showConfigDiagnostics(configLoader, options.file);
          console.log();
          console.log(formatCliMessage('info', t('messages.keyPress')));
          // 等待用户按键 | Wait for user keypress (only in TTY environments)
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.once('data', () => {
              process.stdin.setRawMode(false);
              process.stdin.pause();
            });
            await new Promise((resolve) => process.stdin.once('data', resolve));
          } else {
            // 非TTY环境下使用简单延迟 | Use simple delay in non-TTY environments
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          console.log();
        }

        // 启动交互式编辑器 | Start interactive editor
        const editor = new ConfigEditor({
          configPath: options.file,
        });
        await editor.startInteractiveMode();
      } catch (error) {
        console.error(formatCliMessage('error', `${t('errors.configLoadFailed')}:`), error);
        process.exit(1);
      }
    });
}

/**
 * 主程序入口 | Main program entry
 */
async function main(): Promise<void> {
  try {
    const program = await initializeCLI();

    // 注册命令 | Register commands
    registerInitCommand(program);
    registerEditCommand(program);

    // 解析命令行参数 | Parse command line arguments
    await program.parseAsync();
  } catch (error) {
    console.error(formatCliMessage('error', `${t('errors.configLoadFailed')}:`), error);
    process.exit(1);
  }
}

// 启动主程序 | Start main program
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
