// /home/heagueron/jmu/dominando/src/components/juego/FullGameEndModal.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { FinDeRondaPayloadCliente, EstadoMesaPublicoCliente } from '@/types/domino';

interface FullGameEndModalProps {
  finRondaData: {
    resultadoPayload: FinDeRondaPayloadCliente;
  };
  estadoMesaCliente: EstadoMesaPublicoCliente | null;
}

const FullGameEndModal: React.FC<FullGameEndModalProps> = ({ finRondaData, estadoMesaCliente }) => {
  const { resultadoPayload } = finRondaData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40 p-4">
      <motion.div
        id="fin-ronda-full"
        className="bg-yellow-50 border-2 border-yellow-500 p-4 sm:p-6 rounded-lg shadow-2xl text-center max-w-lg w-full bg-opacity-30 relative"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-yellow-800 mb-4">
          Fin de la Ronda
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex flex-col items-center">
            <p className="text-md sm:text-lg font-semibold text-yellow-700 mb-1">Ganador</p>
            <div className="bg-yellow-100 border border-yellow-400 rounded-md p-2 w-full max-w-[200px] truncate">
              <p className="text-lg sm:text-xl font-bold text-yellow-900">
                {resultadoPayload.nombreGanador || resultadoPayload.ganadorRondaId || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <p className="text-md sm:text-lg font-semibold text-yellow-700 mb-1">Puntos</p>
            <div className="bg-yellow-100 border border-yellow-400 rounded-md p-2 w-full max-w-[150px] truncate">
              <p className="text-lg sm:text-xl font-bold text-yellow-900">
                {resultadoPayload.puntosGanadosEstaRonda ?? 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <hr className="border-t-2 border-yellow-300 my-4" />

        <h3 className="text-xl sm:text-2xl font-bold text-yellow-800 mb-4">
          Puntos de la Partida
        </h3>

        {(resultadoPayload.puntuaciones && resultadoPayload.puntuaciones.length > 0) ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-yellow-100 border border-yellow-300 rounded-lg text-sm sm:text-base">
              <thead>
                <tr className="bg-yellow-200 text-yellow-800">
                  <th className="py-2 px-3 text-left">Jugador</th>
                  <th className="py-2 px-3 text-right">Previos</th>
                  <th className="py-2 px-3 text-right">Ronda</th>
                  <th className="py-2 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {resultadoPayload.puntuaciones
                  .sort((a, b) => b.puntosAcumulados - a.puntosAcumulados)
                  .map(score => (
                    <tr key={score.jugadorId} className="border-t border-yellow-200">
                      <td className="py-2 px-3 text-left font-medium text-yellow-900 truncate">{score.nombre}</td>
                      <td className="py-2 px-3 text-right text-gray-900">{score.puntosPrevios}</td>
                      <td className="py-2 px-3 text-right text-gray-900">{score.puntosRonda}</td>
                      <td className="py-2 px-3 text-right font-bold text-gray-900">{score.puntosAcumulados}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-yellow-700">No hay puntuaciones de partida disponibles.</p>
        )}

        {estadoMesaCliente?.partidaActual?.ganadorPartidaId && (
          <motion.div
            className="mt-6 p-3 bg-yellow-200 border border-yellow-500 rounded-lg shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            <p className="text-lg sm:text-xl font-bold text-yellow-900">
              ¡{estadoMesaCliente.jugadores.find(j => j.id === estadoMesaCliente.partidaActual?.ganadorPartidaId)?.nombre || 'Un jugador'} ha ganado la partida!
            </p>
          </motion.div>
        )}
        <span className="absolute bottom-2 left-2 text-xs text-yellow-800 opacity-60 font-mono">
          fin-ronda-full
        </span>
      </motion.div>
    </div>
  );
};

export default FullGameEndModal;
