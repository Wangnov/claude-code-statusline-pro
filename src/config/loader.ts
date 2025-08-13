import fs from 'node:fs';
import path from 'node:path';
import TOML from '@iarna/toml';
import type { ZodError } from 'zod';
import type { TerminalCapabilities } from '../terminal/detector.js';
import { ConfigMigrator } from './migrator.js';
import { type ComponentsConfig, type Config, ConfigSchema } from './schema.js';

// 获取当前目录，兼容 ESM 和 CJS
function getCurrentDir(): string {
  // CJS 环境
  try {
    // @ts-ignore - __dirname may not exist in ESM
    if (typeof __dirname !== 'undefined') {
      return __dirname;
    }
  } catch {
    // 忽略错误
  }

  // ESM 环境回退 - 使用同步方式
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      // 直接构建路径，避免异步导入
      const url = import.meta.url;
      if (url.startsWith('file://')) {
        return path.dirname(url.slice(7)); // 移除 'file://' 前缀
      }
    }
  } catch {
    // 忽略错误
  }

  // 最终回退到当前工作目录
  return process.cwd();
}

export interface ConfigLoadOptions {
  customPath?: string | undefined;
  overridePreset?: string | undefined;
}

export class ConfigLoader {
  private cachedConfig: Config | null = null;
  private configPath: string | null = null;

  /**
   * 检测配置文件格式 | Detect config file format
   * @param configPath 配置文件路径 | Config file path
   * @returns 格式类型 | Format type
   */
  private detectConfigFormat(configPath: string): 'new' | 'old' | 'unknown' {
    const filename = path.basename(configPath);

    if (filename === 'config.toml') {
      return 'new';
    } else if (filename === 'statusline.config.toml' || filename === '.statusline.toml') {
      return 'old';
    }

    return 'unknown';
  }

