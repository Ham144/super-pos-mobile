const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");
const path = require("path");

// https://vitejs.dev/config/
module.exports = defineConfig({
  plugins: [react()],
  cacheDir: path.resolve(__dirname, ".vite-cache"),
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: {
      // The project is mounted from the Windows filesystem when Vite runs in WSL.
      // Polling keeps HMR reliable when native filesystem events are not forwarded.
      usePolling: true,
      interval: 100,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: [
            "react",
            "react-dom",
            "react-router-dom",
            "@tanstack/react-query",
            "zustand",
            "lucide-react",
            "react-hot-toast",
          ],
          ui: [
            "tailwindcss",
            "daisyui",
            "class-variance-authority",
            "clsx",
            "tailwind-merge",
          ],
          charts: ["chart.js", "react-chartjs-2"],
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "zustand",
      "lucide-react",
      "react-hot-toast",
    ],
  },
});
