/**
 * 终端能力检测器 | Terminal capability detector
 * 检测终端对颜色、表情符号、Nerd Font的支持 | Detect terminal support for colors, emojis, Nerd Font
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
 * 检测过程信息接口 | Detection process info interface
 */
export interface DetectionInfo {
  stage: string;
  result: boolean;
  reason: string;
  source?: string;
}

/**
 * 详细检测结果接口 | Detailed detection result interface
 */
export interface DetailedCapabilities extends TerminalCapabilities {
  detectionProcess?: {
    nerdFont: DetectionInfo[];
    emoji: DetectionInfo[];
    colors: DetectionInfo[];
  };
}

/**
 * 检测颜色支持 | Detect color support
 */
function detectColors(
  enableColors: AutoDetectOption,
  debug = false
): { result: boolean; process?: DetectionInfo[] } {
  const process_info: DetectionInfo[] = [];

  if (typeof enableColors === 'boolean') {
    if (debug) {
      process_info.push({
        stage: '用户明确配置',
        result: enableColors,
        reason: `用户强制${enableColors ? '启用' : '禁用'}颜色支持`,
        source: 'user_config',
      });
    }
    return debug ? { result: enableColors, process: process_info } : { result: enableColors };
  }

  // 自动检测颜色支持 | Auto-detect color support
  const checks = [
    { key: 'COLORTERM', value: process.env.COLORTERM, expected: 'truecolor', desc: '真彩色支持' },
    {
      key: 'TERM',
      value: process.env.TERM,
      test: (v: string) => v?.includes('256'),
      desc: '256色支持',
    },
    {
      key: 'TERM_PROGRAM',
      value: process.env.TERM_PROGRAM,
      expected: 'vscode',
      desc: 'VS Code终端',
    },
    {
      key: 'TERM_PROGRAM',
      value: process.env.TERM_PROGRAM,
      expected: 'iTerm.app',
      desc: 'iTerm终端',
    },
    { key: 'TERM_PROGRAM', value: process.env.TERM_PROGRAM, expected: 'Hyper', desc: 'Hyper终端' },
    {
      key: 'WT_SESSION',
      value: process.env.WT_SESSION,
      test: (v: string) => !!v,
      desc: 'Windows Terminal',
    },
    {
      key: 'ConEmuPID',
      value: process.env.ConEmuPID,
      test: (v: string) => !!v,
      desc: 'ConEmu终端',
    },
  ];

  let colorSupported = false;

  for (const check of checks) {
    const match = check.expected
      ? check.value === check.expected
      : check.test
        ? check.test(check.value || '')
        : !!check.value;

    if (debug) {
      process_info.push({
        stage: `环境变量检查: ${check.key}`,
        result: match,
        reason: match ? `检测到${check.desc}` : `未检测到${check.desc}`,
        source: `env.${check.key}=${check.value || 'undefined'}`,
      });
    }

    if (match) {
      colorSupported = true;
    }
  }

  if (debug) {
    process_info.push({
      stage: '颜色检测结果',
      result: colorSupported,
      reason: colorSupported ? '终端支持颜色显示' : '终端不支持颜色显示',
      source: 'auto_detection',
    });
  }

  return debug ? { result: colorSupported, process: process_info } : { result: colorSupported };
}

/**
 * 检测表情符号支持 | Detect emoji support
 */
