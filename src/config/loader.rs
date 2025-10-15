//! Configuration loader implementation
//!
//! This module provides the ConfigLoader which handles:
//! - Configuration file discovery
//! - TOML parsing
//! - Multi-layer configuration merging
//! - Default value handling

use anyhow::{anyhow, Context, Result};
use dirs;
use std::fs;
use std::path::{Path, PathBuf};
use toml::{self, Value};
use toml_edit::{value as toml_value, DocumentMut};

use super::schema::Config;
use crate::storage::ProjectResolver;

/// Configuration source information
#[derive(Debug, Clone)]
pub struct ConfigSource {
    /// Path to the loaded configuration file
    pub path: Option<PathBuf>,
    /// Type of configuration (default, user, project, custom)
    pub source_type: ConfigSourceType,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ConfigSourceType {
    Default,
    User,
    Project,
    Custom,
}

/// Summary of terminal capabilities used when generating default configs
#[derive(Debug, Clone, Copy)]
pub struct TerminalCapabilityHint {
    pub colors: bool,
    pub emoji: bool,
    pub nerd_font: bool,
}

/// Options for copying component templates
#[derive(Debug, Clone, Default)]
pub struct CopyComponentOptions {
    pub force: bool,
    pub interactive: bool,
}

/// Options for generating a default configuration file
#[derive(Debug, Clone, Copy, Default)]
pub struct CreateConfigOptions<'a> {
    pub target_path: Option<&'a Path>,
    pub theme: Option<&'a str>,
    pub capabilities: Option<TerminalCapabilityHint>,
    pub copy_components: bool,
    pub force: bool,
}

/// Result after creating a configuration file
#[derive(Debug, Clone)]
pub struct CreateConfigResult {
    pub path: PathBuf,
    pub copy_stats: Option<ComponentCopyStats>,
}

/// Statistics describing component template copy operations
#[derive(Debug, Clone, Default)]
pub struct ComponentCopyStats {
    pub copied: usize,
    pub skipped: usize,
}

/// Detailed information about how a configuration layer modified the final config.
#[derive(Debug, Clone)]
pub struct MergeLayer {
    pub source_type: ConfigSourceType,
    pub path: Option<PathBuf>,
    pub added_keys: Vec<String>,
    pub updated_keys: Vec<String>,
}

/// Summary describing the merge process for the active configuration.
#[derive(Debug, Clone, Default)]
pub struct MergeReport {
    pub layers: Vec<MergeLayer>,
}

/// Configuration loader
pub struct ConfigLoader {
    /// Cached configuration
    cached_config: Option<Config>,
    /// Source of the loaded configuration
    config_source: Option<ConfigSource>,
    /// Detailed report of the last merge
    merge_report: Option<MergeReport>,
}

impl ConfigLoader {
    /// Create a new ConfigLoader instance
    pub fn new() -> Self {
        Self {
            cached_config: None,
            config_source: None,
            merge_report: None,
        }
    }

