#![allow(clippy::multiple_crate_versions)]

//! Claude Code Statusline Pro - Rust Edition
//!
//! Rich CLI supporting configuration management, theme selection,
//! multi-line widgets, and statusline generation.

use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{anyhow, bail, Context, Result};
use clap::{Args as ClapArgs, Parser, Subcommand};
use claude_code_statusline_pro::{
    config::{
        AutoDetect, ConfigLoader, ConfigSourceType, CreateConfigOptions, TerminalCapabilityHint,
    },
    core::{GeneratorOptions, InputData, StatuslineGenerator},
};
use dialoguer::Confirm;
use toml_edit::{Array, DocumentMut, Item, Table, Value as TomlEditValue};

mod mock_data;
mod tui;
use mock_data::MockDataGenerator;

#[derive(Parser, Debug)]
#[command(name = "claude-code-statusline-pro")]
#[command(author, version, about = "Claude Code Statusline Pro - Rust Edition", long_about = None)]
struct Cli {
    /// 预设字符串（例如 PMBT、PMBTUS）
    #[arg(value_name = "PRESET")]
    preset: Option<String>,

    /// 使用自定义配置文件路径
    #[arg(short, long)]
    config: Option<String>,

    /// CLI 内联覆盖的预设
    #[arg(short = 'p', long = "preset")]
    preset_override: Option<String>,

    /// 覆盖主题
    #[arg(short = 't', long = "theme")]
    theme: Option<String>,

    /// 禁用颜色输出
    #[arg(long = "no-colors", action = clap::ArgAction::SetTrue)]
    no_colors: bool,

    /// 禁用 Emoji 输出
    #[arg(long = "no-emoji", action = clap::ArgAction::SetTrue)]
    no_emoji: bool,

    /// 禁用 Nerd Font 图标
    #[arg(long = "no-icons", action = clap::ArgAction::SetTrue)]
    no_icons: bool,

    /// 强制启用 Emoji
    #[arg(long = "force-emoji", action = clap::ArgAction::SetTrue)]
    force_emoji: bool,

    /// 强制启用 Nerd Font
    #[arg(long = "force-nerd-font", action = clap::ArgAction::SetTrue)]
    force_nerd_font: bool,

    /// 强制使用纯文本模式
    #[arg(long = "force-text", action = clap::ArgAction::SetTrue)]
    force_text: bool,

    /// 启用调试输出
    #[arg(short, long, action = clap::ArgAction::SetTrue)]
    debug: bool,

    /// 使用预置的 Mock 场景生成状态行
    #[arg(long = "mock")]
    mock: Option<String>,

    /// 子命令
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// 配置文件管理（初始化 / 重置 / 路径查看）
    Config(ConfigArgs),
    /// 主题管理
    Theme(ThemeArgs),
    /// 验证配置文件有效性
    Validate { file: Option<String> },
    /// 环境诊断
    Doctor,
}

#[derive(ClapArgs, Debug, Default)]
struct ConfigArgs {
    /// 配置子命令
    #[command(subcommand)]
    action: Option<ConfigAction>,

    /// 指定配置文件路径
    #[arg(short, long)]
    file: Option<String>,

    /// 重置配置到默认值
    #[arg(short, long, action = clap::ArgAction::SetTrue)]
    reset: bool,

    /// 生成全局用户级配置
    #[arg(short = 'g', long = "global", action = clap::ArgAction::SetTrue)]
    global: bool,

    /// 显示配置合并报告
    #[arg(long = "report", alias = "show-report", action = clap::ArgAction::SetTrue)]
    report: bool,

    /// 仅展示将执行的操作，不写入文件
    #[arg(short = 'n', long = "dry-run", action = clap::ArgAction::SetTrue)]
    dry_run: bool,
}

#[derive(Subcommand, Debug)]
enum ConfigAction {
    /// 设置配置键值对
    Set(ConfigSetArgs),
    /// 初始化配置文件
    Init(ConfigInitArgs),
    /// 启动 TUI 配置编辑器
    Edit(ConfigEditArgs),
}

