/**
 * Branch组件编辑器 - Branch Component Editor
 * 专门处理Branch组件的高级配置功能
 *
 * 功能包括:
 * - Git状态显示配置
 * - Git操作检测配置
 * - 版本信息配置
 * - 状态图标配置
 * - 状态颜色配置
 * - 性能优化配置
 */

import { checkbox, confirm, input, select } from '@inquirer/prompts';
import type { Config } from '../../config/schema.js';
import { t } from '../i18n.js';

/**
 * Branch编辑器类
 */
export class BranchEditor {
  private currentConfig: Config;
  private hasUnsavedChanges: boolean;
  private markUnsavedChanges: () => void;
  private waitForKeyPress: () => Promise<void>;

  constructor(
    config: Config,
    hasUnsavedChanges: boolean,
    markUnsavedChanges: () => void,
    waitForKeyPress: () => Promise<void>
  ) {
    this.currentConfig = config;
    this.hasUnsavedChanges = hasUnsavedChanges;
    this.markUnsavedChanges = markUnsavedChanges;
    this.waitForKeyPress = waitForKeyPress;
  }

  /**
   * Branch组件高级配置主界面 | Branch Component Advanced Configuration
   */
  async configureBranchComponentAdvanced(): Promise<void> {
    const branchConfig = this.currentConfig.components?.branch;

    if (!branchConfig) {
      console.log(t('errors.componentNotFound', { component: 'Branch' }));
      await this.waitForKeyPress();
      return;
    }

    console.log(`\n🌿 ${t('component.branch.status_display')}`);
    console.log(`${t('component.config.categories')}: 6`);
    console.log(`${t('component.config.item_count')}: 15+\n`);

    const category = await select({
      message: `${t('editor.components.items.branch.name')} - ${t('component.config.deep')}`,
      choices: [
        {
          name: `⚙️  基础设置 | Basic Settings`,
          value: 'basic',
          description:
            '启用/禁用、图标、颜色、长度限制 | Enable/disable, icons, colors, length limits',
        },
        {
          name: `📊 Git状态显示 | Git Status Display`,
          value: 'status',
          description:
            '脏工作区、ahead/behind、暂存/未暂存文件计数 | Dirty, ahead/behind, staged/unstaged counts',
        },
        {
          name: `🔧 Git操作检测 | Git Operations Detection`,
          value: 'operations',
          description:
            '合并、变基、cherry-pick、bisect状态 | Merge, rebase, cherry-pick, bisect status',
        },
        {
          name: `📝 版本信息 | Version Information`,
          value: 'version',
          description: '提交SHA、标签、时间戳信息 | Commit SHA, tags, timestamp info',
        },
        {
          name: `🎨 状态图标 | Status Icons`,
          value: 'icons',
          description: '各种Git状态的图标配置 | Icon configuration for various Git statuses',
        },
        {
          name: `🌈 状态颜色 | Status Colors`,
          value: 'colors',
          description: 'Git状态对应的颜色设置 | Color settings for Git statuses',
        },
        {
          name: `⚡ 性能优化 | Performance Optimization`,
          value: 'performance',
          description: '缓存、超时、并行命令执行配置 | Cache, timeout, parallel command execution',
        },
        {
          name: t('editor.components.items.back'),
          value: 'back',
        },
      ],
    });

    switch (category) {
      case 'basic':
        // 基础设置在主编辑器中处理
        console.log('\n⚠️ 基础设置请返回主编辑器配置');
        await this.waitForKeyPress();
        break;
      case 'status':
        await this.configureBranchStatus();
        break;
      case 'operations':
        await this.configureBranchOperations();
        break;
      case 'version':
        await this.configureBranchVersion();
        break;
      case 'icons':
        await this.configureBranchIcons();
        break;
      case 'colors':
        await this.configureBranchColors();
        break;
      case 'performance':
        await this.configureBranchPerformance();
        break;
      case 'back':
        return;
    }
  }

