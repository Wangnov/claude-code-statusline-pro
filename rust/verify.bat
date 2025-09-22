@echo off
REM Rust版本验证脚本 (Windows)

echo === Claude Code Statusline Pro - Rust版本验证 ===
echo.

REM 测试数据
set TEST_INPUT={"model":{"id":"claude-3-opus","display_name":"Claude 3 Opus"},"workspace":{"current_dir":"/test","project_dir":"/test"}}

REM 1. 检查Cargo配置
echo 1. 检查Cargo配置...
cargo --version
echo.

REM 2. 编译检查
echo 2. 编译检查...
cargo check --quiet
if %ERRORLEVEL% EQU 0 (
    echo √ 编译检查通过
) else (
    echo × 编译失败
)
echo.

REM 3. 格式检查
echo 3. 代码格式检查...
cargo fmt -- --check
if %ERRORLEVEL% EQU 0 (
    echo √ 格式正确
) else (
    echo × 需要格式化
)
echo.

REM 4. 构建测试
echo 4. 构建测试...
cargo build --quiet
if %ERRORLEVEL% EQU 0 (
    echo √ 构建成功
) else (
    echo × 构建失败
)
echo.

REM 5. 运行测试
echo 5. 运行基础测试...
echo %TEST_INPUT% | cargo run --quiet
echo.

echo === 验证完成 ===
pause