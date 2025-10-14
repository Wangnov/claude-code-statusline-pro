# Configuration Priority

## Loading Order (High → Low)
1. **CLI Arguments**: `--theme capsule --config-override '{"debug":true}'`
2. **Project Config**: `~/.claude/projects/{project}/statusline-pro/config.toml`
3. **Template Config**: `configs/config.template.toml`

## Auto-Initialization
```typescript
// On first run for a project
if (!exists(projectConfigPath)) {
  copy(templateConfigPath, projectConfigPath)
}
```

## Usage Example
```bash
# Uses project config
npx claude-code-statusline-pro

# Overrides with CLI args  
npx claude-code-statusline-pro --theme powerline

# Ignores project config completely
npx claude-code-statusline-pro --config /custom/path.toml
```

## New Config Options
```toml
[components.usage]
cost_calculation = "cumulative"  # "current" | "cumulative"
```

- `"current"`: Show only current session cost (default behavior)
- `"cumulative"`: Show total project cost from project-data.json