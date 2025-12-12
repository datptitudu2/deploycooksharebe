import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface YouTubePlayerProps {
  videoId: string;
  title: string;
  thumbnail?: string;
  url: string;
}

export function YouTubePlayer({ videoId, title, thumbnail, url }: YouTubePlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const openInYouTubeApp = async () => {
    setIsLoading(true);
    try {
      // Try to open in YouTube app first
      const youtubeAppUrl = `vnd.youtube:${videoId}`;
      const canOpen = await Linking.canOpenURL(youtubeAppUrl);
      
      if (canOpen) {
        await Linking.openURL(youtubeAppUrl);
      } else {
        // Nếu không có YouTube app, vẫn mở YouTube trong browser (không phải URL thông thường)
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening YouTube app:', error);
      // Fallback to YouTube URL in browser
      await Linking.openURL(url);
    } finally {
      setIsLoading(false);
    }
  };

  const openInBrowser = async () => {
    setIsLoading(true);
    try {
      // Luôn mở trong browser (không thử YouTube app)
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening browser:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;

  return (
    <ThemedView style={[styles.container, { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5' }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <MaterialIcons name="play-circle-filled" size={20} color={colors.primary} />
          <ThemedText style={styles.title} numberOfLines={2}>
            {title}
          </ThemedText>
        </View>
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.expandButton}
        >
          <MaterialIcons
            name={isExpanded ? 'expand-less' : 'expand-more'}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      {isExpanded ? (
        <View style={styles.expandedContent}>
          {/* YouTube Embed - Using WebView would require react-native-webview package */}
          {/* For now, show thumbnail with play button */}
          <TouchableOpacity
            style={styles.videoContainer}
            onPress={openInYouTubeApp}
            disabled={isLoading}
          >
            {thumbnail ? (
              <Image
                source={{ uri: thumbnail }}
                style={styles.thumbnail}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
                <MaterialIcons name="video-library" size={48} color={colors.text} />
              </View>
            )}
            <View style={styles.playButtonOverlay}>
              <View style={[styles.playButton, { backgroundColor: colors.primary }]}>
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <MaterialIcons name="play-arrow" size={32} color="#FFFFFF" />
                )}
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={openInYouTubeApp}
              disabled={isLoading}
            >
              <MaterialIcons name="play-circle-outline" size={20} color="#FFFFFF" />
              <ThemedText style={styles.actionButtonText}>
                {isLoading ? 'Đang mở...' : 'Mở YouTube App'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.collapsedContent}
          onPress={() => setIsExpanded(true)}
        >
          {thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              style={styles.collapsedThumbnail}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.collapsedThumbnail, styles.placeholderThumbnail]}>
              <MaterialIcons name="video-library" size={32} color={colors.text} />
            </View>
          )}
          <View style={styles.collapsedInfo}>
            <ThemedText style={styles.collapsedTitle} numberOfLines={1}>
              {title}
            </ThemedText>
            <ThemedText style={styles.collapsedSubtitle}>
              Nhấn để xem video
            </ThemedText>
          </View>
          <MaterialIcons name="play-arrow" size={24} color={colors.primary} />
        </TouchableOpacity>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  expandButton: {
    padding: 4,
  },
  expandedContent: {
    padding: 12,
    paddingTop: 0,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 12,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    backgroundColor: '#2C2C2C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  collapsedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingTop: 0,
    gap: 12,
  },
  collapsedThumbnail: {
    width: 80,
    height: 60,
    borderRadius: 6,
  },
  collapsedInfo: {
    flex: 1,
  },
  collapsedTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  collapsedSubtitle: {
    fontSize: 11,
    opacity: 0.7,
  },
});

