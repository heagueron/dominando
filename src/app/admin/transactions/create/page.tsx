'use client';

import React, { useEffect, useActionState as useReactActionState, useState, startTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation'; // Removed useSearchParams
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { createTransaction, CreateTransactionFormState } from '@/actions/adminActions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Creando Transacción...' : 'Crear Transacción'}
    </button>
  );
}

export default function CreateTransactionPage() {
  const router = useRouter();
  const initialState: CreateTransactionFormState = { message: '', type: 'success' };

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [currentFormData, setCurrentFormData] = useState<FormData | null>(null);

  // Usar el useActionState importado de 'react'
  const [formState, formAction] = useReactActionState(createTransaction, initialState);

  useEffect(() => {
    if (formState.type === 'success' && formState.message) {
      setIsConfirmModalOpen(false); // Cerrar modal si estaba abierto y la acción fue exitosa
      setCurrentFormData(null);
      // Redirigir a la lista de transacciones, pasando el mensaje como query param
      // La página /admin/transactions ya está configurada para mostrar este mensaje.
      router.push(`/admin/transactions?message=${encodeURIComponent(formState.message)}`);
    } else if (formState.type === 'error' && formState.message) {
      // Si hay un error de la acción del servidor, podríamos querer cerrar el modal
      // o mantenerlo abierto para que el usuario vea los datos que intentó enviar.
      // Por ahora, lo cerraremos para simplificar si el error es general y no de validación.
      // Si hay errores de validación (formState.errors), el modal permanecerá abierto
      // para mostrar esos errores específicos.
      if (!formState.errors || Object.keys(formState.errors).length === 0) {
        setIsConfirmModalOpen(false);
      }
    }
  }, [formState, router]);

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setCurrentFormData(formData);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmTransaction = () => {
    if (currentFormData) {
      // Envolver la llamada a formAction en startTransition
      startTransition(() => {
        // @ts-ignore // prevState es manejado internamente por useReactActionState, no es necesario aquí
        formAction(currentFormData);
      });
      // No cerramos el modal aquí, esperamos al useEffect basado en formState
      // o si hay errores de validación, el modal permanecerá abierto.
    }
  };

  const handleCancelConfirmation = () => {
    setIsConfirmModalOpen(false);
    setCurrentFormData(null);
    // Si había un error general en formState y el modal se cancela,
    // es buena idea limpiar ese mensaje para que no persista en el formulario principal
    // si el usuario decide no reenviar.
    if (formState.type === 'error' && formState.message && (!formState.errors || Object.keys(formState.errors).length === 0)) {
        // @ts-ignore // Resetting formState, formAction will handle the new state
        formAction(initialState);
    }
  };

  // Para mostrar en el modal
  const dataToConfirm = currentFormData ? {
    userId: currentFormData.get('userId') as string,
    type: currentFormData.get('type') as string,
    amount: currentFormData.get('amount') as string,
    currency: currentFormData.get('currency') as string,
    comment: currentFormData.get('comment') as string || 'N/A',
  } : null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 font-medium flex items-center">
            &larr; Volver al Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Crear Nueva Transacción</h1>

         {/* Mostrar el mensaje de éxito o error general del formulario principal (no del modal) */}
        {formState.message && formState.type === 'success' && !isConfirmModalOpen && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{formState.message}</div>}
        {formState.message && formState.type === 'error' && !isConfirmModalOpen && (!formState.errors || Object.keys(formState.errors).length === 0) && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{formState.message}</div>}


        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
                ID del Usuario
              </label>
              <input
                type="text"
                name="userId"
                id="userId"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
                placeholder="ID del usuario objetivo"
              />
              {formState.errors?.userId && !isConfirmModalOpen && (
                <p className="text-xs text-red-500 mt-1">{formState.errors.userId.join(', ')}</p>
              )}
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Transacción
              </label>
              <select
                name="type"
                id="type"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white text-black"
              >
                <option value="DEPOSIT">Depósito</option>
                <option value="WITHDRAWAL">Retiro</option>
              </select>
              {formState.errors?.type && !isConfirmModalOpen && (
                <p className="text-xs text-red-500 mt-1">{formState.errors.type.join(', ')}</p>
              )}
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Monto
              </label>
              <input
                type="number"
                name="amount"
                id="amount"
                required
                step="0.01" // Para permitir decimales
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
                placeholder="0.00"
              />
              {formState.errors?.amount && !isConfirmModalOpen && (
                <p className="text-xs text-red-500 mt-1">{formState.errors.amount.join(', ')}</p>
              )}
            </div>

            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                Moneda
              </label>
              <select
                name="currency"
                id="currency"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white text-black"
              >
                <option value="VES">VES</option>
                <option value="USDT">USDT</option>
              </select>
              {formState.errors?.currency && !isConfirmModalOpen && (
                <p className="text-xs text-red-500 mt-1">{formState.errors.currency.join(', ')}</p>
              )}
            </div>

            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                Comentario (Opcional)
              </label>
              <textarea
                name="comment"
                id="comment"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
                placeholder="Ej: Depósito por transferencia Zelle, Retiro a cuenta bancaria X"
              ></textarea>
              {formState.errors?.comment && !isConfirmModalOpen && (
                <p className="text-xs text-red-500 mt-1">{formState.errors.comment.join(', ')}</p>
              )}
            </div>

            {formState.type === 'error' && formState.errors?.general && !isConfirmModalOpen && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{formState.errors.general.join(', ')}</span>
              </div>
            )}
             {formState.type === 'error' && formState.message && !formState.errors?.general && !isConfirmModalOpen && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{formState.message}</span>
              </div>
            )}

            <SubmitButton />
          </form>
        </div>

        {isConfirmModalOpen && dataToConfirm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Confirmar Transacción</h2>
              <div className="space-y-3 mb-6 text-sm text-gray-700">
                <p><strong>ID Usuario:</strong> <span className="text-gray-900">{dataToConfirm.userId}</span></p>
                <p><strong>Tipo:</strong> <span className="text-gray-900">{dataToConfirm.type === 'DEPOSIT' ? 'Depósito' : 'Retiro'}</span></p>
                <p><strong>Monto:</strong> <span className="text-gray-900">{parseFloat(dataToConfirm.amount).toFixed(2)}</span></p>
                <p><strong>Moneda:</strong> <span className="text-gray-900">{dataToConfirm.currency}</span></p>
                <p><strong>Comentario:</strong> <span className="text-gray-900">{dataToConfirm.comment}</span></p>
              </div>
              {/* Mostrar errores específicos del formulario si la acción ya se ejecutó y falló */}
              {formState.type === 'error' && formState.errors && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 text-xs" role="alert">
                  <p className="font-bold mb-1">Errores de validación:</p>
                  <ul className="list-disc list-inside">
                    {Object.entries(formState.errors).map(([key, value]) =>
                      value && Array.isArray(value) && value.map((errorMsg, index) => (
                        <li key={`${key}-${index}`}>{errorMsg}</li>
                      ))
                    )}
                  </ul>
                </div>
              )}
               {/* Mostrar mensaje de error general si no hay errores específicos de campo */}
              {formState.type === 'error' && formState.message && (!formState.errors || Object.keys(formState.errors).length === 0) && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 text-xs" role="alert">
                  <p className="font-bold">Error:</p>
                  <p>{formState.message}</p>
                </div>
              )}
              <div className="flex justify-end space-x-4">
                <button
                  onClick={handleCancelConfirmation}
                  className="px-4 py-2 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-md transition"
                >Cancelar</button>
                <button
                  onClick={handleConfirmTransaction}
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition"
                >Confirmar y Crear</button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
