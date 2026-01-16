//! Theme rendering system
//!
//! Provides different visual themes for the statusline.

use anyhow::Result;
use crossterm::style::{Color, Stylize};

use crate::components::{ColorSupport, ComponentOutput, RenderContext};

pub mod capsule;
pub mod classic;
pub mod powerline;

pub use capsule::CapsuleThemeRenderer;
pub use classic::ClassicThemeRenderer;
pub use powerline::PowerlineThemeRenderer;

fn clamp_component(value: f32) -> u8 {
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    {
        value.clamp(0.0, 255.0).round() as u8
    }
}

fn lighten(color: (u8, u8, u8), amount: f32) -> (u8, u8, u8) {
    let (r, g, b) = color;
    let lerp = |component: u8| -> u8 {
        let comp = (255.0 - f32::from(component)).mul_add(amount, f32::from(component));
        clamp_component(comp)
    };
    (lerp(r), lerp(g), lerp(b))
}

/// Apply ANSI colors to a segment if supported
pub(crate) fn colorize_segment(
    segment: &str,
    color_name: Option<&str>,
    supports_colors: bool,
) -> String {
    if !supports_colors {
        return segment.to_string();
    }

    color_name.and_then(parse_color).map_or_else(
        || segment.to_string(),
        |color| segment.with(color).to_string(),
    )
}

pub(crate) const ANSI_RESET: &str = "\x1b[0m";

/// Generate foreground ANSI escape sequence based on color support level
pub(crate) fn ansi_fg_with_support(color: &str, color_support: ColorSupport) -> Option<String> {
    let rgb = resolve_color(color)?;
    Some(format_fg_color(rgb, color_support))
}

/// Generate background ANSI escape sequence based on color support level
pub(crate) fn ansi_bg_with_support(color: &str, color_support: ColorSupport) -> Option<String> {
    let rgb = resolve_color(color)?;
    Some(format_bg_color(rgb, color_support))
}

/// Legacy function - assumes `TrueColor` support
pub(crate) fn ansi_fg(color: &str) -> Option<String> {
    ansi_fg_with_support(color, ColorSupport::TrueColor)
}

/// Legacy function - assumes `TrueColor` support
pub(crate) fn ansi_bg(color: &str) -> Option<String> {
    ansi_bg_with_support(color, ColorSupport::TrueColor)
}

/// Format foreground color based on support level
fn format_fg_color(rgb: (u8, u8, u8), color_support: ColorSupport) -> String {
    let (r, g, b) = rgb;
    match color_support {
        ColorSupport::None => String::new(),
        ColorSupport::Basic16 => {
            let ansi = rgb_to_ansi16(r, g, b);
            format!("\x1b[{ansi}m")
        }
        ColorSupport::Extended256 => {
            let code = rgb_to_ansi256(r, g, b);
            format!("\x1b[38;5;{code}m")
        }
        ColorSupport::TrueColor => {
            format!("\x1b[38;2;{r};{g};{b}m")
        }
    }
}

/// Format background color based on support level
fn format_bg_color(rgb: (u8, u8, u8), color_support: ColorSupport) -> String {
    let (r, g, b) = rgb;
    match color_support {
        ColorSupport::None => String::new(),
        ColorSupport::Basic16 => {
            let ansi = rgb_to_ansi16(r, g, b);
            // Convert foreground code to background code (add 10)
            let bg_code = ansi + 10;
            format!("\x1b[{bg_code}m")
        }
        ColorSupport::Extended256 => {
            let code = rgb_to_ansi256(r, g, b);
            format!("\x1b[48;5;{code}m")
        }
        ColorSupport::TrueColor => {
            format!("\x1b[48;2;{r};{g};{b}m")
        }
    }
}

/// Convert RGB to nearest ANSI 256 color code
fn rgb_to_ansi256(r: u8, g: u8, b: u8) -> u8 {
    // Check if it's a grayscale color
    if r == g && g == b {
        if r < 8 {
            return 16; // Black
        }
        if r > 248 {
            return 231; // White
        }
        // Grayscale ramp: 232-255 (24 shades)
        #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
        return ((f32::from(r) - 8.0) / 247.0 * 24.0).round() as u8 + 232;
    }

    // Convert to 6x6x6 color cube (16-231)
    let to_cube = |v: u8| -> u8 {
        if v < 48 {
            0
        } else if v < 115 {
            1
        } else {
            #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
            {
                ((f32::from(v) - 35.0) / 40.0).min(5.0) as u8
            }
        }
    };

    let ri = to_cube(r);
    let gi = to_cube(g);
    let bi = to_cube(b);

    16 + 36 * ri + 6 * gi + bi
}