  /**
   * 查找配置文件 | Find config file
   * 新的查找优先级：优先查找 config.toml，然后是 statusline.config.toml
   * New search priority: prioritize config.toml, then statusline.config.toml
   */
  private findConfigFile(): string | null {
    const possiblePaths = [
      // 当前目录 - 新格式优先 | Current directory - new format first
      path.join(process.cwd(), 'config.toml'),
      path.join(process.cwd(), 'statusline.config.toml'),

      // 用户配置目录 - 新格式优先 | User config directory - new format first
      path.join(
        process.env.HOME || process.env.USERPROFILE || '',
        '.config',
        'claude-statusline',
        'config.toml'
      ),
      path.join(
        process.env.HOME || process.env.USERPROFILE || '',
        '.config',
        'claude-statusline',
        'statusline.config.toml'
      ),

      // 包目录 - 新格式优先 | Package directory - new format first
      path.join(getCurrentDir(), '../../configs/config.toml'),
      path.join(getCurrentDir(), '../../configs/statusline.config.toml'),
      path.join(getCurrentDir(), '../../statusline.config.toml'), // 保持现有备用路径
    ];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        // 检测到旧格式时给出友好提示 | Show friendly hint when old format detected
        const format = this.detectConfigFormat(configPath);
        if (format === 'old') {
          console.warn(`检测到旧版配置文件格式: ${configPath}`);
          console.warn('建议使用新格式 config.toml，系统将自动处理配置兼容性');
          console.warn(
            'Detected old config format, system will handle compatibility automatically'
          );
        }

        return configPath;
      }
    }

    return null;
  }

  /**
   * 深度合并对象 | Deep merge objects
   */
  private deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        result[key] = this.deepMerge(
          targetValue || ({} as Record<string, unknown>),
          sourceValue
        ) as T[Extract<keyof T, string>];
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }

    return result;
  }

  /**
   * 清理对象中的 Symbol 属性 | Clean Symbol properties from objects
   * TOML 解析器会在数组上添加 Symbol 元数据，需要清理以避免序列化错误
   */
  private cleanSymbols(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      // 清理数组的 Symbol 属性，创建新的纯数组
      return obj.map((item) => this.cleanSymbols(item));
    }

    // 对象：只保留字符串键的属性，忽略 Symbol 键
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = this.cleanSymbols(value);
    }

    return cleaned;
  }

  /**
   * 应用预设配置 | Apply preset configuration
   */
  private applyPreset(config: Config): Config {
    if (!config.preset) return config;

    const preset = config.preset.toUpperCase();
    const mapping = config.preset_mapping;

    // 如果没有映射配置，使用默认值
    if (!mapping) {
      console.warn('No preset mapping found, using default');
      return config;
    }

    // 验证预设字符串 | Validate preset string
    for (const char of preset) {
      if (!(char in mapping)) {
        console.warn(`Unknown preset character: ${char}`);
        return config;
      }
    }

    // 生成组件顺序 | Generate component order
    const newOrder: string[] = [];
    for (const char of preset) {
      const componentName = mapping[char as keyof typeof mapping];
      if (componentName) {
        newOrder.push(componentName);
      }
    }

    // 更新配置 | Update config
    const updatedConfig = { ...config };
    if (!updatedConfig.components) {
      updatedConfig.components = {
        order: newOrder,
      };
    } else {
      updatedConfig.components.order = newOrder;
    }

    // 更新组件启用状态 | Update component enabled status
    const allComponents = Object.values(mapping);
    for (const componentName of allComponents) {
      if (updatedConfig.components) {
        const component =
          updatedConfig.components[componentName as keyof typeof updatedConfig.components];
        if (component && typeof component === 'object' && 'enabled' in component) {
          (component as Record<string, unknown>).enabled = newOrder.includes(componentName);
        }
      }
    }

    return updatedConfig;
  }

  /**
   * 应用主题配置 | Apply theme config (暂时简化处理)
   */
  private async applyThemeConfig(config: Config): Promise<Config> {
    if (!config.theme) return config;

    // 主题系统暂时禁用，直接使用模板系统 | Theme system temporarily disabled, use template system directly

    // 回退到模板系统 | Fallback to template system
    // 注意：templates 已被 themes 替代，这里保留向后兼容
    const legacyConfig = config as Config & { templates?: Record<string, unknown> };
    const templateConfig = legacyConfig.templates?.[config.theme];
    if (templateConfig) {
      // 使用TOML中定义的模板配置 | Use template config from TOML
      return this.applyTemplateConfig(config, templateConfig as Record<string, unknown>);
    }

    console.warn(`Theme "${config.theme}" not found in templates or themes`);
    return config;
  }

  /**
   * 应用模板配置 | Apply template config
   */
  private applyTemplateConfig(config: Config, templateConfig: Record<string, unknown>): Config {
    const mergedConfig = { ...config };

    // 应用模板的样式配置 | Apply template style config
    if (templateConfig.style) {
      mergedConfig.style = {
        separator: ' | ',
        enable_colors: 'auto',
        enable_emoji: 'auto',
        enable_nerd_font: 'auto',
        separator_color: 'white',
        separator_before: ' ',
        separator_after: ' ',
        compact_mode: false,
        max_width: 0,
        ...(mergedConfig.style || {}),
        ...(templateConfig.style as Record<string, unknown>),
      };
    }

    // 应用模板的组件配置 | Apply template components config
    if (templateConfig.components && typeof templateConfig.components === 'object') {
      if (!mergedConfig.components) {
        mergedConfig.components = {} as ComponentsConfig;
      }

      const templateComponents = templateConfig.components as Record<string, unknown>;

      // 对于每个组件，深度合并配置 | Deep merge config for each component
      const knownComponents = ['project', 'model', 'branch', 'tokens', 'status'] as const;
      for (const componentName of knownComponents) {
        const templateComponentConfig = templateComponents[componentName];
        if (templateComponentConfig && typeof templateComponentConfig === 'object') {
          const currentComponents = mergedConfig.components as Record<string, unknown>;
          if (!currentComponents[componentName]) {
            currentComponents[componentName] = {};
          }
          currentComponents[componentName] = {
            ...(currentComponents[componentName] as Record<string, unknown>),
            ...(templateComponentConfig as Record<string, unknown>),
          };
        }
      }

      // 应用组件顺序 | Apply component order
      if (templateComponents.order && Array.isArray(templateComponents.order)) {
        const currentComponents = mergedConfig.components as Record<string, unknown>;
        currentComponents.order = templateComponents.order;
      }
    }

    return mergedConfig;
  }

  /**
   * 处理配置迁移 | Handle configuration migration
   */
  private async handleMigration(rawConfig: unknown): Promise<Config> {
    const migrator = new ConfigMigrator();
    const migrationResult = migrator.migrate(rawConfig);

    if (!migrationResult.success) {
      console.error('配置迁移失败 | Configuration migration failed:');
      migrationResult.errors.forEach((error) => console.error(`  • ${error}`));
    }

    if (migrationResult.warnings.length > 0) {
      console.warn('配置迁移警告 | Configuration migration warnings:');
      migrationResult.warnings.forEach((warning) => console.warn(`  • ${warning}`));
    }

    if (migrationResult.changes.length > 0 && process.env.DEBUG) {
      console.log('配置迁移变更 | Configuration migration changes:');
      migrationResult.changes.forEach((change) =>
        console.log(`  • [${change.type}] ${change.description}`)
      );
    }

    return migrationResult.config;
  }

  /**
   * 加载配置 | Load configuration
   */
  async loadConfig(options: ConfigLoadOptions = {}): Promise<Config> {
    try {
      // 使用缓存 | Use cache if available
      if (this.cachedConfig && !options.customPath && !options.overridePreset) {
        return this.cachedConfig;
      }

      // 查找配置文件 | Find config file
      this.configPath = options.customPath || this.findConfigFile();

      let userConfig: Partial<Config> = {};

      if (this.configPath && fs.existsSync(this.configPath)) {
        try {
          const configContent = await fs.promises.readFile(this.configPath, 'utf8');
          const parsedToml = TOML.parse(configContent);
          // 深度清理 TOML 解析后的 Symbol 属性
          const cleanedConfig = this.cleanSymbols(parsedToml);

          // 检测配置格式并自动迁移 | Detect config format and auto-migrate
          const format = this.detectConfigFormat(this.configPath);
          const needsMigration = ConfigMigrator.needsMigration(cleanedConfig, this.configPath);

          if (format === 'old' || needsMigration) {
            console.log(
              `🔄 检测到旧版配置格式，正在自动迁移... | Detected old config format, migrating automatically...`
            );
            const migratedConfig = await this.handleMigration(cleanedConfig);
            userConfig = migratedConfig;

            // 提示配置格式兼容性处理完成
            if (process.env.NODE_ENV !== 'test') {
              console.log(
                '💡 配置格式已自动处理并兼容 | Configuration format automatically handled and compatible'
              );
            }
          } else {
            // 新格式配置直接验证
            userConfig = ConfigSchema.parse(cleanedConfig);
          }
        } catch (error) {
          console.warn(`Failed to parse config file ${this.configPath}:`, error);
          // 解析失败时尝试迁移
          try {
            const configContent = await fs.promises.readFile(this.configPath, 'utf8');
            const parsedToml = TOML.parse(configContent);
            const cleanedConfig = this.cleanSymbols(parsedToml);
            userConfig = await this.handleMigration(cleanedConfig);
          } catch (_migrationError) {
            console.error(
              '配置迁移也失败了，使用默认配置 | Migration also failed, using default config'
            );
            throw error; // 重新抛出原始错误
          }
        }
      } else {
        // 没有找到配置文件，使用默认配置
        userConfig = ConfigSchema.parse({});
      }

      // 命令行预设覆盖 | Command line preset override
      if (options.overridePreset) {
        userConfig.preset = options.overridePreset;
      }

      // 确保配置是完整的Config类型
      let finalConfig: Config;
      if ('preset' in userConfig && userConfig.preset) {
        // 已经是完整配置
        finalConfig = userConfig as Config;
      } else {
        // 使用Schema解析确保完整性
        finalConfig = ConfigSchema.parse(userConfig);
      }

      if (process.env.DEBUG) {
        console.error('Final config keys:', Object.keys(finalConfig));
      }

      // 应用预设 | Apply preset
      finalConfig = this.applyPreset(finalConfig);

      // 应用主题配置 | Apply theme config
      finalConfig = await this.applyThemeConfig(finalConfig);

      // 缓存配置 | Cache config
      this.cachedConfig = finalConfig;

      return finalConfig;
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        // Zod 验证错误 | Zod validation error
        const zodError = error as ZodError;
        console.error('Configuration validation failed:');
        for (const issue of zodError.issues) {
          console.error(`  ${issue.path.join('.')}: ${issue.message}`);
        }
      } else {
        console.error('Failed to load configuration:', error);
      }

      // 返回默认配置 | Return default config
      console.warn('Using default configuration');
      const defaultConfig = ConfigSchema.parse({});
      this.cachedConfig = this.applyPreset(defaultConfig);
      return this.cachedConfig;
    }
  }

  /**
   * 获取配置路径 | Get config path
   */
  getConfigPath(): string | null {
    return this.configPath;
  }

  /**
   * 清除缓存 | Clear cache
   */
  clearCache(): void {
    this.cachedConfig = null;
  }

  /**
   * 验证配置文件 | Validate config file
   */
  async validateConfig(configPath?: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const targetPath = configPath || this.findConfigFile();

      if (!targetPath || !fs.existsSync(targetPath)) {
        errors.push('Configuration file not found');
        return { valid: false, errors };
      }

      const configContent = await fs.promises.readFile(targetPath, 'utf8');
      const parsedToml = TOML.parse(configContent);

      // 验证配置 | Validate config
      ConfigSchema.parse(parsedToml);

      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as ZodError;
        for (const issue of zodError.issues) {
          errors.push(`${issue.path.join('.')}: ${issue.message}`);
        }
      } else {
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }

      return { valid: false, errors };
    }
  }

  /**
   * 别名方法 - 为了向后兼容
   */
  async load(configPath?: string): Promise<Config> {
    return this.loadConfig({ customPath: configPath });
  }

  /**
   * 获取配置源路径
   */
  getConfigSource(): string | null {
    return this.configPath;
  }

  /**
   * 检查配置文件是否存在
   */
  async configExists(configPath?: string): Promise<boolean> {
    const targetPath = configPath || this.findConfigFile();
    return targetPath !== null && fs.existsSync(targetPath);
  }

  /**
   * 创建默认配置文件 | Create default config file
   * 支持智能终端检测和主题选择 | Support intelligent terminal detection and theme selection
   * 默认使用新格式文件名 config.toml | Default to new format filename config.toml
   */
  async createDefaultConfig(
    configPath?: string,
    theme?: string,
    capabilities?: TerminalCapabilities
  ): Promise<void> {
    try {
      // 读取默认配置模板 | Read default config template
      const templatePath = path.join(getCurrentDir(), '../../configs/config.toml');
      let configContent: string;

      if (fs.existsSync(templatePath)) {
        // 使用完整的配置模板 | Use complete config template
        configContent = await fs.promises.readFile(templatePath, 'utf8');

        // 解析TOML并应用自定义选项 | Parse TOML and apply custom options
        const parsedConfig = TOML.parse(configContent);

        // 应用主题设置 | Apply theme setting
        if (theme) {
          (parsedConfig as Record<string, unknown>).theme = theme;
        }

        // 根据终端能力调整配置 | Adjust config based on terminal capabilities
        if (capabilities) {
          const styleSection =
            ((parsedConfig as Record<string, unknown>).style as Record<string, unknown>) || {};

          // 根据终端能力设置显示选项 | Set display options based on terminal capabilities
          if (typeof capabilities.colors === 'boolean') {
            styleSection.enable_colors = capabilities.colors;
          }
          if (typeof capabilities.emoji === 'boolean') {
            styleSection.enable_emoji = capabilities.emoji;
          }
          if (typeof capabilities.nerdFont === 'boolean') {
            styleSection.enable_nerd_font = capabilities.nerdFont;
          }

          (parsedConfig as Record<string, unknown>).style = styleSection;
        }

        // 重新生成TOML内容 | Regenerate TOML content
        configContent = TOML.stringify(parsedConfig as TOML.JsonMap);
      } else {
        // 回退到基础配置 | Fallback to basic config
        console.warn('Default config template not found, using basic configuration');
        const defaultConfig = ConfigSchema.parse({
          preset: 'PMBTS',
          theme: theme || 'classic',
        });
        configContent = TOML.stringify(defaultConfig as TOML.JsonMap);
      }

      // 写入配置文件 | Write config file
      const targetPath = configPath || path.join(process.cwd(), 'config.toml');
      await fs.promises.writeFile(targetPath, configContent, 'utf8');

      this.configPath = targetPath;
      // 清除缓存以强制重新加载 | Clear cache to force reload
      this.cachedConfig = null;
    } catch (error) {
      console.error('Failed to create default config from template, using fallback:', error);

      // 最终回退：创建基础配置 | Final fallback: create basic config
      const fallbackConfig = ConfigSchema.parse({
        preset: 'PMBTS',
        theme: theme || 'classic',
      });
      const targetPath = configPath || path.join(process.cwd(), 'config.toml');
      const tomlContent = TOML.stringify(fallbackConfig as TOML.JsonMap);
      await fs.promises.writeFile(targetPath, tomlContent, 'utf8');

      this.configPath = targetPath;
      this.cachedConfig = fallbackConfig;
    }
  }

  /**
   * 保存配置到文件 | Save config to file
   * 优先保存为新格式 config.toml | Prefer saving as new format config.toml
   */
  async save(config: Config, configPath?: string): Promise<void> {
    const targetPath = configPath || this.configPath || path.join(process.cwd(), 'config.toml'); // 默认使用新格式 | Default to new format

    const tomlContent = TOML.stringify(config as TOML.JsonMap);
    await fs.promises.writeFile(targetPath, tomlContent, 'utf8');
    this.cachedConfig = config;
    this.configPath = targetPath;
  }

  /**
   * 重置配置到默认值
   */
  async resetToDefaults(configPath?: string): Promise<void> {
    const defaultConfig = ConfigSchema.parse({});
    await this.save(defaultConfig, configPath);
  }

  /**
   * 应用主题
   */
  async applyTheme(themeName: string, configPath?: string): Promise<void> {
    const currentConfig = await this.load(configPath);

    // 这里应该有主题配置逻辑，暂时简化处理
    const themedConfig = {
      ...currentConfig,
      theme: themeName as 'classic' | 'powerline' | 'capsule',
    };

    await this.save(themedConfig, configPath);
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): Config {
    return ConfigSchema.parse({});
  }

  /**
   * 检查配置文件格式 | Check config file format
   * 公共方法，允许外部检测配置文件格式 | Public method for external format detection
   */
  checkConfigFormat(configPath: string): 'new' | 'old' | 'unknown' {
    return this.detectConfigFormat(configPath);
  }
}

// 导出单例实例 | Export singleton instance
export const configLoader = new ConfigLoader();
