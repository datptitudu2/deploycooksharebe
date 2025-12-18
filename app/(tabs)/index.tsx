import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  FlatList,
  RefreshControl,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  ImageBackground,
  Alert,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ui/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router, useFocusEffect } from 'expo-router';
import { recipeService, Recipe, storyService, challengeService, mealPlanService, userService } from '@/services';
import { achievementService } from '@/services';
import api from '@/services/api';
import type { Story } from '@/services/storyService';
import type { Challenge } from '@/services/challengeService';
import { alertService } from '@/services/alertService';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;
const CARD_SPACING = 16;

// Categories với icons và emoji
const CATEGORIES = [
  { id: 'all', name: 'Tất cả', icon: 'grid', emoji: '🍽️', color: '#FF6B6B', gradient: ['#FF6B6B', '#FF8E8E'] },
  { id: 'vietnamese', name: 'Món Việt', icon: 'leaf', emoji: '🇻🇳', color: '#4ECDC4', gradient: ['#4ECDC4', '#6EDDD6'] },
  { id: 'healthy', name: 'Healthy', icon: 'heart', emoji: '🥗', color: '#45B7D1', gradient: ['#45B7D1', '#6BC5E0'] },
  { id: 'dessert', name: 'Dessert', icon: 'ice-cream', emoji: '🍰', color: '#96CEB4', gradient: ['#96CEB4', '#B4E0C9'] },
  { id: 'quick', name: 'Nhanh', icon: 'flash', emoji: '⚡', color: '#FFEAA7', gradient: ['#FFEAA7', '#FFF4D1'] },
  { id: 'asian', name: 'Món Á', icon: 'restaurant', emoji: '🍜', color: '#A8E6CF', gradient: ['#A8E6CF', '#C4F0DD'] },
];

interface FeaturedChef {
  _id: string;
  name: string;
  avatar?: string;
  recipesCount: number;
  totalLikes?: number;
}

