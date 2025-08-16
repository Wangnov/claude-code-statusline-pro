/**
 * 实时预览引擎 - Live Preview Engine
 * 核心功能: 多场景并行渲染、实时配置更新、动态状态展示
 *
 * 特性:
 * - 多场景Mock数据同时预览
 * - 实时配置变更响应 (<100ms)
 * - 动态状态指示器和进度条
 * - 智能终端兼容性检测
 * - 可配置刷新频率和显示模式
 */

import { ConfigLoader } from '../config/loader.js';
import type { Config } from '../config/schema.js';
import { StatuslineGenerator } from '../core/generator.js';
import type { TerminalCapabilities } from '../terminal/detector.js';
import { TerminalDetector } from '../terminal/detector.js';
import { ThemeManager } from '../themes/manager.js';
import type { ThemeCompatibilityResult } from '../themes/types.js';
import { MockDataGenerator, type MockScenario } from './mock-data.js';

// ANSI转义序列正则表达式 | ANSI escape sequence regex
const ANSI_ESCAPE_REGEX = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/**
 * 预览引擎配置接口
 */
export interface LivePreviewOptions {
  /** 配置文件路径 */
  configPath?: string;
  /** 指定主题 */
  theme?: string;
  /** 刷新频率(毫秒) */
  refreshInterval?: number;
  /** 显示场景数量 */
  maxScenarios?: number;
  /** 是否显示调试信息 */
  debug?: boolean;
  /** 是否启用动态Banner */
  dynamicBanner?: boolean;
}

/**
 * 渲染结果接口
 */
export interface RenderResult {
  /** 场景ID */
  scenarioId: string;
  /** 渲染结果 */
  output: string;
  /** 渲染时间(毫秒) */
  renderTime: number;
  /** 是否有错误 */
  hasError: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 实时预览引擎类
 */
export class LivePreviewEngine {
  private generator!: StatuslineGenerator;
  private configLoader: ConfigLoader;
  private mockGenerator: MockDataGenerator;
  private terminalDetector: TerminalDetector;
  private currentConfig!: Config;
  private themeManager!: ThemeManager; // 主题管理器实例 | Theme manager instance
  private availableThemes = ['classic', 'powerline', 'capsule']; // 可用主题列表 | Available themes list
  private currentThemeIndex = 0; // 当前主题索引 | Current theme index
  private lastThemeMessage = ''; // 最后的主题消息 | Last theme message
  private options: {
    configPath?: string;
    theme?: string;
    refreshInterval: number;
    maxScenarios: number;
    debug: boolean;
    dynamicBanner: boolean;
  };
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private sigintHandler?: () => void;
  private keyHandler?: (key: string) => void;

  constructor(options: LivePreviewOptions = {}) {
    this.options = {
      refreshInterval: options.refreshInterval || 300,
      maxScenarios: options.maxScenarios || 6,
      debug: options.debug || false,
      dynamicBanner: options.dynamicBanner ?? true,
    };

    if (options.configPath) {
      this.options.configPath = options.configPath;
    }

    if (options.theme) {
      this.options.theme = options.theme;
    }

    this.configLoader = new ConfigLoader();
    this.mockGenerator = new MockDataGenerator();
    this.terminalDetector = new TerminalDetector();
  }

  /**
   * 公开的初始化方法
   */
  async initialize(): Promise<void> {
    try {
      this.currentConfig = await this.configLoader.load(this.options.configPath);
      if (this.options.theme) {
        await this.configLoader.applyTheme(this.options.theme);
        this.currentConfig = await this.configLoader.load();
      }

      // 初始化主题管理器 | Initialize theme manager
      this.themeManager = new ThemeManager(this.currentConfig);

      // 设置当前主题索引 | Set current theme index
      const currentTheme = this.themeManager.getCurrentTheme();
      this.currentThemeIndex = this.availableThemes.indexOf(currentTheme);
      if (this.currentThemeIndex === -1) {
        this.currentThemeIndex = 0; // 默认classic主题 | Default to classic theme
      }

      // 在预览模式下禁用缓存，确保每个场景都能正确渲染
      this.generator = new StatuslineGenerator(this.currentConfig, { disableCache: true });
    } catch (error) {
      console.error('Failed to initialize preview engine:', error);
      throw error;
    }
  }

  /**
   * 异步初始化 - 私有方法，确保初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.generator || !this.currentConfig) {
      await this.initialize();
    }
  }

  /**
   * 启动实时预览模式
   */
  async startLivePreview(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Preview engine is already running');
    }

