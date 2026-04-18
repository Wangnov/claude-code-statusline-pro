//! 实时预览:用当前编辑中的配置调用 `StatuslineGenerator` + mock 数据。
//!
//! v2 起用 `ansi_to_tui` 把 statusline 输出的 ANSI 转义直接解析成 ratatui `Line`,
//! TUI 里能看到带颜色的主线与渐变进度条,和真实终端里一致。

use std::path::Path;

use ansi_to_tui::IntoText;
use anyhow::{anyhow, Result};
use ratatui::text::Line;
use toml_edit::DocumentMut;

use claude_code_statusline_pro::config::Config;
use claude_code_statusline_pro::core::{GeneratorOptions, StatuslineGenerator};

use crate::mock_data::MockDataGenerator;

/// 预览一次的结果:每行保留颜色样式的 ratatui `Line`。
///
/// `base_dir` 应该是当前正在编辑的配置文件所在目录;传给 generator 是为了
/// 让多行 widget 的 `components/*.toml` 解析走和真实运行时一样的相对路径,
/// 否则 project/custom scope 下的预览会错误地回落到用户目录或 `./components`,
/// 和实际渲染出现偏差。
pub async fn render(
    config: &Config,
    mock: &str,
    base_dir: Option<&Path>,
) -> Result<Vec<Line<'static>>> {
    let options = GeneratorOptions {
        update_throttling: false, // 预览要立即反映,不走 300ms 节流
        disable_cache: true,
        config_base_dir: base_dir.map(|p| p.to_string_lossy().into_owned()),
        // 预览只是把 mock 的 InputData 过一遍渲染管线,看配置长什么样,
        // 绝不能顺手把合成的 session_id / cost 写到 `~/.claude/.../sessions/`
        // 里去污染真实 usage / cost 历史。generator 内部的守卫会在
        // `preview_mode=true` 时跳过 storage 初始化和 snapshot 写入。
        preview_mode: true,
        ..GeneratorOptions::default()
    };

    let mut generator = StatuslineGenerator::new(config.clone(), options);
    let mock_gen = MockDataGenerator::new();
    let input = mock_gen.generate(mock).unwrap_or_default();

    let raw = generator.generate(input).await?;
    ansi_to_lines(&raw)
}

fn ansi_to_lines(raw: &str) -> Result<Vec<Line<'static>>> {
    let text = raw
        .as_bytes()
        .into_text()
        .map_err(|err| anyhow!("ANSI 解析失败: {err}"))?;
    Ok(text.lines.into_iter().collect())
}

/// 可用 mock 场景列表(排序)。
pub fn available_mocks() -> Vec<String> {
    let mut v: Vec<String> = MockDataGenerator::new()
        .available()
        .map(std::string::ToString::to_string)
        .collect();
    v.sort();
    v
}

/// 把 TOML 当作 `inherited` 之上的稀疏 overlay 反序列化。
///
/// `inherited` 一般由调用方(App)按当前编辑的 scope 预先算好:
/// - `User` 编辑 → inherited = `Config::default()` 的 JSON
/// - `Project` 编辑 → inherited = default + 用户层
/// - `Custom` 编辑 → inherited = default + 用户层 + 项目层(走 `ConfigLoader`)
///
/// 这样预览才会和真实运行时一致:如果用户层写了 `theme = "powerline"`,
/// 而项目级配置只覆盖了一个图标,预览里仍然能看到 powerline 主题;
/// 否则就会错误地回落成默认主题,编辑器等于在假数据上工作。
///
/// `ConfigLoader::load_config_layers` 就是这么干的:用户/项目/自定义层都
/// 按"增量叠加"语义处理,最后再把合并后的 JSON 反序列化到 `Config`。
/// 如果这里直接 `toml_edit::de::from_str::<Config>`,像 flattened
/// `BaseComponentConfig`(`emoji_icon` / `nerd_icon` / `text_icon`
/// 没有 serde default)就会拒绝一切省略了这些键的局部配置 —— 包括
/// 空文件和首次从最小 override 起步的配置,直接砍掉编辑器的使用场景。
pub fn parse_config(toml_text: &str, inherited: &serde_json::Value) -> Result<Config> {
    let mut merged = inherited.clone();
    if !toml_text.trim().is_empty() {
        let overlay: serde_json::Value =
            toml_edit::de::from_str(toml_text).map_err(|err| anyhow!("{err}"))?;
        merge_json(&mut merged, overlay);
    }
    serde_json::from_value(merged).map_err(|err| anyhow!("{err}"))
}

