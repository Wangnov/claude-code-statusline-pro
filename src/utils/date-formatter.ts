/**
 * Day.js 日期格式化工具模块
 * 遵循Linus精神：简洁、高效、功能强大
 *
 * 设计原则：
 * - 只输出数字和基本组合，文案由模板控制
 * - 支持所有常见时间格式输入
 * - 遵循业界标准：M=月份，m=分钟
 */

import dayjs from 'dayjs';

/**
 * 通用日期解析器 - 支持时间戳、ISO格式、各种字符串格式
 */
export function parseDate(input: any): dayjs.Dayjs | null {
  try {
    // 处理数字时间戳
    if (typeof input === 'number') {
      // 智能判断秒/毫秒时间戳
      if (input >= 1e12) {
        // 13位及以上，当作毫秒
        return dayjs(input);
      } else if (input >= 1e9) {
        // 10-12位，当作秒
        return dayjs(input * 1000);
      } else {
        // 9位以下，当作秒处理
        return dayjs(input * 1000);
      }
    }

    // 处理字符串
    if (typeof input === 'string') {
      // 纯数字字符串 - 智能判断秒/毫秒时间戳
      if (/^\d+$/.test(input.trim())) {
        const num = parseInt(input.trim(), 10);
        // 更精确的判断：13位数字为毫秒时间戳，10位为秒时间戳
        // 毫秒时间戳范围大约：1000000000000 - 9999999999999 (13位)
        // 秒时间戳范围大约：1000000000 - 9999999999 (10位)
        if (num >= 1e12) {
          // 13位及以上，当作毫秒
          return dayjs(num);
        } else if (num >= 1e9) {
          // 10-12位，当作秒
          return dayjs(num * 1000);
        } else {
          // 9位以下，可能是相对时间戳，当作秒处理
          return dayjs(num * 1000);
        }
      }

      // 其他字符串格式交给Day.js自动识别
      const parsed = dayjs(input.trim());
      return parsed.isValid() ? parsed : null;
    }

    // 处理Date对象
    if (input instanceof Date) {
      return dayjs(input);
    }

    return null;
  } catch (error) {
    console.warn('日期解析失败:', input, error);
    return null;
  }
}

/**
 * 时间差格式化 - 遵循业界标准，只输出数字和基本组合
 *
 * @param diffMs 时间差（毫秒）
 * @param format 格式化选项
 * @returns 格式化后的字符串
 */
