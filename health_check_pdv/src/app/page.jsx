import StatusBadge from "@/components/StatusBadge";
import { getStores } from "@/lib/api";

// Página provisória: a visão geral com os cards das lojas entra na Parte 3.
// Por enquanto ela mostra os selos de situação e testa a conexão com a API.
const situations = ["NORMAL", "ATENCAO", "CRITICO", "SEM_CONTATO", null];

export default async function Home() {
  // try/catch só nesta página de teste; o tratamento de erro definitivo é a Parte 6
  let apiMessage;

  try {
    const stores = await getStores();
    apiMessage = `API conectada: ${stores.length} lojas ativas.`;
  } catch (error) {
    apiMessage = `Erro ao consultar a API: ${error.message}`;
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Visão geral</h1>
      <p className="text-texto/70">{apiMessage}</p>
      <ul className="flex flex-wrap gap-3">
        {situations.map((situation) => (
          <li key={situation ?? "SEM_MAQUINAS"}>
            <StatusBadge situation={situation} />
          </li>
        ))}
      </ul>
    </section>
  );
}
