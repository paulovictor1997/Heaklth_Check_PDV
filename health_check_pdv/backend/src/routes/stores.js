// Consultas de lojas para o painel (contrato, seção 4). Sem autenticação nesta fase.
//   GET /api/lojas          → resumo de todas as lojas ativas
//   GET /api/lojas/:codigo  → uma loja com as suas máquinas
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { describeHealthCheck } from "../services/healthStatus.js";
import { countSituations, getMachineSituation, getWorstSituation } from "../services/machineSituation.js";

export const storesRouter = Router();

// Só o health check mais recente de cada máquina. A ordenação por coletadoEm aproveita
// o índice (maquinaId, coletadoEm) criado no schema.
const LAST_HEALTH_CHECK = { orderBy: { coletadoEm: "desc" }, take: 1 };

storesRouter.get("/", async (req, res) => {
  const stores = await prisma.loja.findMany({
    where: { ativa: true },
    orderBy: { codigo: "asc" },
    include: {
      maquinas: {
        where: { ativa: true },
        // Para o resumo basta o status do último registro
        include: { healthChecks: { ...LAST_HEALTH_CHECK, select: { status: true } } },
      },
    },
  });

  const now = new Date();

  res.json(
    stores.map((store) => {
      const situations = store.maquinas.map((machine) =>
        getMachineSituation(machine, machine.healthChecks[0], now)
      );

      return {
        codigo: store.codigo,
        nome: store.nome,
        totalMaquinas: situations.length,
        situacoes: countSituations(situations),
        situacao: getWorstSituation(situations),
      };
    })
  );
});

storesRouter.get("/:codigo", async (req, res) => {
  const store = await prisma.loja.findUnique({
    where: { codigo: req.params.codigo },
    include: {
      maquinas: {
        where: { ativa: true },
        orderBy: { numeroCaixa: "asc" },
        include: { healthChecks: LAST_HEALTH_CHECK },
      },
    },
  });

  if (!store || !store.ativa) {
    return res.status(404).json({ erro: `Loja ${req.params.codigo} não encontrada` });
  }

  const now = new Date();

  const machines = store.maquinas.map((machine) => {
    const lastHealthCheck = machine.healthChecks[0];

    return {
      hostname: machine.hostname,
      numeroCaixa: machine.numeroCaixa,
      ip: machine.ip,
      ultimoContato: machine.ultimoContato,
      situacao: getMachineSituation(machine, lastHealthCheck, now),
      ultimoHealthCheck: lastHealthCheck ? describeHealthCheck(lastHealthCheck) : null,
    };
  });

  const situations = machines.map((machine) => machine.situacao);

  res.json({
    codigo: store.codigo,
    nome: store.nome,
    totalMaquinas: machines.length,
    situacoes: countSituations(situations),
    situacao: getWorstSituation(situations),
    maquinas: machines,
  });
});