    /// Load configuration with the following priority:
    /// 1. Custom path (if provided)
    /// 2. Project-level config
    /// 3. User-level config
    /// 4. Default configuration
    pub async fn load(&mut self, custom_path: Option<&str>) -> Result<Config> {
        // Reuse cached configuration when appropriate
        if let Some(ref cached) = self.cached_config {
            match custom_path {
                None => return Ok(cached.clone()),
                Some(path) => {
                    if let Some(source) = &self.config_source {
                        if source.source_type == ConfigSourceType::Custom {
                            if let Some(ref cached_path) = source.path {
                                if cached_path == Path::new(path) {
                                    return Ok(cached.clone());
                                }
                            }
                        }
                    }
                }
            }
        }

        let mut merged_value = Value::try_from(Config::default())?;
        let mut source = ConfigSource {
            path: None,
            source_type: ConfigSourceType::Default,
        };
        let mut layers: Vec<MergeLayer> = Vec::new();

        // Apply user-level configuration first so it can be overridden later
        if let Some(user_config_path) = self.get_user_config_path() {
            if user_config_path.exists() {
                let user_value = self.load_toml_value(&user_config_path)?;
                let before = merged_value.clone();
                self.merge_value(&mut merged_value, user_value);
                let (added, updated) = collect_diffs(&before, &merged_value);
                layers.push(MergeLayer {
                    source_type: ConfigSourceType::User,
                    path: Some(user_config_path.clone()),
                    added_keys: added,
                    updated_keys: updated,
                });
                source = ConfigSource {
                    path: Some(user_config_path),
                    source_type: ConfigSourceType::User,
                };
            }
        }

        // Apply project-level configuration next
        if let Ok(project_config_path) = self.get_project_config_path() {
            if project_config_path.exists() {
                let project_value = self.load_toml_value(&project_config_path)?;
                let before = merged_value.clone();
                self.merge_value(&mut merged_value, project_value);
                let (added, updated) = collect_diffs(&before, &merged_value);
                layers.push(MergeLayer {
                    source_type: ConfigSourceType::Project,
                    path: Some(project_config_path.clone()),
                    added_keys: added,
                    updated_keys: updated,
                });
                source = ConfigSource {
                    path: Some(project_config_path),
                    source_type: ConfigSourceType::Project,
                };
            }
        }

        // Apply custom configuration last (highest priority)
        if let Some(path) = custom_path {
            let custom_path_buf = PathBuf::from(path);
            if custom_path_buf.exists() {
                let custom_value = self.load_toml_value(&custom_path_buf)?;
                let before = merged_value.clone();
                self.merge_value(&mut merged_value, custom_value);
                let (added, updated) = collect_diffs(&before, &merged_value);
                layers.push(MergeLayer {
                    source_type: ConfigSourceType::Custom,
                    path: Some(custom_path_buf.clone()),
                    added_keys: added,
                    updated_keys: updated,
                });
                source = ConfigSource {
                    path: Some(custom_path_buf),
                    source_type: ConfigSourceType::Custom,
                };
            } else {
                return Err(anyhow!("Custom configuration file not found at {}", path));
            }
        }

        let config: Config = merged_value
            .try_into()
            .context("Failed to build configuration from merged values")?;

        // Cache the configuration
        self.cached_config = Some(config.clone());
        self.config_source = Some(source);
        self.merge_report = Some(MergeReport { layers });

        Ok(config)
    }

    /// Load configuration with project ID
    pub async fn load_with_project_id(&mut self, project_id: &str) -> Result<Config> {
        // Try to load project-specific config first
        let project_config_path = self.get_project_config_path_with_id(project_id);
        if project_config_path.exists() {
            let path_str = project_config_path
                .to_str()
                .ok_or_else(|| anyhow!("Project config path is not valid UTF-8"))?;
            return self.load(Some(path_str)).await;
        }

        // Fall back to regular load
        self.load(None).await
    }

