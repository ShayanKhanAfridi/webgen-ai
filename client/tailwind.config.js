/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        'primary-dark': '#4f46e5',
        bg: '#0f0f13',
        surface: '#1a1a24',
        'surface-2': '#22222f',
        text: '#f1f0f5',
        'text-muted': '#9898ab',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        input: '8px',
        btn: '6px',
      },
    },
  },
  plugins: [],
}