function detectEmoji(
  enableEmoji: AutoDetectOption,
  debug = false
): { result: boolean; process?: DetectionInfo[] } {
  const process_info: DetectionInfo[] = [];

  if (typeof enableEmoji === 'boolean') {
    if (debug) {
      process_info.push({
        stage: '用户明确配置',
        result: enableEmoji,
        reason: `用户强制${enableEmoji ? '启用' : '禁用'}表情符号支持`,
        source: 'user_config',
      });
    }
    return debug ? { result: enableEmoji, process: process_info } : { result: enableEmoji };
  }

  // 自动检测表情符号支持 | Auto-detect emoji support
  const isWindows = process.platform === 'win32';
  const isMacOS = process.platform === 'darwin';
  const isLinux = process.platform === 'linux';

  if (debug) {
    process_info.push({
      stage: '平台检查',
      result: !isWindows,
      reason: isWindows ? 'Windows平台，需要检查终端支持' : `${isMacOS ? 'macOS' : isLinux ? 'Linux' : '非Windows'}平台，默认支持表情符号`,
      source: `platform=${process.platform}`,
    });
  }

  // macOS和Linux平台默认支持emoji
  if (isMacOS || isLinux) {
    // 检查是否为VS Code/Cursor终端
    if (process.env.TERM_PROGRAM === 'vscode') {
      if (debug) {
        process_info.push({
          stage: 'VS Code/Cursor Emoji支持',
          result: true,
          reason: `${isMacOS ? 'macOS' : 'Linux'}平台下VS Code/Cursor支持Emoji显示`,
          source: 'vscode_on_unix',
        });
      }
    }
    
    if (debug) {
      process_info.push({
        stage: '表情符号检测结果',
        result: true,
        reason: `${isMacOS ? 'macOS' : 'Linux'}平台原生支持表情符号`,
        source: 'platform_native_support',
      });
    }
    return debug ? { result: true, process: process_info } : { result: true };
  }

  // Windows平台特殊处理
  const supportedOnWindows = !!(
    process.env.WT_SESSION ||
    process.env.TERM_PROGRAM === 'vscode' ||
    process.env.ConEmuPID ||
    process.env.TERM_PROGRAM === 'Hyper'
  );

  if (debug && isWindows) {
    const winChecks = [
      { key: 'WT_SESSION', supported: !!process.env.WT_SESSION, desc: 'Windows Terminal' },
      {
        key: 'TERM_PROGRAM=vscode',
        supported: process.env.TERM_PROGRAM === 'vscode',
        desc: 'VS Code/Cursor终端',
      },
      { key: 'ConEmuPID', supported: !!process.env.ConEmuPID, desc: 'ConEmu终端' },
      {
        key: 'TERM_PROGRAM=Hyper',
        supported: process.env.TERM_PROGRAM === 'Hyper',
        desc: 'Hyper终端',
      },
    ];

    for (const check of winChecks) {
      process_info.push({
        stage: `Windows终端检查: ${check.key}`,
        result: check.supported,
        reason: check.supported ? `检测到${check.desc}` : `未检测到${check.desc}`,
        source: `env.${check.key}`,
      });
    }
  }

  const emojiSupported = !isWindows || supportedOnWindows;

  if (debug) {
    process_info.push({
      stage: '表情符号检测结果',
      result: emojiSupported,
      reason: emojiSupported ? '终端支持表情符号显示' : '终端不支持表情符号显示',
      source: 'auto_detection',
    });
  }

  return debug ? { result: emojiSupported, process: process_info } : { result: emojiSupported };
}

/**
 * 检查是否为已知支持Nerd Font的终端 | Check if it's a known Nerd Font compatible terminal
 */
