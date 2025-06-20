/*
  Warnings:

  - A unique constraint covering the columns `[content]` on the table `EntryMessage` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "EntryMessage_content_key" ON "EntryMessage"("content");
