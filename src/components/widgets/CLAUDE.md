# Widget系统

## 核心文件
- `base-widget.ts` - BaseWidget抽象基类，所有Widget的父类 (367行)
- `api-widget.ts` - ApiWidget类，API数据获取和显示 (274行)  
- `static-widget.ts` - StaticWidget类，静态内容显示 (47行)
- `widget-factory.ts` - WidgetFactory类，Widget工厂模式实现 (94行)

## BaseWidget基类 (base-widget.ts:23)

### 核心接口
```typescript
abstract class BaseWidget {
  abstract renderContent(context: RenderContext): Promise<string | null>
  render(context: RenderContext): Promise<WidgetRenderResult>      // 主要渲染接口
  protected selectIcon(): string                                   // 三级图标选择逻辑
  protected renderTemplate(template: string, data: any): string    // 模板渲染
  private evaluateDetection(detection: any): boolean              // Detection规则评估
}
```

### Detection系统
Widget支持基于环境变量的自动检测：
```typescript
// 三种匹配模式
detection: {
  env: "ANTHROPIC_BASE_URL",
  equals: "https://api.example.com",        // 精确匹配
  contains: "example.com",                  // 包含匹配  
  pattern: ".*\\.example\\.(com|org)$"     // 正则表达式匹配
}
```

### Force控制系统
优先级控制机制：
- `force: true` - 强制启用，忽略detection
- `force: false` - 强制禁用
- 未设置 - 使用detection规则

### 模板系统增强功能
- **嵌套数据访问**: 支持 `{other.field}` 语法，自动解析JSON字符串
- **数学表达式**: 支持 `{quota / 500000:.2f}` 计算和格式化  
- **美元符号转义**: 在TOML中使用 `\\$` 显示美元符号
- **环境变量替换**: 配置中的 `${VAR_NAME}` 自动替换

## ApiWidget类 (api-widget.ts:21)

### 主要功能
```typescript
class ApiWidget extends BaseWidget {
  protected async renderContent(context: RenderContext): Promise<string | null>
  private async fetchApiData(): Promise<any>                      // HTTP请求处理
  private wrapDataForTemplate(data: any): any                     // 数据包装
  private extractDataByPath(data: any, path: string): any        // JSONPath提取
}
```

### API配置支持
```toml
[widgets.example.api]
base_url = "https://api.example.com"
endpoint = "/data"
method = "GET"
timeout = 5000
data_path = "$.result"

[widgets.example.api.headers]
"Authorization" = "Bearer ${API_TOKEN}"
"Content-Type" = "application/json"
```

### 数据提取机制
- **JSONPath支持**: 使用 `$.field.nested` 语法提取数据
- **错误处理**: 网络超时、解析错误的优雅降级
- **缓存机制**: 避免频繁API调用

## StaticWidget类 (static-widget.ts:13)

### 简单接口
```typescript
class StaticWidget extends BaseWidget {
  protected async renderContent(): Promise<string | null>
}
```

用于显示静态文本内容，支持图标和Detection系统。

## WidgetFactory类 (widget-factory.ts:13)

### 工厂模式实现
```typescript
class WidgetFactory {
  static create(config: WidgetConfig, capabilities: TerminalCapabilities): BaseWidget
}
```

根据配置中的 `type` 字段自动创建对应的Widget实例：
- `type: "static"` → StaticWidget
- `type: "api"` → ApiWidget

## 开发指南

### 添加新Widget类型
1. 继承 `BaseWidget` 类
2. 实现 `renderContent()` 方法  
3. 在 `WidgetFactory.create()` 中注册新类型
4. 更新配置Schema支持新的type值

### 配置Widget
```toml
[widgets.widget_name]
enabled = true
type = "api"                    # 或 "static"
row = 1                         # 网格行位置
col = 0                         # 网格列位置
nerd_icon = "\\uf085"           # Nerd Font图标
emoji_icon = "⚙️"              # Emoji图标  
text_icon = "[W]"               # 文本图标
template = "Value: {field}"     # 模板字符串

# 可选：Detection规则
[widgets.widget_name.detection]
env = "ENV_VAR"
contains = "value"

# API类型专用配置
[widgets.widget_name.api]
base_url = "https://api.example.com"
endpoint = "/endpoint"
method = "GET"
data_path = "$.data"
```

### 最佳实践
- 使用Detection系统实现智能启用
- 配置合理的API超时时间
- 为网络错误提供优雅降级
- 使用Force控制进行调试和测试