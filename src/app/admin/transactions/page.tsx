'use client'; // Marcar como Client Component

import React, { useEffect, Suspense, useState } from 'react'; // Importar React, useEffect, Suspense y useState
import { useSession } from "next-auth/react"; // Usar useSession para el cliente
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { getTransactionsList, TransactionListItem } from '@/actions/adminActions'; // Importar la acción y el tipo
import { Prisma } from '@prisma/client'; // Para el tipo Decimal

// Helper para formatear fechas que pueden ser string o Date
const formatDate = (dateInput: Date | string | null) => {
  if (!dateInput) return 'N/A';
  // Formato más completo para la lista de transacciones
  return new Date(dateInput).toLocaleString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

// Helper para formatear Decimal (que vendrá como string o number desde JSON en el cliente si no se maneja)
const formatDecimal = (value: Prisma.Decimal | number | string | undefined) => {
  if (value === undefined || value === null) return '0.00';
  return Number(value).toFixed(2);
};

function TransactionsPageContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams(); // Hook para leer query params
  const successMessage = searchParams.get('message');
  const [isMessageVisible, setIsMessageVisible] = useState(!!successMessage);
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  useEffect(() => {
    // Redirigir si no está autenticado o no es admin, una vez que el estado de la sesión esté disponible
    if (status === "authenticated" && (!session?.user || !session.user.is_admin)) {
      console.warn(`Intento de acceso no autorizado a /admin/transactions por userId: ${session?.user?.id || 'desconocido'}`);
      redirect("/auth/signin?callbackUrl=/admin/transactions");
    } else if (status === "unauthenticated") {
      redirect("/auth/signin?callbackUrl=/admin/transactions");
    }
  }, [session, status]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.is_admin) {
      const fetchTransactions = async () => {
        setLoadingTransactions(true);
        setTransactionsError(null);
        const result = await getTransactionsList();
        if (result.error) {
          setTransactionsError(result.error);
        } else if (result.transactions) {
          setTransactions(result.transactions);
        }
        setLoadingTransactions(false);
      };
      fetchTransactions();
    }
  }, [status, session]);

  const handleDismissMessage = () => {
    setIsMessageVisible(false);
  };

  if (status === "loading") {
    return <LoadingSpinner message="Cargando sesión..." />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
            <Link href="/admin" className="text-blue-600 hover:text-blue-800 font-medium flex items-center">
                &larr; Volver al Dashboard Principal
            </Link>
        </div>

        {/* Mostrar el mensaje de éxito si es visible */}
        {isMessageVisible && successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4 flex justify-between items-center" role="alert">
            <span>{successMessage}</span>
            <button
              onClick={handleDismissMessage}
              className="ml-4 text-green-700 hover:text-green-900"
              aria-label="Cerrar mensaje"
            >
              {/* Icono X simple */}
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
            </button>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Transacciones</h1>
          <Link
            href="/admin/transactions/create"
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition duration-150 ease-in-out"
          >
            Crear Nueva Transacción
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Historial de Transacciones</h2>
          {loadingTransactions && <p className="text-gray-600">Cargando transacciones...</p>}
          {transactionsError && <p className="text-red-500">Error al cargar transacciones: {transactionsError}</p>}
          {!loadingTransactions && !transactionsError && transactions.length === 0 && (
            <p className="text-gray-600">No hay transacciones registradas.</p>
          )}
          {!loadingTransactions && !transactionsError && transactions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Moneda</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comentario</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-[80px]" title={tx.id}>
                        <Link href={`/admin/transactions/${tx.id}`} className="text-blue-600 hover:underline">
                          {tx.id.slice(-6)}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-[150px]" title={tx.user.email}>
                        <Link href={`/admin/users/${tx.user.id}`} className="text-blue-600 hover:underline">
                          {tx.user.name || tx.user.email}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.type}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${tx.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'DEPOSIT' ? '+' : '-'}{formatDecimal(tx.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.currency}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(tx.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-[100px]" title={tx.creator?.name || tx.creator?.id}>
                        {tx.creator?.name || tx.creator?.id?.slice(-6) || 'Sistema'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs" title={tx.comment || undefined}>
                        {tx.comment || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
      <Footer />
    </div>
  );
}

export default function AdminTransactionsPage() {
  return (
    // Suspense boundary para el contenido que usa useSearchParams
    <Suspense fallback={<LoadingSpinner message="Cargando página de transacciones..." />}>
      <TransactionsPageContent />
    </Suspense>
  );
}

function LoadingSpinner({ message = "Cargando..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-700 text-xl">{message}</p>
    </div>
  );
}