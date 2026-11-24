CREATE TYPE "ExtractionStatus" AS ENUM ('PROCESSING', 'SUCCEEDED', 'FAILED');
ALTER TYPE "InvoiceStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "InvoiceStatus" ADD VALUE 'NEEDS_REVIEW';
ALTER TYPE "InvoiceStatus" ADD VALUE 'EXTRACTION_FAILED';

ALTER TABLE "Invoice"
ADD COLUMN "invoiceNumber" TEXT,
ADD COLUMN "invoiceDate" DATE,
ADD COLUMN "supplierGstin" TEXT,
ADD COLUMN "buyerName" TEXT,
ADD COLUMN "buyerGstin" TEXT,
ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
ADD COLUMN "taxableAmount" DECIMAL(18,2),
ADD COLUMN "cgstAmount" DECIMAL(18,2),
ADD COLUMN "sgstAmount" DECIMAL(18,2),
ADD COLUMN "igstAmount" DECIMAL(18,2),
ADD COLUMN "totalTax" DECIMAL(18,2),
ADD COLUMN "invoiceTotal" DECIMAL(18,2),
ADD COLUMN "extractionWarnings" JSONB,
ADD COLUMN "extractionConfidence" JSONB;

CREATE TABLE "InvoiceLine" (
  "id" UUID NOT NULL,
  "invoiceId" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "description" TEXT,
  "hsnSac" TEXT,
  "quantity" DECIMAL(18,4),
  "unitPrice" DECIMAL(18,2),
  "taxableAmount" DECIMAL(18,2),
  "taxRate" DECIMAL(7,4),
  "cgstAmount" DECIMAL(18,2),
  "sgstAmount" DECIMAL(18,2),
  "igstAmount" DECIMAL(18,2),
  "totalAmount" DECIMAL(18,2),
  CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InvoiceLine_invoiceId_position_key" ON "InvoiceLine"("invoiceId", "position");
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ExtractionRun" (
  "id" UUID NOT NULL,
  "invoiceId" UUID NOT NULL,
  "status" "ExtractionStatus" NOT NULL DEFAULT 'PROCESSING',
  "provider" TEXT,
  "model" TEXT,
  "rawResult" JSONB,
  "error" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ExtractionRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ExtractionRun_invoiceId_startedAt_idx" ON "ExtractionRun"("invoiceId", "startedAt");
ALTER TABLE "ExtractionRun" ADD CONSTRAINT "ExtractionRun_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
