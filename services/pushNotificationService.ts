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

// Cấu hình notification behavior - Đảm bảo hiển thị ngoài app (Android)
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Luôn hiển thị notification, kể cả khi app đang mở hoặc đóng
    return {
      shouldShowAlert: true,      // Hiển thị alert
      shouldPlaySound: true,      // Phát âm thanh
      shouldSetBadge: true,       // Set badge số
      shouldShowBanner: true,     // Hiển thị banner (Android)
      shouldShowList: true,       // Hiển thị trong notification list
    };
  },
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
          importance: Notifications.AndroidImportance.MAX, // MAX để đảm bảo hiển thị ngoài app
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B6B',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Hiển thị trên lockscreen
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
   * Dùng type: 'date' và schedule cho 14 ngày tiếp theo để đảm bảo reliable trên Android
   */
  async scheduleDailyChallengeNotification() {
    try {
      // Hủy tất cả daily challenge notifications cũ
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of allScheduled) {
        if (notif.identifier.startsWith('daily-challenge-')) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }

      // Schedule cho 14 ngày tiếp theo (đảm bảo reliable)
      const today = new Date();
      for (let i = 0; i < 14; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        targetDate.setHours(8, 0, 0, 0);

        // Chỉ schedule nếu thời gian chưa qua
        if (targetDate > new Date()) {
          const identifier = `daily-challenge-${targetDate.toISOString().split('T')[0]}`;
          try {
            await Notifications.scheduleNotificationAsync({
              identifier,
              content: {
                title: '🎯 Thử thách mới hôm nay!',
                body: 'Có thử thách mới đang chờ bạn. Tham gia ngay để nhận điểm thưởng!',
                data: { type: 'challenge' } as NotificationData,
                sound: true,
                priority: 'high' as any,
                ...(Platform.OS === 'android' && { 
                  channelId: 'challenges',
                  importance: Notifications.AndroidImportance.HIGH,
                }),
              },
              trigger: {
                type: 'date',
                date: targetDate,
              } as any,
            });
            console.log(`✅ Scheduled daily challenge for ${targetDate.toLocaleDateString()} at 8:00 AM`);
          } catch (error) {
            console.error(`❌ Error scheduling challenge for ${targetDate.toLocaleDateString()}:`, error);
          }
        }
      }
      console.log('✅ Scheduled daily challenge notifications for next 14 days');
    } catch (error) {
      console.error('Error scheduling daily challenge notification:', error);
    }
  }

  /**
   * Lên lịch nhắc nhở meal plan dựa trên meal plan cụ thể của user
   */
  async scheduleMealReminders() {
    try {
      // Hủy tất cả meal reminder notifications cũ (bao gồm prep, reminder, main, followup)
      await Notifications.cancelScheduledNotificationAsync('meal-breakfast');
      await Notifications.cancelScheduledNotificationAsync('meal-lunch');
      await Notifications.cancelScheduledNotificationAsync('meal-dinner');
      
      // Hủy các notifications cũ theo ngày (nếu có) - bao gồm tất cả loại: prep, reminder, main, followup
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
            planDate.setHours(0, 0, 0, 0);
            const dateStr = plan.date;

            // Helper function để parse time từ string "HH:mm" hoặc "H:mm"
            const parseTime = (timeStr: string | undefined, defaultHour: number, defaultMinute: number) => {
              if (!timeStr) return { hour: defaultHour, minute: defaultMinute };
              
              const parts = timeStr.split(':');
              if (parts.length === 2) {
                const hour = parseInt(parts[0], 10);
                const minute = parseInt(parts[1], 10);
                if (!isNaN(hour) && !isNaN(minute)) {
                  return { hour, minute };
                }
              }
              return { hour: defaultHour, minute: defaultMinute };
            };

            // Helper function để schedule meal notification
            const scheduleMealNotification = async (
              mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
              mealDetail: any,
              defaultHour: number,
              defaultMinute: number,
              emoji: string,
              label: string
            ) => {
              if (!mealDetail || !mealDetail.name) return;

              const mealName = mealDetail.name;
              // Ưu tiên dùng time từ mealDetail.time, nếu không có thì dùng default
              const timeStr = mealDetail.time || (plan as any)[`${mealType}Time`];
              const { hour, minute } = parseTime(timeStr, defaultHour, defaultMinute);

              // Tạo trigger date với giờ cụ thể (dùng local time)
              const triggerDate = new Date(planDate);
              triggerDate.setHours(hour, minute, 0, 0);
              
              console.log(`📅 Scheduling ${label} notifications for ${dateStr} at ${hour}:${minute.toString().padStart(2, '0')} - ${mealName}`);
              
              // Chỉ schedule nếu thời gian chưa qua
              if (triggerDate > new Date()) {
                // 1. Notification nhắc trước 1 giờ (chuẩn bị nguyên liệu)
                const prepDate = new Date(triggerDate);
                prepDate.setHours(prepDate.getHours() - 1);
                
                if (prepDate > new Date()) {
                  const prepIdentifier = `meal-${mealType}-prep-${dateStr}`;
                  try {
                    await Notifications.scheduleNotificationAsync({
                      identifier: prepIdentifier,
                      content: {
                        title: `🛒 Chuẩn bị nguyên liệu cho ${label}!`,
                        body: `Còn 1 giờ nữa đến giờ nấu ${mealName}. Kiểm tra nguyên liệu nhé!`,
                        data: { 
                          type: 'meal_reminder', 
                          mealType: mealType,
                          date: dateStr,
                          mealName: mealName,
                          isPrep: true
                        } as NotificationData,
                        sound: true,
                        priority: 'default' as any,
                        ...(Platform.OS === 'android' && { 
                          channelId: 'meals',
                          importance: Notifications.AndroidImportance.HIGH,
                        }),
                      },
                      trigger: {
                        type: 'date',
                        date: prepDate,
                      } as any,
                    });
                    console.log(`✅ Scheduled ${label} prep reminder 1h before at ${prepDate.toLocaleString()}`);
                  } catch (error) {
                    console.error(`❌ Error scheduling ${label} prep reminder:`, error);
                  }
                }

                // 2. Notification nhắc trước 30 phút
                const reminderDate = new Date(triggerDate);
                reminderDate.setMinutes(reminderDate.getMinutes() - 30);
                
                if (reminderDate > new Date()) {
                  const reminderIdentifier = `meal-${mealType}-reminder-${dateStr}`;
                  try {
                    await Notifications.scheduleNotificationAsync({
                      identifier: reminderIdentifier,
                      content: {
                        title: `⏰ Nhắc nhở: ${label} sắp đến giờ!`,
                        body: `Còn 30 phút nữa đến giờ nấu ${mealName}. Bắt đầu chuẩn bị nhé!`,
                        data: { 
                          type: 'meal_reminder', 
                          mealType: mealType,
                          date: dateStr,
                          mealName: mealName,
                          isReminder: true
                        } as NotificationData,
                        sound: true,
                        priority: 'high' as any,
                        ...(Platform.OS === 'android' && { 
                          channelId: 'meals',
                          importance: Notifications.AndroidImportance.HIGH,
                        }),
                      },
                      trigger: {
                        type: 'date',
                        date: reminderDate,
                      } as any,
                    });
                    console.log(`✅ Scheduled ${label} reminder 30min before at ${reminderDate.toLocaleString()}`);
                  } catch (error) {
                    console.error(`❌ Error scheduling ${label} reminder:`, error);
                  }
                }

                // 3. Notification đúng giờ (quan trọng nhất)
                const identifier = `meal-${mealType}-${dateStr}`;
                try {
                  await Notifications.scheduleNotificationAsync({
                    identifier,
                    content: {
                      title: `${emoji} Đã đến giờ nấu ${label}!`,
                      body: `Hôm nay nấu: ${mealName}. Bắt đầu nấu ngay nhé!`,
                      data: { 
                        type: 'meal_reminder', 
                        mealType: mealType,
                        date: dateStr,
                        mealName: mealName
                      } as NotificationData,
                      sound: true,
                      priority: 'max' as any,
                      ...(Platform.OS === 'android' && { 
                        channelId: 'meals',
                        importance: Notifications.AndroidImportance.MAX, // MAX để đảm bảo hiển thị ngoài app
                      }),
                    },
                    trigger: {
                      type: 'date',
                      date: triggerDate,
                    } as any,
                  });
                  console.log(`✅ Scheduled ${label} notification at ${hour}:${minute.toString().padStart(2, '0')} (${triggerDate.toLocaleString()})`);
                } catch (error) {
                  console.error(`❌ Error scheduling ${label} main notification:`, error);
                }

                // 4. Notification nhắc sau 30 phút nếu chưa nấu (chỉ nếu là hôm nay)
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const planDateOnly = new Date(planDate.getFullYear(), planDate.getMonth(), planDate.getDate());
                
                if (planDateOnly.getTime() === today.getTime()) {
                  const followUpDate = new Date(triggerDate);
                  followUpDate.setMinutes(followUpDate.getMinutes() + 30);
                  
                  if (followUpDate > new Date()) {
                    const followUpIdentifier = `meal-${mealType}-followup-${dateStr}`;
                    try {
                      await Notifications.scheduleNotificationAsync({
                        identifier: followUpIdentifier,
                        content: {
                          title: `⏳ Bạn đã nấu ${mealName} chưa?`,
                          body: `Đã qua 30 phút rồi. Đừng quên đánh dấu đã nấu trong app nhé!`,
                          data: { 
                            type: 'meal_reminder', 
                            mealType: mealType,
                            date: dateStr,
                            mealName: mealName,
                            isFollowUp: true
                          } as NotificationData,
                          sound: true,
                          priority: 'default' as any,
                          ...(Platform.OS === 'android' && { 
                            channelId: 'meals',
                            importance: Notifications.AndroidImportance.DEFAULT,
                          }),
                        },
                        trigger: {
                          type: 'date',
                          date: followUpDate,
                        } as any,
                      });
                      console.log(`✅ Scheduled ${label} follow-up reminder 30min after at ${followUpDate.toLocaleString()}`);
                    } catch (error) {
                      console.error(`❌ Error scheduling ${label} follow-up:`, error);
                    }
                  }
                }
              } else {
                console.log(`⏭️ Skipped ${label} notification - time already passed`);
              }
            };

            // Schedule cho từng bữa ăn
            // Note: plan.breakfast, plan.lunch, plan.dinner, plan.snack đã là MealDetail object
            await scheduleMealNotification(
              'breakfast',
              plan.breakfast,
              7,
              0,
              '🌅',
              'bữa sáng'
            );

            await scheduleMealNotification(
              'lunch',
              plan.lunch,
              12,
              0,
              '☀️',
              'bữa trưa'
            );

            await scheduleMealNotification(
              'dinner',
              plan.dinner,
              18,
              0,
              '🌙',
              'bữa tối'
            );

            await scheduleMealNotification(
              'snack',
              plan.snack,
              15,
              0,
              '☕',
              'bữa xế'
            );
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
   * Dùng type: 'date' và schedule cho 7 ngày tiếp theo để đảm bảo reliable
   */
  private async scheduleGenericMealReminders() {
    const today = new Date();
    
    // Schedule cho 7 ngày tiếp theo
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      
      // Bữa sáng - 7:00
      const breakfastDate = new Date(targetDate);
      breakfastDate.setHours(7, 0, 0, 0);
      if (breakfastDate > new Date()) {
        const breakfastId = `meal-breakfast-${targetDate.toISOString().split('T')[0]}`;
        try {
          await Notifications.scheduleNotificationAsync({
            identifier: breakfastId,
            content: {
              title: '🌅 Đã đến giờ nấu bữa sáng!',
              body: 'Kiểm tra lịch ăn hôm nay và bắt đầu nấu bữa sáng nhé!',
              data: { type: 'meal_reminder', mealType: 'breakfast' } as NotificationData,
              sound: true,
              priority: 'max' as any,
              ...(Platform.OS === 'android' && { 
                channelId: 'meals',
                importance: Notifications.AndroidImportance.MAX,
              }),
            },
            trigger: {
              type: 'date',
              date: breakfastDate,
            } as any,
          });
        } catch (error) {
          console.error(`❌ Error scheduling breakfast for ${targetDate.toLocaleDateString()}:`, error);
        }
      }

      // Bữa trưa - 11:30
      const lunchDate = new Date(targetDate);
      lunchDate.setHours(11, 30, 0, 0);
      if (lunchDate > new Date()) {
        const lunchId = `meal-lunch-${targetDate.toISOString().split('T')[0]}`;
        try {
          await Notifications.scheduleNotificationAsync({
            identifier: lunchId,
            content: {
              title: '☀️ Đã đến giờ nấu bữa trưa!',
              body: 'Kiểm tra lịch ăn hôm nay và chuẩn bị bữa trưa nhé!',
              data: { type: 'meal_reminder', mealType: 'lunch' } as NotificationData,
              sound: true,
              priority: 'max' as any,
              ...(Platform.OS === 'android' && { 
                channelId: 'meals',
                importance: Notifications.AndroidImportance.MAX,
              }),
            },
            trigger: {
              type: 'date',
              date: lunchDate,
            } as any,
          });
        } catch (error) {
          console.error(`❌ Error scheduling lunch for ${targetDate.toLocaleDateString()}:`, error);
        }
      }

      // Bữa tối - 17:30
      const dinnerDate = new Date(targetDate);
      dinnerDate.setHours(17, 30, 0, 0);
      if (dinnerDate > new Date()) {
        const dinnerId = `meal-dinner-${targetDate.toISOString().split('T')[0]}`;
        try {
          await Notifications.scheduleNotificationAsync({
            identifier: dinnerId,
            content: {
              title: '🌙 Đã đến giờ nấu bữa tối!',
              body: 'Kiểm tra lịch ăn hôm nay và chuẩn bị bữa tối nhé!',
              data: { type: 'meal_reminder', mealType: 'dinner' } as NotificationData,
              sound: true,
              priority: 'max' as any,
              ...(Platform.OS === 'android' && { 
                channelId: 'meals',
                importance: Notifications.AndroidImportance.MAX,
              }),
            },
            trigger: {
              type: 'date',
              date: dinnerDate,
            } as any,
          });
        } catch (error) {
          console.error(`❌ Error scheduling dinner for ${targetDate.toLocaleDateString()}:`, error);
        }
      }
    }
    console.log('✅ Scheduled generic meal reminders for next 7 days');
  }

  /**
   * Lên lịch nhắc nhở kiểm tra meal plan hôm qua
   * Dùng type: 'date' và schedule cho 14 ngày tiếp theo
   */
  async scheduleMealCheckReminder() {
    try {
      // Hủy tất cả meal-check notifications cũ
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of allScheduled) {
        if (notif.identifier.startsWith('meal-check-')) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }

      // Schedule cho 14 ngày tiếp theo
      const today = new Date();
      for (let i = 0; i < 14; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        targetDate.setHours(9, 0, 0, 0);

        if (targetDate > new Date()) {
          const identifier = `meal-check-${targetDate.toISOString().split('T')[0]}`;
          try {
            await Notifications.scheduleNotificationAsync({
              identifier,
              content: {
                title: '📋 Kiểm tra lịch ăn hôm qua',
                body: 'Bạn đã tích đã nấu các món hôm qua chưa? Đừng quên cập nhật nhé!',
                data: { type: 'meal_check' } as NotificationData,
                sound: true,
                priority: 'default' as any,
                ...(Platform.OS === 'android' && { 
                  channelId: 'meals',
                  importance: Notifications.AndroidImportance.DEFAULT,
                }),
              },
              trigger: {
                type: 'date',
                date: targetDate,
              } as any,
            });
          } catch (error) {
            console.error(`❌ Error scheduling meal check for ${targetDate.toLocaleDateString()}:`, error);
          }
        }
      }
      console.log('✅ Scheduled meal check reminders for next 14 days');
    } catch (error) {
      console.error('Error scheduling meal check reminder:', error);
    }
  }

  /**
   * Lên lịch thông báo chào ngày mới
   * Dùng type: 'date' và schedule cho 14 ngày tiếp theo để đảm bảo reliable
   */
  async scheduleDailyGreeting() {
    try {
      // Hủy tất cả daily-greeting notifications cũ
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of allScheduled) {
        if (notif.identifier.startsWith('daily-greeting-')) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }

      // Schedule cho 14 ngày tiếp theo
      const today = new Date();
      for (let i = 0; i < 14; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        targetDate.setHours(6, 0, 0, 0);

        if (targetDate > new Date()) {
          const identifier = `daily-greeting-${targetDate.toISOString().split('T')[0]}`;
          try {
            await Notifications.scheduleNotificationAsync({
              identifier,
              content: {
                title: '🌞 Chào buổi sáng!',
                body: 'Chúc bạn một ngày nấu ăn vui vẻ! Đừng quên kiểm tra thử thách và lịch ăn hôm nay nhé!',
                data: { type: 'daily_greeting' } as NotificationData,
                sound: true,
                priority: 'default' as any,
                ...(Platform.OS === 'android' && { 
                  channelId: 'default',
                  importance: Notifications.AndroidImportance.DEFAULT,
                }),
              },
              trigger: {
                type: 'date',
                date: targetDate,
              } as any,
            });
          } catch (error) {
            console.error(`❌ Error scheduling greeting for ${targetDate.toLocaleDateString()}:`, error);
          }
        }
      }
      console.log('✅ Scheduled daily greeting for next 14 days at 6:00 AM');
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

  /**
   * Verify scheduled notifications (for debugging/testing)
   * Kiểm tra xem có bao nhiêu notifications đã được schedule
   */
  async verifyScheduledNotifications(): Promise<{
    total: number;
    mealNotifications: number;
    challengeNotifications: number;
    otherNotifications: number;
    details: Array<{ identifier: string; trigger: any; content: any }>;
  }> {
    try {
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const mealNotifications = allScheduled.filter(n => n.identifier.startsWith('meal-'));
      const challengeNotifications = allScheduled.filter(n => n.identifier.includes('challenge'));
      const otherNotifications = allScheduled.filter(
        n => !n.identifier.startsWith('meal-') && !n.identifier.includes('challenge')
      );

      return {
        total: allScheduled.length,
        mealNotifications: mealNotifications.length,
        challengeNotifications: challengeNotifications.length,
        otherNotifications: otherNotifications.length,
        details: allScheduled.map(n => ({
          identifier: n.identifier,
          trigger: n.trigger,
          content: n.content,
        })),
      };
    } catch (error) {
      console.error('Error verifying scheduled notifications:', error);
      return {
        total: 0,
        mealNotifications: 0,
        challengeNotifications: 0,
        otherNotifications: 0,
        details: [],
      };
    }
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
