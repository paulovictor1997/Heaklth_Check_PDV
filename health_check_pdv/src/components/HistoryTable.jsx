import StatusBadge from "@/components/StatusBadge";
import {
  PRINTER_LABELS,
  SALES_SERVICE_LABELS,
  formatDateTime,
  formatPercent,
} from "@/lib/format";

// Limite de linhas na tabela: 30 dias são ~8.600 registros, pesado demais para uma
// página. 288 = um dia inteiro de envios a cada 5 minutos.
const MAX_ROWS = 288;

const COLUMNS = ["Coletado em", "Status", "Disco C: livre", "CPU", "Memória", "Serviço de vendas", "Impressora fiscal"];

// Os registros em tabela, fechada por padrão (<details>): é a versão em texto dos
// gráficos, com os valores exatos. `records` vem da API, do mais recente ao mais antigo.
export default function HistoryTable({ records }) {
  const rows = records.slice(0, MAX_ROWS);

  return (
    <details className="rounded-lg border border-texto/10">
      <summary className="cursor-pointer p-4 font-medium text-destaque hover:underline">
        Ver registros em tabela ({records.length})
      </summary>

      {records.length > MAX_ROWS && (
        <p className="px-4 pb-3 text-sm text-texto/60">
          Mostrando os {MAX_ROWS} registros mais recentes.
        </p>
      )}

      <div className="overflow-x-auto border-t border-texto/10">
        <table className="w-full text-left text-sm tabular-nums">
          <thead className="bg-texto/5 text-texto/60">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} scope="col" className="px-4 py-2 font-medium whitespace-nowrap">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-texto/10">
            {rows.map((record) => (
              <tr key={record.id}>
                <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(record.coletadoEm)}</td>
                <td className="px-4 py-2">
                  <StatusBadge situation={record.status} />
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {formatPercent((record.discoLivreGb / record.discoTotalGb) * 100)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">{formatPercent(record.cpuUso)}</td>
                <td className="px-4 py-2 whitespace-nowrap">{formatPercent(record.memoriaUso)}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {SALES_SERVICE_LABELS[record.servicoVendas]}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {PRINTER_LABELS[record.impressoraFiscal]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
