//! Provider and model capability matching helpers.
//!
//! This module keeps provider endpoint/model matching rules in one place so
//! feature components can share the same matching semantics.

use std::{collections::HashMap, hash::BuildHasher};

use crate::config::{ModelPricingConfig, ModelProviderConfig};

pub const AUTO_CURRENCY: &str = "auto";
pub const DEFAULT_CURRENCY: &str = "USD";
pub const DEFAULT_CONTEXT_WINDOW: u64 = 200_000;

pub const BUILTIN_CONTEXT_WINDOW_RULES: &[(&str, u64)] = &[
    // Claude / Anthropic
    ("claude-opus-4-1-20250805", 200_000),
    ("claude-opus-4-20250514", 200_000),
    ("claude-sonnet-4-20250514", 200_000),
    ("claude-sonnet-4-20250514[1m]", 1_000_000),
    ("claude-3-7-sonnet-20250219", 200_000),
    ("claude-3-5-haiku-20241022", 200_000),
    ("claude-3-haiku-20240307", 200_000),
    // DeepSeek
    ("deepseek-v4-*", 1_000_000),
    ("deepseek-chat", 1_000_000),
    ("deepseek-reasoner", 1_000_000),
    ("deepseek-v3.1*", 131_072),
    ("deepseek-chat-v3.1*", 131_072),
    ("deepseek-v3-0324", 65_536),
    ("deepseek-chat-v3-0324", 65_536),
    ("deepseek-r1*", 65_536),
    ("deepseek-v4-flash", 1_000_000),
    ("deepseek-v4-pro", 1_000_000),
    // Qwen / Alibaba Model Studio
    ("qwen3.6-plus*", 1_000_000),
    ("qwen-plus*", 995_904),
    ("qwen-turbo*", 1_000_000),
    ("qwen-max*", 32_768),
    ("qwen3-max*", 262_144),
    ("qwen-long*", 10_000_000),
    ("qwen3-coder-plus*", 1_000_000),
    ("qwen3-coder-flash*", 1_000_000),
    ("qwen3-coder-next*", 262_144),
    ("qwen3-coder-480b-a35b-instruct", 262_144),
    ("qwen3-coder-30b-a3b-instruct", 262_144),
    // Moonshot / Kimi
    ("kimi-k2.6*", 262_144),
    ("kimi-k2.5*", 262_144),
    ("kimi-k2-0905*", 262_144),
    ("kimi-k2-turbo*", 262_144),
    ("kimi-k2-thinking*", 262_144),
    ("kimi-k2-0711*", 131_072),
    ("moonshot-v1-8k*", 8_192),
    ("moonshot-v1-32k*", 32_768),
    ("moonshot-v1-128k*", 131_072),
    // MiniMax
    ("minimax-m2*", 204_800),
    ("minimax-m1*", 1_000_000),
    ("minimax-text-01", 4_000_000),
    ("minimax-01", 4_000_000),
    ("abab6.5*", 200_000),
    // Xiaomi MiMo
    ("mimo-v2-flash*", 262_144),
    ("mimo-v2-pro*", 1_000_000),
    ("mimo-v2.5*", 1_000_000),
    ("mimo-v2.5-pro*", 1_000_000),
    // Doubao / Volcengine Ark
    ("doubao-seed-1.6*", 262_144),
    ("seed-1.6*", 262_144),
    ("doubao-seed-code*", 262_144),
    ("doubao-1.5-pro-32k", 32_768),
    ("doubao-1.5-pro-256k", 262_144),
    ("doubao-pro-32k", 32_768),
    ("doubao-pro-128k", 131_072),
    ("doubao-pro-256k", 262_144),
    // Tencent Hunyuan
    ("hunyuan-turbos-latest", 32_768),
    ("hunyuan-large", 28_672),
    ("hunyuan-large-longcontext", 131_072),
    ("hunyuan-lite", 262_144),
    ("hunyuan-standard", 30_720),
    ("hunyuan-standard-256k", 256_000),
    ("hunyuan-a13b", 262_144),
    // Zhipu / Z.ai GLM
    ("glm-5.1*", 202_745),
    ("glm-5-turbo*", 262_144),
    ("glm-5*", 202_752),
    ("glm-4.7*", 169_984),
    ("glm-4.6*", 200_000),
    ("glm-4.5*", 131_072),
    ("glm-4-plus", 131_072),
    ("glm-4-air-250414", 131_072),
    ("glm-4-airx", 8_192),
    ("glm-4-flashx-250414", 131_072),
    ("glm-4-flash-250414", 131_072),
    ("glm-z1-air", 131_072),
    ("glm-z1-airx", 32_768),
    ("glm-z1-flash*", 131_072),
];

const BUILTIN_ENDPOINT_CURRENCY_RULES: &[(&str, &str)] = &[
    ("open.bigmodel.cn", "CNY"),
    ("api.z.ai", "USD"),
    ("api.deepseek.com", "CNY"),
    ("api.minimaxi.com", "CNY"),
    ("api.minimax.io", "USD"),
    ("api.moonshot.cn", "CNY"),
    ("api.moonshot.ai", "USD"),
    ("dashscope.aliyuncs.com", "CNY"),
    ("dashscope-intl.aliyuncs.com", "USD"),
    ("dashscope-us.aliyuncs.com", "USD"),
    ("ark.cn-beijing.volces.com", "CNY"),
    ("ark.ap-southeast.bytepluses.com", "USD"),
    ("ark.eu-west.bytepluses.com", "USD"),
    ("api.hunyuan.cloud.tencent.com", "CNY"),
    ("qianfan.baidubce.com", "CNY"),
    ("xiaomimimo.com", "USD"),
];

const BUILTIN_MODEL_CURRENCY_RULES: &[(&str, &str)] = &[
    ("deepseek", "CNY"),
    ("kimi", "CNY"),
    ("moonshot", "CNY"),
    ("minimax", "CNY"),
    ("mimo", "USD"),
    ("glm", "CNY"),
    ("claude", "USD"),
    ("anthropic", "USD"),
    ("openai", "USD"),
    ("gpt", "USD"),
    ("o1", "USD"),
    ("o3", "USD"),
    ("o4", "USD"),
];

