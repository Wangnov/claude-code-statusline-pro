use std::collections::{BTreeMap, HashMap};
use std::fmt::Write;
use std::path::PathBuf;
use std::sync::OnceLock;
use std::time::Duration;

use anyhow::{anyhow, Context, Result};
use chrono::{DateTime, TimeZone, Utc};
use dateparser::parse as parse_datetime_string;
use jsonpath_lib as jsonpath;
use regex::Regex;
use serde_json::{Number, Value};
use tokio::fs;

use crate::components::base::RenderContext;
use crate::components::base::TerminalCapabilities;
use crate::config::component_widgets::{
    ComponentMultilineConfig, WidgetApiConfig, WidgetApiMethod, WidgetConfig, WidgetFilterConfig,
    WidgetFilterMode, WidgetType,
};
use crate::config::{Config, MultilineConfig, MultilineRowConfig};

static ENV_PATTERN: OnceLock<Result<Regex, regex::Error>> = OnceLock::new();
static PLACEHOLDER_PATTERN: OnceLock<Result<Regex, regex::Error>> = OnceLock::new();
static TIME_DIFF_PATTERN: OnceLock<Result<Regex, regex::Error>> = OnceLock::new();
static IDENT_REGEX: OnceLock<Result<Regex, regex::Error>> = OnceLock::new();
static MATH_CHARS_REGEX: OnceLock<Result<Regex, regex::Error>> = OnceLock::new();

const SECOND_MS: f64 = 1_000.0;
const MINUTE_MS: f64 = 60.0 * SECOND_MS;
const HOUR_MS: f64 = 60.0 * MINUTE_MS;
const DAY_MS: f64 = 24.0 * HOUR_MS;
const MONTH_MS: f64 = 30.0 * DAY_MS;
const YEAR_MS: f64 = 365.0 * DAY_MS;

/// Result of rendering multiline extension lines
#[derive(Debug, Default)]
pub struct MultiLineRenderResult {
    pub success: bool,
    pub lines: Vec<String>,
    pub error: Option<String>,
}

/// Renderer responsible for multi-line widgets
pub struct MultiLineRenderer {
    config: Config,
    config_base_dir: Option<PathBuf>,
    grid: MultiLineGrid,
    widget_cache: HashMap<String, String>,
    log_file: PathBuf,
}

impl MultiLineRenderer {
    #[must_use]
    pub fn new(config: Config, base_dir: Option<PathBuf>) -> Self {
        let log_file = dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join(".claude")
            .join("statusline-pro")
            .join("multiline.log");

        Self {
            config,
            config_base_dir: base_dir,
            grid: MultiLineGrid::default(),
            widget_cache: HashMap::new(),
            log_file,
        }
    }

