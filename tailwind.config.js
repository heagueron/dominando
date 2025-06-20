/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'domino-black': '#1a1a1a',
        'domino-white': '#f5f5f5',
        'table-wood': '#587e76',
        'table-wood-dark': '#7e4a35',
      },
      boxShadow: {
        'domino': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      keyframes: {
        'fade-in-scale': {
          'from': {
            opacity: '0',
            transform: 'scale(.95)',
          },
          'to': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
      },
      animation: {
        'fade-in-scale': 'fade-in-scale 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
}
