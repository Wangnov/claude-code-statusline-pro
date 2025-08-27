/**
 * Mock数据生成器 - 实时预览系统核心
 * 生成各种状态和使用场景的模拟数据，支持多场景预览和测试
 * 支持新的配置格式：terminal, style, components, themes 等新字段
 *
 * v2.0.0 新功能：
 * - CLI场景映射：dev → basic, critical → high-token, error → error, thinking → tool-active, complete → full-featured
 * - Usage组件Mock支持：根据token使用率生成真实的成本和使用量数据
 * - 四级成本场景：$0.02 (low), $0.15 (medium), $0.85 (high), $2.30 (extreme)
 * - 智能成本映射：基于token使用率自动选择对应的成本级别
 *
 * 使用示例：
 * ```bash
 * npm run dev -- --mock dev      # 低成本开发场景 ($0.02)
 * npm run dev -- --mock critical # 高token使用场景 ($0.91)
 * npm run dev -- --mock thinking # 工具执行中场景 ($0.45)
 * npm run dev -- --mock complete # 任务完成场景 ($0.45)
 * npm run dev -- --mock error    # 错误状态场景 ($0.15)
 * ```
 */

import type { Config, InputData } from '../config/schema.js';

/**
 * 使用数据接口定义 | Usage data interface definition
 */
interface UsageData {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
  input_cost: number;
  output_cost: number;
  cache_creation_cost: number;
  cache_read_cost: number;
  cache_cost: number;
  total_cost: number;
  model: string;
  session_id: string;
  cost_scenario: string;
  pricing_model: string;
  billing_period: string;
  usage_timestamp: string;
}

/**
 * Mock场景接口定义 - 扩展支持新的配置格式
 */
export interface MockScenario {
  /** 场景标识符 */
  id: string;
  /** 场景名称 */
  name: string;
  /** 场景描述 */
  description: string;
  /** 输入数据 */
  inputData: InputData;
  /** Token使用率 (0-100) */
  tokenUsage?: number;
  /** 预期状态 */
  expectedStatus?: 'ready' | 'thinking' | 'tool_use' | 'error' | 'complete';
  /** 建议的主题 */
  suggestedTheme?: 'classic' | 'powerline' | 'capsule';
  /** 测试配置覆盖 */
  configOverrides?: Partial<Config>;
}

/**
 * Mock数据生成器类
 */
export class MockDataGenerator {
  private scenarios: Map<string, MockScenario> = new Map();

  constructor() {
    this.initializeScenarios();
  }

