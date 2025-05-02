-- CreateEnum
CREATE TYPE "FlowType" AS ENUM ('NEW_MEMBER', 'EVENT_SIGNUP', 'SURVEY');

-- CreateTable
CREATE TABLE "Flow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FlowType" NOT NULL DEFAULT 'NEW_MEMBER',
    "slug" TEXT NOT NULL,
    "configJson" JSONB NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "churchId" UUID NOT NULL,

    CONSTRAINT "Flow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formDataJson" JSONB NOT NULL,
    "memberId" UUID,
    "flowId" TEXT NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Flow_slug_key" ON "Flow"("slug");

-- CreateIndex
CREATE INDEX "Flow_churchId_idx" ON "Flow"("churchId");

-- CreateIndex
CREATE INDEX "Flow_churchId_slug_idx" ON "Flow"("churchId", "slug");

-- CreateIndex
CREATE INDEX "Submission_flowId_idx" ON "Submission"("flowId");

-- CreateIndex
CREATE INDEX "Submission_memberId_idx" ON "Submission"("memberId");

-- AddForeignKey
ALTER TABLE "Flow" ADD CONSTRAINT "Flow_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
