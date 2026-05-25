/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // theo UI_UX.md mục 2.1
        'bg-primary': '#F5E6C8',
        'bg-board': '#D9B074',
        'bg-board-line': '#6B3F1D',
        'piece-black': '#1A1A1A',
        'piece-white': '#FAF7EE',
        accent: '#C0392B',
        'accent-2': '#2E7D32',
        'text-primary': '#2C1810',
        'text-muted': '#6B5444',
        surface: '#FFF8E7',
      },
      fontFamily: {
        display: ['"Be Vietnam Pro"', '"SF Pro"', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        num: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
