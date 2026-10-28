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
| `servicoVendas` | texto | Obrigatório. Situação do sistema de vendas (um `.exe`, não um serviço do Windows): `RODANDO` (processo aberto), `PARADO` (fechado) ou `NAO_ENCONTRADO` (o `.exe` não existe no caminho configurado) |
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
| Sistema de vendas (`.exe`) | `PARADO` (programa fechado: pode ser só o caixa sem uso) | `NAO_ENCONTRADO` (o `.exe` não existe no caminho configurado) |
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

### Situação das máquinas e das lojas

- **Situação da máquina:** o `status` do último health check (`NORMAL`, `ATENCAO`, `CRITICO`), ou `SEM_CONTATO` se o último envio foi há mais de 10 minutos.
- **Situação da loja:** a pior situação entre as suas máquinas ativas, nesta ordem (da melhor para a pior): `NORMAL` → `ATENCAO` → `SEM_CONTATO` → `CRITICO`. `CRITICO` é a pior porque é um problema confirmado; sem contato pode ser só a PDV desligada.
- **Loja sem máquinas:** `situacao` é `null`.
- Os `motivos` não são gravados: nas consultas eles são recalculados a partir dos números do registro.

### Exemplos de resposta

`GET /api/lojas`

```json
[
  {
    "codigo": "005",
    "nome": "Moreira Lima",
    "totalMaquinas": 3,
    "situacoes": { "NORMAL": 1, "ATENCAO": 0, "SEM_CONTATO": 1, "CRITICO": 1 },
    "situacao": "CRITICO"
  }
]
```

`GET /api/lojas/:codigo` — mesmos campos do resumo, mais a lista de máquinas (ordenadas pelo número do caixa). `404` se a loja não existe ou está inativa.

```json
{
  "codigo": "005",
  "nome": "Moreira Lima",
  "totalMaquinas": 1,
  "situacoes": { "NORMAL": 0, "ATENCAO": 0, "SEM_CONTATO": 0, "CRITICO": 1 },
  "situacao": "CRITICO",
  "maquinas": [
    {
      "hostname": "L005-CX02",
      "numeroCaixa": 2,
      "ip": "10.0.0.2",
      "ultimoContato": "2026-10-23T14:41:13.821Z",
      "situacao": "CRITICO",
      "ultimoHealthCheck": {
        "id": 3,
        "coletadoEm": "2026-10-23T14:41:13.303Z",
        "recebidoEm": "2026-10-23T14:41:13.821Z",
        "discoTotalGb": 100,
        "discoLivreGb": 50,
        "cpuUso": 20,
        "memoriaUso": 50,
        "servicoVendas": "NAO_ENCONTRADO",
        "impressoraFiscal": "OK",
        "status": "CRITICO",
        "motivos": ["Sistema de vendas não encontrado"]
      }
    }
  ]
}
```

`GET /api/maquinas/:hostname/historico?horas=24` — `horas` de 1 a 720 (30 dias), padrão 24. O filtro usa o `coletadoEm`. `400` se `horas` for inválido, `404` se a máquina não existe.

```json
{
  "hostname": "L005-CX01",
  "loja": { "codigo": "005", "nome": "Moreira Lima" },
  "horas": 24,
  "total": 1,
  "registros": [ { "id": 2, "coletadoEm": "...", "status": "NORMAL", "motivos": [], "...": "mesmos campos de ultimoHealthCheck" } ]
}
```

Datas nas respostas saem em UTC (ISO 8601 com `Z`); o painel converte para o horário local.
