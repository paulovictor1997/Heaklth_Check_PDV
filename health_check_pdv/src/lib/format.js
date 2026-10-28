// Funções de formatação de texto usadas nas telas do painel.

// As datas da API vêm em UTC. O painel mostra no horário de Brasília, fixo: as páginas
// são montadas no servidor, e o servidor de produção pode estar configurado em UTC.
const TIME_ZONE = "America/Sao_Paulo";

const numberFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const relativeTimeFormat =new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

// pluralize(1, "máquina", "máquinas") → "1 máquina"; pluralize(3, ...) → "3 máquinas"
export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

// 237.94 → "237,9"
export function formatNumber(value) {
  return numberFormat.format(value);
}

// 23.5 → "23,5%"
export function formatPercent(value) {
  return `${formatNumber(value)}%`;
}

// "2026-10-26T14:14:10.039Z" → "26/10, 11:14"
export function formatDateTime(isoDate) {
  return dateTimeFormat.format(new Date(isoDate));
}

// Date → "11:42:10"
export function formatTime(date) {
  return timeFormat.format(date);
}

// Tempo desde a data até `now`: "agora", "há 3 minutos", "há 2 horas", "há 5 dias"
export function formatTimeAgo(isoDate, now) {
  const seconds = Math.round((now - new Date(isoDate)) / 1000);

  if (seconds < 60) {
    return "agora";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return relativeTimeFormat.format(-minutes, "minute");
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return relativeTimeFormat.format(-hours, "hour");
  }

  return relativeTimeFormat.format(-Math.floor(hours / 24), "day");
}

// Valores dos enums do contrato (seção 1) em texto para a tela
export const SALES_SERVICE_LABELS = {
  RODANDO: "Rodando",
  PARADO: "Fechado",
  NAO_ENCONTRADO: "Não encontrado",
};

export const PRINTER_LABELS = {
  OK: "OK",
  ERRO: "Erro",
  OFFLINE: "Offline",
  NAO_ENCONTRADA: "Não encontrada",
};
