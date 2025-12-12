import express from 'express';
import { Story } from '../models/Story.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /stories - Lấy tất cả stories đang active
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.headers.authorization ? req.user?._id : null;
    const limit = parseInt(req.query.limit) || 20;
    
    const stories = await Story.getActiveStories(userId, limit);
    
    res.json({
      success: true,
      data: stories
    });
  } catch (error) {
    console.error('Error getting stories:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy stories'
    });
  }
});

/**
 * GET /stories/tips - Lấy cooking tips
 */
router.get('/tips', async (req, res) => {
  try {
    const { getFileUrlFromStorage } = await import('../utils/storage.js');
    const { db } = await import('../config/database.js').then(m => m.connectToDatabase());
    const { ObjectId } = await import('mongodb');
    
    // Dùng aggregate với $lookup để lấy user info giống như recipe
    let tips = await db.collection('stories').aggregate([
      {
        $match: { type: 'tip' }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          userName: { $ifNull: ['$userName', '$user.name'] },
          userAvatar: { $ifNull: ['$userAvatar', '$user.avatar'] },
          userStorage: { $ifNull: ['$user.storage', 'local'] },
          type: 1,
          tipTitle: 1,
          tipContent: 1,
          viewCount: 1,
          likeCount: 1,
          createdAt: 1,
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray();
    
    // Nếu không có tips, tạo sample
    if (tips.length === 0) {
      await Story.createSampleTips();
      tips = await db.collection('stories').aggregate([
        {
          $match: { type: 'tip' }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            userName: { $ifNull: ['$userName', '$user.name'] },
            userAvatar: { $ifNull: ['$userAvatar', '$user.avatar'] },
            userStorage: { $ifNull: ['$user.storage', 'local'] },
            type: 1,
            tipTitle: 1,
            tipContent: 1,
            viewCount: 1,
            likeCount: 1,
            createdAt: 1,
          }
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $limit: 10
        }
      ]).toArray();
    }
    
    // Format avatar URLs
    const formattedTips = tips.map(tip => {
      const formatted = { ...tip };
      
      // Format avatar URL nếu có
      if (formatted.userAvatar && !formatted.userAvatar.startsWith('http')) {
        const storage = formatted.userStorage || 'local';
        formatted.userAvatar = getFileUrlFromStorage(req, formatted.userAvatar, 'avatar', storage);
      }
      
      // Đảm bảo có userName
      if (!formatted.userName) {
        formatted.userName = 'Người dùng';
      }
      
      // Xóa userStorage khỏi response
      delete formatted.userStorage;
      
      return formatted;
    });
    
    res.json({
      success: true,
      data: formattedTips
    });
  } catch (error) {
    console.error('Error getting tips:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy cooking tips'
    });
  }
});

/**
 * GET /stories/user/:userId - Lấy stories của 1 user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const stories = await Story.getUserStories(userId);
    
    res.json({
      success: true,
      data: stories
    });
  } catch (error) {
    console.error('Error getting user stories:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy stories'
    });
  }
});

/**
 * POST /stories - Tạo story mới (protected)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { getFileUrlFromStorage } = await import('../utils/storage.js');
    const { User } = await import('../models/User.js');
    const { type, content, thumbnail, caption, tipTitle, tipContent, duration } = req.body;
    
    // Lấy userId đúng
    const userId = req.user?.userId || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }
    
    // Lấy thông tin user để có name và avatar
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user'
      });
    }
    
    // Format avatar URL nếu có
    let userAvatarUrl = null;
    if (user.avatar) {
      const storage = user.storage || 'local';
      userAvatarUrl = getFileUrlFromStorage(req, user.avatar, 'avatar', storage);
    }
    
    const story = await Story.create({
      userId: userId,
      userName: user.name || 'Người dùng',
      userAvatar: userAvatarUrl, // Lưu URL đã format
      type,
      content,
      thumbnail,
      caption,
      tipTitle,
      tipContent,
      duration,
    });
    
    // Nếu là tip mới, gửi notification cho tất cả users
    if (type === 'tip' && tipTitle) {
      try {
        const { createNewTipNotification } = await import('../utils/notificationHelper.js');
        await createNewTipNotification(
          userId,
          user.name || 'Người dùng',
          userAvatarUrl,
          story._id.toString(),
          tipTitle,
          tipContent || ''
        );
      } catch (error) {
        console.error('Error creating new tip notification:', error);
        // Không throw để không ảnh hưởng đến việc tạo story
      }
    }
    
    res.json({
      success: true,
      data: story,
      message: 'Đã tạo story thành công'
    });
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo story'
    });
  }
});

/**
 * POST /stories/:storyId/view - Đánh dấu đã xem story (protected)
 */
router.post('/:storyId/view', authenticate, async (req, res) => {
  try {
    const { storyId } = req.params;
    await Story.markAsViewed(storyId, req.user._id);
    
    res.json({
      success: true,
      message: 'Đã đánh dấu xem'
    });
  } catch (error) {
    console.error('Error marking story as viewed:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đánh dấu xem'
    });
  }
});

/**
 * POST /stories/:storyId/like - Like/Unlike story (protected)
 */
router.post('/:storyId/like', authenticate, async (req, res) => {
  try {
    const { storyId } = req.params;
    const result = await Story.toggleLike(storyId, req.user._id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy story'
      });
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error liking story:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi like story'
    });
  }
});

/**
 * DELETE /stories/:storyId - Xóa story (protected)
 */
router.delete('/:storyId', authenticate, async (req, res) => {
  try {
    const { storyId } = req.params;
    const result = await Story.delete(storyId, req.user._id);
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy story hoặc không có quyền xóa'
      });
    }
    
    res.json({
      success: true,
      message: 'Đã xóa story'
    });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa story'
    });
  }
});

export default router;

