//! 文件 IO 与 `toml_edit::DocumentMut` 的点路径读写助手
//!
//! 用 `toml_edit` 而不是 `toml::to_string`,保留配置文件里的注释和顺序。

use std::fs;
use std::path::Path;

use anyhow::{anyhow, bail, Context, Result};
use toml_edit::{value as toml_value, DocumentMut, Item, Table};

/// 读取已有文件;不存在则返回空 `DocumentMut`。
pub fn load_or_create(path: &Path) -> Result<DocumentMut> {
    if path.exists() {
        let content = fs::read_to_string(path)
            .with_context(|| format!("无法读取配置文件: {}", path.display()))?;
        content
            .parse::<DocumentMut>()
            .map_err(|err| anyhow!("TOML 格式错误: {} ({err})", path.display()))
    } else {
        Ok(DocumentMut::new())
    }
}

/// 原子写入。
pub fn save(path: &Path, doc: &DocumentMut) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("无法创建目录: {}", parent.display()))?;
    }
    let tmp = path.with_extension("toml.tmp");
    fs::write(&tmp, doc.to_string())
        .with_context(|| format!("写临时文件失败: {}", tmp.display()))?;
    fs::rename(&tmp, path).with_context(|| format!("原子重命名失败: {}", path.display()))?;
    Ok(())
}

// ---- 读取 ----

pub fn get_string(doc: &DocumentMut, dotted: &str) -> Option<String> {
    traverse(doc, dotted).and_then(|item| item.as_str().map(std::string::ToString::to_string))
}

pub fn get_bool(doc: &DocumentMut, dotted: &str) -> Option<bool> {
    traverse(doc, dotted).and_then(Item::as_bool)
}

pub fn get_int(doc: &DocumentMut, dotted: &str) -> Option<i64> {
    traverse(doc, dotted).and_then(Item::as_integer)
}

pub fn get_float(doc: &DocumentMut, dotted: &str) -> Option<f64> {
    let item = traverse(doc, dotted)?;
    item.as_float()
        .or_else(|| item.as_integer().map(|n| n as f64))
}

// ---- 写入 ----

pub fn set_string(doc: &mut DocumentMut, dotted: &str, v: &str) -> Result<()> {
    set_item(doc, dotted, toml_value(v))
}

pub fn set_bool(doc: &mut DocumentMut, dotted: &str, v: bool) -> Result<()> {
    set_item(doc, dotted, toml_value(v))
}

pub fn set_int(doc: &mut DocumentMut, dotted: &str, v: i64) -> Result<()> {
    set_item(doc, dotted, toml_value(v))
}

pub fn set_float(doc: &mut DocumentMut, dotted: &str, v: f64) -> Result<()> {
    set_item(doc, dotted, toml_value(v))
}

// ---- 内部 ----

fn traverse<'a>(doc: &'a DocumentMut, dotted: &str) -> Option<&'a Item> {
    let mut current: &Item = doc.as_item();
    for seg in dotted.split('.') {
        let table = current.as_table_like()?;
        current = table.get(seg)?;
    }
    Some(current)
}

fn set_item(doc: &mut DocumentMut, dotted: &str, value: Item) -> Result<()> {
    let parts: Vec<&str> = dotted.split('.').collect();
    if parts.is_empty() {
        bail!("配置键不能为空");
    }
    set_recursive(doc.as_table_mut(), &parts, value)
}

fn set_recursive(table: &mut Table, parts: &[&str], value: Item) -> Result<()> {
    let (head, rest) = parts
        .split_first()
        .ok_or_else(|| anyhow!("内部错误: 路径为空"))?;
    if rest.is_empty() {
        replace_preserving_decor(table, head, value);
        return Ok(());
    }
    if !table.contains_key(head) {
        let mut sub = Table::new();
        sub.set_implicit(true);
        table.insert(head, Item::Table(sub));
    }
    let child = table
        .get_mut(head)
        .ok_or_else(|| anyhow!("内部错误: 无法定位 {head}"))?;
    if let Some(subtable) = child.as_table_mut() {
        set_recursive(subtable, rest, value)
    } else {
        bail!("路径 {head} 已存在但不是表,无法继续写入")
    }
}

/// 替换叶子值时尽量保留原有的格式 decor(前后空格、注释)。
fn replace_preserving_decor(table: &mut Table, key: &str, value: Item) {
    if let (Some(existing), Item::Value(new_value)) = (table.get_mut(key), &value) {
        if let Item::Value(existing_value) = existing {
            let decor = existing_value.decor().clone();
            let mut new_value = new_value.clone();
            *new_value.decor_mut() = decor;
            *existing = Item::Value(new_value);
            return;
        }
    }
    table.insert(key, value);
}

#[cfg(test)]
mod tests {
    use super::*;
    use anyhow::Result;

    #[test]
    fn test_round_trip_string() -> Result<()> {
        let mut doc = DocumentMut::new();
        set_string(&mut doc, "preset", "PMBT")?;
        assert_eq!(get_string(&doc, "preset").as_deref(), Some("PMBT"));
        Ok(())
    }

    #[test]
    fn test_nested_path_creates_tables() -> Result<()> {
        let mut doc = DocumentMut::new();
        set_bool(&mut doc, "terminal.force_nerd_font", true)?;
        assert_eq!(get_bool(&doc, "terminal.force_nerd_font"), Some(true));
        assert!(doc.to_string().contains("[terminal]"));
        Ok(())
    }

    #[test]
    fn test_preserves_comments() -> Result<()> {
        let src = "# 顶部注释\npreset = \"PMBT\"\n";
        let mut doc = src.parse::<DocumentMut>()?;
        set_string(&mut doc, "preset", "PMBTUS")?;
        let out = doc.to_string();
        assert!(out.contains("# 顶部注释"));
        assert!(out.contains("PMBTUS"));
        Ok(())
    }

    #[test]
    fn test_int_round_trip() -> Result<()> {
        let mut doc = DocumentMut::new();
        set_int(&mut doc, "multiline.max_rows", 7)?;
        assert_eq!(get_int(&doc, "multiline.max_rows"), Some(7));
        Ok(())
    }
}
