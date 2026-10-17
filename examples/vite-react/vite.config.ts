import tailcloak from "@tailcloak/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), tailcloak({ prefix: "tc_", sources: ["../ui/src"] })],
});
