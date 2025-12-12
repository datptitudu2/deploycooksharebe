import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  Modal,
  Platform,
  Dimensions,
  Linking,
  FlatList,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/config/api';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { userService, achievementService, notificationService, Notification } from '@/services';
import { alertService } from '@/services/alertService';

// Helper function to format time ago
const formatTimeAgo = (date: string) => {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Vừa xong';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} tuần trước`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} tháng trước`;
  return `${Math.floor(diffInSeconds / 31536000)} năm trước`;
};
import { StreakBreakAnimation } from '@/components/common/StreakBreakAnimation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProfileData {
  id?: string;
  name: string;
  email: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  phone?: string;
  gender?: string;
  role?: 'chef' | 'user';
  followersCount?: number;
  followingCount?: number;
}

interface Stats {
  level: number;
  points: number;
  currentStreak: number;
  longestStreak: number;
  totalMealsCooked: number;
  totalRecipesCreated: number;
  totalViews: number;
  totalLikes: number;
  averageRating: number;
  badgesCount: number;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { user, token, logout } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showChefListModal, setShowChefListModal] = useState(false);
  const [chefs, setChefs] = useState<any[]>([]);
  const [loadingChefs, setLoadingChefs] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notificationsTab, setNotificationsTab] = useState<'notifications' | 'followers' | 'following'>('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [followStatuses, setFollowStatuses] = useState<Record<string, boolean>>({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);
  const [newLevel, setNewLevel] = useState(1);
  const confettiAnimations = useRef<Array<{
    translateY: Animated.Value;
    translateX: Animated.Value;
    opacity: Animated.Value;
    rotate: Animated.Value;
  }>>([]);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Change password state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const theme = {
    bg: isDark ? '#1A1A2E' : '#FFF8F0',
    card: isDark ? '#25253D' : '#FFFFFF',
    cardBorder: isDark ? '#3A3A5C' : '#F0E6DC',
    text: isDark ? '#FFFFFF' : '#2C1810',
    textSecondary: isDark ? '#A0A0B0' : '#8B7355',
    accent: colors.primary,
    gradient: isDark ? ['#2D2D4A', '#1A1A2E'] : ['#FF6B35', '#FFB84D'],
  };

  useEffect(() => {
    loadProfile();
    loadStats();
    loadFollowData();
  }, []);

  // Tự động reload stats khi quay lại tab này (sau khi đánh dấu món đã nấu)
  useFocusEffect(
    useCallback(() => {
      if (token) {
        loadStats();
      }
    }, [token])
  );

  useEffect(() => {
    if (showChefListModal) {
      loadChefs();
    }
  }, [showChefListModal]);

  // Auto-refresh notifications khi modal mở (real-time updates)
  useEffect(() => {
    if (showNotificationsModal && notificationsTab === 'notifications') {
      // Load ngay khi mở
      loadNotifications();
      
      // Polling mỗi 5 giây để cập nhật real-time
      const interval = setInterval(() => {
        loadNotifications();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [showNotificationsModal, notificationsTab, user]);

  const loadChefs = async () => {
    setLoadingChefs(true);
    try {
      const response = await userService.getAllChefs(50);
      if (response.success && response.data) {
        setChefs(response.data);
      }
    } catch (error: any) {
      console.error('Load chefs error:', error);
      alertService.error('Không thể tải danh sách đầu bếp');
    } finally {
      setLoadingChefs(false);
    }
  };

  const loadNotifications = async () => {
    if (!user) return;
    try {
      setLoadingNotifications(true);
      const [notificationsRes, unreadRes] = await Promise.all([
        notificationService.getNotifications({ limit: 50 }),
        notificationService.getUnreadCount(),
      ]);
      if (notificationsRes.success && notificationsRes.data) {
        setNotifications(notificationsRes.data);
      }
      if (unreadRes.success && unreadRes.data) {
        setUnreadCount(unreadRes.data.count);
      }
    } catch (error: any) {
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Auto-refresh notifications khi modal mở
  useEffect(() => {
    if (showNotificationsModal && notificationsTab === 'notifications') {
      // Load ngay khi mở
      loadNotifications();
      
      // Polling mỗi 5 giây để cập nhật real-time
      const interval = setInterval(() => {
        loadNotifications();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [showNotificationsModal, notificationsTab, user]);

  const loadFollowData = async () => {
    setLoadingFollow(true);
    try {
      const [followersRes, followingRes] = await Promise.all([
        userService.getFollowers(100),
        userService.getFollowing(100),
      ]);
      if (followersRes.success && followersRes.data) {
        setFollowers(followersRes.data);
        // Set follow statuses for followers (they follow us, so we might follow them back)
        const statuses: Record<string, boolean> = {};
        followersRes.data.forEach((user: any) => {
          // Check if we're following them back
          const isFollowingBack = followingRes.data?.some((f: any) => f._id === user._id || f.id === user._id);
          statuses[user._id || user.id] = !!isFollowingBack;
        });
        setFollowStatuses(prev => ({ ...prev, ...statuses }));
      }
      if (followingRes.success && followingRes.data) {
        setFollowing(followingRes.data);
        // Set follow statuses for following (we follow them, so status is true)
        const statuses: Record<string, boolean> = {};
        followingRes.data.forEach((user: any) => {
          statuses[user._id || user.id] = true;
        });
        setFollowStatuses(prev => ({ ...prev, ...statuses }));
      }
    } catch (error: any) {
      alertService.error('Không thể tải danh sách theo dõi');
    } finally {
      setLoadingFollow(false);
    }
  };

  const handleToggleFollow = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await userService.toggleFollow(userId);
      if (response.success) {
        setFollowStatuses(prev => ({
          ...prev,
          [userId]: !currentStatus,
        }));
        // Reload follow data to update counts
        await loadFollowData();
        // Reload profile to update counts
        await loadProfile();
      }
    } catch (error: any) {
      alertService.error('Không thể thay đổi trạng thái theo dõi');
    }
  };

  const loadLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      // Load tất cả người dùng (limit = 1000 để đảm bảo hiển thị đủ)
      const response = await achievementService.getLeaderboard('level', 1000);
      if (response.success && response.data) {
        // Filter duplicate entries dựa trên userId - chỉ giữ lại entry đầu tiên cho mỗi userId
        const seen = new Set<string>();
        const uniqueLeaderboard = response.data.filter((item: any) => {
          const userId = (item.userId || '').toString();
          if (!userId || seen.has(userId)) {
            return false; // Bỏ qua nếu không có userId hoặc đã thấy userId này rồi
          }
          seen.add(userId);
          return true;
        });
        // Re-calculate rank sau khi filter
        const leaderboardWithCorrectRank = uniqueLeaderboard.map((item: any, index: number) => ({
          ...item,
          rank: index + 1,
        }));
        setLeaderboard(leaderboardWithCorrectRank);
      }
    } catch (error: any) {
      console.error('Load leaderboard error:', error);
      alertService.error('Không thể tải bảng xếp hạng');
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const loadProfile = async () => {
    if (!token) {
      // Use fallback from auth context if no token
      if (user) {
        setProfile({
          name: user.name || 'User',
          email: user.email || '',
          avatar: undefined,
          bio: '',
          phone: '',
        });
        setEditName(user.name || '');
      }
      return;
    }
    
    try {
      const response = await userService.getProfile();
      if (response.success && response.data) {
        setProfile({
          id: response.data._id,
          name: response.data.name || 'User',
          email: response.data.email || '',
          avatar: response.data.avatar,
          bio: response.data.bio || '',
          phone: response.data.phone || '',
          gender: response.data.gender,
          role: (response.data as any).role,
          followersCount: (response.data as any).followersCount || 0,
          followingCount: (response.data as any).followingCount || 0,
        });
        setEditName(response.data.name || '');
        setEditBio(response.data.bio || '');
        setEditPhone(response.data.phone || '');
      }
    } catch (error: any) {
      // Use fallback from auth context
      if (user) {
        setProfile({
          name: user.name || 'User',
          email: user.email || '',
          avatar: undefined,
          bio: '',
          phone: '',
        });
        setEditName(user.name || '');
      }
    }
  };

  const loadStats = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/achievements/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error: any) {
      // Use default stats
      setStats({
        level: 1,
        points: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalMealsCooked: 0,
        totalRecipesCreated: 0,
        totalViews: 0,
        totalLikes: 0,
        averageRating: 0,
        badgesCount: 0,
      });
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadStats()]);
    setRefreshing(false);
  }, [token]);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alertService.warning('Vui lòng cấp quyền truy cập thư viện ảnh', 'Cần quyền truy cập');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      const imageUri = Platform.OS === 'android' ? uri : uri.replace('file://', '');
      
      formData.append('avatar', {
        uri: imageUri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await axios.post(
        `${API_URL}/user/avatar`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        console.log('📥 Upload response:', {
          avatarUrl: response.data.avatarUrl,
          profile: response.data.profile,
        });
        
        // Update profile với avatar mới
        if (response.data.profile) {
          // Backend trả về profile mới (preferred)
          console.log('✅ Updating profile with:', response.data.profile);
          setProfile(response.data.profile);
        } else if (response.data.avatarUrl) {
          // Fallback: chỉ có avatarUrl
          console.log('✅ Updating avatar URL:', response.data.avatarUrl);
          setProfile(prev => {
            if (prev) {
              return { ...prev, avatar: response.data.avatarUrl };
            } else {
              return {
                name: user?.name || '',
                email: user?.email || '',
                avatar: response.data.avatarUrl,
              };
            }
          });
        } else {
          console.warn('⚠️ No avatar URL in response');
        }
        
        alertService.success('Cập nhật avatar thành công');
      }
    } catch (error: any) {
      alertService.error(error.response?.data?.message || 'Không thể upload ảnh');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!token || !editName.trim()) {
      alertService.warning('Vui lòng nhập tên');
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.put(
        `${API_URL}/user/profile`,
        { name: editName, bio: editBio, phone: editPhone },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Update profile từ response (backend trả về profile mới)
        if (response.data.profile) {
          setProfile(response.data.profile);
          // Update edit form values
          setEditName(response.data.profile.name || '');
          setEditBio(response.data.profile.bio || '');
          setEditPhone(response.data.profile.phone || '');
        } else {
          // Fallback: update từ form values
          setProfile(prev => prev ? {
            ...prev,
            name: editName.trim(),
            bio: editBio.trim() || undefined,
            phone: editPhone.trim() || undefined,
          } : null);
        }
        
        // Close modal
        setIsEditing(false);
        
        // Show success message
        alertService.success('Cập nhật thông tin thành công');
      }
    } catch (error: any) {
      alertService.error(error.response?.data?.message || 'Không thể cập nhật');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      alertService.warning('Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    if (!newPassword.trim()) {
      alertService.warning('Vui lòng nhập mật khẩu mới');
      return;
    }

    if (newPassword.length < 6) {
      alertService.warning('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      alertService.warning('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await userService.changePassword(currentPassword, newPassword);
      if (response.success) {
        alertService.success('Đổi mật khẩu thành công!').then(() => {
          setShowChangePasswordModal(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmNewPassword('');
        });
      } else {
        alertService.error(response.message || 'Không thể đổi mật khẩu');
      }
    } catch (error: any) {
      alertService.error(error.response?.data?.message || error.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    alertService.confirm(
      'Bạn có chắc muốn đăng xuất?',
      'Đăng xuất',
      logout
    );
  };

  const getLevelProgress = () => {
    if (!stats) return 0;
    return (stats.points % 100) / 100;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Banner */}
        <View style={styles.header}>
          {/* Banner Image */}
          <View style={styles.bannerContainer}>
            {profile?.banner ? (
              <Image 
                source={{ uri: profile.banner }} 
                style={styles.bannerImage}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={['#FFB366', '#FF8C42', '#FF6B35'] as any}
                style={styles.bannerImage}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            )}
            <View style={styles.bannerOverlay} />
          </View>

          {/* Profile Info Section */}
          <View style={styles.profileInfoSection}>
            {/* Avatar */}
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              {profile?.avatar && profile.avatar.trim().length > 0 ? (
                <Image 
                  source={{ uri: profile.avatar }} 
                  style={styles.avatar}
                  onError={() => {}}
                  onLoad={() => {}}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: isDark ? '#3A3A5C' : '#E0E0E0' }]}>
                  <Ionicons name="person" size={50} color={isDark ? '#A0A0B0' : '#8B7355'} />
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* Name and Role */}
            <View style={styles.nameRoleContainer}>
              <View style={styles.nameRow}>
                {profile?.role === 'chef' && (
                  <View style={styles.chefBadgeSpacer} />
                )}
                <ThemedText style={[styles.profileName, { color: theme.text }]}>
                  {profile?.name || user?.name || 'Loading...'}
                </ThemedText>
                {profile?.role === 'chef' && (
                  <View style={[styles.chefBadge, { backgroundColor: colors.primary }]}>
                    <ThemedText style={styles.chefBadgeText}>Đầu bếp</ThemedText>
                    <Ionicons name="restaurant" size={10} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <ThemedText style={[styles.profileEmail, { color: isDark ? '#E0E0E0' : '#333333' }]}>
                {profile?.email || user?.email || ''}
              </ThemedText>
            </View>

            {/* Level Badge and Message Button Row */}
            <View style={styles.levelMessageRow}>
              <View style={[styles.levelBadge, { backgroundColor: isDark ? '#2A2A3A' : '#FFFFFF' }]}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <ThemedText style={[styles.levelText, { color: colors.text }]}>
                  Level {stats?.level || 1}
                </ThemedText>
              </View>
              
              <TouchableOpacity
                style={[styles.messageButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/messages' as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubbles-outline" size={18} color="#FFFFFF" />
                <ThemedText style={styles.messageButtonText}>Xem tin nhắn</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="flame" size={28} color="#FF6B35" />
            <ThemedText style={[styles.statValue, { color: theme.text }]}>
              {stats?.currentStreak || 0}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Chuỗi ngày
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="restaurant" size={28} color="#34C759" />
            <ThemedText style={[styles.statValue, { color: theme.text }]}>
              {stats?.totalMealsCooked || 0}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Món đã nấu
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="book" size={28} color="#FF9500" />
            <ThemedText style={[styles.statValue, { color: theme.text }]}>
              {stats?.totalRecipesCreated || 0}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Công thức
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="trophy" size={28} color="#FFD700" />
            <ThemedText style={[styles.statValue, { color: theme.text }]}>
              {stats?.badgesCount || 0}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Huy hiệu
            </ThemedText>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressCard, { backgroundColor: theme.card }]}>
          <View style={styles.progressHeader}>
            <ThemedText style={[styles.progressTitle, { color: theme.text }]}>
              Tiến độ Level
            </ThemedText>
            <ThemedText style={[styles.progressPoints, { color: theme.textSecondary }]}>
              {stats?.points || 0} XP
            </ThemedText>
          </View>
          <View style={[styles.progressBar, { backgroundColor: isDark ? '#3A3A5C' : '#F0E6DC' }]}>
            <LinearGradient
              colors={['#FF6B35', '#FFB84D']}
              style={[styles.progressFill, { width: `${getLevelProgress() * 100}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          <ThemedText style={[styles.progressLabel, { color: theme.textSecondary }]}>
            {Math.round(getLevelProgress() * 100)}% đến Level {(stats?.level || 1) + 1}
          </ThemedText>
        </View>

        {/* Bio Card */}
        <View style={[styles.bioCard, { backgroundColor: theme.card }]}>
          <Ionicons name="chatbubble-outline" size={20} color={theme.textSecondary} />
          {profile?.bio && profile.bio.trim().length > 0 ? (
            <ThemedText style={[styles.bioText, { color: theme.text }]}>
              {profile.bio}
            </ThemedText>
          ) : (
            <ThemedText style={[styles.bioText, { color: theme.textSecondary, fontStyle: 'italic' }]}>
              Chưa có giới thiệu. Tap "Chỉnh sửa thông tin" để thêm!
            </ThemedText>
          )}
        </View>


        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.card }]}
            onPress={() => router.push('/recipe/my-recipes')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#4ECDC4' }]}>
              <Ionicons name="book-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <ThemedText style={[styles.actionTitle, { color: theme.text }]}>
                Công thức của tôi
              </ThemedText>
              <ThemedText style={[styles.actionDesc, { color: theme.textSecondary }]}>
                Quản lý công thức đã đăng
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.card }]}
            onPress={() => {
              setShowNotificationsModal(true);
              setNotificationsTab('notifications');
              loadNotifications();
              loadFollowData();
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FF6B35' }]}>
              <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <ThemedText style={[styles.actionTitle, { color: theme.text }]}>
                Thông báo
              </ThemedText>
              <ThemedText style={[styles.actionDesc, { color: theme.textSecondary }]}>
                {profile?.followersCount || 0} người theo dõi{' • '}{profile?.followingCount || 0} đang theo dõi
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.card }]}
            onPress={() => {
              setShowAchievementsModal(true);
              loadLeaderboard();
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFD700' }]}>
              <Ionicons name="trophy-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <ThemedText style={[styles.actionTitle, { color: theme.text }]}>
                Bảng thành tích
              </ThemedText>
              <ThemedText style={[styles.actionDesc, { color: theme.textSecondary }]}>
                Level {stats?.level || 1}{' • '}{stats?.currentStreak || 0} ngày liên tiếp
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.card }]}
            onPress={() => setIsEditing(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#4ECDC4' }]}>
              <Ionicons name="create-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <ThemedText style={[styles.actionTitle, { color: theme.text }]}>
                Chỉnh sửa thông tin
              </ThemedText>
              <ThemedText style={[styles.actionDesc, { color: theme.textSecondary }]}>
                Cập nhật tên, bio, số điện thoại
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.card }]}
            onPress={() => setShowChangePasswordModal(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FF6B35' }]}>
              <Ionicons name="lock-closed-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <ThemedText style={[styles.actionTitle, { color: theme.text }]}>
                Đổi mật khẩu
              </ThemedText>
              <ThemedText style={[styles.actionDesc, { color: theme.textSecondary }]}>
                Thay đổi mật khẩu tài khoản
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.card }]}
            onPress={handleLogout}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E63946' }]}>
              <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <ThemedText style={[styles.actionTitle, { color: theme.text }]}>
                Đăng xuất
              </ThemedText>
              <ThemedText style={[styles.actionDesc, { color: theme.textSecondary }]}>
                Thoát khỏi tài khoản
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Level Up Animation - Break Chuỗi Lửa */}
      <StreakBreakAnimation
        visible={showLevelUpAnimation}
        newLevel={newLevel}
        onComplete={() => {
          setShowLevelUpAnimation(false);
        }}
      />

      {/* Notifications Modal */}
      <Modal visible={showNotificationsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                Thông báo
              </ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                {notificationsTab === 'notifications' && unreadCount > 0 && (
                  <TouchableOpacity onPress={async () => {
                    await notificationService.markAllAsRead();
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    setUnreadCount(0);
                  }}>
                    <ThemedText style={[styles.markAllRead, { color: colors.primary }]}>
                      Đánh dấu tất cả
                    </ThemedText>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Tabs */}
            <View style={styles.followTabs}>
              <TouchableOpacity
                style={[
                  styles.followTab,
                  notificationsTab === 'notifications' && styles.followTabActive,
                  notificationsTab === 'notifications' && { borderBottomColor: colors.primary },
                ]}
                onPress={() => {
                  setNotificationsTab('notifications');
                  loadNotifications();
                }}
              >
                <ThemedText
                  style={[
                    styles.followTabText,
                    { color: notificationsTab === 'notifications' ? colors.primary : theme.textSecondary },
                  ]}
                >
                  Thông báo{unreadCount > 0 && ` (${unreadCount})`}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.followTab,
                  notificationsTab === 'followers' && styles.followTabActive,
                  notificationsTab === 'followers' && { borderBottomColor: colors.primary },
                ]}
                onPress={() => {
                  setNotificationsTab('followers');
                  loadFollowData();
                }}
              >
                <ThemedText
                  style={[
                    styles.followTabText,
                    { color: notificationsTab === 'followers' ? colors.primary : theme.textSecondary },
                  ]}
                >
                  Người theo dõi ({followers.length})
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.followTab,
                  notificationsTab === 'following' && styles.followTabActive,
                  notificationsTab === 'following' && { borderBottomColor: colors.primary },
                ]}
                onPress={() => {
                  setNotificationsTab('following');
                  loadFollowData();
                }}
              >
                <ThemedText
                  style={[
                    styles.followTabText,
                    { color: notificationsTab === 'following' ? colors.primary : theme.textSecondary },
                  ]}
                >
                  Đang theo dõi ({following.length})
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Content */}
            {notificationsTab === 'notifications' ? (
              loadingNotifications ? (
                <View style={styles.followLoading}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <FlatList
                  data={notifications}
                  keyExtractor={(item) => item._id}
                  style={styles.followContent}
                  contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                  renderItem={({ item }) => {
                    const timeAgo = formatTimeAgo(item.createdAt);
                    const getNotificationIcon = (type: string) => {
                      switch (type) {
                        case 'comment': return 'chatbubble-outline';
                        case 'rating': return 'star-outline';
                        case 'like': return 'heart';
                        case 'follow': return 'person-add-outline';
                        case 'reply': return 'arrow-undo-outline';
                        case 'new_recipe': return 'restaurant-outline';
                        default: return 'notifications-outline';
                      }
                    };
                    const getNotificationMessage = (notification: Notification) => {
                      switch (notification.type) {
                        case 'comment': return `${notification.actorName} đã bình luận về công thức "${notification.recipeName}"`;
                        case 'rating': return `${notification.actorName} đã đánh giá ${notification.rating} sao cho "${notification.recipeName}"`;
                        case 'like': return `${notification.actorName} đã thích công thức "${notification.recipeName}"`;
                        case 'follow': return `${notification.actorName} đã theo dõi bạn`;
                        case 'reply': return `${notification.actorName} đã trả lời bình luận của bạn`;
                        case 'new_recipe': return `${notification.actorName} đã đăng công thức mới "${notification.recipeName}"`;
                        default: return 'Bạn có thông báo mới';
                      }
                    };
                    return (
                      <TouchableOpacity
                        style={[
                          styles.notificationItem,
                          { backgroundColor: !item.read ? (isDark ? '#1E1E3E' : '#FFF8F0') : 'transparent' },
                        ]}
                        onPress={async () => {
                          if (!item.read) {
                            await notificationService.markAsRead(item._id);
                            setNotifications(prev => prev.map(n => n._id === item._id ? { ...n, read: true } : n));
                            setUnreadCount(prev => Math.max(0, prev - 1));
                          }
                          if (item.recipeId) {
                            setShowNotificationsModal(false);
                            router.push(`/recipe/${item.recipeId}` as any);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.notificationContent}>
                          <View style={[styles.notificationIcon, { backgroundColor: colors.primary + '20' }]}>
                            <Ionicons name={getNotificationIcon(item.type) as any} size={20} color={colors.primary} />
                          </View>
                          <View style={styles.notificationText}>
                            <ThemedText style={[styles.notificationMessage, { color: theme.text }]} numberOfLines={2}>
                              {getNotificationMessage(item)}
                            </ThemedText>
                            <ThemedText style={[styles.notificationTime, { color: theme.textSecondary }]}>
                              {timeAgo}
                            </ThemedText>
                          </View>
                          {item.recipeImage && (
                            <Image source={{ uri: item.recipeImage }} style={styles.notificationImage} />
                          )}
                          {!item.read && (
                            <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.followEmpty}>
                      <Ionicons name="notifications-outline" size={48} color={theme.textSecondary} />
                      <ThemedText style={[styles.followEmptyText, { color: theme.textSecondary }]}>
                        Chưa có thông báo nào
                      </ThemedText>
                    </View>
                  }
                />
              )
            ) : loadingFollow ? (
              <View style={styles.followLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={notificationsTab === 'followers' ? followers : following}
                keyExtractor={(item, index) => (item._id || item.id || `item-${index}`).toString()}
                style={styles.followContent}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                renderItem={({ item }) => {
                  const userId = (item._id || item.id || '').toString();
                  const isFollowingUser = followStatuses[userId] || false;
                  const isOwnProfile = (user as any)?._id?.toString() === userId || (user as any)?.id?.toString() === userId;
                  
                  return (
                    <View style={styles.followItem}>
                      <TouchableOpacity
                        style={styles.followItemMain}
                        onPress={() => {
                          setShowNotificationsModal(false);
                          router.push(`/user/${userId}` as any);
                        }}
                        activeOpacity={0.7}
                      >
                        {item.avatar ? (
                          <Image source={{ uri: item.avatar }} style={styles.followAvatar} />
                        ) : (
                          <View style={[styles.followAvatar, styles.followAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                            <Ionicons name="person" size={24} color="#FFFFFF" />
                          </View>
                        )}
                        <View style={styles.followItemContent}>
                          <ThemedText style={[styles.followItemName, { color: theme.text }]}>
                            {item.name}
                          </ThemedText>
                          {item.bio && item.bio.trim().length > 0 ? (
                            <ThemedText
                              style={[styles.followItemBio, { color: theme.textSecondary }]}
                              numberOfLines={2}
                            >
                              {item.bio}
                            </ThemedText>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                      {!isOwnProfile && (
                        <TouchableOpacity
                          style={[
                            styles.followActionButton,
                            isFollowingUser && { backgroundColor: theme.cardBorder },
                            !isFollowingUser && { backgroundColor: colors.primary },
                          ]}
                          onPress={() => handleToggleFollow(userId, isFollowingUser)}
                          activeOpacity={0.7}
                        >
                          <ThemedText
                            style={[
                              styles.followActionButtonText,
                              { color: isFollowingUser ? theme.text : '#FFFFFF' },
                            ]}
                          >
                            {isFollowingUser ? 'Bỏ theo dõi' : 'Theo dõi'}
                          </ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.followEmpty}>
                    <Ionicons name="people-outline" size={48} color={theme.textSecondary} />
                    <ThemedText style={[styles.followEmptyText, { color: theme.textSecondary }]}>
                      {notificationsTab === 'followers'
                        ? 'Chưa có ai theo dõi bạn'
                        : 'Bạn chưa theo dõi ai'}
                    </ThemedText>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Achievements Modal */}
      <Modal visible={showAchievementsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                Bảng thành tích
              </ThemedText>
              <TouchableOpacity onPress={() => setShowAchievementsModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Content - Only Leaderboard */}
            <View style={styles.leaderboardContent}>
                {loadingLeaderboard ? (
                  <View style={styles.leaderboardLoading}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                ) : (
                  <FlatList
                    data={leaderboard}
                    keyExtractor={(item, index) => {
                      // Sử dụng rank và userId để đảm bảo unique, fallback về index
                      const rank = item.rank !== undefined ? item.rank : index;
                      const userId = item.userId || '';
                      return `leaderboard-${rank}-${userId}-${index}`;
                    }}
                    renderItem={({ item }) => {
                      const isCurrentUser = (user as any)?._id?.toString() === item.userId?.toString() || (user as any)?.id?.toString() === item.userId?.toString();
                      return (
                        <TouchableOpacity
                          style={[styles.leaderboardItem, isCurrentUser && { backgroundColor: theme.bg }]}
                          onPress={() => {
                            setShowAchievementsModal(false);
                            router.push(`/user/${item.userId}` as any);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.leaderboardRank}>
                            {item.rank <= 3 ? (
                              <View style={styles.leaderboardRankTop}>
                                <Ionicons
                                  name={item.rank === 1 ? 'trophy' : item.rank === 2 ? 'medal' : 'medal-outline'}
                                  size={24}
                                  color={item.rank === 1 ? '#FFD700' : item.rank === 2 ? '#C0C0C0' : '#CD7F32'}
                                />
                                {item.specialBadge && (
                                  <View style={[
                                    styles.leaderboardBadge,
                                    item.rank === 1 && { backgroundColor: '#FFD700' },
                                    item.rank === 2 && { backgroundColor: '#C0C0C0' },
                                    item.rank === 3 && { backgroundColor: '#CD7F32' },
                                  ]}>
                                    <ThemedText style={[styles.leaderboardBadgeText, { color: '#FFFFFF' }]}>
                                      {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉'}
                                    </ThemedText>
                                  </View>
                                )}
                              </View>
                            ) : (
                              <ThemedText style={[styles.leaderboardRankText, { color: theme.textSecondary }]}>
                                #{item.rank}
                              </ThemedText>
                            )}
                          </View>
                          {item.avatar ? (
                            <Image source={{ uri: item.avatar }} style={styles.leaderboardAvatar} />
                          ) : (
                            <View style={[styles.leaderboardAvatar, styles.leaderboardAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                              <Ionicons name="person" size={20} color="#FFFFFF" />
                            </View>
                          )}
                          <View style={styles.leaderboardInfo}>
                            <View style={styles.leaderboardNameRow}>
                              <ThemedText style={[styles.leaderboardName, { color: theme.text }]}>
                                {item.name}
                              </ThemedText>
                              {isCurrentUser && (
                                <View style={[styles.leaderboardYouBadge, { backgroundColor: colors.primary }]}>
                                  <ThemedText style={styles.leaderboardYouText}>Bạn</ThemedText>
                                </View>
                              )}
                            </View>
                            <View style={styles.leaderboardStats}>
                              <ThemedText style={[styles.leaderboardStat, { color: theme.textSecondary }]}>
                                Level {item.level}{' • '}{item.points} XP
                              </ThemedText>
                              <View style={styles.leaderboardStatRow}>
                                <View style={styles.leaderboardStatItem}>
                                  <Ionicons name="flame" size={12} color={theme.textSecondary} />
                                  <ThemedText style={[styles.leaderboardStat, { color: theme.textSecondary }]}>
                                    {item.currentStreak} ngày
                                  </ThemedText>
                                </View>
                                <ThemedText style={[styles.leaderboardStat, { color: theme.textSecondary }]}>
                                  {' • '}
                                </ThemedText>
                                <View style={styles.leaderboardStatItem}>
                                  <Ionicons name="book" size={12} color={theme.textSecondary} />
                                  <ThemedText style={[styles.leaderboardStat, { color: theme.textSecondary }]}>
                                    {item.totalRecipesCreated} công thức
                                  </ThemedText>
                                </View>
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                    ListEmptyComponent={
                      <View style={styles.leaderboardEmpty}>
                        <Ionicons name="trophy-outline" size={48} color={theme.textSecondary} />
                        <ThemedText style={[styles.leaderboardEmptyText, { color: theme.textSecondary }]}>
                          Chưa có dữ liệu xếp hạng
                        </ThemedText>
                      </View>
                    }
                  />
                )}
              </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={isEditing} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                Chỉnh sửa thông tin
              </ThemedText>
              <TouchableOpacity
                onPress={() => {
                  setIsEditing(false);
                }}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Tên hiển thị
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.bg, color: theme.text }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nhập tên..."
                placeholderTextColor={theme.textSecondary}
              />

              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Giới thiệu
              </ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.bg, color: theme.text }]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Viết vài dòng về bạn..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Số điện thoại
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.bg, color: theme.text }]}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Nhập số điện thoại..."
                placeholderTextColor={theme.textSecondary}
                keyboardType="phone-pad"
              />

              <View style={[styles.divider, { backgroundColor: theme.cardBorder, marginTop: 24, marginBottom: 16 }]} />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.bg }]}
                onPress={() => {
                  setIsEditing(false);
                }}
              >
                <ThemedText style={[styles.modalBtnText, { color: theme.text }]}>Hủy</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { overflow: 'hidden' }]}
                onPress={handleSaveProfile}
                disabled={isLoading}
              >
                <LinearGradient colors={['#FF6B35', '#FF8F5A']} style={styles.modalBtnGradient}>
                  <ThemedText style={styles.modalBtnTextWhite}>
                    {isLoading ? 'Đang lưu...' : 'Lưu'}
                  </ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showChangePasswordModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                Đổi mật khẩu
              </ThemedText>
              <TouchableOpacity
                onPress={() => {
                  setShowChangePasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Mật khẩu hiện tại
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.bg, color: theme.text }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Nhập mật khẩu hiện tại..."
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoCapitalize="none"
              />

              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 16 }]}>
                Mật khẩu mới
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.bg, color: theme.text }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoCapitalize="none"
              />

              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 16 }]}>
                Xác nhận mật khẩu mới
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.bg, color: theme.text }]}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholder="Nhập lại mật khẩu mới..."
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoCapitalize="none"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.bg }]}
                onPress={() => {
                  setShowChangePasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}
              >
                <ThemedText style={[styles.modalBtnText, { color: theme.text }]}>Hủy</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { overflow: 'hidden' }]}
                onPress={handleChangePassword}
                disabled={isChangingPassword}
              >
                <LinearGradient colors={['#FF6B35', '#FF8F5A']} style={styles.modalBtnGradient}>
                  <ThemedText style={styles.modalBtnTextWhite}>
                    {isChangingPassword ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                  </ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Chef List Modal - Chọn Chef để chat */}
      <Modal
        visible={showChefListModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowChefListModal(false)}
      >
        <SafeAreaView style={[styles.chefListModalContainer, { backgroundColor: theme.bg }]} edges={['top']}>
          <View style={[styles.chefListModalHeader, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={styles.chefListModalCloseBtn}
              onPress={() => setShowChefListModal(false)}
            >
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
            <ThemedText style={[styles.chefListModalTitle, { color: theme.text }]}>
              Chọn Chef để nhắn tin
            </ThemedText>
            <View style={{ width: 44 }} />
          </View>

          {loadingChefs ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : chefs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={64} color={theme.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                Chưa có đầu bếp nào
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={chefs}
              keyExtractor={(item, index) => (item._id || `chef-${index}`).toString()}
              contentContainerStyle={styles.chefListContent}
              renderItem={({ item }) => {
                // Check if chef is online (within last 5 minutes)
                const isOnline = item.lastSeen ? (() => {
                  const lastSeenDate = new Date(item.lastSeen);
                  const now = new Date();
                  const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
                  return diffMinutes < 5;
                })() : false;

                return (
                  <TouchableOpacity
                    style={[
                      styles.chefListItem,
                      {
                        backgroundColor: isDark ? '#25253D' : '#FFFFFF',
                        borderColor: isDark ? '#3A3A5A' : '#E5E5E5',
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => {
                      setShowChefListModal(false);
                      router.push(`/messages/${(item._id || '').toString()}` as any);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.chefListItemAvatarContainer}>
                      {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.chefListItemAvatar} />
                      ) : (
                        <View style={[styles.chefListItemAvatar, styles.chefListItemAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                          <Ionicons name="person" size={24} color="#FFFFFF" />
                        </View>
                      )}
                      {isOnline && <View style={styles.chefListItemOnlineIndicator} />}
                    </View>
                    <View style={styles.chefListItemContent}>
                      <View style={styles.chefListItemHeader}>
                        <ThemedText style={[styles.chefListItemName, { color: theme.text }]}>
                          {item.name}
                        </ThemedText>
                        <View style={[styles.chefListItemBadge, { backgroundColor: colors.primary }]}>
                          <Ionicons name="restaurant" size={12} color="#FFFFFF" />
                          <ThemedText style={styles.chefListItemBadgeText}>Đầu bếp</ThemedText>
                        </View>
                      </View>
                      {item.bio && (
                        <ThemedText
                          style={[styles.chefListItemBio, { color: theme.textSecondary }]}
                          numberOfLines={2}
                        >
                          {item.bio}
                        </ThemedText>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'relative',
    marginBottom: 20,
  },
  bannerContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  profileInfoSection: {
    position: 'absolute',
    bottom: -50,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  levelMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    width: '100%',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  nameRoleContainer: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 4,
    paddingHorizontal: 20,
    position: 'relative',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  chefBadgeSpacer: {
    width: 70,
  },
  chefBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
    marginLeft: 6,
  },
  chefBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileEmail: {
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  headerActionButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 50,
    gap: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  progressCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressPoints: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressLabel: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  bioCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  bioText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  followSection: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  followItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  followItemCompactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  followItemCompactText: {
    flex: 1,
  },
  followItemCompactLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  followItemCompactValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  followDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  followTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  followTab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  followTabActive: {
    borderBottomWidth: 2,
  },
  followTabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  followContent: {
    flex: 1,
    maxHeight: 500,
  },
  followLoading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  followItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  followAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  followAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  followItemContent: {
    flex: 1,
  },
  followItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  followItemBio: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.7,
  },
  followEmpty: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followEmptyText: {
    fontSize: 15,
    marginTop: 16,
    textAlign: 'center',
  },
  followActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  achievementsContent: {
    flex: 1,
    padding: 20,
  },
  achievementSection: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  achievementSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  achievementSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  achievementSectionDesc: {
    fontSize: 13,
    marginTop: 8,
  },
  achievementStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  achievementStatCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  achievementStatValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  achievementStatLabel: {
    fontSize: 13,
    textAlign: 'center',
  },
  achievementStatSub: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  achievementTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  achievementTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  achievementTabActive: {
    borderBottomWidth: 2,
  },
  achievementTabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  leaderboardContent: {
    flex: 1,
  },
  leaderboardLoading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  leaderboardRank: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardRankText: {
    fontSize: 16,
    fontWeight: '700',
  },
  leaderboardRankTop: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  leaderboardBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  leaderboardBadgeText: {
    fontSize: 12,
  },
  leaderboardAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  leaderboardAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '600',
  },
  leaderboardYouBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  leaderboardYouText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  leaderboardStats: {
    gap: 2,
  },
  leaderboardStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leaderboardStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leaderboardStat: {
    fontSize: 12,
  },
  leaderboardEmpty: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardEmptyText: {
    fontSize: 15,
    marginTop: 16,
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalBodyContent: {
    paddingBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modalBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 8,
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    padding: 14,
  },
  modalBtnTextWhite: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 6,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 160,
  },
  messageButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chefListModalContainer: {
    flex: 1,
  },
  chefListModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  chefListModalCloseBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chefListModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  chefListContent: {
    padding: 16,
  },
  chefListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chefListItemAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  chefListItemAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  chefListItemAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chefListItemOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chefListItemContent: {
    flex: 1,
  },
  chefListItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  chefListItemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  chefListItemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chefListItemBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chefListItemBio: {
    fontSize: 14,
    lineHeight: 20,
  },
  levelUpOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  levelUpContent: {
    position: 'relative',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelUpTextContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  levelUpTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFD700',
    textShadowColor: '#FF6B35',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  levelUpSubtitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  confetti: {
    position: 'absolute',
    borderRadius: 2,
  },
  flame: {
    position: 'absolute',
    bottom: 0,
  },
  markAllRead: {
    fontSize: 14,
    fontWeight: '600',
  },
  notificationItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationText: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
  },
  notificationImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 12,
    right: 12,
  },
});
