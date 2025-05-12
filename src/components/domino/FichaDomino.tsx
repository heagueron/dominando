import React from 'react';
// import { motion } from 'framer-motion'; // Temporalmente comentado si volvemos a div simple
import { DOMINO_WIDTH_PX, DOMINO_HEIGHT_PX } from '@/utils/dominoConstants';

interface FichaDominoProps {
  id: string;
  valorSuperior: number;
  valorInferior: number;
  rotacion?: number;
  seleccionada?: boolean;
  onClick?: () => void;
  arrastrable?: boolean;
  esEnMano?: boolean;
}

const FichaDomino: React.FC<FichaDominoProps> = ({
  // id,
  valorSuperior,
  valorInferior,
  rotacion = 0,
  seleccionada = false,
  onClick,
  // arrastrable = false, // Comentado para la versión div simple
  // esEnMano,
}) => {
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
      <React.Fragment>
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
      </React.Fragment>
    );
  };

  // const fichaDominoVariants = { // Comentado para la versión div simple
  //   normal: {
  //     scale: 1,
  //     boxShadow: '0 4px 6px rgba(0, 0, 0, 0.5)',
  //   },
  //   seleccionada: {
  //     scale: 1.20,
  //     boxShadow: '0 8px 15px rgba(0, 0, 0, 0.6)',
  //   },
  // };

  console.log(`Renderizando ficha ${valorSuperior}/${valorInferior} con rotación ${rotacion}°`);

  return (
    // Usando div simple para el elemento raíz de la ficha
    <div
      className={`ficha-domino relative cursor-pointer ${
        seleccionada ? 'ring-2 ring-yellow-400' : ''
      } bg-white`}
      style={{
        width: `${DOMINO_WIDTH_PX}px`,
        height: `${DOMINO_HEIGHT_PX}px`,
        transform: `rotate(${rotacion}deg)`,
        transformOrigin: 'center center',
      }}
      onClick={onClick}
    >
      {/* Estructura interna de la ficha */}
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
    </div>
  );
};

export default FichaDomino;
