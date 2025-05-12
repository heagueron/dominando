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
  // Estas clases de dimensiones son para el contenedor de cada ficha en la mano
  // Ajusta según sea necesario para el tamaño deseado en la mano
  // const dimensionesFichaEnMano = 'w-10 h-20 sm:w-12 sm:h-24 md:w-14 md:h-28'; // Ya no es necesario aquí si FichaDomino tiene tamaño fijo

  return (
    <motion.div
      className="mano-jugador bg-domino-black bg-opacity-20 rounded-t-xl fixed bottom-0 left-0 right-0 flex justify-center items-center gap-2 overflow-x-auto z-10"
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
              whileHover={{ y: -5 }}
              whileTap={{ scale: 1.05 }}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              // className={dimensionesFichaEnMano} // FichaDomino ahora se auto-dimensiona
            >
              <FichaDomino
                id={ficha.id} // Pasar el id
                valorSuperior={ficha.valorSuperior}
                valorInferior={ficha.valorInferior}
                seleccionada={ficha.id === fichaSeleccionada}
                onClick={() => onFichaClick(ficha.id)}
                arrastrable={true} // Las fichas en mano son arrastrables
                esEnMano={true}    // Indicar que esta ficha está en la mano
              />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ManoJugador;