#[derive(ClapArgs, Debug, Default)]
struct ConfigEditArgs {
    /// 编辑用户级配置(默认优先项目级,无项目级回退到用户级)
    #[arg(short = 'g', long = "global", action = clap::ArgAction::SetTrue)]
    global: bool,

    /// 指定配置文件路径(覆盖 --global)
    #[arg(short = 'f', long = "file")]
    file: Option<String>,

    /// 预览使用的 mock 场景(dev / critical / thinking / complete / error)
    #[arg(long = "mock", default_value = "dev")]
    mock: String,
}

#[derive(ClapArgs, Debug)]
struct ConfigSetArgs {
    /// 要设置的配置键 (支持点路径，如 style.enable_colors)
    key: String,

    /// 修改全局配置文件
    #[arg(short = 'g', long = "global", action = clap::ArgAction::SetTrue)]
    global: bool,

    /// 要写入的值 (支持 `key value` 或 `key = value` 语法)
    #[arg(value_name = "VALUE", num_args = 1.., trailing_var_arg = true)]
    value_parts: Vec<String>,
}

#[derive(ClapArgs, Debug, Default)]
struct ThemeArgs {
    /// 要应用的主题名称（classic / powerline / capsule）
    name: Option<String>,
}

#[derive(ClapArgs, Debug, Default)]
struct ConfigInitArgs {
    /// 指定项目路径（默认当前目录）
    #[arg(value_name = "PROJECT_PATH")]
    path: Option<String>,

    /// 生成全局用户级配置
    #[arg(short = 'g', long = "global", action = clap::ArgAction::SetTrue)]
    global: bool,

    /// 同时复制组件模板
    #[arg(short = 'w', long = "with-components", action = clap::ArgAction::SetTrue)]
    with_components: bool,

    /// 初始化时指定主题
    #[arg(short = 't', long = "theme")]
    theme: Option<String>,

    /// 覆盖已有配置文件时跳过确认
    #[arg(short = 'y', long = "force", alias = "yes", action = clap::ArgAction::SetTrue)]
    force: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match &cli.command {
        Some(Commands::Config(args)) => handle_config(args).await?,
        Some(Commands::Theme(args)) => handle_theme(args).await?,
        Some(Commands::Validate { file }) => handle_validate(file.as_deref()).await?,
        Some(Commands::Doctor) => handle_doctor().await?,
        None => handle_run(&cli).await?,
    }

    Ok(())
}

async fn handle_run(cli: &Cli) -> Result<()> {
    // Debug: 输出所有CLI参数
    if cli.debug {
        eprintln!("[调试] CLI参数:");
        eprintln!("  - preset: {:?}", cli.preset);
        eprintln!("  - preset_override: {:?}", cli.preset_override);
        eprintln!("  - theme: {:?}", cli.theme);
        eprintln!("  - config: {:?}", cli.config);
        eprintln!("  - debug: {}", cli.debug);
    }

    let mut loader = ConfigLoader::new();
    let mut config = loader.load(cli.config.as_deref()).await?;

    if cli.debug {
        config.debug = true;
    }

    // CLI参数覆盖配置文件 - 确保命令行参数优先级最高
    if let Some(theme) = &cli.theme {
        if config.debug {
            eprintln!("[调试] 检测到 CLI theme参数: {theme}");
            eprintln!("[调试] 配置文件中的theme: {}", config.theme);
        }
        config.theme = theme.clone();
        if config.debug {
            eprintln!("[调试] 应用CLI参数后的theme: {}", config.theme);
        }
    } else if config.debug {
        eprintln!(
            "[调试] 未提供 CLI theme参数，使用配置文件theme: {}",
            config.theme
        );
    }

    let preset_override = cli
        .preset_override
        .as_ref()
        .or(cli.preset.as_ref())
        .cloned();

    if let Some(ref preset) = preset_override {
        config.preset = Some(preset.clone());
    }

    apply_runtime_overrides(cli, &mut config);

    let base_dir = loader
        .get_config_source()
        .and_then(|source| source.path.as_ref())
        .and_then(|path| path.parent().map(|p| p.to_path_buf()));

    let mut options = GeneratorOptions {
        config_base_dir: base_dir.as_ref().map(|p| p.to_string_lossy().to_string()),
        ..GeneratorOptions::default()
    };
    if let Some(preset) = preset_override {
        options = options.with_preset(preset);
    }

    let mut generator = StatuslineGenerator::new(config.clone(), options);

    let input = if let Some(mock_name) = &cli.mock {
        let generator = MockDataGenerator::new();
        generator.generate(mock_name).ok_or_else(|| {
            anyhow!(format!(
                "未找到 Mock 场景: {}。可用场景: {}",
                mock_name,
                generator.available().collect::<Vec<_>>().join(", ")
            ))
        })?
    } else {
        InputData::from_stdin()?
    };

    if config.debug {
        if let Some(source) = loader.get_config_source() {
            eprintln!("[调试] 配置来源: {:?}", source.source_type);
            if let Some(path) = &source.path {
                eprintln!("[调试] 配置路径: {}", path.display());
            }
        }
    }

    let statusline = generator.generate(input).await?;
    println!("{statusline}");
    Ok(())
}

