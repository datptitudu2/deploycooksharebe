import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_URL } from '@/config/api';
import { pushNotificationService } from '@/services/pushNotificationService';
// @ts-ignore - expo-notifications sẽ được cài sau
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

interface User {
  id: string;
  email: string;
  name: string;
  role?: 'chef' | 'user';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: 'chef' | 'user') => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
    
    // Setup notification response handler (khi user tap vào notification)
    const notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data as any;
      
      // Navigate based on notification type
      if (data.type === 'challenge') {
        router.push('/challenges');
      } else if (data.type === 'meal_reminder' || data.type === 'meal_check') {
        router.push('/(tabs)/meal-planning');
      } else if (data.type === 'daily_greeting') {
        router.push('/(tabs)');
      } else if (data.type === 'comment' || data.type === 'rating' || data.type === 'like' || data.type === 'reply' || data.type === 'new_recipe') {
        // Navigate to recipe if has recipeId
        if (data.recipeId) {
          router.push(`/recipe/${data.recipeId}` as any);
        } else {
          router.push('/(tabs)');
        }
      } else if (data.type === 'new_tip') {
        // Navigate to all tips screen
        router.push('/story/all-tips' as any);
      } else if (data.type === 'follow') {
        // Navigate to user profile if has actorId
        if (data.actorId) {
          router.push(`/user/${data.actorId}` as any);
        } else {
          router.push('/(tabs)');
        }
      }
    });

    // Setup foreground notification handler (khi app đang mở)
    const notificationReceivedSubscription = Notifications.addNotificationReceivedListener((notification: any) => {
      // Có thể hiển thị custom notification UI ở đây nếu cần
    });

    return () => {
      notificationResponseSubscription.remove();
      notificationReceivedSubscription.remove();
    };
  }, []);

  // Setup notifications khi user đã đăng nhập
  useEffect(() => {
    if (user && token) {
      // Setup push notifications
      pushNotificationService.registerForPushNotifications().then(() => {
        pushNotificationService.setupAllNotifications();
      });
    } else {
      // Hủy notifications khi logout
      pushNotificationService.cancelAllNotifications();
    }
  }, [user, token]);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('auth_token');
      const storedUser = await SecureStore.getItemAsync('auth_user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      }, {
        timeout: 10000, // 10 seconds timeout
      });

      if (response.data.success) {
        const { token, user } = response.data;
        setToken(token);
        setUser(user);
        await SecureStore.setItemAsync('auth_token', token);
        await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
        
        // Setup push notifications sau khi đăng nhập
        await pushNotificationService.registerForPushNotifications();
        await pushNotificationService.setupAllNotifications();
      } else {
        throw new Error(response.data.message || 'Đăng nhập thất bại');
      }
    } catch (error: any) {
      // Error sẽ được xử lý bởi alertService trong login.tsx
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra:\n1. Backend đang chạy (npm run dev trong thư mục backend)\n2. IP address đúng (nếu dùng thiết bị thật, cần dùng IP máy tính thay vì localhost)');
      }
      const message = error.response?.data?.message || error.message || 'Đăng nhập thất bại';
      throw new Error(message);
    }
  };

  const register = async (name: string, email: string, password: string, role: 'chef' | 'user' = 'user') => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        password,
        role,
      }, {
        timeout: 10000, // 10 seconds timeout
      });

      if (response.data.success) {
        const { token, user } = response.data;
        setToken(token);
        setUser(user);
        await SecureStore.setItemAsync('auth_token', token);
        await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
        
        // Setup push notifications sau khi đăng ký
        await pushNotificationService.registerForPushNotifications();
        await pushNotificationService.setupAllNotifications();
      } else {
        throw new Error(response.data.message || 'Đăng ký thất bại');
      }
    } catch (error: any) {
      // Error sẽ được xử lý bởi alertService trong register.tsx
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra:\n1. Backend đang chạy (npm run dev trong thư mục backend)\n2. IP address đúng (nếu dùng thiết bị thật, cần dùng IP máy tính thay vì localhost)');
      }
      const message = error.response?.data?.message || error.message || 'Đăng ký thất bại';
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('auth_user');
      setToken(null);
      setUser(null);
      
      // Hủy tất cả notifications khi logout
      await pushNotificationService.cancelAllNotifications();
    } catch (error) {
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

