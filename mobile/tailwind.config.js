module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        // Set Aldrich as the default sans-serif font
        sans: [require("path").join(__dirname, "assets/fonts/Aldrich-Regular.ttf")],
        aldrich: ["aldrich"],
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
};
