-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'MATCHING', 'EXPLANATION');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('GRADED', 'PENDING');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "acceptedAnswers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "modelAnswer" TEXT,
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "type" "QuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE';

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "showAnswers" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "gradedAt" TIMESTAMP(3),
ADD COLUMN     "status" "AttemptStatus" NOT NULL DEFAULT 'GRADED',
ALTER COLUMN "score" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "total" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "MatchPair" (
    "id" TEXT NOT NULL,
    "left" TEXT NOT NULL,
    "right" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "MatchPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptAnswer" (
    "id" TEXT NOT NULL,
    "response" TEXT NOT NULL DEFAULT '',
    "isCorrect" BOOLEAN,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feedback" TEXT,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "AttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttemptAnswer_attemptId_questionId_key" ON "AttemptAnswer"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "MatchPair" ADD CONSTRAINT "MatchPair_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
