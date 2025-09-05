# 终端模块

## 核心文件
- `detector.ts` - 终端能力检测器，智能检测终端特性 (968行)
- `colors.ts` - TerminalRenderer类，颜色和图标渲染管理器 (396行)

## 终端检测器 (detector.ts:798)

### 主要接口
```typescript
// 核心检测函数
function detect(
  enableColors?: AutoDetectOption,
  enableEmoji?: AutoDetectOption,
  enableNerdFont?: AutoDetectOption,
  forceNerdFont?: boolean,
  debug?: boolean
): TerminalCapabilities | DetailedCapabilities

// 终端能力结果
interface TerminalCapabilities {
  colors: boolean
  emoji: boolean
  nerdFont: boolean
}
```

### 检测能力
1. **颜色支持检测**: 
   - TrueColor (24位)、256色、16色检测
   - 环境变量: `COLORTERM`, `TERM`, `TERM_PROGRAM`
   - 终端程序: VS Code, iTerm, Windows Terminal等

2. **Emoji支持检测**:
   - 平台特定: macOS/Linux默认支持，Windows需检查终端
   - 终端支持: VS Code, Windows Terminal, ConEmu, Hyper等

3. **Nerd Font检测**:
   - 字体名称模式匹配 (FiraCode, JetBrains Mono等)
   - VS Code配置文件解析
   - 环境变量: `TERMINAL_FONT`, `NERD_FONT`等
   - 终端兼容性检查

### 检测机制
```typescript
// 颜色检测示例
const checks = [
  { key: 'COLORTERM', expected: 'truecolor' },
  { key: 'TERM', test: (v) => v?.includes('256') },
  { key: 'TERM_PROGRAM', expected: 'vscode' }
];

// Nerd Font字体名称匹配
const indicators = [
  { pattern: /nerd font/i, name: 'Nerd Font标识' },
  { pattern: /fira\s*code/i, name: 'FiraCode系列' },
  { pattern: /jetbrains\s*mono/i, name: 'JetBrains Mono系列' }
];
```

## 终端渲染器 (colors.ts:37)

### 主要接口
```typescript
class TerminalRenderer {
  constructor(capabilities: TerminalCapabilities, config: Config)
  getColor(colorName: string): string                     // 获取颜色代码
  getIcon(iconName: string): string                       // 获取图标
  colorize(text: string, colorName: string): string       // 应用颜色
  format(icon: string, text: string, colorName?: string): string  // 格式化
  getTrueColorSupport(): boolean                          // 24位色支持检查
}
```

### 颜色系统
1. **RGB真彩色支持** (24位):
   ```typescript
   // TrueColor示例 
   red: { fg: '\x1b[38;2;191;97;106m', bg: '\x1b[48;2;191;97;106m' }
   ```

2. **4位兼容色回退**:
   ```typescript
   // ANSI标准色
   red: { fg: '\x1b[91m', bg: '\x1b[101m' }
   ```

### 三级图标回退系统
```typescript
// 优先级: Nerd Font → Emoji → Text
if (capabilities.nerdFont) {
  return nerdFontIcons;  // '\uf07b', '\ue702'等
} else if (capabilities.emoji) {
  return emojiIcons;     // '📁', '🌿'等  
} else {
  return textIcons;      // '[P]', '[B]'等
}
```

### 图标映射
- **项目**: `\uf07b` → `📁` → `[P]`
- **模型**: `\uf085` → `🤖` → `[M]` 
- **分支**: `\ue702` → `🌿` → `[B]`
- **Token**: `\uf080` → `📊` → `[T]`
- **状态**: `\uf00c` → `✅` → `[OK]`

## 集成使用
```typescript
import { detect } from '../terminal/detector.js';
import { TerminalRenderer } from '../terminal/colors.js';

// 1. 检测终端能力
const capabilities = detect();

// 2. 创建渲染器
const renderer = new TerminalRenderer(capabilities, config);

// 3. 渲染输出
const projectIcon = renderer.getIcon('project');
const coloredText = renderer.colorize('Branch: main', 'green');
```

## 重要特性
- **智能检测**: 基于环境变量和配置文件的多层检测
- **调试支持**: 详细的检测过程记录，支持debug模式
- **渐进降级**: 自动回退到兼容的颜色和图标方案
- **配置文件解析**: VS Code/Cursor设置文件字体检测
- **跨平台支持**: macOS/Linux/Windows差异化处理

## 核心依赖
- **StatuslineGenerator** (`src/core/generator.ts:36`) 调用`detect()`获取终端能力
- **BaseComponent** (`src/components/base.ts:105`) 使用三级图标选择逻辑
- **ThemeRenderer** 依赖终端能力进行渲染适配

## VS Code配置检测路径
```typescript
// macOS
'~/Library/Application Support/Code/User/settings.json'
'~/Library/Application Support/Cursor/User/settings.json'

// Windows  
'%APPDATA%/Code/User/settings.json'
'%APPDATA%/Cursor/User/settings.json'

// Linux
'~/.config/Code/User/settings.json'
'~/.config/Cursor/User/settings.json'
```

## 检测优先级
1. **用户强制配置** (enableColors: boolean)
2. **环境变量明确设置** (NERD_FONT=1)
3. **字体名称匹配** (TERMINAL_FONT检查)
4. **VS Code配置解析** (settings.json)
5. **终端兼容性检查** (已知支持的终端)
6. **保守检测** (避免乱码的安全回退)