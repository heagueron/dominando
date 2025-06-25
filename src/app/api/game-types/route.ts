import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const gameTypes = await prisma.gameType.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(gameTypes);
  } catch (error) {
    console.error("Error fetching game types:", error);
    return NextResponse.json({ error: 'Error al obtener los tipos de juego.' }, { status: 500 });
  }
}
