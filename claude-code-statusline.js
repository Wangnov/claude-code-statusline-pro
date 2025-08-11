#!/usr/bin/env node
/**
 * 改进版 Claude Code Statusline
 * 基于原版本的增强实现，包含性能优化和功能扩展
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// 模型配置 - 支持动态token限制检测
const MODEL_CONFIGS = {
  'claude-sonnet-4': { contextWindow: 200000, shortName: 'S4' },
  'claude-sonnet-3.7': { contextWindow: 200000, shortName: 'S3.5' },
  'claude-opus-4.1': { contextWindow: 200000, shortName: 'O4' },
  'claude-haiku-3.5': { contextWindow: 200000, shortName: 'H3.5' }
};

// 检测终端能力
const terminalCapabilities = {
  emoji: process.platform !== 'win32' ||
    process.env.WT_SESSION ||
    process.env.TERM_PROGRAM === 'vscode' ||
    process.env.ConEmuPID,
  colors: process.env.COLORTERM === 'truecolor' ||
    process.env.TERM?.includes('256') ||
    process.env.TERM_PROGRAM === 'vscode'
};

// ANSI颜色代码
const colors = terminalCapabilities.colors ? {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
} : {
  reset: '', bright: '', dim: '', red: '', green: '',
  yellow: '', blue: '', magenta: '', cyan: '', white: '', gray: ''
};

// 图标集
const icons = terminalCapabilities.emoji ? {
  model: '🤖', branch: '🌿', token: '📊', ready: '✅',
  tool: '🔧', thinking: '💭', paused: '⏸️', error: '❌',
  warning: '⚠️', clock: '⏰', project: '📁'
} : {
  model: '[M]', branch: '[B]', token: '[T]', ready: '[OK]',
  tool: '[TOOL]', thinking: '[...]', paused: '[PAUSE]',
  error: '[ERR]', warning: '[WARN]', clock: '[T]', project: '[P]'
};

class StatuslineGenerator {
  constructor() {
    this.cachedTranscriptData = null;
    this.lastTranscriptMtime = null;
  }

  /**
   * 获取模型配置信息
   */
  getModelConfig(modelId) {
    if (!modelId) return { contextWindow: 200000, shortName: '?' };

    const modelKey = Object.keys(MODEL_CONFIGS).find(key =>
      modelId.toLowerCase().includes(key.toLowerCase())
    );

    if (modelKey) {
      return MODEL_CONFIGS[modelKey];
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

    return { contextWindow: 200000, shortName };
  }

  /**
   * 获取Git分支信息
   */
  getGitBranch(data) {
    if (data.gitBranch) return data.gitBranch;

    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', {
        cwd: data.workspace?.current_dir || data.cwd,
        encoding: 'utf8',
        timeout: 1000 // 添加超时防止卡顿
      }).trim();
      return branch || 'main';
    } catch (e) {
      return 'no-git';
    }
  }

  /**
   * 获取项目名称
   */
  getProjectName(data) {
    const projectPath = data.workspace?.project_dir || data.workspace?.current_dir || data.cwd;
    if (!projectPath) return null;

    const projectName = path.basename(projectPath);
    return projectName !== '.' ? projectName : null;
  }

  /**
   * 解析transcript文件（带缓存）
   */
  parseTranscriptFile(transcriptPath) {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) {
      return { tokenInfo: `${icons.token} ?/200k`, status: `${icons.warning} No Data` };
    }

    try {
      const stat = fs.statSync(transcriptPath);
      const currentMtime = stat.mtime.getTime();

      // 检查缓存是否仍然有效
      if (this.cachedTranscriptData && this.lastTranscriptMtime === currentMtime) {
        return this.cachedTranscriptData;
      }

      const transcript = fs.readFileSync(transcriptPath, 'utf8');
      const lines = transcript.trim().split('\n');

      let contextUsedTokens = 0, lastStopReason = null;
      let hasError = false, lastToolCall = null;

      let lastAssistantIndex = -1;

      // 从最后一行开始解析，找到最新的assistant消息的usage信息
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim(); // 模拟Python的strip()
        if (!line) continue;

        try {
          const entry = JSON.parse(line);

          // Token统计 - 完全模拟Python脚本的条件检查
          if (entry.type === 'assistant' &&
            'message' in entry &&
            'usage' in entry.message) {

            const usage = entry.message.usage;
            const requiredKeys = ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens'];

            // 模拟Python的all()函数检查
            if (requiredKeys.every(key => key in usage)) {
              contextUsedTokens = usage.input_tokens +
                usage.cache_creation_input_tokens +
                usage.cache_read_input_tokens +
                usage.output_tokens;
              lastStopReason = entry.message.stop_reason;
              lastAssistantIndex = i;
              break; // 找到第一个匹配后退出
            }
          }

        } catch (parseError) {
          // 忽略单行解析错误，继续处理其他行
        }
      }

      // 错误检测逻辑：
      // 1. 检查最新assistant消息是否因错误停止
      let assistantError = false;
      let recentErrors = false;

      if (lastAssistantIndex >= 0) {
        try {
          const assistantLine = lines[lastAssistantIndex].trim();
          if (assistantLine) {
            const assistantEntry = JSON.parse(assistantLine);
            // 检查assistant消息本身是否是错误响应
            assistantError = this.isErrorEntry(assistantEntry);
          }
        } catch (e) {
          // 忽略解析错误
        }
      }

      // 2. 检查最近20条消息中是否有错误（用于括号提示）
      const recentLines = lines.slice(-20);
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

      // 工具调用检测 - 复用上面的recentLines
      for (const line of recentLines) {
        if (!line.trim()) continue;

        try {
          const entry = JSON.parse(line);

          // 工具调用检测
          if (entry.message?.content && Array.isArray(entry.message.content)) {
            const toolUse = entry.message.content.find(item => item.type === 'tool_use');
            if (toolUse) {
              lastToolCall = toolUse.name;
            }
          }

        } catch (parseError) {
          // 忽略单行解析错误，继续处理其他行
        }
      }

      // 计算结果
      const result = this.calculateDisplayInfo(contextUsedTokens, lastStopReason, hasError, lastToolCall, recentErrors);

      // 更新缓存
      this.cachedTranscriptData = result;
      this.lastTranscriptMtime = currentMtime;

      return result;

    } catch (error) {
      return { tokenInfo: `${icons.token} err/200k`, status: `${icons.warning} Parse Error` };
    }
  }

  /**
   * 检测条目是否包含真正的错误（排除权限限制等正常情况）
   */
  isErrorEntry(entry) {
    // 检查工具使用结果中的错误，但排除权限相关的阻止
    if (entry.toolUseResult) {
      const errorMsg = entry.toolUseResult.error || entry.toolUseResult;
      if (typeof errorMsg === 'string' &&
        (errorMsg.includes('was blocked') || errorMsg.includes('For security'))) {
        return false; // 权限阻止不算真正错误
      }
      if (entry.toolUseResult.error || entry.toolUseResult.type === 'error') {
        return true;
      }
    }

    // 检查消息内容中的工具错误，但排除权限相关
    if (entry.message?.content && Array.isArray(entry.message.content)) {
      return entry.message.content.some(item => {
        if (item.type === 'tool_result' && item.is_error === true) {
          // 检查是否是权限相关的阻止
          const content = item.content || '';
          if (typeof content === 'string' &&
            (content.includes('was blocked') || content.includes('For security'))) {
            return false; // 权限阻止不算真正错误
          }
          return true; // 其他错误才算真正错误
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
    const totalBars = 15;
    const mainThreshold = 85; // 主要区域阈值
    const mainBars = Math.floor(totalBars * mainThreshold / 100); // 85%对应的进度条数量

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
    let tokenInfo;
    const contextWindow = 200000;
    const percentage = parseFloat(((contextUsedTokens / contextWindow) * 100).toFixed(1));
    const displayTokens = contextUsedTokens >= 1000 ? `${(contextUsedTokens / 1000).toFixed(1)}k` : contextUsedTokens;
    const maxDisplay = contextWindow >= 1000 ? `${(contextWindow / 1000)}k` : contextWindow;

    // 生成进度条
    const progressBar = this.generateProgressBar(percentage);

    // 根据使用区域设置颜色和状态
    let tokenColor, statusSuffix = '';
    const mainThreshold = 85;

    if (percentage < 60) {
      tokenColor = colors.green;
    } else if (percentage < mainThreshold) {
      tokenColor = colors.yellow;
    } else if (percentage < 95) {
      tokenColor = colors.red;
      statusSuffix = '⚡'; // 进入后备区域
    } else {
      tokenColor = colors.red;
      statusSuffix = '🔥'; // 深度使用后备区域
    }

    tokenInfo = `${icons.token} ${tokenColor}${progressBar} ${percentage}%(${displayTokens}/${maxDisplay})${statusSuffix}${colors.reset}`;

    // 状态信息
    let status;
    if (hasError) {
      // assistant消息本身有错误，直接显示Error
      status = `${colors.red}${icons.error} Error${colors.reset}`;
    } else if (lastStopReason === 'tool_use') {
      const toolInfo = lastToolCall ? ` ${lastToolCall}` : '';
      status = `${colors.blue}${icons.tool} Tool${toolInfo}${colors.reset}`;
    } else if (lastStopReason === 'end_turn') {
      status = `${colors.green}${icons.ready} Ready${colors.reset}`;
    } else {
      status = `${colors.yellow}${icons.thinking} Thinking${colors.reset}`;
    }

    // 如果最近有错误但不是assistant直接错误，添加错误提示
    if (!hasError && recentErrors) {
      status += `${colors.dim} (${colors.red}${icons.warning} Recent Error${colors.reset}${colors.dim})${colors.reset}`;
    }

    return { tokenInfo, status };
  }

  /**
   * 生成状态行
   */
  generate(data) {
    try {
      // 项目信息（放在第一位）
      const projectName = this.getProjectName(data);
      const projectDisplay = projectName ?
        `${colors.magenta}${icons.project} ${projectName}${colors.reset}` : '';

      // 模型信息
      const modelConfig = this.getModelConfig(data.model?.id || data.model?.display_name);
      const modelDisplay = `${colors.cyan}${icons.model} ${modelConfig.shortName}${colors.reset}`;

      // Git分支（没有git就不显示）
      const branch = this.getGitBranch(data);
      const branchDisplay = (branch && branch !== 'no-git') ?
        `${colors.green}${icons.branch} ${branch}${colors.reset}` : '';

      // Token信息和状态
      const { tokenInfo, status } = this.parseTranscriptFile(data.transcript_path);

      // 组装输出
      const parts = [];
      if (projectDisplay) parts.push(projectDisplay);
      parts.push(modelDisplay);
      if (branchDisplay) parts.push(branchDisplay);
      parts.push(tokenInfo);
      parts.push(status);

      return parts.join(' | ');

    } catch (error) {
      return `${colors.red}${icons.error} Error${colors.reset}`;
    }
  }
}

// 只有在直接运行时才启动主程序
if (require.main === module) {
  // 主程序
  const statusGenerator = new StatuslineGenerator();

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
      console.log(`${colors.red}${icons.error} Parse Error${colors.reset}`);
    }
  });

  process.stdin.on('error', () => {
    console.log(`${colors.red}${icons.warning} Input Error${colors.reset}`);
  });
}

// 导出类以便测试
module.exports = { StatuslineGenerator };