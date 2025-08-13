/**
 * 主题引擎核心类 | Theme engine core class
 * 负责主题配置应用和特性处理 | Responsible for theme config application and feature processing
 */

import type { Config, StyleConfig, TokensComponentConfig } from '../config/schema.js';
import { deepClone } from '../utils/index.js';
import type { ThemeApplicationResult, ThemeConfig, ThemesConfig } from './types.js';
import { BUILTIN_THEMES } from './types.js';

/**
 * 主题引擎类 | Theme engine class
 */
export class ThemeEngine {
  private readonly themes: Record<string, ThemeConfig>;

  constructor(customThemes?: ThemesConfig) {
    // 合并内置主题和用户自定义主题 | Merge builtin themes and custom themes
    this.themes = { ...BUILTIN_THEMES };
    if (customThemes) {
      for (const [name, config] of Object.entries(customThemes)) {
        if (config) {
          this.themes[name] = config;
        }
      }
    }
  }

  /**
   * 应用主题到配置 | Apply theme to config
   */
  applyTheme(baseConfig: Config, themeName: string): ThemeApplicationResult {
    const theme = this.themes[themeName];
    if (!theme) {
      console.warn(
        `主题 '${themeName}' 不存在，使用classic主题 | Theme '${themeName}' not found, using classic theme`
      );
      return this.applyTheme(baseConfig, 'classic');
    }

    try {
      // 深拷贝基础配置 | Deep clone base config
      const result = deepClone(baseConfig);

      // 应用主题特性 | Apply theme features
      this.applyThemeFeatures(result, theme);

      return {
        config: result,
        themeName,
        themeConfig: theme,
        success: true,
      };
    } catch (error) {
      console.error(`应用主题 '${themeName}' 失败 | Failed to apply theme '${themeName}':`, error);
      return {
        config: baseConfig,
        themeName: 'classic',
        themeConfig: BUILTIN_THEMES.classic!,
        success: false,
        warnings: [
          `主题应用失败，回退到classic主题 | Theme application failed, falling back to classic theme`,
        ],
      };
    }
  }

  /**
   * 应用主题特性 | Apply theme features
   */
  private applyThemeFeatures(config: Config, theme: ThemeConfig): void {
    // 1. 渐变色配置 | Gradient colors configuration
    if (theme.enable_gradient) {
      this.enableGradientFeatures(config);
    }

    // 2. 分隔符处理 | Separator handling
    if (theme.ignore_separator) {
      this.configureIgnoreSeparator(config);
    }

    // 3. 精细进度条 | Fine progress bar
    if (theme.fine_progress) {
      this.configureFineProgress(config);
    }

    // 4. 胶囊样式 | Capsule style
    if (theme.capsule_style) {
      this.configureCapsuleStyle(config);
    }
  }

  /**
   * 启用渐变特性 | Enable gradient features
   */
  private enableGradientFeatures(config: Config): void {
    // 启用tokens组件的渐变功能 | Enable gradient features for tokens component
    if (config.components?.tokens) {
      const tokensConfig = config.components.tokens as TokensComponentConfig;

      // 启用渐变显示 | Enable gradient display
      tokensConfig.show_gradient = true;

      // 优化渐变效果的进度条宽度 | Optimize progress bar width for gradient effect
      if (tokensConfig.progress_width > 15) {
        tokensConfig.progress_width = 12;
      }
    }
  }

  /**
   * 配置忽略分隔符 | Configure ignore separator
   */
  private configureIgnoreSeparator(config: Config): void {
    // Powerline和Capsule主题使用特殊分隔符 | Powerline and Capsule themes use special separators
    if (config.style) {
      config.style.separator = ''; // 清空常规分隔符 | Clear regular separator
      (config.style as StyleConfig).separator_before = ''; // 去除前置空格 | Remove leading space
      (config.style as StyleConfig).separator_after = ''; // 去除后置空格 | Remove trailing space
    }
  }

