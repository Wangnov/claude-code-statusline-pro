//! TUI 状态机

use std::path::PathBuf;

use anyhow::{anyhow, Context, Result};
use ratatui::text::Line;
use toml_edit::DocumentMut;

use claude_code_statusline_pro::config::{ConfigLoader, MergeReport};

use crate::tui::io;
use crate::tui::preview;
use crate::tui::sections::{Field, FieldKind, Section, COLOR_PALETTE, SECTIONS};
use crate::tui::widgets::{self, scan_summaries, WidgetFile, WidgetSummary};

/// 编辑目标层级。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EditScope {
    User,
    Project,
    Custom,
}

/// 启动参数。
#[derive(Debug, Clone)]
pub struct EditOptions {
    pub path: PathBuf,
    pub scope: EditScope,
    pub mock_scenario: String,
}

/// 当前焦点区域。v2 会启用 `Tabs` 让用户在 Tab 栏里单独高亮。
#[allow(dead_code)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Focus {
    /// 顶部 Tab 栏
    Tabs,
    /// 中部字段列表
    Fields,
}

/// 编辑模式:文本输入缓冲。
#[derive(Debug, Clone)]
pub enum Mode {
    Normal,
    EditText(EditBuffer),
}

/// 带光标的文本缓冲。光标位置是 `text` 的字节偏移,始终对齐到 char 边界。
#[derive(Debug, Clone, Default)]
pub struct EditBuffer {
    pub text: String,
    pub cursor: usize,
}

impl EditBuffer {
    pub fn new(initial: String) -> Self {
        let cursor = initial.len();
        Self {
            text: initial,
            cursor,
        }
    }

    pub fn insert_char(&mut self, c: char) {
        self.text.insert(self.cursor, c);
        self.cursor += c.len_utf8();
    }

    pub fn backspace(&mut self) {
        if self.cursor == 0 {
            return;
        }
        let prev = self.prev_char_boundary();
        self.text.replace_range(prev..self.cursor, "");
        self.cursor = prev;
    }

    pub fn delete_forward(&mut self) {
        if self.cursor >= self.text.len() {
            return;
        }
        let next = self.next_char_boundary();
        self.text.replace_range(self.cursor..next, "");
    }

    pub fn move_left(&mut self) {
        if self.cursor == 0 {
            return;
        }
        self.cursor = self.prev_char_boundary();
    }

    pub fn move_right(&mut self) {
        if self.cursor >= self.text.len() {
            return;
        }
        self.cursor = self.next_char_boundary();
    }

    pub fn home(&mut self) {
        self.cursor = 0;
    }

    pub fn end(&mut self) {
        self.cursor = self.text.len();
    }

    /// 光标前的 `text[..cursor]` 部分(用于渲染)。
    pub fn before_cursor(&self) -> &str {
        &self.text[..self.cursor]
    }

    /// 光标处到末尾的 `text[cursor..]` 部分(用于渲染)。
    pub fn after_cursor(&self) -> &str {
        &self.text[self.cursor..]
    }

    fn prev_char_boundary(&self) -> usize {
        self.text[..self.cursor]
            .char_indices()
            .last()
            .map_or(0, |(i, _)| i)
    }

    fn next_char_boundary(&self) -> usize {
        self.text[self.cursor..]
            .char_indices()
            .nth(1)
            .map_or(self.text.len(), |(offset, _)| self.cursor + offset)
    }
}

/// 底部 toast 的性质。
#[derive(Debug, Clone, Copy)]
pub enum MessageKind {
    Info,
    Success,
    Error,
}

/// 按 `n` 在 Widgets Tab 里新增 widget 时的对话框状态。
#[derive(Debug, Clone)]
pub struct NewWidgetDialog {
    pub target_path: PathBuf,
    pub target_component: String,
    pub name: EditBuffer,
}

