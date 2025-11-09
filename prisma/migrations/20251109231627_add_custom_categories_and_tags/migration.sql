-- Add color field to DonationType
ALTER TABLE "DonationType" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#3B82F6';

-- Create ExpenseCategory table
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "churchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "isSystemCategory" BOOLEAN NOT NULL DEFAULT false,
    "isDeletable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- Add expenseCategoryId to Expense table
ALTER TABLE "Expense" ADD COLUMN "expenseCategoryId" TEXT;

-- Make category nullable in Expense table (backward compatibility)
ALTER TABLE "Expense" ALTER COLUMN "category" DROP NOT NULL;

-- Create indexes for ExpenseCategory
CREATE UNIQUE INDEX "ExpenseCategory_churchId_name_key" ON "ExpenseCategory"("churchId", "name");
CREATE INDEX "ExpenseCategory_churchId_idx" ON "ExpenseCategory"("churchId");

-- Create index for expenseCategoryId in Expense table
CREATE INDEX "Expense_expenseCategoryId_idx" ON "Expense"("expenseCategoryId");

-- Add foreign key constraints
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_expenseCategoryId_fkey" FOREIGN KEY ("expenseCategoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
