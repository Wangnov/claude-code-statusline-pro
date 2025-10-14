# Implementation Guide

## Core Classes

### StatuslineStorage
```typescript
class StatuslineStorage {
  constructor(transcriptPath: string, sessionId: string)
  
  // Path operations
  static parseProjectPath(transcriptPath: string): string | null
  initializeStorage(): Promise<void>
  
  // Data operations  
  updateCumulativeUsage(sessionData: CostData): Promise<CumulativeUsage>
  getCumulativeUsage(): Promise<CumulativeUsage>
  saveSessionData(componentData: Record<string, any>): Promise<void>
}
```

### ConfigManager
```typescript
class ConfigManager {
  constructor(projectPath: string)
  
  loadConfig(cliOverrides?: Partial<Config>): Promise<Config>
  initializeProjectConfig(): Promise<void>
}
```

## Integration Points
- **core/parser.ts**: Initialize storage in parseInput()
- **components/usage.ts**: Use cumulative data from storage
- **config/loader.ts**: Use ConfigManager for project configs

## Error Handling
- Storage init fails → log warning, continue with defaults
- File lock fails → retry 3x, then skip update
- JSON parse fails → backup corrupt file, create new one
- Path validation fails → operate in ephemeral mode