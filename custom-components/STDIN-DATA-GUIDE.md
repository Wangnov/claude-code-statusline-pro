# 📊 Statusline STDIN 数据指南

基于 Claude Code 官方文档，statusline 通过 stdin 接收丰富的上下文数据。了解这些数据可以帮助你开发更强大的自定义组件。

## 🔍 完整的 STDIN JSON 结构

根据官方文档，Claude Code 会向 statusline 发送以下 JSON 数据：

```json
{
  "hook_event_name": "Status",
  "session_id": "unique-session-identifier",
  "transcript_path": "/path/to/transcript/file",
  "cwd": "/current/working/directory",
  "model": {
    "id": "claude-opus-4-1",
    "display_name": "Opus"
  },
  "workspace": {
    "current_dir": "/current/directory/path",
    "project_dir": "/original/project/directory"
  },
  "version": "claude-code-version",
  "output_style": {
    "name": "default"
  },
  "cost": {
    "total_cost_usd": 0.01234,
    "total_duration_ms": 45000,
    "total_api_duration_ms": 2300,
    "total_lines_added": 156,
    "total_lines_removed": 23
  }
}
```

## 📝 字段详解

### 🔑 基础字段

| 字段 | 类型 | 说明 | 组件应用示例 |
|------|------|------|------------|
| `hook_event_name` | string | 事件名称，通常为 "Status" | 可用于区分不同事件类型 |
| `session_id` | string | 会话唯一标识符 | 追踪会话、存储会话数据 |
| `transcript_path` | string | 会话记录文件路径 | 读取历史对话、分析交互模式 |
| `cwd` | string | 当前工作目录 | 显示路径、文件系统操作 |
| `version` | string | Claude Code 版本 | 版本兼容性检查 |

### 🤖 模型信息 (model)

| 字段 | 类型 | 说明 | 组件应用示例 |
|------|------|------|------------|
| `model.id` | string | 模型完整ID | 识别具体模型版本 |
| `model.display_name` | string | 模型显示名称 | 友好的模型名显示 |

### 📁 工作区信息 (workspace)

| 字段 | 类型 | 说明 | 组件应用示例 |
|------|------|------|------------|
| `workspace.current_dir` | string | 当前目录路径 | 显示当前位置 |
| `workspace.project_dir` | string | 项目根目录 | 项目名提取、配置查找 |

### 💰 成本与性能 (cost)

| 字段 | 类型 | 说明 | 组件应用示例 |
|------|------|------|------------|
| `cost.total_cost_usd` | number | 总成本（美元） | 成本追踪组件 |
| `cost.total_duration_ms` | number | 总耗时（毫秒） | 性能监控组件 |
| `cost.total_api_duration_ms` | number | API调用耗时 | API性能分析 |
| `cost.total_lines_added` | number | 添加的代码行数 | 代码统计组件 |
| `cost.total_lines_removed` | number | 删除的代码行数 | 代码变更追踪 |

### 🎨 输出样式 (output_style)

| 字段 | 类型 | 说明 | 组件应用示例 |
|------|------|------|------------|
| `output_style.name` | string | 输出样式名称 | 根据样式调整显示 |

## 💡 自定义组件开发创意

基于这些数据，你可以开发各种实用组件：

### 1. 📈 会话统计组件
```typescript
export class SessionStatsComponent extends BaseComponent {
  protected renderContent(context: RenderContext): string | null {
    const { inputData } = context;
    const sessionId = inputData.sessionId;
    
    // 统计本次会话的交互次数
    const interactionCount = this.getSessionInteractionCount(sessionId);
    
    return this.formatOutput(`Session: ${interactionCount} interactions`);
  }
}
```

### 2. 💵 成本追踪组件
```typescript
export class CostTrackerComponent extends BaseComponent {
  protected renderContent(context: RenderContext): string | null {
    const { inputData } = context;
    const cost = inputData.cost?.total_cost_usd || 0;
    
    // 显示当前会话成本
    const costDisplay = `$${cost.toFixed(4)}`;
    
    // 根据成本改变颜色
    const color = cost > 1 ? 'red' : cost > 0.1 ? 'yellow' : 'green';
    
    return this.colorize(
      this.formatOutput(costDisplay),
      color
    );
  }
}
```

### 3. 📊 代码变更统计组件
```typescript
export class CodeChangesComponent extends BaseComponent {
  protected renderContent(context: RenderContext): string | null {
    const { inputData } = context;
    const added = inputData.cost?.total_lines_added || 0;
    const removed = inputData.cost?.total_lines_removed || 0;
    
    const changeDisplay = `+${added}/-${removed}`;
    
    return this.formatOutput(changeDisplay);
  }
}
```

### 4. ⚡ API性能监控组件
```typescript
export class APIPerformanceComponent extends BaseComponent {
  protected renderContent(context: RenderContext): string | null {
    const { inputData } = context;
    const apiDuration = inputData.cost?.total_api_duration_ms || 0;
    const totalDuration = inputData.cost?.total_duration_ms || 0;
    
    // 计算API占比
    const apiPercent = totalDuration > 0 
      ? ((apiDuration / totalDuration) * 100).toFixed(1)
      : '0';
    
    return this.formatOutput(`API: ${apiPercent}%`);
  }
}
```

