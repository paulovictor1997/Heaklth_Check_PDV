import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

// Página 404: endereço inexistente, ou notFound() chamado por uma página
// (loja ou máquina que a API não encontrou).
export default function NotFound() {
  return (
    <section className="flex flex-col items-start gap-4 rounded-lg border border-texto/10 p-6">
      <div className="flex items-center gap-2">
        <SearchX className="size-5 text-texto/60" aria-hidden="true" />
        <h1 className="text-lg font-medium">Página não encontrada</h1>
      </div>
      <p className="text-texto/70">
        A loja ou máquina procurada não existe ou está inativa.
      </p>
      <Link href="/" className="flex items-center gap-1 text-sm text-destaque hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar à visão geral
      </Link>
    </section>
  );
}
