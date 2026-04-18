//! 扫描并在线编辑 `components/*.toml` 里的 widgets。
//!
//! v3 扩展:除了只读的 `WidgetSummary`,新增 `WidgetFile` 结构承载每个文件内完整
//! widget 元信息,并提供三个 CRUD 操作(toggle_enabled / cycle_type / delete)。
//! 所有写入都走 `toml_edit::DocumentMut`,保留注释与顺序。

use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{anyhow, bail, Context, Result};
use toml_edit::{value as toml_value, DocumentMut, InlineTable, Item, Value};

use claude_code_statusline_pro::config::ComponentMultilineConfig;

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
/// 只扫描传入的 `base_dir/components`。以前会把 `~/.claude/statusline-pro
/// /components` 无条件拼进来,在 project / custom scope 下同一个组件会
/// 同时冒出用户层和项目层两份;选到用户层那条执行 toggle / delete,
/// 写的是用户文件,但预览和运行时都优先读项目层,结果就是"改了没效果"
/// 但用户文件已被悄悄动过。widget CRUD 必须只作用于当前正在编辑的这一层。
///
/// 调用方只需传入"正在编辑的那份 config 的目录"(一般就是
/// `options.path.parent()`):user scope 传用户配置目录、project scope
/// 传项目配置目录、custom scope 传 custom 文件所在目录,语义统一。
///
/// 仍保留基于 canonicalize 的去重,主要挡住调用者重复传同一路径的情况。
pub fn scan_files(base_dir: Option<&Path>) -> Vec<WidgetFile> {
    let mut out = Vec::new();
    let mut seen: HashSet<PathBuf> = HashSet::new();

    if let Some(base) = base_dir {
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

    // 先决定新 widget 要以 inline 还是常规 [widgets.name] 表头写进去。
    // 判定基于外层 `widgets` 现在的形态:如果用户用的是 inline
    // `widgets = { foo = { ... } }`,新加的也用 inline 保留一致的风格;
    // 如果是常规表 `[widgets.foo]` 或不存在(新文件),就用常规表头。
    // 硬塞 Item::Table 进 inline 会破坏原文件的格式甚至失败。
    let widgets_is_inline = matches!(doc.get("widgets"), Some(Item::Value(Value::InlineTable(_))));

    let widgets = doc
        .entry("widgets")
        .or_insert(Item::Table(toml_edit::Table::new()))
        .as_table_like_mut()
        .ok_or_else(|| anyhow!("widgets 不是表"))?;

    if widgets.contains_key(widget_name) {
        bail!("widget '{widget_name}' 已存在,不能重复创建");
    }

    let new_entry = if widgets_is_inline {
        // inline 分支:构造一张 InlineTable,字段顺序和常规表一致,便于阅读。
        let mut inline = InlineTable::new();
        inline.insert("enabled", Value::from(true));
        inline.insert("type", Value::from("static"));
        inline.insert("row", Value::from(1_i64));
        inline.insert("col", Value::from(0_i64));
        inline.insert("nerd_icon", Value::from(""));
        inline.insert("emoji_icon", Value::from("📌"));
        inline.insert("text_icon", Value::from("[?]"));
        inline.insert("content", Value::from("new widget"));
        Item::Value(Value::InlineTable(inline))
    } else {
        let mut table = toml_edit::Table::new();
        table.insert("enabled", toml_value(true));
        table.insert("type", toml_value("static"));
        table.insert("row", toml_value(1_i64));
        table.insert("col", toml_value(0_i64));
        table.insert("nerd_icon", toml_value(""));
        table.insert("emoji_icon", toml_value("📌"));
        table.insert("text_icon", toml_value("[?]"));
        table.insert("content", toml_value("new widget"));
        Item::Table(table)
    };
    widgets.insert(widget_name, new_entry);

    save_document(path, &doc)
}

/// 删除整个 widget 表。
pub fn delete_widget(path: &Path, widget_name: &str) -> Result<()> {
    let mut doc = load_document(path)?;
    // 同样用 as_table_like_mut:inline `widgets = { ... }` 也要能删除子项,
    // 不能因为外层是 inline 写法就拒绝。
    let widgets = doc
        .get_mut("widgets")
        .and_then(|i| i.as_table_like_mut())
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
    // 之前这里直接 as_table_mut(),对 `widgets = { foo = { enabled = true } }`
    // 这种完全合法的 inline-table 写法就走不通:读的时候 as_table_like 是通的,
    // 写的时候 as_table_mut 只认 Item::Table,inline 被当成"不是表"拒绝,
    // 整份用户配置就变成只读的了。切到 as_table_like_mut + TableLike 接口,
    // 同时支持 Item::Table 和 Item::Value(InlineTable)。
    let widgets = doc
        .entry("widgets")
        .or_insert(Item::Table(toml_edit::Table::new()))
        .as_table_like_mut()
        .ok_or_else(|| anyhow!("widgets 不是表"))?;
    let widget_table = widgets
        .entry(widget)
        .or_insert(Item::Table(toml_edit::Table::new()))
        .as_table_like_mut()
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

    /// 回归:scan_files 只能读传入 base_dir 下的 components,不能把
    /// 用户配置目录或别的层级的 widget 混进来。之前 scan_files 会无条件
    /// 附带 `~/.claude/statusline-pro/components`,在 project / custom
    /// scope 下会把用户层 widget 和项目层 widget 混在一起,toggle/delete
    /// 可能写到错误层。
    #[test]
    fn test_scan_files_is_scoped_to_base_dir() -> Result<()> {
        // 故意构造两个独立目录,模拟"project 层"和"user 层";
        // 只把 project 层传进 scan_files,就不能看到 user 层的条目。
        let project_dir = tempfile::tempdir()?;
        write_sample(project_dir.path())?;

        let user_dir = tempfile::tempdir()?;
        let user_components = user_dir.path().join("components");
        fs::create_dir_all(&user_components)?;
        fs::write(
            user_components.join("user_only.toml"),
            r#"
[widgets.user_widget]
enabled = true
type = "static"
row = 1
col = 0
nerd_icon = "u"
emoji_icon = "u"
text_icon = "[u]"
content = "from user layer"
"#,
        )?;

        let files = scan_files(Some(project_dir.path()));
        // 项目层应该能看到
        assert!(files.iter().any(|f| f.component == "usage"));
        // 用户层的文件无论如何都不能混进来
        assert!(
            files.iter().all(|f| f.component != "user_only"),
            "scan_files 不应越过 base_dir 去读其他层的 components"
        );
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

    /// 写一份"外层 + 每个 widget 都用 inline 写法"的样本,用来校验 CRUD
    /// 对 `widgets = { foo = { ... } }` 这种合法但少见的 TOML 形态同样生效。
    fn write_inline_sample(dir: &Path) -> Result<PathBuf> {
        let comp_dir = dir.join("components");
        fs::create_dir_all(&comp_dir)?;
        let path = comp_dir.join("inline.toml");
        fs::write(
            &path,
            r#"widgets = { foo = { enabled = true, type = "static", row = 1, col = 0, nerd_icon = "x", emoji_icon = "x", text_icon = "[x]", content = "hi" }, bar = { enabled = false, type = "api", row = 1, col = 1, nerd_icon = "y", emoji_icon = "y", text_icon = "[y]" } }
"#,
        )?;
        Ok(path)
    }

    /// 回归 Codex round 9 / P2:toggle_enabled 必须支持 inline widgets。
    /// 以前 widget_set 用 as_table_mut,外层 inline `widgets = { ... }` 或
    /// 内层 inline `foo = { ... }` 都会走不通,报 "不是表"。
    #[test]
    fn test_toggle_enabled_on_inline_widget() -> Result<()> {
        let temp = tempfile::tempdir()?;
        let path = write_inline_sample(temp.path())?;
        // foo 默认 enabled = true → 翻到 false
        let new_value = toggle_enabled(&path, "foo")?;
        assert!(!new_value);
        // 再翻一次应该回到 true
        let new_value = toggle_enabled(&path, "foo")?;
        assert!(new_value);
        Ok(())
    }

    /// inline widgets 里切换 type 也得可行。
    #[test]
    fn test_cycle_type_on_inline_widget() -> Result<()> {
        let temp = tempfile::tempdir()?;
        let path = write_inline_sample(temp.path())?;
        let new_type = cycle_type(&path, "foo")?;
        assert_eq!(new_type, "api");
        Ok(())
    }

    /// 外层 inline 的情况下,delete_widget 依然能移除子项。
    #[test]
    fn test_delete_widget_from_inline_root() -> Result<()> {
        let temp = tempfile::tempdir()?;
        let path = write_inline_sample(temp.path())?;
        delete_widget(&path, "bar")?;
        // bar 应被移除,foo 依然存在
        let files = scan_files(Some(temp.path()));
        let inline = files
            .iter()
            .find(|f| f.component == "inline")
            .expect("inline component should still be readable");
        assert!(inline.entries.iter().any(|e| e.name == "foo"));
        assert!(inline.entries.iter().all(|e| e.name != "bar"));
        Ok(())
    }

    /// 外层 inline 的情况下,create_widget 应以 inline 子表形式写入,
    /// 保留用户选择的风格而不是硬加一个 [widgets.name] 表头把文件弄混。
    #[test]
    fn test_create_widget_on_inline_root_preserves_inline_style() -> Result<()> {
        let temp = tempfile::tempdir()?;
        let path = write_inline_sample(temp.path())?;
        create_widget(&path, "baz")?;

        // scan_files 必须能读到新加的 baz
        let files = scan_files(Some(temp.path()));
        let inline = files
            .iter()
            .find(|f| f.component == "inline")
            .expect("inline component should survive create");
        assert!(inline.entries.iter().any(|e| e.name == "baz"));

        // 文本层面:外层仍然是 inline 写法(第一行依然 `widgets = {`),
        // 而不是被升级成了 `[widgets.baz]` 表头。
        let text = fs::read_to_string(&path)?;
        let first_line = text.lines().next().unwrap_or("");
        assert!(
            first_line.starts_with("widgets = {"),
            "expected inline widgets to stay inline, got: {first_line:?}"
        );
        assert!(
            !text.contains("[widgets.baz]"),
            "create_widget 不应在 inline 根下插入表头语法"
        );
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
