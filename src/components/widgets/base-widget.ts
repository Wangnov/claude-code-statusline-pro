/**
 * 小组件基类 | Widget base class
 * 提供统一的小组件接口和通用功能 | Provides unified widget interface and common functionality
 *
 * 遵循Linus精神：接口清晰、职责单一、错误处理明确
 */

import type { WidgetConfig } from '../../config/schema.js';
import type { TerminalCapabilities } from '../../terminal/detector.js';
import {
  calculateTimeDifference,
  formatTimeDifference,
  isTimeFormat,
  now,
  parseDate,
} from '../../utils/date-formatter.js';

/**
 * 小组件渲染结果 | Widget render result
 */
export interface WidgetRenderResult {
  /** 是否成功渲染 | Whether rendering succeeded */
  success: boolean;
  /** 渲染内容 | Rendered content */
  content: string | null;
  /** 错误信息 | Error message */
  error?: string;
}

/**
 * 小组件基类 | Widget base class
 */
export abstract class BaseWidget {
  protected config: WidgetConfig;
  protected capabilities: TerminalCapabilities;

  constructor(config: WidgetConfig, capabilities: TerminalCapabilities) {
    this.config = config;
    this.capabilities = capabilities;
  }

  /**
   * 渲染小组件 | Render widget
   */
  async render(context?: any): Promise<WidgetRenderResult> {
    try {
      // 检查是否启用 | Check if enabled
      if (!this.config.enabled) {
        return {
          success: true,
          content: null,
        };
      }

      // 优先级1：检查 force 字段
      if (this.config.force === true) {
        // 强制启用，继续执行
      } else if (this.config.force === false) {
        // 强制禁用
        return {
          success: true,
          content: null,
        };
      } else if (this.config.detection) {
        // 优先级2：检查 detection 规则
        const shouldEnable = this.evaluateDetection(this.config.detection);
        if (!shouldEnable) {
          return {
            success: true,
            content: null,
          };
        }
      }

      // 渲染内容 | Render content
      const content = await this.renderContent(context);

      // 组合图标和内容 | Combine icon and content
      if (content) {
        const icon = this.selectIcon();
        const final = icon ? `${icon} ${content}` : content;

        return {
          success: true,
          content: final,
        };
      }

      return {
        success: true,
        content: null,
      };
    } catch (error) {
      return {
        success: false,
        content: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 渲染内容 - 子类必须实现 | Render content - subclasses must implement
   */
  protected abstract renderContent(context?: any): Promise<string | null>;

  /**
   * 三级图标选择逻辑 | Three-level icon selection logic
   * 优先级：nerd_icon → emoji_icon → text_icon
   */
  protected selectIcon(): string {
    // 1. 如果支持Nerd Font且有nerd_icon
    if (this.capabilities.nerdFont && this.config.nerd_icon) {
      return this.config.nerd_icon;
    }

    // 2. 如果支持emoji且有emoji_icon
    if (this.capabilities.emoji && this.config.emoji_icon) {
      return this.config.emoji_icon;
    }

    // 3. 回退到文本图标
    return this.config.text_icon || '';
  }

  /**
   * f-string模板渲染 | f-string template rendering
   */
  protected renderTemplate(template: string, data: any): string {
    if (!template || !data) {
      return template || '';
    }

    try {
      return template.replace(/{([^}]+)}/g, (_match, expr) => {
        return this.evaluateExpression(expr.trim(), data);
      });
    } catch (error) {
      console.warn('模板渲染失败:', error);
      return template;
    }
  }

  /**
   * 求值表达式 | Evaluate expression
   */
  private evaluateExpression(expr: string, data: any): string {
    try {
      // 支持格式化：{value:.2f}
      const formatMatch = expr.match(/^(.+):(.+)$/);
      if (formatMatch) {
        const mathExpr = formatMatch[1];
        const format = formatMatch[2];
        if (mathExpr && format) {
          const value = this.evaluateMathExpression(mathExpr, data);
          return this.applyFormat(value, format);
        }
      }

      // 尝试数学表达式
      if (this.isMathExpression(expr)) {
        const value = this.evaluateMathExpression(expr, data);
        return String(value ?? '');
      }

      // 普通路径：{field} 或 {nested.field}
      const value = this.getValueFromPath(expr, data);
      return String(value ?? '');
    } catch (error) {
      console.warn(`表达式求值失败: ${expr}`, error);
      return `{${expr}}`;
    }
  }

  /**
   * 判断是否为数学表达式 | Check if it's a math expression
   */
  private isMathExpression(expr: string): boolean {
    // 包含数学运算符
    return /[+\-*/()\s]/.test(expr) && !/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(expr.trim());
  }

  /**
   * 求值数学表达式 | Evaluate math expression
   */
  private evaluateMathExpression(expr: string, data: any): number | undefined {
    try {
      // === 新增：检测时间差表达式 ===
      const timeDiffMatch = expr.match(/^(.+?)\s*-\s*(.+?)$/);
      if (timeDiffMatch?.[1] && timeDiffMatch[2]) {
        const left = timeDiffMatch[1];
        const right = timeDiffMatch[2];

        // 处理 now() 函数和字段值
        const leftValue =
          left.trim() === 'now()' ? now() : this.getValueFromPath(left.trim(), data);
        const rightValue =
          right.trim() === 'now()' ? now() : this.getValueFromPath(right.trim(), data);

        // 计算时间差
        const timeDiff = calculateTimeDifference(rightValue, leftValue); // 注意顺序：结果 = left - right
        if (timeDiff !== null) {
          return timeDiff; // 返回毫秒差值
        }
      }

      // === 原有：数学表达式处理 ===
      // 替换字段名为实际数值
      const processedExpr = expr.replace(/[a-zA-Z_][a-zA-Z0-9_.]*/g, (match) => {
        // 跳过now()函数
        if (match === 'now()') {
          return String(now().valueOf());
        }

        const value = this.getValueFromPath(match, data);
        if (typeof value === 'number') {
          return String(value);
        }

        // 尝试解析为日期并返回时间戳
        const dateValue = parseDate(value);
        if (dateValue) {
          return String(dateValue.valueOf());
        }

        // 如果不是数字，返回0避免错误
        return '0';
      });

      // 简单的数学表达式求值（只支持基本运算）
      // 出于安全考虑，不使用eval，进行简单解析
      return this.safeEvaluateMath(processedExpr);
    } catch (error) {
      console.warn(`数学表达式求值失败: ${expr}`, error);
      return undefined;
    }
  }

  /**
   * 安全的数学表达式求值 | Safe math expression evaluation
   */
  private safeEvaluateMath(expr: string): number | undefined {
    // 移除空格
    const cleanExpr = expr.replace(/\s/g, '');

    // 只允许数字、小数点、基本运算符和括号
    if (!/^[0-9+\-*/.()]+$/.test(cleanExpr)) {
      return undefined;
    }

    try {
      // 使用安全的表达式解析器替代 Function 构造函数
      return this.parseArithmeticExpression(cleanExpr);
    } catch (_error) {
      return undefined;
    }
  }

  /**
   * 安全解析算数表达式 | Safe arithmetic expression parser
   */
  private parseArithmeticExpression(expr: string): number | undefined {
    // 简单的递归下降解析器，仅支持基本算数运算
    let index = 0;

    const parseNumber = (): number => {
      const start = index;
      while (index < expr.length && /[0-9.]/.test(expr[index] ?? '')) {
        index++;
      }
      return parseFloat(expr.substring(start, index));
    };

    const parseFactor = (): number => {
      if (expr[index] === '(') {
        index++; // skip '('
        const result = parseExpression();
        index++; // skip ')'
        return result;
      }
      return parseNumber();
    };

    const parseTerm = (): number => {
      let result = parseFactor();
      while (index < expr.length && (expr[index] === '*' || expr[index] === '/')) {
        const op = expr[index++];
        const right = parseFactor();
        if (op === '*') {
          result *= right;
        } else {
          if (right === 0) throw new Error('Division by zero');
          result /= right;
        }
      }
      return result;
    };

    const parseExpression = (): number => {
      let result = parseTerm();
      while (index < expr.length && (expr[index] === '+' || expr[index] === '-')) {
        const op = expr[index++];
        const right = parseTerm();
        if (op === '+') {
          result += right;
        } else {
          result -= right;
        }
      }
      return result;
    };

    try {
      const result = parseExpression();
      return index === expr.length && typeof result === 'number' && !Number.isNaN(result)
        ? result
        : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 从路径获取值 | Get value from path
   */
  private getValueFromPath(path: string, data: any): any {
    if (!path || !data) return undefined;

    const keys = path.split('.');
    let current = data;

    for (const key of keys) {
      if (current == null) {
        return undefined;
      }

      // 如果当前值是字符串，尝试解析为JSON
      if (typeof current === 'string' && current.trim().startsWith('{')) {
        try {
          current = JSON.parse(current);
        } catch (_error) {
          // 解析失败，继续当作普通对象处理
        }
      }

      if (typeof current !== 'object') {
        return undefined;
      }

      current = current[key];
    }

    return current;
  }

  /**
   * 应用格式化 | Apply formatting
   */
  private applyFormat(value: any, format: string): string {
    if (value == null) return '';

    try {
      // === 新增：时间差格式化 ===
      if (isTimeFormat(format)) {
        const numValue = Number(value);
        if (Number.isNaN(numValue)) {
          return '{时间格式化失败}';
        }
        return formatTimeDifference(numValue, format);
      }

      // === 原有：数值格式化 ===
      // 数值格式化：.2f, .0f 等
      if (format.endsWith('f')) {
        const precisionMatch = format.match(/\.(\d+)f$/);
        if (precisionMatch?.[1]) {
          const precision = parseInt(precisionMatch[1], 10);
          return Number(value).toFixed(precision);
        }
        return Number(value).toFixed(2);
      }

      // 整数格式化：d
      if (format === 'd') {
        return Math.floor(Number(value)).toString();
      }

      // 默认转字符串
      return String(value);
    } catch (error) {
      console.warn(`格式化失败: ${format}`, error);
      return String(value);
    }
  }

  /**
   * 评估检测规则 | Evaluate detection rules
   */
  private evaluateDetection(detection: any): boolean {
    if (!detection || !detection.env) {
      return true; // 如果没有检测配置，默认启用
    }

    const envValue = process.env[detection.env];
    if (!envValue) {
      return false; // 环境变量不存在，不启用
    }

    // 精确匹配
    if (detection.equals) {
      return envValue === detection.equals;
    }

    // 包含匹配
    if (detection.contains) {
      return envValue.includes(detection.contains);
    }

    // 正则表达式匹配
    if (detection.pattern) {
      try {
        const regex = new RegExp(detection.pattern);
        return regex.test(envValue);
      } catch (error) {
        console.warn(`无效的正则表达式: ${detection.pattern}`, error);
        return false;
      }
    }

    // 如果没有指定匹配方式，默认启用
    return true;
  }
}
