/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        },
      },
      animation: {
        'flip-in': 'flipIn 0.4s ease-out',
        'bounce-in': 'bounceIn 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'seat-shake': 'seatShake 0.5s ease-in-out',
      },
      keyframes: {
        flipIn: {
          '0%': { transform: 'rotateY(90deg)', opacity: '0' },
          '100%': { transform: 'rotateY(0deg)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        seatShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%': { transform: 'translateX(-6px) rotate(-3deg)' },
          '30%': { transform: 'translateX(5px) rotate(2deg)' },
          '45%': { transform: 'translateX(-4px) rotate(-2deg)' },
          '60%': { transform: 'translateX(3px) rotate(1deg)' },
          '75%': { transform: 'translateX(-2px)' },
        },
      },
    },
  },
  plugins: [],
}
