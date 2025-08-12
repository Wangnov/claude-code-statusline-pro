import { z } from 'zod';

/**
 * Token使用信息模式 | Token usage info schema
 */
declare const UsageInfoSchema: z.ZodObject<{
    input_tokens: z.ZodNumber;
    cache_creation_input_tokens: z.ZodNumber;
    cache_read_input_tokens: z.ZodNumber;
    output_tokens: z.ZodNumber;
}, z.core.$strip>;
type UsageInfo = z.infer<typeof UsageInfoSchema>;
/**
 * Transcript条目模式 | Transcript entry schema
 */
declare const TranscriptEntrySchema: z.ZodObject<{
    type: z.ZodString;
    message: z.ZodOptional<z.ZodObject<{
        usage: z.ZodOptional<z.ZodObject<{
            input_tokens: z.ZodNumber;
            cache_creation_input_tokens: z.ZodNumber;
            cache_read_input_tokens: z.ZodNumber;
            output_tokens: z.ZodNumber;
        }, z.core.$strip>>;
        stop_reason: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    }, z.core.$strip>>;
}, z.core.$loose>;
type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;
declare const BaseComponentSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    icon: z.ZodString;
    nerd_icon: z.ZodOptional<z.ZodString>;
    text_icon: z.ZodOptional<z.ZodString>;
    color: z.ZodEnum<{
        black: "black";
        red: "red";
        green: "green";
        yellow: "yellow";
        blue: "blue";
        magenta: "magenta";
        cyan: "cyan";
        white: "white";
        gray: "gray";
        bright_red: "bright_red";
        bright_green: "bright_green";
        bright_yellow: "bright_yellow";
        bright_blue: "bright_blue";
        bright_magenta: "bright_magenta";
        bright_cyan: "bright_cyan";
        bright_white: "bright_white";
    }>;
}, z.core.$strip>;
declare const ProjectComponentSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    icon: z.ZodString;
    nerd_icon: z.ZodOptional<z.ZodString>;
    text_icon: z.ZodOptional<z.ZodString>;
    color: z.ZodEnum<{
        black: "black";
        red: "red";
        green: "green";
        yellow: "yellow";
        blue: "blue";
        magenta: "magenta";
        cyan: "cyan";
        white: "white";
        gray: "gray";
        bright_red: "bright_red";
        bright_green: "bright_green";
        bright_yellow: "bright_yellow";
        bright_blue: "bright_blue";
        bright_magenta: "bright_magenta";
        bright_cyan: "bright_cyan";
        bright_white: "bright_white";
    }>;
    show_when_empty: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
declare const ModelComponentSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    icon: z.ZodString;
    nerd_icon: z.ZodOptional<z.ZodString>;
    text_icon: z.ZodOptional<z.ZodString>;
    color: z.ZodEnum<{
        black: "black";
        red: "red";
        green: "green";
        yellow: "yellow";
        blue: "blue";
        magenta: "magenta";
        cyan: "cyan";
        white: "white";
        gray: "gray";
        bright_red: "bright_red";
        bright_green: "bright_green";
        bright_yellow: "bright_yellow";
        bright_blue: "bright_blue";
        bright_magenta: "bright_magenta";
        bright_cyan: "bright_cyan";
        bright_white: "bright_white";
    }>;
    show_full_name: z.ZodDefault<z.ZodBoolean>;
    custom_names: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
}, z.core.$strip>;
declare const BranchComponentSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    icon: z.ZodString;
    nerd_icon: z.ZodOptional<z.ZodString>;
    text_icon: z.ZodOptional<z.ZodString>;
    color: z.ZodEnum<{
        black: "black";
        red: "red";
        green: "green";
        yellow: "yellow";
        blue: "blue";
        magenta: "magenta";
        cyan: "cyan";
        white: "white";
        gray: "gray";
        bright_red: "bright_red";
        bright_green: "bright_green";
        bright_yellow: "bright_yellow";
        bright_blue: "bright_blue";
        bright_magenta: "bright_magenta";
        bright_cyan: "bright_cyan";
        bright_white: "bright_white";
    }>;
    show_when_no_git: z.ZodDefault<z.ZodBoolean>;
    max_length: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
