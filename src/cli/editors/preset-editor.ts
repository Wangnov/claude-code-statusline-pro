/**
 * 预设编辑器 - Preset Editor
 * 从 config-editor.ts 中拆分出来的预设管理功能
 *
 * 功能包括:
 * - 内置预设应用 | Built-in preset application
 * - 自定义预设管理 | Custom preset management
 * - 组件排序配置 | Component order configuration
 * - 预设效果预览 | Preset effect preview
 * - 当前配置查看 | Current configuration viewing
 */

import { checkbox, confirm, input, select } from '@inquirer/prompts';
import type { Config } from '../../config/schema.js';
import { TerminalDetector } from '../../terminal/detector.js';
import { t } from '../i18n.js';
import { defaultPresetManager } from '../preset-manager.js';

/**
 * 预设编辑器选项
 */
export interface PresetEditorOptions {
  /** 是否启用详细日志 */
  verbose?: boolean;
}

/**
 * 预设编辑器类
 */
export class PresetEditor {
  private terminalDetector: TerminalDetector;
  private _currentConfig!: Config;
  private _hasUnsavedChanges = false;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Used in constructor only
  private options: Required<PresetEditorOptions>;

  constructor(options: PresetEditorOptions = {}) {
    this.options = {
      verbose: options.verbose ?? false,
    };
    this.terminalDetector = new TerminalDetector();
  }

  /**
   * 设置当前配置
   */
  setCurrentConfig(config: Config): void {
    this._currentConfig = config;
  }

  /**
   * 获取当前配置
   */
  getCurrentConfig(): Config {
    return this._currentConfig;
  }

  /**
   * 设置未保存标志
   */
  setHasUnsavedChanges(value: boolean): void {
    this._hasUnsavedChanges = value;
  }

  /**
   * 获取未保存标志
   */
  getHasUnsavedChanges(): boolean {
    return this._hasUnsavedChanges;
  }

  /**
   * 配置预设
   */
  async configurePresets(): Promise<void> {
    const action = await select({
      message: '🎯 预设管理 - 统一管理组件显示和排序',
      choices: [
        {
          name: '🎨 应用内置预设',
          value: 'apply-builtin',
          description: '选择并应用内置预设配置 (PMBTUS、PMBTS、PMBT等)',
        },
        {
          name: '✏️ 编辑当前预设',
          value: 'edit-current',
          description: '修改当前的组件启用状态和排序',
        },
        {
          name: '🆕 创建自定义预设',
          value: 'create-custom',
          description: '创建并保存个人专属预设',
        },
        {
          name: '🗑️ 删除自定义预设',
          value: 'delete-custom',
          description: '删除已创建的自定义预设',
        },
        {
          name: '👁️ 预览预设效果',
          value: 'preview',
          description: '预览各种预设的显示效果',
        },
        {
          name: '← 返回主菜单',
          value: 'back',
        },
      ],
    });

    switch (action) {
      case 'apply-builtin':
        await this.applyBuiltinPreset();
        break;
      case 'edit-current':
        await this.editCurrentPreset();
        break;
      case 'create-custom':
        await this.createCustomPreset();
        break;
      case 'delete-custom':
        await this.deleteCustomPreset();
        break;
      case 'preview':
        await this.previewPresets();
        break;
      case 'back':
        return;
    }
  }

  /**
   * 应用内置预设
   */
  async applyBuiltinPreset(): Promise<void> {
    const availablePresets = defaultPresetManager
      .getAvailablePresets()
      .filter((preset) => preset.type === 'builtin')
      .sort((a, b) => a.name.localeCompare(b.name));

    if (availablePresets.length === 0) {
      console.log('\n❌ 没有可用的内置预设');
      await this.waitForKeyPress();
      return;
    }

    const choices = availablePresets.map((preset) => ({
      name: `${preset.id} - ${preset.name}`,
      value: preset.id,
      description: preset.description,
    }));

    choices.push({ name: '← 返回预设菜单', value: 'back', description: '返回到预设管理主菜单' });

    const selectedPreset = await select({
      message: '🎨 选择要应用的内置预设：',
      choices,
    });

    if (selectedPreset === 'back') return;

    // 应用预设并清理enabled属性
    const result = defaultPresetManager.applyPresetAndCleanup(this._currentConfig, selectedPreset);
    if (result.success && result.config) {
      this._currentConfig = result.config as Config;
      this._hasUnsavedChanges = true;

      const summary = defaultPresetManager.getPresetSummary(selectedPreset);
      console.log(`\n✅ 已成功应用内置预设: ${selectedPreset}`);
      console.log(`📋 ${summary}`);

      // 显示当前配置
      if (this._currentConfig.components?.order) {
        console.log(`🔧 组件排序: ${this._currentConfig.components.order.join(' → ')}`);
      }
    } else {
      console.log(`\n❌ 预设应用失败: ${result.error}`);
    }

    await this.waitForKeyPress();
  }

