/*
  Warnings:

  - Added the required column `gameMode` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matchCategory` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MatchCategory" AS ENUM ('FREE_PLAY', 'PAID_PLAY');

-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('SINGLE_ROUND', 'FULL_GAME');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "feeAmount" DECIMAL(65,30),
ADD COLUMN     "feeCurrency" "Currency",
ADD COLUMN     "gameMode" "GameMode" NOT NULL,
ADD COLUMN     "matchCategory" "MatchCategory" NOT NULL;
