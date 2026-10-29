# Health Check PDV — agente das PDVs

Script que roda em cada caixa a cada 5 minutos, lê o estado da máquina e envia para a API central.
Ele **só lê** informações: não abre, fecha nem altera nada no PDV.

| Arquivo | Para que serve | Mexer? |
|---|---|---|
| `health-check.ps1` | Coleta e envio | Não |
| `install-task.ps1` | Instala/remove a tarefa no Agendador do Windows | Não |
| `config.example.json` | Modelo da configuração | Não |
| `config.json` | Configuração da loja (tem a chave — **não vai para o Git**) | **Sim** |
| `logs\` | Um arquivo de log por dia (apagados após 30 dias) | Só ler |

## Instalar numa PDV

1. **Nome da máquina** no padrão `L000-CX00` (ex.: `L001-CX01` = loja 001, caixa 01).
   Conferir no PowerShell com `hostname`.
2. **Copiar** para `C:\HealthCheckPDV` os arquivos `health-check.ps1`, `install-task.ps1` e `config.json`.
3. **Preencher o `config.json`** (o mesmo para todos os caixas da loja):
   - `urlApi`: endereço da API (em produção, `https://...`)
   - `chaveApi`: chave **da loja** (começa com `hcpdv_`), gerada no backend
   - `caminhoSistemaVendas`: caminho do `.exe` do sistema de vendas, com barras duplas (`C:\\SETA\\...exe`)
   - `padroesImpressora`: parte do nome da impressora fiscal no Windows (`*TM-T20*`, `*Bematech*`)
4. **Instalar a tarefa**: abrir o PowerShell com o botão direito > **Executar como administrador** e rodar:
   ```powershell
   cd C:\HealthCheckPDV
   powershell -ExecutionPolicy Bypass -File .\install-task.ps1
   ```
5. Conferir a mensagem **"Primeira execução OK"** e se o caixa aparece no painel.

O instalador deixa o `config.json` legível só para administradores (por causa da chave).
Para editar depois, abra o Bloco de Notas **como administrador**.

## Remover

```powershell
powershell -ExecutionPolicy Bypass -File .\install-task.ps1 -Remove
```

## Testar fora de uma PDV

No PC de TI o nome não segue o padrão, então use `-Hostname` com um caixa de teste:

```powershell
# Uma execução manual (não precisa ser administrador)
powershell -ExecutionPolicy Bypass -File .\health-check.ps1 -Hostname L001-CX01

# Tarefa agendada de teste (como administrador) — remover depois com -Remove
powershell -ExecutionPolicy Bypass -File .\install-task.ps1 -Hostname L001-CX01
```

## Problemas comuns (ver `logs\`)

| Mensagem no log | O que fazer |
|---|---|
| `Configuração não encontrada` | Falta o `config.json` na pasta |
| `chaveApi inválida` | Chave colada errada ou incompleta |
| `Nome '...' fora do padrão L000-CX00` | Renomear a máquina |
| `API respondeu 401` | Chave não existe ou loja inativa: gerar de novo no backend |
| `API respondeu 403` | Chave de uma loja, nome da máquina de outra |
| `Não foi possível falar com a API` | Sem rede, API fora do ar ou `urlApi` errada |
