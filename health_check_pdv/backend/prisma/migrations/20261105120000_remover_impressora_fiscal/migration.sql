-- Remove o monitoramento da impressora fiscal (decisão de 2026-11-05).
-- As leituras antigas continuam na tabela; só perdem esta coluna.

-- AlterTable
ALTER TABLE "health_checks" DROP COLUMN "impressora_fiscal";

-- DropEnum
DROP TYPE "status_impressora";
