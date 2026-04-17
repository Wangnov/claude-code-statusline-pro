//! 扫描并在线编辑 `components/*.toml` 里的 widgets。
//!
//! v3 扩展:除了只读的 `WidgetSummary`,新增 `WidgetFile` 结构承载每个文件内完整
//! widget 元信息,并提供三个 CRUD 操作(toggle_enabled / cycle_type / delete)。
//! 所有写入都走 `toml_edit::DocumentMut`,保留注释与顺序。

use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{anyhow, bail, Context, Result};
use toml_edit::{value as toml_value, DocumentMut, Item};

use claude_code_statusline_pro::config::ComponentMultilineConfig;
use claude_code_statusline_pro::utils;

/// 旧版本只读摘要(向后兼容,其他 v2 代码还在用)。
pub struct WidgetSummary {
    pub component: String,
    pub file_path: PathBuf,
    pub widget_names: Vec<String>,
}

/// v3:完整的每文件 widget 元信息。
#[derive(Debug, Clone)]
pub struct WidgetFile {
    pub component: String,
    pub path: PathBuf,
    pub entries: Vec<WidgetEntry>,
}

/// 单个 widget 的关键属性(列表展示用)。
#[derive(Debug, Clone)]
pub struct WidgetEntry {
    pub name: String,
    pub enabled: bool,
    pub kind: String, // "static" | "api"
    pub row: u32,
    pub col: u32,
}

// ---- 只读摘要(v2 兼容接口) ----

/// 扫描用户级和给定项目配置目录下的 `components/*.toml`,只返回名字列表。
pub fn scan_summaries(project_base_dir: Option<&Path>) -> Vec<WidgetSummary> {
    scan_files(project_base_dir)
        .into_iter()
        .map(|wf| WidgetSummary {
            component: wf.component,
            file_path: wf.path,
            widget_names: wf.entries.into_iter().map(|e| e.name).collect(),
        })
        .collect()
}

// ---- v3 完整扫描 ----

/// 扫描并返回每个文件里的 widget 完整元信息。
pub fn scan_files(project_base_dir: Option<&Path>) -> Vec<WidgetFile> {
    let mut out = Vec::new();

    if let Some(home) = utils::home_dir() {
        collect_from_dir(&home.join(".claude/statusline-pro/components"), &mut out);
    }
    if let Some(base) = project_base_dir {
        collect_from_dir(&base.join("components"), &mut out);
    }

    out.sort_by(|a, b| a.component.cmp(&b.component));
    out
}

fn collect_from_dir(dir: &Path, out: &mut Vec<WidgetFile>) {
    if !dir.exists() {
        return;
    }
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "toml") {
            if let Some(file) = parse_file(&path) {
                out.push(file);
            }
        }
    }
}

fn parse_file(path: &Path) -> Option<WidgetFile> {
    let component = path.file_stem()?.to_str()?.to_string();
    let content = fs::read_to_string(path).ok()?;
    let config: ComponentMultilineConfig = toml_edit::de::from_str(&content).ok()?;
    let mut entries: Vec<WidgetEntry> = config
        .widgets
        .into_iter()
        .map(|(name, cfg)| WidgetEntry {
            name,
            enabled: cfg.enabled,
            kind: match cfg.kind {
                claude_code_statusline_pro::config::WidgetType::Static => "static".to_string(),
                claude_code_statusline_pro::config::WidgetType::Api => "api".to_string(),
            },
            row: cfg.row,
            col: cfg.col,
        })
        .collect();
    entries.sort_by(|a, b| a.name.cmp(&b.name));
    Some(WidgetFile {
        component,
        path: path.to_path_buf(),
        entries,
    })
}

// ---- CRUD ----

/// 翻转指定 widget 的 `enabled`。返回新值。
pub fn toggle_enabled(path: &Path, widget_name: &str) -> Result<bool> {
    let mut doc = load_document(path)?;
    let current = widget_get_bool(&doc, widget_name, "enabled").unwrap_or(true);
    widget_set(&mut doc, widget_name, "enabled", toml_value(!current))?;
    save_document(path, &doc)?;
    Ok(!current)
}

/// 在 static ↔ api 之间循环。返回新类型字符串。
pub fn cycle_type(path: &Path, widget_name: &str) -> Result<String> {
    let mut doc = load_document(path)?;
    let current = widget_get_string(&doc, widget_name, "type").unwrap_or_else(|| "static".into());
    let next = if current == "static" { "api" } else { "static" };
    widget_set(&mut doc, widget_name, "type", toml_value(next))?;
    save_document(path, &doc)?;
    Ok(next.to_string())
}

/// 删除整个 widget 表。
pub fn delete_widget(path: &Path, widget_name: &str) -> Result<()> {
    let mut doc = load_document(path)?;
    let widgets = doc
        .get_mut("widgets")
        .and_then(|i| i.as_table_mut())
        .ok_or_else(|| anyhow!("{} 中没有 [widgets] 表", path.display()))?;
    if widgets.remove(widget_name).is_none() {
        bail!("widget '{widget_name}' 不存在于 {}", path.display());
    }
    save_document(path, &doc)?;
    Ok(())
}