function isNerdFontCompatibleTerminal(debug = false): { result: boolean; info?: DetectionInfo[] } {
  const info: DetectionInfo[] = [];
  const termProgram = process.env.TERM_PROGRAM;
  const term = process.env.TERM;

  // 已知支持Nerd Font的终端程序 | Terminal programs known to support Nerd Font
  const supportedTerminals = [
    'iTerm.app',
    'WezTerm',
    'Alacritty',
    'kitty',
    'Hyper',
    'Warp',
    'Ghostty',
    'rio',
    'foot',
    'konsole',
  ];

  const supportedTermTypes = ['xterm-kitty', 'alacritty', 'tmux-256color', 'screen-256color'];

  let compatible = false;

  // 检查TERM_PROGRAM
  if (termProgram) {
    const isSupported = supportedTerminals.includes(termProgram);
    if (debug) {
      info.push({
        stage: `终端程序检查: ${termProgram}`,
        result: isSupported,
        reason: isSupported ? '已知支持Nerd Font的终端程序' : '未知或不支持的终端程序',
        source: `env.TERM_PROGRAM=${termProgram}`,
      });
    }
    if (isSupported) compatible = true;
  }

  // 检查TERM类型
  if (term) {
    const isSupported = supportedTermTypes.some((type) => term === type || term.includes(type));
    if (debug) {
      info.push({
        stage: `终端类型检查: ${term}`,
        result: isSupported,
        reason: isSupported ? '已知支持Nerd Font的终端类型' : '未知或不支持的终端类型',
        source: `env.TERM=${term}`,
      });
    }
    if (isSupported) compatible = true;
  }

  return debug ? { result: compatible, info } : { result: compatible };
}

/**
 * 检查是否为Nerd Font名称 | Check if it's a Nerd Font name
 */
function isNerdFontName(
  fontName: string,
  debug = false
): { result: boolean; matchedIndicator?: string } {
  const nerdFontIndicators = [
    // 明确的Nerd Font标识符
    { pattern: /nerd font/i, name: 'Nerd Font标识' },
    { pattern: /\bnf\b/i, name: 'NF后缀' },
    { pattern: /nerd$/i, name: 'Nerd结尾' },

    // 常见的Nerd Font字体名称
    { pattern: /fira\s*code/i, name: 'FiraCode系列' },
    { pattern: /jetbrains\s*mono/i, name: 'JetBrains Mono系列' },
    { pattern: /hack/i, name: 'Hack字体' },
    { pattern: /source\s*code\s*pro/i, name: 'Source Code Pro系列' },
    { pattern: /ubuntu\s*mono/i, name: 'Ubuntu Mono系列' },
    { pattern: /cascadia\s*code/i, name: 'Cascadia Code系列' },
    { pattern: /cascadia\s*mono/i, name: 'Cascadia Mono系列' },
    { pattern: /dejavu\s*sans\s*mono/i, name: 'DejaVu Sans Mono系列' },
    { pattern: /inconsolata/i, name: 'Inconsolata系列' },
    { pattern: /droid\s*sans\s*mono/i, name: 'Droid Sans Mono系列' },
    { pattern: /liberation\s*mono/i, name: 'Liberation Mono系列' },
    { pattern: /roboto\s*mono/i, name: 'Roboto Mono系列' },
    { pattern: /sf\s*mono/i, name: 'SF Mono系列' },
    { pattern: /menlo/i, name: 'Menlo系列' },

    // Maple字体系列
    { pattern: /maple\s*mono/i, name: 'Maple Mono系列' },

    // Powerline字体
    { pattern: /powerline/i, name: 'Powerline字体' },
    { pattern: /for\s*powerline/i, name: 'Powerline适配字体' },

    // Iosevka系列
    { pattern: /iosevka/i, name: 'Iosevka系列' },

    // Terminus字体
    { pattern: /terminus/i, name: 'Terminus系列' },
  ];

  for (const indicator of nerdFontIndicators) {
    if (indicator.pattern.test(fontName)) {
      if (debug) {
        return { result: true, matchedIndicator: indicator.name };
      }
      return { result: true };
    }
  }

  return { result: false };
}

/**
 * 通过字体名称检测Nerd Font | Detect Nerd Font by font name
 */