export function formatTimeDifference(diffMs: number, format: string): string {
  if (typeof diffMs !== 'number' || Number.isNaN(diffMs)) {
    return '{时间计算失败}';
  }

  // 原生JavaScript计算时间差
  const absMs = Math.abs(diffMs);
  const sign = diffMs < 0 ? -1 : 1;

  // 时间单位常量（毫秒）
  const SECOND_MS = 1000;
  const MINUTE_MS = 60 * SECOND_MS;
  const HOUR_MS = 60 * MINUTE_MS;
  const DAY_MS = 24 * HOUR_MS;
  const MONTH_MS = 30 * DAY_MS; // 近似值
  const YEAR_MS = 365 * DAY_MS; // 近似值

  // 计算各个单位的值
  const years = Math.floor(absMs / YEAR_MS);
  const months = Math.floor(absMs / MONTH_MS);
  const days = Math.floor(absMs / DAY_MS);
  const hours = Math.floor(absMs / HOUR_MS);
  const minutes = Math.floor(absMs / MINUTE_MS);
  const _seconds = Math.floor(absMs / SECOND_MS);

  // 计算组合格式需要的余数
  const remainingAfterDays = absMs % DAY_MS;
  const hoursInDay = Math.floor(remainingAfterDays / HOUR_MS);
  const remainingAfterHours = remainingAfterDays % HOUR_MS;
  const minutesInHour = Math.floor(remainingAfterHours / MINUTE_MS);
  const remainingAfterMinutes = remainingAfterHours % MINUTE_MS;
  const secondsInMinute = Math.floor(remainingAfterMinutes / SECOND_MS);

  switch (format) {
    // === 单个单位输出（业界标准命名）===
    case 'Y':
    case 'years':
      return String(years * sign);

    case 'M': // 月份 (Month) - 大写
    case 'months':
      return String(months * sign);

    case 'D':
    case 'days':
      return String(Math.ceil(absMs / DAY_MS) * sign);

    case 'H':
    case 'hours':
      return String(Math.ceil(absMs / HOUR_MS) * sign);

    case 'm': // 分钟 (minute) - 小写！
    case 'minutes':
      return String(Math.ceil(absMs / MINUTE_MS) * sign);

    case 'S':
    case 'seconds':
      return String(Math.ceil(absMs / SECOND_MS) * sign);

    // === 组合格式输出 ===
    case 'YMD': {
      const monthsInYear = months % 12;
      const daysAfterMonths = days - months * 30; // 近似计算
      const signPrefix = sign < 0 ? '-' : '';
      return `${signPrefix}${years}年${monthsInYear}月${Math.max(0, daysAfterMonths)}天`;
    }

    case 'DHm': {
      // 天-小时-分钟
      const dhmPrefix = sign < 0 ? '-' : '';
      return `${dhmPrefix}${days}天${hoursInDay}小时${minutesInHour}分钟`;
    }

    case 'HmS': {
      // 小时-分钟-秒
      const hmsPrefix = sign < 0 ? '-' : '';
      return `${hmsPrefix}${hours}小时${minutesInHour}分钟${secondsInMinute}秒`;
    }

    case 'mS': {
      // 分钟-秒
      const msPrefix = sign < 0 ? '-' : '';
      return `${msPrefix}${minutes}分钟${secondsInMinute}秒`;
    }

    case 'Hm': {
      // 小时-分钟
      const hmPrefix = sign < 0 ? '-' : '';
      return `${hmPrefix}${hours}小时${minutesInHour}分钟`;
    }

    // === 向后兼容别名 ===
    case 'dhm': // 保持兼容
      return formatTimeDifference(diffMs, 'DHm');

    case 'hm':
      return formatTimeDifference(diffMs, 'Hm');

    default:
      console.warn(`未知的时间格式: ${format}`);
      return String(Math.ceil(absMs / DAY_MS) * sign);
  }
}

/**
 * 获取当前时间 - 用于now()函数
 */
export function now(): dayjs.Dayjs {
  return dayjs();
}

/**
 * 计算两个日期之间的时间差（毫秒）
 *
 * @param startDate 开始时间
 * @param endDate 结束时间
 * @returns 时间差（毫秒），如果解析失败返回null
 */
export function calculateTimeDifference(startDate: any, endDate: any): number | null {
  let start: dayjs.Dayjs | null;
  let end: dayjs.Dayjs | null;

  // 检查是否已经是Day.js对象
  if (startDate && typeof startDate === 'object' && '$isDayjsObject' in startDate) {
    start = startDate;
  } else {
    start = parseDate(startDate);
  }

  if (endDate && typeof endDate === 'object' && '$isDayjsObject' in endDate) {
    end = endDate;
  } else {
    end = parseDate(endDate);
  }

  if (!start || !end) {
    console.warn('时间差计算失败 - 日期解析错误:', { startDate, endDate });
    return null;
  }

  return end.valueOf() - start.valueOf();
}

/**
 * 检查是否为时间格式标识符
 */
export function isTimeFormat(format: string): boolean {
  const timeFormats = [
    // 单个单位
    'Y',
    'years',
    'M',
    'months',
    'D',
    'days',
    'H',
    'hours',
    'm',
    'minutes',
    'S',
    'seconds',
    // 组合格式
    'YMD',
    'DHm',
    'HmS',
    'mS',
    'Hm',
    // 向后兼容
    'dhm',
    'hm',
  ];

  return timeFormats.includes(format);
}
