//! Configuration schema definitions
//!
//! This module defines all configuration structures for the statusline,
//! compatible with the TypeScript version's TOML config files.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Main configuration structure
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Config {
    /// Component preset string (e.g., "PMBTUS")
    #[serde(default)]
    pub preset: Option<String>,

    /// Theme name (classic, powerline, capsule)
    #[serde(default = "default_theme")]
    pub theme: String,

    /// Language setting
    #[serde(default = "default_language")]
    pub language: String,

    /// Debug mode
    #[serde(default)]
    pub debug: bool,

    /// Terminal capabilities override
    #[serde(default)]
    pub terminal: TerminalConfig,

    /// Storage configuration
    #[serde(default)]
    pub storage: StorageConfig,

    /// Style configuration
    #[serde(default)]
    pub style: StyleConfig,

    /// Component configurations
    #[serde(default)]
    pub components: ComponentsConfig,

    /// Multi-line configuration (optional)
    #[serde(default)]
    pub multiline: Option<MultilineConfig>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            preset: Some("PMBTUS".to_string()),
            theme: default_theme(),
            language: default_language(),
            debug: false,
            terminal: TerminalConfig::default(),
            storage: StorageConfig::default(),
            style: StyleConfig::default(),
            components: ComponentsConfig::default(),
            multiline: Some(MultilineConfig::default()),
        }
    }
}

/// Terminal capabilities configuration
#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct TerminalConfig {
    /// Force enable Nerd Font icons
    #[serde(default)]
    pub force_nerd_font: bool,

    /// Force enable Emoji icons
    #[serde(default)]
    pub force_emoji: bool,

    /// Force enable text-only mode
    #[serde(default)]
    pub force_text: bool,
}

/// Storage system configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StorageConfig {
    /// Enable conversation-level cost tracking
    #[serde(default = "default_true", rename = "enableConversationTracking")]
    pub enable_conversation_tracking: bool,

    /// Enable cost data persistence
    #[serde(default = "default_true", rename = "enableCostPersistence")]
    pub enable_cost_persistence: bool,

    /// Session data expiration (in days)
    #[serde(
        default = "default_expiry",
        rename = "sessionExpiryDays",
        alias = "autoCleanupDays"
    )]
    pub session_expiry_days: u32,

    /// Enable cleanup on startup
    #[serde(default = "default_true", rename = "enableStartupCleanup")]
    pub enable_startup_cleanup: bool,
}

impl Default for StorageConfig {
    fn default() -> Self {
        Self {
            enable_conversation_tracking: true,
            enable_cost_persistence: true,
            session_expiry_days: default_expiry(),
            enable_startup_cleanup: true,
        }
    }
}

/// Style configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StyleConfig {
    /// Component separator
    #[serde(default = "default_separator")]
    pub separator: String,

    /// Enable colors
    #[serde(default = "default_auto")]
    pub enable_colors: AutoDetect,

    /// Enable emoji
    #[serde(default = "default_auto")]
    pub enable_emoji: AutoDetect,

    /// Enable Nerd Font icons
    #[serde(default = "default_auto")]
    pub enable_nerd_font: AutoDetect,

    /// Separator color
    #[serde(default = "default_white")]
    pub separator_color: String,

    /// Space before separator
    #[serde(default = "default_space")]
    pub separator_before: String,

    /// Space after separator
    #[serde(default = "default_space")]
    pub separator_after: String,
}

impl Default for StyleConfig {
    fn default() -> Self {
        Self {
            separator: default_separator(),
            enable_colors: default_auto(),
            enable_emoji: default_auto(),
            enable_nerd_font: default_auto(),
            separator_color: default_white(),
            separator_before: default_space(),
            separator_after: default_space(),
        }
    }
}

/// Auto-detection option
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(untagged)]
pub enum AutoDetect {
    Bool(bool),
    #[serde(rename = "auto")]
    Auto(String),
}

impl Default for AutoDetect {
    fn default() -> Self {
        Self::Auto("auto".to_string())
    }
}

impl AutoDetect {
    #[must_use]
    pub const fn is_enabled(&self, detected: bool) -> bool {
        match self {
            Self::Bool(value) => *value,
            Self::Auto(_) => detected,
        }
    }
}