#[must_use]
pub fn default_context_windows() -> HashMap<String, u64> {
    let mut map = HashMap::new();
    map.insert("default".to_string(), DEFAULT_CONTEXT_WINDOW);
    for (model, window) in BUILTIN_CONTEXT_WINDOW_RULES {
        map.insert((*model).to_string(), *window);
    }
    map
}

#[must_use]
#[allow(clippy::too_many_lines)]
pub fn default_model_providers() -> HashMap<String, ModelProviderConfig> {
    let mut providers = HashMap::new();

    providers.insert(
        "anthropic".to_string(),
        provider(
            ["api.anthropic.com"],
            [
                "claude-opus-4-1-20250805",
                "claude-opus-4-20250514",
                "claude-sonnet-4-20250514",
                "claude-3-7-sonnet-20250219",
                "claude-3-5-haiku-20241022",
                "claude-3-haiku-20240307",
            ],
            "USD",
            [
                ("claude-opus-4-1-20250805", 200_000),
                ("claude-opus-4-20250514", 200_000),
                ("claude-sonnet-4-20250514", 200_000),
                ("claude-sonnet-4-20250514[1m]", 1_000_000),
                ("claude-3-7-sonnet-20250219", 200_000),
                ("claude-3-5-haiku-20241022", 200_000),
                ("claude-3-haiku-20240307", 200_000),
            ],
            [],
        ),
    );

    providers.insert(
        "deepseek".to_string(),
        provider(
            ["api.deepseek.com"],
            [
                "deepseek-v4-*",
                "deepseek-v4-flash",
                "deepseek-v4-pro",
                "deepseek-chat",
                "deepseek-reasoner",
                "deepseek-v3.1*",
                "deepseek-chat-v3.1*",
                "deepseek-v3-0324",
                "deepseek-chat-v3-0324",
                "deepseek-r1*",
            ],
            "CNY",
            [
                ("deepseek-v4-*", 1_000_000),
                ("deepseek-v4-flash", 1_000_000),
                ("deepseek-v4-pro", 1_000_000),
                ("deepseek-chat", 1_000_000),
                ("deepseek-reasoner", 1_000_000),
                ("deepseek-v3.1*", 131_072),
                ("deepseek-chat-v3.1*", 131_072),
                ("deepseek-v3-0324", 65_536),
                ("deepseek-chat-v3-0324", 65_536),
                ("deepseek-r1*", 65_536),
            ],
            [
                (
                    "deepseek-v4-flash",
                    pricing_with_cache(1_000_000.0, 1.00, 2.00, 0.02, None),
                ),
                (
                    "deepseek-chat",
                    pricing_with_cache(1_000_000.0, 1.00, 2.00, 0.02, None),
                ),
                (
                    "deepseek-v4-pro",
                    pricing_with_cache(1_000_000.0, 3.00, 6.00, 0.025, None),
                ),
                (
                    "deepseek-reasoner",
                    pricing_with_cache(1_000_000.0, 3.00, 6.00, 0.025, None),
                ),
            ],
        ),
    );

    let qwen_models = [
        "qwen3.6-plus*",
        "qwen-plus*",
        "qwen-turbo*",
        "qwen-max*",
        "qwen3-max*",
        "qwen-long*",
        "qwen3-coder-plus*",
        "qwen3-coder-flash*",
        "qwen3-coder-next*",
        "qwen3-coder-480b-a35b-instruct",
        "qwen3-coder-30b-a3b-instruct",
    ];
    let qwen_context = [
        ("qwen3.6-plus*", 1_000_000),
        ("qwen-plus*", 995_904),
        ("qwen-turbo*", 1_000_000),
        ("qwen-max*", 32_768),
        ("qwen3-max*", 262_144),
        ("qwen-long*", 10_000_000),
        ("qwen3-coder-plus*", 1_000_000),
        ("qwen3-coder-flash*", 1_000_000),
        ("qwen3-coder-next*", 262_144),
        ("qwen3-coder-480b-a35b-instruct", 262_144),
        ("qwen3-coder-30b-a3b-instruct", 262_144),
    ];

    providers.insert(
        "qwen_cn".to_string(),
        provider(
            ["dashscope.aliyuncs.com"],
            qwen_models,
            "CNY",
            qwen_context,
            [],
        ),
    );

    providers.insert(
        "qwen_global".to_string(),
        provider(
            ["dashscope-intl.aliyuncs.com", "dashscope-us.aliyuncs.com"],
            qwen_models,
            "USD",
            qwen_context,
            [],
        ),
    );

    let kimi_models = [
        "kimi-k2.6*",
        "kimi-k2.5*",
        "kimi-k2-0905*",
        "kimi-k2-turbo*",
        "kimi-k2-thinking*",
        "kimi-k2-0711*",
        "moonshot-v1-8k*",
        "moonshot-v1-32k*",
        "moonshot-v1-128k*",
    ];
    let kimi_context = [
        ("kimi-k2.6*", 262_144),
        ("kimi-k2.5*", 262_144),
        ("kimi-k2-0905*", 262_144),
        ("kimi-k2-turbo*", 262_144),
        ("kimi-k2-thinking*", 262_144),
        ("kimi-k2-0711*", 131_072),
        ("moonshot-v1-8k*", 8_192),
        ("moonshot-v1-32k*", 32_768),
        ("moonshot-v1-128k*", 131_072),
    ];

    providers.insert(
        "kimi_cn".to_string(),
        provider(
            ["api.moonshot.cn"],
            kimi_models,
            "CNY",
            kimi_context,
            [
                (
                    "kimi-k2.6*",
                    pricing_with_cache(1_000_000.0, 6.90, 29.00, 1.20, None),
                ),
                (
                    "kimi-k2-0905*",
                    pricing_with_cache(1_000_000.0, 4.00, 16.00, 1.00, None),
                ),
                (
                    "kimi-k2-0711*",
                    pricing_with_cache(1_000_000.0, 4.00, 16.00, 1.00, None),
                ),
                (
                    "kimi-k2-thinking",
                    pricing_with_cache(1_000_000.0, 4.00, 16.00, 1.00, None),
                ),
                (
                    "kimi-k2-thinking-turbo",
                    pricing_with_cache(1_000_000.0, 8.00, 55.00, 1.00, None),
                ),
                (
                    "kimi-k2-turbo*",
                    pricing_with_cache(1_000_000.0, 8.00, 55.00, 1.00, None),
                ),
            ],
        ),
    );

    providers.insert(
        "kimi_global".to_string(),
        provider(
            ["api.moonshot.ai"],
            kimi_models,
            "USD",
            kimi_context,
            [
                (
                    "kimi-k2.6*",
                    pricing_with_cache(1_000_000.0, 0.95, 4.00, 0.16, None),
                ),
                (
                    "kimi-k2-0905*",
                    pricing_with_cache(1_000_000.0, 0.60, 2.50, 0.15, None),
                ),
                (
                    "kimi-k2-0711*",
                    pricing_with_cache(1_000_000.0, 0.60, 2.50, 0.15, None),
                ),
                (
                    "kimi-k2-thinking",
                    pricing_with_cache(1_000_000.0, 0.60, 2.50, 0.15, None),
                ),
                (
                    "kimi-k2-thinking-turbo",
                    pricing_with_cache(1_000_000.0, 1.15, 8.00, 0.15, None),
                ),
                (
                    "kimi-k2-turbo*",
                    pricing_with_cache(1_000_000.0, 1.15, 8.00, 0.15, None),
                ),
            ],
        ),
    );

    let minimax_models = [
        "minimax-m2.7*",
        "minimax-m2.5*",
        "minimax-m2.1*",
        "minimax-m2*",
        "m2-her",
        "minimax-m1*",
        "minimax-text-01",
        "minimax-01",
        "abab6.5*",
    ];
    let minimax_context = [
        ("minimax-m2.7*", 204_800),
        ("minimax-m2.5*", 204_800),
        ("minimax-m2.1*", 204_800),
        ("minimax-m2*", 204_800),
        ("m2-her", 204_800),
        ("minimax-m1*", 1_000_000),
        ("minimax-text-01", 4_000_000),
        ("minimax-01", 4_000_000),
        ("abab6.5*", 200_000),
    ];

    providers.insert(
        "minimax_cn".to_string(),
        provider(
            ["api.minimaxi.com"],
            minimax_models,
            "CNY",
            minimax_context,
            [],
        ),
    );

    providers.insert(
        "minimax_global".to_string(),
        provider(
            ["api.minimax.io"],
            minimax_models,
            "USD",
            minimax_context,
            [
                (
                    "minimax-m2.7-highspeed*",
                    pricing_with_cache(1_000_000.0, 0.60, 2.40, 0.06, Some(0.375)),
                ),
                (
                    "minimax-m2.7*",
                    pricing_with_cache(1_000_000.0, 0.30, 1.20, 0.06, Some(0.375)),
                ),
                (
                    "minimax-m2.5-highspeed*",
                    pricing_with_cache(1_000_000.0, 0.60, 2.40, 0.03, Some(0.375)),
                ),
                (
                    "minimax-m2.5*",
                    pricing_with_cache(1_000_000.0, 0.30, 1.20, 0.03, Some(0.375)),
                ),
                (
                    "minimax-m2.1-highspeed*",
                    pricing_with_cache(1_000_000.0, 0.60, 2.40, 0.03, Some(0.375)),
                ),
                (
                    "minimax-m2.1*",
                    pricing_with_cache(1_000_000.0, 0.30, 1.20, 0.03, Some(0.375)),
                ),
                (
                    "minimax-m2*",
                    pricing_with_cache(1_000_000.0, 0.30, 1.20, 0.03, Some(0.375)),
                ),
                ("m2-her", pricing(1_000_000.0, 0.30, 1.20)),
            ],
        ),
    );

    providers.insert(
        "mimo".to_string(),
        provider(
            ["xiaomimimo.com"],
            [
                "mimo-v2-flash*",
                "mimo-v2-pro*",
                "mimo-v2.5*",
                "mimo-v2.5-pro*",
            ],
            "USD",
            [
                ("mimo-v2-flash*", 262_144),
                ("mimo-v2-pro*", 1_000_000),
                ("mimo-v2.5*", 1_000_000),
                ("mimo-v2.5-pro*", 1_000_000),
            ],
            [],
        ),
    );

    let doubao_models = [
        "doubao-seed-1.6*",
        "seed-1.6*",
        "doubao-seed-code*",
        "doubao-1.5-pro-32k",
        "doubao-1.5-pro-256k",
        "doubao-pro-32k",
        "doubao-pro-128k",
        "doubao-pro-256k",
    ];
    let doubao_context = [
        ("doubao-seed-1.6*", 262_144),
        ("seed-1.6*", 262_144),
        ("doubao-seed-code*", 262_144),
        ("doubao-1.5-pro-32k", 32_768),
        ("doubao-1.5-pro-256k", 262_144),
        ("doubao-pro-32k", 32_768),
        ("doubao-pro-128k", 131_072),
        ("doubao-pro-256k", 262_144),
    ];

    providers.insert(
        "doubao_cn".to_string(),
        provider(
            ["ark.cn-beijing.volces.com"],
            doubao_models,
            "CNY",
            doubao_context,
            [],
        ),
    );

    providers.insert(
        "doubao_global".to_string(),
        provider(
            [
                "ark.ap-southeast.bytepluses.com",
                "ark.eu-west.bytepluses.com",
            ],
            doubao_models,
            "USD",
            doubao_context,
            [],
        ),
    );

    providers.insert(
        "hunyuan".to_string(),
        provider(
            ["api.hunyuan.cloud.tencent.com"],
            [
                "hunyuan-turbos-latest",
                "hunyuan-large",
                "hunyuan-large-longcontext",
                "hunyuan-lite",
                "hunyuan-standard",
                "hunyuan-standard-256k",
                "hunyuan-a13b",
            ],
            "CNY",
            [
                ("hunyuan-turbos-latest", 32_768),
                ("hunyuan-large", 28_672),
                ("hunyuan-large-longcontext", 131_072),
                ("hunyuan-lite", 262_144),
                ("hunyuan-standard", 30_720),
                ("hunyuan-standard-256k", 256_000),
                ("hunyuan-a13b", 262_144),
            ],
            [],
        ),
    );

    let glm_models = [
        "glm-5.1*",
        "glm-5-turbo*",
        "glm-5*",
        "glm-4.7*",
        "glm-4.6*",
        "glm-4.5*",
        "glm-4-plus",
        "glm-4-air-250414",
        "glm-4-airx",
        "glm-4-flashx-250414",
        "glm-4-flash-250414",
        "glm-z1-air",
        "glm-z1-airx",
        "glm-z1-flash*",
    ];
    let glm_context = [
        ("glm-5.1*", 202_745),
        ("glm-5-turbo*", 262_144),
        ("glm-5*", 202_752),
        ("glm-4.7*", 169_984),
        ("glm-4.6*", 200_000),
        ("glm-4.5*", 131_072),
        ("glm-4-plus", 131_072),
        ("glm-4-air-250414", 131_072),
        ("glm-4-airx", 8_192),
        ("glm-4-flashx-250414", 131_072),
        ("glm-4-flash-250414", 131_072),
        ("glm-z1-air", 131_072),
        ("glm-z1-airx", 32_768),
        ("glm-z1-flash*", 131_072),
    ];

    providers.insert(
        "glm_cn".to_string(),
        provider(["open.bigmodel.cn"], glm_models, "CNY", glm_context, []),
    );

    providers.insert(
        "glm_global".to_string(),
        provider(
            ["api.z.ai"],
            glm_models,
            "USD",
            glm_context,
            [
                (
                    "glm-5.1*",
                    pricing_with_cache(1_000_000.0, 1.40, 4.40, 0.26, Some(0.0)),
                ),
                (
                    "glm-5-turbo*",
                    pricing_with_cache(1_000_000.0, 1.20, 4.00, 0.24, Some(0.0)),
                ),
                (
                    "glm-5*",
                    pricing_with_cache(1_000_000.0, 1.00, 3.20, 0.20, Some(0.0)),
                ),
                (
                    "glm-4.7-flashx*",
                    pricing_with_cache(1_000_000.0, 0.07, 0.40, 0.01, Some(0.0)),
                ),
                (
                    "glm-4.7*",
                    pricing_with_cache(1_000_000.0, 0.60, 2.20, 0.11, Some(0.0)),
                ),
                (
                    "glm-4.6*",
                    pricing_with_cache(1_000_000.0, 0.60, 2.20, 0.11, Some(0.0)),
                ),
                (
                    "glm-4.5-airx*",
                    pricing_with_cache(1_000_000.0, 1.10, 4.50, 0.22, Some(0.0)),
                ),
                (
                    "glm-4.5-air*",
                    pricing_with_cache(1_000_000.0, 0.20, 1.10, 0.03, Some(0.0)),
                ),
                (
                    "glm-4.5-x*",
                    pricing_with_cache(1_000_000.0, 2.20, 8.90, 0.45, Some(0.0)),
                ),
                (
                    "glm-4.5*",
                    pricing_with_cache(1_000_000.0, 0.60, 2.20, 0.11, Some(0.0)),
                ),
                ("glm-4-32b-0414-128k", pricing(1_000_000.0, 0.10, 0.10)),
                ("glm-4.7-flash", pricing(1_000_000.0, 0.0, 0.0)),
                ("glm-4.5-flash", pricing(1_000_000.0, 0.0, 0.0)),
            ],
        ),
    );

    providers.insert(
        "qianfan".to_string(),
        provider(
            ["qianfan.baidubce.com"],
            ["ernie-*", "qianfan-*"],
            "CNY",
            [],
            [],
        ),
    );

    providers.insert(
        "openai".to_string(),
        provider(
            ["api.openai.com"],
            ["openai", "gpt", "o1", "o3", "o4"],
            "USD",
            [],
            [],
        ),
    );

    providers
}

