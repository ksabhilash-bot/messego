/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Message" DROP COLUMN "imageUrl",
ADD COLUMN     "imagePublicId" TEXT,
ADD COLUMN     "imageSecureUrl" TEXT;

-- CreateIndex
CREATE INDEX "Message_imagePublicId_idx" ON "public"."Message"("imagePublicId");