  /**
   * 初始化所有Mock场景 - 支持新的配置格式和主题
   */
  private initializeScenarios(): void {
    // 1. 基础项目场景 - Classic主题测试
    this.scenarios.set('basic', {
      id: 'basic',
      name: '基础项目',
      description: '新项目开发，Classic主题，基础功能展示',
      inputData: {
        hookEventName: 'Status',
        sessionId: 'basic_session_001',
        model: { id: 'claude-sonnet-4', display_name: 'Claude Sonnet 4' },
        workspace: {
          current_dir: process.cwd(),
          project_dir: process.cwd(),
        },
        transcriptPath: '/tmp/claude_transcript_basic.json',
        cwd: process.cwd(),
        gitBranch: 'main',
        cost: {
          total_cost_usd: 0.0567,
          total_duration_ms: 45000,
          total_api_duration_ms: 12000,
          total_lines_added: 8,
          total_lines_removed: 3,
        },
      },
      tokenUsage: 15,
      expectedStatus: 'ready',
      suggestedTheme: 'classic',
      configOverrides: {
        theme: 'classic',
        preset: 'PMBTS',
        terminal: {
          force_nerd_font: false,
          force_emoji: true,
          force_text: false,
        },
      },
    });

    // 2. 高Token使用场景 - Powerline主题测试
    this.scenarios.set('high-token', {
      id: 'high-token',
      name: '高Token使用',
      description: 'Token接近上限，Powerline主题，展示后备区域',
      inputData: {
        hookEventName: 'Status',
        sessionId: 'high_token_session_002',
        model: { id: 'claude-opus-4.1', display_name: 'Claude Opus 4.1' },
        workspace: {
          current_dir: '/Users/developer/enterprise-system',
          project_dir: '/Users/developer/enterprise-system',
        },
        transcriptPath: '/tmp/claude_transcript_high_token.json',
        cwd: '/Users/developer/enterprise-system',
        gitBranch: 'feature/complex-refactor',
        cost: {
          total_cost_usd: 1.2345,
          total_duration_ms: 180000,
          total_api_duration_ms: 45000,
          total_lines_added: 156,
          total_lines_removed: 89,
        },
      },
      tokenUsage: 92,
      expectedStatus: 'ready',
      suggestedTheme: 'powerline',
      configOverrides: {
        theme: 'powerline',
        preset: 'PMBTS',
        terminal: {
          force_nerd_font: true,
          force_emoji: false,
          force_text: false,
        },
      },
    });

    // 3. Git分支开发场景 - Capsule主题测试
    this.scenarios.set('git-branch', {
      id: 'git-branch',
      name: 'Git分支开发',
      description: '多分支开发，Capsule主题，现代化UI展示',
      inputData: {
        hookEventName: 'Status',
        sessionId: 'git_branch_session_003',
        model: { id: 'claude-sonnet-4', display_name: 'Claude Sonnet 4' },
        workspace: {
          current_dir: '/Users/developer/web-application',
          project_dir: '/Users/developer/web-application',
        },
        transcriptPath: '/tmp/claude_transcript_git_branch.json',
        cwd: '/Users/developer/web-application',
        gitBranch: 'feature/user-authentication-system',
        cost: {
          total_cost_usd: 0.2789,
          total_duration_ms: 75000,
          total_api_duration_ms: 18000,
          total_lines_added: 34,
          total_lines_removed: 12,
        },
      },
      tokenUsage: 45,
      expectedStatus: 'ready',
      suggestedTheme: 'capsule',
      configOverrides: {
        theme: 'capsule',
        preset: 'PMBTS',
        terminal: {
          force_nerd_font: true,
          force_emoji: false,
          force_text: false,
        },
      },
    });

    // 4. 工具使用中场景 - 混合状态测试
    this.scenarios.set('tool-active', {
      id: 'tool-active',
      name: '工具执行中',
      description: '正在执行工具调用，多状态混合展示',
      inputData: {
        hookEventName: 'Status',
        sessionId: 'tool_active_session_004',
        model: { id: 'claude-haiku-3.5', display_name: 'Claude Haiku 3.5' },
        workspace: {
          current_dir: '/Users/developer/automation-scripts',
          project_dir: '/Users/developer/automation-scripts',
        },
        transcriptPath: '/tmp/claude_transcript_tool_active.json',
        cwd: '/Users/developer/automation-scripts',
        gitBranch: 'develop',
        cost: {
          total_cost_usd: 0.1123,
          total_duration_ms: 32000,
          total_api_duration_ms: 8500,
          total_lines_added: 21,
          total_lines_removed: 7,
        },
      },
      tokenUsage: 55,
      expectedStatus: 'tool_use',
      suggestedTheme: 'classic',
      configOverrides: {
        theme: 'classic',
        preset: 'PMBTS',
        debug: true,
        terminal: {
          force_nerd_font: false,
          force_emoji: true,
          force_text: false,
        },
      },
    });

    // 5. 错误状态场景 - 错误处理测试
    this.scenarios.set('error', {
      id: 'error',
      name: '错误状态',
      description: 'API调用失败或工具执行出错，错误处理展示',
      inputData: {
        hookEventName: 'Status',
        sessionId: 'error_session_005',
        model: { id: 'claude-haiku-3.5', display_name: 'Claude Haiku 3.5' },
        workspace: {
          current_dir: '/Users/developer/error-prone-app',
          project_dir: '/Users/developer/error-prone-app',
        },
        transcriptPath: '/tmp/claude_transcript_error.json',
        cwd: '/Users/developer/error-prone-app',
        gitBranch: 'bugfix/critical-error',
        cost: {
          total_cost_usd: 0.0234,
          total_duration_ms: 15000,
          total_api_duration_ms: 3500,
          total_lines_added: 5,
          total_lines_removed: 15,
        },
      },
      tokenUsage: 45,
      expectedStatus: 'error',
      suggestedTheme: 'classic',
      configOverrides: {
        theme: 'classic',
        preset: 'PMTS', // 不显示分支，专注于错误状态
        terminal: {
          force_nerd_font: false,
          force_emoji: true,
          force_text: false,
        },
      },
    });

    // 6. 完整功能展示场景 - 所有组件测试
    this.scenarios.set('full-featured', {
      id: 'full-featured',
      name: '完整功能展示',
      description: '展示所有组件功能，全套配置测试',
      inputData: {
        hookEventName: 'Status',
        sessionId: 'full_featured_session_006',
        model: { id: 'claude-opus-4.1', display_name: 'Claude Opus 4.1 Pro' },
        workspace: {
          current_dir: '/Users/developer/comprehensive-project',
          project_dir: '/Users/developer/comprehensive-project',
        },
        transcriptPath: '/tmp/claude_transcript_full_featured.json',
        cwd: '/Users/developer/comprehensive-project',
        gitBranch: 'feature/comprehensive-showcase',
        cost: {
          total_cost_usd: 0.8976,
          total_duration_ms: 156000,
          total_api_duration_ms: 42000,
          total_lines_added: 287,
          total_lines_removed: 134,
        },
      },
      tokenUsage: 78,
      expectedStatus: 'complete',
      suggestedTheme: 'powerline',
      configOverrides: {
        theme: 'powerline',
        preset: 'PMBTS',
        debug: true,
        terminal: {
          force_nerd_font: true,
          force_emoji: false,
          force_text: false,
        },
      },
    });
  }

