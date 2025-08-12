import { execSync } from 'node:child_process';
import type { BranchComponentConfig, ComponentConfig, RenderContext } from '../config/schema.js';
import { BaseComponent, type ComponentFactory } from './base.js';

/**
 * 分支组件 | Branch component
 * 显示当前Git分支信息 | Display current Git branch information
 */
export class BranchComponent extends BaseComponent {
  private branchConfig: BranchComponentConfig;

  constructor(name: string, config: BranchComponentConfig) {
    super(name, config);
    this.branchConfig = config;
  }

  protected renderContent(context: RenderContext): string | null {
    const { inputData, config } = context;

    let branch = inputData.gitBranch;

    // 如果没有提供分支信息，尝试通过Git命令获取 | If no branch info provided, try to get via Git command
    if (!branch) {
      try {
        branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', {
          cwd: inputData.workspace?.current_dir || inputData.cwd,
          encoding: 'utf8',
          timeout: config.advanced?.git_timeout || 1000,
        }).trim();
      } catch (_error) {
        branch = 'no-git';
      }
    }

    // 检查是否在无Git时显示 | Check if should display when no Git
    if (branch === 'no-git' && !this.branchConfig.show_when_no_git) {
      return null;
    }

    // 截断过长的分支名 | Truncate long branch names
    let displayBranch = branch;
    const maxLength = this.branchConfig.max_length;
    if (maxLength && displayBranch.length > maxLength) {
      displayBranch = `${displayBranch.substring(0, maxLength - 3)}...`;
    }

    // 获取显示配置 | Get display configuration
    const icon = this.getIcon('branch');
    const colorName = this.branchConfig.color || 'green';

    return this.formatOutput(icon, displayBranch, colorName);
  }
}

/**
 * 分支组件工厂 | Branch component factory
 */
export class BranchComponentFactory implements ComponentFactory {
  createComponent(name: string, config: ComponentConfig): BranchComponent {
    return new BranchComponent(name, config as BranchComponentConfig);
  }

  getSupportedTypes(): string[] {
    return ['branch'];
  }
}
