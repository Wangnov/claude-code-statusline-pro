#!/bin/bash

# 测试自定义组件系统的脚本
# Script to test custom component system

echo "🚀 开始测试自定义组件系统 | Testing Custom Component System"
echo "================================================"

# 1. 创建用户级组件目录
USER_COMPONENTS_DIR="$HOME/.claude/statusline-pro/components"
echo "📁 创建用户级组件目录 | Creating user-level components directory:"
echo "   $USER_COMPONENTS_DIR"
mkdir -p "$USER_COMPONENTS_DIR"

# 2. 复制示例clock组件
echo "📋 复制示例clock组件 | Copying example clock component..."
cp -r examples/custom-components/clock "$USER_COMPONENTS_DIR/"

# 3. 创建测试配置文件
CONFIG_FILE="$HOME/.claude/statusline-pro/test-config.toml"
echo "📝 创建测试配置文件 | Creating test configuration file..."
cat > "$CONFIG_FILE" << 'EOF'
# 测试配置 | Test configuration
preset = "PMBTC"  # Project, Model, Branch, Tokens, Clock
theme = "classic"

[custom_components]
# 映射C到clock组件 | Map C to clock component
codes = { C = "clock" }
debug = true

[components.project]
enabled = true
nerd_icon = ""
emoji_icon = "📁"
text_icon = "[P]"

[components.model]
enabled = true
nerd_icon = ""
emoji_icon = "🤖"
text_icon = "[M]"

[components.branch]
enabled = true
nerd_icon = ""
emoji_icon = "🌿"
text_icon = "[B]"

[components.tokens]
enabled = true
nerd_icon = ""
emoji_icon = "📊"
text_icon = "[T]"
EOF

echo "✅ 配置文件已创建 | Configuration file created:"
echo "   $CONFIG_FILE"

# 4. 创建测试输入数据
echo "📊 创建测试输入数据 | Creating test input data..."
TEST_INPUT=$(cat << 'EOF'
{
  "hook_event_name": "on_response_complete",
  "model": {
    "id": "claude-3.5-sonnet",
    "display_name": "Claude 3.5 Sonnet"
  },
  "workspace": {
    "project_dir": "/test/project"
  },
  "sessionId": "test-session-123"
}
EOF
)

# 5. 运行测试
echo ""
echo "🔧 运行测试 | Running test..."
echo "================================================"
echo "$TEST_INPUT" | npm run dev -- --config "$CONFIG_FILE" --preset "PMBTC"

echo ""
echo "🎯 测试完成 | Test completed!"
echo "================================================"
echo "如果看到时钟显示，说明自定义组件系统工作正常！"
echo "If you see the clock display, the custom component system is working!"