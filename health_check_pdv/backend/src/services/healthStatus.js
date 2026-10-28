// Cálculo do status geral (semáforo) de um health check — contrato, seção 2.
// Cada item avaliado pode gerar um motivo com a sua gravidade. O status geral é o
// PIOR entre eles; sem nenhum motivo, a máquina está NORMAL.
import { StatusGeral } from "../../generated/prisma/index.js";
import { THRESHOLDS } from "../config/thresholds.js";

// Ordem de gravidade, para descobrir o pior status
const SEVERITY = [StatusGeral.NORMAL, StatusGeral.ATENCAO, StatusGeral.CRITICO];

// Textos usados nos motivos (o valor do enum vira algo legível no painel)
const SALES_SERVICE_TEXT = {
  PARADO: "fechado",
  NAO_ENCONTRADO: "não encontrado",
};

const PRINTER_TEXT = {
  ERRO: "com erro",
  OFFLINE: "offline",
  NAO_ENCONTRADA: "não encontrada",
};

// 12.3456 → "12,3"
function formatPercent(value) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

// Recebe os dados já validados e devolve { status, reasons }.
// reasons é uma lista de textos, ex.: ["Disco C: com 12% livre"]
export function computeHealthStatus(data) {
  const findings = [];

  const diskFreePercent = (data.discoLivreGb / data.discoTotalGb) * 100;
  if (diskFreePercent < THRESHOLDS.disk.criticalBelowPercent) {
    findings.push({ status: StatusGeral.CRITICO, reason: `Disco C: com ${formatPercent(diskFreePercent)}% livre` });
  } else if (diskFreePercent < THRESHOLDS.disk.warningBelowPercent) {
    findings.push({ status: StatusGeral.ATENCAO, reason: `Disco C: com ${formatPercent(diskFreePercent)}% livre` });
  }

  if (data.cpuUso > THRESHOLDS.cpu.warningAbovePercent) {
    findings.push({ status: StatusGeral.ATENCAO, reason: `CPU em ${formatPercent(data.cpuUso)}% de uso` });
  }

  if (data.memoriaUso > THRESHOLDS.memory.warningAbovePercent) {
    findings.push({ status: StatusGeral.ATENCAO, reason: `Memória em ${formatPercent(data.memoriaUso)}% de uso` });
  }

  // Sistema de vendas (.exe): fechado pode ser só o caixa sem uso, então é atenção;
  // não encontrado no caminho configurado é problema de instalação, então é crítico
  if (data.servicoVendas !== "RODANDO") {
    findings.push({
      status: data.servicoVendas === "PARADO" ? StatusGeral.ATENCAO : StatusGeral.CRITICO,
      reason: `Sistema de vendas ${SALES_SERVICE_TEXT[data.servicoVendas]}`,
    });
  }

  // Toda PDV tem impressora fiscal: sem ela não sai a nota
  if (data.impressoraFiscal !== "OK") {
    findings.push({
      status: StatusGeral.CRITICO,
      reason: `Impressora fiscal ${PRINTER_TEXT[data.impressoraFiscal]}`,
    });
  }

  const worstIndex = Math.max(0, ...findings.map((finding) => SEVERITY.indexOf(finding.status)));

  return {
    status: SEVERITY[worstIndex],
    reasons: findings.map((finding) => finding.reason),
  };
}

// Prepara um registro do banco para a resposta das consultas do painel.
// Os motivos não ficam gravados, então são recalculados a partir dos números do registro.
export function describeHealthCheck(record) {
  return {
    id: record.id,
    coletadoEm: record.coletadoEm,
    recebidoEm: record.recebidoEm,
    discoTotalGb: record.discoTotalGb,
    discoLivreGb: record.discoLivreGb,
    cpuUso: record.cpuUso,
    memoriaUso: record.memoriaUso,
    servicoVendas: record.servicoVendas,
    impressoraFiscal: record.impressoraFiscal,
    status: record.status,
    motivos: computeHealthStatus(record).reasons,
  };
}
