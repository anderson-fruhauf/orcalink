-- CreateEnum
CREATE TYPE "DispatchChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "preferredChannel" "DispatchChannel" NOT NULL DEFAULT 'EMAIL';