  /**
   * 配置精细进度条 | Configure fine progress bar
   */
  private configureFineProgress(config: Config): void {
    // 精细进度条配置（仅在nerdFont支持时生效） | Fine progress bar config (only effective with nerdFont support)
    if (config.components?.tokens) {
      const tokensConfig = config.components.tokens as TokensComponentConfig;
      tokensConfig.progress_width = 8; // 更紧凑 | More compact

      // 设置精细进度条字符 | Set fine progress bar characters
      tokensConfig.progress_bar_chars = {
        filled: '█',
        empty: ' ',
        backup: '▓',
      };
    }
  }

  /**
   * 配置胶囊样式 | Configure capsule style
   */
  private configureCapsuleStyle(config: Config): void {
    // Capsule主题的特殊样式配置 | Special style config for Capsule theme
    if (config.components) {
      // 使用更亮的颜色 | Use brighter colors
      this.upgradeComponentColors(config.components);

      // 设置胶囊样式标记 | Set capsule style flag
      if (config.style) {
        (config.style as Record<string, unknown>).capsule_mode = true;
      }
    }
  }

  /**
   * 升级组件颜色 | Upgrade component colors
   */
  private upgradeComponentColors(components: Config['components']): void {
    if (!components) return;

    const colorUpgrades: Record<string, string> = {
      blue: 'bright_blue',
      cyan: 'bright_cyan',
      green: 'bright_green',
      yellow: 'bright_yellow',
      magenta: 'bright_magenta',
      red: 'bright_red',
    };

    // 遍历所有组件 | Iterate through all components
    for (const component of Object.values(components)) {
      if (component && typeof component === 'object') {
        // 升级颜色配置 | Upgrade color configurations
        if ('icon_color' in component && component.icon_color) {
          const currentColor = component.icon_color as string;
          const newColor = colorUpgrades[currentColor] || currentColor;
          if (newColor in colorUpgrades || currentColor === newColor) {
            (component as Record<string, unknown>).icon_color = newColor;
          }
        }
        if ('text_color' in component && component.text_color) {
          const currentColor = component.text_color as string;
          const newColor = colorUpgrades[currentColor] || currentColor;
          if (newColor in colorUpgrades || currentColor === newColor) {
            (component as Record<string, unknown>).text_color = newColor;
          }
        }
      }
    }
  }

  /**
   * 获取主题配置 | Get theme config
   */
  getThemeConfig(themeName: string): ThemeConfig | null {
    return this.themes[themeName] || null;
  }

  /**
   * 检查主题是否存在 | Check if theme exists
   */
  hasTheme(themeName: string): boolean {
    return themeName in this.themes;
  }

  /**
   * 获取可用主题列表 | Get available themes list
   */
  getAvailableThemes(): string[] {
    return Object.keys(this.themes);
  }

  /**
   * 获取内置主题列表 | Get builtin themes list
   */
  getBuiltinThemes(): string[] {
    return Object.keys(BUILTIN_THEMES);
  }

  /**
   * 获取自定义主题列表 | Get custom themes list
   */
  getCustomThemes(): string[] {
    const builtinThemes = new Set(Object.keys(BUILTIN_THEMES));
    return Object.keys(this.themes).filter((name) => !builtinThemes.has(name));
  }

  /**
   * 注册自定义主题 | Register custom theme
   */
  registerTheme(name: string, config: ThemeConfig): void {
    if (name in BUILTIN_THEMES) {
      console.warn(`不能覆盖内置主题 '${name}' | Cannot override builtin theme '${name}'`);
      return;
    }

    this.themes[name] = config;
  }

  /**
   * 删除自定义主题 | Remove custom theme
   */
  removeTheme(name: string): boolean {
    if (name in BUILTIN_THEMES) {
      console.warn(`不能删除内置主题 '${name}' | Cannot remove builtin theme '${name}'`);
      return false;
    }

    if (name in this.themes) {
      delete this.themes[name];
      return true;
    }

    return false;
  }

  /**
   * 克隆主题引擎 | Clone theme engine
   */
  clone(): ThemeEngine {
    const customThemes: ThemesConfig = {};
    const builtinThemes = new Set(Object.keys(BUILTIN_THEMES));

    for (const [name, config] of Object.entries(this.themes)) {
      if (!builtinThemes.has(name)) {
        customThemes[name] = config;
      }
    }

    return new ThemeEngine(customThemes);
  }
}
