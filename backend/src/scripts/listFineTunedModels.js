/**
 * Script liệt kê các fine-tuned models có sẵn với API key hiện tại
 * Chạy: node src/scripts/listFineTunedModels.js
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

async function listFineTunedModels() {
  console.log('\n🔍 Đang tìm các fine-tuned models với API key hiện tại...\n');

  try {
    // Lấy danh sách tất cả fine-tuning jobs
    const fineTunes = await openai.fineTuning.jobs.list({ limit: 100 });
    
    console.log(`📊 Tìm thấy ${fineTunes.data.length} fine-tuning jobs:\n`);

    if (fineTunes.data.length === 0) {
      console.log('⚠️  Không có fine-tuning jobs nào với API key này.');
      console.log('💡 Bạn có thể:');
      console.log('   1. Dùng base model (gpt-4o-mini) tạm thời');
      console.log('   2. Tạo fine-tuning job mới với API key này');
      console.log('   3. Hoặc dùng model fine-tuned từ API key cũ (nếu có quyền truy cập)\n');
      return;
    }

    // Lọc các jobs đã hoàn thành
    const completedJobs = fineTunes.data.filter(job => job.status === 'succeeded');
    const failedJobs = fineTunes.data.filter(job => job.status === 'failed');
    const runningJobs = fineTunes.data.filter(job => job.status === 'running' || job.status === 'validating_files');

    console.log(`✅ Hoàn thành: ${completedJobs.length}`);
    console.log(`❌ Thất bại: ${failedJobs.length}`);
    console.log(`⏳ Đang chạy: ${runningJobs.length}\n`);

    if (completedJobs.length > 0) {
      console.log('📋 Các model fine-tuned có sẵn:\n');
      completedJobs.forEach((job, index) => {
        console.log(`${index + 1}. Model ID: ${job.fine_tuned_model}`);
        console.log(`   Job ID: ${job.id}`);
        console.log(`   Created: ${new Date(job.created_at * 1000).toLocaleString('vi-VN')}`);
        console.log(`   Trained tokens: ${job.trained_tokens || 'N/A'}`);
        console.log('');
      });

      console.log('💡 Để sử dụng model fine-tuned:');
      console.log('   1. Copy Model ID từ trên');
      console.log('   2. Cập nhật OPENAI_MODEL trong .env:');
      console.log(`      OPENAI_MODEL=${completedJobs[0].fine_tuned_model}`);
      console.log('   3. Restart backend server\n');
    } else {
      console.log('⚠️  Không có model fine-tuned nào đã hoàn thành.\n');
      
      if (runningJobs.length > 0) {
        console.log('⏳ Các jobs đang chạy:');
        runningJobs.forEach((job, index) => {
          console.log(`${index + 1}. Job ID: ${job.id}`);
          console.log(`   Status: ${job.status}`);
          console.log(`   Created: ${new Date(job.created_at * 1000).toLocaleString('vi-VN')}`);
          console.log('');
        });
      }
    }

  } catch (error) {
    console.log('❌ Lỗi khi lấy danh sách fine-tuning jobs:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data?.error?.message || error.response.statusText}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }
}

listFineTunedModels().catch(console.error);