async fn handle_config(args: &ConfigArgs) -> Result<()> {
    let mut loader = ConfigLoader::new();

    if let Some(action) = &args.action {
        match action {
            ConfigAction::Set(set_args) => {
                handle_config_set(&mut loader, args, set_args)?;
                return Ok(());
            }
            ConfigAction::Init(init_args) => {
                handle_config_init(&mut loader, args, init_args)?;
                return Ok(());
            }
            ConfigAction::Edit(edit_args) => {
                handle_config_edit(&mut loader, args, edit_args).await?;
                return Ok(());
            }
        }
    }

    if args.global {
        bail!("使用 --global 时必须配合 `config set` 子命令");
    }

    if args.reset {
        if args.dry_run {
            let target = if let Some(path) = args.file.as_deref() {
                PathBuf::from(path)
            } else {
                loader
                    .user_config_path()
                    .ok_or_else(|| anyhow!("无法确定用户级配置路径"))?
            };
            println!("🔍 (dry-run) 将重置配置为默认值: {}", target.display());
        } else {
            loader.reset_to_defaults(args.file.as_deref()).await?;
            println!("✅ 配置已重置为默认值");
        }
        return Ok(());
    }

    loader.load(args.file.as_deref()).await?;
    if let Some(source) = loader.get_config_source() {
        match source.source_type {
            ConfigSourceType::Default => println!("当前使用默认内置配置"),
            ConfigSourceType::User => {
                if let Some(path) = &source.path {
                    println!("用户级配置: {}", path.display());
                }
            }
            ConfigSourceType::Project => {
                if let Some(path) = &source.path {
                    println!("项目级配置: {}", path.display());
                }
            }
            ConfigSourceType::Custom => {
                if let Some(path) = &source.path {
                    println!("自定义配置: {}", path.display());
                }
            }
        }
    }

    if args.report {
        print_merge_report(&loader, args.file.as_deref());
    }

    Ok(())
}

