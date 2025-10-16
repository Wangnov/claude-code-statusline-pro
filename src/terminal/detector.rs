//! Terminal capability detection
//!
//! Detects terminal capabilities including color support, emoji support,
//! and Nerd Font support.

use std::env;

use crate::components::TerminalCapabilities;
use crate::config::AutoDetect;

/// Terminal detector for capability detection
pub struct TerminalDetector;

impl TerminalDetector {
    /// Create a new terminal detector
    #[must_use] pub const fn new() -> Self {
        Self
    }

    /// Detect terminal capabilities
    #[must_use] pub fn detect(
        &self,
        enable_colors: &AutoDetect,
        enable_emoji: &AutoDetect,
        enable_nerd_font: &AutoDetect,
        force_nerd_font: bool,
        force_emoji: bool,
        force_text: bool,
    ) -> TerminalCapabilities {
        // Check if we should force text mode
        if force_text {
            return TerminalCapabilities {
                supports_colors: false,
                supports_emoji: false,
                supports_nerd_font: false,
            };
        }

        // Detect individual capabilities
        let supports_colors = if force_nerd_font || force_emoji {
            true // If we're forcing special fonts, assume color support
        } else {
            self.detect_color_support(enable_colors)
        };

        let supports_emoji = if force_emoji {
            true
        } else if force_nerd_font {
            false // Nerd Font takes precedence
        } else {
            self.detect_emoji_support(enable_emoji)
        };

        let supports_nerd_font = if force_nerd_font {
            true
        } else {
            self.detect_nerd_font_support(enable_nerd_font)
        };

        // Debug output to help troubleshoot detection issues
        if std::env::var("DEBUG").is_ok() {
            eprintln!("[调试] 终端能力检测结果:");
            eprintln!("  - supports_colors: {supports_colors}");
            eprintln!("  - supports_emoji: {supports_emoji}");
            eprintln!("  - supports_nerd_font: {supports_nerd_font}");
            eprintln!("  - TERM_PROGRAM: {:?}", std::env::var("TERM_PROGRAM"));
            eprintln!("  - TERM: {:?}", std::env::var("TERM"));
        }

        TerminalCapabilities {
            supports_colors,
            supports_emoji,
            supports_nerd_font,
        }
    }

    /// Detect color support
    fn detect_color_support(&self, enable_colors: &AutoDetect) -> bool {
        match enable_colors {
            AutoDetect::Bool(false) => false,
            AutoDetect::Bool(true) => true,
            AutoDetect::Auto(_) => {
                // Auto-detect based on environment
                self.check_color_env_vars()
            }
        }
    }

    /// Detect emoji support
    fn detect_emoji_support(&self, enable_emoji: &AutoDetect) -> bool {
        match enable_emoji {
            AutoDetect::Bool(false) => false,
            AutoDetect::Bool(true) => true,
            AutoDetect::Auto(_) => {
                // Auto-detect based on terminal type
                self.check_emoji_capable_terminal()
            }
        }
    }

    /// Detect Nerd Font support
    fn detect_nerd_font_support(&self, enable_nerd_font: &AutoDetect) -> bool {
        match enable_nerd_font {
            AutoDetect::Bool(false) => false,
            AutoDetect::Bool(true) => true,
            AutoDetect::Auto(_) => {
                // Auto-detect based on font environment
                self.check_nerd_font_env()
            }
        }
    }

    /// Check environment variables for color support
    fn check_color_env_vars(&self) -> bool {
        // Check COLORTERM for truecolor support
        if let Ok(colorterm) = env::var("COLORTERM") {
            if colorterm == "truecolor" || colorterm == "24bit" {
                return true;
            }
        }

        // Check TERM for color support
        if let Ok(term) = env::var("TERM") {
            if term.contains("256color")
                || term.contains("color")
                || term == "xterm"
                || term == "screen"
                || term == "tmux"
                || term == "rxvt"
            {
                return true;
            }
        }

        // Check NO_COLOR env var (https://no-color.org/)
        if env::var("NO_COLOR").is_ok() {
            return false;
        }

        // Check if running in CI/CD environments
        if env::var("CI").is_ok()
            || env::var("GITHUB_ACTIONS").is_ok()
            || env::var("GITLAB_CI").is_ok()
            || env::var("BUILDKITE").is_ok()
            || env::var("CIRCLECI").is_ok()
        {
            return true; // Most CI environments support colors
        }

        // Default to true on Unix-like systems, false on others
        #[cfg(unix)]
        {
            true
        }
        #[cfg(not(unix))]
        {
            // On Windows, check if we're in Windows Terminal or ConEmu
            env::var("WT_SESSION").is_ok() || env::var("ConEmuPID").is_ok()
        }
    }

    /// Check if terminal supports emoji
    fn check_emoji_capable_terminal(&self) -> bool {
        // Check terminal type
        if let Ok(term_program) = env::var("TERM_PROGRAM") {
            match term_program.as_str() {
                "iTerm.app" | "Terminal.app" | "Hyper" | "vscode" => return true,
                "tmux" => {
                    // tmux usually preserves emoji support from parent terminal
                    return true;
                }
                _ => {}
            }
        }

        // Check for Windows Terminal
        if env::var("WT_SESSION").is_ok() {
            return true;
        }

        // Check for modern terminal emulators
        if let Ok(term) = env::var("TERM") {
            if term.contains("kitty")
                || term.contains("alacritty")
                || term.contains("wezterm")
                || term.contains("foot")
            {
                return true;
            }
        }

        // Check for GNOME Terminal and Konsole
        if env::var("GNOME_TERMINAL_SERVICE").is_ok() || env::var("KONSOLE_VERSION").is_ok() {
            return true;
        }

        // Check locale for UTF-8 support (necessary for emoji)
        if let Ok(lang) = env::var("LANG") {
            if lang.to_uppercase().contains("UTF-8") || lang.to_uppercase().contains("UTF8") {
                // If we have UTF-8 locale, assume basic emoji support
                return true;
            }
        }

        // Default to false for safety
        false
    }

    /// Check if Nerd Font is likely installed
    fn check_nerd_font_env(&self) -> bool {
        // Check for explicit Nerd Font environment variable
        if env::var("NERD_FONT").is_ok() || env::var("NERD_FONTS").is_ok() {
            return true;
        }

        // Check terminal font settings (terminal-specific)
        // This is a heuristic and may not be 100% accurate
        if let Ok(term_font) = env::var("TERMINAL_FONT") {
            if term_font.to_lowercase().contains("nerd")
                || term_font.contains("NF")
                || term_font.contains("Powerline")
            {
                return true;
            }
        }

        // Check for popular terminal emulators that commonly support Nerd Fonts
        if let Ok(term_program) = env::var("TERM_PROGRAM") {
            match term_program.as_str() {
                "iTerm.app" => {
                    // iTerm2 users often have Nerd Fonts installed
                    // Optimistically assume support for better UX
                    // Users can disable with config if needed
                    return true;
                }
                "vscode" => {
                    // VSCode terminals may have Nerd Fonts, check for indicators
                    // Priority: Nerd Font > Emoji for better visual consistency
                    if env::var("VSCODE_NERD_FONT").is_ok() {
                        return true;
                    }
                    // Check if LC_TERMINAL explicitly set (might indicate font config)
                    if let Ok(lc_term) = env::var("LC_TERMINAL") {
                        if lc_term.to_lowercase().contains("nerd") {
                            return true;
                        }
                    }
                    // Default to false for VSCode, let emoji take precedence
                    return false;
                }
                _ => {}
            }
        }

        // Check for modern terminal emulators that bundle Nerd Fonts
        if let Ok(term) = env::var("TERM") {
            if term.contains("kitty") || term.contains("wezterm") {
                // Kitty and WezTerm users typically have Nerd Fonts
                return true;
            }
        }

        // Default to false - users can force it if needed
        false
    }
}

