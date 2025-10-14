# 技术实现细节

## 🏗️ 核心架构

### SchemaReflector - Schema反射引擎
```typescript
// src/cli/core/schema-reflector.ts (~150行)
import { z } from 'zod'
import { ConfigSchema } from '../../../config/schema.js'

export interface ConfigNode {
  path: string          // "components.branch.status.show_dirty"
  key: string           // "show_dirty"  
  type: ZodType         // z.boolean(), z.string(), etc.
  defaultValue: unknown
  description: string
  category: string
  isRequired: boolean
  children?: ConfigNode[]
}

export class SchemaReflector {
  private i18n: I18nManager

  generateConfigTree(schema: z.ZodObject): ConfigNode[] {
    return this.walkSchema(schema, '')
  }

  private walkSchema(schema: z.ZodType, basePath: string): ConfigNode[] {
    // 递归遍历Zod Schema
    // 生成完整配置树结构
    // 提取类型、默认值、验证规则
  }

  private getDescription(path: string): string {
    // 基于路径生成中英双语描述
    return this.i18n.t(`config.${path}`)
  }
}
```

### ReactiveConfigManager - 响应式配置
```typescript
// src/cli/core/reactive-config.ts (~120行)
import type { Config } from '../../../config/schema.js'

type ConfigChangeListener = (path: string, value: unknown) => void

export class ReactiveConfigManager {
  private config: Config
  private listeners = new Set<ConfigChangeListener>()
  private dirty = new Set<string>() // 跟踪修改项

  constructor(initialConfig: Config) {
    this.config = { ...initialConfig }
  }

  updateConfig(path: string, value: unknown): void {
    this.setNestedValue(this.config, path, value)
    this.dirty.add(path)
    this.notifyListeners(path, value)
  }

  getConfig(): Config {
    return { ...this.config }
  }

  isDirty(path?: string): boolean {
    return path ? this.dirty.has(path) : this.dirty.size > 0
  }

  getDirtyCount(): number {
    return this.dirty.size
  }

  markClean(): void {
    this.dirty.clear()
  }

  onChange(listener: ConfigChangeListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private setNestedValue(obj: any, path: string, value: unknown): void {
    // 基于路径设置嵌套值 "a.b.c" -> obj.a.b.c = value
  }

  private notifyListeners(path: string, value: unknown): void {
    this.listeners.forEach(listener => listener(path, value))
  }
}
```

### TreeRenderer - 树形UI渲染
```typescript
// src/cli/core/tree-renderer.ts (~200行)
import { select, confirm, input } from '@inquirer/prompts'
import type { ConfigNode } from './schema-reflector.js'

export interface UIState {
  selectedPath: string
  expandedPaths: Set<string>
  language: 'zh' | 'en'
  showHelp: boolean
}

export class TreeRenderer {
  private state: UIState
  private configManager: ReactiveConfigManager
  private i18n: I18nManager

  constructor(configManager: ReactiveConfigManager) {
    this.configManager = configManager
    this.state = {
      selectedPath: '',
      expandedPaths: new Set(['components']),
      language: 'zh',
      showHelp: false
    }

    // 监听配置变更，触发预览更新
    this.configManager.onChange((path, value) => {
      this.updatePreview()
    })
  }

  async renderMainUI(configTree: ConfigNode[]): Promise<void> {
    while (true) {
      console.clear()
      this.renderPreviewBar()
      this.renderTwoColumnLayout(configTree)
      this.renderBottomActions()

      const action = await this.handleKeyInput()
      if (action === 'exit') break
    }
  }

  private renderPreviewBar(): void {
    const config = this.configManager.getConfig()
    const generator = new StatuslineGenerator(config)
    const preview = generator.generate(mockData) // 使用Mock数据
    
    const langButton = this.state.language === 'zh' ? '[ 中文 ]' : '[ English ]'
    console.log(`┌─── ${this.t('preview.title')} ─── ${langButton} ┐`)
    console.log(`│ ${this.t('preview.label')}: ${preview}`)
    console.log(`└${'─'.repeat(60)}┘`)
  }

  private renderTwoColumnLayout(configTree: ConfigNode[]): void {
    const leftPanel = this.renderLeftPanel(configTree)
    const rightPanel = this.renderRightPanel()
    
    // 并排显示左右面板
    this.combinePanels(leftPanel, rightPanel)
  }

  private renderLeftPanel(configTree: ConfigNode[]): string[] {
    // 渲染左侧树形菜单
    return this.renderTreeNodes(configTree, 0)
  }

  private renderRightPanel(): string[] {
    // 渲染右侧配置编辑区
    const selectedNode = this.findNodeByPath(this.state.selectedPath)
    if (!selectedNode) return []

    return this.renderConfigEditor(selectedNode)
  }

  private async handleKeyInput(): Promise<string> {
    // 处理键盘输入：↑↓←→ Tab Space Enter L Ctrl+S等
  }

  private t(key: string): string {
    return this.i18n.t(key, { lng: this.state.language })
  }
}
```

