// Preparação dos dados do histórico de uma máquina para a tela (/maquinas/L001-CX01).
// Os registros vêm de GET /api/maquinas/:hostname/historico, do mais recente para o mais antigo.

const HOUR_MS = 60 * 60 * 1000;

// Períodos oferecidos na tela; tickMs é o espaço entre as marcas do eixo dos gráficos
export const HISTORY_PERIODS = [
  { hours: 6, label: "6 horas", tickMs: HOUR_MS },
  { hours: 24, label: "24 horas", tickMs: 4 * HOUR_MS },
  { hours: 168, label: "7 dias", tickMs: 24 * HOUR_MS },
  { hours: 720, label: "30 dias", tickMs: 5 * 24 * HOUR_MS },
];

export const DEFAULT_HOURS = 24;

// ?horas= da URL → um dos períodos acima (qualquer outro valor vira o padrão)
export function parseHours(value) {
  const hours = Number(value);
  return HISTORY_PERIODS.some((period) => period.hours === hours) ? hours : DEFAULT_HOURS;
}

// Sem envio por mais que isso, a linha do gráfico é interrompida em vez de ligar os
// pontos — é o mesmo limite de "sem contato" do contrato (seção 3).
const NO_CONTACT_MS = 10 * 60 * 1000;

// Registros → pontos dos gráficos, do mais antigo para o mais recente.
// Nas falhas de envio entra um ponto vazio (null), que quebra a linha.
export function toChartPoints(records) {
  const points = [];

  for (const record of [...records].reverse()) {
    const time = new Date(record.coletadoEm).getTime();
    const previous = points.at(-1);

    if (previous && time - previous.time > NO_CONTACT_MS) {
      points.push({ time: previous.time + 1, disco: null, cpu: null, memoria: null });
    }

    points.push({
      time,
      disco: (record.discoLivreGb / record.discoTotalGb) * 100,
      cpu: record.cpuUso,
      memoria: record.memoriaUso,
    });
  }

  // Um registro sem vizinhos (falha de envio antes e depois) não forma linha;
  // `isolated` faz o gráfico desenhar um ponto para ele não sumir
  const hasData = (point) => point !== undefined && point.cpu !== null;

  points.forEach((point, index) => {
    point.isolated = hasData(point) && !hasData(points[index - 1]) && !hasData(points[index + 1]);
  });

  return points;
}

// Marcas do eixo do tempo alinhadas no horário de Brasília (UTC-3, sem horário de verão):
// 00:00, 04:00, 08:00... em vez de horários quebrados como 11:23.
const BRASILIA_OFFSET_MS = -3 * HOUR_MS;

export function getTimeTicks(start, end, tickMs) {
  const ticks = [];
  let tick = Math.ceil((start + BRASILIA_OFFSET_MS) / tickMs) * tickMs - BRASILIA_OFFSET_MS;

  for (; tick <= end; tick += tickMs) {
    ticks.push(tick);
  }

  return ticks;
}

// Agrupa registros seguidos com o mesmo problema numa só ocorrência.
// Ex.: 6 envios seguidos com "Disco C: com 10% livre" → 1 ocorrência de 11:00 a 11:25.
// Registros NORMAL encerram a ocorrência e não aparecem na lista.
export function groupIncidents(records) {
  const incidents = [];
  let current = null;

  for (const record of [...records].reverse()) {
    const key = `${record.status}|${record.motivos.join("|")}`;

    if (record.status === "NORMAL") {
      current = null;
      continue;
    }

    if (current?.key === key) {
      current.end = record.coletadoEm;
      current.count++;
      continue;
    }

    current = {
      key,
      status: record.status,
      motivos: record.motivos,
      start: record.coletadoEm,
      end: record.coletadoEm,
      count: 1,
    };
    incidents.push(current);
  }

  // Mais recentes primeiro, como no resto da tela
  return incidents.reverse();
}
