/**
 * 实时预览选择器组件 - RealTime Preview Selector
 * 基于inquirer构建的交互式选择器，支持键盘导航时实时触发预览更新
 *
 * 特性:
 * - 实时预览更新 (<100ms 响应)
 * - 键盘上下导航支持
 * - 异步预览回调接口
 * - 兼容现有select接口
 * - 主题选择和语言选择的便捷工厂函数
 */

import {
  createPrompt,
  useState,
  useKeypress,
  useEffect,
  isUpKey,
  isDownKey,
  isEnterKey,
  isSpaceKey,
} from '@inquirer/core';
// 移除chalk依赖，使用ANSI转义序列代替
// import chalk from 'chalk';

/**
 * 选择器选项接口
 */
export interface Choice {
  /** 显示名称 */
  name: string;
  /** 选项值 */
  value: string;
  /** 选项描述 */
  description?: string;
  /** 是否禁用 */
  disabled?: boolean | string;
  /** 选项分类 */
  category?: string;
}

/**
 * 预览回调函数类型
 */
export type PreviewCallback = (choice: Choice, index: number) => Promise<void> | void;

/**
 * 实时预览选择器配置
 */
export interface RealTimePreviewSelectorConfig {
  /** 提示消息 */
  message: string;
  /** 选择项列表 */
  choices: Choice[];
  /** 默认选中索引 */
  default?: number;
  /** 实时预览回调 */
  onPreview?: PreviewCallback;
  /** 预览延迟(毫秒) */
  previewDelay?: number;
  /** 是否显示描述 */
  showDescription?: boolean;
  /** 是否显示分类 */
  showCategory?: boolean;
  /** 页面大小 */
  pageSize?: number;
}

/**
 * 组件状态接口
 */
interface State {
  /** 当前选中索引 */
  selectedIndex: number;
  /** 当前页面开始索引 */
  pageStart: number;
  /** 是否正在预览 */
  isPreviewing: boolean;
  /** 错误消息 */
  error?: string;
}

/**
 * 创建实时预览选择器
 */
export const realTimePreviewSelector = createPrompt<string, RealTimePreviewSelectorConfig>(
  (config, done) => {
    const {
      message,
      choices,
      default: defaultIndex = 0,
      onPreview,
      previewDelay = 50,
      showDescription = true,
      showCategory = false,
      pageSize = 7,
    } = config;

    // 过滤有效选项
    const validChoices = choices.filter((choice) => !choice.disabled);
    const initialIndex = Math.max(0, Math.min(defaultIndex, validChoices.length - 1));

    // 状态管理
    const [selectedIndex, setSelectedIndex] = useState(initialIndex);
    const [pageStart, setPageStart] = useState(Math.max(0, Math.floor(initialIndex / pageSize) * pageSize));
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);

    // 预览定时器
    let previewTimer: NodeJS.Timeout | null = null;

    /**
     * 执行预览回调
     */
    const triggerPreview = async (choice: Choice, index: number) => {
      if (!onPreview) return;

      setIsPreviewing(true);
      setError(undefined);

      try {
        await onPreview(choice, index);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsPreviewing(false);
      }
    };

    /**
     * 延迟触发预览
     */
    const schedulePreview = (choice: Choice, index: number) => {
      if (previewTimer) {
        clearTimeout(previewTimer);
      }

      previewTimer = setTimeout(() => {
        triggerPreview(choice, index);
      }, previewDelay);
    };

    /**
     * 更新选中索引
     */
    const updateSelectedIndex = (newIndex: number) => {
      const clampedIndex = Math.max(0, Math.min(newIndex, validChoices.length - 1));
      const newPageStart = Math.floor(clampedIndex / pageSize) * pageSize;

      setSelectedIndex(clampedIndex);
      setPageStart(newPageStart);

      // 触发预览
      const selectedChoice = validChoices[clampedIndex];
      if (selectedChoice) {
        schedulePreview(selectedChoice, clampedIndex);
      }
    };

    // 键盘事件处理
    useKeypress((key, rl) => {
      if (isUpKey(key)) {
        updateSelectedIndex(selectedIndex - 1);
      } else if (isDownKey(key)) {
        updateSelectedIndex(selectedIndex + 1);
      } else if (isEnterKey(key) || isSpaceKey(key)) {
        const selectedChoice = validChoices[selectedIndex];
        if (selectedChoice) {
          // 清理定时器
          if (previewTimer) {
            clearTimeout(previewTimer);
            previewTimer = null;
          }
          done(selectedChoice.value);
        }
      }
    });

    // 初始预览
    useEffect(() => {
      const initialChoice = validChoices[selectedIndex];
      if (initialChoice && onPreview) {
        schedulePreview(initialChoice, selectedIndex);
      }

      // 清理函数
      return () => {
        if (previewTimer) {
          clearTimeout(previewTimer);
        }
      };
    }, []);

    /**
     * 渲染选项行
     */
    const renderChoice = (choice: Choice, index: number, isSelected: boolean) => {
      const originalIndex = choices.indexOf(choice);
      const isDisabled = choice.disabled;
      
      let line = '';

      // 选择指示器
      if (isSelected) {
        line += '\x1b[36m❯ \x1b[0m';
      } else {
        line += '  ';
      }

      // 选项名称
      if (isDisabled) {
        const disabledText = typeof choice.disabled === 'string' ? choice.disabled : choice.name;
        line += `\x1b[90m${disabledText} (disabled)\x1b[0m`;
      } else if (isSelected) {
        line += `\x1b[36;1m${choice.name}\x1b[0m`;
      } else {
        line += choice.name;
      }

      // 分类标签
      if (showCategory && choice.category) {
        line += `\x1b[90m [${choice.category}]\x1b[0m`;
      }

      // 描述
      if (showDescription && choice.description && !isDisabled) {
        line += `\n    \x1b[90m${choice.description}\x1b[0m`;
      }

      return line;
    };

    /**
     * 渲染页面
     */
    const renderPage = () => {
      
      // 计算当前页面的选项
      const pageEnd = Math.min(pageStart + pageSize, validChoices.length);
      const pageChoices = validChoices.slice(pageStart, pageEnd);

      let output = `\x1b[1m${message}\x1b[0m\n`;

      // 状态指示器
      if (isPreviewing) {
        output += '\x1b[33m⏳ 正在预览...\x1b[0m\n';
      } else if (error) {
        output += `\x1b[31m❌ 预览错误: ${error}\x1b[0m\n`;
      } else {
        output += '\x1b[32m✅ 预览就绪\x1b[0m\n';
      }

      output += '\n';

      // 渲染选项
      pageChoices.forEach((choice, pageIndex) => {
        const globalIndex = pageStart + pageIndex;
        const isSelected = globalIndex === selectedIndex;
        output += renderChoice(choice, globalIndex, isSelected) + '\n';
      });

      // 分页指示器
      if (validChoices.length > pageSize) {
        const currentPage = Math.floor(selectedIndex / pageSize) + 1;
        const totalPages = Math.ceil(validChoices.length / pageSize);
        output += `\n\x1b[90m第 ${currentPage}/${totalPages} 页 | ↑↓ 导航 | Enter 选择\x1b[0m`;
      } else {
        output += '\n\x1b[90m↑↓ 导航 | Enter 选择\x1b[0m';
      }

      return output;
    };

    return renderPage();
  }
);

