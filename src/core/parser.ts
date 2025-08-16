import { type InputData, InputDataSchema } from '../config/schema.js';

/**
 * 解析结果接口 | Parse result interface
 */
export interface ParseResult {
  success: boolean;
  data?: InputData;
  error?: string;
}

/**
 * 从stdin读取输入 | Read input from stdin
 */
export async function readFromStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let input = '';
    let isCleanedUp = false;

    // 设置超时 | Set timeout
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Input timeout'));
    }, 5000);

    process.stdin.setEncoding('utf8');

    const onReadable = () => {
      let chunk: string | null;
      // 使用显式赋值避免表达式中的赋值
      chunk = process.stdin.read();
      while (chunk !== null) {
        input += chunk;
        chunk = process.stdin.read();
      }
    };

    const onEnd = () => {
      cleanup();
      resolve(input);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    // 清理函数，防止事件监听器泄漏
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;

      clearTimeout(timeout);
      process.stdin.removeListener('readable', onReadable);
      process.stdin.removeListener('end', onEnd);
      process.stdin.removeListener('error', onError);
    };

    process.stdin.on('readable', onReadable);
    process.stdin.on('end', onEnd);
    process.stdin.on('error', onError);
  });
}

/**
 * 创建默认输入数据 | Create default input data
 */
function createDefaultInputData(): InputData {
  return {
    hookEventName: 'Status',
    sessionId: null,
    transcriptPath: null,
    cwd: process.cwd(),
    model: {},
    workspace: {
      current_dir: process.cwd(),
      project_dir: process.cwd(),
    },
    gitBranch: null,
  };
}

/**
 * 解析JSON输入 | Parse JSON input
 */
export function parseJson(input: string): ParseResult {
  try {
    // 处理空输入 | Handle empty input
    if (!input.trim()) {
      return {
        success: true,
        data: createDefaultInputData(),
      };
    }

    // 解析JSON | Parse JSON
    const rawData = JSON.parse(input);

    // 使用Zod验证和转换数据 | Use Zod to validate and transform data
    const result = InputDataSchema.safeParse(rawData);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        error: `Input validation failed: ${result.error.message}`,
      };
    }
  } catch (error) {
    // JSON解析失败，尝试创建默认数据 | JSON parse failed, try to create default data
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: `Invalid JSON: ${error.message}`,
      };
    }

    return {
      success: false,
      error: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 解析输入并处理官方标准格式 | Parse input and handle official standard format
 */
export async function parseInput(): Promise<ParseResult> {
  try {
    const input = await readFromStdin();
    return parseJson(input);
  } catch (_error) {
    // stdin读取失败，使用默认数据 | stdin read failed, use default data
    return {
      success: true,
      data: createDefaultInputData(),
    };
  }
}

/**
 * 验证输入数据格式 | Validate input data format
 */
export function validate(data: unknown): ParseResult {
  try {
    const result = InputDataSchema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        error: `Validation failed: ${result.error.message}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 处理命令行参数 | Handle command line arguments
 */
export function parseArguments(args: string[]): Partial<InputData> {
  const parsed: Partial<InputData> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--transcript-path':
      case '-t':
        if (nextArg && !nextArg.startsWith('-')) {
          parsed.transcriptPath = nextArg;
          i++;
        }
        break;

      case '--cwd':
      case '-c':
        if (nextArg && !nextArg.startsWith('-')) {
          parsed.cwd = nextArg;
          i++;
        }
        break;

      case '--model':
      case '-m':
        if (nextArg && !nextArg.startsWith('-')) {
          parsed.model = { id: nextArg };
          i++;
        }
        break;

      case '--branch':
      case '-b':
        if (nextArg && !nextArg.startsWith('-')) {
          parsed.gitBranch = nextArg;
          i++;
        }
        break;
    }
  }

  return parsed;
}

/**
 * 合并输入数据 | Merge input data
 */
export function mergeInputData(base: InputData, override: Partial<InputData>): InputData {
  return {
    ...base,
    ...override,
    model: { ...base.model, ...override.model },
    workspace: { ...base.workspace, ...override.workspace },
  };
}

/**
 * 获取调试信息 | Get debug information
 */
export function getDebugInfo(data: InputData): Record<string, unknown> {
  return {
    hookEventName: data.hookEventName,
    sessionId: data.sessionId,
    transcriptPath: data.transcriptPath,
    cwd: data.cwd,
    model: data.model,
    workspace: data.workspace,
    gitBranch: data.gitBranch,
    env: {
      PWD: process.env.PWD,
      HOME: process.env.HOME,
      USER: process.env.USER,
      TERM: process.env.TERM,
      TERM_PROGRAM: process.env.TERM_PROGRAM,
    },
  };
}

/**
 * @deprecated Legacy class - use individual functions instead
 * 向后兼容性的遗留类 - 请使用独立函数
 */
