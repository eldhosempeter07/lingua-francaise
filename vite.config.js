import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import vuetify from "vite-plugin-vuetify";

// Config
export default defineConfig(({ command }) => ({
  plugins: [
    vue(),
    vuetify({ autoImport: true }), // Add this line
    command === "serve" ? vueDevTools() : null,
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  base: "./",
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vuetify: ["vuetify"],
        },
      },
    },
  },
}));
