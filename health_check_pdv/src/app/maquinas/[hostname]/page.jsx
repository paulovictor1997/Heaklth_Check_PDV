import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import HistoryCharts from "@/components/HistoryCharts";
import HistoryTable from "@/components/HistoryTable";
import IncidentList from "@/components/IncidentList";
import StatusBadge from "@/components/StatusBadge";
import { getMachineHistory, getStore } from "@/lib/api";
import { formatDateTime, formatTimeAgo } from "@/lib/format";
import {
  HISTORY_PERIODS,
  getTimeTicks,
  groupIncidents,
  parseHours,
  toChartPoints,
} from "@/lib/history";

// Histórico de uma máquina (/maquinas/L001-CX01?horas=24): gráficos, ocorrências e
// tabela. O período fica na URL, então dá para compartilhar o link já filtrado.
export default async function MachinePage({ params, searchParams }) {
  const { hostname } = await params;
  const { horas } = await searchParams;
  const hours = parseHours(horas);

  const history = await getMachineHistory(hostname, hours);

  if (!history) {
    notFound();
  }

  // A situação atual (inclusive "sem contato") vem do detalhe da loja, onde a API já a
  // calcula — assim o painel não repete a regra dos 10 minutos.
  const store = await getStore(history.loja.codigo);
  const machine = store?.maquinas.find((item) => item.hostname === history.hostname);

  // O período dos gráficos termina agora e começa `hours` horas antes
  const now = new Date();
  const end = now.getTime();
  const start = end - hours * 60 * 60 * 1000;
  const period = HISTORY_PERIODS.find((item) => item.hours === hours);

  return (
    <section className="flex flex-col gap-6">
      <Link
        href={`/lojas/${history.loja.codigo}`}
        className="flex w-fit items-center gap-1 text-sm text-destaque hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Loja {history.loja.codigo} · {history.loja.nome}
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{history.hostname}</h1>
          {machine && <StatusBadge situation={machine.situacao} />}
        </div>
        {machine?.ultimoContato && (
          <p className="text-texto/70">
            Último contato {formatTimeAgo(machine.ultimoContato, now)} (
            {formatDateTime(machine.ultimoContato)})
          </p>
        )}
      </div>

      <nav aria-label="Período" className="flex flex-wrap gap-2">
        {HISTORY_PERIODS.map((item) => (
          <Link
            key={item.hours}
            href={`?horas=${item.hours}`}
            aria-current={item.hours === hours ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${
              item.hours === hours
                ? "border-destaque bg-destaque/20 font-medium"
                : "border-texto/20 text-texto/70 hover:border-destaque hover:text-texto"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {history.total === 0 ? (
        <p className="rounded-lg border border-texto/10 p-6 text-texto/70">
          Nenhum registro nas últimas {period.label}.
        </p>
      ) : (
        <>
          <HistoryCharts
            points={toChartPoints(history.registros)}
            start={start}
            end={end}
            ticks={getTimeTicks(start, end, period.tickMs)}
            showDates={hours > 24}
          />
          <IncidentList incidents={groupIncidents(history.registros)} />
          <HistoryTable records={history.registros} />
        </>
      )}
    </section>
  );
}
