import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface SwipeWrapperProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /**
   * Minimum swipe distance (in pixels) to trigger navigation
   * Default: 50
   */
  swipeThreshold?: number;
  /**
   * Minimum swipe velocity (in pixels per second) to trigger navigation
   * Default: 500
   */
  velocityThreshold?: number;
  /**
   * Enable/disable swipe gestures
   * Default: true
   */
  enabled?: boolean;
}

/**
 * SwipeWrapper - A reusable component that adds horizontal swipe gestures
 * to navigate between tabs.
 * 
 * Usage:
 * ```tsx
 * <SwipeWrapper
 *   onSwipeLeft={() => navigation.navigate('NextTab')}
 *   onSwipeRight={() => navigation.navigate('PreviousTab')}
 * >
 *   <YourScreen />
 * </SwipeWrapper>
 * ```
 */
export const SwipeWrapper: React.FC<SwipeWrapperProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 40, // Reduced for easier triggering
  velocityThreshold = 400, // Reduced for easier triggering
  enabled = true,
}) => {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-30, 30]) // Activate if horizontal movement > 30px (more lenient)
    .failOffsetY([-50, 50]) // Only fail if vertical movement > 50px (allows more scrolling)
    .minDistance(10) // Minimum distance before gesture activates (reduced)
    .onStart((event) => {
      startX.value = event.x;
      translateX.value = 0;
    })
    .onUpdate((event) => {
      // Only allow horizontal swipes
      const deltaX = event.translationX;
      const deltaY = Math.abs(event.translationY);
      
      // Only apply horizontal translation if horizontal movement is dominant
      // Ratio check: horizontal must be at least 1.2x vertical movement (more lenient)
      if (Math.abs(deltaX) > deltaY * 1.2) {
        // Limit the visual feedback to prevent over-swiping
        translateX.value = Math.max(-100, Math.min(100, deltaX));
      }
    })
    .onEnd((event) => {
      const deltaX = event.translationX;
      const deltaY = Math.abs(event.translationY);
      const velocityX = event.velocityX;
      const absDeltaX = Math.abs(deltaX);
      const absVelocityX = Math.abs(velocityX);

      // Only trigger if horizontal movement is dominant over vertical
      // Use ratio check: horizontal must be at least 1.2x vertical (more lenient)
      const isHorizontalSwipe = absDeltaX > deltaY * 1.2;

      // Check if swipe meets threshold (distance or velocity)
      const meetsThreshold =
        (absDeltaX > swipeThreshold || absVelocityX > velocityThreshold) && isHorizontalSwipe;

      if (meetsThreshold) {
        if (deltaX > 0 && onSwipeRight) {
          // Swipe right (left to right) → previous tab
          runOnJS(onSwipeRight)();
        } else if (deltaX < 0 && onSwipeLeft) {
          // Swipe left (right to left) → next tab
          runOnJS(onSwipeLeft)();
        }
      }

      // Reset position with spring animation
      translateX.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
    });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={styles.content} collapsable={false}>
          {children}
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default SwipeWrapper;

