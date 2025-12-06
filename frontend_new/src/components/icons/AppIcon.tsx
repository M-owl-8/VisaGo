/**
 * Minimalistic Icon Component
 * Matches Telegram/ChatGPT aesthetic with thin-line icons
 */

import React from 'react';
import {StyleSheet, ViewStyle} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {TouchableOpacity} from 'react-native';

export type IconLibrary = 'ionicons' | 'feather' | 'material';

export interface AppIconProps {
  /**
   * Icon name (library-specific)
   */
  name: string;
  /**
   * Icon size in pixels
   * Default sizes:
   * - Tab icons: 22-24px
   * - Settings: 20-22px
   * - Header: 20px
   * - Large: 32px
   */
  size?: number;
  /**
   * Icon color
   * Default: rgba(255,255,255,0.85) for dark backgrounds
   */
  color?: string;
  /**
   * Icon library to use
   * Default: 'ionicons'
   */
  library?: IconLibrary;
  /**
   * Whether icon is active/selected
   * Changes color to active blue
   */
  active?: boolean;
  /**
   * Enable press animation
   */
  animated?: boolean;
  /**
   * Custom style
   */
  style?: ViewStyle;
  /**
   * On press handler (enables touchable)
   */
  onPress?: () => void;
}

/**
 * Icon color constants matching Telegram/ChatGPT
 */
export const IconColors = {
  default: 'rgba(255, 255, 255, 0.85)',
  active: '#4EA8DE', // Telegram-style blue
  bright: 'rgba(255, 255, 255, 0.95)',
  muted: 'rgba(255, 255, 255, 0.6)',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

/**
 * Standard icon sizes
 */
export const IconSizes = {
  tab: 22, // Bottom tab icons
  settings: 20, // Settings/profile cards
  header: 20, // Header icons
  document: 22, // Document preview
  large: 32, // AI assistant, main icons
  small: 16, // Inline icons
};

/**
 * Minimalistic Icon Component
 * Uses thin-line icons with proper spacing and animations
 */
export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = IconSizes.settings,
  color,
  library = 'ionicons',
  active = false,
  animated = false,
  style,
  onPress,
}) => {
  const scale = useSharedValue(1);

  // Determine color
  const iconColor = color || (active ? IconColors.active : IconColors.default);

  // Animated style for press
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{scale: scale.value}],
    };
  });

  const handlePressIn = () => {
    if (animated && onPress) {
      scale.value = withSpring(0.92, {damping: 15, stiffness: 300});
    }
  };

  const handlePressOut = () => {
    if (animated && onPress) {
      scale.value = withSpring(1, {damping: 15, stiffness: 300});
    }
  };

  const renderIcon = () => {
    const iconProps = {
      name,
      size,
      color: iconColor,
      style: [styles.icon, style],
    };

    switch (library) {
      case 'feather':
        return <FeatherIcon {...iconProps} />;
      case 'material':
        return <MaterialIcon {...iconProps} />;
      default:
        return <Icon {...iconProps} />;
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
        style={animated ? animatedStyle : undefined}>
        {renderIcon()}
      </TouchableOpacity>
    );
  }

  if (animated) {
    return <Animated.View style={animatedStyle}>{renderIcon()}</Animated.View>;
  }

  return renderIcon();
};

const styles = StyleSheet.create({
  icon: {
    // Ensure icons render cleanly
  },
});

export default AppIcon;