    await this.ensureInitialized();
    this.isRunning = true;

    // 设置键盘处理
    this.setupKeyboardHandling();

    // 清屏并初始化显示
    this.clearScreen();
    await this.renderLivePreview();

    // 开始实时更新循环
    this.intervalId = setInterval(async () => {
      if (!this.isRunning) {
        this.cleanup();
        return;
      }
      await this.renderLivePreview();
    }, this.options.refreshInterval);

    // 优雅处理退出
    this.sigintHandler = () => {
      this.isRunning = false;
      this.cleanup();
      console.log('\n👋 Preview stopped');
      process.exit(0);
    };
    process.on('SIGINT', this.sigintHandler);
  }

  /**
   * 停止实时预览
   */
  stopLivePreview(): void {
    this.isRunning = false;
    this.cleanup();

    // 清屏并显示退出消息
    console.clear();
    console.log('\n👋 实时预览已停止 - Live Preview stopped');

    // 退出进程
    process.exit(0);
  }

  /**
   * 清理资源，防止内存泄漏
   */
  private cleanup(): void {
    // 清理定时器
    if (this.intervalId) {
      clearInterval(this.intervalId);
      delete this.intervalId;
    }

    // 清理事件监听器
    if (this.sigintHandler) {
      process.removeListener('SIGINT', this.sigintHandler);
      delete this.sigintHandler;
    }

    if (this.keyHandler) {
      process.stdin.removeListener('data', this.keyHandler);
      delete this.keyHandler;
    }

    // 恢复终端状态
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }
  }

  /**
   * 渲染实时预览界面
   */
  private async renderLivePreview(): Promise<void> {
    const capabilities = this.terminalDetector.detectCapabilities();
    const scenarios = this.getSelectedScenarios();

    // 移动光标到顶部
    process.stdout.write('\x1b[H');

    // 渲染标题栏
    this.renderHeader(capabilities);

    // 渲染动态Banner
    if (this.options.dynamicBanner) {
      await this.renderDynamicBanner();
    }

    // 渲染配置信息
    this.renderConfigInfo();

    // 渲染场景预览
    await this.renderScenariosPreview(scenarios, capabilities);

    // 渲染快捷键提示
    this.renderShortcutsHelp(capabilities);
  }

  /**
   * 渲染静态预览 - 用于preview子命令
   */
  async renderStaticPreview(scenarioIds: string[]): Promise<void> {
    await this.ensureInitialized();

    const capabilities = this.terminalDetector.detectCapabilities();
    console.log(this.formatTitle('Claude Code Statusline Pro - Static Preview', capabilities));
    console.log();

    for (const scenarioId of scenarioIds) {
      try {
        const result = await this.renderScenario(scenarioId);
        console.log(this.formatScenarioOutput(result, capabilities));
      } catch (error) {
        console.error(`Error rendering scenario ${scenarioId}:`, error);
      }
    }
  }

  /**
   * 更新配置并刷新预览
   */
  async updateConfig(changes: Partial<Config>): Promise<void> {
    try {
      // 合并配置变更
      this.currentConfig = { ...this.currentConfig, ...changes };

      // 重新创建生成器，保持缓存禁用
      this.generator = new StatuslineGenerator(this.currentConfig, { disableCache: true });

      // 立即刷新预览
      if (this.isRunning) {
        await this.renderLivePreview();
      }
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  }

  /**
   * 获取要预览的场景列表
   */
  private getSelectedScenarios(): MockScenario[] {
    const allScenarios = this.mockGenerator.getAllScenarios();
    return allScenarios.slice(0, this.options.maxScenarios);
  }

  /**
   * 渲染单个场景
   */
  private async renderScenario(scenarioId: string): Promise<RenderResult> {
    const startTime = Date.now();

    try {
      const inputData = this.mockGenerator.generate(scenarioId);
      const output = await this.generator.generate(inputData);

      return {
        scenarioId,
        output,
        renderTime: Date.now() - startTime,
        hasError: false,
      };
    } catch (error) {
      return {
        scenarioId,
        output: '',
        renderTime: Date.now() - startTime,
        hasError: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 渲染标题栏
   */
  private renderHeader(capabilities: TerminalCapabilities): void {
    const title = this.formatTitle('Claude Code Statusline Pro v2.0.0', capabilities);
    const subtitle = capabilities.colors
      ? '\x1b[36m📊 实时预览模式 - Live Preview\x1b[0m'
      : '📊 实时预览模式 - Live Preview';

    console.log(title);
    console.log(subtitle);
    console.log(this.formatSeparator(capabilities));
    console.log();
  }

  /**
   * 渲染动态Banner
   */
  private async renderDynamicBanner(): Promise<void> {
    // 模拟动态状态更新
    const timestamp = new Date().toLocaleTimeString();
    const uptime = process.uptime().toFixed(1);

    console.log(`⏰ 更新时间: ${timestamp}  📈 运行时间: ${uptime}s`);
    console.log();
  }

  /**
   * 渲染配置信息
   */
  private renderConfigInfo(): void {
    const configSource = this.configLoader.getConfigSource() || 'default';
    const currentTheme = this.themeManager
      ? this.themeManager.getCurrentTheme()
      : this.currentConfig.theme || 'default';
    const capabilities = this.terminalDetector.detectCapabilities();

    // 检查主题兼容性 | Check theme compatibility
    let themeStatus = currentTheme;
    if (this.themeManager) {
      const compatibility = this.themeManager.checkThemeCompatibility(currentTheme, capabilities);
      if (!compatibility.compatible) {
        themeStatus = capabilities.colors
          ? `\x1b[33m${currentTheme} (兼容性警告)\x1b[0m`
          : `${currentTheme} (兼容性警告)`;
      } else if (capabilities.colors) {
        themeStatus = `\x1b[32m${currentTheme}\x1b[0m`;
      }
    }

    console.log(`📝 配置源: ${configSource}`);
    console.log(`🎨 当前主题: ${themeStatus}`);
    console.log(`🔧 组件预设: ${this.currentConfig.preset || 'PMBTS'}`);

    // 显示最近的主题切换消息 | Show recent theme switch message
    if (this.lastThemeMessage) {
      console.log(this.lastThemeMessage);
    }

    console.log();
  }

  /**
   * 渲染场景预览
   */
  private async renderScenariosPreview(
    scenarios: MockScenario[],
    capabilities: TerminalCapabilities
  ): Promise<void> {
    for (const scenario of scenarios) {
      const result = await this.renderScenario(scenario.id);
      console.log(this.formatScenarioOutput(result, capabilities, scenario));
      console.log();
    }
  }

  /**
   * 渲染快捷键帮助
   */
  private renderShortcutsHelp(capabilities: TerminalCapabilities): void {
    const themeList = this.availableThemes.join(' → ');
    const helpText = capabilities.colors
      ? `\x1b[90m快捷键: [c] 配置  [t] 主题切换(${themeList})  [p] 预设  [r] 刷新  [q] 退出\x1b[0m`
      : `快捷键: [c] 配置  [t] 主题切换(${themeList})  [p] 预设  [r] 刷新  [q] 退出`;

    console.log(this.formatSeparator(capabilities));
    console.log(helpText);
  }

  /**
   * 获取不包含ANSI代码的可见文本长度
   */
  private getVisibleLength(text: string): number {
    // 移除ANSI转义序列
    return text.replace(ANSI_ESCAPE_REGEX, '').length;
  }

  /**
   * 对包含ANSI代码的文本进行可视化padding
   */
  private padEndVisible(text: string, targetLength: number): string {
    const visibleLength = this.getVisibleLength(text);
    const paddingNeeded = Math.max(0, targetLength - visibleLength);
    return text + ' '.repeat(paddingNeeded);
  }

  /**
   * 获取终端宽度
   */
  private getTerminalWidth(): number {
    return process.stdout.columns || parseInt(process.env.COLUMNS || '80', 10) || 80;
  }

  /**
   * 格式化场景输出
   */
  private formatScenarioOutput(
    result: RenderResult,
    capabilities: TerminalCapabilities,
    scenario?: MockScenario
  ): string {
    const scenarioInfo = scenario ? ` - ${scenario.name}` : '';
    const performanceInfo = this.options.debug ? ` (${result.renderTime}ms)` : '';

    // 获取终端宽度并预留边距
    const terminalWidth = this.getTerminalWidth();
    const maxBoxWidth = terminalWidth - 2; // 预留2字符边距

    // 计算header和content的可见长度
    const headerText = `场景: ${result.scenarioId}${scenarioInfo}${performanceInfo}`;
    const headerVisibleLength = this.getVisibleLength(headerText);

    const contentText = result.hasError
      ? capabilities.colors
        ? `❌ 错误: ${result.error}`
        : `❌ 错误: ${result.error}`
      : result.output;
    const contentVisibleLength = this.getVisibleLength(contentText);

    // 根据内容确定框线宽度，但不超过终端宽度
    const idealBoxWidth = Math.max(
      headerVisibleLength + 8, // header + "┌─ " + " ─┐"
      contentVisibleLength + 4 // content + "│ " + " │"
    );
    const boxWidth = Math.min(idealBoxWidth, maxBoxWidth);

    // 生成顶部框线
    const topBorderLength = boxWidth - headerVisibleLength - 4; // 减去 "┌─ " + " "
    const topBorder = '─'.repeat(Math.max(1, topBorderLength));

    let output = `┌─ ${headerText} ${topBorder}┐\n`;

    // 生成内容行 - 如果内容过长则截断
    const maxContentWidth = boxWidth - 4; // 减去 "│ " + " │"

    if (result.hasError) {
      const errorMsg = capabilities.colors
        ? `\x1b[31m❌ 错误: ${result.error}\x1b[0m`
        : `❌ 错误: ${result.error}`;

      let displayMsg = errorMsg;
      if (this.getVisibleLength(errorMsg) > maxContentWidth) {
        // 截断过长的错误消息
        const visibleError = errorMsg.replace(ANSI_ESCAPE_REGEX, '');
        const truncatedError = `${visibleError.substring(0, maxContentWidth - 3)}...`;
        displayMsg = capabilities.colors ? `\x1b[31m${truncatedError}\x1b[0m` : truncatedError;
      }

      output += `│ ${this.padEndVisible(displayMsg, maxContentWidth)} │\n`;
    } else {
      let displayOutput = result.output;
      if (this.getVisibleLength(displayOutput) > maxContentWidth) {
        // 截断过长的内容，但保持ANSI代码完整性
        const truncatedOutput = `${this.truncateWithAnsi(displayOutput, maxContentWidth - 3)}...`;
        displayOutput = truncatedOutput;
      }

      output += `│ ${this.padEndVisible(displayOutput, maxContentWidth)} │\n`;
    }

    // 生成底部框线
    const bottomBorder = '─'.repeat(boxWidth - 2); // 减去 "└" + "┘"
    output += `└${bottomBorder}┘`;

    return output;
  }

  /**
   * 安全截断包含ANSI代码的文本
   */
  private truncateWithAnsi(text: string, maxLength: number): string {
    let visibleLength = 0;
    let result = '';
    let i = 0;

    while (i < text.length && visibleLength < maxLength) {
      if (text[i] === '\x1b' && text[i + 1] === '[') {
        // 遇到ANSI转义序列，找到结束位置
        const ansiStart = i;
        i += 2;
        while (i < text.length && !/[a-zA-Z]/.test(text[i] || '')) {
          i++;
        }
        if (i < text.length) i++; // 包含结束字母
        result += text.substring(ansiStart, i);
      } else {
        // 普通字符
        result += text[i];
        visibleLength++;
        i++;
      }
    }

    return result;
  }

  /**
   * 格式化标题
   */
  private formatTitle(title: string, capabilities: TerminalCapabilities): string {
    if (capabilities.colors) {
      return `\x1b[1;36m${title}\x1b[0m`;
    }
    return title;
  }

  /**
   * 格式化分隔线
   */
  private formatSeparator(capabilities: TerminalCapabilities): string {
    const line = '─'.repeat(70);
    if (capabilities.colors) {
      return `\x1b[90m${line}\x1b[0m`;
    }
    return line;
  }

  /**
   * 清屏
   */
  private clearScreen(): void {
    // 清屏并移动光标到顶部
    process.stdout.write('\x1b[2J\x1b[H');
  }

  /**
   * 处理键盘输入 (用于交互式模式)
   */
  private setupKeyboardHandling(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      this.keyHandler = (key: string) => {
        switch (key) {
          case 'c':
            // 打开配置编辑器
            break;
          case 't':
            // 切换主题 | Switch theme
            this.switchToNextTheme();
            break;
          case 'p':
            // 切换预设
            break;
          case 'r':
            // 刷新
            this.renderLivePreview();
            break;
          case 'q':
          case '\u0003': // Ctrl+C
            this.stopLivePreview();
            break;
        }
      };

      process.stdin.on('data', this.keyHandler);
    }
  }

  /**
   * 获取当前配置
   */
  getCurrentConfig(): Config {
    return this.currentConfig;
  }

  /**
   * 获取可用场景列表
   */
  getAvailableScenarios(): string[] {
    return this.mockGenerator.getAvailableScenarios();
  }

  /**
   * 切换到下一个主题 | Switch to next theme
   * 循环切换：classic -> powerline -> capsule -> classic
   * Cycle through: classic -> powerline -> capsule -> classic
   */
  private async switchToNextTheme(): Promise<void> {
    if (!this.themeManager) {
      console.warn('主题管理器未初始化 | Theme manager not initialized');
      return;
    }

    // 循环到下一个主题 | Cycle to next theme
    this.currentThemeIndex = (this.currentThemeIndex + 1) % this.availableThemes.length;
    const newTheme = this.availableThemes[this.currentThemeIndex];

    // 安全检查：确保主题名称存在 | Safety check: ensure theme name exists
    if (!newTheme) {
      console.error('主题切换失败：无效的主题索引 | Theme switch failed: invalid theme index');
      return;
    }

    // 检查终端兼容性 | Check terminal compatibility
    const capabilities = this.terminalDetector.detectCapabilities();
    const compatibility = this.themeManager.checkThemeCompatibility(newTheme, capabilities);

    try {
      // 应用主题 | Apply theme
      const result = this.themeManager.switchTheme(newTheme);

      if (result.success) {
        // 更新配置和生成器 | Update config and generator
        this.currentConfig = result.config;
        this.generator = new StatuslineGenerator(this.currentConfig, { disableCache: true });

        // 生成状态消息 | Generate status message
        this.lastThemeMessage = this.generateThemeMessage(newTheme, compatibility, capabilities);

        // 立即刷新预览 | Immediately refresh preview
        if (this.isRunning) {
          await this.renderLivePreview();
        }
      } else {
        // 切换失败，回退到安全主题 | Switch failed, fallback to safe theme
        this.handleThemeSwitchFailure(newTheme);
      }
    } catch (error) {
      console.error(`主题切换失败 | Theme switch failed:`, error);
      this.handleThemeSwitchFailure(newTheme);
    }
  }

  /**
   * 生成主题切换消息 | Generate theme switch message
   */
  private generateThemeMessage(
    themeName: string,
    compatibility: ThemeCompatibilityResult,
    capabilities: TerminalCapabilities
  ): string {
    const themeFeatures = this.getThemeFeatures(themeName);

    if (!compatibility.compatible) {
      const warning = capabilities.colors
        ? `⚠️  \\x1b[33m主题 '${themeName}' 需要额外支持，效果可能受限\\x1b[0m`
        : `⚠️  主题 '${themeName}' 需要额外支持，效果可能受限`;

      const notes = compatibility.notes.length > 0 ? ` (${compatibility.notes[0]})` : '';

      return `${warning}${notes}`;
    } else {
      const success = capabilities.colors
        ? `✅ \\x1b[32m已切换到 '${themeName}' 主题\\x1b[0m`
        : `✅ 已切换到 '${themeName}' 主题`;

      return `${success} ${themeFeatures}`;
    }
  }

  /**
   * 获取主题特性说明 | Get theme features description
   */
  private getThemeFeatures(themeName: string): string {
    const features: Record<string, string> = {
      classic: '(经典样式 | Classic style)',
      powerline: '(渐变+精细进度条 | Gradient + Fine progress)',
      capsule: '(胶囊样式+全特效 | Capsule style + All effects)',
    };

    return features[themeName] || '';
  }

  /**
   * 处理主题切换失败 | Handle theme switch failure
   */
  private handleThemeSwitchFailure(failedTheme: string): void {
    // 回退到classic主题 | Fallback to classic theme
    this.currentThemeIndex = 0;
    const safeTheme = this.availableThemes[0] || 'classic'; // classic

    try {
      const result = this.themeManager.switchTheme(safeTheme);
      if (result.success) {
        this.currentConfig = result.config;
        this.generator = new StatuslineGenerator(this.currentConfig, { disableCache: true });
        this.lastThemeMessage = `❌ 主题 '${failedTheme}' 切换失败，已回退到 '${safeTheme}' | Theme '${failedTheme}' switch failed, fallen back to '${safeTheme}'`;
      }
    } catch (error) {
      console.error('主题回退也失败了 | Theme fallback also failed:', error);
      this.lastThemeMessage = '❌ 主题系统错误 | Theme system error';
    }
  }
}

/**
 * 工厂函数 - 创建预览引擎实例
 */
export function createLivePreviewEngine(options?: LivePreviewOptions): LivePreviewEngine {
  return new LivePreviewEngine(options);
}
