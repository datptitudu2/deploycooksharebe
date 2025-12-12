/**
 * User Service
 * API calls for user-related operations
 */

import api, { ApiResponse } from './api';

// Types
export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  gender?: string;
  level: number;
  points: number;
  createdAt: string;
}

export interface UserStats {
  recipesCount: number;
  savedCount: number;
  followersCount: number;
  followingCount: number;
  totalLikes: number;
  streak: number;
  mealsCooked: number;
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: string;
}

export interface Achievement {
  _id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalMealsCooked: number;
  totalRecipesCreated: number;
  totalPoints: number;
  level: number;
  badges: Badge[];
  lastCookingDate?: string;
}

export interface FeaturedChef {
  _id: string;
  name: string;
  avatar?: string;
  recipesCount: number;
  followersCount: number;
  isFollowing: boolean;
}

export interface UpdateProfileData {
  name?: string;
  bio?: string;
  phone?: string;
  gender?: string;
}

// API Functions
const userService = {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<User>> {
    const response = await api.get('/user/profile');
    // Backend trả về { success: true, profile: {...} }
    // Cần convert thành { success: true, data: {...} } để match với ApiResponse<User>
    if (response.data.success && (response.data as any).profile) {
      return {
        success: true,
        data: (response.data as any).profile as User,
      };
    }
    return response.data;
  },

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<ApiResponse<User>> {
    const response = await api.put('/user/profile', data);
    return response.data;
  },

  /**
   * Upload avatar
   */
  async uploadAvatar(imageUri: string): Promise<ApiResponse<{ avatarUrl: string }>> {
    const formData = new FormData();
    formData.append('avatar', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as any);

    const response = await api.post('/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Forgot password - Request OTP
   */
  async forgotPassword(email: string): Promise<ApiResponse<{ otp?: string }>> {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset password - Verify OTP and set new password
   */
  async resetPassword(email: string, otp: string, newPassword: string): Promise<ApiResponse<null>> {
    const response = await api.post('/auth/reset-password', { email, otp, newPassword });
    return response.data;
  },

  /**
   * Change password - Đổi mật khẩu khi đã đăng nhập
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<null>> {
    const response = await api.post('/user/change-password', { currentPassword, newPassword });
    return response.data;
  },

  /**
   * Get user stats
   */
  async getStats(): Promise<ApiResponse<UserStats>> {
    const response = await api.get('/achievements/stats');
    return response.data;
  },

  /**
   * Get achievements
   */
  async getAchievements(): Promise<ApiResponse<Achievement>> {
    const response = await api.get('/achievements');
    return response.data;
  },

  /**
   * Get featured chefs
   */
  async getFeaturedChefs(limit: number = 10): Promise<ApiResponse<FeaturedChef[]>> {
    const response = await api.get(`/user/featured-chefs?limit=${limit}`);
    return response.data;
  },

  /**
   * Get all chefs (for messaging)
   */
  async getAllChefs(limit: number = 50): Promise<ApiResponse<User[]>> {
    const response = await api.get(`/user/chefs?limit=${limit}`);
    return response.data;
  },

  /**
   * Get all users (for chef messaging)
   */
  async getAllUsers(limit: number = 50): Promise<ApiResponse<User[]>> {
    const response = await api.get(`/user/users?limit=${limit}`);
    return response.data;
  },

  /**
   * Follow/Unfollow user
   */
  async toggleFollow(userId: string): Promise<ApiResponse<{ following: boolean }>> {
    const response = await api.post(`/user/${userId}/follow`);
    return response.data;
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<ApiResponse<User & UserStats>> {
    const response = await api.get(`/user/${userId}`);
    return response.data;
  },

  /**
   * Get followers list
   */
  async getFollowers(limit: number = 100): Promise<ApiResponse<User[]>> {
    const response = await api.get(`/user/followers?limit=${limit}`);
    return response.data;
  },

  /**
   * Get following list
   */
  async getFollowing(limit: number = 100): Promise<ApiResponse<User[]>> {
    const response = await api.get(`/user/following?limit=${limit}`);
    return response.data;
  },

  /**
   * Update lastSeen (gọi khi user online/hoạt động)
   */
  async updateLastSeen(): Promise<ApiResponse<null>> {
    const response = await api.put('/user/lastSeen');
    return response.data;
  },

  /**
   * Record cooking activity (for streak)
   */
  async recordCooking(recipeId?: string): Promise<ApiResponse<Achievement>> {
    const response = await api.post('/achievements/cook', { recipeId });
    return response.data;
  },
};

export default userService;

