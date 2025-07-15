-- CreateIndex
CREATE INDEX "Expense_churchId_expenseDate_idx" ON "Expense"("churchId", "expenseDate");

-- CreateIndex
CREATE INDEX "Expense_status_idx" ON "Expense"("status");

-- CreateIndex
CREATE INDEX "Member_churchId_joinDate_idx" ON "Member"("churchId", "joinDate");

-- CreateIndex
CREATE INDEX "Member_churchId_membershipStatus_idx" ON "Member"("churchId", "membershipStatus");