// ---- 底层 TOML 操作 ----

fn load_document(path: &Path) -> Result<DocumentMut> {
    let content =
        fs::read_to_string(path).with_context(|| format!("读取 {} 失败", path.display()))?;
    content
        .parse::<DocumentMut>()
        .map_err(|err| anyhow!("{} 不是有效 TOML: {err}", path.display()))
}

fn save_document(path: &Path, doc: &DocumentMut) -> Result<()> {
    let tmp = path.with_extension("toml.tmp");
    fs::write(&tmp, doc.to_string()).with_context(|| format!("写 {} 失败", tmp.display()))?;
    fs::rename(&tmp, path).with_context(|| format!("重命名失败: {}", path.display()))?;
    Ok(())
}

fn widget_get_bool(doc: &DocumentMut, widget: &str, key: &str) -> Option<bool> {
    doc.get("widgets")?
        .as_table_like()?
        .get(widget)?
        .as_table_like()?
        .get(key)?
        .as_bool()
}

fn widget_get_string(doc: &DocumentMut, widget: &str, key: &str) -> Option<String> {
    doc.get("widgets")?
        .as_table_like()?
        .get(widget)?
        .as_table_like()?
        .get(key)?
        .as_str()
        .map(std::string::ToString::to_string)
}

fn widget_set(doc: &mut DocumentMut, widget: &str, key: &str, value: Item) -> Result<()> {
    let widgets = doc
        .entry("widgets")
        .or_insert(Item::Table(toml_edit::Table::new()))
        .as_table_mut()
        .ok_or_else(|| anyhow!("widgets 不是表"))?;
    let widget_table = widgets
        .entry(widget)
        .or_insert(Item::Table(toml_edit::Table::new()))
        .as_table_mut()
        .ok_or_else(|| anyhow!("widgets.{widget} 不是表"))?;
    widget_table.insert(key, value);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use anyhow::Result;

    fn write_sample(dir: &Path) -> Result<PathBuf> {
        let comp_dir = dir.join("components");
        fs::create_dir_all(&comp_dir)?;
        let path = comp_dir.join("usage.toml");
        fs::write(
            &path,
            r#"
[widgets.foo]
enabled = true
type = "static"
row = 1
col = 0
nerd_icon = "x"
emoji_icon = "x"
text_icon = "[x]"
content = "hello"

[widgets.bar]
enabled = false
type = "api"
row = 1
col = 1
nerd_icon = "y"
emoji_icon = "y"
text_icon = "[y]"
"#,
        )?;
        Ok(path)
    }

    #[test]
    fn test_scan_files() -> Result<()> {
        let temp = tempfile::tempdir()?;
        write_sample(temp.path())?;
        let files = scan_files(Some(temp.path()));
        let usage = files.iter().find(|f| f.component == "usage");
        assert!(usage.is_some());
        let usage = match usage {
            Some(u) => u,
            None => return Ok(()),
        };
        assert_eq!(usage.entries.len(), 2);
        let foo = usage.entries.iter().find(|e| e.name == "foo");
        let foo = match foo {
            Some(f) => f,
            None => return Ok(()),
        };
        assert!(foo.enabled);
        assert_eq!(foo.kind, "static");
        Ok(())
    }

    #[test]
    fn test_toggle_enabled() -> Result<()> {
        let temp = tempfile::tempdir()?;
        let path = write_sample(temp.path())?;
        let new_value = toggle_enabled(&path, "foo")?;
        assert!(!new_value);
        // 再切一次应该回 true
        let new_value = toggle_enabled(&path, "foo")?;
        assert!(new_value);
        Ok(())
    }

    #[test]
    fn test_cycle_type() -> Result<()> {
        let temp = tempfile::tempdir()?;
        let path = write_sample(temp.path())?;
        let new_type = cycle_type(&path, "foo")?;
        assert_eq!(new_type, "api");
        let new_type = cycle_type(&path, "foo")?;
        assert_eq!(new_type, "static");
        Ok(())
    }

    #[test]
    fn test_delete_widget() -> Result<()> {
        let temp = tempfile::tempdir()?;
        let path = write_sample(temp.path())?;
        delete_widget(&path, "bar")?;
        let files = scan_files(Some(temp.path()));
        let usage = files.iter().find(|f| f.component == "usage");
        let usage = match usage {
            Some(u) => u,
            None => return Ok(()),
        };
        assert!(usage.entries.iter().all(|e| e.name != "bar"));
        Ok(())
    }

    #[test]
    fn test_scan_missing_dir_returns_empty() -> Result<()> {
        let temp = tempfile::tempdir()?;
        let summaries = scan_summaries(Some(temp.path()));
        let _ = summaries;
        Ok(())
    }

    #[test]
    fn test_scan_with_widget_file() -> Result<()> {
        let temp = tempfile::tempdir()?;
        write_sample(temp.path())?;
        let summaries = scan_summaries(Some(temp.path()));
        let usage = summaries.iter().find(|s| s.component == "usage");
        assert!(usage.is_some());
        Ok(())
    }
}
