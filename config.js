/**
 * 配置管理模块
 * 负责加载、验证和管理statusline配置
 */

const fs = require('fs');
const path = require('path');
const TOML = require('@iarna/toml');

class ConfigManager {
  constructor() {
    this.config = null;
    this.configPath = null;
    this.defaults = this.getDefaultConfig();
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig() {
    return {
      components: {
        order: ["project", "model", "branch", "tokens", "status"],
        project: {
          enabled: true,
          icon: "📁",
          color: "magenta",
          show_when_empty: false
        },
        model: {
          enabled: true,
          icon: "🤖",
          color: "cyan",
          show_full_name: false,
          custom_names: {
            "claude-sonnet-4": "S4",
            "claude-opus-4.1": "O4.1",
            "claude-haiku-3.5": "H3.5"
          }
        },
        branch: {
          enabled: true,
          icon: "🌿",
          color: "green",
          show_when_no_git: false,
          max_length: 20
        },
        tokens: {
          enabled: true,
          icon: "📊",
          show_progress_bar: true,
          show_percentage: true,
          show_absolute: true,
          colors: {
            safe: "green",
            warning: "yellow",
            danger: "red"
          },
          thresholds: {
            warning: 60,
            danger: 85,
            backup: 85,
            critical: 95
          },
          status_icons: {
            backup: "⚡",
            critical: "🔥"
          }
        },
        status: {
          enabled: true,
          show_recent_errors: true,
          icons: {
            ready: "✅",
            thinking: "💭",
            tool: "🔧",
            error: "❌",
            warning: "⚠️"
          },
          colors: {
            ready: "green",
            thinking: "yellow",
            tool: "blue",
            error: "red"
          }
        }
      },
      style: {
        separator: " | ",
        enable_colors: "auto",
        enable_emoji: "auto",
        compact_mode: false,
        max_width: 0
      },
      advanced: {
        cache_enabled: true,
        recent_error_count: 20,
        git_timeout: 1000,
        custom_color_codes: {}
      },
      experimental: {
        show_context_health: false,
        adaptive_colors: false,
        show_timestamp: false,
        show_session_info: false
      }
    };
  }

  /**
   * 查找配置文件
   */
  findConfigFile() {
    const possiblePaths = [
      // 当前目录
      path.join(process.cwd(), 'statusline.config.toml'),
      path.join(process.cwd(), '.statusline.toml'),
      // 用户主目录
      path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'claude-statusline', 'config.toml'),
      path.join(process.env.HOME || process.env.USERPROFILE, '.statusline.toml'),
      // 脚本目录
      path.join(__dirname, 'statusline.config.toml')
    ];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    return null;
  }

  /**
   * 加载配置文件
   */
  loadConfig(customPath = null) {
    try {
      // 使用指定路径或查找配置文件
      this.configPath = customPath || this.findConfigFile();
      
      if (!this.configPath) {
        console.warn('未找到配置文件，使用默认配置');
        this.config = this.defaults;
        return this.config;
      }

      // 读取并解析TOML文件
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      const parsedConfig = TOML.parse(configContent);
      
      // 深度合并配置（用户配置覆盖默认配置）
      this.config = this.deepMerge(this.defaults, parsedConfig);
      
      // 验证配置
      this.validateConfig();
      
      return this.config;
      
    } catch (error) {
      console.error(`配置加载失败: ${error.message}`);
      console.warn('使用默认配置');
      this.config = this.defaults;
      return this.config;
    }
  }

  /**
   * 深度合并对象
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * 验证配置
   */
  validateConfig() {
    if (!this.config) return;

    // 验证组件顺序
    if (!Array.isArray(this.config.components?.order)) {
      this.config.components.order = this.defaults.components.order;
    }

    // 验证颜色值
    const validColors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'bright_red', 'bright_green', 'bright_yellow', 'bright_blue', 'bright_magenta', 'bright_cyan', 'bright_white'];
    
    this.validateColorConfig(this.config.components?.tokens?.colors, this.defaults.components.tokens.colors);
    this.validateColorConfig(this.config.components?.status?.colors, this.defaults.components.status.colors);

    // 验证阈值
    const thresholds = this.config.components?.tokens?.thresholds;
    if (thresholds) {
      if (thresholds.warning >= thresholds.danger) {
        console.warn('警告阈值应小于危险阈值，已重置为默认值');
        this.config.components.tokens.thresholds = this.defaults.components.tokens.thresholds;
      }
    }
  }

  /**
   * 验证颜色配置
   */
  validateColorConfig(colorConfig, defaultColors) {
    if (!colorConfig) return;
    
    const validColors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray'];
    
    for (const [key, value] of Object.entries(colorConfig)) {
      if (!validColors.includes(value) && !value.startsWith('\x1b[')) {
        console.warn(`无效的颜色值 "${value}"，使用默认颜色 "${defaultColors[key]}"`);
        colorConfig[key] = defaultColors[key];
      }
    }
  }

  /**
   * 获取配置值（支持点号路径）
   */
  get(path, defaultValue = null) {
    if (!this.config) {
      this.loadConfig();
    }

    const keys = path.split('.');
    let current = this.config;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  }

  /**
   * 检查功能是否启用
   */
  isEnabled(componentName) {
    return this.get(`components.${componentName}.enabled`, true);
  }

  /**
   * 应用主题
   */
  applyTheme(themeName) {
    if (!this.config) {
      this.loadConfig();
    }

    const theme = this.config.themes?.[themeName];
    if (!theme) {
      console.warn(`主题 "${themeName}" 不存在`);
      return false;
    }

    // 应用主题配置（深度合并）
    this.config = this.deepMerge(this.config, theme);
    
    return true;
  }

  /**
   * 获取当前配置的摘要信息
   */
  getConfigSummary() {
    if (!this.config) return null;

    return {
      configPath: this.configPath,
      enabledComponents: this.config.components.order.filter(name => 
        this.config.components[name]?.enabled !== false
      ),
      colorsEnabled: this.config.style.enable_colors,
      emojiEnabled: this.config.style.enable_emoji,
      compactMode: this.config.style.compact_mode
    };
  }
}

// 单例实例
const configManager = new ConfigManager();

module.exports = { ConfigManager, configManager };