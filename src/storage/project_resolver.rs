//! Project Resolver - 统一的项目路径解析器
//!
//! 负责所有项目 ID 的获取和路径转换，确保与 TypeScript 版本的一致性。
//!
//! 设计原则：
//! 1. 单一真相源：所有路径哈希逻辑集中在此处
//! 2. 智能优先级：优先使用 stdin 数据，其次自动生成
//! 3. 全局一致性：单例模式确保整个程序生命周期内项目 ID 一致

use lazy_static::lazy_static;
use regex::Regex;
use std::path::Path;
use std::sync::{Arc, Mutex, OnceLock};

const UNC_PREFIXES: [&str; 2] = ["\\\\\\\\?\\", "\\\\?\\"];

lazy_static! {
    static ref INSTANCE: Arc<Mutex<ProjectResolver>> = Arc::new(Mutex::new(ProjectResolver::new()));
}

/// Project path resolver using singleton pattern for global consistency
#[derive(Debug)]
pub struct ProjectResolver {
    cached_project_id: Option<String>,
}

impl ProjectResolver {
    /// Private constructor
    const fn new() -> Self {
        Self {
            cached_project_id: None,
        }
    }

    /// Get singleton instance
    #[must_use]
    pub fn instance() -> Arc<Mutex<Self>> {
        INSTANCE.clone()
    }

    /// Set project ID from transcript path (highest priority)
    ///
    /// Called when receiving transcriptPath from stdin
    /// Example: /Users/xxx/.claude/projects/C--Users-xxx-project/xxx.jsonl
    pub fn set_project_id_from_transcript(&mut self, transcript_path: Option<&str>) {
        if let Some(path) = transcript_path {
            if let Some(project_id) = Self::extract_project_id_from_transcript(path) {
                self.cached_project_id = Some(project_id);

                // Debug log for development
                if std::env::var("DEBUG").is_ok() {
                    eprintln!(
                        "[ProjectResolver] Set project ID from transcript: {:?}",
                        self.cached_project_id
                    );
                }
            }
        }
    }

    /// Get project ID with intelligent fallback
    ///
    /// Priority:
    /// 1. Use cached project ID (from stdin)
    /// 2. Generate from provided path or current directory
    #[must_use]
    pub fn get_project_id(&self, fallback_path: Option<&str>) -> String {
        // Priority 1: Use cached project ID
        if let Some(ref cached_id) = self.cached_project_id {
            return cached_id.clone();
        }

        // Priority 2: Generate from path or current directory
        let path_to_hash = fallback_path.unwrap_or(".");
        Self::hash_project_path(path_to_hash)
    }

    /// Directly hash specified path (no cache)
    ///
    /// Used for temporary project ID generation, like config -i command
    #[must_use]
    pub fn hash_path(project_path: &str) -> String {
        Self::hash_project_path(project_path)
    }

    /// Directly set the cached project ID (primarily for runtime coordination)
    pub fn set_project_id(&mut self, project_id: Option<&str>) {
        self.cached_project_id = project_id.map(std::string::ToString::to_string);

        if std::env::var("DEBUG").is_ok() {
            eprintln!(
                "[ProjectResolver] Set project ID explicitly: {:?}",
                self.cached_project_id
            );
        }
    }

    /// Extract project ID from transcript path using regex
    fn extract_project_id_from_transcript(transcript_path: &str) -> Option<String> {
        Self::projects_regex()
            .and_then(|regex| regex.captures(transcript_path))
            .and_then(|caps| caps.get(1))
            .map(|m| m.as_str().to_string())
    }

    /// Unified path hashing method (Windows compatible)
    ///
    /// This is the single source of truth for all path conversions
    ///
    /// macOS/Unix: /Users/name/project -> -Users-name-project
    /// Windows: C:\Users\name\project -> C--Users-name-project
    fn hash_project_path(project_path: &str) -> String {
        assert!(!project_path.is_empty(), "Project path cannot be empty");

        let path = Path::new(project_path);
        let mut result = path
            .canonicalize()
            .unwrap_or_else(|_| path.to_path_buf())
            .to_string_lossy()
            .to_string();

        let mut unc_stripped = false;
        for prefix in UNC_PREFIXES {
            if result.starts_with(prefix) {
                result = result[prefix.len()..].to_string();
                unc_stripped = true;
                break;
            }
        }

        if unc_stripped {
            result = result.trim_start_matches('\\').to_string();
        }

        let mut has_drive_prefix = false;

        if let Some(regex) = Self::windows_drive_backslash_regex() {
            if regex.is_match(&result) {
                has_drive_prefix = true;
                result = regex
                    .replace(&result, |caps: &regex::Captures| format!("{}--", &caps[1]))
                    .to_string();
                result = result.replace('\\', "-");
            }
        }

        if !has_drive_prefix {
            if let Some(regex) = Self::windows_drive_slash_regex() {
                if regex.is_match(&result) {
                    has_drive_prefix = true;
                    result = regex
                        .replace(&result, |caps: &regex::Captures| format!("{}--", &caps[1]))
                        .to_string();
                    result = result.replace('/', "-");
                }
            }
        }

        if !has_drive_prefix {
            result = result.replace(['\\', '/', ':'], "-");
        }

        while result.ends_with('-') {
            result.pop();
        }

        if has_drive_prefix && result.len() >= 3 {
            let (prefix, rest) = result.split_at(3);
            let mut normalized_rest = Self::collapse_dashes(rest);
            while normalized_rest.starts_with('-') {
                normalized_rest.remove(0);
            }
            let combined = if normalized_rest.is_empty() {
                prefix.to_string()
            } else {
                format!("{prefix}{normalized_rest}")
            };
            combined.trim_end_matches('-').to_string()
        } else {
            Self::collapse_dashes(&result)
        }
    }

