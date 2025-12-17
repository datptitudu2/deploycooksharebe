import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';

// Import cả 2 controller
import * as openaiController from '../controllers/chatbotController.js';
import * as selfHostedController from '../controllers/chatbotSelfHostedController.js';

const router = express.Router();

// Kiểm tra sử dụng model nào
const USE_SELF_HOSTED = process.env.USE_SELF_HOSTED_AI === 'true';

// Chọn controller phù hợp
const chatController = USE_SELF_HOSTED ? selfHostedController : openaiController;

console.log(`🤖 Chatbot mode: ${USE_SELF_HOSTED ? 'COOKBOT FINE-TUNED (Groq API + Training Data)' : 'OpenAI API'}`);
if (USE_SELF_HOSTED) {
  console.log(`   📚 Training Data: dataset_cookbot.jsonl (50+ samples)`);
  console.log(`   🔧 System Prompt: Fine-tuned (200+ lines)`);
  console.log(`   🌐 Model: https://huggingface.co/uduptit/cookbot-vietnamese`);
}

// Configure multer for image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Tất cả routes đều cần authentication
router.use(authenticate);

// POST /api/chatbot/message - Gửi tin nhắn (có thể kèm ảnh)
router.post('/message', upload.single('image'), async (req, res) => {
  if (req.file) {
    return chatController.sendMessageWithImage(req, res);
  }
  return chatController.sendMessage(req, res);
});

// GET /api/chatbot/history - Lấy lịch sử chat
router.get('/history', openaiController.getHistory);

// DELETE /api/chatbot/history - Xóa lịch sử chat
router.delete('/history', openaiController.clearHistory);

// GET /api/chatbot/check-apikey - Kiểm tra API status
router.get('/check-apikey', chatController.checkApiKey);

export default router;

