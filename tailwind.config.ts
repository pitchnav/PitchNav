import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette
        navy: {
          950: '#05080f',
          900: '#080d1a',
          800: '#0d1629',
          700: '#132038',
          600: '#1a2d50',
        },
        electric: {
          blue: '#2563eb',
          'blue-light': '#3b82f6',
          'blue-glow': '#60a5fa',
        },
        accent: {
          green: '#00e5a0',
          'green-dim': '#00b87d',
        },
        surface: {
          DEFAULT: '#111827',
          card: '#1a2235',
          hover: '#1f2d44',
          border: '#1e2d45',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #05080f 0%, #0d1629 50%, #132038 100%)',
        'card-gradient': 'linear-gradient(145deg, #1a2235 0%, #111827 100%)',
        'accent-gradient': 'linear-gradient(90deg, #2563eb 0%, #00e5a0 100%)',
        'glow-blue': 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 40px rgba(37, 99, 235, 0.2)',
        'glow': '0 0 30px rgba(37, 99, 235, 0.3)',
        'glow-green': '0 0 30px rgba(0, 229, 160, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
