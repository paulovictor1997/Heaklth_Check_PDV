import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import MachinesTable from "@/components/MachinesTable";
import SituationCounts from "@/components/SituationCounts";
import StatusBadge from "@/components/StatusBadge";
import { getStore } from "@/lib/api";
import { pluralize } from "@/lib/format";

// Detalhe de uma loja (/lojas/001): resumo no topo e a tabela das máquinas.
// No Next.js 16, `params` é uma Promise — por isso o await.
export default async function StorePage({ params }) {
  const { codigo } = await params;
  const store = await getStore(codigo);

  // API respondeu 404: loja inexistente ou inativa
  if (!store) {
    notFound();
  }

  // Mesmo horário para todas as linhas do "há X minutos"
  const now = new Date();

  return (
    <section className="flex flex-col gap-6">
      <Link
        href="/"
        className="flex w-fit items-center gap-1 text-sm text-destaque hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Visão geral
      </Link>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-texto/60">Loja {store.codigo}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{store.nome}</h1>
          <StatusBadge situation={store.situacao} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-texto/70">
          <span>{pluralize(store.totalMaquinas, "máquina", "máquinas")}</span>
          <SituationCounts counts={store.situacoes} />
        </div>
      </div>

      {store.maquinas.length > 0 ? (
        <MachinesTable machines={store.maquinas} now={now} />
      ) : (
        <p className="rounded-lg border border-texto/10 p-6 text-texto/70">
          Nenhuma máquina cadastrada nesta loja. A máquina aparece aqui automaticamente
          após o primeiro envio da PDV.
        </p>
      )}
    </section>
  );
}
