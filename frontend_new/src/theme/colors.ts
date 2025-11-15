/**
 * Black and White Color Theme for VisaBuddy
 * Minimalist, professional design with high contrast
 */

export const COLORS = {
  // Neutral Base Colors
  BLACK: "#000000",
  WHITE: "#FFFFFF",
  
  // Gray Scale
  GRAY_900: "#111111", // Almost black, for primary text
  GRAY_800: "#1F1F1F", // Very dark gray
  GRAY_700: "#2D2D2D", // Dark gray
  GRAY_600: "#4D4D4D", // Medium-dark gray
  GRAY_500: "#666666", // Medium gray
  GRAY_400: "#999999", // Medium-light gray
  GRAY_300: "#CCCCCC", // Light gray
  GRAY_200: "#E5E5E5", // Very light gray
  GRAY_100: "#F5F5F5", // Almost white
  GRAY_50: "#FAFAFA",  // Off-white

  // Primary Colors (Black and White)
  PRIMARY: "#000000",     // Black for buttons, accents
  PRIMARY_LIGHT: "#333333", // Dark gray alternative
  SECONDARY: "#FFFFFF",   // White backgrounds
  
  // Status Colors (Minimalist)
  SUCCESS: "#2D2D2D",     // Dark gray for success
  SUCCESS_LIGHT: "#E5E5E5", // Light gray for success backgrounds
  
  ERROR: "#1F1F1F",       // Dark gray for errors
  ERROR_LIGHT: "#F5F5F5", // Light gray for error backgrounds
  
  WARNING: "#4D4D4D",     // Medium gray for warnings
  WARNING_LIGHT: "#E5E5E5", // Light gray for warning backgrounds
  
  INFO: "#2D2D2D",        // Dark gray for info
  INFO_LIGHT: "#F5F5F5",  // Light gray for info backgrounds

  // UI Elements
  BORDER: "#CCCCCC",      // Light gray borders
  BORDER_DARK: "#999999", // Dark gray borders
  DIVIDER: "#E5E5E5",     // Divider lines
  
  // Shadows (subtle)
  SHADOW: "rgba(0, 0, 0, 0.1)",
  SHADOW_DARK: "rgba(0, 0, 0, 0.2)",
  SHADOW_LIGHT: "rgba(0, 0, 0, 0.05)",
  
  // Text Colors
  TEXT_PRIMARY: "#000000",
  TEXT_SECONDARY: "#666666",
  TEXT_TERTIARY: "#999999",
  TEXT_LIGHT: "#FFFFFF",
  TEXT_DISABLED: "#CCCCCC",
  
  // Background Colors
  BG_PRIMARY: "#FFFFFF",
  BG_SECONDARY: "#F5F5F5",
  BG_TERTIARY: "#EEEEEE",
  
  // Input & Form
  INPUT_BG: "#FFFFFF",
  INPUT_BORDER: "#CCCCCC",
  INPUT_BORDER_FOCUS: "#000000",
  INPUT_TEXT: "#000000",
  INPUT_PLACEHOLDER: "#999999",
  
  // Card & Elevation
  CARD_BG: "#FFFFFF",
  CARD_BORDER: "#CCCCCC",
  
  // Navigation
  NAV_BG: "#FFFFFF",
  NAV_TEXT: "#000000",
  NAV_TEXT_INACTIVE: "#999999",
  NAV_INDICATOR: "#000000",
  
  // Payment Status
  PAYMENT_PENDING: "#4D4D4D",   // Medium gray
  PAYMENT_COMPLETED: "#2D2D2D", // Dark gray (success)
  PAYMENT_FAILED: "#1F1F1F",    // Very dark gray (error)
  PAYMENT_REFUNDED: "#666666",  // Gray (neutral)
  
  // Status Colors (for payment gateways)
  GREEN: "#10B981",    // Success/Completed
  RED: "#EF4444",      // Error/Failed
  BLUE: "#3B82F6",     // Processing/Info
  ORANGE: "#F59E0B",   // Warning/Pending
  PURPLE: "#8B5CF6",   // Refunded
  
  // Overlay & Modals
  OVERLAY: "rgba(0, 0, 0, 0.5)",
  OVERLAY_LIGHT: "rgba(0, 0, 0, 0.3)",
};

