-- CreateEnum
CREATE TYPE "WhatsappConnectionState" AS ENUM ('DISCONNECTED', 'QR_PENDING', 'CONNECTED', 'ERROR');

-- CreateTable
CREATE TABLE "WhatsappSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "state" "WhatsappConnectionState" NOT NULL DEFAULT 'DISCONNECTED',
    "connectedNumber" TEXT,
    "creds" JSONB,
    "lastConnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappAuthKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappAuthKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSession_tenantId_key" ON "WhatsappSession"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsappAuthKey_tenantId_idx" ON "WhatsappAuthKey"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappAuthKey_tenantId_category_keyId_key" ON "WhatsappAuthKey"("tenantId", "category", "keyId");

-- AddForeignKey
ALTER TABLE "WhatsappSession" ADD CONSTRAINT "WhatsappSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappAuthKey" ADD CONSTRAINT "WhatsappAuthKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "WhatsappSession"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
