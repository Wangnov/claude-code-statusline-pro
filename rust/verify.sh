#!/bin/bash
# Rust版本验证脚本

echo "=== Claude Code Statusline Pro - Rust版本验证 ==="
echo

# 测试数据
TEST_INPUT='{"model":{"id":"claude-3-opus","display_name":"Claude 3 Opus"},"workspace":{"current_dir":"/test","project_dir":"/test"}}'

# 1. 检查Cargo配置
echo "1. 检查Cargo配置..."
cargo --version
echo

# 2. 编译检查
echo "2. 编译检查..."
cargo check --quiet && echo "✅ 编译检查通过" || echo "❌ 编译失败"
echo

# 3. 格式检查
echo "3. 代码格式检查..."
cargo fmt -- --check && echo "✅ 格式正确" || echo "❌ 需要格式化"
echo

# 4. Clippy检查
echo "4. Clippy代码质量检查..."
cargo clippy --quiet -- -D warnings 2>/dev/null && echo "✅ 无警告" || echo "⚠️ 有警告或错误"
echo

# 5. 构建测试
echo "5. 构建测试..."
cargo build --quiet && echo "✅ 构建成功" || echo "❌ 构建失败"
echo

# 6. 运行测试
echo "6. 运行基础测试..."
echo "$TEST_INPUT" | cargo run --quiet
echo

echo "=== 验证完成 ==="