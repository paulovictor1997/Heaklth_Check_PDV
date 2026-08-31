# Heaklth_Check_PDV

## DOCUMENTAÇÃO TÉCNICA DE PROJETO

### Health Check Proativo de PDVs

**Monitoramento contínuo das máquinas de ponto de venda da rede de lojas — Stack técnica e decisões de desenvolvimento**

| Campo | Valor |
|---|---|
| **Área responsável** | TI — Inovação |
| **Status** | Em desenvolvimento — iniciando pelo backend |
| **Escopo inicial** | Máquinas de PDV (caixas) — notebooks e outros equipamentos ficam para uma fase futura |
| **Hospedagem** | Infraestrutura própria da empresa (mesmo padrão dos painéis internos atuais) |

---

## 1. Visão Geral

O projeto cria um sistema de monitoramento proativo da saúde das máquinas de PDV (caixas) em todas as lojas da rede. Hoje, problemas nessas máquinas só são percebidos quando alguém na loja abre um chamado. Com esse sistema, a TI passa a identificar o problema antes ou ao mesmo tempo que a loja, agindo de forma proativa em vez de reativa — reduzindo tempo de loja parada e chamados evitáveis.

Além do valor operacional, o projeto também serve como estudo prático de desenvolvimento fullstack para a equipe de TI, cobrindo backend com banco relacional, API, e frontend moderno com Next.js.

---

## 2. Como Vai Funciona

- **Coleta local:** cada PDV verifica periodicamente seu próprio estado — espaço em disco, status do serviço do sistema de vendas, status da impressora fiscal e uso de recursos.

- **Envio dos dados:** as informações, identificadas pelo nome da máquina (que já indica loja e caixa), são enviadas pela internet até o backend central.

- **Visualização:** o backend disponibiliza os dados num painel web, com status geral e a opção de selecionar uma loja específica para ver o detalhamento das máquinas monitoradas ali.

### 2.1 Identificação das máquinas

- **Nome do computador:** `L{número da loja}-CX{número do caixa}` — exemplo: `L001-CX01`

- **Endereço IP:** terceiro octeto identifica a loja, quarto octeto (.111 a .129) identifica a máquina dentro da loja

### 2.2 Rede das lojas

As lojas operam sem VPN na maior parte do tempo, com dois links de internet e failover automático entre eles. A operação só é interrompida totalmente em caso de falta de energia. O envio de dados das PDVs para o backend acontece diretamente pela internet aberta, exigindo comunicação via HTTPS e autenticação por chave de API.

---

## 3. Ordem de Desenvolvimento

Definimos começar pelo backend, para validar o formato de dados antes de construir a interface:

1. Modelagem do banco de dados (tabelas de lojas, máquinas e registros de health check).

2. Backend/API — endpoints para receber e consultar os dados.

3. Testes via Thunder Client, simulando envios antes de existir qualquer script real ou tela.

4. Frontend (Next.js), já consumindo dados validados nas etapas anteriores.

5. Script PowerShell, desenvolvido a partir do contrato de dados já validado.

6. Testes em PDVs reais (1 a 2 lojas) antes da distribuição em massa (via GPO ou PowerShell Remoting).

### 3.1 Piloto de implantação

O teste geral inicial será realizado na loja matriz, validando o funcionamento completo do fluxo (coleta, envio, backend e painel) num ambiente controlado antes de expandir. Somente após validação nesse piloto o sistema será estendido para as demais lojas da rede. A documentação será atualizada conforme essa expansão avançar.

---

## 4. Tecnologias Utilizadas

### 4.1 Backend

- **Node.js** (Express, ou API Routes dentro do próprio Next.js)

- **PostgreSQL** — banco de dados relacional, escolhido pela natureza estruturada dos dados de health check e pela necessidade futura de relatórios e agregações

- **Prisma** — ORM para modelagem do schema, geração de queries e tipagem TypeScript automática

- **Nginx** — proxy reverso, responsável por SSL/HTTPS e roteamento

- **PM2** (ou equivalente) — mantém o processo sempre ativo, reiniciando automaticamente em caso de falha

- **PostgreSQL instalado de forma nativa no servidor** (sem uso de Docker/containers)

### 4.2 Frontend

- **Next.js** (React), com App Router

- **Import alias** (`@/*`) configurado, para evitar caminhos relativos longos e facilitar manutenção

- **TailwindCSS** — estilização

- **Lucide React** — biblioteca de ícones

- **Biblioteca de gráficos** (ex: Recharts) — histórico e tendências, quando aplicável

### 4.3 Coleta de dados (agente local)

- **PowerShell** — script executado periodicamente em cada PDV via Agendador de Tarefas do Windows

### 4.4 Segurança

- **HTTPS obrigatório** em todo o tráfego entre as PDVs e o backend

- **Autenticação por chave de API** única por loja/máquina

- **Possível uso de DMZ ou firewall restritivo**, conforme definição do time de infraestrutura

### 4.5 Ferramentas de apoio ao desenvolvimento

- **VSCode** com extensão do Prisma

- **Thunder Client** — testes de API

- **Prisma Studio** — visualização e edição dos dados do banco durante o desenvolvimento

---

## 5. Identidade Visual

O projeto usa TailwindCSS para toda a estilização do painel, com uma paleta de cores customizada definida pela equipe, pensada para um painel escuro com boa leitura de status.

### 5.1 Paleta de cores

| Uso | Cor | Aplicação |
|---|---|---|
| Fundo principal | `#0A0307` | Fundo geral do painel |
| Texto | `#EBEBEB` | Textos sobre o fundo escuro |
| Crítico | `#E60925` | Status crítico (ex: serviço parado) |
| Normal / saudável | `#2E826D` | Status normal/saudável da máquina |
| Atenção | `#D9A62E` | Status intermediário (ex: disco quase cheio) |
| Destaque / ação | `#3E8FB0` | Botões, links, elementos interativos e seleção de loja |

Lógica de status no estilo "semáforo": **verde** (normal) → **âmbar** (atenção) → **vermelho** (crítico), facilitando a leitura rápida da situação de cada loja/máquina.

### 5.2 Tipografia

**Fonte do projeto:** Roboto (sans-serif), aplicada em todo o painel — títulos, textos e elementos de interface. Deve ser importada via `next/font` (Google Fonts) para otimizar carregamento e evitar troca de fonte perceptível (FOUT) na renderização das páginas.

### 5.3 Ícones

**Biblioteca de ícones:** Lucide React (`lucide-react`) — ícones leves em estilo outline, que se integram bem com Tailwind (estilização via `className`/`color`) e cobrem os casos necessários para o painel: indicadores de status (alerta, sucesso, erro), disco, serviço, impressora e rede.

---

## 6. Escopo Inicial

Na primeira fase, o projeto contempla exclusivamente as máquinas de PDV (caixas). Notebooks e outros tipos de equipamento ficam previstos para uma fase futura.

---

## 7. Observações

Este documento reflete o planejamento e as decisões técnicas atuais do projeto, e será atualizado conforme novas definições forem tomadas.
