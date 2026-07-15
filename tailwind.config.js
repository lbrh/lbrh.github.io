/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#070707',
        surface: '#0e0e0e',
        accent:  '#00e5c8',
        muted:   '#555550',
        border:  '#191919',
        purple:  '#7c5cfc',
      },
      fontFamily: {
        display: ['var(--font-syne)', 'sans-serif'],
        body:    ['var(--font-inter)', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Space Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
