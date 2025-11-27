import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#040816',
        surface: '#0E1A2C',
        midnight: '#0B1220',
        primary: {
          DEFAULT: '#3EA6FF',
          light: '#4A9EFF',
          dark: '#1D5DFF',
          contrast: '#F8FBFF',
        },
        accent: {
          DEFAULT: '#4A9EFF',
          subtle: '#1A2A40',
        },
        success: '#34D399',
        warning: '#FACC15',
        danger: '#F87171',
        neutral: {
          50: '#F8FBFF',
          100: '#E2E8F0',
          200: '#CBD5F5',
          300: '#94A3B8',
          400: '#64748B',
          500: '#475569',
          600: '#334155',
          700: '#1F2937',
          800: '#111827',
          900: '#0B1220',
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
