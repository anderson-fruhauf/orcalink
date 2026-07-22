-- AlterTable
ALTER TABLE "QuotationSupplier" ADD COLUMN "channel" "DispatchChannel" NOT NULL DEFAULT 'EMAIL';
ALTER TABLE "QuotationSupplier" ADD COLUMN "whatsappSentAt" TIMESTAMP(3);
ALTER TABLE "QuotationSupplier" ADD COLUMN "whatsappError" TEXT;
