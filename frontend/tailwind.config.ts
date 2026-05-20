import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
    darkMode: ['class'],
    content: [
        './index.html',
        './src/**/*.{ts,tsx,js,jsx}',
    ],
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1200px', // Claude spec: max container ~1200px
            },
        },
        extend: {
            colors: {
                // --- shadcn/ui semantic tokens (HSL bridge) ---
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                sidebar: {
                    DEFAULT: 'hsl(var(--sidebar))',
                    foreground: 'hsl(var(--sidebar-foreground))',
                    primary: 'hsl(var(--sidebar-primary))',
                    'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
                    accent: 'hsl(var(--sidebar-accent))',
                    'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
                    border: 'hsl(var(--sidebar-border))',
                    ring: 'hsl(var(--sidebar-ring))',
                },

                // --- Warm palette direct access ---
                parchment: '#f5f4ed',
                ivory: '#faf9f5',
                'near-black': '#141413',
                'dark-elevated': '#30302e',
                'warm-sand': '#e8e6dc',
                terracotta: '#c96442',
                'accent-coral': '#d97757',
                'accent-olive': '#788c5d',
                'accent-mist': '#6a9bcc',
                'focus-blue': '#3898ec',
                'error-red': '#b53333',

                // --- Warm neutral scale ---
                warm: {
                    50:  '#faf9f5',
                    100: '#f5f4ed',
                    200: '#f0eee6',
                    300: '#e8e6dc',
                    400: '#d1cfc5',
                    500: '#b0aea5',
                    600: '#87867f',
                    700: '#5e5d59',
                    800: '#4d4c48',
                    900: '#30302e',
                    950: '#141413',
                },

                // --- Semantic status colors ---
                success: {
                    DEFAULT: 'hsl(var(--success))',
                    foreground: 'hsl(var(--success-foreground))',
                },
                warning: {
                    DEFAULT: 'hsl(var(--warning))',
                    foreground: 'hsl(var(--warning-foreground))',
                },
                info: {
                    DEFAULT: 'hsl(var(--info))',
                    foreground: 'hsl(var(--info-foreground))',
                },

                // --- Learning state colors ---
                mastery: {
                    DEFAULT: 'hsl(var(--mastery))',
                    foreground: 'hsl(var(--mastery-foreground))',
                },
                learning: {
                    DEFAULT: 'hsl(var(--learning))',
                    foreground: 'hsl(var(--learning-foreground))',
                },
                'card-new': {
                    DEFAULT: 'hsl(var(--new))',
                    foreground: 'hsl(var(--new-foreground))',
                },
                review: {
                    DEFAULT: 'hsl(var(--review))',
                    foreground: 'hsl(var(--review-foreground))',
                },

                // --- Difficulty colors ---
                'difficulty-easy': 'hsl(var(--difficulty-easy))',
                'difficulty-medium': 'hsl(var(--difficulty-medium))',
                'difficulty-hard': 'hsl(var(--difficulty-hard))',
            },

            // --- Border Radius (Claude spec scale) ---
            borderRadius: {
                sm: '4px',     // sharp
                DEFAULT: '6px', // subtle
                md: '8px',     // default — standard buttons, cards
                lg: '12px',    // generous — primary buttons, inputs
                xl: '16px',    // large — featured containers
                '2xl': '24px', // xl — tags, highlights
                '3xl': '32px', // max — hero containers, large media
            },

            // --- Spacing additions ---
            spacing: {
                '18': '4.5rem',  // 72px
                '22': '5.5rem',  // 88px
                '30': '7.5rem',  // 120px — section vertical padding
            },

            // --- Keyframes ---
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' },
                },
                'fade-in': {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                'fade-in-up': {
                    from: { opacity: '0', transform: 'translateY(12px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                'fade-in-down': {
                    from: { opacity: '0', transform: 'translateY(-8px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                'slide-in-from-left': {
                    from: { transform: 'translateX(-100%)' },
                    to: { transform: 'translateX(0)' },
                },
                'slide-in-from-right': {
                    from: { transform: 'translateX(100%)' },
                    to: { transform: 'translateX(0)' },
                },
                'scale-in': {
                    from: { opacity: '0', transform: 'scale(0.95)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },

            // --- Animations (warm timing) ---
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in': 'fade-in 200ms ease-out',
                'fade-in-up': 'fade-in-up 300ms ease-out',
                'fade-in-down': 'fade-in-down 300ms ease-out',
                'slide-in-from-left': 'slide-in-from-left 300ms ease-out',
                'slide-in-from-right': 'slide-in-from-right 300ms ease-out',
                'scale-in': 'scale-in 200ms ease-out',
                shimmer: 'shimmer 2s infinite linear',
            },

            // --- Typography ---
            fontFamily: {
                serif: [
                    'Georgia',
                    'ui-serif',
                    'serif',
                ],
                sans: [
                    'Roboto',
                    'system-ui',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'Segoe UI',
                    'Helvetica Neue',
                    'Arial',
                    'sans-serif',
                ],
                mono: [
                    'JetBrains Mono',
                    'ui-monospace',
                    'Consolas',
                    'Monaco',
                    'Courier New',
                    'monospace',
                ],
            },
            fontSize: {
                'display': ['64px', { lineHeight: '1.10', fontWeight: '500' }],
                'section': ['52px', { lineHeight: '1.20', fontWeight: '500' }],
                'subhead-lg': ['36px', { lineHeight: '1.30', fontWeight: '500' }],
                'subhead': ['32px', { lineHeight: '1.10', fontWeight: '500' }],
                'subhead-sm': ['25px', { lineHeight: '1.20', fontWeight: '500' }],
                'feature': ['21px', { lineHeight: '1.20', fontWeight: '500' }],
                'body-lg': ['20px', { lineHeight: '1.60' }],
                'body': ['17px', { lineHeight: '1.60' }],
                'body-std': ['16px', { lineHeight: '1.50' }],
                'body-sm': ['15px', { lineHeight: '1.60' }],
                'caption': ['14px', { lineHeight: '1.43' }],
                'label': ['12px', { lineHeight: '1.50', letterSpacing: '0.12px' }],
                'overline': ['10px', { lineHeight: '1.60', letterSpacing: '0.5px' }],
            },
            lineHeight: {
                'tight': '1.10',
                'snug': '1.20',
                'normal': '1.30',
                'relaxed': '1.50',
                'loose': '1.60',
            },

            // --- Shadows (ring-based depth) ---
            boxShadow: {
                'ring': '0 0 0 1px var(--color-ring-default, #d1cfc5)',
                'ring-hover': '0 0 0 1px var(--color-ring-deep, #c2c0b6)',
                'ring-brand': '0 0 0 1px var(--color-brand, #c96442)',
                'ring-focus': '0 0 0 3px rgba(56, 152, 236, 0.4)',
                'ring-error': '0 0 0 3px rgba(181, 51, 51, 0.12)',
                'whisper': '0 4px 24px rgba(0, 0, 0, 0.05)',
                'whisper-dark': '0 4px 24px rgba(0, 0, 0, 0.3)',
                'inset': 'inset 0 0 0 1px rgba(0, 0, 0, 0.15)',
            },

            // --- Z-index contract ---
            zIndex: {
                'sticky': '100',
                'dropdown': '200',
                'tooltip': '300',
                'modal-overlay': '400',
                'modal-content': '500',
                'toast': '600',
                'debug': '9999',
            },

            // --- Transition timing ---
            transitionDuration: {
                'micro': '100ms',
                'standard': '200ms',
                'deliberate': '300ms',
                'expressive': '400ms',
            },
        },
    },
    plugins: [tailwindcssAnimate],
};

export default config;
