#!/usr/bin/env node
/**
 * Claude Code Statusline 配置管理工具
 * 用于管理statusline的配置文件和主题
 */

const fs = require('node:fs');
const path = require('node:path');
const { ConfigManager } = require('./config');
const { ConfigurableStatuslineGenerator } = require('./claude-code-statusline');

class StatuslineConfigTool {
  constructor() {
    this.configManager = new ConfigManager();
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
Claude Code Statusline 配置管理工具

用法: node statusline-config.js <命令> [选项]

命令:
  init                    - 创建默认配置文件
  show                    - 显示当前配置
  test                    - 测试当前配置
  themes                  - 列出所有可用主题
  theme <name>            - 应用指定主题
  validate                - 验证配置文件
  preview <theme>         - 预览主题效果
  
选项:
  --config <path>         - 指定配置文件路径
  --help                  - 显示帮助信息

示例:
  node statusline-config.js init
  node statusline-config.js show
  node statusline-config.js theme minimal
  node statusline-config.js preview verbose
    `);
  }

  /**
   * 初始化配置文件
   */
  initConfig(targetPath = null) {
    const configPath = targetPath || path.join(process.cwd(), 'statusline.config.toml');

    if (fs.existsSync(configPath)) {
      console.log(`⚠️  配置文件已存在: ${configPath}`);
      return false;
    }

    // 复制默认配置文件
    const defaultConfigPath = path.join(__dirname, 'statusline.config.toml');
    try {
      fs.copyFileSync(defaultConfigPath, configPath);
      console.log(`✅ 已创建配置文件: ${configPath}`);
      console.log(`🔧 请编辑配置文件以自定义你的statusline`);
      return true;
    } catch (error) {
      console.error(`❌ 创建配置文件失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 显示当前配置
   */
  showConfig() {
    const config = this.configManager.loadConfig();
    const summary = this.configManager.getConfigSummary();

    console.log('📊 当前配置摘要:');
    console.log('='.repeat(50));
    console.log(`配置文件: ${summary.configPath || '使用默认配置'}`);
    console.log(`启用组件: ${summary.enabledComponents.join(' | ')}`);
    console.log(`组件顺序: ${config.components.order.join(' → ')}`);
    console.log(`颜色模式: ${summary.colorsEnabled}`);
    console.log(`表情符号: ${summary.emojiEnabled}`);
    console.log(`紧凑模式: ${summary.compactMode ? '启用' : '禁用'}`);
    console.log(`分隔符: "${config.style.separator}"`);

    console.log('');
    console.log('🎨 颜色配置:');
    console.log(
      `  Token颜色: 安全=${config.components.tokens.colors.safe} | 警告=${config.components.tokens.colors.warning} | 危险=${config.components.tokens.colors.danger}`
    );
    console.log(
      `  状态颜色: 就绪=${config.components.status.colors.ready} | 思考=${config.components.status.colors.thinking} | 工具=${config.components.status.colors.tool}`
    );

    console.log('');
    console.log('📈 阈值设置:');
    console.log(`  警告阈值: ${config.components.tokens.thresholds.warning}%`);
    console.log(`  危险阈值: ${config.components.tokens.thresholds.danger}%`);
    console.log(`  后备区域: ${config.components.tokens.thresholds.backup}%`);
    console.log(`  临界阈值: ${config.components.tokens.thresholds.critical}%`);

    console.log('');
    console.log('🔧 高级设置:');
    console.log(`  缓存启用: ${config.advanced.cache_enabled ? '是' : '否'}`);
    console.log(`  错误检查范围: 最近${config.advanced.recent_error_count}条消息`);
    console.log(`  Git超时: ${config.advanced.git_timeout}ms`);
  }

  /**
   * 测试配置
   */
  testConfig() {
    console.log('🧪 测试当前配置...');
    console.log('='.repeat(50));

    try {
      const statusGenerator = new ConfigurableStatuslineGenerator();

      // 模拟测试数据
      const testData = {
        model: { id: 'claude-sonnet-4', display_name: 'Claude Sonnet 4' },
        workspace: { project_dir: '/Users/test/my-project', current_dir: '/Users/test/my-project' },
        cwd: '/Users/test/my-project',
        gitBranch: 'feature/test-branch',
        transcript_path: null, // 模拟无transcript的情况
      };

      const result = statusGenerator.generate(testData);

      console.log('📊 测试结果:');
      console.log(result);

      console.log('');
      console.log('✅ 配置测试通过！');

      // 显示各组件状态
      const config = statusGenerator.config;
      console.log('');
      console.log('📋 组件状态:');
      config.components.order.forEach((name) => {
        const enabled = config.components[name]?.enabled !== false;
        const status = enabled ? '✅ 启用' : '❌ 禁用';
        console.log(`  ${name}: ${status}`);
      });
    } catch (error) {
      console.error(`❌ 配置测试失败: ${error.message}`);
      return false;
    }

    return true;
  }

  /**
   * 列出所有主题
   */
  listThemes() {
    const config = this.configManager.loadConfig();
    const themes = config.themes || {};

    console.log('🎨 可用主题:');
    console.log('='.repeat(40));

    if (Object.keys(themes).length === 0) {
      console.log('❌ 没有找到可用主题');
      return;
    }

    for (const [name, theme] of Object.entries(themes)) {
      console.log(`📦 ${name}`);
      if (theme.description) {
        console.log(`   ${theme.description}`);
      }
      console.log('');
    }
  }

  /**
   * 预览主题效果
   */
  previewTheme(themeName) {
    console.log(`🎨 预览主题: ${themeName}`);
    console.log('='.repeat(40));

    const config = this.configManager.loadConfig();
    const theme = config.themes?.[themeName];

    if (!theme) {
      console.error(`❌ 主题 "${themeName}" 不存在`);
      this.listThemes();
      return false;
    }

    try {
      // 创建临时配置管理器
      const tempConfigManager = new ConfigManager();
      const tempConfig = tempConfigManager.loadConfig();

      // 应用主题
      const themedConfig = tempConfigManager.deepMerge(tempConfig, theme);

      // 创建使用主题配置的statusline生成器
      const statusGenerator = new ConfigurableStatuslineGenerator();
      statusGenerator.config = themedConfig;
      statusGenerator.setupCapabilities();
      statusGenerator.setupColors();
      statusGenerator.setupIcons();

      // 测试数据
      const testData = {
        model: { id: 'claude-sonnet-4', display_name: 'Claude Sonnet 4' },
        workspace: {
          project_dir: '/Users/test/awesome-project',
          current_dir: '/Users/test/awesome-project',
        },
        cwd: '/Users/test/awesome-project',
        gitBranch: 'main',
        transcript_path: null,
      };

      const result = statusGenerator.generate(testData);

      console.log('预览结果:');
      console.log(result);

      console.log('');
      console.log('主题配置特点:');
      if (theme.components?.order) {
        console.log(`  组件顺序: ${theme.components.order.join(' → ')}`);
      }
      if (theme.style?.compact_mode) {
        console.log(`  紧凑模式: ${theme.style.compact_mode ? '启用' : '禁用'}`);
      }
    } catch (error) {
      console.error(`❌ 预览主题失败: ${error.message}`);
      return false;
    }

    return true;
  }

  /**
   * 验证配置文件
   */
  validateConfig() {
    console.log('🔍 验证配置文件...');
    console.log('='.repeat(40));

    try {
      const _config = this.configManager.loadConfig();
      console.log('✅ 配置文件语法正确');

      // 检查必需的配置项
      const checks = [
        { path: 'components.order', type: 'array', required: true },
        { path: 'style.separator', type: 'string', required: true },
        { path: 'components.tokens.thresholds.warning', type: 'number', required: true },
        { path: 'components.tokens.thresholds.danger', type: 'number', required: true },
      ];

      let valid = true;
      for (const check of checks) {
        const value = this.configManager.get(check.path);
        if (check.required && value === null) {
          console.error(`❌ 缺少必需配置: ${check.path}`);
          valid = false;
        } else if (value !== null && typeof value !== check.type) {
          console.error(`❌ 配置类型错误: ${check.path} 应为 ${check.type}`);
          valid = false;
        }
      }

      // 检查阈值逻辑
      const warningThreshold = this.configManager.get('components.tokens.thresholds.warning');
      const dangerThreshold = this.configManager.get('components.tokens.thresholds.danger');

      if (warningThreshold >= dangerThreshold) {
        console.error(
          `❌ 阈值配置错误: warning(${warningThreshold}) 应小于 danger(${dangerThreshold})`
        );
        valid = false;
      }

      if (valid) {
        console.log('✅ 配置验证通过');
      } else {
        console.log('❌ 配置验证失败');
      }

      return valid;
    } catch (error) {
      console.error(`❌ 配置验证失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 主程序入口
   */
  run() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help')) {
      this.showHelp();
      return;
    }

    const command = args[0];
    const options = args.slice(1);

    switch (command) {
      case 'init':
        this.initConfig(
          options.includes('--config') ? options[options.indexOf('--config') + 1] : null
        );
        break;

      case 'show':
        this.showConfig();
        break;

      case 'test':
        this.testConfig();
        break;

      case 'themes':
        this.listThemes();
        break;

      case 'preview':
        if (options.length === 0) {
          console.error('❌ 请指定要预览的主题名称');
          this.listThemes();
        } else {
          this.previewTheme(options[0]);
        }
        break;

      case 'validate':
        this.validateConfig();
        break;

      default:
        console.error(`❌ 未知命令: ${command}`);
        this.showHelp();
        break;
    }
  }
}

// 运行配置工具
if (require.main === module) {
  const tool = new StatuslineConfigTool();
  tool.run();
}

module.exports = { StatuslineConfigTool };
