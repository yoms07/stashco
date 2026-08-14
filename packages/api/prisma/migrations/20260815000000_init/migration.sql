-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "nonces" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nonces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_metas" (
    "id" TEXT NOT NULL,
    "requestId" INTEGER NOT NULL,
    "vendorName" TEXT NOT NULL,
    "invoiceRef" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_metas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position_snapshots" (
    "id" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "positionUsdc" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "position_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nonces_wallet_usedAt_idx" ON "nonces"("wallet", "usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "payout_metas_requestId_key" ON "payout_metas"("requestId");

-- CreateIndex
CREATE INDEX "position_snapshots_capturedAt_idx" ON "position_snapshots"("capturedAt");
