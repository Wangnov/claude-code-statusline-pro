import fs from 'node:fs';
import path from 'node:path';
import TOML from '@iarna/toml';
import type { ZodError } from 'zod';
import { type Config, ConfigSchema } from './schema.js';

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
   * 查找配置文件 | Find config file
   */
  private findConfigFile(): string | null {
    const possiblePaths = [
      // 当前目录 | Current directory
      path.join(process.cwd(), 'statusline.config.toml'),
      path.join(process.cwd(), '.statusline.toml'),

      // 用户主目录 | User home directory
      path.join(
        process.env['HOME'] || process.env['USERPROFILE'] || '',
        '.config',
        'claude-statusline',
        'config.toml'
      ),
      path.join(process.env['HOME'] || process.env['USERPROFILE'] || '', '.statusline.toml'),

      // 包目录 | Package directory (fallback)
      path.join(getCurrentDir(), '../../statusline.config.toml'),
    ];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
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
        result[key] = this.deepMerge(targetValue || ({} as Record<string, unknown>), sourceValue) as T[Extract<keyof T, string>];
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
          (component as Record<string, unknown>)['enabled'] = newOrder.includes(componentName);
        }
      }
    }

    return updatedConfig;
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
          userConfig = this.cleanSymbols(parsedToml) as Partial<Config>;
        } catch (error) {
          console.warn(`Failed to parse config file ${this.configPath}:`, error);
        }
      }

      // 命令行预设覆盖 | Command line preset override
      if (options.overridePreset) {
        userConfig.preset = options.overridePreset;
      }

      // 使用 Zod 解析和验证配置 | Parse and validate with Zod
      if (process.env['DEBUG']) {
        console.error(
          'Before ConfigSchema.parse, userConfig:',
          JSON.stringify(userConfig, null, 2)
        );
      }
      const config = ConfigSchema.parse(userConfig);
      if (process.env['DEBUG']) {
        console.error('After ConfigSchema.parse, config keys:', Object.keys(config));
      }

      // 应用预设 | Apply preset
      const finalConfig = this.applyPreset(config);

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
   * 创建默认配置文件
   */
  async createDefaultConfig(configPath?: string): Promise<void> {
    const defaultConfig = ConfigSchema.parse({});
    const targetPath = configPath || path.join(process.cwd(), 'statusline.config.toml');

    const tomlContent = TOML.stringify(defaultConfig as any);
    await fs.promises.writeFile(targetPath, tomlContent, 'utf8');

    this.configPath = targetPath;
    this.cachedConfig = defaultConfig;
  }

  /**
   * 保存配置到文件
   */
  async save(config: Config, configPath?: string): Promise<void> {
    const targetPath =
      configPath || this.configPath || path.join(process.cwd(), 'statusline.config.toml');
    const tomlContent = TOML.stringify(config as any);
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
      theme: themeName,
    };

    await this.save(themedConfig, configPath);
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): Config {
    return ConfigSchema.parse({});
  }
}

// 导出单例实例 | Export singleton instance
export const configLoader = new ConfigLoader();
