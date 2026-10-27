import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// tsconfig と同じく「@/」をリポジトリ直下として解決する
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
