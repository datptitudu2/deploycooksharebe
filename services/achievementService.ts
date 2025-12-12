/**
 * Achievement Service
 * API calls for achievements, streaks, and stats
 */

import api, { ApiResponse } from './api';

export interface AchievementStats {
  level: number;
  points: number;
  currentStreak: number;
  longestStreak: number;
  totalMealsCooked: number;
  totalRecipesCreated: number;
  totalRecipesShared: number;
  totalViews: number;
  totalLikes: number;
  totalRatings: number;
  averageRating: number;
  badgesCount: number;
}

export interface LevelUpReward {
  points: number;
  badge: string | null;
}

export interface MarkMealCookedResponse {
  success: boolean;
  message: string;
  leveledUp: boolean;
  reward: LevelUpReward | null;
  newLevel: number;
  points: number;
}

export const achievementService = {
  /**
   * Get user stats
   */
  async getStats(): Promise<ApiResponse<AchievementStats>> {
    const response = await api.get('/achievements/stats');
    return response.data;
  },

  /**
   * Get achievements
   */
  async getAchievements(): Promise<ApiResponse<any>> {
    const response = await api.get('/achievements');
    return response.data;
  },

  /**
   * Get badges
   */
  async getBadges(): Promise<ApiResponse<any>> {
    const response = await api.get('/achievements/badges');
    return response.data;
  },

  /**
   * Mark meal as cooked
   */
  async markMealAsCooked(date: string, mealType: string): Promise<MarkMealCookedResponse> {
    const response = await api.post('/achievements/mark-meal-cooked', {
      date,
      mealType,
    });
    return response.data;
  },

  /**
   * Update streak
   */
  async updateStreak(): Promise<ApiResponse<any>> {
    const response = await api.post('/achievements/streak');
    return response.data;
  },

  /**
   * Get leaderboard
   */
  async getLeaderboard(type: 'level' | 'streak' | 'points' | 'meals' | 'recipes' = 'level', limit: number = 50): Promise<ApiResponse<any[]>> {
    const response = await api.get(`/achievements/leaderboard?type=${type}&limit=${limit}`);
    return response.data;
  },
};

export default achievementService;