### 5. 📝 Transcript 分析组件
```typescript
export class TranscriptAnalyzerComponent extends BaseComponent {
  protected async renderContent(context: RenderContext): Promise<string | null> {
    const { inputData } = context;
    const transcriptPath = inputData.transcriptPath;
    
    if (!transcriptPath) return null;
    
    // 读取和分析transcript文件
    const analysis = await this.analyzeTranscript(transcriptPath);
    
    return this.formatOutput(`${analysis.totalTurns} turns`);
  }
  
  private async analyzeTranscript(path: string) {
    // 实现transcript分析逻辑
    // 可以统计：对话轮次、工具使用次数、错误次数等
    return { totalTurns: 10 };
  }
}
```

### 6. 🔄 会话时长组件
```typescript
export class SessionDurationComponent extends BaseComponent {
  private sessionStartTimes = new Map<string, number>();
  
  protected renderContent(context: RenderContext): string | null {
    const { inputData } = context;
    const sessionId = inputData.sessionId;
    
    if (!sessionId) return null;
    
    // 记录或更新会话开始时间
    if (!this.sessionStartTimes.has(sessionId)) {
      this.sessionStartTimes.set(sessionId, Date.now());
    }
    
    // 计算会话持续时间
    const startTime = this.sessionStartTimes.get(sessionId)!;
    const duration = Date.now() - startTime;
    const minutes = Math.floor(duration / 60000);
    
    return this.formatOutput(`${minutes}min`);
  }
}
```

### 7. 🎯 项目路径组件
```typescript
export class ProjectPathComponent extends BaseComponent {
  protected renderContent(context: RenderContext): string | null {
    const { inputData } = context;
    const projectDir = inputData.workspace?.project_dir;
    const currentDir = inputData.workspace?.current_dir;
    
    if (!projectDir || !currentDir) return null;
    
    // 计算相对路径
    const relativePath = path.relative(projectDir, currentDir);
    const display = relativePath || '.';
    
    return this.formatOutput(display);
  }
}
```

### 8. 📦 模型版本追踪组件
```typescript
export class ModelVersionComponent extends BaseComponent {
  protected renderContent(context: RenderContext): string | null {
    const { inputData } = context;
    const modelId = inputData.model?.id;
    const version = inputData.version;
    
    // 显示模型和Claude Code版本
    const versionInfo = `${modelId?.split('-').pop() || '?'} | ${version || '?'}`;
    
    return this.formatOutput(versionInfo);
  }
}
```

## 🛠️ 访问数据的最佳实践

### 1. 使用类型安全访问
```typescript
// 良好的做法
const cost = inputData.cost?.total_cost_usd || 0;
const sessionId = inputData.sessionId || 'unknown';

// 避免
const cost = inputData.cost.total_cost_usd; // 可能报错
```

### 2. 提供默认值
```typescript
protected renderContent(context: RenderContext): string | null {
  const { inputData } = context;
  
  // 总是提供合理的默认值
  const added = inputData.cost?.total_lines_added ?? 0;
  const removed = inputData.cost?.total_lines_removed ?? 0;
  
  // ...
}
```

### 3. 验证数据有效性
```typescript
protected renderContent(context: RenderContext): string | null {
  const { inputData } = context;
  
  // 验证必需字段
  if (!inputData.sessionId) {
    return null; // 隐藏组件
  }
  
  // ...
}
```

### 4. 缓存计算结果
```typescript
export class ExpensiveComponent extends BaseComponent {
  private cache = new Map<string, any>();
  
  protected renderContent(context: RenderContext): string | null {
    const { inputData } = context;
    const cacheKey = `${inputData.sessionId}-${inputData.cost?.total_cost_usd}`;
    
    // 使用缓存避免重复计算
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const result = this.computeExpensiveOperation(inputData);
    this.cache.set(cacheKey, result);
    
    return result;
  }
}
```

## 📚 数据流程图

```
Claude Code
    ↓
[生成 JSON 数据]
    ↓
stdin (JSON)
    ↓
Statusline Script
    ↓
[解析 JSON]
    ↓
组件系统
    ↓
[各组件访问 inputData]
    ↓
渲染输出
```

## 🔗 相关资源

- [官方文档](https://docs.anthropic.com/en/docs/claude-code/statusline)
- [组件开发指南](./DEVELOPMENT.md)
- [时钟组件示例](./examples/clock/)

## 💬 常见问题

### Q: 某些字段可能不存在怎么办？
A: 使用可选链操作符 (`?.`) 和空值合并操作符 (`??`) 提供默认值。

### Q: 如何存储跨会话的数据？
A: 可以使用文件系统或内存缓存，以 `session_id` 作为键。

### Q: transcript_path 文件格式是什么？
A: 这是Claude Code的会话记录文件，可以读取并解析以获取更多上下文。

### Q: cost 数据多久更新一次？
A: 每次状态行刷新时都会更新，包含最新的累计值。

---

*文档创建日期: 2025-09-04*  
*基于 Claude Code 官方文档*