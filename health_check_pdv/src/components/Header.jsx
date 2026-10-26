import Link from "next/link";
import { Activity } from "lucide-react";

// Cabeçalho fixo do painel; o título leva de volta à visão geral.
export default function Header() {
  return (
    <header className="border-b border-texto/10">
      <div className="mx-auto flex w-full max-w-7xl items-center px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-medium hover:text-destaque"
        >
          <Activity className="size-5 text-destaque" aria-hidden="true" />
          Health Check PDV
        </Link>
      </div>
    </header>
  );
}
