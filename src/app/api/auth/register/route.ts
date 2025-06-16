// /home/heagueron/jmu/dominando/src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10; // Número de rondas para el hashing de bcrypt

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    // 1. Validar los datos de entrada
    if (!username || !email || !password) {
      return NextResponse.json({ message: 'Todos los campos son requeridos (nombre de usuario, email, contraseña).' }, { status: 400 });
    }

    // Validar formato de email (básico)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: 'Formato de correo electrónico inválido.' }, { status: 400 });
    }

    // Validar longitud de contraseña (ejemplo)
    if (password.length < 6) {
      return NextResponse.json({ message: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    // 2. Verificar si el email ya está en uso
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUserByEmail) {
      return NextResponse.json({ message: 'Este correo electrónico ya está registrado.' }, { status: 409 }); // 409 Conflict
    }

    // 3. Hashear la contraseña
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 4. Crear el nuevo usuario y sus estadísticas en una transacción
    // Esto asegura que ambas operaciones (crear usuario y crear estadísticas)
    // se completen exitosamente o ninguna lo haga.
    const newUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: username, // Usamos 'username' del formulario para el campo 'nombre'
          email,
          passwordHash, // Guardamos el hash, no la contraseña en texto plano
          // emailVerified se puede manejar más tarde si implementas verificación de email
        },
      });

      // Crear estadísticas iniciales para el usuario
      await tx.statistic.create({
        data: {
          userId: createdUser.id,
          // Los valores por defecto definidos en el schema.prisma se aplicarán
        },
      });

      return createdUser;
    });

    // No devolver el passwordHash al cliente
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = newUser; 

    return NextResponse.json({ message: 'Usuario registrado exitosamente.', user: userWithoutPassword }, { status: 201 });
  } catch (error) {
    console.error('Error en el registro:', error);
    return NextResponse.json({ message: 'Error interno del servidor al registrar el usuario.' }, { status: 500 });
  }
}