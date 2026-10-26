// Acesso à API Express (backend/) — contrato em backend/docs/contrato-api.md, seção 4.
//
// Só roda no servidor do Next.js (Server Components): o navegador nunca fala direto
// com a API nem conhece o API_URL. Se algum componente "use client" importar este
// arquivo, o build falha por causa da linha abaixo.
import "server-only";
import { connection } from "next/server";

// Faz o GET e devolve o JSON. Retorna null quando a API responde 404, para a página
// decidir o que fazer (normalmente chamar notFound()). Outros erros viram exceção.
async function request(path) {
  // Os dados mudam a todo momento: a página nunca é gerada no build, só quando alguém
  // a abre. Precisa ficar fora do try/catch abaixo — no build o Next lança um erro
  // interno aqui de propósito, e o catch o confundiria com a API fora do ar.
  await connection();

  const baseUrl = process.env.API_URL;

  if (!baseUrl) {
    throw new Error("API_URL não configurada (veja o .env.example)");
  }

  let response;

  try {
    // no-store: o painel mostra a situação atual, então nada de cache entre requisições
    response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  } catch (error) {
    throw new Error(`API indisponível em ${baseUrl}`, { cause: error });
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    // A API devolve { erro: "..." } nos erros; se não vier JSON, usa o código HTTP
    const body = await response.json().catch(() => null);
    throw new Error(body?.erro ?? `API respondeu ${response.status} em ${path}`);
  }

  return response.json();
}

// GET /api/lojas → resumo de todas as lojas ativas
export function getStores() {
  return request("/api/lojas");
}

// GET /api/lojas/:codigo → loja com as suas máquinas (null se não existir)
export function getStore(code) {
  return request(`/api/lojas/${encodeURIComponent(code)}`);
}

// GET /api/maquinas/:hostname/historico → registros das últimas N horas (null se não existir)
export function getMachineHistory(hostname, hours = 24) {
  return request(`/api/maquinas/${encodeURIComponent(hostname)}/historico?horas=${hours}`);
}
