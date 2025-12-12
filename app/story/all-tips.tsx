import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
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
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import storyService, { Story } from '@/services/storyService';
import * as Haptics from 'expo-haptics';

type SortType = 'popular' | 'newest' | 'most_liked';

export default function AllTipsScreen() {
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];

  const [tips, setTips] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>('popular');
  const [likedTips, setLikedTips] = useState<Set<string>>(new Set());
  const [viewedTips, setViewedTips] = useState<Set<string>>(new Set()); // Track viewed tips để tránh tăng view nhiều lần

  const fetchTips = useCallback(async () => {
    try {
      const response = await storyService.getCookingTips();
      if (response.success && response.data) {
        setTips(response.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTips();
  };

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
    
    setTips(prev => prev.map(tip => 
      tip._id === tipId 
        ? { ...tip, likeCount: tip.likeCount + (isLiked ? -1 : 1) } 
        : tip
    ));
    
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

  // Tự động tăng view khi tip được hiển thị (không cần click)
  const handleViewTip = useCallback(async (tipId: string) => {
    // Chỉ tăng view 1 lần cho mỗi tip
    setViewedTips(prev => {
      if (prev.has(tipId)) return prev; // Đã xem rồi
      const newSet = new Set([...prev, tipId]);
      
      // Optimistic update UI
      setTips(prevTips => prevTips.map(tip => 
        tip._id === tipId ? { ...tip, viewCount: tip.viewCount + 1 } : tip
      ));
      
      // Call API để lưu vào database
      if (token) {
        storyService.markAsViewed(tipId).catch(() => {});
      }
      
      return newSet;
    });
  }, [token]);
  
  // Callback cho onViewableItemsChanged
  const handleViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ item: Story }> }) => {
    // Tự động tăng view khi tip được hiển thị trên màn hình
    viewableItems.forEach(({ item }) => {
      if (!viewedTips.has(item._id)) {
        handleViewTip(item._id);
      }
    });
  }, [viewedTips, handleViewTip]);

  // Sort tips
  const sortedTips = [...tips].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'most_liked':
        return b.likeCount - a.likeCount;
      case 'popular':
      default:
        return (b.likeCount * 2 + b.viewCount) - (a.likeCount * 2 + a.viewCount);
    }
  });

  const GRADIENT_COLORS: [string, string][] = [
    ['#FF6B6B', '#FF8E53'],
    ['#4ECDC4', '#44A08D'],
    ['#A770EF', '#CF8BF3'],
    ['#FFD93D', '#F6C90E'],
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
  ];

  const renderTipCard = ({ item, index }: { item: Story; index: number }) => {
    const isLiked = likedTips.has(item._id);
    const gradientIndex = index % GRADIENT_COLORS.length;

    return (
      <TouchableOpacity
        style={styles.tipCard}
        activeOpacity={0.95}
      >
        <LinearGradient
          colors={GRADIENT_COLORS[gradientIndex]}
          style={styles.tipGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Header */}
          <View style={styles.tipHeader}>
            <View style={styles.tipAuthorInfo}>
              <Image
                source={{ 
                  uri: item.userAvatar && item.userAvatar.trim() !== '' 
                    ? item.userAvatar 
                    : `https://i.pravatar.cc/100?u=${item.userId || item._id}`
                }}
                style={styles.tipAvatar}
              />
              <View>
                <ThemedText style={styles.tipAuthorName}>{item.userName}</ThemedText>
                <ThemedText style={styles.tipTime}>
                  {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                </ThemedText>
              </View>
            </View>
            
            {/* Rank Badge */}
            {index < 3 && (
              <View style={[styles.rankBadge, { backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' }]}>
                <ThemedText style={styles.rankText}>#{index + 1}</ThemedText>
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.tipContent}>
            <ThemedText style={styles.tipTitle}>{item.tipTitle}</ThemedText>
            <ThemedText style={styles.tipDescription}>{item.tipContent}</ThemedText>
          </View>

          {/* Footer */}
          <View style={styles.tipFooter}>
            <View style={styles.tipStats}>
              <View style={styles.tipStatItem}>
                <Ionicons name="eye-outline" size={16} color="rgba(255,255,255,0.8)" />
                <ThemedText style={styles.tipStatText}>{item.viewCount}</ThemedText>
              </View>
            </View>
            
            {/* Like Button */}
            <TouchableOpacity 
              style={[styles.likeButton, isLiked && styles.likeButtonActive]}
              onPress={() => handleLikeTip(item._id)}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={18} 
                color="#fff" 
              />
              <ThemedText style={styles.likeButtonText}>{item.likeCount}</ThemedText>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0d0d1a' : '#f8f9fa' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
          Tất cả Mẹo Nấu Ăn
        </ThemedText>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/story/create')}
        >
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'popular' && { backgroundColor: colors.primary }]}
          onPress={() => setSortBy('popular')}
        >
          <Ionicons name="flame" size={16} color={sortBy === 'popular' ? '#fff' : colors.text} />
          <ThemedText style={[styles.sortButtonText, { color: sortBy === 'popular' ? '#fff' : colors.text }]}>
            Hot
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'most_liked' && { backgroundColor: colors.primary }]}
          onPress={() => setSortBy('most_liked')}
        >
          <Ionicons name="heart" size={16} color={sortBy === 'most_liked' ? '#fff' : colors.text} />
          <ThemedText style={[styles.sortButtonText, { color: sortBy === 'most_liked' ? '#fff' : colors.text }]}>
            Yêu thích
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'newest' && { backgroundColor: colors.primary }]}
          onPress={() => setSortBy('newest')}
        >
          <Ionicons name="time" size={16} color={sortBy === 'newest' ? '#fff' : colors.text} />
          <ThemedText style={[styles.sortButtonText, { color: sortBy === 'newest' ? '#fff' : colors.text }]}>
            Mới nhất
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Tips List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={sortedTips}
          renderItem={renderTipCard}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50, // Tip phải hiển thị ít nhất 50% mới tính là "viewed"
            minimumViewTime: 500, // Phải hiển thị ít nhất 500ms
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bulb-outline" size={60} color={colors.textSecondary} />
              <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
                Chưa có mẹo nào
              </ThemedText>
              <ThemedText style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                Hãy là người đầu tiên chia sẻ!
              </ThemedText>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/story/create')}
              >
                <ThemedText style={styles.createButtonText}>Chia sẻ mẹo</ThemedText>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    gap: 6,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  tipCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  tipGradient: {
    padding: 16,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tipAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tipAuthorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  tipTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  rankBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
  },
  tipContent: {
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  tipDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  tipFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  likeButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  likeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
  },
  createButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});

