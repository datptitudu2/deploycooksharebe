/**
 * API Service Layer
 * Centralized API calls for the entire application
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@/config/api';

// Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  // Render free tier can cold-start; give more time in production to avoid "Network Error"
  timeout: __DEV__ ? 15000 : 60000, // Tăng từ 40s lên 60s để tránh timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  async (config) => {
    // Try SecureStore first (AuthContext uses this), then AsyncStorage as fallback
    let token = await SecureStore.getItemAsync('auth_token');
    if (!token) {
      token = await AsyncStorage.getItem('token');
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Only logout if we actually sent a token
      let token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        token = await AsyncStorage.getItem('token');
      }
      if (token) {
        // Token expired or invalid - clear it
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('auth_user');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      }
      // For public routes, 401 might be expected - don't throw
      // Let the calling code handle it
    }
    return Promise.reject(error);
  }
);

export default api;

