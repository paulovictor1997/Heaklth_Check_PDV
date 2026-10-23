// POST /api/health-checks — recebe o envio de uma PDV (contrato, seção 1).
//
// Passo a passo:
//   1. requireApiKey confere a chave e coloca a loja em req.store
//   2. Zod valida o corpo
//   3. o hostname precisa ser da mesma loja da chave
//   4. cria a máquina se for o primeiro envio (ou atualiza IP e último contato)
//   5. calcula o semáforo e grava o registro
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireApiKey } from "../middlewares/requireApiKey.js";
import { formatIssues } from "../lib/validation.js";
import { healthCheckSchema, HOSTNAME_REGEX } from "../schemas/healthCheckSchema.js";
import { computeHealthStatus } from "../services/healthStatus.js";

export const healthChecksRouter = Router();

healthChecksRouter.post("/", requireApiKey, async (req, res) => {
  const result = healthCheckSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ erro: "Dados inválidos", detalhes: formatIssues(result.error) });
  }

  const data = result.data;
  const [, storeCode, cashRegister] = data.hostname.match(HOSTNAME_REGEX);

  // Impede que uma loja envie dados em nome de outra
  if (storeCode !== req.store.codigo) {
    return res.status(403).json({
      erro: `O hostname ${data.hostname} é da loja ${storeCode}, mas a chave enviada é da loja ${req.store.codigo}`,
    });
  }

  const { status, reasons } = computeHealthStatus(data);

  // Relógio do servidor: o da PDV pode estar errado (contrato, seção 1)
  const now = new Date();

  // Transação: máquina e registro são gravados juntos, ou nenhum dos dois.
  const healthCheck = await prisma.$transaction(async (tx) => {
    const machine = await tx.maquina.upsert({
      where: { hostname: data.hostname },
      // Primeiro envio: cadastra a máquina com loja e caixa tirados do hostname
      create: {
        hostname: data.hostname,
        numeroCaixa: Number(cashRegister),
        ip: data.ip,
        lojaId: req.store.id,
        ultimoContato: now,
      },
      // Já existe: atualiza o IP (se veio) e o último contato
      update: {
        ip: data.ip,
        ultimoContato: now,
      },
    });

    return tx.healthCheck.create({
      data: {
        maquinaId: machine.id,
        coletadoEm: new Date(data.coletadoEm),
        recebidoEm: now,
        discoTotalGb: data.discoTotalGb,
        discoLivreGb: data.discoLivreGb,
        cpuUso: data.cpuUso,
        memoriaUso: data.memoriaUso,
        servicoVendas: data.servicoVendas,
        impressoraFiscal: data.impressoraFiscal,
        status,
      },
    });
  });

  res.status(201).json({ id: healthCheck.id, status, motivos: reasons });
});