/// 返回点路径 `dotted`(形如 `components.project.enabled`)的"最终生效值"
/// ,按 inherited baseline → 当前 buffer 的顺序合并后再读,拿不到就返回 `None`。
///
/// Codex round 7 / P2 的 bool 快捷切换必须走这条路径:之前 `space_action`
/// 用 `io::get_bool(buffer).unwrap_or(false)`,在 sparse 配置里默认值为 true
/// 的字段(比如 `enabled`)读到的是 false;第一次按空格只写入 true = 等于没
/// 变化,用户得按两次才能真关掉一个默认开的开关。现在先合并 inherited
/// + buffer 再查,就和运行时的"有效值"一致了。
///
/// 解析 buffer 失败(不是合法 TOML)时直接返回 `None`,让调用方按"拿不到
/// 有效值"处理;bail 到 false fallback 是更糟的决策,因为会丢 inherited
/// 里可能已经有的正确值。
pub fn effective_bool(
    document: &DocumentMut,
    inherited: &serde_json::Value,
    dotted: &str,
) -> Option<bool> {
    let buffer_overlay: serde_json::Value = toml_edit::de::from_str(&document.to_string()).ok()?;
    if !buffer_overlay.is_object() {
        // 空文档或不完整 buffer 解析出来可能不是 Object。不进行 merge
        // (merge_json 对非 Object overlay 会整体替换 base,会把 inherited
        // 抹平成非对象,从而导致后面的 .get 走不下去),直接查 inherited。
        return walk_json_bool(inherited, dotted);
    }
    let mut merged = inherited.clone();
    merge_json(&mut merged, buffer_overlay);
    walk_json_bool(&merged, dotted)
}

fn walk_json_bool(root: &serde_json::Value, dotted: &str) -> Option<bool> {
    let mut current = root;
    for seg in dotted.split('.') {
        current = current.get(seg)?;
    }
    current.as_bool()
}

