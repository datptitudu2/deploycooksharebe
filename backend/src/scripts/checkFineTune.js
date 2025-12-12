import { checkFineTuneStatus } from '../utils/fineTuneHelper.js';

const jobId = process.argv[2];

if (!jobId) {
  console.error('❌ Vui lòng cung cấp job ID');
  console.log('Usage: node src/scripts/checkFineTune.js <job-id>');
  process.exit(1);
}

console.log('📊 Checking fine-tuning job status...\n');

checkFineTuneStatus(jobId)
  .then((job) => {
    console.log('Job ID:', job.id);
    console.log('Status:', job.status);
    console.log('Model:', job.fine_tuned_model || 'Training...');
    console.log('Trained tokens:', job.trained_tokens || 0);
    console.log('Created at:', new Date(job.created_at * 1000).toLocaleString());
    
    if (job.status === 'succeeded') {
      console.log('\n✅ Fine-tuning completed!');
      console.log('📝 Update OPENAI_MODEL in .env with:', job.fine_tuned_model);
    } else if (job.status === 'failed') {
      console.log('\n❌ Fine-tuning failed');
      if (job.error) {
        console.log('Error:', job.error);
      }
    } else {
      console.log('\n⏳ Fine-tuning in progress...');
      console.log('Run this command again in a few minutes to check status');
    }
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });

