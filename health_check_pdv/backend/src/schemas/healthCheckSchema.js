// Validação (Zod) do corpo enviado pela PDV — contrato, seção 1.
// Se o JSON não seguir estas regras, a rota responde 400 sem tocar no banco.
import { z } from "../lib/validation.js";
import { StatusServico, StatusImpressora } from "../../generated/prisma/index.js";

// "L001-CX01": grupo 1 = código da loja, grupo 2 = número do caixa
export const HOSTNAME_REGEX = /^L(\d{3})-CX(\d{2})$/;

export const healthCheckSchema = z
  .object({
    // O Windows costuma devolver o nome em maiúsculas, mas por garantia normalizamos.
    hostname: z
      .string()
      .trim()
      .toUpperCase()
      .regex(HOSTNAME_REGEX, "Formato esperado: L000-CX00 (ex.: L001-CX01)"),
    ip: z.ipv4().optional(),
    // Exige o fuso (ex.: -03:00) para não haver dúvida sobre o horário da PDV
    coletadoEm: z.iso.datetime({ offset: true }),
    discoTotalGb: z.number().positive(),
    discoLivreGb: z.number().min(0),
    cpuUso: z.number().min(0).max(100),
    memoriaUso: z.number().min(0).max(100),
    // Os valores aceitos vêm dos enums do Prisma: uma única fonte da verdade
    servicoVendas: z.enum(StatusServico),
    impressoraFiscal: z.enum(StatusImpressora),
  })
  .refine((data) => data.discoLivreGb <= data.discoTotalGb, {
    path: ["discoLivreGb"],
    message: "Não pode ser maior que discoTotalGb",
  });
