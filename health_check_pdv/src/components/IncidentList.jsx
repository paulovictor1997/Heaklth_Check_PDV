import StatusBadge from "@/components/StatusBadge";
import { formatDateTime, pluralize } from "@/lib/format";

// Ocorrências do período: trechos em que a máquina ficou em Atenção ou Crítico.
// Serviço de vendas e impressora não aparecem nos gráficos, então é aqui que se vê
// "o serviço parou às 11:13". `incidents` vem de groupIncidents().
export default function IncidentList({ incidents }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Ocorrências no período</h2>

      {incidents.length === 0 ? (
        <p className="rounded-lg border border-texto/10 p-4 text-texto/70">
          Nenhuma ocorrência: todos os registros do período estão normais.
        </p>
      ) : (
        <ul className="divide-y divide-texto/10 rounded-lg border border-texto/10">
          {incidents.map((incident) => (
            <li
              key={`${incident.start}-${incident.key}`}
              className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4"
            >
              <div className="sm:w-32 sm:shrink-0">
                <StatusBadge situation={incident.status} />
              </div>
              <div className="flex flex-col gap-1">
                <p>{incident.motivos.join(" · ")}</p>
                <p className="text-sm text-texto/60">
                  {incident.start === incident.end
                    ? formatDateTime(incident.start)
                    : `${formatDateTime(incident.start)} até ${formatDateTime(incident.end)}`}{" "}
                  · {pluralize(incident.count, "registro", "registros")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
