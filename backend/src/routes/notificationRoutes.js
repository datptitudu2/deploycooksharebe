/**
 * Notification Routes
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  savePushToken,
} from '../controllers/notificationController.js';

const router = express.Router();

// Tất cả routes đều cần authenticate
router.use(authenticate);

// GET /notifications - Lấy danh sách notifications
router.get('/', getNotifications);

// GET /notifications/unread-count - Lấy số notifications chưa đọc
router.get('/unread-count', getUnreadCount);

// PUT /notifications/:notificationId/read - Đánh dấu đã đọc
router.put('/:notificationId/read', markAsRead);

// PUT /notifications/read-all - Đánh dấu tất cả đã đọc
router.put('/read-all', markAllAsRead);

// DELETE /notifications/:notificationId - Xóa notification
router.delete('/:notificationId', deleteNotification);

// DELETE /notifications/read - Xóa tất cả notifications đã đọc
router.delete('/read', deleteAllRead);

// POST /notifications/push-token - Lưu push token
router.post('/push-token', savePushToken);

export default router;