  /**
   * 编辑当前预设
   */
  async editCurrentPreset(): Promise<void> {
    console.log('\n✏️ 编辑当前预设配置\n');

    const action = await select({
      message: '选择编辑操作：',
      choices: [
        {
          name: '🔧 修改组件启用状态',
          value: 'toggle-components',
          description: '启用或禁用各个组件',
        },
        {
          name: '📊 调整组件排序',
          value: 'reorder-components',
          description: '更改组件在状态栏中的显示顺序',
        },
        {
          name: '👁️ 查看当前配置',
          value: 'view-current',
          description: '显示当前组件配置状态',
        },
        {
          name: '← 返回预设菜单',
          value: 'back',
        },
      ],
    });

    switch (action) {
      case 'toggle-components':
        await this.toggleComponents();
        break;
      case 'reorder-components':
        await this.configureComponentOrder();
        break;
      case 'view-current':
        await this.viewCurrentConfiguration();
        break;
      case 'back':
        return;
    }
  }

  /**
   * 创建自定义预设
   */
  async createCustomPreset(): Promise<void> {
    console.log('\n🆕 创建自定义预设\n');

    // 获取预设名称
    const name = await input({
      message: '请输入自定义预设名称：',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return '预设名称不能为空';
        }
        if (value.trim().length > 50) {
          return '预设名称不能超过50个字符';
        }
        return true;
      },
    });

    if (!name || name.trim().length === 0) return;

    // 获取预设描述
    const description = await input({
      message: '请输入预设描述（可选）：',
      default: `自定义预设: ${name.trim()}`,
    });

    // 选择要启用的组件
    const selectedComponents = await checkbox({
      message: '选择要启用的组件：',
      choices: [
        { name: '📁 项目名称 - 显示当前项目名称', value: 'project', checked: true },
        { name: '🤖 AI模型 - 显示当前AI模型信息', value: 'model', checked: true },
        { name: '🌿 Git分支 - 显示Git分支和状态信息', value: 'branch', checked: true },
        { name: '📊 Token使用 - 显示Token使用情况和进度条', value: 'tokens', checked: true },
        { name: '💰 使用量统计 - 显示使用成本和统计信息', value: 'usage', checked: false },
        { name: '⚡ 会话状态 - 显示当前会话状态', value: 'status', checked: false },
      ],
    });

    if (selectedComponents.length === 0) {
      console.log('\n⚠️ 至少需要选择一个组件');
      await this.waitForKeyPress();
      return;
    }

    // 组件排序
    const componentOrder = await this.selectComponentOrder(selectedComponents);

    // 生成启用状态映射
    const enabled: Record<string, boolean> = {
      project: selectedComponents.includes('project'),
      model: selectedComponents.includes('model'),
      branch: selectedComponents.includes('branch'),
      tokens: selectedComponents.includes('tokens'),
      usage: selectedComponents.includes('usage'),
      status: selectedComponents.includes('status'),
    };

    // 创建预设
    try {
      const customPreset = defaultPresetManager.createCustomPreset(
        name.trim(),
        componentOrder,
        enabled,
        description || undefined
      );

      console.log(`\n✅ 自定义预设创建成功！`);
      console.log(`📋 预设ID: ${customPreset.id}`);
      console.log(`📝 预设名称: ${customPreset.name}`);
      console.log(`📄 预设描述: ${customPreset.description}`);
      console.log(`🔧 组件排序: ${customPreset.order.join(' → ')}`);

      // 询问是否立即应用
      const applyNow = await confirm({
        message: '是否立即应用此自定义预设？',
        default: true,
      });

      if (applyNow) {
        const result = defaultPresetManager.applyPresetAndCleanup(
          this._currentConfig,
          customPreset.id
        );
        if (result.success && result.config) {
          this._currentConfig = result.config as Config;
          this._hasUnsavedChanges = true;
          console.log('\n✅ 自定义预设已应用到当前配置');
        }
      }
    } catch (error) {
      console.log(
        `\n❌ 创建自定义预设失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    await this.waitForKeyPress();
  }

  /**
   * 删除自定义预设
   */
  async deleteCustomPreset(): Promise<void> {
    const customPresets = defaultPresetManager
      .getAvailablePresets()
      .filter((preset) => preset.type === 'custom');

    if (customPresets.length === 0) {
      console.log('\n📋 没有可删除的自定义预设');
      await this.waitForKeyPress();
      return;
    }

    console.log('\n🗑️ 删除自定义预设\n');

    const choices = customPresets.map((preset) => ({
      name: `${preset.name} - ${preset.description}`,
      value: preset.id,
      description: `创建时间: ${preset.createdAt || '未知'}`,
    }));

    choices.push({ name: '← 返回预设菜单', value: 'back', description: '返回到预设管理主菜单' });

    const selectedPreset = await select({
      message: '选择要删除的自定义预设：',
      choices,
    });

    if (selectedPreset === 'back') return;

    const presetToDelete = customPresets.find((p) => p.id === selectedPreset);
    if (!presetToDelete) {
      console.log('\n❌ 找不到指定的预设');
      await this.waitForKeyPress();
      return;
    }

    // 确认删除
    console.log(`\n📋 预设信息:`);
    console.log(`   名称: ${presetToDelete.name}`);
    console.log(`   描述: ${presetToDelete.description}`);
    console.log(`   组件: ${presetToDelete.order.join(', ')}`);

    const confirmDelete = await confirm({
      message: '⚠️ 确定要删除此自定义预设吗？此操作无法撤销！',
      default: false,
    });

    if (!confirmDelete) {
      console.log('\n✅ 删除操作已取消');
      await this.waitForKeyPress();
      return;
    }

    // 删除预设
    const success = defaultPresetManager.deleteCustomPreset(selectedPreset);
    if (success) {
      console.log(`\n✅ 自定义预设 "${presetToDelete.name}" 已删除`);
    } else {
      console.log('\n❌ 删除自定义预设失败');
    }

    await this.waitForKeyPress();
  }

  /**
   * 预览预设效果
   */
  async previewPresets(): Promise<void> {
    console.log('\n👁️ 预设效果预览\n');

    const allPresets = defaultPresetManager.getAvailablePresets();

    if (allPresets.length === 0) {
      console.log('❌ 没有可预览的预设');
      await this.waitForKeyPress();
      return;
    }

    const choices = allPresets.map((preset) => ({
      name: `${preset.name} (${preset.id})`,
      value: preset.id,
      description: preset.description,
    }));

    choices.push({ name: '← 返回预设菜单', value: 'back', description: '返回到预设管理主菜单' });

    const selectedPreset = await select({
      message: '选择要预览的预设：',
      choices,
    });

    if (selectedPreset === 'back') return;

    const preset = defaultPresetManager.getPresetDefinition(selectedPreset);
    if (!preset) {
      console.log('\n❌ 找不到指定的预设');
      await this.waitForKeyPress();
      return;
    }

    // 显示预设详细信息
    console.log(`\n📋 预设详细信息:`);
    console.log(`   🆔 ID: ${preset.id}`);
    console.log(`   📝 名称: ${preset.name}`);
    console.log(`   📄 描述: ${preset.description}`);
    console.log(`   🏷️ 类型: ${preset.type === 'builtin' ? '内置预设' : '自定义预设'}`);
    console.log(`   🔧 组件排序: ${preset.order.join(' → ')}`);

    // 显示组件启用状态
    console.log(`\n🔧 组件启用状态:`);
    for (const [component, enabled] of Object.entries(preset.enabled)) {
      const status = enabled ? '✅' : '❌';
      const componentName = this.getComponentDisplayName(component);
      console.log(`   ${status} ${componentName}`);
    }

    // 预设摘要
    const summary = defaultPresetManager.getPresetSummary(selectedPreset);
    console.log(`\n📊 ${summary}`);

    // 询问是否应用此预设
    const applyPreset = await confirm({
      message: '是否要应用此预设？',
      default: false,
    });

    if (applyPreset) {
      const result = defaultPresetManager.applyPresetAndCleanup(
        this._currentConfig,
        selectedPreset
      );
      if (result.success && result.config) {
        this._currentConfig = result.config as Config;
        this._hasUnsavedChanges = true;
        console.log(`\n✅ 预设 "${preset.name}" 已应用到当前配置`);
      } else {
        console.log(`\n❌ 应用预设失败: ${result.error}`);
      }
    }

    await this.waitForKeyPress();
  }

  /**
   * 切换组件启用状态（通过components.order管理）
   */
  async toggleComponents(): Promise<void> {
    console.log('\n🔧 修改组件启用状态\n');
    console.log('📌 注意：组件启用状态通过预设的组件排序(components.order)来控制');
    console.log('✅ 选中的组件将出现在状态栏中，未选中的组件将被隐藏\n');

    // 获取当前组件配置
    const currentComponents = this._currentConfig.components || { order: [] };
    const currentOrder = currentComponents.order || [];

    // 构建组件选择列表，基于components.order来判断当前启用状态
    const componentChoices = [
      { name: '📁 项目名称', value: 'project', checked: currentOrder.includes('project') },
      { name: '🤖 AI模型', value: 'model', checked: currentOrder.includes('model') },
      { name: '🌿 Git分支', value: 'branch', checked: currentOrder.includes('branch') },
      { name: '📊 Token使用', value: 'tokens', checked: currentOrder.includes('tokens') },
      { name: '💰 使用量统计', value: 'usage', checked: currentOrder.includes('usage') },
      { name: '⚡ 会话状态', value: 'status', checked: currentOrder.includes('status') },
    ];

    const selectedComponents = await checkbox({
      message: '选择要启用的组件（取消勾选则禁用）：',
      choices: componentChoices,
    });

    if (selectedComponents.length === 0) {
      console.log('\n⚠️ 至少需要选择一个组件');
      await this.waitForKeyPress();
      return;
    }

    // 更新组件顺序（只包含启用的组件）
    // 保持原有顺序，只过滤出选中的组件
    const orderedSelectedComponents = currentOrder.filter((comp) =>
      selectedComponents.includes(comp)
    );
    // 添加新选中但不在原顺序中的组件
    const newComponents = selectedComponents.filter((comp) => !currentOrder.includes(comp));
    const finalOrder = [...orderedSelectedComponents, ...newComponents];

    // 更新配置
    if (!this._currentConfig.components) {
      this._currentConfig.components = { order: [] };
    }

    this._currentConfig.components.order = finalOrder;

    // 清除preset设置，因为现在是自定义配置
    if (this._currentConfig.preset) {
      this._currentConfig.preset = 'PMBTUS'; // 重置为默认值而不是删除
      console.log('📌 已重置预设为默认值，当前为自定义配置');
    }

    this._hasUnsavedChanges = true;

    console.log('\n✅ 组件启用状态已更新');
    console.log(`🔧 启用的组件: ${finalOrder.join(', ')}`);
    console.log('💡 提示：您可以在"调整组件排序"中重新排列组件顺序');

    await this.waitForKeyPress();
  }

  /**
   * 组件排序配置界面 | Component Order Configuration Interface
   */
  async configureComponentOrder(): Promise<void> {
    // 获取当前组件顺序
    const currentOrder = this._currentConfig.components?.order || [
      'project',
      'model',
      'branch',
      'tokens',
      'usage',
      'status',
    ];

    let workingOrder = [...currentOrder];
    let continueEditing = true;

    while (continueEditing) {
      console.clear();

      // 显示标题
      const capabilities = this.terminalDetector.detectCapabilities();
      const title = capabilities.colors
        ? '\\x1b[1;36m🔧 组件排序配置 (左右移动调整顺序)\\x1b[0m'
        : '🔧 组件排序配置 (左右移动调整顺序)';

      console.log(title);
      console.log();

      // 可视化显示当前排序
      this.visualizeComponentOrder(workingOrder);
      console.log();

      // 显示操作菜单
      const action = await select({
        message: '选择操作 | Select operation:',
        choices: [
          {
            name: `⬆️  ${t('component.order.move_up')}`,
            value: 'up',
            description: '选择要上移的组件 | Select component to move up',
          },
          {
            name: `⬇️  ${t('component.order.move_down')}`,
            value: 'down',
            description: '选择要下移的组件 | Select component to move down',
          },
          {
            name: `✅ ${t('component.order.confirm')}`,
            value: 'confirm',
            description: '确认当前排序并保存 | Confirm current order and save',
          },
          {
            name: `🔄 ${t('component.order.reset')}`,
            value: 'reset',
            description: '重置为默认排序 | Reset to default order',
          },
          {
            name: '← 返回预设管理 | Back to preset management',
            value: 'back',
          },
        ],
      });

      switch (action) {
        case 'up':
          workingOrder = await this.moveComponentUp(workingOrder);
          break;
        case 'down':
          workingOrder = await this.moveComponentDown(workingOrder);
          break;
        case 'confirm':
          await this.confirmComponentOrder(workingOrder);
          continueEditing = false;
          break;
        case 'reset':
          workingOrder = ['project', 'model', 'branch', 'tokens', 'usage', 'status'];
          console.log('\\n✅ 已重置为默认排序 | Reset to default order');
          await this.waitForKeyPress();
          break;
        case 'back':
          continueEditing = false;
          break;
      }
    }
  }

  /**
   * 可视化显示组件排序 | Visualize Component Order
   */
  visualizeComponentOrder(order: string[]): void {
    const componentNames = {
      project: '📁 项目名称 (project)',
      model: '🤖 AI模型 (model)',
      branch: '🌿 Git分支 (branch)',
      tokens: '📊 Token使用 (tokens)',
      usage: '💰 使用量统计 (usage)',
      status: '✨ 会话状态 (status)',
    };

    console.log('当前排序 | Current Order:');

    for (let i = 0; i < order.length; i++) {
      const component = order[i];
      const displayName = componentNames[component as keyof typeof componentNames] || component;
      console.log(`${i + 1}. ${displayName}`);
    }
  }

  /**
   * 上移组件 | Move Component Up
   */
  async moveComponentUp(order: string[]): Promise<string[]> {
    if (order.length <= 1) {
      console.log('\\n⚠️  只有一个组件，无法移动 | Only one component, cannot move');
      await this.waitForKeyPress();
      return order;
    }

    const choices = order.map((component, index) => {
      const componentNames = {
        project: '📁 项目名称',
        model: '🤖 AI模型',
        branch: '🌿 Git分支',
        tokens: '📊 Token使用',
        usage: '💰 使用量统计',
        status: '✨ 会话状态',
      };

      const displayName = componentNames[component as keyof typeof componentNames] || component;
      const canMoveUp = index > 0;

      return {
        name: canMoveUp ? displayName : `${displayName} (已在顶部)`,
        value: index,
        disabled: !canMoveUp,
      };
    });

    const selectedIndex = await select({
      message: '选择要上移的组件 | Select component to move up:',
      choices,
    });

    if (selectedIndex > 0) {
      const newOrder = [...order];
      // 交换位置
      const temp = newOrder[selectedIndex - 1];
      newOrder[selectedIndex - 1] = newOrder[selectedIndex]!;
      newOrder[selectedIndex] = temp!;

      console.log(`\\n✅ 已上移 "${order[selectedIndex]}" | Moved "${order[selectedIndex]}" up`);
      await this.waitForKeyPress();

      return newOrder;
    }

    return order;
  }

  /**
   * 下移组件 | Move Component Down
   */
  async moveComponentDown(order: string[]): Promise<string[]> {
    if (order.length <= 1) {
      console.log('\\n⚠️  只有一个组件，无法移动 | Only one component, cannot move');
      await this.waitForKeyPress();
      return order;
    }

    const choices = order.map((component, index) => {
      const componentNames = {
        project: '📁 项目名称',
        model: '🤖 AI模型',
        branch: '🌿 Git分支',
        tokens: '📊 Token使用',
        usage: '💰 使用量统计',
        status: '✨ 会话状态',
      };

      const displayName = componentNames[component as keyof typeof componentNames] || component;
      const canMoveDown = index < order.length - 1;

      return {
        name: canMoveDown ? displayName : `${displayName} (已在底部)`,
        value: index,
        disabled: !canMoveDown,
      };
    });

    const selectedIndex = await select({
      message: '选择要下移的组件 | Select component to move down:',
      choices,
    });

    if (selectedIndex < order.length - 1) {
      const newOrder = [...order];
      // 交换位置
      const temp = newOrder[selectedIndex];
      newOrder[selectedIndex] = newOrder[selectedIndex + 1]!;
      newOrder[selectedIndex + 1] = temp!;

      console.log(`\\n✅ 已下移 "${order[selectedIndex]}" | Moved "${order[selectedIndex]}" down`);
      await this.waitForKeyPress();

      return newOrder;
    }

    return order;
  }

  /**
   * 确认组件排序 | Confirm Component Order
   */
  async confirmComponentOrder(order: string[]): Promise<void> {
    // 确保components配置存在
    if (!this._currentConfig.components) {
      this._currentConfig.components = {
        order: ['project', 'model', 'branch', 'tokens', 'usage', 'status'],
      };
    }

    // 更新组件顺序
    this._currentConfig.components.order = [...order];
    this._hasUnsavedChanges = true;

    console.log('\\n✅ 组件排序已确认并保存 | Component order confirmed and saved');
    console.log('\\n最终排序 | Final order:');
    this.visualizeComponentOrder(order);

    await this.waitForKeyPress();
  }

  /**
   * 重新排序组件 (原方法保持兼容性) | Reorder Components (Original method for compatibility)
   */
  async reorderComponents(): Promise<void> {
    console.log('\n📊 调整组件排序\n');

    // 获取当前启用的组件
    const currentOrder = this._currentConfig.components?.order || [
      'project',
      'model',
      'branch',
      'tokens',
    ];
    const enabledComponents = currentOrder.filter((component) => {
      const componentConfig = (this._currentConfig.components as any)?.[component];
      return componentConfig?.enabled !== false;
    });

    if (enabledComponents.length === 0) {
      console.log('⚠️ 没有启用的组件可以排序');
      await this.waitForKeyPress();
      return;
    }

    console.log(`📋 当前组件排序: ${enabledComponents.join(' → ')}`);

    const newOrder = await this.selectComponentOrder(enabledComponents);

    // 更新配置
    if (!this._currentConfig.components) {
      this._currentConfig.components = { order: [] };
    }

    this._currentConfig.components.order = newOrder;
    this._hasUnsavedChanges = true;

    console.log('\n✅ 组件排序已更新');
    console.log(`📊 新的排序: ${newOrder.join(' → ')}`);

    await this.waitForKeyPress();
  }

  /**
   * 查看当前配置
   */
  async viewCurrentConfiguration(): Promise<void> {
    console.log('\n👁️ 当前配置状态\n');

    const components = this._currentConfig.components || { order: [] };
    const order = components.order || [];
    const enabledSet = new Set(order); // 通过components.order判断启用状态

    console.log('📋 当前预设信息:');
    if (this._currentConfig.preset) {
      console.log(`   🎯 预设: ${this._currentConfig.preset}`);

      // 检查预设一致性
      const consistency = defaultPresetManager.validatePresetConsistency(this._currentConfig);
      if (!consistency.isConsistent) {
        console.log('   ⚠️ 预设状态不一致：');
        for (const issue of consistency.issues) {
          console.log(`     - ${issue}`);
        }
        if (consistency.recommendedPresets.length > 0) {
          console.log(`   💡 推荐预设: ${consistency.recommendedPresets.slice(0, 3).join(', ')}`);
        }
      } else {
        console.log('   ✅ 预设状态一致');
      }
    } else {
      console.log('   🎯 预设: 自定义配置');

      // 推荐合适的预设
      const recommended = defaultPresetManager.recommendPreset(components);
      if (recommended.length > 0) {
        console.log(`   💡 推荐预设: ${recommended.slice(0, 3).join(', ')}`);
      }
    }

    console.log('\n🔧 组件启用状态（基于components.order）:');
    const allComponents = ['project', 'model', 'branch', 'tokens', 'usage', 'status'];

    for (const component of allComponents) {
      const enabled = enabledSet.has(component);
      const status = enabled ? '✅' : '❌';
      const displayName = this.getComponentDisplayName(component);
      console.log(`   ${status} ${displayName}`);
    }

    console.log('\n📊 组件显示顺序:');
    if (order.length > 0) {
      console.log(`   🔗 ${order.map((c: string) => this.getComponentDisplayName(c)).join(' → ')}`);
    } else {
      console.log('   ⚠️ 未设置组件排序');
    }

    console.log('\n🎨 当前主题:');
    console.log(`   🎭 主题: ${this._currentConfig.theme || 'classic'}`);

    console.log('\n💫 样式设置:');
    console.log(`   🌈 颜色: ${this._currentConfig.style?.enable_colors ?? 'auto'}`);
    console.log(`   😊 表情符号: ${this._currentConfig.style?.enable_emoji ?? 'auto'}`);
    console.log(`   🔤 Nerd Font: ${this._currentConfig.style?.enable_nerd_font ?? 'auto'}`);

    // 显示preset管理提示
    console.log('\n💡 预设管理提示:');
    console.log('   - 组件启用状态完全由预设控制');
    console.log('   - 修改组件后将变为自定义配置');
    console.log('   - 建议使用预设来管理组件状态以保持一致性');

    await this.waitForKeyPress();
  }

  /**
   * 选择组件排序
   */
  async selectComponentOrder(components: string[]): Promise<string[]> {
    if (components.length <= 1) {
      return components;
    }

    console.log('\n📊 请按优先级顺序选择组件排序：\n');

    const orderedComponents: string[] = [];
    const availableComponents = [...components];

    while (availableComponents.length > 0) {
      const position = orderedComponents.length + 1;
      const choices = availableComponents.map((component) => ({
        name: this.getComponentDisplayName(component),
        value: component,
      }));

      const selected = await select({
        message: `选择第 ${position} 个组件：`,
        choices,
      });

      orderedComponents.push(selected);
      availableComponents.splice(availableComponents.indexOf(selected), 1);
    }

    console.log(
      `\n✅ 组件排序已确定: ${orderedComponents.map((c) => this.getComponentDisplayName(c)).join(' → ')}`
    );

    return orderedComponents;
  }

  /**
   * 获取组件显示名称
   */
  getComponentDisplayName(component: string): string {
    const displayNames: Record<string, string> = {
      project: '📁 项目名称',
      model: '🤖 AI模型',
      branch: '🌿 Git分支',
      tokens: '📊 Token使用',
      usage: '💰 使用量统计',
      status: '⚡ 会话状态',
    };

    return displayNames[component] || component;
  }

  /**
   * 等待按键
   */
  private async waitForKeyPress(): Promise<void> {
    console.log('\n按任意键继续...');
    return new Promise<void>((resolve) => {
      const stdin = process.stdin;

      // 设置stdin为原始模式
      if (stdin.isTTY) {
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');
      }

      const onData = (key: string) => {
        // 清理监听器
        stdin.removeListener('data', onData);

        // 恢复stdin模式
        if (stdin.isTTY) {
          stdin.setRawMode(false);
          stdin.pause();
        }

        // Ctrl+C 处理
        if (key === '\u0003') {
          console.log('\n👋 已退出预设编辑器');
          process.exit(0);
        }

        resolve();
      };

      stdin.on('data', onData);
    });
  }
}

/**
 * 工厂函数 - 创建预设编辑器实例
 */
export function createPresetEditor(options?: PresetEditorOptions): PresetEditor {
  return new PresetEditor(options);
}
