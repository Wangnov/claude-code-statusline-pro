/**
 * Claude Code Statusline Pro - 国际化系统 | Internationalization System
 * 企业级i18n解决方案，支持中英双语，类型安全，性能优化
 *
 * 特性 | Features:
 * - 自动语言检测与用户配置优先级
 * - 类型安全的翻译键定义和插值支持
 * - 懒加载翻译资源和缓存机制
 * - 与现有配置系统无缝集成
 * - 支持复数形式和动态参数
 *
 * @author Claude Code Team
 * @version 2.0.0
 */

import { ConfigLoader } from '../config/loader.js';

/**
 * 支持的语言类型 | Supported language types
 */
export type SupportedLanguage = 'zh' | 'en';

/**
 * 翻译插值参数 | Translation interpolation parameters
 */
export interface TranslationParams {
  [key: string]: string | number;
}

/**
 * 翻译键定义接口 | Translation key definition interface
 * 精简版本，只保留实际使用的翻译键
 */
export interface TranslationKeys {
  // 主题选择相关 | Theme selection related
  editor: {
    themes: {
      title: string;
      applied: string;
      items: {
        classic: {
          name: string;
        };
        powerline: {
          name: string;
        };
        capsule: {
          name: string;
        };
        custom: {
          name: string;
        };
      };
    };
  };

  // 系统消息 | System messages
  messages: {
    cancelled: string;
    goodbye: string;
  };

  // 配置管理 | Configuration management
  config: {
    reset: {
      confirm: string;
      success: string;
    };
  };

  // CLI图标系统 | CLI icon system
  icons: {
    // 图标类型描述 | Icon type descriptions
    types: {
      status: {
        success: string;
        error: string;
        warning: string;
        info: string;
      };
      function: {
        config: string;
        file: string;
        folder: string;
        theme: string;
        edit: string;
        validate: string;
        reset: string;
      };
      diagnostic: {
        doctor: string;
        platform: string;
        terminal: string;
      };
      interactive: {
        goodbye: string;
        prompt: string;
      };
    };
    // CLI系统消息 | CLI system messages
    system: {
      terminalDetection: string;
      nerdFontDetected: string;
      nerdFontNotDetected: string;
      emojiDetected: string;
      emojiNotDetected: string;
      colorsDetected: string;
      colorsNotDetected: string;
      usingIconSet: string;
    };
  };
}

/**
 * 中文翻译资源 | Chinese translation resources
 */
const zhTranslations: TranslationKeys = {
  editor: {
    themes: {
      title: '选择主题：',
      applied: '✅ 已应用主题: {{theme}}',
      items: {
        classic: {
          name: 'Classic主题 - 传统分隔符连接，最大兼容性',
        },
        powerline: {
          name: 'Powerline主题 - 箭头无缝连接，需要Nerd Font',
        },
        capsule: {
          name: 'Capsule主题 - 胶囊形状包装，现代化UI，需要Nerd Font',
        },
        custom: {
          name: '自定义主题 - 当前配置',
        },
      },
    },
  },
  messages: {
    cancelled: '已取消',
    goodbye: '👋 再见！',
  },
  config: {
    reset: {
      confirm: '确定要将配置重置为默认值吗？',
      success: '✅ 配置已重置为默认值',
    },
  },
  icons: {
    types: {
      status: {
        success: '成功状态图标',
        error: '错误状态图标',
        warning: '警告状态图标',
        info: '信息状态图标',
      },
      function: {
        config: '配置功能图标',
        file: '文件功能图标',
        folder: '文件夹功能图标',
        theme: '主题功能图标',
        edit: '编辑功能图标',
        validate: '验证功能图标',
        reset: '重置功能图标',
      },
      diagnostic: {
        doctor: '诊断图标',
        platform: '平台图标',
        terminal: '终端图标',
      },
      interactive: {
        goodbye: '告别图标',
        prompt: '提示图标',
      },
    },
    system: {
      terminalDetection: '🖥️  正在检测终端能力...',
      nerdFontDetected: 'Nerd Font 支持已检测到',
      nerdFontNotDetected: 'Nerd Font 支持未检测到或检查失败',
      emojiDetected: '完整表情符号支持已检测到',
      emojiNotDetected: '完整表情符号支持未检测到或检查失败',
      colorsDetected: '颜色支持已检测到',
      colorsNotDetected: '颜色支持未检测到',
      usingIconSet: '使用图标集: {{iconSet}}',
    },
  },
};