    async fn log_error(&self, message: &str) {
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
        let log_message = format!("[{timestamp}] {message}\n");

        // 确保日志目录存在
        if let Some(parent) = self.log_file.parent() {
            let _ = fs::create_dir_all(parent).await;
        }

        // 追加写入日志
        if let Ok(mut file) = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_file)
            .await
        {
            use tokio::io::AsyncWriteExt;
            let _ = file.write_all(log_message.as_bytes()).await;
        }
    }

    pub fn update_config(&mut self, config: Config, base_dir: Option<PathBuf>) {
        self.config = config;
        self.config_base_dir = base_dir;
        self.widget_cache.clear();
    }

    pub async fn render_extension_lines(
        &mut self,
        context: &RenderContext,
    ) -> MultiLineRenderResult {
        let multiline_config = match self.config.multiline.clone() {
            Some(cfg) if cfg.enabled => cfg,
            _ => {
                return MultiLineRenderResult {
                    success: true,
                    lines: Vec::new(),
                    error: None,
                };
            }
        };

        self.grid.clear();

        let component_order = self
            .config
            .components
            .order
            .iter()
            .map(std::string::ToString::to_string)
            .collect::<Vec<_>>();

        for component_name in component_order {
            if !self.is_component_enabled(&component_name) {
                continue;
            }

            let component_config = match self.load_component_config(component_name.as_str()).await {
                Ok(Some(config)) => config,
                Ok(None) => {
                    continue;
                }
                Err(err) => {
                    return MultiLineRenderResult {
                        success: false,
                        lines: Vec::new(),
                        error: Some(err.to_string()),
                    };
                }
            };

            if let Err(err) = self
                .render_component_widgets(
                    &component_name,
                    &component_config,
                    context,
                    &multiline_config,
                )
                .await
            {
                return MultiLineRenderResult {
                    success: false,
                    lines: Vec::new(),
                    error: Some(err.to_string()),
                };
            }
        }

        let lines = self.grid.render(&multiline_config);
        MultiLineRenderResult {
            success: true,
            lines,
            error: None,
        }
    }

    fn is_component_enabled(&self, component_name: &str) -> bool {
        match component_name {
            "project" => self.config.components.project.base.enabled,
            "model" => self.config.components.model.base.enabled,
            "branch" => self.config.components.branch.base.enabled,
            "tokens" => self.config.components.tokens.base.enabled,
            "usage" => self.config.components.usage.base.enabled,
            "status" => self.config.components.status.base.enabled,
            _ => true,
        }
    }

    async fn load_component_config(
        &self,
        component_name: &str,
    ) -> Result<Option<ComponentMultilineConfig>> {
        let mut candidate_paths = Vec::new();

        if let Some(base) = &self.config_base_dir {
            candidate_paths.push(
                base.join("components")
                    .join(format!("{component_name}.toml")),
            );
        }

        if let Some(user_dir) = dirs::home_dir() {
            candidate_paths.push(
                user_dir
                    .join(".claude")
                    .join("statusline-pro")
                    .join("components")
                    .join(format!("{component_name}.toml")),
            );
        }

        candidate_paths.push(PathBuf::from("components").join(format!("{component_name}.toml")));

        for path in candidate_paths {
            if path.exists() {
                let contents = fs::read_to_string(&path).await.with_context(|| {
                    format!("Failed to read component configuration: {}", path.display())
                })?;
                let config: ComponentMultilineConfig =
                    toml::from_str(&contents).with_context(|| {
                        format!("Failed to parse component configuration {}", path.display())
                    })?;
                return Ok(Some(config));
            }
        }

        Ok(None)
    }

    async fn render_component_widgets(
        &mut self,
        component_name: &str,
        component_config: &ComponentMultilineConfig,
        context: &RenderContext,
        multiline_config: &MultilineConfig,
    ) -> Result<()> {
        for (widget_name, widget_config) in &component_config.widgets {
            if !Self::should_render_widget(widget_config) {
                continue;
            }

            if !Self::check_detection(widget_config) {
                continue;
            }

            let row = widget_config.row;
            if row == 0 || row > multiline_config.max_rows {
                continue;
            }

            let cache_key = format!("{component_name}::{widget_name}");
            let widget_output = match widget_config.kind {
                WidgetType::Static => Some(self.render_static_widget(widget_config, context)),
                WidgetType::Api => match self.render_api_widget(widget_config, context).await {
                    Ok(value) => value,
                    Err(err) => {
                        let err_str = err.to_string();

                        // 记录完整错误到日志文件
                        let log_msg = format!(
                            "Widget {}.{} API request failed:\n  Error: {}\n  Config: base_url={:?}, endpoint={:?}, method={:?}",
                            component_name,
                            widget_name,
                            err_str,
                            widget_config.api.as_ref().map(|a| &a.base_url),
                            widget_config.api.as_ref().map(|a| &a.endpoint),
                            widget_config.api.as_ref().map(|a| &a.method)
                        );
                        self.log_error(&log_msg).await;

                        // API失败时不显示widget
                        None
                    }
                },
            };

            if let Some(final_text) = widget_output {
                self.grid
                    .set_cell(row, widget_config.col, final_text.clone());
                self.widget_cache.insert(cache_key, final_text);
            } else if let Some(previous) = self.widget_cache.get(&cache_key) {
                self.grid.set_cell(row, widget_config.col, previous.clone());
            }
        }

        Ok(())
    }

    const fn should_render_widget(widget: &WidgetConfig) -> bool {
        match widget.force {
            Some(true) => true,
            Some(false) => false,
            None => widget.enabled,
        }
    }

    fn check_detection(widget: &WidgetConfig) -> bool {
        let Some(detection) = widget.detection.as_ref() else {
            return true;
        };

        let Some(env_name) = detection.env.as_deref() else {
            return true;
        };

        let Some(value) = std::env::var(env_name).ok() else {
            return false;
        };

        if let Some(expected) = detection.equals.as_deref() {
            if value != expected {
                return false;
            }
        }

        if let Some(needle) = detection.contains.as_deref() {
            if !value.contains(needle) {
                return false;
            }
        }

        if let Some(pattern) = detection.pattern.as_deref() {
            if let Ok(regex) = Regex::new(pattern) {
                if !regex.is_match(&value) {
                    return false;
                }
            } else {
                return false;
            }
        }

        true
    }

    fn render_static_widget(&self, widget: &WidgetConfig, context: &RenderContext) -> String {
        let raw_widget_content = widget.content.as_deref().unwrap_or("");
        let substituted = substitute_env(raw_widget_content);
        Self::compose_with_icon(widget, &substituted, &context.terminal, &self.config)
    }

    async fn render_api_widget(
        &self,
        widget: &WidgetConfig,
        context: &RenderContext,
    ) -> Result<Option<String>> {
        let Some(api_config) = widget.api.as_ref() else {
            return Ok(None);
        };

        let api_data = self.fetch_api_data(api_config).await?;

        if !Self::passes_filter(widget, &api_data.root) {
            return Ok(None);
        }

        let rendered_text = if let Some(template) = widget.template.as_deref() {
            let template = substitute_env(template);
            render_template(&template, &api_data.selected)
        } else {
            api_data.selected.to_string()
        };

        Ok(Some(Self::compose_with_icon(
            widget,
            &rendered_text,
            &context.terminal,
            &self.config,
        )))
    }

    async fn fetch_api_data(&self, config: &WidgetApiConfig) -> Result<ApiData> {
        let endpoint = config
            .endpoint
            .as_ref()
            .ok_or_else(|| anyhow!("API widget missing endpoint"))?;

        // 替换endpoint中的环境变量
        let endpoint = substitute_env(endpoint);

        let url = if endpoint.starts_with("http://") || endpoint.starts_with("https://") {
            endpoint.clone()
        } else if let Some(base) = &config.base_url {
            // 替换base_url中的环境变量
            let base = substitute_env(base);
            format!("{}{}", base.trim_end_matches('/'), endpoint)
        } else {
            anyhow::bail!("API widget missing base_url for relative endpoint");
        };

        let method_str = match config.method {
            WidgetApiMethod::GET => "GET",
            WidgetApiMethod::POST => "POST",
            WidgetApiMethod::PUT => "PUT",
            WidgetApiMethod::DELETE => "DELETE",
        };

        // 使用ureq同步客户端（在tokio::task::spawn_blocking中运行）
        let url_clone = url.clone();
        let timeout_ms = config.timeout;
        let headers = config.headers.clone();
        let method_str = method_str.to_string();

        let json_result = tokio::task::spawn_blocking(move || -> Result<Value> {
            let mut request =
                ureq::request(&method_str, &url_clone).timeout(Duration::from_millis(timeout_ms));

            // 添加headers
            for (key, value) in &headers {
                let substituted_value = substitute_env(value);
                request = request.set(key, &substituted_value);
            }

            // 添加User-Agent
            request = request.set("User-Agent", "claude-code-statusline/3.0");

            // 发送请求
            let response = request.call().context("ureq request failed")?;

            // 解析JSON
            let json: Value = response
                .into_json()
                .context("Failed to parse JSON response")?;

            Ok(json)
        })
        .await??;

        let json = json_result;

        if let Some(path) = &config.data_path {
            let selected = {
                let matches = jsonpath::select(&json, path).map_err(|err| anyhow!(err))?;
                matches.first().map(|value| (*value).clone())
            };
            if let Some(value) = selected {
                return Ok(ApiData {
                    root: json,
                    selected: value,
                });
            }
            return Err(anyhow!("JSONPath {path:?} yielded no results"));
        }

        let selected = json.clone();
        Ok(ApiData {
            root: json,
            selected,
        })
    }

    fn passes_filter(widget: &WidgetConfig, data: &Value) -> bool {
        widget
            .filter
            .as_ref()
            .map_or(true, |filter| value_matches_filter(filter, data))
    }

    fn compose_with_icon(
        widget: &WidgetConfig,
        content: &str,
        terminal: &TerminalCapabilities,
        config: &Config,
    ) -> String {
        let icon = select_widget_icon(widget, terminal, config);
        if icon.is_empty() {
            content.to_string()
        } else {
            format!("{icon} {content}")
        }
    }
}

