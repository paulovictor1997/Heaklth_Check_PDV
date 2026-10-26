import { getSituation } from "@/lib/situations";

// Selo com ícone + texto da situação de uma loja ou máquina.
// O texto fica na cor normal (a cor da paleta vai no ícone, na borda e no fundo),
// para continuar legível sobre o fundo escuro.
export default function StatusBadge({ situation }) {
  const { label, icon: Icon, badgeClassName, iconClassName } = getSituation(situation);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-medium ${badgeClassName}`}
    >
      <Icon className={`size-4 ${iconClassName}`} aria-hidden="true" />
      {label}
    </span>
  );
}
