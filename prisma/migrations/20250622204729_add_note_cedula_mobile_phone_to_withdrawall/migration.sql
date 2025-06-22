-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "Withdrawal" ADD COLUMN     "cedula" TEXT,
ADD COLUMN     "destinyAccount" TEXT,
ADD COLUMN     "mobilePhone" TEXT,
ADD COLUMN     "note" TEXT;
