/**
 * 建议管理器 - Suggestion Manager
 * 负责智能配置建议、终端能力检测和优化建议功能
 *
 * 核心功能:
 * - 基于终端能力的智能配置建议
 * - 性能优化建议
 * - 兼容性检查和建议
 * - 用户体验优化建议
 * - Git仓库状态建议
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Config } from '../../config/schema.js';
import { TerminalDetector } from '../../terminal/detector.js';
import { t } from '../i18n.js';

/**
 * 建议类型枚举
 */
export enum SuggestionType {
  TERMINAL = 'terminal',
  THEME = 'theme',
  PERFORMANCE = 'performance',
  GIT = 'git',
  COMPONENT = 'component',
  ACCESSIBILITY = 'accessibility',
  COMPATIBILITY = 'compatibility',
  OPTIMIZATION = 'optimization',
  CONFIGURATION = 'configuration',
}

/**
 * 建议级别枚举
 */
export enum SuggestionLevel {
  INFO = 'info',
  RECOMMENDATION = 'recommendation',
  WARNING = 'warning',
  CRITICAL = 'critical',
  URGENT = 'urgent',
}

/**
 * 建议接口
 */
export interface Suggestion {
  id: string;
  type: SuggestionType;
  level: SuggestionLevel;
  title: string;
  description: string;
  action?: string;
  icon?: string;
  priority?: number; // 优先级排序
  contextData?: Record<string, any>; // 上下文数据
  autoApplicable?: boolean; // 是否可自动应用
  relatedConfig?: string[]; // 相关配置路径
  estimatedImpact?: 'low' | 'medium' | 'high'; // 预估影响级别
}

/**
 * 建议管理器选项接口
 */
export interface SuggestionManagerOptions {
  /** 是否启用详细建议 */
  enableDetailedSuggestions?: boolean;
  /** 是否检查性能相关建议 */
  enablePerformanceSuggestions?: boolean;
  /** 是否检查Git相关建议 */
  enableGitSuggestions?: boolean;
  /** 是否启用配置冲突检测 */
  enableConflictDetection?: boolean;
  /** 是否启用优化建议 */
  enableOptimizationSuggestions?: boolean;
  /** 建议最大数量限制 */
  maxSuggestions?: number;
  /** 隐藏低优先级建议 */
  hideLowPriority?: boolean;
}

/**
 * 建议管理器类
 * 专门处理智能配置建议相关的所有功能
 */
export class SuggestionManager {
  private terminalDetector: TerminalDetector;
  private options: Required<SuggestionManagerOptions>;
  private configAnalysisCache: Map<string, any> = new Map();

  constructor(options: SuggestionManagerOptions = {}) {
    this.terminalDetector = new TerminalDetector();
    this.options = {
      enableDetailedSuggestions: options.enableDetailedSuggestions ?? true,
      enablePerformanceSuggestions: options.enablePerformanceSuggestions ?? true,
      enableGitSuggestions: options.enableGitSuggestions ?? true,
      enableConflictDetection: options.enableConflictDetection ?? true,
      enableOptimizationSuggestions: options.enableOptimizationSuggestions ?? true,
      maxSuggestions: options.maxSuggestions ?? 20,
      hideLowPriority: options.hideLowPriority ?? false,
    };
  }

  /**
   * 显示智能配置建议 | Show Intelligent Configuration Suggestions
   * 基于终端能力检测提供个性化配置建议
   * 从 config-editor.ts 第197-289行迁移和增强
   */
  showIntelligentSuggestions(config: Config): void {
    const capabilities = this.terminalDetector.detectCapabilities();
    const suggestions = this.generateAllSuggestions(config, capabilities);

    if (suggestions.length === 0) {
      console.log(
        '\n✨ 当前配置已优化，暂无建议 | Current configuration is optimized, no suggestions available'
      );
      return;
    }

    // 显示建议
    console.log('\n🤖 智能配置建议 | Intelligent Configuration Suggestions:');
    this.displaySuggestions(suggestions);
  }

  /**
   * 生成所有建议
   */
  private generateAllSuggestions(config: Config, capabilities: any): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const configKey = JSON.stringify({ config, capabilities });

    // 检查缓存
    if (this.configAnalysisCache.has(configKey)) {
      const cached = this.configAnalysisCache.get(configKey);
      if (Date.now() - cached.timestamp < 5000) {
        // 5秒缓存
        return cached.suggestions;
      }
    }

    // 配置冲突检测（最高优先级）
    if (this.options.enableConflictDetection) {
      suggestions.push(...this.generateConfigurationConflictSuggestions(config, capabilities));
    }

    // 紧急建议（系统无法正常工作）
    suggestions.push(...this.generateUrgentSuggestions(config, capabilities));

    // 终端能力相关建议
    suggestions.push(...this.generateTerminalSuggestions(config, capabilities));

    // 主题兼容性建议
    suggestions.push(...this.generateThemeSuggestions(config, capabilities));

    // 兼容性检查
    suggestions.push(...this.generateCompatibilitySuggestions(config, capabilities));

    // Git仓库相关建议
    if (this.options.enableGitSuggestions) {
      suggestions.push(...this.generateGitSuggestions(config));
    }

    // Token使用相关建议
    suggestions.push(...this.generateTokenSuggestions(config));

    // 性能优化建议
    if (this.options.enablePerformanceSuggestions) {
      suggestions.push(...this.generatePerformanceSuggestions(config, capabilities));
    }

    // 组件配置建议
    suggestions.push(...this.generateComponentSuggestions(config));

    // 优化建议
    if (this.options.enableOptimizationSuggestions) {
      suggestions.push(...this.generateOptimizationSuggestions(config, capabilities));
    }

    // 可访问性建议
    suggestions.push(...this.generateAccessibilitySuggestions(config, capabilities));

    // 智能排序和过滤
    const filteredSuggestions = this.prioritizeAndFilterSuggestions(suggestions);

    // 缓存结果
    this.configAnalysisCache.set(configKey, {
      suggestions: filteredSuggestions,
      timestamp: Date.now(),
    });

