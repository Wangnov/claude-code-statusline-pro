# 存储模块

## 核心文件
- `manager.ts` - StorageManager类，主要存储管理接口 (372行)
- `session-tracker.ts` - SessionTracker类，JSONL解析和会话链分析 (280行) 
- `types.ts` - 存储系统数据类型定义 (93行)
- `index.ts` - 模块导出和便捷API (68行)

## StorageManager类 (manager.ts:12)

### 主要接口
```typescript
class StorageManager {
  constructor(config?: Partial<StorageConfig>, projectId?: string)
  async updateSessionCost(inputData: any): Promise<void>           // 更新会话成本
  async getSessionCost(sessionId: string): Promise<number>         // 获取单会话成本
  async getConversationCost(sessionId: string): Promise<ConversationCost> // 获取对话级成本
  async cleanupOldSessions(): Promise<void>                        // 清理旧数据
  updateProjectId(projectId: string): void                         // 更新项目ID
}
```

### 核心功能
1. **成本持久化**: 保存会话成本到`~/.claude/projects/项目ID/statusline-pro/sessions/`
2. **会话链追踪**: 通过`parentSessionId`和JSONL解析建立会话关系
3. **路径管理**: 使用统一的`projectResolver.hashPath()`生成项目ID
4. **自动清理**: 根据配置清理过期会话数据 (默认30天)

### 存储路径结构
```
~/.claude/
├── statusline-pro/config.toml                    # 用户级配置
└── projects/{项目ID}/statusline-pro/
    ├── config.toml                               # 项目级配置
    └── sessions/                                 # 会话数据
        ├── session-id-1.json                    # 会话成本文件
        └── session-id-2.json
```

## SessionTracker类 (session-tracker.ts:60)

### 主要接口
```typescript
class SessionTracker {
  async parseSessionChain(sessionId: string): Promise<SessionChainInfo | null>
  async getCompleteConversationChain(sessionId: string): Promise<SessionChainInfo>
  calculateTokenCost(tokenUsage: TokenUsage, modelId: string): number
}
```

### 功能特点
- **JSONL解析**: 解析Claude Code原生会话记录文件
- **Token统计**: 提取输入/输出/缓存Token使用量
- **成本计算**: 根据模型定价计算Token成本
- **会话链重建**: 递归追踪完整对话链关系

## 存储数据类型 (types.ts)

### 核心类型
```typescript
interface SessionCost {
  sessionId: string
  parentSessionId?: string
  projectPath: string
  totalCostUsd: number
  inputTokens: number
  outputTokens: number
  linesAdded: number
  linesRemoved: number
  startTime: string
  lastUpdateTime: string
  model?: { id: string; displayName: string }
}

interface ConversationCost {
  sessionIds: string[]
  totalCostUsd: number
  totalInputTokens: number
  totalOutputTokens: number
  sessionCount: number
  startTime: string
  lastUpdateTime: string
}
```

## 便捷API (index.ts)

### 公共接口
```typescript
// 初始化存储系统
async function initializeStorage(projectId?: string): Promise<void>

// 获取成本显示
async function getSessionCostDisplay(sessionId: string): Promise<number>
async function getConversationCostDisplay(sessionId: string): Promise<{cost: number, sessionCount: number}>

// 更新成本数据
async function updateCostFromInput(inputData: any): Promise<void>
```

## 使用方式
```typescript
import { storageManager, initializeStorage, updateCostFromInput } from '../storage/index.js';

// 初始化存储系统
await initializeStorage(projectId);

// 更新成本数据
await updateCostFromInput(inputData);

// 获取单会话成本
const cost = await storageManager.getSessionCost(sessionId);

// 获取对话级成本
const conversation = await storageManager.getConversationCost(sessionId);
```

## 重要特性
- **双重数据源**: 结合自维护JSON文件和Claude Code原生JSONL文件
- **会话链追踪**: 支持跨会话对话成本累加显示
- **异步操作**: 所有存储操作都是异步的，Usage组件必须await
- **自动清理**: 防止存储无限增长，可配置清理策略
- **项目隔离**: 每个项目独立的存储空间和配置

## 集成点
- **Usage组件** (`src/components/usage.ts:155`) 是主要使用者
- **ProjectResolver** (`src/utils/project-resolver.ts`) 提供统一的项目ID生成
- **ConfigLoader** (`src/config/loader.ts`) 提供存储配置加载

## 重要注意事项
- **异步完整性**: 存储操作必须等待完成，避免数据丢失
- **路径哈希一致性**: 必须使用`projectResolver.hashPath()`
- **错误处理**: 文件操作失败应优雅降级，不影响主功能