// /home/heagueron/jmu/dominando/src/components/juego/SingleRoundEndModal.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { FinDeRondaPayloadCliente } from '@/types/domino';
import { calcularPuntosMano } from '@/utils/dominoUtils';

interface SingleRoundEndModalProps {
  finRondaData: {
    resultadoPayload: FinDeRondaPayloadCliente;
  };
  onPlayAgain: () => void;
  onSalirDeMesa: () => void;
}

const SingleRoundEndModal: React.FC<SingleRoundEndModalProps> = ({
  finRondaData,
  onPlayAgain,
  onSalirDeMesa,
}) => {
  const { resultadoPayload } = finRondaData;
  const isTrancado = resultadoPayload.tipoFinRonda === 'trancado';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40 p-4">
      <motion.div
        id="fin-ronda-single"
        className="bg-yellow-50 border-2 border-yellow-500 p-4 sm:p-6 rounded-lg shadow-2xl text-center max-w-lg w-full bg-opacity-30 relative"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-yellow-800 mb-4">
          Fin de la Ronda - Partida
        </h2>

        <div className="flex flex-col items-center mb-6">
          <p className="text-md sm:text-lg font-semibold text-yellow-700 mb-1">Ganador</p>
          <div className="bg-yellow-100 border border-yellow-400 rounded-md p-2 w-full max-w-[250px] truncate">
            <p className="text-lg sm:text-xl font-bold text-yellow-900">
              {resultadoPayload.nombreGanador || resultadoPayload.ganadorRondaId || 'N/A'}
            </p>
          </div>
        </div>

        {isTrancado && (
          <>
            <hr className="border-t-2 border-yellow-300 my-4" />
            <h3 className="text-xl sm:text-2xl font-bold text-yellow-800 mb-4">
              Puntos restantes
            </h3>
            {(resultadoPayload.manosFinales && resultadoPayload.manosFinales.length > 0) ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-yellow-100 border border-yellow-300 rounded-lg text-sm sm:text-base">
                  <thead>
                    <tr className="bg-yellow-200 text-yellow-800">
                      <th className="py-2 px-3 text-left">Jugador</th>
                      <th className="py-2 px-3 text-right">Puntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadoPayload.manosFinales
                      .map(mano => ({
                        jugadorId: mano.jugadorId,
                        nombre: resultadoPayload.puntuaciones.find(p => p.jugadorId === mano.jugadorId)?.nombre || mano.jugadorId,
                        puntos: calcularPuntosMano(mano.fichas),
                      }))
                      .sort((a, b) => a.puntos - b.puntos)
                      .map(score => (
                        <tr key={score.jugadorId} className="border-t border-yellow-200">
                          <td className="py-2 px-3 text-left font-medium text-yellow-900 truncate">{score.nombre}</td>
                          <td className="py-2 px-3 text-right font-bold text-gray-900">{score.puntos}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-yellow-700">No hay información de manos finales disponible.</p>
            )}
          </>
        )}

        <hr className="border-t-2 border-yellow-300 my-4" />

        <div className="mt-4">
          <button onClick={onPlayAgain} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-transform transform hover:scale-105 shadow-md mb-3">Jugar de Nuevo</button>
          <div className="flex space-x-4">
            <button onClick={onSalirDeMesa} className="w-full bg-red-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">Salir de la Mesa</button>
          </div>
        </div>
        <span className="absolute bottom-2 left-2 text-xs text-yellow-800 opacity-60 font-mono">
          fin-ronda-single
        </span>
      </motion.div>
    </div>
  );
};

export default SingleRoundEndModal;