fn handle_config_init(
    loader: &mut ConfigLoader,
    parent_args: &ConfigArgs,
    init_args: &ConfigInitArgs,
) -> Result<()> {
    let target_path = if init_args.global {
        loader
            .user_config_path()
            .ok_or_else(|| anyhow!("无法确定用户级配置路径"))?
    } else {
        let project_path = match init_args.path.as_deref() {
            Some(path) if !path.is_empty() => {
                let candidate = PathBuf::from(path);
                if candidate.is_absolute() {
                    candidate
                } else {
                    std::env::current_dir()
                        .context("无法获取当前工作目录")?
                        .join(candidate)
                }
            }
            _ => std::env::current_dir().context("无法获取当前工作目录")?,
        };

        if !project_path.exists() && !parent_args.dry_run {
            bail!("项目路径不存在: {}", project_path.display());
        }

        ConfigLoader::project_config_path_for_path(
            project_path
                .to_str()
                .ok_or_else(|| anyhow!("项目路径包含非 UTF-8 字符"))?,
        )
    };

    if target_path.exists() && !init_args.force && !parent_args.dry_run {
        match Confirm::new()
            .with_prompt("配置文件已存在，是否覆盖?")
            .default(false)
            .interact_opt()
        {
            Ok(Some(true)) => {}
            Ok(Some(false)) | Ok(None) => {
                println!("操作已取消");
                return Ok(());
            }
            Err(err) => {
                eprintln!("无法获取确认输入: {err}");
                eprintln!("如果确认覆盖，请使用 --force 选项。");
                return Ok(());
            }
        }
    }

    let detector = claude_code_statusline_pro::terminal::TerminalDetector::new();
    let capabilities = detector.detect(
        &AutoDetect::Bool(true),
        &AutoDetect::Bool(true),
        &AutoDetect::Bool(true),
        false,
        false,
        false,
    );

    let options = CreateConfigOptions {
        target_path: Some(target_path.as_path()),
        theme: init_args.theme.as_deref(),
        capabilities: Some(TerminalCapabilityHint {
            colors: capabilities.supports_colors(),
            emoji: capabilities.supports_emoji,
            nerd_font: capabilities.supports_nerd_font,
        }),
        copy_components: init_args.with_components,
        force: init_args.force,
    };

    if parent_args.dry_run {
        println!("🔍 (dry-run) 将生成配置文件: {}", target_path.display());
        if target_path.exists() {
            println!("  - 现有文件将被覆盖 (可使用 --force/-y 跳过确认)");
        } else if let Some(parent) = target_path.parent() {
            println!("  - 将创建目录: {}", parent.display());
        }
        println!(
            "  - 主题: {}",
            init_args.theme.as_deref().unwrap_or("保持模板中的默认主题")
        );
        println!(
            "  - 终端能力检测: colors={} emoji={} nerd_font={}",
            capabilities.supports_colors(),
            capabilities.supports_emoji,
            capabilities.supports_nerd_font
        );
        if init_args.with_components {
            println!("  - 将复制组件模板 (dry-run 未执行)");
        }
        if init_args.global {
            println!("  - 作用范围: 用户级配置");
        } else {
            println!("  - 作用范围: 项目级配置");
        }
    } else {
        let result = ConfigLoader::create_default_config(options)?;
        println!("✅ 已生成配置文件: {}", result.path.display());
        if let Some(stats) = result.copy_stats {
            if stats.copied > 0 {
                println!("✅ 已复制 {} 个组件模板", stats.copied);
            }
            if stats.skipped > 0 {
                println!("⏭️  跳过 {} 个已存在的组件文件", stats.skipped);
                if !init_args.force {
                    println!("💡 提示: 使用 --force/-y 可以覆盖已存在的文件");
                }
            }
        }

        if init_args.global {
            println!("提示: 该配置对所有项目生效");
        } else {
            println!("提示: 该配置仅作用于对应项目");
        }
    }

    Ok(())
}

async fn handle_config_edit(
    loader: &mut ConfigLoader,
    parent_args: &ConfigArgs,
    edit_args: &ConfigEditArgs,
) -> Result<()> {
    let explicit = parent_args
        .file
        .as_deref()
        .or(edit_args.file.as_deref())
        .map(PathBuf::from);

    let want_global = edit_args.global || parent_args.global;

    let (path, scope) = if let Some(custom) = explicit {
        (custom, tui::EditScope::Custom)
    } else if want_global {
        let user = loader
            .user_config_path()
            .ok_or_else(|| anyhow!("无法确定用户级配置路径"))?;
        (user, tui::EditScope::User)
    } else {
        // 只有在项目级配置文件实际存在时,才默认进入 Project scope。
        // `project_config_path()` 即使没有文件也会算出一个路径,直接用会让
        // 任意目录下的 `config edit` 意外创建项目级 config。
        let project_existing = loader.project_config_path().ok().filter(|p| p.exists());
        if let Some(p) = project_existing {
            (p, tui::EditScope::Project)
        } else {
            let user = loader
                .user_config_path()
                .ok_or_else(|| anyhow!("无法确定用户级配置路径"))?;
            (user, tui::EditScope::User)
        }
    };

    let options = tui::EditOptions {
        path,
        scope,
        mock_scenario: edit_args.mock.clone(),
    };

    tui::run(options).await
}