fn provider<const E: usize, const M: usize, const C: usize, const P: usize>(
    endpoints: [&str; E],
    models: [&str; M],
    currency: &str,
    context_windows: [(&str, u64); C],
    pricing_rules: [(&str, ModelPricingConfig); P],
) -> ModelProviderConfig {
    ModelProviderConfig {
        enabled: true,
        endpoints: strings(endpoints),
        models: strings(models),
        currency: Some(currency.to_string()),
        context_windows: context_windows
            .into_iter()
            .map(|(model, window)| (model.to_string(), window))
            .collect(),
        pricing: pricing_rules
            .into_iter()
            .map(|(model, rule)| (model.to_string(), rule))
            .collect(),
    }
}

fn strings<const N: usize>(values: [&str; N]) -> Vec<String> {
    values.into_iter().map(str::to_string).collect()
}

const fn pricing(unit_tokens: f64, input: f64, output: f64) -> ModelPricingConfig {
    ModelPricingConfig {
        unit_tokens,
        input,
        output,
        cache_read: None,
        cache_write: None,
    }
}

const fn pricing_with_cache(
    unit_tokens: f64,
    input: f64,
    output: f64,
    cache_read: f64,
    cache_write: Option<f64>,
) -> ModelPricingConfig {
    ModelPricingConfig {
        unit_tokens,
        input,
        output,
        cache_read: Some(cache_read),
        cache_write,
    }
}