impl Default for TerminalDetector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_force_text_mode() {
        let detector = TerminalDetector::new();
        let caps = detector.detect(
            &AutoDetect::Bool(true),
            &AutoDetect::Bool(true),
            &AutoDetect::Bool(true),
            false,
            false,
            true, // force_text
        );

        assert!(!caps.supports_colors);
        assert!(!caps.supports_emoji);
        assert!(!caps.supports_nerd_font);
    }

    #[test]
    fn test_force_nerd_font() {
        let detector = TerminalDetector::new();
        let caps = detector.detect(
            &AutoDetect::Auto("auto".to_string()),
            &AutoDetect::Auto("auto".to_string()),
            &AutoDetect::Auto("auto".to_string()),
            true, // force_nerd_font
            false,
            false,
        );

        assert!(caps.supports_nerd_font);
        assert!(caps.supports_colors); // Should be enabled with Nerd Font
    }

    #[test]
    fn test_force_emoji() {
        let detector = TerminalDetector::new();
        let caps = detector.detect(
            &AutoDetect::Auto("auto".to_string()),
            &AutoDetect::Auto("auto".to_string()),
            &AutoDetect::Auto("auto".to_string()),
            false,
            true, // force_emoji
            false,
        );

        assert!(caps.supports_emoji);
        assert!(caps.supports_colors); // Should be enabled with emoji
    }

    #[test]
    fn test_explicit_disable() {
        let detector = TerminalDetector::new();
        let caps = detector.detect(
            &AutoDetect::Bool(false),
            &AutoDetect::Bool(false),
            &AutoDetect::Bool(false),
            false,
            false,
            false,
        );

        assert!(!caps.supports_colors);
        assert!(!caps.supports_emoji);
        assert!(!caps.supports_nerd_font);
    }

    #[test]
    fn test_explicit_enable() {
        let detector = TerminalDetector::new();
        let caps = detector.detect(
            &AutoDetect::Bool(true),
            &AutoDetect::Bool(true),
            &AutoDetect::Bool(true),
            false,
            false,
            false,
        );

        assert!(caps.supports_colors);
        assert!(caps.supports_emoji);
        assert!(caps.supports_nerd_font);
    }
}
