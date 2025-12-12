/**
 * Notification Controller
 * Xử lý các request liên quan đến notifications
 */

import { Notification } from '../models/Notification.js';
import { HTTP_STATUS, MESSAGES } from '../constants/index.js';

/**
 * Lấy danh sách notifications của user
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    const { limit = 50, skip = 0, unreadOnly = false } = req.query;
    
    const notifications = await Notification.getByUserId(userId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      unreadOnly: unreadOnly === 'true',
    });

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Lấy số notifications chưa đọc
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    const count = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Đánh dấu notification là đã đọc
 */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { notificationId } = req.params;
    
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    const result = await Notification.markAsRead(notificationId, userId);

    if (result.matchedCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Không tìm thấy notification',
      });
    }

    res.json({
      success: true,
      message: 'Đã đánh dấu đã đọc',
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Đánh dấu tất cả notifications là đã đọc
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    const result = await Notification.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'Đã đánh dấu tất cả là đã đọc',
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Xóa notification
 */
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { notificationId } = req.params;
    
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    const result = await Notification.delete(notificationId, userId);

    if (result.deletedCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Không tìm thấy notification',
      });
    }

    res.json({
      success: true,
      message: 'Đã xóa notification',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Xóa tất cả notifications đã đọc
 */
export const deleteAllRead = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    const result = await Notification.deleteAllRead(userId);

    res.json({
      success: true,
      message: 'Đã xóa tất cả notifications đã đọc',
      count: result.deletedCount,
    });
  } catch (error) {
    console.error('Delete all read error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Lưu push token của user
 */
export const savePushToken = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { token } = req.body;
    
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    if (!token) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Vui lòng cung cấp push token',
      });
    }

    // Lưu token vào database
    const { connectToDatabase } = await import('../config/database.js');
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    await db.collection('users').updateOne(
      { _id: typeof userId === 'string' ? new ObjectId(userId) : userId },
      { 
        $set: { 
          pushToken: token,
          pushTokenUpdatedAt: new Date()
        } 
      }
    );

    res.json({
      success: true,
      message: 'Đã lưu push token',
    });
  } catch (error) {
    console.error('Save push token error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

