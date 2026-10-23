// Monta o app Express: middlewares e rotas.
// Fica separado do server.js (que só "liga" o servidor) para que o app possa ser
// importado sem abrir uma porta — útil para testes no futuro.
//
// A ordem dos app.use importa: cada requisição passa por eles de cima para baixo.
import express from "express";
import cors from "cors";
import { requestLogger } from "./middlewares/requestLogger.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { statusRouter } from "./routes/status.js";
import { healthChecksRouter } from "./routes/healthChecks.js";
import { storesRouter } from "./routes/stores.js";
import { machinesRouter } from "./routes/machines.js";

export const app = express();

// Não anuncia "X-Powered-By: Express" nas respostas (menos informação para curiosos)
app.disable("x-powered-by");

// Primeiro de todos, para registrar inclusive as requisições que dão erro
app.use(requestLogger);

// CORS: libera o painel (Next.js, em outra porta) a consultar a API pelo navegador.
// As PDVs não precisam disso: o PowerShell não é navegador e não aplica CORS.
// CORS_ORIGIN aceita mais de um endereço, separados por vírgula.
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins, methods: ["GET"] }));

// Lê o corpo das requisições com Content-Type: application/json
app.use(express.json());

app.use("/status", statusRouter);
app.use("/api/health-checks", healthChecksRouter);
app.use("/api/lojas", storesRouter);
app.use("/api/maquinas", machinesRouter);

// Por último: rota inexistente e tratamento de erros
app.use(notFound);
app.use(errorHandler);