  /**
   * 根据场景ID生成Mock数据 - 支持配置覆盖和场景映射
   */
  generate(scenarioId: string): InputData {
    // CLI场景映射到内部场景ID | CLI scenario mapping to internal scenario IDs
    const scenarioMapping: Record<string, string> = {
      dev: 'basic', // 开发场景 → 基础项目
      critical: 'high-token', // 临界场景 → 高Token使用
      error: 'error', // 错误场景 → 错误状态
      thinking: 'tool-active', // 思考场景 → 工具执行中
      complete: 'full-featured', // 完成场景 → 完整功能展示
    };

    const normalizedId = scenarioId.toLowerCase();
    const targetScenarioId = scenarioMapping[normalizedId] || normalizedId;

    const scenario = this.scenarios.get(targetScenarioId);
    if (!scenario) {
      throw new Error(
        `Unknown mock scenario: ${scenarioId}. Available: ${this.getAvailableScenarios().join(', ')}, CLI shortcuts: ${Object.keys(scenarioMapping).join(', ')}`
      );
    }

    // 深度克隆避免修改原始数据
    const mockData = JSON.parse(JSON.stringify(scenario.inputData)) as InputData;

    // 添加Mock元数据，供组件使用 | Add mock metadata for components
    (mockData as Record<string, unknown>).__mock__ = {
      tokenUsage: scenario.tokenUsage || 0,
      status: scenario.expectedStatus || 'ready',
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      suggestedTheme: scenario.suggestedTheme || 'classic',
      configOverrides: scenario.configOverrides || {},
      // Usage组件专用mock数据 | Usage component specific mock data
      usageData: mockData.cost || {
        total_cost_usd: 0.0567,
        total_duration_ms: 45000,
        total_api_duration_ms: 12000,
        total_lines_added: 8,
        total_lines_removed: 3,
      },
    };

    return mockData;
  }

  /**
   * 生成指定主题的Mock数据
   */
  generateForTheme(theme: 'classic' | 'powerline' | 'capsule'): InputData[] {
    const themeScenarios = this.getAllScenarios().filter(
      (scenario) => scenario.suggestedTheme === theme
    );

    return themeScenarios.map((scenario) => this.generate(scenario.id));
  }

  /**
   * 生成完整的测试套件 - 覆盖所有场景
   */
  generateTestSuite(): {
    basic: InputData;
    highToken: InputData;
    gitBranch: InputData;
    toolActive: InputData;
    error: InputData;
    fullFeatured: InputData;
  } {
    return {
      basic: this.generate('basic'),
      highToken: this.generate('high-token'),
      gitBranch: this.generate('git-branch'),
      toolActive: this.generate('tool-active'),
      error: this.generate('error'),
      fullFeatured: this.generate('full-featured'),
    };
  }

