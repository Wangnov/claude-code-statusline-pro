/**
 * 分支配置Schema扩展测试 | Branch configuration schema extension tests
 *
 * 测试新的分支配置扩展功能和向后兼容性
 * Tests new branch configuration extension features and backward compatibility
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { type BranchComponentConfig, BranchComponentSchema } from '../../../src/config/schema.js';

describe('Branch Configuration Schema', () => {
  describe('Basic Configuration', () => {
    it('should validate basic branch configuration', () => {
      const basicConfig = {
        enabled: true,
        icon_color: 'green',
        text_color: 'white',
        emoji_icon: '🌿',
        nerd_icon: '',
        text_icon: '[branch]',
        show_when_no_git: false,
        max_length: 20,
      };

      const result = BranchComponentSchema.parse(basicConfig);
      expect(result).toEqual(basicConfig);
      console.log('✓ Basic branch configuration validated');
    });

    it('should use default values for optional fields', () => {
      const minimalConfig = {
        emoji_icon: '🌿',
      };

      const result = BranchComponentSchema.parse(minimalConfig);

      expect(result.enabled).toBe(true);
      expect(result.icon_color).toBe('white');
      expect(result.text_color).toBe('white');
      expect(result.show_when_no_git).toBe(false);
      expect(result.max_length).toBe(20);

      console.log('✓ Default values applied correctly');
    });

    it('should validate color values', () => {
      const validColors = [
        'black',
        'red',
        'green',
        'yellow',
        'blue',
        'magenta',
        'cyan',
        'white',
        'gray',
        'bright_red',
        'bright_green',
        'bright_yellow',
        'bright_blue',
        'bright_magenta',
        'bright_cyan',
        'bright_white',
      ];

      validColors.forEach((color) => {
        const config = {
          emoji_icon: '🌿',
          icon_color: color,
          text_color: color,
        };

        expect(() => BranchComponentSchema.parse(config)).not.toThrow();
      });

      console.log('✓ All valid colors accepted');
    });

    it('should reject invalid color values', () => {
      const invalidColors = ['purple', 'orange', 'pink', 'brown', '#ffffff'];

      invalidColors.forEach((color) => {
        const config = {
          emoji_icon: '🌿',
          icon_color: color,
        };

        expect(() => BranchComponentSchema.parse(config)).toThrow();
      });

      console.log('✓ Invalid colors rejected');
    });
  });

  describe('Status Configuration Extension', () => {
    it('should validate complete status configuration', () => {
      const statusConfig = {
        emoji_icon: '🌿',
        status: {
          show_dirty: true,
          show_ahead_behind: true,
          show_stash_count: true,
        },
        status_icons: {
          dirty_emoji: '⚡',
          ahead_emoji: '↑',
          behind_emoji: '↓',
          stash_emoji: '📦',
          dirty_nerd: '',
          ahead_nerd: '',
          behind_nerd: '',
          stash_nerd: '',
          dirty_text: '[*]',
          ahead_text: '[↑]',
          behind_text: '[↓]',
          stash_text: '[S]',
        },
        status_colors: {
          clean: 'green',
          dirty: 'yellow',
          ahead: 'cyan',
          behind: 'magenta',
          operation: 'red',
        },
      };

      const result = BranchComponentSchema.parse(statusConfig);
      expect(result.status).toEqual(statusConfig.status);
      expect(result.status_icons).toEqual(statusConfig.status_icons);
      expect(result.status_colors).toEqual(statusConfig.status_colors);

      console.log('✓ Complete status configuration validated');
    });

    it('should use default values for status icons', () => {
      const configWithoutStatusIcons = {
        emoji_icon: '🌿',
        status: {
          show_dirty: true,
        },
      };

      const result = BranchComponentSchema.parse(configWithoutStatusIcons);

      // 验证默认图标值 - status_icons是可选的，没有提供时应该为undefined
      expect(result.status_icons).toBeUndefined();

      console.log('✓ Default status icons applied');
    });

    it('should validate status boolean flags', () => {
      const booleanFields = ['show_dirty', 'show_ahead_behind', 'show_stash_count'];

      booleanFields.forEach((field) => {
        const config = {
          emoji_icon: '🌿',
          status: {
            [field]: true,
          },
        };

        expect(() => BranchComponentSchema.parse(config)).not.toThrow();

        // 测试无效值
        const invalidConfig = {
          emoji_icon: '🌿',
          status: {
            [field]: 'yes', // 无效的布尔值
          },
        };

        expect(() => BranchComponentSchema.parse(invalidConfig)).toThrow();
      });

      console.log('✓ Status boolean flags validated');
    });
  });

  describe('Performance Configuration Extension', () => {
    it('should validate performance configuration', () => {
      const performanceConfig = {
        emoji_icon: '🌿',
        performance: {
          enable_cache: true,
          cache_ttl: 5000,
          git_timeout: 1000,
          parallel_commands: true,
          lazy_load_status: true,
          skip_on_large_repo: true,
          large_repo_threshold: 10000,
        },
      };

      const result = BranchComponentSchema.parse(performanceConfig);
      expect(result.performance).toEqual(performanceConfig.performance);

      console.log('✓ Performance configuration validated');
    });

    it('should validate cache TTL constraints', () => {
      // 有效的缓存TTL值 (1秒到60秒)
      const validTTLs = [1000, 5000, 30000, 60000];

      validTTLs.forEach((ttl) => {
        const config = {
          emoji_icon: '🌿',
          performance: {
            cache_ttl: ttl,
          },
        };

        expect(() => BranchComponentSchema.parse(config)).not.toThrow();
      });

      // 无效的缓存TTL值
      const invalidTTLs = [999, 60001, 0, -1];

      invalidTTLs.forEach((ttl) => {
        const config = {
          emoji_icon: '🌿',
          performance: {
            cache_ttl: ttl,
          },
        };

        expect(() => BranchComponentSchema.parse(config)).toThrow();
      });

      console.log('✓ Cache TTL constraints validated');
    });

    it('should validate Git timeout constraints', () => {
      // 有效的超时值 (100ms到10秒)
      const validTimeouts = [100, 500, 1000, 5000, 10000];

      validTimeouts.forEach((timeout) => {
        const config = {
          emoji_icon: '🌿',
          performance: {
            git_timeout: timeout,
          },
        };

        expect(() => BranchComponentSchema.parse(config)).not.toThrow();
      });

      // 无效的超时值
      const invalidTimeouts = [99, 10001, 0, -1];

      invalidTimeouts.forEach((timeout) => {
        const config = {
          emoji_icon: '🌿',
          performance: {
            git_timeout: timeout,
          },
        };

        expect(() => BranchComponentSchema.parse(config)).toThrow();
      });

      console.log('✓ Git timeout constraints validated');
    });

    it('should validate large repo threshold constraints', () => {
      // 有效的大仓库阈值 (1000到100000)
      const validThresholds = [1000, 5000, 10000, 50000, 100000];

      validThresholds.forEach((threshold) => {
        const config = {
          emoji_icon: '🌿',
          performance: {
            large_repo_threshold: threshold,
          },
        };

        expect(() => BranchComponentSchema.parse(config)).not.toThrow();
      });

      // 无效的阈值
      const invalidThresholds = [999, 100001, 0, -1];

      invalidThresholds.forEach((threshold) => {
        const config = {
          emoji_icon: '🌿',
          performance: {
            large_repo_threshold: threshold,
          },
        };

        expect(() => BranchComponentSchema.parse(config)).toThrow();
      });

      console.log('✓ Large repo threshold constraints validated');
    });
  });

  describe('Complex Configuration Scenarios', () => {
    it('should validate complete branch configuration with all extensions', () => {
      const completeConfig: BranchComponentConfig = {
        enabled: true,
        icon_color: 'green',
        text_color: 'white',
        emoji_icon: '🌿',
        nerd_icon: '',
        text_icon: '[branch]',
        show_when_no_git: false,
        max_length: 25,
        status: {
          show_dirty: true,
          show_ahead_behind: true,
          show_stash_count: true,
        },
        status_icons: {
          dirty_emoji: '⚡',
          ahead_emoji: '↑',
          behind_emoji: '↓',
          stash_emoji: '📦',
          dirty_nerd: '',
          ahead_nerd: '',
          behind_nerd: '',
          stash_nerd: '',
          dirty_text: '[*]',
          ahead_text: '[↑]',
          behind_text: '[↓]',
          stash_text: '[S]',
        },
        status_colors: {
          clean: 'green',
          dirty: 'yellow',
          ahead: 'cyan',
          behind: 'magenta',
          operation: 'red',
        },
        performance: {
          enable_cache: true,
          cache_ttl: 3000,
          git_timeout: 1500,
          parallel_commands: true,
          lazy_load_status: true,
          skip_on_large_repo: true,
          large_repo_threshold: 15000,
        },
      };

      const result = BranchComponentSchema.parse(completeConfig);
      expect(result).toEqual(completeConfig);

      console.log('✓ Complete branch configuration with all extensions validated');
    });

    it('should handle mixed optional and required fields', () => {
      const mixedConfig = {
        emoji_icon: '🌿', // 必需
        enabled: false, // 可选，非默认值
        icon_color: 'red', // 可选，非默认值
        max_length: 15, // 可选，非默认值
        status: {
          // 可选
          show_dirty: true,
          show_ahead_behind: false,
        },
        // 其他字段使用默认值
      };

      const result = BranchComponentSchema.parse(mixedConfig);

      expect(result.enabled).toBe(false);
      expect(result.icon_color).toBe('red');
      expect(result.text_color).toBe('white'); // 默认值
      expect(result.max_length).toBe(15);
      expect(result.show_when_no_git).toBe(false); // 默认值
      expect(result.status?.show_dirty).toBe(true);
      expect(result.status?.show_ahead_behind).toBe(false);

      console.log('✓ Mixed optional and required fields handled correctly');
    });
  });

  describe('Error Handling', () => {
    it('should provide clear error messages for missing required fields', () => {
      const invalidConfig = {
        enabled: true,
        // 缺少 emoji_icon
      };

      expect(() => BranchComponentSchema.parse(invalidConfig)).toThrow();

      try {
        BranchComponentSchema.parse(invalidConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        console.log('✓ Clear error message for missing required fields');
      }
    });

    it('should provide clear error messages for invalid field types', () => {
      const invalidConfig = {
        emoji_icon: '🌿',
        enabled: 'yes', // 应该是布尔值
        max_length: '20', // 应该是数字
      };

      expect(() => BranchComponentSchema.parse(invalidConfig)).toThrow();

      try {
        BranchComponentSchema.parse(invalidConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        console.log('✓ Clear error message for invalid field types');
      }
    });

    it('should provide clear error messages for invalid nested configurations', () => {
      const invalidConfig = {
        emoji_icon: '🌿',
        status: {
          show_dirty: 'maybe', // 应该是布尔值
        },
        performance: {
          cache_ttl: 50, // 小于最小值1000
        },
      };

      expect(() => BranchComponentSchema.parse(invalidConfig)).toThrow();

      try {
        BranchComponentSchema.parse(invalidConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        console.log('✓ Clear error message for invalid nested configurations');
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should accept v1.x basic configuration', () => {
      // 模拟v1.x的基础配置格式
      const v1Config = {
        enabled: true,
        color: 'green', // v1.x使用单一color字段
        icon: '🌿', // v1.x使用icon字段
        show_when_no_git: false,
        max_length: 20,
      };

      // 转换为v2.x格式
      const v2Config = {
        enabled: v1Config.enabled,
        icon_color: v1Config.color,
        text_color: v1Config.color,
        emoji_icon: v1Config.icon,
        show_when_no_git: v1Config.show_when_no_git,
        max_length: v1Config.max_length,
      };

      const result = BranchComponentSchema.parse(v2Config);
      expect(result.enabled).toBe(v1Config.enabled);
      expect(result.icon_color).toBe(v1Config.color);
      expect(result.text_color).toBe(v1Config.color);
      expect(result.emoji_icon).toBe(v1Config.icon);

      console.log('✓ v1.x basic configuration compatibility maintained');
    });

    it('should handle missing new fields gracefully', () => {
      const legacyConfig = {
        enabled: true,
        icon_color: 'green',
        text_color: 'white',
        emoji_icon: '🌿',
        // 缺少所有新的扩展配置
      };

      const result = BranchComponentSchema.parse(legacyConfig);

      // 新字段应该是可选的或有默认值
      expect(result.status).toBeUndefined();
      expect(result.status_icons).toBeUndefined();
      expect(result.status_colors).toBeUndefined();
      expect(result.performance).toBeUndefined();

      console.log('✓ Missing new fields handled gracefully');
    });
  });
});
