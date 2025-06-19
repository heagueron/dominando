'use client'; // Marcar como Client Component

import React, { useEffect, Suspense, useState } from 'react'; // Importar React, useEffect, Suspense y useState
import { useSession } from "next-auth/react"; // Usar useSession para el cliente
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { getTransactionsList, TransactionListItem, PaginatedTransactionsResponse } from '@/actions/adminActions';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 10; // Podría ser una constante o configurable

  // Estados para los filtros
  const [filterUserId, setFilterUserId] = useState('');
  const [filterType, setFilterType] = useState(''); // '' para "Todos"
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

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
        const activeFilters = {
          userId: filterUserId || undefined,
          type: filterType || undefined,
          startDate: filterStartDate || undefined,
          endDate: filterEndDate || undefined,
        };
        // @ts-expect-error // El tipo de activeFilters.type (string) podría no coincidir directamente con TransactionType (enum) esperado por getTransactionsList sin una aserción.
        const result: PaginatedTransactionsResponse = await getTransactionsList(currentPage, pageSize, activeFilters);
        if (result.error) {
          setTransactionsError(result.error);
        } else if (result.transactions) {
          setTransactions(result.transactions);
          setTotalPages(result.totalPages || 0);
          // Si la página actual es mayor que el total de páginas (después de filtrar), ajustar
          if (result.currentPage && result.totalPages && result.currentPage > result.totalPages) {
            setCurrentPage(result.totalPages > 0 ? result.totalPages : 1);
          }
        }
        setLoadingTransactions(false);
      };
      fetchTransactions();
    }
  }, [status, session, currentPage, pageSize, filterUserId, filterType, filterStartDate, filterEndDate]);

  const handleDismissMessage = () => {
    setIsMessageVisible(false);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleApplyFilters = () => {
    setCurrentPage(1); // Resetear a la primera página al aplicar filtros
    // El useEffect se encargará de recargar los datos
  };

  const handleClearFilters = () => {
    setFilterUserId('');
    setFilterType('');
    setFilterStartDate('');
    setFilterEndDate('');
    setCurrentPage(1); // Resetear a la primera página
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

        {/* Sección de Filtros */}
        <div className="mb-8 p-6 bg-gray-50 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Filtrar Transacciones</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="filterUserId" className="block text-sm font-medium text-gray-700">ID Usuario</label>
              <input
                type="text"
                id="filterUserId"
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
                placeholder="ID exacto del usuario"
              />
            </div>
            <div>
              <label htmlFor="filterType" className="block text-sm font-medium text-gray-700">Tipo</label>
              <select
                id="filterType"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
              >
                <option value="">Todos</option>
                <option value="DEPOSIT">Depósito</option>
                <option value="WITHDRAWAL">Retiro</option>
                <option value="GAME_FEE">Comisión Juego</option>
                <option value="PRIZE_PAYOUT">Pago Premio</option>
              </select>
            </div>
            <div>
              <label htmlFor="filterStartDate" className="block text-sm font-medium text-gray-700">Fecha Desde</label>
              <input type="date" id="filterStartDate" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black" />
            </div>
            <div>
              <label htmlFor="filterEndDate" className="block text-sm font-medium text-gray-700">Fecha Hasta</label>
              <input type="date" id="filterEndDate" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black" />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button onClick={handleClearFilters} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Limpiar Filtros
            </button>
            <button onClick={handleApplyFilters} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Aplicar Filtros
            </button>
          </div>
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
              {/* Controles de Paginación */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-between items-center">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1 || loadingTransactions}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-700">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || loadingTransactions}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              )}
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