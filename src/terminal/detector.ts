/**
 * 终端能力检测器 | Terminal capability detector
 * 检测终端对颜色、表情符号、Nerd Font的支持 | Detect terminal support for colors, emojis, Nerd Font
 */

/**
 * 终端能力接口 | Terminal capabilities interface
 */
export interface TerminalCapabilities {
  colors: boolean;
  emoji: boolean;
  nerdFont: boolean;
}

/**
 * 自动检测选项 | Auto-detection option
 */
export type AutoDetectOption = boolean | 'auto';

/**
 * 检测颜色支持 | Detect color support
 */
function detectColors(enableColors: AutoDetectOption): boolean {
  if (typeof enableColors === 'boolean') {
    return enableColors;
  }

  // 自动检测颜色支持 | Auto-detect color support
  return !!(
    process.env['COLORTERM'] === 'truecolor' ||
    process.env['TERM']?.includes('256') ||
    process.env['TERM_PROGRAM'] === 'vscode' ||
    process.env['TERM_PROGRAM'] === 'iTerm.app' ||
    process.env['TERM_PROGRAM'] === 'Hyper' ||
    process.env['WT_SESSION'] || // Windows Terminal
    process.env['ConEmuPID']
  );
}

/**
 * 检测表情符号支持 | Detect emoji support
 */
function detectEmoji(enableEmoji: AutoDetectOption): boolean {
  if (typeof enableEmoji === 'boolean') {
    return enableEmoji;
  }

  // 自动检测表情符号支持 | Auto-detect emoji support
  // Windows平台通常需要特殊处理 | Windows platform usually needs special handling
  return !!(
    process.platform !== 'win32' ||
    process.env['WT_SESSION'] ||
    process.env['TERM_PROGRAM'] === 'vscode' ||
    process.env['ConEmuPID'] ||
    process.env['TERM_PROGRAM'] === 'Hyper'
  );
}

/**
 * 检查是否为已知支持Nerd Font的终端 | Check if it's a known Nerd Font compatible terminal
 */
function isNerdFontCompatibleTerminal(): boolean {
  const termProgram = process.env['TERM_PROGRAM'];
  const term = process.env['TERM'];

  // 已知支持Nerd Font的终端程序 | Terminal programs known to support Nerd Font
  const supportedTerminals = ['iTerm.app', 'WezTerm', 'Alacritty', 'kitty', 'Hyper'];

  if (termProgram && supportedTerminals.includes(termProgram)) {
    return true;
  }

  // 检查terminal类型 | Check terminal type
  if (term === 'xterm-kitty' || term === 'alacritty') {
    return true;
  }

  return false;
}

/**
 * 检查是否为Nerd Font名称 | Check if it's a Nerd Font name
 */
function isNerdFontName(fontName: string): boolean {
  const nerdFontIndicators = [
    'nerd',
    'nf-',
    'powerline',
    'fira code',
    'jetbrains mono',
    'hack',
    'source code pro',
    'ubuntu mono',
    'cascadia code',
    'dejavu sans mono',
  ];

  const lowerFontName = fontName.toLowerCase();
  return nerdFontIndicators.some((indicator) => lowerFontName.includes(indicator));
}

/**
 * 通过字体名称检测Nerd Font | Detect Nerd Font by font name
 */
function detectNerdFontByName(): boolean {
  // 检查常见的Nerd Font环境变量 | Check common Nerd Font environment variables
  const fontVars = [process.env['FONT'], process.env['TERMINAL_FONT'], process.env['NERD_FONT_NAME']];

  for (const fontVar of fontVars) {
    if (fontVar && isNerdFontName(fontVar)) {
      return true;
    }
  }

  return false;
}

/**
 * 保守的Nerd Font检测 | Conservative Nerd Font detection
 */
function conservativeNerdFontDetection(): boolean {
  // 对于VS Code，检查更多细节 | For VS Code, check more details
  if (process.env['TERM_PROGRAM'] === 'vscode') {
    // VS Code终端通常支持Nerd Font，但需要用户配置 | VS Code terminal usually supports Nerd Font, but requires user configuration
    // 保守起见，除非明确配置，否则返回false | Conservatively, return false unless explicitly configured
    return false;
  }

  // Windows Terminal 通常支持 | Windows Terminal usually supports
  if (process.env['WT_SESSION']) {
    return true;
  }

  // 对于其他情况，保守返回false避免显示乱码 | For other cases, conservatively return false to avoid garbled characters
  return false;
}

/**
 * 检测Nerd Font支持 | Detect Nerd Font support
 */
function detectNerdFont(enableNerdFont: AutoDetectOption, forceNerdFont: boolean): boolean {
  if (forceNerdFont) {
    return true;
  }

  if (typeof enableNerdFont === 'boolean') {
    return enableNerdFont;
  }

  // 1. 优先检查环境变量 - 最可靠的方法 | Priority: check environment variables - most reliable
  if (process.env['NERD_FONT'] === '1' || process.env['NERD_FONT'] === 'true') {
    return true;
  }

  // 2. 检查已知支持Nerd Font的终端 | Check terminals known to support Nerd Font
  if (isNerdFontCompatibleTerminal()) {
    return true;
  }

  // 3. 字体名称检测 | Font name detection
  if (detectNerdFontByName()) {
    return true;
  }

  // 4. 基于终端特征的保守检测 | Conservative detection based on terminal features
  return conservativeNerdFontDetection();
}

/**
 * 检测终端能力 | Detect terminal capabilities
 */
export function detect(
  enableColors: AutoDetectOption = 'auto',
  enableEmoji: AutoDetectOption = 'auto',
  enableNerdFont: AutoDetectOption = 'auto',
  forceNerdFont: boolean = false
): TerminalCapabilities {
  return {
    colors: detectColors(enableColors),
    emoji: detectEmoji(enableEmoji),
    nerdFont: detectNerdFont(enableNerdFont, forceNerdFont),
  };
}

/**
 * 获取能力详细信息用于调试 | Get capability details for debugging
 */
export function getCapabilityInfo(): Record<string, unknown> {
  return {
    platform: process.platform,
    env: {
      COLORTERM: process.env['COLORTERM'],
      TERM: process.env['TERM'],
      TERM_PROGRAM: process.env['TERM_PROGRAM'],
      TERM_PROGRAM_VERSION: process.env['TERM_PROGRAM_VERSION'],
      WT_SESSION: process.env['WT_SESSION'],
      ConEmuPID: process.env['ConEmuPID'],
      NERD_FONT: process.env['NERD_FONT'],
      FONT: process.env['FONT'],
    },
    detected: detect(),
  };
}

/**
 * @deprecated Legacy class - use individual functions instead
 * 向后兼容性的遗留类 - 请使用独立函数
 */
// Note: This class has been removed to improve code quality.
// Use the exported functions directly instead.

/**
 * 别名和便捷包装类: 为向后兼容和简化使用
 */
export class TerminalDetector {
  detectCapabilities(): TerminalCapabilities {
    return detect();
  }

  getCapabilityInfo(): Record<string, unknown> {
    return getCapabilityInfo();
  }
}
