// /home/heagueron/jmu/dominando/src/components/layout/TermsConfirmationModal.tsx
'use client';

import React from 'react';
import Link from 'next/link';

interface TermsConfirmationModalProps {
  onConfirm: () => void;
  isConfirming: boolean;
}

const TermsConfirmationModal: React.FC<TermsConfirmationModalProps> = ({ onConfirm, isConfirming }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-domino-white text-domino-black rounded-lg shadow-xl p-6 md:p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Confirmación Requerida</h2>
        <div className="space-y-4 text-gray-800">
          <p>
            Para continuar, por favor confirma lo siguiente:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              Soy mayor de 18 años.
            </li>
            <li>
              He leído y acepto los{' '}
              <Link href="/terminos" target="_blank" className="text-blue-600 hover:underline">
                Términos y Condiciones del Servicio
              </Link>.
            </li>
            <li>
              He leído y acepto la{' '}
              <Link href="/privacidad" target="_blank" className="text-blue-600 hover:underline">
                Política de Privacidad
              </Link>{' '}
              y el tratamiento de mis datos.
            </li>
          </ul>
        </div>
        <div className="mt-8 text-center">
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-10 rounded-lg text-lg transition-all duration-150 ease-in-out transform hover:scale-105 shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isConfirming ? 'Confirmando...' : 'Confirmar y Jugar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsConfirmationModal;