/// 与 `ConfigLoader::merge_value` 语义保持一致:object 合并,其他直接覆盖。
///
/// `pub(crate)` 是为了让 `tui::app` 在计算 inherited baseline 时能直接复用
/// 这套合并逻辑,免得在两个地方写两份容易漂的规则。
pub(crate) fn merge_json(base: &mut serde_json::Value, overlay: serde_json::Value) {
    use serde_json::Value;
    match (base, overlay) {
        (Value::Object(base_map), Value::Object(overlay_map)) => {
            for (k, v) in overlay_map {
                match base_map.get_mut(&k) {
                    Some(existing) => merge_json(existing, v),
                    None => {
                        base_map.insert(k, v);
                    }
                }
            }
        }
        (slot, other) => *slot = other,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ansi_to_lines_plain() -> Result<()> {
        let lines = ansi_to_lines("hello world\n")?;
        assert!(!lines.is_empty());
        Ok(())
    }

    #[test]
    fn test_ansi_to_lines_with_escape() -> Result<()> {
        let lines = ansi_to_lines("\x1b[31mhello\x1b[0m")?;
        assert!(!lines.is_empty());
        // ansi-to-tui 会把每个转义解析成带样式的 Span
        let has_content = lines
            .iter()
            .any(|l| l.spans.iter().any(|s| s.content.contains("hello")));
        assert!(has_content);
        Ok(())
    }

    #[test]
    fn test_available_mocks_not_empty() {
        let mocks = available_mocks();
        assert!(!mocks.is_empty());
    }

    #[tokio::test]
    async fn test_render_default_config_with_dev_mock() -> Result<()> {
        let config = Config::default();
        let lines = render(&config, "dev", None).await?;
        assert!(!lines.is_empty());
        Ok(())
    }

    #[tokio::test]
    async fn test_render_honors_base_dir() -> Result<()> {
        // 只是确认 base_dir 被接受且不 panic;与 main.rs 的行为对齐
        let temp = tempfile::tempdir()?;
        let config = Config::default();
        let lines = render(&config, "dev", Some(temp.path())).await?;
        assert!(!lines.is_empty());
        Ok(())
    }

    /// 回归:preview render 必须是"纯函数",不能在 `$HOME/.claude/.../sessions/`
    /// 下落任何 snapshot 文件。之前 generator 无条件调用
    /// `storage::update_session_snapshot`,只要编辑器打开或切一下 mock 场景,
    /// 就会把合成的 `mock-dev-session` 写进真实 usage 历史。
    #[tokio::test]
    async fn test_render_does_not_persist_session_snapshot() -> Result<()> {
        // 用临时 HOME 捕获所有可能的持久化 I/O;真实用户目录绝对不能被写到。
        let fake_home = tempfile::tempdir()?;
        let original_home = std::env::var_os("HOME");
        // 安全起见,tests 在同一 process 里是串行运行的单个 test_render_*,
        // 但 std::env 是全局的;设置后 test 末尾必须恢复。
        std::env::set_var("HOME", fake_home.path());

        let config = Config::default();
        let render_result = render(&config, "dev", None).await;

        // 恢复 HOME 后再断言,避免污染后续测试
        match original_home {
            Some(v) => std::env::set_var("HOME", v),
            None => std::env::remove_var("HOME"),
        }

        let lines = render_result?;
        assert!(!lines.is_empty());

        // fake_home 里不能出现任何 sessions 目录。即使出现,也不能有文件。
        let sessions_root = fake_home.path().join(".claude");
        if sessions_root.exists() {
            // 允许目录存在(不是我们建的也可能是测试辅助),但不能有 session json
            let mut stack = vec![sessions_root];
            while let Some(dir) = stack.pop() {
                for entry in std::fs::read_dir(&dir)?.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        stack.push(path);
                    } else {
                        panic!(
                            "preview render 不应该在 $HOME 下写任何文件,却发现: {}",
                            path.display()
                        );
                    }
                }
            }
        }
        Ok(())
    }

    fn defaults_json() -> serde_json::Value {
        serde_json::to_value(Config::default()).expect("default config serializable")
    }

    /// 回归:稀疏配置(没有覆盖 components.*.emoji_icon 等 flatten 必填字段)
    /// 必须能通过 parse_config,否则编辑器里首次保存就会被误判为"校验失败"。
    #[test]
    fn test_parse_config_accepts_empty_overlay() -> Result<()> {
        let cfg = parse_config("", &defaults_json())?;
        // 空文件 → 等于全默认
        assert_eq!(cfg.theme, Config::default().theme);
        Ok(())
    }

    #[test]
    fn test_parse_config_accepts_sparse_partial_override() -> Result<()> {
        // 只改一个 preset + 一个嵌套字段,不重复声明 components.project 的 icon
        let toml = r#"
preset = "PMBT"

[components.project]
enabled = false
"#;
        let cfg = parse_config(toml, &defaults_json())?;
        assert_eq!(cfg.preset.as_deref(), Some("PMBT"));
        assert!(!cfg.components.project.base.enabled);
        // 其他默认值保留
        assert!(!cfg.components.project.base.emoji_icon.is_empty());
        Ok(())
    }

    #[test]
    fn test_parse_config_rejects_type_mismatch() {
        // 类型错了应该仍然报错(enabled 被写成字符串)
        let toml = r#"
[components.project]
enabled = "yes"
"#;
        assert!(parse_config(toml, &defaults_json()).is_err());
    }

    /// 回归:当 inherited(= 用户层/项目层)里已经设置了某字段而 buffer
    /// 没提到它,parse_config 必须透传 inherited 的值,不能让它回落到
    /// `Config::default()`。这是 Codex round 7 的 P1 核心场景:以前编辑
    /// 项目级配置时预览完全看不到用户层的 theme,等于在错误 baseline 上工作。
    #[test]
    fn test_parse_config_inherits_lower_layer_values() -> Result<()> {
        let mut inherited = defaults_json();
        inherited["theme"] = serde_json::Value::String("powerline".to_string());

        let buffer = r#"preset = "PMBT"
"#;
        let cfg = parse_config(buffer, &inherited)?;
        assert_eq!(cfg.theme, "powerline", "inherited theme 必须保留");
        assert_eq!(cfg.preset.as_deref(), Some("PMBT"));
        Ok(())
    }

    /// buffer 显式写同一个 key 时必须能覆盖 inherited 的值。
    #[test]
    fn test_parse_config_buffer_overrides_inherited() -> Result<()> {
        let mut inherited = defaults_json();
        inherited["theme"] = serde_json::Value::String("powerline".to_string());

        let buffer = r#"theme = "classic"
"#;
        let cfg = parse_config(buffer, &inherited)?;
        assert_eq!(cfg.theme, "classic");
        Ok(())
    }

    /// 回归 Codex round 7 / P2:bool 快捷切换必须从"最终生效值"起跳。
    /// Config::default() 里 `components.project.enabled = true`,如果 buffer
    /// 完全没提到这个 key,effective_bool 要拿到 true;之前 unwrap_or(false)
    /// 会读到 false,第一次按空格写入 true 等于没变化。
    #[test]
    fn test_effective_bool_reads_default_true_when_buffer_silent() -> Result<()> {
        let doc: DocumentMut = "".parse()?;
        let inherited = defaults_json();
        // default 里这个字段应该就是 true(components.project.enabled)
        let v = effective_bool(&doc, &inherited, "components.project.enabled");
        assert_eq!(v, Some(true));
        Ok(())
    }

    /// buffer 覆盖 inherited 的情况。
    #[test]
    fn test_effective_bool_buffer_beats_inherited() -> Result<()> {
        let doc: DocumentMut = "[components.project]\nenabled = false\n".parse()?;
        let inherited = defaults_json();
        let v = effective_bool(&doc, &inherited, "components.project.enabled");
        assert_eq!(v, Some(false));
        Ok(())
    }

    /// inherited 里不存在的字段,effective_bool 返回 None,交给调用方决定 fallback。
    #[test]
    fn test_effective_bool_missing_key_returns_none() -> Result<()> {
        let doc: DocumentMut = "".parse()?;
        let inherited = defaults_json();
        let v = effective_bool(&doc, &inherited, "components.project.not_a_field");
        assert_eq!(v, None);
        Ok(())
    }

    /// inherited 里用户层已经把默认 true 的开关改成 false,buffer 又没提,
    /// effective_bool 必须拿到 inherited 的 false,而不是回落到 default 的 true。
    #[test]
    fn test_effective_bool_inherited_beats_default() -> Result<()> {
        let doc: DocumentMut = "".parse()?;
        let mut inherited = defaults_json();
        inherited["components"]["project"]["enabled"] = serde_json::Value::Bool(false);
        let v = effective_bool(&doc, &inherited, "components.project.enabled");
        assert_eq!(v, Some(false));
        Ok(())
    }
}
