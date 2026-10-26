import SituationCounts from "@/components/SituationCounts";
import StoreCard from "@/components/StoreCard";
import { getStores } from "@/lib/api";
import { pluralize } from "@/lib/format";
import { SITUATIONS } from "@/lib/situations";

// Visão geral: um card por loja ativa, na ordem do código (como vem da API).
// Se a API falhar, o erro sobe para o Next.js, que mostra o app/error.jsx.
export default async function Home() {
  const stores = await getStores();

  if (stores.length === 0) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Visão geral</h1>
        <p className="rounded-lg border border-texto/10 p-6 text-texto/70">
          Nenhuma loja ativa cadastrada.
        </p>
      </section>
    );
  }

  // Soma as máquinas de todas as lojas, por situação, para o resumo do topo
  const totalMachines = stores.reduce((sum, store) => sum + store.totalMaquinas, 0);
  const totalCounts = Object.fromEntries(
    Object.keys(SITUATIONS).map((key) => [
      key,
      stores.reduce((sum, store) => sum + store.situacoes[key], 0),
    ])
  );

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Visão geral</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-texto/70">
          <span>
            {pluralize(stores.length, "loja", "lojas")} ·{" "}
            {pluralize(totalMachines, "máquina", "máquinas")}
          </span>
          <SituationCounts counts={totalCounts} />
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stores.map((store) => (
          <li key={store.codigo} className="flex">
            <StoreCard store={store} />
          </li>
        ))}
      </ul>
    </section>
  );
}