/// 跨 section 搜索字段时的中间状态。
#[derive(Debug, Clone, Default)]
pub struct SearchState {
    /// 当前输入的查询串(lowercase 化后匹配)
    pub query: String,
    /// 命中的 (section_idx, field_idx) 列表
    pub results: Vec<(usize, usize)>,
    /// 结果列表当前选中下标
    pub selected: usize,
}

impl SearchState {
    pub fn recompute(&mut self) {
        let q = self.query.to_ascii_lowercase();
        self.results.clear();
        if q.is_empty() {
            self.selected = 0;
            return;
        }
        for (si, section) in SECTIONS.iter().enumerate() {
            for (fi, field) in section.fields.iter().enumerate() {
                let hay_section = section.title.to_ascii_lowercase();
                let hay_label = field.label.to_ascii_lowercase();
                let hay_path = field.path.to_ascii_lowercase();
                if hay_section.contains(&q) || hay_label.contains(&q) || hay_path.contains(&q) {
                    self.results.push((si, fi));
                }
            }
        }
        if self.selected >= self.results.len() {
            self.selected = self.results.len().saturating_sub(1);
        }
    }
}

pub struct App {
    pub options: EditOptions,
    pub document: DocumentMut,
    pub original: DocumentMut,
    pub section_idx: usize,
    pub field_idx: usize,
    pub focus: Focus,
    pub mode: Mode,
    pub mocks: Vec<String>,
    pub mock_idx: usize,
    pub preview_lines: Vec<Line<'static>>,
    pub help_visible: bool,
    pub message: Option<(String, MessageKind)>,
    pub dirty: bool,
    pub should_quit: bool,
    pub widget_summaries: Vec<WidgetSummary>,
    pub widget_files: Vec<WidgetFile>,
    /// Widgets Tab 的光标:扁平索引,见 `flat_widgets`
    pub widget_cursor: usize,
    pub merge_report: Option<MergeReport>,
    pub merge_report_visible: bool,
    pub search: Option<SearchState>,
    pub widget_new: Option<NewWidgetDialog>,
}

impl App {
    /// 构造并立即尝试生成一次预览。
    pub async fn from_options(options: EditOptions) -> Result<Self> {
        let document = io::load_or_create(&options.path)?;
        let original = document.clone();
        let mocks = preview::available_mocks();
        let mock_idx = mocks
            .iter()
            .position(|name| name == &options.mock_scenario)
            .unwrap_or(0);
        let widget_summaries = scan_summaries(options.path.parent());
        let widget_files = widgets::scan_files(options.path.parent());
        let merge_report = load_merge_report().await;

        let mut app = Self {
            options,
            document,
            original,
            section_idx: 0,
            field_idx: 0,
            focus: Focus::Fields,
            mode: Mode::Normal,
            mocks,
            mock_idx,
            preview_lines: Vec::new(),
            help_visible: false,
            message: None,
            dirty: false,
            should_quit: false,
            widget_summaries,
            widget_files,
            widget_cursor: 0,
            merge_report,
            merge_report_visible: false,
            search: None,
            widget_new: None,
        };

        app.refresh_preview().await;
        Ok(app)
    }

    pub fn toggle_merge_report(&mut self) {
        self.merge_report_visible = !self.merge_report_visible;
    }

    // ---- Widgets Tab ----

    /// 是否当前处于 Widgets 这个特殊 Tab。
    pub fn is_widgets_tab(&self) -> bool {
        self.current_section().title == "Widgets"
    }

    /// 扁平列出所有 widgets,每项返回 (file_idx, entry_idx)。
    pub fn flat_widgets(&self) -> Vec<(usize, usize)> {
        let mut out = Vec::new();
        for (fi, file) in self.widget_files.iter().enumerate() {
            for ei in 0..file.entries.len() {
                out.push((fi, ei));
            }
        }
        out
    }

    pub fn widget_count(&self) -> usize {
        self.widget_files.iter().map(|f| f.entries.len()).sum()
    }

