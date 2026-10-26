"use client";

// Atualização automática do painel. router.refresh() pede ao servidor do Next.js que
// monte a página de novo (buscando a API outra vez) e troca só o que mudou, sem
// recarregar a página nem piscar a tela.
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { REFRESH_INTERVAL_MS } from "@/lib/refresh";

// `updatedAt` é o horário em que o servidor montou a página (vem do Header)
export default function AutoRefresh({ updatedAt }) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  useEffect(() => {
    // Com a aba escondida não atualiza; ao voltar para ela, atualiza na hora
    function refreshIfVisible() {
      if (document.visibilityState === "visible") {
        startTransition(() => router.refresh());
      }
    }

    const interval = setInterval(refreshIfVisible, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [router]);

  return (
    <div className="flex items-center gap-2 text-sm text-texto/60">
      <span>Atualizado às {updatedAt}</span>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={isRefreshing}
        title="Atualizar agora"
        className="rounded-md p-1.5 hover:bg-texto/10 hover:text-texto disabled:opacity-50"
      >
        <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
        <span className="sr-only">Atualizar agora</span>
      </button>
    </div>
  );
}
