-- CreateEnum
CREATE TYPE "status_servico" AS ENUM ('RODANDO', 'PARADO', 'NAO_ENCONTRADO');

-- CreateEnum
CREATE TYPE "status_impressora" AS ENUM ('OK', 'ERRO', 'OFFLINE', 'NAO_ENCONTRADA');

-- CreateEnum
CREATE TYPE "status_geral" AS ENUM ('NORMAL', 'ATENCAO', 'CRITICO');

-- CreateTable
CREATE TABLE "lojas" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(3) NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "chave_api_hash" VARCHAR(64),
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lojas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maquinas" (
    "id" SERIAL NOT NULL,
    "hostname" VARCHAR(20) NOT NULL,
    "numero_caixa" INTEGER NOT NULL,
    "ip" VARCHAR(15),
    "loja_id" INTEGER NOT NULL,
    "ultimo_contato" TIMESTAMPTZ(3),
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "maquinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_checks" (
    "id" SERIAL NOT NULL,
    "maquina_id" INTEGER NOT NULL,
    "coletado_em" TIMESTAMPTZ(3) NOT NULL,
    "recebido_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disco_total_gb" DOUBLE PRECISION NOT NULL,
    "disco_livre_gb" DOUBLE PRECISION NOT NULL,
    "cpu_uso" DOUBLE PRECISION NOT NULL,
    "memoria_uso" DOUBLE PRECISION NOT NULL,
    "servico_vendas" "status_servico" NOT NULL,
    "impressora_fiscal" "status_impressora" NOT NULL,
    "status" "status_geral" NOT NULL,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lojas_codigo_key" ON "lojas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "lojas_chave_api_hash_key" ON "lojas"("chave_api_hash");

-- CreateIndex
CREATE UNIQUE INDEX "maquinas_hostname_key" ON "maquinas"("hostname");

-- CreateIndex
CREATE UNIQUE INDEX "maquinas_loja_id_numero_caixa_key" ON "maquinas"("loja_id", "numero_caixa");

-- CreateIndex
CREATE INDEX "health_checks_maquina_id_coletado_em_idx" ON "health_checks"("maquina_id", "coletado_em" DESC);

-- AddForeignKey
ALTER TABLE "maquinas" ADD CONSTRAINT "maquinas_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_checks" ADD CONSTRAINT "health_checks_maquina_id_fkey" FOREIGN KEY ("maquina_id") REFERENCES "maquinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
