-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "QuotationSupplier" ADD COLUMN "dispatchStatus" "DispatchStatus" NOT NULL DEFAULT 'QUEUED';
ALTER TABLE "QuotationSupplier" ADD COLUMN "emailError" TEXT;

-- Backfill: convites já publicados antes da fila assíncrona entram como SENT
UPDATE "QuotationSupplier" AS qs
SET "dispatchStatus" = 'SENT'
FROM "Quotation" AS q
WHERE qs."quotationId" = q.id
  AND q.status IN ('OPEN', 'CLOSED');