    pub fn widget_next(&mut self) {
        let n = self.widget_count();
        if n == 0 {
            return;
        }
        self.widget_cursor = (self.widget_cursor + 1) % n;
    }

    pub fn widget_prev(&mut self) {
        let n = self.widget_count();
        if n == 0 {
            return;
        }
        self.widget_cursor = if self.widget_cursor == 0 {
            n - 1
        } else {
            self.widget_cursor - 1
        };
    }

    fn current_widget_ref(&self) -> Option<(PathBuf, String)> {
        let flat = self.flat_widgets();
        let &(fi, ei) = flat.get(self.widget_cursor)?;
        let file = self.widget_files.get(fi)?;
        let entry = file.entries.get(ei)?;
        Some((file.path.clone(), entry.name.clone()))
    }

    pub fn widget_toggle_enabled(&mut self) {
        let Some((path, name)) = self.current_widget_ref() else {
            return;
        };
        match widgets::toggle_enabled(&path, &name) {
            Ok(new_value) => {
                self.rescan_widgets();
                self.success(format!("{name}.enabled = {new_value}"));
            }
            Err(err) => self.error(format!("切 enabled 失败: {err}")),
        }
    }

    pub fn widget_cycle_type(&mut self) {
        let Some((path, name)) = self.current_widget_ref() else {
            return;
        };
        match widgets::cycle_type(&path, &name) {
            Ok(new_type) => {
                self.rescan_widgets();
                self.success(format!("{name}.type = {new_type}"));
            }
            Err(err) => self.error(format!("切 type 失败: {err}")),
        }
    }

    pub fn widget_delete(&mut self) {
        let Some((path, name)) = self.current_widget_ref() else {
            return;
        };
        match widgets::delete_widget(&path, &name) {
            Ok(()) => {
                self.rescan_widgets();
                let count = self.widget_count();
                if count > 0 && self.widget_cursor >= count {
                    self.widget_cursor = count - 1;
                }
                self.success(format!("已删除 widget: {name}"));
            }
            Err(err) => self.error(format!("删除失败: {err}")),
        }
    }

    /// 打开新增 widget 对话框。目标文件默认是光标所在文件;
    /// 如果没有任何文件则拒绝(需要用户先准备好 components/*.toml)。
    pub fn widget_open_new_dialog(&mut self) {
        let Some(file) = self
            .widget_files
            .get(
                self.flat_widgets()
                    .get(self.widget_cursor)
                    .map_or(0, |&(fi, _)| fi),
            )
            .or_else(|| self.widget_files.first())
        else {
            self.error(
                "尚未检测到任何 components/*.toml;请先 `ccsp config init -w` 准备模板。"
                    .to_string(),
            );
            return;
        };
        self.widget_new = Some(NewWidgetDialog {
            target_path: file.path.clone(),
            target_component: file.component.clone(),
            name: EditBuffer::default(),
        });
    }

    pub fn widget_close_new_dialog(&mut self) {
        self.widget_new = None;
    }

    pub fn widget_new_insert_char(&mut self, c: char) {
        if let Some(dialog) = self.widget_new.as_mut() {
            dialog.name.insert_char(c);
        }
    }

    pub fn widget_new_backspace(&mut self) {
        if let Some(dialog) = self.widget_new.as_mut() {
            dialog.name.backspace();
        }
    }

    pub fn widget_new_commit(&mut self) {
        let Some(dialog) = self.widget_new.take() else {
            return;
        };
        let name = dialog.name.text.trim().to_string();
        if name.is_empty() {
            self.error("widget 名字不能为空".to_string());
            return;
        }
        match widgets::create_widget(&dialog.target_path, &name) {
            Ok(()) => {
                self.rescan_widgets();
                // 把光标移到新创建的 widget
                if let Some(idx) = self.flat_widgets().iter().position(|&(fi, ei)| {
                    self.widget_files[fi].path == dialog.target_path
                        && self.widget_files[fi].entries[ei].name == name
                }) {
                    self.widget_cursor = idx;
                }
                self.success(format!("已创建 widget {}:{name}", dialog.target_component));
            }
            Err(err) => self.error(format!("创建失败: {err}")),
        }
    }

