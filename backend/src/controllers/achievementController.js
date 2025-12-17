/**
 * Achievement Controller
 * Quản lý thành tích/chuỗi của user
 */

import { Achievement } from '../models/Achievement.js';
import { Recipe } from '../models/Recipe.js';
import { HTTP_STATUS, MESSAGES } from '../constants/index.js';

/**
 * Lấy thành tích của user
 */
export const getAchievements = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    const achievements = await Achievement.get(userId);

    // Lấy recipe stats
    const recipeStats = await Recipe.getUserStats(userId);

    res.json({
      success: true,
      achievements: {
        ...achievements,
        recipeStats,
      },
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Lấy danh sách badges
 */
export const getBadges = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    const achievements = await Achievement.get(userId);
    const unlockedBadges = achievements.badges || [];
    
    const allBadges = Achievement.getBadgeDefinitions();

    // Map badges với trạng thái unlocked
    const badges = allBadges.map(badge => ({
      ...badge,
      unlocked: unlockedBadges.includes(badge.id),
    }));

    res.json({
      success: true,
      badges,
      unlockedCount: unlockedBadges.length,
      totalCount: allBadges.length,
    });
  } catch (error) {
    console.error('Get badges error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Update streak (gọi khi user hoạt động)
 */
export const updateStreak = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    const streak = await Achievement.updateStreak(userId);

    // Check streak badges
    const achievements = await Achievement.get(userId);
    if (streak.currentStreak >= 7 && !achievements.badges.includes('streak_7')) {
      await Achievement.unlockBadge(userId, 'streak_7');
    }
    if (streak.currentStreak >= 30 && !achievements.badges.includes('streak_30')) {
      await Achievement.unlockBadge(userId, 'streak_30');
    }

    res.json({
      success: true,
      ...streak,
    });
  } catch (error) {
    console.error('Update streak error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Mark meal as cooked
 */
export const markMealAsCooked = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { date, mealType } = req.body;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    if (!date || !mealType) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Vui lòng cung cấp date và mealType',
      });
    }

    const { MealPlan } = await import('../models/MealPlan.js');
    const wasNewlyMarked = await MealPlan.markMealAsCooked(userId, date, mealType);

    if (wasNewlyMarked) {
      // Lấy mealDetail để tính điểm động (lấy từ mealTypeDetail để có đầy đủ thông tin timer)
      const mealPlan = await MealPlan.findByDate(userId, date);
      const mealDetailKey = `${mealType}Detail`;
      const mealDetail = mealPlan?.[mealDetailKey] || mealPlan?.[mealType];
      
      // Lấy achievements trước khi cộng điểm để check level up
      const achievementsBefore = await Achievement.get(userId);
      const oldLevel = achievementsBefore.level || 1;
      const oldPoints = achievementsBefore.points || 0;
      
      // Tính điểm sẽ được cộng (trả về object { points, penalty, message, basePoints })
      const pointsResult = mealDetail 
        ? Achievement.calculateMealCookedPoints(mealDetail, achievementsBefore)
        : { points: 12, penalty: 0, message: '', basePoints: 12 };
      
      const pointsEarned = pointsResult.points || 12;
      
      // Tính level mới sau khi cộng điểm
      const newPoints = oldPoints + pointsEarned;
      const newLevel = Math.floor(newPoints / 100) + 1;
      const leveledUp = newLevel > oldLevel;
      
      // Tính reward nếu level up
      let reward = null;
      if (leveledUp) {
        const levelRewards = {
          2: { points: 20, badge: null },
          3: { points: 30, badge: null },
          5: { points: 50, badge: 'rising_star' },
          10: { points: 100, badge: 'master_chef' },
          20: { points: 200, badge: 'legend' },
        };
        reward = levelRewards[newLevel] || { points: newLevel * 10, badge: null };
      }
      
      // Tăng điểm và cập nhật streak (truyền date và mealDetail để tính điểm động)
      // Hàm này sẽ tự động cộng điểm và update level
      await Achievement.incrementMealCooked(userId, date, mealDetail);
      
      // Lấy achievements sau khi cộng điểm
      const achievementsAfter = await Achievement.get(userId);
      
      res.json({
        success: true,
        message: pointsResult.message || `Đã đánh dấu món đã nấu! +${pointsEarned} điểm`,
        leveledUp: leveledUp,
        reward: reward,
        newLevel: newLevel,
        points: achievementsAfter.points,
        pointsEarned: pointsEarned,
        penalty: pointsResult.penalty || 0,
        basePoints: pointsResult.basePoints || pointsEarned,
      });
    } else {
      res.json({
        success: true,
        message: 'Món này đã được đánh dấu rồi',
        leveledUp: false,
      });
    }
  } catch (error) {
    console.error('Mark meal as cooked error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Thống kê tổng quan (cho profile screen)
 */
export const getStats = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    const achievements = await Achievement.get(userId);
    const recipeStats = await Recipe.getUserStats(userId);
    
    // Tính lại meals cooked từ meal plans thực tế
    const { MealPlan } = await import('../models/MealPlan.js');
    const actualCookedCount = await MealPlan.countCookedMeals(userId);
    
    // Sync với achievements nếu khác nhau (để đảm bảo consistency)
    if (actualCookedCount !== achievements.totalMealsCooked) {
      // Có thể update achievements.totalMealsCooked = actualCookedCount nếu cần
      // Nhưng để tránh conflict, ta sẽ dùng actualCookedCount cho response
    }

    res.json({
      success: true,
      stats: {
        level: achievements.level || 1,
        points: achievements.points || 0,
        currentStreak: achievements.currentStreak || 0,
        longestStreak: achievements.longestStreak || 0,
        totalMealsCooked: actualCookedCount || achievements.totalMealsCooked || 0,
        totalRecipesCreated: recipeStats.recipesCount,
        totalRecipesShared: achievements.totalRecipesShared || 0,
        totalViews: recipeStats.totalViews,
        totalLikes: recipeStats.totalLikes,
        totalRatings: recipeStats.totalRatings,
        averageRating: recipeStats.averageRating,
        badgesCount: (achievements.badges || []).length,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Lấy bảng xếp hạng
 */
export const getLeaderboard = async (req, res) => {
  try {
    const { type = 'level', limit = 50 } = req.query;
    
    const leaderboard = await Achievement.getLeaderboard(type, parseInt(limit));
    
    // Format với avatar URLs
    const { getFileUrlFromStorage } = await import('../utils/storage.js');
    const { User } = await import('../models/User.js');
    const leaderboardWithAvatars = await Promise.all(
      leaderboard.map(async (item) => {
        try {
          // Item đã có user info từ Achievement.getLeaderboard, chỉ cần format avatar URL
          if (!item) return null;
          
          const user = await User.findById(item.userId);
          if (!user) {
            console.warn(`User not found for leaderboard item userId: ${item.userId}`);
            return null;
          }
          
          const storage = user.storage || 'local';
          const avatarUrl = item.avatar
            ? getFileUrlFromStorage(req, item.avatar, 'avatar', storage)
            : null;
          
          return {
            ...item,
            avatar: avatarUrl,
            name: user.name || item.name,
          };
        } catch (error) {
          console.error(`Error formatting leaderboard item for userId ${item?.userId}:`, error);
          return null;
        }
      })
    );
    
    // Filter out null entries
    const filteredLeaderboard = leaderboardWithAvatars.filter(item => item !== null);
    
    res.json({
      success: true,
      data: leaderboardWithAvatars,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

