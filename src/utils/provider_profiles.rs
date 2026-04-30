//! Provider and model capability matching helpers.
//!
//! This module keeps provider endpoint/model matching rules in one place so
//! feature components can share the same matching semantics.

use std::{collections::HashMap, hash::BuildHasher};

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
    ("mimo", "USD"),
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

fn model_id_candidates(model_id: &str) -> Vec<String> {
    let normalized = model_id.trim().to_ascii_lowercase();
    let mut candidates = vec![normalized.clone()];

    if let Some((_, last)) = normalized.rsplit_once('/') {
        candidates.push(last.to_string());
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

#[cfg(test)]
mod tests {
    use super::*;

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
}
