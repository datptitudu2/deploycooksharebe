/**
 * Script cập nhật model trong .env
 * Chạy: node src/scripts/updateModel.js [model-id]
 * Hoặc: node src/scripts/updateModel.js base (để dùng base model)
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '../../.env');

function updateModel(modelId) {
  if (!fs.existsSync(envPath)) {
    console.log('❌ File .env không tồn tại!');
    process.exit(1);
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Nếu modelId là 'base', dùng gpt-4o-mini
  if (modelId === 'base' || modelId === 'gpt-4o-mini') {
    modelId = 'gpt-4o-mini';
  }

  // Tìm và thay thế OPENAI_MODEL
  if (envContent.includes('OPENAI_MODEL=')) {
    envContent = envContent.replace(
      /OPENAI_MODEL=.*/,
      `OPENAI_MODEL=${modelId}`
    );
  } else {
    // Nếu chưa có, thêm vào cuối file
    envContent += `\nOPENAI_MODEL=${modelId}\n`;
  }

  fs.writeFileSync(envPath, envContent, 'utf8');
  
  console.log(`\n✅ Đã cập nhật OPENAI_MODEL trong .env`);
  console.log(`   Model mới: ${modelId}`);
  console.log(`\n💡 Bước tiếp theo:`);
  console.log(`   1. Restart backend server để load model mới`);
  console.log(`   2. Test chatbot để xác nhận\n`);
}

const modelId = process.argv[2];

if (!modelId) {
  console.log('\n📝 Cách sử dụng:');
  console.log('   node src/scripts/updateModel.js base          - Dùng base model (gpt-4o-mini)');
  console.log('   node src/scripts/updateModel.js [model-id]     - Dùng model ID cụ thể\n');
  process.exit(1);
}

updateModel(modelId);

