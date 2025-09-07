import { YesCodeService } from './dist/index.js';

console.log('Testing YesCode MVP functionality...\n');

const service = YesCodeService.getInstance();

// 检查是否启用
const isEnabled = service.isEnabled();
console.log('YesCode Enabled:', isEnabled);
console.log('Base URL:', process.env.ANTHROPIC_BASE_URL);
console.log('API Key:', process.env.ANTHROPIC_AUTH_TOKEN ? 'Set' : 'Not set');

if (isEnabled) {
  console.log('\nFetching today\'s spending...');
  try {
    const spending = await service.getTodaySpending();
    if (spending !== null) {
      console.log(`Today's spending: $${spending.toFixed(2)}`);
      console.log(`Display format: [D] $${spending.toFixed(2)}`);
    } else {
      console.log('No spending data available');
    }
  } catch (error) {
    console.error('Error:', error);
  }
} else {
  console.log('\nYesCode is not enabled. Set ANTHROPIC_BASE_URL to include "co.yes.vg" to enable.');
}