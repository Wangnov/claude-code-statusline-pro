//! Theme rendering system
//!
//! Provides different visual themes for the statusline.

use anyhow::Result;
use crossterm::style::{Color, Stylize};

use crate::components::{ComponentOutput, RenderContext};

pub mod capsule;
pub mod classic;
pub mod powerline;

pub use capsule::CapsuleThemeRenderer;
pub use classic::ClassicThemeRenderer;
pub use powerline::PowerlineThemeRenderer;

/// Apply ANSI colors to a segment if supported
pub(crate) fn colorize_segment(
    segment: &str,
    color_name: Option<&str>,
    supports_colors: bool,
) -> String {
    if !supports_colors {
        return segment.to_string();
    }

    match color_name.and_then(parse_color) {
        Some(color) => segment.with(color).to_string(),
        None => segment.to_string(),
    }
}

pub(crate) const ANSI_RESET: &str = "\x1b[0m";

pub(crate) fn ansi_fg(color: &str) -> Option<String> {
    resolve_color(color).map(|(r, g, b)| format!("\x1b[38;2;{r};{g};{b}m"))
}

pub(crate) fn ansi_bg(color: &str) -> Option<String> {
    resolve_color(color).map(|(r, g, b)| format!("\x1b[48;2;{r};{g};{b}m"))
}

pub(crate) fn reapply_background(content: &str, bg_seq: &str) -> String {
    if !content.contains(ANSI_RESET) {
        return content.to_string();
    }

    let mut processed = content.replace(ANSI_RESET, &(String::from(ANSI_RESET) + bg_seq));
    if !processed.starts_with(bg_seq) {
        processed = format!("{bg_seq}{processed}");
    }
    if !processed.ends_with(bg_seq) {
        processed = format!("{processed}{bg_seq}");
    }
    processed
}

fn resolve_color(name: &str) -> Option<(u8, u8, u8)> {
    let normalized = name.trim().to_lowercase();
    if normalized.is_empty() {
        return None;
    }

    if normalized == "transparent" || normalized == "bg_default" || normalized == "default" {
        return None;
    }

    if let Some(hex) = normalized.strip_prefix('#').or_else(|| {
        if normalized.len() == 6 && normalized.chars().all(|c| c.is_ascii_hexdigit()) {
            Some(normalized.as_str())
        } else {
            None
        }
    }) {
        if hex.len() == 6 {
            if let (Ok(r), Ok(g), Ok(b)) = (
                u8::from_str_radix(&hex[0..2], 16),
                u8::from_str_radix(&hex[2..4], 16),
                u8::from_str_radix(&hex[4..6], 16),
            ) {
                return Some((r, g, b));
            }
        }
    }

    fn lighten(color: (u8, u8, u8), amount: f32) -> (u8, u8, u8) {
        let (r, g, b) = color;
        let lerp = |component: u8| -> u8 {
            let comp = (255.0 - f32::from(component)).mul_add(amount, f32::from(component));
            comp.round().clamp(0.0, 255.0) as u8
        };
        (lerp(r), lerp(g), lerp(b))
    }

    let nord = match normalized.as_str() {
        "black" => (46, 52, 64),
        "gray" | "grey" => (120, 128, 146),
        "white" => (236, 239, 244),
        "red" => (191, 97, 106),
        "green" => (163, 190, 140),
        "yellow" => (235, 203, 139),
        "blue" => (129, 161, 193),
        "magenta" | "purple" => (180, 142, 173),
        "cyan" => (136, 192, 208),
        "orange" => (208, 135, 112),
        "pink" => (211, 157, 197),
        "bright_black" => (76, 86, 106),
        "bright_red" => lighten((191, 97, 106), 0.18),
        "bright_green" => lighten((163, 190, 140), 0.18),
        "bright_yellow" => lighten((235, 203, 139), 0.12),
        "bright_blue" => lighten((129, 161, 193), 0.18),
        "bright_magenta" | "bright_purple" => lighten((180, 142, 173), 0.2),
        "bright_cyan" => lighten((136, 192, 208), 0.18),
        "bright_white" => (255, 255, 255),
        "bright_orange" => lighten((208, 135, 112), 0.2),
        "bright_pink" => lighten((211, 157, 197), 0.2),
        _ => return None,
    };

    Some(nord)
}

fn parse_color(name: &str) -> Option<Color> {
    match name.trim().to_lowercase().as_str() {
        "black" => Some(Color::Black),
        "red" => Some(Color::Red),
        "green" => Some(Color::Green),
        "yellow" => Some(Color::Yellow),
        "blue" => Some(Color::Blue),
        "magenta" | "purple" => Some(Color::Magenta),
        "cyan" => Some(Color::Cyan),
        "white" => Some(Color::White),
        "gray" | "grey" => Some(Color::Grey),
        "orange" => Some(Color::Yellow),
        "pink" => Some(Color::Magenta),
        "bright_black" => Some(Color::DarkGrey),
        "bright_red" => Some(Color::DarkRed),
        "bright_green" => Some(Color::DarkGreen),
        "bright_yellow" => Some(Color::DarkYellow),
        "bright_blue" => Some(Color::DarkBlue),
        "bright_magenta" | "bright_purple" => Some(Color::DarkMagenta),
        "bright_cyan" => Some(Color::DarkCyan),
        "bright_white" => Some(Color::White),
        "bright_orange" => Some(Color::Yellow),
        "bright_pink" => Some(Color::Magenta),
        _ => None,
    }
}

/// Theme type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Theme {
    Classic,
    Powerline,
    Capsule,
}

impl Theme {
    /// Parse theme from string
    #[must_use] pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "powerline" => Self::Powerline,
            "capsule" => Self::Capsule,
            _ => Self::Classic, // Default to classic
        }
    }
}

/// Theme renderer trait
pub trait ThemeRenderer: Send + Sync {
    /// Render components with the theme
    fn render(
        &self,
        components: &[ComponentOutput],
        colors: &[String],
        context: &RenderContext,
    ) -> Result<String>;

    /// Get theme name
    fn name(&self) -> &str;
}

/// Create a theme renderer based on the theme name
#[must_use] pub fn create_theme_renderer(theme: &str) -> Box<dyn ThemeRenderer> {
    match Theme::from_str(theme) {
        Theme::Classic => Box::new(ClassicThemeRenderer::new()),
        Theme::Powerline => Box::new(PowerlineThemeRenderer::new()),
        Theme::Capsule => Box::new(CapsuleThemeRenderer::new()),
    }
}
