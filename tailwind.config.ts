import type { Config } from 'tailwindcss'
import { siteTheme } from './src/lib/site-theme'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: siteTheme,
        navy: {
          950: siteTheme.ink,
          900: siteTheme.band,
          800: '#102c3f',
          700: siteTheme.raised,
          600: '#30566d',
        },
        electric: {
          blue: '#30688a',
          'blue-light': siteTheme.blue,
          'blue-glow': '#96cae8',
        },
        accent: {
          green: '#79dcc1',
          'green-dim': '#5cc9ae',
        },
        surface: {
          DEFAULT: siteTheme.band,
          card: siteTheme.panel,
          hover: siteTheme.raised,
          border: siteTheme.line,
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 5px rgb(7 24 46 / 12%)',
        'card-hover': '0 3px 9px rgb(7 24 46 / 16%)',
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