fn handle_config_set(
    loader: &mut ConfigLoader,
    parent_args: &ConfigArgs,
    set_args: &ConfigSetArgs,
) -> Result<()> {
    let (key, value_expr) = normalize_assignment(&set_args.key, &set_args.value_parts)?;
    let key_for_display = key.clone();

    let path_tokens = parse_path_tokens(&key)?;

    let use_global = if parent_args.file.is_some() {
        false
    } else {
        set_args.global || parent_args.global
    };

    let target_path = if let Some(custom) = parent_args.file.as_deref() {
        PathBuf::from(custom)
    } else if use_global {
        loader
            .user_config_path()
            .ok_or_else(|| anyhow!("无法确定用户级配置路径"))?
    } else {
        loader.project_config_path()?
    };

    let scope_label = if parent_args.file.is_some() {
        "自定义路径"
    } else if use_global {
        "用户级"
    } else {
        "项目级"
    };

    let parsed_value = parse_value_expression(&value_expr);

    if parent_args.dry_run {
        println!("🔍 (dry-run) 将更新配置文件: {}", target_path.display());
        if !target_path.exists() {
            println!("  - 将创建新的配置文件 (使用默认模板)");
        }
        println!("  - 作用范围: {scope_label}");
        println!("  - 设置 {key_for_display} = {value_expr}");
        return Ok(());
    }

    let mut created = false;
    if !target_path.exists() {
        ConfigLoader::create_default_config(CreateConfigOptions {
            target_path: Some(target_path.as_path()),
            ..Default::default()
        })?;
        created = true;
    }

    let mut document = load_document(&target_path)?;
    set_document_value(&mut document, &path_tokens, parsed_value)?;

    fs::write(&target_path, document.to_string())
        .with_context(|| format!("无法写入配置文件: {}", target_path.display()))?;

    loader.clear_cache();

    if created {
        println!("🆕 已创建配置文件: {}", target_path.display());
    }
    println!("✅ 已更新配置: {key_for_display} = {value_expr}");
    println!(
        "📄 配置文件位置: {} ({})",
        target_path.display(),
        scope_label
    );

    Ok(())
}

async fn handle_theme(args: &ThemeArgs) -> Result<()> {
    let mut loader = ConfigLoader::new();

    match args.name.as_deref() {
        Some(name) => {
            loader.apply_theme(name).await?;
            println!("✅ 已应用主题: {name}");
        }
        None => {
            loader.load(None).await?;
            if let Some(source) = loader.get_config_source() {
                if let Some(path) = &source.path {
                    println!("当前配置文件: {}", path.display());
                }
            }
            println!("请提供主题名称，例如: claude-code-statusline-pro theme classic");
        }
    }

    Ok(())
}

async fn handle_validate(file: Option<&str>) -> Result<()> {
    let mut loader = ConfigLoader::new();
    loader.load(file).await?;
    if let Some(source) = loader.get_config_source() {
        println!(
            "✅ 配置有效: {}",
            source
                .path
                .as_ref()
                .map(|p| p.display().to_string())
                .unwrap_or_else(|| "内置默认配置".to_string())
        );
    }
    Ok(())
}

