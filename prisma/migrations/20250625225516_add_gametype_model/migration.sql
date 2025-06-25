-- CreateTable
CREATE TABLE "GameType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "gameMode" "GameMode" NOT NULL,
    "matchCategory" "MatchCategory" NOT NULL,
    "maxJugadores" INTEGER NOT NULL DEFAULT 4,
    "fichasPorJugador" INTEGER NOT NULL DEFAULT 7,
    "puntosParaGanarPartida" INTEGER,
    "duracionTurnoSegundos" INTEGER NOT NULL DEFAULT 15,
    "feeAmount" DECIMAL(65,30),
    "feeCurrency" "Currency",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameType_name_key" ON "GameType"("name");
