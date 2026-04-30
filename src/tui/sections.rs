//! 配置段与字段元数据
//!
//! v2 扩展到 11 个 Tab:基础 / 样式 / 终端 / 项目 / 模型 / 分支 / Token / Usage /
//! 状态 / 主题 / 多行。新增 `Color` 与 `Float` 字段类型。

/// 分段(对应 UI 里的 Tab)。
pub struct Section {
    pub title: &'static str,
    pub help: &'static str,
    pub fields: &'static [Field],
}

/// 单个字段。`path` 用点路径描述 TOML 位置。
pub struct Field {
    pub label: &'static str,
    pub path: &'static str,
    pub kind: FieldKind,
    pub help: &'static str,
}

/// 字段类型,决定编辑器形态。
pub enum FieldKind {
    Text,
    Bool,
    Enum(&'static [&'static str]),
    /// 颜色:在标准终端色板里循环;也接受手填(CLI)自定义值。
    Color,
    Int {
        min: i64,
        max: i64,
    },
    /// 浮点(带范围),目前主要用于 token 阈值。
    Float {
        min: f64,
        max: f64,
    },
}

/// 终端色板候选。按可读顺序排列。
pub static COLOR_PALETTE: &[&str] = &[
    "white",
    "black",
    "red",
    "green",
    "yellow",
    "blue",
    "magenta",
    "cyan",
    "gray",
    "bright_black",
    "bright_red",
    "bright_green",
    "bright_yellow",
    "bright_blue",
    "bright_magenta",
    "bright_cyan",
    "bright_white",
];