/// Convert RGB to nearest ANSI 16 color code (foreground)
fn rgb_to_ansi16(r: u8, g: u8, b: u8) -> u8 {
    // Calculate perceived brightness
    let brightness =
        f32::from(r).mul_add(0.299, f32::from(g).mul_add(0.587, f32::from(b) * 0.114)) / 255.0;
    let is_bright = brightness > 0.5;

    // Find the dominant color(s)
    let max_val = r.max(g).max(b);
    let min_val = r.min(g).min(b);
    let saturation = if max_val == 0 {
        0.0
    } else {
        f32::from(max_val - min_val) / f32::from(max_val)
    };

    // Low saturation = grayscale
    if saturation < 0.2 {
        return if brightness < 0.25 {
            30 // Black
        } else if brightness < 0.75 {
            if is_bright {
                37
            } else {
                90
            } // Gray
        } else {
            97 // White (bright)
        };
    }

    // Determine base color from RGB ratios
    let base = if r >= g && r >= b {
        if g > b && g > r / 2 {
            33 // Yellow (red + green)
        } else if b > g && b > r / 2 {
            35 // Magenta (red + blue)
        } else {
            31 // Red
        }
    } else if g >= r && g >= b {
        if b > r && b > g / 2 {
            36 // Cyan (green + blue)
        } else {
            32 // Green
        }
    } else {
        // Blue is dominant
        if r > g && r > b / 2 {
            35 // Magenta
        } else if g > r && g > b / 2 {
            36 // Cyan
        } else {
            34 // Blue
        }
    };

    // Add 60 for bright variant
    if is_bright {
        base + 60
    } else {
        base
    }
}

/// Reapply both background and foreground colors after `ANSI_RESET` sequences
pub(crate) fn reapply_colors(content: &str, bg_seq: &str, fg_seq: &str) -> String {
    if !content.contains(ANSI_RESET) {
        return content.to_string();
    }

    let color_seq = format!("{bg_seq}{fg_seq}");
    let mut processed = content.replace(ANSI_RESET, &(String::from(ANSI_RESET) + &color_seq));
    if !processed.starts_with(&color_seq) {
        processed = format!("{color_seq}{processed}");
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
        "yellow" | "orange" | "bright_orange" => Some(Color::Yellow),
        "blue" => Some(Color::Blue),
        "magenta" | "purple" | "pink" | "bright_pink" => Some(Color::Magenta),
        "cyan" => Some(Color::Cyan),
        "white" | "bright_white" => Some(Color::White),
        "gray" | "grey" => Some(Color::Grey),
        "bright_black" => Some(Color::DarkGrey),
        "bright_red" => Some(Color::DarkRed),
        "bright_green" => Some(Color::DarkGreen),
        "bright_yellow" => Some(Color::DarkYellow),
        "bright_blue" => Some(Color::DarkBlue),
        "bright_magenta" | "bright_purple" => Some(Color::DarkMagenta),
        "bright_cyan" => Some(Color::DarkCyan),
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
    /// Parse theme from string, returning `Classic` if input is unknown.
    #[must_use]
    pub fn from_name(value: &str) -> Self {
        value.parse().unwrap_or(Self::Classic)
    }
}

impl std::str::FromStr for Theme {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.trim().to_lowercase().as_str() {
            "powerline" => Ok(Self::Powerline),
            "capsule" => Ok(Self::Capsule),
            "classic" | "" => Ok(Self::Classic),
            _ => Err(()),
        }
    }
}

/// Theme renderer trait
pub trait ThemeRenderer: Send + Sync {
    /// Render components with the theme
    ///
    /// # Errors
    ///
    /// Returns an error when the renderer fails to format the statusline.
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
#[must_use]
pub fn create_theme_renderer(theme: &str) -> Box<dyn ThemeRenderer> {
    match Theme::from_name(theme) {
        Theme::Classic => Box::new(ClassicThemeRenderer::new()),
        Theme::Powerline => Box::new(PowerlineThemeRenderer::new()),
        Theme::Capsule => Box::new(CapsuleThemeRenderer::new()),
    }
}
