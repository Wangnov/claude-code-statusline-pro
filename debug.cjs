const fs = require('node:fs');
const transcript = fs.readFileSync('87ca4446-2751-442e-bae2-b2fd8e69994a.jsonl', 'utf8');
const lines = transcript.trim().split('\n');
console.log('Total lines:', lines.length);

for (let i = lines.length - 1; i >= 0; i--) {
  const line = lines[i];
  if (!line || !line.trim()) continue;

  try {
    const entry = JSON.parse(line);
    if (entry.type === 'assistant' && entry.message && entry.message.usage) {
      console.log('Found assistant entry at line', i + 1);
      console.log('Usage:', JSON.stringify(entry.message.usage, null, 2));

      const usage = entry.message.usage;
      const contextUsedTokens =
        usage.input_tokens +
        usage.cache_creation_input_tokens +
        usage.cache_read_input_tokens +
        usage.output_tokens;
      console.log('Calculated contextUsedTokens:', contextUsedTokens);
      break;
    }
  } catch (_e) {
    // skip parse errors
  }
}
