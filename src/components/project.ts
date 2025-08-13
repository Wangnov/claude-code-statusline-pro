import path from 'node:path';
import type { ComponentConfig, ProjectComponentConfig, RenderContext } from '../config/schema.js';
import { BaseComponent, type ComponentFactory } from './base.js';

/**
 * 项目组件 | Project component
 * 显示当前项目/目录名称 | Display current project/directory name
 * 完全适配新配置系统，支持三级图标选择和统一颜色管理
 * Fully adapted to new config system, supports three-level icon selection and unified color management
 */
export class ProjectComponent extends BaseComponent {
  private projectConfig: ProjectComponentConfig;

  constructor(name: string, config: ProjectComponentConfig) {
    super(name, config);
    this.projectConfig = config;
  }

  protected renderContent(context: RenderContext): string | null {
    const { inputData } = context;

    // 获取项目路径 | Get project path
    const projectPath =
      inputData.workspace?.project_dir || inputData.workspace?.current_dir || inputData.cwd;

    if (!projectPath) return null;

    // 提取项目名称 | Extract project name
    const projectName = path.basename(projectPath);

    // 检查是否显示空项目名 | Check if empty project name should be displayed
    if (projectName === '.' || (projectName === '' && !this.projectConfig.show_when_empty)) {
      return null;
    }

    // 使用BaseComponent的现代化渲染方法，自动处理三级图标选择和颜色管理
    // Use BaseComponent's modern rendering methods, automatically handle three-level icon selection and color management
    return this.formatOutput(projectName);
  }
}

/**
 * 项目组件工厂 | Project component factory
 */
export class ProjectComponentFactory implements ComponentFactory {
  createComponent(name: string, config: ComponentConfig): ProjectComponent {
    return new ProjectComponent(name, config as ProjectComponentConfig);
  }

  getSupportedTypes(): string[] {
    return ['project'];
  }
}
