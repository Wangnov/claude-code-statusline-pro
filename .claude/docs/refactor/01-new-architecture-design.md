# 新架构设计方案

## 🎯 设计原则

### 核心目标
- **Schema-First**: 100%基于Zod Schema，零硬编码
- **简洁UI**: 左侧树形菜单 + 右侧编辑 + 顶部预览
- **双语支持**: 默认中文，L键切换英文
- **高性能**: 启动时间 <500ms，响应时间 <100ms

### 代码量目标
- **当前**: 19,154行 (严重过度工程)
- **目标**: <2,000行 (减少90%)
- **核心模块**: 4个组件替代当前9个编辑器类

## 🏗️ 架构组件

### 核心模块 (4个)
```
src/cli/core/
├── schema-reflector.ts     # Schema反射引擎 (~150行)
├── reactive-config.ts      # 响应式配置管理 (~120行)
├── tree-renderer.ts        # 树形UI渲染器 (~200行)
└── unified-cli.ts          # 统一CLI入口 (~180行)
```

### 支持模块 (3个)
```  
src/cli/types/
├── config-node.ts          # 配置节点类型 (~80行)
├── ui-state.ts            # 界面状态管理 (~60行)
└── i18n-simple.ts         # 简化国际化 (~100行)
```

### 界面布局
```
┌─── 顶部预览 ───── [ 中文 ] ┐
│ [项目] [模型] [分支] [tokens] │
├─ 左侧菜单 ─┬─ 右侧编辑区 ────┤
│ > 组件配置  │ 编辑: 当前配置项│
│ > 样式配置  │ [x] 值编辑     │
│ > 终端配置  │ 说明提示       │
├────────────┴───────────────┤
│ [保存] [重置] [退出]         │
└─────────────────────────────┘
```

## 🔧 技术实现

### SchemaReflector核心逻辑
```typescript
class SchemaReflector {
  generateConfigTree(schema: ZodObject): ConfigNode[] {
    // 递归遍历Zod Schema生成配置树
    // 替代1316行硬编码映射
  }
}
```

### ReactiveConfig响应式管理
```typescript
class ReactiveConfigManager {
  updateConfig(path: string, value: unknown): void {
    // 配置更新 + 触发预览刷新
    // 替代9个编辑器的状态管理
  }
}
```

### 双语支持
```typescript
// 配置文件
language = "zh"  // zh | en

// 快捷键切换
L键 - 中英文切换
```

## 📊 性能目标

| 指标 | 当前 | 目标 | 改善 |
|-----|------|------|------|
| 代码量 | 19,154行 | <2,000行 | 90%↓ |
| 启动时间 | 多秒 | <500ms | 80%↓ |
| 内存占用 | 高 | 中等 | 60%↓ |
| 配置完整性 | 81.8% | 100% | 18.2%↑ |

## 🎯 成功标准

- [OK] 零硬编码，Schema驱动
- [OK] 214个配置项100%覆盖  
- [OK] 单界面完成所有配置
- [OK] 中英双语完整支持
- [OK] 键盘操作高效便捷