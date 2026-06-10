import { defineConfig } from "@prisma/config";

export default defineConfig({
  datasource: {
    adapter: "sqlite", // yoki "postgresql", "mysql", "mongodb"
    url: process.env.DATABASE_URL,
  },
});
