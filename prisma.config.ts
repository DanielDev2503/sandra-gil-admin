// Prisma 7: las URLs de conexión van aquí, no en schema.prisma
import { config } from "dotenv";
config({ path: ".env.local" });
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["POSTGRES_URL_NON_POOLING"] || process.env["DATABASE_URL"]!,
  },
});
