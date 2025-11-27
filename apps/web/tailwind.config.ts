import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const ketdikPalette = {
  ink: {
    50: '#f5f5f5',
    100: '#e7e7e7',
    200: '#cccccc',
    300: '#a3a3a3',
    400: '#707070',
    500: '#4d4d4d',
    600: '#2d2d2d',
    700: '#1f1f1f',
    800: '#111111',
    900: '#050505',
  },
  cream: {
    50: '#fdfcf9',
    100: '#fbf8f1',
    200: '#f7f1e3',
    300: '#efe3c7',
    400: '#e1c799',
    500: '#c79a52',
    600: '#a77332',
    700: '#875426',
    800: '#6a4120',
    900: '#56351d',
  },
};

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8f6f2',
        surface: '#ffffff',
        primary: {
          DEFAULT: '#0f172a',
          soft: '#1f1f1f',
          contrast: '#ffffff',
          ...ketdikPalette.ink,
        },
        accent: {
          DEFAULT: '#c79a52',
          ...ketdikPalette.cream,
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5f5',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', ...defaultTheme.fontFamily.sans],
        display: ['"Space Grotesk"', ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        card: '0 25px 65px rgba(15, 23, 42, 0.15)',
        'card-soft': '0 18px 45px rgba(15, 23, 42, 0.08)',
      },
      borderRadius: {
        xl: '1.25rem',
        '2xl': '1.75rem',
        full: '999px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease both',
        shimmer: 'shimmer 2s linear infinite',
        'scale-in': 'scale-in 0.35s ease-out both',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};

export default config;



