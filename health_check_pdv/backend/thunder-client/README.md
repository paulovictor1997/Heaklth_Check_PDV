# Testes da API com Thunder Client

Coleção para testar a API simulando o envio das PDVs, antes de existir o script PowerShell ou o painel
(Etapa 3 do README). Segue o [contrato da API](../docs/contrato-api.md).

| Arquivo | O que é |
|---|---|
| `health-check-pdv.postman_collection.json` | As 15 requisições, separadas em 3 pastas, com asserções (scripts de teste) |
| `local.postman_environment.json` | Variáveis `baseUrl` e `apiKey` |

> Os arquivos estão no **formato Postman** de propósito: a partir da versão 3.0 o Thunder Client só importa
> arquivos no formato próprio dele se tiverem sido exportados por uma conta logada. O formato Postman é
> importado normalmente (inclusive no plano gratuito) e também abre no próprio Postman.

## Preparação

1. Na pasta `backend/`, gere a chave da loja 001 (se ainda não tiver) e suba a API:
   ```powershell
   npm run api-key -- 001
   npm run dev
   ```
   Para **substituir** uma chave existente no PowerShell, chame o script direto (o PowerShell engole o `--`
   e o npm acaba ficando com o `--force`):
   ```powershell
   node scripts/generate-api-key.js 001 --force
   ```
2. No VS Code, abra o Thunder Client (ícone de raio na barra lateral) e entre com sua conta.
3. Aba **Collections** → menu (☰) → **Import** → escolha `health-check-pdv.postman_collection.json`.
4. Aba **Env** → menu (☰) → **Import** → escolha `local.postman_environment.json`.
5. Abra o ambiente **Health Check PDV - Local**, troque o valor de `apiKey` pela chave gerada e salve.
6. Na coleção, abra **Settings** e selecione esse ambiente (ou marque-o como ativo na aba **Env**).

> Não salve a chave real neste arquivo `local.postman_environment.json`: ele vai para o Git.
> A chave fica só no ambiente importado dentro do Thunder Client.

## Requisições

**1. Sistema**
- Status do servidor e do banco

**2. Envio da PDV** — `POST /api/health-checks`
- Envio normal, atenção (disco 10%) e crítico (serviço parado + impressora offline), todos na `L001-CX01`
- Nova máquina `L001-CX02`: é cadastrada sozinha no primeiro envio
- Erros: dados inválidos (400), hostname de outra loja (403), sem chave (401), JSON malformado (400)

**3. Painel**
- Lista de lojas, detalhe da loja 001, histórico da `L001-CX01`
- Erros: loja inexistente (404), `?horas=abc` (400), rota inexistente (404)

O campo `coletadoEm` usa `{{#dateISO}}`, variável do próprio Thunder Client que gera a data e hora do momento do envio.

## Rodando tudo de uma vez

Menu (☰) da coleção → **Run All**. As requisições rodam em ordem e o resultado das asserções aparece no fim.

Ao rodar tudo, o último envio da `L001-CX01` é o crítico, então ela fica **CRITICO** no painel.
Para voltar ao normal, rode de novo a requisição "Envio normal".

## Limpando os dados de teste

Os envios ficam gravados no banco. Para apagar, use o `npx prisma studio` (tabelas `HealthCheck` e `Maquina`).