    fn rescan_widgets(&mut self) {
        self.widget_files = widgets::scan_files(self.options.path.parent());
        self.widget_summaries = scan_summaries(self.options.path.parent());
    }

    // ---- 搜索 ----

    pub fn open_search(&mut self) {
        let mut state = SearchState::default();
        state.recompute();
        self.search = Some(state);
    }

    pub fn close_search(&mut self) {
        self.search = None;
    }

    pub fn search_push_char(&mut self, c: char) {
        if let Some(state) = self.search.as_mut() {
            state.query.push(c);
            state.recompute();
        }
    }

    pub fn search_backspace(&mut self) {
        if let Some(state) = self.search.as_mut() {
            state.query.pop();
            state.recompute();
        }
    }

    pub fn search_move(&mut self, delta: i32) {
        let Some(state) = self.search.as_mut() else {
            return;
        };
        let len = state.results.len();
        if len == 0 {
            return;
        }
        let i = state.selected as i32 + delta;
        let wrapped = i.rem_euclid(len as i32);
        state.selected = wrapped as usize;
    }

    /// 回车确认时:跳到对应 section+field,关闭 overlay。
    pub fn search_commit(&mut self) {
        let Some(state) = self.search.as_ref() else {
            return;
        };
        if let Some(&(si, fi)) = state.results.get(state.selected) {
            self.section_idx = si;
            self.field_idx = fi;
            self.info(format!(
                "跳转: {}.{}",
                SECTIONS[si].title, SECTIONS[si].fields[fi].label
            ));
        }
        self.search = None;
    }

