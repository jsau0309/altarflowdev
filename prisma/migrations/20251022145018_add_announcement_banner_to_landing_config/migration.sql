-- AlterTable
ALTER TABLE "LandingPageConfig" ADD COLUMN     "announcementText" TEXT,
ADD COLUMN     "announcementLink" TEXT,
ADD COLUMN     "showAnnouncement" BOOLEAN NOT NULL DEFAULT false;
