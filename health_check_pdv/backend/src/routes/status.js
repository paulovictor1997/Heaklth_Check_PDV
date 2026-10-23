// GET /status — diz se o servidor e o banco estão no ar (contrato, seção 4).
// Pensado para monitoramento: 200 quando tudo está ok, 503 quando o banco não responde.
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const statusRouter = Router();

statusRouter.get("/", async (req, res) => {
  let database = "ok";

  try {
    // Consulta mais simples possível: só confirma que a conexão funciona.
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("GET /status: banco indisponível:", error.message);
    database = "indisponivel";
  }

  res.status(database === "ok" ? 200 : 503).json({
    servidor: "ok",
    banco: database,
    horario: new Date().toISOString(),
  });
});