/// All component configurations
#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct ComponentsConfig {
    /// Component display order (e.g., `["project", "model", "branch", "tokens"]`)
    #[serde(default)]
    pub order: Vec<String>,

    #[serde(default)]
    pub project: ProjectComponentConfig,

    #[serde(default)]
    pub model: ModelComponentConfig,

    #[serde(default)]
    pub branch: BranchComponentConfig,

    #[serde(default)]
    pub tokens: TokensComponentConfig,

    #[serde(default)]
    pub usage: UsageComponentConfig,

    #[serde(default)]
    pub status: StatusComponentConfig,
}

/// Base component configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BaseComponentConfig {
    /// Whether to enable this component
    #[serde(default = "default_true")]
    pub enabled: bool,

    /// Icon color
    #[serde(default = "default_white")]
    pub icon_color: String,

    /// Text color
    #[serde(default = "default_white")]
    pub text_color: String,

    /// Emoji icon
    pub emoji_icon: String,

    /// Nerd Font icon
    pub nerd_icon: String,

    /// Text icon
    pub text_icon: String,
}

/// Project component configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ProjectComponentConfig {
    #[serde(flatten)]
    pub base: BaseComponentConfig,

    /// Show when project name is empty
    #[serde(default)]
    pub show_when_empty: bool,
}

impl Default for ProjectComponentConfig {
    fn default() -> Self {
        Self {
            base: BaseComponentConfig {
                enabled: true,
                icon_color: "white".to_string(),
                text_color: "white".to_string(),
                emoji_icon: "📁".to_string(),
                nerd_icon: "\u{f07c}".to_string(),
                text_icon: "[P]".to_string(),
            },
            show_when_empty: false,
        }
    }
}

/// Model component configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ModelComponentConfig {
    #[serde(flatten)]
    pub base: BaseComponentConfig,

    /// Show full model name
    #[serde(default)]
    pub show_full_name: bool,

    /// Custom model short name mapping
    #[serde(default)]
    pub mapping: HashMap<String, String>,

    /// Custom model long name mapping
    #[serde(default)]
    pub long_name_mapping: HashMap<String, String>,
}

impl Default for ModelComponentConfig {
    fn default() -> Self {
        Self {
            base: BaseComponentConfig {
                enabled: true,
                icon_color: "white".to_string(),
                text_color: "white".to_string(),
                emoji_icon: "🤖".to_string(),
                nerd_icon: "\u{f544}".to_string(),
                text_icon: "[M]".to_string(),
            },
            show_full_name: false,
            mapping: HashMap::new(),
            long_name_mapping: HashMap::new(),
        }
    }
}

/// Branch component configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BranchComponentConfig {
    #[serde(flatten)]
    pub base: BaseComponentConfig,

    /// Show when branch is empty
    #[serde(default)]
    pub show_when_empty: bool,

    /// Show placeholder when repository is missing
    #[serde(default)]
    pub show_when_no_git: bool,

    /// Trim branch names to avoid overflowing the statusline
    #[serde(default = "default_branch_max_length")]
    pub max_length: u32,

    /// Branch status display options
    #[serde(default)]
    pub status: BranchStatusConfig,

    /// Branch status icons
    #[serde(default)]
    pub status_icons: BranchStatusIcons,

    /// Branch status colors
    #[serde(default)]
    pub status_colors: BranchStatusColors,

    /// Performance tuning options
    #[serde(default)]
    pub performance: BranchPerformanceConfig,
}

