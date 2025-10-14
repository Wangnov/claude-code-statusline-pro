# Claude API 定价和使用统计官方知识库

**文档创建时间**: 2025年08月14日 21:29:28  
**数据来源**: Anthropic 官方文档  
**最后更新**: 2025年1月

## 1. 当前Claude模型和定价 | Current Claude Models and Pricing

### 可用模型 | Available Models
- **Claude Opus 4.1** (最新版本 | Latest)
- **Claude Opus 4** 
- **Claude Sonnet 4**
- **Claude Sonnet 3.7**
- **Claude Haiku 3.5**
- **Claude Haiku 3**

### 定价结构 | Pricing Structure (USD per Million Tokens)

| 模型系列 | Input Tokens | Output Tokens |
|---------|-------------|---------------|
| **Opus系列** | $15/M | $75/M |
| **Sonnet系列** | $3/M | $15/M |
| **Haiku系列** | $0.25-$0.80/M | $1.25-$4/M |

### 详细模型定价映射 | Detailed Model Pricing Map
Model	Base Input Tokens	5m Cache Writes	1h Cache Writes	Cache Hits & Refreshes	Output Tokens
Claude Opus 4.1	$15 / MTok	$18.75 / MTok	$30 / MTok	$1.50 / MTok	$75 / MTok
Claude Opus 4	$15 / MTok	$18.75 / MTok	$30 / MTok	$1.50 / MTok	$75 / MTok
Claude Sonnet 4	$3 / MTok	$3.75 / MTok	$6 / MTok	$0.30 / MTok	$15 / MTok
Claude Sonnet 3.7	$3 / MTok	$3.75 / MTok	$6 / MTok	$0.30 / MTok	$15 / MTok
Claude Sonnet 3.5 (deprecated)	$3 / MTok	$3.75 / MTok	$6 / MTok	$0.30 / MTok	$15 / MTok
Claude Haiku 3.5	$0.80 / MTok	$1 / MTok	$1.6 / MTok	$0.08 / MTok	$4 / MTok
Claude Opus 3 (deprecated)	$15 / MTok	$18.75 / MTok	$30 / MTok	$1.50 / MTok	$75 / MTok
Claude Haiku 3	$0.25 / MTok	$0.30 / MTok	$0.50 / MTok	$0.03 / MTok	$1.25 / MTok

## 2. Cache Token 定价规则 | Cache Token Pricing Rules

| Cache类型 | 价格倍数 | 说明 |
|----------|---------|------|
| **5分钟缓存写入** | 1.25x基础价格 | 短期缓存创建成本 |
| **1小时缓存写入** | 2x基础价格 | 长期缓存创建成本 |
| **缓存命中/刷新** | 0.1x基础价格 | 90%的成本节省 |

## 3. Claude Code 使用统计 | Claude Code Usage Statistics

### 3.1 官方Usage字段结构 | Official Usage Fields
```javascript
{
  "input_tokens": number,                    // 输入token数
  "output_tokens": number,                   // 输出token数  
  "cache_creation_input_tokens": number,     // 缓存创建token数
  "cache_read_input_tokens": number,         // 缓存读取token数
  "service_tier": "standard"                 // 服务级别
}
```

### 3.2 成本计算公式 | Cost Calculation Formula
```javascript
// 标准成本计算公式 | Standard Cost Calculation
totalCost = (input_tokens / 1000000) * inputPrice + 
           (output_tokens / 1000000) * outputPrice +
           (cache_creation_input_tokens / 1000000) * (inputPrice * 1.25) +
           (cache_read_input_tokens / 1000000) * (inputPrice * 0.1);
```

### 3.3 Claude Code 官方定价参考 | Claude Code Official Pricing Reference
- **平均成本**: $6/开发者/天
- **90%用户**: 日成本低于$12
- **团队使用**: $100-200/开发者/月 (Sonnet 4)

## 4. Transcript文件格式 | Transcript File Format

### 4.1 存储位置 | Storage Location
- **路径**: `~/.claude/projects/`
- **格式**: JSONL (每行一个JSON对象)

### 4.2 消息结构示例 | Message Structure Example
```json
{
  "parentUuid": null,
  "isSidechain": false,
  "userType": "external",
  "cwd": "/Users/username/projects/project-name",
  "sessionId": "eb5b0174-0555-4601-804e-672d68069c89",
  "version": "1.0.58",
  "gitBranch": "",
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": "响应内容",
    "usage": {
      "input_tokens": 1024,
      "output_tokens": 512,
      "cache_creation_input_tokens": 256,
      "cache_read_input_tokens": 128
    }
  },
  "uuid": "b4575262-5ecc-4188-abe3-82c4eef91120",
  "timestamp": "2025-08-14T13:29:28.000Z"
}
```

## 5. 官方监控机制 | Official Monitoring Mechanisms

### 5.1 OpenTelemetry 集成 | OpenTelemetry Integration
```javascript
// 关键指标 | Key Metrics
{
  "claude_code.token.usage": number,    // Token使用量
  "claude_code.cost.usage": number,     // 成本统计
  "claude_code.session.count": number   // 会话计数
}
```

### 5.2 监控属性 | Monitoring Attributes
- `session.id`: 会话ID
- `app.version`: 应用版本
- `organization.id`: 组织ID
- `user.account_uuid`: 用户账户UUID
- `terminal.type`: 终端类型

## 6. 官方建议和最佳实践 | Official Recommendations and Best Practices

### 6.1 成本控制命令 | Cost Control Commands
- **`/cost`**: 查看当前会话使用情况
- **`/compact`**: 管理上下文减少token消耗

### 6.2 成本优化策略 | Cost Optimization Strategies
1. **编写具体查询**: 避免模糊请求
2. **分解复杂任务**: 减少单次token消耗
3. **清理对话历史**: 定期重置上下文
4. **使用缓存**: 利用prompt caching节省成本

---

**注意**: 此文档基于2025年1月的官方信息，价格和功能可能会发生变化，请以Anthropic官方文档为准。