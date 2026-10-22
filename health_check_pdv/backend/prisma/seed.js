// Seed: popula o banco com as lojas da rede (lista do README, seção 7.1).
// Rodar com: npx prisma db seed
//
// Usa upsert pelo código da loja, então pode ser executado várias vezes sem duplicar:
// se a loja já existe, só atualiza o nome; se não existe, cria.
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const lojas = [
  { codigo: "001", nome: "Matriz" },
  { codigo: "005", nome: "Moreira Lima" },
  { codigo: "006", nome: "Maceió Shopping" },
  { codigo: "007", nome: "Sams Club Gruta" },
  { codigo: "009", nome: "Rua do Comércio" },
  { codigo: "011", nome: "Rua do Livramento" },
  { codigo: "013", nome: "Aracaju Centro - 01" },
  { codigo: "014", nome: "Aracaju Shopping" },
  { codigo: "016", nome: "Arapiraca Centro" },
  { codigo: "020", nome: "Depósito" },
  { codigo: "021", nome: "Aracaju Centro - 02" },
  { codigo: "022", nome: "Shopping Pátio" },
  { codigo: "029", nome: "Arapiraca Shopping" },
  { codigo: "036", nome: "Jacintinho" },
  { codigo: "039", nome: "Outlet" },
  { codigo: "043", nome: "Palmeira dos Índios" },
];

async function main() {
  for (const loja of lojas) {
    await prisma.loja.upsert({
      where: { codigo: loja.codigo },
      update: { nome: loja.nome },
      create: loja,
    });
  }

  const total = await prisma.loja.count();
  console.log(`Seed concluído: ${lojas.length} lojas processadas, ${total} no banco.`);
}

try {
  await main();
} catch (erro) {
  console.error("Erro ao rodar o seed:", erro);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
