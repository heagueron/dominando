'use client'; // Marcar como Client Component

import React, { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { useParams, useRouter, notFound } from "next/navigation"; // Importar notFound desde navigation
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import UserAvatar from '@/components/jugador/UserAvatar'; // Para mostrar el avatar del usuario
import { Prisma } from '@prisma/client'; // Para el tipo Decimal

// Tipo para los datos del usuario que esperamos de la API
type UserDetailData = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  emailVerified: Date | string | null; // Puede ser string si viene de JSON
  image: string | null;
  is_admin: boolean;
  createdAt: Date | string; // Puede ser string si viene de JSON
  updatedAt: Date | string; // Puede ser string si viene de JSON
  balance_VES: Prisma.Decimal | number | string; // Prisma.Decimal no existe en el cliente, será string o number
  balance_USDT: Prisma.Decimal | number | string;
  statistics: { playedMatches: number; wins: number; totalPoints: number; skillLevel: number; } | null;
  transactions: { id: string; type: string; amount: Prisma.Decimal | number | string; currency: string; createdAt: Date | string; comment: string | null; }[];
}

export default function AdminUserDetailPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams(); // Hook para obtener parámetros de ruta en Client Components
  const userId = params.userId as string; // Obtener userId

  const [user, setUser] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar si el usuario está autenticado y si es administrador
  useEffect(() => {
    if (sessionStatus === 'loading') return; // Esperar a que la sesión cargue

    if (!session || !session.user || !session.user.is_admin) {
      console.warn(`Intento de acceso no autorizado a /admin/users/${userId} por userId: ${session?.user?.id || 'desconocido'}`);
      router.push(`/auth/signin?callbackUrl=/admin/users/${userId}`);
    }
  }, [session, sessionStatus, userId, router]);

  // Obtener los detalles del usuario desde la API
  useEffect(() => {
    if (userId && session?.user?.is_admin) { // Solo buscar si es admin y hay userId
      const fetchUserDetails = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/admin/users/${userId}`);
          if (!response.ok) {
            if (response.status === 404) {
              notFound(); // Llama a la página 404 de Next.js
              return;
            }
            throw new Error(`Error al obtener datos del usuario: ${response.statusText}`);
          }
          const data: UserDetailData = await response.json();
          setUser(data);
        } catch (err) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('Ocurrió un error desconocido.');
          }
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchUserDetails();
    }
  }, [userId, session]); // Dependencias del efecto

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center">
          <p className="text-gray-700 text-xl">Cargando detalles del usuario...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center">
          <p className="text-red-600 text-xl mb-4">Error: {error}</p>
          <Link href="/admin/users" className="text-blue-600 hover:text-blue-800 font-medium">
            &larr; Volver a la Lista de Usuarios
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    // Esto no debería alcanzarse si notFound() funciona correctamente, pero es un fallback.
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center">
                <p className="text-gray-700 text-xl mb-4">Usuario no encontrado.</p>
                <Link href="/admin/users" className="text-blue-600 hover:text-blue-800 font-medium">
                    &larr; Volver a la Lista de Usuarios
                </Link>
            </main>
            <Footer />
        </div>
    );
  }

  // Helper para formatear fechas que pueden ser string o Date
  const formatDate = (dateInput: Date | string | null) => {
    if (!dateInput) return 'N/A';
    return new Date(dateInput).toLocaleDateString();
  };

  // Helper para formatear Decimal (que vendrá como string o number desde JSON)
  const formatDecimal = (value: Prisma.Decimal | number | string | undefined) => {
    if (value === undefined || value === null) return '0.00';
    return Number(value).toFixed(2);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
            <Link href="/admin/users" className="text-blue-600 hover:text-blue-800 font-medium flex items-center">
                &larr; Volver a la Lista de Usuarios
            </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-6">Detalles del Usuario</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center mb-6">
            <UserAvatar src={user.image} name={user.name || user.username} size={80} className="mr-6" />
            <div>
              <h2 className="text-2xl font-semibold text-gray-700">{user.name || user.username || 'Nombre no especificado'}</h2>
              <p className="text-gray-600">{user.email}</p>
              {user.is_admin && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 mt-1">Administrador</span>}
              <p className="text-sm text-gray-500 mt-1">ID: {user.id}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información General */}
            <div>
              <h3 className="text-xl font-semibold text-gray-700 mb-3">Información General</h3>
              <p className="text-gray-600 text-sm mb-2">Username: <span className="font-medium">{user.username || 'N/A'}</span></p>
              <p className="text-gray-600 text-sm mb-2">Email Verificado: {user.emailVerified ? <span className="font-medium text-green-600">Sí ({formatDate(user.emailVerified)})</span> : <span className="font-medium text-red-600">No</span>}</p>
              <p className="text-gray-600 text-sm mb-2">Registrado: <span className="font-medium">{formatDate(user.createdAt)}</span></p>
              <p className="text-gray-600 text-sm mb-2">Última Actualización: <span className="font-medium">{formatDate(user.updatedAt)}</span></p>
            </div>

            {/* Estadísticas (si existen) */}
            {user.statistics && (
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Estadísticas</h3>
                <p className="text-gray-600 text-sm mb-2">Partidas Jugadas: <span className="font-medium">{user.statistics.playedMatches}</span></p>
                <p className="text-gray-600 text-sm mb-2">Victorias: <span className="font-medium">{user.statistics.wins}</span></p>
                <p className="text-gray-600 text-sm mb-2">Puntos Totales: <span className="font-medium">{user.statistics.totalPoints}</span></p>
                <p className="text-gray-600 text-sm mb-2">Nivel de Habilidad: <span className="font-medium">{user.statistics.skillLevel}</span></p>
              </div>
            )}
          </div>

          {/* Saldos */}
          <div className="mt-6">
             <h3 className="text-xl font-semibold text-gray-700 mb-3">Saldos</h3>
             <p className="text-gray-600 text-sm mb-2">Saldo VES: <span className="font-medium">{formatDecimal(user.balance_VES)}</span></p>
             <p className="text-gray-600 text-sm mb-2">Saldo USDT: <span className="font-medium">{formatDecimal(user.balance_USDT)}</span></p>
          </div>

          {/* Acciones de Administración (Editar Rol, Suspender, etc. - Próximamente) */}
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-3">Acciones</h3>
            <div className="flex space-x-4">
              <button className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                Editar Rol (Próximamente)
              </button>
              <button className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                Suspender (Próximamente)
              </button>
              {/* Añadir más botones de acción aquí */}
            </div>
          </div>
        </div>

        {/* Historial de Transacciones Recientes */}
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Transacciones Recientes ({user.transactions.length})</h3>
            {user.transactions.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    ID Transacción
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tipo
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Monto
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Moneda
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fecha
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Comentario
                                </th>
                                {/* Puedes añadir más columnas si es necesario */}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {user.transactions.map(tx => (
                                <tr key={tx.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-xs" title={tx.id}>{tx.id.slice(-6)}</td> {/* Mostrar solo los últimos 6 caracteres */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatDecimal(tx.amount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{String(tx.currency)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(tx.createdAt)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs" title={tx.comment || undefined}>{tx.comment || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-gray-600 text-sm">No hay transacciones recientes para este usuario.</p>
            )}
             {/* Enlace a la página completa de transacciones del usuario (Próximamente) */}
             {/* {user.transactions.length > 0 && (
                 <div className="mt-4 text-right">
                     <Link href={`/admin/transactions?userId=${user.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                         Ver todas las transacciones &rarr;
                     </Link>
                 </div>
             )} */}
        </div>

      </main>
      <Footer />
    </div>
  );
}