-- AlterTable
ALTER TABLE "EmailSettings" DROP COLUMN "logoUrl",
DROP COLUMN "primaryColor",
ADD COLUMN     "replyToEmail" TEXT,
ADD COLUMN     "senderName" TEXT;