async fn handle_doctor() -> Result<()> {
    use claude_code_statusline_pro::terminal::detector::TerminalDetector;

    let detector = TerminalDetector::new();
    let capabilities = detector.detect(
        &AutoDetect::Bool(true),
        &AutoDetect::Bool(true),
        &AutoDetect::Bool(true),
        false,
        false,
        false,
    );

    println!("🔍 环境诊断结果");
    println!("操作系统: {}", std::env::consts::OS);
    println!(
        "终端: {}",
        std::env::var("TERM").unwrap_or_else(|_| "未知".to_string())
    );
    println!("颜色支持: {:?}", capabilities.color_support);
    println!("Emoji 支持: {}", bool_icon(capabilities.supports_emoji));
    println!(
        "Nerd Font 支持: {}",
        bool_icon(capabilities.supports_nerd_font)
    );

    let mut loader = ConfigLoader::new();
    match loader.load(None).await {
        Ok(_) => println!("配置状态: ✅ 有效"),
        Err(err) => println!("配置状态: ❌ 无效 ({err})"),
    }

    Ok(())
}

fn apply_runtime_overrides(cli: &Cli, config: &mut claude_code_statusline_pro::config::Config) {
    if cli.no_colors {
        config.style.enable_colors = AutoDetect::Bool(false);
    }
    if cli.no_emoji {
        config.style.enable_emoji = AutoDetect::Bool(false);
        config.terminal.force_emoji = false;
    }
    if cli.no_icons {
        config.style.enable_nerd_font = AutoDetect::Bool(false);
        config.terminal.force_nerd_font = false;
    }

    if cli.force_emoji {
        config.terminal.force_emoji = true;
    }
    if cli.force_nerd_font {
        config.terminal.force_nerd_font = true;
    }
    if cli.force_text {
        config.terminal.force_text = true;
        config.terminal.force_emoji = false;
        config.terminal.force_nerd_font = false;
    }
}

fn bool_icon(value: bool) -> &'static str {
    if value {
        "✅"
    } else {
        "⚪"
    }
}

fn print_merge_report(loader: &ConfigLoader, custom_path: Option<&str>) {
    println!("\n配置合并报告:");
    if let Some(report) = loader.merge_report() {
        if report.layers.is_empty() {
            if custom_path.is_some() {
                println!("  已加载配置，但未检测到覆盖层。");
            } else {
                println!("  未检测到用户或项目级覆盖层。");
            }
            return;
        }

        for (idx, layer) in report.layers.iter().enumerate() {
            println!(
                "  {}. {}{}",
                idx + 1,
                source_type_label(&layer.source_type),
                layer
                    .path
                    .as_ref()
                    .map(|p| format!(" -> {}", p.display()))
                    .unwrap_or_else(|| String::from(""))
            );

            if layer.added_keys.is_empty() && layer.updated_keys.is_empty() {
                println!("     (未引入新的键或覆盖现有键)");
                continue;
            }

            if !layer.added_keys.is_empty() {
                println!("     新增键: {}", format_key_list(&layer.added_keys));
            }
            if !layer.updated_keys.is_empty() {
                println!("     覆盖键: {}", format_key_list(&layer.updated_keys));
            }
        }
    } else {
        println!("  未生成合并报告 (可能由于缓存或尚未加载配置)。");
    }
}

fn source_type_label(source_type: &ConfigSourceType) -> &'static str {
    match source_type {
        ConfigSourceType::Default => "内置默认",
        ConfigSourceType::User => "用户级",
        ConfigSourceType::Project => "项目级",
        ConfigSourceType::Custom => "自定义",
    }
}

fn format_key_list(keys: &[String]) -> String {
    const MAX_DISPLAY: usize = 10;
    if keys.is_empty() {
        return String::new();
    }

    let display: Vec<String> = keys
        .iter()
        .take(MAX_DISPLAY)
        .map(|k| k.to_string())
        .collect();
    let mut result = display.join(", ");
    if keys.len() > MAX_DISPLAY {
        result.push_str(&format!(" … (+{} 项)", keys.len() - MAX_DISPLAY));
    }
    result
}