#[must_use]
pub fn context_window_from_model_map<S: BuildHasher>(
    context_windows: &HashMap<String, u64, S>,
    model_id: &str,
) -> Option<u64> {
    let candidates = model_id_candidates(model_id);

    for candidate in &candidates {
        if let Some(value) = find_exact_context_window(context_windows, candidate) {
            return Some(value);
        }
    }

    find_prefix_context_window(context_windows, &candidates)
}

#[must_use]
pub fn context_window_from_providers<S: BuildHasher>(
    providers: &HashMap<String, ModelProviderConfig, S>,
    model_id: &str,
    endpoint: Option<&str>,
) -> Option<u64> {
    let candidates = model_id_candidates(model_id);

    for provider in matching_providers(providers, &candidates, endpoint) {
        for candidate in &candidates {
            if let Some(value) = find_exact_context_window(&provider.context_windows, candidate) {
                return Some(value);
            }
        }
        if let Some(value) = find_prefix_context_window(&provider.context_windows, &candidates) {
            return Some(value);
        }
    }

    None
}

#[must_use]
pub fn provider_currency<S: BuildHasher>(
    providers: &HashMap<String, ModelProviderConfig, S>,
    model_names: &[String],
    endpoint: Option<&str>,
) -> Option<String> {
    let candidates = model_candidates(model_names);
    matching_providers(providers, &candidates, endpoint)
        .into_iter()
        .find_map(|provider| provider.currency.clone())
}