    return filteredSuggestions;
  }

  /**
   * 智能排序和过滤建议
   */
  private prioritizeAndFilterSuggestions(suggestions: Suggestion[]): Suggestion[] {
    // 去重
    const uniqueSuggestions = suggestions.filter(
      (suggestion, index, self) => index === self.findIndex((s) => s.id === suggestion.id)
    );

    // 按优先级排序
    const sortedSuggestions = uniqueSuggestions.sort((a, b) => {
      // 首先按级别排序
      const levelPriority = {
        [SuggestionLevel.URGENT]: 5,
        [SuggestionLevel.CRITICAL]: 4,
        [SuggestionLevel.WARNING]: 3,
        [SuggestionLevel.RECOMMENDATION]: 2,
        [SuggestionLevel.INFO]: 1,
      };

      const levelDiff = levelPriority[b.level] - levelPriority[a.level];
      if (levelDiff !== 0) return levelDiff;

      // 然后按自定义优先级排序
      const priorityDiff = (b.priority || 0) - (a.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;

      // 最后按影响程度排序
      const impactPriority = { high: 3, medium: 2, low: 1 };
      return (
        (impactPriority[b.estimatedImpact || 'low'] || 1) -
        (impactPriority[a.estimatedImpact || 'low'] || 1)
      );
    });

    // 过滤低优先级建议
    const filteredSuggestions = this.options.hideLowPriority
      ? sortedSuggestions.filter(
          (s) => s.level !== SuggestionLevel.INFO || (s.priority && s.priority > 5)
        )
      : sortedSuggestions;

    // 限制数量
    return filteredSuggestions.slice(0, this.options.maxSuggestions);
  }

  /**
   * 生成紧急建议（系统无法正常工作）
   */
  private generateUrgentSuggestions(config: Config, capabilities: any): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // 检查是否没有任何组件启用
    const hasEnabledComponents =
      config.components &&
      Object.keys(config.components)
        .filter((key) => key !== 'order')
        .some((key) => {
          const component = config.components?.[key as keyof typeof config.components];
          return component && typeof component === 'object' && 'enabled' in component
            ? component.enabled !== false
            : true;
        });

    if (!hasEnabledComponents) {
      suggestions.push({
        id: 'urgent-no-components',
        type: SuggestionType.CONFIGURATION,
        level: SuggestionLevel.URGENT,
        title: '系统无法工作：没有启用的组件',
        description: '当前配置没有任何启用的组件，状态行将无法显示任何信息',
        action: '至少启用一个组件（推荐：project, model, tokens）',
        icon: '🚨',
        priority: 100,
        estimatedImpact: 'high',
        autoApplicable: true,
        relatedConfig: ['components'],
      });
    }

    // 检查主题与终端能力的严重不匹配
    if (
      (config.theme === 'powerline' || config.theme === 'capsule') &&
      !capabilities.nerdFont &&
      !capabilities.emoji
    ) {
      suggestions.push({
        id: 'urgent-theme-incompatible',
        type: SuggestionType.COMPATIBILITY,
        level: SuggestionLevel.URGENT,
        title: '主题完全不兼容',
        description: '当前主题需要Nerd Font支持，但终端不支持任何图标，可能导致显示乱码',
        action: '立即切换到Classic主题或配置终端字体',
        icon: '🚨',
        priority: 90,
        estimatedImpact: 'high',
        relatedConfig: ['theme', 'style.enable_nerd_font'],
        contextData: { currentTheme: config.theme, terminalCapabilities: capabilities },
      });
    }

    return suggestions;
  }

  /**
   * 生成配置冲突建议
   */
  private generateConfigurationConflictSuggestions(
    config: Config,
    _capabilities: any
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // 检查样式配置冲突
    if (config.style?.enable_colors === false && config.components?.tokens) {
      const tokenConfig = config.components.tokens as any;
      if (tokenConfig.show_gradient) {
        suggestions.push({
          id: 'conflict-gradient-no-colors',
          type: SuggestionType.CONFIGURATION,
          level: SuggestionLevel.WARNING,
          title: '配置冲突：渐变与颜色设置',
          description: '启用了Token渐变但禁用了颜色显示，渐变效果将无法显示',
          action: '启用颜色显示或禁用Token渐变',
          icon: '⚠️',
          priority: 70,
          estimatedImpact: 'medium',
          relatedConfig: ['style.enable_colors', 'components.tokens.show_gradient'],
          contextData: { conflictType: 'gradient_colors' },
        });
      }
    }

    // 检查强制设置与自动检测的冲突
    if (
      config.terminal?.force_text &&
      (config.style?.enable_emoji || config.style?.enable_nerd_font)
    ) {
      suggestions.push({
        id: 'conflict-force-text-icons',
        type: SuggestionType.CONFIGURATION,
        level: SuggestionLevel.WARNING,
        title: '配置冲突：强制文本模式与图标',
        description: '强制启用了文本模式但同时启用了emoji或nerd font',
        action: '统一图标显示策略，建议使用auto模式',
        icon: '⚠️',
        priority: 60,
        estimatedImpact: 'medium',
        relatedConfig: ['terminal.force_text', 'style.enable_emoji', 'style.enable_nerd_font'],
      });
    }

    // 检查组件顺序与启用状态冲突
    if (config.components?.order) {
      const enabledComponents = Object.keys(config.components)
        .filter((key) => key !== 'order')
        .filter((key) => {
          const component = config.components?.[key as keyof typeof config.components];
          return component && typeof component === 'object' && 'enabled' in component
            ? component.enabled !== false
            : true;
        });

      const orderComponents = config.components.order;
      const disabledInOrder = orderComponents.filter(
        (component) => !enabledComponents.includes(component)
      );

      if (disabledInOrder.length > 0) {
        suggestions.push({
          id: 'conflict-order-disabled-components',
          type: SuggestionType.CONFIGURATION,
          level: SuggestionLevel.RECOMMENDATION,
          title: '组件顺序包含已禁用组件',
          description: `组件顺序中包含已禁用的组件: ${disabledInOrder.join(', ')}`,
          action: '从组件顺序中移除已禁用的组件',
          icon: '📋',
          priority: 40,
          estimatedImpact: 'low',
          relatedConfig: ['components.order'],
          contextData: { disabledComponents: disabledInOrder },
        });
      }
    }

    return suggestions;
  }

  /**
   * 生成兼容性建议
   */
  private generateCompatibilitySuggestions(config: Config, capabilities: any): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // 深度兼容性分析
    const compatibilityScore = this.calculateCompatibilityScore(config, capabilities);

    if (compatibilityScore < 0.7) {
      suggestions.push({
        id: 'compatibility-overall-poor',
        type: SuggestionType.COMPATIBILITY,
        level: SuggestionLevel.RECOMMENDATION,
        title: `总体兼容性较低 (${Math.round(compatibilityScore * 100)}%)`,
        description: '当前配置与终端能力匹配度不高，建议优化配置以获得更好体验',
        action: '运行兼容性优化向导',
        icon: '📊',
        priority: 50,
        estimatedImpact: 'high',
        contextData: {
          score: compatibilityScore,
          details: this.getCompatibilityDetails(config, capabilities),
        },
      });
    }

    // 特定平台建议
    const platformSuggestions = this.generatePlatformSpecificSuggestions(config, capabilities);
    suggestions.push(...platformSuggestions);

    return suggestions;
  }

  /**
   * 计算兼容性评分
   */
  private calculateCompatibilityScore(config: Config, capabilities: any): number {
    let score = 1.0;
    let _factors = 0;

    // 主题兼容性 (权重: 0.3)
    _factors++;
    if (config.theme === 'powerline' || config.theme === 'capsule') {
      if (!capabilities.nerdFont) {
        score -= 0.3;
      }
    }

    // 颜色兼容性 (权重: 0.2)
    _factors++;
    if (config.style?.enable_colors !== false && !capabilities.colors) {
      score -= 0.2;
    }

    // 图标兼容性 (权重: 0.2)
    _factors++;
    const iconMismatch = this.checkIconCompatibility(config, capabilities);
    score -= iconMismatch * 0.2;

    // Token组件复杂功能兼容性 (权重: 0.15)
    _factors++;
    if (config.components?.tokens) {
      const tokenConfig = config.components.tokens as any;
      if (tokenConfig.show_gradient && !capabilities.colors) {
        score -= 0.15;
      }
    }

    // 性能配置合理性 (权重: 0.15)
    _factors++;
    const performanceIssues = this.checkPerformanceConfiguration(config);
    score -= performanceIssues * 0.15;

    return Math.max(0, score);
  }

  /**
   * 检查图标兼容性
   */
  private checkIconCompatibility(config: Config, capabilities: any): number {
    let mismatchLevel = 0;

    if (config.style?.enable_nerd_font && !capabilities.nerdFont) {
      mismatchLevel += 0.5;
    }

    if (config.style?.enable_emoji && !capabilities.emoji) {
      mismatchLevel += 0.3;
    }

    return Math.min(1, mismatchLevel);
  }

  /**
   * 检查性能配置
   */
  private checkPerformanceConfiguration(config: Config): number {
    let issueLevel = 0;

    // 检查Token组件配置
    if (config.components?.tokens) {
      const tokenConfig = config.components.tokens as any;
      if (tokenConfig.progress_width && tokenConfig.progress_width > 30) {
        issueLevel += 0.2; // 进度条过宽可能影响性能
      }
    }

    // 检查组件数量
    const enabledComponents = Object.keys(config.components || {}).filter((key) => {
      if (key === 'order') return false;
      const component = config.components?.[key as keyof typeof config.components];
      return component && typeof component === 'object' && 'enabled' in component
        ? component.enabled !== false
        : true;
    });

    if (enabledComponents.length > 6) {
      issueLevel += 0.3; // 组件过多可能影响性能
    }

    return Math.min(1, issueLevel);
  }

  /**
   * 获取兼容性详情
   */
  private getCompatibilityDetails(config: Config, capabilities: any): Record<string, any> {
    return {
      theme: {
        current: config.theme,
        compatible: this.isThemeCompatible(config.theme, capabilities),
        recommendation: this.getRecommendedTheme(capabilities),
      },
      icons: {
        nerdFont: { enabled: config.style?.enable_nerd_font, supported: capabilities.nerdFont },
        emoji: { enabled: config.style?.enable_emoji, supported: capabilities.emoji },
        colors: { enabled: config.style?.enable_colors, supported: capabilities.colors },
      },
      performance: {
        componentsCount: Object.keys(config.components || {}).length,
        estimatedLoad: this.estimatePerformanceLoad(config),
      },
    };
  }

  /**
   * 检查主题兼容性
   */
  private isThemeCompatible(theme: string | undefined, capabilities: any): boolean {
    if (!theme) return true;
    if (theme === 'classic') return true;
    if (theme === 'powerline' || theme === 'capsule') {
      return capabilities.nerdFont;
    }
    return true;
  }

  /**
   * 获取推荐主题
   */
  private getRecommendedTheme(capabilities: any): string {
    if (capabilities.nerdFont) return 'powerline';
    if (capabilities.emoji) return 'classic';
    return 'classic';
  }

  /**
   * 估算性能负载
   */
  private estimatePerformanceLoad(config: Config): 'low' | 'medium' | 'high' {
    let load = 0;

    // 组件数量影响
    const componentCount = Object.keys(config.components || {}).filter((k) => k !== 'order').length;
    load += componentCount * 1;

    // 复杂功能影响
    if (config.components?.tokens) {
      const tokenConfig = config.components.tokens as any;
      if (tokenConfig.show_gradient) load += 2;
      if (tokenConfig.show_progress_bar) load += 1;
    }

    if (config.components?.branch) {
      const branchConfig = config.components.branch as any;
      if (branchConfig.show_ahead_behind) load += 2;
    }

    if (load <= 5) return 'low';
    if (load <= 10) return 'medium';
    return 'high';
  }

  /**
   * 生成平台特定建议
   */
  private generatePlatformSpecificSuggestions(_config: Config, capabilities: any): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const platform = process.platform;

    // Windows 特定建议
    if (platform === 'win32') {
      if (!process.env.WT_SESSION && !process.env.TERM_PROGRAM) {
        suggestions.push({
          id: 'platform-windows-terminal-upgrade',
          type: SuggestionType.COMPATIBILITY,
          level: SuggestionLevel.RECOMMENDATION,
          title: 'Windows 终端升级建议',
          description: '检测到 Windows 系统，建议使用 Windows Terminal 以获得更好的显示效果',
          action: '安装 Windows Terminal 或配置支持的终端',
          icon: '🪟',
          priority: 30,
          estimatedImpact: 'high',
          contextData: { platform: 'windows', currentTerminal: 'cmd_or_powershell' },
        });
      }

      // Windows 下的字体建议
      if (!capabilities.nerdFont) {
        suggestions.push({
          id: 'platform-windows-font',
          type: SuggestionType.COMPATIBILITY,
          level: SuggestionLevel.RECOMMENDATION,
          title: 'Windows 字体配置',
          description: 'Windows 系统建议安装并配置 Cascadia Code Nerd Font',
          action: '下载并安装 Cascadia Code Nerd Font，在终端设置中配置',
          icon: '🔤',
          priority: 25,
          estimatedImpact: 'medium',
        });
      }
    }

    // macOS 特定建议
    if (platform === 'darwin') {
      if (process.env.TERM_PROGRAM === 'Apple_Terminal' && !capabilities.nerdFont) {
        suggestions.push({
          id: 'platform-macos-terminal',
          type: SuggestionType.COMPATIBILITY,
          level: SuggestionLevel.RECOMMENDATION,
          title: 'macOS 终端升级建议',
          description: '建议使用 iTerm2 或配置 Terminal.app 以获得更好的字体支持',
          action: '安装 iTerm2 或在 Terminal.app 中配置 Nerd Font',
          icon: '🍎',
          priority: 30,
          estimatedImpact: 'high',
        });
      }
    }

    return suggestions;
  }

  /**
   * 生成优化建议
   */
  private generateOptimizationSuggestions(config: Config, capabilities: any): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // 配置简化建议
    const simplificationOpportunities = this.findSimplificationOpportunities(config);
    suggestions.push(...simplificationOpportunities);

    // 性能优化建议
    const performanceOptimizations = this.findPerformanceOptimizations(config, capabilities);
    suggestions.push(...performanceOptimizations);

    // 用户体验优化建议
    const uxOptimizations = this.findUXOptimizations(config, capabilities);
    suggestions.push(...uxOptimizations);

    return suggestions;
  }

  /**
   * 查找配置简化机会
   */
  private findSimplificationOpportunities(config: Config): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // 检查是否有过多未使用的配置
    const unusedConfigs = this.detectUnusedConfigurations(config);
    if (unusedConfigs.length > 0) {
      suggestions.push({
        id: 'optimization-unused-config',
        type: SuggestionType.OPTIMIZATION,
        level: SuggestionLevel.INFO,
        title: '发现未使用的配置项',
        description: `检测到 ${unusedConfigs.length} 个可能未使用的配置项，可以考虑清理`,
        action: '审查并移除不需要的配置项',
        icon: '🧹',
        priority: 15,
        estimatedImpact: 'low',
        contextData: { unusedConfigs },
      });
    }

    // 检查组件配置复杂度
    const componentComplexity = this.analyzeComponentComplexity(config);
    if (componentComplexity.high.length > 0) {
      suggestions.push({
        id: 'optimization-component-complexity',
        type: SuggestionType.OPTIMIZATION,
        level: SuggestionLevel.INFO,
        title: '组件配置复杂度较高',
        description: `${componentComplexity.high.join(', ')} 组件配置较复杂，可以考虑简化`,
        action: '查看组件默认配置，移除不必要的自定义设置',
        icon: '⚙️',
        priority: 10,
        estimatedImpact: 'low',
        contextData: { complexComponents: componentComplexity },
      });
    }

    return suggestions;
  }

  /**
   * 查找性能优化机会
   */
  private findPerformanceOptimizations(config: Config, _capabilities: any): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // 检查Git操作性能
    if (config.components?.branch) {
      const branchConfig = config.components.branch as any;
      if (branchConfig.show_ahead_behind && !branchConfig.cache_timeout) {
        suggestions.push({
          id: 'optimization-git-cache',
          type: SuggestionType.OPTIMIZATION,
          level: SuggestionLevel.RECOMMENDATION,
          title: 'Git 性能优化',
          description: '启用了 ahead/behind 显示但未配置缓存，可能在大型仓库中性能较慢',
          action: '配置 cache_timeout 以提高 Git 操作性能',
          icon: '⚡',
          priority: 45,
          estimatedImpact: 'medium',
          relatedConfig: ['components.branch.cache_timeout'],
        });
      }
    }

    // 检查Token渐变性能
    if (config.components?.tokens) {
      const tokenConfig = config.components.tokens as any;
      if (tokenConfig.show_gradient && tokenConfig.progress_width > 20) {
        suggestions.push({
          id: 'optimization-token-gradient',
          type: SuggestionType.OPTIMIZATION,
          level: SuggestionLevel.INFO,
          title: 'Token 渐变性能优化',
          description: '进度条宽度较大可能影响渲染性能，建议调整为15-20',
          action: '降低 progress_width 以提高渲染性能',
          icon: '📊',
          priority: 20,
          estimatedImpact: 'low',
          relatedConfig: ['components.tokens.progress_width'],
        });
      }
    }

    return suggestions;
  }

  /**
   * 查找用户体验优化机会
   */
  private findUXOptimizations(config: Config, capabilities: any): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // 检查组件顺序优化
    if (config.components?.order) {
      const orderAnalysis = this.analyzeComponentOrder(config.components.order);
      if (orderAnalysis.canOptimize) {
        suggestions.push({
          id: 'optimization-component-order',
          type: SuggestionType.OPTIMIZATION,
          level: SuggestionLevel.INFO,
          title: '组件顺序可以优化',
          description: orderAnalysis.suggestion,
          action: `建议调整为: ${orderAnalysis.recommended.join(' → ')}`,
          icon: '📋',
          priority: 15,
          estimatedImpact: 'low',
          relatedConfig: ['components.order'],
        });
      }
    }

    // 检查颜色主题优化
    if (capabilities.colors && config.theme === 'classic') {
      suggestions.push({
        id: 'optimization-theme-upgrade',
        type: SuggestionType.OPTIMIZATION,
        level: SuggestionLevel.INFO,
        title: '主题升级建议',
        description: '终端支持高级特性，可以考虑升级到更现代的主题',
        action: capabilities.nerdFont ? '尝试 Powerline 或 Capsule 主题' : '尝试启用更多视觉效果',
        icon: '🎨',
        priority: 10,
        estimatedImpact: 'medium',
      });
    }

    return suggestions;
  }

  /**
   * 检测未使用的配置
   */
  private detectUnusedConfigurations(_config: Config): string[] {
    const unused: string[] = [];

    // 这里需要根据实际配置结构来检测
    // 简化实现，检查一些常见的未使用情况

    return unused;
  }

  /**
   * 分析组件复杂度
   */
  private analyzeComponentComplexity(config: Config): {
    low: string[];
    medium: string[];
    high: string[];
  } {
    const complexity = { low: [] as string[], medium: [] as string[], high: [] as string[] };

    if (config.components) {
      for (const [name, componentConfig] of Object.entries(config.components)) {
        if (name === 'order') continue;

        const configCount =
          componentConfig && typeof componentConfig === 'object'
            ? Object.keys(componentConfig).length
            : 0;

        if (configCount > 8) {
          complexity.high.push(name);
        } else if (configCount > 4) {
          complexity.medium.push(name);
        } else {
          complexity.low.push(name);
        }
      }
    }

    return complexity;
  }

  /**
   * 分析组件顺序
   */
  private analyzeComponentOrder(order: string[]): {
    canOptimize: boolean;
    suggestion: string;
    recommended: string[];
  } {
    // 推荐的组件顺序逻辑
    const recommendedOrder = ['project', 'model', 'branch', 'tokens', 'usage', 'status'];
    const currentOrder = order;

    // 简单检查是否与推荐顺序差异较大
    const similarity = this.calculateOrderSimilarity(currentOrder, recommendedOrder);

    if (similarity < 0.7) {
      return {
        canOptimize: true,
        suggestion: '当前组件顺序可以优化以提高信息层次和可读性',
        recommended: recommendedOrder.filter((comp) => currentOrder.includes(comp)),
      };
    }

    return { canOptimize: false, suggestion: '', recommended: [] };
  }

  /**
   * 计算顺序相似度
   */
  private calculateOrderSimilarity(current: string[], recommended: string[]): number {
    if (current.length === 0) return 0;

    let matches = 0;
    const minLength = Math.min(current.length, recommended.length);

    for (let i = 0; i < minLength; i++) {
      if (current[i] === recommended[i]) {
        matches++;
      }
    }

    return matches / minLength;
  }

  /**
   * 生成终端能力相关建议
   */
  private generateTerminalSuggestions(_config: Config, capabilities: any): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // 终端能力相关建议
    if (capabilities.nerdFont) {
      suggestions.push({
        id: 'terminal-nerd-font-detected',
        type: SuggestionType.TERMINAL,
        level: SuggestionLevel.RECOMMENDATION,
        title: '检测到Nerd Font支持',
        description: '建议使用Powerline或Capsule主题获得最佳视觉效果',
        action: '在主题配置中选择 powerline 或 capsule',
        icon: '💡',
        priority: 75,
        estimatedImpact: 'high',
        relatedConfig: ['theme'],
        contextData: { terminalCapability: 'nerdFont' },
      });

      suggestions.push({
        id: 'terminal-advanced-features',
        type: SuggestionType.TERMINAL,
        level: SuggestionLevel.INFO,
        title: '高级特性可用',
        description: '可以启用Branch组件的精细Git状态显示，包括ahead/behind计数',
        action: '在Branch组件中启用状态显示选项',
        icon: '💡',
        priority: 35,
        estimatedImpact: 'medium',
        relatedConfig: ['components.branch.show_ahead_behind'],
      });

      suggestions.push({
        id: 'terminal-token-progress',
        type: SuggestionType.TERMINAL,
        level: SuggestionLevel.INFO,
        title: 'Token可视化增强',
        description: 'Token组件可以启用精细进度条显示，提供更直观的使用量可视化',
        action: '在Token组件中启用渐变进度条',
        icon: '💡',
        priority: 30,
        estimatedImpact: 'medium',
        relatedConfig: ['components.tokens.show_gradient', 'components.tokens.show_progress_bar'],
      });
    } else if (capabilities.emoji) {
      suggestions.push({
        id: 'terminal-emoji-support',
        type: SuggestionType.TERMINAL,
        level: SuggestionLevel.RECOMMENDATION,
        title: '终端支持Emoji',
        description: '建议使用Classic主题配合表情符号图标',
        action: '在样式设置中启用emoji图标',
        icon: '⚡',
        priority: 60,
        estimatedImpact: 'medium',
        relatedConfig: ['style.enable_emoji'],
      });

      suggestions.push({
        id: 'terminal-upgrade-nerd-font',
        type: SuggestionType.TERMINAL,
        level: SuggestionLevel.RECOMMENDATION,
        title: 'Nerd Font升级建议',
        description: '可以设置TERMINAL_FONT环境变量来启用Nerd Font支持',
        action: '安装Nerd Font并配置环境变量',
        icon: '⚡',
        priority: 50,
        estimatedImpact: 'high',
        contextData: { upgradeOpportunity: 'nerdFont' },
      });
    } else {
      suggestions.push({
        id: 'terminal-text-only',
        type: SuggestionType.TERMINAL,
        level: SuggestionLevel.WARNING,
        title: '终端仅支持文本模式',
        description: '建议使用Classic主题配合文本图标',
        action: '在主题配置中选择 classic，禁用emoji和nerd font',
        icon: '⚠️',
        priority: 80,
        estimatedImpact: 'high',
        relatedConfig: ['theme', 'style.enable_emoji', 'style.enable_nerd_font'],
      });

      suggestions.push({
        id: 'terminal-upgrade-recommended',
        type: SuggestionType.TERMINAL,
        level: SuggestionLevel.RECOMMENDATION,
        title: '建议升级终端',
        description: '考虑升级终端或配置Nerd Font以获得更好体验',
        action: '升级到支持现代特性的终端应用',
        icon: '⚠️',
        priority: 45,
        estimatedImpact: 'high',
        contextData: { upgradeType: 'terminal_application' },
      });
    }

    // 颜色支持检查
    if (!capabilities.colors) {
      suggestions.push({
        id: 'terminal-no-colors',
        type: SuggestionType.TERMINAL,
        level: SuggestionLevel.WARNING,
        title: '终端不支持颜色显示',
        description: '建议在样式设置中关闭颜色和渐变效果',
        action: '设置 enable_colors = false',
        icon: '⚠️',
        priority: 75,
        estimatedImpact: 'medium',
        relatedConfig: ['style.enable_colors'],
      });

      suggestions.push({
        id: 'token-no-gradient',
        type: SuggestionType.COMPONENT,
        level: SuggestionLevel.WARNING,
        title: 'Token渐变建议',
        description: '建议关闭Token组件的渐变进度条，使用纯文本显示模式',
        action: '在Token组件中设置 show_gradient = false',
        icon: '⚠️',
        priority: 65,
        estimatedImpact: 'medium',
        relatedConfig: ['components.tokens.show_gradient'],
      });
    }

    return suggestions;
  }

  /**
   * 生成主题兼容性建议
   */
  private generateThemeSuggestions(config: Config, capabilities: any): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // 主题兼容性建议
    if (config.theme === 'powerline' && !capabilities.nerdFont) {
      suggestions.push({
        id: 'theme-powerline-incompatible',
        type: SuggestionType.THEME,
        level: SuggestionLevel.WARNING,
        title: 'Powerline主题兼容性',
        description: '当前使用Powerline主题但终端不支持Nerd Font，建议切换为Classic主题',
        action: '设置 theme = "classic"',
        icon: '🎨',
        priority: 85,
        estimatedImpact: 'high',
        relatedConfig: ['theme'],
        contextData: { currentTheme: 'powerline', issue: 'nerd_font_missing' },
      });
    }

    if (config.theme === 'capsule' && !capabilities.nerdFont) {
      suggestions.push({
        id: 'theme-capsule-incompatible',
        type: SuggestionType.THEME,
        level: SuggestionLevel.WARNING,
        title: 'Capsule主题兼容性',
        description: '当前使用Capsule主题但终端不支持Nerd Font，建议切换为Classic主题',
        action: '设置 theme = "classic"',
        icon: '🎨',
        priority: 85,
        estimatedImpact: 'high',
        relatedConfig: ['theme'],
        contextData: { currentTheme: 'capsule', issue: 'nerd_font_missing' },
      });
    }

    // 主题升级建议
    if (config.theme === 'classic' && capabilities.nerdFont) {
      suggestions.push({
        id: 'theme-upgrade-opportunity',
        type: SuggestionType.THEME,
        level: SuggestionLevel.INFO,
        title: '主题升级机会',
        description: '终端支持Nerd Font，可以考虑升级到Powerline或Capsule主题获得更好视觉效果',
        action: '尝试 powerline 或 capsule 主题',
        icon: '✨',
        priority: 25,
        estimatedImpact: 'medium',
        relatedConfig: ['theme'],
        contextData: { upgradeFrom: 'classic', availableThemes: ['powerline', 'capsule'] },
      });
    }

    return suggestions;
  }

  /**
   * 生成Git仓库相关建议
   */
  private generateGitSuggestions(config: Config): Suggestion[] {
    const suggestions: Suggestion[] = [];

    try {
      const hasGit = existsSync(join(process.cwd(), '.git'));

      if (!hasGit && config.components?.branch?.enabled !== false) {
        suggestions.push({
          id: 'git-no-repository',
          type: SuggestionType.GIT,
          level: SuggestionLevel.RECOMMENDATION,
          title: '当前目录不是Git仓库',
          description: '建议禁用Branch组件或设置show_when_no_git为false',
          action: '禁用Branch组件或配置 show_when_no_git = false',
          icon: '📁',
          priority: 55,
          estimatedImpact: 'medium',
          relatedConfig: ['components.branch.enabled', 'components.branch.show_when_no_git'],
          contextData: { hasGitRepo: false },
        });
      }

      if (hasGit && config.components?.branch?.enabled !== false) {
        suggestions.push({
          id: 'git-repository-detected',
          type: SuggestionType.GIT,
          level: SuggestionLevel.INFO,
          title: '检测到Git仓库',
          description: '建议启用Branch组件的状态显示功能',
          action: '在Branch组件中启用Git状态显示',
          icon: '🌿',
          priority: 20,
          estimatedImpact: 'medium',
          relatedConfig: ['components.branch.show_status', 'components.branch.show_ahead_behind'],
          contextData: { hasGitRepo: true },
        });
      }

      // 检查大型仓库性能建议
      if (hasGit && config.components?.branch) {
        const branchConfig = config.components.branch as any;
        if (branchConfig.show_ahead_behind && !branchConfig.cache_duration) {
          suggestions.push({
            id: 'git-large-repo-performance',
            type: SuggestionType.GIT,
            level: SuggestionLevel.INFO,
            title: '大型仓库性能优化',
            description: '对于大型仓库，建议设置Git缓存时间以提高性能',
            action: '设置 cache_duration 为 5000-10000ms',
            icon: '⚡',
            priority: 35,
            estimatedImpact: 'medium',
            relatedConfig: ['components.branch.cache_duration'],
          });
        }
      }
    } catch (_error) {
      // 静默处理文件系统错误
    }

    return suggestions;
  }

  /**
   * 生成Token使用相关建议
   */
  private generateTokenSuggestions(config: Config): Suggestion[] {
    const suggestions: Suggestion[] = [];

    if (config.components?.tokens?.enabled !== false) {
      const tokenConfig = config.components?.tokens;
      if (tokenConfig && typeof tokenConfig === 'object') {
        if ('thresholds' in tokenConfig && tokenConfig.thresholds) {
          const thresholds = tokenConfig.thresholds as any;
          if (thresholds.warning && thresholds.warning > 80) {
            suggestions.push({
              id: 'token-threshold-high',
              type: SuggestionType.COMPONENT,
              level: SuggestionLevel.RECOMMENDATION,
              title: 'Token警告阈值偏高',
              description: 'Token警告阈值设置较高，建议降低至60-70%以获得更及时的提醒',
              action: '将warning阈值设置为60-70之间',
              icon: '📊',
              priority: 40,
              estimatedImpact: 'medium',
              relatedConfig: ['components.tokens.thresholds.warning'],
              contextData: { currentThreshold: thresholds.warning, recommended: 65 },
            });
          }

          if (thresholds.critical && thresholds.critical > 95) {
            suggestions.push({
              id: 'token-critical-threshold-high',
              type: SuggestionType.COMPONENT,
              level: SuggestionLevel.INFO,
              title: 'Token严重阈值设置',
              description: '严重阈值设置过高可能导致无法及时警告',
              action: '将critical阈值设置为95%或更低',
              icon: '📊',
              priority: 25,
              estimatedImpact: 'low',
              relatedConfig: ['components.tokens.thresholds.critical'],
            });
          }
        }

        // 检查进度条配置
        if ('progress_width' in tokenConfig && typeof tokenConfig.progress_width === 'number') {
          if (tokenConfig.progress_width < 5) {
            suggestions.push({
              id: 'token-progress-too-small',
              type: SuggestionType.COMPONENT,
              level: SuggestionLevel.INFO,
              title: 'Token进度条过窄',
              description: '进度条宽度过小可能影响可读性',
              action: '建议设置 progress_width 为 10-20',
              icon: '📊',
              priority: 15,
              estimatedImpact: 'low',
              relatedConfig: ['components.tokens.progress_width'],
            });
          }
        }
      }
    }

    return suggestions;
  }

  /**
   * 生成性能优化建议
   */
  private generatePerformanceSuggestions(config: Config, capabilities: any): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Windows Terminal特殊建议
    if (process.env.WT_SESSION && capabilities.nerdFont) {
      suggestions.push({
        id: 'performance-windows-terminal',
        type: SuggestionType.PERFORMANCE,
        level: SuggestionLevel.INFO,
        title: '检测到Windows Terminal',
        description: '建议启用所有高级特性包括渐变和动画效果',
        action: '启用渐变、进度条等视觉增强功能',
        icon: '🪟',
        priority: 30,
        estimatedImpact: 'medium',
        contextData: { terminal: 'windows_terminal', performance: 'high' },
      });
    }

    // VS Code终端特殊建议
    if (process.env.TERM_PROGRAM === 'vscode') {
      suggestions.push({
        id: 'performance-vscode-terminal',
        type: SuggestionType.PERFORMANCE,
        level: SuggestionLevel.INFO,
        title: '检测到VS Code终端',
        description: '建议检查字体设置确保Nerd Font正确配置',
        action: '在VS Code设置中配置terminal.integrated.fontFamily',
        icon: '💻',
        priority: 25,
        estimatedImpact: 'medium',
        relatedConfig: ['terminal.integrated.fontFamily'],
        contextData: { terminal: 'vscode' },
      });

      if (!capabilities.nerdFont) {
        suggestions.push({
          id: 'vscode-nerd-font-config',
          type: SuggestionType.PERFORMANCE,
          level: SuggestionLevel.RECOMMENDATION,
          title: 'VS Code字体配置',
          description:
            'VS Code终端建议在settings.json中设置"terminal.integrated.fontFamily"为Nerd Font',
          action: '配置VS Code终端字体为Nerd Font',
          icon: '💻',
          priority: 55,
          estimatedImpact: 'high',
          contextData: { terminal: 'vscode', issue: 'font_config' },
        });
      }
    }

    // Branch组件性能建议
    if (config.components?.branch?.enabled !== false) {
      suggestions.push({
        id: 'performance-large-repo',
        type: SuggestionType.PERFORMANCE,
        level: SuggestionLevel.INFO,
        title: '大型仓库性能优化',
        description: '对于大型Git仓库，建议在Branch组件性能设置中启用缓存和设置适当超时',
        action: '启用Branch组件缓存和设置合理的超时值',
        icon: '⚡',
        priority: 20,
        estimatedImpact: 'medium',
        relatedConfig: ['components.branch.cache_duration', 'components.branch.timeout'],
      });
    }

    return suggestions;
  }

  /**
   * 生成组件配置建议
   */
  private generateComponentSuggestions(config: Config): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // 检查是否有启用的组件
    if (
      !config.components ||
      Object.keys(config.components).filter((k) => k !== 'order').length === 0
    ) {
      suggestions.push({
        id: 'component-none-enabled',
        type: SuggestionType.COMPONENT,
        level: SuggestionLevel.WARNING,
        title: '没有启用的组件',
        description: '至少启用一个组件以显示状态栏信息',
        action: '在组件配置中启用所需的组件',
        icon: '🔧',
      });
    }

    // 检查组件顺序
    if (!config.components?.order || config.components.order.length === 0) {
      suggestions.push({
        id: 'component-no-order',
        type: SuggestionType.COMPONENT,
        level: SuggestionLevel.RECOMMENDATION,
        title: '未设置组件顺序',
        description: '建议设置components.order来控制组件显示顺序',
        action: '配置components.order数组',
        icon: '📊',
      });
    }

    // Usage组件建议
    if (config.components?.usage?.enabled !== false) {
      suggestions.push({
        id: 'component-usage-info',
        type: SuggestionType.COMPONENT,
        level: SuggestionLevel.INFO,
        title: 'Usage组件可用',
        description: '启用Usage组件可以显示详细的使用成本和统计信息',
        action: '考虑启用Usage组件以监控使用情况',
        icon: '💰',
      });
    }

    return suggestions;
  }

  /**
   * 生成可访问性建议
   */
  private generateAccessibilitySuggestions(config: Config, capabilities: any): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // 高对比度建议
    if (!capabilities.colors) {
      suggestions.push({
        id: 'accessibility-high-contrast',
        type: SuggestionType.ACCESSIBILITY,
        level: SuggestionLevel.INFO,
        title: '高对比度模式',
        description: '在无颜色支持的环境中，建议使用高对比度的文本模式',
        action: '启用高对比度文本图标',
        icon: '♿',
      });
    }

    // 简化模式建议
    if (config.components?.order && config.components.order.length > 4) {
      suggestions.push({
        id: 'accessibility-simplify',
        type: SuggestionType.ACCESSIBILITY,
        level: SuggestionLevel.INFO,
        title: '简化显示模式',
        description: '考虑减少同时显示的组件数量以提高可读性',
        action: '保留最重要的3-4个组件',
        icon: '👁️',
      });
    }

    return suggestions;
  }

  /**
   * 显示建议列表
   */
  private displaySuggestions(suggestions: Suggestion[]): void {
    // 按级别分组显示
    const groupedSuggestions = {
      [SuggestionLevel.URGENT]: suggestions.filter((s) => s.level === SuggestionLevel.URGENT),
      [SuggestionLevel.CRITICAL]: suggestions.filter((s) => s.level === SuggestionLevel.CRITICAL),
      [SuggestionLevel.WARNING]: suggestions.filter((s) => s.level === SuggestionLevel.WARNING),
      [SuggestionLevel.RECOMMENDATION]: suggestions.filter(
        (s) => s.level === SuggestionLevel.RECOMMENDATION
      ),
      [SuggestionLevel.INFO]: suggestions.filter((s) => s.level === SuggestionLevel.INFO),
    };

    for (const [level, levelSuggestions] of Object.entries(groupedSuggestions)) {
      if (levelSuggestions.length === 0) continue;

      const levelTitles = {
        [SuggestionLevel.URGENT]: '😨 紧急建议',
        [SuggestionLevel.CRITICAL]: '🚨 关键建议',
        [SuggestionLevel.WARNING]: '⚠️ 警告建议',
        [SuggestionLevel.RECOMMENDATION]: '💡 推荐建议',
        [SuggestionLevel.INFO]: '💬 信息建议',
      };

      console.log(`\n${levelTitles[level as SuggestionLevel]}:`);

      // 按优先级排序
      const sortedLevelSuggestions = levelSuggestions.sort(
        (a, b) => (b.priority || 0) - (a.priority || 0)
      );

      sortedLevelSuggestions.forEach((suggestion) => {
        this.displaySingleSuggestion(suggestion);
      });
    }

    // 显示统计信息
    const stats = this.calculateSuggestionStats(suggestions);
    if (stats.total > 0) {
      console.log(`\n📊 建议统计: 共 ${stats.total} 条建议`);
      if (stats.highImpact > 0) {
        console.log(`   • 高影响: ${stats.highImpact} 条`);
      }
      if (stats.autoApplicable > 0) {
        console.log(`   • 可自动应用: ${stats.autoApplicable} 条`);
      }
    }

    console.log();
  }

  /**
   * 显示单个建议
   */
  private displaySingleSuggestion(suggestion: Suggestion): void {
    const impactBadge = suggestion.estimatedImpact
      ? ` [${suggestion.estimatedImpact.toUpperCase()}]`
      : '';
    const priorityBadge = suggestion.priority && suggestion.priority > 50 ? ' ⭐' : '';

    console.log(`   ${suggestion.icon} ${suggestion.description}${impactBadge}${priorityBadge}`);
    if (suggestion.action && this.options.enableDetailedSuggestions) {
      console.log(`     💡 操作: ${suggestion.action}`);
    }
    if (
      suggestion.relatedConfig &&
      suggestion.relatedConfig.length > 0 &&
      this.options.enableDetailedSuggestions
    ) {
      console.log(`     🔧 相关配置: ${suggestion.relatedConfig.join(', ')}`);
    }
  }

  /**
   * 计算建议统计信息
   */
  private calculateSuggestionStats(suggestions: Suggestion[]): {
    total: number;
    highImpact: number;
    autoApplicable: number;
    byType: Record<string, number>;
  } {
    return {
      total: suggestions.length,
      highImpact: suggestions.filter((s) => s.estimatedImpact === 'high').length,
      autoApplicable: suggestions.filter((s) => s.autoApplicable).length,
      byType: suggestions.reduce(
        (acc, s) => {
          acc[s.type] = (acc[s.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }

  /**
   * 获取建议的详细上下文
   */
  getDetailedSuggestionContext(suggestionId: string, config: Config): Record<string, any> | null {
    const capabilities = this.terminalDetector.detectCapabilities();
    const allSuggestions = this.generateAllSuggestions(config, capabilities);
    const suggestion = allSuggestions.find((s) => s.id === suggestionId);

    if (!suggestion) return null;

    return {
      suggestion,
      context: suggestion.contextData || {},
      compatibilityScore: this.calculateCompatibilityScore(config, capabilities),
      relatedSuggestions: allSuggestions
        .filter((s) => s.id !== suggestionId && s.type === suggestion.type)
        .slice(0, 3),
    };
  }

  /**
   * 生成自动应用建议的配置更新
   */
  generateAutoConfigUpdates(config: Config): { path: string; value: any }[] {
    const capabilities = this.terminalDetector.detectCapabilities();
    const suggestions = this.generateAllSuggestions(config, capabilities);
    const autoApplicable = suggestions.filter((s) => s.autoApplicable);

    const updates: { path: string; value: any }[] = [];

    for (const suggestion of autoApplicable) {
      if (suggestion.relatedConfig) {
        for (const _configPath of suggestion.relatedConfig) {
          // 根据建议类型生成配置更新
          if (suggestion.id === 'urgent-no-components') {
            updates.push(
              { path: 'components.project.enabled', value: true },
              { path: 'components.model.enabled', value: true },
              { path: 'components.tokens.enabled', value: true }
            );
          }
        }
      }
    }

    return updates;
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.configAnalysisCache.clear();
  }

  /**
   * 检查终端兼容性
   * 从 config-editor.ts 第175-195行迁移
   */
  checkTerminalCompatibility(): void {
    const capabilities = this.terminalDetector.detectCapabilities();

    if (!process.stdin.isTTY) {
      throw new Error(t('errors.terminalNotSupported'));
    }

    console.log(t('terminal.detection.title'));
    console.log(`   ${t('terminal.capabilities.colors')}: ${capabilities.colors ? '✅' : '❌'}`);
    console.log(`   ${t('terminal.capabilities.emoji')}: ${capabilities.emoji ? '✅' : '❌'}`);
    console.log(
      `   ${t('terminal.capabilities.nerdFont')}: ${capabilities.nerdFont ? '✅' : '❌'}`
    );
    console.log();
  }

  /**
   * 获取特定类型的建议
   */
  getSuggestionsByType(config: Config, type: SuggestionType): Suggestion[] {
    const capabilities = this.terminalDetector.detectCapabilities();
    const allSuggestions = this.generateAllSuggestions(config, capabilities);
    return allSuggestions.filter((s) => s.type === type);
  }

  /**
   * 获取特定级别的建议
   */
  getSuggestionsByLevel(config: Config, level: SuggestionLevel): Suggestion[] {
    const capabilities = this.terminalDetector.detectCapabilities();
    const allSuggestions = this.generateAllSuggestions(config, capabilities);
    return allSuggestions.filter((s) => s.level === level);
  }

  /**
   * 生成建议摘要
   */
  generateSuggestionSummary(config: Config): {
    total: number;
    byLevel: Record<string, number>;
    byType: Record<string, number>;
  } {
    const capabilities = this.terminalDetector.detectCapabilities();
    const suggestions = this.generateAllSuggestions(config, capabilities);

    const byLevel: Record<string, number> = {};
    const byType: Record<string, number> = {};

    suggestions.forEach((suggestion) => {
      byLevel[suggestion.level] = (byLevel[suggestion.level] || 0) + 1;
      byType[suggestion.type] = (byType[suggestion.type] || 0) + 1;
    });

    return {
      total: suggestions.length,
      byLevel,
      byType,
    };
  }

  /**
   * 快速检查是否有关键建议
   */
  hasCriticalSuggestions(config: Config): boolean {
    const capabilities = this.terminalDetector.detectCapabilities();
    const suggestions = this.generateAllSuggestions(config, capabilities);
    return suggestions.some((s) => s.level === SuggestionLevel.CRITICAL);
  }
}

/**
 * 工厂函数 - 创建建议管理器实例
 */
export function createSuggestionManager(options?: SuggestionManagerOptions): SuggestionManager {
  return new SuggestionManager(options);
}
