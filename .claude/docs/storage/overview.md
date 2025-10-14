# Storage System Overview

## Directory Structure
```
~/.claude/projects/{project}/statusline-pro/
├── config.toml         # Project config (copied from template)
├── project-data.json   # Cumulative project stats
└── {session-id}.json   # Session component data
```

## Data Flow
1. CLI reads transcript_path from stdin
2. Extract project path from transcript_path
3. Auto-create statusline-pro/ if missing
4. Auto-copy config.template.toml if config.toml missing
5. Load config with priority: CLI args > project config > defaults
6. Update cumulative data in project-data.json (with file lock)
7. Store session data in {session-id}.json

## Key Principles
- **Idempotent**: Same session processed multiple times = same result
- **Fail-safe**: Storage errors don't break statusline rendering
- **Atomic**: File operations use locks to prevent corruption
- **Simple**: Three files, clear responsibilities