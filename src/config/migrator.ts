import { type Config, ConfigSchema } from './schema.js';

// ==================== 迁移结果类型定义 ====================

/**
 * 配置迁移结果接口 | Configuration migration result interface
 */
export interface MigrationResult {
  success: boolean;
  config: Config;
  warnings: string[];
  errors: string[];
  changes: MigrationChange[];
}

/**
 * 迁移变更记录 | Migration change record
 */
export interface MigrationChange {
  type: 'rename' | 'restructure' | 'add' | 'remove' | 'transform';
  from?: string;
  to?: string;
  description: string;
  oldValue?: unknown;
  newValue?: unknown;
}

// ==================== 配置迁移器主类 ====================

/**
 * 配置迁移器主类 | Main configuration migrator class
 * 负责从旧版 statusline.config.toml 格式转换到新版 config.toml 格式
 * Handles migration from old statusline.config.toml to new config.toml format
 *
 * 当前实现：基础文件名迁移和配置验证
 * Current implementation: Basic filename migration and config validation
 */
export class ConfigMigrator {
  private warnings: string[] = [];
  private errors: string[] = [];
  private changes: MigrationChange[] = [];

  /**
   * 执行配置迁移 | Execute configuration migration
   * @param oldConfig 旧格式配置数据 | Old format configuration data
   * @returns 迁移结果 | Migration result
   */
  migrate(oldConfig: unknown): MigrationResult {
    this.warnings = [];
    this.errors = [];
    this.changes = [];

    try {
      // 1. 基础验证
      if (!oldConfig || typeof oldConfig !== 'object') {
        throw new Error('无效的配置数据 | Invalid configuration data');
      }

      // 2. 深拷贝以避免修改原始数据
      const configData = JSON.parse(JSON.stringify(oldConfig));

      // 3. 记录基本迁移操作
      this.addChange(
        'transform',
        'statusline.config.toml',
        'config.toml',
        `配置文件格式迁移 | Configuration file format migration`
      );

      // 4. 尝试验证配置
      let validatedConfig: Config;
      try {
        validatedConfig = ConfigSchema.parse(configData);
        this.addChange(
          'transform',
          undefined,
          undefined,
          `配置验证成功 | Configuration validation successful`
        );
      } catch (_validationError) {
        // 如果直接验证失败，尝试基本修复
        const fixedConfig = this.applyBasicFixes(configData);
        validatedConfig = ConfigSchema.parse(fixedConfig);
        this.addChange(
          'transform',
          undefined,
          undefined,
          `配置验证失败，应用基本修复后成功 | Config validation failed, fixed with basic repairs`
        );
      }

      return {
        success: true,
        config: validatedConfig,
        warnings: this.warnings,
        errors: this.errors,
        changes: this.changes,
      };
    } catch (error) {
      this.errors.push(
        `配置迁移失败 | Migration failed: ${error instanceof Error ? error.message : String(error)}`
      );

      return {
        success: false,
        config: this.getDefaultConfig(),
        warnings: this.warnings,
        errors: this.errors,
        changes: this.changes,
      };
    }
  }

  // ==================== 基本修复逻辑 ====================

  private applyBasicFixes(config: Record<string, unknown>): Record<string, unknown> {
    const fixed = { ...config };

    // 确保必要的顶层字段存在
    if (!fixed.preset) {
      fixed.preset = 'PMBTS';
      this.warnings.push('添加默认preset | Added default preset');
    }

    // 确保主题有效
    if (fixed.theme && typeof fixed.theme === 'string') {
      // 如果主题名存在于templates中，则有效
      if (
        fixed.templates &&
        typeof fixed.templates === 'object' &&
        !(fixed.theme in fixed.templates)
      ) {
        const validThemes = ['classic', 'powerline', 'capsule', 'no_color', 'high_contrast'];
        if (!validThemes.includes(fixed.theme)) {
          this.warnings.push(
            `主题 "${fixed.theme}" 无效，重置为 "classic" | Invalid theme "${fixed.theme}", reset to "classic"`
          );
          fixed.theme = 'classic';
        }
      }
    }

    // 修复可能的字段类型问题
    if (fixed.components) {
      for (const [componentName, component] of Object.entries(fixed.components)) {
        if (componentName === 'order') continue;

        if (component && typeof component === 'object') {
          // 确保 enabled 是 boolean
          if ('enabled' in component && typeof component.enabled !== 'boolean') {
            component.enabled = Boolean(component.enabled);
          }
        }
      }
    }

    return fixed;
  }

  // ==================== 默认配置 ====================

  private getDefaultConfig(): Config {
    // 创建一个最小的有效配置
    const minimal = {
      preset: 'PMBTS',
    };

    try {
      return ConfigSchema.parse(minimal);
    } catch (_error) {
      // 如果连最小配置都失败，返回硬编码的基本配置
      return {
        preset: 'PMBTS',
        components: {
          order: ['project', 'model', 'branch', 'tokens', 'status'],
        },
      } as Config;
    }
  }