    /// Clear cached project ID (mainly for testing)
    pub fn clear_cache(&mut self) {
        self.cached_project_id = None;
    }

    /// Get current cached project ID (for debugging)
    #[must_use]
    pub const fn get_cached_project_id(&self) -> Option<&String> {
        self.cached_project_id.as_ref()
    }
}

/// Convenience functions for global access
impl ProjectResolver {
    /// Static method to get project ID
    #[must_use]
    pub fn get_global_project_id(fallback_path: Option<&str>) -> String {
        Self::with_resolver(|resolver| resolver.get_project_id(fallback_path))
    }

    /// Static method to set project ID from transcript
    pub fn set_global_project_id_from_transcript(transcript_path: Option<&str>) {
        Self::with_resolver(|resolver| resolver.set_project_id_from_transcript(transcript_path));
    }

    /// Static method to set project ID directly
    pub fn set_global_project_id(project_id: Option<&str>) {
        Self::with_resolver(|resolver| resolver.set_project_id(project_id));
    }

    /// Static method to hash path
    #[must_use]
    pub fn hash_global_path(project_path: &str) -> String {
        Self::hash_project_path(project_path)
    }

    fn with_resolver<R>(mut f: impl FnMut(&mut Self) -> R) -> R {
        let resolver = Self::instance();
        let mut guard = match resolver.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        f(&mut guard)
    }

    fn projects_regex() -> Option<&'static Regex> {
        static PROJECTS_REGEX: OnceLock<Result<Regex, regex::Error>> = OnceLock::new();
        PROJECTS_REGEX
            .get_or_init(|| Regex::new(r"[/\\]projects[/\\]([^/\\]+)[/\\]"))
            .as_ref()
            .ok()
    }

    fn windows_drive_backslash_regex() -> Option<&'static Regex> {
        static WINDOWS_DRIVE_BACKSLASH: OnceLock<Result<Regex, regex::Error>> = OnceLock::new();
        WINDOWS_DRIVE_BACKSLASH
            .get_or_init(|| Regex::new(r"^([A-Za-z]):\\"))
            .as_ref()
            .ok()
    }

    fn windows_drive_slash_regex() -> Option<&'static Regex> {
        static WINDOWS_DRIVE_SLASH: OnceLock<Result<Regex, regex::Error>> = OnceLock::new();
        WINDOWS_DRIVE_SLASH
            .get_or_init(|| Regex::new(r"^([A-Za-z]):/"))
            .as_ref()
            .ok()
    }

    fn multiple_dashes_regex() -> Option<&'static Regex> {
        static MULTIPLE_DASHES: OnceLock<Result<Regex, regex::Error>> = OnceLock::new();
        MULTIPLE_DASHES
            .get_or_init(|| Regex::new(r"-+"))
            .as_ref()
            .ok()
    }

    fn collapse_dashes(input: &str) -> String {
        Self::multiple_dashes_regex().map_or_else(
            || {
                let mut collapsed = String::with_capacity(input.len());
                let mut previous_was_dash = false;

                for ch in input.chars() {
                    if ch == '-' {
                        if !previous_was_dash {
                            collapsed.push('-');
                            previous_was_dash = true;
                        }
                    } else {
                        previous_was_dash = false;
                        collapsed.push(ch);
                    }
                }

                collapsed
            },
            |regex| regex.replace_all(input, "-").to_string(),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hashes_unix_path_with_normalized_dashes() {
        let hashed = ProjectResolver::hash_project_path("/Users/example//project");
        assert_eq!(hashed, "-Users-example-project");
    }

    #[test]
    fn preserves_drive_prefix_for_windows_paths() {
        let hashed = ProjectResolver::hash_project_path(r"E:\\Users\\example\\project");
        assert!(hashed.starts_with("E--"), "hashed={hashed}");
        assert!(!hashed.starts_with("E---"), "hashed={hashed}");
    }

    #[test]
    fn strips_unc_prefix_before_hashing() {
        let hashed = ProjectResolver::hash_project_path(r"\\\\?\\C:\\Users\\example\\project");
        assert!(hashed.starts_with("C--"), "hashed={hashed}");
    }
}
