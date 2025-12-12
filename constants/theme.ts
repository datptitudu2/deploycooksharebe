/**
 * Food-themed color palette for CookShare
 * Warm, appetizing colors inspired by food and cooking
 */

import { Platform } from 'react-native';

// Food-themed colors: warm oranges, rich reds, fresh greens
const tintColorLight = '#FF6B35'; // Warm orange - like cooked food
const tintColorDark = '#FFB84D'; // Golden yellow - like butter/golden food

export const Colors = {
  light: {
    text: '#2C1810', // Dark brown - like coffee/chocolate
    textSecondary: '#7A6B63', // Muted brown for secondary text
    background: '#FFF8F0', // Warm cream - like vanilla cream
    tint: tintColorLight,
    icon: '#8B4513', // Saddle brown
    tabIconDefault: '#A0826D', // Muted brown
    tabIconSelected: tintColorLight,
    primary: '#FF6B35', // Warm orange
    secondary: '#4ECDC4', // Fresh mint green
    accent: '#FFB84D', // Golden yellow
    error: '#E63946', // Tomato red
    success: '#06A77D', // Fresh green
    warning: '#F77F00', // Orange warning
    card: '#FFFFFF', // Card background
    border: '#E8DDD5', // Border color
  },
  dark: {
    text: '#FFF8F0', // Cream white
    textSecondary: '#A0928A', // Muted text for dark mode
    background: '#0D0D1A', // Dark background
    tint: tintColorDark,
    icon: '#D4A574', // Light brown
    tabIconDefault: '#8B7355', // Muted brown
    tabIconSelected: tintColorDark,
    primary: '#FF6B35', // Warm orange
    secondary: '#4ECDC4', // Fresh mint green
    accent: '#FFB84D', // Golden yellow
    error: '#E63946', // Tomato red
    success: '#06A77D', // Fresh green
    warning: '#F77F00', // Orange warning
    card: '#1A1A2E', // Card background
    border: '#2A2A3E', // Border color
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
