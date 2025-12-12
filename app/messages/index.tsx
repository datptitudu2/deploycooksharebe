import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { messageService, Conversation } from '@/services';
import { userService } from '@/services';

export default function MessagesListScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]); // All chefs (for user) or all users (for chef)
  const [combinedList, setCombinedList] = useState<any[]>([]); // Merged conversations + users without conversations
  const [filteredList, setFilteredList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const headerGradient = isDark ? ['#1A1A2E', '#2D2D4A'] as const : ['#FF6B35', '#FFB84D'] as const;

  const loadConversations = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await messageService.getConversations();
      if (response.success && response.data) {
        setConversations(response.data);
      }
    } catch (error) {
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const loadAllUsers = useCallback(async () => {
    try {
      // Load all chefs if user, or all users if chef
      const response = user?.role === 'user' 
        ? await userService.getAllChefs(100)
        : await userService.getAllUsers(100);
      
      if (response.success && response.data) {
        setAllUsers(response.data);
      }
    } catch (error) {
    }
  }, [user?.role]);

  // Combine conversations with users who don't have conversations yet
  useEffect(() => {
    // Always show conversations first, even if allUsers hasn't loaded yet
    const conversationPartnerIds = new Set(conversations.map(conv => conv.partnerId));
    
    // Filter out users who already have conversations (only if allUsers is loaded)
    const usersWithoutConversations = allUsers.length > 0
      ? allUsers.filter((user) => !conversationPartnerIds.has(user._id))
      : [];

    // Create list items for users without conversations
    const usersList = usersWithoutConversations.map((user) => ({
      type: 'user' as const,
      partnerId: user._id,
      partner: {
        id: user._id,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        lastSeen: user.lastSeen,
      },
      lastMessage: null,
      unreadCount: 0,
      updatedAt: user.lastSeen || new Date(),
    }));

    // Combine: conversations first (sorted by updatedAt), then users without conversations
    // If conversations exist, show them immediately even if allUsers is still loading
    const combined = [
      ...conversations,
      ...usersList,
    ];
    
    // Sort by updatedAt (most recent first)
    combined.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });

    setCombinedList(combined);
  }, [conversations, allUsers]);

  // Filter combined list based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredList(combinedList);
    } else {
      const filtered = combinedList.filter((item) =>
        item.partner?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredList(filtered);
    }
  }, [searchQuery, combinedList]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await messageService.getUnreadCount();
      if (response.success && response.data) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadAllUsers();
    loadUnreadCount();
    // Update own lastSeen when entering messages list
    userService.updateLastSeen().catch(console.error);

    const conversationsInterval = setInterval(() => {
      loadConversations(false);
      loadAllUsers();
    }, 5000); // Poll conversations every 5 seconds

    const unreadCountInterval = setInterval(() => {
      loadUnreadCount();
    }, 10000); // Poll unread count every 10 seconds

    // Update own lastSeen every 30 seconds while in messages list
    const lastSeenInterval = setInterval(() => {
      userService.updateLastSeen().catch(() => {});
    }, 30000);

    return () => {
      clearInterval(conversationsInterval);
      clearInterval(unreadCountInterval);
      clearInterval(lastSeenInterval);
    };
  }, [loadConversations, loadAllUsers, loadUnreadCount]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadConversations(false), loadAllUsers(), loadUnreadCount()]);
    setRefreshing(false);
  }, [loadConversations, loadAllUsers, loadUnreadCount]);

  // Check if user is online (within last 2 minutes)
  const isUserOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffSeconds = (now.getTime() - lastSeenDate.getTime()) / 1000;
    // Consider online if last seen within 2 minutes (120 seconds)
    return diffSeconds < 120;
  };

  // Format time like "09:34 PM"
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const renderItem = (item: any) => {
    const partner = item.partner as any;
    const isOnline = isUserOnline(partner?.lastSeen);
    const hasUnread = item.unreadCount > 0;
    const isNewUser = item.type === 'user'; // User without conversation yet
    
    return (
      <TouchableOpacity
        key={item.partnerId}
        style={[
          styles.conversationItem,
          { 
            // Dark mode: sáng hơn khi có unread
            backgroundColor: isDark 
              ? (hasUnread ? '#2D2D4D' : '#25253D')
              : (hasUnread ? '#F8F9FA' : '#FFFFFF'),
            borderColor: isDark 
              ? (hasUnread ? '#4A4A6A' : '#3A3A5A')
              : (hasUnread ? colors.primary + '40' : '#E5E5E5'),
            borderWidth: hasUnread ? 1.5 : 1,
            opacity: hasUnread ? 1 : 0.95,
          },
          hasUnread && styles.conversationItemUnread,
        ]}
        onPress={() => router.push(`/messages/${item.partnerId}`)}
      >
        <View style={styles.avatarContainer}>
          {item.partner.avatar ? (
            <Image source={{ uri: item.partner.avatar }} style={styles.partnerAvatar} />
          ) : (
            <View style={[styles.partnerAvatar, styles.partnerAvatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
          )}
          {isOnline && <View style={styles.onlineIndicator} />}
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <View style={styles.nameRow}>
              <ThemedText style={[styles.partnerName, { color: colors.text }]}>
                {item.partner.name}
              </ThemedText>
              {item.partner.role === 'chef' && (
                <View style={[styles.roleBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="restaurant" size={10} color="#FFFFFF" />
                  <ThemedText style={styles.roleBadgeText}>Đầu bếp</ThemedText>
                </View>
              )}
            </View>
            {!isNewUser && (
              <ThemedText style={[styles.lastMessageTime, { color: colors.textSecondary }]}>
                {formatTime(item.lastMessage?.createdAt)}
              </ThemedText>
            )}
          </View>
          <View style={styles.lastMessageRow}>
            {isNewUser ? (
              <ThemedText style={[styles.lastMessageText, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                Nhấn để bắt đầu trò chuyện
              </ThemedText>
            ) : (
              <>
                <View style={styles.lastMessageContent}>
                  {item.lastMessage?.type === 'voice' && (
                    <Ionicons name="mic" size={14} color={colors.textSecondary} style={styles.messageTypeIcon} />
                  )}
                  {item.lastMessage?.type === 'image' && (
                    <Ionicons name="image" size={14} color={colors.textSecondary} style={styles.messageTypeIcon} />
                  )}
                  <ThemedText
                    style={[
                      styles.lastMessageText,
                      { color: item.unreadCount > 0 ? colors.text : colors.textSecondary },
                      item.unreadCount > 0 && { fontWeight: '600' },
                    ]}
                    numberOfLines={1}
                  >
                    {item.lastMessage?.type === 'voice' 
                      ? 'Tin nhắn thoại'
                      : item.lastMessage?.type === 'image'
                      ? 'Hình ảnh'
                      : item.lastMessage?.content || 'Chưa có tin nhắn'}
                  </ThemedText>
                </View>
                {item.unreadCount > 0 && (
                  <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                    <ThemedText style={styles.unreadText}>{item.unreadCount}</ThemedText>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={styles.chevronIcon} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <LinearGradient
        colors={headerGradient}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Chat</ThemedText>
      </LinearGradient>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1F1F2E' : '#FFFFFF' }]}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={user?.role === 'user' ? 'Tìm kiếm đầu bếp hoặc cuộc trò chuyện' : 'Tìm kiếm người dùng hoặc cuộc trò chuyện'}
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText style={{ color: colors.textSecondary, marginTop: 10 }}>Đang tải danh sách trò chuyện...</ThemedText>
        </View>
      ) : (
        <ScrollView
          style={styles.conversationsList}
          contentContainerStyle={styles.conversationsContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {filteredList.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={60} color={colors.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có cuộc trò chuyện nào.'}
              </ThemedText>
            </View>
          ) : (
            filteredList.map(renderItem)
          )}
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    height: Platform.OS === 'ios' ? 100 : 70,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    position: 'relative',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 5,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginRight: 40, // Balance với back button
  },
  totalUnreadBadge: {
    position: 'absolute',
    right: 20,
    top: Platform.OS === 'ios' ? 55 : 25,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  totalUnreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationsList: {
    flex: 1,
  },
  conversationsContent: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  conversationItemUnread: {
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  partnerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  onlineIndicator: {
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
  partnerAvatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lastMessageTime: {
    fontSize: 12,
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessageContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageTypeIcon: {
    marginRight: 6,
  },
  lastMessageText: {
    flex: 1,
    fontSize: 14,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  chevronIcon: {
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    textAlign: 'center',
  },
});

