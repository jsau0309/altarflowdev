-- CreateTable
CREATE TABLE "idempotency_cache" (
    "key" VARCHAR(255) NOT NULL,
    "responseData" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_cache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "idempotency_cache_expiresAt_idx" ON "idempotency_cache"("expiresAt");
