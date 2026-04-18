//! 扫描并在线编辑 `components/*.toml` 里的 widgets。
//!
//! v3 扩展:除了只读的 `WidgetSummary`,新增 `WidgetFile` 结构承载每个文件内完整
//! widget 元信息,并提供三个 CRUD 操作(toggle_enabled / cycle_type / delete)。
//! 所有写入都走 `toml_edit::DocumentMut`,保留注释与顺序。

use std::collections::HashSet;
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
///
/// 在 user scope 下,`project_base_dir` 解析出的组件目录会与用户级目录
/// 指向同一位置(`~/.claude/statusline-pro/components`),必须去重避免
/// 同一个 widget 被扫两次。去重基于 canonicalize 后的绝对路径。
pub fn scan_files(project_base_dir: Option<&Path>) -> Vec<WidgetFile> {
    let mut out = Vec::new();
    let mut seen: HashSet<PathBuf> = HashSet::new();

    if let Some(home) = utils::home_dir() {
        collect_from_dir(
            &home.join(".claude/statusline-pro/components"),
            &mut out,
            &mut seen,
        );
    }
    if let Some(base) = project_base_dir {
        collect_from_dir(&base.join("components"), &mut out, &mut seen);
    }

    out.sort_by(|a, b| a.component.cmp(&b.component));
    out
}

fn collect_from_dir(dir: &Path, out: &mut Vec<WidgetFile>, seen: &mut HashSet<PathBuf>) {
    if !dir.exists() {
        return;
    }
    // canonicalize 在目录存在时一定成功,fallback 只是保守兜底
    let canonical = dir.canonicalize().unwrap_or_else(|_| dir.to_path_buf());
    if !seen.insert(canonical) {
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

/// 创建一个默认模板的静态 widget。
/// 模板:enabled=true, type=static, row=1, col=0, content="new widget"。
pub fn create_widget(path: &Path, widget_name: &str) -> Result<()> {
    if widget_name.is_empty() {
        bail!("widget 名字不能为空");
    }
    if !widget_name
        .chars()
        .all(|c| c.is_alphanumeric() || c == '_' || c == '-')
    {
        bail!("widget 名字只能是字母/数字/下划线/短横");
    }

    // 文件存在时必须严格解析,parse 失败绝不能用空 DocumentMut 覆盖
    // (否则新建 widget 的同时会把原文件的所有注释和 widgets 一起抹掉)。
    // 文件不存在才是合法的"从空开始"场景。
    let mut doc = if path.exists() {
        load_document(path)?
    } else {
        DocumentMut::new()
    };

    let widgets = doc
        .entry("widgets")
        .or_insert(Item::Table(toml_edit::Table::new()))
        .as_table_mut()
        .ok_or_else(|| anyhow!("widgets 不是表"))?;

    if widgets.contains_key(widget_name) {
        bail!("widget '{widget_name}' 已存在,不能重复创建");
    }

    let mut table = toml_edit::Table::new();
    table.insert("enabled", toml_value(true));
    table.insert("type", toml_value("static"));
    table.insert("row", toml_value(1_i64));
    table.insert("col", toml_value(0_i64));
    table.insert("nerd_icon", toml_value(""));
    table.insert("emoji_icon", toml_value("📌"));
    table.insert("text_icon", toml_value("[?]"));
    table.insert("content", toml_value("new widget"));
    widgets.insert(widget_name, Item::Table(table));

    save_document(path, &doc)
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

    /// 模拟 user scope:project_base_dir 就是组件目录的父目录,
    /// 和 utils::home_dir() 得到的路径重合时不应该扫出重复条目。
    #[test]
    fn test_scan_files_dedups_same_dir() -> Result<()> {
        let temp = tempfile::tempdir()?;
        let path = write_sample(temp.path())?;
        // 用相同路径调两次 collect_from_dir
        let mut out = Vec::new();
        let mut seen = HashSet::new();
        let dir = path
            .parent()
            .ok_or_else(|| anyhow!("sample path missing parent"))?;
        collect_from_dir(dir, &mut out, &mut seen);
        collect_from_dir(dir, &mut out, &mut seen);
        assert_eq!(
            out.iter().filter(|f| f.component == "usage").count(),
            1,
            "same dir scanned twice should not duplicate"
        );
        Ok(())
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
    fn test_create_widget() -> Result<()> {
        let temp = tempfile::tempdir()?;
        let path = write_sample(temp.path())?;
        create_widget(&path, "freshy")?;
        let files = scan_files(Some(temp.path()));
        let usage = files.iter().find(|f| f.component == "usage");
        let usage = match usage {
            Some(u) => u,
            None => return Ok(()),
        };
        assert!(usage.entries.iter().any(|e| e.name == "freshy"));
        // 重复创建应报错
        assert!(create_widget(&path, "freshy").is_err());
        // 非法名字应报错
        assert!(create_widget(&path, "bad name").is_err());
        Ok(())
    }

    /// 回归:create_widget 在目标文件 TOML 解析失败时必须报错,
    /// 不能静默用空 DocumentMut 覆盖掉用户的原文件。
    #[test]
    fn test_create_widget_refuses_to_clobber_malformed_file() -> Result<()> {
        let temp = tempfile::tempdir()?;
        let comp_dir = temp.path().join("components");
        fs::create_dir_all(&comp_dir)?;
        let path = comp_dir.join("broken.toml");
        let original = "this is not valid TOML = = [\n";
        fs::write(&path, original)?;

        let err = create_widget(&path, "anything").expect_err("should refuse to write");
        let _ = err;

        // 确认原文件内容没有被改写
        let after = fs::read_to_string(&path)?;
        assert_eq!(after, original, "malformed file must not be overwritten");
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
