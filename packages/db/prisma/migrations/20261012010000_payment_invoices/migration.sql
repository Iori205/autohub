-- QPay invoices issued per order (Step 3)
CREATE TYPE "InvoiceStatus" AS ENUM ('OPEN', 'PAID', 'CANCELLED', 'EXPIRED');

CREATE TABLE "PaymentInvoice" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "qrText" TEXT NOT NULL,
    "qrImage" TEXT NOT NULL,
    "shortUrl" TEXT,
    "urls" JSONB NOT NULL DEFAULT '[]',
    "demo" BOOLEAN NOT NULL DEFAULT false,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "paymentId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentInvoice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentInvoice_orderId_idx" ON "PaymentInvoice"("orderId");
CREATE INDEX "PaymentInvoice_status_expiresAt_idx" ON "PaymentInvoice"("status", "expiresAt");

ALTER TABLE "PaymentInvoice" ADD CONSTRAINT "PaymentInvoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