/**
 * 主题选择器工厂函数
 */
export const createThemeSelector = (
  onPreview?: PreviewCallback
): ((message?: string) => Promise<string>) => {
  return async (message = '选择主题：') => {
    const choices: Choice[] = [
      {
        name: 'Classic主题',
        value: 'classic',
        description: '传统分隔符连接，最大兼容性',
        category: '经典',
      },
      {
        name: 'Powerline主题',
        value: 'powerline',
        description: '箭头无缝连接，需要Nerd Font',
        category: '现代',
      },
      {
        name: 'Capsule主题',
        value: 'capsule',
        description: '胶囊形状包装，现代化UI，需要Nerd Font',
        category: '现代',
      },
    ];

    const config: RealTimePreviewSelectorConfig = {
      message,
      choices,
      showDescription: true,
      showCategory: true,
      previewDelay: 100,
    };

    if (onPreview) {
      config.onPreview = onPreview;
    }

    return realTimePreviewSelector(config);
  };
};

/**
 * 语言选择器工厂函数
 */
export const createLanguageSelector = (
  onPreview?: PreviewCallback
): ((message?: string) => Promise<string>) => {
  return async (message = '选择语言：') => {
    const choices: Choice[] = [
      {
        name: '中文',
        value: 'zh-CN',
        description: '简体中文界面',
        category: '亚洲',
      },
      {
        name: 'English',
        value: 'en',
        description: 'English interface',
        category: 'Western',
      },
      {
        name: '日本語',
        value: 'ja',
        description: '日本語インターフェース',
        category: '亚洲',
      },
    ];

    const config: RealTimePreviewSelectorConfig = {
      message,
      choices,
      showDescription: true,
      showCategory: true,
      previewDelay: 150,
    };

    if (onPreview) {
      config.onPreview = onPreview;
    }

    return realTimePreviewSelector(config);
  };
};

/**
 * 通用选择器便捷函数
 */
export const createSelector = (config: RealTimePreviewSelectorConfig) => {
  return () => realTimePreviewSelector(config);
};

/**
 * 兼容现有select接口的包装器
 */
export const select = realTimePreviewSelector;

// 类型导出在文件顶部已定义，这里不需要重复导出