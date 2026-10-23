// Log de cada requisição no terminal, depois que a resposta é enviada:
//   2026-10-23T14:41:13.718Z POST /api/health-checks 201 12ms loja=001
//
// Não registra o corpo nem o cabeçalho X-API-Key: a chave nunca deve parar em log.
export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  // "finish" dispara quando a resposta terminou de ser enviada (status já definido)
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    // req.store só existe nas rotas autenticadas (preenchido pelo requireApiKey)
    const store = req.store ? ` loja=${req.store.codigo}` : "";

    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${Math.round(durationMs)}ms${store}`
    );
  });

  next();
}