fn normalize_assignment(raw_key: &str, value_parts: &[String]) -> Result<(String, String)> {
    let mut key = raw_key.trim().to_string();

    if key.is_empty() {
        bail!("配置键不能为空");
    }

    let mut parts: Vec<String> = value_parts
        .iter()
        .map(|part| part.trim().to_string())
        .collect();

    if parts.is_empty() {
        if let Some((k, v)) = key.split_once('=') {
            let normalized_key = k.trim().to_string();
            let normalized_value = v.trim().to_string();

            if normalized_key.is_empty() {
                bail!("配置键不能为空");
            }
            if normalized_value.is_empty() {
                bail!(
                    "需要提供要设置的值，例如: claude-code-statusline-pro config set preset PMBT"
                );
            }

            return Ok((normalized_key, normalized_value));
        } else {
            bail!("需要提供要设置的值，例如: claude-code-statusline-pro config set preset PMBT");
        }
    }

    if key.ends_with('=') {
        key = key.trim_end_matches('=').trim().to_string();
    }

    if key.is_empty() {
        bail!("配置键不能为空");
    }

    if !parts.is_empty() && parts[0] == "=" {
        parts.remove(0);
    }

    if !parts.is_empty() {
        if let Some(stripped) = parts[0].strip_prefix('=') {
            parts[0] = stripped.trim().to_string();
        }
    }

    if parts.is_empty() {
        bail!("需要提供要设置的值，例如: claude-code-statusline-pro config set preset PMBT");
    }

    let value = parts.join(" ").trim().to_string();

    if value.is_empty() {
        bail!("需要提供要设置的值，例如: claude-code-statusline-pro config set preset PMBT");
    }

    Ok((key, value))
}

fn parse_value_expression(expr: &str) -> TomlEditValue {
    let trimmed = expr.trim();
    if trimmed.is_empty() {
        return TomlEditValue::from(trimmed);
    }

    if let Some(value) = try_parse_toml_value(trimmed) {
        return value;
    }

    TomlEditValue::from(trimmed)
}

fn try_parse_toml_value(expr: &str) -> Option<TomlEditValue> {
    let snippet = format!("__value__ = {expr}");
    let mut document = snippet.parse::<DocumentMut>().ok()?;
    document
        .as_table_mut()
        .remove("__value__")
        .and_then(|item| item.into_value().ok())
}

#[derive(Debug, Clone)]
enum PathToken {
    Key(String),
    Index(IndexKind),
}

#[derive(Debug, Clone)]
enum IndexKind {
    Position(usize),
    Append,
}

