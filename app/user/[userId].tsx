import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import { userService } from '@/services';
import recipeService from '@/services/recipeService';
import { Image as ExpoImage } from 'expo-image';

const { width } = Dimensions.get('window');

interface UserProfile {
  _id: string;
  id: string;
  name: string;
  email: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  phone?: string;
  gender?: string;
  role?: 'chef' | 'user';
  createdAt?: string;
  lastSeen?: string;
  isFollowing?: boolean;
  followersCount?: number;
  followingCount?: number;
  recipesCount?: number;
}

interface Recipe {
  _id: string;
  name: string;
  image?: string;
  prepTime?: number;
  cookTime?: number;
  difficulty?: string;
  authorName?: string;
  authorId?: string;
  rating?: number;
  reviewCount?: number;
  isSaved?: boolean;
}

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'recipes' | 'about' | 'gallery'>('recipes');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState({
    recipesCount: 0,
    followersCount: 0,
    followingCount: 0,
  });

  const isOwnProfile = (user as any)?._id === userId || (user as any)?.id === userId;

  useEffect(() => {
    if (userId) {
      loadProfile();
      loadRecipes();
    }
  }, [userId]);

  const loadProfile = async () => {
    if (!userId || typeof userId !== 'string') return;
    
    try {
      setLoading(true);
      const response = await userService.getUserById(userId);
      if (response.success && response.data) {
        const userData = response.data as any;
        setProfile({
          _id: userData._id || userData.id || userId,
          id: userData._id || userData.id || userId,
          name: userData.name || '',
          email: userData.email || '',
          avatar: userData.avatar,
          banner: userData.banner,
          bio: userData.bio,
          phone: userData.phone,
          gender: userData.gender,
          role: userData.role,
          createdAt: userData.createdAt,
          lastSeen: userData.lastSeen,
          isFollowing: userData.isFollowing || false,
          followersCount: userData.followersCount || 0,
          followingCount: userData.followingCount || 0,
          recipesCount: userData.recipesCount || 0,
        });
        
        // Update stats from API
        setStats({
          recipesCount: userData.recipesCount || 0,
          followersCount: userData.followersCount || 0,
          followingCount: userData.followingCount || 0,
        });
        
        // Set follow status
        setIsFollowing(userData.isFollowing || false);
        
        // Check online status based on lastSeen
        if (userData.lastSeen) {
          const lastSeen = new Date(userData.lastSeen);
          const now = new Date();
          const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
          // Consider online if last seen within 5 minutes
          setIsOnline(diffMinutes < 5);
        } else {
          setIsOnline(true); // Default to online if no lastSeen
        }
      }
    } catch (error: any) {
    } finally {
      setLoading(false);
    }
  };

  const loadRecipes = async () => {
    if (!userId || typeof userId !== 'string') return;
    
    try {
      // Load recipes filtered by authorId from backend
      const response = await recipeService.getRecipes({
        authorId: userId,
        limit: 100,
      });
      
      if (response.success && response.data) {
        const recipes = (response.data as any).recipes || response.data || [];
        
        setRecipes(recipes);
        
        // Extract gallery images from recipes
        const images: string[] = [];
        recipes.forEach((recipe: any) => {
          if (recipe.image) images.push(recipe.image);
          if (recipe.images && Array.isArray(recipe.images)) {
            images.push(...recipe.images);
          }
        });
        setGalleryImages(images);
        
        // Update recipes count in stats (only if we have actual count from API)
        // Otherwise keep the count from API
        if (recipes.length > 0) {
          setStats(prev => ({ ...prev, recipesCount: recipes.length }));
        }
      }
    } catch (error: any) {
    }
  };

  useEffect(() => {
    if (activeTab === 'recipes') {
      loadRecipes();
    }
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadRecipes()]);
    setRefreshing(false);
  };

  const handleFollow = async () => {
    if (!userId || typeof userId !== 'string') return;
    
    try {
      const response = await userService.toggleFollow(userId);
      if (response.success && response.data) {
        const newFollowingStatus = response.data.following;
        setIsFollowing(newFollowingStatus);
        
        // Update followers count
        setStats(prev => ({
          ...prev,
          followersCount: newFollowingStatus 
            ? prev.followersCount + 1 
            : Math.max(0, prev.followersCount - 1),
        }));
        
        // Update profile
        setProfile(prev => prev ? {
          ...prev,
          isFollowing: newFollowingStatus,
          followersCount: newFollowingStatus 
            ? (prev.followersCount || 0) + 1 
            : Math.max(0, (prev.followersCount || 0) - 1),
        } : null);
        
        // Reload profile to get updated stats
        await loadProfile();
      }
    } catch (error: any) {
    }
  };

  const handleMessage = () => {
    if (userId && typeof userId === 'string') {
      router.push(`/messages/${userId}`);
    }
  };

  const renderRecipeCard = ({ item }: { item: Recipe }) => {
    const totalTime = (item.prepTime || 0) + (item.cookTime || 0);
    
    return (
      <TouchableOpacity
        style={[styles.recipeCard, isDark && styles.recipeCardDark]}
        onPress={() => router.push(`/recipe/${item._id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.recipeImageContainer}>
          {item.image ? (
            <ExpoImage
              source={{ uri: item.image }}
              style={styles.recipeImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.recipeImage, styles.recipeImagePlaceholder]}>
              <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
            </View>
          )}
          
          {/* Rating Badge */}
          {item.rating && (
            <View style={styles.recipeRatingBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <ThemedText style={styles.recipeRatingText}>
                {item.rating.toFixed(1)} ({item.reviewCount || 0}+ Đánh giá)
              </ThemedText>
            </View>
          )}
          
          {/* Favorite Badge */}
          {item.isSaved && (
            <View style={styles.recipeFavoriteBadge}>
              <Ionicons name="bookmark" size={16} color="#FF6B35" />
            </View>
          )}
        </View>
        
        <View style={styles.recipeContent}>
          <ThemedText style={[styles.recipeName, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </ThemedText>
          
          <View style={styles.recipeMeta}>
            <View style={styles.recipeMetaItem}>
              <Ionicons name="time-outline" size={14} color={colors.primary} />
              <ThemedText style={[styles.recipeMetaText, { color: colors.textSecondary }]}>
                {totalTime} phút
              </ThemedText>
            </View>
            <ThemedText style={[styles.recipeMetaText, { color: colors.textSecondary }]}>
              •
            </ThemedText>
            <ThemedText style={[styles.recipeMetaText, { color: colors.textSecondary }]}>
              {item.difficulty === 'Dễ' ? 'Dễ' : item.difficulty === 'Trung bình' ? 'Trung bình' : item.difficulty === 'Khó' ? 'Khó' : item.difficulty || 'Dễ'}
            </ThemedText>
            <ThemedText style={[styles.recipeMetaText, { color: colors.textSecondary }]}>
              •
            </ThemedText>
            <ThemedText style={[styles.recipeMetaText, { color: colors.textSecondary }]}>
              bởi {item.authorName || 'Đầu bếp'}
            </ThemedText>
            <View style={styles.vegetarianBadge}>
              <Ionicons name="leaf" size={12} color="#4CAF50" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1A1A2E' : '#FFF8F0' }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
            Đang tải...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1A1A2E' : '#FFF8F0' }]} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={64} color={colors.textSecondary} />
          <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
            Không tìm thấy người dùng
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1A1A2E' : '#FFF8F0' }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header with Banner */}
        <View style={styles.header}>
          {/* Banner Image */}
          <View style={styles.bannerContainer}>
            {profile?.banner ? (
              <ExpoImage
                source={{ uri: profile.banner }}
                style={styles.bannerImage}
                contentFit="cover"
              />
            ) : (
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800' }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.bannerOverlay} />
          </View>

          {/* Header Actions */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerActionsRight}>
              <TouchableOpacity style={styles.headerActionButton}>
                <Ionicons name="heart-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionButton}>
                <Ionicons name="share-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

        </View>

        {/* Profile Info Section */}
        <View style={[styles.profileSection, { backgroundColor: isDark ? '#25253D' : '#FFFFFF' }]}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={60} color={colors.textSecondary} />
              </View>
            )}
          </View>

          {/* Name and Role */}
          <ThemedText style={[styles.profileName, { color: isDark ? '#FFFFFF' : colors.text }]}>
            {profile.name || 'Người dùng'}
          </ThemedText>
          <View style={styles.roleContainer}>
            <ThemedText style={[styles.profileRole, { color: isDark ? '#E0E0E0' : colors.textSecondary }]}>
              {profile.role === 'chef' ? 'Đầu bếp' : 'Người dùng'}
            </ThemedText>
            {profile.role === 'chef' && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statNumber, { color: isDark ? '#FFFFFF' : colors.text }]}>
                {stats.recipesCount}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: isDark ? '#E0E0E0' : colors.textSecondary }]}>
                Công thức
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statNumber, { color: isDark ? '#FFFFFF' : colors.text }]}>
                {stats.followersCount.toLocaleString()}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: isDark ? '#E0E0E0' : colors.textSecondary }]}>
                Người theo dõi
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statNumber, { color: isDark ? '#FFFFFF' : colors.text }]}>
                {stats.followingCount.toLocaleString()}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: isDark ? '#E0E0E0' : colors.textSecondary }]}>
                Đang theo dõi
              </ThemedText>
            </View>
          </View>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.followButton, 
                  { 
                    backgroundColor: isFollowing ? '#E0E0E0' : colors.primary,
                  }
                ]}
                onPress={handleFollow}
              >
                <Ionicons 
                  name={isFollowing ? "checkmark" : "person-add-outline"} 
                  size={18} 
                  color={isFollowing ? colors.text : "#FFFFFF"} 
                />
                <ThemedText 
                  style={[
                    styles.followButtonText,
                    { color: isFollowing ? colors.text : "#FFFFFF" }
                  ]}
                >
                  {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                </ThemedText>
              </TouchableOpacity>
              
              {/* Show Message button if current user is a chef (chef can message anyone) */}
              {user?.role === 'chef' && (
                <TouchableOpacity
                  style={[styles.messageButton, { borderColor: colors.primary }]}
                  onPress={handleMessage}
                >
                  <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                  <ThemedText style={[styles.messageButtonText, { color: colors.primary }]}>
                    Nhắn tin
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Navigation Tabs */}
        <View style={[styles.tabsContainer, { 
          borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E5E5',
          backgroundColor: isDark ? '#25253D' : '#FFFFFF'
        }]}>
          {([
            { key: 'recipes', label: 'Công thức' },
            { key: 'about', label: 'Giới thiệu' },
            { key: 'gallery', label: 'Thư viện ảnh' },
          ] as const).map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, activeTab === key && styles.tabActive]}
              onPress={() => setActiveTab(key as any)}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  { 
                    color: activeTab === key 
                      ? colors.primary 
                      : (isDark ? '#E0E0E0' : colors.textSecondary)
                  },
                ]}
              >
                {label}
              </ThemedText>
              {activeTab === key && (
                <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Content based on active tab */}
        {activeTab === 'recipes' && (
          <View style={[styles.recipesSection, { backgroundColor: isDark ? '#25253D' : '#FFFFFF' }]}>
            <ThemedText style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : colors.text }]}>
              Công thức ({stats.recipesCount})
            </ThemedText>


            {/* Recipes List */}
            {recipes.length > 0 ? (
              <FlatList
                data={recipes}
                renderItem={renderRecipeCard}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                contentContainerStyle={styles.recipesList}
              />
            ) : (
              <View style={styles.emptyRecipesContainer}>
                <Ionicons name="restaurant-outline" size={48} color={colors.textSecondary} />
                <ThemedText style={[styles.emptyRecipesText, { color: colors.textSecondary }]}>
                  Chưa có công thức nào
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {activeTab === 'about' && (
          <View style={[styles.aboutSection, { backgroundColor: isDark ? '#25253D' : '#FFFFFF' }]}>
            {/* Avatar with Online Indicator */}
            <View style={styles.aboutAvatarContainer}>
              {profile.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.aboutAvatar} />
              ) : (
                <View style={[styles.aboutAvatar, styles.aboutAvatarPlaceholder]}>
                  <Ionicons name="person" size={60} color={colors.textSecondary} />
                </View>
              )}
              {isOnline && (
                <View style={styles.aboutOnlineIndicator} />
              )}
            </View>

            {/* Name */}
            <ThemedText style={[styles.aboutName, { color: isDark ? '#FFFFFF' : colors.text }]}>
              {profile.name || 'Người dùng'}
            </ThemedText>

            {/* Information List */}
            <View style={styles.aboutInfoList}>
              {profile.email && (
                <View style={styles.aboutInfoRow}>
                  <ThemedText style={[styles.aboutInfoLabel, { color: isDark ? '#B0B0B0' : colors.textSecondary }]}>
                    EMAIL
                  </ThemedText>
                  <ThemedText style={[styles.aboutInfoValue, { color: isDark ? '#FFFFFF' : colors.text }]}>
                    {profile.email}
                  </ThemedText>
                </View>
              )}

              {profile.role && (
                <View style={styles.aboutInfoRow}>
                  <ThemedText style={[styles.aboutInfoLabel, { color: isDark ? '#B0B0B0' : colors.textSecondary }]}>
                    VAI TRÒ
                  </ThemedText>
                  <ThemedText style={[styles.aboutInfoValue, { color: isDark ? '#FFFFFF' : colors.text }]}>
                    {profile.role === 'chef' ? 'Đầu bếp' : 'Người dùng'}
                  </ThemedText>
                </View>
              )}

              {profile.createdAt && (
                <View style={styles.aboutInfoRow}>
                  <ThemedText style={[styles.aboutInfoLabel, { color: isDark ? '#B0B0B0' : colors.textSecondary }]}>
                    THAM GIA TỪ
                  </ThemedText>
                  <ThemedText style={[styles.aboutInfoValue, { color: isDark ? '#FFFFFF' : colors.text }]}>
                    {new Date(profile.createdAt).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </ThemedText>
                </View>
              )}

              {profile.phone && (
                <TouchableOpacity 
                  style={styles.aboutInfoRow}
                  onPress={async () => {
                    if (!profile.phone) return;
                    
                    try {
                      // Clean phone number (remove spaces, dashes, etc.)
                      const cleanPhone = profile.phone.replace(/[\s\-\(\)]/g, '');
                      const phoneUrl = `tel:${cleanPhone}`;
                      
                      // Open phone dialer directly
                      await Linking.openURL(phoneUrl);
                    } catch (error) {
                      // Fallback: show number so user can copy
                      alert(`Số điện thoại: ${profile.phone}\n\nKhông thể mở ứng dụng gọi điện. Bạn có thể copy số này.`);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.aboutInfoLabel, { color: isDark ? '#B0B0B0' : colors.textSecondary }]}>
                    SỐ ĐIỆN THOẠI
                  </ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ThemedText style={[styles.aboutInfoValue, { color: isDark ? '#FFFFFF' : colors.text }]}>
                      {profile.phone}
                    </ThemedText>
                    <Ionicons name="call-outline" size={18} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              )}

              {profile.bio && profile.bio.trim().length > 0 && (
                <View style={styles.aboutInfoRow}>
                  <ThemedText style={[styles.aboutInfoLabel, { color: isDark ? '#B0B0B0' : colors.textSecondary }]}>
                    GIỚI THIỆU
                  </ThemedText>
                  <ThemedText style={[styles.aboutInfoValue, { color: isDark ? '#FFFFFF' : colors.text }]}>
                    {profile.bio}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'gallery' && (
          <View style={[styles.gallerySection, { backgroundColor: isDark ? '#25253D' : '#FFFFFF' }]}>
            <ThemedText style={[styles.galleryTitle, { color: isDark ? '#FFFFFF' : colors.text }]}>
              Thư viện ảnh ({galleryImages.length})
            </ThemedText>
            {galleryImages.length > 0 ? (
              <View style={styles.galleryGrid}>
                {galleryImages.slice(0, 12).map((imageUri, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.galleryItem}
                    onPress={() => {
                      // TODO: Open image viewer
                    }}
                  >
                    <ExpoImage
                      source={{ uri: imageUri }}
                      style={styles.galleryImage}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyGalleryContainer}>
                <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
                <ThemedText style={[styles.emptyGalleryText, { color: colors.textSecondary }]}>
                  Chưa có ảnh nào
                </ThemedText>
              </View>
            )}
          </View>
        )}

      </ScrollView>
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    height: 250,
    position: 'relative',
  },
  bannerContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 10,
  },
  headerActionsRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  verifiedBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },
  avatarContainer: {
    marginTop: -60,
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingHorizontal: 20,
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 25,
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  recipesSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  recipesList: {
    gap: 16,
  },
  recipeCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeCardDark: {
    backgroundColor: '#25253D',
  },
  recipeImageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  recipeImage: {
    width: '100%',
    height: '100%',
  },
  recipeImagePlaceholder: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeRatingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recipeRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  recipeFavoriteBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeContent: {
    padding: 12,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  recipeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipeMetaText: {
    fontSize: 12,
  },
  vegetarianBadge: {
    marginLeft: 'auto',
  },
  emptyRecipesContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyRecipesText: {
    marginTop: 12,
    fontSize: 16,
  },
  aboutSection: {
    padding: 24,
    alignItems: 'center',
  },
  aboutAvatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  aboutAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  aboutAvatarPlaceholder: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutOnlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  aboutName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  aboutInfoList: {
    width: '100%',
    gap: 24,
  },
  aboutInfoRow: {
    gap: 8,
  },
  aboutInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  aboutInfoValue: {
    fontSize: 16,
    fontWeight: '400',
  },
  gallerySection: {
    padding: 16,
  },
  galleryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyGalleryContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyGalleryText: {
    marginTop: 12,
    fontSize: 16,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  galleryItem: {
    width: (width - 48) / 3, // 3 columns with padding and gaps
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
});

