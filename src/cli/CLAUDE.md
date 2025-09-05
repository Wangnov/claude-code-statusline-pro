# CLI模块

## 核心文件
- `main.ts` - CLI主入口，Commander.js框架集成 (599行)
- `mock-data.ts` - Mock数据生成器，支持多场景测试 (853行)
- `message-icons.ts` - CLI消息图标管理器 (370行)
- `i18n.ts` - 国际化系统，语言检测和主题翻译 (1744行)

## CLI主入口 (main.ts:64)

### 主要命令
```typescript
program
  .name('claude-code-statusline-pro')
  .description('Enhanced statusline for Claude Code')
  .argument('[preset]', 'preset string like PMBT')
  .option('-p, --preset <preset>', 'component preset override')
  .option('-t, --theme <theme>', 'theme name (classic, powerline, capsule)')
  .option('--no-colors', 'disable colors output')
  .option('--force-nerd-font', 'force enable Nerd Font icons')
  .option('-m, --mock <scenario>', 'mock data scenario')
  .action(async (preset, options) => { ... })
```

### 子命令系统
1. **主命令**: 状态栏生成，支持stdin输入和内联参数覆盖
2. **config**: 配置初始化（`--init`）和重置（`--reset`）
3. **theme**: 主题选择和应用
4. **validate**: 配置文件验证
5. **doctor**: 环境诊断

### 配置编辑器移除
- 交互式配置编辑器已在main.ts:344被移除
- 现在只提供配置文件路径，引导用户手动编辑TOML
- 保留配置初始化和基本管理功能

## Mock数据生成器 (mock-data.ts:72)

### Mock场景支持
```typescript
interface MockScenario {
  id: string
  name: string
  description: string
  inputData: InputData
  tokenUsage?: number
  expectedStatus?: 'ready' | 'thinking' | 'tool_use' | 'error' | 'complete'
}
```

### 内置场景
- **basic**: 基础项目，低成本($0.05)
- **high-token**: 高Token使用场景($0.85)  
- **error**: 错误状态场景($0.15)
- **thinking**: 思考中场景($0.45)
- **complete**: 任务完成场景($0.45)

### CLI集成
```bash
npm run dev -- --mock dev      # 使用basic场景
npm run dev -- --mock critical # 使用high-token场景
```

## 消息图标管理器 (message-icons.ts:38)

### 主要接口
```typescript
class CliMessageIconManager {
  constructor(options: CliMessageIconOptions)
  getIcon(iconName: string): string
  formatLocalizedMessage(messageKey: string, params?: TranslationParams): string
}

function formatCliMessage(iconType: string, message: string): string
```

### 图标回退系统
- **Nerd Font**: 优先使用Font Awesome图标
- **Emoji**: 回退到Unicode Emoji
- **Text**: 最终回退到文本标识符

### 支持的图标类型
- `success`, `error`, `warning`, `info`
- `folder`, `config`, `theme`, `doctor`
- `platform`, `terminal`, `goodbye`

## 国际化系统 (i18n.ts:14)

### 核心功能
```typescript
// 系统语言检测 (ConfigLoader使用)
function detectSystemLanguage(): SupportedLanguage

// 国际化管理
class I18nManager {
  t(key: string, params?: TranslationParams): string
}

// 主题相关翻译 (main.ts中的主题选择器使用)
const themeTranslations = {
  'editor.themes.title': '选择主题：',
  'editor.themes.applied': '✅ 已应用主题: {{theme}}',
  'editor.themes.items.classic.name': 'Classic主题 - 传统分隔符...',
  // ... 其他主题翻译
}
```

### 重构后状态
- **保留核心功能**: `detectSystemLanguage()`函数被`config/loader.ts`使用
- **主题翻译**: 保留`editor.themes.*`翻译键供主题选择器使用
- **清理废弃内容**: 移除了大量editor配置编辑器相关的无效翻译
- **优化结构**: 简化了翻译键层次，提高了维护性


## 使用方式
```typescript
// CLI命令使用
import { StatuslineGenerator } from '../core/generator.js';

const generator = new StatuslineGenerator(config);
const result = await generator.generate(inputData);

// Mock数据测试
const mockGenerator = new MockDataGenerator();
const mockData = mockGenerator.generate('basic');
```

## 重要特性
- **Commander.js框架**: 完整的子命令和选项支持
- **内联参数覆盖**: CLI参数优先级高于配置文件
- **智能终端检测**: 自动检测并推荐最佳主题
- **项目ID提取**: 从transcriptPath自动提取项目标识
- **错误处理**: 优雅的错误处理和退出机制

## 核心依赖
- **StatuslineGenerator** (`src/core/generator.ts`) 用于状态栏生成
- **ConfigLoader** (`src/config/loader.ts`) 用于配置加载
- **TerminalDetector** (`src/terminal/detector.ts`) 用于环境诊断
- **ProjectResolver** (`src/utils/project-resolver.ts`) 用于项目ID生成

## 重构成果

### 已清理的废弃代码
1. **完全删除**: `component-config-mapper.ts` (1315行)
   - ConfigItemMetadata接口定义
   - ComponentConfigMapper类实现  
   - 组件配置映射和验证逻辑
   - 从`src/index.ts`中移除相关导出

2. **i18n系统优化**:
   - 保留`detectSystemLanguage()`等核心函数
   - 保留主题选择器所需的`editor.themes.*`翻译
   - 简化了翻译键结构

### 验证结果
- ✅ TypeScript编译通过
- ✅ CLI功能正常运行
- ✅ 主题选择器工作正常
- ✅ Mock数据场景测试通过