    /// Create default configuration file using the provided options
    pub fn create_default_config(
        &self,
        options: CreateConfigOptions<'_>,
    ) -> Result<CreateConfigResult> {
        let target_path = if let Some(path) = options.target_path {
            path.to_path_buf()
        } else {
            std::env::current_dir()
                .with_context(|| "Failed to determine current working directory")?
                .join("config.toml")
        };

        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent)
                .with_context(|| format!("Failed to create directory: {}", parent.display()))?;
        }

        let template_path = self.get_template_path();
        let mut document = if template_path.exists() {
            match fs::read_to_string(&template_path) {
                Ok(content) => content
                    .parse::<DocumentMut>()
                    .unwrap_or_else(|_| default_config_document()),
                Err(_) => default_config_document(),
            }
        } else {
            default_config_document()
        };

        if let Some(theme) = options.theme {
            document["theme"] = toml_value(theme);
        }

        if let Some(cap) = options.capabilities {
            document["style"]["enable_colors"] = toml_value(cap.colors);
            document["style"]["enable_emoji"] = toml_value(cap.emoji);
            document["style"]["enable_nerd_font"] = toml_value(cap.nerd_font);
        }

        fs::write(&target_path, document.to_string())
            .with_context(|| format!("Failed to write config file: {}", target_path.display()))?;

        let copy_stats = if options.copy_components {
            if let Some(dir) = target_path.parent() {
                Some(self.copy_component_configs(dir, options.force)?)
            } else {
                None
            }
        } else {
            None
        };

        Ok(CreateConfigResult {
            path: target_path,
            copy_stats,
        })
    }

    /// Reset configuration to defaults
    pub async fn reset_to_defaults(&self, path: Option<&str>) -> Result<()> {
        let target_path = if let Some(p) = path {
            PathBuf::from(p)
        } else {
            self.get_user_config_path()
                .ok_or_else(|| anyhow::anyhow!("Cannot determine user config path"))?
        };

        let _ = self.create_default_config(CreateConfigOptions {
            target_path: Some(target_path.as_path()),
            ..Default::default()
        })?;

        Ok(())
    }

    /// Get configuration source information
    pub fn get_config_source(&self) -> Option<&ConfigSource> {
        self.config_source.as_ref()
    }

    /// Retrieve the latest merge report.
    pub fn merge_report(&self) -> Option<&MergeReport> {
        self.merge_report.as_ref()
    }

    /// Clear cached configuration
    pub fn clear_cache(&mut self) {
        self.cached_config = None;
        self.config_source = None;
        self.merge_report = None;
    }

    /// Return the path to the user-level configuration file
    pub fn user_config_path(&self) -> Option<PathBuf> {
        self.get_user_config_path()
    }

    /// 获取当前目录的项目级配置路径（`./statusline.config.toml`）
    pub fn project_config_path(&self) -> Result<PathBuf> {
        self.get_project_config_path()
    }

    /// Compute the project config path for a specific project directory
    pub fn project_config_path_for_path(&self, project_path: &str) -> PathBuf {
        let project_id = ProjectResolver::hash_global_path(project_path);
        self.get_project_config_path_with_id(&project_id)
    }

    /// Copy component configuration templates into the provided directory
    pub fn copy_component_configs(&self, target_dir: &Path, force: bool) -> Result<ComponentCopyStats> {
        let Some(template_dir) = self.find_component_template_dir() else {
            return Ok(ComponentCopyStats::default());
        };

        if !template_dir.exists() {
            return Ok(ComponentCopyStats::default());
        }

        let target_components_dir = target_dir.join("components");
        fs::create_dir_all(&target_components_dir).with_context(|| {
            format!(
                "Failed to create components directory: {}",
                target_components_dir.display()
            )
        })?;

        let mut stats = ComponentCopyStats::default();
        for entry in fs::read_dir(&template_dir)? {
            let entry = entry?;
            let path = entry.path();
            let file_name = match path.file_name().and_then(|n| n.to_str()) {
                Some(name) => name.to_string(),
                None => continue,
            };

            if !file_name.ends_with(".template.toml") {
                continue;
            }

            let target_name = file_name.replace(".template", "");
            let target_path = target_components_dir.join(&target_name);

            if target_path.exists() {
                if !force {
                    // Skip without prompting, just count as skipped
                    stats.skipped += 1;
                    continue;
                }
                // Force mode: overwrite the file
            }

            fs::copy(&path, &target_path).with_context(|| {
                format!(
                    "Failed to copy component template {} to {}",
                    path.display(),
                    target_path.display()
                )
            })?;
            stats.copied += 1;
        }

        Ok(stats)
    }

    /// Apply a theme to the current configuration file and persist it
    pub async fn apply_theme(&mut self, theme: &str) -> Result<PathBuf> {
        let mut config = self.load(None).await?;
        config.theme = theme.to_string();
        let path = self.write_config(&config, None)?;
        self.clear_cache();
        Ok(path)
    }

    /// Persist the provided configuration to disk (overriding cached path if provided)
    pub fn persist(&mut self, config: &Config, override_path: Option<&Path>) -> Result<PathBuf> {
        let path = self.write_config(config, override_path)?;
        self.clear_cache();
        Ok(path)
    }

    // Private helper methods

    fn load_toml_value<P: AsRef<Path>>(&self, path: P) -> Result<Value> {
        let path = path.as_ref();
        let content = fs::read_to_string(path)
            .with_context(|| format!("Failed to read config file: {:?}", path))?;

        let mut value: Value = content
            .parse::<Value>()
            .with_context(|| format!("Failed to parse TOML config: {:?}", path))?;

        Self::normalize_value(&mut value);

        Ok(value)
    }

    fn normalize_value(value: &mut Value) {
        match value {
            Value::Table(table) => {
                if let Some(storage_value) = table.get_mut("storage") {
                    if let Value::Table(storage_table) = storage_value {
                        if let Some(auto_value) = storage_table.remove("autoCleanupDays") {
                            if !storage_table.contains_key("sessionExpiryDays") {
                                storage_table.insert("sessionExpiryDays".to_string(), auto_value);
                            }
                        }
                    }
                }

                for (_, child) in table.iter_mut() {
                    Self::normalize_value(child);
                }
            }
            Value::Array(items) => {
                for item in items {
                    Self::normalize_value(item);
                }
            }
            _ => {}
        }
    }

    fn merge_value(&self, base: &mut Value, overlay: Value) {
        match (base, overlay) {
            (Value::Table(base_table), Value::Table(overlay_table)) => {
                for (key, overlay_value) in overlay_table {
                    match base_table.get_mut(&key) {
                        Some(base_value) => self.merge_value(base_value, overlay_value),
                        None => {
                            base_table.insert(key, overlay_value);
                        }
                    }
                }
            }
            (base_value, overlay_value) => {
                *base_value = overlay_value;
            }
        }
    }

    fn get_project_config_path(&self) -> Result<PathBuf> {
        let cwd = std::env::current_dir()?;
        let cwd_str = cwd
            .to_str()
            .ok_or_else(|| anyhow!("Current directory path is not valid UTF-8"))?;
        let project_id = ProjectResolver::hash_global_path(cwd_str);
        Ok(self.get_project_config_path_with_id(&project_id))
    }

    fn get_project_config_path_with_id(&self, project_id: &str) -> PathBuf {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        home.join(".claude")
            .join("projects")
            .join(project_id)
            .join("statusline-pro")
            .join("config.toml")
    }

    fn get_user_config_path(&self) -> Option<PathBuf> {
        dirs::home_dir().map(|home| {
            home.join(".claude")
                .join("statusline-pro")
                .join("config.toml")
        })
    }

    fn get_template_path(&self) -> PathBuf {
        // Try to find the template in the project directory
        let exe_path = std::env::current_exe().unwrap_or_else(|_| PathBuf::from("."));
        let exe_dir = exe_path.parent().unwrap_or_else(|| Path::new("."));

        // Look for template in various locations
        let possible_paths = vec![
            exe_dir.join("configs").join("config.template.toml"),
            PathBuf::from("configs").join("config.template.toml"),
            PathBuf::from("../configs").join("config.template.toml"),
        ];

        for path in possible_paths {
            if path.exists() {
                return path;
            }
        }

        // Default fallback
        PathBuf::from("configs").join("config.template.toml")
    }

    fn find_component_template_dir(&self) -> Option<PathBuf> {
        let exe_path = std::env::current_exe().unwrap_or_else(|_| PathBuf::from("."));
        let exe_dir = exe_path.parent().unwrap_or_else(|| Path::new("."));

        let candidates = [
            exe_dir.join("configs").join("components"),
            PathBuf::from("configs").join("components"),
            PathBuf::from("../configs").join("components"),
        ];

        for candidate in candidates {
            if candidate.exists() {
                return Some(candidate);
            }
        }

        None
    }

    fn resolve_target_path(&self, override_path: Option<&Path>) -> Result<PathBuf> {
        if let Some(path) = override_path {
            return Ok(path.to_path_buf());
        }

        if let Some(source) = &self.config_source {
            if let Some(path) = &source.path {
                return Ok(path.clone());
            }
        }

        self.get_user_config_path()
            .ok_or_else(|| anyhow!("Cannot determine configuration path"))
    }

    fn write_config(&self, config: &Config, override_path: Option<&Path>) -> Result<PathBuf> {
        let path = self.resolve_target_path(override_path)?;

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let toml_string = toml::to_string_pretty(config)?;
        fs::write(&path, toml_string)?;

        Ok(path)
    }
}

