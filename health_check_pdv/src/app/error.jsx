"use client";

// Tela de erro de todas as páginas (ex.: API fora do ar). Precisa ser "use client":
// é uma Error Boundary do React, que roda no navegador.
import { useEffect } from "react";
import { RotateCw, ServerOff } from "lucide-react";
import { REFRESH_INTERVAL_MS } from "@/lib/refresh";

// retry() busca os dados de novo no servidor e, dando certo, volta para a página normal
export default function ErrorPage({ error, retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // O painel pode ficar aberto numa tela sem ninguém para clicar: tenta de novo sozinho
  useEffect(() => {
    const interval = setInterval(retry, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [retry]);

  return (
    <section
      role="alert"
      className="flex flex-col items-start gap-4 rounded-lg border border-critico/50 bg-critico/10 p-6"
    >
      <div className="flex items-center gap-2">
        <ServerOff className="size-5 text-critico" aria-hidden="true" />
        <h1 className="text-lg font-medium">Não foi possível carregar os dados</h1>
      </div>

      <p className="text-texto/70">
        A API do Health Check pode estar fora do ar. O painel tenta de novo
        automaticamente a cada {REFRESH_INTERVAL_MS / 1000} segundos.
      </p>

      {/* Em produção o Next esconde a mensagem original (pode ter dados internos) e
          manda só um código, que aparece no log do servidor junto com o erro real */}
      {process.env.NODE_ENV === "development" ? (
        <p className="text-sm text-texto/50">Detalhe: {error?.message}</p>
      ) : (
        error?.digest && <p className="text-sm text-texto/50">Código do erro: {error.digest}</p>
      )}

      <button
        type="button"
        onClick={() => retry()}
        className="flex items-center gap-2 rounded-md border border-destaque px-3 py-1.5 text-sm font-medium hover:bg-destaque/20"
      >
        <RotateCw className="size-4" aria-hidden="true" />
        Tentar agora
      </button>
    </section>
  );
}
