import { NextRequest, NextResponse } from 'next/server'; // Importar NextRequest
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions'; // Importar authOptions desde la nueva ubicación



export async function GET(
  _request: NextRequest, // Puedes mantener NextRequest si lo deseas, aunque no se use
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Workaround para el error de build de Next.js
  context: any 
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.is_admin) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  // Aserción de tipo para seguridad dentro de la función
  const params = (context as { params: { userId: string } }).params;
  const userId = params.userId;

  if (!userId) {
    return NextResponse.json({ message: 'ID de usuario no proporcionado' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { // Selecciona solo los campos que necesitas enviar al cliente
        id: true,
        name: true,
        username: true,
        email: true,
        emailVerified: true,
        image: true,
        is_admin: true,
        createdAt: true,
        updatedAt: true,
        balance_VES: true,
        balance_USDT: true,
        statistics: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { // Selecciona campos específicos de las transacciones también
            id: true,
            type: true,
            amount: true,
            currency: true,
            createdAt: true,
            comment: true,
          }
        },
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error(`Error al obtener detalles del usuario ${userId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}