fn value_matches_filter(filter: &WidgetFilterConfig, data: &Value) -> bool {
    let Some(keyword) = filter.keyword.as_deref() else {
        return true;
    };

    let matches = match jsonpath::select(data, &filter.object) {
        Ok(values) => values,
        Err(err) => {
            eprintln!(
                "[statusline] widget filter JSONPath {:?} error: {}",
                filter.object, err
            );
            return false;
        }
    };

    if matches.is_empty() {
        return false;
    }

    match filter.mode {
        WidgetFilterMode::Equals => matches
            .iter()
            .any(|value| json_value_as_string(value) == keyword),
        WidgetFilterMode::Contains => matches
            .iter()
            .any(|value| json_value_as_string(value).contains(keyword)),
        WidgetFilterMode::Pattern => match Regex::new(keyword) {
            Ok(regex) => matches
                .iter()
                .any(|value| regex.is_match(&json_value_as_string(value))),
            Err(err) => {
                eprintln!("[statusline] widget filter pattern {keyword:?} invalid: {err}");
                false
            }
        },
    }
}

fn json_value_as_string(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        other => other.to_string(),
    }
}

struct ApiData {
    root: Value,
    selected: Value,
}

#[derive(Default)]
struct MultiLineGrid {
    rows: BTreeMap<u32, BTreeMap<u32, String>>,
}

impl MultiLineGrid {
    fn clear(&mut self) {
        self.rows.clear();
    }

    fn set_cell(&mut self, row: u32, col: u32, content: String) {
        self.rows.entry(row).or_default().insert(col, content);
    }

    fn render(&self, config: &MultilineConfig) -> Vec<String> {
        let mut lines = Vec::new();

        for (row, columns) in &self.rows {
            let row_key = row.to_string();
            let row_config = config
                .rows
                .get(&row_key)
                .cloned()
                .unwrap_or_else(MultilineRowConfig::default);

            let mut parts: Vec<(u32, &String)> = columns.iter().map(|(k, v)| (*k, v)).collect();
            parts.sort_by_key(|(col, _)| *col);

            if parts.is_empty() {
                continue;
            }

            let joined = parts
                .into_iter()
                .map(|(_, value)| value.as_str())
                .collect::<Vec<_>>()
                .join(&row_config.separator);

            let line = if row_config.max_width > 0 {
                truncate_to_width(&joined, row_config.max_width as usize)
            } else {
                joined
            };

            lines.push(line);
        }

        lines
    }
}

fn truncate_to_width(text: &str, max_width: usize) -> String {
    if text.chars().count() <= max_width {
        return text.to_string();
    }
    text.chars().take(max_width).collect()
}

