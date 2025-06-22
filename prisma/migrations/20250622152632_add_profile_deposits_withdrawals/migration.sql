-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('PAGO_MOVIL', 'BANK_TRANSFER', 'P2P');

-- CreateEnum
CREATE TYPE "TransferState" AS ENUM ('REGISTERED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "bio" TEXT,
    "country" TEXT,
    "birthDate" TIMESTAMP(3),
    "documentId" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "depositDate" TIMESTAMP(3),
    "type" "TransferType" NOT NULL DEFAULT 'PAGO_MOVIL',
    "currency" "Currency" NOT NULL DEFAULT 'VES',
    "amount" DECIMAL(65,30) NOT NULL,
    "originBank" TEXT,
    "reference" TEXT,
    "status" "TransferState" NOT NULL DEFAULT 'REGISTERED',
    "revisorId" TEXT,
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "type" "TransferType" NOT NULL DEFAULT 'PAGO_MOVIL',
    "currency" "Currency" NOT NULL DEFAULT 'VES',
    "amount" DECIMAL(65,30) NOT NULL,
    "destinyBank" TEXT,
    "reference" TEXT,
    "status" "TransferState" NOT NULL DEFAULT 'REGISTERED',
    "revisorId" TEXT,
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Deposit_userId_idx" ON "Deposit"("userId");

-- CreateIndex
CREATE INDEX "Withdrawal_userId_idx" ON "Withdrawal"("userId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_revisorId_fkey" FOREIGN KEY ("revisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_revisorId_fkey" FOREIGN KEY ("revisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
