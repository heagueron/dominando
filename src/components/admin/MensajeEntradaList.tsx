'use client';

import React, { useState, useEffect } from 'react';
import { FiEye, FiTrash2 } from 'react-icons/fi';
import { deleteEntryMessage } from '@/actions/entryMessageActions';
import { useRouter } from 'next/navigation';

// Definición del tipo para el mensaje de entrada
interface MensajeEntrada {
  id: string;
  content: string;
  type: string; // Asumiendo que EMType se mapea a string en el cliente
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MensajeEntradaListProps {
  mensajes: MensajeEntrada[];
}

const MensajeEntradaList: React.FC<MensajeEntradaListProps> = ({ mensajes: initialMensajes }) => {
  const [mensajes, setMensajes] = useState(initialMensajes);
  const [selectedMessage, setSelectedMessage] = useState<MensajeEntrada | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const openViewModal = (mensaje: MensajeEntrada) => {
    setSelectedMessage(mensaje);
    setIsViewModalOpen(true);
  };

  const openDeleteModal = (mensaje: MensajeEntrada) => {
    setSelectedMessage(mensaje);
    setIsDeleteModalOpen(true);
  };

  const closeModal = () => {
    setIsViewModalOpen(false);
    setIsDeleteModalOpen(false);
    setTimeout(() => setSelectedMessage(null), 300); // Evita parpadeo de contenido al cerrar
  };

  const handleDelete = async () => {
    if (!selectedMessage) return;
    setIsLoading(true);
    const result = await deleteEntryMessage(selectedMessage.id);
    if (result.error) {
      alert(result.error); // Podrías usar un sistema de notificaciones (toast)
    } else {
      // Refresca los datos del Server Component padre para actualizar la lista.
      router.refresh();
    }
    setIsLoading(false);
    closeModal();
  };

  // Sincroniza el estado local si las props iniciales cambian (ej. después de router.refresh())
  useEffect(() => {
    setMensajes(initialMensajes);
  }, [initialMensajes]);

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Lista de Mensajes de Entrada</h2>
        {mensajes.length === 0 ? (
          <p className="text-gray-600">No hay mensajes de entrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contenido</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuente</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Actualización</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mensajes.map((mensaje) => (
                  <tr key={mensaje.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-[80px]" title={mensaje.id}>
                      {mensaje.id.slice(-6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs" title={mensaje.content}>
                      {mensaje.content.length > 50 ? `${mensaje.content.substring(0, 47)}...` : mensaje.content}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mensaje.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mensaje.source || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(mensaje.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(mensaje.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        <button onClick={() => openViewModal(mensaje)} className="text-blue-600 hover:text-blue-900" title="Ver Detalle">
                          <FiEye size={18} />
                        </button>
                        <button onClick={() => openDeleteModal(mensaje)} className="text-red-600 hover:text-red-900" title="Eliminar Mensaje">
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Ver Detalle */}
      {isViewModalOpen && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 transition-opacity duration-300">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Detalle del Mensaje</h3>
            <div className="mt-4 p-4 bg-gray-50 rounded-md max-h-60 overflow-y-auto">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedMessage.content}</p>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500"><strong>Tipo:</strong> {selectedMessage.type}</p>
              <p className="text-xs text-gray-500"><strong>Fuente:</strong> {selectedMessage.source || 'N/A'}</p>
            </div>
            <div className="mt-5 sm:mt-6">
              <button
                type="button"
                className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                onClick={closeModal}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Confirmar Eliminación */}
      {isDeleteModalOpen && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 transition-opacity duration-300">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Confirmar Eliminación</h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                ¿Estás seguro de que quieres eliminar este mensaje? Esta acción no se puede deshacer.
              </p>
              <blockquote className="mt-2 p-2 border-l-4 border-gray-200 bg-gray-50 text-sm text-gray-700 italic">
                &quot;{selectedMessage.content.substring(0, 100)}{selectedMessage.content.length > 100 ? '...' : ''}&quot;
              </blockquote>
            </div>
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
              <button
                type="button"
                disabled={isLoading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                onClick={handleDelete}
              >
                {isLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                onClick={closeModal}
                disabled={isLoading}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MensajeEntradaList;

// Pequeña animación para el modal en tailwind.config.js si no la tienes
/*
@keyframes fade-in-scale {
  from {
    opacity: 0;
    transform: scale(.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-fade-in-scale {
  animation: fade-in-scale 0.3s ease-out forwards;
}
*/