#[must_use]
pub fn provider_pricing<S: BuildHasher>(
    providers: &HashMap<String, ModelProviderConfig, S>,
    model_names: &[String],
    endpoint: Option<&str>,
) -> Option<ModelPricingConfig> {
    let candidates = model_candidates(model_names);

    for provider in matching_pricing_providers(providers, &candidates, endpoint) {
        if let Some(rule) = find_exact_pricing(&provider.pricing, &candidates) {
            return Some(rule);
        }
        if let Some(rule) = find_prefix_pricing(&provider.pricing, &candidates) {
            return Some(rule);
        }
    }

    None
}

#[must_use]
pub fn provider_pricing_currency<S: BuildHasher>(
    providers: &HashMap<String, ModelProviderConfig, S>,
    model_names: &[String],
    endpoint: Option<&str>,
) -> Option<String> {
    let candidates = model_candidates(model_names);

    for provider in matching_pricing_providers(providers, &candidates, endpoint) {
        let has_pricing = find_exact_pricing(&provider.pricing, &candidates).is_some()
            || find_prefix_pricing(&provider.pricing, &candidates).is_some();
        if has_pricing {
            return provider.currency.clone();
        }
    }

    None
}

pub fn model_names_from_value(data: &serde_json::Value) -> Vec<String> {
    let mut names = Vec::new();

    if let Some(model) = data.get("model") {
        if let Some(model_name) = model.as_str() {
            names.push(model_name.to_string());
        }

        for field in ["id", "display_name", "displayName", "name"] {
            if let Some(model_name) = model.get(field).and_then(serde_json::Value::as_str) {
                names.push(model_name.to_string());
            }
        }
    }

    names
}

#[must_use]
pub fn match_endpoint_currency_rules<S: BuildHasher>(
    endpoint: &str,
    rules: &HashMap<String, String, S>,
) -> Option<String> {
    let mut entries: Vec<_> = rules.iter().collect();
    entries.sort_by(|(left, _), (right, _)| {
        right.len().cmp(&left.len()).then_with(|| left.cmp(right))
    });

    entries.into_iter().find_map(|(pattern, currency)| {
        endpoint_matches(pattern, endpoint).then(|| currency.clone())
    })
}

#[must_use]
pub fn match_model_currency_rules<S: BuildHasher>(
    model_names: &[String],
    rules: &HashMap<String, String, S>,
) -> Option<String> {
    let mut entries: Vec<_> = rules.iter().collect();
    entries.sort_by(|(left, _), (right, _)| {
        right.len().cmp(&left.len()).then_with(|| left.cmp(right))
    });

    entries.into_iter().find_map(|(pattern, currency)| {
        model_names
            .iter()
            .any(|model_name| model_matches(pattern, model_name))
            .then(|| currency.clone())
    })
}

#[must_use]
pub fn builtin_endpoint_currency(endpoint: &str) -> Option<&'static str> {
    BUILTIN_ENDPOINT_CURRENCY_RULES
        .iter()
        .find_map(|(pattern, currency)| endpoint_matches(pattern, endpoint).then_some(*currency))
}

#[must_use]
pub fn builtin_model_currency(model_names: &[String]) -> Option<&'static str> {
    BUILTIN_MODEL_CURRENCY_RULES
        .iter()
        .find_map(|(pattern, currency)| {
            model_names
                .iter()
                .any(|model_name| model_matches(pattern, model_name))
                .then_some(*currency)
        })
}

fn matching_providers<'a, S: BuildHasher>(
    providers: &'a HashMap<String, ModelProviderConfig, S>,
    candidates: &[String],
    endpoint: Option<&str>,
) -> Vec<&'a ModelProviderConfig> {
    let mut matches = Vec::new();

    if let Some(endpoint) = endpoint {
        let endpoint_matches = endpoint_matching_providers(providers, endpoint);
        matches.extend(endpoint_matches.into_iter().map(|(_, provider)| provider));
    }

    let mut model_matches: Vec<_> = providers
        .iter()
        .filter(|(_, provider)| provider.enabled)
        .filter(|(_, provider)| {
            !matches
                .iter()
                .any(|matched| std::ptr::eq(*matched, *provider))
                && provider_model_matches(provider, candidates)
        })
        .collect();
    model_matches.sort_by(|(left_name, left), (right_name, right)| {
        best_model_pattern_len(right, candidates)
            .cmp(&best_model_pattern_len(left, candidates))
            .then_with(|| left_name.cmp(right_name))
    });
    matches.extend(model_matches.into_iter().map(|(_, provider)| provider));

    matches
}

