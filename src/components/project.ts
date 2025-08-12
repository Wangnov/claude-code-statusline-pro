import path from 'node:path';
import type { ComponentConfig, ProjectComponentConfig, RenderContext } from '../config/schema.js';
import { BaseComponent, type ComponentFactory } from './base.js';

/**
 * 项目组件 | Project component
 * 显示当前项目/目录名称 | Display current project/directory name
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

    // 获取显示配置 | Get display configuration
    const icon = this.getIcon('project');
    const colorName = this.projectConfig.color || 'cyan';

    return this.formatOutput(icon, projectName, colorName);
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
