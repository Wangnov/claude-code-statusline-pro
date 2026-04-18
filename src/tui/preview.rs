//! 实时预览:用当前编辑中的配置调用 `StatuslineGenerator` + mock 数据。
//!
//! v2 起用 `ansi_to_tui` 把 statusline 输出的 ANSI 转义直接解析成 ratatui `Line`,
//! TUI 里能看到带颜色的主线与渐变进度条,和真实终端里一致。

use std::path::Path;

use ansi_to_tui::IntoText;
use anyhow::{anyhow, Result};
use ratatui::text::Line;

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

/// 把 TOML 当作 `Config::default()` 之上的稀疏 overlay 反序列化。
///
/// `ConfigLoader::load_config_layers` 就是这么干的:用户/项目/自定义层都
/// 按"增量叠加"语义处理,最后再把合并后的 JSON 反序列化到 `Config`。
/// 如果这里直接 `toml_edit::de::from_str::<Config>`,像 flattened
/// `BaseComponentConfig`(`emoji_icon` / `nerd_icon` / `text_icon`
/// 没有 serde default)就会拒绝一切省略了这些键的局部配置 —— 包括
/// 空文件和首次从最小 override 起步的配置,直接砍掉编辑器的使用场景。
pub fn parse_config(toml_text: &str) -> Result<Config> {
    let mut merged = serde_json::to_value(Config::default())
        .map_err(|err| anyhow!("序列化默认配置失败: {err}"))?;
    if !toml_text.trim().is_empty() {
        let overlay: serde_json::Value =
            toml_edit::de::from_str(toml_text).map_err(|err| anyhow!("{err}"))?;
        merge_json(&mut merged, overlay);
    }
    serde_json::from_value(merged).map_err(|err| anyhow!("{err}"))
}

/// 与 `ConfigLoader::merge_value` 语义保持一致:object 合并,其他直接覆盖。
fn merge_json(base: &mut serde_json::Value, overlay: serde_json::Value) {
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

    /// 回归:稀疏配置(没有覆盖 components.*.emoji_icon 等 flatten 必填字段)
    /// 必须能通过 parse_config,否则编辑器里首次保存就会被误判为"校验失败"。
    #[test]
    fn test_parse_config_accepts_empty_overlay() -> Result<()> {
        let cfg = parse_config("")?;
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
        let cfg = parse_config(toml)?;
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
        assert!(parse_config(toml).is_err());
    }
}
