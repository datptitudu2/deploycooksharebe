import { connectToDatabase } from '../config/database.js';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'messages';

export class Message {
  /**
   * Gửi message mới
   */
  static async create(messageData) {
    const { db } = await connectToDatabase();
    const { senderId, receiverId, content, type = 'text', imageUrl = null, voiceUrl = null, voiceDuration = null, replyTo = null } = messageData;

    const messageDoc = {
      senderId: new ObjectId(senderId),
      receiverId: new ObjectId(receiverId),
      content: content ? content.trim() : '🎤 Voice message',
      type, // 'text', 'image', 'voice'
      imageUrl: imageUrl || null,
      voiceUrl: voiceUrl || null,
      voiceDuration: voiceDuration || null,
      replyTo: replyTo ? new ObjectId(replyTo) : null, // Reference to message being replied to
      reactions: [], // Array of { userId: ObjectId, emoji: string }
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTION_NAME).insertOne(messageDoc);
    return { ...messageDoc, _id: result.insertedId };
  }

  /**
   * Lấy messages giữa 2 users (conversation)
   */
  static async getConversation(userId1, userId2, options = {}) {
    const { db } = await connectToDatabase();
    const { limit = 50, skip = 0 } = options;

    const user1Id = new ObjectId(userId1);
    const user2Id = new ObjectId(userId2);

    const messages = await db
      .collection(COLLECTION_NAME)
      .find({
        $or: [
          { senderId: user1Id, receiverId: user2Id },
          { senderId: user2Id, receiverId: user1Id },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    return messages.reverse(); // Reverse để hiển thị từ cũ đến mới
  }

  /**
   * Lấy danh sách conversations của user
   */
  static async getConversations(userId) {
    const { db } = await connectToDatabase();
    const userIdObj = new ObjectId(userId);

    // Lấy tất cả messages liên quan đến user này
    const messages = await db
      .collection(COLLECTION_NAME)
      .find({
        $or: [{ senderId: userIdObj }, { receiverId: userIdObj }],
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Group by conversation partner và lấy message mới nhất
    const conversationsMap = new Map();

    for (const msg of messages) {
      const partnerId =
        msg.senderId.toString() === userId
          ? msg.receiverId.toString()
          : msg.senderId.toString();

      if (!conversationsMap.has(partnerId)) {
        // Initialize unread count: count if message is unread and user is receiver
        const initialUnreadCount = (!msg.read && msg.receiverId.toString() === userId) ? 1 : 0;
        conversationsMap.set(partnerId, {
          partnerId,
          lastMessage: msg,
          unreadCount: initialUnreadCount,
        });
      } else {
        const conv = conversationsMap.get(partnerId);
        // Update unread count nếu message chưa đọc và là từ partner (user là receiver)
        if (!msg.read && msg.receiverId.toString() === userId) {
          conv.unreadCount++;
        }
      }
    }

    return Array.from(conversationsMap.values());
  }

  /**
   * Đánh dấu messages là đã đọc
   */
  static async markAsRead(senderId, receiverId) {
    const { db } = await connectToDatabase();

    const result = await db.collection(COLLECTION_NAME).updateMany(
      {
        senderId: new ObjectId(senderId),
        receiverId: new ObjectId(receiverId),
        read: false,
      },
      {
        $set: { read: true, updatedAt: new Date() },
      }
    );

    return result;
  }

  /**
   * Đếm số unread messages
   */
  static async getUnreadCount(userId) {
    const { db } = await connectToDatabase();
    const userIdObj = new ObjectId(userId);

    const count = await db.collection(COLLECTION_NAME).countDocuments({
      receiverId: userIdObj,
      read: false,
    });

    return count;
  }

  /**
   * Tìm message theo ID
   */
  static async findById(messageId) {
    const { db } = await connectToDatabase();
    return await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(messageId) });
  }

  /**
   * Xóa message (chỉ sender mới có quyền xóa)
   */
  static async delete(messageId, userId) {
    const { db } = await connectToDatabase();
    const message = await this.findById(messageId);
    if (!message) {
      throw new Error('Không tìm thấy tin nhắn');
    }
    // Only sender can delete their own message
    const messageSenderId = message.senderId?.toString ? message.senderId.toString() : String(message.senderId);
    const normalizedUserId = userId?.toString ? userId.toString() : String(userId);
    if (messageSenderId !== normalizedUserId) {
      throw new Error('Không có quyền xóa tin nhắn này');
    }
    const result = await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(messageId) });
    return { message, deletedCount: result.deletedCount };
  }

  /**
   * Xóa tất cả messages trong một conversation (chỉ xóa messages của user hiện tại)
   */
  static async deleteConversation(userId, partnerId) {
    const { db } = await connectToDatabase();
    const normalizedUserId = userId?.toString ? userId.toString() : String(userId);
    const normalizedPartnerId = partnerId?.toString ? partnerId.toString() : String(partnerId);
    
    // Delete all messages where current user is the sender and partner is the receiver
    // OR where current user is the receiver and partner is the sender
    const result = await db.collection(COLLECTION_NAME).deleteMany({
      $or: [
        {
          senderId: new ObjectId(normalizedUserId),
          receiverId: new ObjectId(normalizedPartnerId),
        },
        {
          senderId: new ObjectId(normalizedPartnerId),
          receiverId: new ObjectId(normalizedUserId),
        },
      ],
    });
    
    return { deletedCount: result.deletedCount };
  }
}

