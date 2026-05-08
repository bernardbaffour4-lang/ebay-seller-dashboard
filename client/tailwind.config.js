/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ebay: {
          blue: '#0064D2',
          red: '#E53238',
          yellow: '#F5AF02',
          green: '#86B817',
        },
      },
    },
  },
  plugins: [],
};