/**
 * Typography sizes and weights
 */
export const TYPOGRAPHY = {
  // Font sizes
  SIZES: {
    XS: 10,
    SM: 12,
    BASE: 14,
    MD: 16,
    LG: 18,
    XL: 20,
    XXL: 24,
    XXXL: 28,
    TITLE: 32,
  },
  
  // Font weights
  WEIGHTS: {
    LIGHT: "300" as const,
    NORMAL: "400" as const,
    MEDIUM: "500" as const,
    SEMIBOLD: "600" as const,
    BOLD: "700" as const,
    EXTRABOLD: "800" as const,
  },
  
  // Line heights
  LINEHEIGHTS: {
    TIGHT: 1.2,
    NORMAL: 1.5,
    RELAXED: 1.75,
    LOOSE: 2,
  },
};

/**
 * Spacing system (8px base unit)
 */
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 20,
  XXL: 24,
  XXXL: 32,
  HUGE: 40,
  MASSIVE: 48,
};

/**
 * Border radius
 */
export const RADIUS = {
  NONE: 0,
  SM: 4,
  MD: 8,
  LG: 12,
  XL: 16,
  FULL: 9999,
};

/**
 * Shadows
 */
export const SHADOWS = {
  NONE: "none",
  SM: "0px 1px 2px rgba(0, 0, 0, 0.05)",
  MD: "0px 4px 6px rgba(0, 0, 0, 0.1)",
  LG: "0px 10px 15px rgba(0, 0, 0, 0.15)",
  XL: "0px 20px 25px rgba(0, 0, 0, 0.2)",
  INNER: "inset 0px 2px 4px rgba(0, 0, 0, 0.05)",
};

/**
 * Z-index layers
 */
export const ZINDEX = {
  HIDDEN: -1,
  BASE: 0,
  DROPDOWN: 10,
  STICKY: 20,
  FIXED: 30,
  MODAL_BACKDROP: 40,
  MODAL: 50,
  POPOVER: 60,
  TOOLTIP: 70,
};

/**
 * Compatibility export for ChatScreen
 * Maps the old color structure to the new one
 */
export const colors = {
  white: COLORS.WHITE,
  black: COLORS.BLACK,
  gray: {
    50: COLORS.GRAY_50,
    100: COLORS.GRAY_100,
    200: COLORS.GRAY_200,
    300: COLORS.GRAY_300,
    400: COLORS.GRAY_400,
    500: COLORS.GRAY_500,
    600: COLORS.GRAY_600,
    700: COLORS.GRAY_700,
    800: COLORS.GRAY_800,
    900: COLORS.GRAY_900,
  },
  error: {
    50: COLORS.ERROR_LIGHT,
    200: COLORS.GRAY_200,
    700: COLORS.ERROR,
  },
  spacing: {
    ...SPACING,
    // Allow numeric access
    0: 0,
    4: SPACING.XS,
    8: SPACING.SM,
    10: 10,
    12: SPACING.MD,
    16: SPACING.LG,
    20: SPACING.XL,
    24: SPACING.XXL,
  },
  typography: {
    ...TYPOGRAPHY,
    sizes: {
      ...TYPOGRAPHY.SIZES,
      xs: TYPOGRAPHY.SIZES.XS,
      sm: TYPOGRAPHY.SIZES.SM,
      base: TYPOGRAPHY.SIZES.BASE,
      md: TYPOGRAPHY.SIZES.MD,
      lg: TYPOGRAPHY.SIZES.LG,
      xl: TYPOGRAPHY.SIZES.XL,
      xxl: TYPOGRAPHY.SIZES.XXL,
    },
    weights: {
      ...TYPOGRAPHY.WEIGHTS,
      bold: TYPOGRAPHY.WEIGHTS.BOLD,
    },
    lineHeights: {
      ...TYPOGRAPHY.LINEHEIGHTS,
      1.5: TYPOGRAPHY.LINEHEIGHTS.NORMAL,
    },
  },
  radius: {
    ...RADIUS,
    // Allow numeric access
    0: 0,
    4: RADIUS.SM,
    6: 6,
    8: RADIUS.MD,
    12: RADIUS.LG,
  },
};