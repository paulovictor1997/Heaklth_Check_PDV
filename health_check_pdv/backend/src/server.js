// Ponto de entrada da API: carrega o .env e coloca o servidor no ar.
// O dotenv precisa ser o primeiro import, antes de qualquer arquivo que use process.env.
import "dotenv/config";
import { app } from "./app.js";
import { prisma } from "./lib/prisma.js";

// 3001 por padrão, para não brigar com o Next.js (3000) rodando na mesma máquina.
const PORT = Number(process.env.PORT) || 3001;

const server = app.listen(PORT, () => {
  console.log(`API do Health Check PDV rodando em http://localhost:${PORT}`);
});

// Ao parar o servidor (Ctrl+C ou o serviço sendo encerrado), fecha as conexões
// com o banco antes de sair.
async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
