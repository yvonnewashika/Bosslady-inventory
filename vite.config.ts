import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/Bosslady-inventory/",
  server: {
    port: 8080,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
    react(),
    tailwindcss(),
  ],
});