  // ==================== 辅助方法 ====================

  private addChange(
    type: MigrationChange['type'],
    from: string | undefined,
    to: string | undefined,
    description?: string,
    oldValue?: unknown,
    newValue?: unknown
  ): void {
    this.changes.push({
      type,
      ...(from && { from }),
      ...(to && { to }),
      description: description || `${type} operation`,
      oldValue,
      newValue,
    });
  }

  // ==================== 静态工厂方法 ====================

  /**
   * 创建配置迁移器实例 | Create config migrator instance
   * @returns ConfigMigrator实例 | ConfigMigrator instance
   */
  static create(): ConfigMigrator {
    return new ConfigMigrator();
  }

  /**
   * 快速迁移方法 | Quick migration method
   * @param oldConfig 旧配置数据 | Old configuration data
   * @returns 迁移结果 | Migration result
   */
  static run(oldConfig: unknown): MigrationResult {
    return new ConfigMigrator().migrate(oldConfig);
  }

  // ==================== 迁移结果分析 ====================

  /**
   * 生成迁移报告 | Generate migration report
   * @param result 迁移结果 | Migration result
   * @returns 格式化的迁移报告 | Formatted migration report
   */
  static generateMigrationReport(result: MigrationResult): string {
    const lines: string[] = [];

    lines.push('📋 配置迁移报告 | Configuration Migration Report');
    lines.push('='.repeat(50));

    if (result.success) {
      lines.push('✅ 迁移状态: 成功 | Migration Status: Success');
    } else {
      lines.push('❌ 迁移状态: 失败 | Migration Status: Failed');
    }

    lines.push(`🔄 变更数量: ${result.changes.length} | Changes Count: ${result.changes.length}`);
    lines.push(
      `⚠️  警告数量: ${result.warnings.length} | Warnings Count: ${result.warnings.length}`
    );
    lines.push(`❌ 错误数量: ${result.errors.length} | Errors Count: ${result.errors.length}`);

    if (result.changes.length > 0) {
      lines.push('\n📝 详细变更 | Detailed Changes:');
      result.changes.forEach((change, index) => {
        lines.push(`  ${index + 1}. [${change.type.toUpperCase()}] ${change.description}`);
        if (change.from && change.to) {
          lines.push(`     ${change.from} → ${change.to}`);
        }
      });
    }

    if (result.warnings.length > 0) {
      lines.push('\n⚠️  警告信息 | Warnings:');
      result.warnings.forEach((warning) => {
        lines.push(`  • ${warning}`);
      });
    }

    if (result.errors.length > 0) {
      lines.push('\n❌ 错误信息 | Errors:');
      result.errors.forEach((error) => {
        lines.push(`  • ${error}`);
      });
    }

    lines.push('\n💡 注意 | Note:');
    lines.push('当前迁移器主要处理文件名变更和基本验证，');
    lines.push('复杂的字段重命名和结构重组将在Schema更新后实现。');
    lines.push('Current migrator handles filename changes and basic validation,');
    lines.push(
      'complex field renaming and restructuring will be implemented after Schema updates.'
    );

    return lines.join('\n');
  }

  // ==================== 配置兼容性检查 ====================

  /**
   * 检查配置是否为旧格式 | Check if configuration is old format
   * @param config 配置数据 | Configuration data
   * @returns 是否为旧格式 | Whether it's old format
   */
  static isOldFormat(config: unknown): boolean {
    if (!config || typeof config !== 'object') {
      return false;
    }

    const configObj = config as Record<string, unknown>;

    // 检查是否包含旧格式特征
    // 目前主要基于文件名判断，这里提供逻辑支持
    const hasOldFields = Boolean(
      configObj.templates || // templates 是旧格式特征
        configObj.experimental || // experimental section
        (configObj.style &&
          typeof configObj.style === 'object' &&
          'enable_nerd_font' in configObj.style) // style.enable_nerd_font
    );

    return hasOldFields;
  }

  /**
   * 检查配置是否需要迁移 | Check if configuration needs migration
   * @param config 配置数据 | Configuration data
   * @param sourcePath 源文件路径 | Source file path
   * @returns 是否需要迁移 | Whether migration is needed
   */
  static needsMigration(config: unknown, sourcePath?: string): boolean {
    // 文件名检查
    if (sourcePath?.includes('statusline.config.toml')) {
      return true;
    }

    // 内容检查
    return ConfigMigrator.isOldFormat(config);
  }
}

// ==================== 导出默认实例 ====================

/**
 * 默认配置迁移器实例 | Default config migrator instance
 */
export const configMigrator = ConfigMigrator.create();
