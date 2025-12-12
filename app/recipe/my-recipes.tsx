import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import { recipeService, Recipe } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { alertService } from '@/services/alertService';

export default function MyRecipesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];
  const { user, token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const fetchRecipes = useCallback(async () => {
    if (!token) {
      setLoading(false);
      alertService.info('Vui lòng đăng nhập để xem công thức của bạn', 'Thông báo').then(() => {
        router.back();
      });
      return;
    }

    try {
      const response = await recipeService.getMyRecipes();
      if (response.success) {
        setRecipes(response.data || []);
      } else {
        setRecipes([]);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        alertService.info('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'Thông báo').then(() => {
          router.back();
        });
      } else {
        setRecipes([]);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRecipes();
    setRefreshing(false);
  }, [fetchRecipes]);

  const handleDelete = (recipeId: string, recipeName: string) => {
    alertService.confirm(
      `Bạn có chắc muốn xóa "${recipeName}"?`,
      'Xóa công thức',
      async () => {
        try {
          const response = await recipeService.delete(recipeId);
          if (response.success) {
            alertService.success('Đã xóa công thức', 'Thành công');
            fetchRecipes();
          }
        } catch (error) {
          alertService.error('Không thể xóa công thức', 'Lỗi');
        }
      }
    );
  };

  const renderRecipe = ({ item }: { item: Recipe }) => {
    const totalTime = (item.prepTime || 0) + (item.cookTime || 0);
    
    return (
      <TouchableOpacity
        style={[styles.recipeCard, isDark && styles.recipeCardDark]}
        onPress={() => router.push(`/recipe/${item._id}` as any)}
      >
        <Image
          source={{ uri: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' }}
          style={styles.recipeImage}
        />
        <View style={styles.recipeContent}>
          <View style={styles.recipeHeader}>
            <ThemedText style={styles.recipeName} numberOfLines={2}>
              {item.name}
            </ThemedText>
            <TouchableOpacity
              onPress={() => handleDelete(item._id, item.name)}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.recipeMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>
                {totalTime} phút
              </ThemedText>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
              <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>
                {item.servings} người
              </ThemedText>
            </View>
            {item.averageRating > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={14} color="#FFB347" />
                <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>
                  {item.averageRating}
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.recipeActions}>
            <TouchableOpacity
              style={[styles.editBtn, { borderColor: colors.primary }]}
              onPress={() => router.push(`/recipe/edit/${item._id}` as any)}
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <ThemedText style={[styles.editBtnText, { color: colors.primary }]}>
                Chỉnh sửa
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={isDark ? ['#1A1A2E', '#25253D'] : ['#FF6B35', '#FF8F5A']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <View style={[styles.backButtonInner, isDark && styles.backButtonInnerDark]}>
              <Ionicons name="arrow-back" size={22} color={isDark ? colors.text : '#FFFFFF'} />
            </View>
          </TouchableOpacity>
          <ThemedText style={[styles.headerTitle, { color: isDark ? colors.text : '#FFFFFF' }]}>
            Công thức của tôi
          </ThemedText>
          <View style={{ width: 44 }} />
        </View>
      </LinearGradient>

      {recipes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, isDark && styles.emptyIconContainerDark]}>
            <Ionicons name="book-outline" size={64} color={colors.primary} />
          </View>
          <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
            Chưa có công thức nào
          </ThemedText>
          <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
            Bắt đầu chia sẻ công thức nấu ăn của bạn với cộng đồng!
          </ThemedText>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/recipe/create')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, '#FF8F5A']}
              style={styles.createBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="add-circle" size={22} color="#fff" />
              <ThemedText style={styles.createBtnText}>Tạo công thức mới</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={recipes}
          renderItem={renderRecipe}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#0D0D1A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButtonInnerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  recipeCardDark: {
    backgroundColor: '#1A1A2E',
    borderColor: '#2A2A3E',
  },
  recipeImage: {
    width: 120,
    height: 120,
    resizeMode: 'cover',
  },
  recipeContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  deleteBtn: {
    padding: 4,
  },
  recipeMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  recipeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIconContainerDark: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  createBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    gap: 10,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

