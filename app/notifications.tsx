import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import notificationService, { Notification } from '@/services/notificationService';
import * as Haptics from 'expo-haptics';

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationService.getNotifications({ limit: 50 }),
        notificationService.getUnreadCount(),
      ]);

      if (notifRes.success && notifRes.data) {
        setNotifications(notifRes.data);
      }
      if (countRes.success && countRes.data) {
        setUnreadCount(countRes.data.count);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Mark as read
    if (!notification.read) {
      handleMarkAsRead(notification._id);
    }

    // Navigate based on type
    switch (notification.type) {
      case 'comment':
      case 'rating':
      case 'like':
      case 'reply':
      case 'new_recipe':
        if (notification.recipeId) {
          router.push(`/recipe/${notification.recipeId}` as any);
        }
        break;
      case 'follow':
        if (notification.actorId) {
          router.push(`/user/${notification.actorId}` as any);
        }
        break;
      case 'new_tip':
        // Navigate to all tips screen
        router.push('/story/all-tips' as any);
        break;
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'comment':
        return { name: 'chatbubble', color: '#4ECDC4', bg: ['#4ECDC4', '#44A08D'] };
      case 'rating':
        return { name: 'star', color: '#FFD93D', bg: ['#FFD93D', '#F6C90E'] };
      case 'like':
        return { name: 'heart', color: '#FF6B6B', bg: ['#FF6B6B', '#FF8E53'] };
      case 'follow':
        return { name: 'person-add', color: '#667EEA', bg: ['#667EEA', '#764BA2'] };
      case 'reply':
        return { name: 'arrow-undo', color: '#A770EF', bg: ['#A770EF', '#CF8BF3'] };
      case 'new_recipe':
        return { name: 'restaurant', color: '#06A77D', bg: ['#06A77D', '#4ECDC4'] };
      case 'new_tip':
        return { name: 'bulb', color: '#FFD93D', bg: ['#FFD93D', '#F6C90E'] };
      default:
        return { name: 'notifications', color: '#667EEA', bg: ['#667EEA', '#764BA2'] };
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    switch (notification.type) {
      case 'comment':
        return `đã bình luận về công thức "${notification.recipeName}"`;
      case 'rating':
        return `đã đánh giá ${notification.rating}⭐ cho "${notification.recipeName}"`;
      case 'like':
        return `đã thích công thức "${notification.recipeName}"`;
      case 'new_tip':
        return `vừa chia sẻ mẹo: "${notification.tipTitle || 'Mẹo nấu ăn mới'}"`;
      case 'follow':
        return 'đã bắt đầu theo dõi bạn';
      case 'reply':
        return `đã trả lời bình luận của bạn`;
      case 'new_recipe':
        return `đã đăng công thức mới "${notification.recipeName}"`;
      default:
        return 'đã tương tác với bạn';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const renderNotification = ({ item, index }: { item: Notification; index: number }) => {
    const iconInfo = getNotificationIcon(item.type);
    
    return (
      <Animated.View entering={FadeInRight.delay(index * 50).springify()}>
        <TouchableOpacity
          style={[
            styles.notificationItem,
            { backgroundColor: isDark ? '#1f1f3a' : '#fff' },
            !item.read && styles.unreadItem,
          ]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
        >
          {/* Unread Indicator */}
          {!item.read && (
            <View style={styles.unreadDot} />
          )}
          
          {/* Icon */}
          <LinearGradient
            colors={iconInfo.bg as any}
            style={styles.notificationIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={iconInfo.name as any} size={18} color="#fff" />
          </LinearGradient>
          
          {/* Content */}
          <View style={styles.notificationContent}>
            <View style={styles.notificationHeader}>
              <Image
                source={{ uri: item.actorAvatar || `https://i.pravatar.cc/100?u=${item.actorId}` }}
                style={styles.actorAvatar}
              />
              <View style={styles.notificationText}>
                <ThemedText style={[styles.actorName, { color: colors.text }]} numberOfLines={1}>
                  {item.actorName}
                </ThemedText>
                <ThemedText style={[styles.notificationMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                  {getNotificationMessage(item)}
                </ThemedText>
              </View>
            </View>
            
            <ThemedText style={[styles.notificationTime, { color: colors.textSecondary }]}>
              {formatTime(item.createdAt)}
            </ThemedText>
          </View>
          
          {/* Recipe Preview */}
          {item.recipeImage && (
            <Image
              source={{ uri: item.recipeImage }}
              style={styles.recipePreview}
            />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderHeader = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      
      <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
        Thông báo
      </ThemedText>
      
      {unreadCount > 0 && (
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={handleMarkAllAsRead}
        >
          <ThemedText style={[styles.markAllText, { color: colors.primary }]}>
            Đọc tất cả
          </ThemedText>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
        <Ionicons name="notifications-off-outline" size={48} color={colors.textSecondary} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
        Chưa có thông báo
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
        Khi có ai đó tương tác với bạn, thông báo sẽ xuất hiện ở đây
      </ThemedText>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0d0d1a' : '#f8f9fa' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
            Đang tải thông báo...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0d0d1a' : '#f8f9fa' }]} edges={['top']}>
      {renderHeader()}
      
      {/* Unread Count Badge */}
      {unreadCount > 0 && (
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.unreadBadgeContainer}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53']}
            style={styles.unreadBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ThemedText style={styles.unreadBadgeText}>
              {unreadCount} thông báo chưa đọc
            </ThemedText>
          </LinearGradient>
        </Animated.View>
      )}
      
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
  },
  markAllButton: {
    padding: 8,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  unreadBadgeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  unreadBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  unreadBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  separator: {
    height: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    position: 'relative',
    gap: 12,
  },
  unreadItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    left: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  actorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  notificationText: {
    flex: 1,
  },
  actorName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    marginTop: 6,
    marginLeft: 46,
  },
  recipePreview: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

