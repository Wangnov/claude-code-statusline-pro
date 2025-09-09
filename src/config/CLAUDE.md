# 配置模块

## 核心文件
- `schema.ts` - Zod配置Schema定义，运行时类型验证
- `loader.ts` - TOML配置文件加载器，支持分层配置

## 多行配置文件 🆕
- `component-config-loader.ts` - 组件配置加载器，支持Widget配置 (277行)

## 主要接口

### ConfigLoader类 (loader.ts)
```typescript
class ConfigLoader {
  load(customPath?: string): Promise<Config>                    // 加载配置
  createDefaultConfig(path: string, theme: string): Promise<void>  // 创建默认配置
  loadConfig(options: LoadConfigOptions): Promise<Config>       // 高级加载选项
  getConfigSource(): ConfigSource                              // 获取配置来源信息
  resetToDefaults(path?: string): Promise<void>               // 重置为默认值
}
```

### 关键配置类型 (schema.ts)
```typescript
interface Config {
  preset?: string
  theme: string
  style: StyleConfig
  components: ComponentsConfig
  terminal?: TerminalConfig
}

interface ComponentsConfig {
  project: ProjectComponentConfig
  model: ModelComponentConfig
  branch: BranchComponentConfig
  tokens: TokensComponentConfig
  usage: UsageComponentConfig  
  status: StatusComponentConfig
}
```

## 配置加载优先级
1. 命令行参数 (最高)
2. 项目级配置: `./statusline.config.toml`
3. 用户级配置: `~/.claude/statusline-pro/config.toml`
4. 内置默认值 (最低)

## 配置文件位置
- **项目级**: 当前目录的 `statusline.config.toml`
- **用户级**: `~/.claude/statusline-pro/config.toml`
- **模板文件**: `configs/config.template.toml`

## Schema验证
使用Zod进行运行时验证：
- 类型安全: TypeScript类型 + 运行时验证统一
- 默认值: 每个配置项都有合理默认值
- 错误提示: 详细的验证错误信息

## ComponentConfigLoader类 🆕 (component-config-loader.ts:68)

### 主要接口
```typescript
class ComponentConfigLoader {
  static loadComponentConfig(componentName: string, baseDir?: string): Promise<ComponentConfigLoadResult>
  static loadAllComponentConfigs(baseDir?: string, enabledComponents?: string[]): Promise<Map<string, ComponentMultilineConfig>>
  static scanComponentFiles(configDir: string): Promise<string[]>
  private static processEnvironmentVariables(obj: any): any
}
```

### 核心功能
1. **动态加载**: 根据组件名动态加载对应的.toml配置文件
2. **选择性加载**: 仅加载启用组件的配置，优化性能
3. **环境变量处理**: 支持 `${VAR_NAME}` 替换和 `\\$` 转义
4. **Schema验证**: 使用Zod验证Widget配置结构
5. **错误处理**: 提供详细的加载错误信息

### 环境变量处理机制
支持两种环境变量语法：
- `${VAR_NAME}` - 标准环境变量替换
- `\\${expression}` - 转义美元符号 + 模板表达式

### 配置文件结构示例
```toml
[meta]
description = "Widget组件配置"
version = "1.0"

[widgets.widget_name]
enabled = true
type = "api"
row = 1
col = 0
nerd_icon = "\\uf085"
template = "Value: {field}"

[widgets.widget_name.detection]
env = "ENVIRONMENT_VARIABLE"
contains = "substring"

[widgets.widget_name.api]
base_url = "https://api.example.com"
endpoint = "/data"
data_path = "$.result"
```

## 开发注意事项
- 修改Schema后必须更新模板文件
- 新增配置项需要提供默认值
- 配置加载是异步操作，需要await
- 项目ID通过 `projectResolver.hashPath()` 生成