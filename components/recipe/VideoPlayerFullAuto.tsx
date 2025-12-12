import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width, height } = Dimensions.get('window');

interface VideoPlayerFullAutoProps {
  videoUrl: string;
  title?: string;
  onClose?: () => void;
}

/**
 * Video Player Component với Auto Fullscreen
 * - Tự động vào fullscreen khi mở
 * - iOS: Dùng AVPlayerViewController native fullscreen
 * - Android: Tự động mở fullscreen với native controls
 * - Tự xoay màn hình khi fullscreen (landscape)
 * - Lock về portrait khi đóng
 */
export const VideoPlayerFullAuto: React.FC<VideoPlayerFullAutoProps> = ({
  videoUrl,
  title,
  onClose,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Lock orientation to portrait on mount
  useEffect(() => {
    const lockPortrait = async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } catch (error) {
        // Silent fail
      }
    };

    lockPortrait();

    // Unlock when component unmounts
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  // Auto fullscreen when video loads
  useEffect(() => {
    if (status?.isLoaded && !isInitialized && videoRef.current) {
      const enterFullscreen = async () => {
        try {
          setIsInitialized(true);

          // Set audio mode
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });

          // iOS: Present fullscreen player
          if (Platform.OS === 'ios') {
            await videoRef.current?.presentFullscreenPlayer();
            setIsFullscreen(true);
          } else {
            // Android: Request fullscreen and unlock orientation
            await ScreenOrientation.unlockAsync();
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL);
            
            // Request fullscreen for Android
            if (videoRef.current) {
              // Android will use native controls which support fullscreen
              setIsFullscreen(true);
            }
          }
        } catch (error) {
          // Fallback: just unlock orientation
          if (Platform.OS === 'android') {
            await ScreenOrientation.unlockAsync();
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL);
          }
        }
      };

      enterFullscreen();
    }
  }, [status, isInitialized]);

  // Handle fullscreen update callback
  const handleFullscreenUpdate = ({ fullscreenUpdate }: { fullscreenUpdate: number }) => {
    if (Platform.OS === 'ios') {
      // FULLSCREEN_UPDATE_PLAYER_DID_DISMISS = 2
      if (fullscreenUpdate === 2) {
        setIsFullscreen(false);
        handleExitFullscreen();
      } 
      // FULLSCREEN_UPDATE_PLAYER_DID_PRESENT = 1
      else if (fullscreenUpdate === 1) {
        setIsFullscreen(true);
      }
    }
  };

  const handleExitFullscreen = async () => {
    try {
      // Lock back to portrait
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      
      // iOS: Dismiss fullscreen if still active
      if (Platform.OS === 'ios' && videoRef.current && isFullscreen) {
        await videoRef.current.dismissFullscreenPlayer();
      }

      setIsFullscreen(false);
      
      // Close modal if onClose provided
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 300);
      }
    } catch (error) {
      if (onClose) {
        onClose();
      }
    }
  };

  const handlePlaybackStatusUpdate = async (playbackStatus: AVPlaybackStatus) => {
    setStatus(playbackStatus);

    if (playbackStatus.isLoaded) {
      setIsLoading(false);
      setError(null);

      // Ensure audio is enabled
      if (videoRef.current) {
        try {
          await Audio.setIsEnabledAsync(true);
          if (playbackStatus.isMuted) {
            await videoRef.current.setIsMutedAsync(false);
          }
          if (playbackStatus.volume !== 1.0) {
            await videoRef.current.setVolumeAsync(1.0);
          }
        } catch (audioError) {
          // Silent fail
        }
      }
    } else if (playbackStatus.error) {
      setIsLoading(false);
      setError('Không thể phát video: ' + playbackStatus.error);
    }
  };

  // Validate video URL
  if (!videoUrl || !videoUrl.trim()) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.errorText}>URL video không hợp lệ</ThemedText>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Check if it's a local file path
  if (videoUrl.startsWith('file://')) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.errorText}>
          Video từ thiết bị cần được upload lên server trước.
        </ThemedText>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Validate HTTP/HTTPS URL
  if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.errorText}>URL video phải là HTTP hoặc HTTPS</ThemedText>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden={isFullscreen} />
      
      {/* Close button - only show when not in fullscreen or as overlay */}
      {!isFullscreen && onClose && (
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}
          onPress={handleExitFullscreen}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Video Player */}
      <Video
        ref={videoRef}
        style={styles.video}
        source={{
          uri: videoUrl,
          overrideFileExtensionAndroid: 'mp4',
        }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping={false}
        shouldPlay={false}
        volume={1.0}
        isMuted={false}
        audioPan={0}
        progressUpdateIntervalMillis={1000}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onFullscreenUpdate={handleFullscreenUpdate}
        onLoadStart={() => {
          setIsLoading(true);
          setError(null);
        }}
        onLoad={async (loadStatus) => {
          setIsLoading(false);
          if (loadStatus.isLoaded) {
            setError(null);
            // Ensure audio is enabled
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
              } catch (audioError) {
                // Silent fail
              }
            }
          }
        }}
        onError={(error) => {
          setIsLoading(false);
          const errorMessage = typeof error === 'string' ? error : (error as any)?.message || '';
          setError('Không thể phát video: ' + errorMessage);
        }}
      />

      {/* Loading overlay */}
      {isLoading && !isFullscreen && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText style={styles.loadingText}>Đang tải video...</ThemedText>
        </View>
      )}

      {/* Error overlay */}
      {error && !isFullscreen && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <ThemedText style={[styles.errorText, { color: colors.error }]}>{error}</ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
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
          >
            <Ionicons name="reload" size={20} color="#fff" style={{ marginRight: 8 }} />
            <ThemedText style={styles.retryButtonText}>Thử lại</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Exit fullscreen button overlay (Android) */}
      {isFullscreen && Platform.OS === 'android' && onClose && (
        <TouchableOpacity
          style={styles.exitFullscreenButton}
          onPress={handleExitFullscreen}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    zIndex: 1000,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
  },
  exitFullscreenButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    zIndex: 10000,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 10,
  },
  video: {
    width: width,
    height: height,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    color: '#fff',
  },
  retryButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

