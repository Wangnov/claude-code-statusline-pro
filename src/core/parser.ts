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
    cost: null,
  };
}

/**
 * 创建带回退的输入数据 | Create input data with fallback
 */
function createInputDataWithFallback(rawData: any): InputData {
  const defaultData = createDefaultInputData();

  // 安全地提取字段值 | Safely extract field values
  const safeString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

  const safeObject = (value: unknown): Record<string, any> =>
    value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  return {
    hookEventName: safeString(rawData?.hookEventName) || defaultData.hookEventName,
    sessionId: safeString(rawData?.sessionId),
    transcriptPath: safeString(rawData?.transcriptPath),
    cwd: safeString(rawData?.cwd) || defaultData.cwd,
    model: safeObject(rawData?.model),
    workspace: {
      current_dir:
        safeString(rawData?.workspace?.current_dir) || safeString(rawData?.cwd) || defaultData.cwd,
      project_dir:
        safeString(rawData?.workspace?.project_dir) || safeString(rawData?.cwd) || defaultData.cwd,
    },
    gitBranch: safeString(rawData?.gitBranch),
    cost: rawData?.cost || null,
    // 保留额外字段 | Keep additional fields
    ...(rawData?.version && { version: rawData.version }),
    ...(rawData?.output_style && { output_style: rawData.output_style }),
    ...(typeof rawData?.exceeds_200k_tokens === 'boolean' && {
      exceeds_200k_tokens: rawData.exceeds_200k_tokens,
    }),
  };
}

/**
 * 动态转换新格式到内部格式 | Dynamically transform new format to internal format
 */
function transformNewFormat(rawData: any): any {
  // 检查是否是新的数组格式 | Check if it's the new array format
  if (Array.isArray(rawData) && rawData.length > 0) {
    const sessionData = rawData[0]; // 取第一个会话数据 | Take first session data

    // 转换为内部格式 | Transform to internal format
    return {
      hookEventName: 'Status', // 默认事件名 | Default event name
      sessionId: sessionData.session_id || null,
      transcriptPath: sessionData.transcript_path || null,
      cwd: sessionData.cwd || sessionData.workspace?.current_dir || process.cwd(),
      model: sessionData.model || {},
      workspace: sessionData.workspace || {
        current_dir: sessionData.cwd || process.cwd(),
        project_dir: sessionData.workspace?.project_dir || sessionData.cwd || process.cwd(),
      },
      gitBranch: null, // Git分支将由组件自动检测 | Git branch will be auto-detected by component
      cost: sessionData.cost || null,
      // 保留额外的新字段 | Keep additional new fields
      version: sessionData.version,
      output_style: sessionData.output_style,
      exceeds_200k_tokens: sessionData.exceeds_200k_tokens,
    };
  }

  // 检查是否是旧的单对象格式但字段名不同 | Check if it's old single object format but with different field names
  if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
    // 自动映射常见的字段名变化 | Auto-map common field name changes
    const normalized = { ...rawData };

    if (rawData.session_id && !rawData.sessionId) {
      normalized.sessionId = rawData.session_id;
    }
    if (rawData.transcript_path && !rawData.transcriptPath) {
      normalized.transcriptPath = rawData.transcript_path;
    }

    return normalized;
  }

  // 返回原数据 | Return original data
  return rawData;
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

    // 动态转换数据格式 | Dynamically transform data format
    const transformedData = transformNewFormat(rawData);

    // 使用Zod验证和转换数据 | Use Zod to validate and transform data
    const result = InputDataSchema.safeParse(transformedData);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      // 如果验证失败，尝试使用更宽松的解析 | If validation fails, try more lenient parsing
      return {
        success: true,
        data: createInputDataWithFallback(transformedData),
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