function detectNerdFontByName(debug = false): { result: boolean; info?: DetectionInfo[] } {
  const info: DetectionInfo[] = [];

  // 检查常见的Nerd Font环境变量 | Check common Nerd Font environment variables
  const fontVars = [
    { key: 'TERMINAL_FONT', value: process.env.TERMINAL_FONT, priority: '高优先级' },
    { key: 'FONT', value: process.env.FONT, priority: '中优先级' },
    { key: 'GUIFONT', value: process.env.GUIFONT, priority: 'Vim/Neovim用户' },
    { key: 'NERD_FONT_NAME', value: process.env.NERD_FONT_NAME, priority: '明确指定' },
  ];

  let fontDetected = false;

  for (const fontVar of fontVars) {
    if (fontVar.value) {
      const fontCheck = isNerdFontName(fontVar.value, debug);
      if (debug) {
        info.push({
          stage: `字体环境变量: ${fontVar.key}`,
          result: fontCheck.result,
          reason: fontCheck.result
            ? `检测到Nerd Font: ${fontVar.value} (${fontCheck.matchedIndicator})`
            : `字体名称不匹配Nerd Font模式: ${fontVar.value}`,
          source: `env.${fontVar.key}=${fontVar.value} [${fontVar.priority}]`,
        });
      }

      if (fontCheck.result) {
        fontDetected = true;
        break; // 找到第一个匹配的就停止
      }
    } else if (debug) {
      info.push({
        stage: `字体环境变量: ${fontVar.key}`,
        result: false,
        reason: '环境变量未设置',
        source: `env.${fontVar.key}=undefined`,
      });
    }
  }

  return debug ? { result: fontDetected, info } : { result: fontDetected };
}

/**
 * 尝试从VS Code配置检测字体 | Try to detect font from VS Code config
 */
function detectVSCodeFont(debug = false): { result: boolean; info?: DetectionInfo[] } {
  const info: DetectionInfo[] = [];

  if (process.env.TERM_PROGRAM !== 'vscode') {
    if (debug) {
      info.push({
        stage: 'VS Code字体检测',
        result: false,
        reason: '非VS Code终端环境',
        source: 'not_vscode',
      });
      return { result: false, info };
    }
    return { result: false };
  }

  // 尝试读取VS Code/Cursor的settings.json
  
  // 获取可能的配置文件路径
  const possiblePaths: string[] = [];
  const home = os.homedir();
  
  // VS Code和Cursor配置路径
  if (process.platform === 'darwin') {
    // macOS
    possiblePaths.push(
      path.join(home, 'Library', 'Application Support', 'Code', 'User', 'settings.json'),
      path.join(home, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json')
    );
  } else if (process.platform === 'win32') {
    // Windows - 使用APPDATA环境变量
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    possiblePaths.push(
      path.join(appData, 'Code', 'User', 'settings.json'),
      path.join(appData, 'Cursor', 'User', 'settings.json')
    );
    
    // 也检查LOCALAPPDATA位置（一些版本可能使用）
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    possiblePaths.push(
      path.join(localAppData, 'Programs', 'Microsoft VS Code', 'resources', 'app', 'extensions', 'settings.json')
    );
  } else {
    // Linux
    possiblePaths.push(
      path.join(home, '.config', 'Code', 'User', 'settings.json'),
      path.join(home, '.config', 'Cursor', 'User', 'settings.json'),
      path.join(home, '.config', 'Code - OSS', 'User', 'settings.json')  // Open Source 版本
    );
  }
  
  // 工作区配置
  const cwd = process.cwd();
  if (cwd) {
    possiblePaths.push(
      path.join(cwd, '.vscode', 'settings.json'),
      path.join(cwd, '.cursor', 'settings.json')
    );
  }
  
  // 从环境变量中获取额外的配置路径
  if (process.env.VSCODE_PORTABLE) {
    // VS Code Portable 版本
    possiblePaths.push(
      path.join(process.env.VSCODE_PORTABLE, 'user-data', 'User', 'settings.json')
    );
  }
  
  let fontDetected = false;
  let detectedFont = '';
  
  for (const configPath of possiblePaths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        
        // 移除注释以避免JSON解析错误
        const jsonContent = content
          .replace(/\/\/.*$/gm, '')  // 移除单行注释
          .replace(/\/\*[\s\S]*?\*\//g, '');  // 移除多行注释
        
        try {
          const settings = JSON.parse(jsonContent);
          
          // 检查terminal.integrated.fontFamily
          // 如果没有设置终端字体，VS Code/Cursor会使用编辑器字体
          const terminalFont = settings['terminal.integrated.fontFamily'] || 
                             settings['terminal']?.['integrated']?.['fontFamily'] ||
                             settings['editor.fontFamily'] ||
                             settings['editor']?.['fontFamily'];
          
          if (terminalFont) {
            detectedFont = terminalFont;
            const fontCheck = isNerdFontName(terminalFont, debug);
            
            if (debug) {
              info.push({
                stage: `配置文件: ${path.basename(path.dirname(configPath))}`,
                result: fontCheck.result,
                reason: fontCheck.result 
                  ? `检测到Nerd Font: ${terminalFont}${fontCheck.matchedIndicator ? ` (${fontCheck.matchedIndicator})` : ''}`
                  : `检测到字体但非Nerd Font: ${terminalFont}`,
                
                source: configPath,
              });
            }
            
            if (fontCheck.result) {
              fontDetected = true;
              break;
            }
          }
        } catch (parseError) {
          if (debug) {
            info.push({
              stage: `配置文件解析`,
              result: false,
              reason: `JSON解析失败: ${parseError}`,
                
              source: configPath,
            });
          }
        }
      }
    } catch (readError) {
      // 文件不存在或无法读取，继续尝试下一个
      continue;
    }
  }
  
  // 如果没有检测到Nerd Font，但在macOS/Linux下，仍然支持emoji
  const isMacOS = process.platform === 'darwin';
  const isLinux = process.platform === 'linux';
  
  if (!fontDetected && debug) {
    if (detectedFont) {
      info.push({
        stage: 'VS Code字体检测结果',
        result: false,
        reason: `检测到字体配置"${detectedFont}"但不是Nerd Font`,
        source: 'vscode_config',
      });
    } else {
      info.push({
        stage: 'VS Code字体检测结果',
        result: false,
        reason: '未找到VS Code/Cursor终端字体配置',
        source: 'vscode_config_not_found',
      });
    }
    
    if (isMacOS || isLinux) {
      info.push({
        stage: 'VS Code Emoji支持',
        result: true,
        reason: `${isMacOS ? 'macOS' : 'Linux'}平台VS Code/Cursor默认支持Emoji`,
        source: 'platform_default',
      });
    }
  }

  return { result: fontDetected, info };
}