fn select_widget_icon(
    widget: &WidgetConfig,
    terminal: &TerminalCapabilities,
    config: &Config,
) -> String {
    if config.terminal.force_text {
        return widget.text_icon.clone();
    }
    if config.terminal.force_nerd_font {
        return widget.nerd_icon.clone();
    }
    if config.terminal.force_emoji {
        return widget.emoji_icon.clone();
    }

    if terminal.supports_nerd_font && config.style.enable_nerd_font.is_enabled(true) {
        return widget.nerd_icon.clone();
    }
    if terminal.supports_emoji && config.style.enable_emoji.is_enabled(true) {
        return widget.emoji_icon.clone();
    }

    widget.text_icon.clone()
}

fn substitute_env(input: &str) -> String {
    // 临时占位符，用于保护转义的美元符号
    const DOLLAR_PLACEHOLDER: &str = "\u{0000}DOLLAR\u{0000}";

    // 1. 先处理转义的 \$，将其替换为占位符
    let step1 = input.replace(r"\$", DOLLAR_PLACEHOLDER);

    // 2. 替换 ${VAR_NAME} 格式的环境变量
    let step2 = match ENV_PATTERN.get_or_init(|| Regex::new(r"\$\{([A-Z0-9_]+)\}")) {
        Ok(pattern) => pattern
            .replace_all(&step1, |captures: &regex::Captures| {
                let key = &captures[1];
                std::env::var(key).unwrap_or_default()
            })
            .into_owned(),
        Err(err) => {
            eprintln!("[statusline] failed to compile env regex: {err}");
            step1
        }
    };

    // 3. 将占位符替换回美元符号
    step2.replace(DOLLAR_PLACEHOLDER, "$")
}

fn render_template(template: &str, data: &Value) -> String {
    let mut result = String::new();
    let mut last_index = 0;

    let Some(pattern) = PLACEHOLDER_PATTERN
        .get_or_init(|| Regex::new(r"\{([^{}]+)\}"))
        .as_ref()
        .ok()
    else {
        eprintln!("[statusline] failed to compile placeholder regex");
        return template.to_string();
    };

    for capture in pattern.captures_iter(template) {
        let (Some(m), Some(expr_match)) = (capture.get(0), capture.get(1)) else {
            continue;
        };

        result.push_str(&template[last_index..m.start()]);
        let expr = expr_match.as_str();
        match render_placeholder(expr, data) {
            Ok(rendered) => result.push_str(&rendered),
            Err(err) => {
                eprintln!("[statusline] 模板渲染失败: {err}");
                let _ = write!(result, "{{{expr}}}");
            }
        }
        last_index = m.end();
    }

    result.push_str(&template[last_index..]);
    result
}

fn render_placeholder(expr: &str, data: &Value) -> Result<String> {
    let (expr_body, format_spec) = expr
        .find(':')
        .map_or((expr, None), |idx| (&expr[..idx], Some(&expr[idx + 1..])));

    let value = evaluate_expression(expr_body.trim(), data)?;

    let default_output = || {
        Ok(match &value {
            Value::Null => String::new(),
            Value::String(s) => s.clone(),
            Value::Number(n) => n.to_string(),
            Value::Bool(b) => b.to_string(),
            other => other.to_string(),
        })
    };

    format_spec.map_or_else(default_output, |spec| {
        format_value_with_spec(&value, spec.trim())
    })
}

fn evaluate_expression(expr: &str, data: &Value) -> Result<Value> {
    let trimmed = expr.trim();

    if trimmed.eq_ignore_ascii_case("now()") {
        return Ok(Number::from_f64(now_timestamp_millis()).map_or(Value::Null, Value::Number));
    }

    match TIME_DIFF_PATTERN
        .get_or_init(|| Regex::new(r"^(.+?)\s*-\s*(.+?)$"))
        .as_ref()
    {
        Ok(pattern) => {
            if let Some(caps) = pattern.captures(trimmed) {
                let left = caps.get(1).map_or("", |m| m.as_str().trim());
                let right = caps.get(2).map_or("", |m| m.as_str().trim());

                if let (Some(left_dt), Some(right_dt)) = (
                    resolve_time_operand(left, data),
                    resolve_time_operand(right, data),
                ) {
                    let diff_ms = calculate_time_difference(right_dt, left_dt);
                    return Ok(Number::from_f64(diff_ms).map_or(Value::Null, Value::Number));
                }
            }
        }
        Err(err) => {
            eprintln!("[statusline] failed to compile time diff regex: {err}");
        }
    }

    if is_math_expression(trimmed) {
        let number = evaluate_math_expression(trimmed, data)?;
        return Ok(Number::from_f64(number).map_or(Value::Null, Value::Number));
    }

    extract_value(trimmed, data)
}

fn resolve_time_operand(expr: &str, data: &Value) -> Option<DateTime<Utc>> {
    if expr.eq_ignore_ascii_case("now()") {
        return Some(Utc::now());
    }

    extract_value(expr, data)
        .ok()
        .and_then(|value| parse_date_value(&value))
}

