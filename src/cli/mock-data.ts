/**
 * Mock数据生成器 - 实时预览系统核心
 * 生成各种状态和使用场景的模拟数据，支持多场景预览和测试
 */

import type { InputData } from '../config/schema.js';

/**
 * Mock场景接口定义
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
   * 初始化所有Mock场景
   */
  private initializeScenarios(): void {
    // 开发场景 - 正常开发状态
    this.scenarios.set('dev', {
      id: 'dev',
      name: '开发中',
      description: '正常开发项目，低token使用率，一切运行良好',
      inputData: {
        hookEventName: 'Status',
        sessionId: 'dev_session_123',
        model: { id: 'claude-sonnet-4' },
        workspace: {
          current_dir: '/Users/developer/my-awesome-project',
          project_dir: '/Users/developer/my-awesome-project',
        },
        transcriptPath: '/tmp/claude_transcript_dev.json',
        cwd: '/Users/developer/my-awesome-project',
        gitBranch: 'feature/user-auth',
      },
      tokenUsage: 25,
      expectedStatus: 'ready',
    });

    // 临界状态场景 - 高token使用
    this.scenarios.set('critical', {
      id: 'critical',
      name: '临界状态',
      description: 'Token使用接近上限，需要注意上下文管理',
      inputData: {
        hookEventName: 'Status',
        sessionId: 'critical_session_456',
        model: { id: 'claude-opus-4.1' },
        workspace: {
          current_dir: '/Users/developer/enterprise-system',
          project_dir: '/Users/developer/enterprise-system',
        },
        transcriptPath: '/tmp/claude_transcript_critical.json',
        cwd: '/Users/developer/large-enterprise-system',
        gitBranch: null,
      },
      tokenUsage: 92,
      expectedStatus: 'ready',
    });

    // 错误状态场景 - API错误
    this.scenarios.set('error', {
      id: 'error',
      name: '错误状态',
      description: 'API调用失败或工具执行出错',
      inputData: {
        hookEventName: 'Status',
        sessionId: 'error_session_789',
        model: { id: 'claude-haiku-3.5' },
        workspace: {
          current_dir: '/Users/developer/error-prone-app',
          project_dir: '/Users/developer/error-prone-app',
        },
        transcriptPath: '/tmp/claude_transcript_error.json',
        cwd: '/Users/developer/error-prone-app',
        gitBranch: 'bugfix/critical-error',
      },
      tokenUsage: 45,
      expectedStatus: 'error',
    });

    // 思考状态场景 - AI正在处理复杂任务
    this.scenarios.set('thinking', {
      id: 'thinking',
      name: '思考中',
      description: 'AI正在处理复杂任务，深度思考模式',
      inputData: {
        hookEventName: 'Status',
        sessionId: 'thinking_session_101',
        model: { id: 'claude-opus-4.1' },
        workspace: {
          current_dir: '/Users/developer/ai-research-project',
          project_dir: '/Users/developer/ai-research-project',
        },
        transcriptPath: '/tmp/claude_transcript_thinking.json',
        cwd: '/Users/developer/ai-research-project',
        gitBranch: null,
      },
      tokenUsage: 65,
      expectedStatus: 'thinking',
    });

    // 工具使用场景 - 正在执行工具调用
    this.scenarios.set('tool', {
      id: 'tool',
      name: '工具执行',
      description: '正在执行工具调用，如文件操作、代码分析等',
      inputData: {
        hookEventName: 'Status',
        sessionId: 'tool_session_202',
        model: { id: 'claude-sonnet-4' },
        workspace: {
          current_dir: '/Users/developer/automation-scripts',
          project_dir: '/Users/developer/automation-scripts',
        },
        transcriptPath: '/tmp/claude_transcript_tool.json',
        cwd: '/Users/developer/automation-scripts',
        gitBranch: null,
      },
      tokenUsage: 55,
      expectedStatus: 'tool_use',
    });

    // 完成状态场景 - 任务完成
    this.scenarios.set('complete', {
      id: 'complete',
      name: '任务完成',
      description: '任务成功完成，准备接受新的指令',
      inputData: {
        hookEventName: 'Status',
        sessionId: 'complete_session_303',
        model: { id: 'claude-sonnet-4' },
        workspace: {
          current_dir: '/Users/developer/completed-feature',
          project_dir: '/Users/developer/completed-feature',
        },
        transcriptPath: '/tmp/claude_transcript_complete.json',
        cwd: '/Users/developer/completed-feature',
        gitBranch: null,
      },
      tokenUsage: 35,
      expectedStatus: 'complete',
    });

    // 空项目场景 - 新项目或空目录
    this.scenarios.set('empty', {
      id: 'empty',
      name: '空项目',
      description: '新建项目或空目录，基础状态',
      inputData: {
        hookEventName: 'Status',
        sessionId: 'empty_session_404',
        model: { id: 'claude-haiku-3.5' },
        workspace: {
          current_dir: '/Users/developer/new-project',
          project_dir: '/Users/developer/new-project',
        },
        transcriptPath: '/tmp/claude_transcript_empty.json',
        cwd: '/Users/developer/new-project',
        gitBranch: null,
      },
      tokenUsage: 8,
      expectedStatus: 'ready',
    });

    // Git场景 - 有分支信息
    this.scenarios.set('git', {
      id: 'git',
      name: 'Git项目',
      description: 'Git管理的项目，包含分支和仓库信息',
      inputData: {
        hookEventName: 'Status',
        sessionId: 'git_session_505',
        model: { id: 'claude-sonnet-4' },
        workspace: {
          current_dir: '/Users/developer/web-application',
          project_dir: '/Users/developer/web-application',
        },
        transcriptPath: '/tmp/claude_transcript_git.json',
        cwd: '/Users/developer/web-application',
        gitBranch: 'feature/user-authentication',
      },
      tokenUsage: 42,
      expectedStatus: 'ready',
    });
  }

  /**
   * 根据场景ID生成Mock数据
   */
  generate(scenarioId: string): InputData {
    const scenario = this.scenarios.get(scenarioId.toLowerCase());
    if (!scenario) {
      throw new Error(
        `Unknown mock scenario: ${scenarioId}. Available: ${this.getAvailableScenarios().join(', ')}`
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
    };

    return mockData;
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
   * 根据token使用率筛选场景
   */
  getScenariosByTokenUsage(minUsage: number, maxUsage: number): MockScenario[] {
    return this.getAllScenarios().filter((scenario) => {
      const usage = scenario.tokenUsage || 0;
      return usage >= minUsage && usage <= maxUsage;
    });
  }

  /**
   * 根据状态筛选场景
   */
  getScenariosByStatus(status: MockScenario['expectedStatus']): MockScenario[] {
    return this.getAllScenarios().filter((scenario) => scenario.expectedStatus === status);
  }

  /**
   * 生成随机场景数据
   */
  generateRandom(): InputData {
    const scenarios = this.getAvailableScenarios();
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    return this.generate(randomScenario || 'dev');
  }

  /**
   * 添加自定义场景
   */
  addCustomScenario(scenario: MockScenario): void {
    this.scenarios.set(scenario.id, scenario);
  }

  /**
   * 生成压力测试场景 - 极限token使用
   */
  generateStressTestScenario(): InputData {
    return {
      hookEventName: 'Status',
      sessionId: 'stress_test_999',
      model: { id: 'claude-opus-4.1' },
      workspace: {
        current_dir: '/Users/developer/massive-codebase',
        project_dir: '/Users/developer/massive-codebase',
      },
      transcriptPath: '/tmp/claude_transcript_stress.json',
      cwd: '/Users/developer/massive-codebase',
      gitBranch: 'performance/optimization-hell',
    };
  }
}

/**
 * 默认导出Mock数据生成器实例
 */
export const mockDataGenerator = new MockDataGenerator();
