/**
 * Enhanced Config Loader with hierarchical configuration support
 * 增强的配置加载器 - 支持分层配置
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import TOML from '@iarna/toml';
import { ConfigLoader } from '../config/loader.js';
import type { Config } from '../config/schema.js';
import type { StoragePaths } from './types.js';

export class EnhancedConfigLoader extends ConfigLoader {
  private userConfigPath: string;
  private projectConfigPath: string;

  constructor() {
    super();
    const paths = this.getStoragePaths();
    this.userConfigPath = paths.userConfigPath;
    this.projectConfigPath = paths.projectConfigPath;
  }

  /**
   * Get storage paths based on current project
   * 获取基于当前项目的存储路径
   */
  private getStoragePaths(): StoragePaths {
    const basePath = path.join(os.homedir(), '.claude');
    const projectPath = process.cwd();
    const projectHash = this.hashProjectPath(projectPath);

    return {
      userConfigDir: path.join(basePath, 'statusline-pro'),
      projectConfigDir: path.join(basePath, 'projects', projectHash, 'statusline-pro'),
      sessionsDir: path.join(basePath, 'projects', projectHash, 'statusline-pro', 'sessions'),
      userConfigPath: path.join(basePath, 'statusline-pro', 'config.toml'),
      projectConfigPath: path.join(
        basePath,
        'projects',
        projectHash,
        'statusline-pro',
        'config.toml'
      ),
    };
  }

  /**
   * Hash project path to match Claude Code's format
   * 哈希项目路径以匹配Claude Code的格式
   */
  private hashProjectPath(projectPath: string): string {
    return projectPath.replace(/[\\/:]/g, '-').replace(/^-+|-+$/g, '');
  }

  /**
   * Load configuration with hierarchical priority
   * 优先级: 项目配置 > 用户配置 > 默认配置
   */
  async loadConfig(
    options: { customPath?: string; overridePreset?: string } = {}
  ): Promise<Config> {
    // If custom path is provided, use original behavior
    if (options.customPath) {
      return super.loadConfig(options);
    }

    // Start with default config
    let finalConfig = this.getDefaultConfig();

    // Layer 1: User-level config (lowest priority)
    if (fs.existsSync(this.userConfigPath)) {
      try {
        const userConfigContent = await fs.promises.readFile(this.userConfigPath, 'utf-8');
        const userConfig = TOML.parse(userConfigContent);
        finalConfig = this.deepMerge(finalConfig, userConfig as Partial<Config>);
      } catch (error) {
        console.warn(`Failed to load user config from ${this.userConfigPath}:`, error);
      }
    }

    // Layer 2: Project-level config (higher priority)
    if (fs.existsSync(this.projectConfigPath)) {
      try {
        const projectConfigContent = await fs.promises.readFile(this.projectConfigPath, 'utf-8');
        const projectConfig = TOML.parse(projectConfigContent);
        finalConfig = this.deepMerge(finalConfig, projectConfig as Partial<Config>);
      } catch (error) {
        console.warn(`Failed to load project config from ${this.projectConfigPath}:`, error);
      }
    }

    // Layer 3: Current directory config (highest priority)
    const localConfigPath = path.join(process.cwd(), 'config.toml');
    if (fs.existsSync(localConfigPath)) {
      try {
        const localConfigContent = await fs.promises.readFile(localConfigPath, 'utf-8');
        const localConfig = TOML.parse(localConfigContent);
        finalConfig = this.deepMerge(finalConfig, localConfig as Partial<Config>);
      } catch (error) {
        console.warn(`Failed to load local config from ${localConfigPath}:`, error);
      }
    }

    // Apply command-line overrides
    if (options.overridePreset) {
      finalConfig.preset = options.overridePreset;
    }

    // Apply storage-specific configuration
    const storageConfig = finalConfig as Config & { storage?: any };
    if (!storageConfig.storage) {
      storageConfig.storage = {
        enableConversationTracking: true,
        costDisplayMode: 'conversation',
        enableCostPersistence: true,
        autoCleanupDays: 30,
      };
    }

    return finalConfig;
  }

  /**
   * Deep merge configuration objects
   * 深度合并配置对象
   */
  private deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (sourceValue === undefined || sourceValue === null) {
        continue;
      }

      if (Array.isArray(sourceValue)) {
        result[key] = [...sourceValue] as T[Extract<keyof T, string>];
      } else if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = this.deepMerge(
          (targetValue as Record<string, unknown>) || {},
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }

    return result;
  }

  /**
   * Save configuration to specified level
   * 保存配置到指定层级
   */
  async saveConfig(config: Config, level: 'user' | 'project' | 'local' = 'project'): Promise<void> {
    let targetPath: string;

    switch (level) {
      case 'user': {
        targetPath = this.userConfigPath;
        // Ensure user config directory exists
        const userDir = path.dirname(this.userConfigPath);
        if (!fs.existsSync(userDir)) {
          await fs.promises.mkdir(userDir, { recursive: true });
        }
        break;
      }
      case 'project': {
        targetPath = this.projectConfigPath;
        // Ensure project config directory exists
        const projectDir = path.dirname(this.projectConfigPath);
        if (!fs.existsSync(projectDir)) {
          await fs.promises.mkdir(projectDir, { recursive: true });
        }
        break;
      }
      default:
        targetPath = path.join(process.cwd(), 'config.toml');
        break;
    }

    const tomlContent = TOML.stringify(config as TOML.JsonMap);
    await fs.promises.writeFile(targetPath, tomlContent, 'utf-8');
  }

  /**
   * Get configuration source information
   * 获取配置来源信息
   */
  getConfigSources(): { level: string; path: string; exists: boolean }[] {
    const sources = [
      {
        level: 'default',
        path: 'built-in',
        exists: true,
      },
      {
        level: 'user',
        path: this.userConfigPath,
        exists: fs.existsSync(this.userConfigPath),
      },
      {
        level: 'project',
        path: this.projectConfigPath,
        exists: fs.existsSync(this.projectConfigPath),
      },
      {
        level: 'local',
        path: path.join(process.cwd(), 'config.toml'),
        exists: fs.existsSync(path.join(process.cwd(), 'config.toml')),
      },
    ];

    return sources;
  }
}

// Export enhanced loader as default
export const enhancedConfigLoader = new EnhancedConfigLoader();
