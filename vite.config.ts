import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/Bosslady-inventory/",

  server: {
    port: 8080,
    host: "0.0.0.0",
  },

  resolve: {
    tsconfigPaths: true,
  },

  plugins: [
    tailwindcss(),
<<<<<<< HEAD
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
=======
    tanstackStart(),
>>>>>>> 5fb61bbe4094b295f409c0685ae1bd5908710752
    react(),
  ],
});
