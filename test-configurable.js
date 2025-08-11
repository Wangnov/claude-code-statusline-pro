#!/usr/bin/env node
/**
 * 测试配置化statusline
 */

const { ConfigurableStatuslineGenerator } = require('./claude-code-statusline-v2');

// 模拟Claude Code传入的JSON数据
const mockData = {
  model: {
    id: "claude-sonnet-4-20250514",
    display_name: "Claude Sonnet 4"
  },
  workspace: {
    project_dir: "/Users/wangnov/cc-statusline-pro",
    current_dir: "/Users/wangnov/cc-statusline-pro"
  },
  cwd: "/Users/wangnov/cc-statusline-pro",
  gitBranch: "main",
  transcript_path: "/Users/wangnov/.claude/projects/-Users-wangnov-cc-statusline-pro/e318c248-8be5-4f57-bba6-87538e5073a6.jsonl"
};

const statusGenerator = new ConfigurableStatuslineGenerator();

console.log('配置化Statusline输出:');
console.log('-'.repeat(50));
const result = statusGenerator.generate(mockData);
console.log(result);
console.log('');

console.log('配置摘要:');
console.log('-'.repeat(30));
const summary = statusGenerator.config;
console.log(`配置来源: ${summary.configPath || '默认配置'}`);
console.log(`启用组件: ${summary.components.order.join(', ')}`);
console.log(`颜色支持: ${summary.style.enable_colors}`);
console.log(`表情支持: ${summary.style.enable_emoji}`);
console.log(`紧凑模式: ${summary.style.compact_mode}`);

console.log('');
console.log('检测到的终端能力:');
console.log(`  颜色: ${statusGenerator.capabilities.colors}`);
console.log(`  表情: ${statusGenerator.capabilities.emoji}`);

console.log('');
console.log('Token阈值配置:');
const tokenConfig = summary.components.tokens;
console.log(`  警告阈值: ${tokenConfig.thresholds.warning}%`);
console.log(`  危险阈值: ${tokenConfig.thresholds.danger}%`);
console.log(`  后备区域: ${tokenConfig.thresholds.backup}%`);
console.log(`  临界阈值: ${tokenConfig.thresholds.critical}%`);

// 测试不同的组件配置
console.log('');
console.log('测试各种配置组合:');
console.log('-'.repeat(40));

// 禁用项目名称
console.log('1. 禁用项目名称:');
statusGenerator.config.components.project.enabled = false;
console.log(statusGenerator.generate(mockData));

// 启用完整模型名
console.log('');
console.log('2. 显示完整模型名:');
statusGenerator.config.components.project.enabled = true;
statusGenerator.config.components.model.show_full_name = true;
console.log(statusGenerator.generate(mockData));

// 紧凑模式
console.log('');
console.log('3. 紧凑模式:');
statusGenerator.config.components.model.show_full_name = false;
statusGenerator.config.style.separator = ' ';
statusGenerator.config.style.compact_mode = true;
console.log(statusGenerator.generate(mockData));