// Respostas de erro em JSON, no formato do contrato: { "erro": "..." }.
// Sem isso o Express responde com páginas HTML ("Cannot GET ...", stack trace etc.).

// Nenhuma rota atendeu a requisição. Precisa ser registrado depois de todas as rotas.
export function notFound(req, res) {
  res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
}

// Tratador de erros: o Express reconhece por ter 4 parâmetros (error vem primeiro).
// O `next` não é usado, mas precisa estar na assinatura: com 3 parâmetros o Express
// acharia que é um middleware comum e nunca mandaria erros para cá.
// No Express 5, um erro lançado dentro de uma rota async chega aqui sozinho.
export function errorHandler(error, req, res, next) {
  // Erros do express.json(): o corpo não é um JSON válido ou é grande demais
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ erro: "JSON inválido no corpo da requisição" });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({ erro: "Corpo da requisição grande demais" });
  }

  // Qualquer outro erro é inesperado (banco fora do ar, bug...). O detalhe vai só
  // para o log do servidor; quem chamou recebe uma mensagem genérica, sem expor
  // nomes de tabelas, consultas ou caminhos de arquivos.
  console.error(`Erro em ${req.method} ${req.originalUrl}:`, error);
  res.status(500).json({ erro: "Erro interno no servidor" });
}
