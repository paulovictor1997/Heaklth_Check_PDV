// Limites do semáforo (contrato, seção 2).
// Ficam todos aqui para que um ajuste (ex.: alertar disco com 20% livre) seja feito
// num único lugar, sem caçar números espalhados pelo código.
export const THRESHOLDS = {
  disk: {
    warningBelowPercent: 15, // disco C: com menos de 15% livre → ATENCAO
    criticalBelowPercent: 5, // disco C: com menos de 5% livre → CRITICO
  },
  cpu: {
    warningAbovePercent: 85, // CPU acima de 85% → ATENCAO (sem crítico: picos são momentâneos)
  },
  memory: {
    warningAbovePercent: 90, // memória acima de 90% → ATENCAO
  },
  // Contrato, seção 3: a PDV envia a cada 5 min; 10 min sem envio = 2 envios perdidos
  contact: {
    noContactAfterMinutes: 10, // sem envio há mais de 10 min → SEM_CONTATO
  },
};
