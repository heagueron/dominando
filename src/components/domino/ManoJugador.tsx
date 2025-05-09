import React from 'react';
import { motion } from 'framer-motion';
import FichaDomino from './FichaDomino';

interface FichaEnMano {
  id: string;
  valorSuperior: number;
  valorInferior: number;
}

interface ManoJugadorProps {
  fichas: FichaEnMano[];
  fichaSeleccionada?: string;
  onFichaClick: (id: string) => void;
}

const ManoJugador: React.FC<ManoJugadorProps> = ({
  fichas,
  fichaSeleccionada,
  onFichaClick,
}) => {
  return (
    <motion.div 
      className="mano-jugador bg-table-wood-dark bg-opacity-80 p-4 rounded-t-xl fixed bottom-0 left-0 right-0 flex justify-center items-center gap-2 overflow-x-auto"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {fichas.length === 0 ? (
        <p className="text-domino-white text-center py-4">No tienes fichas en tu mano</p>
      ) : (
        <div className="flex justify-center items-center gap-2 py-2">
          {fichas.map((ficha) => (
            <motion.div
              key={ficha.id}
              whileHover={{ y: -10 }}
              whileTap={{ scale: 1.05 }}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <FichaDomino
                valorSuperior={ficha.valorSuperior}
                valorInferior={ficha.valorInferior}
                seleccionada={ficha.id === fichaSeleccionada}
                onClick={() => onFichaClick(ficha.id)}
                arrastrable={true}
              />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ManoJugador;
