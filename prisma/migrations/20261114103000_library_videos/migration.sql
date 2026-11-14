-- AlterTable
ALTER TABLE "WorkoutExercise" ADD COLUMN "removedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "VideoUpload" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachedAt" TIMESTAMP(3),

    CONSTRAINT "VideoUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoUpload_storageKey_key" ON "VideoUpload"("storageKey");

-- CreateIndex
CREATE INDEX "VideoUpload_attachedAt_createdAt_idx" ON "VideoUpload"("attachedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "VideoUpload" ADD CONSTRAINT "VideoUpload_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
