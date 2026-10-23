// Client do Prisma compartilhado por toda a API.
// Criar um client por arquivo abriria várias conexões com o banco; por isso existe
// uma única instância, criada aqui e importada onde for preciso.
import { PrismaClient } from "../../generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