fn parse_path_tokens(path: &str) -> Result<Vec<PathToken>> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        bail!("配置键不能为空");
    }

    let mut tokens = Vec::new();
    let mut buffer = String::new();
    let mut chars = trimmed.chars().peekable();

    while let Some(ch) = chars.next() {
        match ch {
            '.' => {
                if buffer.trim().is_empty() {
                    bail!("配置键片段不能为空");
                }
                tokens.push(PathToken::Key(buffer.trim().to_string()));
                buffer.clear();
            }
            '[' => {
                if !buffer.trim().is_empty() {
                    tokens.push(PathToken::Key(buffer.trim().to_string()));
                    buffer.clear();
                } else if tokens.is_empty() {
                    bail!("路径必须以键开始，不能直接使用索引");
                }

                let mut index_buffer = String::new();
                let mut closed = false;
                for next_ch in chars.by_ref() {
                    if next_ch == ']' {
                        closed = true;
                        break;
                    }
                    index_buffer.push(next_ch);
                }

                if !closed {
                    bail!("缺少对应的 `]` 用于数组索引");
                }

                let index_str = index_buffer.trim();
                if index_str.is_empty() {
                    tokens.push(PathToken::Index(IndexKind::Append));
                } else {
                    let index = index_str
                        .parse::<usize>()
                        .map_err(|_| anyhow!(r#"数组索引必须是非负整数: "{index_str}""#))?;
                    tokens.push(PathToken::Index(IndexKind::Position(index)));
                }
            }
            ']' => bail!("检测到不匹配的 `]`"),
            _ => buffer.push(ch),
        }
    }

    if !buffer.trim().is_empty() {
        tokens.push(PathToken::Key(buffer.trim().to_string()));
    } else if !buffer.is_empty() {
        bail!("配置键片段不能为空");
    }

    if tokens.is_empty() {
        bail!("配置键不能为空");
    }

    Ok(tokens)
}

fn set_document_value(
    document: &mut DocumentMut,
    tokens: &[PathToken],
    value: TomlEditValue,
) -> Result<()> {
    if tokens.is_empty() {
        bail!("配置键不能为空");
    }

    match tokens.first() {
        Some(PathToken::Key(key)) => set_in_table(
            document.as_table_mut(),
            key,
            &tokens[1..],
            value,
            String::new(),
        ),
        Some(PathToken::Index(_)) => {
            bail!("路径必须以键开始，不能直接使用数组索引");
        }
        None => bail!("配置键不能为空"),
    }
}

fn set_in_table(
    table: &mut Table,
    key: &str,
    rest: &[PathToken],
    value: TomlEditValue,
    current_path: String,
) -> Result<()> {
    let mut path = current_path;
    if !path.is_empty() {
        path.push('.');
    }
    path.push_str(key);

    if rest.is_empty() {
        table.insert(key, Item::Value(value));
        return Ok(());
    }

    match &rest[0] {
        PathToken::Key(next_key) => {
            if !table.contains_key(key) {
                table.insert(key, Item::Table(Table::new()));
            }

            let item = table
                .get_mut(key)
                .ok_or_else(|| anyhow!("内部错误: 无法获取路径 {path}"))?;

            if !item.is_table() {
                bail!(r#"路径 "{path}" 已存在且不是表，无法继续设置"#);
            }

            let child_table = item
                .as_table_mut()
                .ok_or_else(|| anyhow!("内部错误: 无法获取路径 {path}"))?;
            set_in_table(child_table, next_key, &rest[1..], value, path)
        }
        PathToken::Index(_) => {
            if !table.contains_key(key) {
                table.insert(key, Item::Value(TomlEditValue::Array(Array::new())));
            }

            let item = table
                .get_mut(key)
                .ok_or_else(|| anyhow!("内部错误: 无法获取路径 {path}"))?;

            let array = item
                .as_value_mut()
                .and_then(|v| v.as_array_mut())
                .ok_or_else(|| anyhow!(r#"路径 "{path}" 不是数组"#))?;

            set_in_array(array, rest, value, path)
        }
    }
}

fn set_in_array(
    array: &mut Array,
    tokens: &[PathToken],
    value: TomlEditValue,
    current_path: String,
) -> Result<()> {
    let Some(PathToken::Index(index_kind)) = tokens.first() else {
        bail!("内部错误: 数组路径缺少索引");
    };

    match index_kind {
        IndexKind::Append => {
            if tokens.len() > 1 {
                bail!(r#"路径 "{current_path}[]" 不支持继续嵌套"#);
            }
            array.push(value);
            Ok(())
        }
        IndexKind::Position(index) => {
            let idx = *index;
            if tokens.len() > 1 {
                bail!(r#"数组项 "{current_path}[{idx}]" 不支持继续嵌套"#);
            }

            if idx < array.len() {
                let element = array
                    .get_mut(idx)
                    .ok_or_else(|| anyhow!("内部错误: 无法访问数组索引 {idx}"))?;
                *element = value;
            } else if idx == array.len() {
                array.push(value);
            } else {
                bail!(
                    r#"数组索引超出范围: "{}[{}]" 当前长度 {}"#,
                    current_path,
                    idx,
                    array.len()
                );
            }
            Ok(())
        }
    }
}

fn load_document(path: &Path) -> Result<DocumentMut> {
    let content = fs::read_to_string(path)
        .with_context(|| format!("无法读取配置文件: {}", path.display()))?;
    content
        .parse::<DocumentMut>()
        .map_err(|err| anyhow!("配置文件不是有效的 TOML 格式: {} ({})", path.display(), err))
}