fn extract_value(path: &str, data: &Value) -> Result<Value> {
    if path.is_empty() {
        return Ok(data.clone());
    }

    if path == "now()" {
        return Ok(Number::from_f64(now_timestamp_millis()).map_or(Value::Null, Value::Number));
    }

    let mut current = data.clone();

    for raw_segment in path.split('.') {
        let segment = raw_segment.trim();
        if segment.is_empty() || segment == "$" {
            continue;
        }

        if let Value::String(s) = &current {
            if let Ok(parsed) = serde_json::from_str::<Value>(s) {
                current = parsed;
            }
        }

        if let Some((name, index)) = parse_array_segment(segment) {
            let base = match &current {
                Value::Object(map) => map
                    .get(name)
                    .cloned()
                    .ok_or_else(|| anyhow!("Missing field: {name}"))?,
                _ => return Err(anyhow!("Expected object for field: {name}")),
            };

            let idx: usize = index
                .parse()
                .map_err(|_| anyhow!("Invalid index: {index}"))?;

            current = match base {
                Value::Array(arr) => arr
                    .get(idx)
                    .cloned()
                    .ok_or_else(|| anyhow!("Missing index {idx} for field {name}"))?,
                other => {
                    return Err(anyhow!(
                        "Expected array for field {name} but found {other:?}"
                    ))
                }
            };
            continue;
        }

        if let Ok(idx) = segment.parse::<usize>() {
            current = match &current {
                Value::Array(arr) => arr
                    .get(idx)
                    .cloned()
                    .ok_or_else(|| anyhow!("Missing index {idx}"))?,
                _ => return Err(anyhow!("Expected array for index {idx}")),
            };
            continue;
        }

        current = match &current {
            Value::Object(map) => map
                .get(segment)
                .cloned()
                .ok_or_else(|| anyhow!("Missing field: {segment}"))?,
            _ => return Err(anyhow!("Expected object for field {segment}")),
        };
    }

    Ok(current)
}

fn parse_array_segment(segment: &str) -> Option<(&str, &str)> {
    let open = segment.find('[')?;
    let close = segment.find(']')?;
    if close <= open {
        return None;
    }
    let name = &segment[..open];
    let index = &segment[open + 1..close];
    Some((name, index))
}

fn is_math_expression(expr: &str) -> bool {
    let trimmed = expr.trim();
    let math_regex = MATH_CHARS_REGEX
        .get_or_init(|| Regex::new(r"[+\-*/()]"))
        .as_ref();
    let ident_regex = IDENT_REGEX
        .get_or_init(|| Regex::new(r"^[a-zA-Z_][a-zA-Z0-9_.]*$"))
        .as_ref();

    match (math_regex, ident_regex) {
        (Ok(math), Ok(ident)) => math.is_match(trimmed) && !ident.is_match(trimmed),
        _ => false,
    }
}

fn evaluate_math_expression(expr: &str, data: &Value) -> Result<f64> {
    let mut parser = MathParser::new(expr, data);
    let value = parser.parse_expression()?;
    parser.expect_end()?;
    Ok(value)
}

struct MathParser<'a> {
    expr: &'a str,
    chars: Vec<char>,
    pos: usize,
    data: &'a Value,
}

impl<'a> MathParser<'a> {
    fn new(expr: &'a str, data: &'a Value) -> Self {
        Self {
            expr,
            chars: expr.chars().collect(),
            pos: 0,
            data,
        }
    }

    fn parse_expression(&mut self) -> Result<f64> {
        let mut value = self.parse_term()?;
        loop {
            self.skip_whitespace();
            match self.peek_char() {
                Some('+') => {
                    self.pos += 1;
                    value += self.parse_term()?;
                }
                Some('-') => {
                    self.pos += 1;
                    value -= self.parse_term()?;
                }
                _ => break,
            }
        }
        Ok(value)
    }

    fn parse_term(&mut self) -> Result<f64> {
        let mut value = self.parse_factor()?;
        loop {
            self.skip_whitespace();
            match self.peek_char() {
                Some('*') => {
                    self.pos += 1;
                    value *= self.parse_factor()?;
                }
                Some('/') => {
                    self.pos += 1;
                    let rhs = self.parse_factor()?;
                    if rhs == 0.0 {
                        return Err(anyhow!("Division by zero"));
                    }
                    value /= rhs;
                }
                _ => break,
            }
        }
        Ok(value)
    }

    fn parse_factor(&mut self) -> Result<f64> {
        self.skip_whitespace();
        if self.consume_char('+') {
            return self.parse_factor();
        }
        if self.consume_char('-') {
            return Ok(-self.parse_factor()?);
        }
        self.parse_primary()
    }

    fn parse_primary(&mut self) -> Result<f64> {
        self.skip_whitespace();
        match self.peek_char() {
            Some('(') => {
                self.pos += 1;
                let value = self.parse_expression()?;
                if !self.consume_char(')') {
                    return Err(anyhow!(
                        "Unmatched parenthesis in expression: {}",
                        self.expr
                    ));
                }
                Ok(value)
            }
            Some(ch) if ch.is_ascii_digit() || ch == '.' => self.parse_number(),
            Some(ch) if is_identifier_start(ch) => self.parse_identifier(),
            Some(_) | None => Err(anyhow!("Unexpected token in expression: {}", self.expr)),
        }
    }

    fn parse_number(&mut self) -> Result<f64> {
        let start = self.pos;
        while let Some(ch) = self.peek_char() {
            if ch.is_ascii_digit() || ch == '.' {
                self.pos += 1;
            } else {
                break;
            }
        }
        self.expr[start..self.pos]
            .parse::<f64>()
            .map_err(|_| anyhow!("Invalid number in expression: {}", self.expr))
    }

