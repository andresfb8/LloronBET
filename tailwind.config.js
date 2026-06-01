/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:             '#121b14',
        surface:        '#1a261f',
        primary:        '#005a42',
        'primary-dark': '#003d2d',
        muted:          '#a7b7bc',
        'odds-default': '#1e2d22',
        odds:           '#ffdf1b',
        selected:       '#ffdf1b',
        'selected-text':'#121b14',
        live:           '#ff3b30',
        win:            '#00ff85',
        border:         '#2a3d2e',
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