/**
 * 英文翻译资源 | English translation resources
 */
const enTranslations: TranslationKeys = {
  editor: {
    themes: {
      title: 'Select theme:',
      applied: '✅ Applied theme: {{theme}}',
      items: {
        classic: {
          name: 'Classic Theme - Traditional separators, maximum compatibility',
        },
        powerline: {
          name: 'Powerline Theme - Arrow seamless connection, requires Nerd Font',
        },
        capsule: {
          name: 'Capsule Theme - Capsule shape wrapping, modern UI, requires Nerd Font',
        },
        custom: {
          name: 'Custom Theme - Current configuration',
        },
      },
    },
  },
  messages: {
    cancelled: 'Cancelled',
    goodbye: '👋 Goodbye!',
  },
  config: {
    reset: {
      confirm: 'Are you sure you want to reset configuration to defaults?',
      success: '✅ Configuration reset to defaults',
    },
  },
  icons: {
    types: {
      status: {
        success: 'Success status icon',
        error: 'Error status icon',
        warning: 'Warning status icon',
        info: 'Info status icon',
      },
      function: {
        config: 'Configuration function icon',
        file: 'File function icon',
        folder: 'Folder function icon',
        theme: 'Theme function icon',
        edit: 'Edit function icon',
        validate: 'Validate function icon',
        reset: 'Reset function icon',
      },
      diagnostic: {
        doctor: 'Diagnostic icon',
        platform: 'Platform icon',
        terminal: 'Terminal icon',
      },
      interactive: {
        goodbye: 'Goodbye icon',
        prompt: 'Prompt icon',
      },
    },
    system: {
      terminalDetection: '🖥️  Detecting terminal capabilities...',
      nerdFontDetected: 'Nerd Font support detected',
      nerdFontNotDetected: 'Nerd Font support not detected or check failed',
      emojiDetected: 'Full emoji support detected',
      emojiNotDetected: 'Full emoji support not detected or check failed',
      colorsDetected: 'Color support detected',
      colorsNotDetected: 'Color support not detected',
      usingIconSet: 'Using icon set: {{iconSet}}',
    },
  },
};

/**
 * 翻译资源映射 | Translation resource mapping
 */
const translations: Record<SupportedLanguage, TranslationKeys> = {
  zh: zhTranslations,
  en: enTranslations,
};

/**
 * 国际化管理器类 | Internationalization manager class
 */
export class I18nManager {
  private currentLanguage: SupportedLanguage = 'zh';
  private configLoader: ConfigLoader;
  private translationCache: Map<string, string> = new Map();

  constructor() {
    this.configLoader = new ConfigLoader();
    this.currentLanguage = this.detectSystemLanguage();
  }

  /**
   * 初始化i18n系统 | Initialize i18n system
   */
  async initialize(): Promise<void> {
    try {
      // 从配置中读取语言设置
      const config = await this.configLoader.loadConfig();
      if (config.language) {
        this.currentLanguage = config.language as SupportedLanguage;
      }
    } catch {
      // 配置加载失败时使用系统检测结果
      this.currentLanguage = this.detectSystemLanguage();
    }
  }

  /**
   * 检测系统语言 | Detect system language
   */
  detectSystemLanguage(): SupportedLanguage {
    // 检查环境变量
    const lang = process.env.LANG || process.env.LC_ALL || process.env.LANGUAGE || '';

    // 检查中文locale
    if (lang.includes('zh') || lang.includes('CN') || lang.includes('TW') || lang.includes('HK')) {
      return 'zh';
    }

    // 默认使用中文
    return 'zh';
  }

