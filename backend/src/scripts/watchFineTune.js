import { checkFineTuneStatus } from '../utils/fineTuneHelper.js';

const jobId = process.argv[2];

if (!jobId) {
  console.error('❌ Vui lòng cung cấp job ID');
  console.log('Usage: node src/scripts/watchFineTune.js <job-id>');
  process.exit(1);
}

console.log('👀 Watching fine-tuning job...\n');
console.log('Press Ctrl+C to stop watching\n');

let checkCount = 0;
const maxChecks = 60; // Tối đa 60 lần (30 phút nếu check mỗi 30 giây)

const checkStatus = async () => {
  try {
    checkCount++;
    const job = await checkFineTuneStatus(jobId);
    
    console.log(`[${new Date().toLocaleTimeString()}] Check #${checkCount}`);
    console.log(`Status: ${job.status}`);
    
    if (job.status === 'succeeded') {
      console.log('\n✅✅✅ FINE-TUNING COMPLETED! ✅✅✅\n');
      console.log('Job ID:', job.id);
      console.log('Fine-tuned Model:', job.fine_tuned_model);
      console.log('Trained tokens:', job.trained_tokens);
      console.log('\n📝 Next steps:');
      console.log('1. Update OPENAI_MODEL in .env:');
      console.log(`   OPENAI_MODEL=${job.fine_tuned_model}`);
      console.log('2. Restart backend server');
      console.log('3. Test chatbot - it should be more accurate now!\n');
      process.exit(0);
    } else if (job.status === 'failed') {
      console.log('\n❌ Fine-tuning failed');
      if (job.error) {
        console.log('Error:', job.error);
      }
      process.exit(1);
    } else if (job.status === 'running') {
      if (job.trained_tokens > 0) {
        console.log(`Trained tokens: ${job.trained_tokens}`);
      }
      console.log('⏳ Still training...\n');
      
      if (checkCount >= maxChecks) {
        console.log('⚠️ Reached max checks. Please check manually later.');
        process.exit(0);
      }
      
      // Check again in 30 seconds
      setTimeout(checkStatus, 30000);
    } else {
      console.log('Status:', job.status);
      setTimeout(checkStatus, 30000);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    setTimeout(checkStatus, 30000);
  }
};

// Start checking
checkStatus();

