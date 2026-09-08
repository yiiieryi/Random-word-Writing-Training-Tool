/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f1f1ee',
        card: '#faf9f6',
        line: '#e0ded8',
        ink: '#2b2b28',
        muted: '#8c8a84',
        accent: {
          DEFAULT: '#3c3c38',
          deep: '#262622',
          soft: '#ebeae6',
        },
        pine: '#5a6b5f',
      },
      fontFamily: {
        body: ['"Microsoft YaHei"', '"PingFang SC"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        display: ['"Songti SC"', '"STSong"', '"SimSun"', '"Noto Serif SC"', '"Noto Serif CJK SC"', '"Source Han Serif SC"', '"AR PL UMing CN"', 'Georgia', '"Times New Roman"', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(43,38,32,0.04), 0 10px 26px -14px rgba(43,38,32,0.16)',
        lift: '0 2px 4px rgba(43,38,32,0.06), 0 16px 38px -16px rgba(43,38,32,0.22)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'word-swap': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease both',
        'fade-in': 'fade-in 0.3s ease both',
        'pop-in': 'pop-in 0.22s ease both',
        'word-swap': 'word-swap 0.28s ease both',
        'toast-in': 'toast-in 0.22s ease both',
      },
    },
  },
  plugins: [],
}
