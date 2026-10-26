import Link from "next/link";
import { connection } from "next/server";
import { Activity } from "lucide-react";
import AutoRefresh from "@/components/AutoRefresh";
import { formatTime } from "@/lib/format";

// Cabeçalho fixo do painel; o título leva de volta à visão geral.
// O horário de atualização é calculado aqui, no servidor, a cada vez que a página é
// montada — inclusive nas atualizações automáticas.
export default async function Header() {
  // Sem isso o Next poderia gerar o cabeçalho no build, com o horário congelado
  await connection();

  return (
    <header className="border-b border-texto/10">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-medium hover:text-destaque"
        >
          <Activity className="size-5 text-destaque" aria-hidden="true" />
          Health Check PDV
        </Link>
        <AutoRefresh updatedAt={formatTime(new Date())} />
      </div>
    </header>
  );
}
