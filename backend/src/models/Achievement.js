/**
 * Achievement Model
 * Quản lý thành tích/chuỗi (streaks, achievements) của user
 */

import { connectToDatabase } from '../config/database.js';

const COLLECTION_NAME = 'user_achievements';

export class Achievement {
  /**
   * Lấy thành tích của user
   */
  static async get(userId) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    // Đảm bảo userId là ObjectId
    const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    let achievements = await db.collection(COLLECTION_NAME).findOne({ userId: userObjId });

    // Nếu chưa có, tạo mới với giá trị mặc định
    if (!achievements) {
      achievements = await this.initialize(userObjId);
    }

    return achievements;
  }

  /**
   * Khởi tạo thành tích mặc định
   */
  static async initialize(userId) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    // Đảm bảo userId là ObjectId
    const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;

    const defaultAchievements = {
      userId: userObjId,
      
      // Streaks (chuỗi hoạt động)
      currentStreak: 0, // Số ngày liên tục
      longestStreak: 0,
      lastActiveDate: null,
      
      // Cooking Stats
      totalMealsCooked: 0,
      totalRecipesCreated: 0,
      totalRecipesShared: 0,
      
      // Social Stats
      totalLikesReceived: 0,
      totalRatingsReceived: 0,
      totalFollowers: 0,
      totalFollowing: 0,
      
      // Badges/Achievements (danh sách huy hiệu đã đạt được)
      badges: [],
      
      // Level & Points
      level: 1,
      points: 0,
      
      // Metadata
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection(COLLECTION_NAME).insertOne(defaultAchievements);
    return defaultAchievements;
  }

  /**
   * Cập nhật streak (gọi mỗi khi user hoạt động)
   */
  static async updateStreak(userId) {
    const { db } = await connectToDatabase();
    
    const achievements = await this.get(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentStreak = achievements.currentStreak || 0;
    let longestStreak = achievements.longestStreak || 0;
    const lastActiveDate = achievements.lastActiveDate 
      ? new Date(achievements.lastActiveDate) 
      : null;

    if (lastActiveDate) {
      lastActiveDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - lastActiveDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Cùng ngày, không làm gì
        return achievements;
      } else if (diffDays === 1) {
        // Ngày tiếp theo, tăng streak
        currentStreak++;
      } else {
        // Gián đoạn, reset streak
        currentStreak = 1;
      }
    } else {
      // Lần đầu tiên
      currentStreak = 1;
    }

    // Update longest streak
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    await db.collection(COLLECTION_NAME).updateOne(
      { userId },
      {
        $set: {
          currentStreak,
          longestStreak,
          lastActiveDate: today,
          updatedAt: new Date(),
        },
      }
    );

    return { currentStreak, longestStreak };
  }

  /**
   * Thêm điểm và check level up
   */
  static async addPoints(userId, points) {
    try {
      console.log('Achievement.addPoints called with:', { userId, points });
      const { db } = await connectToDatabase();
      const { ObjectId } = await import('mongodb');
      
      // Đảm bảo userId là ObjectId
      const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
      console.log('User ObjectId:', userObjId.toString());
      
      console.log('Getting achievements...');
      const achievements = await this.get(userObjId);
      console.log('Current achievements:', { level: achievements.level, points: achievements.points });
      const oldLevel = achievements.level || 1;
      const oldPoints = achievements.points || 0;
      const newPoints = oldPoints + points;
      console.log('New points:', newPoints);
      
      // Tính level: mỗi 100 điểm lên 1 level
      const newLevel = Math.floor(newPoints / 100) + 1;
      
      // Check level up
      const leveledUp = newLevel > oldLevel;
      let reward = null;
      
      if (leveledUp) {
        // Tính reward dựa trên level
        const levelRewards = {
          2: { points: 20, badge: null },
          3: { points: 30, badge: null },
          5: { points: 50, badge: 'rising_star' },
          10: { points: 100, badge: 'master_chef' },
          20: { points: 200, badge: 'legend' },
        };
        
        reward = levelRewards[newLevel] || { points: newLevel * 10, badge: null };
        
        // Thưởng điểm bonus khi level up
        if (reward.points) {
          // Đã tính trong newPoints rồi, không cần thêm nữa
        }
        
        // Unlock badge nếu có
        if (reward.badge) {
          try {
            await this.unlockBadge(userObjId, reward.badge);
          } catch (badgeError) {
            console.error('Error unlocking badge:', badgeError);
            // Không fail nếu chỉ lỗi unlock badge
          }
        }
      }

      console.log('Updating achievements in database...');
      const updateResult = await db.collection(COLLECTION_NAME).updateOne(
        { userId: userObjId },
        {
          $set: {
            points: newPoints,
            level: newLevel,
            updatedAt: new Date(),
          },
        }
      );
      console.log('Update result:', { matchedCount: updateResult.matchedCount, modifiedCount: updateResult.modifiedCount });

      if (updateResult.matchedCount === 0) {
        console.error('Failed to update achievements for user:', userObjId);
        // Tạo mới nếu không tìm thấy
        console.log('Initializing new achievements...');
        await this.initialize(userObjId);
        // Retry update
        console.log('Retrying update...');
        const retryResult = await db.collection(COLLECTION_NAME).updateOne(
          { userId: userObjId },
          {
            $set: {
              points: newPoints,
              level: newLevel,
              updatedAt: new Date(),
            },
          }
        );
        console.log('Retry update result:', { matchedCount: retryResult.matchedCount, modifiedCount: retryResult.modifiedCount });
      }

      const returnValue = { 
        points: newPoints, 
        level: newLevel, 
        leveledUp,
        reward: leveledUp ? reward : null,
        oldLevel,
      };
      console.log('Returning from addPoints:', returnValue);
      return returnValue;
    } catch (error) {
      console.error('Error in addPoints:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error; // Re-throw để route handler catch
    }
  }

  /**
   * Unlock badge (mở khóa huy hiệu)
   */
  static async unlockBadge(userId, badgeId) {
    const { db } = await connectToDatabase();
    
    const achievements = await this.get(userId);
    const badges = achievements.badges || [];

    // Nếu đã có badge rồi thì không thêm nữa
    if (badges.includes(badgeId)) {
      return achievements;
    }

    badges.push(badgeId);

    await db.collection(COLLECTION_NAME).updateOne(
      { userId },
      {
        $set: {
          badges,
          updatedAt: new Date(),
        },
      }
    );

    // Thưởng điểm khi unlock badge
    await this.addPoints(userId, 50);

    return { badges };
  }

  /**
   * Tính điểm cho recipe dựa trên độ khó, thời gian, số nguyên liệu
   * @param {Object} recipeData - Recipe data với difficulty, prepTime, cookTime, ingredients
   * @param {Object} achievements - User achievements để tính bonus level
   * @returns {number} - Điểm được cộng
   */
  static calculateRecipePoints(recipeData, achievements = null) {
    let basePoints = 20; // Điểm cơ bản
    
    // Tính điểm dựa trên độ khó
    const difficultyMultiplier = {
      'Dễ': 1.0,
      'Trung bình': 1.5,
      'Khó': 2.0,
    };
    const difficulty = recipeData.difficulty || 'Dễ';
    const multiplier = difficultyMultiplier[difficulty] || 1.0;
    
    // Tính điểm dựa trên thời gian nấu (prepTime + cookTime)
    const totalTime = (recipeData.prepTime || 0) + (recipeData.cookTime || 0);
    const timeBonus = Math.min(Math.floor(totalTime / 10), 10); // Tối đa +10 điểm
    
    // Tính điểm dựa trên số nguyên liệu
    const ingredientsCount = Array.isArray(recipeData.ingredients) 
      ? recipeData.ingredients.length 
      : 0;
    const ingredientsBonus = Math.min(Math.floor(ingredientsCount / 3), 5); // Tối đa +5 điểm
    
    // Bonus dựa trên level (level cao hơn có bonus nhỏ)
    let levelBonus = 0;
    if (achievements && achievements.level) {
      levelBonus = Math.floor((achievements.level - 1) * 0.5); // Mỗi level thêm 0.5 điểm
    }
    
    // Tính tổng điểm
    const totalPoints = Math.floor(basePoints * multiplier) + timeBonus + ingredientsBonus + levelBonus;
    
    return Math.max(totalPoints, 20); // Tối thiểu 20 điểm
  }

  /**
   * Tính điểm cho meal cooked dựa trên meal detail
   * @param {Object} mealDetail - Meal detail với difficulty, time, ingredients
   * @param {Object} achievements - User achievements để tính bonus level
   * @returns {number} - Điểm được cộng
   */
  static calculateMealCookedPoints(mealDetail = null, achievements = null) {
    let basePoints = 12; // Điểm cơ bản
    
    // Nếu có mealDetail với thông tin chi tiết
    if (mealDetail) {
      // Tính điểm dựa trên độ khó (nếu có)
      if (mealDetail.difficulty) {
        const difficultyMultiplier = {
          'Dễ': 1.0,
          'Trung bình': 1.3,
          'Khó': 1.6,
        };
        const multiplier = difficultyMultiplier[mealDetail.difficulty] || 1.0;
        basePoints = Math.floor(basePoints * multiplier);
      }
      
      // Bonus dựa trên số nguyên liệu (nếu có)
      if (mealDetail.ingredients) {
        const ingredientsCount = typeof mealDetail.ingredients === 'string'
          ? mealDetail.ingredients.split(',').length
          : (Array.isArray(mealDetail.ingredients) ? mealDetail.ingredients.length : 0);
        const ingredientsBonus = Math.min(Math.floor(ingredientsCount / 2), 3); // Tối đa +3 điểm
        basePoints += ingredientsBonus;
      }
    }
    
    // Bonus dựa trên level (level cao hơn có bonus nhỏ)
    let levelBonus = 0;
    if (achievements && achievements.level) {
      levelBonus = Math.floor((achievements.level - 1) * 0.3); // Mỗi level thêm 0.3 điểm
    }
    
    // Tính tổng điểm
    const totalPoints = basePoints + levelBonus;
    
    return Math.max(totalPoints, 12); // Tối thiểu 12 điểm
  }

  /**
   * Cập nhật stats sau khi tạo recipe
   * @param {string} userId - User ID
   * @param {Object} recipeData - Recipe data (optional, để tính điểm động)
   */
  static async incrementRecipeCreated(userId, recipeData = null) {
    const { db } = await connectToDatabase();
    
    await db.collection(COLLECTION_NAME).updateOne(
      { userId },
      {
        $inc: { totalRecipesCreated: 1 },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );

    // Tính điểm động nếu có recipeData, nếu không dùng điểm mặc định
    let points = 20; // Điểm mặc định
    if (recipeData) {
      const achievements = await this.get(userId);
      points = this.calculateRecipePoints(recipeData, achievements);
    }
    
    // Thưởng điểm
    await this.addPoints(userId, points);

    // Check badges
    const achievements = await this.get(userId);
    if (achievements.totalRecipesCreated >= 1 && !achievements.badges.includes('first_recipe')) {
      await this.unlockBadge(userId, 'first_recipe');
    }
    if (achievements.totalRecipesCreated >= 10 && !achievements.badges.includes('chef_10')) {
      await this.unlockBadge(userId, 'chef_10');
    }
    
    return { points };
  }

  /**
   * Cập nhật stats sau khi nấu món (thêm vào meal planning)
   * @param {string} userId - User ID
   * @param {string} date - Date string (YYYY-MM-DD) của món đã nấu
   * @param {Object} mealDetail - Meal detail (optional, để tính điểm động)
   */
  static async incrementMealCooked(userId, date = null, mealDetail = null) {
    const { db } = await connectToDatabase();
    
    await db.collection(COLLECTION_NAME).updateOne(
      { userId },
      {
        $inc: { totalMealsCooked: 1 },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );

    // Update streak - chỉ tính nếu date là hôm nay hoặc hôm qua
    if (date) {
      const mealDate = new Date(date);
      mealDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const diffDays = Math.floor((today - mealDate) / (1000 * 60 * 60 * 24));
      
      // Chỉ update streak nếu là hôm nay (0) hoặc hôm qua (1)
      if (diffDays === 0 || diffDays === 1) {
        await this.updateStreakForDate(userId, mealDate);
      }
    } else {
      // Nếu không có date, dùng logic cũ (hôm nay)
      await this.updateStreak(userId);
    }

    // Tính điểm động nếu có mealDetail, nếu không dùng điểm mặc định
    let points = 12; // Điểm mặc định
    if (mealDetail) {
      const achievements = await this.get(userId);
      points = this.calculateMealCookedPoints(mealDetail, achievements);
    }
    
    // Thưởng điểm
    await this.addPoints(userId, points);
    
    return { points };
  }

  /**
   * Update streak cho một ngày cụ thể (dùng khi mark meal quá khứ)
   */
  static async updateStreakForDate(userId, targetDate) {
    const { db } = await connectToDatabase();
    
    const achievements = await this.get(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    targetDate.setHours(0, 0, 0, 0);

    let currentStreak = achievements.currentStreak || 0;
    let longestStreak = achievements.longestStreak || 0;
    const lastActiveDate = achievements.lastActiveDate 
      ? new Date(achievements.lastActiveDate) 
      : null;

    if (lastActiveDate) {
      lastActiveDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((targetDate - lastActiveDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Cùng ngày, không làm gì
        return { currentStreak, longestStreak };
      } else if (diffDays === 1) {
        // Ngày tiếp theo, tăng streak
        currentStreak++;
      } else if (diffDays > 1) {
        // Gián đoạn, reset streak
        currentStreak = 1;
      } else {
        // Ngày quá khứ (diffDays < 0), không update streak
        return { currentStreak, longestStreak };
      }
    } else {
      // Lần đầu tiên
      currentStreak = 1;
    }

    // Update longest streak
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    // Chỉ update lastActiveDate nếu targetDate >= lastActiveDate
    const shouldUpdateLastActive = !lastActiveDate || targetDate >= lastActiveDate;

    await db.collection(COLLECTION_NAME).updateOne(
      { userId },
      {
        $set: {
          currentStreak,
          longestStreak,
          ...(shouldUpdateLastActive && { lastActiveDate: targetDate }),
          updatedAt: new Date(),
        },
      }
    );

    return { currentStreak, longestStreak };
  }

  /**
   * Danh sách badges có thể đạt được
   */
  static getBadgeDefinitions() {
    return [
      {
        id: 'first_recipe',
        name: 'Đầu bếp mới',
        description: 'Tạo công thức đầu tiên',
        icon: '👨‍🍳',
        requirement: 'Tạo 1 công thức',
      },
      {
        id: 'chef_10',
        name: 'Đầu bếp chuyên nghiệp',
        description: 'Tạo 10 công thức',
        icon: '⭐',
        requirement: 'Tạo 10 công thức',
      },
      {
        id: 'streak_7',
        name: 'Kiên trì',
        description: 'Duy trì chuỗi 7 ngày',
        icon: '🔥',
        requirement: 'Hoạt động 7 ngày liên tục',
      },
      {
        id: 'streak_30',
        name: 'Huyền thoại',
        description: 'Duy trì chuỗi 30 ngày',
        icon: '🏆',
        requirement: 'Hoạt động 30 ngày liên tục',
      },
      {
        id: 'social_butterfly',
        name: 'Người kết nối',
        description: 'Có 50 followers',
        icon: '🦋',
        requirement: '50 followers',
      },
      {
        id: 'master_chef',
        name: 'Bậc thầy ẩm thực',
        description: 'Đạt level 10',
        icon: '👑',
        requirement: 'Level 10',
      },
      {
        id: 'rising_star',
        name: 'Ngôi sao đang lên',
        description: 'Đạt level 5',
        icon: '⭐',
        requirement: 'Level 5',
      },
      {
        id: 'legend',
        name: 'Huyền thoại',
        description: 'Đạt level 20',
        icon: '🌟',
        requirement: 'Level 20',
      },
      {
        id: 'cook_10',
        name: 'Đầu bếp chăm chỉ',
        description: 'Nấu 10 món',
        icon: '🍳',
        requirement: 'Nấu 10 món',
      },
      {
        id: 'cook_50',
        name: 'Đầu bếp tài ba',
        description: 'Nấu 50 món',
        icon: '👨‍🍳',
        requirement: 'Nấu 50 món',
      },
    ];
  }

  /**
   * Lấy bảng xếp hạng (leaderboard)
   */
  static async getLeaderboard(type = 'level', limit = 50) {
    const { db } = await connectToDatabase();
    const COLLECTION_NAME = 'user_achievements';
    
    let sortField = {};
    switch (type) {
      case 'level':
        sortField = { level: -1, points: -1 };
        break;
      case 'streak':
        sortField = { currentStreak: -1, longestStreak: -1 };
        break;
      case 'points':
        sortField = { points: -1 };
        break;
      case 'meals':
        sortField = { totalMealsCooked: -1 };
        break;
      case 'recipes':
        sortField = { totalRecipesCreated: -1 };
        break;
      default:
        sortField = { level: -1, points: -1 };
    }
    
    const achievements = await db
      .collection(COLLECTION_NAME)
      .find({})
      .sort(sortField)
      .limit(limit)
      .toArray();
    
    // Populate user info
    const { User } = await import('./User.js');
    const leaderboard = await Promise.all(
      achievements.map(async (achievement, index) => {
        try {
          // Convert userId to string for consistency
          const userIdStr = achievement.userId?.toString ? achievement.userId.toString() : achievement.userId;
          const user = await User.findById(userIdStr);
          
          // Skip if user doesn't exist
          if (!user) {
            console.warn(`User not found for achievement userId: ${userIdStr}`);
            return null;
          }
          
          const rank = index + 1;
          // Thưởng đặc biệt cho top 3
          let specialBadge = null;
          if (rank === 1) {
            specialBadge = 'top_1_gold';
          } else if (rank === 2) {
            specialBadge = 'top_2_silver';
          } else if (rank === 3) {
            specialBadge = 'top_3_bronze';
          }
          
          return {
            rank,
            userId: userIdStr,
            name: user.name || 'User',
            avatar: user.avatar || null,
            level: achievement.level || 1,
            points: achievement.points || 0,
            currentStreak: achievement.currentStreak || 0,
            longestStreak: achievement.longestStreak || 0,
            totalMealsCooked: achievement.totalMealsCooked || 0,
            totalRecipesCreated: achievement.totalRecipesCreated || 0,
            specialBadge, // Badge đặc biệt cho top 3
          };
        } catch (error) {
          console.error(`Error processing achievement for userId ${achievement.userId}:`, error);
          return null;
        }
      })
    );
    
    // Filter out null entries (users that don't exist)
    return leaderboard.filter(item => item !== null);
    
    return leaderboard;
  }
}

export default Achievement;

