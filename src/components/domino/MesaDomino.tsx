import React from 'react';
import { motion } from 'framer-motion';
import FichaDomino from './FichaDomino';

interface FichaEnMesa {
  id: string;
  valorSuperior: number;
  valorInferior: number;
  posicionX: number;
  posicionY: number;
  rotacion: number;
}

interface MesaDominoProps {
  fichasEnMesa: FichaEnMesa[];
  onFichaClick?: (id: string) => void;
}

const MesaDomino: React.FC<MesaDominoProps> = ({ fichasEnMesa, onFichaClick }) => {
  return (
    <motion.div
      className="mesa-domino relative w-full h-[600px] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Textura de la mesa */}
      <div className="absolute inset-0 bg-table-wood opacity-90">
        {/* Patrón de vetas de madera (opcional) */}
        <div className="absolute inset-0 opacity-20 bg-repeat" />
      </div>

      {/* Borde de la mesa */}
      <div className="absolute inset-2 border-4 border-table-wood-dark rounded-lg opacity-50" />

      {/* Fichas en la mesa */}
      {fichasEnMesa.map((ficha) => (
        <motion.div
          key={ficha.id}
          className="absolute"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: ficha.posicionX,
            y: ficha.posicionY,
            rotate: ficha.rotacion
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onClick={() => onFichaClick && onFichaClick(ficha.id)}
        >
          <FichaDomino
            valorSuperior={ficha.valorSuperior}
            valorInferior={ficha.valorInferior}
          />
        </motion.div>
      ))}

      {/* Mensaje cuando no hay fichas */}
      {fichasEnMesa.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-domino-white text-xl font-medium">
            Esperando a que comience el juego...
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default MesaDomino;
