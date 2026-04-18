# Claude Code Statusline Pro - 开发工具链
# 用法: make <target>

.PHONY: all fix fmt clippy check test build release clean ci bump

# 默认目标：完整 CI 流程
all: ci

# 1. 自动修复编译器建议
fix:
	cargo fix --workspace --all-features --allow-dirty

# 2. 格式化代码
fmt:
	cargo fmt --all

# 3. Clippy 自动修复
clippy-fix:
	cargo clippy --fix --workspace --all-features --allow-dirty -- -D warnings

# 4. Clippy 检查（严格模式）
clippy:
	cargo clippy --workspace --all-targets --all-features -- -D warnings

# 5. 编译检查
check:
	cargo check --workspace --all-targets --all-features

# 6. 运行测试
test:
	cargo test --workspace --all-targets --all-features -- --nocapture

# 7. Release 构建
build:
	cargo build --release

# 完整 CI 流程（按顺序执行所有步骤）
ci: fix fmt clippy-fix clippy check test build
	@echo "✅ All checks passed!"

# 快速检查（跳过自动修复）
quick: fmt clippy check test
	@echo "✅ Quick check passed!"

# 清理构建产物
clean:
	cargo clean

# 版本更新
#
# 已废弃：请使用 cargo-release + cargo-dist 的两阶段发布流程。
#
# npm 平台包的 version 字段不再需要手动维护——build.yml 会在发布时从
# GitHub Release 的 tag 自动写回 package.json。只有 Cargo.toml 的
# version 字段由 cargo-release 管理。
#
# 详见 CLAUDE.md「发布流程」章节。
bump:
	@echo "⚠️  'make bump' 已废弃。"
	@echo ""
	@echo "请改用 cargo-release + cargo-dist 的两阶段发布流程："
	@echo ""
	@echo "  # 阶段 1：本地改版本号 + push + 手动触发候选 workflow"
	@echo "  cargo release <patch|minor|major> --execute --no-publish --no-tag --no-push --no-confirm"
	@echo "  git push origin main"
	@echo "  # 然后在 GitHub Actions 页面手动触发 'Release candidate' workflow"
	@echo ""
	@echo "  # 阶段 2：候选全绿后，本地依次推 crates.io → 打 tag → 推 tag"
	@echo "  cargo release publish --execute --no-confirm"
	@echo "  cargo release tag --execute --no-confirm"
	@echo "  cargo release push --execute --no-confirm"
	@echo ""
	@echo "详见 CLAUDE.md。"
	@exit 1

# 帮助信息
help:
	@echo "可用命令:"
	@echo "  make ci      - 完整 CI 流程（推荐提交前执行）"
	@echo "  make quick   - 快速检查（跳过自动修复）"
	@echo "  make fix     - 自动修复编译器建议"
	@echo "  make fmt     - 格式化代码"
	@echo "  make clippy  - Clippy 静态检查"
	@echo "  make check   - 编译检查"
	@echo "  make test    - 运行测试"
	@echo "  make build   - Release 构建"
	@echo "  make clean   - 清理构建产物"
	@echo ""
	@echo "发布流程: 使用 cargo-release + cargo-dist (详见 CLAUDE.md)"
