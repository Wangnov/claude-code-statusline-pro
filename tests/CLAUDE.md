# 测试目录

## 文件结构
- `storage-system.test.ts` - 存储系统集成测试
- `unit/` - 单元测试目录
  - `cli/` - CLI相关测试
  - `config/` - 配置系统测试  
  - `git/` - Git服务测试
- `utils/` - 测试工具函数

## 运行测试
```bash
npm test           # 运行所有测试
npm run test:run   # 单次运行
npm run test:coverage # 覆盖率报告
```

## 测试框架
- 使用 vitest 作为测试框架
- 使用 @vitest/coverage-v8 生成覆盖率报告

## 添加新测试
1. 在对应模块的 `unit/` 子目录下创建 `.test.ts` 文件
2. 使用 vitest 的 API：`describe`, `it`, `expect`
3. 遵循现有测试的命名约定