/**
 * 保守的Nerd Font检测 | Conservative Nerd Font detection
 */
function conservativeNerdFontDetection(debug = false): { result: boolean; info?: DetectionInfo[] } {
  const info: DetectionInfo[] = [];

  // 对于VS Code/Cursor，检查更多细节 | For VS Code/Cursor, check more details
  if (process.env.TERM_PROGRAM === 'vscode') {
    // VS Code/Cursor终端通常支持Nerd Font，但需要用户配置
    // 在macOS下默认支持emoji作为回退
    const isMacOS = process.platform === 'darwin';
    const isLinux = process.platform === 'linux';
    
    if (debug) {
      info.push({
        stage: 'VS Code/Cursor保守检测',
        result: false,
        reason: 'VS Code/Cursor需要用户配置字体，保守返回false避免乱码',
        source: 'vscode_conservative',
      });
      
      if (isMacOS || isLinux) {
        info.push({
          stage: '平台Emoji回退',
          result: true,
          reason: `${isMacOS ? 'macOS' : 'Linux'}平台支持Emoji作为回退方案`,
          source: 'platform_emoji_fallback',
        });
      }
      
      return { result: false, info };
    }
    return { result: false };
  }

  // Windows Terminal 通常支持 | Windows Terminal usually supports
  if (process.env.WT_SESSION) {
    if (debug) {
      info.push({
        stage: 'Windows Terminal检测',
        result: true,
        reason: 'Windows Terminal通常内置字体支持',
        source: 'env.WT_SESSION',
      });
    }
    return debug ? { result: true, info } : { result: true };
  }

  // 项目目录检测 - 如果在已知的开发项目中
  const _cwd = process.cwd();
  const _projectIndicators = [
    '.git',
    'package.json',
    'Cargo.toml',
    'go.mod',
    'requirements.txt',
    'Gemfile',
    'composer.json',
    'pom.xml',
    'build.gradle',
    'Makefile',
  ];

  // TODO: 实现项目目录检测
  // 目前跳过此检测

  // 对于其他情况，保守返回false避免显示乱码 | For other cases, conservatively return false to avoid garbled characters
  if (debug) {
    info.push({
      stage: '最终保守检测',
      result: false,
      reason: '未找到明确支持证据，保守返回false避免显示乱码',
      source: 'conservative_fallback',
    });
    return { result: false, info };
  }

  return { result: false };
}

