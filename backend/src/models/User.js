import { connectToDatabase } from '../config/database.js';

const COLLECTION_NAME = 'users';

export class User {
  static async create(userData) {
    const { db } = await connectToDatabase();
    const result = await db.collection(COLLECTION_NAME).insertOne({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return result;
  }

  static async findByEmail(email) {
    const { db } = await connectToDatabase();
    return await db.collection(COLLECTION_NAME).findOne({ email });
  }

  static async findById(id) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    // Convert string id to ObjectId if needed
    let userId;
    if (typeof id === 'string') {
      try {
        userId = new ObjectId(id);
      } catch (error) {
        // Invalid ObjectId format
        return null;
      }
    } else {
      userId = id;
    }
    
    return await db.collection(COLLECTION_NAME).findOne({ _id: userId });
  }

  static async update(id, updateData) {
    const { db } = await connectToDatabase();
    // Convert string id to ObjectId if needed
    const { ObjectId } = await import('mongodb');
    const userId = typeof id === 'string' ? new ObjectId(id) : id;
    
    // Log update operation for debugging
    if (updateData.password) {
      console.log('🔐 User.update - Updating password for user:', userId);
      console.log('🔐 User.update - Password hash length:', updateData.password?.length);
      console.log('🔐 User.update - Password hash prefix (first 30 chars):', updateData.password?.substring(0, 30));
    }
    
    // Build update object
    const updateObject = { 
      ...updateData, 
      updatedAt: new Date() 
    };
    
    console.log('🔐 User.update - Update object keys:', Object.keys(updateObject));
    if (updateData.password) {
      console.log('🔐 User.update - Password in update object:', !!updateObject.password);
      console.log('🔐 User.update - Password value type:', typeof updateObject.password);
    }
    
    const result = await db.collection(COLLECTION_NAME).updateOne(
      { _id: userId },
      { $set: updateObject }
    );
    
    if (updateData.password) {
      console.log('🔐 User.update - Update result:', {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        acknowledged: result.acknowledged,
      });
      
      // Verify the update by fetching the user
      const updatedUser = await db.collection(COLLECTION_NAME).findOne({ _id: userId });
      if (updatedUser) {
        console.log('🔐 User.update - Verified stored password hash prefix (first 30 chars):', updatedUser.password?.substring(0, 30));
        console.log('🔐 User.update - Stored password matches update:', updatedUser.password === updateData.password);
      }
    }
    
    return result;
  }

  /**
   * Follow/Unfollow user
   */
  static async toggleFollow(followerId, followingId) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    const FOLLOWS_COLLECTION = 'user_follows';
    
    // Convert to ObjectId
    const followerObjId = typeof followerId === 'string' ? new ObjectId(followerId) : followerId;
    const followingObjId = typeof followingId === 'string' ? new ObjectId(followingId) : followingId;
    
    // Check if already following
    const existing = await db.collection(FOLLOWS_COLLECTION).findOne({
      followerId: followerObjId,
      followingId: followingObjId,
    });
    
    if (existing) {
      // Unfollow
      await db.collection(FOLLOWS_COLLECTION).deleteOne({
        followerId: followerObjId,
        followingId: followingObjId,
      });
      return { following: false };
    } else {
      // Follow
      await db.collection(FOLLOWS_COLLECTION).insertOne({
        followerId: followerObjId,
        followingId: followingObjId,
        createdAt: new Date(),
      });
      return { following: true };
    }
  }

  /**
   * Get followers count
   */
  static async getFollowersCount(userId) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    const FOLLOWS_COLLECTION = 'user_follows';
    
    const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    return await db.collection(FOLLOWS_COLLECTION).countDocuments({
      followingId: userIdObj,
    });
  }

  /**
   * Get following count
   */
  static async getFollowingCount(userId) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    const FOLLOWS_COLLECTION = 'user_follows';
    
    const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    return await db.collection(FOLLOWS_COLLECTION).countDocuments({
      followerId: userIdObj,
    });
  }

  /**
   * Get list of followers for a user
   */
  static async getFollowers(userId, limit = 100) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    const FOLLOWS_COLLECTION = 'user_follows';
    
    const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    const follows = await db.collection(FOLLOWS_COLLECTION)
      .find({ followingId: userIdObj })
      .limit(limit)
      .toArray();
    
    const followerIds = follows.map(f => f.followerId);
    const users = await db.collection(COLLECTION_NAME)
      .find({ _id: { $in: followerIds } })
      .toArray();
    
    return users;
  }

  /**
   * Get list of users that a user is following
   */
  static async getFollowing(userId, limit = 100) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    const FOLLOWS_COLLECTION = 'user_follows';
    
    const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    const follows = await db.collection(FOLLOWS_COLLECTION)
      .find({ followerId: userIdObj })
      .limit(limit)
      .toArray();
    
    const followingIds = follows.map(f => f.followingId);
    const users = await db.collection(COLLECTION_NAME)
      .find({ _id: { $in: followingIds } })
      .toArray();
    
    return users;
  }

  /**
   * Check if user is following another user
   */
  static async isFollowing(followerId, followingId) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    const FOLLOWS_COLLECTION = 'user_follows';
    
    const followerObjId = typeof followerId === 'string' ? new ObjectId(followerId) : followerId;
    const followingObjId = typeof followingId === 'string' ? new ObjectId(followingId) : followingId;
    
    const existing = await db.collection(FOLLOWS_COLLECTION).findOne({
      followerId: followerObjId,
      followingId: followingObjId,
    });
    
    return !!existing;
  }
}