  /**
   * 根据Token使用率生成适合的场景
   */
  generateByTokenUsage(targetUsage: number): InputData {
    const scenarios = this.getAllScenarios();

    if (scenarios.length === 0) {
      throw new Error('No scenarios available');
    }

    // 找到最接近目标使用率的场景
    let closestScenario: MockScenario | null = null;
    let minDiff = Infinity;

    for (const scenario of scenarios) {
      const diff = Math.abs((scenario.tokenUsage || 0) - targetUsage);
      if (diff < minDiff) {
        minDiff = diff;
        closestScenario = scenario;
      }
    }

    if (!closestScenario) {
      // 兜底：返回第一个场景
      closestScenario = scenarios[0] || null;
    }

    if (!closestScenario) {
      throw new Error('No valid scenarios found');
    }

    return this.generate(closestScenario.id);
  }

  /**
   * 获取场景详情
   */
  getScenario(scenarioId: string): MockScenario | undefined {
    return this.scenarios.get(scenarioId.toLowerCase());
  }

  /**
   * 获取所有可用场景
   */
  getAvailableScenarios(): string[] {
    return Array.from(this.scenarios.keys());
  }

  /**
   * 获取所有场景详情
   */
  getAllScenarios(): MockScenario[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * 获取按主题分组的场景 - 支持主题预览
   */
  getScenariosByTheme(): Record<string, MockScenario[]> {
    const scenarios = this.getAllScenarios();
    const grouped: Record<string, MockScenario[]> = {
      classic: [],
      powerline: [],
      capsule: [],
    };

    for (const scenario of scenarios) {
      const theme = scenario.suggestedTheme || 'classic';
      if (!grouped[theme]) {
        grouped[theme] = [];
      }
      grouped[theme].push(scenario);
    }

    return grouped;
  }

  /**
   * 根据配置生成自定义场景
   */
  generateCustomScenario(options: {
    tokenUsage: number;
    status: MockScenario['expectedStatus'];
    projectName?: string;
    modelId?: string;
    gitBranch?: string;
    theme?: 'classic' | 'powerline' | 'capsule';
    configOverrides?: Partial<Config>;
  }): InputData {
    const customScenario: MockScenario = {
      id: `custom-${Date.now()}`,
      name: '自定义场景',
      description: '用户自定义生成的场景',
      inputData: {
        hookEventName: 'Status',
        sessionId: `custom_session_${Date.now()}`,
        model: {
          id: options.modelId || 'claude-sonnet-4',
          display_name: options.modelId || 'Claude Sonnet 4',
        },
        workspace: {
          current_dir: `/Users/developer/${options.projectName || 'custom-project'}`,
          project_dir: `/Users/developer/${options.projectName || 'custom-project'}`,
        },
        transcriptPath: `/tmp/claude_transcript_custom_${Date.now()}.json`,
        cwd: `/Users/developer/${options.projectName || 'custom-project'}`,
        gitBranch: options.gitBranch || 'main',
        cost: {
          total_cost_usd: Math.random() * 0.5,
          total_duration_ms: Math.floor(Math.random() * 100000) + 10000,
          total_api_duration_ms: Math.floor(Math.random() * 30000) + 5000,
          total_lines_added: Math.floor(Math.random() * 100) + 1,
          total_lines_removed: Math.floor(Math.random() * 50),
        },
      },
      tokenUsage: options.tokenUsage,
      expectedStatus: options.status || 'ready',
      suggestedTheme: options.theme || 'classic',
      configOverrides: options.configOverrides || {},
    };

    // 临时添加到scenarios中
    this.scenarios.set(customScenario.id, customScenario);

    return this.generate(customScenario.id);
  }

  /**
   * 生成主题对比数据 - 用于主题预览
   */
  generateThemeComparison(): Record<string, InputData> {
    const baseScenario = this.getScenario('basic');
    if (!baseScenario) {
      throw new Error('Base scenario not found');
    }

    const themes = ['classic', 'powerline', 'capsule'] as const;
    const comparison: Record<string, InputData> = {};

    for (const theme of themes) {
      const themeScenario = { ...baseScenario, suggestedTheme: theme };
      const customId = `theme-comparison-${theme}`;
      this.scenarios.set(customId, {
        ...themeScenario,
        id: customId,
        name: `${theme.charAt(0).toUpperCase() + theme.slice(1)} 主题`,
        description: `${theme} 主题预览对比`,
      });
      comparison[theme] = this.generate(customId);
    }

    return comparison;
  }

  /**
   * 生成压力测试场景集合
   */
  generateStressTestScenarios(): InputData[] {
    const stressScenarios = [
      {
        tokenUsage: 99,
        status: 'ready' as const,
        description: '极限Token使用',
      },
      {
        tokenUsage: 50,
        status: 'thinking' as const,
        description: '长时间思考',
      },
      {
        tokenUsage: 30,
        status: 'tool_use' as const,
        description: '工具密集调用',
      },
      {
        tokenUsage: 70,
        status: 'error' as const,
        description: '错误恢复测试',
      },
    ];

    return stressScenarios.map((scenario, index) =>
      this.generateCustomScenario({
        tokenUsage: scenario.tokenUsage,
        status: scenario.status,
        projectName: `stress-test-${index + 1}`,
        modelId: 'claude-opus-4.1',
      })
    );
  }

  /**
   * 获取最新的6个场景 - 供预览引擎使用
   */
  getLatestScenarios(): MockScenario[] {
    const _allScenarios = this.getAllScenarios();
    // 按照优先级排序：基础、高token、git分支、工具、错误、完整功能
    const priorityOrder = [
      'basic',
      'high-token',
      'git-branch',
      'tool-active',
      'error',
      'full-featured',
    ];

    const orderedScenarios: MockScenario[] = [];
    for (const id of priorityOrder) {
      const scenario = this.getScenario(id);
      if (scenario) {
        orderedScenarios.push(scenario);
      }
    }

    return orderedScenarios.slice(0, 6);
  }

  /**
   * 根据token使用率筛选场景 - 兼容性方法
   */
  getScenariosByTokenUsage(minUsage: number, maxUsage: number): MockScenario[] {
    return this.getAllScenarios().filter((scenario) => {
      const usage = scenario.tokenUsage || 0;
      return usage >= minUsage && usage <= maxUsage;
    });
  }

  /**
   * 根据状态筛选场景 - 兼容性方法
   */
  getScenariosByStatus(status: MockScenario['expectedStatus']): MockScenario[] {
    return this.getAllScenarios().filter((scenario) => scenario.expectedStatus === status);
  }

  /**
   * 生成随机场景数据 - 从新场景中选择
   */
  generateRandom(): InputData {
    const scenarios = this.getAvailableScenarios();
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    return this.generate(randomScenario || 'basic');
  }

  /**
   * 添加自定义场景 - 扩展支持配置覆盖
   */
  addCustomScenario(scenario: MockScenario): void {
    this.scenarios.set(scenario.id, scenario);
  }

  /**
   * 生成压力测试场景 - 极限token使用（兼容性方法）
   */
  generateStressTestScenario(): InputData {
    return this.generateCustomScenario({
      tokenUsage: 99,
      status: 'ready',
      projectName: 'massive-codebase',
      modelId: 'claude-opus-4.1',
      gitBranch: 'performance/optimization-hell',
      theme: 'powerline',
      configOverrides: {
        debug: true,
        terminal: {
          force_nerd_font: true,
          force_emoji: false,
          force_text: false,
        },
        components: {
          order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
          tokens: {
            enabled: true,
            icon_color: 'bright_yellow',
            text_color: 'white',
            emoji_icon: '📊',
            nerd_icon: '',
            text_icon: '[T]',
            show_progress_bar: true,
            show_gradient: true,
            progress_width: 20,
            show_percentage: true,
            show_raw_numbers: true,
            context_windows: {
              default: 200000,
            },
          },
        },
      },
    });
  }

  /**
   * 清理临时场景
   */
  clearCustomScenarios(): void {
    const customIds = Array.from(this.scenarios.keys()).filter(
      (id) => id.startsWith('custom-') || id.startsWith('theme-comparison-')
    );
    for (const id of customIds) {
      this.scenarios.delete(id);
    }
  }

  /**
   * 获取场景统计信息
   */
  getStatistics() {
    const scenarios = this.getAllScenarios();
    const byTheme: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalTokenUsage = 0;

    for (const scenario of scenarios) {
      // 统计主题
      const theme = scenario.suggestedTheme || 'classic';
      byTheme[theme] = (byTheme[theme] || 0) + 1;

      // 统计状态
      const status = scenario.expectedStatus || 'ready';
      byStatus[status] = (byStatus[status] || 0) + 1;

      // 统计token使用
      totalTokenUsage += scenario.tokenUsage || 0;
    }

    return {
      totalScenarios: scenarios.length,
      byTheme,
      byStatus,
      averageTokenUsage: scenarios.length > 0 ? totalTokenUsage / scenarios.length : 0,
    };
  }
}

/**
 * 工厂函数：创建Mock数据生成器
 */
export function createMockDataGenerator(): MockDataGenerator {
  return new MockDataGenerator();
}

/**
 * 工厂函数：生成特定主题的测试数据
 */
export function generateThemeTestData(theme: 'classic' | 'powerline' | 'capsule'): InputData[] {
  const generator = new MockDataGenerator();
  return generator.generateForTheme(theme);
}

/**
 * 工厂函数：生成完整的测试套件
 */
export function generateFullTestSuite(): Record<string, unknown> {
  const generator = new MockDataGenerator();
  const testSuite = generator.generateTestSuite();

  return {
    ...testSuite,
    stressTest: generator.generateStressTestScenario(),
  };
}

/**
 * 工厂函数：生成主题对比数据集
 */
export function generateThemeComparisonData(): Record<string, InputData> {
  const generator = new MockDataGenerator();
  return generator.generateThemeComparison();
}

/**
 * 工厂函数：生成特定成本级别的Usage测试数据 | Generate Usage test data for specific cost levels
 */
export function generateUsageMockData(
  costLevel: 'low' | 'medium' | 'high' | 'extreme',
  modelId = 'claude-sonnet-4'
): UsageData {
  const generator = new MockDataGenerator();
  const tokenUsageMap = {
    low: 15, // 对应 low_cost ($0.02)
    medium: 35, // 对应 medium_cost ($0.15)
    high: 70, // 对应 high_cost ($0.85)
    extreme: 95, // 对应 extreme_cost ($2.30)
  };

  // 使用私有方法生成usage数据（通过类型安全的方式访问）
  const usageData = (
    generator as unknown as {
      generateUsageData: (tokenUsagePercent: number, modelId: string) => UsageData;
    }
  ).generateUsageData(tokenUsageMap[costLevel], modelId);
  return usageData;
}

/**
 * 所有使用数据级别的类型定义 | Type definition for all usage data levels
 */
type AllUsageData = {
  low_cost: UsageData;
  medium_cost: UsageData;
  high_cost: UsageData;
  extreme_cost: UsageData;
};

/**
 * 获取所有成本级别的Usage测试数据集合 | Get Usage test data for all cost levels
 */
export function generateAllUsageMockData(modelId = 'claude-sonnet-4'): AllUsageData {
  return {
    low_cost: generateUsageMockData('low', modelId),
    medium_cost: generateUsageMockData('medium', modelId),
    high_cost: generateUsageMockData('high', modelId),
    extreme_cost: generateUsageMockData('extreme', modelId),
  };
}

/**
 * 默认导出Mock数据生成器实例 - 扩展功能
 */
export const mockDataGenerator = new MockDataGenerator();

/**
 * 预设场景ID常量 - 便于引用
 */
export const MOCK_SCENARIO_IDS = {
  // 内部场景ID | Internal scenario IDs
  BASIC: 'basic',
  HIGH_TOKEN: 'high-token',
  GIT_BRANCH: 'git-branch',
  TOOL_ACTIVE: 'tool-active',
  ERROR: 'error',
  FULL_FEATURED: 'full-featured',

  // CLI场景快捷方式 | CLI scenario shortcuts
  DEV: 'dev', // → basic
  CRITICAL: 'critical', // → high-token
  THINKING: 'thinking', // → tool-active
  COMPLETE: 'complete', // → full-featured
} as const;

/**
 * 成本级别常量 - Usage组件测试 | Cost level constants for Usage component testing
 */
export const USAGE_COST_LEVELS = {
  LOW: 'low_cost', // $0.02 - 适合dev场景
  MEDIUM: 'medium_cost', // $0.15 - 适合critical场景
  HIGH: 'high_cost', // $0.85 - 适合error场景
  EXTREME: 'extreme_cost', // $2.30 - 适合thinking场景
} as const;

/**
 * 主题常量 - 便于引用
 */
export const THEME_NAMES = {
  CLASSIC: 'classic',
  POWERLINE: 'powerline',
  CAPSULE: 'capsule',
} as const;

export type ThemeName = (typeof THEME_NAMES)[keyof typeof THEME_NAMES];
export type ScenarioId = (typeof MOCK_SCENARIO_IDS)[keyof typeof MOCK_SCENARIO_IDS];
