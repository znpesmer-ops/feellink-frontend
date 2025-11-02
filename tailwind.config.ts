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
          orange: '#ff7b00',
          dark: '#1f1f1f',
          light: '#f8f8f8',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        softPulse: {
          '0%': { boxShadow: '0 0 0 rgba(249,115,22,0.3)' },
          '50%': { boxShadow: '0 0 10px rgba(249,115,22,0.2)' },
          '100%': { boxShadow: '0 0 0 rgba(249,115,22,0.3)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        softPulse: 'softPulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config


