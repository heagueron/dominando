'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import FichaDomino from './FichaDomino';
import { FichaDomino as TipoFichaDomino } from '@/utils/dominoUtils'; // Renombrar si hay conflicto
import { DOMINO_WIDTH_PX, DOMINO_HEIGHT_PX, DESIGN_TABLE_WIDTH_PX, DESIGN_TABLE_HEIGHT_PX } from '@/utils/dominoConstants';

interface FichaParaLogica extends TipoFichaDomino {
  posicionCuadricula: { fila: number; columna: number };
  rotacion: number;
}

interface FichaRenderizable extends FichaParaLogica {
  x: number; // centro x
  y: number; // centro y
}




interface MesaDominoProps {
  fichasEnMesa: FichaParaLogica[]; // Recibe las fichas con info lógica
  onFichaClick: (id: string) => void;
  // Podrías necesitar pasar fichaSeleccionada si quieres resaltar en la mesa
}

const MesaDomino: React.FC<MesaDominoProps> = ({ fichasEnMesa, onFichaClick }) => {
  const [fichasCalculadas, setFichasCalculadas] = useState<FichaRenderizable[]>([]);
  const [scaleFactor, setScaleFactor] = useState(1);
  const mesaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // La lógica de cálculo de posición de fichas ahora usa las dimensiones de diseño
    // en lugar de las dimensiones actuales del ref de la mesa.
    const designWidth = DESIGN_TABLE_WIDTH_PX;
    const designHeight = DESIGN_TABLE_HEIGHT_PX;
    const nuevasFichasCalculadas: FichaRenderizable[] = [];

    // Actualizar el factor de escala cuando el tamaño de la mesa (mesaRef) cambie
    const updateScale = () => {
      if (mesaRef.current) {
        const currentMesaWidth = mesaRef.current.offsetWidth;
        // Asumimos que DESIGN_TABLE_WIDTH_PX es el ancho base para la escala 1
        setScaleFactor(currentMesaWidth / DESIGN_TABLE_WIDTH_PX);
      }
    };
    updateScale(); // Calcular escala inicial

    fichasEnMesa.forEach((fichaLogic, index) => {
      let nx: number, ny: number;
      const nRot = fichaLogic.rotacion;
      const nEsDoble = fichaLogic.valorSuperior === fichaLogic.valorInferior;

      // if (index > 0 && fichasEnMesa[index-1]?.id === '22' && fichaLogic.id === '23') { // Ejemplo para loguear f1=[2,2] -> f2=[2,3]
      //   console.log(`--- Debugging f1(${fichasEnMesa[index-1]?.id}) -> f2(${fichaLogic.id}) ---`);
      // }

      // Debugging specific transitions - uncomment as needed
      // if (index > 0 && fichasEnMesa[index-1]?.id === '66' && fichaLogic.id === '26') {
      //   console.log(`--- Debugging f1(${fichasEnMesa[index-1]?.id}) -> f2(${fichaLogic.id}) ---`);
      // }

      // Dimensiones actuales de la nueva ficha según su rotación
      const nActualWidth = (nRot === 0) ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
      const nActualHeight = (nRot === 0) ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;

      if (index === 0) {
        nx = designWidth / 2;
        ny = designHeight / 2;
      } else {
        const ultimaFichaCalculada = nuevasFichasCalculadas[index - 1];
        const ultimaFichaLogica = fichasEnMesa[index - 1]; // Para comparar posicionCuadricula

        // if (!ultimaFichaCalculada || !ultimaFichaLogica) {
        //   console.error("Error: ultimaFichaCalculada o ultimaFichaLogica es undefined", {ultimaFichaCalculada, ultimaFichaLogica});
        //   return; // o manejar el error apropiadamente
        // }


        const ux = ultimaFichaCalculada.x;
        const uy = ultimaFichaCalculada.y;
        const uRot = ultimaFichaCalculada.rotacion;

        // if (index > 0 && fichasEnMesa[index-1]?.id === '66' && fichaLogic.id === '26') {
        //   console.log("Prev Tile (f1):", { id: ultimaFichaLogica.id, ux, uy, uRot, uGrid: ultimaFichaLogica.posicionCuadricula });
        //   console.log("DOMINO_WIDTH_PX:", DOMINO_WIDTH_PX, "DOMINO_HEIGHT_PX:", DOMINO_HEIGHT_PX);
        //   console.log("New Tile (f2):", { id: fichaLogic.id, nRot, nGrid: fichaLogic.posicionCuadricula });
        // }
        const uActualWidth = (uRot === 0) ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
        const uActualHeight = (uRot === 0) ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;

        // Determine direction of growth based on posicionCuadricula
        // This is a simplification, the logic of page.tsx is more detailed for the path
        // Here only need the relative direction for the offset.
        // Note: This logic assumes strictly orthogonal movement (only changing row OR column, not both).

        if (fichaLogic.posicionCuadricula.columna > ultimaFichaLogica.posicionCuadricula.columna) { // Derecha
          // if (index > 0 && fichasEnMesa[index-1]?.id === '66' && fichaLogic.id === '26') console.log("Direction: Derecha");
          nx = ux + uActualWidth / 2 + nActualWidth / 2;
          ny = uy;
        } else if (fichaLogic.posicionCuadricula.columna < ultimaFichaLogica.posicionCuadricula.columna) { // Izquierda
          // if (index > 0 && fichasEnMesa[index-1]?.id === '66' && fichaLogic.id === '26') console.log("Direction: Izquierda");
          // Position the new tile's center to the left of the previous tile's center
          nx = ux - uActualWidth / 2 - nActualWidth / 2;
          ny = uy;
        } else if (fichaLogic.posicionCuadricula.fila > ultimaFichaLogica.posicionCuadricula.fila) { // Abajo
          // if (index > 0 && fichasEnMesa[index-1]?.id === '22' && fichaLogic.id === '23') console.log("Direction: Abajo");
          nx = ux;
          ny = uy + uActualHeight / 2 + nActualHeight / 2;
        } else { // Arriba (o misma celda, lo que no debería pasar si la lógica de camino es correcta)
          // if (index > 0 && fichasEnMesa[index-1]?.id === '22' && fichaLogic.id === '23') console.log("Direction: Arriba/Else");
          nx = ux;
          ny = uy - uActualHeight / 2 - nActualHeight / 2;
        }
        // if (index > 0 && fichasEnMesa[index-1]?.id === '66' && fichaLogic.id === '26') {
        //   console.log("Prev Tile (f1) Actual Dims:", { uActualWidth, uActualHeight });
        //   console.log("New Tile (f2) Actual Dims:", { nActualWidth, nActualHeight });
        //   console.log("Calculated nx:", nx, "ny:", ny);
        //   const f1_right_edge = ux + uActualWidth / 2; // Right edge of f1
        //     const f2_left_edge = nx - nActualWidth / 2;
        //     console.log(`f1 right edge: ${f1_right_edge}, f2 left edge: ${f2_left_edge}. Overlap: ${f1_right_edge - f2_left_edge > 0 ? f1_right_edge - f2_left_edge : 0}`);
        // }
      }
      nuevasFichasCalculadas.push({ ...fichaLogic, x: nx, y: ny });
    });

    setFichasCalculadas(nuevasFichasCalculadas);
    // Observador para cambios de tamaño del contenedor de la mesa
    const resizeObserver = new ResizeObserver(updateScale);
    if (mesaRef.current) {
      resizeObserver.observe(mesaRef.current);
    }

    return () => {
      if (mesaRef.current) {
        resizeObserver.unobserve(mesaRef.current);
      }
    };
  }, [fichasEnMesa]);

  return (
    <div
      ref={mesaRef}
      className="bg-green-700 shadow-lg rounded-md relative" // Clases base de la mesa responsiva
      style={{
        width: 'min(calc(100vh - 220px), 90vw)', // Ajusta '220px' y '90vw' según el espacio para header/mano
        aspectRatio: '1 / 1',
        border: '8px solid #7e4a35',
        overflow: 'hidden', // Importante para que el contenido escalado no desborde visualmente
      }}
    >
      <div // Este es el lienzo de diseño de tamaño fijo que se escalará
        style={{
          width: `${DESIGN_TABLE_WIDTH_PX}px`,
          height: `${DESIGN_TABLE_HEIGHT_PX}px`,
          position: 'relative', // Para posicionar las fichas de forma absoluta dentro de él
          transform: `scale(${scaleFactor})`,
          transformOrigin: 'top left', // Escalar desde la esquina superior izquierda
        }}
      >
        {fichasCalculadas.map((ficha) => {
          // Las dimensiones aquí son las dimensiones originales de la ficha (sin escalar)
          const fichaOriginalWidth = (ficha.rotacion === 0) ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
          const fichaOriginalHeight = (ficha.rotacion === 0) ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;
          return (
            <div
              key={ficha.id}
              style={{
                position: 'absolute',
                // ficha.x e y son los centros calculados en el espacio de diseño
                left: `${ficha.x - fichaOriginalWidth / 2}px`,
                top: `${ficha.y - fichaOriginalHeight / 2}px`,
                width: `${fichaOriginalWidth}px`,
                height: `${fichaOriginalHeight}px`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <FichaDomino
                id={ficha.id}
                valorSuperior={ficha.valorSuperior}
                valorInferior={ficha.valorInferior}
                rotacion={ficha.rotacion}
                onClick={() => onFichaClick(ficha.id)}
                arrastrable={false}
                esEnMano={false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MesaDomino;