  /**
   * Git状态显示配置 | Git Status Display Configuration
   */
  async configureBranchStatus(): Promise<void> {
    const branchConfig = this.currentConfig.components?.branch;
    const currentStatus = (branchConfig?.status || {}) as Record<string, boolean>;

    console.log(`\n📊 ${t('component.branch.status_display')}`);
    console.log(`${t('component.config.item_count')}: 6\n`);

    // 显示当前配置状态
    console.log('当前配置 | Current Configuration:');
    console.log(`  ${t('git.status.show_dirty')}: ${currentStatus.show_dirty ? '✅' : '❌'}`);
    console.log(
      `  ${t('git.status.show_ahead_behind')}: ${currentStatus.show_ahead_behind ? '✅' : '❌'}`
    );
    console.log(`  ${t('git.status.show_stash')}: ${currentStatus.show_stash_count ? '✅' : '❌'}`);
    console.log(
      `  ${t('git.status.show_staged')}: ${currentStatus.show_staged_count ? '✅' : '❌'}`
    );
    console.log(
      `  ${t('git.status.show_unstaged')}: ${currentStatus.show_unstaged_count ? '✅' : '❌'}`
    );
    console.log(
      `  ${t('git.status.show_untracked')}: ${currentStatus.show_untracked_count ? '✅' : '❌'}\n`
    );

    const selectedOptions = await checkbox({
      message: '选择要启用的Git状态显示选项 | Select Git status display options to enable:',
      choices: [
        {
          name: `⚡ ${t('git.status.show_dirty')} | Show dirty workspace status`,
          value: 'show_dirty',
          checked: currentStatus.show_dirty || false,
        },
        {
          name: `↕️  ${t('git.status.show_ahead_behind')} | Show ahead/behind count`,
          value: 'show_ahead_behind',
          checked: currentStatus.show_ahead_behind || false,
        },
        {
          name: `📦 ${t('git.status.show_stash')} | Show stash count`,
          value: 'show_stash_count',
          checked: currentStatus.show_stash_count || false,
        },
        {
          name: `📝 ${t('git.status.show_staged')} | Show staged files count`,
          value: 'show_staged_count',
          checked: currentStatus.show_staged_count || false,
        },
        {
          name: `📄 ${t('git.status.show_unstaged')} | Show unstaged files count`,
          value: 'show_unstaged_count',
          checked: currentStatus.show_unstaged_count || false,
        },
        {
          name: `❓ ${t('git.status.show_untracked')} | Show untracked files count`,
          value: 'show_untracked_count',
          checked: currentStatus.show_untracked_count || false,
        },
      ],
    });

    // 更新配置
    const updatedStatus = {
      show_dirty: selectedOptions.includes('show_dirty'),
      show_ahead_behind: selectedOptions.includes('show_ahead_behind'),
      show_stash_count: selectedOptions.includes('show_stash_count'),
      show_staged_count: selectedOptions.includes('show_staged_count'),
      show_unstaged_count: selectedOptions.includes('show_unstaged_count'),
      show_untracked_count: selectedOptions.includes('show_untracked_count'),
    };

    // 确保branch组件配置存在
    if (!this.currentConfig.components?.branch) {
      this.currentConfig.components = {
        order: this.currentConfig.components?.order || [
          'project',
          'model',
          'branch',
          'tokens',
          'usage',
          'status',
        ],
        ...this.currentConfig.components,
        branch: {
          enabled: true,
          emoji_icon: '🌿',
          nerd_icon: '',
          text_icon: 'B',
          icon_color: 'green' as const,
          text_color: 'white' as const,
          show_when_no_git: false,
          max_length: 20,
        },
      };
    }

    (this.currentConfig.components as any).branch = {
      ...this.currentConfig.components!.branch,
      status: updatedStatus,
    };

    this.markUnsavedChanges();

    console.log('\n✅ Git状态显示配置已更新 | Git status display configuration updated!');
    await this.waitForKeyPress();
  }