fn matching_pricing_providers<'a, S: BuildHasher>(
    providers: &'a HashMap<String, ModelProviderConfig, S>,
    candidates: &[String],
    endpoint: Option<&str>,
) -> Vec<&'a ModelProviderConfig> {
    if let Some(endpoint) = endpoint {
        let endpoint_matches = endpoint_matching_providers(providers, endpoint);
        if !endpoint_matches.is_empty() {
            return endpoint_matches
                .into_iter()
                .map(|(_, provider)| provider)
                .collect();
        }
    }

    let mut model_matches: Vec<_> = providers
        .iter()
        .filter(|(_, provider)| provider.enabled)
        .filter(|(_, provider)| provider_model_matches(provider, candidates))
        .collect();
    model_matches.sort_by(|(left_name, left), (right_name, right)| {
        best_model_pattern_len(right, candidates)
            .cmp(&best_model_pattern_len(left, candidates))
            .then_with(|| left_name.cmp(right_name))
    });

    model_matches
        .into_iter()
        .map(|(_, provider)| provider)
        .collect()
}

fn endpoint_matching_providers<'a, S: BuildHasher>(
    providers: &'a HashMap<String, ModelProviderConfig, S>,
    endpoint: &str,
) -> Vec<(&'a String, &'a ModelProviderConfig)> {
    let mut endpoint_matches: Vec<_> = providers
        .iter()
        .filter(|(_, provider)| provider.enabled)
        .filter(|(_, provider)| {
            provider
                .endpoints
                .iter()
                .any(|pattern| self::endpoint_matches(pattern, endpoint))
        })
        .collect();
    endpoint_matches.sort_by(|(left_name, left), (right_name, right)| {
        best_endpoint_len(right, endpoint)
            .cmp(&best_endpoint_len(left, endpoint))
            .then_with(|| left_name.cmp(right_name))
    });
    endpoint_matches
}

fn provider_model_matches(provider: &ModelProviderConfig, candidates: &[String]) -> bool {
    provider.models.iter().any(|pattern| {
        candidates
            .iter()
            .any(|candidate| model_pattern_matches(pattern, candidate))
    })
}

fn best_endpoint_len(provider: &ModelProviderConfig, endpoint: &str) -> usize {
    provider
        .endpoints
        .iter()
        .filter(|pattern| endpoint_matches(pattern, endpoint))
        .map(String::len)
        .max()
        .unwrap_or_default()
}

fn best_model_pattern_len(provider: &ModelProviderConfig, candidates: &[String]) -> usize {
    provider
        .models
        .iter()
        .filter(|pattern| {
            candidates
                .iter()
                .any(|candidate| model_pattern_matches(pattern, candidate))
        })
        .map(|pattern| pattern.trim_end_matches('*').len())
        .max()
        .unwrap_or_default()
}

fn find_exact_context_window<S: BuildHasher>(
    context_windows: &HashMap<String, u64, S>,
    candidate: &str,
) -> Option<u64> {
    context_windows
        .iter()
        .find(|(key, _)| {
            !key.eq_ignore_ascii_case("default")
                && !key.ends_with('*')
                && key.eq_ignore_ascii_case(candidate)
        })
        .map(|(_, value)| *value)
}

fn find_prefix_context_window<S: BuildHasher>(
    context_windows: &HashMap<String, u64, S>,
    candidates: &[String],
) -> Option<u64> {
    let mut best: Option<PrefixContextMatch<'_>> = None;

    for (key, value) in context_windows {
        let Some(prefix) = key.strip_suffix('*') else {
            continue;
        };
        if prefix.eq_ignore_ascii_case("default") {
            continue;
        }

        let normalized_prefix = prefix.to_ascii_lowercase();
        if let Some(candidate_index) = candidates
            .iter()
            .position(|candidate| candidate.starts_with(&normalized_prefix))
        {
            let candidate_match = PrefixContextMatch {
                candidate_index,
                prefix_len: normalized_prefix.len(),
                key,
                value: *value,
            };
            if best.is_none_or(|current| candidate_match.is_better_than(current)) {
                best = Some(candidate_match);
            }
        }
    }

    best.map(|candidate_match| candidate_match.value)
}

fn find_exact_pricing<S: BuildHasher>(
    pricing: &HashMap<String, ModelPricingConfig, S>,
    candidates: &[String],
) -> Option<ModelPricingConfig> {
    for candidate in candidates {
        if let Some((_, rule)) = pricing
            .iter()
            .find(|(key, _)| !key.ends_with('*') && key.trim().eq_ignore_ascii_case(candidate))
        {
            return Some(rule.clone());
        }
    }

    None
}

fn find_prefix_pricing<S: BuildHasher>(
    pricing: &HashMap<String, ModelPricingConfig, S>,
    candidates: &[String],
) -> Option<ModelPricingConfig> {
    let mut best: Option<PrefixPricingMatch<'_>> = None;

    for (key, rule) in pricing {
        let Some(prefix) = key.strip_suffix('*') else {
            continue;
        };
        let normalized_prefix = prefix.to_ascii_lowercase();
        if let Some(candidate_index) = candidates
            .iter()
            .position(|candidate| candidate.starts_with(&normalized_prefix))
        {
            let candidate_match = PrefixPricingMatch {
                candidate_index,
                prefix_len: normalized_prefix.len(),
                key,
                rule,
            };
            if best.is_none_or(|current| candidate_match.is_better_than(current)) {
                best = Some(candidate_match);
            }
        }
    }

    best.map(|candidate_match| candidate_match.rule.clone())
}

#[derive(Clone, Copy)]
struct PrefixContextMatch<'a> {
    candidate_index: usize,
    prefix_len: usize,
    key: &'a str,
    value: u64,
}