/**
 * 检测Nerd Font支持 | Detect Nerd Font support
 */
function detectNerdFont(
  enableNerdFont: AutoDetectOption,
  forceNerdFont: boolean,
  debug = false
): { result: boolean; process?: DetectionInfo[] } {
  const process_info: DetectionInfo[] = [];

  // 1. 强制启用检查
  if (forceNerdFont) {
    if (debug) {
      process_info.push({
        stage: '强制启用检查',
        result: true,
        reason: '用户通过forceNerdFont参数强制启用',
        source: 'force_parameter',
      });
      return { result: true, process: process_info };
    }
    return { result: true };
  }

  // 2. 用户明确配置检查
  if (typeof enableNerdFont === 'boolean') {
    if (debug) {
      process_info.push({
        stage: '用户明确配置',
        result: enableNerdFont,
        reason: `用户强制${enableNerdFont ? '启用' : '禁用'}Nerd Font支持`,
        source: 'user_config',
      });
      return { result: enableNerdFont, process: process_info };
    }
    return { result: enableNerdFont };
  }

  // 3. 环境变量明确启用检查 - 最可靠的方法 | Priority: check environment variables - most reliable
  const nerdFontEnv = process.env.NERD_FONT;
  const explicitlyEnabled = nerdFontEnv === '1' || nerdFontEnv === 'true';

  if (debug) {
    process_info.push({
      stage: '环境变量NERD_FONT检查',
      result: explicitlyEnabled,
      reason: explicitlyEnabled ? 'NERD_FONT环境变量明确启用' : 'NERD_FONT环境变量未设置或非启用值',
      source: `env.NERD_FONT=${nerdFontEnv || 'undefined'}`,
    });
  }

  if (explicitlyEnabled) {
    if (debug) {
      return { result: true, process: process_info };
    }
    return { result: true };
  }

  // 4. 字体名称检测 | Font name detection
  const fontDetection = detectNerdFontByName(debug);
  if (debug && fontDetection.info) {
    process_info.push(...fontDetection.info);
  }

  if (fontDetection.result) {
    if (debug) {
      process_info.push({
        stage: 'Nerd Font检测结果',
        result: true,
        reason: '通过字体名称检测确认支持',
        source: 'font_name_detection',
      });
      return { result: true, process: process_info };
    }
    return { result: true };
  }

  // 5. VS Code字体配置检测
  const vscodeDetection = detectVSCodeFont(debug);
  if (debug && vscodeDetection.info) {
    process_info.push(...vscodeDetection.info);
  }

  if (vscodeDetection.result) {
    if (debug) {
      process_info.push({
        stage: 'Nerd Font检测结果',
        result: true,
        reason: '通过VS Code配置检测确认支持',
        source: 'vscode_config_detection',
      });
      return { result: true, process: process_info };
    }
    return { result: true };
  }

  // 6. 检查已知支持Nerd Font的终端 | Check terminals known to support Nerd Font
  const terminalDetection = isNerdFontCompatibleTerminal(debug);
  if (debug && terminalDetection.info) {
    process_info.push(...terminalDetection.info);
  }

  if (terminalDetection.result) {
    if (debug) {
      process_info.push({
        stage: 'Nerd Font检测结果',
        result: true,
        reason: '通过终端兼容性检测确认支持',
        source: 'terminal_compatibility',
      });
      return { result: true, process: process_info };
    }
    return { result: true };
  }

  // 7. 基于终端特征的保守检测 | Conservative detection based on terminal features
  const conservativeDetection = conservativeNerdFontDetection(debug);
  if (debug && conservativeDetection.info) {
    process_info.push(...conservativeDetection.info);
  }

  if (debug) {
    process_info.push({
      stage: 'Nerd Font最终检测结果',
      result: conservativeDetection.result,
      reason: conservativeDetection.result
        ? '通过保守检测确认支持'
        : '所有检测均未确认支持，保守返回false',
      source: 'conservative_detection',
    });
    return { result: conservativeDetection.result, process: process_info };
  }

  return { result: conservativeDetection.result };
}

