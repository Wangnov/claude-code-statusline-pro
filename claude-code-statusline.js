#!/usr/bin/env node
/**
 * 配置化的 Claude Code Statusline
 * 支持TOML配置文件的灵活定制系统
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const { configManager } = require('./config');

// 模型配置 - 将被配置文件覆盖 | Model configurations - will be overridden by config file
const MODEL_CONFIGS = {
  'claude-sonnet-4': { contextWindow: 200000, shortName: 'S4' },
  'claude-sonnet-3.7': { contextWindow: 200000, shortName: 'S3.7' },
  'claude-opus-4.1': { contextWindow: 200000, shortName: 'O4.1' }, // 修正为O4.1 | Fixed to O4.1
  'claude-haiku-3.5': { contextWindow: 200000, shortName: 'H3.5' }
};

class ConfigurableStatuslineGenerator {
  constructor(overridePreset = null) {
    this.cachedTranscriptData = null;
    this.lastTranscriptMtime = null;
    this.lastUpdate = 0;
    this.lastGeneratedResult = null; // 缓存上次生成结果 | Cache last generated result
    this.updateInterval = 300; // 官方建议的300ms更新间隔 | Official 300ms update interval
    this.config = configManager.loadConfig(null, overridePreset);
    this.setupCapabilities();
    this.setupColors();
    this.setupIcons();
  }

  /**
   * 解析官方标准输入数据格式，保持向后兼容 | Parse official standard input format with backward compatibility
   */
  parseOfficialInput(data) {
    // 支持官方标准字段 | Support official standard fields
    const parsedData = {
      // 官方字段 | Official fields
      hookEventName: data.hook_event_name || 'Status',
      sessionId: data.session_id || null,
      transcriptPath: data.transcript_path || null,
      cwd: data.cwd || process.cwd(),
      model: data.model || {},
      workspace: data.workspace || {},
      
      // 向后兼容字段 | Backward compatibility fields
      gitBranch: data.gitBranch || null
    };

    // 确保workspace有基本结构 | Ensure workspace has basic structure
    if (!parsedData.workspace.current_dir && !parsedData.workspace.project_dir) {
      parsedData.workspace.current_dir = parsedData.cwd;
      parsedData.workspace.project_dir = parsedData.cwd;
    }

    return parsedData;
  }

  /**
   * 检查更新频率限制 | Check update rate limit
   */
  shouldUpdate() {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) {
      return false;
    }
    this.lastUpdate = now;
    return true;
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
   * 主要生成方法 | Main generation method
   */
  generate(rawData) {
    try {
      // 解析官方标准输入格式 | Parse official standard input format
      const data = this.parseOfficialInput(rawData);

      // 频率控制：如果更新太频繁，返回缓存结果 | Rate limiting: return cached result if updates too frequent
      if (!this.shouldUpdate() && this.lastGeneratedResult) {
        return this.lastGeneratedResult;
      }

      const components = [];
      const order = this.config.components.order;

      const componentGenerators = {
        project: () => this.generateProjectComponent(data),
        model: () => this.generateModelComponent(data),
        branch: () => this.generateBranchComponent(data),
        tokens: () => this.generateTokensComponent(data.transcriptPath),
        status: () => this.generateStatusComponent(data.transcriptPath)
      };

      // 按配置顺序生成组件 | Generate components in configured order
      for (const componentName of order) {
        const generator = componentGenerators[componentName];
        if (generator) {
          const component = generator();
          if (component) {
            components.push(component);
          }
        }
      }

      // 应用样式设置 | Apply style settings
      const separator = this.config.style.separator;
      let result = components.join(separator);

      // 确保单行输出，移除换行符 | Ensure single-line output, remove newlines
      result = result.replace(/\n/g, ' ').replace(/\r/g, '');

      // 应用宽度限制 | Apply width limit
      const maxWidth = this.config.style.max_width;
      if (maxWidth && maxWidth > 0 && result.length > maxWidth) {
        result = result.substring(0, maxWidth - 3) + '...';
      }

      // 缓存结果 | Cache result
      this.lastGeneratedResult = result;
      return result;

    } catch (error) {
      // 简化错误输出，确保单行 | Simplified error output, ensure single line
      return `${this.icons.error} Error`;
    }
  }

  /**
   * 解析transcript文件（带缓存）| Parse transcript file (with caching)
   */
  parseTranscriptFile(transcriptPath) {
    // 改进的transcript文件存在性检查 | Improved transcript file existence check
    if (!transcriptPath) {
      // 没有transcript文件时，使用0 tokens调用正常的显示逻辑
      return this.calculateDisplayInfo(0, null, false, null, false, null, null, -1);
    }

    // 安全的文件存在性检查 | Safe file existence check
    let fileExists = false;
    try {
      fileExists = fs.existsSync(transcriptPath) && fs.statSync(transcriptPath).isFile();
    } catch (error) {
      // 文件访问错误时的优雅回退 | Graceful fallback on file access error
      return {
        tokenInfo: this.config.components.tokens.enabled ? `${this.icons.token} ?/200k` : '',
        status: this.config.components.status.enabled ? `${this.icons.warning} No Access` : ''
      };
    }

    if (!fileExists) {
      // 文件不存在时，使用0 tokens调用正常的显示逻辑
      return this.calculateDisplayInfo(0, null, false, null, false, null, null, -1);
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
      let lastAssistantIndex = -1, lastEntryType = null;

      // 首先检查最后一条记录的类型
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const entry = JSON.parse(line);
          if (lastEntryType === null) {
            lastEntryType = entry.type;
          }
          
          // Token统计 - 找到最新的assistant消息的usage信息
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
      const result = this.calculateDisplayInfo(contextUsedTokens, lastStopReason, hasError, lastToolCall, recentErrors, lastEntryType, lines, lastAssistantIndex);

      // 更新缓存
      if (this.config.advanced.cache_enabled) {
        this.cachedTranscriptData = result;
        this.lastTranscriptMtime = currentMtime;
      }

      return result;

    } catch (error) {
      // 简化错误输出 | Simplified error output
      return {
        tokenInfo: this.config.components.tokens.enabled ? `${this.icons.token} ?/200k` : '',
        status: this.config.components.status.enabled ? `${this.icons.warning} Error` : ''
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
  calculateDisplayInfo(contextUsedTokens, lastStopReason, hasError, lastToolCall, recentErrors = false, lastEntryType = null, lines = null, lastAssistantIndex = -1) {
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
      } else if (lastStopReason === null) {
        // 当stop_reason为null时，需要更智能的判断
        if (lastEntryType === 'user') {
          // 最后一条是用户消息，Claude正在思考
          status = `${this.colors[statusColors.thinking] || ''}${this.icons.thinking} Thinking${this.colors.reset}`;
        } else if (lastEntryType === 'assistant') {
          // 最后一条是assistant消息但stop_reason为null
          // 使用简单的tokens数量判断：少于50tokens可能是中间状态
          let isComplete = true;
          try {
            const assistantLine = lines[lastAssistantIndex].trim();
            const assistantEntry = JSON.parse(assistantLine);
            if (assistantEntry.message && assistantEntry.message.usage) {
              const outputTokens = assistantEntry.message.usage.output_tokens || 0;
              if (outputTokens < 50) {
                isComplete = false;
              }
            }
          } catch (e) {
            // 解析错误时默认为完成
          }
          
          if (isComplete) {
            status = `${this.colors[statusColors.ready] || ''}${this.icons.ready} Ready${this.colors.reset}`;
          } else {
            status = `${this.colors[statusColors.thinking] || ''}${this.icons.thinking} Thinking${this.colors.reset}`;
          }
        } else {
          // 其他情况（如新会话）默认为ready
          status = `${this.colors[statusColors.ready] || ''}${this.icons.ready} Ready${this.colors.reset}`;
        }
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

  /**
   * 生成调试信息显示
   */
  generateDebugInfo(rawInput) {
    if (!rawInput) return '';
    
    try {
      const data = JSON.parse(rawInput);
      const debugLines = [];
      
      // 调试信息标题
      debugLines.push(`${this.colors.cyan || ''}━━━ DEBUG INFO ━━━${this.colors.reset || ''}`);
      
      // 显示原始JSON数据（格式化）
      const formattedJson = JSON.stringify(data, null, 2);
      const jsonLines = formattedJson.split('\n');
      
      jsonLines.forEach(line => {
        const coloredLine = this.colorizeJsonLine(line);
        debugLines.push(`${this.colors.dim || ''}${coloredLine}${this.colors.reset || ''}`);
      });
      
      // 关键字段提取
      debugLines.push(`${this.colors.cyan || ''}━━━ KEY FIELDS ━━━${this.colors.reset || ''}`);
      if (data.model?.id) {
        debugLines.push(`${this.colors.blue || ''}Model:${this.colors.reset || ''} ${data.model.id}`);
      }
      if (data.transcript_path) {
        debugLines.push(`${this.colors.blue || ''}Transcript:${this.colors.reset || ''} ${data.transcript_path}`);
      }
      if (data.cwd) {
        debugLines.push(`${this.colors.blue || ''}CWD:${this.colors.reset || ''} ${data.cwd}`);
      }
      if (data.session_id) {
        debugLines.push(`${this.colors.blue || ''}Session:${this.colors.reset || ''} ${data.session_id}`);
      }
      
      return debugLines.join('\n');
    } catch (error) {
      return `${this.colors.red || ''}DEBUG ERROR: Invalid JSON${this.colors.reset || ''}`;
    }
  }

  /**
   * 为JSON行添加颜色
   */
  colorizeJsonLine(line) {
    // 字段名着色（引号内的键名）
    line = line.replace(/"([^"]+)":/g, `${this.colors.green || ''}"$1"${this.colors.reset || ''}:`);
    
    // 字符串值着色
    line = line.replace(/: "([^"]*)"([,}]?)/g, `: ${this.colors.yellow || ''}"$1"${this.colors.reset || ''}$2`);
    
    // 数字值着色
    line = line.replace(/: (\d+)([,}]?)/g, `: ${this.colors.cyan || ''}$1${this.colors.reset || ''}$2`);
    
    // 布尔值着色
    line = line.replace(/: (true|false)([,}]?)/g, `: ${this.colors.magenta || ''}$1${this.colors.reset || ''}$2`);
    
    // null值着色
    line = line.replace(/: null([,}]?)/g, `: ${this.colors.dim || ''}null${this.colors.reset || ''}$1`);
    
    return line;
  }
}