    pub fn current_section(&self) -> &'static Section {
        let idx = self.section_idx.min(SECTIONS.len().saturating_sub(1));
        &SECTIONS[idx]
    }

    pub fn current_field(&self) -> Option<&'static Field> {
        self.current_section().fields.get(self.field_idx)
    }

    pub fn current_mock(&self) -> &str {
        self.mocks.get(self.mock_idx).map_or("dev", String::as_str)
    }

    // ---- 导航 ----

    pub fn next_tab(&mut self) {
        self.section_idx = (self.section_idx + 1) % SECTIONS.len();
        self.field_idx = 0;
    }

    pub fn prev_tab(&mut self) {
        if self.section_idx == 0 {
            self.section_idx = SECTIONS.len().saturating_sub(1);
        } else {
            self.section_idx -= 1;
        }
        self.field_idx = 0;
    }

    pub fn next_field(&mut self) {
        let len = self.current_section().fields.len();
        if len == 0 {
            return;
        }
        self.field_idx = (self.field_idx + 1) % len;
    }

    pub fn prev_field(&mut self) {
        let len = self.current_section().fields.len();
        if len == 0 {
            return;
        }
        if self.field_idx == 0 {
            self.field_idx = len - 1;
        } else {
            self.field_idx -= 1;
        }
    }

    pub fn cycle_mock(&mut self) {
        if self.mocks.is_empty() {
            return;
        }
        self.mock_idx = (self.mock_idx + 1) % self.mocks.len();
    }

    // ---- 编辑 ----

    /// `Enter` 触发:进入当前字段的"主编辑路径"。
    /// - Text / Int / Float / Color:进入文本输入(Color 支持 hex 等自由输入)
    /// - Bool:立即翻转
    /// - Enum:循环下一个
    pub fn begin_edit(&mut self) {
        let Some(field) = self.current_field() else {
            return;
        };
        match field.kind {
            FieldKind::Text | FieldKind::Color => {
                let initial = io::get_string(&self.document, field.path).unwrap_or_default();
                self.mode = Mode::EditText(EditBuffer::new(initial));
            }
            FieldKind::Int { .. } => {
                let initial = io::get_int(&self.document, field.path)
                    .map(|v| v.to_string())
                    .unwrap_or_default();
                self.mode = Mode::EditText(EditBuffer::new(initial));
            }
            FieldKind::Float { .. } => {
                let initial = io::get_float(&self.document, field.path)
                    .map(|v| format!("{v}"))
                    .unwrap_or_default();
                self.mode = Mode::EditText(EditBuffer::new(initial));
            }
            FieldKind::Bool => self.space_action(),
            FieldKind::Enum(options) => self.cycle_enum(field.path, options),
        }
    }

    /// `Space` 触发:快速切换。
    /// - Bool:翻转
    /// - Enum / Color:循环下一个候选
    /// - 其他类型:无操作
    pub fn space_action(&mut self) {
        let Some(field) = self.current_field() else {
            return;
        };
        match field.kind {
            FieldKind::Bool => {
                let path = field.path;
                let current = io::get_bool(&self.document, path).unwrap_or(false);
                match io::set_bool(&mut self.document, path, !current) {
                    Ok(()) => {
                        self.dirty = true;
                        self.info(format!("{path} = {}", !current));
                    }
                    Err(err) => self.error(format!("更新失败: {err}")),
                }
            }
            FieldKind::Enum(options) => self.cycle_enum(field.path, options),
            FieldKind::Color => self.cycle_enum(field.path, COLOR_PALETTE),
            FieldKind::Text | FieldKind::Int { .. } | FieldKind::Float { .. } => {}
        }
    }

    fn cycle_enum(&mut self, path: &str, options: &[&str]) {
        if options.is_empty() {
            return;
        }
        let current = io::get_string(&self.document, path).unwrap_or_default();
        let idx = options.iter().position(|o| *o == current).unwrap_or(0);
        let next = (idx + 1) % options.len();
        match io::set_string(&mut self.document, path, options[next]) {
            Ok(()) => {
                self.dirty = true;
                self.info(format!("{path} = {}", options[next]));
            }
            Err(err) => self.error(format!("更新失败: {err}")),
        }
    }

    pub fn edit_insert_char(&mut self, c: char) {
        if let Mode::EditText(buf) = &mut self.mode {
            buf.insert_char(c);
        }
    }

    pub fn edit_backspace(&mut self) {
        if let Mode::EditText(buf) = &mut self.mode {
            buf.backspace();
        }
    }

    pub fn edit_delete(&mut self) {
        if let Mode::EditText(buf) = &mut self.mode {
            buf.delete_forward();
        }
    }

    pub fn edit_move_left(&mut self) {
        if let Mode::EditText(buf) = &mut self.mode {
            buf.move_left();
        }
    }

    pub fn edit_move_right(&mut self) {
        if let Mode::EditText(buf) = &mut self.mode {
            buf.move_right();
        }
    }

    pub fn edit_home(&mut self) {
        if let Mode::EditText(buf) = &mut self.mode {
            buf.home();
        }
    }

    pub fn edit_end(&mut self) {
        if let Mode::EditText(buf) = &mut self.mode {
            buf.end();
        }
    }

    pub fn cancel_edit(&mut self) {
        self.mode = Mode::Normal;
    }

    pub fn commit_edit(&mut self) {
        let buffer = match std::mem::replace(&mut self.mode, Mode::Normal) {
            Mode::EditText(buf) => buf,
            Mode::Normal => return,
        };
        let text = buffer.text;
        let Some(field) = self.current_field() else {
            return;
        };

        let result = match field.kind {
            FieldKind::Text => io::set_string(&mut self.document, field.path, &text),
            FieldKind::Color => {
                let trimmed = text.trim();
                if trimmed.is_empty() {
                    Err(anyhow!("颜色不能为空"))
                } else {
                    io::set_string(&mut self.document, field.path, trimmed)
                }
            }
            FieldKind::Int { min, max } => match text.trim().parse::<i64>() {
                Ok(n) if n >= min && n <= max => io::set_int(&mut self.document, field.path, n),
                Ok(_) => Err(anyhow!("值不在范围 [{min}, {max}]")),
                Err(_) => Err(anyhow!("不是有效整数: {text}")),
            },
            FieldKind::Float { min, max } => match text.trim().parse::<f64>() {
                Ok(n) if n >= min && n <= max => io::set_float(&mut self.document, field.path, n),
                Ok(_) => Err(anyhow!("值不在范围 [{min}, {max}]")),
                Err(_) => Err(anyhow!("不是有效浮点数: {text}")),
            },
            FieldKind::Bool | FieldKind::Enum(_) => Ok(()),
        };

        match result {
            Ok(()) => {
                self.dirty = true;
                self.success(format!("已更新 {}", field.path));
            }
            Err(err) => self.error(format!("更新失败: {err}")),
        }
    }

    // ---- 保存/撤销/切 scope ----

    pub fn revert(&mut self) {
        self.document = self.original.clone();
        self.dirty = false;
        self.info("已撤销所有未保存修改".to_string());
    }

    /// 在 user ↔ project 之间切换。`Custom` scope 下不允许切换,需要重新用 CLI 进入。
    /// 如果当前有未保存修改会拒绝切换,由用户先 Ctrl+S 或 Ctrl+R 清理。
    pub async fn switch_scope(&mut self) {
        if self.dirty {
            self.error("有未保存修改,请先 Ctrl+S 保存或 Ctrl+R 撤销后再切 scope".to_string());
            return;
        }
        if self.options.scope == EditScope::Custom {
            self.error(
                "自定义路径下不支持切换 scope。请用 --global 或无参数重新进入。".to_string(),
            );
            return;
        }

        let loader = ConfigLoader::new();
        let (target_path, target_scope) = match self.options.scope {
            EditScope::User => match loader.project_config_path() {
                Ok(p) => (p, EditScope::Project),
                Err(err) => {
                    self.error(format!("无法解析项目级路径: {err}"));
                    return;
                }
            },
            EditScope::Project => match loader.user_config_path() {
                Some(p) => (p, EditScope::User),
                None => {
                    self.error("无法解析用户级路径(home 目录不可访问)".to_string());
                    return;
                }
            },
            EditScope::Custom => return,
        };

        let new_document = match io::load_or_create(&target_path) {
            Ok(doc) => doc,
            Err(err) => {
                self.error(format!("加载目标 scope 失败: {err}"));
                return;
            }
        };

        self.options.path = target_path.clone();
        self.options.scope = target_scope;
        self.document = new_document.clone();
        self.original = new_document;
        self.section_idx = 0;
        self.field_idx = 0;
        self.widget_cursor = 0;
        self.dirty = false;
        // Widgets Tab 读的是 widget_files,scope 切换后必须一起刷新;
        // widget_summaries 只是旧字段帮助面板展示用的别名。
        self.widget_files = widgets::scan_files(target_path.parent());
        self.widget_summaries = scan_summaries(target_path.parent());
        self.refresh_preview().await;
        let label = match target_scope {
            EditScope::User => "用户级",
            EditScope::Project => "项目级",
            EditScope::Custom => "自定义",
        };
        self.success(format!("已切到 {label}: {}", target_path.display()));
    }

    pub fn save(&mut self) -> Result<()> {
        let doc_str = self.document.to_string();
        if let Err(err) = preview::parse_config(&doc_str) {
            self.error(format!("校验失败,未保存: {err}"));
            return Ok(());
        }
        io::save(&self.options.path, &self.document)
            .with_context(|| format!("保存到 {} 失败", self.options.path.display()))?;
        self.original = self.document.clone();
        self.dirty = false;
        self.success(format!("已保存 {}", self.options.path.display()));
        Ok(())
    }

    // ---- 预览 ----

    /// 重新渲染预览。解析失败时优雅降级为提示文案。
    pub async fn refresh_preview(&mut self) {
        let doc_str = self.document.to_string();
        let config = match preview::parse_config(&doc_str) {
            Ok(cfg) => cfg,
            Err(err) => {
                self.preview_lines = vec![Line::from(format!("(预览暂不可用: {err})"))];
                return;
            }
        };

        let scenario = self.current_mock().to_string();
        match preview::render(&config, &scenario).await {
            Ok(lines) => self.preview_lines = lines,
            Err(err) => {
                self.preview_lines = vec![Line::from(format!("(预览渲染失败: {err})"))];
            }
        }
    }

    // ---- 小工具 ----

    pub fn toggle_help(&mut self) {
        self.help_visible = !self.help_visible;
    }

    pub fn request_quit(&mut self) {
        self.should_quit = true;
    }

    fn info(&mut self, msg: String) {
        self.message = Some((msg, MessageKind::Info));
    }

    fn success(&mut self, msg: String) {
        self.message = Some((msg, MessageKind::Success));
    }

    fn error(&mut self, msg: String) {
        self.message = Some((msg, MessageKind::Error));
    }
}