/**
 * 检测终端能力 | Detect terminal capabilities
 */
export function detect(
  enableColors: AutoDetectOption = 'auto',
  enableEmoji: AutoDetectOption = 'auto',
  enableNerdFont: AutoDetectOption = 'auto',
  forceNerdFont: boolean = false,
  debug: boolean = false
): TerminalCapabilities | DetailedCapabilities {
  const colorDetection = detectColors(enableColors, debug);
  const emojiDetection = detectEmoji(enableEmoji, debug);
  const nerdFontDetection = detectNerdFont(enableNerdFont, forceNerdFont, debug);

  const capabilities: TerminalCapabilities = {
    colors: colorDetection.result,
    emoji: emojiDetection.result,
    nerdFont: nerdFontDetection.result,
  };

  if (debug) {
    const detailedCapabilities: DetailedCapabilities = {
      ...capabilities,
      detectionProcess: {
        colors: colorDetection.process || [],
        emoji: emojiDetection.process || [],
        nerdFont: nerdFontDetection.process || [],
      },
    };
    return detailedCapabilities;
  }

  return capabilities;
}

/**
 * 格式化debug输出 | Format debug output
 */
export function formatDebugOutput(capabilities: DetailedCapabilities): string {
  const lines: string[] = [];

  lines.push('🔍 终端能力检测结果 | Terminal Capability Detection Results');
  lines.push('='.repeat(60));

  // 环境信息
  lines.push('\n📋 环境信息 | Environment Info:');
  lines.push(`• 操作系统: ${process.platform}`);
  lines.push(`• TERM: ${process.env.TERM || 'undefined'}`);
  lines.push(`• TERM_PROGRAM: ${process.env.TERM_PROGRAM || 'undefined'}`);
  lines.push(`• TERM_PROGRAM_VERSION: ${process.env.TERM_PROGRAM_VERSION || 'undefined'}`);

  if (process.env.WT_SESSION) lines.push(`• Windows Terminal: ${process.env.WT_SESSION}`);
  if (process.env.ConEmuPID) lines.push(`• ConEmu: ${process.env.ConEmuPID}`);
  if (process.env.COLORTERM) lines.push(`• COLORTERM: ${process.env.COLORTERM}`);

  // 字体环境变量
  const fontVars = ['TERMINAL_FONT', 'FONT', 'GUIFONT', 'NERD_FONT_NAME', 'NERD_FONT'];
  const setFontVars = fontVars.filter((v) => process.env[v]);
  if (setFontVars.length > 0) {
    lines.push('\n🖍️  字体环境变量 | Font Environment Variables:');
    for (const fontVar of setFontVars) {
      lines.push(`• ${fontVar}: ${process.env[fontVar]}`);
    }
  }

  // 检测过程详情
  const sections = [
    { name: '🎨 颜色支持检测', key: 'colors' as const, result: capabilities.colors },
    { name: '😀 表情符号支持检测', key: 'emoji' as const, result: capabilities.emoji },
    { name: '🔤 Nerd Font支持检测', key: 'nerdFont' as const, result: capabilities.nerdFont },
  ];

  for (const section of sections) {
    lines.push(
      `\n${section.name} | ${section.key.charAt(0).toUpperCase() + section.key.slice(1)} Detection:`
    );
    const process = capabilities.detectionProcess?.[section.key];

    if (process && process.length > 0) {
      for (let i = 0; i < process.length; i++) {
        const step = process[i];
        if (step) {
          const icon = step.result ? '✅' : '❌';
          lines.push(`  ${i + 1}. ${icon} ${step.stage}`);
          lines.push(`     ${step.reason}`);
          if (step.source) {
            lines.push(`     来源: ${step.source}`);
          }
        }
      }
    } else {
      lines.push('  无详细检测过程');
    }

    lines.push(`  ➡️ 最终结果: ${section.result ? '✅ 支持' : '❌ 不支持'}`);
  }

  // 三级回退建议
  lines.push('\n🔄 三级回退机制 | Three-Level Fallback:');
  if (capabilities.nerdFont) {
    lines.push('✅ 使用Nerd Font图标 (最佳体验)');
  } else if (capabilities.emoji) {
    lines.push('⚡ 回退到表情符号图标 (良好体验)');
    lines.push('💡 建议: 设置TERMINAL_FONT环境变量启用Nerd Font');
  } else {
    lines.push('⚠️  回退到文本图标 (基础体验)');
    lines.push('💡 建议: 升级终端或设置字体环境变量');
  }

  return lines.join('\n');
}

