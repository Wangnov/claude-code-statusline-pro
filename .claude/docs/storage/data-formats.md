# Data Formats

## project-data.json
```json
{
  "version": "1.0.0",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T11:45:00Z",
  "project_path": "/Users/user/project",
  
  "cumulative_usage": {
    "total_cost_usd": 1.2345,
    "total_lines_added": 456,
    "total_lines_removed": 123,
    "total_duration_ms": 1800000,
    "session_count": 15,
    "last_session_id": "abc123"
  },
  
  "processed_sessions": ["session-1", "session-2"]
}
```

## {session-id}.json
```json
{
  "session_id": "abc123",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T11:45:00Z",
  
  "components": {
    "project": {"name": "MyProject", "path": "/path"},
    "model": {"id": "claude-sonnet-4", "display_name": "Sonnet 4"},
    "branch": {"name": "main", "status": "clean"},
    "tokens": {"peak_usage_percent": 85},
    "usage": {"session_cost_usd": 0.42, "session_lines_added": 16}
  }
}
```

## config.toml
Copy of `configs/config.template.toml` with project-specific overrides.