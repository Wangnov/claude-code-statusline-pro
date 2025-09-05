# 配置模块

## 核心文件
- `schema.ts` - Zod配置Schema定义，运行时类型验证
- `loader.ts` - TOML配置文件加载器，支持分层配置

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

## 开发注意事项
- 修改Schema后必须更新模板文件
- 新增配置项需要提供默认值
- 配置加载是异步操作，需要await
- 项目ID通过 `projectResolver.hashPath()` 生成