import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Modal,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router, useLocalSearchParams } from 'expo-router';
import { recipeService, Recipe } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { alertService } from '@/services/alertService';
import { CustomAlert } from '@/components/common/CustomAlert';

const { width } = Dimensions.get('window');

// Filter options
const DIFFICULTY_FILTERS = ['Tất cả', 'Dễ', 'Trung bình', 'Khó'];
const TIME_FILTERS = ['Tất cả', '< 15 phút', '15-30 phút', '30-60 phút', '> 60 phút'];
const SORT_OPTIONS = [
  { id: 'popular', name: 'Phổ biến nhất' },
  { id: 'newest', name: 'Mới nhất' },
  { id: 'rating', name: 'Đánh giá cao' },
  { id: 'quickest', name: 'Nhanh nhất' },
];

interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export default function RecipesScreen() {
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];
  const { user, token } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [likedRecipeIds, setLikedRecipeIds] = useState<string[]>([]);
  
  const [selectedCategory, setSelectedCategory] = useState(params.category as string || 'all');
  const [searchQuery, setSearchQuery] = useState(params.search as string || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('Tất cả');
  const [selectedTime, setSelectedTime] = useState('Tất cả');
  const [selectedSort, setSelectedSort] = useState(params.sort as string || 'popular');
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [likeSuccessMessage, setLikeSuccessMessage] = useState<string | null>(null);
  
  // Scroll animation for search bar
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchBarOpacity = useRef(new Animated.Value(1)).current;
  const searchBarTranslateY = useRef(new Animated.Value(0)).current;

  // Fetch recipes
  const fetchRecipes = useCallback(async () => {
    try {
      setLoading(true);
      
      let response;
      
      // If search query, use search endpoint
      if (searchQuery && searchQuery.trim()) {
        response = await recipeService.search(searchQuery, 50);
      } else {
        // Otherwise use filters
        const filters: any = {
          sortBy: selectedSort,
          limit: 50,
        };

        if (selectedCategory !== 'all') {
          filters.category = selectedCategory;
        }
        if (selectedDifficulty !== 'Tất cả') {
          filters.difficulty = selectedDifficulty;
        }

        response = await recipeService.getRecipes(filters);
      }
      
      if (response.success && response.data) {
        let filteredRecipes = Array.isArray(response.data) ? response.data : [];
        
        // Filter by time locally
        if (selectedTime !== 'Tất cả') {
          filteredRecipes = filteredRecipes.filter(r => {
            const totalTime = (r.prepTime || 0) + (r.cookTime || 0);
            switch (selectedTime) {
              case '< 15 phút': return totalTime < 15;
              case '15-30 phút': return totalTime >= 15 && totalTime <= 30;
              case '30-60 phút': return totalTime > 30 && totalTime <= 60;
              case '> 60 phút': return totalTime > 60;
              default: return true;
            }
          });
        }
        
        setRecipes(filteredRecipes);
      }
    } catch (error) {
      setRecipes([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedDifficulty, selectedTime, selectedSort, searchQuery]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await recipeService.getCategories();
      if (response.success && response.data) {
        const allCategory: Category = { id: 'all', name: 'Tất cả', icon: 'restaurant', count: 0 };
        const categoriesWithId = response.data.map((cat: any) => ({
          id: cat._id || cat.id || cat.name.toLowerCase().replace(/\s+/g, '_'),
          name: cat.name,
          icon: cat.icon || 'restaurant',
          count: cat.count || 0,
        }));
        setCategories([allCategory, ...categoriesWithId]);
      }
    } catch (error) {
    }
  }, []);

  // Fetch liked recipes (only if logged in)
  // Note: Backend doesn't have an endpoint to get user's liked recipes list
  // State will be updated when user likes/unlikes recipes
  const fetchLikedRecipes = useCallback(async () => {
    // Since there's no endpoint to get user's liked recipes,
    // we'll track it locally through user interactions
    // State will be updated when user likes/unlikes
  }, []);

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLoading(true);
      fetchRecipes();
    }, searchQuery ? 500 : 0); // Debounce 500ms for search

    return () => clearTimeout(timeoutId);
  }, [selectedCategory, selectedDifficulty, selectedTime, selectedSort, searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchRecipes(), fetchLikedRecipes()]);
    setRefreshing(false);
  }, [fetchRecipes, fetchLikedRecipes]);

  const toggleLike = useCallback(async (recipeId: string) => {
    try {
      // Check if user is logged in
      if (!token) {
        setShowLoginAlert(true);
        return;
      }
      
      // Get current state before optimistic update
      setLikedRecipeIds(prev => {
        const wasLiked = prev.includes(recipeId);
        // Optimistic update
        return wasLiked
          ? prev.filter(id => id !== recipeId)
          : [...prev, recipeId];
      });
      
      const response = await recipeService.toggleLike(recipeId);
      
      if (response.success && response.data) {
        // Update state based on API response
        const isLiked = response.data.liked === true;
        
        setLikedRecipeIds(prev => {
          if (isLiked) {
            // If liked, ensure recipeId is in the list
            const newList = prev.includes(recipeId) ? prev : [...prev, recipeId];
            return newList;
          } else {
            // If unliked, remove recipeId from the list
            const newList = prev.filter(id => id !== recipeId);
            console.log('Updated likedRecipeIds (unliked):', newList); // Debug log
            return newList;
          }
        });
        
        // Show success message
        const recipe = recipes.find(r => r._id === recipeId);
        setLikeSuccessMessage(isLiked 
          ? `Đã thích "${recipe?.name || 'công thức'}"` 
          : `Đã bỏ thích "${recipe?.name || 'công thức'}"`
        );
        setTimeout(() => setLikeSuccessMessage(null), 2000);
      } else {
        // Revert on error - get current state and revert
        setLikedRecipeIds(prev => {
          const wasLiked = prev.includes(recipeId);
          return wasLiked
            ? prev.filter(id => id !== recipeId)
            : [...prev, recipeId];
        });
      }
    } catch (error: any) {
      // Revert on error
      setLikedRecipeIds(prev => {
        const wasLiked = prev.includes(recipeId);
        return wasLiked
          ? prev.filter(id => id !== recipeId)
          : [...prev, recipeId];
      });
      
      if (error.response?.status === 401) {
        setShowLoginAlert(true);
      } else {
        console.error('Error toggling like:', error);
        alertService.error('Không thể thích công thức. Vui lòng thử lại.');
      }
    }
  }, [token, recipes]);

  const navigateToRecipe = (recipeId: string) => {
    router.push(`/recipe/${recipeId}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Dễ': return '#4ECDC4';
      case 'Trung bình': return '#FFB347';
      case 'Khó': return '#FF6B6B';
      default: return colors.textSecondary;
    }
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryPill,
        selectedCategory === item.id && styles.categoryPillActive,
        isDark && styles.categoryPillDark,
        selectedCategory === item.id && { backgroundColor: colors.primary },
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Ionicons 
        name={item.icon as any} 
        size={16} 
        color={selectedCategory === item.id ? '#fff' : colors.textSecondary} 
      />
      <ThemedText 
        style={[
          styles.categoryPillText,
          selectedCategory === item.id && styles.categoryPillTextActive,
        ]}
      >
        {item.name}
      </ThemedText>
      {item.count > 0 && (
        <View style={[
          styles.categoryCount,
          selectedCategory === item.id && styles.categoryCountActive,
        ]}>
          <ThemedText style={[
            styles.categoryCountText,
            selectedCategory === item.id && styles.categoryCountTextActive,
          ]}>
            {item.count}
          </ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );

  const RecipeCardLikeButton = React.memo(({ recipeId, isLiked, onToggle }: { recipeId: string; isLiked: boolean; onToggle: (id: string) => void }) => {
    const saveScale = useRef(new Animated.Value(1)).current;
    
    const handlePress = () => {
      // Haptic feedback - Android supported from API 23+
      try {
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else if (Platform.OS === 'android') {
          // Android haptic feedback
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch (error) {
        // Silently fail if haptics not supported
      }
      
      // Animation
      Animated.sequence([
        Animated.spring(saveScale, {
          toValue: 1.3,
          useNativeDriver: true,
          tension: Platform.OS === 'android' ? 250 : 300,
          friction: Platform.OS === 'android' ? 5 : 4,
        }),
        Animated.spring(saveScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: Platform.OS === 'android' ? 250 : 300,
          friction: Platform.OS === 'android' ? 5 : 4,
        }),
      ]).start();
      
      onToggle(recipeId);
    };
    
    // Debug log
    
    return (
      <TouchableOpacity 
        style={[styles.likeBtn, isLiked && { backgroundColor: colors.primary + '20' }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale: saveScale }] }}>
          <Ionicons 
            name={isLiked ? 'heart' : 'heart-outline'} 
            size={Platform.OS === 'android' ? 20 : 20} 
            color={isLiked ? '#FF3B30' : (Platform.OS === 'android' ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.7)')} 
          />
        </Animated.View>
      </TouchableOpacity>
    );
  });

  const renderRecipeCard = ({ item }: { item: Recipe }) => {
    const isLiked = likedRecipeIds.includes(item._id);
    const totalTime = (item.prepTime || 0) + (item.cookTime || 0);
    
    if (viewMode === 'list') {
      return (
        <TouchableOpacity 
          style={[styles.listCard, isDark && styles.listCardDark]}
          activeOpacity={0.9}
          onPress={() => navigateToRecipe(item._id)}
        >
          <Image 
            source={{ uri: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' }} 
            style={styles.listImage} 
          />
          <View style={styles.listContent}>
            <View style={styles.listHeader}>
              <ThemedText style={styles.listName} numberOfLines={1}>
                {item.name}
              </ThemedText>
              <TouchableOpacity 
                onPress={() => toggleLike(item._id)}
                activeOpacity={0.7}
                style={Platform.OS === 'android' ? { padding: 4 } : undefined}
              >
                <Ionicons 
                  name={isLiked ? 'heart' : 'heart-outline'} 
                  size={Platform.OS === 'android' ? 24 : 22} 
                  color={isLiked ? '#FF3B30' : colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
            <ThemedText style={[styles.listAuthor, { color: colors.textSecondary }]}>
              bởi {item.authorName || 'Chef'}
            </ThemedText>
            <View style={styles.listMeta}>
              <View style={styles.listMetaItem}>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                <ThemedText style={[styles.listMetaText, { color: colors.textSecondary }]}>
                  {totalTime} phút
                </ThemedText>
              </View>
              <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) + '20' }]}>
                <ThemedText style={[styles.difficultyText, { color: getDifficultyColor(item.difficulty) }]}>
                  {item.difficulty}
                </ThemedText>
              </View>
              {item.averageRating > 0 && (
                <View style={styles.listMetaItem}>
                  <Ionicons name="star" size={14} color="#FFB347" />
                  <ThemedText style={[styles.listMetaText, { color: colors.textSecondary }]}>
                    {item.averageRating}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity 
        style={[styles.gridCard, isDark && styles.gridCardDark]}
        activeOpacity={0.9}
        onPress={() => navigateToRecipe(item._id)}
      >
        <View style={styles.gridImageContainer}>
          <Image 
            source={{ uri: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' }} 
            style={styles.gridImage} 
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.gridGradient}
          />
          <RecipeCardLikeButton 
            recipeId={item._id} 
            isLiked={isLiked} 
            onToggle={toggleLike}
          />
          <View style={styles.gridBadges}>
            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={12} color="#fff" />
              <ThemedText style={styles.timeBadgeText}>{totalTime} phút</ThemedText>
            </View>
          </View>
        </View>
        <View style={styles.gridContent}>
          <ThemedText style={styles.gridName} numberOfLines={2}>
            {item.name}
          </ThemedText>
          <View style={styles.gridFooter}>
            <View style={styles.gridAuthor}>
              <Ionicons name="person-circle-outline" size={16} color={colors.textSecondary} />
              <ThemedText style={[styles.gridAuthorText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.authorName || 'Chef'}
              </ThemedText>
            </View>
            {item.averageRating > 0 && (
              <View style={styles.gridRating}>
                <Ionicons name="star" size={14} color="#FFB347" />
                <ThemedText style={styles.ratingText}>{item.averageRating}</ThemedText>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.headerTitle}>Công Thức</ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {recipes.length} công thức
          </ThemedText>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.viewModeBtn, isDark && styles.viewModeBtnDark]}
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            <Ionicons 
              name={viewMode === 'grid' ? 'list' : 'grid'} 
              size={20} 
              color={colors.text} 
            />
          </TouchableOpacity>
        </View>
      </View>



      {/* Recipes */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={recipes}
          renderItem={renderRecipeCard}
          keyExtractor={(item) => item._id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.recipesList,
            viewMode === 'list' && styles.recipesListView,
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            {
              useNativeDriver: false,
              listener: (event: any) => {
                const offsetY = event.nativeEvent.contentOffset.y;
                // Fade out search bar when scrolling down, fade in when scrolling up
                if (offsetY > 50) {
                  Animated.timing(searchBarOpacity, {
                    toValue: 0.95,
                    duration: 200,
                    useNativeDriver: true,
                  }).start();
                } else {
                  Animated.timing(searchBarOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                  }).start();
                }
              },
            }
          )}
          scrollEventThrottle={16}
          ListHeaderComponent={
            <View>
              {/* Search & Filter - Sticky when scrolling */}
              <Animated.View 
                style={[
                  styles.searchSectionWrapper,
                  {
                    opacity: searchBarOpacity,
                  }
                ]}
              >
                <View style={styles.searchSection}>
                  <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.searchInput, { color: colors.text }]}
                      placeholder="Tìm công thức, nguyên liệu..."
                      placeholderTextColor={colors.textSecondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      returnKeyType="search"
                      onSubmitEditing={() => {
                        if (searchQuery.trim()) {
                          setLoading(true);
                          fetchRecipes();
                        }
                      }}
                    />
                    {searchQuery ? (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <TouchableOpacity 
                    style={[styles.filterBtn, isDark && styles.filterBtnDark]}
                    onPress={() => setShowFilter(true)}
                  >
                    <Ionicons name="options-outline" size={22} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </Animated.View>
              
              {/* Categories - Use ScrollView instead of FlatList to avoid Animated issue */}
              {categories.length > 0 && (
                <View style={styles.categoriesWrapper}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesList}
                  >
                    {categories.map((category) => renderCategoryItem({ item: category }))}
                  </ScrollView>
                </View>
              )}
            </View>
          }
          stickyHeaderIndices={[0]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color={colors.textSecondary} />
              <ThemedText style={styles.emptyTitle}>Không tìm thấy công thức</ThemedText>
              <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                Thử tìm kiếm với từ khóa khác
              </ThemedText>
            </View>
          }
        />
      )}

      {/* Custom Alert for Login */}
      <CustomAlert
        visible={showLoginAlert}
        title="🔒 Đăng nhập"
        message="Vui lòng đăng nhập để thích công thức"
        onClose={() => setShowLoginAlert(false)}
        buttonText="Đã hiểu"
      />

      {/* Success Toast */}
      {likeSuccessMessage && (
        <View style={[styles.successToast, isDark && styles.successToastDark]}>
          <Ionicons 
            name="heart" 
            size={Platform.OS === 'android' ? 22 : 20} 
            color="#FF3B30" 
          />
          <ThemedText style={styles.successToastText}>{likeSuccessMessage}</ThemedText>
        </View>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilter}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.filterModal, isDark && styles.filterModalDark]}>
            <View style={styles.filterHeader}>
              <ThemedText style={styles.filterTitle}>Bộ lọc</ThemedText>
              <TouchableOpacity onPress={() => setShowFilter(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Difficulty Filter */}
            <View style={styles.filterSection}>
              <ThemedText style={styles.filterSectionTitle}>Độ khó</ThemedText>
              <View style={styles.filterOptions}>
                {DIFFICULTY_FILTERS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterOption,
                      isDark && styles.filterOptionDark,
                      selectedDifficulty === option && styles.filterOptionActive,
                      selectedDifficulty === option && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setSelectedDifficulty(option)}
                  >
                    <ThemedText style={[
                      styles.filterOptionText,
                      { color: selectedDifficulty === option ? '#fff' : (isDark ? '#E0E0E0' : colors.text) },
                      selectedDifficulty === option && styles.filterOptionTextActive,
                    ]}>
                      {option}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Time Filter */}
            <View style={styles.filterSection}>
              <ThemedText style={styles.filterSectionTitle}>Thời gian</ThemedText>
              <View style={styles.filterOptions}>
                {TIME_FILTERS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterOption,
                      isDark && styles.filterOptionDark,
                      selectedTime === option && styles.filterOptionActive,
                      selectedTime === option && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setSelectedTime(option)}
                  >
                    <ThemedText style={[
                      styles.filterOptionText,
                      { color: selectedTime === option ? '#fff' : (isDark ? '#E0E0E0' : colors.text) },
                      selectedTime === option && styles.filterOptionTextActive,
                    ]}>
                      {option}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort */}
            <View style={styles.filterSection}>
              <ThemedText style={styles.filterSectionTitle}>Sắp xếp</ThemedText>
              <View style={styles.filterOptions}>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.filterOption,
                      isDark && styles.filterOptionDark,
                      selectedSort === option.id && styles.filterOptionActive,
                      selectedSort === option.id && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setSelectedSort(option.id)}
                  >
                    <ThemedText style={[
                      styles.filterOptionText,
                      { color: selectedSort === option.id ? '#fff' : (isDark ? '#E0E0E0' : colors.text) },
                      selectedSort === option.id && styles.filterOptionTextActive,
                    ]}>
                      {option.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Apply Button */}
            <View style={styles.filterActions}>
              <TouchableOpacity 
                style={[
                  styles.resetBtn,
                  isDark && styles.resetBtnDark,
                  { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }
                ]}
                onPress={() => {
                  setSelectedDifficulty('Tất cả');
                  setSelectedTime('Tất cả');
                  setSelectedSort('popular');
                }}
              >
                <ThemedText style={[styles.resetBtnText, { color: colors.primary }]}>
                  Đặt lại
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.applyBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowFilter(false)}
              >
                <ThemedText style={styles.applyBtnText}>Áp dụng</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FAB - Create Recipe Button */}
      {user && (
        <TouchableOpacity
          style={[styles.fab, isDark && styles.fabDark]}
          onPress={() => router.push('/recipe/create')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#FF6B35', '#FF8F5A']}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  safeAreaDark: {
    backgroundColor: '#0D0D1A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  viewModeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  viewModeBtnDark: {
    backgroundColor: '#1A1A2E',
  },
  searchSectionWrapper: {
    // Removed card background styling
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal:8,
    gap: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  categoriesWrapper: {
    paddingVertical: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: Platform.OS === 'android' ? 12 : 16,
    paddingHorizontal: Platform.OS === 'android' ? 12 : 16,
    paddingVertical: Platform.OS === 'android' ? 8 : 12,
    height: Platform.OS === 'android' ? 40 : undefined,
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: Platform.OS === 'android' ? 8 : 12,
    fontSize: Platform.OS === 'android' ? 14 : 16,
    paddingVertical: 0,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif',
        includeFontPadding: false,
        textAlignVertical: 'center',
        height: 24,
      },
    }),
  },
  filterBtn: {
    width: Platform.OS === 'android' ? 40 : 50,
    height: Platform.OS === 'android' ? 40 : 50,
    borderRadius: Platform.OS === 'android' ? 12 : 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  filterBtnDark: {
    backgroundColor: '#1A1A2E',
  },
  categoriesContainer: {
    marginTop: 16,
    maxHeight: 50,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryPillDark: {
    backgroundColor: '#1A1A2E',
  },
  categoryPillActive: {
    shadowOpacity: 0.15,
    elevation: 3,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryPillTextActive: {
    color: '#fff',
  },
  categoryCount: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryCountActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryCountTextActive: {
    color: '#fff',
  },
  recipesList: {
    padding: 12,
    paddingBottom: 100,
  },
  recipesListView: {
    paddingHorizontal: 20,
  },
  // Grid Card
  gridCard: {
    flex: 1,
    margin: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  gridCardDark: {
    backgroundColor: '#1A1A2E',
  },
  gridImageContainer: {
    height: 140,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  likeBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 8 : 10,
    right: Platform.OS === 'android' ? 8 : 10,
    width: Platform.OS === 'android' ? 40 : 36,
    height: Platform.OS === 'android' ? 40 : 36,
    borderRadius: Platform.OS === 'android' ? 20 : 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...Platform.select({
      android: {
        elevation: 5,
        minWidth: 40,
        minHeight: 40,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
    }),
  },
  gridBadges: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  timeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  gridContent: {
    padding: 14,
  },
  gridName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    lineHeight: 20,
  },
  gridFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  gridAuthorText: {
    fontSize: 12,
    flex: 1,
  },
  gridRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // List Card
  listCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  listCardDark: {
    backgroundColor: '#1A1A2E',
  },
  listImage: {
    width: 110,
    height: 110,
    resizeMode: 'cover',
  },
  listContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  listName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  listAuthor: {
    fontSize: 13,
    marginTop: 4,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  listMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listMetaText: {
    fontSize: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  filterModalDark: {
    backgroundColor: '#1A1A2E',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  filterOptionDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  filterOptionActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  resetBtnDark: {
    borderColor: 'rgba(255,255,255,0.2)',
  },
  resetBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabDark: {
    shadowOpacity: 0.5,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successToast: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 70 : 100,
    left: Platform.OS === 'android' ? 16 : 20,
    right: Platform.OS === 'android' ? 16 : 20,
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'android' ? 8 : 10,
    ...Platform.select({
      android: {
        elevation: 6,
        minHeight: 44,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
    zIndex: 1000,
  },
  successToastDark: {
    backgroundColor: '#1A1A2E',
  },
  successToastText: {
    fontSize: Platform.OS === 'android' ? 15 : 14,
    fontWeight: Platform.OS === 'android' ? '500' : '600',
    color: '#FF3B30',
    flex: 1,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
        includeFontPadding: false,
      },
    }),
  },
});
