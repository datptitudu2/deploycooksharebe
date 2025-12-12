/**
 * Notification Helper
 * Helper functions để tạo notifications
 */

import { Notification } from '../models/Notification.js';
import { sendPushNotificationToUser } from './pushNotificationService.js';

/**
 * Tạo notification cho comment
 */
export const createCommentNotification = async (recipeId, recipeAuthorId, actorId, actorName, actorAvatar, recipeName, recipeImage, commentText, commentId) => {
  // Không tạo notification nếu user comment chính recipe của mình
  if (recipeAuthorId?.toString() === actorId?.toString()) {
    return;
  }

  try {
    await Notification.create(recipeAuthorId, 'comment', {
      actorId,
      actorName,
      actorAvatar,
      recipeId,
      recipeName,
      recipeImage,
      commentId,
      commentText,
    });

    // Gửi push notification
    await sendPushNotificationToUser(
      recipeAuthorId,
      '💬 Bình luận mới',
      `${actorName} đã bình luận về công thức "${recipeName}" của bạn`,
      {
        type: 'comment',
        recipeId: recipeId?.toString(),
        actorId: actorId?.toString(),
      }
    );
  } catch (error) {
    console.error('Create comment notification error:', error);
    // Không throw error để không ảnh hưởng đến flow chính
  }
};

/**
 * Tạo notification cho rating
 */
export const createRatingNotification = async (recipeId, recipeAuthorId, actorId, actorName, actorAvatar, recipeName, recipeImage, rating) => {
  // Không tạo notification nếu user rate chính recipe của mình
  if (recipeAuthorId?.toString() === actorId?.toString()) {
    return;
  }

  try {
    await Notification.create(recipeAuthorId, 'rating', {
      actorId,
      actorName,
      actorAvatar,
      recipeId,
      recipeName,
      recipeImage,
      rating,
    });

    // Gửi push notification với emoji sao
    const starEmoji = '⭐'.repeat(Math.min(rating, 5));
    await sendPushNotificationToUser(
      recipeAuthorId,
      `${starEmoji} Đánh giá mới`,
      `${actorName} đã đánh giá ${rating} sao cho món "${recipeName}" của bạn`,
      {
        type: 'rating',
        recipeId: recipeId?.toString(),
        actorId: actorId?.toString(),
        rating: rating,
      }
    );
  } catch (error) {
    console.error('Create rating notification error:', error);
  }
};

/**
 * Tạo notification cho like
 */
export const createLikeNotification = async (recipeId, recipeAuthorId, actorId, actorName, actorAvatar, recipeName, recipeImage) => {
  // Không tạo notification nếu user like chính recipe của mình
  if (recipeAuthorId?.toString() === actorId?.toString()) {
    return;
  }

  try {
    await Notification.create(recipeAuthorId, 'like', {
      actorId,
      actorName,
      actorAvatar,
      recipeId,
      recipeName,
      recipeImage,
    });

    // Gửi push notification
    await sendPushNotificationToUser(
      recipeAuthorId,
      '❤️ Thích công thức',
      `${actorName} đã thích công thức "${recipeName}" của bạn`,
      {
        type: 'like',
        recipeId: recipeId?.toString(),
        actorId: actorId?.toString(),
      }
    );
  } catch (error) {
    console.error('Create like notification error:', error);
  }
};

/**
 * Tạo notification cho follow
 */
export const createFollowNotification = async (followingId, followerId, followerName, followerAvatar) => {
  try {
    await Notification.create(followingId, 'follow', {
      actorId: followerId,
      actorName: followerName,
      actorAvatar: followerAvatar,
    });

    // Gửi push notification
    await sendPushNotificationToUser(
      followingId,
      '👥 Người theo dõi mới',
      `${followerName} đã theo dõi bạn`,
      {
        type: 'follow',
        actorId: followerId?.toString(),
      }
    );
  } catch (error) {
    console.error('Create follow notification error:', error);
  }
};

/**
 * Tạo notification cho reply
 */
export const createReplyNotification = async (commentUserId, actorId, actorName, actorAvatar, recipeId, recipeName, recipeImage, commentId, replyText) => {
  // Không tạo notification nếu user reply chính comment của mình
  if (commentUserId?.toString() === actorId?.toString()) {
    return;
  }

  try {
    await Notification.create(commentUserId, 'reply', {
      actorId,
      actorName,
      actorAvatar,
      recipeId,
      recipeName,
      recipeImage,
      commentId,
      commentText: replyText,
    });

    // Gửi push notification
    await sendPushNotificationToUser(
      commentUserId,
      '💬 Phản hồi mới',
      `${actorName} đã phản hồi bình luận của bạn`,
      {
        type: 'reply',
        recipeId: recipeId?.toString(),
        commentId: commentId?.toString(),
        actorId: actorId?.toString(),
      }
    );
  } catch (error) {
    console.error('Create reply notification error:', error);
  }
};

/**
 * Tạo notifications cho followers khi user đăng recipe mới
 */
export const createNewRecipeNotifications = async (authorId, authorName, authorAvatar, recipeId, recipeName, recipeImage) => {
  try {
    const { User } = await import('../models/User.js');
    const { connectToDatabase } = await import('../config/database.js');
    const { db } = await connectToDatabase();
    
    // Lấy danh sách followers
    const FOLLOWS_COLLECTION = 'user_follows';
    const { ObjectId } = await import('mongodb');
    
    const authorIdObj = typeof authorId === 'string' ? new ObjectId(authorId) : authorId;
    
    const followers = await db.collection(FOLLOWS_COLLECTION)
      .find({ followingId: authorIdObj })
      .toArray();
    
    // Tạo notification cho mỗi follower
    const notifications = followers.map(follower => 
      Notification.create(follower.followerId, 'new_recipe', {
        actorId: authorId,
        actorName: authorName,
        actorAvatar: authorAvatar,
        recipeId,
        recipeName,
        recipeImage,
      })
    );
    
    await Promise.all(notifications);
    console.log(`Created ${followers.length} new recipe notifications for recipe ${recipeId}`);

    // Gửi push notifications cho tất cả followers
    const { sendPushNotificationToUsers } = await import('./pushNotificationService.js');
    const followerIds = followers.map(f => f.followerId);
    
    if (followerIds.length > 0) {
      await sendPushNotificationToUsers(
        followerIds,
        '🍳 Công thức mới',
        `${authorName} vừa đăng công thức mới: "${recipeName}"`,
        {
          type: 'new_recipe',
          recipeId: recipeId?.toString(),
          actorId: authorId?.toString(),
        }
      );
    }
  } catch (error) {
    console.error('Create new recipe notifications error:', error);
    // Không throw để không ảnh hưởng đến việc tạo recipe
  }
};