  /**
   * Git操作检测配置 | Git Operations Detection Configuration
   */
  async configureBranchOperations(): Promise<void> {
    const branchConfig = this.currentConfig.components?.branch;
    const currentOperations = branchConfig?.operations || ({} as any);

    console.log(`\n🔧 ${t('component.branch.operations')}`);
    console.log(`${t('component.config.item_count')}: 4\n`);

    // 显示当前配置状态
    console.log('当前配置 | Current Configuration:');
    console.log(`  显示合并状态 | Show merge: ${currentOperations.show_merge ? '✅' : '❌'}`);
    console.log(`  显示变基状态 | Show rebase: ${currentOperations.show_rebase ? '✅' : '❌'}`);
    console.log(
      `  显示cherry-pick | Show cherry-pick: ${currentOperations.show_cherry_pick ? '✅' : '❌'}`
    );
    console.log(`  显示bisect状态 | Show bisect: ${currentOperations.show_bisect ? '✅' : '❌'}\n`);

    const selectedOptions = await checkbox({
      message: '选择要启用的Git操作检测选项 | Select Git operations detection options to enable:',
      choices: [
        {
          name: '🔀 显示合并状态 | Show merge status',
          value: 'show_merge',
          checked: currentOperations.show_merge || false,
        },
        {
          name: '🔄 显示变基状态 | Show rebase status',
          value: 'show_rebase',
          checked: currentOperations.show_rebase || false,
        },
        {
          name: '🍒 显示cherry-pick状态 | Show cherry-pick status',
          value: 'show_cherry_pick',
          checked: currentOperations.show_cherry_pick || false,
        },
        {
          name: '🔍 显示bisect状态 | Show bisect status',
          value: 'show_bisect',
          checked: currentOperations.show_bisect || false,
        },
      ],
    });

    // 更新配置
    const updatedOperations = {
      show_merge: selectedOptions.includes('show_merge'),
      show_rebase: selectedOptions.includes('show_rebase'),
      show_cherry_pick: selectedOptions.includes('show_cherry_pick'),
      show_bisect: selectedOptions.includes('show_bisect'),
    };

    // 确保branch组件配置存在
    if (!this.currentConfig.components?.branch) {
      this.currentConfig.components = {
        order: this.currentConfig.components?.order || [
          'project',
          'model',
          'branch',
          'tokens',
          'usage',
          'status',
        ],
        ...this.currentConfig.components,
        branch: {
          enabled: true,
          emoji_icon: '🌿',
          nerd_icon: '',
          text_icon: 'B',
          icon_color: 'green' as const,
          text_color: 'white' as const,
          show_when_no_git: false,
          max_length: 20,
        },
      };
    }

    (this.currentConfig.components as any).branch = {
      ...this.currentConfig.components!.branch,
      operations: updatedOperations,
    };

    this.markUnsavedChanges();

    console.log('\n✅ Git操作检测配置已更新 | Git operations detection configuration updated!');
    await this.waitForKeyPress();
  }

  /**
   * 版本信息配置 | Version Information Configuration
   */
  async configureBranchVersion(): Promise<void> {
    const branchConfig = this.currentConfig.components?.branch;
    const currentVersion = branchConfig?.version || ({} as any);

    console.log(`\n📝 ${t('component.branch.version_info')}`);
    console.log(`${t('component.config.item_count')}: 4\n`);

    // 显示当前配置状态
    console.log('当前配置 | Current Configuration:');
    console.log(
      `  显示提交SHA | Show commit hash: ${currentVersion.show_commit_hash ? '✅' : '❌'}`
    );
    console.log(`  显示最近标签 | Show tag: ${currentVersion.show_tag ? '✅' : '❌'}`);
    console.log(
      `  显示提交时间 | Show commit time: ${currentVersion.show_commit_time ? '✅' : '❌'}`
    );
    console.log(`  SHA显示长度 | Hash length: ${currentVersion.hash_length || 7}\n`);

    const selectedOptions = await checkbox({
      message:
        '选择要启用的版本信息显示选项 | Select version information display options to enable:',
      choices: [
        {
          name: '🔗 显示提交SHA（短） | Show commit hash (short)',
          value: 'show_commit_hash',
          checked: currentVersion.show_commit_hash || false,
        },
        {
          name: '🏷️  显示最近标签 | Show latest tag',
          value: 'show_tag',
          checked: currentVersion.show_tag || false,
        },
        {
          name: '🕐 显示最后提交时间 | Show last commit time',
          value: 'show_commit_time',
          checked: currentVersion.show_commit_time || false,
        },
      ],
    });

    let hashLength = currentVersion.hash_length || 7;
    if (selectedOptions.includes('show_commit_hash')) {
      hashLength = await select({
        message: '选择SHA显示长度 | Select SHA display length:',
        choices: [
          { name: '4位 | 4 chars', value: 4 },
          { name: '6位 | 6 chars', value: 6 },
          { name: '7位 (推荐) | 7 chars (recommended)', value: 7 },
          { name: '8位 | 8 chars', value: 8 },
          { name: '10位 | 10 chars', value: 10 },
        ],
        default: currentVersion.hash_length || 7,
      });
    }

    // 更新配置
    const updatedVersion = {
      show_commit_hash: selectedOptions.includes('show_commit_hash'),
      show_tag: selectedOptions.includes('show_tag'),
      show_commit_time: selectedOptions.includes('show_commit_time'),
      hash_length: hashLength,
    };

    // 确保branch组件配置存在
    if (!this.currentConfig.components?.branch) {
      this.currentConfig.components = {
        order: this.currentConfig.components?.order || [
          'project',
          'model',
          'branch',
          'tokens',
          'usage',
          'status',
        ],
        ...this.currentConfig.components,
        branch: {
          enabled: true,
          emoji_icon: '🌿',
          nerd_icon: '',
          text_icon: 'B',
          icon_color: 'green' as const,
          text_color: 'white' as const,
          show_when_no_git: false,
          max_length: 20,
        },
      };
    }

    (this.currentConfig.components as any).branch = {
      ...this.currentConfig.components!.branch,
      version: updatedVersion,
    };

    this.markUnsavedChanges();

    console.log('\n✅ 版本信息配置已更新 | Version information configuration updated!');
    await this.waitForKeyPress();
  }

