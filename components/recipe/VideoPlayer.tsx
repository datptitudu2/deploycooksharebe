import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Platform, Linking, Animated, StatusBar } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';

interface VideoPlayerProps {
  videoUrl: string;
  title?: string;
  onClose?: () => void;
}

/**
 * Extract YouTube video ID from URL
 */
const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

/**
 * Check if URL is YouTube
 */
const isYouTubeUrl = (url: string): boolean => {
  return /youtube\.com|youtu\.be/.test(url);
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, title, onClose }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);

  const handleOpenInYouTube = React.useCallback(async () => {
    try {
      // Only for YouTube URLs - open in YouTube app
      if (isYouTubeUrl(videoUrl)) {
        // Try to open in YouTube app
        const youtubeId = extractYouTubeId(videoUrl);
        if (youtubeId) {
          // Try YouTube app URL scheme first (vnd.youtube:VIDEO_ID)
          const youtubeAppUrl = `vnd.youtube:${youtubeId}`;
          
          // Check if YouTube app is available
          const canOpen = await Linking.canOpenURL(youtubeAppUrl);
          if (canOpen) {
            // Open in YouTube app directly - no alert
            await Linking.openURL(youtubeAppUrl);
          } else {
            // Fallback: try https://www.youtube.com/watch?v=VIDEO_ID format
            // This will open in browser if app not available, but might prompt user
            const fallbackUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
            await Linking.openURL(fallbackUrl);
          }
        } else {
          // If we can't extract ID, just open the original URL
          await Linking.openURL(videoUrl);
        }
        // Close modal immediately after opening (no delay)
        if (onClose) {
          onClose();
        }
      }
    } catch (error) {
      // Silent fail - just close modal
      if (onClose) {
        onClose();
      }
    }
  }, [videoUrl, onClose]);

  // Handle orientation changes
  useEffect(() => {
    // Unlock orientation to allow rotation
    ScreenOrientation.unlockAsync().catch(() => {});

    const updateDimensions = ({ screen }: { screen: { width: number; height: number } }) => {
      // Check if landscape (width > height)
      setIsLandscape(screen.width > screen.height);
    };

    // Initial check
    const initialDims = Dimensions.get('screen');
    setIsLandscape(initialDims.width > initialDims.height);

    const subscription = Dimensions.addEventListener('change', updateDimensions);

    return () => {
      subscription?.remove();
      // Lock back to portrait when component unmounts
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  useEffect(() => {
    // Set audio mode to allow playback with sound - CRITICAL for audio
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true, // Play sound even in silent mode - CRITICAL
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch((error) => {
      console.error('Error setting audio mode:', error);
    });

    // Validate video URL
    if (!videoUrl || !videoUrl.trim()) {
      setError('URL video không hợp lệ');
      setIsLoading(false);
      return;
    }

    // Check if it's a local file path (file://) - not supported for direct playback
    // User should upload video first, then we get HTTP/HTTPS URL from server
    if (videoUrl.startsWith('file://')) {
      setError('Video từ thiết bị cần được upload lên server trước. Vui lòng thử lại sau khi upload.');
      setIsLoading(false);
      return;
    }

    // If it's a YouTube URL, auto-open in YouTube app (NOT browser)
    if (isYouTubeUrl(videoUrl)) {
      handleOpenInYouTube();
      return;
    }

    // Direct video URL (uploaded videos from server) - validate it's a proper HTTP/HTTPS URL
    if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
      setError('URL video phải là HTTP hoặc HTTPS');
      setIsLoading(false);
      return;
    }
    
    // Try to play direct video (uploaded videos from user's device) - IN APP with sound
    setIsYouTube(false);
    setIsLoading(true);
    setError(null); // Clear any previous errors
  }, [videoUrl, handleOpenInYouTube]);

  const handlePlaybackStatusUpdate = async (status: AVPlaybackStatus) => {
    setStatus(status);
    if (status.isLoaded) {
      setIsLoading(false);
      // Video loaded successfully - can play with sound
      const audioInfo: any = {
        durationMillis: status.durationMillis,
        isPlaying: status.isPlaying,
        isMuted: status.isMuted,
        volume: status.volume,
      };
      
      // Check if video has audio track (if available in status)
      if ('hasAudio' in status) {
        audioInfo.hasAudio = (status as any).hasAudio;
        if (!(status as any).hasAudio) {
          setError('Video này không có âm thanh. Vui lòng kiểm tra lại file video.');
          return;
        }
      }
      
      // Check if video has audio track (if available)
      if ('hasAudio' in status && !(status as any).hasAudio) {
        setError('Video này không có âm thanh. Vui lòng kiểm tra lại file video.');
        return;
      }
      
      // Clear any previous errors when video loads successfully
      if (error) {
        setError(null);
      }
      
      // CRITICAL: Ensure audio is enabled - check and fix every time
      if (videoRef.current) {
        try {
          await Audio.setIsEnabledAsync(true);
          if (status.isMuted) {
            await videoRef.current.setIsMutedAsync(false);
          }
          if (status.volume !== 1.0) {
            await videoRef.current.setVolumeAsync(1.0);
          }
        } catch (audioError) {
          // Silent fail
        }
      }
      } else {
        // Handle error state - only set error if it's a real error
        const errorMessage = status.error || '';
        if (errorMessage) {
          setIsLoading(false);
          setError('Lỗi phát video: ' + errorMessage);
        }
      }
  };

  // YouTube Embed
  if (isYouTube && youtubeId) {
    const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
    
    return (
      <View style={styles.container}>
        {Platform.OS === 'android' && (
          <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
        )}
        {onClose && (
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={
                colorScheme === 'dark'
                  ? ['rgba(255, 107, 53, 0.9)', 'rgba(255, 184, 77, 0.9)']
                  : ['rgba(255, 107, 53, 0.95)', 'rgba(255, 184, 77, 0.95)']
              }
              style={styles.closeButtonGradient}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
        <View style={styles.videoWrapper}>
          <WebView
            source={{ uri: embedUrl }}
            style={styles.webView}
            allowsFullscreenVideo={false}
            mediaPlaybackRequiresUserAction={false}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
          />
        </View>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <LinearGradient
              colors={
                colorScheme === 'dark'
                  ? ['rgba(13, 13, 26, 0.95)', 'rgba(26, 26, 46, 0.95)']
                  : ['rgba(255, 248, 240, 0.95)', 'rgba(255, 255, 255, 0.95)']
              }
              style={styles.loadingGradient}
            >
              <ActivityIndicator size="large" color={colors.primary} />
              <ThemedText style={[styles.loadingText, { color: colors.text }]}>
                Đang tải video...
              </ThemedText>
            </LinearGradient>
          </View>
        )}
      </View>
    );
  }

  // Direct Video Playback
  return (
    <View style={styles.container}>
      {Platform.OS === 'android' && (
        <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
      )}
      {onClose && (
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={onClose}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={
              colorScheme === 'dark'
                ? ['rgba(255, 107, 53, 0.9)', 'rgba(255, 184, 77, 0.9)']
                : ['rgba(255, 107, 53, 0.95)', 'rgba(255, 184, 77, 0.95)']
            }
            style={styles.closeButtonGradient}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
      <View style={styles.videoWrapper}>
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ 
            uri: videoUrl,
            overrideFileExtensionAndroid: 'mp4',
          }}
          useNativeControls
          resizeMode={isLandscape ? ResizeMode.COVER : ResizeMode.CONTAIN}
          isLooping={false}
          shouldPlay={false}
          volume={1.0}
          isMuted={false}
          audioPan={0}
          progressUpdateIntervalMillis={1000}
          posterSource={undefined}
          usePoster={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onLoadStart={() => {
            setIsLoading(true);
            setError(null);
          }}
          onLoad={async (status) => {
            setIsLoading(false);
            if (status.isLoaded && 'hasAudio' in status && !(status as any).hasAudio) {
              setError('Video này không có âm thanh. Vui lòng kiểm tra lại file video.');
              return;
            }
            setError(null);
            if (videoRef.current) {
              try {
                await Audio.setAudioModeAsync({
                  allowsRecordingIOS: false,
                  playsInSilentModeIOS: true,
                  staysActiveInBackground: false,
                  shouldDuckAndroid: true,
                });
                await Audio.setIsEnabledAsync(true);
                await videoRef.current.setIsMutedAsync(false);
                await videoRef.current.setVolumeAsync(1.0);
                setTimeout(async () => {
                  if (videoRef.current) {
                    await videoRef.current.setIsMutedAsync(false);
                    await videoRef.current.setVolumeAsync(1.0);
                  }
                }, 100);
              } catch (audioError) {
              }
            }
          }}
          onError={(error) => {
            setIsLoading(false);
            const errorMessage = typeof error === 'string' ? error : (error as any)?.message || '';
            const errorCode = (error as any)?.code;
            setTimeout(async () => {
              if (videoRef.current) {
                try {
                  const status = await videoRef.current.getStatusAsync();
                  if (status.isLoaded) {
                    setError(null);
                    return;
                  }
                } catch (checkError) {
                }
              }
              if (errorCode === 153 || (typeof errorMessage === 'string' && errorMessage.includes('153'))) {
                setError('Không thể phát video. Vui lòng kiểm tra lại URL.');
              } else if (errorMessage) {
                setError('Không thể phát video: ' + errorMessage);
              }
            }, 500);
          }}
        />
      </View>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <LinearGradient
            colors={
              colorScheme === 'dark'
                ? ['rgba(13, 13, 26, 0.95)', 'rgba(26, 26, 46, 0.95)']
                : ['rgba(255, 248, 240, 0.95)', 'rgba(255, 255, 255, 0.95)']
            }
            style={styles.loadingGradient}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={[styles.loadingText, { color: colors.text }]}>
              Đang tải video...
            </ThemedText>
          </LinearGradient>
        </View>
      )}
      {error && (
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <View style={[styles.errorIconContainer, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="alert-circle" size={48} color={colors.error} />
            </View>
            <ThemedText style={[styles.errorText, { color: '#FFFFFF' }]}>{error}</ThemedText>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={async () => {
                setError(null);
                setIsLoading(true);
                try {
                  if (videoRef.current) {
                    await videoRef.current.unloadAsync();
                    await videoRef.current.loadAsync({ uri: videoUrl });
                    await videoRef.current.setIsMutedAsync(false);
                    await videoRef.current.setVolumeAsync(1.0);
                  }
                } catch (err) {
                  setError('Không thể tải lại video. Vui lòng thử lại.');
                  setIsLoading(false);
                }
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                style={styles.retryButtonGradient}
              >
                <Ionicons name="reload" size={20} color="#fff" style={{ marginRight: 8 }} />
                <ThemedText style={styles.retryButtonText}>Thử lại</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  videoWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    zIndex: 1000,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  closeButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  webView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  errorIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
    paddingHorizontal: 20,
    color: '#FFFFFF',
  },
  retryButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