impl PrefixContextMatch<'_> {
    fn is_better_than(self, other: Self) -> bool {
        self.candidate_index < other.candidate_index
            || (self.candidate_index == other.candidate_index
                && (self.prefix_len > other.prefix_len
                    || (self.prefix_len == other.prefix_len && self.key < other.key)))
    }
}

#[derive(Clone, Copy)]
struct PrefixPricingMatch<'a> {
    candidate_index: usize,
    prefix_len: usize,
    key: &'a str,
    rule: &'a ModelPricingConfig,
}

impl PrefixPricingMatch<'_> {
    fn is_better_than(self, other: Self) -> bool {
        self.candidate_index < other.candidate_index
            || (self.candidate_index == other.candidate_index
                && (self.prefix_len > other.prefix_len
                    || (self.prefix_len == other.prefix_len && self.key < other.key)))
    }
}

fn model_id_candidates(model_id: &str) -> Vec<String> {
    let normalized = model_id.trim().to_ascii_lowercase();
    let mut candidates = vec![normalized.clone()];

    // 形如 `deepseek-v4-pro[1m]` 的参数后缀会让精确 pricing / context key 匹配失败,
    // 追加一个剥离 `[...]` 后缀的候选,使其回落到基础模型名再匹配一次。
    if let Some(base) = strip_param_suffix(&normalized) {
        candidates.push(base.to_string());
    }

    if let Some((_, last)) = normalized.rsplit_once('/') {
        candidates.push(last.to_string());
        if let Some(base) = strip_param_suffix(last) {
            candidates.push(base.to_string());
        }
    }

    candidates
}

/// Strip a trailing parameter suffix such as `[1m]` from a model id, returning the
/// base name. Returns `None` when there is no suffix or the base would be empty.
fn strip_param_suffix(model: &str) -> Option<&str> {
    model
        .split_once('[')
        .map(|(base, _)| base.trim_end())
        .filter(|base| !base.is_empty())
}

fn model_candidates(model_names: &[String]) -> Vec<String> {
    let mut candidates = Vec::new();

    for model_name in model_names {
        for candidate in model_id_candidates(model_name) {
            if !candidate.is_empty() && !candidates.contains(&candidate) {
                candidates.push(candidate);
            }
        }
    }

    candidates
}

fn endpoint_matches(pattern: &str, endpoint: &str) -> bool {
    let pattern_host = endpoint_host(pattern);
    let endpoint_host = endpoint_host(endpoint);

    if pattern_host.is_empty() || endpoint_host.is_empty() {
        return false;
    }

    endpoint_host == pattern_host
        || endpoint_host
            .strip_suffix(&pattern_host)
            .is_some_and(|prefix| prefix.ends_with('.'))
}

fn endpoint_host(endpoint: &str) -> String {
    let normalized = endpoint.trim().to_ascii_lowercase();
    let without_scheme = normalized
        .split_once("://")
        .map_or(normalized.as_str(), |(_, rest)| rest);
    let without_auth = without_scheme
        .rsplit_once('@')
        .map_or(without_scheme, |(_, host)| host);
    let host_with_port = without_auth
        .split(&['/', '?', '#'][..])
        .next()
        .unwrap_or_default();
    host_with_port
        .split(':')
        .next()
        .unwrap_or_default()
        .trim_matches('.')
        .to_string()
}

fn model_matches(pattern: &str, model_name: &str) -> bool {
    let pattern = pattern.trim().to_ascii_lowercase();
    let model_name = model_name.trim().to_ascii_lowercase();

    !pattern.is_empty() && (model_name == pattern || model_name.contains(&pattern))
}

