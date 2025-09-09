# 核心模块

## 核心文件
- `generator.ts` - StatuslineGenerator类，系统的主要控制器 (445行)
- `parser.ts` - 配置和数据解析器 (343行)

## 多行系统文件 🆕  
- `multi-line-renderer.ts` - MultiLineRenderer类，多行渲染控制器 (198行)
- `grid-system.ts` - GridSystem类，二维网格布局引擎 (152行)

## StatuslineGenerator类 (generator.ts:29)

### 主要接口
```typescript
class StatuslineGenerator {
  constructor(config: Config, options?: GeneratorOptions)
  generate(inputData: InputData): Promise<string>          // 主要生成接口
  private initializeComponents(): void                     // 注册7个组件工厂
  private shouldUpdate(): boolean                          // 300ms更新频率控制
}
```

### 核心功能
1. **组件注册**: 初始化ComponentRegistry，注册7个组件工厂
2. **存储初始化**: 调用`initializeStorage()`设置项目ID
3. **终端检测**: 使用`detect()`获取终端能力
4. **渲染控制**: 协调组件渲染和主题渲染器
5. **缓存管理**: 300ms更新间隔，可通过options控制

### 生成流程
```typescript
async generate(inputData: InputData): Promise<string> {
  // 1. 初始化存储系统(如果有transcriptPath)
  if (inputData.transcriptPath) {
    projectResolver.setProjectIdFromTranscript(inputData.transcriptPath);
    await initializeStorage(projectId);
  }

  // 2. 检测终端能力
  const capabilities = detect(config.style?.enable_colors, ...);
  
  // 3. 应用主题特性和预设
  const themeEngine = new ThemeEngine();
  const enhancedConfig = themeEngine.applyThemeFeatures(config);
  
  // 4. 渲染组件
  const componentResults = await this.renderComponents(context);
  
  // 5. 应用主题渲染器
  const themeRenderer = createThemeRenderer(config.theme, capabilities);
  return themeRenderer.render(componentResults, context);
}
```

### 组件注册 (generator.ts:56)
```typescript
private initializeComponents(): void {
  this.componentRegistry.register('fake', new FakeComponentFactory());
  this.componentRegistry.register('project', new ProjectComponentFactory());
  this.componentRegistry.register('model', new ModelComponentFactory());
  this.componentRegistry.register('branch', new BranchComponentFactory());
  this.componentRegistry.register('tokens', new TokensComponentFactory());
  this.componentRegistry.register('usage', new UsageComponentFactory());
  this.componentRegistry.register('status', new StatusComponentFactory());
}
```

## Parser模块 (parser.ts)

### 主要功能
- 解析Claude Code输入数据
- 解析配置字符串和预设
- 数据格式转换和验证
- 错误处理和默认值

### 关键解析器
```typescript
// 解析输入数据
parseInputData(rawData: string): InputData
// 解析预设配置
parsePreset(presetString: string): ComponentsConfig
// 解析模型信息
parseModelInfo(modelData: any): ModelInfo
```

## MultiLineRenderer类 🆕 (multi-line-renderer.ts:23)

### 主要接口
```typescript
class MultiLineRenderer {
  constructor(config: Config, configBaseDir?: string)
  renderExtensionLines(context: RenderContext): Promise<MultiLineRenderResult>
  private renderComponentWidgets(): Promise<WidgetRenderResult[]>   // 渲染组件Widget
}
```

### 核心功能
1. **配置加载**: 从指定目录动态加载组件配置文件
2. **Widget管理**: 创建和管理Widget实例
3. **网格渲染**: 使用GridSystem进行二维布局
4. **错误处理**: 独立的Widget渲染错误处理
5. **条件控制**: 通过multiline.enabled控制整个系统

### 渲染流程
```typescript
async renderExtensionLines(): Promise<MultiLineRenderResult> {
  // 1. 检查multiline.enabled配置
  if (!this.multilineConfig.enabled) return { success: true, lines: [] };
  
  // 2. 获取启用组件列表，仅加载启用的组件配置
  const enabledComponents = this.config.components?.order?.filter(...);
  
  // 3. 动态加载组件配置文件
  const componentConfigs = await ComponentConfigLoader.loadAllComponentConfigs(
    this.configBaseDir, enabledComponents
  );
  
  // 4. 渲染所有Widget到网格
  for (const [componentName, componentConfig] of componentConfigs) {
    const widgetResults = await this.renderComponentWidgets(...);
  }
  
  // 5. 生成最终行数组
  return this.gridSystem.generateLines();
}
```

## GridSystem类 🆕 (grid-system.ts:15)

### 主要接口  
```typescript
class GridSystem {
  constructor(config: MultilineConfig)
  placeWidget(row: number, col: number, content: string): void     // 放置Widget
  clear(): void                                                    // 清空网格
  generateLines(): MultiLineRenderResult                          // 生成行数组
}
```

### 核心特性
- **二维网格**: 支持任意行列的Widget布局
- **自动对齐**: 列宽自适应和内容对齐
- **空白处理**: 智能填充和空白行消除
- **行数限制**: 通过max_rows配置防止过多输出

### 网格布局算法
```typescript
generateLines(): MultiLineRenderResult {
  // 1. 计算每列的最大宽度
  const columnWidths = this.calculateColumnWidths();
  
  // 2. 按行构建，每行内容左对齐
  const lines = [];
  for (let row = 1; row <= this.maxRows; row++) {
    const rowCells = this.grid.get(row) || new Map();
    const lineParts = [];
    
    // 3. 按列顺序拼接，使用固定宽度对齐
    for (let col = 0; col < this.maxCols; col++) {
      const content = rowCells.get(col) || '';
      lineParts.push(content.padEnd(columnWidths[col]));
    }
    
    // 4. 移除行尾空白，加入行数组
    const line = lineParts.join('').trimEnd();
    if (line.length > 0) lines.push(line);
  }
  
  return { success: true, lines };
}
```

## 使用方式
```typescript
import { StatuslineGenerator } from '../core/generator.js';

const config = await configLoader.load();
const generator = new StatuslineGenerator(config);
const result = await generator.generate(inputData);
console.log(result);
```

## 重要特性
- **更新频率控制**: 默认300ms间隔，避免频繁渲染
- **异步支持**: generate方法异步，支持Storage和Git操作
- **错误处理**: 组件渲染失败时优雅降级
- **缓存优化**: 配合Git缓存系统，提升性能
- **主题集成**: 自动应用主题特性和渲染器