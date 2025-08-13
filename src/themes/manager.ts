/**
 * 主题管理器 | Theme manager
 * 负责主题切换、验证和兼容性检查 | Responsible for theme switching, validation and compatibility checking
 */

import type { Config } from '../config/schema.js';
import type { TerminalCapabilities } from '../terminal/detector.js';
import { ThemeEngine } from './engine.js';
import type {
  ThemeApplicationResult,
  ThemeCompatibilityResult,
  ThemeConfig,
  ThemeFeatures,
  ThemeManagerOptions,
  ValidationResult,
} from './types.js';

/**
 * 主题管理器类 | Theme manager class
 */
export class ThemeManager {
  private currentTheme: string;
  private themeEngine: ThemeEngine;
  private baseConfig: Config;
  private options: Required<ThemeManagerOptions>;

  constructor(baseConfig: Config, options: ThemeManagerOptions = {}) {
    this.baseConfig = baseConfig;
    this.options = {
      strictValidation: options.strictValidation ?? false,
      autoFallback: options.autoFallback ?? true,
      customThemes: options.customThemes ?? {},
    };

    this.themeEngine = new ThemeEngine(this.options.customThemes);
    this.currentTheme = baseConfig.theme || 'classic';
  }

  /**
   * 获取当前主题 | Get current theme
   */
  getCurrentTheme(): string {
    return this.currentTheme;
  }

  /**
   * 切换主题 | Switch theme
   */
  switchTheme(themeName: string): ThemeApplicationResult {
    // 验证主题 | Validate theme
    if (!this.isValidTheme(themeName)) {
      if (this.options.autoFallback) {
        console.warn(
          `无效的主题 '${themeName}'，回退到classic主题 | Invalid theme '${themeName}', falling back to classic theme`
        );
        themeName = 'classic';
      } else {
        throw new Error(`无效的主题: ${themeName} | Invalid theme: ${themeName}`);
      }
    }

    // 应用主题 | Apply theme
    const result = this.themeEngine.applyTheme(this.baseConfig, themeName);

    if (result.success) {
      this.currentTheme = themeName;
      // 更新基础配置中的主题设置 | Update theme setting in base config
      const validTheme = ['classic', 'powerline', 'capsule'].includes(themeName)
        ? (themeName as 'classic' | 'powerline' | 'capsule')
        : 'classic';
      this.baseConfig = { ...this.baseConfig, theme: validTheme };
    }

    return result;
  }

  /**
   * 获取可用主题列表 | Get available themes list
   */
  getAvailableThemes(): string[] {
    return this.themeEngine.getAvailableThemes();
  }

  /**
   * 检查主题是否有效 | Check if theme is valid
   */
  isValidTheme(themeName: string): boolean {
    return this.themeEngine.hasTheme(themeName);
  }

  /**
   * 预览主题而不切换 | Preview theme without switching
   */
  previewTheme(themeName: string): ThemeApplicationResult {
    return this.themeEngine.applyTheme(this.baseConfig, themeName);
  }

  /**
   * 获取主题配置详情 | Get theme configuration details
   */
  getThemeConfig(themeName: string): ThemeConfig | null {
    return this.themeEngine.getThemeConfig(themeName);
  }

  /**
   * 检查主题兼容性 | Check theme compatibility
   */
  checkThemeCompatibility(
    themeName: string,
    capabilities: TerminalCapabilities
  ): ThemeCompatibilityResult {
    const themeConfig = this.getThemeConfig(themeName);
    if (!themeConfig) {
      return {
        compatible: false,
        fallbackTheme: 'classic',
        notes: [`主题 '${themeName}' 不存在 | Theme '${themeName}' does not exist`],
      };
    }

    const features = this.getThemeFeatures(themeConfig);
    const notes: string[] = [];
    let compatible = true;
    let fallbackTheme = 'classic';

    // 检查Nerd Font支持 | Check Nerd Font support
    if (features.requiresNerdFont && !capabilities.nerdFont) {
      compatible = false;
      fallbackTheme = 'classic';
      notes.push(
        `主题 '${themeName}' 需要Nerd Font支持，当前终端不支持 | Theme '${themeName}' requires Nerd Font support, current terminal doesn't support it`
      );
    }

    // 检查颜色支持 | Check color support
    if (features.requiresColors && !capabilities.colors) {
      notes.push(
        `主题 '${themeName}' 需要颜色支持，当前终端不支持，效果可能不佳 | Theme '${themeName}' requires color support, current terminal doesn't support it, effects may be poor`
      );
    }

    // 检查表情符号支持 | Check emoji support
    if (!capabilities.emoji) {
      notes.push(
        "当前终端不支持表情符号，将使用文本图标 | Current terminal doesn't support emoji, text icons will be used"
      );
    }

    const result: ThemeCompatibilityResult = {
      compatible,
      notes,
    };

    if (!compatible && fallbackTheme) {
      result.fallbackTheme = fallbackTheme;
    }

    return result;
  }

