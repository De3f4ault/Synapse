/**
 * Color constants
 * Exact color palette matching DeepSeek theme
 */

export const colors = {
  // Primary brand color
  primary: '#5685FE',
  primaryHover: '#4574ED',
  primaryLight: 'rgba(86, 133, 254, 0.1)',
  primaryMedium: 'rgba(86, 133, 254, 0.2)',
  primaryStrong: 'rgba(86, 133, 254, 0.4)',

  // Background colors
  darkBg: '#19191C', // Main background
  darker: '#1D1E22', // Cards, elevated surfaces
  medium: '#353638', // Borders, dividers, subtle backgrounds

  // Text colors
  textPrimary: 'rgba(255, 255, 255, 0.9)',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.5)',
  textDisabled: 'rgba(255, 255, 255, 0.3)',

  // Semantic colors
  success: '#22C55E',
  successLight: 'rgba(34, 197, 94, 0.1)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.1)',
  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.1)',
  info: '#3B82F6',
  infoLight: 'rgba(59, 130, 246, 0.1)',

  // Glass effect colors
  glassBg: 'rgba(53, 54, 56, 0.6)',
  glassBgLight: 'rgba(53, 54, 56, 0.3)',
  glassBgStrong: 'rgba(29, 30, 34, 0.8)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassBorderHover: 'rgba(255, 255, 255, 0.15)',

  // Special effects
  shadowGlow: 'rgba(86, 133, 254, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayStrong: 'rgba(0, 0, 0, 0.8)',
} as const;

/**
 * Tailwind CSS classes for colors
 */
export const colorClasses = {
  // Background
  bgDarkBg: 'bg-[#19191C]',
  bgDarker: 'bg-[#1D1E22]',
  bgMedium: 'bg-[#353638]',
  bgPrimary: 'bg-[#5685FE]',

  // Text
  textPrimary: 'text-white/90',
  textSecondary: 'text-white/70',
  textTertiary: 'text-white/50',
  textDisabled: 'text-white/30',
  textPrimaryColor: 'text-[#5685FE]',

  // Border
  borderMedium: 'border-[#353638]',
  borderGlass: 'border-white/10',
  borderPrimary: 'border-[#5685FE]',

  // Semantic
  textSuccess: 'text-green-500',
  textWarning: 'text-amber-500',
  textError: 'text-red-500',
  textInfo: 'text-blue-500',
} as const;

/**
 * Get color with opacity
 */
export const withOpacity = (color: string, opacity: number): string => {
  // If color is already rgba, replace opacity
  if (color.startsWith('rgba')) {
    return color.replace(/[\d.]+\)$/g, `${opacity})`);
  }

  // Convert hex to rgba
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  return color;
};
