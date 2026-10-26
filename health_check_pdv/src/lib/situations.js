// Aparência de cada situação no painel (contrato, seção 4): texto, ícone e cores.
//
// As classes do Tailwind ficam escritas por inteiro (nada de `bg-${cor}`): o Tailwind
// lê o código-fonte procurando classes, e nomes montados em tempo de execução não
// seriam encontrados — a cor simplesmente não apareceria.
import { CircleCheck, CircleMinus, CircleX, TriangleAlert, WifiOff } from "lucide-react";

// accentClassName é a faixa colorida à esquerda dos cards
export const SITUATIONS = {
  NORMAL: {
    label: "Normal",
    icon: CircleCheck,
    badgeClassName: "border-normal/50 bg-normal/15",
    iconClassName: "text-normal",
    accentClassName: "border-l-normal",
  },
  ATENCAO: {
    label: "Atenção",
    icon: TriangleAlert,
    badgeClassName: "border-atencao/50 bg-atencao/15",
    iconClassName: "text-atencao",
    accentClassName: "border-l-atencao",
  },
  CRITICO: {
    label: "Crítico",
    icon: CircleX,
    badgeClassName: "border-critico/50 bg-critico/15",
    iconClassName: "text-critico",
    accentClassName: "border-l-critico",
  },
  // A paleta não tem cor para "sem contato": fica em cinza, para não se confundir
  // com o semáforo (a PDV pode estar só desligada).
  SEM_CONTATO: {
    label: "Sem contato",
    icon: WifiOff,
    badgeClassName: "border-texto/30 bg-texto/10",
    iconClassName: "text-texto/70",
    accentClassName: "border-l-texto/50",
  },
};

// Loja sem máquinas cadastradas: a API devolve situacao = null
const NO_MACHINES = {
  label: "Sem máquinas",
  icon: CircleMinus,
  badgeClassName: "border-texto/20 bg-transparent",
  iconClassName: "text-texto/50",
  accentClassName: "border-l-texto/20",
};

export function getSituation(situation) {
  return SITUATIONS[situation] ?? NO_MACHINES;
}
