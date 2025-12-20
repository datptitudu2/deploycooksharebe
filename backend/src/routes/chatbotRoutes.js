import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';

// Import controllers
import * as openaiController from '../controllers/chatbotController.js';
import * as selfHostedController from '../controllers/chatbotSelfHostedController.js';

const router = express.Router();

// Kiểm tra sử dụng model nào
// Default: Dùng Groq (CookBot Fine-tuned)
const CHATBOT_MODE = process.env.CHATBOT_MODE || 'groq';

// Chọn controller phù hợp
let chatController;
let modeDescription;

switch (CHATBOT_MODE.toLowerCase()) {
  case 'groq':
  case 'self-hosted':
  default:
    chatController = selfHostedController;
    modeDescription = 'COOKBOT FINE-TUNED (Groq API + Training Data)';
    console.log(`🤖 Chatbot mode: ${modeDescription}`);
    console.log(`   📚 Training Data: dataset_cookbot.jsonl (50+ samples)`);
    console.log(`   🔧 System Prompt: Fine-tuned (200+ lines)`);
    console.log(`   🌐 Model: https://huggingface.co/uduptit/cookbot-vietnamese`);
    break;
  case 'openai':
    chatController = openaiController;
    modeDescription = 'OpenAI API';
    console.log(`🤖 Chatbot mode: ${modeDescription}`);
    break;
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

