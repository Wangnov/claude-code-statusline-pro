#!/usr/bin/env node
/**
 * 配置化的 Claude Code Statusline
 * 支持TOML配置文件的灵活定制系统
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const { configManager } = require('./config');

// 模型配置 - 将被配置文件覆盖
const MODEL_CONFIGS = {
  'claude-sonnet-4': { contextWindow: 200000, shortName: 'S4' },
  'claude-sonnet-3.7': { contextWindow: 200000, shortName: 'S3.7' },
  'claude-opus-4.1': { contextWindow: 200000, shortName: 'O4' },
  'claude-haiku-3.5': { contextWindow: 200000, shortName: 'H3.5' }
};

class ConfigurableStatuslineGenerator {
  constructor() {
    this.cachedTranscriptData = null;
    this.lastTranscriptMtime = null;
    this.config = configManager.loadConfig();
    this.setupCapabilities();
    this.setupColors();
    this.setupIcons();
  }

  /**
   * 设置终端能力检测
   */
  setupCapabilities() {
    const enableColors = this.config.style.enable_colors;
    const enableEmoji = this.config.style.enable_emoji;

    this.capabilities = {
      colors: enableColors === true ||
        (enableColors === "auto" && (
          process.env.COLORTERM === 'truecolor' ||
          process.env.TERM?.includes('256') ||
          process.env.TERM_PROGRAM === 'vscode'
        )),
      emoji: enableEmoji === true ||
        (enableEmoji === "auto" && (
          process.platform !== 'win32' ||
          process.env.WT_SESSION ||
          process.env.TERM_PROGRAM === 'vscode' ||
          process.env.ConEmuPID
        ))
    };
  }

  /**
   * 设置颜色系统
   */
  setupColors() {
    // 基础ANSI颜色映射
    const baseColors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      dim: '\x1b[2m',
      black: '\x1b[30m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      gray: '\x1b[90m',
      bright_red: '\x1b[91m',
      bright_green: '\x1b[92m',
      bright_yellow: '\x1b[93m',
      bright_blue: '\x1b[94m',
      bright_magenta: '\x1b[95m',
      bright_cyan: '\x1b[96m',
      bright_white: '\x1b[97m'
    };

    // 合并自定义颜色代码
    const customColors = this.config.advanced.custom_color_codes || {};

    this.colors = this.capabilities.colors ?
      { ...baseColors, ...customColors } :
      Object.fromEntries(Object.keys({ ...baseColors, ...customColors }).map(k => [k, '']));
  }

  /**
   * 设置图标系统
   */
  setupIcons() {
    const fallbackIcons = {
      model: '[M]', branch: '[B]', token: '[T]', ready: '[OK]',
      tool: '[TOOL]', thinking: '[...]', paused: '[PAUSE]',
      error: '[ERR]', warning: '[WARN]', clock: '[T]', project: '[P]'
    };

    if (this.capabilities.emoji) {
      this.icons = {
        project: this.config.components.project.icon || '📁',
        model: this.config.components.model.icon || '🤖',
        branch: this.config.components.branch.icon || '🌿',
        token: this.config.components.tokens.icon || '📊',
        ready: this.config.components.status.icons.ready || '✅',
        thinking: this.config.components.status.icons.thinking || '💭',
        tool: this.config.components.status.icons.tool || '🔧',
        error: this.config.components.status.icons.error || '❌',
        warning: this.config.components.status.icons.warning || '⚠️'
      };
    } else {
      this.icons = fallbackIcons;
    }
  }

  /**
   * 获取模型配置信息
   */
  getModelConfig(modelId) {
    if (!modelId) return { contextWindow: 200000, shortName: '?' };

    // 检查自定义名称映射
    const customNames = this.config.components.model.custom_names || {};

    const modelKey = Object.keys(MODEL_CONFIGS).find(key =>
      modelId.toLowerCase().includes(key.toLowerCase())
    );

    if (modelKey) {
      const config = MODEL_CONFIGS[modelKey];
      const customName = customNames[modelKey];
      return {
        contextWindow: config.contextWindow,
        shortName: customName || config.shortName
      };
    }

    // 回退逻辑 - 解析模型名称
    let shortName = 'Unknown';
    if (modelId.toLowerCase().includes('sonnet')) {
      const match = modelId.match(/sonnet[\s-]*(\d+(?:\.\d+)?)/i);
      shortName = match ? `S${match[1]}` : 'S?';
    } else if (modelId.toLowerCase().includes('opus')) {
      const match = modelId.match(/opus[\s-]*(\d+(?:\.\d+)?)/i);
      shortName = match ? `O${match[1]}` : 'O?';
    } else if (modelId.toLowerCase().includes('haiku')) {
      const match = modelId.match(/haiku[\s-]*(\d+(?:\.\d+)?)/i);
      shortName = match ? `H${match[1]}` : 'H?';
    } else {
      shortName = modelId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    }

    // 检查是否有自定义名称
    const fullModelId = modelId.toLowerCase();
    for (const [key, customName] of Object.entries(customNames)) {
      if (fullModelId.includes(key.toLowerCase())) {
        shortName = customName;
        break;
      }
    }

    return { contextWindow: 200000, shortName };
  }

  /**
   * 生成项目名称组件
   */
  generateProjectComponent(data) {
    if (!this.config.components.project.enabled) return null;

    const projectPath = data.workspace?.project_dir || data.workspace?.current_dir || data.cwd;
    if (!projectPath) return null;

    const projectName = path.basename(projectPath);
    if (projectName === '.' || (projectName === '' && !this.config.components.project.show_when_empty)) {
      return null;
    }

    const color = this.colors[this.config.components.project.color] || '';
    const resetColor = this.colors.reset;
    const icon = this.icons.project;

    return `${color}${icon} ${projectName}${resetColor}`;
  }

  /**
   * 生成模型组件
   */
  generateModelComponent(data) {
    if (!this.config.components.model.enabled) return null;

    const modelConfig = this.getModelConfig(data.model?.id || data.model?.display_name);
    const displayName = this.config.components.model.show_full_name ?
      (data.model?.display_name || data.model?.id || '?') :
      modelConfig.shortName;

    const color = this.colors[this.config.components.model.color] || '';
    const resetColor = this.colors.reset;
    const icon = this.icons.model;

    return `${color}${icon} ${displayName}${resetColor}`;
  }

  /**
   * 生成分支组件
   */
  generateBranchComponent(data) {
    if (!this.config.components.branch.enabled) return null;

    let branch = data.gitBranch;
    if (!branch) {
      try {
        branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', {
          cwd: data.workspace?.current_dir || data.cwd,
          encoding: 'utf8',
          timeout: this.config.advanced.git_timeout
        }).trim();
      } catch (e) {
        branch = 'no-git';
      }
    }

    if (branch === 'no-git' && !this.config.components.branch.show_when_no_git) {
      return null;
    }

    // 截断过长的分支名
    const maxLength = this.config.components.branch.max_length;
    if (maxLength && branch.length > maxLength) {
      branch = branch.substring(0, maxLength - 3) + '...';
    }

    const color = this.colors[this.config.components.branch.color] || '';
    const resetColor = this.colors.reset;
    const icon = this.icons.branch;

    return `${color}${icon} ${branch}${resetColor}`;
  }

  /**
   * 生成Token组件
   */
  generateTokensComponent(transcriptPath) {
    if (!this.config.components.tokens.enabled) return null;

    const { tokenInfo } = this.parseTranscriptFile(transcriptPath);
    return tokenInfo;
  }

  /**
   * 生成状态组件
   */
  generateStatusComponent(transcriptPath) {
    if (!this.config.components.status.enabled) return null;

    const { status } = this.parseTranscriptFile(transcriptPath);
    return status;
  }

  // ... (继续其他方法，包括parseTranscriptFile等，需要适配配置)

  /**
   * 主要生成方法
   */
  generate(data) {
    try {
      const components = [];
      const order = this.config.components.order;

      const componentGenerators = {
        project: () => this.generateProjectComponent(data),
        model: () => this.generateModelComponent(data),
        branch: () => this.generateBranchComponent(data),
        tokens: () => this.generateTokensComponent(data.transcript_path),
        status: () => this.generateStatusComponent(data.transcript_path)
      };

      // 按配置顺序生成组件
      for (const componentName of order) {
        const generator = componentGenerators[componentName];
        if (generator) {
          const component = generator();
          if (component) {
            components.push(component);
          }
        }
      }

      // 应用样式设置
      const separator = this.config.style.separator;
      const result = components.join(separator);

      // 应用宽度限制
      const maxWidth = this.config.style.max_width;
      if (maxWidth && maxWidth > 0 && result.length > maxWidth) {
        // 这里可以实现智能截断逻辑
        return result.substring(0, maxWidth - 3) + '...';
      }

      return result;

    } catch (error) {
      return `${this.colors.red}${this.icons.error} Error${this.colors.reset}`;
    }
  }

  /**
   * 解析transcript文件（带缓存）
   */
  parseTranscriptFile(transcriptPath) {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) {
      return {
        tokenInfo: `${this.icons.token} ?/200k`,
        status: `${this.icons.warning} No Data`
      };
    }

    try {
      const stat = fs.statSync(transcriptPath);
      const currentMtime = stat.mtime.getTime();

      // 检查缓存是否仍然有效
      if (this.config.advanced.cache_enabled &&
        this.cachedTranscriptData &&
        this.lastTranscriptMtime === currentMtime) {
        return this.cachedTranscriptData;
      }

      const transcript = fs.readFileSync(transcriptPath, 'utf8');
      const lines = transcript.trim().split('\n');

      let contextUsedTokens = 0, lastStopReason = null;
      let hasError = false, lastToolCall = null;
      let lastAssistantIndex = -1;

      // 从最后一行开始解析，找到最新的assistant消息的usage信息
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const entry = JSON.parse(line);

          // Token统计
          if (entry.type === 'assistant' &&
            'message' in entry &&
            'usage' in entry.message) {

            const usage = entry.message.usage;
            const requiredKeys = ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens'];

            if (requiredKeys.every(key => key in usage)) {
              contextUsedTokens = usage.input_tokens +
                usage.cache_creation_input_tokens +
                usage.cache_read_input_tokens +
                usage.output_tokens;
              lastStopReason = entry.message.stop_reason;
              lastAssistantIndex = i;
              break;
            }
          }

        } catch (parseError) {
          // 忽略单行解析错误，继续处理其他行
        }
      }

      // 错误检测逻辑
      let assistantError = false;
      let recentErrors = false;

      if (lastAssistantIndex >= 0) {
        try {
          const assistantLine = lines[lastAssistantIndex].trim();
          if (assistantLine) {
            const assistantEntry = JSON.parse(assistantLine);
            assistantError = this.isErrorEntry(assistantEntry);
          }
        } catch (e) {
          // 忽略解析错误
        }
      }

      // 检查最近N条消息中是否有错误
      const recentErrorCount = this.config.advanced.recent_error_count;
      const recentLines = lines.slice(-recentErrorCount);
      for (const line of recentLines) {
        if (!line.trim()) continue;

        try {
          const entry = JSON.parse(line);
          if (this.isErrorEntry(entry)) {
            recentErrors = true;
            break;
          }
        } catch (parseError) {
          // 忽略单行解析错误
        }
      }

      hasError = assistantError;

      // 工具调用检测
      for (const line of recentLines) {
        if (!line.trim()) continue;

        try {
          const entry = JSON.parse(line);

          if (entry.message?.content && Array.isArray(entry.message.content)) {
            const toolUse = entry.message.content.find(item => item.type === 'tool_use');
            if (toolUse) {
              lastToolCall = toolUse.name;
            }
          }

        } catch (parseError) {
          // 忽略单行解析错误
        }
      }

      // 计算结果
      const result = this.calculateDisplayInfo(contextUsedTokens, lastStopReason, hasError, lastToolCall, recentErrors);

      // 更新缓存
      if (this.config.advanced.cache_enabled) {
        this.cachedTranscriptData = result;
        this.lastTranscriptMtime = currentMtime;
      }

      return result;

    } catch (error) {
      return {
        tokenInfo: `${this.icons.token} err/200k`,
        status: `${this.icons.warning} Parse Error`
      };
    }
  }

  /**
   * 检测条目是否包含真正的错误
   */
  isErrorEntry(entry) {
    // 检查工具使用结果中的错误，但排除权限相关的阻止
    if (entry.toolUseResult) {
      const errorMsg = entry.toolUseResult.error || entry.toolUseResult;
      if (typeof errorMsg === 'string' &&
        (errorMsg.includes('was blocked') || errorMsg.includes('For security'))) {
        return false;
      }
      if (entry.toolUseResult.error || entry.toolUseResult.type === 'error') {
        return true;
      }
    }

    // 检查消息内容中的工具错误，但排除权限相关
    if (entry.message?.content && Array.isArray(entry.message.content)) {
      return entry.message.content.some(item => {
        if (item.type === 'tool_result' && item.is_error === true) {
          const content = item.content || '';
          if (typeof content === 'string' &&
            (content.includes('was blocked') || content.includes('For security'))) {
            return false;
          }
          return true;
        }
        return false;
      });
    }

    return false;
  }

  /**
   * 生成上下文使用进度条
   */
  generateProgressBar(percentage) {
    if (!this.config.components.tokens.show_progress_bar) return '';

    const totalBars = 15;
    const backupThreshold = this.config.components.tokens.thresholds.backup;
    const mainBars = Math.floor(totalBars * backupThreshold / 100);

    const currentBars = Math.floor(totalBars * percentage / 100);
    const mainUsed = Math.min(currentBars, mainBars);
    const backupUsed = Math.max(0, currentBars - mainBars);

    // 主要区域 (实心块)
    const mainProgress = '█'.repeat(mainUsed) + '░'.repeat(mainBars - mainUsed);
    // 后备区域 (斜纹块)  
    const backupProgress = '▓'.repeat(backupUsed) + '░'.repeat(totalBars - mainBars - backupUsed);

    return `[${mainProgress}${backupProgress}]`;
  }

  /**
   * 计算显示信息
   */
  calculateDisplayInfo(contextUsedTokens, lastStopReason, hasError, lastToolCall, recentErrors = false) {
    // Token信息
    let tokenInfo = '';
    const contextWindow = 200000;
    const percentage = parseFloat(((contextUsedTokens / contextWindow) * 100).toFixed(1));

    if (this.config.components.tokens.enabled) {
      const displayTokens = contextUsedTokens >= 1000 ? `${(contextUsedTokens / 1000).toFixed(1)}k` : contextUsedTokens;
      const maxDisplay = contextWindow >= 1000 ? `${(contextWindow / 1000)}k` : contextWindow;

      // 生成进度条
      const progressBar = this.generateProgressBar(percentage);

      // 根据配置的阈值设置颜色和状态
      const thresholds = this.config.components.tokens.thresholds;
      const colors = this.config.components.tokens.colors;
      let tokenColor, statusSuffix = '';

      if (percentage < thresholds.warning) {
        tokenColor = this.colors[colors.safe] || '';
      } else if (percentage < thresholds.danger) {
        tokenColor = this.colors[colors.warning] || '';
      } else if (percentage < thresholds.critical) {
        tokenColor = this.colors[colors.danger] || '';
        statusSuffix = this.config.components.tokens.status_icons.backup || '';
      } else {
        tokenColor = this.colors[colors.danger] || '';
        statusSuffix = this.config.components.tokens.status_icons.critical || '';
      }

      // 组装token信息
      const parts = [this.icons.token];
      if (progressBar) parts.push(`${tokenColor}${progressBar}`);
      if (this.config.components.tokens.show_percentage) parts.push(`${percentage}%`);
      if (this.config.components.tokens.show_absolute) parts.push(`(${displayTokens}/${maxDisplay})`);
      if (statusSuffix) parts.push(statusSuffix);

      tokenInfo = parts.join(' ') + this.colors.reset;
    }

    // 状态信息
    let status = '';
    if (this.config.components.status.enabled) {
      const statusColors = this.config.components.status.colors;

      if (hasError) {
        status = `${this.colors[statusColors.error] || ''}${this.icons.error} Error${this.colors.reset}`;
      } else if (lastStopReason === 'tool_use') {
        const toolInfo = lastToolCall ? ` ${lastToolCall}` : '';
        status = `${this.colors[statusColors.tool] || ''}${this.icons.tool} Tool${toolInfo}${this.colors.reset}`;
      } else if (lastStopReason === 'end_turn') {
        status = `${this.colors[statusColors.ready] || ''}${this.icons.ready} Ready${this.colors.reset}`;
      } else {
        status = `${this.colors[statusColors.thinking] || ''}${this.icons.thinking} Thinking${this.colors.reset}`;
      }

      // 如果启用了最近错误显示且有最近错误
      if (!hasError && recentErrors && this.config.components.status.show_recent_errors) {
        status += `${this.colors.dim} (${this.colors.red}${this.icons.warning} Recent Error${this.colors.reset}${this.colors.dim})${this.colors.reset}`;
      }
    }

    return { tokenInfo, status };
  }
}

// 只有在直接运行时才启动主程序
if (require.main === module) {
  const statusGenerator = new ConfigurableStatuslineGenerator();

  process.stdin.setEncoding('utf8');
  let inputData = '';

  process.stdin.on('data', chunk => {
    inputData += chunk;
  });

  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(inputData.trim());
      console.log(statusGenerator.generate(data));
    } catch (error) {
      console.log(`${statusGenerator.colors.red}${statusGenerator.icons.error} Parse Error${statusGenerator.colors.reset}`);
    }
  });

  process.stdin.on('error', () => {
    console.log(`${statusGenerator.colors.red}${statusGenerator.icons.warning} Input Error${statusGenerator.colors.reset}`);
  });
}

module.exports = { ConfigurableStatuslineGenerator };