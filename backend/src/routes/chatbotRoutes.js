import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { sendMessage, sendMessageWithImage, getHistory, clearHistory } from '../controllers/chatbotController.js';

const router = express.Router();

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
    return sendMessageWithImage(req, res);
  }
  return sendMessage(req, res);
});

// GET /api/chatbot/history - Lấy lịch sử chat
router.get('/history', getHistory);

// DELETE /api/chatbot/history - Xóa lịch sử chat
router.delete('/history', clearHistory);

export default router;

