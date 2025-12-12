import { runFineTuning, checkFineTuneStatus } from '../utils/fineTuneHelper.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lấy argument từ command line
const arg = process.argv[2];

if (arg && arg.startsWith('ftjob-')) {
  // Nếu là job ID, kiểm tra trạng thái
  console.log('📊 Checking fine-tuning job status...');
  checkFineTuneStatus(arg)
    .then((job) => {
      console.log('\n📋 Job Details:');
      console.log('Status:', job.status);
      console.log('Model:', job.fine_tuned_model || 'Training...');
      console.log('Trained tokens:', job.trained_tokens || 0);
      
      if (job.status === 'succeeded') {
        console.log('\n✅ Fine-tuning completed!');
        console.log('🔧 Update .env:');
        console.log(`   OPENAI_MODEL=${job.fine_tuned_model}`);
      } else if (job.status === 'failed') {
        console.log('\n❌ Fine-tuning failed:', job.error?.message || 'Unknown error');
      }
    })
    .catch(console.error);
} else if (arg && arg.endsWith('.jsonl')) {
  // Nếu là file path, chạy fine-tuning với file đó
  const filePath = join(__dirname, '../../', arg);
  console.log('🚀 Starting fine-tuning with custom file...');
  runFineTuning(filePath).catch(console.error);
} else if (!arg) {
  // Không có argument, chạy fine-tuning với file mặc định
  console.log('🚀 Creating new fine-tuning job...');
  runFineTuning().catch(console.error);
} else {
  console.log('Usage:');
  console.log('  node src/scripts/fineTune.js                    - Fine-tune với training_data.jsonl');
  console.log('  node src/scripts/fineTune.js <file.jsonl>       - Fine-tune với file custom');
  console.log('  node src/scripts/fineTune.js <ftjob-xxx>        - Check status của job');
}

