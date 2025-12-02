import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        feellink: {
          orange: '#FF7A00',
          blue: '#007AFF',
          dark: '#1F1F1F',
          light: '#F8F8F8',
          white: '#FFFFFF',
        },
        brand: {
          orange: '#FF8A00',
          blue: '#1E88E5',
          white: '#FFFFFF',
          dark: '#0A0F1F',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        fadeOut: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        softPulse: {
          '0%': { boxShadow: '0 0 0 rgba(249,115,22,0.3)' },
          '50%': { boxShadow: '0 0 10px rgba(249,115,22,0.2)' },
          '100%': { boxShadow: '0 0 0 rgba(249,115,22,0.3)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        fadeOut: 'fadeOut 1.5s ease-out forwards',
        softPulse: 'softPulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config


