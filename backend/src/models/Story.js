import { connectToDatabase } from '../config/database.js';

const COLLECTION_NAME = 'stories';

export class Story {
  /**
   * Tạo story mới
   */
  static async create(storyData) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    const story = {
      userId: typeof storyData.userId === 'string' ? new ObjectId(storyData.userId) : storyData.userId,
      userName: storyData.userName,
      userAvatar: storyData.userAvatar,
      type: storyData.type || 'image', // 'image' | 'video' | 'tip'
      content: storyData.content, // URL của media
      thumbnail: storyData.thumbnail,
      caption: storyData.caption || '',
      tipTitle: storyData.tipTitle || '', // Nếu là tip
      tipContent: storyData.tipContent || '', // Nội dung tip
      duration: storyData.duration || 5, // Thời gian hiển thị (giây)
      views: [],
      likes: [],
      viewCount: 0,
      likeCount: 0,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Hết hạn sau 24h
      createdAt: new Date(),
    };
    
    const result = await db.collection(COLLECTION_NAME).insertOne(story);
    return { ...story, _id: result.insertedId };
  }

  /**
   * Lấy stories đang active (chưa hết hạn)
   */
  static async getActiveStories(userId = null, limit = 20) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    const now = new Date();
    
    // Aggregate để group stories theo user
    const pipeline = [
      {
        $match: {
          expiresAt: { $gt: now }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$userId',
          stories: { $push: '$$ROOT' },
          latestStory: { $first: '$$ROOT' },
          userName: { $first: '$userName' },
          userAvatar: { $first: '$userAvatar' },
          storyCount: { $sum: 1 },
        }
      },
      {
        $project: {
          userId: '$_id',
          userName: 1,
          userAvatar: 1,
          storyCount: 1,
          latestStory: 1,
          stories: { $slice: ['$stories', 10] }, // Max 10 stories per user
          hasUnviewed: userId ? {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$stories',
                    as: 'story',
                    cond: { $not: { $in: [new ObjectId(userId), '$$story.views'] } }
                  }
                }
              },
              0
            ]
          } : true
        }
      },
      {
        $sort: { 'latestStory.createdAt': -1 }
      },
      {
        $limit: limit
      }
    ];
    
    return await db.collection(COLLECTION_NAME).aggregate(pipeline).toArray();
  }

  /**
   * Lấy stories của 1 user
   */
  static async getUserStories(userId) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const now = new Date();
    
    return await db.collection(COLLECTION_NAME)
      .find({
        userId: userObjId,
        expiresAt: { $gt: now }
      })
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Đánh dấu đã xem story
   */
  static async markAsViewed(storyId, viewerId) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    const storyObjId = typeof storyId === 'string' ? new ObjectId(storyId) : storyId;
    const viewerObjId = typeof viewerId === 'string' ? new ObjectId(viewerId) : viewerId;
    
    return await db.collection(COLLECTION_NAME).updateOne(
      { _id: storyObjId },
      {
        $addToSet: { views: viewerObjId },
        $inc: { viewCount: 1 }
      }
    );
  }

  /**
   * Like/Unlike story
   */
  static async toggleLike(storyId, userId) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    const storyObjId = typeof storyId === 'string' ? new ObjectId(storyId) : storyId;
    const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    const story = await db.collection(COLLECTION_NAME).findOne({ _id: storyObjId });
    if (!story) return null;
    
    const hasLiked = story.likes?.some(id => id.toString() === userObjId.toString());
    
    if (hasLiked) {
      await db.collection(COLLECTION_NAME).updateOne(
        { _id: storyObjId },
        {
          $pull: { likes: userObjId },
          $inc: { likeCount: -1 }
        }
      );
      return { liked: false };
    } else {
      await db.collection(COLLECTION_NAME).updateOne(
        { _id: storyObjId },
        {
          $addToSet: { likes: userObjId },
          $inc: { likeCount: 1 }
        }
      );
      return { liked: true };
    }
  }

  /**
   * Xóa story
   */
  static async delete(storyId, userId) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    const storyObjId = typeof storyId === 'string' ? new ObjectId(storyId) : storyId;
    const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    return await db.collection(COLLECTION_NAME).deleteOne({
      _id: storyObjId,
      userId: userObjId
    });
  }

  /**
   * Tạo sample stories (cooking tips)
   */
  static async createSampleTips() {
    const { db } = await connectToDatabase();
    
    const tips = [
      {
        type: 'tip',
        tipTitle: 'Mẹo luộc rau xanh',
        tipContent: 'Thêm chút muối và dầu ăn vào nước sôi trước khi luộc rau để giữ màu xanh tươi!',
        userName: 'Chef Minh',
        userAvatar: 'https://i.pravatar.cc/150?u=chef1',
        duration: 8,
      },
      {
        type: 'tip',
        tipTitle: 'Bí quyết cơm ngon',
        tipContent: 'Vo gạo nhẹ tay 2-3 lần, ngâm 15 phút trước khi nấu. Cơm sẽ dẻo và thơm hơn!',
        userName: 'Đầu bếp Lan',
        userAvatar: 'https://i.pravatar.cc/150?u=chef2',
        duration: 8,
      },
      {
        type: 'tip',
        tipTitle: 'Thịt mềm hơn',
        tipContent: 'Ướp thịt với chút dứa tươi xay hoặc đu đủ xanh 15 phút sẽ làm thịt mềm hơn!',
        userName: 'Chef Hùng',
        userAvatar: 'https://i.pravatar.cc/150?u=chef3',
        duration: 8,
      },
      {
        type: 'tip',
        tipTitle: 'Giữ hành tươi lâu',
        tipContent: 'Bọc hành lá trong giấy ướt rồi cho vào túi zip để trong ngăn mát, giữ được 2 tuần!',
        userName: 'Mẹ Việt',
        userAvatar: 'https://i.pravatar.cc/150?u=chef4',
        duration: 8,
      },
    ];
    
    const now = new Date();
    const stories = tips.map((tip, index) => ({
      ...tip,
      userId: null, // System tips
      content: null,
      thumbnail: `https://images.unsplash.com/photo-${1540189549336 + index}-e6e6e6e6e6e6?w=400`,
      views: [],
      likes: [],
      viewCount: Math.floor(Math.random() * 100) + 20,
      likeCount: Math.floor(Math.random() * 50) + 5,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days for tips
      createdAt: new Date(now.getTime() - index * 60 * 60 * 1000),
    }));
    
    await db.collection(COLLECTION_NAME).insertMany(stories);
    return stories;
  }
}