  /**
   * 状态图标配置 | Status Icons Configuration
   */
  async configureBranchIcons(): Promise<void> {
    const branchConfig = this.currentConfig.components?.branch;
    const currentIcons = branchConfig?.status_icons || ({} as any);

    console.log('\n🎨 状态图标配置 | Status Icons Configuration');
    console.log('配置各种Git状态对应的图标 | Configure icons for various Git statuses\n');

    const iconType = await select({
      message: '选择要配置的图标类型 | Select icon type to configure:',
      choices: [
        { name: '😀 Emoji图标 | Emoji Icons', value: 'emoji' },
        { name: '⚡ Nerd Font图标 | Nerd Font Icons', value: 'nerd' },
        { name: '📝 文本图标 | Text Icons', value: 'text' },
        { name: t('editor.components.items.back'), value: 'back' },
      ],
    });

    if (iconType === 'back') return;

    // 根据类型配置对应的图标
    let updatedIcons = { ...currentIcons };

    if (iconType === 'emoji') {
      const dirtyIcon = await input({
        message: '脏工作区图标 | Dirty workspace icon:',
        default: currentIcons.dirty_emoji || '⚡',
      });

      const cleanIcon = await input({
        message: '清洁工作区图标 | Clean workspace icon:',
        default: currentIcons.clean_emoji || '✨',
      });

      const aheadIcon = await input({
        message: 'ahead提交图标 | Ahead commits icon:',
        default: currentIcons.ahead_emoji || '↑',
      });

      const behindIcon = await input({
        message: 'behind提交图标 | Behind commits icon:',
        default: currentIcons.behind_emoji || '↓',
      });

      updatedIcons = {
        ...updatedIcons,
        dirty_emoji: dirtyIcon,
        clean_emoji: cleanIcon,
        ahead_emoji: aheadIcon,
        behind_emoji: behindIcon,
      };
    }

    // 确保branch组件配置存在
    if (!this.currentConfig.components?.branch) {
      this.currentConfig.components = {
        order: this.currentConfig.components?.order || [
          'project',
          'model',
          'branch',
          'tokens',
          'usage',
          'status',
        ],
        ...this.currentConfig.components,
        branch: {
          enabled: true,
          emoji_icon: '🌿',
          nerd_icon: '',
          text_icon: 'B',
          icon_color: 'green' as const,
          text_color: 'white' as const,
          show_when_no_git: false,
          max_length: 20,
        },
      };
    }

    (this.currentConfig.components as any).branch = {
      ...this.currentConfig.components!.branch,
      status_icons: updatedIcons,
    };

    this.markUnsavedChanges();

    console.log('\n✅ 状态图标配置已更新 | Status icons configuration updated!');
    await this.waitForKeyPress();
  }

