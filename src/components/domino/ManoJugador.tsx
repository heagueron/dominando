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
  // Modificamos onFichaClick para que pueda recibir el id del jugador/mano
  onFichaClick: (idFicha: string, idJugadorMano: string) => void; 
  idJugadorMano: string; // Identificador de la mano/jugador
  className?: string; // Para permitir estilos externos (posicionamiento)
  layoutDirection?: 'row' | 'col'; // Para controlar la dirección del flex
}

const ManoJugador: React.FC<ManoJugadorProps> = ({
  fichas,
  fichaSeleccionada,
  onFichaClick,
  idJugadorMano,
  className = "",
  layoutDirection = 'row',
}) => {
  const esManoPrincipal = idJugadorMano === "jugador1"; // O alguna otra lógica para identificar la mano principal
  // Definir clases de tamaño para las fichas en mano según el jugador y el breakpoint
  // Ahora, esta constante `fichaSizeClass` se pasará correctamente a cada FichaDomino.
  // Puedes ajustar los valores aquí (por ejemplo, tu prueba con w-[2px] h-[4px])
  // y deberían reflejarse.
  const fichaSizeClass = esManoPrincipal
    ? 'w-[30px] h-[60px] sm:w-[30px] sm:h-[60px] md:w-[30px] md:h-[60px] lg:w-[48px] lg:h-[96px] xl:w-[48px] xl:h-[96px] 2xl:w-[48px] 2xl:h-[96px]' // Jugador 1 (ejemplo con más breakpoints)
    : 'w-[23px] h-[46px] sm:w-[23px] sm:h-[46px] md:w-[23px] md:h-[46px] lg:w-[40px] lg:h-[80px] xl:w-[40px] xl:h-[80px] 2xl:w-[40px] 2xl:h-[80px]'; // Otros jugadores (ejemplo con más breakpoints)
  return (
    <motion.div
      // El posicionamiento y animación de entrada principal se manejarán externamente
      // para la mano principal, o no se aplicarán a las otras.
      className={`mano-jugador-base bg-domino-black bg-opacity-10 p-1 rounded-lg flex gap-1 z-10 ${className} ${
        layoutDirection === 'row' ? 'flex-row overflow-x-auto justify-center' : 'flex-col overflow-y-auto items-center'
      } ${esManoPrincipal ? 'rounded-t-xl' : 'rounded-md'}`}
      // La animación de entrada se aplicará solo a la mano principal desde page.tsx
    >
      {fichas.length === 0 ? (
        <p className="text-domino-white text-xs text-center p-2">Mano Vacía</p>
      ) : (
        <div className={`flex gap-1 ${layoutDirection === 'row' ? 'flex-row items-center' : 'flex-col items-center'}`}>
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
                onClick={() => onFichaClick(ficha.id, idJugadorMano)}
                arrastrable={true} // Las fichas en mano son arrastrables
                esEnMano={true}    // Indicar que esta ficha está en la mano
                sizeClass={fichaSizeClass} // <--- AQUÍ ESTÁ LA CORRECCIÓN
              />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ManoJugador;
