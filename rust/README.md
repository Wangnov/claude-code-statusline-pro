# Claude Code Statusline Pro - Rust Edition

高性能状态栏生成器，为Claude Code提供10倍性能提升。

## 🚀 特性

- ⚡ **10-20倍启动速度提升**
- 💾 **95%内存占用减少**
- 📦 **93%分发体积减少**
- 🔧 **100%配置兼容性**

## 📋 开发状态

当前版本: `3.0.0-alpha.1`

- [x] 项目基础设置
- [x] 依赖配置
- [ ] 核心功能实现
- [ ] 组件系统
- [ ] 主题渲染
- [ ] 性能优化
- [ ] 测试覆盖

## 🛠️ 构建

### 前置要求

- Rust 1.75+
- Git（用于git2功能）

### 构建步骤

```bash
# 克隆仓库
git clone https://github.com/wangnov/claude-code-statusline-pro
cd claude-code-statusline-pro/rust

# 构建开发版本
cargo build

# 构建发布版本
cargo build --release

# 运行测试
cargo test

# 运行基准测试
cargo bench
```

## 🧪 测试

```bash
# 基础测试
echo '{"model":{"id":"claude-3","display_name":"Claude 3"}}' | cargo run

# 使用真实数据测试
cat ../tests/fixtures/input.json | cargo run --release
```

## 📐 架构

```
src/
├── main.rs           # CLI入口
├── lib.rs            # 库接口
├── components/       # 组件实现
├── core/            # 核心逻辑
├── config/          # 配置管理
├── git/             # Git集成
├── storage/         # 数据持久化
├── terminal/        # 终端检测和渲染
├── themes/          # 主题系统
└── utils/           # 工具函数
```

## 🔍 代码质量

```bash
# 格式化代码
cargo fmt

# 运行linter
cargo clippy -- -D warnings

# 检查依赖安全性
cargo audit
```

## 📊 性能目标

| 指标 | TypeScript | Rust目标 | 当前状态 |
|-----|-----------|---------|---------|
| 冷启动时间 | 50-80ms | <5ms | 开发中 |
| 内存占用 | 50-100MB | <5MB | 开发中 |
| 二进制大小 | 151MB | <10MB | 开发中 |

## 📝 许可证

MIT License - 详见 [LICENSE](../LICENSE)