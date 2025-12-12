import { connectToDatabase } from '../config/database.js';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'chatbot_history';

export class ChatbotHistory {
  /**
   * Lưu message vào lịch sử
   */
  static async saveMessage(userId, messageData) {
    const { db } = await connectToDatabase();
    const { role, content, image, videoInfo, mealName, timestamp } = messageData;

    const messageDoc = {
      userId: new ObjectId(userId),
      role, // 'user' or 'assistant'
      content: content || '',
      image: image || null,
      videoInfo: videoInfo || null,
      mealName: mealName || null,
      timestamp: timestamp || new Date(),
      createdAt: new Date(),
    };

    const result = await db.collection(COLLECTION_NAME).insertOne(messageDoc);
    return { ...messageDoc, _id: result.insertedId };
  }

  /**
   * Lấy lịch sử chat của user
   */
  static async getHistory(userId, options = {}) {
    const { db } = await connectToDatabase();
    const { limit = 100, skip = 0 } = options;

    const messages = await db
      .collection(COLLECTION_NAME)
      .find({ userId: new ObjectId(userId) })
      .sort({ timestamp: 1 }) // Sắp xếp từ cũ đến mới
      .limit(limit)
      .skip(skip)
      .toArray();

    return messages;
  }

  /**
   * Xóa lịch sử chat của user
   */
  static async clearHistory(userId) {
    const { db } = await connectToDatabase();
    const result = await db.collection(COLLECTION_NAME).deleteMany({
      userId: new ObjectId(userId),
    });
    return result.deletedCount;
  }

  /**
   * Lấy số lượng messages trong lịch sử
   */
  static async getHistoryCount(userId) {
    const { db } = await connectToDatabase();
    return await db.collection(COLLECTION_NAME).countDocuments({
      userId: new ObjectId(userId),
    });
  }
}