  /**
   * 获取主题特性 | Get theme features
   */
  getThemeFeatures(themeConfig: ThemeConfig): ThemeFeatures {
    return {
      requiresNerdFont: themeConfig.fine_progress || themeConfig.capsule_style,
      requiresColors: themeConfig.enable_gradient,
      supportsGradient: themeConfig.enable_gradient,
      customSeparators: themeConfig.ignore_separator,
    };
  }

  /**
   * 验证主题配置 | Validate theme configuration
   */
  validateThemeConfig(themeName: string, themeConfig: ThemeConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查主题名称格式 | Check theme name format
    if (!this.isValidThemeName(themeName)) {
      errors.push(
        `无效的主题名称 '${themeName}': 必须以字母开头，只能包含字母、数字和下划线 | Invalid theme name '${themeName}': must start with letter and contain only letters, numbers and underscores`
      );
    }

    // 检查配置一致性 | Check configuration consistency
    if (themeConfig.fine_progress && !themeConfig.enable_gradient) {
      warnings.push(
        `主题 '${themeName}': fine_progress通常与enable_gradient一起使用以获得最佳效果 | Theme '${themeName}': fine_progress is usually used with enable_gradient for best effects`
      );
    }

    if (themeConfig.capsule_style && themeName !== 'capsule') {
      warnings.push(
        `主题 '${themeName}': capsule_style选项通常仅用于capsule主题 | Theme '${themeName}': capsule_style option is usually only used for capsule theme`
      );
    }

    // 检查功能依赖 | Check feature dependencies
    if (themeConfig.fine_progress || themeConfig.capsule_style) {
      warnings.push(
        `主题 '${themeName}': 需要Nerd Font支持以获得最佳效果 | Theme '${themeName}': requires Nerd Font support for best effects`
      );
    }

    return { errors, warnings };
  }

  /**
   * 验证主题名称格式 | Validate theme name format
   */
  private isValidThemeName(name: string): boolean {
    return /^[a-z][a-z0-9_]*$/i.test(name);
  }

  /**
   * 获取主题应用后的完整配置 | Get complete config after theme application
   */
  getThemedConfig(themeName?: string): Config {
    const targetTheme = themeName || this.currentTheme;
    const result = this.themeEngine.applyTheme(this.baseConfig, targetTheme);
    return result.config;
  }

  /**
   * 重置到默认主题 | Reset to default theme
   */
  resetToDefaultTheme(): ThemeApplicationResult {
    return this.switchTheme('classic');
  }

  /**
   * 批量验证多个主题 | Batch validate multiple themes
   */
  validateAllThemes(): Record<string, ValidationResult> {
    const results: Record<string, ValidationResult> = {};

    for (const themeName of this.getAvailableThemes()) {
      const themeConfig = this.getThemeConfig(themeName);
      if (themeConfig) {
        results[themeName] = this.validateThemeConfig(themeName, themeConfig);
      }
    }

    return results;
  }

  /**
   * 获取主题统计信息 | Get theme statistics
   */
  getThemeStats(): {
    total: number;
    builtin: number;
    custom: number;
    current: string;
  } {
    const availableThemes = this.getAvailableThemes();
    const builtinThemes = this.themeEngine.getBuiltinThemes();
    const customThemes = this.themeEngine.getCustomThemes();

    return {
      total: availableThemes.length,
      builtin: builtinThemes.length,
      custom: customThemes.length,
      current: this.currentTheme,
    };
  }

  /**
   * 注册自定义主题 | Register custom theme
   */
  registerCustomTheme(name: string, config: ThemeConfig): ValidationResult {
    // 验证主题配置 | Validate theme config
    const validation = this.validateThemeConfig(name, config);

    if (validation.errors.length > 0 && this.options.strictValidation) {
      throw new Error(`主题验证失败 | Theme validation failed: ${validation.errors.join(', ')}`);
    }

    // 注册主题 | Register theme
    this.themeEngine.registerTheme(name, config);

    return validation;
  }

  /**
   * 删除自定义主题 | Remove custom theme
   */
  removeCustomTheme(name: string): boolean {
    if (this.currentTheme === name) {
      console.warn(
        `当前正在使用主题 '${name}'，切换到classic主题 | Currently using theme '${name}', switching to classic theme`
      );
      this.switchTheme('classic');
    }

    return this.themeEngine.removeTheme(name);
  }

  /**
   * 更新基础配置 | Update base configuration
   */
  updateBaseConfig(newConfig: Config): void {
    this.baseConfig = newConfig;

    // 如果配置中指定了主题，切换到该主题 | If theme is specified in config, switch to that theme
    if (newConfig.theme && newConfig.theme !== this.currentTheme) {
      this.switchTheme(newConfig.theme);
    }
  }

  /**
   * 克隆主题管理器 | Clone theme manager
   */
  clone(): ThemeManager {
    return new ThemeManager(this.baseConfig, {
      ...this.options,
      customThemes: { ...this.options.customThemes },
    });
  }
}
