/**
 * Script test API key mới
 * Chạy: node src/scripts/testApiKey.js
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testApiKey() {
  console.log('\n🔍 Kiểm tra API key mới...\n');

  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ Lỗi: OPENAI_API_KEY chưa được cấu hình trong file .env');
    process.exit(1);
  }

  console.log(`✅ API key đã được load từ .env`);
  console.log(`   Format: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log(`   Length: ${apiKey.length} characters\n`);

  // Test 1: Kiểm tra quyền truy cập
  console.log('📋 Test 1: Kiểm tra quyền truy cập...');
  try {
    const models = await openai.models.list();
    console.log('✅ API key hợp lệ! Có thể truy cập OpenAI API');
    console.log(`   Số lượng models có sẵn: ${models.data.length}\n`);
  } catch (error) {
    console.log('❌ Lỗi khi kiểm tra quyền truy cập:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data?.error?.message || error.response.statusText}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    process.exit(1);
  }

  // Test 2: Kiểm tra model hiện tại
  const currentModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const isFineTuned = currentModel.startsWith('ft:');
  
  console.log('📊 Thông tin Model:');
  console.log(`   Model: ${currentModel}`);
  console.log(`   Type: ${isFineTuned ? '✅ Fine-tuned (Đã train)' : '⚠️ Base Model (Chưa train)'}`);

  try {
    const modelInfo = await openai.models.retrieve(currentModel);
    console.log('   Status: ✅ Model tồn tại và có thể sử dụng');
    console.log('   Owner:', modelInfo.owned_by);
  } catch (modelError) {
    console.log('   Status: ❌ Model không tồn tại hoặc không thể truy cập');
    console.log('   Chi tiết:', modelError.message);
    if (isFineTuned) {
      console.log('   💡 Nếu đây là model fine-tuned, hãy đảm bảo nó đã hoàn thành training và ID đúng.');
    }
  }

  // Test 3: Gửi request test
  console.log('\n💬 Test 2: Gửi request test...');
  try {
    const completion = await openai.chat.completions.create({
      model: currentModel,
      messages: [
        {
          role: 'user',
          content: 'Xin chào! Hãy trả lời ngắn gọn: "API key hoạt động tốt!"',
        },
      ],
      max_tokens: 20,
    });

    const response = completion.choices[0]?.message?.content;
    console.log('✅ Request thành công!');
    console.log('   Response:', response);
    console.log('   Tokens used:', completion.usage?.total_tokens || 'N/A');
  } catch (error) {
    console.log('❌ Lỗi khi gửi request:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data?.error?.message || error.response.statusText}`);
      
      if (error.response.status === 401) {
        console.log('   💡 Gợi ý: API key không hợp lệ hoặc đã hết hạn.');
      } else if (error.response.status === 429) {
        console.log('   💡 Gợi ý: Đã vượt quá giới hạn sử dụng (quota).');
      }
    } else {
      console.log(`   Error: ${error.message}`);
    }
    process.exit(1);
  }

  // Tổng kết
  console.log('\n' + '='.repeat(50));
  console.log('✅ TẤT CẢ CÁC TEST ĐỀU THÀNH CÔNG!');
  console.log('='.repeat(50));
  console.log('\n📝 Kết luận:');
  console.log('   ✅ API key mới hợp lệ và hoạt động tốt');
  console.log('   ✅ Có thể gửi request đến OpenAI API');
  console.log('   ✅ Model đang sử dụng:', currentModel);
  console.log('\n💡 Bước tiếp theo:');
  console.log('   1. Restart backend server để load API key mới');
  console.log('   2. Test chatbot trong app để xác nhận');
  console.log('\n');
}

testApiKey().catch(console.error);

