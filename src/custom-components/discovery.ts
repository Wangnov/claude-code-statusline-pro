import { existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { ComponentSearchPaths } from './types.js';

/**
 * 组件发现器 - 负责查找自定义组件 | Component Discovery - finds custom components
 */
export class ComponentDiscovery {
  private searchPaths: ComponentSearchPaths;

  constructor(commandPath?: string, projectId?: string) {
    this.searchPaths = this.buildSearchPaths(commandPath, projectId);
  }

  /**
   * 构建搜索路径 | Build search paths
   */
  private buildSearchPaths(commandPath?: string, projectId?: string): ComponentSearchPaths {
    const paths: ComponentSearchPaths = {};

    // 1. 命令行指定路径（最高优先级）
    if (commandPath && existsSync(commandPath)) {
      paths.command = commandPath;
    }

    // 2. 项目级路径
    if (projectId) {
      const projectPath = join(homedir(), '.claude', 'projects', projectId, 'statusline-pro', 'components');
      if (existsSync(projectPath)) {
        paths.project = projectPath;
      }
    }

    // 3. 用户级路径（最低优先级）
    const userPath = join(homedir(), '.claude', 'statusline-pro', 'components');
    if (existsSync(userPath)) {
      paths.user = userPath;
    }

    return paths;
  }

  /**
   * 发现所有可用的组件 | Discover all available components
   * 返回组件名称到路径的映射 | Returns component name to path mapping
   */
  public discoverComponents(): Map<string, { path: string; source: 'command' | 'project' | 'user' }> {
    const components = new Map<string, { path: string; source: 'command' | 'project' | 'user' }>();

    // 按优先级顺序扫描（低优先级先扫描，高优先级覆盖）
    const scanOrder: Array<['user' | 'project' | 'command', string | undefined]> = [
      ['user', this.searchPaths.user],
      ['project', this.searchPaths.project],
      ['command', this.searchPaths.command],
    ];

    for (const [source, searchPath] of scanOrder) {
      if (!searchPath) continue;

      try {
        const entries = readdirSync(searchPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          const componentPath = join(searchPath, entry.name);
          const componentFile = join(componentPath, 'component.js');
          const configFile = join(componentPath, 'config.toml');

          // 验证组件结构
          if (existsSync(componentFile) && existsSync(configFile)) {
            components.set(entry.name, {
              path: componentPath,
              source: source as 'command' | 'project' | 'user'
            });
          }
        }
      } catch (error) {
        console.warn(`扫描组件路径失败 | Failed to scan component path: ${searchPath}`, error);
      }
    }

    return components;
  }

  /**
   * 获取搜索路径 | Get search paths
   */
  public getSearchPaths(): ComponentSearchPaths {
    return { ...this.searchPaths };
  }
}