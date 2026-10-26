import Link from "next/link";
import SituationCounts from "@/components/SituationCounts";
import StatusBadge from "@/components/StatusBadge";
import { getSituation } from "@/lib/situations";
import { pluralize } from "@/lib/format";

// Card de uma loja na visão geral; leva ao detalhe da loja (/lojas/001).
// `store` é um item de GET /api/lojas.
export default function StoreCard({ store }) {
  const { accentClassName } = getSituation(store.situacao);

  return (
    <Link
      href={`/lojas/${store.codigo}`}
      className={`flex w-full flex-col gap-3 rounded-lg border border-l-4 border-texto/10 bg-texto/5 p-4 transition-colors hover:bg-texto/10 hover:ring-1 hover:ring-destaque focus-visible:ring-2 focus-visible:ring-destaque focus-visible:outline-none ${accentClassName}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-texto/60">Loja {store.codigo}</p>
          <h2 className="text-lg font-medium">{store.nome}</h2>
        </div>
        <StatusBadge situation={store.situacao} />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm text-texto/70">
          {store.totalMaquinas === 0
            ? "Nenhuma máquina cadastrada"
            : pluralize(store.totalMaquinas, "máquina", "máquinas")}
        </p>
        <SituationCounts counts={store.situacoes} />
      </div>
    </Link>
  );
}
