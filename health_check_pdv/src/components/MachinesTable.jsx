import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import {
  PRINTER_LABELS,
  SALES_SERVICE_LABELS,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatTimeAgo,
} from "@/lib/format";

const COLUMNS = [
  "Caixa",
  "Situação",
  "Disco C:",
  "CPU",
  "Memória",
  "Sistema de vendas",
  "Impressora fiscal",
  "Último contato",
];

// Tabela das máquinas de uma loja (`maquinas` de GET /api/lojas/:codigo).
// Os valores aparecem como vieram; quem diz o que está fora do normal são os
// `motivos` calculados pela API, mostrados abaixo da situação.
export default function MachinesTable({ machines, now }) {
  return (
    // Em telas estreitas a tabela rola na horizontal, sem quebrar a página
    <div className="overflow-x-auto rounded-lg border border-texto/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-texto/5 text-texto/60">
          <tr>
            {COLUMNS.map((column) => (
              <th key={column} scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-texto/10">
          {machines.map((machine) => (
            <MachineRow key={machine.hostname} machine={machine} now={now} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MachineRow({ machine, now }) {
  const healthCheck = machine.ultimoHealthCheck;

  return (
    <tr className="align-top">
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="font-medium">Caixa {String(machine.numeroCaixa).padStart(2, "0")}</p>
        <Link
          href={`/maquinas/${machine.hostname}`}
          className="text-destaque hover:underline"
        >
          {machine.hostname}
        </Link>
        {machine.ip && <p className="text-texto/60">{machine.ip}</p>}
      </td>

      <td className="px-4 py-3">
        <StatusBadge situation={machine.situacao} />
        {healthCheck?.motivos.length > 0 && (
          <ul className="mt-2 flex flex-col gap-0.5 text-texto/70">
            {healthCheck.motivos.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
      </td>

      {healthCheck ? (
        <>
          <td className="px-4 py-3 whitespace-nowrap">
            <p>{formatPercent((healthCheck.discoLivreGb / healthCheck.discoTotalGb) * 100)} livre</p>
            <p className="text-texto/60">
              {formatNumber(healthCheck.discoLivreGb)} de {formatNumber(healthCheck.discoTotalGb)} GB
            </p>
          </td>
          <td className="px-4 py-3 whitespace-nowrap">{formatPercent(healthCheck.cpuUso)}</td>
          <td className="px-4 py-3 whitespace-nowrap">{formatPercent(healthCheck.memoriaUso)}</td>
          <td className="px-4 py-3 whitespace-nowrap">
            {SALES_SERVICE_LABELS[healthCheck.servicoVendas]}
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            {PRINTER_LABELS[healthCheck.impressoraFiscal]}
          </td>
        </>
      ) : (
        // Máquina cadastrada que ainda não tem nenhum registro
        <td colSpan={5} className="px-4 py-3 text-texto/60">
          Nenhum registro recebido
        </td>
      )}

      <td className="px-4 py-3 whitespace-nowrap">
        {machine.ultimoContato ? (
          <>
            <p>{formatTimeAgo(machine.ultimoContato, now)}</p>
            <p className="text-texto/60">{formatDateTime(machine.ultimoContato)}</p>
          </>
        ) : (
          <p className="text-texto/60">—</p>
        )}
      </td>
    </tr>
  );
}
