// Situação atual das máquinas no painel (contrato, seções 3 e 4).
//
// A "situação" é o status do último health check (NORMAL, ATENCAO ou CRITICO),
// a não ser que a máquina esteja sem enviar há mais de 10 min: aí ela é SEM_CONTATO.
// SEM_CONTATO não é gravado no banco; é calculado a cada consulta.
import { StatusGeral } from "../../generated/prisma/index.js";
import { THRESHOLDS } from "../config/thresholds.js";

export const NO_CONTACT = "SEM_CONTATO";

// Ordem de gravidade, da melhor para a pior. CRITICO fica acima de SEM_CONTATO porque é
// um problema confirmado (o caixa não vende); sem contato pode ser só a PDV desligada.
const SITUATIONS = [StatusGeral.NORMAL, StatusGeral.ATENCAO, NO_CONTACT, StatusGeral.CRITICO];

// `now` vem de fora para que todas as máquinas de uma consulta usem o mesmo horário.
export function getMachineSituation(machine, lastHealthCheck, now) {
  const limitMs = THRESHOLDS.contact.noContactAfterMinutes * 60 * 1000;

  // ultimoContato usa o relógio do servidor (gravado ao receber), assim como `now`
  if (!lastHealthCheck || !machine.ultimoContato || now - machine.ultimoContato > limitMs) {
    return NO_CONTACT;
  }

  return lastHealthCheck.status;
}

// Pior situação de uma lista; null se a lista estiver vazia (loja sem máquinas)
export function getWorstSituation(situations) {
  if (situations.length === 0) {
    return null;
  }

  return situations.reduce((worst, situation) =>
    SITUATIONS.indexOf(situation) > SITUATIONS.indexOf(worst) ? situation : worst
  );
}

// Quantas máquinas em cada situação, sempre com as 4 chaves (mesmo zeradas)
export function countSituations(situations) {
  const counts = Object.fromEntries(SITUATIONS.map((situation) => [situation, 0]));

  for (const situation of situations) {
    counts[situation]++;
  }

  return counts;
}