// 解析命令行参数 | Parse command line arguments
function parseCommandLineArgs() {
  const args = process.argv.slice(2);
  let overridePreset = null;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--preset' || arg === '-p') {
      // --preset PMBTS 或 -p MT
      if (i + 1 < args.length) {
        overridePreset = args[i + 1];
        i++; // 跳过下一个参数
      }
    } else if (arg.startsWith('--preset=')) {
      // --preset=PMBTS
      overridePreset = arg.split('=')[1];
    } else if (arg.match(/^[PMBTSA-Z]+$/)) {
      // 直接的预设字符串，如 PMBTS 或 MT
      overridePreset = arg;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Claude Code Statusline Pro - 预设组件排布系统
      
使用方法:
  npx claude-code-statusline-pro [preset]
  npx claude-code-statusline-pro --preset [preset]
  npx claude-code-statusline-pro -p [preset]
  
预设字符说明:
  P = project  (项目名称)
  M = model    (模型信息)  
  B = branch   (Git分支)
  T = tokens   (Token使用情况)
  S = status   (状态信息)
  
示例:
  npx claude-code-statusline-pro PMBTS    # 显示所有组件
  npx claude-code-statusline-pro MT       # 仅显示模型和token
  npx claude-code-statusline-pro --preset BT  # 仅显示分支和token

调试功能:
  在statusline.config.toml中设置 advanced.debug_mode = true 
  开启后会在statusline下方显示接收到的JSON数据，用于调试和排错
`);
      process.exit(0);
    }
  }
  
  return overridePreset;
}

// 只有在直接运行时才启动主程序
if (require.main === module) {
  const overridePreset = parseCommandLineArgs();
  const statusGenerator = new ConfigurableStatuslineGenerator(overridePreset);

  process.stdin.setEncoding('utf8');
  let inputData = '';

  process.stdin.on('data', chunk => {
    inputData += chunk;
  });

  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(inputData.trim());
      const result = statusGenerator.generate(data);
      
      // 检查是否启用debug模式
      if (statusGenerator.config.advanced.debug_mode) {
        console.log(result);
        console.log(statusGenerator.generateDebugInfo(inputData.trim()));
      } else {
        console.log(result);
      }
    } catch (error) {
      // 简化错误输出，确保单行 | Simplified error output, ensure single line
      console.log(`${statusGenerator.icons.error} Parse Error`);
    }
  });

  process.stdin.on('error', () => {
    // 简化错误输出，确保单行 | Simplified error output, ensure single line  
    console.log(`${statusGenerator.icons.warning} Input Error`);
  });
}

module.exports = { ConfigurableStatuslineGenerator };