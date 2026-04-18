//! 文件 IO 与 `toml_edit::DocumentMut` 的点路径读写助手
//!
//! 用 `toml_edit` 而不是 `toml::to_string`,保留配置文件里的注释和顺序。

use std::fs;
use std::io::Write;
use std::path::Path;

use anyhow::{anyhow, bail, Context, Result};
use tempfile::NamedTempFile;
use toml_edit::{value as toml_value, DocumentMut, InlineTable, Item, Table, Value};

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
///
/// 使用 `NamedTempFile::persist`:同卷内临时文件 → 原子替换目标。这点很关键
/// —— 以前用 `fs::rename(&tmp, path)`,在 Windows 某些版本和某些路径下会
/// 因为目标文件已存在而失败(`fs::rename` 的 replace 语义在 Windows 上有
/// 历史坑),导致"编辑现有 config.toml 时第二次保存必挂"。
/// NamedTempFile::persist 底层走 `MoveFileExW` + `MOVEFILE_REPLACE_EXISTING`,
/// 把"目标存在就替换"的语义落实到平台 API,跨平台一致。
pub fn save(path: &Path, doc: &DocumentMut) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("无法创建目录: {}", parent.display()))?;
    }
    // 把临时文件创建在目标文件所在目录,persist 就是同卷 rename,必然原子。
    // 放在系统默认 temp dir 会跨卷,persist 降级成 copy+delete,不原子。
    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    let mut tmp = NamedTempFile::new_in(parent)
        .with_context(|| format!("创建临时文件失败(目录 {})", parent.display()))?;
    tmp.write_all(doc.to_string().as_bytes())
        .with_context(|| format!("写临时文件失败: {}", tmp.path().display()))?;
    // 显式 sync 让内容真正落盘再 rename,配合 tempfile 就是 write-temp
    // + fsync + atomic-replace 的标准三步。
    tmp.as_file_mut()
        .sync_all()
        .with_context(|| format!("flush 临时文件失败: {}", tmp.path().display()))?;
    tmp.persist(path)
        .map_err(|err| anyhow!("原子替换失败 {}: {}", path.display(), err.error))?;
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
    // 优先走普通 Table 分支(99% 的配置都长这样),其次接受 inline table。
    // 以前这里只识别 as_table_mut(),导致 `style = { separator = "|" }`
    // 这种完全合法的 TOML 一旦存在,编辑器写 `style.separator` 就会 bail
    // "已存在但不是表",相当于让合法配置变只读。读路径用的是 as_table_like()
    // 天然支持两者,写路径现在也对齐。
    if let Some(subtable) = child.as_table_mut() {
        return set_recursive(subtable, rest, value);
    }
    if let Item::Value(Value::InlineTable(ref mut inline)) = child {
        return set_recursive_inline(inline, rest, value);
    }
    bail!("路径 {head} 已存在但不是表,无法继续写入")
}

