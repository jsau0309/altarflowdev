/*
  Warnings:

  - A unique constraint covering the columns `[churchId,type]` on the table `Flow` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Flow_churchId_type_key" ON "Flow"("churchId", "type");