/// 用一个"干净"的 `ConfigLoader` 解析一次配置,拿合并报告。失败时返回 None。
async fn load_merge_report() -> Option<MergeReport> {
    let mut loader = ConfigLoader::new();
    loader.load(None).await.ok()?;
    loader.merge_report().cloned()
}

#[cfg(test)]
mod edit_buffer_tests {
    use super::EditBuffer;

    #[test]
    fn test_insert_at_end() {
        let mut buf = EditBuffer::new("hi".to_string());
        assert_eq!(buf.cursor, 2);
        buf.insert_char('!');
        assert_eq!(buf.text, "hi!");
        assert_eq!(buf.cursor, 3);
    }

    #[test]
    fn test_insert_in_middle() {
        let mut buf = EditBuffer::new("abc".to_string());
        buf.move_left(); // cursor at index 2 (between 'b' and 'c')
        buf.insert_char('X');
        assert_eq!(buf.text, "abXc");
        assert_eq!(buf.cursor, 3);
    }

    #[test]
    fn test_backspace() {
        let mut buf = EditBuffer::new("abc".to_string());
        buf.backspace();
        assert_eq!(buf.text, "ab");
        assert_eq!(buf.cursor, 2);
    }

    #[test]
    fn test_backspace_at_start_noop() {
        let mut buf = EditBuffer::new("a".to_string());
        buf.home();
        buf.backspace();
        assert_eq!(buf.text, "a");
        assert_eq!(buf.cursor, 0);
    }

    #[test]
    fn test_delete_forward() {
        let mut buf = EditBuffer::new("abc".to_string());
        buf.home();
        buf.delete_forward();
        assert_eq!(buf.text, "bc");
        assert_eq!(buf.cursor, 0);
    }

    #[test]
    fn test_home_end() {
        let mut buf = EditBuffer::new("abc".to_string());
        buf.home();
        assert_eq!(buf.cursor, 0);
        buf.end();
        assert_eq!(buf.cursor, 3);
    }

    #[test]
    fn test_utf8_handling() {
        // "α" is 2 bytes in UTF-8
        let mut buf = EditBuffer::new("αβ".to_string());
        assert_eq!(buf.cursor, 4);
        buf.move_left();
        assert_eq!(buf.cursor, 2);
        buf.backspace();
        assert_eq!(buf.text, "β");
        assert_eq!(buf.cursor, 0);
    }

    #[test]
    fn test_chinese_insert() {
        let mut buf = EditBuffer::new("中英".to_string());
        buf.move_left();
        buf.insert_char('日');
        assert_eq!(buf.text, "中日英");
    }
}
