import type { ComponentConfig, ExtendedRenderContext, RenderContext } from '../config/schema.js';
import { BaseComponent, type ComponentFactory } from './base.js';

/**
 * 假组件类 | Fake Component class
 * 专门用于解决第一个Nerd Font图标显示变暗的兼容性问题
 * Used specifically to fix the compatibility issue of the first Nerd Font icon appearing dimmed
 */
export class FakeComponent extends BaseComponent {
  constructor(config: ComponentConfig) {
    super('fake', config);
  }

  /**
   * 渲染假组件内容 - 只显示一个透明或不可见的Nerd Font图标
   * Render fake component content - only shows a transparent or invisible Nerd Font icon
   */
  protected renderContent(context: RenderContext | ExtendedRenderContext): string | null {
    // 如果没有Nerd Font支持，则不显示任何内容
    if (!this.capabilities.nerdFont) {
      return null;
    }

    // 获取当前主题
    const theme = context.config.theme || 'classic';

    // 根据不同主题返回不同的假字符
    if (theme === 'classic') {
      // Classic主题：返回一个隐身的字符，不参与主题渲染
      // 使用Unicode私有使用区域的不可见字符
      const fakeIcon = '\uEC03'; // Unicode私有使用区域起始字符，通常不可见
      const transparentColor = this.getColorCode('black') || '\x1b[30m';
      const resetColor = this.getResetColor();
      return `${transparentColor}${fakeIcon}${resetColor}`;
    } else {
      // Powerline和Capsule主题：返回带标记的字符，让主题渲染器识别并特殊处理
      // 添加黑色标记让主题渲染器能识别这是fake组件
      const fakeIcon = '\uEC03'; // 使用同样的不可见私有字符
      const blackColor = '\x1b[30m';
      const resetColor = '\x1b[0m';
      return `${blackColor}${fakeIcon}${resetColor}`;
    }
  }
}

/**
 * 假组件工厂 | Fake Component Factory
 */
export class FakeComponentFactory implements ComponentFactory {
  createComponent(_name: string, config: ComponentConfig): FakeComponent {
    return new FakeComponent(config);
  }

  getSupportedTypes(): string[] {
    return ['fake'];
  }
}
