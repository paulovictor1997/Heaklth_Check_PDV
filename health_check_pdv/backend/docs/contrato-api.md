# Contrato da API — Health Check PDV

Referência para o backend, o painel (Next.js) e o script PowerShell das PDVs.
Qualquer mudança aqui deve ser combinada antes de alterar o código.

---

## 1. Envio da PDV — `POST /api/health-checks`

### Cabeçalhos

| Cabeçalho | Valor |
|---|---|
| `X-API-Key` | Chave de API da loja (uma por loja) |
| `Content-Type` | `application/json` |

### Corpo

```json
{
  "hostname": "L001-CX01",
  "ip": "192.168.1.111",
  "coletadoEm": "2026-10-22T14:30:00-03:00",
  "discoTotalGb": 237.9,
  "discoLivreGb": 45.3,
  "cpuUso": 23.5,
  "memoriaUso": 61.2,
  "servicoVendas": "RODANDO",
  "impressoraFiscal": "OK"
}
```

| Campo | Tipo | Regra |
|---|---|---|
| `hostname` | texto | Obrigatório. Formato `L000-CX00` (ex.: `L001-CX01`) |
| `ip` | texto | Opcional. IPv4 |
| `coletadoEm` | texto | Obrigatório. Data/hora ISO 8601 **com fuso** (horário da PDV) |
| `discoTotalGb` | número | Obrigatório. Maior que 0. Só o drive `C:` |
| `discoLivreGb` | número | Obrigatório. Entre 0 e `discoTotalGb` |
| `cpuUso` | número | Obrigatório. Percentual de 0 a 100 |
| `memoriaUso` | número | Obrigatório. Percentual de 0 a 100 |
| `servicoVendas` | texto | Obrigatório. `RODANDO`, `PARADO` ou `NAO_ENCONTRADO` |
| `impressoraFiscal` | texto | Obrigatório. `OK`, `ERRO`, `OFFLINE` ou `NAO_ENCONTRADA` |

A validação é feita com **Zod**.

### Regras de negócio

- **Loja da chave = loja do hostname.** A chave da loja `001` só aceita hostnames `L001-...`. Isso impede que uma loja envie dados em nome de outra.
- **Cadastro automático:** se o hostname ainda não existe, a máquina é criada no primeiro envio, com loja e número do caixa extraídos do próprio nome.
- O backend calcula o **status geral** (seção 2) e grava junto com o registro.
- O `ultimoContato` da máquina é atualizado com o **relógio do servidor** (não o da PDV, que pode estar errado). O `ip` também é atualizado.

### Respostas

| Código | Quando | Corpo |
|---|---|---|
| `201` | Registro salvo | `{ "id": 123, "status": "ATENCAO", "motivos": ["Disco com 12% livre"] }` |
| `400` | JSON inválido | `{ "erro": "Dados inválidos", "detalhes": [...] }` |
| `401` | Chave ausente ou inválida | `{ "erro": "..." }` |
| `403` | Hostname pertence a outra loja | `{ "erro": "..." }` |
| `500` | Erro interno | `{ "erro": "..." }` |

---

## 2. Regras do semáforo

O status geral é o **pior** resultado entre todos os itens.

| Item | 🟡 ATENCAO | 🔴 CRITICO |
|---|---|---|
| Disco `C:` livre | abaixo de 15% | abaixo de 5% |
| CPU | acima de 85% | — (picos são momentâneos) |
| Memória | acima de 90% | — |
| Serviço de vendas | — | `PARADO` ou `NAO_ENCONTRADO` (o caixa não vende) |
| Impressora fiscal | — | `ERRO`, `OFFLINE` ou `NAO_ENCONTRADA` (toda PDV tem impressora: sem ela não imprime a nota) |

Se nenhum item cair em atenção ou crítico, o status é `NORMAL`.
Os limites ficam centralizados num único arquivo do backend para facilitar ajustes.

---

## 3. PDV sem contato

- O script PowerShell envia dados **a cada 5 minutos** (Agendador de Tarefas).
- Uma máquina sem envio há **mais de 10 minutos** (2 envios perdidos) aparece como **`SEM_CONTATO`** no painel.
- `SEM_CONTATO` **não é gravado** no banco: é calculado na consulta, comparando `ultimoContato` com o horário atual.

---

## 4. Consultas do painel

Sem autenticação nesta fase (uso interno da equipe de TI). Login fica como melhoria futura.

| Endpoint | Retorna |
|---|---|
| `GET /api/lojas` | Todas as lojas ativas, com total de máquinas, contagem por situação (`NORMAL`, `ATENCAO`, `CRITICO`, `SEM_CONTATO`) e a pior situação da loja |
| `GET /api/lojas/:codigo` | Dados da loja e suas máquinas, cada uma com o último health check e a situação atual |
| `GET /api/maquinas/:hostname/historico?horas=24` | Registros da máquina nas últimas N horas (padrão 24), do mais recente para o mais antigo |
| `GET /status` | Se o servidor e o banco estão no ar (para monitoramento) |