    fn parse_identifier(&mut self) -> Result<f64> {
        let start = self.pos;
        while let Some(ch) = self.peek_char() {
            if is_identifier_part(ch) || ch == '.' {
                self.pos += 1;
            } else {
                break;
            }
        }

        let mut ident = &self.expr[start..self.pos];

        if ident.eq_ignore_ascii_case("now") && self.consume_char('(') {
            if !self.consume_char(')') {
                return Err(anyhow!("Invalid now() invocation"));
            }
            return Ok(now_timestamp_millis());
        }

        if self.consume_char('(') {
            // Unsupported function call
            return Err(anyhow!("Unsupported function in expression: {ident}"));
        }

        ident = ident.trim();
        Ok(value_token_to_f64(ident, self.data))
    }

    fn skip_whitespace(&mut self) {
        while self.peek_char().is_some_and(char::is_whitespace) {
            self.pos += 1;
        }
    }

    fn peek_char(&self) -> Option<char> {
        self.chars.get(self.pos).copied()
    }

    fn consume_char(&mut self, expected: char) -> bool {
        if self.peek_char() == Some(expected) {
            self.pos += 1;
            true
        } else {
            false
        }
    }

    fn expect_end(&self) -> Result<()> {
        for ch in &self.chars[self.pos..] {
            if !ch.is_whitespace() {
                return Err(anyhow!(
                    "Unexpected trailing characters in expression: {}",
                    self.expr
                ));
            }
        }
        Ok(())
    }
}

const fn is_identifier_start(ch: char) -> bool {
    ch.is_ascii_alphabetic() || ch == '_'
}

const fn is_identifier_part(ch: char) -> bool {
    ch.is_ascii_alphanumeric() || ch == '_' || ch == '[' || ch == ']'
}

fn value_token_to_f64(token: &str, data: &Value) -> f64 {
    if let Ok(number) = token.parse::<f64>() {
        return number;
    }

    if token.eq_ignore_ascii_case("now()") {
        return now_timestamp_millis();
    }

    extract_value(token, data).map_or(0.0, |value| value_to_f64(&value).unwrap_or(0.0))
}

fn value_to_f64(value: &Value) -> Result<f64> {
    match value {
        Value::Number(n) => n
            .as_f64()
            .ok_or_else(|| anyhow!("Non-finite number encountered")),
        Value::String(s) => {
            if let Ok(number) = s.trim().parse::<f64>() {
                return Ok(number);
            }
            if let Some(dt) = parse_date_string(s.trim()) {
                return Ok(millis_to_f64(dt.timestamp_millis()));
            }
            Err(anyhow!("Invalid numeric string: {s}"))
        }
        Value::Bool(b) => Ok(if *b { 1.0 } else { 0.0 }),
        Value::Null => Ok(0.0),
        other => parse_date_value(other).map_or_else(
            || {
                Err(anyhow!(
                    "Unsupported value type for numeric conversion: {other}"
                ))
            },
            |dt| Ok(millis_to_f64(dt.timestamp_millis())),
        ),
    }
}

fn format_value_with_spec(value: &Value, spec: &str) -> Result<String> {
    if is_time_format(spec) {
        let diff_ms = value_to_f64(value)?;
        return Ok(format_time_difference(diff_ms, spec));
    }

    if spec == "%" {
        return Ok(format!("{}%", value_to_f64(value)?));
    }

    if spec == "d" {
        return Ok(format!("{}", f64_to_i64(value_to_f64(value)?)));
    }

    if spec.starts_with('.') && spec.ends_with('f') {
        let precision = spec[1..spec.len() - 1]
            .parse::<usize>()
            .map_err(|_| anyhow!("Invalid precision"))?;
        return Ok(format!(
            "{:.precision$}",
            value_to_f64(value)?,
            precision = precision
        ));
    }

    if let Some(body) = spec.strip_suffix('%') {
        let numeric = value_to_f64(value)? * 100.0;
        if body.is_empty() {
            return Ok(format!("{numeric}%"));
        }
        if body.starts_with('.') && body.ends_with('f') {
            let precision = body[1..body.len() - 1]
                .parse::<usize>()
                .map_err(|_| anyhow!("Invalid precision"))?;
            return Ok(format!("{numeric:.precision$}%"));
        }
        return Err(anyhow!("Unsupported format specifier: {spec}"));
    }

    Ok(match value {
        Value::Null => String::new(),
        Value::String(s) => s.clone(),
        Value::Number(_) | Value::Bool(_) => value_to_f64(value)?.to_string(),
        other => other.to_string(),
    })
}

fn parse_date_value(value: &Value) -> Option<DateTime<Utc>> {
    match value {
        Value::Number(n) => {
            let timestamp = n.as_f64()?;
            parse_numeric_timestamp(timestamp)
        }
        Value::String(s) => parse_date_string(s),
        Value::Bool(_) | Value::Null => None,
        other => other.as_str().and_then(parse_date_string),
    }
}