fn model_pattern_matches(pattern: &str, model_name: &str) -> bool {
    let pattern = pattern.trim().to_ascii_lowercase();
    let model_name = model_name.trim().to_ascii_lowercase();

    pattern.strip_suffix('*').map_or_else(
        || !pattern.is_empty() && (model_name == pattern || model_name.contains(&pattern)),
        |prefix| !prefix.is_empty() && model_name.starts_with(prefix),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strip_param_suffix_extracts_base_model_name() {
        assert_eq!(
            strip_param_suffix("deepseek-v4-pro[1m]"),
            Some("deepseek-v4-pro")
        );
        assert_eq!(strip_param_suffix("deepseek-v4-pro"), None);
        assert_eq!(strip_param_suffix("[1m]"), None);
    }

    #[test]
    fn deepseek_1m_suffix_resolves_builtin_pricing() {
        let providers = default_model_providers();

        // deepseek-v4-pro 的内置 pricing:input 3 / output 6 / cache_read 0.025
        let is_v4_pro_pricing = |pricing: &ModelPricingConfig| {
            (pricing.input - 3.0).abs() < 1e-9
                && (pricing.output - 6.0).abs() < 1e-9
                && pricing.cache_read.is_some_and(|v| (v - 0.025).abs() < 1e-9)
        };

        // 不带后缀:命中内置 pricing
        assert!(
            provider_pricing(&providers, &["deepseek-v4-pro".to_string()], None)
                .as_ref()
                .is_some_and(&is_v4_pro_pricing),
            "plain deepseek-v4-pro should resolve builtin pricing"
        );

        // 回归 issue #75:带 [1m] 后缀的模型名剥离后缀后回落到同一条内置 pricing,
        // 不再因匹配失败而 fallback 到上游虚高 cost。
        assert!(
            provider_pricing(&providers, &["deepseek-v4-pro[1m]".to_string()], None)
                .as_ref()
                .is_some_and(&is_v4_pro_pricing),
            "deepseek-v4-pro[1m] should resolve builtin pricing after stripping [1m]"
        );
    }

    #[test]
    fn prefix_context_window_prefers_full_model_candidate_over_stripped_alias() {
        let mut context_windows = HashMap::new();
        context_windows.insert("acme/*".to_string(), 777_000);
        context_windows.insert("mimo-*".to_string(), 1_000_000);

        let window = context_window_from_model_map(&context_windows, "acme/mimo-v2-pro");

        assert_eq!(window, Some(777_000));
    }

    #[test]
    fn prefix_context_window_prefers_longer_prefix_for_same_candidate() {
        let mut context_windows = HashMap::new();
        context_windows.insert("qwen3-*".to_string(), 262_144);
        context_windows.insert("qwen3-coder-*".to_string(), 1_000_000);

        let window = context_window_from_model_map(&context_windows, "qwen3-coder-plus");

        assert_eq!(window, Some(1_000_000));
    }

    #[test]
    fn endpoint_currency_rules_match_urls_and_hosts() {
        let rules = HashMap::from([
            ("api.minimax.io".to_string(), "CNY".to_string()),
            (
                "https://tenant.example.com/v1".to_string(),
                "EUR".to_string(),
            ),
        ]);

        assert_eq!(
            match_endpoint_currency_rules("https://api.minimax.io/v1", &rules),
            Some("CNY".to_string())
        );
        assert_eq!(
            match_endpoint_currency_rules("https://tenant.example.com/v1/chat", &rules),
            Some("EUR".to_string())
        );
    }

    #[test]
    fn model_currency_rules_match_case_insensitive_substrings() {
        let rules = HashMap::from([("mimo".to_string(), "USD".to_string())]);
        let model_names = ["Xiaomi-MiMo-V2.5-Pro".to_string()];

        assert_eq!(
            match_model_currency_rules(&model_names, &rules),
            Some("USD".to_string())
        );
    }

    #[test]
    fn builtin_currency_rules_cover_common_cn_and_global_hosts() {
        assert_eq!(
            builtin_endpoint_currency("https://api.deepseek.com/v1"),
            Some("CNY")
        );
        assert_eq!(
            builtin_endpoint_currency("https://api.minimaxi.com/anthropic"),
            Some("CNY")
        );
        assert_eq!(
            builtin_endpoint_currency("https://api.minimax.io/v1"),
            Some("USD")
        );
        assert_eq!(
            builtin_endpoint_currency("https://api.moonshot.cn/v1"),
            Some("CNY")
        );
        assert_eq!(
            builtin_endpoint_currency("https://api.xiaomimimo.com/v1"),
            Some("USD")
        );
    }

    #[test]
    fn builtin_model_currency_rules_cover_deepseek_and_mimo_fallbacks() {
        let deepseek_models = ["deepseek-v4-pro".to_string()];
        let mimo_models = ["mimo-v2-flash".to_string()];

        assert_eq!(builtin_model_currency(&deepseek_models), Some("CNY"));
        assert_eq!(builtin_model_currency(&mimo_models), Some("USD"));
    }

    #[test]
    fn provider_profiles_cover_context_windows() {
        let providers = default_model_providers();

        assert_eq!(
            context_window_from_providers(&providers, "MiniMax-M2.7", None),
            Some(204_800)
        );
    }

    #[test]
    fn provider_profiles_split_kimi_cn_and_global_currency_and_pricing() {
        let providers = default_model_providers();

        assert_eq!(
            provider_currency(
                &providers,
                &["kimi-k2.6".to_string()],
                Some("https://api.moonshot.ai/v1")
            ),
            Some("USD".to_string())
        );
        assert_eq!(
            provider_currency(
                &providers,
                &["kimi-k2.6".to_string()],
                Some("https://api.moonshot.cn/v1")
            ),
            Some("CNY".to_string())
        );
        assert_eq!(
            provider_pricing(
                &providers,
                &["kimi-k2.6".to_string()],
                Some("https://api.moonshot.cn/v1")
            )
            .map(|pricing| pricing.output),
            Some(29.00)
        );
        assert_eq!(
            provider_pricing(
                &providers,
                &["kimi-k2.6".to_string()],
                Some("https://api.moonshot.ai/v1")
            )
            .map(|pricing| pricing.output),
            Some(4.00)
        );
    }

    #[test]
    fn provider_profiles_split_minimax_cn_and_global_currency_and_pricing() {
        let providers = default_model_providers();

        assert_eq!(
            provider_currency(
                &providers,
                &["MiniMax-M2.7".to_string()],
                Some("https://api.minimax.io/v1")
            ),
            Some("USD".to_string())
        );
        assert_eq!(
            provider_currency(
                &providers,
                &["MiniMax-M2.7".to_string()],
                Some("https://api.minimaxi.com/anthropic")
            ),
            Some("CNY".to_string())
        );
        assert_eq!(
            provider_pricing(
                &providers,
                &["MiniMax-M2.7".to_string()],
                Some("https://api.minimaxi.com/anthropic")
            )
            .map(|pricing| pricing.output),
            None
        );
        assert_eq!(
            provider_pricing(
                &providers,
                &["MiniMax-M2.7".to_string()],
                Some("https://api.minimax.io/v1")
            )
            .map(|pricing| pricing.output),
            Some(1.20)
        );
    }

    #[test]
    fn provider_profiles_split_glm_cn_and_global_currency_and_pricing() {
        let providers = default_model_providers();

        assert_eq!(
            provider_currency(
                &providers,
                &["glm-4.6".to_string()],
                Some("https://open.bigmodel.cn/api/paas/v4")
            ),
            Some("CNY".to_string())
        );
        assert_eq!(
            provider_currency(
                &providers,
                &["glm-4.6".to_string()],
                Some("https://api.z.ai/api/paas/v4")
            ),
            Some("USD".to_string())
        );
        assert_eq!(
            provider_pricing(&providers, &["glm-4.6".to_string()], None)
                .map(|pricing| pricing.output),
            Some(2.20)
        );
        assert_eq!(
            provider_pricing(
                &providers,
                &["glm-4.6".to_string()],
                Some("https://open.bigmodel.cn/api/paas/v4")
            )
            .map(|pricing| pricing.output),
            None
        );
        assert_eq!(
            provider_pricing(
                &providers,
                &["glm-4.6".to_string()],
                Some("https://api.z.ai/api/paas/v4")
            )
            .map(|pricing| pricing.output),
            Some(2.20)
        );
    }
}
