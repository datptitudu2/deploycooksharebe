/**
 * Story Service
 * API calls cho Stories (Cooking Tips)
 */

import api, { ApiResponse } from './api';

export interface Story {
  _id: string;
  userId: string | null;
  userName: string;
  userAvatar: string;
  type: 'image' | 'video' | 'tip';
  content?: string;
  thumbnail?: string;
  caption?: string;
  tipTitle?: string;
  tipContent?: string;
  duration: number;
  viewCount: number;
  likeCount: number;
  views: string[];
  likes: string[];
  expiresAt: string;
  createdAt: string;
}

export interface StoryGroup {
  userId: string;
  userName: string;
  userAvatar: string;
  storyCount: number;
  hasUnviewed: boolean;
  stories: Story[];
  latestStory: Story;
}

const storyService = {
  /**
   * Lấy tất cả stories đang active
   */
  async getActiveStories(limit = 20): Promise<ApiResponse<StoryGroup[]>> {
    const response = await api.get(`/stories?limit=${limit}`);
    return response.data;
  },

  /**
   * Lấy cooking tips
   */
  async getCookingTips(): Promise<ApiResponse<Story[]>> {
    const response = await api.get('/stories/tips');
    return response.data;
  },

  /**
   * Lấy stories của 1 user
   */
  async getUserStories(userId: string): Promise<ApiResponse<Story[]>> {
    const response = await api.get(`/stories/user/${userId}`);
    return response.data;
  },

  /**
   * Tạo story mới
   */
  async createStory(data: {
    type: 'image' | 'video' | 'tip';
    content?: string;
    thumbnail?: string;
    caption?: string;
    tipTitle?: string;
    tipContent?: string;
    duration?: number;
  }): Promise<ApiResponse<Story>> {
    const response = await api.post('/stories', data);
    return response.data;
  },

  /**
   * Đánh dấu đã xem story
   */
  async markAsViewed(storyId: string): Promise<ApiResponse<void>> {
    const response = await api.post(`/stories/${storyId}/view`);
    return response.data;
  },

  /**
   * Like/Unlike story
   */
  async toggleLike(storyId: string): Promise<ApiResponse<{ liked: boolean }>> {
    const response = await api.post(`/stories/${storyId}/like`);
    return response.data;
  },

  /**
   * Xóa story
   */
  async deleteStory(storyId: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/stories/${storyId}`);
    return response.data;
  },
};

export default storyService;

