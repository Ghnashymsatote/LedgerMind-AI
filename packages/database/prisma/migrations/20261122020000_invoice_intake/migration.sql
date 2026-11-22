BEGIN;
CREATE TYPE "InvoiceStatus" AS ENUM ('UPLOADED');

CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UPLOADED',
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invoice_storageKey_key" ON "Invoice"("storageKey");
CREATE INDEX "Invoice_uploadedAt_id_idx" ON "Invoice"("uploadedAt", "id");
CREATE INDEX "Invoice_supplierId_uploadedAt_id_idx" ON "Invoice"("supplierId", "uploadedAt", "id");
CREATE INDEX "Invoice_uploadedById_idx" ON "Invoice"("uploadedById");

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