impl Default for ConfigLoader {
    fn default() -> Self {
        Self::new()
    }
}

fn default_config_document() -> DocumentMut {
    let default_toml = toml::to_string_pretty(&Config::default()).unwrap_or_else(|_| String::new());
    default_toml
        .parse::<DocumentMut>()
        .unwrap_or_else(|_| DocumentMut::new())
}

fn collect_diffs(before: &Value, after: &Value) -> (Vec<String>, Vec<String>) {
    let mut added = Vec::new();
    let mut updated = Vec::new();
    collect_diffs_impl(before, after, &mut Vec::new(), &mut added, &mut updated);
    (added, updated)
}

fn collect_diffs_impl(
    before: &Value,
    after: &Value,
    path: &mut Vec<String>,
    added: &mut Vec<String>,
    updated: &mut Vec<String>,
) {
    match after {
        Value::Table(after_table) => {
            let before_table = before.as_table();
            for (key, after_value) in after_table {
                path.push(key.clone());
                match before_table.and_then(|t| t.get(key)) {
                    Some(before_value) => {
                        if before_value == after_value {
                            // no change
                        } else if before_value.is_table() && after_value.is_table() {
                            collect_diffs_impl(before_value, after_value, path, added, updated);
                        } else {
                            updated.push(path.join("."));
                        }
                    }
                    None => added.push(path.join(".")),
                }
                path.pop();
            }
        }
        _ => {
            if before != after && !path.is_empty() {
                updated.push(path.join("."));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_load_default_config() {
        // Create a temporary directory for the test
        let temp_dir = tempdir().unwrap();
        let temp_path = temp_dir.path();

        // Set HOME to temp dir to avoid loading real user config
        env::set_var("HOME", temp_path);

        let mut loader = ConfigLoader::new();
        let config = loader.load(None).await.unwrap();

        // These should be the defaults from Config::default()
        assert_eq!(config.preset, Some("PMBTUS".to_string()));
        assert!(!config.debug);
    }

    #[tokio::test]
    async fn test_config_with_custom_file() {
        let temp_dir = tempdir().unwrap();
        let config_path = temp_dir.path().join("test_config.toml");

        // Create a test config file
        let test_config = r#"
            preset = "PMB"
            theme = "powerline"
            debug = true
        "#;
        std::fs::write(&config_path, test_config).unwrap();

        let mut loader = ConfigLoader::new();
        let config = loader
            .load(Some(config_path.to_str().unwrap()))
            .await
            .unwrap();

        assert_eq!(config.preset, Some("PMB".to_string()));
        assert_eq!(config.theme, "powerline");
        assert!(config.debug);

        // Check source type
        let source = loader.get_config_source().unwrap();
        assert_eq!(source.source_type, ConfigSourceType::Custom);
    }

    #[tokio::test]
    async fn test_clear_cache() {
        let mut loader = ConfigLoader::new();
        loader.load(None).await.unwrap();

        assert!(loader.cached_config.is_some());

        loader.clear_cache();

        assert!(loader.cached_config.is_none());
        assert!(loader.config_source.is_none());
    }
}
