-- AlterTable
ALTER TABLE "VideoWatch" ADD COLUMN     "durationSeconds" DOUBLE PRECISION,
ADD COLUMN     "lastReportAt" TIMESTAMP(3),
ADD COLUMN     "watchedSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0;
