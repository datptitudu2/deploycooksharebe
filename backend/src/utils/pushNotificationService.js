/**
 * Push Notification Service
 * Gửi push notifications qua Expo Push Notification API
 */

import { connectToDatabase } from '../config/database.js';
import { ObjectId } from 'mongodb';

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Gửi push notification
 * @param {string} pushToken - Expo push token
 * @param {string} title - Tiêu đề notification
 * @param {string} body - Nội dung notification
 * @param {object} data - Data để navigate khi tap vào notification
 */
async function sendPushNotification(pushToken, title, body, data = {}) {
  try {
    const message = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      // Android specific
      channelId: data.type === 'challenge' ? 'challenges' : 
                 (data.type === 'meal_reminder' || data.type === 'meal_check') ? 'meals' :
                 (data.type === 'comment' || data.type === 'like' || data.type === 'follow' || data.type === 'reply' || data.type === 'rating' || data.type === 'new_recipe' || data.type === 'new_tip') ? 'interactions' :
                 'default',
    };

    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    
    if (result.data?.status === 'error') {
      console.error('Push notification error:', result.data.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

/**
 * Lấy push token của user từ database
 */
async function getUserPushToken(userId) {
  try {
    const { db } = await connectToDatabase();
    const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    const user = await db.collection('users').findOne(
      { _id: userIdObj },
      { projection: { pushToken: 1 } }
    );

    return user?.pushToken || null;
  } catch (error) {
    console.error('Error getting user push token:', error);
    return null;
  }
}

/**
 * Gửi push notification cho user
 */
export async function sendPushNotificationToUser(userId, title, body, data = {}) {
  try {
    const pushToken = await getUserPushToken(userId);
    
    if (!pushToken) {
      // User chưa có push token, không gửi
      return false;
    }

    return await sendPushNotification(pushToken, title, body, data);
  } catch (error) {
    console.error('Error sending push notification to user:', error);
    return false;
  }
}

/**
 * Gửi push notification cho nhiều users
 */
export async function sendPushNotificationToUsers(userIds, title, body, data = {}) {
  try {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    const userIdsObj = userIds.map(id => typeof id === 'string' ? new ObjectId(id) : id);
    
    const users = await db.collection('users').find(
      { _id: { $in: userIdsObj } },
      { projection: { pushToken: 1 } }
    ).toArray();

    const pushTokens = users
      .map(user => user.pushToken)
      .filter(token => token); // Chỉ lấy users có push token

    if (pushTokens.length === 0) {
      return { sent: 0, total: userIds.length };
    }

    // Gửi notification cho tất cả tokens
    const messages = pushTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      // Android specific
      channelId: data.type === 'challenge' ? 'challenges' : 
                 (data.type === 'meal_reminder' || data.type === 'meal_check') ? 'meals' :
                 (data.type === 'comment' || data.type === 'like' || data.type === 'follow' || data.type === 'reply' || data.type === 'rating' || data.type === 'new_recipe') ? 'interactions' :
                 'default',
    }));

    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    
    // Đếm số notification đã gửi thành công
    const sent = Array.isArray(result.data) 
      ? result.data.filter(r => r.status === 'ok').length
      : (result.data?.status === 'ok' ? 1 : 0);

    return { sent, total: userIds.length };
  } catch (error) {
    console.error('Error sending push notifications to users:', error);
    return { sent: 0, total: userIds.length };
  }
}