declare const TokenComponentSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    icon: z.ZodString;
    nerd_icon: z.ZodOptional<z.ZodString>;
    text_icon: z.ZodOptional<z.ZodString>;
    color: z.ZodEnum<{
        black: "black";
        red: "red";
        green: "green";
        yellow: "yellow";
        blue: "blue";
        magenta: "magenta";
        cyan: "cyan";
        white: "white";
        gray: "gray";
        bright_red: "bright_red";
        bright_green: "bright_green";
        bright_yellow: "bright_yellow";
        bright_blue: "bright_blue";
        bright_magenta: "bright_magenta";
        bright_cyan: "bright_cyan";
        bright_white: "bright_white";
    }>;
    show_progress_bar: z.ZodDefault<z.ZodBoolean>;
    show_percentage: z.ZodDefault<z.ZodBoolean>;
    show_raw_numbers: z.ZodDefault<z.ZodBoolean>;
    context_window: z.ZodDefault<z.ZodNumber>;
    progress_bar_width: z.ZodDefault<z.ZodNumber>;
    progress_bar_chars: z.ZodOptional<z.ZodObject<{
        filled: z.ZodDefault<z.ZodString>;
        empty: z.ZodDefault<z.ZodString>;
        backup: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>;
    colors: z.ZodOptional<z.ZodObject<{
        safe: z.ZodDefault<z.ZodEnum<{
            black: "black";
            red: "red";
            green: "green";
            yellow: "yellow";
            blue: "blue";
            magenta: "magenta";
            cyan: "cyan";
            white: "white";
            gray: "gray";
            bright_red: "bright_red";
            bright_green: "bright_green";
            bright_yellow: "bright_yellow";
            bright_blue: "bright_blue";
            bright_magenta: "bright_magenta";
            bright_cyan: "bright_cyan";
            bright_white: "bright_white";
        }>>;
        warning: z.ZodDefault<z.ZodEnum<{
            black: "black";
            red: "red";
            green: "green";
            yellow: "yellow";
            blue: "blue";
            magenta: "magenta";
            cyan: "cyan";
            white: "white";
            gray: "gray";
            bright_red: "bright_red";
            bright_green: "bright_green";
            bright_yellow: "bright_yellow";
            bright_blue: "bright_blue";
            bright_magenta: "bright_magenta";
            bright_cyan: "bright_cyan";
            bright_white: "bright_white";
        }>>;
        danger: z.ZodDefault<z.ZodEnum<{
            black: "black";
            red: "red";
            green: "green";
            yellow: "yellow";
            blue: "blue";
            magenta: "magenta";
            cyan: "cyan";
            white: "white";
            gray: "gray";
            bright_red: "bright_red";
            bright_green: "bright_green";
            bright_yellow: "bright_yellow";
            bright_blue: "bright_blue";
            bright_magenta: "bright_magenta";
            bright_cyan: "bright_cyan";
            bright_white: "bright_white";
        }>>;
    }, z.core.$strip>>;
    thresholds: z.ZodOptional<z.ZodObject<{
        warning: z.ZodDefault<z.ZodNumber>;
        danger: z.ZodDefault<z.ZodNumber>;
        backup: z.ZodDefault<z.ZodNumber>;
        critical: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
    status_icons: z.ZodOptional<z.ZodObject<{
        backup: z.ZodDefault<z.ZodString>;
        critical: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>;
    status_nerd_icons: z.ZodOptional<z.ZodObject<{
        backup: z.ZodDefault<z.ZodString>;
        critical: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>;
    status_text_icons: z.ZodOptional<z.ZodObject<{
        backup: z.ZodDefault<z.ZodString>;
        critical: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const StatusComponentSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    icon: z.ZodString;
    nerd_icon: z.ZodOptional<z.ZodString>;
    text_icon: z.ZodOptional<z.ZodString>;
    color: z.ZodEnum<{
        black: "black";
        red: "red";
        green: "green";
        yellow: "yellow";
        blue: "blue";
        magenta: "magenta";
        cyan: "cyan";
        white: "white";
        gray: "gray";
        bright_red: "bright_red";
        bright_green: "bright_green";
        bright_yellow: "bright_yellow";
        bright_blue: "bright_blue";
        bright_magenta: "bright_magenta";
        bright_cyan: "bright_cyan";
        bright_white: "bright_white";
    }>;
    show_recent_errors: z.ZodDefault<z.ZodBoolean>;
    icons: z.ZodOptional<z.ZodObject<{
        ready: z.ZodDefault<z.ZodString>;
        thinking: z.ZodDefault<z.ZodString>;
        tool: z.ZodDefault<z.ZodString>;
        error: z.ZodDefault<z.ZodString>;
        warning: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>;
    nerd_icons: z.ZodOptional<z.ZodObject<{
        ready: z.ZodDefault<z.ZodString>;
        thinking: z.ZodDefault<z.ZodString>;
        tool: z.ZodDefault<z.ZodString>;
        error: z.ZodDefault<z.ZodString>;
        warning: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>;
    text_icons: z.ZodOptional<z.ZodObject<{
        ready: z.ZodDefault<z.ZodString>;
        thinking: z.ZodDefault<z.ZodString>;
        tool: z.ZodDefault<z.ZodString>;
        error: z.ZodDefault<z.ZodString>;
        warning: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>;
    colors: z.ZodOptional<z.ZodObject<{
        ready: z.ZodDefault<z.ZodEnum<{
            black: "black";
            red: "red";
            green: "green";
            yellow: "yellow";
            blue: "blue";
            magenta: "magenta";
            cyan: "cyan";
            white: "white";
            gray: "gray";
            bright_red: "bright_red";
            bright_green: "bright_green";
            bright_yellow: "bright_yellow";
            bright_blue: "bright_blue";
            bright_magenta: "bright_magenta";
            bright_cyan: "bright_cyan";
            bright_white: "bright_white";
        }>>;
        thinking: z.ZodDefault<z.ZodEnum<{
            black: "black";
            red: "red";
            green: "green";
            yellow: "yellow";
            blue: "blue";
            magenta: "magenta";
            cyan: "cyan";
            white: "white";
            gray: "gray";
            bright_red: "bright_red";
            bright_green: "bright_green";
            bright_yellow: "bright_yellow";
            bright_blue: "bright_blue";
            bright_magenta: "bright_magenta";
            bright_cyan: "bright_cyan";
            bright_white: "bright_white";
        }>>;
        tool: z.ZodDefault<z.ZodEnum<{
            black: "black";
            red: "red";
            green: "green";
            yellow: "yellow";
            blue: "blue";
            magenta: "magenta";
            cyan: "cyan";
            white: "white";
            gray: "gray";
            bright_red: "bright_red";
            bright_green: "bright_green";
            bright_yellow: "bright_yellow";
            bright_blue: "bright_blue";
            bright_magenta: "bright_magenta";
            bright_cyan: "bright_cyan";
            bright_white: "bright_white";
        }>>;
        error: z.ZodDefault<z.ZodEnum<{
            black: "black";
            red: "red";
            green: "green";
            yellow: "yellow";
            blue: "blue";
            magenta: "magenta";
            cyan: "cyan";
            white: "white";
            gray: "gray";
            bright_red: "bright_red";
            bright_green: "bright_green";
            bright_yellow: "bright_yellow";
            bright_blue: "bright_blue";
            bright_magenta: "bright_magenta";
            bright_cyan: "bright_cyan";
            bright_white: "bright_white";
        }>>;
        warning: z.ZodDefault<z.ZodEnum<{
            black: "black";
            red: "red";
            green: "green";
            yellow: "yellow";
            blue: "blue";
            magenta: "magenta";
            cyan: "cyan";
            white: "white";
            gray: "gray";
            bright_red: "bright_red";
            bright_green: "bright_green";
            bright_yellow: "bright_yellow";
            bright_blue: "bright_blue";
            bright_magenta: "bright_magenta";
            bright_cyan: "bright_cyan";
            bright_white: "bright_white";
        }>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const ComponentsSchema: z.ZodObject<{
    order: z.ZodDefault<z.ZodArray<z.ZodString>>;
    project: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        icon: z.ZodString;
        nerd_icon: z.ZodOptional<z.ZodString>;
        text_icon: z.ZodOptional<z.ZodString>;
        color: z.ZodEnum<{
            black: "black";
            red: "red";
            green: "green";
            yellow: "yellow";
            blue: "blue";
            magenta: "magenta";
            cyan: "cyan";
            white: "white";
            gray: "gray";
            bright_red: "bright_red";
            bright_green: "bright_green";
            bright_yellow: "bright_yellow";
            bright_blue: "bright_blue";
            bright_magenta: "bright_magenta";
            bright_cyan: "bright_cyan";
            bright_white: "bright_white";
        }>;
        show_when_empty: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    model: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        icon: z.ZodString;
        nerd_icon: z.ZodOptional<z.ZodString>;
        text_icon: z.ZodOptional<z.ZodString>;
        color: z.ZodEnum<{
            black: "black";
            red: "red";
            green: "green";
            yellow: "yellow";
            blue: "blue";
            magenta: "magenta";
            cyan: "cyan";
            white: "white";
            gray: "gray";
            bright_red: "bright_red";
            bright_green: "bright_green";
            bright_yellow: "bright_yellow";
            bright_blue: "bright_blue";
            bright_magenta: "bright_magenta";
            bright_cyan: "bright_cyan";
            bright_white: "bright_white";
        }>;
        show_full_name: z.ZodDefault<z.ZodBoolean>;
        custom_names: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    branch: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        icon: z.ZodString;
        nerd_icon: z.ZodOptional<z.ZodString>;
        text_icon: z.ZodOptional<z.ZodString>;
        color: z.ZodEnum<{
            black: "black";
            red: "red";
            green: "green";
            yellow: "yellow";
            blue: "blue";
            magenta: "magenta";
            cyan: "cyan";
            white: "white";
            gray: "gray";
            bright_red: "bright_red";
            bright_green: "bright_green";
            bright_yellow: "bright_yellow";
            bright_blue: "bright_blue";
            bright_magenta: "bright_magenta";
            bright_cyan: "bright_cyan";
            bright_white: "bright_white";
        }>;
        show_when_no_git: z.ZodDefault<z.ZodBoolean>;
        max_length: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
    tokens: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        icon: z.ZodString;
        nerd_icon: z.ZodOptional<z.ZodString>;
        text_icon: z.ZodOptional<z.ZodString>;
        color: z.ZodEnum<{
            black: "black";
            red: "red";
            green: "green";
            yellow: "yellow";
            blue: "blue";
            magenta: "magenta";
            cyan: "cyan";
            white: "white";
            gray: "gray";
            bright_red: "bright_red";
            bright_green: "bright_green";
            bright_yellow: "bright_yellow";
            bright_blue: "bright_blue";
            bright_magenta: "bright_magenta";
            bright_cyan: "bright_cyan";
            bright_white: "bright_white";
        }>;
        show_progress_bar: z.ZodDefault<z.ZodBoolean>;
        show_percentage: z.ZodDefault<z.ZodBoolean>;
        show_raw_numbers: z.ZodDefault<z.ZodBoolean>;
        context_window: z.ZodDefault<z.ZodNumber>;
        progress_bar_width: z.ZodDefault<z.ZodNumber>;
        progress_bar_chars: z.ZodOptional<z.ZodObject<{
            filled: z.ZodDefault<z.ZodString>;
            empty: z.ZodDefault<z.ZodString>;
            backup: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>>;
        colors: z.ZodOptional<z.ZodObject<{
            safe: z.ZodDefault<z.ZodEnum<{
                black: "black";
                red: "red";
                green: "green";
                yellow: "yellow";
                blue: "blue";
                magenta: "magenta";
                cyan: "cyan";
                white: "white";
                gray: "gray";
                bright_red: "bright_red";
                bright_green: "bright_green";
                bright_yellow: "bright_yellow";
                bright_blue: "bright_blue";
                bright_magenta: "bright_magenta";
                bright_cyan: "bright_cyan";
                bright_white: "bright_white";
            }>>;
            warning: z.ZodDefault<z.ZodEnum<{
                black: "black";
                red: "red";
                green: "green";
                yellow: "yellow";
                blue: "blue";
                magenta: "magenta";
                cyan: "cyan";
                white: "white";
                gray: "gray";
                bright_red: "bright_red";
                bright_green: "bright_green";
                bright_yellow: "bright_yellow";
                bright_blue: "bright_blue";
                bright_magenta: "bright_magenta";
                bright_cyan: "bright_cyan";
                bright_white: "bright_white";
            }>>;
            danger: z.ZodDefault<z.ZodEnum<{
                black: "black";
                red: "red";
                green: "green";
                yellow: "yellow";
                blue: "blue";
                magenta: "magenta";
                cyan: "cyan";
                white: "white";
                gray: "gray";
                bright_red: "bright_red";
                bright_green: "bright_green";
                bright_yellow: "bright_yellow";
                bright_blue: "bright_blue";
                bright_magenta: "bright_magenta";
                bright_cyan: "bright_cyan";
                bright_white: "bright_white";
            }>>;
        }, z.core.$strip>>;
        thresholds: z.ZodOptional<z.ZodObject<{
            warning: z.ZodDefault<z.ZodNumber>;
            danger: z.ZodDefault<z.ZodNumber>;
            backup: z.ZodDefault<z.ZodNumber>;
            critical: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>;
        status_icons: z.ZodOptional<z.ZodObject<{
            backup: z.ZodDefault<z.ZodString>;
            critical: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>>;
        status_nerd_icons: z.ZodOptional<z.ZodObject<{
            backup: z.ZodDefault<z.ZodString>;
            critical: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>>;
        status_text_icons: z.ZodOptional<z.ZodObject<{
            backup: z.ZodDefault<z.ZodString>;
            critical: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    status: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        icon: z.ZodString;
        nerd_icon: z.ZodOptional<z.ZodString>;
        text_icon: z.ZodOptional<z.ZodString>;
        color: z.ZodEnum<{
            black: "black";
            red: "red";
            green: "green";
            yellow: "yellow";
            blue: "blue";
            magenta: "magenta";
            cyan: "cyan";
            white: "white";
            gray: "gray";
            bright_red: "bright_red";
            bright_green: "bright_green";
            bright_yellow: "bright_yellow";
            bright_blue: "bright_blue";
            bright_magenta: "bright_magenta";
            bright_cyan: "bright_cyan";
            bright_white: "bright_white";
        }>;
        show_recent_errors: z.ZodDefault<z.ZodBoolean>;
        icons: z.ZodOptional<z.ZodObject<{
            ready: z.ZodDefault<z.ZodString>;
            thinking: z.ZodDefault<z.ZodString>;
            tool: z.ZodDefault<z.ZodString>;
            error: z.ZodDefault<z.ZodString>;
            warning: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>>;
        nerd_icons: z.ZodOptional<z.ZodObject<{
            ready: z.ZodDefault<z.ZodString>;
            thinking: z.ZodDefault<z.ZodString>;
            tool: z.ZodDefault<z.ZodString>;
            error: z.ZodDefault<z.ZodString>;
            warning: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>>;
        text_icons: z.ZodOptional<z.ZodObject<{
            ready: z.ZodDefault<z.ZodString>;
            thinking: z.ZodDefault<z.ZodString>;
            tool: z.ZodDefault<z.ZodString>;
            error: z.ZodDefault<z.ZodString>;
            warning: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>>;
        colors: z.ZodOptional<z.ZodObject<{
            ready: z.ZodDefault<z.ZodEnum<{
                black: "black";
                red: "red";
                green: "green";
                yellow: "yellow";
                blue: "blue";
                magenta: "magenta";
                cyan: "cyan";
                white: "white";
                gray: "gray";
                bright_red: "bright_red";
                bright_green: "bright_green";
                bright_yellow: "bright_yellow";
                bright_blue: "bright_blue";
                bright_magenta: "bright_magenta";
                bright_cyan: "bright_cyan";
                bright_white: "bright_white";
            }>>;
            thinking: z.ZodDefault<z.ZodEnum<{
                black: "black";
                red: "red";
                green: "green";
                yellow: "yellow";
                blue: "blue";
                magenta: "magenta";
                cyan: "cyan";
                white: "white";
                gray: "gray";
                bright_red: "bright_red";
                bright_green: "bright_green";
                bright_yellow: "bright_yellow";
                bright_blue: "bright_blue";
                bright_magenta: "bright_magenta";
                bright_cyan: "bright_cyan";
                bright_white: "bright_white";
            }>>;
            tool: z.ZodDefault<z.ZodEnum<{
                black: "black";
                red: "red";
                green: "green";
                yellow: "yellow";
                blue: "blue";
                magenta: "magenta";
                cyan: "cyan";
                white: "white";
                gray: "gray";
                bright_red: "bright_red";
                bright_green: "bright_green";
                bright_yellow: "bright_yellow";
                bright_blue: "bright_blue";
                bright_magenta: "bright_magenta";
                bright_cyan: "bright_cyan";
                bright_white: "bright_white";
            }>>;
            error: z.ZodDefault<z.ZodEnum<{
                black: "black";
                red: "red";
                green: "green";
                yellow: "yellow";
                blue: "blue";
                magenta: "magenta";
                cyan: "cyan";
                white: "white";
                gray: "gray";
                bright_red: "bright_red";
                bright_green: "bright_green";
                bright_yellow: "bright_yellow";
                bright_blue: "bright_blue";
                bright_magenta: "bright_magenta";
                bright_cyan: "bright_cyan";
                bright_white: "bright_white";
            }>>;
            warning: z.ZodDefault<z.ZodEnum<{
                black: "black";
                red: "red";
                green: "green";
                yellow: "yellow";
                blue: "blue";
                magenta: "magenta";
                cyan: "cyan";
                white: "white";
                gray: "gray";
                bright_red: "bright_red";
                bright_green: "bright_green";
                bright_yellow: "bright_yellow";
                bright_blue: "bright_blue";
                bright_magenta: "bright_magenta";
                bright_cyan: "bright_cyan";
                bright_white: "bright_white";
            }>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const StyleSchema: z.ZodObject<{
    separator: z.ZodDefault<z.ZodString>;
    enable_colors: z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodLiteral<"auto">]>>;
    enable_emoji: z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodLiteral<"auto">]>>;
    enable_nerd_font: z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodLiteral<"auto">]>>;
    compact_mode: z.ZodDefault<z.ZodBoolean>;
    max_width: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
declare const ConfigSchema: z.ZodObject<{
    preset: z.ZodDefault<z.ZodString>;
    theme: z.ZodOptional<z.ZodString>;
    preset_mapping: z.ZodOptional<z.ZodDefault<z.ZodObject<{
        P: z.ZodLiteral<"project">;
        M: z.ZodLiteral<"model">;
        B: z.ZodLiteral<"branch">;
        T: z.ZodLiteral<"tokens">;
        S: z.ZodLiteral<"status">;
    }, z.core.$strip>>>;
    components: z.ZodOptional<z.ZodObject<{
        order: z.ZodDefault<z.ZodArray<z.ZodString>>;
        project: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            icon: z.ZodString;
            nerd_icon: z.ZodOptional<z.ZodString>;
            text_icon: z.ZodOptional<z.ZodString>;
            color: z.ZodEnum<{
                black: "black";
                red: "red";
                green: "green";
                yellow: "yellow";
                blue: "blue";
                magenta: "magenta";
                cyan: "cyan";
                white: "white";
                gray: "gray";
                bright_red: "bright_red";
                bright_green: "bright_green";
                bright_yellow: "bright_yellow";
                bright_blue: "bright_blue";
                bright_magenta: "bright_magenta";
                bright_cyan: "bright_cyan";
                bright_white: "bright_white";
            }>;
            show_when_empty: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>>;
        model: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            icon: z.ZodString;
            nerd_icon: z.ZodOptional<z.ZodString>;
            text_icon: z.ZodOptional<z.ZodString>;
            color: z.ZodEnum<{
                black: "black";
                red: "red";
                green: "green";
                yellow: "yellow";
                blue: "blue";
                magenta: "magenta";
                cyan: "cyan";
                white: "white";
                gray: "gray";
                bright_red: "bright_red";
                bright_green: "bright_green";
                bright_yellow: "bright_yellow";
                bright_blue: "bright_blue";
                bright_magenta: "bright_magenta";
                bright_cyan: "bright_cyan";
                bright_white: "bright_white";
            }>;
            show_full_name: z.ZodDefault<z.ZodBoolean>;
            custom_names: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>>;
        branch: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            icon: z.ZodString;
            nerd_icon: z.ZodOptional<z.ZodString>;
            text_icon: z.ZodOptional<z.ZodString>;
            color: z.ZodEnum<{
                black: "black";
                red: "red";
                green: "green";
                yellow: "yellow";
                blue: "blue";
                magenta: "magenta";
                cyan: "cyan";
                white: "white";
                gray: "gray";
                bright_red: "bright_red";
                bright_green: "bright_green";
                bright_yellow: "bright_yellow";
                bright_blue: "bright_blue";
                bright_magenta: "bright_magenta";
                bright_cyan: "bright_cyan";
                bright_white: "bright_white";
            }>;
            show_when_no_git: z.ZodDefault<z.ZodBoolean>;
            max_length: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>;
        tokens: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            icon: z.ZodString;
            nerd_icon: z.ZodOptional<z.ZodString>;
            text_icon: z.ZodOptional<z.ZodString>;
            color: z.ZodEnum<{
                black: "black";
                red: "red";
                green: "green";
                yellow: "yellow";
                blue: "blue";
                magenta: "magenta";
                cyan: "cyan";
                white: "white";
                gray: "gray";
                bright_red: "bright_red";
                bright_green: "bright_green";
                bright_yellow: "bright_yellow";
                bright_blue: "bright_blue";
                bright_magenta: "bright_magenta";
                bright_cyan: "bright_cyan";
                bright_white: "bright_white";
            }>;
            show_progress_bar: z.ZodDefault<z.ZodBoolean>;
            show_percentage: z.ZodDefault<z.ZodBoolean>;
            show_raw_numbers: z.ZodDefault<z.ZodBoolean>;
            context_window: z.ZodDefault<z.ZodNumber>;
            progress_bar_width: z.ZodDefault<z.ZodNumber>;
            progress_bar_chars: z.ZodOptional<z.ZodObject<{
                filled: z.ZodDefault<z.ZodString>;
                empty: z.ZodDefault<z.ZodString>;
                backup: z.ZodDefault<z.ZodString>;
            }, z.core.$strip>>;
            colors: z.ZodOptional<z.ZodObject<{
                safe: z.ZodDefault<z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>>;
                warning: z.ZodDefault<z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>>;
                danger: z.ZodDefault<z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>>;
            }, z.core.$strip>>;
            thresholds: z.ZodOptional<z.ZodObject<{
                warning: z.ZodDefault<z.ZodNumber>;
                danger: z.ZodDefault<z.ZodNumber>;
                backup: z.ZodDefault<z.ZodNumber>;
                critical: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>>;
            status_icons: z.ZodOptional<z.ZodObject<{
                backup: z.ZodDefault<z.ZodString>;
                critical: z.ZodDefault<z.ZodString>;
            }, z.core.$strip>>;
            status_nerd_icons: z.ZodOptional<z.ZodObject<{
                backup: z.ZodDefault<z.ZodString>;
                critical: z.ZodDefault<z.ZodString>;
            }, z.core.$strip>>;
            status_text_icons: z.ZodOptional<z.ZodObject<{
                backup: z.ZodDefault<z.ZodString>;
                critical: z.ZodDefault<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        status: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            icon: z.ZodString;
            nerd_icon: z.ZodOptional<z.ZodString>;
            text_icon: z.ZodOptional<z.ZodString>;
            color: z.ZodEnum<{
                black: "black";
                red: "red";
                green: "green";
                yellow: "yellow";
                blue: "blue";
                magenta: "magenta";
                cyan: "cyan";
                white: "white";
                gray: "gray";
                bright_red: "bright_red";
                bright_green: "bright_green";
                bright_yellow: "bright_yellow";
                bright_blue: "bright_blue";
                bright_magenta: "bright_magenta";
                bright_cyan: "bright_cyan";
                bright_white: "bright_white";
            }>;
            show_recent_errors: z.ZodDefault<z.ZodBoolean>;
            icons: z.ZodOptional<z.ZodObject<{
                ready: z.ZodDefault<z.ZodString>;
                thinking: z.ZodDefault<z.ZodString>;
                tool: z.ZodDefault<z.ZodString>;
                error: z.ZodDefault<z.ZodString>;
                warning: z.ZodDefault<z.ZodString>;
            }, z.core.$strip>>;
            nerd_icons: z.ZodOptional<z.ZodObject<{
                ready: z.ZodDefault<z.ZodString>;
                thinking: z.ZodDefault<z.ZodString>;
                tool: z.ZodDefault<z.ZodString>;
                error: z.ZodDefault<z.ZodString>;
                warning: z.ZodDefault<z.ZodString>;
            }, z.core.$strip>>;
            text_icons: z.ZodOptional<z.ZodObject<{
                ready: z.ZodDefault<z.ZodString>;
                thinking: z.ZodDefault<z.ZodString>;
                tool: z.ZodDefault<z.ZodString>;
                error: z.ZodDefault<z.ZodString>;
                warning: z.ZodDefault<z.ZodString>;
            }, z.core.$strip>>;
            colors: z.ZodOptional<z.ZodObject<{
                ready: z.ZodDefault<z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>>;
                thinking: z.ZodDefault<z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>>;
                tool: z.ZodDefault<z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>>;
                error: z.ZodDefault<z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>>;
                warning: z.ZodDefault<z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    style: z.ZodOptional<z.ZodObject<{
        separator: z.ZodDefault<z.ZodString>;
        enable_colors: z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodLiteral<"auto">]>>;
        enable_emoji: z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodLiteral<"auto">]>>;
        enable_nerd_font: z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodLiteral<"auto">]>>;
        compact_mode: z.ZodDefault<z.ZodBoolean>;
        max_width: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
    advanced: z.ZodOptional<z.ZodObject<{
        cache_enabled: z.ZodDefault<z.ZodBoolean>;
        recent_error_count: z.ZodDefault<z.ZodNumber>;
        git_timeout: z.ZodDefault<z.ZodNumber>;
        debug_mode: z.ZodDefault<z.ZodBoolean>;
        custom_color_codes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    experimental: z.ZodOptional<z.ZodObject<{
        show_context_health: z.ZodDefault<z.ZodBoolean>;
        adaptive_colors: z.ZodDefault<z.ZodBoolean>;
        show_timestamp: z.ZodDefault<z.ZodBoolean>;
        show_session_info: z.ZodDefault<z.ZodBoolean>;
        force_nerd_font: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    templates: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        description: z.ZodOptional<z.ZodString>;
        style: z.ZodOptional<z.ZodObject<{
            separator: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            enable_colors: z.ZodOptional<z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodLiteral<"auto">]>>>;
            enable_emoji: z.ZodOptional<z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodLiteral<"auto">]>>>;
            enable_nerd_font: z.ZodOptional<z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodLiteral<"auto">]>>>;
            compact_mode: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
            max_width: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        }, z.core.$strip>>;
        components: z.ZodOptional<z.ZodObject<{
            order: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
            project: z.ZodOptional<z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                icon: z.ZodString;
                nerd_icon: z.ZodOptional<z.ZodString>;
                text_icon: z.ZodOptional<z.ZodString>;
                color: z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>;
                show_when_empty: z.ZodDefault<z.ZodBoolean>;
            }, z.core.$strip>>>;
            model: z.ZodOptional<z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                icon: z.ZodString;
                nerd_icon: z.ZodOptional<z.ZodString>;
                text_icon: z.ZodOptional<z.ZodString>;
                color: z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>;
                show_full_name: z.ZodDefault<z.ZodBoolean>;
                custom_names: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
            }, z.core.$strip>>>;
            branch: z.ZodOptional<z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                icon: z.ZodString;
                nerd_icon: z.ZodOptional<z.ZodString>;
                text_icon: z.ZodOptional<z.ZodString>;
                color: z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>;
                show_when_no_git: z.ZodDefault<z.ZodBoolean>;
                max_length: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>>>;
            tokens: z.ZodOptional<z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                icon: z.ZodString;
                nerd_icon: z.ZodOptional<z.ZodString>;
                text_icon: z.ZodOptional<z.ZodString>;
                color: z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>;
                show_progress_bar: z.ZodDefault<z.ZodBoolean>;
                show_percentage: z.ZodDefault<z.ZodBoolean>;
                show_raw_numbers: z.ZodDefault<z.ZodBoolean>;
                context_window: z.ZodDefault<z.ZodNumber>;
                progress_bar_width: z.ZodDefault<z.ZodNumber>;
                progress_bar_chars: z.ZodOptional<z.ZodObject<{
                    filled: z.ZodDefault<z.ZodString>;
                    empty: z.ZodDefault<z.ZodString>;
                    backup: z.ZodDefault<z.ZodString>;
                }, z.core.$strip>>;
                colors: z.ZodOptional<z.ZodObject<{
                    safe: z.ZodDefault<z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>>;
                    warning: z.ZodDefault<z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>>;
                    danger: z.ZodDefault<z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>>;
                }, z.core.$strip>>;
                thresholds: z.ZodOptional<z.ZodObject<{
                    warning: z.ZodDefault<z.ZodNumber>;
                    danger: z.ZodDefault<z.ZodNumber>;
                    backup: z.ZodDefault<z.ZodNumber>;
                    critical: z.ZodDefault<z.ZodNumber>;
                }, z.core.$strip>>;
                status_icons: z.ZodOptional<z.ZodObject<{
                    backup: z.ZodDefault<z.ZodString>;
                    critical: z.ZodDefault<z.ZodString>;
                }, z.core.$strip>>;
                status_nerd_icons: z.ZodOptional<z.ZodObject<{
                    backup: z.ZodDefault<z.ZodString>;
                    critical: z.ZodDefault<z.ZodString>;
                }, z.core.$strip>>;
                status_text_icons: z.ZodOptional<z.ZodObject<{
                    backup: z.ZodDefault<z.ZodString>;
                    critical: z.ZodDefault<z.ZodString>;
                }, z.core.$strip>>;
            }, z.core.$strip>>>;
            status: z.ZodOptional<z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                icon: z.ZodString;
                nerd_icon: z.ZodOptional<z.ZodString>;
                text_icon: z.ZodOptional<z.ZodString>;
                color: z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>;
                show_recent_errors: z.ZodDefault<z.ZodBoolean>;
                icons: z.ZodOptional<z.ZodObject<{
                    ready: z.ZodDefault<z.ZodString>;
                    thinking: z.ZodDefault<z.ZodString>;
                    tool: z.ZodDefault<z.ZodString>;
                    error: z.ZodDefault<z.ZodString>;
                    warning: z.ZodDefault<z.ZodString>;
                }, z.core.$strip>>;
                nerd_icons: z.ZodOptional<z.ZodObject<{
                    ready: z.ZodDefault<z.ZodString>;
                    thinking: z.ZodDefault<z.ZodString>;
                    tool: z.ZodDefault<z.ZodString>;
                    error: z.ZodDefault<z.ZodString>;
                    warning: z.ZodDefault<z.ZodString>;
                }, z.core.$strip>>;
                text_icons: z.ZodOptional<z.ZodObject<{
                    ready: z.ZodDefault<z.ZodString>;
                    thinking: z.ZodDefault<z.ZodString>;
                    tool: z.ZodDefault<z.ZodString>;
                    error: z.ZodDefault<z.ZodString>;
                    warning: z.ZodDefault<z.ZodString>;
                }, z.core.$strip>>;
                colors: z.ZodOptional<z.ZodObject<{
                    ready: z.ZodDefault<z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>>;
                    thinking: z.ZodDefault<z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>>;
                    tool: z.ZodDefault<z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>>;
                    error: z.ZodDefault<z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>>;
                    warning: z.ZodDefault<z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>>;
                }, z.core.$strip>>;
            }, z.core.$strip>>>;
        }, z.core.$strip>>;
    }, z.core.$loose>>>;
}, z.core.$loose>;
declare const InputDataSchema: z.ZodPipe<z.ZodObject<{
    hook_event_name: z.ZodOptional<z.ZodString>;
    hookEventName: z.ZodOptional<z.ZodString>;
    session_id: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
    transcript_path: z.ZodOptional<z.ZodString>;
    transcriptPath: z.ZodOptional<z.ZodString>;
    cwd: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        display_name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    workspace: z.ZodOptional<z.ZodObject<{
        current_dir: z.ZodOptional<z.ZodString>;
        project_dir: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    gitBranch: z.ZodOptional<z.ZodString>;
    git: z.ZodOptional<z.ZodObject<{
        branch: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
        ahead: z.ZodOptional<z.ZodNumber>;
        behind: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$loose>, z.ZodTransform<{
    hookEventName: string;
    sessionId: string | null;
    transcriptPath: string | null;
    cwd: string;
    model: {
        id?: string | undefined;
        display_name?: string | undefined;
    };
    workspace: {
        current_dir?: string | undefined;
        project_dir?: string | undefined;
    };
    gitBranch: string | null;
}, {
    [x: string]: unknown;
    hook_event_name?: string | undefined;
    hookEventName?: string | undefined;
    session_id?: string | undefined;
    sessionId?: string | undefined;
    transcript_path?: string | undefined;
    transcriptPath?: string | undefined;
    cwd?: string | undefined;
    model?: {
        id?: string | undefined;
        display_name?: string | undefined;
    } | undefined;
    workspace?: {
        current_dir?: string | undefined;
        project_dir?: string | undefined;
    } | undefined;
    gitBranch?: string | undefined;
    git?: {
        branch?: string | undefined;
        status?: string | undefined;
        ahead?: number | undefined;
        behind?: number | undefined;
    } | undefined;
}>>;
declare const RenderContextSchema: z.ZodObject<{
    inputData: z.ZodPipe<z.ZodObject<{
        hook_event_name: z.ZodOptional<z.ZodString>;
        hookEventName: z.ZodOptional<z.ZodString>;
        session_id: z.ZodOptional<z.ZodString>;
        sessionId: z.ZodOptional<z.ZodString>;
        transcript_path: z.ZodOptional<z.ZodString>;
        transcriptPath: z.ZodOptional<z.ZodString>;
        cwd: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        workspace: z.ZodOptional<z.ZodObject<{
            current_dir: z.ZodOptional<z.ZodString>;
            project_dir: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        gitBranch: z.ZodOptional<z.ZodString>;
        git: z.ZodOptional<z.ZodObject<{
            branch: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodString>;
            ahead: z.ZodOptional<z.ZodNumber>;
            behind: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$loose>, z.ZodTransform<{
        hookEventName: string;
        sessionId: string | null;
        transcriptPath: string | null;
        cwd: string;
        model: {
            id?: string | undefined;
            display_name?: string | undefined;
        };
        workspace: {
            current_dir?: string | undefined;
            project_dir?: string | undefined;
        };
        gitBranch: string | null;
    }, {
        [x: string]: unknown;
        hook_event_name?: string | undefined;
        hookEventName?: string | undefined;
        session_id?: string | undefined;
        sessionId?: string | undefined;
        transcript_path?: string | undefined;
        transcriptPath?: string | undefined;
        cwd?: string | undefined;
        model?: {
            id?: string | undefined;
            display_name?: string | undefined;
        } | undefined;
        workspace?: {
            current_dir?: string | undefined;
            project_dir?: string | undefined;
        } | undefined;
        gitBranch?: string | undefined;
        git?: {
            branch?: string | undefined;
            status?: string | undefined;
            ahead?: number | undefined;
            behind?: number | undefined;
        } | undefined;
    }>>;
    capabilities: z.ZodObject<{
        colors: z.ZodBoolean;
        emoji: z.ZodBoolean;
        nerdFont: z.ZodBoolean;
    }, z.core.$strip>;
    colors: z.ZodRecord<z.ZodString, z.ZodString>;
    icons: z.ZodRecord<z.ZodString, z.ZodString>;
    config: z.ZodObject<{
        preset: z.ZodDefault<z.ZodString>;
        theme: z.ZodOptional<z.ZodString>;
        preset_mapping: z.ZodOptional<z.ZodDefault<z.ZodObject<{
            P: z.ZodLiteral<"project">;
            M: z.ZodLiteral<"model">;
            B: z.ZodLiteral<"branch">;
            T: z.ZodLiteral<"tokens">;
            S: z.ZodLiteral<"status">;
        }, z.core.$strip>>>;
        components: z.ZodOptional<z.ZodObject<{
            order: z.ZodDefault<z.ZodArray<z.ZodString>>;
            project: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                icon: z.ZodString;
                nerd_icon: z.ZodOptional<z.ZodString>;
                text_icon: z.ZodOptional<z.ZodString>;
                color: z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>;
                show_when_empty: z.ZodDefault<z.ZodBoolean>;
            }, z.core.$strip>>;
            model: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                icon: z.ZodString;
                nerd_icon: z.ZodOptional<z.ZodString>;
                text_icon: z.ZodOptional<z.ZodString>;
                color: z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>;
                show_full_name: z.ZodDefault<z.ZodBoolean>;
                custom_names: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
            }, z.core.$strip>>;
            branch: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                icon: z.ZodString;
                nerd_icon: z.ZodOptional<z.ZodString>;
                text_icon: z.ZodOptional<z.ZodString>;
                color: z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>;
                show_when_no_git: z.ZodDefault<z.ZodBoolean>;
                max_length: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>>;
            tokens: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                icon: z.ZodString;
                nerd_icon: z.ZodOptional<z.ZodString>;
                text_icon: z.ZodOptional<z.ZodString>;
                color: z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>;
                show_progress_bar: z.ZodDefault<z.ZodBoolean>;
                show_percentage: z.ZodDefault<z.ZodBoolean>;
                show_raw_numbers: z.ZodDefault<z.ZodBoolean>;
                context_window: z.ZodDefault<z.ZodNumber>;
                progress_bar_width: z.ZodDefault<z.ZodNumber>;
                progress_bar_chars: z.ZodOptional<z.ZodObject<{
                    filled: z.ZodDefault<z.ZodString>;
                    empty: z.ZodDefault<z.ZodString>;
                    backup: z.ZodDefault<z.ZodString>;
                }, z.core.$strip>>;
                colors: z.ZodOptional<z.ZodObject<{
                    safe: z.ZodDefault<z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>>;
                    warning: z.ZodDefault<z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>>;
                    danger: z.ZodDefault<z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>>;
                }, z.core.$strip>>;
                thresholds: z.ZodOptional<z.ZodObject<{
                    warning: z.ZodDefault<z.ZodNumber>;
                    danger: z.ZodDefault<z.ZodNumber>;
                    backup: z.ZodDefault<z.ZodNumber>;
                    critical: z.ZodDefault<z.ZodNumber>;
                }, z.core.$strip>>;
                status_icons: z.ZodOptional<z.ZodObject<{
                    backup: z.ZodDefault<z.ZodString>;
                    critical: z.ZodDefault<z.ZodString>;
                }, z.core.$strip>>;
                status_nerd_icons: z.ZodOptional<z.ZodObject<{
                    backup: z.ZodDefault<z.ZodString>;
                    critical: z.ZodDefault<z.ZodString>;
                }, z.core.$strip>>;
                status_text_icons: z.ZodOptional<z.ZodObject<{
                    backup: z.ZodDefault<z.ZodString>;
                    critical: z.ZodDefault<z.ZodString>;
                }, z.core.$strip>>;
            }, z.core.$strip>>;
            status: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                icon: z.ZodString;
                nerd_icon: z.ZodOptional<z.ZodString>;
                text_icon: z.ZodOptional<z.ZodString>;
                color: z.ZodEnum<{
                    black: "black";
                    red: "red";
                    green: "green";
                    yellow: "yellow";
                    blue: "blue";
                    magenta: "magenta";
                    cyan: "cyan";
                    white: "white";
                    gray: "gray";
                    bright_red: "bright_red";
                    bright_green: "bright_green";
                    bright_yellow: "bright_yellow";
                    bright_blue: "bright_blue";
                    bright_magenta: "bright_magenta";
                    bright_cyan: "bright_cyan";
                    bright_white: "bright_white";
                }>;
                show_recent_errors: z.ZodDefault<z.ZodBoolean>;
                icons: z.ZodOptional<z.ZodObject<{
                    ready: z.ZodDefault<z.ZodString>;
                    thinking: z.ZodDefault<z.ZodString>;
                    tool: z.ZodDefault<z.ZodString>;
                    error: z.ZodDefault<z.ZodString>;
                    warning: z.ZodDefault<z.ZodString>;
                }, z.core.$strip>>;
                nerd_icons: z.ZodOptional<z.ZodObject<{
                    ready: z.ZodDefault<z.ZodString>;
                    thinking: z.ZodDefault<z.ZodString>;
                    tool: z.ZodDefault<z.ZodString>;
                    error: z.ZodDefault<z.ZodString>;
                    warning: z.ZodDefault<z.ZodString>;
                }, z.core.$strip>>;
                text_icons: z.ZodOptional<z.ZodObject<{
                    ready: z.ZodDefault<z.ZodString>;
                    thinking: z.ZodDefault<z.ZodString>;
                    tool: z.ZodDefault<z.ZodString>;
                    error: z.ZodDefault<z.ZodString>;
                    warning: z.ZodDefault<z.ZodString>;
                }, z.core.$strip>>;
                colors: z.ZodOptional<z.ZodObject<{
                    ready: z.ZodDefault<z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>>;
                    thinking: z.ZodDefault<z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>>;
                    tool: z.ZodDefault<z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>>;
                    error: z.ZodDefault<z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>>;
                    warning: z.ZodDefault<z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>>;
                }, z.core.$strip>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        style: z.ZodOptional<z.ZodObject<{
            separator: z.ZodDefault<z.ZodString>;
            enable_colors: z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodLiteral<"auto">]>>;
            enable_emoji: z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodLiteral<"auto">]>>;
            enable_nerd_font: z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodLiteral<"auto">]>>;
            compact_mode: z.ZodDefault<z.ZodBoolean>;
            max_width: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>;
        advanced: z.ZodOptional<z.ZodObject<{
            cache_enabled: z.ZodDefault<z.ZodBoolean>;
            recent_error_count: z.ZodDefault<z.ZodNumber>;
            git_timeout: z.ZodDefault<z.ZodNumber>;
            debug_mode: z.ZodDefault<z.ZodBoolean>;
            custom_color_codes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>>;
        experimental: z.ZodOptional<z.ZodObject<{
            show_context_health: z.ZodDefault<z.ZodBoolean>;
            adaptive_colors: z.ZodDefault<z.ZodBoolean>;
            show_timestamp: z.ZodDefault<z.ZodBoolean>;
            show_session_info: z.ZodDefault<z.ZodBoolean>;
            force_nerd_font: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>>;
        templates: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            description: z.ZodOptional<z.ZodString>;
            style: z.ZodOptional<z.ZodObject<{
                separator: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                enable_colors: z.ZodOptional<z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodLiteral<"auto">]>>>;
                enable_emoji: z.ZodOptional<z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodLiteral<"auto">]>>>;
                enable_nerd_font: z.ZodOptional<z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodLiteral<"auto">]>>>;
                compact_mode: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                max_width: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            }, z.core.$strip>>;
            components: z.ZodOptional<z.ZodObject<{
                order: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
                project: z.ZodOptional<z.ZodOptional<z.ZodObject<{
                    enabled: z.ZodDefault<z.ZodBoolean>;
                    icon: z.ZodString;
                    nerd_icon: z.ZodOptional<z.ZodString>;
                    text_icon: z.ZodOptional<z.ZodString>;
                    color: z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>;
                    show_when_empty: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>>>;
                model: z.ZodOptional<z.ZodOptional<z.ZodObject<{
                    enabled: z.ZodDefault<z.ZodBoolean>;
                    icon: z.ZodString;
                    nerd_icon: z.ZodOptional<z.ZodString>;
                    text_icon: z.ZodOptional<z.ZodString>;
                    color: z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>;
                    show_full_name: z.ZodDefault<z.ZodBoolean>;
                    custom_names: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
                }, z.core.$strip>>>;
                branch: z.ZodOptional<z.ZodOptional<z.ZodObject<{
                    enabled: z.ZodDefault<z.ZodBoolean>;
                    icon: z.ZodString;
                    nerd_icon: z.ZodOptional<z.ZodString>;
                    text_icon: z.ZodOptional<z.ZodString>;
                    color: z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>;
                    show_when_no_git: z.ZodDefault<z.ZodBoolean>;
                    max_length: z.ZodDefault<z.ZodNumber>;
                }, z.core.$strip>>>;
                tokens: z.ZodOptional<z.ZodOptional<z.ZodObject<{
                    enabled: z.ZodDefault<z.ZodBoolean>;
                    icon: z.ZodString;
                    nerd_icon: z.ZodOptional<z.ZodString>;
                    text_icon: z.ZodOptional<z.ZodString>;
                    color: z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>;
                    show_progress_bar: z.ZodDefault<z.ZodBoolean>;
                    show_percentage: z.ZodDefault<z.ZodBoolean>;
                    show_raw_numbers: z.ZodDefault<z.ZodBoolean>;
                    context_window: z.ZodDefault<z.ZodNumber>;
                    progress_bar_width: z.ZodDefault<z.ZodNumber>;
                    progress_bar_chars: z.ZodOptional<z.ZodObject<{
                        filled: z.ZodDefault<z.ZodString>;
                        empty: z.ZodDefault<z.ZodString>;
                        backup: z.ZodDefault<z.ZodString>;
                    }, z.core.$strip>>;
                    colors: z.ZodOptional<z.ZodObject<{
                        safe: z.ZodDefault<z.ZodEnum<{
                            black: "black";
                            red: "red";
                            green: "green";
                            yellow: "yellow";
                            blue: "blue";
                            magenta: "magenta";
                            cyan: "cyan";
                            white: "white";
                            gray: "gray";
                            bright_red: "bright_red";
                            bright_green: "bright_green";
                            bright_yellow: "bright_yellow";
                            bright_blue: "bright_blue";
                            bright_magenta: "bright_magenta";
                            bright_cyan: "bright_cyan";
                            bright_white: "bright_white";
                        }>>;
                        warning: z.ZodDefault<z.ZodEnum<{
                            black: "black";
                            red: "red";
                            green: "green";
                            yellow: "yellow";
                            blue: "blue";
                            magenta: "magenta";
                            cyan: "cyan";
                            white: "white";
                            gray: "gray";
                            bright_red: "bright_red";
                            bright_green: "bright_green";
                            bright_yellow: "bright_yellow";
                            bright_blue: "bright_blue";
                            bright_magenta: "bright_magenta";
                            bright_cyan: "bright_cyan";
                            bright_white: "bright_white";
                        }>>;
                        danger: z.ZodDefault<z.ZodEnum<{
                            black: "black";
                            red: "red";
                            green: "green";
                            yellow: "yellow";
                            blue: "blue";
                            magenta: "magenta";
                            cyan: "cyan";
                            white: "white";
                            gray: "gray";
                            bright_red: "bright_red";
                            bright_green: "bright_green";
                            bright_yellow: "bright_yellow";
                            bright_blue: "bright_blue";
                            bright_magenta: "bright_magenta";
                            bright_cyan: "bright_cyan";
                            bright_white: "bright_white";
                        }>>;
                    }, z.core.$strip>>;
                    thresholds: z.ZodOptional<z.ZodObject<{
                        warning: z.ZodDefault<z.ZodNumber>;
                        danger: z.ZodDefault<z.ZodNumber>;
                        backup: z.ZodDefault<z.ZodNumber>;
                        critical: z.ZodDefault<z.ZodNumber>;
                    }, z.core.$strip>>;
                    status_icons: z.ZodOptional<z.ZodObject<{
                        backup: z.ZodDefault<z.ZodString>;
                        critical: z.ZodDefault<z.ZodString>;
                    }, z.core.$strip>>;
                    status_nerd_icons: z.ZodOptional<z.ZodObject<{
                        backup: z.ZodDefault<z.ZodString>;
                        critical: z.ZodDefault<z.ZodString>;
                    }, z.core.$strip>>;
                    status_text_icons: z.ZodOptional<z.ZodObject<{
                        backup: z.ZodDefault<z.ZodString>;
                        critical: z.ZodDefault<z.ZodString>;
                    }, z.core.$strip>>;
                }, z.core.$strip>>>;
                status: z.ZodOptional<z.ZodOptional<z.ZodObject<{
                    enabled: z.ZodDefault<z.ZodBoolean>;
                    icon: z.ZodString;
                    nerd_icon: z.ZodOptional<z.ZodString>;
                    text_icon: z.ZodOptional<z.ZodString>;
                    color: z.ZodEnum<{
                        black: "black";
                        red: "red";
                        green: "green";
                        yellow: "yellow";
                        blue: "blue";
                        magenta: "magenta";
                        cyan: "cyan";
                        white: "white";
                        gray: "gray";
                        bright_red: "bright_red";
                        bright_green: "bright_green";
                        bright_yellow: "bright_yellow";
                        bright_blue: "bright_blue";
                        bright_magenta: "bright_magenta";
                        bright_cyan: "bright_cyan";
                        bright_white: "bright_white";
                    }>;
                    show_recent_errors: z.ZodDefault<z.ZodBoolean>;
                    icons: z.ZodOptional<z.ZodObject<{
                        ready: z.ZodDefault<z.ZodString>;
                        thinking: z.ZodDefault<z.ZodString>;
                        tool: z.ZodDefault<z.ZodString>;
                        error: z.ZodDefault<z.ZodString>;
                        warning: z.ZodDefault<z.ZodString>;
                    }, z.core.$strip>>;
                    nerd_icons: z.ZodOptional<z.ZodObject<{
                        ready: z.ZodDefault<z.ZodString>;
                        thinking: z.ZodDefault<z.ZodString>;
                        tool: z.ZodDefault<z.ZodString>;
                        error: z.ZodDefault<z.ZodString>;
                        warning: z.ZodDefault<z.ZodString>;
                    }, z.core.$strip>>;
                    text_icons: z.ZodOptional<z.ZodObject<{
                        ready: z.ZodDefault<z.ZodString>;
                        thinking: z.ZodDefault<z.ZodString>;
                        tool: z.ZodDefault<z.ZodString>;
                        error: z.ZodDefault<z.ZodString>;
                        warning: z.ZodDefault<z.ZodString>;
                    }, z.core.$strip>>;
                    colors: z.ZodOptional<z.ZodObject<{
                        ready: z.ZodDefault<z.ZodEnum<{
                            black: "black";
                            red: "red";
                            green: "green";
                            yellow: "yellow";
                            blue: "blue";
                            magenta: "magenta";
                            cyan: "cyan";
                            white: "white";
                            gray: "gray";
                            bright_red: "bright_red";
                            bright_green: "bright_green";
                            bright_yellow: "bright_yellow";
                            bright_blue: "bright_blue";
                            bright_magenta: "bright_magenta";
                            bright_cyan: "bright_cyan";
                            bright_white: "bright_white";
                        }>>;
                        thinking: z.ZodDefault<z.ZodEnum<{
                            black: "black";
                            red: "red";
                            green: "green";
                            yellow: "yellow";
                            blue: "blue";
                            magenta: "magenta";
                            cyan: "cyan";
                            white: "white";
                            gray: "gray";
                            bright_red: "bright_red";
                            bright_green: "bright_green";
                            bright_yellow: "bright_yellow";
                            bright_blue: "bright_blue";
                            bright_magenta: "bright_magenta";
                            bright_cyan: "bright_cyan";
                            bright_white: "bright_white";
                        }>>;
                        tool: z.ZodDefault<z.ZodEnum<{
                            black: "black";
                            red: "red";
                            green: "green";
                            yellow: "yellow";
                            blue: "blue";
                            magenta: "magenta";
                            cyan: "cyan";
                            white: "white";
                            gray: "gray";
                            bright_red: "bright_red";
                            bright_green: "bright_green";
                            bright_yellow: "bright_yellow";
                            bright_blue: "bright_blue";
                            bright_magenta: "bright_magenta";
                            bright_cyan: "bright_cyan";
                            bright_white: "bright_white";
                        }>>;
                        error: z.ZodDefault<z.ZodEnum<{
                            black: "black";
                            red: "red";
                            green: "green";
                            yellow: "yellow";
                            blue: "blue";
                            magenta: "magenta";
                            cyan: "cyan";
                            white: "white";
                            gray: "gray";
                            bright_red: "bright_red";
                            bright_green: "bright_green";
                            bright_yellow: "bright_yellow";
                            bright_blue: "bright_blue";
                            bright_magenta: "bright_magenta";
                            bright_cyan: "bright_cyan";
                            bright_white: "bright_white";
                        }>>;
                        warning: z.ZodDefault<z.ZodEnum<{
                            black: "black";
                            red: "red";
                            green: "green";
                            yellow: "yellow";
                            blue: "blue";
                            magenta: "magenta";
                            cyan: "cyan";
                            white: "white";
                            gray: "gray";
                            bright_red: "bright_red";
                            bright_green: "bright_green";
                            bright_yellow: "bright_yellow";
                            bright_blue: "bright_blue";
                            bright_magenta: "bright_magenta";
                            bright_cyan: "bright_cyan";
                            bright_white: "bright_white";
                        }>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>>>;
            }, z.core.$strip>>;
        }, z.core.$loose>>>;
    }, z.core.$loose>;
}, z.core.$strip>;
type ComponentConfig = z.infer<typeof BaseComponentSchema>;
type StyleConfig = z.infer<typeof StyleSchema>;
interface ThemeConfig {
    name: string;
    style?: Partial<StyleConfig>;
    components?: Partial<z.infer<typeof ComponentsSchema>>;
}
interface ComponentOptions {
    id: string;
    enabled?: boolean;
    [key: string]: unknown;
}
interface ComponentMetadata {
    name: string;
    version: string;
    description?: string;
    dependencies?: string[];
}
interface RenderOptions {
    forceColors?: boolean;
    forceEmoji?: boolean;
    forceNerdFont?: boolean;
    maxWidth?: number;
}
interface LivePreviewOptions$1 {
    configPath?: string;
    theme?: string;
    refreshInterval?: number;
    maxScenarios?: number;
    debug?: boolean;
    dynamicBanner?: boolean;
}
interface ConfigEditorOptions$1 {
    configPath?: string;
    enableLivePreview?: boolean;
    autoSave?: boolean;
}
interface MockScenario$1 {
    id: string;
    name: string;
    description: string;
    inputData: InputData;
    tokenUsage?: number;
    expectedStatus?: 'ready' | 'thinking' | 'tool_use' | 'error' | 'complete';
}
type Config = z.infer<typeof ConfigSchema>;
type InputData = z.infer<typeof InputDataSchema>;
type RenderContext = z.infer<typeof RenderContextSchema>;
type ProjectComponentConfig = z.infer<typeof ProjectComponentSchema>;
type ModelComponentConfig = z.infer<typeof ModelComponentSchema>;
type BranchComponentConfig = z.infer<typeof BranchComponentSchema>;
type TokensComponentConfig = z.infer<typeof TokenComponentSchema>;
type StatusComponentConfig = z.infer<typeof StatusComponentSchema>;

/**
 * 生成器选项 | Generator options
 */
interface GeneratorOptions {
    preset?: string;
    updateThrottling?: boolean;
    disableCache?: boolean;
}
/**
 * 核心状态行生成器 | Core statusline generator
 * 整合所有组件，生成最终的状态行 | Integrates all components to generate the final statusline
 */
declare class StatuslineGenerator {
    private config;
    private componentRegistry;
    private renderer?;
    private lastUpdate;
    private lastResult;
    private updateInterval;
    private disableCache;
    constructor(config: Config, options?: GeneratorOptions);
    /**
     * 初始化组件注册表 | Initialize component registry
     */
    private initializeComponents;
    /**
     * 生成状态行 | Generate statusline
     */
    generate(inputData: InputData): Promise<string>;
    /**
     * 获取组件顺序 | Get component order
     */
    private getComponentOrder;
    /**
     * 解析预设字符串 | Parse preset string
     */
    private parsePreset;
    /**
     * 获取组件配置 | Get component configuration
     */
    private getComponentConfig;
    /**
     * 检查是否应该更新 | Check if should update
     */
    private shouldUpdate;
    /**
     * 生成后备状态 | Generate fallback status
     */
    private generateFallbackStatus;
    /**
     * 更新配置 | Update configuration
     */
    updateConfig(newConfig: Config): void;
    /**
     * 获取当前配置 | Get current configuration
     */
    getConfig(): Config;
    /**
     * 获取终端能力信息 | Get terminal capability info
     */
    getTerminalCapabilities(): Record<string, unknown>;
    /**
     * 强制刷新 | Force refresh
     */
    forceRefresh(): void;
}

/**
 * 交互式配置编辑器 - Interactive Configuration Editor
 * 核心功能: 全屏终端界面、实时预览集成、键盘导航
 *
 * 特性:
 * - Inquirer.js 驱动的交互式界面
 * - 实时预览配置变更效果
 * - 键盘导航和快捷键支持
 * - 配置项验证和错误提示
 * - 多层级配置管理 (组件/样式/主题)
 */
/**
 * 配置编辑器选项
 */
interface ConfigEditorOptions {
    /** 配置文件路径 */
    configPath?: string;
    /** 是否启用实时预览 */
    enableLivePreview?: boolean;
    /** 是否自动保存 */
    autoSave?: boolean;
}
/**
 * 配置菜单项接口
 */
/**
 * 交互式配置编辑器类
 */
declare class ConfigEditor {
    private configLoader;
    private previewEngine;
    private terminalDetector;
    private currentConfig;
    private options;
    private hasUnsavedChanges;
    constructor(options?: ConfigEditorOptions);
    /**
     * 启动交互式配置模式
     */
    startInteractiveMode(): Promise<void>;
    /**
     * 加载配置
     */
    private loadConfiguration;
    /**
     * 检查终端兼容性
     */
    private checkTerminalCompatibility;
    /**
     * 渲染实时预览界面
     */
    private renderLivePreviewInterface;
    /**
     * 运行主配置循环
     */
    private runConfigurationLoop;
    /**
     * 显示主菜单
     */
    private showMainMenu;
    /**
     * 配置组件
     */
    private configureComponents;
    /**
     * 配置单个组件
     */
    private configureIndividualComponent;
    /**
     * 配置主题
     */
    private configureThemes;
    /**
     * 配置样式
     */
    private configureStyles;
    /**
     * 配置预设
     */
    private configurePresets;
    /**
     * 重置配置
     */
    private resetConfiguration;
    /**
     * 保存配置
     */
    private saveConfiguration;
    /**
     * 处理退出
     */
    private handleExit;
    /**
     * 等待按键
     */
    private waitForKeyPress;
}
/**
 * 工厂函数 - 创建配置编辑器实例
 */
declare function createConfigEditor(options?: ConfigEditorOptions): ConfigEditor;

/**
 * Mock数据生成器 - 实时预览系统核心
 * 生成各种状态和使用场景的模拟数据，支持多场景预览和测试
 */

/**
 * Mock场景接口定义
 */
interface MockScenario {
    /** 场景标识符 */
    id: string;
    /** 场景名称 */
    name: string;
    /** 场景描述 */
    description: string;
    /** 输入数据 */
    inputData: InputData;
    /** Token使用率 (0-100) */
    tokenUsage?: number;
    /** 预期状态 */
    expectedStatus?: 'ready' | 'thinking' | 'tool_use' | 'error' | 'complete';
}
/**
 * Mock数据生成器类
 */
declare class MockDataGenerator {
    private scenarios;
    constructor();
    /**
     * 初始化所有Mock场景
     */
    private initializeScenarios;
    /**
     * 根据场景ID生成Mock数据
     */
    generate(scenarioId: string): InputData;
    /**
     * 获取场景详情
     */
    getScenario(scenarioId: string): MockScenario | undefined;
    /**
     * 获取所有可用场景
     */
    getAvailableScenarios(): string[];
    /**
     * 获取所有场景详情
     */
    getAllScenarios(): MockScenario[];
    /**
     * 根据token使用率筛选场景
     */
    getScenariosByTokenUsage(minUsage: number, maxUsage: number): MockScenario[];
    /**
     * 根据状态筛选场景
     */
    getScenariosByStatus(status: MockScenario['expectedStatus']): MockScenario[];
    /**
     * 生成随机场景数据
     */
    generateRandom(): InputData;
    /**
     * 添加自定义场景
     */
    addCustomScenario(scenario: MockScenario): void;
    /**
     * 生成压力测试场景 - 极限token使用
     */
    generateStressTestScenario(): InputData;
}
/**
 * 默认导出Mock数据生成器实例
 */
declare const mockDataGenerator: MockDataGenerator;

/**
 * 终端能力检测器 | Terminal capability detector
 * 检测终端对颜色、表情符号、Nerd Font的支持 | Detect terminal support for colors, emojis, Nerd Font
 */
/**
 * 终端能力接口 | Terminal capabilities interface
 */
interface TerminalCapabilities {
    colors: boolean;
    emoji: boolean;
    nerdFont: boolean;
}
/**
 * @deprecated Legacy class - use individual functions instead
 * 向后兼容性的遗留类 - 请使用独立函数
 */
/**
 * 别名和便捷包装类: 为向后兼容和简化使用
 */
declare class TerminalDetector {
    detectCapabilities(): TerminalCapabilities;
    getCapabilityInfo(): Record<string, unknown>;
}

/**
 * CLI消息图标管理器 | CLI message icon manager
 * 复用终端检测机制，为CLI消息提供三层回退图标系统
 *
 * @author wangnov
 * @date 2025-08-12T20:30:20+08:00
 */

/**
 * CLI消息图标管理器 | CLI message icon manager
 * 为CLI界面提供统一的图标管理，支持三层回退
 */
declare class CliMessageIconManager {
    private capabilities;
    private icons;
    constructor();
    /**
     * 获取图标 | Get icon
     */
    getIcon(iconName: string): string;
    /**
     * 设置CLI图标系统 | Setup CLI icon system
     */
    private setupCliIcons;
    /**
     * 格式化消息与图标 | Format message with icon
     */
    format(iconName: string, message: string): string;
    /**
     * 获取终端能力信息 | Get terminal capabilities
     */
    getCapabilities(): TerminalCapabilities;
    /**
     * 强制刷新终端检测 | Force refresh terminal detection
     */
    refresh(): void;
}
/**
 * 获取全局CLI图标管理器 | Get global CLI icon manager
 */
declare function getCliIconManager(): CliMessageIconManager;
/**
 * 便捷函数：格式化CLI消息 | Convenience function: format CLI message
 */
declare function formatCliMessage(iconName: string, message: string): string;
/**
 * 便捷函数：获取CLI图标 | Convenience function: get CLI icon
 */
declare function getCliIcon(iconName: string): string;

/**
 * 实时预览引擎 - Live Preview Engine
 * 核心功能: 多场景并行渲染、实时配置更新、动态状态展示
 *
 * 特性:
 * - 多场景Mock数据同时预览
 * - 实时配置变更响应 (<100ms)
 * - 动态状态指示器和进度条
 * - 智能终端兼容性检测
 * - 可配置刷新频率和显示模式
 */

/**
 * 预览引擎配置接口
 */
interface LivePreviewOptions {
    /** 配置文件路径 */
    configPath?: string;
    /** 指定主题 */
    theme?: string;
    /** 刷新频率(毫秒) */
    refreshInterval?: number;
    /** 显示场景数量 */
    maxScenarios?: number;
    /** 是否显示调试信息 */
    debug?: boolean;
    /** 是否启用动态Banner */
    dynamicBanner?: boolean;
}
/**
 * 实时预览引擎类
 */
declare class LivePreviewEngine {
    private generator;
    private configLoader;
    private mockGenerator;
    private terminalDetector;
    private currentConfig;
    private options;
    private isRunning;
    constructor(options?: LivePreviewOptions);
    /**
     * 公开的初始化方法
     */
    initialize(): Promise<void>;
    /**
     * 异步初始化 - 私有方法，确保初始化
     */
    private ensureInitialized;
    /**
     * 启动实时预览模式
     */
    startLivePreview(): Promise<void>;
    /**
     * 停止实时预览
     */
    stopLivePreview(): void;
    /**
     * 渲染实时预览界面
     */
    private renderLivePreview;
    /**
     * 渲染静态预览 - 用于preview子命令
     */
    renderStaticPreview(scenarioIds: string[]): Promise<void>;
    /**
     * 更新配置并刷新预览
     */
    updateConfig(changes: Partial<Config>): Promise<void>;
    /**
     * 获取要预览的场景列表
     */
    private getSelectedScenarios;
    /**
     * 渲染单个场景
     */
    private renderScenario;
    /**
     * 渲染标题栏
     */
    private renderHeader;
    /**
     * 渲染动态Banner
     */
    private renderDynamicBanner;
    /**
     * 渲染配置信息
     */
    private renderConfigInfo;
    /**
     * 渲染场景预览
     */
    private renderScenariosPreview;
    /**
     * 渲染快捷键帮助
     */
    private renderShortcutsHelp;
    /**
     * 获取不包含ANSI代码的可见文本长度
     */
    private getVisibleLength;
    /**
     * 对包含ANSI代码的文本进行可视化padding
     */
    private padEndVisible;
    /**
     * 获取终端宽度
     */
    private getTerminalWidth;
    /**
     * 格式化场景输出
     */
    private formatScenarioOutput;
    /**
     * 安全截断包含ANSI代码的文本
     */
    private truncateWithAnsi;
    /**
     * 格式化标题
     */
    private formatTitle;
    /**
     * 格式化分隔线
     */
    private formatSeparator;
    /**
     * 清屏
     */
    private clearScreen;
    /**
     * 处理键盘输入 (用于交互式模式)
     */
    private setupKeyboardHandling;
    /**
     * 获取当前配置
     */
    getCurrentConfig(): Config;
    /**
     * 获取可用场景列表
     */
    getAvailableScenarios(): string[];
}
/**
 * 工厂函数 - 创建预览引擎实例
 */
declare function createLivePreviewEngine(options?: LivePreviewOptions): LivePreviewEngine;

/**
 * 组件渲染结果接口 | Component render result interface
 */
interface ComponentResult {
    /** 渲染后的字符串内容，null表示不显示 | Rendered string content, null means not displayed */
    content: string | null;
    /** 是否成功渲染 | Whether rendering was successful */
    success: boolean;
    /** 错误信息（如果有） | Error message (if any) */
    error?: string;
}
/**
 * 组件基类接口 | Component base interface
 */
interface Component {
    /** 组件名称 | Component name */
    readonly name: string;
    /** 是否启用 | Whether enabled */
    readonly enabled: boolean;
    /** 渲染组件 | Render component */
    render(context: RenderContext): ComponentResult | Promise<ComponentResult>;
}
/**
 * 抽象组件基类 | Abstract component base class
 * 提供通用的组件功能和模板方法 | Provides common component functionality and template methods
 */
declare abstract class BaseComponent implements Component {
    readonly name: string;
    protected config: ComponentConfig;
    protected renderContext?: RenderContext;
    constructor(name: string, config: ComponentConfig);
    /** 组件是否启用 | Whether component is enabled */
    get enabled(): boolean;
    /**
     * 渲染组件 | Render component
     */
    render(context: RenderContext): ComponentResult | Promise<ComponentResult>;
    /**
     * 渲染组件内容 - 子类需要实现 | Render component content - subclasses need to implement
     */
    protected abstract renderContent(context: RenderContext): string | null | Promise<string | null>;
    /**
     * 获取颜色代码 | Get color code
     */
    protected getColor(colorName: string): string;
    /**
     * 获取重置颜色代码 | Get reset color code
     */
    protected getResetColor(): string;
    /**
     * 获取图标 | Get icon
     */
    protected getIcon(iconName: string): string;
    /**
     * 应用颜色和重置 | Apply color and reset
     */
    protected colorize(content: string, colorName: string): string;
    /**
     * 格式化组件输出 | Format component output
     */
    protected formatOutput(icon: string, text: string, colorName?: string): string;
}
/**
 * 组件工厂接口 | Component factory interface
 */
interface ComponentFactory {
    /** 创建组件实例 | Create component instance */
    createComponent(name: string, config: ComponentConfig): Component;
    /** 获取支持的组件类型 | Get supported component types */
    getSupportedTypes(): string[];
}
/**
 * 组件注册表 | Component registry
 */
declare class ComponentRegistry {
    private factories;
    /**
     * 注册组件工厂 | Register component factory
     */
    register(type: string, factory: ComponentFactory): void;
    /**
     * 创建组件 | Create component
     */
    create(type: string, name: string, config: ComponentConfig): Component | null;
    /**
     * 获取所有注册的组件类型 | Get all registered component types
     */
    getRegisteredTypes(): string[];
}

/**
 * 分支组件 | Branch component
 * 显示当前Git分支信息 | Display current Git branch information
 */
declare class BranchComponent extends BaseComponent {
    private branchConfig;
    constructor(name: string, config: BranchComponentConfig);
    protected renderContent(context: RenderContext): string | null;
}

/**
 * 模型组件 | Model component
 * 显示当前使用的模型信息 | Display current model information
 */
declare class ModelComponent extends BaseComponent {
    private modelConfig;
    constructor(name: string, config: ModelComponentConfig);
    protected renderContent(context: RenderContext): string | null;
    /**
     * 获取模型配置信息 | Get model configuration info
     */
    private getModelInfo;
}

/**
 * 项目组件 | Project component
 * 显示当前项目/目录名称 | Display current project/directory name
 */
declare class ProjectComponent extends BaseComponent {
    private projectConfig;
    constructor(name: string, config: ProjectComponentConfig);
    protected renderContent(context: RenderContext): string | null;
}

/**
 * Status组件 | Status component
 * 显示当前Claude会话状态 | Display current Claude session status
 */
declare class StatusComponent extends BaseComponent {
    private statusConfig;
    private cachedStatus;
    private lastTranscriptMtime;
    constructor(name: string, config: StatusComponentConfig);
    protected renderContent(context: RenderContext): string | null;
    /**
     * 渲染Mock状态 | Render mock status
     */
    private renderMockStatus;
    /**
     * 渲染默认状态 | Render default status
     */
    private renderDefaultStatus;
    /**
     * 解析transcript状态 | Parse transcript status
     */
    private parseTranscriptStatus;
    /**
     * 检测条目是否包含真正的错误 | Detect if entry contains real errors
     */
    private isErrorEntry;
    /**
     * 获取错误详细信息 | Get error details
     */
    private getErrorDetails;
    /**
     * 格式化状态显示 | Format status display
     */
    private formatStatusDisplay;
    /**
     * 获取默认颜色 | Get default color
     */
    private getDefaultColor;
}

/**
 * Tokens组件 | Tokens component
 * 显示当前上下文Token使用情况 | Display current context token usage
 */
declare class TokensComponent extends BaseComponent {
    private tokensConfig;
    private cachedTranscriptData;
    private lastTranscriptMtime;
    constructor(name: string, config: TokensComponentConfig);
    protected renderContent(context: RenderContext): string | null;
    /**
     * 渲染Mock数据 | Render mock token data
     */
    private renderMockTokenData;
    /**
     * 渲染无transcript文件时的显示 | Render display when no transcript file
     */
    private renderNoTranscript;
    /**
     * 解析transcript文件 | Parse transcript file
     */
    private parseTranscriptFile;
    /**
     * 获取上下文窗口大小 | Get context window size
     */
    private getContextWindow;
    /**
     * 生成进度条 | Generate progress bar
     */
    private generateProgressBar;
    /**
     * 格式化Token显示 | Format token display
     */
    private formatTokenDisplay;
}

interface ConfigLoadOptions {
    customPath?: string | undefined;
    overridePreset?: string | undefined;
}
declare class ConfigLoader {
    private cachedConfig;
    private configPath;
    /**
     * 查找配置文件 | Find config file
     */
    private findConfigFile;
    /**
     * 深度合并对象 | Deep merge objects
     */
    private deepMerge;
    /**
     * 清理对象中的 Symbol 属性 | Clean Symbol properties from objects
     * TOML 解析器会在数组上添加 Symbol 元数据，需要清理以避免序列化错误
     */
    private cleanSymbols;
    /**
     * 应用预设配置 | Apply preset configuration
     */
    private applyPreset;
    /**
     * 加载配置 | Load configuration
     */
    loadConfig(options?: ConfigLoadOptions): Promise<Config>;
    /**
     * 获取配置路径 | Get config path
     */
    getConfigPath(): string | null;
    /**
     * 清除缓存 | Clear cache
     */
    clearCache(): void;
    /**
     * 验证配置文件 | Validate config file
     */
    validateConfig(configPath?: string): Promise<{
        valid: boolean;
        errors: string[];
    }>;
    /**
     * 别名方法 - 为了向后兼容
     */
    load(configPath?: string): Promise<Config>;
    /**
     * 获取配置源路径
     */
    getConfigSource(): string | null;
    /**
     * 检查配置文件是否存在
     */
    configExists(configPath?: string): Promise<boolean>;
    /**
     * 创建默认配置文件
     */
    createDefaultConfig(configPath?: string): Promise<void>;
    /**
     * 保存配置到文件
     */
    save(config: Config, configPath?: string): Promise<void>;
    /**
     * 重置配置到默认值
     */
    resetToDefaults(configPath?: string): Promise<void>;
    /**
     * 应用主题
     */
    applyTheme(themeName: string, configPath?: string): Promise<void>;
    /**
     * 获取默认配置
     */
    getDefaultConfig(): Config;
}

/**
 * 解析结果接口 | Parse result interface
 */
interface ParseResult {
    success: boolean;
    data?: InputData;
    error?: string;
}
/**
 * 解析JSON输入 | Parse JSON input
 */
declare function parseJson(input: string): ParseResult;
/**
 * 解析输入并处理官方标准格式 | Parse input and handle official standard format
 */
declare function parseInput(): Promise<ParseResult>;
/**
 * 验证输入数据格式 | Validate input data format
 */
declare function validate(data: unknown): ParseResult;
/**
 * 处理命令行参数 | Handle command line arguments
 */
declare function parseArguments(args: string[]): Partial<InputData>;
/**
 * 合并输入数据 | Merge input data
 */
declare function mergeInputData(base: InputData, override: Partial<InputData>): InputData;
/**
 * 获取调试信息 | Get debug information
 */
declare function getDebugInfo(data: InputData): Record<string, unknown>;

/**
 * 颜色映射接口 | Color mapping interface
 */
interface ColorMap {
    [colorName: string]: string;
}
/**
 * 图标映射接口 | Icon mapping interface
 */
interface IconMap {
    [iconName: string]: string;
}
/**
 * 终端颜色和图标管理器 | Terminal color and icon manager
 */
declare class TerminalRenderer {
    private colors;
    private icons;
    private capabilities;
    constructor(capabilities: TerminalCapabilities, config: Config);
    /**
     * 获取颜色代码 | Get color code
     */
    getColor(colorName: string): string;
    /**
     * 获取图标 | Get icon
     */
    getIcon(iconName: string): string;
    /**
     * 获取重置颜色代码 | Get reset color code
     */
    getReset(): string;
    /**
     * 应用颜色 | Apply color
     */
    colorize(text: string, colorName: string): string;
    /**
     * 设置颜色系统 | Setup color system
     */
    private setupColors;
    /**
     * 设置图标系统 | Setup icon system
     */
    private setupIcons;
    /**
     * 获取所有颜色 | Get all colors
     */
    getColors(): ColorMap;
    /**
     * 获取所有图标 | Get all icons
     */
    getIcons(): IconMap;
    /**
     * 获取终端能力 | Get terminal capabilities
     */
    getCapabilities(): TerminalCapabilities;
    /**
     * 创建格式化字符串 | Create formatted string
     */
    format(icon: string, text: string, colorName?: string): string;
}
declare const ColorSystem: typeof TerminalRenderer;
declare const IconSystem: typeof TerminalRenderer;

/**
 * 工具函数集合
 * 提供常用的工具函数和辅助方法
 */
/**
 * 格式化字节大小
 */
declare function formatBytes(bytes: number): string;
/**
 * 格式化数字为千位分隔符形式
 */
declare function formatNumber(num: number): string;
/**
 * 截断字符串到指定长度
 */
declare function truncateString(str: string, maxLength: number, suffix?: string): string;
/**
 * 获取项目名称从路径
 */
declare function getProjectName(projectPath: string): string;
/**
 * 计算百分比
 */
declare function calculatePercentage(used: number, total: number): number;
/**
 * 生成进度条
 */
declare function generateProgressBar(percentage: number, length?: number, fillChar?: string, emptyChar?: string, warningThreshold?: number, criticalThreshold?: number): string;
/**
 * 获取Git分支简化名称
 */
declare function simplifyBranchName(branchName: string, maxLength?: number): string;
/**
 * 深度合并对象
 */
declare function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T;
/**
 * 检测操作系统
 */
declare function getOS(): 'windows' | 'macos' | 'linux' | 'unknown';
/**
 * 安全的JSON解析
 */
declare function safeJsonParse<T = unknown>(str: string, fallback: T): T;
/**
 * 防抖函数
 */
declare function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void;
/**
 * 节流函数
 */
declare function throttle<T extends (...args: unknown[]) => void>(func: T, limit: number): (...args: Parameters<T>) => void;
/**
 * 生成随机ID
 */
declare function generateId(prefix?: string, length?: number): string;
/**
 * 时间格式化
 */
declare function formatTime(date?: Date): string;
/**
 * 获取相对时间描述
 */
declare function getRelativeTime(timestamp: string | Date): string;

/**
 * 版本信息
 */
declare const VERSION = "2.0.0-beta.1";

/**
 * 快捷工厂函数 - 创建statusline生成器实例
 */
declare function createStatuslineGenerator(configPath?: string): Promise<StatuslineGenerator>;
/**
 * 快捷函数 - 直接生成statusline
 */
declare function generateStatusline(inputData: InputData, configPath?: string): Promise<string>;
/**
 * 类型保护函数 - 检查是否为有效的InputData
 */
declare function isValidInputData(data: unknown): data is InputData;
/**
 * 工具函数 - 获取默认配置
 */
declare function getDefaultConfig(): Promise<Record<string, unknown>>;
/**
 * 工具函数 - 验证配置
 */
declare function validateConfig(_config: unknown): Promise<boolean>;

export { BranchComponent, type BranchComponentConfig, BranchComponentSchema, CliMessageIconManager, ColorSystem, type Component, type ComponentConfig, type ComponentFactory, type ComponentMetadata, type ComponentOptions, ComponentRegistry, type Config, ConfigEditor, type ConfigEditorOptions$1 as ConfigEditorOptions, ConfigLoader, ConfigSchema, IconSystem, type InputData, InputDataSchema, LivePreviewEngine, type LivePreviewOptions$1 as LivePreviewOptions, MockDataGenerator, type MockScenario$1 as MockScenario, ModelComponent, type ModelComponentConfig, ModelComponentSchema, ProjectComponent, type ProjectComponentConfig, ProjectComponentSchema, type RenderContext, RenderContextSchema, type RenderOptions, StatusComponent, type StatusComponentConfig, StatusComponentSchema, StatuslineGenerator, type StyleConfig, TerminalDetector, type ThemeConfig, TokenComponentSchema, TokensComponent, type TokensComponentConfig, type TranscriptEntry, TranscriptEntrySchema, type UsageInfo, UsageInfoSchema, VERSION, calculatePercentage, createConfigEditor, createLivePreviewEngine, createStatuslineGenerator, debounce, deepMerge, StatuslineGenerator as default, formatBytes, formatCliMessage, formatNumber, formatTime, generateId, generateProgressBar, generateStatusline, getCliIcon, getCliIconManager, getDebugInfo, getDefaultConfig, getOS, getProjectName, getRelativeTime, isValidInputData, mergeInputData, mockDataGenerator, parseArguments, parseInput, parseJson, safeJsonParse, simplifyBranchName, throttle, truncateString, validate, validateConfig };