  /**
   * 状态颜色配置 | Status Colors Configuration
   */
  async configureBranchColors(): Promise<void> {
    const branchConfig = this.currentConfig.components?.branch;
    const currentColors = branchConfig?.status_colors || ({} as any);

    console.log('\n🌈 状态颜色配置 | Status Colors Configuration');
    console.log('配置各种Git状态对应的颜色 | Configure colors for various Git statuses\n');

    const cleanColor = await select({
      message: '清洁状态颜色 | Clean status color:',
      choices: [
        { name: t('colors.green'), value: 'green' },
        { name: t('colors.cyan'), value: 'cyan' },
        { name: t('colors.blue'), value: 'blue' },
        { name: t('colors.white'), value: 'white' },
      ],
      default: currentColors.clean || 'green',
    });

    const dirtyColor = await select({
      message: '脏状态颜色 | Dirty status color:',
      choices: [
        { name: t('colors.yellow'), value: 'yellow' },
        { name: t('colors.red'), value: 'red' },
        { name: t('colors.magenta'), value: 'magenta' },
        { name: t('colors.white'), value: 'white' },
      ],
      default: currentColors.dirty || 'yellow',
    });

    const aheadColor = await select({
      message: 'ahead状态颜色 | Ahead status color:',
      choices: [
        { name: t('colors.cyan'), value: 'cyan' },
        { name: t('colors.blue'), value: 'blue' },
        { name: t('colors.green'), value: 'green' },
        { name: t('colors.white'), value: 'white' },
      ],
      default: currentColors.ahead || 'cyan',
    });

    const behindColor = await select({
      message: 'behind状态颜色 | Behind status color:',
      choices: [
        { name: t('colors.magenta'), value: 'magenta' },
        { name: t('colors.red'), value: 'red' },
        { name: t('colors.yellow'), value: 'yellow' },
        { name: t('colors.white'), value: 'white' },
      ],
      default: currentColors.behind || 'magenta',
    });

    const operationColor = await select({
      message: '操作进行中颜色 | Operation in progress color:',
      choices: [
        { name: t('colors.red'), value: 'red' },
        { name: t('colors.yellow'), value: 'yellow' },
        { name: t('colors.magenta'), value: 'magenta' },
        { name: t('colors.white'), value: 'white' },
      ],
      default: currentColors.operation || 'red',
    });

    // 更新配置
    const updatedColors = {
      clean: cleanColor as any,
      dirty: dirtyColor as any,
      ahead: aheadColor as any,
      behind: behindColor as any,
      operation: operationColor as any,
    };

    // 确保branch组件配置存在
    if (!this.currentConfig.components?.branch) {
      this.currentConfig.components = {
        order: this.currentConfig.components?.order || [
          'project',
          'model',
          'branch',
          'tokens',
          'usage',
          'status',
        ],
        ...this.currentConfig.components,
        branch: {
          enabled: true,
          emoji_icon: '🌿',
          nerd_icon: '',
          text_icon: 'B',
          icon_color: 'green' as const,
          text_color: 'white' as const,
          show_when_no_git: false,
          max_length: 20,
        },
      };
    }

    (this.currentConfig.components as any).branch = {
      ...this.currentConfig.components!.branch,
      status_colors: updatedColors,
    };

    this.markUnsavedChanges();

    console.log('\n✅ 状态颜色配置已更新 | Status colors configuration updated!');
    await this.waitForKeyPress();
  }

