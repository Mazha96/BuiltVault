/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#020718', 900: '#060d2e', 800: '#0a1550', 700: '#0d1d6b' },
        nblue: { DEFAULT: '#00d4ff', dark: '#00aacc', glow: 'rgba(0,212,255,0.3)' },
        npink: { DEFAULT: '#ff2d78', dark: '#cc1f5e', glow: 'rgba(255,45,120,0.3)' },
      },
      fontFamily: { display: ['Rajdhani', 'sans-serif'], body: ['Inter', 'sans-serif'] },
      boxShadow: {
        nblue: '0 0 20px rgba(0,212,255,0.4)',
        npink: '0 0 20px rgba(255,45,120,0.4)',
        card: '0 4px 24px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};
