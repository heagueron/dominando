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
            className="punto-domino absolute w-[0.35em] h-[0.35em] sm:w-[0.4em] sm:h-[0.4em] md:w-[0.45em] md:h-[0.45em]"
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
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    seleccionada: {
      scale: 1.05,
      boxShadow: '0 8px 15px rgba(0, 0, 0, 0.2)',
    },
  };

  return (
    <motion.div
      className={`ficha-domino relative w-8 h-16 sm:w-10 sm:h-20 md:w-12 md:h-24 cursor-pointer ${
        seleccionada ? 'ring-2 ring-yellow-400' : ''
      }`}
      style={{ transform: `rotate(${rotacion}deg)` }}
      onClick={onClick}
      drag={arrastrable}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.2}
      whileTap={{ scale: 1.1 }}
      variants={fichaDominoVariants}
      initial="normal"
      animate={seleccionada ? 'seleccionada' : 'normal'}
    >
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
