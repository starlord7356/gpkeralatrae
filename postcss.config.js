module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      overrideBrowserslist: ['last 2 versions', '> 1%', 'not dead'],
      flexbox: true,
      grid: true
    },
  },
}