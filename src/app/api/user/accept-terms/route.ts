// /home/heagueron/jmu/dominando/src/app/api/user/accept-terms/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    // Usamos upsert para actualizar el perfil si ya existe, o crearlo si no
    await prisma.profile.upsert({
      where: {
        userId: session.user.id,
      },
      update: {
        termsAcceptedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        termsAcceptedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: 'Términos aceptados correctamente.' });

  } catch (error) {
    console.error('Error al actualizar la aceptación de términos:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error en el servidor.' },
      { status: 500 }
    );
  }
}
