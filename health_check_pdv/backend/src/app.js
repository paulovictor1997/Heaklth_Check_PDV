// Monta o app Express: middlewares e rotas.
// Fica separado do server.js (que só "liga" o servidor) para que o app possa ser
// importado sem abrir uma porta — útil para testes no futuro.
import express from "express";
import { statusRouter } from "./routes/status.js";

export const app = express();

// Lê o corpo das requisições com Content-Type: application/json
app.use(express.json());

app.use("/status", statusRouter);
