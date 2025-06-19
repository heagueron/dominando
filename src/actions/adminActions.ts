// adminActions.ts
'use server';

import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from 'next/cache';
import { Prisma, TransactionType } from '@prisma/client'; // Para Decimal y TransactionType

export interface CreateTransactionFormState {
  message: string;
  type: 'success' | 'error';
  errors?: {
    userId?: string[];
    type?: string[];
    amount?: string[];
    currency?: string[];
    comment?: string[];
    general?: string[];
  };
}

export async function createTransaction(
  prevState: CreateTransactionFormState,
  formData: FormData
): Promise<CreateTransactionFormState> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.is_admin) {
    return {
      message: 'Acción no autorizada.',
      type: 'error',
      errors: { general: ['No tienes permiso para realizar esta acción.'] },
    };
  }

  const adminUserId = session.user.id;

  const targetUserId = formData.get('userId') as string;
  const type = formData.get('type') as 'DEPOSIT' | 'WITHDRAWAL';
  const amountStr = formData.get('amount') as string;
  const currency = formData.get('currency') as 'VES' | 'USDT';
  const comment = formData.get('comment') as string | null;

  // Validaciones
  const errors: CreateTransactionFormState['errors'] = {};
  if (!targetUserId) errors.userId = ['El ID del usuario es requerido.'];
  if (!type || !['DEPOSIT', 'WITHDRAWAL'].includes(type)) errors.type = ['El tipo de transacción es inválido.'];
  if (!amountStr) errors.amount = ['El monto es requerido.'];
  if (isNaN(parseFloat(amountStr)) || parseFloat(amountStr) <= 0) errors.amount = ['El monto debe ser un número positivo.'];
  if (!currency || !['VES', 'USDT'].includes(currency)) errors.currency = ['La moneda es inválida.'];

  if (Object.keys(errors).length > 0) {
    return {
      message: 'Por favor corrige los errores en el formulario.',
      type: 'error',
      errors,
    };
  }

  const amount = new Prisma.Decimal(amountStr);

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return { message: 'Usuario objetivo no encontrado.', type: 'error', errors: { userId: ['Usuario no encontrado.'] } };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Crear la transacción
      await tx.transaction.create({
        data: {
          userId: targetUserId,
          creatorId: adminUserId,
          type,
          currency,
          amount,
          comment,
        },
      });

      // 2. Actualizar el saldo del usuario
      let newBalance: Prisma.Decimal;
      if (currency === 'VES') {
        newBalance = type === 'DEPOSIT'
          ? new Prisma.Decimal(targetUser.balance_VES).plus(amount)
          : new Prisma.Decimal(targetUser.balance_VES).minus(amount);
        if (newBalance.isNegative() && type === 'WITHDRAWAL') {
          throw new Error('Saldo VES insuficiente para el retiro.');
        }
        await tx.user.update({
          where: { id: targetUserId },
          data: { balance_VES: newBalance },
        });
      } else { // USDT
        newBalance = type === 'DEPOSIT'
          ? new Prisma.Decimal(targetUser.balance_USDT).plus(amount)
          : new Prisma.Decimal(targetUser.balance_USDT).minus(amount);
        if (newBalance.isNegative() && type === 'WITHDRAWAL') {
          throw new Error('Saldo USDT insuficiente para el retiro.');
        }
        await tx.user.update({
          where: { id: targetUserId },
          data: { balance_USDT: newBalance },
        });
      }
    });

    // Revalidar la página de detalles del usuario y la lista de transacciones para reflejar cambios
    revalidatePath(`/admin/users/${targetUserId}`);
    revalidatePath('/admin/transactions');

    return { message: `Transacción de ${type} creada exitosamente para el usuario ${targetUser.name || targetUser.email}.`, type: 'success' };
  } catch (error: unknown) {
    console.error('Error al crear la transacción:', error);
    let errorMessage = 'Error interno del servidor al crear la transacción.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      message: errorMessage,
      type: 'error',
      errors: { general: [errorMessage] }
    };
  }
}

// Tipo para los datos de transacción que devolverá la acción
export type TransactionListItem = {
  id: string;
  type: TransactionType; // Usar el enum TransactionType de Prisma
  amount: number; // Convertir a número para serialización
  currency: 'VES' | 'USDT';
  createdAt: Date;
  comment: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  creator?: { // Admin que creó la transacción
    id: string;
    name: string | null;
  } | null;
};

// Nuevo tipo para la respuesta paginada
export type PaginatedTransactionsResponse = {
  transactions?: TransactionListItem[];
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  error?: string;
};

const DEFAULT_PAGE_SIZE = 10;

export async function getTransactionsList(
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
  filters: {
    userId?: string;
    type?: TransactionType;
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
  } = {}
): Promise<PaginatedTransactionsResponse> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.is_admin) {
    return { error: 'No autorizado.' };
  }

  const skip = (page - 1) * pageSize;

  try {
    const whereClause: Prisma.TransactionWhereInput = {};

    if (filters.userId) {
      whereClause.userId = filters.userId;
    }
    if (filters.type) {
      whereClause.type = filters.type;
    }
    if (filters.startDate || filters.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) {
        whereClause.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        // Ajustar para incluir todo el día de endDate
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = endDate;
      }
    }

    const [transactionsData, totalCount] = await prisma.$transaction([
      prisma.transaction.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          creatorUser: { 
            select: { id: true, name: true },
          },
        },
        skip: skip,
        take: pageSize,
        where: whereClause, // Aplicar filtros
      }),
      prisma.transaction.count({ where: whereClause }), // Contar con los mismos filtros
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    // Mapear los resultados al tipo TransactionListItem
    const formattedTransactions: TransactionListItem[] = transactionsData.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount.toNumber(), // Convertir Decimal a número
      currency: tx.currency,
      createdAt: tx.createdAt,
      comment: tx.comment,
      user: tx.user, 
      creator: tx.creatorUser ? { id: tx.creatorUser.id, name: tx.creatorUser.name } : null,
    }));

    return {
      transactions: formattedTransactions,
      totalCount,
      totalPages,
      currentPage: page,
    };
  } catch (error) { 
    console.error('Error al obtener la lista de transacciones:', error);
    return { error: 'Error interno del servidor al obtener transacciones.' };
  }
}
