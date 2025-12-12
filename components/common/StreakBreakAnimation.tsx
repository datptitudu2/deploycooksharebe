import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet, Modal, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

interface StreakBreakAnimationProps {
  visible: boolean;
  newLevel: number;
  onComplete?: () => void;
}

export function StreakBreakAnimation({ visible, newLevel, onComplete }: StreakBreakAnimationProps) {
  const streakScale = useRef(new Animated.Value(0.8)).current;
  const streakOpacity = useRef(new Animated.Value(0)).current;
  const streakRotate = useRef(new Animated.Value(0)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!visible) {
      // Stop animation if exists
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      // Reset animations when not visible
      streakScale.setValue(0.8);
      streakOpacity.setValue(0);
      streakRotate.setValue(0);
      sparkleOpacity.setValue(0);
      return;
    }

    // Stop previous animation if exists
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }

    // Reset animations
    streakScale.setValue(0.8);
    streakOpacity.setValue(0);
    streakRotate.setValue(0);
    sparkleOpacity.setValue(0);

    console.log('🔥 Starting streak animation - Total duration: ~12 seconds');

    // Animation mượt mà: Flame xuất hiện, scale up nhẹ, rotate, sau đó text xuất hiện
    const animation = Animated.sequence([
      // Phase 1: Flame xuất hiện và scale up nhẹ (0-4s)
      Animated.parallel([
        Animated.timing(streakOpacity, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(streakScale, {
          toValue: 1.2,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleOpacity, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
      ]),
      // Phase 2: Flame rotate nhẹ và scale về bình thường (4s-8s)
      Animated.parallel([
        Animated.timing(streakRotate, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(streakScale, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
      ]),
      // Phase 3: Flame fade out (8s-12s)
      Animated.parallel([
        Animated.timing(streakOpacity, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleOpacity, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ]),
    ]);

    // Store animation reference
    animationRef.current = animation;
    
    animation.start((finished) => {
      console.log('🔥 Animation finished:', finished);
      animationRef.current = null;
      if (finished && onComplete) {
        // Thêm delay nhỏ để đảm bảo animation hoàn toàn kết thúc trước khi gọi onComplete
        setTimeout(() => {
          console.log('🔥 Calling onComplete');
          if (onComplete) onComplete();
        }, 200);
      }
    });

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [visible, onComplete]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={() => {}}
    >
      {Platform.OS === 'android' && (
        <StatusBar hidden={false} translucent={true} backgroundColor="transparent" barStyle="light-content" />
      )}
      <View style={styles.overlay} pointerEvents="none">
        {/* Background blur overlay - Làm mờ phần tab phía sau */}
        <View style={styles.blurOverlay} />
        
        {/* Background gradient với glow effect */}
        <LinearGradient
          colors={['rgba(255, 107, 53, 0.4)', 'rgba(255, 180, 77, 0.3)', 'rgba(0, 0, 0, 0.95)']}
          style={styles.gradientOverlay}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Ngọn lửa nhỏ gọn - Centered */}
        <Animated.View
          style={[
            styles.streakContainer,
            {
              transform: [
                { scale: streakScale },
                {
                  rotate: streakRotate.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '15deg'],
                  }),
                },
              ],
              opacity: streakOpacity,
            },
          ]}
        >
          {/* Glow layers nhỏ gọn cho flame */}
          <View style={styles.flameGlowOuter}>
            <Ionicons name="flame" size={100} color="#FF6B35" />
          </View>
          <View style={styles.flameGlowMiddle}>
            <Ionicons name="flame" size={90} color="#FF8C42" />
          </View>
          <View style={styles.flameGlowInner}>
            <Ionicons name="flame" size={80} color="#FFB84D" />
          </View>
          <Ionicons name="flame" size={80} color="#FFD700" />
          
          {/* Sparkles nhỏ xung quanh */}
          <Animated.View style={[styles.sparkleContainer, { opacity: sparkleOpacity }]}>
            <View key="sparkle-1" style={[styles.sparkle, styles.sparkle1]}>
              <Ionicons name="star" size={16} color="#FFD700" />
            </View>
            <View key="sparkle-2" style={[styles.sparkle, styles.sparkle2]}>
              <Ionicons name="star" size={14} color="#FF8C42" />
            </View>
            <View key="sparkle-3" style={[styles.sparkle, styles.sparkle3]}>
              <Ionicons name="star" size={18} color="#FF6B35" />
            </View>
            <View key="sparkle-4" style={[styles.sparkle, styles.sparkle4]}>
              <Ionicons name="star" size={15} color="#FFD700" />
            </View>
            <View key="sparkle-5" style={[styles.sparkle, styles.sparkle5]}>
              <Ionicons name="star" size={17} color="#FFB84D" />
            </View>
            <View key="sparkle-6" style={[styles.sparkle, styles.sparkle6]}>
              <Ionicons name="star" size={16} color="#FF8C42" />
            </View>
          </Animated.View>
        </Animated.View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Làm mờ background
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  streakContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    top: '50%',
    left: 0,
    right: 0,
    width: SCREEN_WIDTH,
    height: 150,
    marginTop: -75, // Để căn giữa chính xác (nửa chiều cao)
    zIndex: 10000,
  },
  flameGlowOuter: {
    position: 'absolute',
    ...Platform.select({
      ios: {
        shadowColor: '#FF6B35',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  flameGlowMiddle: {
    position: 'absolute',
    ...Platform.select({
      ios: {
        shadowColor: '#FF8C42',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 15,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  flameGlowInner: {
    position: 'absolute',
    ...Platform.select({
      ios: {
        shadowColor: '#FFB84D',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  sparkleContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle: {
    position: 'absolute',
  },
  sparkle1: {
    top: -30,
    left: 20,
  },
  sparkle2: {
    top: 10,
    right: -20,
  },
  sparkle3: {
    bottom: -10,
    left: -10,
  },
  sparkle4: {
    top: -20,
    right: 10,
  },
  sparkle5: {
    bottom: 20,
    right: -15,
  },
  sparkle6: {
    bottom: -15,
    left: 30,
  },
});