### UnifiedCLI - 统一CLI入口
```typescript
// src/cli/core/unified-cli.ts (~180行)
import { Command } from 'commander'
import { ConfigLoader } from '../../../config/loader.js'

export class UnifiedConfigCLI {
  private configLoader: ConfigLoader
  private reflector: SchemaReflector  
  private configManager: ReactiveConfigManager
  private renderer: TreeRenderer

  constructor() {
    this.configLoader = new ConfigLoader()
  }

  async startConfigMode(options: { configPath?: string }): Promise<void> {
    // 1. 加载配置
    const config = await this.configLoader.load(options.configPath)
    
    // 2. 初始化管理器
    this.configManager = new ReactiveConfigManager(config)
    this.reflector = new SchemaReflector()
    this.renderer = new TreeRenderer(this.configManager)

    // 3. 生成配置树
    const configTree = this.reflector.generateConfigTree(ConfigSchema)

    // 4. 启动交互界面
    await this.renderer.renderMainUI(configTree)

    // 5. 保存配置 (如果有修改)
    if (this.configManager.isDirty()) {
      const shouldSave = await confirm({
        message: this.t('save.confirm'),
        default: true
      })
      
      if (shouldSave) {
        await this.saveConfig(options.configPath)
      }
    }
  }

  private async saveConfig(configPath?: string): Promise<void> {
    const config = this.configManager.getConfig()
    await this.configLoader.save(config, configPath)
    this.configManager.markClean()
  }
}
```

## 🌐 双语支持

### 简化I18n系统
```typescript  
// src/cli/types/i18n-simple.ts (~100行)
const translations = {
  zh: {
    'preview.title': '实时预览',
    'preview.label': '预览效果',
    'config.components.project': '项目显示',
    'config.components.branch.status.show_dirty': '显示脏状态',
    'save.confirm': '是否保存修改？',
    'status.complete': '[OK]',
    'status.partial': '[!]',
    'status.missing': '[X]',
    // ... 其他中文翻译
  },
  en: {
    'preview.title': 'Live Preview', 
    'preview.label': 'Preview',
    'config.components.project': 'Project Display',
    'config.components.branch.status.show_dirty': 'Show Dirty Status',
    'save.confirm': 'Save changes?',
    'status.complete': '[OK]',
    'status.partial': '[!]',
    'status.missing': '[X]',
    // ... 其他英文翻译
  }
}

export class I18nManager {
  private currentLang: 'zh' | 'en' = 'zh'

  t(key: string, options?: { lng?: 'zh' | 'en' }): string {
    const lang = options?.lng || this.currentLang
    return translations[lang][key] || key
  }

  setLanguage(lang: 'zh' | 'en'): void {
    this.currentLang = lang
  }
}
```

## 🎯 性能优化

### 缓存和懒加载
```typescript
// 配置树生成缓存
private configTreeCache?: ConfigNode[]

generateConfigTree(): ConfigNode[] {
  if (!this.configTreeCache) {
    this.configTreeCache = this.walkSchema(ConfigSchema, '')
  }
  return this.configTreeCache
}

// UI渲染防抖
private renderDebounce = debounce(() => {
  this.updateDisplay()
}, 50)
```

### 内存管理
```typescript
// 清理监听器防止内存泄漏
class TreeRenderer {
  private cleanupListeners: (() => void)[] = []

  constructor(configManager: ReactiveConfigManager) {
    const cleanup = configManager.onChange(this.updatePreview)
    this.cleanupListeners.push(cleanup)
  }

  destroy(): void {
    this.cleanupListeners.forEach(cleanup => cleanup())
    this.cleanupListeners = []
  }
}
```

## 📝 配置文件支持

### 配置持久化
```typescript
// 保持现有ConfigLoader接口不变
await this.configLoader.load(configPath) // 加载TOML
await this.configLoader.save(config, configPath) // 保存TOML

// 新增language配置项
[general]
language = "zh"  # zh | en
```

核心技术栈保持简单：Zod + Inquirer + Commander，专注解决配置管理的核心问题！