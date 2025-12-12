import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const isFineTuned = model.startsWith('ft:');

console.log('\n📊 Chatbot Model Status:\n');
console.log('Model:', model);
console.log('Type:', isFineTuned ? '✅ Fine-tuned (Đã train)' : '⚠️ Base Model (Chưa train)');
console.log('Status:', isFineTuned ? 'Đang dùng model đã được train' : 'Đang dùng API key thông thường\n');

if (!isFineTuned) {
  console.log('💡 Để sử dụng model đã train:');
  console.log('   1. Cập nhật OPENAI_MODEL trong .env với model ID từ fine-tuning');
  console.log('   2. Model ID có format: ft:gpt-3.5-turbo-0125:personal:cookshare-chatbot:xxxxx\n');
}