  /**
   * 获取当前语言 | Get current language
   */
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * 设置语言 | Set language
   */
  async setLanguage(language: SupportedLanguage): Promise<void> {
    if (language !== this.currentLanguage) {
      this.currentLanguage = language;
      this.translationCache.clear(); // 清理缓存

      // 保存到配置文件
      try {
        const config = await this.configLoader.loadConfig();
        config.language = language;
        await this.configLoader.save(config);
      } catch (error) {
        // 配置保存失败时只更新内存中的语言设置
        console.warn('Failed to save language setting to config:', error);
      }
    }
  }

  /**
   * 获取翻译文本 | Get translated text
   */
  t(key: string, params?: TranslationParams): string {
    // 检查缓存
    const cacheKey = `${this.currentLanguage}:${key}:${JSON.stringify(params || {})}`;
    const cached = this.translationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 获取翻译
    const translation = this.getNestedTranslation(translations[this.currentLanguage], key);

    if (!translation) {
      // 回退到英文
      const fallback = this.getNestedTranslation(translations.en, key);
      if (fallback) {
        const result = this.interpolate(fallback, params);
        this.translationCache.set(cacheKey, result);
        return result;
      }

      // 如果英文也没有，返回key本身
      console.warn(`Translation not found for key: ${key}`);
      return key;
    }

    const result = this.interpolate(translation, params);
    this.translationCache.set(cacheKey, result);
    return result;
  }

  /**
   * 获取嵌套翻译 | Get nested translation
   */
  private getNestedTranslation(obj: any, key: string): string | undefined {
    const keys = key.split('.');
    let current = obj;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }

    return typeof current === 'string' ? current : undefined;
  }

  /**
   * 字符串插值 | String interpolation
   */
  private interpolate(text: string, params?: TranslationParams): string {
    if (!params) {
      return text;
    }

    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = params[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 检查是否支持指定语言 | Check if language is supported
   */
  isLanguageSupported(language: string): language is SupportedLanguage {
    return language === 'zh' || language === 'en';
  }

  /**
   * 获取支持的语言列表 | Get supported languages
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return ['zh', 'en'];
  }

  /**
   * 清理翻译缓存 | Clear translation cache
   */
  clearCache(): void {
    this.translationCache.clear();
  }

  /**
   * 获取缓存统计信息 | Get cache statistics
   */
  getCacheStats(): { size: number; hits: number } {
    return {
      size: this.translationCache.size,
      hits: 0, // 简化实现，不跟踪命中次数
    };
  }
}

/**
 * 全局i18n管理器实例 | Global i18n manager instance
 */
let globalI18nManager: I18nManager | null = null;

/**
 * 获取全局i18n管理器 | Get global i18n manager
 */
export function getI18nManager(): I18nManager {
  if (!globalI18nManager) {
    globalI18nManager = new I18nManager();
  }
  return globalI18nManager;
}

/**
 * 便捷函数：获取翻译文本 | Convenience function: get translated text
 */
export function t(key: string, params?: TranslationParams): string {
  return getI18nManager().t(key, params);
}

/**
 * 便捷函数：获取当前语言 | Convenience function: get current language
 */
export function getCurrentLanguage(): SupportedLanguage {
  return getI18nManager().getCurrentLanguage();
}

/**
 * 便捷函数：设置语言 | Convenience function: set language
 */
export async function setLanguage(language: SupportedLanguage): Promise<void> {
  return getI18nManager().setLanguage(language);
}

/**
 * 便捷函数：检测系统语言 | Convenience function: detect system language
 */
export function detectSystemLanguage(): SupportedLanguage {
  return getI18nManager().detectSystemLanguage();
}

/**
 * 便捷函数：初始化i18n系统 | Convenience function: initialize i18n system
 */
export async function initializeI18n(): Promise<void> {
  return getI18nManager().initialize();
}
