import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Modal,
  Animated,
  FlatList,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import messageService, { Message } from '@/services/messageService';
import { userService } from '@/services';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { alertService } from '@/services/alertService';

const { width } = Dimensions.get('window');

export default function ChatScreen() {
  const { partnerId } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [partner, setPartner] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<{ message: Message; x: number; y: number } | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const actionMenuAnimation = useRef(new Animated.Value(0)).current;
  const actionMenuScale = useRef(new Animated.Value(0.8)).current;
  const actionMenuOpacity = useRef(new Animated.Value(0)).current;
  const scrollYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const isUserScrollingRef = useRef(false);

  const REACTIONS = ['❤️', '😂', '😮', '👍'];
  
  // Voice recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Voice playback state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  
  // Image viewer state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]); // Nhiều ảnh đã chọn
  const [imageGalleryIndex, setImageGalleryIndex] = useState(0); // Index của ảnh đang xem trong gallery
  
  // Recent media state
  const [showRecentMedia, setShowRecentMedia] = useState(false);
  const [recentMedia, setRecentMedia] = useState<Array<{ type: 'image' | 'voice' | 'text'; url?: string; content?: string; id: string }>>([]);

  const theme = {
    bg: isDark ? '#1A1A2E' : '#FFF8F0',
    card: isDark ? '#25253D' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#2C1810',
    textSecondary: isDark ? '#A0A0B0' : '#8B7355',
    primary: colors.primary,
  };

  useEffect(() => {
    loadPartnerInfo();
    loadConversation(true, true); // Initial load, scroll to bottom
    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      loadConversation(false, false); // Don't scroll on polling
    }, 3000);

    return () => {
      clearInterval(interval);
      // Cleanup recording
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      // Cleanup sound
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [partnerId]);
  
  // Load recent media when messages change
  useEffect(() => {
    const mediaItems = messages
      .filter(msg => msg.type === 'image' || msg.type === 'voice')
      .slice(-12) // Lấy 12 media gần nhất
      .map(msg => ({
        type: msg.type as 'image' | 'voice',
        url: msg.imageUrl || msg.voiceUrl || undefined,
        content: msg.content,
        id: msg._id,
      }));
    setRecentMedia(mediaItems);
  }, [messages]);

  const loadPartnerInfo = async () => {
    if (!partnerId || typeof partnerId !== 'string') return;
    
    try {
      const response = await userService.getUserById(partnerId);
      if (response.success && response.data) {
        const userData = response.data as any;
        setPartner({
          id: userData._id || userData.id || partnerId,
          name: userData.name,
          avatar: userData.avatar,
        });
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
      // Fallback: try to get from messages
      if (messages.length > 0) {
        const firstMsg = messages[0];
        const partnerInfo = firstMsg.senderId === partnerId ? firstMsg.sender : firstMsg.receiver;
        if (partnerInfo) {
          setPartner(partnerInfo);
          setIsOnline(true); // Default to online
        }
      }
    }
  };

  const loadPartnerProfile = async () => {
    if (!partnerId || typeof partnerId !== 'string') return;
    
    setLoadingProfile(true);
    try {
      const response = await userService.getUserById(partnerId);
      if (response.success && response.data) {
        setPartnerProfile(response.data);
      } else {
        alertService.error('Không thể tải thông tin người dùng', 'Lỗi');
      }
    } catch (error: any) {
      alertService.error('Không thể tải thông tin người dùng', 'Lỗi');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleOpenProfileModal = () => {
    setShowHeaderMenu(false);
    // Navigate to profile screen instead of opening modal
    if (partnerId && typeof partnerId === 'string') {
      router.push(`/user/${partnerId}` as any);
    }
  };

  const loadConversation = async (showLoading = true, shouldScrollToBottom = false) => {
    if (!partnerId || typeof partnerId !== 'string') return;

    try {
      if (showLoading) setLoading(true);
      const response = await messageService.getConversation(partnerId, 100, 0);
      if (response.success && response.data) {
        const previousMessageCount = messages.length;
        const newMessageCount = response.data.length;
        
        // Check if user is at bottom BEFORE updating messages
        const currentScrollY = scrollYRef.current;
        const scrollViewHeight = contentHeightRef.current;
        const viewportHeight = viewportHeightRef.current;
        const isAtBottom = scrollViewHeight - currentScrollY - viewportHeight < 100; // Within 100px of bottom
        const isUserScrolling = isUserScrollingRef.current;
        
        // Only scroll to bottom if:
        // 1. It's the initial load (showLoading = true AND no messages yet)
        // 2. User explicitly wants to scroll (shouldScrollToBottom = true)
        // 3. New messages were added AND user was already at bottom
        const isInitialLoad = showLoading && previousMessageCount === 0;
        const hasNewMessages = newMessageCount > previousMessageCount;
        
        setMessages(response.data);
        // Set partner info from first message if not already loaded
        if (response.data.length > 0 && !partner) {
          const firstMsg = response.data[0];
          const partnerInfo = firstMsg.senderId === partnerId ? firstMsg.sender : firstMsg.receiver;
          if (partnerInfo) {
            setPartner(partnerInfo);
            setIsOnline(true); // Default to online
          }
        }
        
        // Only scroll to bottom in specific cases
        // NEVER scroll if user is actively scrolling
        if (!isUserScrolling) {
          if (isInitialLoad || shouldScrollToBottom || (hasNewMessages && isAtBottom)) {
            setTimeout(() => {
              scrollToBottom();
            }, 100);
          } else if (hasNewMessages) {
            // If new messages but user is scrolling up, maintain scroll position
            setTimeout(() => {
              scrollViewRef.current?.scrollTo({ y: currentScrollY, animated: false });
            }, 50);
          }
        } else {
          // User is scrolling, just maintain position
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({ y: currentScrollY, animated: false });
          }, 50);
        }
      }
    } catch (error: any) {
      console.error('Load conversation error:', error);
      // Don't show alert on every polling attempt, only on initial load
      if (showLoading) {
        if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
          alertService.error(
            'Không thể kết nối đến server. Vui lòng kiểm tra:\n1. Backend có đang chạy không?\n2. IP address trong config/api.ts có đúng không?',
            'Lỗi kết nối'
          );
        } else {
          alertService.error(error.response?.data?.message || 'Không thể tải tin nhắn', 'Lỗi');
        }
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendMessage = async (customText?: string, customType: 'text' | 'image' | 'voice' = 'text') => {
    const textToSend = customText || inputText.trim();
    if (!textToSend || !partnerId || typeof partnerId !== 'string' || sending) return;

    setSending(true);
    try {
      const response = await messageService.sendMessage(
        partnerId,
        textToSend,
        customType,
        null,
        null,
        undefined,
        replyingTo?._id || null
      );
        if (response.success && response.data) {
          // Check if user is at bottom before adding message
          const currentScrollY = scrollYRef.current;
          const scrollViewHeight = contentHeightRef.current;
          const viewportHeight = viewportHeightRef.current;
          const isAtBottom = scrollViewHeight - currentScrollY - viewportHeight < 100;
          const isUserScrolling = isUserScrollingRef.current;
          
          setMessages((prev) => [...prev, response.data as Message]);
          if (!customText) {
          setInputText('');
          }
          setReplyingTo(null);
          // Only scroll to bottom if user is at bottom AND not actively scrolling
          if (isAtBottom && !isUserScrolling) {
            setTimeout(() => {
              scrollToBottom();
            }, 100);
          }
        }
    } catch (error: any) {
      alertService.error(error.response?.data?.message || 'Không thể gửi tin nhắn', 'Lỗi');
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alertService.warning('Vui lòng cấp quyền truy cập thư viện ảnh', 'Cần quyền truy cập');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true, // Cho phép chọn nhiều ảnh
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0 && partnerId && typeof partnerId === 'string') {
      // Nếu chọn nhiều ảnh, lưu vào state để hiển thị gallery
      if (result.assets.length > 1) {
        const imageUris = result.assets.map(asset => asset.uri);
        setSelectedImages(imageUris);
        setImageGalleryIndex(0);
        return;
      }
      
      // Nếu chỉ chọn 1 ảnh, gửi ngay như cũ
      setSending(true);
      try {
        const response = await messageService.sendMessage(
          partnerId,
          '', // Content có thể rỗng cho ảnh
          'image',
          result.assets[0].uri,
          null,
          undefined,
          replyingTo?._id || null
        );
        if (response.success && response.data) {
          // Check if user is at bottom before adding message
          const currentScrollY = scrollYRef.current;
          const scrollViewHeight = contentHeightRef.current;
          const viewportHeight = viewportHeightRef.current;
          const isAtBottom = scrollViewHeight - currentScrollY - viewportHeight < 100;
          const isUserScrolling = isUserScrollingRef.current;
          
          setMessages((prev) => [...prev, response.data as Message]);
          setReplyingTo(null);
          // Only scroll to bottom if user is at bottom AND not actively scrolling
          if (isAtBottom && !isUserScrolling) {
            setTimeout(() => {
              scrollToBottom();
            }, 100);
          }
        }
      } catch (error: any) {
        alertService.error('Không thể gửi ảnh', 'Lỗi');
      } finally {
        setSending(false);
      }
    }
  };

  // Nhóm các message ảnh liên tiếp từ cùng người gửi
  const groupImageMessages = (messages: Message[], userId: string): Array<Message | Message[]> => {
    const grouped: Array<Message | Message[]> = [];
    let currentGroup: Message[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const isMe = message.senderId === userId;
      const isImage = message.type === 'image';
      
      // Kiểm tra xem message này có phải ảnh và cùng người gửi với message trước không
      if (isImage && currentGroup.length > 0) {
        const prevMessage = currentGroup[currentGroup.length - 1];
        const prevIsMe = prevMessage.senderId === userId;
        const isConsecutive = 
          prevIsMe === isMe && 
          prevMessage.type === 'image' &&
          Math.abs(new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) < 5000; // Trong 5 giây
        
        if (isConsecutive) {
          currentGroup.push(message);
        } else {
          // Lưu group cũ và bắt đầu group mới
          if (currentGroup.length > 1) {
            grouped.push(currentGroup);
          } else {
            grouped.push(currentGroup[0]);
          }
          currentGroup = [message];
        }
      } else if (isImage) {
        currentGroup = [message];
      } else {
        // Nếu không phải ảnh, lưu group cũ (nếu có) và thêm message này
        if (currentGroup.length > 0) {
          if (currentGroup.length > 1) {
            grouped.push(currentGroup);
          } else {
            grouped.push(currentGroup[0]);
          }
          currentGroup = [];
        }
        grouped.push(message);
      }
    }
    
    // Lưu group cuối cùng
    if (currentGroup.length > 0) {
      if (currentGroup.length > 1) {
        grouped.push(currentGroup);
      } else {
        grouped.push(currentGroup[0]);
      }
    }
    
    return grouped;
  };

  // Gửi nhiều ảnh - gửi tất cả cùng lúc để hiển thị gộp lại
  const handleSendMultipleImages = async () => {
    if (!selectedImages.length || !partnerId || typeof partnerId !== 'string') return;
    
    setSending(true);
    try {
      const newMessages: Message[] = [];
      // Gửi từng ảnh một nhưng gộp lại trong state
      for (const imageUri of selectedImages) {
        const response = await messageService.sendMessage(
          partnerId,
          '',
          'image',
          imageUri,
          null,
          undefined,
          replyingTo?._id || null
        );
        if (response.success && response.data) {
          newMessages.push(response.data as Message);
        }
      }
      // Thêm tất cả messages cùng lúc để chúng được nhóm lại
      if (newMessages.length > 0) {
        setMessages((prev) => [...prev, ...newMessages]);
      }
      setReplyingTo(null);
      setSelectedImages([]);
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error: any) {
      alertService.error('Không thể gửi ảnh', 'Lỗi');
    } finally {
      setSending(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alertService.warning('Vui lòng cấp quyền truy cập microphone', 'Cần quyền truy cập');
        return;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording with compatible format for both iOS and Android
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
      
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000) as unknown as NodeJS.Timeout;
    } catch (error: any) {
      alertService.error('Không thể bắt đầu ghi âm', 'Lỗi');
    }
  };

  const handleStopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (!uri) {
        alertService.error('Không thể lưu file ghi âm', 'Lỗi');
        setRecording(null);
        setRecordingDuration(0);
        return;
      }

      // If recording is too short (< 1 second), cancel
      if (recordingDuration < 1) {
        alertService.info('Tin nhắn thoại quá ngắn', 'Thông báo');
        setRecording(null);
        setRecordingDuration(0);
        return;
      }

      // Send voice message
      if (partnerId && typeof partnerId === 'string') {
        setSending(true);
        try {
          const response = await messageService.sendMessage(
            partnerId,
            '',
            'voice',
            null,
            uri,
            recordingDuration,
            replyingTo?._id || null
          );
          if (response.success && response.data) {
            // Check if user is at bottom before adding message
            const currentScrollY = scrollYRef.current;
            const scrollViewHeight = contentHeightRef.current;
            const viewportHeight = viewportHeightRef.current;
            const isAtBottom = scrollViewHeight - currentScrollY - viewportHeight < 100;
            const isUserScrolling = isUserScrollingRef.current;
            
            setMessages((prev) => [...prev, response.data as Message]);
            setReplyingTo(null);
            // Only scroll to bottom if user is at bottom AND not actively scrolling
            if (isAtBottom && !isUserScrolling) {
              setTimeout(() => {
                scrollToBottom();
              }, 100);
            }
          }
        } catch (error: any) {
          alertService.error('Không thể gửi tin nhắn thoại', 'Lỗi');
        } finally {
          setSending(false);
        }
      }

      setRecording(null);
      setRecordingDuration(0);
    } catch (error: any) {
      alertService.error('Không thể dừng ghi âm', 'Lỗi');
      setRecording(null);
      setRecordingDuration(0);
    }
  };

  const handlePlayVoice = async (voiceUrl: string, messageId: string) => {
    try {
      if (!voiceUrl || !voiceUrl.trim()) {
        alertService.error('URL tin nhắn thoại không hợp lệ', 'Lỗi');
        return;
      }

      // Stop current playback if any
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // If clicking the same voice, stop it
      if (playingVoiceId === messageId) {
        setPlayingVoiceId(null);
        return;
      }

      // Ensure URL is absolute
      let finalUrl = voiceUrl;
      if (!voiceUrl.startsWith('http://') && !voiceUrl.startsWith('https://') && !voiceUrl.startsWith('file://')) {
        // If relative URL, try to make it absolute
        const { API_URL } = await import('@/config/api');
        finalUrl = voiceUrl.startsWith('/') 
          ? `${API_URL.replace('/api', '')}${voiceUrl}`
          : `${API_URL.replace('/api', '')}/${voiceUrl}`;
      }


      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // For Cloudinary URLs, handle format transformation
      // Strategy: Try multiple approaches for maximum compatibility
      let playUrl = finalUrl;
      if (finalUrl.includes('cloudinary.com')) {
        // Extract public_id from URL - need to get everything after /upload/ (including folder path)
        // URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{public_id}
        // public_id includes folder path like: cookshare/message-voices/filename
        const uploadMatch = finalUrl.match(/\/upload\/([^/]*\/)?(.+)$/);
        let publicId = null;
        
        if (uploadMatch) {
          // If there's a transformation in the URL (like f_m4a,q_auto/), skip it
          // Otherwise, public_id is everything after /upload/
          if (uploadMatch[1] && uploadMatch[1].includes(',')) {
            // Has transformation, public_id is in group 2
            publicId = uploadMatch[2];
          } else {
            // No transformation, combine group 1 and 2
            publicId = (uploadMatch[1] || '') + uploadMatch[2];
          }
        }
        
        if (publicId) {
          const cloudName = finalUrl.match(/res\.cloudinary\.com\/([^/]+)/)?.[1];
          
          if (cloudName) {
            // Strategy 1: Try video resource type with m4a format (best for new uploads)
            // This works if file was uploaded as video type or can be served via video endpoint
            playUrl = `https://res.cloudinary.com/${cloudName}/video/upload/f_m4a,q_auto/${publicId}`;
            
          }
        } else {
          // Fallback: Try to add transformation to existing URL
          if (!finalUrl.includes('f_m4a') && !finalUrl.includes('/f_m4a/')) {
            if (finalUrl.includes('/raw/upload/')) {
              playUrl = finalUrl.replace('/raw/upload/', '/video/upload/f_m4a,q_auto/');
            } else if (finalUrl.includes('/raw/upload')) {
              playUrl = finalUrl.replace('/raw/upload', '/video/upload/f_m4a,q_auto');
            } else if (finalUrl.includes('/video/upload/')) {
              playUrl = finalUrl.replace('/video/upload/', '/video/upload/f_m4a,q_auto/');
            } else if (finalUrl.includes('/video/upload')) {
              playUrl = finalUrl.replace('/video/upload', '/video/upload/f_m4a,q_auto');
            }
          }
        }
      }


      // Load and play with proper format handling
      // Try multiple URL strategies if first one fails
      let sound: Audio.Sound | null = null;
      let lastError: any = null;
      
      // Strategy 1: Try the constructed URL (video endpoint with m4a format)
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { 
            uri: playUrl,
            overrideFileExtensionAndroid: 'm4a',
          },
          { 
            shouldPlay: true,
            isLooping: false,
            isMuted: false,
            volume: 1.0,
          }
        );
        sound = newSound;
      } catch (error: any) {
        lastError = error;
        
        // Strategy 2: Try original URL if it's different
        if (playUrl !== finalUrl) {
          try {
            const { sound: newSound } = await Audio.Sound.createAsync(
              { 
                uri: finalUrl,
                overrideFileExtensionAndroid: 'm4a',
              },
              { 
                shouldPlay: true,
                isLooping: false,
                isMuted: false,
                volume: 1.0,
              }
            );
            sound = newSound;
          } catch (error2: any) {
            lastError = error2;
          }
        }
        
        // Strategy 3: Try raw endpoint with format transformation
        if (!sound && finalUrl.includes('/raw/upload/')) {
          try {
            const rawUrl = finalUrl.replace('/raw/upload/', '/raw/upload/f_m4a,q_auto/');
            const { sound: newSound } = await Audio.Sound.createAsync(
              { 
                uri: rawUrl,
                overrideFileExtensionAndroid: 'm4a',
              },
              { 
                shouldPlay: true,
                isLooping: false,
                isMuted: false,
                volume: 1.0,
              }
            );
            sound = newSound;
          } catch (error3: any) {
            lastError = error3;
          }
        }
        
        // Strategy 4: Try raw endpoint WITHOUT transformation (direct file access)
        if (!sound && finalUrl.includes('/raw/upload/')) {
          try {
            // Use the original raw URL as-is, Cloudinary will serve the file directly
            const { sound: newSound } = await Audio.Sound.createAsync(
              { 
                uri: finalUrl,
                overrideFileExtensionAndroid: 'm4a',
              },
              { 
                shouldPlay: true,
                isLooping: false,
                isMuted: false,
                volume: 1.0,
              }
            );
            sound = newSound;
          } catch (error4: any) {
            lastError = error4;
          }
        }
        
        // Strategy 5: Try downloading and serving locally (last resort)
        if (!sound && finalUrl.includes('cloudinary.com')) {
          try {
            // Download file from Cloudinary using FileSystem
            // Get directory paths - they might be available at runtime
            const cacheDir = (FileSystem as any).cacheDirectory;
            const docDir = (FileSystem as any).documentDirectory;
            const dir = cacheDir || docDir;
            
            if (!dir) {
              throw new Error('No directory available for download');
            }
            
            const fileUri = `${dir}voice_${Date.now()}.m4a`;
            
            const downloadResult = await FileSystem.downloadAsync(finalUrl, fileUri);
            
            if (downloadResult.status !== 200) {
              throw new Error(`Failed to download: ${downloadResult.status}`);
            }
            
            
            const { sound: newSound } = await Audio.Sound.createAsync(
              { 
                uri: downloadResult.uri,
                overrideFileExtensionAndroid: 'm4a',
              },
              { 
                shouldPlay: true,
                isLooping: false,
                isMuted: false,
                volume: 1.0,
              }
            );
            sound = newSound;
            
            // Cleanup file after playback finishes
            sound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded && status.didJustFinish) {
                FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
              }
            });
          } catch (error5: any) {
            lastError = error5;
          }
        }
      }
      
      if (!sound) {
        const errorMsg = lastError?.message || 'Unknown error';
        const errorCode = lastError?.code || 'N/A';
        alertService.error(`Không thể phát tin nhắn thoại.\nLỗi: ${errorMsg}\nCode: ${errorCode}`, 'Lỗi');
        return;
      }

      soundRef.current = sound;
      setPlayingVoiceId(messageId);

      // Cleanup when finished
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            setPlayingVoiceId(null);
            sound.unloadAsync();
            soundRef.current = null;
          } else if ('error' in status && status.error) {
            const error = status.error as any;
            alertService.error('Không thể phát tin nhắn thoại: ' + (error?.message || 'Unknown error'), 'Lỗi');
            setPlayingVoiceId(null);
            sound.unloadAsync();
            soundRef.current = null;
          }
        }
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      alertService.error(`Không thể phát tin nhắn thoại: ${errorMessage}`, 'Lỗi');
      setPlayingVoiceId(null);
      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
        } catch (e) {
          // Ignore cleanup errors
        }
        soundRef.current = null;
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const response = await messageService.deleteMessage(messageId);
      if (response.success) {
        // Remove message from state
        setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
        alertService.success('Đã thu hồi tin nhắn', 'Thành công');
      }
    } catch (error: any) {
      alertService.error(error.response?.data?.message || 'Không thể thu hồi tin nhắn', 'Lỗi');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isYesterday = (dateString: string) => {
    const date = new Date(dateString);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    );
  };

  const isSameDay = (dateString1: string, dateString2: string) => {
    const date1 = new Date(dateString1);
    const date2 = new Date(dateString2);
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Kiểm tra hôm nay
    if (isToday(dateString)) {
      return 'Hôm nay';
    }

    // Kiểm tra hôm qua
    if (isYesterday(dateString)) {
      return 'Hôm qua';
    }

    // Kiểm tra cùng năm
    if (date.getFullYear() === today.getFullYear()) {
      // Hiển thị: Thứ X, ngày/tháng
      const daysOfWeek = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      const dayOfWeek = daysOfWeek[date.getDay()];
      const day = date.getDate();
      const month = date.getMonth() + 1;
      return `${dayOfWeek}, ${day}/${month}`;
    }

    // Khác năm: Thứ X, ngày/tháng/năm
    const daysOfWeek = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayOfWeek = daysOfWeek[date.getDay()];
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${dayOfWeek}, ${day}/${month}/${year}`;
  };

  if (loading && messages.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[theme.primary, colors.accent]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {partner ? (
          <View style={styles.headerInfo}>
            {partner.avatar ? (
              <ExpoImage source={{ uri: partner.avatar }} style={styles.headerAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                <Ionicons name="person" size={20} color="#FFFFFF" />
              </View>
            )}
            <View style={styles.headerText}>
              <ThemedText style={styles.headerName}>{partner.name || 'User'}</ThemedText>
            </View>
          </View>
        ) : (
          <View style={styles.headerInfo}>
            <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
            <View style={styles.headerText}>
              <ThemedText style={styles.headerName}>Đang tải...</ThemedText>
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setShowHeaderMenu(!showHeaderMenu)}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Header Menu */}
      {showHeaderMenu && (
        <>
          <TouchableOpacity
            style={styles.headerMenuOverlay}
            activeOpacity={1}
            onPress={() => setShowHeaderMenu(false)}
          />
          <View style={[styles.headerMenu, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={styles.headerMenuItem}
              onPress={handleOpenProfileModal}
            >
              <Ionicons name="person-outline" size={20} color={theme.text} />
              <ThemedText style={[styles.headerMenuItemText, { color: theme.text }]}>
                Xem thông tin
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerMenuItem}
              onPress={() => {
                setShowHeaderMenu(false);
                setShowSearch(true);
              }}
            >
              <Ionicons name="search-outline" size={20} color={theme.text} />
              <ThemedText style={[styles.headerMenuItemText, { color: theme.text }]}>
                Tìm kiếm
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerMenuItem}
              onPress={() => {
                setShowHeaderMenu(false);
                setShowRecentMedia(true);
              }}
            >
              <Ionicons name="images-outline" size={20} color={theme.text} />
              <ThemedText style={[styles.headerMenuItemText, { color: theme.text }]}>
                Media & Files
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerMenuItem}
              onPress={() => {
                setShowHeaderMenu(false);
                alertService.confirm(
                  'Bạn có chắc muốn xóa toàn bộ cuộc trò chuyện này? Hành động này không thể hoàn tác.',
                  'Xóa cuộc trò chuyện',
                  async () => {
                        if (!partnerId || typeof partnerId !== 'string') return;
                        
                        try {
                          const response = await messageService.deleteConversation(partnerId);
                          if (response.success) {
                            // Clear messages and navigate back
                            setMessages([]);
                        alertService.success('Đã xóa cuộc trò chuyện', 'Thành công').then(() => {
                          router.back();
                        });
                          } else {
                        alertService.error(response.message || 'Không thể xóa cuộc trò chuyện', 'Lỗi');
                          }
                        } catch (error: any) {
                      alertService.error('Không thể xóa cuộc trò chuyện. Vui lòng thử lại.', 'Lỗi');
                        }
                  }
                );
              }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error || '#FF3B30'} />
              <ThemedText style={[styles.headerMenuItemText, { color: colors.error || '#FF3B30' }]}>
                Xóa cuộc trò chuyện
              </ThemedText>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!showActionMenu}
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
            contentHeightRef.current = e.nativeEvent.contentSize.height;
            viewportHeightRef.current = e.nativeEvent.layoutMeasurement.height;
          }}
          onScrollBeginDrag={() => {
            isUserScrollingRef.current = true;
          }}
          onScrollEndDrag={() => {
            setTimeout(() => {
              isUserScrollingRef.current = false;
            }, 500);
          }}
          scrollEventThrottle={16}
        >
          {(() => {
            const userId = (user as any)?._id || (user as any)?.id || '';
            const groupedMessages = groupImageMessages(messages, userId);
            
            return groupedMessages.map((messageOrGroup: Message | Message[], groupIndex: number) => {
              // Lấy message đầu tiên để kiểm tra ngày
              const currentMessage = Array.isArray(messageOrGroup) ? messageOrGroup[0] : messageOrGroup;
              const prevMessage = groupIndex > 0 
                ? (Array.isArray(groupedMessages[groupIndex - 1]) 
                    ? (groupedMessages[groupIndex - 1] as Message[])[0] 
                    : groupedMessages[groupIndex - 1] as Message)
                : null;
              
              // Kiểm tra xem có cần hiển thị date separator không
              const shouldShowDateSeparator = !prevMessage || !isSameDay(currentMessage.createdAt, prevMessage.createdAt);
              
              // Nếu là group nhiều ảnh
              if (Array.isArray(messageOrGroup)) {
                const firstMessage = messageOrGroup[0];
                const isMe = firstMessage.senderId === userId;
                const isLastGroup = groupIndex === groupedMessages.length - 1;
                const showAvatar = !isMe && isLastGroup;
                
                return (
                  <React.Fragment key={`group-${firstMessage._id}`}>
                    {shouldShowDateSeparator && (
            <View style={styles.dateSeparator}>
                        <ThemedText style={styles.dateText}>
                          {formatDate(firstMessage.createdAt)}
                        </ThemedText>
                      </View>
                    )}
                    <View
                      style={[
                        styles.messageWrapper,
                        isMe ? styles.messageWrapperRight : styles.messageWrapperLeft,
                        styles.messageWrapperImage,
                      ]}
                    >
                    <View style={[
                      styles.messageRow,
                      isMe ? styles.messageRowRight : styles.messageRowLeft
                    ]}>
                      {!isMe && (
                        <View style={styles.messageAvatarContainer}>
                          {showAvatar ? (
                            firstMessage.sender?.avatar ? (
                              <Image
                                source={{ uri: firstMessage.sender.avatar }}
                                style={styles.messageAvatar}
                              />
                            ) : (
                              <View style={[styles.messageAvatar, styles.messageAvatarPlaceholder]}>
                                <Ionicons name="person" size={16} color={theme.textSecondary} />
                              </View>
                            )
                          ) : (
                            <View style={styles.messageAvatarSpacer} />
                          )}
            </View>
          )}

                      <View
                        style={[
                          styles.messageImageContainer,
                          isMe ? styles.messageImageContainerRight : styles.messageImageContainerLeft
                        ]}
                      >
                        <View style={styles.imageGridContainer}>
                          {messageOrGroup.map((msg, imgIndex) => (
                            <TouchableOpacity
                              key={msg._id}
                              style={[
                                styles.imageGridItem,
                                messageOrGroup.length === 1 && styles.imageGridItemSingle,
                                messageOrGroup.length === 2 && styles.imageGridItemTwo,
                                messageOrGroup.length === 3 && imgIndex === 0 && styles.imageGridItemThreeFirst,
                                messageOrGroup.length === 3 && imgIndex > 0 && styles.imageGridItemThreeRest,
                                messageOrGroup.length >= 4 && styles.imageGridItemFour,
                              ]}
                              onPress={() => {
                                // Mở modal xem ảnh này và có thể swipe sang ảnh khác trong group
                                setSelectedImages(messageOrGroup.map(m => m.imageUrl!).filter(Boolean));
                                setImageGalleryIndex(imgIndex);
                                setSelectedImage(msg.imageUrl!);
                              }}
                            >
                              <ExpoImage
                                source={{ uri: msg.imageUrl! }}
                                style={styles.imageGridImage}
                                contentFit="cover"
                              />
                              {imgIndex === 3 && messageOrGroup.length > 4 && (
                                <View style={styles.imageGridOverlay}>
                                  <ThemedText style={styles.imageGridOverlayText}>
                                    +{messageOrGroup.length - 4}
                                  </ThemedText>
                                </View>
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                        
                        {/* Footer với time và icons */}
                        <View style={[styles.messageFooter, styles.messageFooterImage]}>
                          <ThemedText style={[styles.messageTime, { 
                            color: isMe 
                              ? 'rgba(255,255,255,0.9)' 
                              : (isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)')
                          }]}>
                            {formatTime(firstMessage.createdAt)}
                          </ThemedText>
                          {isMe && (
                            <View style={styles.messageFooterIcons}>
                              <View style={styles.messageStatusIcon}>
                                <Ionicons 
                                  name="checkmark-done" 
                                  size={12} 
                                  color={isMe ? 'rgba(255,255,255,0.9)' : theme.textSecondary} 
                                />
                              </View>
                              <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => {
                                  alertService.confirm(
                                    'Bạn có chắc muốn thu hồi tất cả ảnh này?',
                                    'Thu hồi tin nhắn',
                                    async () => {
                                          // Xóa tất cả ảnh trong group
                                          for (const msg of messageOrGroup) {
                                            await handleDeleteMessage(msg._id);
                                          }
                                    }
                                  );
                                }}
                              >
                                <Ionicons 
                                  name="trash-outline" 
                                  size={14} 
                                  color={isMe ? 'rgba(255,255,255,0.9)' : theme.textSecondary} 
                                />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                </React.Fragment>
                );
              }
              
              // Nếu là message đơn lẻ
              const message = messageOrGroup as Message;
            const isMe = message.senderId === userId;
              const isLastFromSender = groupIndex === groupedMessages.length - 1 || 
                (groupedMessages[groupIndex + 1] && !Array.isArray(groupedMessages[groupIndex + 1]) && 
                 (groupedMessages[groupIndex + 1] as Message).senderId !== message.senderId);
              const showAvatar = !isMe && isLastFromSender;

            return (
                <React.Fragment key={message._id}>
                  {shouldShowDateSeparator && (
                    <View style={styles.dateSeparator}>
                      <ThemedText style={styles.dateText}>
                        {formatDate(message.createdAt)}
                      </ThemedText>
                    </View>
                  )}
              <View
                style={[
                  styles.messageWrapper,
                  isMe ? styles.messageWrapperRight : styles.messageWrapperLeft,
                      message.type === 'image' && styles.messageWrapperImage, // Giảm khoảng cách cho ảnh
                ]}
              >
                <View style={[
                  styles.messageRow,
                  isMe ? styles.messageRowRight : styles.messageRowLeft
                ]}>
                  {!isMe && (
                    <View style={styles.messageAvatarContainer}>
                      {showAvatar ? (
                        message.sender?.avatar ? (
                          <Image
                            source={{ uri: message.sender.avatar }}
                            style={styles.messageAvatar}
                          />
                        ) : (
                          <View style={[styles.messageAvatar, styles.messageAvatarPlaceholder]}>
                            <Ionicons name="person" size={16} color={theme.textSecondary} />
                          </View>
                        )
                      ) : (
                        <View style={styles.messageAvatarSpacer} />
                      )}
                    </View>
                  )}
                  
                  {message.type === 'image' ? (
                    // Ảnh render riêng, không trong messageContentWrapper để sát góc
                    <>
                      {/* Reply Indicator - Text ở trên bubble */}
                      {message.replyToMessage && (
                        <View style={[
                          styles.replyIndicator,
                          isMe ? styles.replyIndicatorRight : styles.replyIndicatorLeft
                        ]}>
                          <Ionicons 
                            name="arrow-undo" 
                            size={12} 
                            color={theme.textSecondary} 
                            style={styles.replyIndicatorIcon}
                          />
                          <ThemedText 
                            style={[
                              styles.replyIndicatorText,
                              { color: theme.textSecondary }
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {isMe 
                              ? `Bạn đã trả lời ${message.replyToMessage.sender?.name || ''}`
                              : `${message.sender?.name || ''} đã trả lời bạn`
                            }
                          </ThemedText>
                        </View>
                      )}
                      <View
                        style={[
                          styles.messageImageContainer,
                          isMe ? styles.messageImageContainerRight : styles.messageImageContainerLeft
                        ]}
                      >
                        <TouchableOpacity
                          onPress={() => setSelectedImage(message.imageUrl!)}
                          onLongPress={(e) => {
                            // Allow reply to image
                            e.stopPropagation();
                            const { pageX, pageY, locationY } = e.nativeEvent;
                            const adjustedY = pageY - locationY - 80;
                            setShowActionMenu({ message, x: pageX, y: adjustedY });
                            
                            // Animate menu appearance
                            actionMenuScale.setValue(0.8);
                            actionMenuOpacity.setValue(0);
                            Animated.parallel([
                              Animated.spring(actionMenuScale, {
                                toValue: 1,
                                useNativeDriver: true,
                                tension: 50,
                                friction: 7,
                              }),
                              Animated.timing(actionMenuOpacity, {
                                toValue: 1,
                                duration: 200,
                                useNativeDriver: true,
                              }),
                            ]).start();
                          }}
                          activeOpacity={0.9}
                          style={styles.messageImageTouchable}
                        >
                          {/* Reply Preview cho ảnh */}
                          {message.replyToMessage && (
                            <View style={[
                              styles.replyPreview,
                              styles.replyPreviewForImage,
                              {
                                borderLeftColor: isMe ? 'rgba(255,255,255,0.5)' : theme.primary,
                                backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
                              },
                            ]}>
                              <View style={styles.replyPreviewContent}>
                                {message.replyToMessage.type === 'text' && (
                                  <ThemedText
                                    style={[
                                      styles.replyPreviewText,
                                      { color: isMe ? 'rgba(255,255,255,0.7)' : theme.textSecondary },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {message.replyToMessage.content}
                                  </ThemedText>
                                )}
                                {message.replyToMessage.type === 'image' && (
                                  <View style={styles.replyPreviewImageContainer}>
                                    {message.replyToMessage.imageUrl ? (
                                      <ExpoImage
                                        source={{ uri: message.replyToMessage.imageUrl }}
                                        style={styles.replyPreviewImage}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                      />
                                    ) : (
                                      <View style={[styles.replyPreviewImagePlaceholder, { backgroundColor: theme.bg }]}>
                                        <Ionicons name="image-outline" size={16} color={theme.textSecondary} />
                                      </View>
                                    )}
                                  </View>
                                )}
                                {message.replyToMessage.type === 'voice' && (
                                  <View style={styles.replyPreviewVoiceContainer}>
                                    <Ionicons name="mic-outline" size={14} color={isMe ? 'rgba(255,255,255,0.7)' : theme.textSecondary} />
                                    <ThemedText
                                      style={[
                                        styles.replyPreviewText,
                                        { color: isMe ? 'rgba(255,255,255,0.7)' : theme.textSecondary },
                                      ]}
                                    >
                                      Tin nhắn thoại
                                    </ThemedText>
                                  </View>
                                )}
                              </View>
                            </View>
                          )}
                          <ExpoImage
                            source={{ uri: message.imageUrl! }}
                            style={[
                              styles.messageImage,
                              isMe ? styles.messageImageRight : styles.messageImageLeft
                            ]}
                            contentFit="cover"
                          />
                        </TouchableOpacity>
                        
                        {/* Footer với icon delete cho ảnh */}
                        <View style={[styles.messageFooter, styles.messageFooterImage]}>
                          <ThemedText style={[styles.messageTime, { 
                            color: isMe 
                              ? 'rgba(255,255,255,0.9)' 
                              : (isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)')
                          }]}>
                            {formatTime(message.createdAt)}
                          </ThemedText>
                          {isMe && (
                            <View style={styles.messageFooterIcons}>
                              <View style={styles.messageStatusIcon}>
                                <Ionicons 
                                  name="checkmark-done" 
                                  size={12} 
                                  color={isMe ? 'rgba(255,255,255,0.9)' : theme.textSecondary} 
                                />
                              </View>
                              <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => {
                                  alertService.confirm(
                                    'Bạn có chắc muốn thu hồi tin nhắn này?',
                                    'Thu hồi tin nhắn',
                                    () => handleDeleteMessage(message._id)
                                  );
                                }}
                              >
                                <Ionicons 
                                  name="trash-outline" 
                                  size={14} 
                                  color={isMe ? 'rgba(255,255,255,0.9)' : theme.textSecondary} 
                                />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                        
                        {/* Reactions for image */}
                        {message.reactions && message.reactions.length > 0 && (
                          <View style={[
                            styles.reactionsContainer,
                            isMe ? styles.reactionsContainerRight : styles.reactionsContainerLeft
                          ]}>
                          {Object.entries(
                            message.reactions.reduce((acc: Record<string, string[]>, r) => {
                              if (!acc[r.emoji]) acc[r.emoji] = [];
                              acc[r.emoji].push(r.userName);
                              return acc;
                            }, {})
                          ).map(([emoji, users]) => (
                            <TouchableOpacity
                              key={emoji}
                              style={[
                                styles.reactionBadge,
                                {
                                  backgroundColor: isMe ? 'rgba(255,255,255,0.25)' : theme.card,
                                  borderWidth: 1,
                                  borderColor: isMe ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)',
                                }
                              ]}
                              onPress={async () => {
                                try {
                                  // Prevent scroll when reacting
                                  const currentScrollY = scrollYRef.current;
                                  
                                  const response = await messageService.toggleReaction(message._id, emoji);
                                  if (response.success) {
                                    // Update reactions in state without reloading to prevent scroll
                                    setMessages((prev) =>
                                      prev.map((msg) => {
                                        if (msg._id === message._id) {
                                          const userId = (user as any)?._id || (user as any)?.id || '';
                                          const currentReactions = msg.reactions || [];
                                          const existingIndex = currentReactions.findIndex(
                                            (r) => r.userId === userId && r.emoji === emoji
                                          );
                                          
                                          if (existingIndex >= 0) {
                                            // Remove reaction
                                            return {
                                              ...msg,
                                              reactions: currentReactions.filter((_, idx) => idx !== existingIndex),
                                            };
                                          } else {
                                            // Add reaction
                                            return {
                                              ...msg,
                                              reactions: [
                                                ...currentReactions,
                                                { userId, emoji, userName: (user as any)?.name || 'You' },
                                              ],
                                            };
                                          }
                                        }
                                        return msg;
                                      })
                                    );
                                    
                                    // Restore scroll position
                                    setTimeout(() => {
                                      scrollViewRef.current?.scrollTo({ y: currentScrollY, animated: false });
                                    }, 50);
                                  }
                                } catch (error: any) {
                                  alertService.error(error.response?.data?.message || 'Không thể thêm cảm xúc', 'Lỗi');
                                }
                              }}
                            >
                              <ThemedText style={styles.reactionBadgeEmoji}>{emoji}</ThemedText>
                              <ThemedText style={[styles.reactionBadgeCount, { color: isMe ? 'rgba(255,255,255,0.9)' : theme.text }]}>
                                {users.length}
                              </ThemedText>
                            </TouchableOpacity>
                          ))}
                          </View>
                        )}
                      </View>
                    </>
                  ) : (
                    // Text và voice trong messageContentWrapper
                  <View style={[
                    styles.messageContentWrapper,
                    isMe ? styles.messageContentWrapperRight : styles.messageContentWrapperLeft
                  ]}>
                      {/* Reply Indicator - Text ở trên bubble */}
                      {message.replyToMessage && (
                        <View style={[
                          styles.replyIndicator,
                          isMe ? styles.replyIndicatorRight : styles.replyIndicatorLeft
                        ]}>
                          <Ionicons 
                            name="arrow-undo" 
                            size={12} 
                            color={theme.textSecondary} 
                            style={styles.replyIndicatorIcon}
                          />
                          <ThemedText 
                            style={[
                              styles.replyIndicatorText,
                              { color: theme.textSecondary }
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {isMe 
                              ? `Bạn đã trả lời ${message.replyToMessage.sender?.name || ''}`
                              : `${message.sender?.name || ''} đã trả lời bạn`
                            }
                          </ThemedText>
                        </View>
                      )}
                      
                    <TouchableOpacity
                        style={[
                          styles.messageBubbleContainer,
                          isMe ? styles.messageBubbleContainerRight : styles.messageBubbleContainerLeft
                        ]}
                      activeOpacity={1}
                      delayLongPress={300}
                      onLongPress={(e) => {
                        // Allow reply to any message (own or other's)
                        // Prevent default scroll behavior
                        e.stopPropagation();
                        // Get touch position - use locationY for better accuracy
                        const { pageX, pageY, locationY } = e.nativeEvent;
                        // Calculate better position - adjust based on message position
                        const adjustedY = pageY - locationY - 80; // Position above message
                        setShowActionMenu({ message, x: pageX, y: adjustedY });
                        
                        // Animate menu appearance
                        actionMenuScale.setValue(0.8);
                        actionMenuOpacity.setValue(0);
                        Animated.parallel([
                          Animated.spring(actionMenuScale, {
                            toValue: 1,
                            useNativeDriver: true,
                            tension: 50,
                            friction: 7,
                          }),
                          Animated.timing(actionMenuOpacity, {
                            toValue: 1,
                            duration: 200,
                            useNativeDriver: true,
                          }),
                        ]).start();
                      }}
                      onPressOut={() => {
                        // Prevent any scroll when long press
                      }}
                    >
                    <View
                      style={[
                        styles.messageBubble,
                          isMe && styles.messageBubbleRightPadding, // Giảm padding bên phải cho text
                          !isMe && styles.messageBubbleLeftPadding, // Giảm padding bên trái cho text
                        isMe
                          ? [
                              styles.messageBubbleRight,
                                { backgroundColor: theme.primary || colors.primary } // Màu cam cho tin nhắn của mình
                            ]
                          : [
                              styles.messageBubbleLeft,
                                { backgroundColor: theme.card } // Màu trắng/xám cho tin nhắn người khác
                            ],
                      ]}
                    >
                  {/* Reply Preview */}
                  {message.replyToMessage && (
                    <TouchableOpacity
                      style={[
                        styles.replyPreview,
                        {
                          borderLeftColor: isMe ? 'rgba(255,255,255,0.5)' : theme.primary,
                          backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
                        },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        // Scroll to replied message - find message and scroll to it
                        const repliedIndex = messages.findIndex((m) => m._id === message.replyTo);
                        if (repliedIndex !== -1) {
                          // Use a ref to track message positions or just scroll to end and let user find it
                          // For now, just scroll to a position that should be near the message
                          setTimeout(() => {
                            scrollViewRef.current?.scrollTo({ y: repliedIndex * 100, animated: true });
                          }, 100);
                        }
                      }}
                    >
                      <View style={styles.replyPreviewContent}>
                        {message.replyToMessage.type === 'text' && (
                          <ThemedText
                            style={[
                              styles.replyPreviewText,
                              { color: isMe ? 'rgba(255,255,255,0.7)' : theme.textSecondary },
                            ]}
                            numberOfLines={1}
                          >
                            {message.replyToMessage.content}
                          </ThemedText>
                        )}
                        {message.replyToMessage.type === 'image' && (
                            <View style={styles.replyPreviewImageContainer}>
                              {message.replyToMessage.imageUrl ? (
                                <ExpoImage
                                  source={{ uri: message.replyToMessage.imageUrl }}
                                  style={styles.replyPreviewImage}
                                  contentFit="cover"
                                  cachePolicy="memory-disk"
                                />
                              ) : (
                                <View style={[styles.replyPreviewImagePlaceholder, { backgroundColor: theme.bg }]}>
                                  <Ionicons name="image-outline" size={16} color={theme.textSecondary} />
                                </View>
                              )}
                            </View>
                        )}
                        {message.replyToMessage.type === 'voice' && (
                            <View style={styles.replyPreviewVoiceContainer}>
                              <Ionicons name="mic-outline" size={14} color={isMe ? 'rgba(255,255,255,0.7)' : theme.textSecondary} />
                          <ThemedText
                            style={[
                              styles.replyPreviewText,
                              { color: isMe ? 'rgba(255,255,255,0.7)' : theme.textSecondary },
                            ]}
                          >
                                Tin nhắn thoại
                          </ThemedText>
                            </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}

                  {message.type === 'text' && (
                    <ThemedText
                      style={[
                        styles.messageText,
                        { color: isMe ? '#FFFFFF' : theme.text },
                      ]}
                      numberOfLines={0}
                    >
                      {message.content}
                    </ThemedText>
                  )}

                  {message.type === 'voice' && message.voiceUrl && (
                    <TouchableOpacity
                      style={styles.voiceMessage}
                      onPress={() => handlePlayVoice(message.voiceUrl!, message._id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name={playingVoiceId === message._id ? "pause" : "play"} 
                        size={20} 
                        color={isMe ? '#FFFFFF' : theme.primary} 
                      />
                      <View style={styles.voiceWaveform}>
                        {[8, 16, 12, 20, 10, 14, 18].map((height, index) => (
                          <View
                            key={index}
                            style={[
                              styles.waveBar,
                              {
                                height,
                                backgroundColor: playingVoiceId === message._id
                                  ? (isMe ? 'rgba(255,255,255,0.8)' : theme.primary)
                                  : (isMe ? 'rgba(255,255,255,0.5)' : theme.textSecondary),
                              },
                            ]}
                          />
                        ))}
                      </View>
                      <ThemedText
                        style={[
                          styles.voiceDuration,
                          { color: isMe ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        {message.voiceDuration
                          ? `${Math.floor(message.voiceDuration / 60)}:${String(Math.floor(message.voiceDuration % 60)).padStart(2, '0')}`
                          : '0:00'}
                      </ThemedText>
                    </TouchableOpacity>
                  )}

                    {message.type === 'text' || message.type === 'voice' ? (
                    <View style={styles.messageFooter}>
                      <ThemedText style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : theme.textSecondary }]}>
                        {formatTime(message.createdAt)}
                      </ThemedText>
                      {isMe && (
                        <View style={styles.messageFooterIcons}>
                          <View style={styles.messageStatusIcon}>
                            <Ionicons 
                              name="checkmark-done" 
                              size={12} 
                              color={isMe ? 'rgba(255,255,255,0.7)' : theme.textSecondary} 
                            />
                          </View>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => {
                              alertService.confirm(
                                'Bạn có chắc muốn thu hồi tin nhắn này?',
                                'Thu hồi tin nhắn',
                                () => handleDeleteMessage(message._id)
                              );
                            }}
                          >
                            <Ionicons 
                              name="trash-outline" 
                              size={14} 
                              color={isMe ? 'rgba(255,255,255,0.7)' : theme.textSecondary} 
                            />
                          </TouchableOpacity>
                    </View>
                  )}
                    </View>
                  ) : (
                    <View style={[styles.messageFooter, styles.messageFooterImage]}>
                      <ThemedText style={[styles.messageTime, { 
                        color: isMe 
                          ? 'rgba(255,255,255,0.9)' 
                          : (isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)') // Màu đậm hơn ở chế độ sáng
                      }]}>
                        {formatTime(message.createdAt)}
                      </ThemedText>
                      {isMe && (
                        <View style={styles.messageFooterIcons}>
                          <View style={styles.messageStatusIcon}>
                            <Ionicons 
                              name="checkmark-done" 
                              size={12} 
                              color={isMe ? 'rgba(255,255,255,0.9)' : theme.textSecondary} 
                            />
                          </View>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => {
                              alertService.confirm(
                                'Bạn có chắc muốn thu hồi tin nhắn này?',
                                'Thu hồi tin nhắn',
                                () => handleDeleteMessage(message._id)
                              );
                            }}
                          >
                            <Ionicons 
                              name="trash-outline" 
                              size={14} 
                              color={isMe ? 'rgba(255,255,255,0.9)' : theme.textSecondary} 
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                      </View>
                    </TouchableOpacity>

                    {/* Reactions - Below message bubble */}
                    {message.reactions && message.reactions.length > 0 && (
                      <View style={[
                        styles.reactionsContainer,
                        isMe ? styles.reactionsContainerRight : styles.reactionsContainerLeft
                      ]}>
                      {Object.entries(
                        message.reactions.reduce((acc: Record<string, string[]>, r) => {
                          if (!acc[r.emoji]) acc[r.emoji] = [];
                          acc[r.emoji].push(r.userName);
                          return acc;
                        }, {})
                      ).map(([emoji, users]) => (
                        <TouchableOpacity
                          key={emoji}
                          style={[
                            styles.reactionBadge,
                            {
                              backgroundColor: isMe ? 'rgba(255,255,255,0.25)' : theme.card,
                              borderWidth: 1,
                              borderColor: isMe ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)',
                            }
                          ]}
                          onPress={async () => {
                            try {
                              // Prevent scroll when reacting
                              const currentScrollY = scrollYRef.current;
                              
                              const response = await messageService.toggleReaction(message._id, emoji);
                              if (response.success) {
                                // Update reactions in state without reloading to prevent scroll
                                setMessages((prev) =>
                                  prev.map((msg) => {
                                    if (msg._id === message._id) {
                                      const userId = (user as any)?._id || (user as any)?.id || '';
                                      const currentReactions = msg.reactions || [];
                                      const existingIndex = currentReactions.findIndex(
                                        (r) => r.userId === userId && r.emoji === emoji
                                      );
                                      
                                      if (existingIndex >= 0) {
                                        // Remove reaction
                                        return {
                                          ...msg,
                                          reactions: currentReactions.filter((_, idx) => idx !== existingIndex),
                                        };
                                      } else {
                                        // Add reaction
                                        return {
                                          ...msg,
                                          reactions: [
                                            ...currentReactions,
                                            { userId, emoji, userName: (user as any)?.name || 'You' },
                                          ],
                                        };
                                      }
                                    }
                                    return msg;
                                  })
                                );
                                
                                // Restore scroll position
                                setTimeout(() => {
                                  scrollViewRef.current?.scrollTo({ y: currentScrollY, animated: false });
                                }, 50);
                              }
                            } catch (error: any) {
                              alertService.error(error.response?.data?.message || 'Không thể thêm cảm xúc', 'Lỗi');
                            }
                          }}
                        >
                          <ThemedText style={styles.reactionBadgeEmoji}>{emoji}</ThemedText>
                          <ThemedText style={[styles.reactionBadgeCount, { color: isMe ? 'rgba(255,255,255,0.9)' : theme.text }]}>
                            {users.length}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                      </View>
                    )}
                  </View>
                  )}
                </View>
              </View>
                </React.Fragment>
            );
            });
          })()}

          {/* Typing Indicator */}
          {isTyping && (
            <View style={[styles.messageWrapper, styles.messageWrapperLeft]}>
              <View style={styles.messageRow}>
                <View style={styles.messageAvatarContainer}>
                  {partner?.avatar ? (
                    <Image source={{ uri: partner.avatar }} style={styles.messageAvatar} />
                  ) : (
                    <View style={[styles.messageAvatar, styles.messageAvatarPlaceholder]}>
                      <Ionicons name="person" size={16} color={theme.textSecondary} />
                    </View>
                  )}
                </View>
                <View style={[styles.messageContentWrapper, styles.messageContentWrapperLeft]}>
                  <View style={[styles.messageBubble, styles.messageBubbleLeft, { backgroundColor: theme.card }]}>
                    <View style={styles.typingIndicator}>
                      <View style={[styles.typingDot, { backgroundColor: theme.textSecondary }]} />
                      <View style={[styles.typingDot, { backgroundColor: theme.textSecondary }]} />
                      <View style={[styles.typingDot, { backgroundColor: theme.textSecondary }]} />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Menu (Reply & Reactions) */}
        {showActionMenu && (
          <TouchableOpacity
            style={styles.actionMenuOverlay}
            activeOpacity={1}
            onPress={() => {
              // Animate menu disappearance
              Animated.parallel([
                Animated.timing(actionMenuScale, {
                  toValue: 0.8,
                  duration: 150,
                  useNativeDriver: true,
                }),
                Animated.timing(actionMenuOpacity, {
                  toValue: 0,
                  duration: 150,
                  useNativeDriver: true,
                }),
              ]).start(() => {
                setShowActionMenu(null);
              });
            }}
          >
            <Animated.View
              style={[
                styles.actionMenu,
                {
                  // For messages on the right (own messages), position menu to the left
                  // For messages on the left (other's messages), position menu to the right
                  left: showActionMenu?.message.senderId === ((user as any)?._id || (user as any)?.id || '')
                    ? Math.max((showActionMenu?.x || 0) - 200, 10) // Own message: menu to the left
                    : Math.min((showActionMenu?.x || 0) - 10, width - 200), // Other's message: menu to the right
                  top: Math.max((showActionMenu?.y || 0) - 120, 80),
                  backgroundColor: theme.card,
                  transform: [{ scale: actionMenuScale }],
                  opacity: actionMenuOpacity,
                },
              ]}
            >
              {/* Reactions Row */}
              <View style={styles.reactionsRow}>
                {REACTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reactionButton}
                    onPress={async () => {
                      try {
                        if (!showActionMenu) return;
                        
                        // Prevent scroll when reacting
                        const currentScrollY = scrollYRef.current;
                        const messageId = showActionMenu.message._id;
                        
                        // Close menu immediately for better UX
                        Animated.parallel([
                          Animated.timing(actionMenuScale, {
                            toValue: 0.8,
                            duration: 150,
                            useNativeDriver: true,
                          }),
                          Animated.timing(actionMenuOpacity, {
                            toValue: 0,
                            duration: 150,
                            useNativeDriver: true,
                          }),
                        ]).start(() => {
                          setShowActionMenu(null);
                        });
                        
                        const response = await messageService.toggleReaction(messageId, emoji);
                        if (response.success) {
                          // Update reactions in state without reloading to prevent scroll
                          setMessages((prev) =>
                            prev.map((msg) => {
                              if (msg._id === messageId) {
                                const userId = (user as any)?._id || (user as any)?.id || '';
                                const currentReactions = msg.reactions || [];
                                const existingIndex = currentReactions.findIndex(
                                  (r) => r.userId === userId && r.emoji === emoji
                                );
                                
                                if (existingIndex >= 0) {
                                  // Remove reaction
                                  return {
                                    ...msg,
                                    reactions: currentReactions.filter((_, idx) => idx !== existingIndex),
                                  };
                                } else {
                                  // Add reaction
                                  return {
                                    ...msg,
                                    reactions: [
                                      ...currentReactions,
                                      { userId, emoji, userName: (user as any)?.name || 'You' },
                                    ],
                                  };
                                }
                              }
                              return msg;
                            })
                          );
                          
                          // Restore scroll position
                          setTimeout(() => {
                            scrollViewRef.current?.scrollTo({ y: currentScrollY, animated: false });
                          }, 50);
                        }
                      } catch (error: any) {
                        alertService.error(error.response?.data?.message || 'Không thể thêm cảm xúc', 'Lỗi');
                      }
                    }}
                  >
                    <ThemedText style={styles.reactionEmoji}>{emoji}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Divider */}
              <View style={[styles.actionMenuDivider, { backgroundColor: theme.textSecondary + '20' }]} />

              {/* Reply Option */}
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => {
                  if (!showActionMenu) return;
                  
                  const messageToReply = showActionMenu.message;
                  
                  // Animate menu close
                  Animated.parallel([
                    Animated.timing(actionMenuScale, {
                      toValue: 0.8,
                      duration: 150,
                      useNativeDriver: true,
                    }),
                    Animated.timing(actionMenuOpacity, {
                      toValue: 0,
                      duration: 150,
                      useNativeDriver: true,
                    }),
                  ]).start(() => {
                    setShowActionMenu(null);
                    setReplyingTo(messageToReply);
                    // Focus input, show keyboard, and scroll to bottom
                    setTimeout(() => {
                      inputRef.current?.focus();
                      scrollToBottom();
                    }, 150);
                  });
                }}
              >
                <Ionicons name="arrow-undo" size={18} color={theme.primary} />
                <ThemedText style={[styles.actionMenuText, { color: theme.text }]}>
                  Trả lời
                </ThemedText>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        )}

        {/* Reply Preview Bar */}
        {replyingTo && (
          <View style={[styles.replyBar, { backgroundColor: theme.card }]}>
            <View style={styles.replyBarContent}>
              <View style={[styles.replyBarIndicator, { backgroundColor: theme.primary }]} />
              <View style={styles.replyBarInfo}>
                <ThemedText style={[styles.replyBarName, { color: theme.primary }]}>
                  Trả lời {replyingTo?.sender?.name || 'User'}
                </ThemedText>
                <ThemedText
                  style={[styles.replyBarText, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {replyingTo?.type === 'text'
                    ? (replyingTo?.content || '')
                    : replyingTo?.type === 'image'
                    ? 'Ảnh'
                    : 'Tin nhắn thoại'}
                </ThemedText>
              </View>
            </View>
            <TouchableOpacity
              style={styles.replyBarClose}
              onPress={() => {
                setReplyingTo(null);
                inputRef.current?.blur();
              }}
            >
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
          {isRecording ? (
            <>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <ThemedText style={styles.recordingText}>
                  {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
                </ThemedText>
              </View>
              <TouchableOpacity
                style={styles.cancelRecordingButton}
                onPress={async () => {
                  if (recording) {
                    try {
                      setIsRecording(false);
                      if (recordingIntervalRef.current) {
                        clearInterval(recordingIntervalRef.current);
                        recordingIntervalRef.current = null;
                      }
                      await recording.stopAndUnloadAsync();
                      setRecording(null);
                      setRecordingDuration(0);
                    } catch (error) {
                    }
                  }
                }}
              >
                <Ionicons name="close" size={24} color={colors.error || '#E63946'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendRecordingButton}
                onPress={handleStopRecording}
                disabled={sending || recordingDuration < 1}
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.attachButton} onPress={handlePickImage}>
                <Ionicons name="add" size={24} color={theme.text} />
              </TouchableOpacity>

              <TextInput
                ref={inputRef}
                style={[styles.input, { color: theme.text, backgroundColor: theme.bg }]}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Aa"
                placeholderTextColor={theme.textSecondary}
                multiline
                maxLength={1000}
              />

              <TouchableOpacity
                style={styles.voiceButton}
                onPressIn={handleStartRecording}
                onPressOut={handleStopRecording}
                disabled={sending}
              >
                <Ionicons name="mic" size={24} color={theme.text} />
              </TouchableOpacity>

              {inputText.trim().length > 0 ? (
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={() => handleSendMessage()}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.thumbsUpButton}
                  onPress={() => {
                    // Send thumbs up
                    if (partnerId && typeof partnerId === 'string') {
                      handleSendMessage('👍', 'text').catch(() => {});
                    }
                  }}
                >
                  <Ionicons name="thumbs-up-outline" size={24} color={theme.primary || colors.primary} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
        
        {/* Image Gallery Preview - Hiển thị khi chọn nhiều ảnh */}
        {selectedImages.length > 0 && (
          <View style={[styles.imageGalleryContainer, { backgroundColor: theme.card }]}>
            <View style={styles.imageGalleryHeader}>
              <ThemedText style={[styles.imageGalleryTitle, { color: theme.text }]}>
                {selectedImages.length} ảnh đã chọn
              </ThemedText>
              <TouchableOpacity
                onPress={() => setSelectedImages([])}
                style={styles.imageGalleryCloseButton}
              >
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.imageGalleryScroll}
              contentContainerStyle={styles.imageGalleryContent}
            >
              {selectedImages.map((uri, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.imageGalleryItem}
                  onPress={() => {
                    setImageGalleryIndex(index);
                    setSelectedImage(uri);
                  }}
                >
                  <ExpoImage
                    source={{ uri }}
                    style={styles.imageGalleryThumbnail}
                    contentFit="cover"
                  />
                  {index === 0 && (
                    <View style={styles.imageGalleryBadge}>
                      <ThemedText style={styles.imageGalleryBadgeText}>
                        {selectedImages.length}
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.sendGalleryButton, { backgroundColor: theme.primary || colors.primary }]}
              onPress={handleSendMultipleImages}
              disabled={sending}
            >
              <ThemedText style={styles.sendGalleryButtonText}>
                {sending ? 'Đang gửi...' : `Gửi ${selectedImages.length} ảnh`}
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Recent Media Section */}
        {showRecentMedia && recentMedia.length > 0 && (
          <View style={[styles.recentMediaContainer, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={styles.recentMediaHeader}
              onPress={() => setShowRecentMedia(!showRecentMedia)}
            >
              <ThemedText style={[styles.recentMediaTitle, { color: theme.text }]}>
                Gần đây
              </ThemedText>
              <Ionicons 
                name={showRecentMedia ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={theme.textSecondary} 
              />
            </TouchableOpacity>
            {showRecentMedia && (
              <View style={styles.recentMediaGrid}>
                {recentMedia.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.recentMediaItem}
                    onPress={() => {
                      if (item.type === 'image' && item.url) {
                        setSelectedImage(item.url);
                      }
                    }}
                  >
                    {item.type === 'image' && item.url ? (
                      <ExpoImage
                        source={{ uri: item.url }}
                        style={styles.recentMediaImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.recentMediaPlaceholder, { backgroundColor: theme.bg }]}>
                        <Ionicons name="mic" size={20} color={theme.textSecondary} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Image Viewer Modal */}
      {/* Modal xem ảnh đơn */}
      <Modal
        visible={selectedImage !== null && selectedImages.length === 0}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity
            style={styles.imageModalBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedImage(null)}
          >
            <View style={styles.imageModalContent}>
              {selectedImage && (
                <ExpoImage
                  source={{ uri: selectedImage }}
                  style={styles.fullImage}
                  contentFit="contain"
                />
              )}
              <TouchableOpacity
                style={styles.closeImageButton}
                onPress={() => setSelectedImage(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={40} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
      
      {/* Modal xem gallery ảnh - có thể swipe */}
      <Modal
        visible={selectedImage !== null && selectedImages.length > 0}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setSelectedImage(null);
          setSelectedImages([]);
        }}
      >
        <View style={styles.imageGalleryModalContainer}>
          <View style={styles.imageGalleryModalHeader}>
            <ThemedText style={styles.imageGalleryModalTitle}>
              {imageGalleryIndex + 1} / {selectedImages.length}
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                setSelectedImage(null);
                setSelectedImages([]);
              }}
              style={styles.imageGalleryModalCloseButton}
              >
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          <FlatList
            data={selectedImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            initialScrollIndex={imageGalleryIndex}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setImageGalleryIndex(index);
              setSelectedImage(selectedImages[index]);
            }}
            renderItem={({ item }) => (
              <View style={styles.imageGalleryModalItem}>
                <ExpoImage
                  source={{ uri: item }}
                  style={styles.imageGalleryModalImage}
                  contentFit="contain"
                />
              </View>
            )}
          />
        </View>
      </Modal>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.profileModalContainer}>
          <TouchableOpacity
            style={styles.profileModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowProfileModal(false)}
          />
          <View style={[styles.profileModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.profileModalHeader}>
              <ThemedText style={[styles.profileModalTitle, { color: theme.text }]}>
                Thông tin
              </ThemedText>
              <TouchableOpacity
                onPress={() => setShowProfileModal(false)}
                style={styles.profileModalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
            </View>

            {loadingProfile ? (
              <View style={styles.profileModalLoading}>
                <ActivityIndicator size="large" color={theme.primary || colors.primary} />
              </View>
            ) : partnerProfile ? (
              <ScrollView style={styles.profileModalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.profileModalAvatarContainer}>
                  {partnerProfile.avatar ? (
                    <Image
                      source={{ uri: partnerProfile.avatar }}
                      style={styles.profileModalAvatar}
                    />
                  ) : (
                    <View style={[styles.profileModalAvatar, styles.profileModalAvatarPlaceholder]}>
                      <Ionicons name="person" size={60} color={theme.textSecondary} />
                    </View>
                  )}
                  <View style={styles.profileModalOnlineStatus}>
                    <View
                      style={[
                        styles.profileModalOnlineDot,
                        { backgroundColor: isOnline ? '#4CAF50' : '#9E9E9E' },
                      ]}
                    />
                  </View>
                </View>

                <ThemedText style={[styles.profileModalName, { color: theme.text }]}>
                  {partnerProfile.name || 'Chưa có tên'}
                </ThemedText>

                {partnerProfile.bio && (
                  <View style={styles.profileModalSection}>
                    <ThemedText style={[styles.profileModalSectionTitle, { color: theme.textSecondary }]}>
                      Giới thiệu
                    </ThemedText>
                    <ThemedText style={[styles.profileModalSectionContent, { color: theme.text }]}>
                      {partnerProfile.bio}
                    </ThemedText>
                  </View>
                )}

                {partnerProfile.phone && (
                  <View style={styles.profileModalSection}>
                    <ThemedText style={[styles.profileModalSectionTitle, { color: theme.textSecondary }]}>
                      Số điện thoại
                    </ThemedText>
                    <ThemedText style={[styles.profileModalSectionContent, { color: theme.text }]}>
                      {partnerProfile.phone}
                    </ThemedText>
                  </View>
                )}

                {partnerProfile.email && (
                  <View style={styles.profileModalSection}>
                    <ThemedText style={[styles.profileModalSectionTitle, { color: theme.textSecondary }]}>
                      Email
                    </ThemedText>
                    <ThemedText style={[styles.profileModalSectionContent, { color: theme.text }]}>
                      {partnerProfile.email}
                    </ThemedText>
                  </View>
                )}

                {partnerProfile.role && (
                  <View style={styles.profileModalSection}>
                    <ThemedText style={[styles.profileModalSectionTitle, { color: theme.textSecondary }]}>
                      Vai trò
                    </ThemedText>
                    <ThemedText style={[styles.profileModalSectionContent, { color: theme.text }]}>
                      {partnerProfile.role === 'chef' ? 'Đầu bếp' : 'Người dùng'}
                    </ThemedText>
                  </View>
                )}

                {partnerProfile.createdAt && (
                  <View style={styles.profileModalSection}>
                    <ThemedText style={[styles.profileModalSectionTitle, { color: theme.textSecondary }]}>
                      Tham gia từ
                    </ThemedText>
                    <ThemedText style={[styles.profileModalSectionContent, { color: theme.text }]}>
                      {new Date(partnerProfile.createdAt).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </ThemedText>
                  </View>
                )}
              </ScrollView>
            ) : (
              <View style={styles.profileModalEmpty}>
                <Ionicons name="person-outline" size={64} color={theme.textSecondary} />
                <ThemedText style={[styles.profileModalEmptyText, { color: theme.textSecondary }]}>
                  Không thể tải thông tin
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Search Modal */}
      <Modal
        visible={showSearch}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowSearch(false);
          setSearchQuery('');
          setFilteredMessages([]);
        }}
      >
        <View style={styles.searchModalContainer}>
          <View style={[styles.searchModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.searchModalHeader}>
              <View style={[styles.searchInputContainer, { backgroundColor: theme.bg }]}>
                <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Tìm kiếm trong cuộc trò chuyện..."
                  placeholderTextColor={theme.textSecondary}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    if (text.trim().length > 0) {
                      const filtered = messages.filter((msg) => {
                        const searchLower = text.toLowerCase();
                        return (
                          msg.content?.toLowerCase().includes(searchLower) ||
                          msg.sender?.name?.toLowerCase().includes(searchLower) ||
                          msg.receiver?.name?.toLowerCase().includes(searchLower)
                        );
                      });
                      setFilteredMessages(filtered);
                    } else {
                      setFilteredMessages([]);
                    }
                  }}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setFilteredMessages([]);
                    }}
                    style={styles.searchClearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                  setFilteredMessages([]);
                }}
                style={styles.searchCloseButton}
              >
                <ThemedText style={[styles.searchCloseButtonText, { color: theme.primary || colors.primary }]}>
                  Đóng
                </ThemedText>
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredMessages}
              keyExtractor={(item) => item._id}
              style={styles.searchResultsList}
              contentContainerStyle={styles.searchResultsContent}
              renderItem={({ item }) => {
                const userId = (user as any)?._id || (user as any)?.id || '';
                const isMe = item.senderId === userId;
                return (
                  <TouchableOpacity
                    style={[styles.searchResultItem, { backgroundColor: theme.bg }]}
                    onPress={() => {
                      // Scroll to message (would need to implement scroll to message functionality)
                      setShowSearch(false);
                      setSearchQuery('');
                      setFilteredMessages([]);
                    }}
                  >
                    <View style={styles.searchResultContent}>
                      <ThemedText
                        style={[styles.searchResultSender, { color: theme.textSecondary }]}
                        numberOfLines={1}
                      >
                        {isMe ? 'Bạn' : item.sender?.name || 'Người dùng'}
                      </ThemedText>
                      <ThemedText
                        style={[styles.searchResultText, { color: theme.text }]}
                        numberOfLines={2}
                      >
                        {item.content || (item.type === 'image' ? '📷 Ảnh' : item.type === 'voice' ? '🎤 Tin nhắn thoại' : '')}
                      </ThemedText>
                      <ThemedText
                        style={[styles.searchResultTime, { color: theme.textSecondary }]}
                        numberOfLines={1}
                      >
                        {new Date(item.createdAt).toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                searchQuery.length > 0 ? (
                  <View style={styles.searchEmptyContainer}>
                    <Ionicons name="search-outline" size={48} color={theme.textSecondary} />
                    <ThemedText style={[styles.searchEmptyText, { color: theme.textSecondary }]}>
                      Không tìm thấy kết quả
                    </ThemedText>
                  </View>
                ) : (
                  <View style={styles.searchEmptyContainer}>
                    <Ionicons name="search-outline" size={48} color={theme.textSecondary} />
                    <ThemedText style={[styles.searchEmptyText, { color: theme.textSecondary }]}>
                      Nhập từ khóa để tìm kiếm
                    </ThemedText>
                  </View>
                )
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingRight: 0, // Không có padding bên phải
    marginRight: 0, // Không có margin bên phải
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerAvatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerStatus: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  messageAvatarContainer: {
    marginRight: 8,
    marginLeft: 8, // Lùi cách mép trái một chút để đẹp hơn
    width: 32,
    height: 32,
    justifyContent: 'flex-end', // Align avatar với bottom của bubble
    alignItems: 'flex-start',
    paddingBottom: 2, // Điều chỉnh nhẹ để align với bubble
  },
  messageAvatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageStatusIcon: {
    marginLeft: 4,
  },
  deleteButton: {
    marginLeft: 6,
    padding: 4,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    backgroundColor: 'transparent',
  },
  headerMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    right: 12,
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },
  headerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerMenuItemText: {
    fontSize: 16,
  },
  chatContainer: {
    flex: 1,
    paddingLeft: 0, // Không có padding bên trái
    paddingRight: 0, // Không có padding bên phải
  },
  messagesContainer: {
    flex: 1,
    paddingLeft: 0, // Không có padding bên trái
    paddingRight: 0, // Không có padding bên phải
  },
  messagesContent: {
    paddingLeft: 0, // Sát bên trái hoàn toàn cho tin nhắn người khác
    paddingRight: 0, // Không có padding bên phải để tin nhắn sát góc
    paddingTop: 16,
    paddingBottom: 20,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B7355',
    backgroundColor: '#F0E6DC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageWrapper: {
    marginBottom: 8, // Tăng khoảng cách giữa các tin nhắn
    width: '100%',
    paddingRight: 0, // Không có padding bên phải
    marginRight: 0, // Không có margin bên phải
  },
  messageWrapperImage: {
    marginBottom: 6, // Khoảng cách cho ảnh (ít hơn text một chút nhưng vẫn đủ)
  },
  messageWrapperLeft: {
    alignItems: 'flex-start',
    paddingLeft: 0, // Sát bên trái
    marginLeft: 0, // Không có margin bên trái
  },
  messageWrapperRight: {
    alignItems: 'flex-end',
    paddingRight: 0, // Sát hẳn bên phải
    marginRight: 0, // Không có margin bên phải
    paddingLeft: 0,
    marginLeft: 0,
    width: '100%', // Đảm bảo chiếm toàn bộ width
    flexShrink: 0, // Không co lại
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Align avatar với bottom của bubble
    width: '100%',
    paddingLeft: 0, // Sát bên trái
    paddingRight: 0, // Sát bên phải
    marginLeft: 0, // Không có margin bên trái
    marginRight: 0, // Không có margin bên phải
    gap: 0, // Không có gap giữa các items
  },
  messageRowLeft: {
    justifyContent: 'flex-start', // Đảm bảo sát bên trái
    paddingLeft: 0,
    marginLeft: 0,
  },
  messageRowRight: {
    justifyContent: 'flex-end', // Đảm bảo sát bên phải
    alignItems: 'flex-end', // Align items về bên phải
    paddingRight: 0, // SÁT GÓC PHẢI
    marginRight: 0, // SÁT GÓC PHẢI
    paddingLeft: 0,
    marginLeft: 0,
    width: '100%', // Đảm bảo chiếm toàn bộ width
    flexShrink: 0, // Không co lại
    gap: 0, // Không có gap
  },
  messageContentWrapper: {
    flex: 1,
    flexDirection: 'column', // Column để reactions nằm dưới bubble
  },
  messageContentWrapperLeft: {
    alignItems: 'flex-start', // Align items về bên trái
    paddingLeft: 0, // Sát bên trái hoàn toàn
    paddingRight: 50, // Khoảng cách bên phải cho tin nhắn bên trái
    marginLeft: 8, // Lùi cách mép trái một chút để đẹp hơn
    marginRight: 0, // Không có margin bên phải
  },
  messageContentWrapperRight: {
    alignItems: 'flex-end', // Align items về bên phải
    paddingLeft: 50, // Khoảng cách bên trái cho tin nhắn của mình
    paddingRight: 0, // Sát hẳn bên phải
    marginRight: 0, // Không có margin bên phải
  },
  messageContentWrapperRightImage: {
    // Style riêng cho ảnh bên phải - không có paddingLeft để sát góc phải
    paddingLeft: 0,
    marginRight: 0,
  },
  messageContentWrapperLeftImage: {
    // Style riêng cho ảnh bên trái - giữ marginLeft để thẳng hàng với text
    marginLeft: 8,
  },
  messageBubbleContainer: {
    maxWidth: width * 0.75, // Max width đến đường kẻ dọc
  },
  messageBubbleContainerLeft: {
    alignSelf: 'flex-start', // Align về bên trái cho tin nhắn người khác
    marginLeft: 0, // Sát hẳn bên trái
    paddingLeft: 0, // Không có padding bên trái
    marginRight: 0,
  },
  messageBubbleContainerRight: {
    alignSelf: 'flex-end', // Align về bên phải cho tin nhắn của mình
    marginRight: 0, // Sát hẳn bên phải
    paddingRight: 0, // Không có padding bên phải
    marginLeft: 0,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageAvatarSpacer: {
    width: 32,
    height: 32,
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20, // Bo góc mềm mại hơn
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
    position: 'relative',
    zIndex: 1, // Above reactions
    maxWidth: width * 0.75, // Max 75% width - đến đường kẻ dọc
    minWidth: 50,
    alignSelf: 'flex-start', // Default align left
    marginRight: 0, // Không có margin bên phải
    marginLeft: 0, // Không có margin bên trái
  },
  messageBubbleWithImage: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 20, // Bo góc mềm mại hơn cho bubble chứa ảnh
  },
  messageBubbleRightPadding: {
    paddingRight: 8, // Giảm padding bên phải cho tin nhắn text của mình
  },
  messageBubbleLeftPadding: {
    paddingLeft: 12, // Padding bên trái cho text
  },
  messageBubbleLeft: {
    borderBottomLeftRadius: 20, // Bo góc đều cho cả 4 góc
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    alignSelf: 'flex-start', // Align left for other's messages
    backgroundColor: 'transparent', // Sẽ được override bởi inline style
    marginLeft: 0, // Sát bên trái
  },
  messageBubbleLeftWithImage: {
    borderRadius: 20, // Bo góc đều cho cả 4 góc của ảnh bên trái
    borderBottomLeftRadius: 20, // Đảm bảo góc dưới bên trái cũng được bo
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  messageBubbleRight: {
    borderBottomRightRadius: 6, // Bo góc mềm mại hơn
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    alignSelf: 'flex-end', // Align right for own messages
    marginRight: 0, // Sát bên phải
    maxWidth: width * 0.75, // Max width đến đường kẻ dọc
    paddingRight: 4, // Giảm padding bên phải để text sát hơn (từ 12 xuống 4)
    backgroundColor: 'transparent', // Sẽ được override bởi inline style với theme.primary
  },
  messageBubbleRightWithImage: {
    borderRadius: 20, // Bo góc mềm mại hơn cho ảnh bên phải
    borderBottomRightRadius: 6, // Bo góc mềm mại hơn
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    flexShrink: 1,
  },
  messageImageContainer: {
    maxWidth: width * 0.8, // Tăng max width để ảnh rộng hơn
    paddingRight: 0, // Không có padding bên phải
    marginRight: 0, // Không có margin bên phải
    paddingLeft: 0,
    marginLeft: 0,
    position: 'relative', // Để footer absolute hoạt động đúng
    flexShrink: 0, // Không co lại
  },
  messageImageTouchable: {
    width: '100%',
    marginRight: 0,
    paddingRight: 0,
    marginLeft: 0,
    paddingLeft: 0,
  },
  messageImageContainerLeft: {
    alignSelf: 'flex-start', // Sát bên trái
    marginLeft: 8, // Lùi cách mép trái một chút để thẳng hàng với text
    paddingLeft: 0,
    marginRight: 0,
  },
  messageImageContainerRight: {
    alignSelf: 'flex-end', // Sát bên phải
    marginRight: 0, // SÁT GÓC PHẢI MÀN HÌNH - KHÔNG CÓ KHOẢNG TRỐNG
    paddingRight: 0, // KHÔNG CÓ PADDING
    marginLeft: 0, // KHÔNG CÓ MARGIN LEFT - SÁT GÓC PHẢI
    paddingLeft: 0,
    width: width * 0.75, // Width khớp với tin nhắn text
    maxWidth: width * 0.75, // Max width khớp với tin nhắn text
    alignItems: 'flex-end', // Align items về bên phải
    flexShrink: 0, // Không co lại
    flexGrow: 0, // Không mở rộng
  },
  messageImage: {
    width: '100%', // Luôn fill 100% width của container để không có khoảng trống
    maxWidth: width * 0.75, // Max width khớp với tin nhắn text
    minHeight: 200, // Chiều cao tối thiểu
    maxHeight: 400, // Giới hạn chiều cao tối đa
    borderRadius: 20, // Bo góc mềm mại hơn, đồng bộ với bubble
    overflow: 'hidden',
    backgroundColor: 'transparent',
    position: 'relative', // Để footer absolute hoạt động đúng
  },
  messageImageLeft: {
    alignSelf: 'flex-start', // Sát bên trái
    width: width * 0.75, // Width bằng maxWidth để thẳng hàng với text
  },
  messageImageRight: {
    alignSelf: 'flex-end', // Sát bên phải
    width: '100%', // Luôn fill 100% width của container
    marginRight: 0, // SÁT GÓC PHẢI MÀN HÌNH - KHÔNG CÓ MARGIN
    paddingRight: 0, // KHÔNG CÓ PADDING
    marginLeft: 0,
    paddingLeft: 0,
  },
  voiceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveBar: {
    width: 3,
    backgroundColor: 'currentColor',
    borderRadius: 2,
  },
  voiceDuration: {
    fontSize: 12,
    marginLeft: 4,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Time bên trái, icons bên phải
    marginTop: 4,
  },
  messageFooterIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto', // Đẩy sang góc phải
  },
  messageFooterImage: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Tăng độ đậm để dễ nhìn hơn
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    zIndex: 10, // Đảm bảo hiển thị trên ảnh
  },
  messageTime: {
    fontSize: 11,
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  attachButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  thumbsUpButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonRecording: {
    backgroundColor: '#FF6B35',
    borderRadius: 20,
  },
  recordingIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B35',
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
  cancelRecordingButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendRecordingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  imageModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullImage: {
    width: width,
    height: '100%',
  },
  closeImageButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    width: 44,
    height: 44,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  // Image Gallery Styles
  imageGalleryContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  imageGalleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageGalleryTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  imageGalleryCloseButton: {
    padding: 4,
  },
  imageGalleryScroll: {
    maxHeight: 120,
  },
  imageGalleryContent: {
    gap: 8,
    paddingRight: 12,
  },
  imageGalleryItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    position: 'relative',
  },
  imageGalleryThumbnail: {
    width: '100%',
    height: '100%',
  },
  imageGalleryBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  imageGalleryBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sendGalleryButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  sendGalleryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Image Gallery Modal Styles
  imageGalleryModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  imageGalleryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  imageGalleryModalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imageGalleryModalCloseButton: {
    padding: 4,
  },
  imageGalleryModalItem: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageGalleryModalImage: {
    width: width,
    height: '100%',
  },
  // Image Grid Styles - Hiển thị nhiều ảnh gộp lại
  imageGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    width: width * 0.75,
    borderRadius: 20,
    overflow: 'hidden',
  },
  imageGridItem: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  imageGridItemSingle: {
    width: '100%',
    aspectRatio: 1,
  },
  imageGridItemTwo: {
    width: '49%',
    aspectRatio: 1,
  },
  imageGridItemThreeFirst: {
    width: '100%',
    aspectRatio: 2,
  },
  imageGridItemThreeRest: {
    width: '49%',
    aspectRatio: 1,
  },
  imageGridItemFour: {
    width: '49%',
    aspectRatio: 1,
  },
  imageGridImage: {
    width: '100%',
    height: '100%',
  },
  imageGridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageGridOverlayText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  replyBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  replyBarIndicator: {
    width: 3,
    height: 40,
    borderRadius: 2,
  },
  replyBarInfo: {
    flex: 1,
  },
  replyBarName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyBarText: {
    fontSize: 12,
  },
  replyBarClose: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 4,
    gap: 4,
    maxWidth: '85%', // Giới hạn width để text không bị cắt
    flexShrink: 1, // Cho phép co lại nếu cần
  },
  replyIndicatorLeft: {
    alignSelf: 'flex-start', // Sát bên trái
    marginLeft: 0,
  },
  replyIndicatorRight: {
    alignSelf: 'flex-end', // Sát bên phải
    marginRight: -120, // Giảm margin để không bị lấp
    paddingRight: 0, // Không thụt vào
  },
  replyIndicatorIcon: {
    marginRight: 2,
  },
  replyIndicatorText: {
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1, // Cho phép text chiếm không gian còn lại
    flexShrink: 1, // Cho phép co lại nếu cần
    ...Platform.select({
      android: {
        includeFontPadding: false, // Giảm padding trên Android để text vừa khít
      },
    }),
  },
  replyPreview: {
    padding: 8,
    paddingLeft: 0, // Sát bên trái
    borderRadius: 8,
    marginBottom: 8,
    marginLeft: 0, // Sát bên trái
    borderLeftWidth: 3,
  },
  replyPreviewForImage: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    zIndex: 10,
    borderRadius: 8,
  },
  replyPreviewContent: {
    gap: 2,
  },
  replyPreviewImageContainer: {
    width: '100%',
    alignSelf: 'stretch',
  },
  replyPreviewImage: {
    width: '100%',
    height: 60, // Chiều cao cố định
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0', // Background cho ảnh
  },
  replyPreviewImagePlaceholder: {
    width: '100%',
    height: 60, // Chiều cao cố định
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyPreviewVoiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyPreviewName: {
    fontSize: 12,
    fontWeight: '600',
  },
  replyPreviewText: {
    fontSize: 11,
  },
  actionMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  actionMenu: {
    position: 'absolute',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    minWidth: 120,
    maxWidth: 160,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  actionMenuText: {
    fontSize: 14,
    fontWeight: '500',
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 4,
  },
  reactionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  reactionEmoji: {
    fontSize: 18,
  },
  actionMenuDivider: {
    height: 1,
    marginVertical: 4,
    marginHorizontal: 8,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    marginBottom: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    minHeight: 20,
    position: 'relative', // Ensure it's in normal flow, not absolute
    zIndex: 0, // Below everything
    width: '100%', // Chiếm full width của container
  },
  reactionsContainerLeft: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    paddingLeft: 0,
    marginTop: 4,
    marginLeft: 0, // Không cần marginLeft vì đã nằm trong column
  },
  reactionsContainerRight: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    paddingRight: 0,
    marginTop: 4,
    marginRight: 0, // Không cần marginRight
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
    minHeight: 20,
  },
  reactionBadgeEmoji: {
    fontSize: 13,
  },
  reactionBadgeCount: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 1,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.4,
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickActionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentMediaContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  recentMediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recentMediaTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentMediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentMediaItem: {
    width: (width - 48) / 4, // 4 cột với padding và gap
    height: (width - 48) / 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  recentMediaImage: {
    width: '100%',
    height: '100%',
  },
  recentMediaPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  // Profile Modal Styles
  profileModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  profileModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  profileModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  profileModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  profileModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileModalCloseButton: {
    padding: 4,
  },
  profileModalLoading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileModalBody: {
    paddingHorizontal: 20,
  },
  profileModalAvatarContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  profileModalAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  profileModalAvatarPlaceholder: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalOnlineStatus: {
    position: 'absolute',
    bottom: 0,
    right: width * 0.5 - 60,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalOnlineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  profileModalName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  profileModalSection: {
    marginBottom: 20,
  },
  profileModalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  profileModalSectionContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  profileModalEmpty: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileModalEmptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  // Search Modal Styles
  searchModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  searchModalContent: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 50 : 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchClearButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  searchCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchResultsList: {
    flex: 1,
  },
  searchResultsContent: {
    padding: 16,
  },
  searchResultItem: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  searchResultContent: {
    gap: 4,
  },
  searchResultSender: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultText: {
    fontSize: 16,
    marginVertical: 4,
  },
  searchResultTime: {
    fontSize: 12,
  },
  searchEmptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  searchEmptyText: {
    marginTop: 16,
    fontSize: 16,
  },
});