  /**
   * 性能优化配置 | Performance Optimization Configuration
   */
  async configureBranchPerformance(): Promise<void> {
    const branchConfig = this.currentConfig.components?.branch;
    const currentPerformance = branchConfig?.performance || ({} as any);

    console.log(`\n⚡ ${t('component.branch.performance')}`);
    console.log(`${t('component.config.item_count')}: 7\n`);

    // 显示当前配置状态
    console.log('当前配置 | Current Configuration:');
    console.log(
      `  启用缓存 | Enable cache: ${currentPerformance.enable_cache !== false ? '✅' : '❌'}`
    );
    console.log(`  缓存TTL | Cache TTL: ${currentPerformance.cache_ttl || 5000}ms`);
    console.log(`  Git超时 | Git timeout: ${currentPerformance.git_timeout || 1000}ms`);
    console.log(
      `  并行命令 | Parallel commands: ${currentPerformance.parallel_commands !== false ? '✅' : '❌'}`
    );
    console.log(
      `  懒加载 | Lazy load: ${currentPerformance.lazy_load_status !== false ? '✅' : '❌'}`
    );
    console.log(
      `  大仓库跳过 | Skip on large repo: ${currentPerformance.skip_on_large_repo !== false ? '✅' : '❌'}`
    );
    console.log(
      `  大仓库阈值 | Large repo threshold: ${currentPerformance.large_repo_threshold || 10000}\n`
    );

    const enableCache = await confirm({
      message: '启用缓存？ | Enable cache?',
      default: currentPerformance.enable_cache !== false,
    });

    const cacheSettings = { cache_ttl: currentPerformance.cache_ttl || 5000 };
    if (enableCache) {
      const cacheTtl = await select({
        message: '缓存TTL（毫秒）| Cache TTL (milliseconds):',
        choices: [
          { name: '1秒 | 1s', value: 1000 },
          { name: '3秒 | 3s', value: 3000 },
          { name: '5秒 (推荐) | 5s (recommended)', value: 5000 },
          { name: '10秒 | 10s', value: 10000 },
          { name: '30秒 | 30s', value: 30000 },
        ],
        default: currentPerformance.cache_ttl || 5000,
      });
      cacheSettings.cache_ttl = cacheTtl;
    }

    const gitTimeout = await select({
      message: 'Git命令超时（毫秒）| Git command timeout (milliseconds):',
      choices: [
        { name: '500ms', value: 500 },
        { name: '1秒 (推荐) | 1s (recommended)', value: 1000 },
        { name: '2秒 | 2s', value: 2000 },
        { name: '5秒 | 5s', value: 5000 },
      ],
      default: currentPerformance.git_timeout || 1000,
    });

    const parallelCommands = await confirm({
      message: '并行执行Git命令？ | Execute Git commands in parallel?',
      default: currentPerformance.parallel_commands !== false,
    });

    const lazyLoadStatus = await confirm({
      message: '懒加载状态信息？ | Lazy load status information?',
      default: currentPerformance.lazy_load_status !== false,
    });

    const skipOnLargeRepo = await confirm({
      message: '大仓库时跳过重操作？ | Skip heavy operations on large repositories?',
      default: currentPerformance.skip_on_large_repo !== false,
    });

    let largeRepoThreshold = currentPerformance.large_repo_threshold || 10000;
    if (skipOnLargeRepo) {
      largeRepoThreshold = await select({
        message: '大仓库文件数阈值 | Large repository file count threshold:',
        choices: [
          { name: '5,000 文件 | 5K files', value: 5000 },
          { name: '10,000 文件 (推荐) | 10K files (recommended)', value: 10000 },
          { name: '20,000 文件 | 20K files', value: 20000 },
          { name: '50,000 文件 | 50K files', value: 50000 },
        ],
        default: currentPerformance.large_repo_threshold || 10000,
      });
    }

    // 更新配置
    const updatedPerformance = {
      enable_cache: enableCache,
      ...cacheSettings,
      git_timeout: gitTimeout,
      parallel_commands: parallelCommands,
      lazy_load_status: lazyLoadStatus,
      skip_on_large_repo: skipOnLargeRepo,
      large_repo_threshold: largeRepoThreshold,
    };

    // 确保branch组件配置存在
    if (!this.currentConfig.components?.branch) {
      this.currentConfig.components = {
        order: this.currentConfig.components?.order || [
          'project',
          'model',
          'branch',
          'tokens',
          'usage',
          'status',
        ],
        ...this.currentConfig.components,
        branch: {
          enabled: true,
          emoji_icon: '🌿',
          nerd_icon: '',
          text_icon: 'B',
          icon_color: 'green' as const,
          text_color: 'white' as const,
          show_when_no_git: false,
          max_length: 20,
        },
      };
    }

    (this.currentConfig.components as any).branch = {
      ...this.currentConfig.components!.branch,
      performance: updatedPerformance,
    };

    this.markUnsavedChanges();

    console.log('\n✅ 性能优化配置已更新 | Performance optimization configuration updated!');
    await this.waitForKeyPress();
  }

  /**
   * 更新配置引用 | Update Config Reference
   * 用于主编辑器更新配置后同步状态
   */
  updateConfig(config: Config, hasUnsavedChanges: boolean): void {
    this.currentConfig = config;
    this.hasUnsavedChanges = hasUnsavedChanges;
  }

  /**
   * 获取当前配置 | Get Current Config
   */
  getCurrentConfig(): Config {
    return this.currentConfig;
  }

  /**
   * 检查是否有未保存更改 | Check if has unsaved changes
   */
  getHasUnsavedChanges(): boolean {
    return this.hasUnsavedChanges;
  }
}

/**
 * 工厂函数 - 创建Branch编辑器实例
 */
export function createBranchEditor(
  config: Config,
  hasUnsavedChanges: boolean,
  markUnsavedChanges: () => void,
  waitForKeyPress: () => Promise<void>
): BranchEditor {
  return new BranchEditor(config, hasUnsavedChanges, markUnsavedChanges, waitForKeyPress);
}
