/**
 * Notification Service
 * API calls cho notifications
 */

import api, { ApiResponse } from './api';

export interface Notification {
  _id: string;
  recipientId: string;
  type: 'comment' | 'rating' | 'like' | 'follow' | 'reply' | 'new_recipe' | 'new_tip';
  actorId: string;
  actorName: string;
  actorAvatar: string;
  recipeId?: string;
  recipeName?: string;
  recipeImage?: string;
  commentId?: string;
  commentText?: string;
  rating?: number;
  tipId?: string;
  tipTitle?: string;
  tipContent?: string;
  read: boolean;
  createdAt: string;
  readAt?: string;
}

const notificationService = {
  /**
   * Lấy danh sách notifications
   */
  async getNotifications(options?: {
    limit?: number;
    skip?: number;
    unreadOnly?: boolean;
  }): Promise<ApiResponse<Notification[]>> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.skip) params.append('skip', options.skip.toString());
    if (options?.unreadOnly) params.append('unreadOnly', 'true');

    const response = await api.get(`/notifications?${params.toString()}`);
    return response.data;
  },

  /**
   * Lấy số notifications chưa đọc
   */
  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  /**
   * Đánh dấu notification là đã đọc
   */
  async markAsRead(notificationId: string): Promise<ApiResponse<void>> {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Đánh dấu tất cả notifications là đã đọc
   */
  async markAllAsRead(): Promise<ApiResponse<{ count: number }>> {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  /**
   * Xóa notification
   */
  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  /**
   * Xóa tất cả notifications đã đọc
   */
  async deleteAllRead(): Promise<ApiResponse<{ count: number }>> {
    const response = await api.delete('/notifications/read');
    return response.data;
  },
};

export default notificationService;

