/**
 * Color constants - Oracle Theme
 * The palette of the Void and the Arcane.
 *
 * Location: chat/constants/colors.ts
 */

export const colors = {
  // Oracle Brand Colors
  primary: '#06b6d4', // Cyan-500
  primaryHover: '#0891b2', // Cyan-600
  primaryLight: 'rgba(6, 182, 212, 0.1)',
  primaryMedium: 'rgba(6, 182, 212, 0.2)',
  primaryStrong: 'rgba(6, 182, 212, 0.4)',

  // Secondary / Gnosis Colors
  accent: '#f59e0b', // Amber-500 (Deep Gnosis)
  accentHover: '#d97706',
  accentLight: 'rgba(245, 158, 11, 0.1)',

  // Background colors
  darkBg: '#020408', // Deep Void
  darker: '#000000', // Absolute Black
  medium: '#0f172a', // Slate-900

  // Text colors
  textPrimary: '#cffafe', // Cyan-50
  textSecondary: '#94a3b8', // Slate-400
  textTertiary: '#475569', // Slate-600
  textDisabled: 'rgba(255, 255, 255, 0.2)',

  // Semantic colors
  success: '#10b981', // Emerald
  warning: '#f59e0b', // Amber
  error: '#ef4444', // Red
  info: '#3b82f6', // Blue

  // Glass effect colors
  glassBg: 'rgba(0, 0, 0, 0.6)',
  glassBgLight: 'rgba(255, 255, 255, 0.05)',
  glassBgStrong: 'rgba(0, 0, 0, 0.8)',
  glassBorder: 'rgba(6, 182, 212, 0.1)', // Subtle Cyan Border
  glassBorderHover: 'rgba(6, 182, 212, 0.3)',

  // Special effects
  shadowGlow: 'rgba(6, 182, 212, 0.3)',
} as const;

/**
 * Tailwind CSS classes for colors (Oracle Preset)
 */
export const colorClasses = {
  // Background
  bgDarkBg: 'bg-[#020408]',
  bgDarker: 'bg-black',
  bgMedium: 'bg-slate-900',
  bgPrimary: 'bg-cyan-500',

  // Text
  textPrimary: 'text-cyan-50',
  textSecondary: 'text-slate-400',
  textTertiary: 'text-slate-600',
  textDisabled: 'text-white/20',
  textPrimaryColor: 'text-cyan-400',

  // Border
  borderMedium: 'border-white/10',
  borderGlass: 'border-cyan-500/10',
  borderPrimary: 'border-cyan-500',

  // Semantic
  textSuccess: 'text-emerald-400',
  textWarning: 'text-amber-400',
  textError: 'text-red-400',
  textInfo: 'text-blue-400',
} as const;

/**
 * Get color with opacity
 */
export const withOpacity = (color: string, opacity: number): string => {
  if (color.startsWith('rgba')) {
    return color.replace(/[\d.]+\)$/g, `${opacity})`);
  }
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
};
