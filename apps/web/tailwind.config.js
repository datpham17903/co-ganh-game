/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Tokens dùng CSS variables để dark mode hoạt động qua class .dark trên html.
        // Định nghĩa biến trong styles.css.
        'bg-primary': 'var(--bg-primary)',
        'bg-board': 'var(--bg-board)',
        'bg-board-line': 'var(--bg-board-line)',
        'piece-black': '#1A1A1A',
        'piece-white': 'var(--piece-white)',
        accent: 'var(--accent)',
        'accent-2': 'var(--accent-2)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
        surface: 'var(--surface)',
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
