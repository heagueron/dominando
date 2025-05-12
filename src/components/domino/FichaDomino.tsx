import React from 'react';
import { motion } from 'framer-motion';

interface FichaDominoProps {
  valorSuperior: number;
  valorInferior: number;
  rotacion?: number;
  seleccionada?: boolean;
  onClick?: () => void;
  arrastrable?: boolean;
}

const FichaDomino: React.FC<FichaDominoProps> = ({
  valorSuperior,
  valorInferior,
  rotacion = 0,
  seleccionada = false,
  onClick,
  arrastrable = false,
}) => {
  // Función para renderizar los puntos según el valor
  const renderizarPuntos = (valor: number) => {
    const posiciones = {
      0: [],
      1: [{ top: '50%', left: '50%' }],
      2: [
        { top: '25%', left: '25%' },
        { top: '75%', left: '75%' },
      ],
      3: [
        { top: '25%', left: '25%' },
        { top: '50%', left: '50%' },
        { top: '75%', left: '75%' },
      ],
      4: [
        { top: '25%', left: '25%' },
        { top: '25%', left: '75%' },
        { top: '75%', left: '25%' },
        { top: '75%', left: '75%' },
      ],
      5: [
        { top: '25%', left: '25%' },
        { top: '25%', left: '75%' },
        { top: '50%', left: '50%' },
        { top: '75%', left: '25%' },
        { top: '75%', left: '75%' },
      ],
      6: [
        { top: '25%', left: '25%' },
        { top: '25%', left: '75%' },
        { top: '50%', left: '25%' },
        { top: '50%', left: '75%' },
        { top: '75%', left: '25%' },
        { top: '75%', left: '75%' },
      ],
    };

    return (
      <>
        {posiciones[valor as keyof typeof posiciones].map((pos, index) => (
          <div
            key={index}
            className="punto-domino absolute w-[0.25em] h-[0.25em] sm:w-[0.3em] sm:h-[0.3em] md:w-[0.35em] md:h-[0.35em] lg:w-[0.4em] lg:h-[0.4em] xl:w-[0.45em] xl:h-[0.45em]"
            style={{
              top: pos.top,
              left: pos.left,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </>
    );
  };

  const fichaDominoVariants = {
    normal: {
      scale: 1,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.5)',
    },
    seleccionada: {
      scale: 1.20,
      boxShadow: '0 8px 15px rgba(0, 0, 0, 0.6)',
    },
  };

  // Usamos dimensiones fijas para la ficha, ya que ahora girará como un todo
  // La ficha siempre tiene la misma forma base (vertical), y luego aplicamos la rotación
  const dimensionesClase = 'w-6 h-12 sm:w-8 sm:h-16 md:w-10 md:h-20 lg:w-12 lg:h-24 xl:w-14 xl:h-28';

  console.log(`Renderizando ficha ${valorSuperior}/${valorInferior} con rotación ${rotacion}°`);

  return (
    <motion.div
      className={`ficha-domino relative ${dimensionesClase} cursor-pointer ${
        seleccionada ? 'ring-2 ring-yellow-400' : ''
      } bg-white`}
      onClick={onClick}
      drag={arrastrable}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.2}
      whileTap={{ scale: 1.1 }}
      variants={fichaDominoVariants}
      initial="normal"
      animate={{
        ...(seleccionada ? fichaDominoVariants.seleccionada : fichaDominoVariants.normal),
        rotate: rotacion // Usar la prop rotacion aquí
      }}
      style={{ transformOrigin: 'center center' }} // transformOrigin puede permanecer en style
    >
      {/* Estructura interna de la ficha - siempre en formato vertical */}
      {/* La línea divisoria siempre es horizontal en la estructura base */}
      {/* Al girar la ficha, toda esta estructura girará con ella */}

      {/* Mitad superior */}
      <div className="absolute top-0 left-0 w-full h-1/2 border-b border-gray-400 flex items-center justify-center">
        <div className="relative w-full h-full">
          {renderizarPuntos(valorSuperior)}
        </div>
      </div>

      {/* Mitad inferior */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 flex items-center justify-center">
        <div className="relative w-full h-full">
          {renderizarPuntos(valorInferior)}
        </div>
      </div>
    </motion.div>
  );
};

export default FichaDomino;
