const fs = require('node:fs');
const data = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));
const transcript = fs.readFileSync(data.transcript_path, 'utf8');
const lines = transcript.trim().split('\n');
console.log('Total lines:', lines.length);

for (let i = lines.length - 1; i >= 0; i--) {
  const line = lines[i]?.trim();
  if (!line) continue;

  try {
    const entry = JSON.parse(line);
    if (entry.type === 'assistant' && entry.message && 'usage' in entry.message) {
      console.log('Found assistant entry at line', i + 1);
      console.log('Usage:', entry.message.usage);

      const usage = entry.message.usage;
      const contextUsedTokens =
        usage.input_tokens +
        usage.cache_creation_input_tokens +
        usage.cache_read_input_tokens +
        usage.output_tokens;
      console.log('Calculated contextUsedTokens:', contextUsedTokens);
      break;
    }
  } catch (e) {
    console.log('Parse error at line', i + 1, ':', e.message);
  }
}
