import { LoaderCircle } from "lucide-react";

// Aparece enquanto uma página carrega ao navegar (ex.: clicar num card de loja).
// Nas atualizações automáticas não aparece: a tela atual fica até os dados novos chegarem.
export default function Loading() {
  return (
    <div role="status" className="flex items-center gap-2 py-12 text-texto/70">
      <LoaderCircle className="size-5 animate-spin text-destaque" aria-hidden="true" />
      Carregando…
    </div>
  );
}
