/**
 * Push Notification Service
 * Quản lý push notifications cho app
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';
import mealPlanService, { MealPlan } from './mealPlanService';

// Cấu hình notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type: 'challenge' | 'meal_reminder' | 'meal_check' | 'daily_greeting' | 'comment' | 'rating' | 'like' | 'follow' | 'reply' | 'new_recipe' | 'new_tip';
  challengeId?: string;
  date?: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner';
  mealName?: string; // Tên món ăn cụ thể từ meal plan
  recipeId?: string;
  actorId?: string;
  commentId?: string;
  tipId?: string;
  [key: string]: any;
}

class PushNotificationService {
  private expoPushToken: string | null = null;

  /**
   * Đăng ký push token với backend
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Chỉ chạy trên thiết bị thật
      if (!Device.isDevice) {
        console.log('Push notifications chỉ hoạt động trên thiết bị thật');
        return null;
      }

      // Yêu cầu quyền
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      // Lấy push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      this.expoPushToken = tokenData.data;
      
      // Gửi token lên backend
      await this.sendTokenToBackend(this.expoPushToken);

      // Cấu hình notification channel cho Android
      if (Platform.OS === 'android') {
        // Tạo notification channel với tên tiếng Việt
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Thông báo CookShare',
          description: 'Thông báo về công thức, thử thách và hoạt động',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B6B',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
        
        // Tạo thêm channel cho các loại notification khác nhau
        await Notifications.setNotificationChannelAsync('challenges', {
          name: 'Thử thách',
          description: 'Thông báo về thử thách mới',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B6B',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
        
        await Notifications.setNotificationChannelAsync('interactions', {
          name: 'Tương tác',
          description: 'Thông báo về bình luận, like, follow',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B6B',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
        
        await Notifications.setNotificationChannelAsync('meals', {
          name: 'Lịch ăn',
          description: 'Nhắc nhở về lịch ăn và meal plan',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B6B',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Gửi push token lên backend
   */
  private async sendTokenToBackend(token: string) {
    try {
      await api.post('/notifications/push-token', { token });
    } catch (error) {
    }
  }

  /**
   * Lên lịch thông báo thử thách mới mỗi ngày
   */
  async scheduleDailyChallengeNotification() {
    try {
      // Hủy notification cũ nếu có
      await Notifications.cancelScheduledNotificationAsync('daily-challenge');

      // Lên lịch mỗi ngày lúc 8:00 sáng (chỉ trigger vào đúng giờ, không phải ngay khi schedule)
      await Notifications.scheduleNotificationAsync({
        identifier: 'daily-challenge',
        content: {
          title: '🎯 Thử thách mới hôm nay!',
          body: 'Có thử thách mới đang chờ bạn. Tham gia ngay để nhận điểm thưởng!',
          data: { type: 'challenge' } as NotificationData,
          sound: true,
          ...(Platform.OS === 'android' && { channelId: 'challenges' }),
        },
        trigger: {
          type: 'calendar',
          hour: 8,
          minute: 0,
          repeats: true,
        } as any,
      });
      console.log('✅ Scheduled daily challenge notification for 8:00 AM daily');
    } catch (error) {
      console.error('Error scheduling daily challenge notification:', error);
    }
  }

  /**
   * Lên lịch nhắc nhở meal plan dựa trên meal plan cụ thể của user
   */
  async scheduleMealReminders() {
    try {
      // Hủy tất cả meal reminder notifications cũ
      await Notifications.cancelScheduledNotificationAsync('meal-breakfast');
      await Notifications.cancelScheduledNotificationAsync('meal-lunch');
      await Notifications.cancelScheduledNotificationAsync('meal-dinner');
      
      // Hủy các notifications cũ theo ngày (nếu có)
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of allScheduled) {
        if (notif.identifier.startsWith('meal-')) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }

      // Lấy meal plan của user cho 7 ngày tới
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 7);
      
      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      try {
        const mealPlansResponse = await mealPlanService.getPlans(startDateStr, endDateStr);
        
        if (mealPlansResponse.success && mealPlansResponse.data && Array.isArray(mealPlansResponse.data)) {
          const mealPlans = mealPlansResponse.data;
          
          // Schedule notifications cho từng ngày có meal plan
          for (const plan of mealPlans) {
            const planDate = new Date(plan.date);
            const dateStr = plan.date;

            // Bữa sáng - 7:00
            if (plan.breakfast && plan.breakfast.name) {
              const mealName = plan.breakfast.name;
              const identifier = `meal-breakfast-${dateStr}`;
              const triggerDate = new Date(planDate);
              triggerDate.setHours(7, 0, 0, 0);
              
              // Chỉ schedule nếu thời gian chưa qua
              if (triggerDate > new Date()) {
                await Notifications.scheduleNotificationAsync({
                  identifier,
                  content: {
                    title: '🌅 Đã đến giờ nấu bữa sáng!',
                    body: `Hôm nay nấu: ${mealName}`,
                    data: { 
                      type: 'meal_reminder', 
                      mealType: 'breakfast',
                      date: dateStr,
                      mealName: mealName
                    } as NotificationData,
                    sound: true,
                    ...(Platform.OS === 'android' && { channelId: 'meals' }),
                  },
                  trigger: {
                    type: 'date',
                    date: triggerDate,
                    repeats: false, // Không repeat vì mỗi ngày có meal plan riêng
                  } as any,
                });
              }
            }

            // Bữa trưa - 11:30
            if (plan.lunch && plan.lunch.name) {
              const mealName = plan.lunch.name;
              const identifier = `meal-lunch-${dateStr}`;
              const triggerDate = new Date(planDate);
              triggerDate.setHours(11, 30, 0, 0);
              
              // Chỉ schedule nếu thời gian chưa qua
              if (triggerDate > new Date()) {
                await Notifications.scheduleNotificationAsync({
                  identifier,
                  content: {
                    title: '☀️ Đã đến giờ nấu bữa trưa!',
                    body: `Hôm nay nấu: ${mealName}`,
                    data: { 
                      type: 'meal_reminder', 
                      mealType: 'lunch',
                      date: dateStr,
                      mealName: mealName
                    } as NotificationData,
                    sound: true,
                    ...(Platform.OS === 'android' && { channelId: 'meals' }),
                  },
                  trigger: {
                    type: 'date',
                    date: triggerDate,
                    repeats: false,
                  } as any,
                });
              }
            }

            // Bữa tối - 17:30
            if (plan.dinner && plan.dinner.name) {
              const mealName = plan.dinner.name;
              const identifier = `meal-dinner-${dateStr}`;
              const triggerDate = new Date(planDate);
              triggerDate.setHours(17, 30, 0, 0);
              
              // Chỉ schedule nếu thời gian chưa qua
              if (triggerDate > new Date()) {
                await Notifications.scheduleNotificationAsync({
                  identifier,
                  content: {
                    title: '🌙 Đã đến giờ nấu bữa tối!',
                    body: `Hôm nay nấu: ${mealName}`,
                    data: { 
                      type: 'meal_reminder', 
                      mealType: 'dinner',
                      date: dateStr,
                      mealName: mealName
                    } as NotificationData,
                    sound: true,
                    ...(Platform.OS === 'android' && { channelId: 'meals' }),
                  },
                  trigger: {
                    type: 'date',
                    date: triggerDate,
                    repeats: false,
                  } as any,
                });
              }
            }
          }
          
        } else {
          // Nếu không có meal plan, schedule notifications chung chung
          await this.scheduleGenericMealReminders();
        }
      } catch (error) {
        // Fallback to generic reminders
        await this.scheduleGenericMealReminders();
      }
    } catch (error) {
      console.error('Error scheduling meal reminders:', error);
    }
  }

  /**
   * Lên lịch nhắc nhở meal plan chung chung (khi không có meal plan cụ thể)
   */
  private async scheduleGenericMealReminders() {
    // Nhắc nhở bữa sáng - 7:00
    await Notifications.scheduleNotificationAsync({
      identifier: 'meal-breakfast',
      content: {
        title: '🌅 Đã đến giờ nấu bữa sáng!',
        body: 'Kiểm tra lịch ăn hôm nay và bắt đầu nấu bữa sáng nhé!',
        data: { type: 'meal_reminder', mealType: 'breakfast' } as NotificationData,
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'meals' }),
      },
      trigger: {
        type: 'calendar',
        hour: 7,
        minute: 0,
        repeats: true,
      } as any,
    });

    // Nhắc nhở bữa trưa - 11:30
    await Notifications.scheduleNotificationAsync({
      identifier: 'meal-lunch',
      content: {
        title: '☀️ Đã đến giờ nấu bữa trưa!',
        body: 'Kiểm tra lịch ăn hôm nay và chuẩn bị bữa trưa nhé!',
        data: { type: 'meal_reminder', mealType: 'lunch' } as NotificationData,
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'meals' }),
      },
      trigger: {
        type: 'calendar',
        hour: 11,
        minute: 30,
        repeats: true,
      } as any,
    });

    // Nhắc nhở bữa tối - 17:30
    await Notifications.scheduleNotificationAsync({
      identifier: 'meal-dinner',
      content: {
        title: '🌙 Đã đến giờ nấu bữa tối!',
        body: 'Kiểm tra lịch ăn hôm nay và chuẩn bị bữa tối nhé!',
        data: { type: 'meal_reminder', mealType: 'dinner' } as NotificationData,
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'meals' }),
      },
      trigger: {
        type: 'calendar',
        hour: 17,
        minute: 30,
        repeats: true,
      } as any,
    });
  }

  /**
   * Lên lịch nhắc nhở kiểm tra meal plan hôm qua
   */
  async scheduleMealCheckReminder() {
    try {
      // Hủy notification cũ
      await Notifications.cancelScheduledNotificationAsync('meal-check');

      // Nhắc nhở lúc 9:00 sáng để kiểm tra hôm qua (chỉ trigger vào đúng 9:00 mỗi ngày)
      await Notifications.scheduleNotificationAsync({
        identifier: 'meal-check',
        content: {
          title: '📋 Kiểm tra lịch ăn hôm qua',
          body: 'Bạn đã tích đã nấu các món hôm qua chưa? Đừng quên cập nhật nhé!',
          data: { type: 'meal_check' } as NotificationData,
          sound: true,
          ...(Platform.OS === 'android' && { channelId: 'meals' }),
        },
        trigger: {
          type: 'calendar',
          hour: 9,
          minute: 0,
          repeats: true,
        } as any,
      });
    } catch (error) {
    }
  }

  /**
   * Lên lịch thông báo chào ngày mới
   */
  async scheduleDailyGreeting() {
    try {
      // Hủy notification cũ
      await Notifications.cancelScheduledNotificationAsync('daily-greeting');

      // Chào ngày mới lúc 6:00 sáng (chỉ trigger vào đúng 6:00 mỗi ngày)
      await Notifications.scheduleNotificationAsync({
        identifier: 'daily-greeting',
        content: {
          title: '🌞 Chào buổi sáng!',
          body: 'Chúc bạn một ngày nấu ăn vui vẻ! Đừng quên kiểm tra thử thách và lịch ăn hôm nay nhé!',
          data: { type: 'daily_greeting' } as NotificationData,
          sound: true,
          ...(Platform.OS === 'android' && { channelId: 'default' }),
        },
        trigger: {
          type: 'calendar',
          hour: 6,
          minute: 0,
          repeats: true,
        } as any,
      });
      console.log('✅ Scheduled daily greeting for 6:00 AM daily');
    } catch (error) {
      console.error('Error scheduling daily greeting:', error);
    }
  }

  /**
   * Setup tất cả notifications
   * Lưu ý: Các notifications này chỉ trigger vào đúng giờ đã set, KHÔNG trigger ngay khi setup
   */
  async setupAllNotifications() {
    await this.scheduleDailyChallengeNotification();
    await this.scheduleMealReminders(); // Sẽ lấy meal plan cụ thể và schedule theo từng ngày
    await this.scheduleMealCheckReminder();
    await this.scheduleDailyGreeting();
  }

  /**
   * Cập nhật lại meal reminders (gọi khi user thay đổi meal plan)
   */
  async updateMealReminders() {
    console.log('🔄 Updating meal reminders based on latest meal plan...');
    await this.scheduleMealReminders();
  }

  /**
   * Hủy tất cả scheduled notifications
   */
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
    }
  }

  /**
   * Lấy push token hiện tại
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