/**
 * 获取能力详细信息用于调试 | Get capability details for debugging
 */
export function getCapabilityInfo(): Record<string, unknown> {
  const capabilities = detect('auto', 'auto', 'auto', false, true) as DetailedCapabilities;

  return {
    platform: process.platform,
    env: {
      COLORTERM: process.env.COLORTERM,
      TERM: process.env.TERM,
      TERM_PROGRAM: process.env.TERM_PROGRAM,
      TERM_PROGRAM_VERSION: process.env.TERM_PROGRAM_VERSION,
      WT_SESSION: process.env.WT_SESSION,
      ConEmuPID: process.env.ConEmuPID,
      NERD_FONT: process.env.NERD_FONT,
      TERMINAL_FONT: process.env.TERMINAL_FONT,
      FONT: process.env.FONT,
      GUIFONT: process.env.GUIFONT,
      NERD_FONT_NAME: process.env.NERD_FONT_NAME,
    },
    capabilities: {
      colors: capabilities.colors,
      emoji: capabilities.emoji,
      nerdFont: capabilities.nerdFont,
    },
    detectionProcess: capabilities.detectionProcess,
    debugOutput: formatDebugOutput(capabilities),
  };
}

/**
 * 别名和便捷包装类: 为向后兼容和简化使用
 * @deprecated Legacy class - use individual functions instead
 */
export class TerminalDetector {
  detectCapabilities(debug = false): TerminalCapabilities | DetailedCapabilities {
    return detect('auto', 'auto', 'auto', false, debug);
  }

  getCapabilityInfo(): Record<string, unknown> {
    return getCapabilityInfo();
  }

  /**
   * 输出格式化的调试信息到控制台
   */
  printDebugInfo(): void {
    const capabilities = detect('auto', 'auto', 'auto', false, true) as DetailedCapabilities;
    console.log(formatDebugOutput(capabilities));
  }

  /**
   * 检测并返回图标回退优先级
   */
  getIconFallback(): 'nerdFont' | 'emoji' | 'text' {
    const caps = detect() as TerminalCapabilities;
    if (caps.nerdFont) return 'nerdFont';
    if (caps.emoji) return 'emoji';
    return 'text';
  }
}
