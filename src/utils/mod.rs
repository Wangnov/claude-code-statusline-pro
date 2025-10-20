//! 实用工具模块
//!
//! 当前仅包含跨平台 home 目录解析辅助函数。

use std::env;
use std::path::PathBuf;

/// 获取用户主目录，优先尊重 `HOME` 环境变量。
///
/// 在 Windows Runner 上，GitHub Actions 会为子进程注入 `HOME`，但
/// [`dirs::home_dir`] 默认忽略该变量，导致 CLI 测试无法将配置写入预期路径。
/// 该辅助函数通过显式检查相关环境变量，保持与测试环境及类 Unix 行为的一致性。
#[must_use]
pub fn home_dir() -> Option<PathBuf> {
    if let Some(home) = env::var_os("HOME") {
        if !home.is_empty() {
            return Some(PathBuf::from(home));
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Some(profile) = env::var_os("USERPROFILE") {
            if !profile.is_empty() {
                return Some(PathBuf::from(profile));
            }
        }

        let drive = env::var_os("HOMEDRIVE");
        let path = env::var_os("HOMEPATH");
        if let (Some(drive), Some(path)) = (drive, path) {
            if !drive.is_empty() && !path.is_empty() {
                let mut combined = PathBuf::from(drive);
                combined.push(path);
                return Some(combined);
            }
        }
    }

    dirs::home_dir()
}

#[cfg(test)]
mod tests {
    use super::*;
    use anyhow::{anyhow, Result};
    use std::ffi::OsString;
    use tempfile::tempdir;

    #[test]
    fn respects_home_env_when_present() -> Result<()> {
        let dir = tempdir()?;
        let original = env::var_os("HOME");
        env::set_var("HOME", dir.path());

        let detected = home_dir().ok_or_else(|| anyhow!("home dir unavailable"))?;
        assert_eq!(detected, dir.path());

        match original {
            Some(val) => env::set_var("HOME", val),
            None => env::remove_var("HOME"),
        }

        Ok(())
    }

    #[test]
    fn falls_back_to_dirs_home_dir() {
        let original_home = env::var_os("HOME");
        let original_profile = env::var_os("USERPROFILE");
        let original_drive = env::var_os("HOMEDRIVE");
        let original_path = env::var_os("HOMEPATH");

        env::remove_var("HOME");
        env::remove_var("USERPROFILE");
        env::remove_var("HOMEDRIVE");
        env::remove_var("HOMEPATH");

        let detected = home_dir();
        assert_eq!(detected, dirs::home_dir());

        restore_env("HOME", original_home);
        restore_env("USERPROFILE", original_profile);
        restore_env("HOMEDRIVE", original_drive);
        restore_env("HOMEPATH", original_path);
    }

    fn restore_env(key: &str, value: Option<OsString>) {
        if let Some(val) = value {
            env::set_var(key, val);
        } else {
            env::remove_var(key);
        }
    }
}
