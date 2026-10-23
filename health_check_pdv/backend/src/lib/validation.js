// Zod configurado para o projeto. Os schemas importam o `z` daqui (e não direto de "zod")
// para garantir que as mensagens de erro saiam sempre em português.
import { z } from "zod";

z.config(z.locales.pt());

export { z };

// Converte os erros do Zod no formato do contrato: [{ campo, mensagem }]
export function formatIssues(error) {
  return error.issues.map((issue) => ({
    campo: issue.path.join("."),
    mensagem: issue.message,
  }));
}
