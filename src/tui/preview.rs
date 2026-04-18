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

/// 从 `DocumentMut` 字符串反序列化到 `Config`;解析错误时包一层上下文。
pub fn parse_config(toml_text: &str) -> Result<Config> {
    toml_edit::de::from_str::<Config>(toml_text).map_err(|err| anyhow!("{err}"))
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
}
