import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import {
  sendMessage,
  getConversation,
  getConversations,
  getUnreadCount,
  toggleReaction,
  deleteMessage,
  deleteConversation,
} from '../controllers/messageController.js';

const router = express.Router();

// Configure multer for image and audio upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Allow images and audio files
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép upload file ảnh hoặc audio!'), false);
    }
  },
});

// All routes require authentication
router.use(authenticate);

// Gửi message (có thể kèm ảnh hoặc voice)
router.post('/send', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'voice', maxCount: 1 },
]), sendMessage);

// Lấy conversation giữa 2 users
router.get('/conversation/:partnerId', getConversation);

// Lấy danh sách conversations
router.get('/conversations', getConversations);

// Đếm số unread messages
router.get('/unread-count', getUnreadCount);

// Xóa toàn bộ cuộc trò chuyện (phải đặt trước /:messageId để tránh xung đột)
router.delete('/conversation/:partnerId', deleteConversation);

// Thêm/xóa cảm xúc
router.put('/:messageId/reaction', toggleReaction);

// Xóa tin nhắn (thu hồi)
router.delete('/:messageId', deleteMessage);

export default router;