fn parse_numeric_timestamp(num: f64) -> Option<DateTime<Utc>> {
    if num.is_nan() || !num.is_finite() {
        return None;
    }
    let timestamp = if num >= 1.0e12 { num } else { num * 1000.0 };
    let millis = f64_to_i64(timestamp.round());
    Utc.timestamp_millis_opt(millis).single()
}

fn parse_date_string(input: &str) -> Option<DateTime<Utc>> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return None;
    }

    if let Ok(num) = trimmed.parse::<f64>() {
        return parse_numeric_timestamp(num);
    }

    if let Ok(dt) = parse_datetime_string(trimmed) {
        return Some(dt.with_timezone(&Utc));
    }

    if let Ok(dt) = DateTime::parse_from_rfc3339(trimmed) {
        return Some(dt.with_timezone(&Utc));
    }

    if let Ok(dt) = DateTime::parse_from_rfc2822(trimmed) {
        return Some(dt.with_timezone(&Utc));
    }

    None
}

fn calculate_time_difference(start: DateTime<Utc>, end: DateTime<Utc>) -> f64 {
    millis_to_f64((end - start).num_milliseconds())
}

fn is_time_format(format: &str) -> bool {
    matches!(
        format,
        "Y" | "years"
            | "M"
            | "months"
            | "D"
            | "days"
            | "H"
            | "hours"
            | "m"
            | "minutes"
            | "S"
            | "seconds"
            | "YMD"
            | "DHm"
            | "HmS"
            | "mS"
            | "Hm"
            | "dhm"
            | "hm"
    )
}

fn format_time_difference(diff_ms: f64, format: &str) -> String {
    if !diff_ms.is_finite() {
        return "{时间计算失败}".to_string();
    }

    let sign = if diff_ms < 0.0 { -1.0 } else { 1.0 };
    let abs_ms = diff_ms.abs();

    let years = (abs_ms / YEAR_MS).floor();
    let months = (abs_ms / MONTH_MS).floor();
    let days = (abs_ms / DAY_MS).floor();
    let hours = (abs_ms / HOUR_MS).floor();
    let minutes = (abs_ms / MINUTE_MS).floor();
    let _seconds = (abs_ms / SECOND_MS).floor();

    let remaining_after_days = abs_ms % DAY_MS;
    let hours_in_day = (remaining_after_days / HOUR_MS).floor();
    let remaining_after_hours = remaining_after_days % HOUR_MS;
    let minutes_in_hour = (remaining_after_hours / MINUTE_MS).floor();
    let remaining_after_minutes = remaining_after_hours % MINUTE_MS;
    let seconds_in_minute = (remaining_after_minutes / SECOND_MS).floor();

    match format {
        "Y" | "years" => format_number(sign * years),
        "M" | "months" => format_number(sign * months),
        "D" | "days" => format_number(sign * (abs_ms / DAY_MS).ceil()),
        "H" | "hours" => format_number(sign * (abs_ms / HOUR_MS).ceil()),
        "m" | "minutes" => format_number(sign * (abs_ms / MINUTE_MS).ceil()),
        "S" | "seconds" => format_number(sign * (abs_ms / SECOND_MS).ceil()),
        "YMD" => {
            let months_in_year = (months % 12.0).max(0.0);
            let days_after_months = months.mul_add(-30.0, days).max(0.0);
            let prefix = if sign < 0.0 { "-" } else { "" };
            format!(
                "{}{}年{}月{}天",
                prefix,
                f64_to_i64(years),
                f64_to_i64(months_in_year),
                f64_to_i64(days_after_months)
            )
        }
        "DHm" | "dhm" => {
            let prefix = if sign < 0.0 { "-" } else { "" };
            format!(
                "{}{}天{}小时{}分钟",
                prefix,
                f64_to_i64(days),
                f64_to_i64(hours_in_day),
                f64_to_i64(minutes_in_hour)
            )
        }
        "HmS" => {
            let prefix = if sign < 0.0 { "-" } else { "" };
            format!(
                "{}{}小时{}分钟{}秒",
                prefix,
                f64_to_i64(hours),
                f64_to_i64(minutes_in_hour),
                f64_to_i64(seconds_in_minute)
            )
        }
        "mS" => {
            let prefix = if sign < 0.0 { "-" } else { "" };
            format!(
                "{}{}分钟{}秒",
                prefix,
                f64_to_i64(minutes),
                f64_to_i64(seconds_in_minute)
            )
        }
        "Hm" | "hm" => {
            let prefix = if sign < 0.0 { "-" } else { "" };
            format!(
                "{}{}小时{}分钟",
                prefix,
                f64_to_i64(hours),
                f64_to_i64(minutes_in_hour)
            )
        }
        _ => {
            eprintln!("[statusline] 未知的时间格式: {format}");
            format_number(sign * (abs_ms / DAY_MS).ceil())
        }
    }
}

fn format_number(value: f64) -> String {
    if value.fract() == 0.0 {
        format!("{}", f64_to_i64(value))
    } else {
        format!("{value}")
    }
}

fn now_timestamp_millis() -> f64 {
    millis_to_f64(Utc::now().timestamp_millis())
}

#[allow(clippy::cast_precision_loss)]
const fn millis_to_f64(value: i64) -> f64 {
    value as f64
}

