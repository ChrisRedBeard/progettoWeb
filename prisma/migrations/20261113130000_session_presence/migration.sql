-- AlterTable
ALTER TABLE "WorkoutSession" ADD COLUMN "lastSeenAt" TIMESTAMP(3),
ADD COLUMN "currentExerciseId" TEXT;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_currentExerciseId_fkey" FOREIGN KEY ("currentExerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