pub static SECTIONS: &[Section] = &[
    // ============== 基础 ==============
    Section {
        title: "基础",
        help: "状态栏核心设置",
        fields: &[
            Field {
                label: "preset",
                path: "preset",
                kind: FieldKind::Text,
                help: "组件预设字符串,例如 PMBTUS。字母映射见 preset_mapping。",
            },
            Field {
                label: "theme",
                path: "theme",
                kind: FieldKind::Enum(&["classic", "powerline", "capsule"]),
                help: "主题风格。powerline / capsule 需要 Nerd Font。",
            },
            Field {
                label: "language",
                path: "language",
                kind: FieldKind::Enum(&["zh", "en"]),
                help: "界面语言。",
            },
            Field {
                label: "debug",
                path: "debug",
                kind: FieldKind::Bool,
                help: "调试输出。生产环境建议关闭。",
            },
        ],
    },
    // ============== 样式 ==============
    Section {
        title: "样式",
        help: "分隔符与整体风格",
        fields: &[
            Field {
                label: "separator",
                path: "style.separator",
                kind: FieldKind::Text,
                help: "组件间分隔符。",
            },
            Field {
                label: "separator_color",
                path: "style.separator_color",
                kind: FieldKind::Color,
                help: "分隔符颜色,支持标准终端色或 #rrggbb。",
            },
            Field {
                label: "separator_before",
                path: "style.separator_before",
                kind: FieldKind::Text,
                help: "分隔符前空格。",
            },
            Field {
                label: "separator_after",
                path: "style.separator_after",
                kind: FieldKind::Text,
                help: "分隔符后空格。",
            },
        ],
    },
    // ============== 终端 ==============
    Section {
        title: "终端",
        help: "强制终端能力(覆盖自动检测)",
        fields: &[
            Field {
                label: "force_nerd_font",
                path: "terminal.force_nerd_font",
                kind: FieldKind::Bool,
                help: "强制启用 Nerd Font 图标。",
            },
            Field {
                label: "force_emoji",
                path: "terminal.force_emoji",
                kind: FieldKind::Bool,
                help: "强制启用 Emoji 图标。",
            },
            Field {
                label: "force_text",
                path: "terminal.force_text",
                kind: FieldKind::Bool,
                help: "强制纯文本(最大兼容性)。",
            },
        ],
    },
    // ============== 项目组件 ==============
    Section {
        title: "项目",
        help: "Project 组件 — 显示项目名",
        fields: &[
            Field {
                label: "enabled",
                path: "components.project.enabled",
                kind: FieldKind::Bool,
                help: "启用 project 组件。",
            },
            Field {
                label: "icon_color",
                path: "components.project.icon_color",
                kind: FieldKind::Color,
                help: "图标颜色。",
            },
            Field {
                label: "text_color",
                path: "components.project.text_color",
                kind: FieldKind::Color,
                help: "文本颜色。",
            },
            Field {
                label: "emoji_icon",
                path: "components.project.emoji_icon",
                kind: FieldKind::Text,
                help: "Emoji 图标。",
            },
            Field {
                label: "nerd_icon",
                path: "components.project.nerd_icon",
                kind: FieldKind::Text,
                help: "Nerd Font 图标(Unicode 转义)。",
            },
            Field {
                label: "text_icon",
                path: "components.project.text_icon",
                kind: FieldKind::Text,
                help: "纯文本图标,如 [P]。",
            },
            Field {
                label: "show_when_empty",
                path: "components.project.show_when_empty",
                kind: FieldKind::Bool,
                help: "项目名为空时是否显示。",
            },
        ],
    },
    // ============== 模型组件 ==============
    Section {
        title: "模型",
        help: "Model 组件 — 显示当前模型",
        fields: &[
            Field {
                label: "enabled",
                path: "components.model.enabled",
                kind: FieldKind::Bool,
                help: "启用 model 组件。",
            },
            Field {
                label: "icon_color",
                path: "components.model.icon_color",
                kind: FieldKind::Color,
                help: "图标颜色。",
            },
            Field {
                label: "text_color",
                path: "components.model.text_color",
                kind: FieldKind::Color,
                help: "文本颜色。",
            },
            Field {
                label: "emoji_icon",
                path: "components.model.emoji_icon",
                kind: FieldKind::Text,
                help: "Emoji 图标。",
            },
            Field {
                label: "nerd_icon",
                path: "components.model.nerd_icon",
                kind: FieldKind::Text,
                help: "Nerd Font 图标。",
            },
            Field {
                label: "text_icon",
                path: "components.model.text_icon",
                kind: FieldKind::Text,
                help: "纯文本图标。",
            },
            Field {
                label: "show_full_name",
                path: "components.model.show_full_name",
                kind: FieldKind::Bool,
                help: "显示完整模型名(Sonnet 4.5)而非缩写(S4.5)。",
            },
        ],
    },
    // ============== 分支组件 ==============
    Section {
        title: "分支",
        help: "Branch 组件 — Git 分支与工作区状态",
        fields: &[
            Field {
                label: "enabled",
                path: "components.branch.enabled",
                kind: FieldKind::Bool,
                help: "启用 branch 组件。",
            },
            Field {
                label: "icon_color",
                path: "components.branch.icon_color",
                kind: FieldKind::Color,
                help: "图标颜色。",
            },
            Field {
                label: "text_color",
                path: "components.branch.text_color",
                kind: FieldKind::Color,
                help: "分支名颜色。",
            },
            Field {
                label: "emoji_icon",
                path: "components.branch.emoji_icon",
                kind: FieldKind::Text,
                help: "Emoji 图标。",
            },
            Field {
                label: "nerd_icon",
                path: "components.branch.nerd_icon",
                kind: FieldKind::Text,
                help: "Nerd Font 图标。",
            },
            Field {
                label: "text_icon",
                path: "components.branch.text_icon",
                kind: FieldKind::Text,
                help: "纯文本图标。",
            },
            Field {
                label: "max_length",
                path: "components.branch.max_length",
                kind: FieldKind::Int { min: 0, max: 128 },
                help: "分支名最大长度,超过会截断。",
            },
            Field {
                label: "show_when_no_git",
                path: "components.branch.show_when_no_git",
                kind: FieldKind::Bool,
                help: "不在 git 仓库时是否占位。",
            },
            Field {
                label: "show_dirty",
                path: "components.branch.status.show_dirty",
                kind: FieldKind::Bool,
                help: "显示 dirty 工作区标记。",
            },
            Field {
                label: "show_ahead_behind",
                path: "components.branch.status.show_ahead_behind",
                kind: FieldKind::Bool,
                help: "显示领先/落后提交数。",
            },
            Field {
                label: "show_stash_count",
                path: "components.branch.status.show_stash_count",
                kind: FieldKind::Bool,
                help: "显示 stash 数量。",
            },
        ],
    },
    // ============== Token 组件 ==============
    Section {
        title: "Token",
        help: "Tokens 组件 — 上下文使用量与进度条",
        fields: &[
            Field {
                label: "enabled",
                path: "components.tokens.enabled",
                kind: FieldKind::Bool,
                help: "启用 tokens 组件。",
            },
            Field {
                label: "icon_color",
                path: "components.tokens.icon_color",
                kind: FieldKind::Color,
                help: "图标颜色。",
            },
            Field {
                label: "text_color",
                path: "components.tokens.text_color",
                kind: FieldKind::Color,
                help: "文本颜色。",
            },
            Field {
                label: "show_progress_bar",
                path: "components.tokens.show_progress_bar",
                kind: FieldKind::Bool,
                help: "显示可视化进度条。",
            },
            Field {
                label: "show_percentage",
                path: "components.tokens.show_percentage",
                kind: FieldKind::Bool,
                help: "显示百分比数值。",
            },
            Field {
                label: "show_raw_numbers",
                path: "components.tokens.show_raw_numbers",
                kind: FieldKind::Bool,
                help: "显示 (used/total) 原始数字。",
            },
            Field {
                label: "show_gradient",
                path: "components.tokens.show_gradient",
                kind: FieldKind::Bool,
                help: "启用彩虹渐变色。",
            },
            Field {
                label: "progress_width",
                path: "components.tokens.progress_width",
                kind: FieldKind::Int { min: 4, max: 60 },
                help: "进度条字符宽度。",
            },
            Field {
                label: "warning (%)",
                path: "components.tokens.thresholds.warning",
                kind: FieldKind::Float {
                    min: 0.0,
                    max: 100.0,
                },
                help: "警告阈值百分比(变黄)。",
            },
            Field {
                label: "danger (%)",
                path: "components.tokens.thresholds.danger",
                kind: FieldKind::Float {
                    min: 0.0,
                    max: 100.0,
                },
                help: "危险阈值百分比(变红)。",
            },
            Field {
                label: "backup (%)",
                path: "components.tokens.thresholds.backup",
                kind: FieldKind::Float {
                    min: 0.0,
                    max: 100.0,
                },
                help: "备份阈值(进度条末端样式)。",
            },
            Field {
                label: "critical (%)",
                path: "components.tokens.thresholds.critical",
                kind: FieldKind::Float {
                    min: 0.0,
                    max: 100.0,
                },
                help: "临界阈值(显示火焰图标)。",
            },
        ],
    },
    // ============== Usage 组件 ==============
    Section {
        title: "Usage",
        help: "Usage 组件 — 成本与行数统计",
        fields: &[
            Field {
                label: "enabled",
                path: "components.usage.enabled",
                kind: FieldKind::Bool,
                help: "启用 usage 组件。",
            },
            Field {
                label: "icon_color",
                path: "components.usage.icon_color",
                kind: FieldKind::Color,
                help: "图标颜色。",
            },
            Field {
                label: "text_color",
                path: "components.usage.text_color",
                kind: FieldKind::Color,
                help: "文本颜色(实际运行时会按花费等级自动染色)。",
            },
            Field {
                label: "display_mode",
                path: "components.usage.display_mode",
                kind: FieldKind::Enum(&["session", "conversation", "smart"]),
                help: "session=本次会话,conversation=跨 session 累加,smart=自适应。",
            },
            Field {
                label: "precision",
                path: "components.usage.precision",
                kind: FieldKind::Int { min: 0, max: 6 },
                help: "成本小数位数。",
            },
            Field {
                label: "currency",
                path: "components.usage.currency",
                kind: FieldKind::Text,
                help: "auto=自动推断;也可填任意固定币种代码,如 USD/CNY/AUD。",
            },
            Field {
                label: "show_lines_added",
                path: "components.usage.show_lines_added",
                kind: FieldKind::Bool,
                help: "显示新增代码行数(仅 conversation 模式)。",
            },
            Field {
                label: "show_lines_removed",
                path: "components.usage.show_lines_removed",
                kind: FieldKind::Bool,
                help: "显示删除代码行数(仅 conversation 模式)。",
            },
        ],
    },
    // ============== Status 组件 ==============
    Section {
        title: "状态",
        help: "Status 组件 — Ready / Thinking / Tool / Error",
        fields: &[
            Field {
                label: "enabled",
                path: "components.status.enabled",
                kind: FieldKind::Bool,
                help: "启用 status 组件。",
            },
            Field {
                label: "icon_color",
                path: "components.status.icon_color",
                kind: FieldKind::Color,
                help: "图标默认颜色(会按状态覆盖)。",
            },
            Field {
                label: "text_color",
                path: "components.status.text_color",
                kind: FieldKind::Color,
                help: "文本颜色。",
            },
            Field {
                label: "show_when_idle",
                path: "components.status.show_when_idle",
                kind: FieldKind::Bool,
                help: "空闲时是否显示 Ready。",
            },
            Field {
                label: "show_recent_errors",
                path: "components.status.show_recent_errors",
                kind: FieldKind::Bool,
                help: "显示最近的错误片段。",
            },
        ],
    },
    // ============== 主题 ==============
    Section {
        title: "主题",
        help: "三大主题的独立开关",
        fields: &[
            Field {
                label: "classic: gradient",
                path: "themes.classic.enable_gradient",
                kind: FieldKind::Bool,
                help: "Classic 主题彩色渐变。",
            },
            Field {
                label: "classic: fine_progress",
                path: "themes.classic.fine_progress",
                kind: FieldKind::Bool,
                help: "Classic 精细进度条字符。",
            },
            Field {
                label: "powerline: gradient",
                path: "themes.powerline.enable_gradient",
                kind: FieldKind::Bool,
                help: "Powerline 彩色渐变。",
            },
            Field {
                label: "powerline: fine_progress",
                path: "themes.powerline.fine_progress",
                kind: FieldKind::Bool,
                help: "Powerline 精细进度条。",
            },
            Field {
                label: "powerline: fg",
                path: "themes.powerline.fg",
                kind: FieldKind::Color,
                help: "Powerline 文本前景色(白色/黑色/#hex)。",
            },
            Field {
                label: "capsule: gradient",
                path: "themes.capsule.enable_gradient",
                kind: FieldKind::Bool,
                help: "Capsule 彩色渐变。",
            },
            Field {
                label: "capsule: fine_progress",
                path: "themes.capsule.fine_progress",
                kind: FieldKind::Bool,
                help: "Capsule 精细进度条。",
            },
            Field {
                label: "capsule: fg",
                path: "themes.capsule.fg",
                kind: FieldKind::Color,
                help: "Capsule 文本前景色。",
            },
        ],
    },
    // ============== 多行 ==============
    Section {
        title: "多行",
        help: "多行状态栏与 Widget 开关",
        fields: &[
            Field {
                label: "enabled",
                path: "multiline.enabled",
                kind: FieldKind::Bool,
                help: "是否启用第二行和 Widget 系统。",
            },
            Field {
                label: "max_rows",
                path: "multiline.max_rows",
                kind: FieldKind::Int { min: 1, max: 10 },
                help: "多行最大行数。",
            },
        ],
    },
    // ============== Widgets ==============
    // 特殊面板:没有 fields,由 app/view 特判成 widget 列表视图
    Section {
        title: "Widgets",
        help: "已检测到的 widget 文件(Space 切 enabled / t 切类型 / d 删除)",
        fields: &[],
    },
];
