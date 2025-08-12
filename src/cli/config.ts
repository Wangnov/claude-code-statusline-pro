#!/usr/bin/env node

/**
 * 配置管理 CLI 工具
 * 专门用于配置文件操作的独立工具
 */

import { Command } from 'commander';
import { ConfigLoader } from '../config/loader.js';
import { ConfigEditor } from './config-editor.js';
import { formatCliMessage } from './message-icons.js';
import { LivePreviewEngine } from './preview-engine.js';

const program = new Command();

program
  .name('claude-statusline-config')
  .description('Claude Code Statusline Pro configuration manager')
  .version('2.0.0-beta.1');

// 初始化配置文件
program
  .command('init')
  .description('initialize configuration file')
  .option('-f, --force', 'overwrite existing configuration')
  .action(async (options) => {
    try {
      const configLoader = new ConfigLoader();
      const exists = await configLoader.configExists();

      if (exists && !options.force) {
        console.log('Configuration file already exists. Use --force to overwrite.');
        return;
      }

      await configLoader.createDefaultConfig();
      console.log(formatCliMessage('success', 'Configuration file initialized'));
    } catch (error) {
      console.error('Failed to initialize config:', error);
      process.exit(1);
    }
  });

// 显示配置信息
program
  .command('show')
  .description('show current configuration')
  .option('-f, --file <path>', 'config file path')
  .action(async (options) => {
    try {
      const configLoader = new ConfigLoader();
      const config = await configLoader.load(options.file);

      console.log(formatCliMessage('config', 'Current Configuration:'));
      console.log('========================');
      console.log(JSON.stringify(config, null, 2));
      console.log(`\n${formatCliMessage('folder', `Config source: ${configLoader.getConfigSource()}`)}`);;
    } catch (error) {
      console.error('Failed to show config:', error);
      process.exit(1);
    }
  });

// 交互式编辑
program
  .command('edit')
  .description('open interactive configuration editor')
  .option('-f, --file <path>', 'config file path')
  .action(async (options) => {
    try {
      const editor = new ConfigEditor({
        configPath: options.file,
      });
      await editor.startInteractiveMode();
    } catch (error) {
      console.error('Configuration editor failed:', error);
      process.exit(1);
    }
  });

// 预览配置效果
program
  .command('preview [theme]')
  .description('preview configuration with mock data')
  .option('-f, --file <path>', 'config file path')
  .option('-s, --scenarios <scenarios...>', 'specific scenarios to preview')
  .action(async (theme, options) => {
    try {
      const engine = new LivePreviewEngine({
        configPath: options.file,
        theme: theme,
      });

      // 确保引擎初始化完成
      await engine.initialize();

      const scenarios = options.scenarios || ['dev', 'critical', 'error'];
      await engine.renderStaticPreview(scenarios);
    } catch (error) {
      console.error('Preview failed:', error);
      process.exit(1);
    }
  });

// 验证配置
program
  .command('validate')
  .description('validate configuration file')
  .argument('[file]', 'config file path')
  .action(async (file) => {
    try {
      const configLoader = new ConfigLoader();
      const config = await configLoader.load(file);

      console.log(formatCliMessage('success', 'Configuration is valid'));
      console.log(formatCliMessage('folder', `Config source: ${configLoader.getConfigSource()}`));
      console.log(formatCliMessage('theme', `Theme: ${config.theme || 'default'}`));
      console.log(formatCliMessage('info', `Preset: ${config.preset || 'PMBTS'}`));

      // 组件状态
      const components = Object.entries(config.components || {})
        .filter(([key]) => key !== 'order')
        .map(([name, component]: [string, unknown]) => {
          const comp = component as Record<string, unknown> | null;
          const statusIcon = comp?.['enabled'] ? 'success' : 'error';
          return `${formatCliMessage(statusIcon, '').trim()} ${name}`;
        });

      console.log(formatCliMessage('info', `Components: ${components.join(', ')}`));
    } catch (error) {
      console.error(formatCliMessage('error', 'Configuration validation failed:'));
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// 重置配置
program
  .command('reset')
  .description('reset configuration to defaults')
  .option('-f, --file <path>', 'config file path')
  .action(async (options) => {
    try {
      const configLoader = new ConfigLoader();
      await configLoader.resetToDefaults(options.file);
      console.log(formatCliMessage('success', 'Configuration reset to defaults'));
    } catch (error) {
      console.error('Failed to reset config:', error);
      process.exit(1);
    }
  });

// 应用主题
program
  .command('theme')
  .description('apply theme')
  .argument('<name>', 'theme name (minimal, verbose, developer)')
  .option('-f, --file <path>', 'config file path')
  .action(async (name, options) => {
    try {
      const configLoader = new ConfigLoader();
      await configLoader.applyTheme(name, options.file);
      console.log(formatCliMessage('success', `Applied theme: ${name}`));
    } catch (error) {
      console.error('Failed to apply theme:', error);
      process.exit(1);
    }
  });

program.parse();
