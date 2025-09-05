# 工具模块

## 核心文件
- `index.ts` - 通用工具函数集合 (730行)
- `project-resolver.ts` - 项目路径解析器，统一项目ID生成 (155行)

## 主要工具函数

### 格式化工具
```typescript
formatBytes(bytes: number): string                    // 格式化字节大小
formatNumber(num: number): string                     // 千位分隔符格式化
truncateString(str: string, maxLength: number): string // 截断字符串
formatTime(date?: Date): string                       // 格式化时间
getRelativeTime(timestamp: string | Date): string    // 相对时间
```

### 进度条生成
```typescript
generateProgressBar(percentage: number, options?: ProgressOptions): string
generateGradientProgressBar(percentage: number, length: number): string  
generateFineProgressBar(percentage: number, length: number): string
generateAdvancedProgressBar(percentage: number, config: AdvancedProgressConfig): string
```

### 颜色工具
```typescript
getRainbowGradientColor(percentage: number): string   // 彩虹渐变色
getGradientColor(percentage: number): string          // 基础渐变色  
getSimpleGradientColor(percentage: number): string    // 简单渐变色
```

### 对象操作
```typescript
deepClone<T>(obj: T): T                               // 深度克隆
deepMerge<T>(target: T, source: Partial<T>): T       // 深度合并
safeJsonParse<T>(str: string, fallback: T): T        // 安全JSON解析
```

### 性能工具
```typescript
debounce<T>(func: T, delay: number): T                // 防抖
throttle<T>(func: T, limit: number): T               // 节流
```

### 其他工具
```typescript
getProjectName(projectPath: string): string          // 提取项目名
calculatePercentage(used: number, total: number): number // 计算百分比
simplifyBranchName(branchName: string, maxLength?: number): string
getOS(): 'windows' | 'macos' | 'linux' | 'unknown'  // 系统检测
generateId(prefix?: string, length?: number): string // 生成ID
```

## ProjectResolver类 (project-resolver.ts)

**关键功能**: 统一的项目ID生成和路径解析

```typescript
class ProjectResolver {
  static getInstance(): ProjectResolver                 // 单例实例
  setProjectIdFromTranscript(transcriptPath: string): void // 从transcript设置项目ID
  getProjectId(fallbackPath?: string): string         // 获取项目ID
  hashPath(projectPath: string): string               // 路径哈希算法
  getCachedProjectId(): string | null                 // 获取缓存的项目ID
}
```

### 路径哈希算法
```typescript
// 核心算法: 替换路径分隔符为连字符
function hashPath(path: string): string {
  let result = path.replace(/[\\/:]/g, '-');  // 替换分隔符
  result = result.replace(/-+/g, '-');        // 合并连续连字符
  result = result.replace(/-+$/, '');         // 移除结尾连字符
  return result;
}
```

## 使用方式
```typescript
import { projectResolver } from '../utils/project-resolver.js';
import { formatBytes, generateProgressBar } from '../utils/index.js';

// 获取项目ID
const projectId = projectResolver.getProjectId();

// 格式化显示
const sizeStr = formatBytes(1024); // "1.0 KB"
const progressBar = generateProgressBar(75, { length: 20 }); // 进度条
```

## 开发注意事项
- **ProjectResolver是单例**: 全项目只有一个实例
- **路径哈希一致性**: 所有模块必须使用ProjectResolver.hashPath()
- **进度条字符常量**: 使用预定义的字符常量避免重复定义