use serde::Deserialize;
use std::collections::HashMap;

/// Component-level multiline configuration loaded from component template files.
#[derive(Debug, Clone, Deserialize, Default)]
pub struct ComponentMultilineConfig {
    /// Optional metadata (description, version, etc.)
    pub meta: Option<ComponentMultilineMeta>,
    /// Widget definitions keyed by name
    #[serde(default)]
    pub widgets: HashMap<String, WidgetConfig>,
}

/// Optional metadata for component multiline configuration
#[derive(Debug, Clone, Deserialize, Default)]
pub struct ComponentMultilineMeta {
    /// Descriptive label
    pub description: Option<String>,
    /// Version string
    pub version: Option<String>,
}

/// Supported widget types.
#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum WidgetType {
    Static,
    Api,
}

impl Default for WidgetType {
    fn default() -> Self {
        Self::Static
    }
}

/// Widget configuration
#[derive(Debug, Clone, Deserialize)]
pub struct WidgetConfig {
    /// Whether the widget is enabled
    #[serde(default = "default_true")]
    pub enabled: bool,
    /// Force flag overrides detection logic
    pub force: Option<bool>,
    /// Widget type (static or api)
    #[serde(rename = "type", default)]
    pub kind: WidgetType,
    /// Row position (1-indexed)
    pub row: u32,
    /// Column position (0-indexed)
    pub col: u32,
    /// Nerd font icon string
    pub nerd_icon: String,
    /// Emoji icon string
    pub emoji_icon: String,
    /// Text fallback icon string
    pub text_icon: String,
    /// Static content (for static widgets)
    pub content: Option<String>,
    /// Template string (for api widgets)
    pub template: Option<String>,
    /// API configuration (for api widgets)
    pub api: Option<WidgetApiConfig>,
    /// Detection configuration used to gate widget rendering
    pub detection: Option<WidgetDetectionConfig>,
    /// Optional filter applied to API results before rendering
    pub filter: Option<WidgetFilterConfig>,
}

/// Widget detection options used to automatically enable widgets
#[derive(Debug, Clone, Deserialize, Default)]
pub struct WidgetDetectionConfig {
    /// Environment variable to inspect
    pub env: Option<String>,
    /// Substring that should be contained within the env var
    pub contains: Option<String>,
    /// Exact match requirement
    pub equals: Option<String>,
    /// Regex pattern that must match
    pub pattern: Option<String>,
}

/// Filtering options for API widgets
#[derive(Debug, Clone, Deserialize)]
pub struct WidgetFilterConfig {
    /// `JSONPath` expression to locate target value (default `$`)
    #[serde(default = "default_filter_object")]
    pub object: String,
    /// Filtering mode (equals / contains / pattern)
    #[serde(default)]
    pub mode: WidgetFilterMode,
    /// Keyword used for comparison
    pub keyword: Option<String>,
}

impl Default for WidgetFilterConfig {
    fn default() -> Self {
        Self {
            object: default_filter_object(),
            mode: WidgetFilterMode::Equals,
            keyword: None,
        }
    }
}

/// Filtering mode
#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum WidgetFilterMode {
    Equals,
    Contains,
    Pattern,
}

impl Default for WidgetFilterMode {
    fn default() -> Self {
        Self::Equals
    }
}

/// HTTP method for API widgets
#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum WidgetApiMethod {
    GET,
    POST,
    PUT,
    DELETE,
}

impl Default for WidgetApiMethod {
    fn default() -> Self {
        Self::GET
    }
}

/// API configuration for API widgets
#[derive(Debug, Clone, Deserialize, Default)]
pub struct WidgetApiConfig {
    /// Base URL (e.g. <https://api.example.com>)
    pub base_url: Option<String>,
    /// Endpoint path (e.g. /v1/data)
    pub endpoint: Option<String>,
    /// HTTP method
    #[serde(default)]
    pub method: WidgetApiMethod,
    /// Timeout in milliseconds
    #[serde(default = "default_timeout_ms")]
    pub timeout: u64,
    /// Optional headers (supports environment variable substitutions)
    #[serde(default)]
    pub headers: HashMap<String, String>,
    /// `JSONPath` expression for extracting data from response
    pub data_path: Option<String>,
}

const fn default_true() -> bool {
    true
}

const fn default_timeout_ms() -> u64 {
    5000
}

fn default_filter_object() -> String {
    "$".to_string()
}
