# Git模块

## 核心文件
- `service.ts` - GitService类，主要Git操作接口 (1153行)
- `secure-executor.ts` - 安全Git命令执行器 (368行)
- `types.ts` - Git数据类型定义 (311行)
- `cache.ts` - 内存缓存系统 (271行)
- `index.ts` - 模块导出 (163行)

## GitService类 (service.ts:39)

### 主要接口
```typescript
class GitService {
  constructor(config?: GitServiceConfig)
  getGitInfo(options?: GitQueryOptions): Promise<GitInfo>      // 获取完整Git信息
  getBranchInfo(options?: GitQueryOptions): Promise<GitBranchInfo> // 获取分支信息
  getRepoStatus(repoPath?: string): Promise<GitStatus>        // 获取仓库状态
  isGitRepository(path?: string): Promise<boolean>            // 检查是否Git仓库
  getCurrentBranch(repoPath?: string): Promise<string | null> // 获取当前分支
}
```

### 支持的Git操作
- 分支信息查询（当前、远程、状态）
- 仓库状态检测（clean、dirty、staged等）
- 提交信息获取（ahead、behind计数）
- 标签和版本信息
- Git版本检测和兼容性处理

## 缓存系统 (cache.ts)

### 缓存机制
```typescript
class GitCache {
  private cache = new Map<string, CacheEntry>()
  private readonly ttl: number = 5000                         // 5秒TTL
  
  get<T>(key: string): T | null                              // 获取缓存
  set<T>(key: string, value: T): void                        // 设置缓存
  clear(): void                                              // 清空缓存
  private isExpired(entry: CacheEntry): boolean              // 检查过期
}
```

### 缓存策略
- **TTL机制**: 默认5秒过期时间
- **内存存储**: 高性能Map结构
- **自动清理**: 过期条目自动清理
- **可配置**: 通过config控制启用/禁用

## 安全执行器 (secure-executor.ts)

### 安全特性
```typescript
class SecureGitExecutor {
  execute(command: string, args: string[], options?: ExecOptions): Promise<string>
  private validateCommand(command: string): boolean          // 命令白名单验证
  private sanitizeArgs(args: string[]): string[]            // 参数清理和验证
  private validatePath(path: string): boolean               // 路径安全检查
}
```

### 安全措施
- **命令白名单**: 只允许预定义的Git命令
- **参数过滤**: 严格过滤危险参数和路径遍历
- **路径验证**: 防止目录遍历攻击
- **错误处理**: 安全的错误信息返回

## Git数据类型 (types.ts)

### 核心类型
```typescript
interface GitInfo {
  isGitRepository: boolean
  currentBranch: string | null
  status: GitStatus
  remotes: GitRemoteInfo[]
  version: string | null
}

interface GitBranchInfo {
  current: string | null
  all: string[]
  remote: string[]
  upstream?: string
  ahead?: number
  behind?: number
}

interface GitStatus {
  isClean: boolean
  staged: string[]
  unstaged: string[]
  untracked: string[]
  conflicted: string[]
}
```

## 使用方式
```typescript
import { gitService } from '../git/index.js';

// 检查Git仓库
const isRepo = await gitService.isGitRepository();

// 获取分支信息
const branchInfo = await gitService.getBranchInfo();
console.log(`当前分支: ${branchInfo.current}`);

// 获取完整Git信息
const gitInfo = await gitService.getGitInfo({
  includeStatus: true,
  includeRemotes: true
});
```

## 性能优化
- **缓存优先**: 所有Git操作都经过缓存层
- **批量查询**: 一次调用获取多种信息
- **异步执行**: 所有操作都是异步的
- **错误容忍**: Git操作失败不影响其他组件

## Branch组件集成
Branch组件 (src/components/branch.ts:142) 是Git模块的主要使用者：
- 使用`gitService.getBranchInfo()`获取分支信息
- 支持缓存配置，默认5秒TTL
- 处理Git仓库不存在的降级情况
- 显示分支状态：clean、dirty、ahead、behind等