impl Default for BranchComponentConfig {
    fn default() -> Self {
        Self {
            base: BaseComponentConfig {
                enabled: true,
                icon_color: "green".to_string(),
                text_color: "white".to_string(),
                emoji_icon: "🌿".to_string(),
                nerd_icon: "\u{e0a0}".to_string(),
                text_icon: "[B]".to_string(),
            },
            show_when_empty: false,
            show_when_no_git: false,
            max_length: default_branch_max_length(),
            status: BranchStatusConfig::default(),
            status_icons: BranchStatusIcons::default(),
            status_colors: BranchStatusColors::default(),
            performance: BranchPerformanceConfig::default(),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[allow(clippy::struct_excessive_bools)]
pub struct BranchPerformanceConfig {
    #[serde(default = "default_true")]
    pub enable_cache: bool,

    #[serde(default = "default_branch_cache_ttl")]
    pub cache_ttl: u64,

    #[serde(default = "default_branch_git_timeout")]
    pub git_timeout: u32,

    #[serde(default = "default_true")]
    pub parallel_commands: bool,

    #[serde(default = "default_true")]
    pub lazy_load_status: bool,

    #[serde(default = "default_true")]
    pub skip_on_large_repo: bool,

    #[serde(default = "default_branch_large_repo_threshold")]
    pub large_repo_threshold: u64,
}

impl Default for BranchPerformanceConfig {
    fn default() -> Self {
        Self {
            enable_cache: true,
            cache_ttl: default_branch_cache_ttl(),
            git_timeout: default_branch_git_timeout(),
            parallel_commands: true,
            lazy_load_status: true,
            skip_on_large_repo: true,
            large_repo_threshold: default_branch_large_repo_threshold(),
        }
    }
}

/// Branch status configuration
#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct BranchStatusConfig {
    /// Show dirty workspace status
    #[serde(default)]
    pub show_dirty: bool,

    /// Show ahead/behind count
    #[serde(default)]
    pub show_ahead_behind: bool,

    /// Show stash count
    #[serde(default)]
    pub show_stash_count: bool,
}

/// Branch status icons
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BranchStatusIcons {
    pub dirty_emoji: String,
    pub ahead_emoji: String,
    pub behind_emoji: String,
    pub stash_emoji: String,
    pub dirty_nerd: String,
    pub ahead_nerd: String,
    pub behind_nerd: String,
    pub stash_nerd: String,
    pub dirty_text: String,
    pub ahead_text: String,
    pub behind_text: String,
    pub stash_text: String,
}

impl Default for BranchStatusIcons {
    fn default() -> Self {
        Self {
            dirty_emoji: "⚡".to_string(),
            ahead_emoji: "🔼".to_string(),
            behind_emoji: "🔽".to_string(),
            stash_emoji: "📦".to_string(),
            dirty_nerd: "\u{e0a0}".to_string(),
            ahead_nerd: "\u{f062}".to_string(),
            behind_nerd: "\u{f063}".to_string(),
            stash_nerd: "\u{f01c}".to_string(),
            dirty_text: "[*]".to_string(),
            ahead_text: "[↑]".to_string(),
            behind_text: "[↓]".to_string(),
            stash_text: "[S]".to_string(),
        }
    }
}

/// Branch status colors
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BranchStatusColors {
    pub clean: String,
    pub dirty: String,
    #[serde(default = "default_branch_ahead_color")]
    pub ahead: String,
    #[serde(default = "default_branch_behind_color")]
    pub behind: String,
    #[serde(default = "default_branch_operation_color")]
    pub operation: String,
}

impl Default for BranchStatusColors {
    fn default() -> Self {
        Self {
            clean: "green".to_string(),
            dirty: "yellow".to_string(),
            ahead: default_branch_ahead_color(),
            behind: default_branch_behind_color(),
            operation: default_branch_operation_color(),
        }
    }
}

/// Tokens component configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
#[allow(clippy::struct_excessive_bools)]
pub struct TokensComponentConfig {
    #[serde(flatten)]
    pub base: BaseComponentConfig,

    /// Show zero tokens
    #[serde(default)]
    pub show_zero: bool,

    /// Number formatting
    #[serde(default = "default_compact")]
    pub format: String,

    #[serde(default)]
    pub show_progress_bar: bool,

    #[serde(default)]
    pub show_percentage: bool,

    #[serde(default)]
    pub show_raw_numbers: bool,

    #[serde(default = "default_progress_width")]
    pub progress_width: u32,

    #[serde(default)]
    pub show_gradient: bool,

    #[serde(default)]
    pub progress_bar_chars: TokensProgressBarCharsConfig,

    #[serde(default)]
    pub colors: TokensColorConfig,

    #[serde(default)]
    pub thresholds: TokensThresholdsConfig,

    #[serde(default)]
    pub status_icons: TokensStatusIconsConfig,

    #[serde(default)]
    pub context_windows: HashMap<String, u64>,
}

impl Default for TokensComponentConfig {
    fn default() -> Self {
        Self {
            base: BaseComponentConfig {
                enabled: true,
                icon_color: "cyan".to_string(),
                text_color: "white".to_string(),
                emoji_icon: "📊".to_string(),
                nerd_icon: "\u{f201}".to_string(),
                text_icon: "[T]".to_string(),
            },
            show_zero: false,
            format: default_compact(),
            show_progress_bar: false,
            show_percentage: true,
            show_raw_numbers: false,
            progress_width: default_progress_width(),
            show_gradient: false,
            progress_bar_chars: TokensProgressBarCharsConfig::default(),
            colors: TokensColorConfig::default(),
            thresholds: TokensThresholdsConfig::default(),
            status_icons: TokensStatusIconsConfig::default(),
            context_windows: default_context_windows(),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TokensProgressBarCharsConfig {
    #[serde(default = "default_filled_char")]
    pub filled: String,
    #[serde(default = "default_empty_char")]
    pub empty: String,
    #[serde(default = "default_backup_char")]
    pub backup: String,
}

impl Default for TokensProgressBarCharsConfig {
    fn default() -> Self {
        Self {
            filled: default_filled_char(),
            empty: default_empty_char(),
            backup: default_backup_char(),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TokensColorConfig {
    #[serde(default = "default_safe_color")]
    pub safe: String,
    #[serde(default = "default_warning_color")]
    pub warning: String,
    #[serde(default = "default_danger_color")]
    pub danger: String,
}

impl Default for TokensColorConfig {
    fn default() -> Self {
        Self {
            safe: default_safe_color(),
            warning: default_warning_color(),
            danger: default_danger_color(),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TokensThresholdsConfig {
    #[serde(default = "default_warning_threshold")]
    pub warning: f64,
    #[serde(default = "default_danger_threshold")]
    pub danger: f64,
    #[serde(default = "default_backup_threshold")]
    pub backup: f64,
    #[serde(default = "default_critical_threshold")]
    pub critical: f64,
}

impl Default for TokensThresholdsConfig {
    fn default() -> Self {
        Self {
            warning: default_warning_threshold(),
            danger: default_danger_threshold(),
            backup: default_backup_threshold(),
            critical: default_critical_threshold(),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct TokenIconSetConfig {
    #[serde(default)]
    pub backup: String,
    #[serde(default)]
    pub critical: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TokensStatusIconsConfig {
    #[serde(default = "default_emoji_icon_set")]
    pub emoji: TokenIconSetConfig,
    #[serde(default = "default_nerd_icon_set")]
    pub nerd: TokenIconSetConfig,
    #[serde(default = "default_text_icon_set")]
    pub text: TokenIconSetConfig,
}

impl Default for TokensStatusIconsConfig {
    fn default() -> Self {
        Self {
            emoji: default_emoji_icon_set(),
            nerd: default_nerd_icon_set(),
            text: default_text_icon_set(),
        }
    }
}

/// Usage component configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UsageComponentConfig {
    #[serde(flatten)]
    pub base: BaseComponentConfig,

    /// Display mode
    #[serde(default = "default_smart")]
    pub display_mode: String,

    /// Precision for cost display
    #[serde(default = "default_precision")]
    pub precision: u32,

    /// Show lines added
    #[serde(default)]
    pub show_lines_added: bool,

    /// Show lines removed
    #[serde(default)]
    pub show_lines_removed: bool,
}

impl Default for UsageComponentConfig {
    fn default() -> Self {
        Self {
            base: BaseComponentConfig {
                enabled: true,
                icon_color: "yellow".to_string(),
                text_color: "white".to_string(),
                emoji_icon: "💰".to_string(),
                nerd_icon: "\u{f155}".to_string(),
                text_icon: "[U]".to_string(),
            },
            display_mode: default_smart(),
            precision: default_precision(),
            show_lines_added: false,
            show_lines_removed: false,
        }
    }
}

/// Status component configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StatusComponentConfig {
    #[serde(flatten)]
    pub base: BaseComponentConfig,

    /// Show when idle
    #[serde(default)]
    pub show_when_idle: bool,

    /// Show recent errors pulled from transcript tail
    #[serde(default = "default_true")]
    pub show_recent_errors: bool,

    /// Status icon overrides grouped by output type
    #[serde(default)]
    pub icons: StatusIconsConfig,

    /// Status colours per state
    #[serde(default)]
    pub colors: StatusColorConfig,
}

impl Default for StatusComponentConfig {
    fn default() -> Self {
        Self {
            base: BaseComponentConfig {
                enabled: true,
                icon_color: "magenta".to_string(),
                text_color: "white".to_string(),
                emoji_icon: "✨".to_string(),
                nerd_icon: "\u{f00c}".to_string(),
                text_icon: "[S]".to_string(),
            },
            show_when_idle: false,
            show_recent_errors: default_true(),
            icons: StatusIconsConfig::default(),
            colors: StatusColorConfig::default(),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct StatusIconsConfig {
    #[serde(default)]
    pub emoji: StatusEmojiIcons,

    #[serde(default)]
    pub nerd: StatusNerdIcons,

    #[serde(default)]
    pub text: StatusTextIcons,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StatusEmojiIcons {
    #[serde(default = "default_status_ready_emoji")]
    pub ready: String,
    #[serde(default = "default_status_thinking_emoji")]
    pub thinking: String,
    #[serde(default = "default_status_tool_emoji")]
    pub tool: String,
    #[serde(default = "default_status_error_emoji")]
    pub error: String,
    #[serde(default = "default_status_warning_emoji")]
    pub warning: String,
}

impl Default for StatusEmojiIcons {
    fn default() -> Self {
        Self {
            ready: default_status_ready_emoji(),
            thinking: default_status_thinking_emoji(),
            tool: default_status_tool_emoji(),
            error: default_status_error_emoji(),
            warning: default_status_warning_emoji(),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StatusNerdIcons {
    #[serde(default = "default_status_ready_nerd")]
    pub ready: String,
    #[serde(default = "default_status_thinking_nerd")]
    pub thinking: String,
    #[serde(default = "default_status_tool_nerd")]
    pub tool: String,
    #[serde(default = "default_status_error_nerd")]
    pub error: String,
    #[serde(default = "default_status_warning_nerd")]
    pub warning: String,
}

impl Default for StatusNerdIcons {
    fn default() -> Self {
        Self {
            ready: default_status_ready_nerd(),
            thinking: default_status_thinking_nerd(),
            tool: default_status_tool_nerd(),
            error: default_status_error_nerd(),
            warning: default_status_warning_nerd(),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StatusTextIcons {
    #[serde(default = "default_status_ready_text")]
    pub ready: String,
    #[serde(default = "default_status_thinking_text")]
    pub thinking: String,
    #[serde(default = "default_status_tool_text")]
    pub tool: String,
    #[serde(default = "default_status_error_text")]
    pub error: String,
    #[serde(default = "default_status_warning_text")]
    pub warning: String,
}

impl Default for StatusTextIcons {
    fn default() -> Self {
        Self {
            ready: default_status_ready_text(),
            thinking: default_status_thinking_text(),
            tool: default_status_tool_text(),
            error: default_status_error_text(),
            warning: default_status_warning_text(),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StatusColorConfig {
    #[serde(default = "default_status_ready_color")]
    pub ready: String,
    #[serde(default = "default_status_thinking_color")]
    pub thinking: String,
    #[serde(default = "default_status_tool_color")]
    pub tool: String,
    #[serde(default = "default_status_error_color")]
    pub error: String,
    #[serde(default = "default_status_warning_color")]
    pub warning: String,
}

impl Default for StatusColorConfig {
    fn default() -> Self {
        Self {
            ready: default_status_ready_color(),
            thinking: default_status_thinking_color(),
            tool: default_status_tool_color(),
            error: default_status_error_color(),
            warning: default_status_warning_color(),
        }
    }
}

/// Multi-line configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MultilineConfig {
    /// Enable multi-line mode
    #[serde(default = "default_true")]
    pub enabled: bool,

    /// Maximum number of rows supported by the grid
    #[serde(default = "default_max_rows")]
    pub max_rows: u32,

    /// Per-row configuration metadata
    #[serde(default)]
    pub rows: HashMap<String, MultilineRowConfig>,
}

impl Default for MultilineConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_rows: default_max_rows(),
            rows: HashMap::new(),
        }
    }
}

/// Multi-line row configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MultilineRowConfig {
    /// Separator placed between widgets on this row
    #[serde(default = "default_separator")]
    pub separator: String,

    /// Maximum width allowed for this row
    #[serde(default = "default_row_width")]
    pub max_width: u32,
}

impl Default for MultilineRowConfig {
    fn default() -> Self {
        Self {
            separator: default_separator(),
            max_width: default_row_width(),
        }
    }
}

// Default value functions
fn default_theme() -> String {
    "classic".to_string()
}

fn default_language() -> String {
    "en".to_string()
}

const fn default_true() -> bool {
    true
}

const fn default_expiry() -> u32 {
    30
}

fn default_separator() -> String {
    "|".to_string()
}

fn default_auto() -> AutoDetect {
    AutoDetect::Auto("auto".to_string())
}

fn default_white() -> String {
    "white".to_string()
}

fn default_space() -> String {
    " ".to_string()
}

fn default_compact() -> String {
    "compact".to_string()
}

fn default_smart() -> String {
    "smart".to_string()
}

const fn default_precision() -> u32 {
    2
}

const fn default_max_rows() -> u32 {
    5
}

const fn default_row_width() -> u32 {
    120
}

fn default_branch_ahead_color() -> String {
    "cyan".to_string()
}

fn default_branch_behind_color() -> String {
    "magenta".to_string()
}

fn default_branch_operation_color() -> String {
    "red".to_string()
}

const fn default_branch_max_length() -> u32 {
    20
}

const fn default_branch_cache_ttl() -> u64 {
    5_000
}

const fn default_branch_git_timeout() -> u32 {
    1_000
}

const fn default_branch_large_repo_threshold() -> u64 {
    10_000
}

const fn default_progress_width() -> u32 {
    15
}

fn default_filled_char() -> String {
    "█".to_string()
}

fn default_empty_char() -> String {
    "░".to_string()
}

fn default_backup_char() -> String {
    "▓".to_string()
}

fn default_safe_color() -> String {
    "green".to_string()
}

fn default_warning_color() -> String {
    "yellow".to_string()
}

fn default_danger_color() -> String {
    "red".to_string()
}

const fn default_warning_threshold() -> f64 {
    60.0
}

const fn default_danger_threshold() -> f64 {
    85.0
}

const fn default_backup_threshold() -> f64 {
    85.0
}

const fn default_critical_threshold() -> f64 {
    95.0
}

fn default_context_windows() -> HashMap<String, u64> {
    let mut map = HashMap::new();
    map.insert("default".to_string(), 200_000);
    map
}

fn default_emoji_icon_set() -> TokenIconSetConfig {
    TokenIconSetConfig {
        backup: "⚡".to_string(),
        critical: "🔥".to_string(),
    }
}

fn default_nerd_icon_set() -> TokenIconSetConfig {
    TokenIconSetConfig {
        backup: "\u{f0e7}".to_string(),
        critical: "\u{f06d}".to_string(),
    }
}

fn default_text_icon_set() -> TokenIconSetConfig {
    TokenIconSetConfig {
        backup: "[!]".to_string(),
        critical: "[X]".to_string(),
    }
}

fn default_status_ready_color() -> String {
    "green".to_string()
}

fn default_status_thinking_color() -> String {
    "yellow".to_string()
}

fn default_status_tool_color() -> String {
    "blue".to_string()
}

fn default_status_error_color() -> String {
    "red".to_string()
}

fn default_status_warning_color() -> String {
    "yellow".to_string()
}

fn default_status_ready_emoji() -> String {
    "✅".to_string()
}

fn default_status_thinking_emoji() -> String {
    "💭".to_string()
}

fn default_status_tool_emoji() -> String {
    "🔧".to_string()
}

fn default_status_error_emoji() -> String {
    "❌".to_string()
}

fn default_status_warning_emoji() -> String {
    "⚠️".to_string()
}

fn default_status_ready_nerd() -> String {
    "\u{f00c}".to_string()
}

fn default_status_thinking_nerd() -> String {
    "\u{f0ad}".to_string()
}

fn default_status_tool_nerd() -> String {
    "\u{f0ad}".to_string()
}

fn default_status_error_nerd() -> String {
    "\u{f06a}".to_string()
}

fn default_status_warning_nerd() -> String {
    "\u{f071}".to_string()
}

fn default_status_ready_text() -> String {
    "[OK]".to_string()
}

fn default_status_thinking_text() -> String {
    "[...]".to_string()
}

fn default_status_tool_text() -> String {
    "[TOOL]".to_string()
}

fn default_status_error_text() -> String {
    "[ERR]".to_string()
}

fn default_status_warning_text() -> String {
    "[WARN]".to_string()
}