#[allow(clippy::cast_possible_truncation, clippy::cast_precision_loss)]
fn f64_to_i64(value: f64) -> i64 {
    value.trunc() as i64
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Config;
    use crate::core::InputData;
    use anyhow::{Context, Result};
    use serde_json::json;
    use std::collections::HashMap;
    use std::sync::Arc;

    type TestResult<T = ()> = Result<T>;

    #[tokio::test]
    async fn test_static_widget_rendering() -> TestResult {
        let mut config = Config {
            multiline: Some(MultilineConfig {
                enabled: true,
                max_rows: 5,
                rows: HashMap::new(),
            }),
            ..Config::default()
        };
        config.components.order = vec!["usage".to_string()];

        let temp_dir = tempfile::tempdir()?;
        let component_path = temp_dir.path().join("components").join("usage.toml");
        let component_dir = component_path
            .parent()
            .context("component path missing parent directory")?;
        std::fs::create_dir_all(component_dir)?;
        std::fs::write(
            &component_path,
            r#"
[widgets.sample]
enabled = true
type = "static"
row = 1
col = 0
nerd_icon = "\uf42e"
emoji_icon = "⭐"
text_icon = "[*]"
content = "Hello"
"#,
        )?;

        let mut renderer =
            MultiLineRenderer::new(config.clone(), Some(temp_dir.path().to_path_buf()));

        let context = RenderContext {
            input: Arc::new(InputData::default()),
            config: Arc::new(config),
            terminal: TerminalCapabilities {
                supports_colors: true,
                supports_emoji: true,
                supports_nerd_font: false,
            },
        };

        let result = renderer.render_extension_lines(&context).await;
        assert!(result.success);
        assert_eq!(result.lines.len(), 1);
        assert_eq!(result.lines[0], "⭐ Hello");
        Ok(())
    }

    #[tokio::test]
    async fn test_api_widget_error_does_not_abort() -> TestResult {
        let mut config = Config {
            multiline: Some(MultilineConfig {
                enabled: true,
                max_rows: 5,
                rows: HashMap::new(),
            }),
            ..Config::default()
        };
        config.components.order = vec!["usage".to_string()];

        let temp_dir = tempfile::tempdir()?;
        let component_path = temp_dir.path().join("components").join("usage.toml");
        let component_dir = component_path
            .parent()
            .context("component path missing parent directory")?;
        std::fs::create_dir_all(component_dir)?;
        std::fs::write(
            &component_path,
            r#"
[widgets.sample]
enabled = true
type = "api"
row = 1
col = 0
nerd_icon = "\uf42e"
emoji_icon = "⭐"
text_icon = "[*]"

[widgets.sample.api]
endpoint = "/missing"
method = "GET"
"#,
        )?;

        let mut renderer =
            MultiLineRenderer::new(config.clone(), Some(temp_dir.path().to_path_buf()));

        let context = RenderContext {
            input: Arc::new(InputData::default()),
            config: Arc::new(config),
            terminal: TerminalCapabilities::default(),
        };

        let result = renderer.render_extension_lines(&context).await;
        assert!(result.success);
        assert!(result.lines.is_empty());
        Ok(())
    }

    #[test]
    fn test_expression_template_rendering() {
        let data = serde_json::json!({
            "quota": 500_000.0,
            "usage": {
                "prompt_tokens": 1234,
                "completion_tokens": 567,
            },
        });

        let rendered = render_template("{quota / 500000:.2f}", &data);
        assert_eq!(rendered, "1.00");

        let rendered_percent = render_template("{quota / 500000:.2f%}", &data);
        assert_eq!(rendered_percent, "100.00%");
    }

    #[test]
    fn test_value_matches_filter_equals() {
        let filter = WidgetFilterConfig {
            object: "$.model".to_string(),
            mode: WidgetFilterMode::Equals,
            keyword: Some("claude".to_string()),
        };
        let data = json!({"model": "claude"});
        assert!(value_matches_filter(&filter, &data));
    }

    #[test]
    fn test_value_matches_filter_contains_false() {
        let filter = WidgetFilterConfig {
            object: "$".to_string(),
            mode: WidgetFilterMode::Contains,
            keyword: Some("claude".to_string()),
        };
        let data = json!({"model": "sonnet"});
        assert!(!value_matches_filter(&filter, &data));
    }

    #[test]
    fn test_substitute_env_with_escaped_dollar() {
        // 设置测试环境变量
        std::env::set_var("TEST_VAR", "test_value");

        // 测试转义的美元符号
        let input = [r"余额:\$", "{", "quota / 500000:.2f", "}"].concat();
        let result = substitute_env(&input);
        let expected_escaped = concat!("余额:$", "{quota / 500000:.2f}");
        assert_eq!(result, expected_escaped);

        // 测试混合使用：环境变量和转义的美元符号
        let input = [r"API: ${TEST_VAR}, 余额:\$", "{", "quota:.2f", "}"].concat();
        let result = substitute_env(&input);
        let expected_mixed = concat!("API: test_value, 余额:$", "{quota:.2f}");
        assert_eq!(result, expected_mixed);

        // 测试仅环境变量
        let input = "API: ${TEST_VAR}";
        let result = substitute_env(input);
        assert_eq!(result, "API: test_value");

        // 清理测试环境变量
        std::env::remove_var("TEST_VAR");
    }
}
