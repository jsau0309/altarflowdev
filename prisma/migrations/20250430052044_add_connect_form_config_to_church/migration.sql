-- AlterTable
ALTER TABLE "Church" ADD COLUMN     "ministriesJson" JSON,
ADD COLUMN     "serviceTimesJson" JSON,
ADD COLUMN     "settingsJson" JSON;
