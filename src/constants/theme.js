import { Colors } from './colors';

// Color Scheme - Professional Design System
export const COLORS = {
  // Use new color system from colors.js
  ...Colors,

  // Keep some legacy aliases for backward compatibility
  primary: Colors.accent,
  primaryDark: Colors.primaryDark,
  primaryLight: Colors.primaryLight,
  secondary: Colors.accentDark,

  bgDark: Colors.primaryDark,
  bgMedium: Colors.primaryMedium,
  bgLight: Colors.primaryLight,
  bgCard: Colors.cardBackground,

  textPrimary: Colors.textPrimary,
  textSecondary: Colors.textSecondary,
  textMuted: Colors.textSecondary,

  success: Colors.success,
  warning: Colors.warning,
  error: Colors.error,
  info: Colors.info,

  chartBlue: '#42A5F5',
  chartGreen: Colors.accent,
  chartYellow: '#FFD54F',
  chartOrange: '#FFA726',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: Colors.overlayDark,
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border Radius - Updated for modern rounded design
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 18,     // Increased for cards
  xl: 20,     // Main card radius
  xxl: 24,    // Bottom sheets
  round: 999,
};

// Font Sizes - Modern typography scale
export const FONTS = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,   // Main headings
  title: 28,
  hero: 36,   // Large values (glucose, stats)
};

// Shadows - Updated for light theme support
export const SHADOWS = {
  // Light shadow for light theme (recipes)
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  // Medium shadow
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  // Large shadow
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  // No shadow
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