export default function HomeScreen() {
  const { user, token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  // Data from API
  const [trendingRecipes, setTrendingRecipes] = useState<Recipe[]>([]);
  const [personalizedRecipes, setPersonalizedRecipes] = useState<Recipe[]>([]);
  const [featuredChefs, setFeaturedChefs] = useState<FeaturedChef[]>([]);
  const [recipeOfTheDay, setRecipeOfTheDay] = useState<Recipe | null>(null);
  const [globalStats, setGlobalStats] = useState({ totalRecipes: 0, totalChefs: 0, totalLikes: 0 });
  const [notifications, setNotifications] = useState<any[]>([]);

  // New features state
  const [cookingTips, setCookingTips] = useState<Story[]>([]);
  const [todayChallenge, setTodayChallenge] = useState<Challenge | null>(null);

  // Carousel state
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);

  // Track avatar load errors
  const [avatarErrors, setAvatarErrors] = useState<Set<string>>(new Set());


  // Fetch user stats
  const fetchUserStats = useCallback(async () => {
    if (!token) return;
    try {
      const response = await achievementService.getStats();
      if (response.success) {
        // Backend trả về { success: true, stats: {...} }
        // achievementService.getStats() trả về response.data từ axios
        // Vậy response sẽ là { success: true, stats: {...} }
        const responseAny = response as any;
        const statsData = responseAny.stats || response.data;
        if (statsData) {
          setStats(statsData);
        }
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  }, [token]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [
        trendingRes,
        newestRes,
        chefsRes,
        statsRes,
        personalizedRes,
        notificationsRes,
      ] = await Promise.all([
        recipeService.getTrending(6).catch(() => ({ success: false, data: [] })),
        recipeService.getNewest(12).catch(() => ({ success: false, data: [] })),
        api.get('/recipe-management/featured-chefs?limit=8')
          .then(r => r.data)
          .catch(() => ({ success: false, data: [] })),
        api.get('/recipe-management/stats')
          .then(r => r.data)
          .catch(() => ({ success: true, data: { totalRecipes: 0, totalChefs: 0, totalLikes: 0 } })),
        recipeService.getTrending(8).catch(() => ({ success: false, data: [] })),
        token ? api.get('/notifications?limit=5').then(r => r.data).catch(() => ({ success: false, data: [] })) : Promise.resolve({ success: false, data: [] }),
      ]);

      if (trendingRes.success && trendingRes.data) {
        setTrendingRecipes(trendingRes.data);
        if (trendingRes.data.length > 0) {
          setRecipeOfTheDay(trendingRes.data[0]);
        }
      }
      if (newestRes.success && newestRes.data) {
        setPersonalizedRecipes(newestRes.data);
      }
      if (chefsRes.success && chefsRes.data) {
        setFeaturedChefs(chefsRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setGlobalStats(statsRes.data);
      }
      if (personalizedRes.success && personalizedRes.data) {
        setPersonalizedRecipes(personalizedRecipes.length === 0 ? personalizedRes.data : personalizedRecipes);
      }
      if (notificationsRes.success && notificationsRes.data) {
        setNotifications(notificationsRes.data);
      }

      await fetchUserStats();
      
      // Fetch new features data
      await fetchNewFeaturesData();
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [token, fetchUserStats]);

  // Fetch new features: Stories, Challenge, Weekly Stats
  const fetchNewFeaturesData = useCallback(async () => {
    try {
      // Fetch cooking tips
      const tipsRes = await storyService.getCookingTips().catch(() => ({ success: false, data: [] }));
      if (tipsRes.success && tipsRes.data) {
        // Đảm bảo mỗi tip có userName
        const tipsWithNames = tipsRes.data.map((tip: any) => ({
          ...tip,
          userName: tip.userName || 'Người dùng'
        }));
        setCookingTips(tipsWithNames);
      }

      // Fetch today's challenge
      const challengeRes = await challengeService.getTodayChallenge().catch(() => ({ success: false, data: null }));
      if (challengeRes.success && challengeRes.data) {
        setTodayChallenge(challengeRes.data);
      }
    } catch (error) {
      console.error('Error fetching new features data:', error);
    }
  }, [token, stats]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data khi quay lại từ challenges screen
  useFocusEffect(
    useCallback(() => {
      fetchData();
      fetchUserStats(); // Đảm bảo stats được refresh khi quay lại screen
    }, [fetchData, fetchUserStats])
  );

  // Filter recipes by category
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredRecipes(personalizedRecipes);
    } else {
      const filtered = personalizedRecipes.filter(recipe => 
        recipe.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
      setFilteredRecipes(filtered);
    }
  }, [selectedCategory, personalizedRecipes]);

  // Search recipes khi nhập vào search modal
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const results = personalizedRecipes.filter(recipe => 
      recipe.name?.toLowerCase().includes(query) ||
      recipe.category?.toLowerCase().includes(query) ||
      recipe.authorName?.toLowerCase().includes(query)
    );
    setSearchResults(results);
  }, [searchQuery, personalizedRecipes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Promise.all([fetchData(), fetchUserStats()]);
    setRefreshing(false);
  }, [fetchData, fetchUserStats]);

  const navigateToRecipe = (recipeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/recipe/${recipeId}` as any);
  };

  
  const renderHeroSection = () => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return { text: 'Chào buổi sáng', icon: 'sunny-outline' };
      if (hour < 18) return { text: 'Chào buổi chiều', icon: 'partly-sunny-outline' };
      return { text: 'Chào buổi tối', icon: 'moon-outline' };
    };
    
    const greeting = getGreeting();
    const streakProgress = stats ? (stats.currentStreak % 7) / 7 : 0;
    const levelProgress = stats ? (stats.points % 100) / 100 : 0;

    return (
      <View style={styles.heroContainer}>
        {/* Background Gradient with Pattern */}
        <LinearGradient
          colors={isDark ? ['#1a0f0a', '#2d1a0f', '#3d2415'] : ['#FFF8F0', '#FFE8D6', '#FFDCC2']}
          style={styles.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Decorative circles */}
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
          <View style={[styles.decorCircle, styles.decorCircle3]} />
          
          {/* Header Row */}
          <View style={styles.heroHeader}>
            <View style={styles.heroLeft}>
              <View style={styles.greetingIconContainer}>
                <Ionicons name={greeting.icon as any} size={28} color="#FF6B6B" />
            </View>
              <View>
                <ThemedText style={styles.greetingText}>{greeting.text}</ThemedText>
                <ThemedText style={styles.userName}>{user?.name || 'Đầu bếp'}</ThemedText>
            </View>
            </View>
            
            <View style={styles.heroRight}>
              {/* Search Button */}
            <TouchableOpacity
                style={styles.headerIconBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSearchModal(true);
                }}
              >
                <Ionicons name="search" size={22} color="#FF6B6B" />
              </TouchableOpacity>
              
              {/* Notification Button */}
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/notifications' as any);
                }}
              >
                <Ionicons name="notifications" size={22} color="#FF6B6B" />
              {notifications.length > 0 && (
                  <View style={styles.notificationBadge}>
                    <ThemedText style={styles.notificationBadgeText}>
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </ThemedText>
                  </View>
              )}
            </TouchableOpacity>
          </View>
          </View>

          {/* Stats Cards with Glassmorphism */}
          <View style={styles.statsContainer}>
            {/* Streak Card */}
            <TouchableOpacity
              style={styles.glassCard}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <View style={styles.glassCardInner}>
                <LinearGradient
                  colors={['#FF6B6B', '#FF8E53']}
                  style={styles.statsIconBg}
                >
                  <Ionicons name="flame" size={24} color="#fff" />
                </LinearGradient>
                <ThemedText style={styles.statsNumber}>{stats?.currentStreak || 0}</ThemedText>
                <ThemedText style={styles.statsLabel}>ngày streak</ThemedText>
                <View style={styles.miniProgress}>
                  <View style={[styles.miniProgressFill, { width: `${streakProgress * 100}%`, backgroundColor: '#FF6B6B' }]} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Level Card */}
            <TouchableOpacity
              style={styles.glassCard}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <View style={styles.glassCardInner}>
                <LinearGradient
                  colors={['#FF8E53', '#FFA726']}
                  style={styles.statsIconBg}
                >
                  <Ionicons name="trophy" size={24} color="#fff" />
                </LinearGradient>
                <ThemedText style={styles.statsNumber}>Lv.{stats?.level || 1}</ThemedText>
                <ThemedText style={styles.statsLabel}>{stats?.points || 0} điểm</ThemedText>
                <View style={styles.miniProgress}>
                  <View style={[styles.miniProgressFill, { width: `${levelProgress * 100}%`, backgroundColor: '#FF8E53' }]} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Badges Card */}
            <TouchableOpacity
              style={styles.glassCard}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <View style={styles.glassCardInner}>
              <LinearGradient
                  colors={['#FFA726', '#FFB74D']}
                  style={styles.statsIconBg}
                >
                  <Ionicons name="medal" size={24} color="#fff" />
              </LinearGradient>
                <ThemedText style={styles.statsNumber}>{stats?.badgesCount || 0}</ThemedText>
                <ThemedText style={styles.statsLabel}>huy hiệu</ThemedText>
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  // ==================== CATEGORY FILTER ====================
  const renderCategoryFilter = () => (
    <View style={styles.categoriesContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
      >
        {CATEGORIES.map((item, index) => {
          const isSelected = selectedCategory === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.categoryChip,
                isSelected && styles.categoryChipSelected,
                !isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCategory(item.id);
              }}
              activeOpacity={0.7}
            >
              {isSelected ? (
                <LinearGradient
                  colors={item.gradient as any}
                  style={styles.categoryChipGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                    <ThemedText style={styles.categoryEmoji}>{item.emoji}</ThemedText>
                    <ThemedText style={styles.categoryNameSelected}>{item.name}</ThemedText>
                </LinearGradient>
              ) : (
                <View style={styles.categoryChipInner}>
                  <ThemedText style={styles.categoryEmoji}>{item.emoji}</ThemedText>
                  <ThemedText style={[styles.categoryName, { color: colors.text }]}>
                    {item.name}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // ==================== RECIPE OF THE DAY (PREMIUM) ====================
  const renderRecipeOfTheDay = () => {
    if (!recipeOfTheDay) return null;

    return (
      <View style={styles.rotdSection}>
        <View style={styles.rotdHeader}>
          <View style={styles.sectionHeaderWithIcon}>
            <Ionicons name="star" size={24} color={colors.primary} style={styles.sectionIcon} />
          <View>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              Món Của Ngày
            </ThemedText>
            <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Được yêu thích nhất hôm nay
            </ThemedText>
            </View>
          </View>
        </View>

      <TouchableOpacity
          style={styles.rotdCard}
        onPress={() => navigateToRecipe(recipeOfTheDay._id)}
          activeOpacity={0.95}
      >
          <ImageBackground
          source={{ uri: recipeOfTheDay.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800' }}
            style={styles.rotdImage}
            imageStyle={{ borderRadius: 24 }}
          >
            {/* Gradient Overlay */}
        <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']}
              style={styles.rotdGradient}
            />
            
            {/* Top Badge */}
            <View style={styles.rotdTopBadge}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.rotdBadgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="star" size={14} color="#fff" />
                <ThemedText style={styles.rotdBadgeText}>HOT</ThemedText>
              </LinearGradient>
        </View>
            
            {/* Stats Pills */}
            <View style={styles.rotdStatsPills}>
              <View style={styles.rotdPill}>
                <Ionicons name="time-outline" size={14} color="#fff" />
                <ThemedText style={styles.rotdPillText}>
                {(recipeOfTheDay.prepTime || 0) + (recipeOfTheDay.cookTime || 0)} phút
              </ThemedText>
            </View>
              <View style={styles.rotdPill}>
                <Ionicons name="flame-outline" size={14} color="#fff" />
                <ThemedText style={styles.rotdPillText}>
                  {recipeOfTheDay.difficulty || 'Dễ'}
              </ThemedText>
            </View>
          </View>
            
            {/* Content */}
            <View style={styles.rotdContent}>
              <ThemedText style={styles.rotdCategory}>
                {recipeOfTheDay.category || 'Món Việt'}
              </ThemedText>
              <ThemedText style={styles.rotdTitle} numberOfLines={2}>
            {recipeOfTheDay.name}
          </ThemedText>
              
              {/* Author Row */}
              <View style={styles.rotdAuthorRow}>
                <View style={styles.rotdAuthor}>
                  <Image
                    source={{ uri: recipeOfTheDay.authorAvatar || `https://i.pravatar.cc/100?u=${recipeOfTheDay.authorId}` }}
                    style={styles.rotdAuthorAvatar}
                  />
                  <ThemedText style={styles.rotdAuthorName}>
                    {recipeOfTheDay.authorName || 'Chef'}
              </ThemedText>
            </View>
              </View>
              
              {/* Action Row */}
              <View style={styles.rotdActionRow}>
                {/* CTA Button */}
                <TouchableOpacity 
                  style={styles.rotdCTA}
                  onPress={() => navigateToRecipe(recipeOfTheDay._id)}
                >
                  <LinearGradient
                    colors={['#FF6B6B', '#FF8E53']}
                    style={styles.rotdCTAGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <ThemedText style={styles.rotdCTAText}>Nấu ngay</ThemedText>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
                
                {/* Like Counter */}
                <View style={styles.rotdLikes}>
                  <Ionicons name="heart" size={16} color="#FF6B6B" />
                  <ThemedText style={styles.rotdLikesText}>
                    {recipeOfTheDay.saveCount || recipeOfTheDay.likeCount || 0}
              </ThemedText>
            </View>
          </View>
        </View>
          </ImageBackground>
      </TouchableOpacity>
      </View>
    );
  };

  // ==================== TRENDING CAROUSEL ====================
  const renderTrendingCarousel = () => {
    if (trendingRecipes.length === 0) return null;

    const carouselData = trendingRecipes.slice(0, 6);

    const renderCarouselItem = ({ item, index }: { item: Recipe; index: number }) => {
      const isActive = index === activeCarouselIndex;
      
      return (
    <TouchableOpacity
          style={[
            styles.carouselCard,
            isActive && styles.carouselCardActive,
            { backgroundColor: isDark ? '#1f1f3a' : '#fff' }
          ]}
      onPress={() => navigateToRecipe(item._id)}
          activeOpacity={0.95}
    >
        <Image
          source={{ uri: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' }}
            style={styles.carouselImage}
        />
          
        <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.carouselGradient}
          />
          
          {/* Rank Badge */}
          <View style={styles.carouselRank}>
            <LinearGradient
              colors={index === 0 ? ['#FFD700', '#FFA500'] : index === 1 ? ['#C0C0C0', '#A0A0A0'] : ['#CD7F32', '#A0522D']}
              style={styles.carouselRankBg}
            >
              <ThemedText style={styles.carouselRankText}>#{index + 1}</ThemedText>
            </LinearGradient>
        </View>
          
          <View style={styles.carouselContent}>
            <ThemedText style={styles.carouselTitle} numberOfLines={2}>
          {item.name}
        </ThemedText>
            <View style={styles.carouselMeta}>
              <View style={styles.carouselMetaItem}>
                <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.9)" />
                <ThemedText style={styles.carouselMetaText}>
                  {(item.prepTime || 0) + (item.cookTime || 0)}p
            </ThemedText>
          </View>
              <View style={styles.carouselMetaItem}>
                <Ionicons name="heart" size={12} color="#FF6B6B" />
                <ThemedText style={styles.carouselMetaText}>
              {item.saveCount || item.likeCount || 0}
            </ThemedText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
    };

    return (
      <View style={styles.trendingSection}>
        <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderWithIcon}>
            <Ionicons name="flame" size={24} color={colors.primary} style={styles.sectionIcon} />
              <View>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              Đang Thịnh Hành
            </ThemedText>
                <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Top công thức được xem nhiều nhất
                </ThemedText>
            </View>
        </View>
          <TouchableOpacity 
            style={styles.seeAllBtn}
            onPress={() => router.push('/(tabs)/recipes')}
          >
            <ThemedText style={[styles.seeAllText, { color: colors.primary }]}>Xem tất cả</ThemedText>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
            </View>

            <FlatList
          ref={carouselRef}
          data={carouselData}
          renderItem={renderCarouselItem}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselList}
          snapToInterval={CARD_WIDTH + CARD_SPACING}
          decelerationRate="fast"
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_SPACING));
            setActiveCarouselIndex(index);
          }}
        />

        {/* Carousel Indicators */}
        <View style={styles.carouselIndicators}>
          {carouselData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.carouselDot,
                index === activeCarouselIndex && styles.carouselDotActive,
                { backgroundColor: index === activeCarouselIndex ? colors.primary : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)') }
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  // ==================== FEATURED CHEFS ====================
  const renderFeaturedChefs = () => {
    if (featuredChefs.length === 0) return null;

    return (
      <View style={styles.chefsSection}>
        <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderWithIcon}>
            <Ionicons name="restaurant" size={24} color={colors.primary} style={styles.sectionIcon} />
              <View>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              Đầu Bếp Nổi Bật
            </ThemedText>
                <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Kết nối với những đầu bếp tài năng
                </ThemedText>
              </View>
              </View>
            </View>

        <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chefsList}
        >
          {featuredChefs.map((chef, index) => (
            <TouchableOpacity
              key={chef._id}
              style={[styles.chefCard, { backgroundColor: isDark ? '#1f1f3a' : '#fff' }]}
              onPress={() => router.push(`/user/${chef._id}` as any)}
              activeOpacity={0.8}
            >
              {/* Avatar with Ring */}
              <View style={styles.chefAvatarWrapper}>
                <LinearGradient
                  colors={['#FF6B6B', '#4ECDC4', '#FFD93D']}
                  style={styles.chefAvatarRing}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={[styles.chefAvatarInner, { backgroundColor: isDark ? '#1f1f3a' : '#fff' }]}>
                    {(() => {
                      // Xử lý avatar URL - ưu tiên avatar từ API, fallback về pravatar
                      const hasValidAvatar = chef.avatar && 
                                             chef.avatar.trim() !== '' && 
                                             chef.avatar !== 'null' && 
                                             chef.avatar !== 'undefined' &&
                                             !avatarErrors.has(chef._id);
                      
                      const avatarUrl = hasValidAvatar 
                        ? chef.avatar 
                        : `https://i.pravatar.cc/100?u=${chef._id || 'default'}`;
                      
                      // Dùng expo-image cho Android compatibility tốt hơn
                      return (
                        <ExpoImage
                          source={{ uri: avatarUrl }}
                          style={styles.chefAvatar}
                          contentFit="cover"
                          transition={200}
                          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                          onError={(error) => {
                            console.log('[Avatar Error] Chef:', chef._id, 'URL:', avatarUrl, 'Error:', error);
                            // Mark as error để dùng fallback
                            if (!avatarErrors.has(chef._id)) {
                              setAvatarErrors(prev => new Set([...prev, chef._id]));
                            }
                          }}
                          onLoad={() => {
                            // Remove from errors khi load thành công
                            if (avatarErrors.has(chef._id)) {
                              setAvatarErrors(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(chef._id);
                                return newSet;
                              });
                            }
                          }}
                        />
                      );
                    })()}
                </View>
                </LinearGradient>
                
                {/* Verified Badge */}
                {index < 3 && (
                  <View style={styles.chefVerified}>
                    <Ionicons name="checkmark-circle" size={20} color="#4ECDC4" />
          </View>
        )}
              </View>
              
              <ThemedText style={[styles.chefName, { color: colors.text }]} numberOfLines={1}>
                {chef.name}
              </ThemedText>
              
              <View style={styles.chefStats}>
                <View style={styles.chefStatItem}>
                  <Ionicons name="restaurant-outline" size={12} color={colors.textSecondary} />
                  <ThemedText style={[styles.chefStatText, { color: colors.textSecondary }]}>
                    {chef.recipesCount}
              </ThemedText>
            </View>
                <View style={styles.chefStatDivider} />
                <View style={styles.chefStatItem}>
                  <Ionicons name="heart-outline" size={12} color={colors.textSecondary} />
                  <ThemedText style={[styles.chefStatText, { color: colors.textSecondary }]}>
                    {chef.totalLikes || 0}
                  </ThemedText>
                </View>
        </View>

              {/* Follow Button */}
              <TouchableOpacity
                style={styles.chefFollowBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/messages/${chef._id}`);
                }}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.chefFollowGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="chatbubble-outline" size={14} color="#fff" />
                  <ThemedText style={styles.chefFollowText}>Chat</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // ==================== RECIPES GRID ====================
  const renderRecipesGrid = () => {
    return (
      <View style={styles.recipesSection}>
        <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderWithIcon}>
            <Ionicons name="heart" size={24} color={colors.primary} style={styles.sectionIcon} />
            <View>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              {selectedCategory === 'all' ? 'Dành Cho Bạn' : CATEGORIES.find(c => c.id === selectedCategory)?.name}
              </ThemedText>
              <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                {filteredRecipes.length} công thức
              </ThemedText>
            </View>
            </View>
                <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => router.push('/(tabs)/recipes')}
          >
            <ThemedText style={[styles.seeAllText, { color: colors.primary }]}>Xem tất cả</ThemedText>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
          </View>

          {filteredRecipes.length > 0 ? (
            <View style={styles.recipesGrid}>
            {filteredRecipes.slice(0, 6).map((item) => (
              <TouchableOpacity
                key={item._id}
                style={styles.recipeGridItem}
                onPress={() => navigateToRecipe(item._id)}
                activeOpacity={0.8}
              >
                <View style={[styles.recipeCard, { backgroundColor: isDark ? '#1f1f3a' : '#fff' }]}>
                  <View style={styles.recipeImageWrapper}>
                    <Image
                      source={{ uri: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' }}
                      style={styles.recipeImage}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.6)']}
                      style={styles.recipeImageGradient}
                    />
                    <View style={styles.recipeTimeBadge}>
                      <Ionicons name="time-outline" size={10} color="#fff" />
                      <ThemedText style={styles.recipeTimeText}>
                        {(item.prepTime || 0) + (item.cookTime || 0)}p
                      </ThemedText>
                </View>
                  </View>
                  
                  <View style={styles.recipeCardContent}>
                    <ThemedText style={[styles.recipeName, { color: colors.text }]} numberOfLines={2}>
                    {item.name}
                  </ThemedText>
                    
                    <View style={styles.recipeCardFooter}>
                      <View style={styles.recipeAuthorInfo}>
                        <Image
                          source={{ uri: item.authorAvatar || `https://i.pravatar.cc/100?u=${item.authorId}` }}
                          style={styles.recipeAuthorAvatar}
                        />
                        <ThemedText style={[styles.recipeAuthorName, { color: colors.textSecondary }]} numberOfLines={1}>
                          {item.authorName || 'Chef'}
                        </ThemedText>
                      </View>
                      <View style={styles.recipeLikes}>
                        <Ionicons name="heart" size={12} color="#FF6B6B" />
                        <ThemedText style={styles.recipeLikesText}>
                          {item.saveCount || item.likeCount || 0}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
              ))}
            </View>
          ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="restaurant-outline" size={48} color={colors.textSecondary} />
            </View>
              <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                Chưa có công thức nào
              </ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Hãy là người đầu tiên chia sẻ!
              </ThemedText>
            </View>
          )}
        </View>
    );
  };

  // ==================== COOKING TIPS ====================
  const [likedTips, setLikedTips] = useState<Set<string>>(new Set());
  const [viewedTips, setViewedTips] = useState<Set<string>>(new Set());

  // Handle view tip - tăng view count
  const handleViewTip = async (tipId: string) => {
    if (viewedTips.has(tipId)) return; // Đã xem rồi
    
    setViewedTips(prev => new Set([...prev, tipId]));
    setCookingTips(prev => prev.map(tip => 
      tip._id === tipId ? { ...tip, viewCount: tip.viewCount + 1 } : tip
    ).sort((a, b) => (b.likeCount * 2 + b.viewCount) - (a.likeCount * 2 + a.viewCount)));
    
    // Call API
    if (token) {
      storyService.markAsViewed(tipId).catch(() => {});
    }
  };

  // Handle like tip
  const handleLikeTip = async (tipId: string) => {
    if (!token) {
      router.push('/login');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const isLiked = likedTips.has(tipId);
    
    // Optimistic update
    setLikedTips(prev => {
      const newSet = new Set(prev);
      if (isLiked) {
        newSet.delete(tipId);
      } else {
        newSet.add(tipId);
      }
      return newSet;
    });
    
    setCookingTips(prev => prev.map(tip => 
      tip._id === tipId 
        ? { ...tip, likeCount: tip.likeCount + (isLiked ? -1 : 1) } 
        : tip
    ).sort((a, b) => (b.likeCount * 2 + b.viewCount) - (a.likeCount * 2 + a.viewCount)));
    
    // Call API
    try {
      await storyService.toggleLike(tipId);
    } catch (error) {
      // Revert on error
      setLikedTips(prev => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.add(tipId);
        } else {
          newSet.delete(tipId);
        }
        return newSet;
      });
    }
  };

  const renderCookingTips = () => {
    // Sort tips by popularity (likes * 2 + views)
    const sortedTips = [...cookingTips].sort((a, b) => 
      (b.likeCount * 2 + b.viewCount) - (a.likeCount * 2 + a.viewCount)
    );

    return (
      <View style={styles.tipsSection}>
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionHeaderWithIcon, { flex: 1 }]}>
            <Ionicons name="bulb" size={24} color={colors.primary} style={styles.sectionIcon} />
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              Mẹo Nấu Ăn
            </ThemedText>
                <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Tips hữu ích từ các đầu bếp
                </ThemedText>
              </View>
              </View>
          
          <View style={styles.tipsHeaderActions}>
            {/* Nút xem tất cả */}
            {cookingTips.length > 0 && (
              <TouchableOpacity
                style={styles.seeAllTipsBtn}
                onPress={() => router.push('/story/all-tips')}
                activeOpacity={0.8}
              >
                <ThemedText style={[styles.seeAllTipsText, { color: colors.primary }]}>
                  Xem tất cả
                </ThemedText>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
            
            {/* Nút tạo story */}
            <TouchableOpacity
              style={styles.addStoryButton}
              onPress={() => router.push('/story/create')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF6B6B', '#FF8E53']}
                style={styles.addStoryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
            </View>
        </View>

        {cookingTips.length === 0 ? (
          <View style={styles.emptyTipsContainer}>
                <TouchableOpacity
              style={[styles.emptyTipsCard, { backgroundColor: isDark ? '#1f1f3a' : '#f5f5f5' }]}
              onPress={() => router.push('/story/create')}
                  activeOpacity={0.8}
                >
              <LinearGradient
                colors={['#FF6B6B20', '#FF8E5320']}
                style={styles.emptyTipsInner}
              >
                <Ionicons name="bulb-outline" size={40} color={colors.primary} />
                <ThemedText style={[styles.emptyTipsTitle, { color: colors.text }]}>
                  Bạn có mẹo nấu ăn hay?
                </ThemedText>
                <ThemedText style={[styles.emptyTipsDesc, { color: colors.textSecondary }]}>
                  Hãy chia sẻ để giúp mọi người nấu ngon hơn!
                </ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tipsList}
        >
          {sortedTips.map((tip, index) => {
            const isLiked = likedTips.has(tip._id);
            
            return (
              <TouchableOpacity
                key={tip._id}
                style={styles.tipCard}
                activeOpacity={0.95}
                onPress={() => handleViewTip(tip._id)}
              >
                <LinearGradient
                  colors={[
                    index % 4 === 0 ? '#FF6B6B' : index % 4 === 1 ? '#4ECDC4' : index % 4 === 2 ? '#A770EF' : '#FFD93D',
                    index % 4 === 0 ? '#FF8E53' : index % 4 === 1 ? '#44A08D' : index % 4 === 2 ? '#CF8BF3' : '#F6C90E',
                  ]}
                  style={styles.tipGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {/* Avatar Ring */}
                  <View style={styles.tipAvatarRing}>
                    <Image
                      source={{ 
                        uri: tip.userAvatar && tip.userAvatar.trim() !== '' 
                          ? tip.userAvatar 
                          : `https://i.pravatar.cc/100?u=${tip.userId || tip._id}`
                      }}
                      style={styles.tipAvatar}
                    />
                    </View>

                  {/* Tip Content */}
                  <ThemedText style={styles.tipTitle} numberOfLines={1}>
                    {tip.tipTitle}
                  </ThemedText>
                  <ThemedText style={styles.tipContent} numberOfLines={3}>
                    {tip.tipContent}
                  </ThemedText>

                  {/* Author */}
                  <ThemedText style={styles.tipAuthor}>
                    - {tip.userName || 'Người dùng'}
                  </ThemedText>

                  {/* Stats with Like Button */}
                  <View style={styles.tipStats}>
                    <View style={styles.tipStatItem}>
                      <Ionicons name="eye-outline" size={12} color="rgba(255,255,255,0.8)" />
                      <ThemedText style={styles.tipStatText}>{tip.viewCount}</ThemedText>
                    </View>
                    
                    {/* Like Button */}
                    <TouchableOpacity 
                      style={styles.tipLikeBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleLikeTip(tip._id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name={isLiked ? "heart" : "heart-outline"} 
                        size={14} 
                        color={isLiked ? "#fff" : "rgba(255,255,255,0.8)"} 
                      />
                      <ThemedText style={[styles.tipStatText, isLiked && styles.tipLikedText]}>
                        {tip.likeCount}
                  </ThemedText>
                </TouchableOpacity>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        )}
      </View>
    );
  };

  // ==================== DAILY CHALLENGE ====================
  const renderDailyChallenge = () => {
    if (!todayChallenge) return null;

    const isJoined = todayChallenge.userProgress?.joined;
    const isCompleted = todayChallenge.userProgress?.completed;

    const handleJoinChallenge = async () => {
      if (!token) {
        router.push('/login');
        return;
      }
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        const res = await challengeService.joinChallenge();
        if (res.success) {
          setTodayChallenge({
            ...todayChallenge,
            userProgress: { joined: true, completed: false },
            participantCount: todayChallenge.participantCount + 1,
          });
        }
      } catch (error) {
      }
    };

    const handleCompleteChallenge = async () => {
      // Chuyển sang màn hình challenges để hoàn thành
      router.push('/challenges');
    };

    return (
      <View style={styles.challengeSection}>
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionHeaderWithIcon, { flex: 1 }]}>
            <Ionicons name="trophy" size={24} color={colors.primary} style={styles.sectionIcon} />
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              Thử Thách Hôm Nay
            </ThemedText>
            <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {todayChallenge.timeRemainingFormatted || '24h còn lại'}
            </ThemedText>
          </View>
          </View>
          <TouchableOpacity
            style={styles.seeAllChallengeBtn}
            onPress={() => router.push('/challenges')}
          >
            <ThemedText style={[styles.seeAllChallengeText, { color: colors.primary }]}>
              Xem tất cả
            </ThemedText>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.challengeCard, { backgroundColor: isDark ? '#1f1f3a' : '#fff' }]}>
          <LinearGradient
            colors={
              isCompleted ? ['#06A77D', '#4ECDC4'] :
              isJoined ? ['#667eea', '#764ba2'] :
              ['#FF6B6B', '#FF8E53']
            }
            style={styles.challengeIconBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons 
              name={
                isCompleted ? 'checkmark-circle' :
                isJoined ? 'rocket' :
                'flash'
              } 
              size={28} 
              color="#fff" 
            />
          </LinearGradient>

          <View style={styles.challengeContent}>
            <View style={styles.challengeHeader}>
              <ThemedText style={[styles.challengeTitle, { color: colors.text }]}>
                {todayChallenge.title}
              </ThemedText>
              {!isCompleted && (
                <View style={[styles.challengePointsBadge, { backgroundColor: '#FFD93D' }]}>
                <ThemedText style={styles.challengePointsText}>
                    +{todayChallenge.points}
                </ThemedText>
              </View>
              )}
            </View>
            
            <ThemedText style={[styles.challengeDesc, { color: colors.textSecondary }]} numberOfLines={2}>
              {todayChallenge.description}
            </ThemedText>

            <View style={styles.challengeFooter}>
              <View style={styles.challengeStats}>
                <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                <ThemedText style={[styles.challengeStatText, { color: colors.textSecondary }]}>
                  {todayChallenge.participantCount} tham gia
                </ThemedText>
              </View>

              {!isJoined && !isCompleted && (
                <TouchableOpacity
                  style={styles.challengeBtn}
                  onPress={handleJoinChallenge}
                >
                  <LinearGradient
                    colors={['#FF6B6B', '#FF8E53']}
                    style={styles.challengeBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <ThemedText style={styles.challengeBtnText}>
                      Tham gia
                    </ThemedText>
                    <Ionicons 
                      name="add" 
                      size={16} 
                      color="#fff" 
                    />
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {isCompleted && (
                <View style={styles.challengeCompletedBadge}>
                  <View style={styles.challengeCompletedIconWrapper}>
                    <Ionicons name="checkmark-circle" size={18} color="#06A77D" />
                  </View>
                  <View style={styles.challengeCompletedIconWrapper}>
                    <Ionicons name="trophy" size={18} color="#FFD93D" />
                  </View>
          </View>
        )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ==================== SEARCH MODAL ====================
  const renderSearchModal = () => (
      <Modal
        visible={showSearchModal}
        transparent
        onRequestClose={() => setShowSearchModal(false)}
      >
      <View style={styles.searchModalOverlay}>
        <Pressable 
          style={styles.searchModalBackdrop} 
          onPress={() => setShowSearchModal(false)} 
        />
        <View style={[styles.searchModalContent, { backgroundColor: isDark ? '#1f1f3a' : '#fff' }]}>
            <View style={styles.searchModalHeader}>
            <View style={[styles.searchInputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Tìm món ăn, nguyên liệu..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
              <TouchableOpacity
              style={styles.searchCancelBtn}
                onPress={() => setShowSearchModal(false)}
              >
              <ThemedText style={[styles.searchCancelText, { color: colors.primary }]}>Huỷ</ThemedText>
              </TouchableOpacity>
            </View>

          <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false}>
            {searchQuery.trim() === '' ? (
              <View style={styles.searchHint}>
                <Ionicons name="search" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                <ThemedText style={[styles.searchHintText, { color: colors.textSecondary }]}>
                  Nhập tên món ăn để tìm kiếm
                </ThemedText>
              </View>
            ) : searchResults.length === 0 ? (
              <View style={styles.searchHint}>
                <Ionicons name="restaurant-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                <ThemedText style={[styles.searchHintText, { color: colors.textSecondary }]}>
                  Không tìm thấy kết quả
                </ThemedText>
              </View>
            ) : searchResults.slice(0, 10).map((item) => (
                <TouchableOpacity
                  key={item._id}
                style={[styles.searchResultItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                  onPress={() => {
                    setShowSearchModal(false);
                    navigateToRecipe(item._id);
                  }}
                >
                  <Image
                    source={{ uri: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' }}
                    style={styles.searchResultImage}
                  />
                  <View style={styles.searchResultContent}>
                  <ThemedText style={[styles.searchResultName, { color: colors.text }]} numberOfLines={2}>
                      {item.name}
                    </ThemedText>
                    <ThemedText style={[styles.searchResultAuthor, { color: colors.textSecondary }]}>
                    bởi {item.authorName || 'Chef'}
                    </ThemedText>
                  </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
  );

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0d0d1a' : '#f8f9fa' }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingAnimation}>
            <LinearGradient
              colors={['#FF6B6B', '#4ECDC4', '#FFD93D']}
              style={styles.loadingGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="restaurant" size={40} color="#fff" />
            </LinearGradient>
          </View>
          <ThemedText style={[styles.loadingText, { color: colors.text }]}>
            Đang tải món ngon...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0d0d1a' : '#f8f9fa' }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {renderHeroSection()}
        {renderCookingTips()}
        {renderDailyChallenge()}
        {renderRecipeOfTheDay()}
        {renderTrendingCarousel()}
        {renderCategoryFilter()}
        {renderRecipesGrid()}
        {renderFeaturedChefs()}
        
        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {renderSearchModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingAnimation: {
    marginBottom: 20,
  },
  loadingGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // ==================== HERO SECTION ====================
  heroContainer: {
    marginBottom: 24,
  },
  heroGradient: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle1: {
    width: 200,
    height: 200,
    top: -60,
    right: -60,
  },
  decorCircle2: {
    width: 150,
    height: 150,
    bottom: -40,
    left: -40,
  },
  decorCircle3: {
    width: 80,
    height: 80,
    top: 60,
    left: 100,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,107,107,0.3)',
  },
  greetingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,107,107,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#D84315',
    letterSpacing: -0.5,
  },
  heroRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,107,107,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  glassCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.15)',
  },
  glassCardInner: {
    padding: 16,
    alignItems: 'center',
  },
  statsIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#D84315',
  },
  statsLabel: {
    fontSize: 11,
    color: '#FF6B6B',
    fontWeight: '600',
    marginTop: 2,
  },
  miniProgress: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,107,107,0.2)',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // ==================== CATEGORIES ====================
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  categoryChipSelected: {},
  categoryChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  categoryChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryNameSelected: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // ==================== SECTION HEADERS ====================
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    marginRight: 2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ==================== RECIPE OF THE DAY ====================
  rotdSection: {
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  rotdHeader: {
    marginBottom: 16,
  },
  rotdCard: {
    borderRadius: 24,
    overflow: 'hidden',
    height: 320,
  },
  rotdImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  rotdGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  rotdTopBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  rotdBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  rotdBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  rotdStatsPills: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
  },
  rotdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  rotdPillText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  rotdContent: {
    padding: 20,
  },
  rotdCategory: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  rotdTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  rotdAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rotdAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rotdAuthorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  rotdAuthorName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  rotdActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  rotdCTA: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  rotdCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  rotdCTAText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  rotdLikes: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  rotdLikesText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },

  // ==================== TRENDING CAROUSEL ====================
  trendingSection: {
    marginBottom: 28,
  },
  carouselList: {
    paddingHorizontal: 20,
    gap: CARD_SPACING,
  },
  carouselCard: {
    width: CARD_WIDTH,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  carouselCardActive: {
    transform: [{ scale: 1.02 }],
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  carouselGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  carouselRank: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  carouselRankBg: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  carouselRankText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  carouselContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  carouselTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  carouselMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  carouselMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  carouselMetaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  carouselIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  carouselDotActive: {
    width: 24,
  },

  // ==================== FEATURED CHEFS ====================
  chefsSection: {
    marginBottom: 28,
  },
  chefsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  chefCard: {
    width: 140,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  chefAvatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  chefAvatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chefAvatarInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chefAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'transparent',
  },
  chefVerified: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  chefName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  chefStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chefStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chefStatDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 8,
  },
  chefStatText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chefFollowBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  chefFollowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  chefFollowText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  // ==================== RECIPES GRID ====================
  recipesSection: {
    marginBottom: 28,
  },
  recipesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
  },
  recipeGridItem: {
    width: '50%',
    padding: 6,
  },
  recipeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    height: 240,
  },
  recipeImageWrapper: {
    height: 130,
    position: 'relative',
  },
  recipeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  recipeImageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  recipeTimeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  recipeTimeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  recipeCardContent: {
    padding: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  recipeName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    height: 36,
    lineHeight: 18,
  },
  recipeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recipeAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    maxWidth: '70%',
  },
  recipeAuthorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    flexShrink: 0,
  },
  recipeAuthorName: {
    fontSize: 11,
    fontWeight: '500',
  },
  recipeLikes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  recipeLikesText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF6B6B',
  },

  // ==================== EMPTY STATE ====================
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
  },

  // ==================== SEARCH MODAL ====================
  searchModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  searchModalBackdrop: {
    flex: 1,
  },
  searchModalContent: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    maxHeight: height * 0.7,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  searchCancelBtn: {
    padding: 4,
  },
  searchCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  searchResults: {
    maxHeight: height * 0.5,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  searchResultImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  searchResultAuthor: {
    fontSize: 13,
  },

  // ==================== COOKING TIPS ====================
  tipsSection: {
    marginBottom: 24,
  },
  tipsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  seeAllTipsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllTipsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addStoryButton: {
    alignItems: 'center',
  },
  addStoryGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTipsContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  emptyTipsCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  emptyTipsInner: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyTipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyTipsDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  tipsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  tipCard: {
    width: 200,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
  },
  tipGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  tipAvatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 2,
  },
  tipAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginTop: 8,
  },
  tipContent: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  tipAuthor: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontStyle: 'italic',
    marginTop: 4,
    fontWeight: '500',
  },
  tipStats: {
    flexDirection: 'row',
    gap: 12,
  },
  tipStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tipStatText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  tipLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tipLikedText: {
    color: '#fff',
    fontWeight: '600',
  },

  // ==================== DAILY CHALLENGE ====================
  challengeSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  seeAllChallengeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllChallengeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  challengeCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    gap: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  challengeIconBg: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeContent: {
    flex: 1,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  challengePointsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  challengePointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  challengeDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  challengeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  challengeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    flexShrink: 1,
  },
  challengeStatText: {
    fontSize: 11,
  },
  challengeStatDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginHorizontal: 4,
  },
  challengeBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  challengeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  challengeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  challengeCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(6,167,125,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    flexShrink: 0,
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: 'rgba(6,167,125,0.2)',
  },
  challengeCompletedIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeCompletedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#06A77D',
  },

  searchHint: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 12,
  },
  searchHintText: {
    fontSize: 15,
    textAlign: 'center',
  },
});
