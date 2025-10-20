# AI Agent 开发流程指引

在完成任何开发任务并提交修改之前，请务必按照以下顺序在仓库根目录执行本地工具链命令，确保代码质量与可发布性：

1. `cargo fix --workspace --all-features --allow-dirty`  
   自动应用可修复的编译器建议，减少手动修复量。
2. `cargo fmt --all`  
   统一代码风格；CI 会用 `cargo fmt --all -- --check` 验证格式已正确。
3. `cargo clippy --fix --workspace --all-features --allow-dirty -- -D warnings`  
   对所有目标和特性执行静态检查，先应用能够自动修复的建议。
4. `cargo clippy --workspace --all-targets --all-features -- -D warnings`  
   再次运行静态检查，确保没有残留 lint。
5. `cargo check --workspace --all-targets --all-features`  
   确认所有目标在当前特性组合下均可编译。
6. `cargo test --workspace --all-targets --all-features -- --nocapture`  
   运行单元/集成测试，实时查看输出，确保行为未回归。
7. `cargo build --release`  
   构建发行版二进制，验证最终交付物能够成功编译。

请记录这些命令的执行结果；若某一步失败，应先修复问题并重新执行整个流程，直至全部通过。
