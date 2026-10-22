// Configuração do Prisma CLI (migrate, generate, studio, seed).
// O .env não é carregado automaticamente pelo Prisma 7, por isso o import do dotenv.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
