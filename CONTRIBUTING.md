# 贡献指南 (Contributing Guide)

感谢你对 Claude Code Statusline Pro 项目的关注！我们欢迎所有形式的贡献，无论是报告 Bug、提出功能建议，还是提交代码。

[English](#english) | [中文](#中文)

---

## 中文

### 📋 目录

- [行为准则](#行为准则)
- [开发环境设置](#开发环境设置)
- [开发工作流](#开发工作流)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [测试要求](#测试要求)
- [文档规范](#文档规范)
- [发布流程](#发布流程)

---

### 行为准则

参与本项目即表示你同意遵守我们的行为准则：

- **尊重他人**: 保持友好和专业的态度
- **建设性反馈**: 提供有建设性的批评和建议
- **开放包容**: 欢迎不同背景和经验的贡献者
- **协作精神**: 与其他贡献者保持良好的沟通和协作

---

### 开发环境设置

#### 必需工具

1. **Rust 工具链** (>= 1.75.0)
   ```bash
   # 安装 rustup
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

   # 安装稳定版 Rust
   rustup install stable
   rustup default stable

   # 安装必需组件
   rustup component add rustfmt clippy
   ```

2. **Node.js** (>= 18.0.0)
   ```bash
   # macOS (使用 Homebrew)
   brew install node

   # Ubuntu/Debian
   sudo apt update && sudo apt install nodejs npm
   ```

3. **Git**
   ```bash
   git --version  # 确保已安装
   ```

#### 克隆仓库

```bash
git clone https://github.com/wangnov/claude-code-statusline-pro.git
cd claude-code-statusline-pro
```

#### 安装依赖

```bash
# Rust 依赖会在首次构建时自动下载
cargo build

# 如果需要测试 npm 包
cd npm/ccstatus
npm install
cd ../..
```

#### 验证安装

```bash
# 运行测试
cargo test

# 运行 Clippy
cargo clippy -- -D warnings

# 检查格式
cargo fmt -- --check

# 构建 Release 版本
cargo build --release
```

---

### 开发工作流

#### 1. 创建功能分支

```bash
# 从 dev 分支创建功能分支
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name

# 或者修复 Bug
git checkout -b fix/issue-number-description
```

#### 2. 开发过程

**在开发过程中，请遵循 [AGENTS.md](./AGENTS.md) 中定义的工作流程**。

每次提交前，务必按顺序执行以下命令：

```bash
# 1. 自动修复编译器建议
cargo fix --workspace --all-features --allow-dirty

# 2. 格式化代码
cargo fmt --all

# 3. 自动修复 Clippy 警告
cargo clippy --fix --workspace --all-features --allow-dirty -- -D warnings

# 4. 再次运行 Clippy 确保无警告
cargo clippy --workspace --all-targets --all-features -- -D warnings

# 5. 编译检查
cargo check --workspace --all-targets --all-features

# 6. 运行测试
cargo test --workspace --all-targets --all-features -- --nocapture

# 7. 构建 Release 版本
cargo build --release
```

**重要提示**: 如果任何步骤失败，必须先修复问题再继续。

#### 3. 提交更改

```bash
git add .
git commit -m "feat: add new feature description"
git push origin feature/your-feature-name
```

#### 4. 创建 Pull Request

1. 前往 GitHub 仓库
2. 点击 "New Pull Request"
3. 选择 `dev` 作为目标分支
4. 填写 PR 模板（描述、变更内容、测试情况）
5. 等待 CI 通过和代码审查

---

### 代码规范

#### Rust 代码规范

1. **遵循 Rust 标准风格**
   - 使用 `cargo fmt` 格式化代码
   - 遵循 [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)

2. **Clippy 规范**
   - 必须通过 `cargo clippy -- -D warnings`
   - 不允许有任何 Clippy 警告

3. **命名规范**
   ```rust
   // 类型名使用 PascalCase
   struct StatuslineGenerator { }

   // 函数和变量使用 snake_case
   fn generate_statusline() { }
   let branch_name = "main";

   // 常量使用 SCREAMING_SNAKE_CASE
   const MAX_TOKENS: u64 = 200_000;
   ```

4. **错误处理**
   ```rust
   // 优先使用 Result
   fn parse_config() -> Result<Config> {
       // ...
   }

   // 使用 anyhow 处理应用级错误
   use anyhow::{Context, Result};

   // 使用 thiserror 定义库级错误
   use thiserror::Error;
   ```

5. **文档注释**
   ```rust
   /// Generates the statusline based on input data.
   ///
   /// # Arguments
   ///
   /// * `input` - The input data containing model, tokens, etc.
   ///
   /// # Returns
   ///
   /// A formatted statusline string.
   ///
   /// # Examples
   ///
   /// ```
   /// let generator = StatuslineGenerator::new(config, options);
   /// let result = generator.generate(input).await?;
   /// ```
   pub async fn generate(&mut self, input: InputData) -> Result<String> {
       // ...
   }
   ```

#### 配置文件规范

1. **TOML 配置**
   - 使用清晰的注释
   - 分组相关配置
   - 提供合理的默认值

2. **JSON Schema**
   - 为配置文件提供类型定义
   - 添加验证规则

---

### 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### 类型 (Type)

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构（既不是新功能也不是 Bug 修复）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建工具或辅助工具的变动

#### 示例

```bash
# 新功能
git commit -m "feat(themes): add capsule theme support"

# Bug 修复
git commit -m "fix(tokens): correct token calculation for cache"

# 文档更新
git commit -m "docs(readme): update installation instructions"

# 重构
git commit -m "refactor(generator): simplify statusline generation logic"

# 性能优化
git commit -m "perf(cache): implement incremental transcript parsing"

# 测试
git commit -m "test(integration): add edge case tests for token limits"
```

---

### 测试要求

#### 测试覆盖

所有新功能和 Bug 修复都必须包含相应的测试：

1. **单元测试**: 测试单个函数或模块
2. **集成测试**: 测试多个模块协同工作
3. **边界情况测试**: 测试极端输入和错误情况

#### 测试指南

```rust
#[tokio::test]
async fn test_new_feature() -> Result<()> {
    // Arrange: 准备测试数据
    let input = InputData {
        // ...
    };

    // Act: 执行被测试的功能
    let result = generator.generate(input).await?;

    // Assert: 验证结果
    assert!(!result.is_empty());
    assert!(result.contains("expected-content"));

    Ok(())
}
```

#### 运行测试

```bash
# 运行所有测试
cargo test

# 运行特定测试
cargo test test_name

# 显示输出
cargo test -- --nocapture

# 查看测试覆盖率（需要安装 tarpaulin）
cargo install cargo-tarpaulin
cargo tarpaulin --out Html
```

#### 性能测试

使用 `criterion` 进行性能基准测试：

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn benchmark_generate(c: &mut Criterion) {
    c.bench_function("generate statusline", |b| {
        b.iter(|| {
            // 被测试的代码
        });
    });
}

criterion_group!(benches, benchmark_generate);
criterion_main!(benches);
```

---

### 文档规范

#### README 更新

- 新功能必须更新 README.md
- 保持中英双语同步
- 添加使用示例

#### 代码文档

- 所有公开 API 必须有文档注释
- 复杂逻辑添加内联注释
- 使用 `cargo doc` 生成文档

```bash
# 生成并查看文档
cargo doc --open
```

#### CHANGELOG 更新

- 每个 PR 应更新 CHANGELOG.md
- 按照版本和类型分类
- 提供清晰的变更描述

---

### 发布流程

#### 版本号规范

遵循 [语义化版本](https://semver.org/lang/zh-CN/)：

- **主版本号**: 不兼容的 API 修改
- **次版本号**: 向下兼容的功能性新增
- **修订号**: 向下兼容的问题修正

#### 发布检查清单

在发布新版本前，请确保：

- [ ] 所有测试通过
- [ ] Clippy 零警告
- [ ] 代码格式正确
- [ ] 文档已更新
- [ ] CHANGELOG 已更新
- [ ] 版本号已更新（Cargo.toml 和 package.json）
- [ ] CI/CD 流程通过

#### 发布步骤

```bash
# 1. 确保在 main 分支
git checkout main
git pull origin main

# 2. 更新版本号
# 编辑 Cargo.toml 和 npm/*/package.json

# 3. 更新 CHANGELOG
# 编辑 CHANGELOG.md

# 4. 提交版本更新
git add .
git commit -m "chore: bump version to X.Y.Z"

# 5. 创建标签
git tag -a vX.Y.Z -m "Release vX.Y.Z"

# 6. 推送到远程
git push origin main
git push origin vX.Y.Z

# 7. CI 会自动构建和发布到 npm
```

---

### 常见问题

#### Q: 我的 PR 需要多久才能被审查？

A: 通常在 1-3 个工作日内。如果超过一周没有回应，请在 PR 中评论提醒。

#### Q: 我可以提交文档修复的 PR 吗？

A: 当然可以！文档改进和代码改进同样重要。

#### Q: 我发现了一个 Bug，但不知道如何修复？

A: 请先提交 Issue 描述问题，我们会帮助你定位和修复。

#### Q: 我想添加一个大型功能，应该怎么做？

A: 请先提交 Issue 讨论功能设计，获得认可后再开始开发。

---

### 获取帮助

如果你在贡献过程中遇到任何问题：

- 📧 提交 [Issue](https://github.com/wangnov/claude-code-statusline-pro/issues)
- 💬 在现有 PR 中评论
- 📖 查看 [AGENTS.md](./AGENTS.md) 了解开发流程

---

### 致谢

感谢所有为本项目做出贡献的开发者！你们的贡献让 Claude Code Statusline Pro 变得更好。

---

## English

### 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Commit Convention](#commit-convention)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Release Process](#release-process)

---

### Code of Conduct

By participating in this project, you agree to abide by our code of conduct:

- **Be Respectful**: Maintain a friendly and professional attitude
- **Constructive Feedback**: Provide constructive criticism and suggestions
- **Be Inclusive**: Welcome contributors from all backgrounds and experience levels
- **Collaborate**: Maintain good communication and collaboration with other contributors

---

### Development Setup

#### Required Tools

1. **Rust Toolchain** (>= 1.75.0)
   ```bash
   # Install rustup
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

   # Install stable Rust
   rustup install stable
   rustup default stable

   # Install required components
   rustup component add rustfmt clippy
   ```

2. **Node.js** (>= 18.0.0)
   ```bash
   # macOS (using Homebrew)
   brew install node

   # Ubuntu/Debian
   sudo apt update && sudo apt install nodejs npm
   ```

3. **Git**
   ```bash
   git --version  # Ensure it's installed
   ```

#### Clone Repository

```bash
git clone https://github.com/wangnov/claude-code-statusline-pro.git
cd claude-code-statusline-pro
```

#### Install Dependencies

```bash
# Rust dependencies will be downloaded automatically on first build
cargo build

# If you need to test npm packages
cd npm/ccstatus
npm install
cd ../..
```

#### Verify Installation

```bash
# Run tests
cargo test

# Run Clippy
cargo clippy -- -D warnings

# Check formatting
cargo fmt -- --check

# Build release version
cargo build --release
```

---

### Development Workflow

#### 1. Create Feature Branch

```bash
# Create feature branch from dev
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name

# Or fix a bug
git checkout -b fix/issue-number-description
```

#### 2. Development Process

**Follow the workflow defined in [AGENTS.md](./AGENTS.md)**.

Before each commit, execute the following commands in order:

```bash
# 1. Auto-fix compiler suggestions
cargo fix --workspace --all-features --allow-dirty

# 2. Format code
cargo fmt --all

# 3. Auto-fix Clippy warnings
cargo clippy --fix --workspace --all-features --allow-dirty -- -D warnings

# 4. Run Clippy again to ensure no warnings
cargo clippy --workspace --all-targets --all-features -- -D warnings

# 5. Compile check
cargo check --workspace --all-targets --all-features

# 6. Run tests
cargo test --workspace --all-targets --all-features -- --nocapture

# 7. Build release version
cargo build --release
```

**Important**: If any step fails, you must fix the issue before proceeding.

#### 3. Commit Changes

```bash
git add .
git commit -m "feat: add new feature description"
git push origin feature/your-feature-name
```

#### 4. Create Pull Request

1. Go to GitHub repository
2. Click "New Pull Request"
3. Select `dev` as the target branch
4. Fill in PR template (description, changes, test results)
5. Wait for CI to pass and code review

---

### Code Style

#### Rust Code Style

1. **Follow Rust Standard Style**
   - Use `cargo fmt` to format code
   - Follow [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)

2. **Clippy Rules**
   - Must pass `cargo clippy -- -D warnings`
   - No Clippy warnings allowed

3. **Naming Convention**
   ```rust
   // Type names use PascalCase
   struct StatuslineGenerator { }

   // Functions and variables use snake_case
   fn generate_statusline() { }
   let branch_name = "main";

   // Constants use SCREAMING_SNAKE_CASE
   const MAX_TOKENS: u64 = 200_000;
   ```

4. **Error Handling**
   ```rust
   // Prefer Result
   fn parse_config() -> Result<Config> {
       // ...
   }

   // Use anyhow for application-level errors
   use anyhow::{Context, Result};

   // Use thiserror for library-level errors
   use thiserror::Error;
   ```

5. **Documentation Comments**
   ```rust
   /// Generates the statusline based on input data.
   ///
   /// # Arguments
   ///
   /// * `input` - The input data containing model, tokens, etc.
   ///
   /// # Returns
   ///
   /// A formatted statusline string.
   ///
   /// # Examples
   ///
   /// ```
   /// let generator = StatuslineGenerator::new(config, options);
   /// let result = generator.generate(input).await?;
   /// ```
   pub async fn generate(&mut self, input: InputData) -> Result<String> {
       // ...
   }
   ```

---

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation updates
- `style`: Code formatting (no functional changes)
- `refactor`: Refactoring (neither feature nor bug fix)
- `perf`: Performance optimization
- `test`: Testing related
- `chore`: Build tools or auxiliary tools changes

#### Examples

```bash
# New feature
git commit -m "feat(themes): add capsule theme support"

# Bug fix
git commit -m "fix(tokens): correct token calculation for cache"

# Documentation update
git commit -m "docs(readme): update installation instructions"

# Refactor
git commit -m "refactor(generator): simplify statusline generation logic"

# Performance optimization
git commit -m "perf(cache): implement incremental transcript parsing"

# Testing
git commit -m "test(integration): add edge case tests for token limits"
```

---

### Testing Requirements

#### Test Coverage

All new features and bug fixes must include corresponding tests:

1. **Unit Tests**: Test individual functions or modules
2. **Integration Tests**: Test multiple modules working together
3. **Edge Case Tests**: Test extreme inputs and error cases

#### Testing Guide

```rust
#[tokio::test]
async fn test_new_feature() -> Result<()> {
    // Arrange: Prepare test data
    let input = InputData {
        // ...
    };

    // Act: Execute the functionality being tested
    let result = generator.generate(input).await?;

    // Assert: Verify results
    assert!(!result.is_empty());
    assert!(result.contains("expected-content"));

    Ok(())
}
```

#### Running Tests

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_name

# Show output
cargo test -- --nocapture

# View test coverage (requires tarpaulin)
cargo install cargo-tarpaulin
cargo tarpaulin --out Html
```

---

### Documentation

#### README Updates

- New features must update README.md
- Keep Chinese and English versions in sync
- Add usage examples

#### Code Documentation

- All public APIs must have documentation comments
- Add inline comments for complex logic
- Use `cargo doc` to generate documentation

```bash
# Generate and view documentation
cargo doc --open
```

#### CHANGELOG Updates

- Each PR should update CHANGELOG.md
- Categorize by version and type
- Provide clear change descriptions

---

### Release Process

#### Version Number Convention

Follow [Semantic Versioning](https://semver.org/):

- **Major Version**: Incompatible API changes
- **Minor Version**: Backwards-compatible new features
- **Patch Version**: Backwards-compatible bug fixes

#### Release Checklist

Before releasing a new version, ensure:

- [ ] All tests pass
- [ ] Zero Clippy warnings
- [ ] Code properly formatted
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Version numbers updated (Cargo.toml and package.json)
- [ ] CI/CD pipeline passes

#### Release Steps

```bash
# 1. Ensure on main branch
git checkout main
git pull origin main

# 2. Update version numbers
# Edit Cargo.toml and npm/*/package.json

# 3. Update CHANGELOG
# Edit CHANGELOG.md

# 4. Commit version update
git add .
git commit -m "chore: bump version to X.Y.Z"

# 5. Create tag
git tag -a vX.Y.Z -m "Release vX.Y.Z"

# 6. Push to remote
git push origin main
git push origin vX.Y.Z

# 7. CI will automatically build and publish to npm
```

---

### Getting Help

If you encounter any issues while contributing:

- 📧 Submit an [Issue](https://github.com/wangnov/claude-code-statusline-pro/issues)
- 💬 Comment on existing PRs
- 📖 Check [AGENTS.md](./AGENTS.md) for development workflow

---

### Acknowledgments

Thanks to all contributors who have helped make Claude Code Statusline Pro better!
