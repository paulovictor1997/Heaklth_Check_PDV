// Consultas de máquinas para o painel (contrato, seção 4). Sem autenticação nesta fase.
//   GET /api/maquinas/:hostname/historico?horas=24 → registros das últimas N horas
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { z, formatIssues } from "../lib/validation.js";
import { describeHealthCheck } from "../services/healthStatus.js";

export const machinesRouter = Router();

// ?horas= vem da URL como texto; z.coerce converte para número.
// Até 30 dias (720 h): a PDV envia a cada 5 min, então 30 dias ≈ 8.640 registros.
const historyQuerySchema = z.object({
  horas: z.coerce.number().int().min(1).max(720).default(24),
});

machinesRouter.get("/:hostname/historico", async (req, res) => {
  const query = historyQuerySchema.safeParse(req.query);

  if (!query.success) {
    return res.status(400).json({ erro: "Dados inválidos", detalhes: formatIssues(query.error) });
  }

  const hours = query.data.horas;
  const hostname = req.params.hostname.toUpperCase();

  const machine = await prisma.maquina.findUnique({
    where: { hostname },
    include: { loja: { select: { codigo: true, nome: true } } },
  });

  if (!machine) {
    return res.status(404).json({ erro: `Máquina ${hostname} não encontrada` });
  }

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const records = await prisma.healthCheck.findMany({
    where: { maquinaId: machine.id, coletadoEm: { gte: since } },
    orderBy: { coletadoEm: "desc" }, // do mais recente para o mais antigo
  });

  res.json({
    hostname: machine.hostname,
    loja: machine.loja,
    horas: hours,
    total: records.length,
    registros: records.map(describeHealthCheck),
  });
});
