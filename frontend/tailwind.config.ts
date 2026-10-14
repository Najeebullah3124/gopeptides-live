import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Light theme — matches reference design
        bg: '#EDF4FF',
        surface: '#FFFFFF',
        surfaceAlt: '#F5F9FF',
        surfaceHi: '#E8F0FB',
        primary: {
          DEFAULT: '#5CC0BE',
          dark: '#0D7377',
          light: '#A8E6E4',
          ink: '#FFFFFF',
        },
        accent: '#0A2647',
        ink: {
          DEFAULT: '#0A2647',
          muted: '#4A6080',
          dim: '#526882',
          faint: '#5C738D',
        },
        gold: '#C4952F',
        danger: '#E8553D',
        success: '#22C55E',
        line: 'rgba(10,38,71,0.10)',
        lineSoft: 'rgba(10,38,71,0.05)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'glow':      '0 0 0 1px rgba(92,192,190,0.20), 0 12px 40px -16px rgba(92,192,190,0.30)',
        'card':      '0 4px 24px -8px rgba(10,38,71,0.10), 0 1px 4px rgba(10,38,71,0.06)',
        'cardHover': '0 12px 40px -12px rgba(10,38,71,0.18), 0 0 0 1px rgba(92,192,190,0.30)',
      },
      borderRadius: {
        'btn':   '10px',
        'card':  '16px',
        'modal': '20px',
      },
      keyframes: {
        fadeIn:       { from: { opacity: '0' }, to: { opacity: '1' } },
        fadeUp:       { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        slideInUp:    { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        pulseGlow:    { '0%, 100%': { boxShadow: '0 0 0 0 rgba(92,192,190,0.35)' }, '50%': { boxShadow: '0 0 0 14px rgba(92,192,190,0)' } },
        shimmer:      { '100%': { transform: 'translateX(100%)' } },
        ticker:       { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        fadeIn:       'fadeIn .4s ease-out',
        fadeUp:       'fadeUp .5s ease-out',
        slideInRight: 'slideInRight .3s cubic-bezier(.22,1,.36,1)',
        slideInUp:    'slideInUp .25s ease-out',
        pulseGlow:    'pulseGlow 2.4s infinite',
        shimmer:      'shimmer 1.4s infinite',
        ticker:       'ticker 28s linear infinite',
      },
      backgroundImage: {
        'hero-grid': 'radial-gradient(circle at 80% 50%, rgba(92,192,190,0.08), transparent 50%), radial-gradient(circle at 20% 80%, rgba(13,115,119,0.06), transparent 50%)',
      },
    },
  },
  plugins: [],
};

export default config;
