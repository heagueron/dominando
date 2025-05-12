'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import FichaDomino from './FichaDomino';
import { FichaDomino as TipoFichaDomino } from '@/utils/dominoUtils'; // Renombrar si hay conflicto
import { DOMINO_WIDTH_PX, DOMINO_HEIGHT_PX } from '@/utils/dominoConstants';

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
  const mesaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mesaRef.current) return;

    const mesaWidth = mesaRef.current.offsetWidth;
    const mesaHeight = mesaRef.current.offsetHeight;
    const nuevasFichasCalculadas: FichaRenderizable[] = [];

    fichasEnMesa.forEach((fichaLogic, index) => {
      let nx: number, ny: number;
      const nRot = fichaLogic.rotacion;
      const nEsDoble = fichaLogic.valorSuperior === fichaLogic.valorInferior;

      if (index > 0 && fichasEnMesa[index-1]?.id === '22' && fichaLogic.id === '23') { // Ejemplo para loguear f1=[2,2] -> f2=[2,3]
        console.log(`--- Debugging f1(${fichasEnMesa[index-1]?.id}) -> f2(${fichaLogic.id}) ---`);
      }

      // Debugging specific transitions - uncomment as needed
      if (index > 0 && fichasEnMesa[index-1]?.id === '66' && fichaLogic.id === '26') {
        console.log(`--- Debugging f1(${fichasEnMesa[index-1]?.id}) -> f2(${fichaLogic.id}) ---`);
      }

      // Dimensiones actuales de la nueva ficha según su rotación
      const nActualWidth = (nRot === 0) ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
      const nActualHeight = (nRot === 0) ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;

      if (index === 0) {
        nx = mesaWidth / 2;
        ny = mesaHeight / 2;
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

        if (index > 0 && fichasEnMesa[index-1]?.id === '66' && fichaLogic.id === '26') {
          console.log("Prev Tile (f1):", { id: ultimaFichaLogica.id, ux, uy, uRot, uGrid: ultimaFichaLogica.posicionCuadricula });
          console.log("DOMINO_WIDTH_PX:", DOMINO_WIDTH_PX, "DOMINO_HEIGHT_PX:", DOMINO_HEIGHT_PX);
          console.log("New Tile (f2):", { id: fichaLogic.id, nRot, nGrid: fichaLogic.posicionCuadricula });
        }
        const uActualWidth = (uRot === 0) ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
        const uActualHeight = (uRot === 0) ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;

        // Determine direction of growth based on posicionCuadricula
        // This is a simplification, the logic of page.tsx is more detailed for the path
        // Here only need the relative direction for the offset.
        // Note: This logic assumes strictly orthogonal movement (only changing row OR column, not both).

        if (fichaLogic.posicionCuadricula.columna > ultimaFichaLogica.posicionCuadricula.columna) { // Derecha
          if (index > 0 && fichasEnMesa[index-1]?.id === '66' && fichaLogic.id === '26') console.log("Direction: Derecha");
          nx = ux + uActualWidth / 2 + nActualWidth / 2;
          ny = uy;
        } else if (fichaLogic.posicionCuadricula.columna < ultimaFichaLogica.posicionCuadricula.columna) { // Izquierda
          if (index > 0 && fichasEnMesa[index-1]?.id === '66' && fichaLogic.id === '26') console.log("Direction: Izquierda");
          // Position the new tile's center to the left of the previous tile's center
          nx = ux - uActualWidth / 2 - nActualWidth / 2;
          ny = uy;
        } else if (fichaLogic.posicionCuadricula.fila > ultimaFichaLogica.posicionCuadricula.fila) { // Abajo
          if (index > 0 && fichasEnMesa[index-1]?.id === '22' && fichaLogic.id === '23') console.log("Direction: Abajo");
          nx = ux;
          ny = uy + uActualHeight / 2 + nActualHeight / 2;
        } else { // Arriba (o misma celda, lo que no debería pasar si la lógica de camino es correcta)
          if (index > 0 && fichasEnMesa[index-1]?.id === '22' && fichaLogic.id === '23') console.log("Direction: Arriba/Else");
          nx = ux;
          ny = uy - uActualHeight / 2 - nActualHeight / 2;
        }
        if (index > 0 && fichasEnMesa[index-1]?.id === '66' && fichaLogic.id === '26') {
          console.log("Prev Tile (f1) Actual Dims:", { uActualWidth, uActualHeight });
          console.log("New Tile (f2) Actual Dims:", { nActualWidth, nActualHeight });
          console.log("Calculated nx:", nx, "ny:", ny);
          const f1_right_edge = ux + uActualWidth / 2; // Right edge of f1
            const f2_left_edge = nx - nActualWidth / 2;
            console.log(`f1 right edge: ${f1_right_edge}, f2 left edge: ${f2_left_edge}. Overlap: ${f1_right_edge - f2_left_edge > 0 ? f1_right_edge - f2_left_edge : 0}`);
        }
      }
      nuevasFichasCalculadas.push({ ...fichaLogic, x: nx, y: ny });
    });

    setFichasCalculadas(nuevasFichasCalculadas);
  }, [fichasEnMesa]);

  return (
    <div ref={mesaRef} className="p-1 bg-green-700 shadow-lg rounded-md h-[calc(100vh-200px)] overflow-auto relative">
      {/* Opcional: Renderizar la cuadrícula de fondo si aún la quieres visualmente */}
      {/* {Array.from({ length: 11 * 11 }).map((_, i) => (
        <div key={i} className="bg-green-600 border border-green-800"></div>
      ))} */}

      {fichasCalculadas.map((ficha) => {
        const tileW = (ficha.rotacion === 0) ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
        const tileH = (ficha.rotacion === 0) ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;
        return (
          <div
            // This is the container for each FichaDomino on the table
            key={ficha.id}
            style={{
              position: 'absolute',
              left: `${ficha.x - tileW / 2}px`, // Ajustar de centro a top-left
              top: `${ficha.y - tileH / 2}px`,   // Ajustar de centro a top-left
              width: `${tileW}px`,
              height: `${tileH}px`,
              display: 'flex', // Added for centering
              justifyContent: 'center', // Added for centering
              alignItems: 'center', // Added for centering
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
              // seleccionada={false} // O manejar selección en mesa
            />
          </div>
        );
      })}
    </div>
  );
};


export default MesaDomino;