/// 沿 inline 表(`{ ... }`)继续下钻。
///
/// inline 表只能装 `Value`,不能直接塞 `Item::Table`。叶子值的写法跟
/// 普通表基本一致,但要把 `Item::Value(v)` 拆成 `v`。所有现有的
/// `set_string/set_bool/...` 都经 `toml_value(...)` 返回 `Item::Value`,
/// 所以 `into_value()` 实际上永远成功;报错分支仅作未来兜底。
fn set_recursive_inline(inline: &mut InlineTable, parts: &[&str], value: Item) -> Result<()> {
    let (head, rest) = parts
        .split_first()
        .ok_or_else(|| anyhow!("内部错误: 路径为空"))?;
    if rest.is_empty() {
        let new_value = value
            .into_value()
            .map_err(|_| anyhow!("无法把非 Value 项写入 inline 表的叶子 {head}"))?;
        replace_inline_preserving_decor(inline, head, new_value);
        return Ok(());
    }
    if !inline.contains_key(head) {
        // InlineTable::insert 的 key 要 impl Into<String>,`&&str` 不行,
        // 手动 deref 成 `&str` 让编译器走 String::from 路径。
        inline.insert(*head, Value::InlineTable(InlineTable::new()));
    }
    let child = inline
        .get_mut(head)
        .ok_or_else(|| anyhow!("内部错误: 无法定位 {head}"))?;
    if let Some(subinline) = child.as_inline_table_mut() {
        return set_recursive_inline(subinline, rest, value);
    }
    bail!("路径 {head} 已存在但不是表,无法继续写入")
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

/// inline 表的叶子写入,同样尽量保留 decor。
fn replace_inline_preserving_decor(inline: &mut InlineTable, key: &str, value: Value) {
    if let Some(existing) = inline.get_mut(key) {
        let decor = existing.decor().clone();
        let mut new_value = value;
        *new_value.decor_mut() = decor;
        *existing = new_value;
        return;
    }
    inline.insert(key, value);
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

    /// 回归 Codex round 13 / P1:save() 必须能覆盖已经存在的目标文件。
    /// 以前用 `fs::rename(&tmp, path)`,在 Windows 上遇到已存在文件会失败,
    /// 导致"编辑现有 config.toml 的第二次保存永远挂"。这个测试在类 Unix
    /// 上本来就能过,但它记录了这项不变式,跨平台 CI 会帮我们校验 Windows。
    #[test]
    fn test_save_overwrites_existing_file() -> Result<()> {
        let dir = tempfile::tempdir()?;
        let path = dir.path().join("config.toml");

        // 第一次写
        let mut doc1 = DocumentMut::new();
        set_string(&mut doc1, "preset", "PMBT")?;
        save(&path, &doc1)?;
        let content1 = std::fs::read_to_string(&path)?;
        assert!(content1.contains("\"PMBT\""));

        // 第二次写同一个路径(关键:这次目标文件已经存在)
        let mut doc2 = DocumentMut::new();
        set_string(&mut doc2, "preset", "PMBTUS")?;
        save(&path, &doc2)?;

        let content2 = std::fs::read_to_string(&path)?;
        assert!(content2.contains("\"PMBTUS\""));
        assert!(!content2.contains("\"PMBT\"\n"));
        Ok(())
    }

    /// 回归:`style = { separator = "|" }` 这种合法 TOML 使用 inline table,
    /// 以前 set_recursive 只认 as_table_mut(),会 bail "已存在但不是表"。
    /// 修好以后 set_string 写 `style.separator` 必须成功,且读回来能拿到新值。
    #[test]
    fn test_set_updates_existing_inline_table_leaf() -> Result<()> {
        let src = r#"style = { separator = "|", spacing = 1 }
"#;
        let mut doc = src.parse::<DocumentMut>()?;
        set_string(&mut doc, "style.separator", " > ")?;
        assert_eq!(get_string(&doc, "style.separator").as_deref(), Some(" > "));
        // 同一 inline 表里的 sibling 必须保留,不能被整块替换
        assert_eq!(get_int(&doc, "style.spacing"), Some(1));
        // 序列化后仍然是 inline 格式(至少能读回来),不必强求 `{}` 字形
        let out = doc.to_string();
        assert!(out.contains(" > "));
        assert!(out.contains("spacing"));
        Ok(())
    }

    /// inline 表缺失要写入的 key 时,应该允许原地 insert,不是报错。
    #[test]
    fn test_set_adds_new_key_to_existing_inline_table() -> Result<()> {
        let src = r#"style = { separator = "|" }
"#;
        let mut doc = src.parse::<DocumentMut>()?;
        set_bool(&mut doc, "style.bold", true)?;
        assert_eq!(get_bool(&doc, "style.bold"), Some(true));
        assert_eq!(get_string(&doc, "style.separator").as_deref(), Some("|"));
        Ok(())
    }

    /// 嵌套 inline(`a = { b = { c = "x" } }`)也得能写深层叶子。
    #[test]
    fn test_set_walks_nested_inline_tables() -> Result<()> {
        let src = r#"a = { b = { c = "x" } }
"#;
        let mut doc = src.parse::<DocumentMut>()?;
        set_string(&mut doc, "a.b.c", "y")?;
        assert_eq!(get_string(&doc, "a.b.c").as_deref(), Some("y"));
        Ok(())
    }

    /// 把 inline 表里原本是 Value 的字段当成子表继续下钻,必须报错,
    /// 不能因为新增了 inline 分支就悄悄把一个字符串变成子表。
    #[test]
    fn test_set_rejects_descending_into_inline_scalar() {
        let src = r#"style = { separator = "|" }
"#;
        let mut doc = src.parse::<DocumentMut>().unwrap();
        let err = set_string(&mut doc, "style.separator.sub", "x").unwrap_err();
        assert!(
            err.to_string().contains("不是表"),
            "expected table-type error, got: {err}"
        );
    }
}
