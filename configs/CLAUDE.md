# 配置模板目录

## 文件说明
- `config.template.toml` - 配置模板源文件，供 ConfigLoader 自动化初始化使用

## 工作原理
此目录存放配置模板，由 `ConfigLoader.createDefaultConfig()` 方法调用：
1. 用户执行 `claude-code-statusline-pro config --init` 命令
2. ConfigLoader 读取此模板文件
3. 根据终端能力检测结果和用户选择的主题，自动生成最终配置文件
4. 写入到项目目录或用户全局目录

## CLI初始化命令
```bash
# 项目级配置初始化
claude-code-statusline-pro config --init

# 全局用户级配置初始化  
claude-code-statusline-pro config --init --global

# 指定主题初始化
claude-code-statusline-pro config --init --theme powerline
```

## 模板文件管理
修改 `config.template.toml` 时需确保：
1. 与 `src/config/schema.ts` 的Schema定义保持一致
2. 所有配置项都有合理的默认值  
3. 注释清晰，便于理解各配置项作用