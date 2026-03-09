/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      transitionDuration: {
        '400': '400ms',
      },
      colors: {
        bg: '#070A10',
        surface: '#0B1020',
        surface2: '#0E1730',
        surface3: '#121D3A',
        border: 'rgba(255,255,255,0.10)',
        'border-light': 'rgba(255,255,255,0.06)',
        text: '#EAF0FF',
        muted: 'rgba(234,240,255,0.68)',
        'muted-dim': 'rgba(234,240,255,0.38)',
        accent: '#00E5FF',
        'accent-violet': '#8B5CF6',
        'accent-cyan': '#06B6D4',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        bullish: '#10B981',
        bearish: '#EF4444',
        hot: '#F97316',
        rising: '#8B5CF6',
      },
      fontFamily: {
        display: ['"Outfit"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        'card': '18px',
        'pill': '999px',
      },
      boxShadow: {
        'glow': '0 0 40px rgba(0,229,255,0.12)',
        'glow-lg': '0 0 80px rgba(0,229,255,0.18)',
        'glow-violet': '0 0 60px rgba(139,92,246,0.15)',
        'soft': '0 4px 32px rgba(0,0,0,0.4)',
        'card': '0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
        'card-hover': '0 16px 56px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'float-slow': 'float-slow 8s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in': 'fadeIn 0.7s ease-out forwards',
        'slide-up': 'slideUp 0.7s ease-out forwards',
        'grain': 'grain 8s steps(10) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-8px) rotate(0.5deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(28px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-5%, -10%)' },
          '30%': { transform: 'translate(7%, -25%)' },
          '50%': { transform: 'translate(-15%, 10%)' },
          '70%': { transform: 'translate(0%, 15%)' },
          '90%': { transform: 'translate(-10%, 10%)' },
        },
      },
    },
  },
  plugins: [],
}
