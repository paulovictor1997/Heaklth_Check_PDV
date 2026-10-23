// Middleware de autenticação das PDVs: exige o cabeçalho X-API-Key com a chave da loja.
// Se a chave for válida, a loja dona dela fica disponível em req.store para a rota.
// É com ela que a rota de envio confere se o hostname pertence mesmo a essa loja.
import { prisma } from "../lib/prisma.js";
import { hashApiKey } from "../lib/apiKey.js";

export async function requireApiKey(req, res, next) {
  const key = req.get("X-API-Key");

  if (!key) {
    return res.status(401).json({ erro: "Chave de API ausente (cabeçalho X-API-Key)" });
  }

  // O banco só tem o hash, então a busca é pelo hash da chave recebida.
  const store = await prisma.loja.findUnique({
    where: { chaveApiHash: hashApiKey(key) },
  });

  // Mesma resposta para chave inexistente e loja desativada: quem está tentando
  // não precisa saber qual dos dois foi.
  if (!store || !store.ativa) {
    return res.status(401).json({ erro: "Chave de API inválida" });
  }

  req.store = store;
  next();
}
