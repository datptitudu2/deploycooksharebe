/**
 * Challenge Service
 * API calls cho Daily Challenges
 */

import api, { ApiResponse } from './api';
import axios from 'axios';
import { API_URL } from '@/config/api';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export interface Challenge {
  _id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  date: string;
  expiresAt: string;
  participantCount: number;
  completedCount: number;
  createdAt: string;
  timeRemaining: number;
  timeRemainingFormatted: string;
  userProgress?: {
    joined: boolean;
    completed: boolean;
    completedAt?: string;
    proofRecipeId?: string;
  };
}

export interface ChallengeHistory {
  _id: string;
  userId: string;
  challengeId: string;
  joined: boolean;
  joinedAt: string;
  completed: boolean;
  completedAt?: string;
  proofRecipeId?: string;
  challenge: Challenge;
}

export interface ChallengeStats {
  totalJoined: number;
  totalCompleted: number;
}

const challengeService = {
  /**
   * Lấy challenge hôm nay
   */
  async getTodayChallenge(): Promise<ApiResponse<Challenge>> {
    const response = await api.get('/challenges/today');
    return response.data;
  },

  /**
   * Tham gia challenge
   */
  async joinChallenge(): Promise<ApiResponse<{ alreadyJoined: boolean; userChallenge: any }>> {
    const response = await api.post('/challenges/join');
    return response.data;
  },

  /**
   * Hoàn thành challenge
   */
  async completeChallenge(recipeId?: string, proofImageUri?: string): Promise<ApiResponse<{ pointsEarned: number; challenge: Challenge; leveledUp?: boolean; newLevel?: number; newPoints?: number; reward?: any; proofImageUrl?: string }>> {
    if (proofImageUri) {
      // Upload với ảnh proof
      const formData = new FormData();
      if (recipeId) formData.append('recipeId', recipeId);
      
      const filename = proofImageUri.split('/').pop() || 'proof.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      formData.append('proofImage', {
        uri: Platform.OS === 'android' ? proofImageUri : proofImageUri.replace('file://', ''),
        name: filename,
        type,
      } as any);

      // Lấy token
      let token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        token = await AsyncStorage.getItem('token');
      }

      const response = await axios.post(`${API_URL}/challenges/complete`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      return response.data;
    } else {
      // Upload không có ảnh
    const response = await api.post('/challenges/complete', { recipeId });
    return response.data;
    }
  },

  /**
   * Lấy lịch sử challenge
   */
  async getChallengeHistory(limit = 10): Promise<ApiResponse<ChallengeHistory[]>> {
    const response = await api.get(`/challenges/history?limit=${limit}`);
    return response.data;
  },

  /**
   * Lấy thống kê challenge
   */
  async getChallengeStats(): Promise<ApiResponse<ChallengeStats>> {
    const response = await api.get('/challenges/stats');
    return response.data;
  },

  /**
   * Lấy danh sách người đã hoàn thành challenge theo ngày
   */
  async getChallengeCompletions(date: string): Promise<ApiResponse<Array<{
    userId: string;
    userName: string;
    userAvatar?: string;
    completedAt: string;
    proofImageUrl?: string;
  }>>> {
    const response = await api.get(`/challenges/completions/${date}`);
    return response.data;
  },
};

export default challengeService;

