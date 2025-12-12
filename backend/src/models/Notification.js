/**
 * Notification Model
 * Schema cho thông báo (notifications)
 */

import { connectToDatabase } from '../config/database.js';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'notifications';

export class Notification {
  /**
   * Tạo notification mới
   * @param {string} recipientId - ID người nhận
 * @param {string} type - Loại notification: 'comment', 'rating', 'like', 'follow', 'reply', 'new_recipe', 'new_tip'
 * @param {object} data - Dữ liệu notification
 * @param {string} data.actorId - ID người thực hiện hành động
 * @param {string} data.actorName - Tên người thực hiện
 * @param {string} data.actorAvatar - Avatar người thực hiện
 * @param {string} data.recipeId - ID recipe (nếu có)
 * @param {string} data.recipeName - Tên recipe (nếu có)
 * @param {string} data.recipeImage - Ảnh recipe (nếu có)
 * @param {string} data.commentId - ID comment (nếu có)
 * @param {string} data.commentText - Text comment (nếu có)
 * @param {number} data.rating - Rating value (nếu có)
 * @param {string} data.tipId - ID tip (nếu có)
 * @param {string} data.tipTitle - Tiêu đề tip (nếu có)
 * @param {string} data.tipContent - Nội dung tip (nếu có)
   */
  static async create(recipientId, type, data) {
    const { db } = await connectToDatabase();
    
    const notification = {
      recipientId: typeof recipientId === 'string' ? new ObjectId(recipientId) : recipientId,
      type, // 'comment', 'rating', 'like', 'follow', 'reply', 'new_recipe', 'new_tip'
      actorId: data.actorId,
      actorName: data.actorName || 'Người dùng',
      actorAvatar: data.actorAvatar || '',
      recipeId: data.recipeId ? (typeof data.recipeId === 'string' ? new ObjectId(data.recipeId) : data.recipeId) : null,
      recipeName: data.recipeName || '',
      recipeImage: data.recipeImage || '',
      commentId: data.commentId ? (typeof data.commentId === 'string' ? new ObjectId(data.commentId) : data.commentId) : null,
      commentText: data.commentText || '',
      rating: data.rating || null,
      tipId: data.tipId ? (typeof data.tipId === 'string' ? new ObjectId(data.tipId) : data.tipId) : null,
      tipTitle: data.tipTitle || '',
      tipContent: data.tipContent || '',
      read: false,
      createdAt: new Date(),
    };

    const result = await db.collection(COLLECTION_NAME).insertOne(notification);
    return { ...notification, _id: result.insertedId };
  }

  /**
   * Lấy notifications của user
   * @param {string} userId - ID user
   * @param {object} options - Options: limit, skip, unreadOnly
   */
  static async getByUserId(userId, options = {}) {
    const { db } = await connectToDatabase();
    const { limit = 50, skip = 0, unreadOnly = false } = options;
    
    const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    const query = { recipientId: userIdObj };
    if (unreadOnly) {
      query.read = false;
    }

    return await db
      .collection(COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  /**
   * Đếm số notifications chưa đọc
   */
  static async getUnreadCount(userId) {
    const { db } = await connectToDatabase();
    const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    return await db.collection(COLLECTION_NAME).countDocuments({
      recipientId: userIdObj,
      read: false,
    });
  }

  /**
   * Đánh dấu notification là đã đọc
   */
  static async markAsRead(notificationId, userId) {
    const { db } = await connectToDatabase();
    const notificationIdObj = typeof notificationId === 'string' ? new ObjectId(notificationId) : notificationId;
    const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    return await db.collection(COLLECTION_NAME).updateOne(
      {
        _id: notificationIdObj,
        recipientId: userIdObj, // Đảm bảo chỉ user nhận mới đánh dấu được
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );
  }

  /**
   * Đánh dấu tất cả notifications là đã đọc
   */
  static async markAllAsRead(userId) {
    const { db } = await connectToDatabase();
    const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    return await db.collection(COLLECTION_NAME).updateMany(
      {
        recipientId: userIdObj,
        read: false,
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );
  }

  /**
   * Xóa notification
   */
  static async delete(notificationId, userId) {
    const { db } = await connectToDatabase();
    const notificationIdObj = typeof notificationId === 'string' ? new ObjectId(notificationId) : notificationId;
    const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    return await db.collection(COLLECTION_NAME).deleteOne({
      _id: notificationIdObj,
      recipientId: userIdObj, // Đảm bảo chỉ user nhận mới xóa được
    });
  }

  /**
   * Xóa tất cả notifications đã đọc
   */
  static async deleteAllRead(userId) {
    const { db } = await connectToDatabase();
    const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    return await db.collection(COLLECTION_NAME).deleteMany({
      recipientId: userIdObj,
      read: true,
    });
  }
}

export default Notification;

