'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import FichaDomino from './FichaDomino';
import { FichaDomino as TipoFichaDomino } from '@/utils/dominoUtils';
import { DOMINO_WIDTH_PX, DOMINO_HEIGHT_PX, DESIGN_TABLE_WIDTH_PX, DESIGN_TABLE_HEIGHT_PX } from '@/utils/dominoConstants';

interface FichaParaLogica extends TipoFichaDomino {
  posicionCuadricula: { fila: number; columna: number };
  rotacion: number;
}

interface FichaRenderizable extends FichaParaLogica {
  x: number; // centro x en el lienzo de diseño
  y: number; // centro y en el lienzo de diseño
}

interface MesaDominoProps {
  fichasEnMesa: FichaParaLogica[];
  posicionAnclaFija: { fila: number; columna: number }; // La celda lógica que debe permanecer centrada
  onFichaClick: (id: string) => void;
}

const MesaDomino: React.FC<MesaDominoProps> = ({ fichasEnMesa, posicionAnclaFija, onFichaClick }) => {
  const [fichasCalculadas, setFichasCalculadas] = useState<FichaRenderizable[]>([]);
  const [canvasTransform, setCanvasTransform] = useState({ x: 0, y: 0, scale: 1 });
  const mesaRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    console.log(`[MESA] useEffect triggered. posicionAnclaFija: (${posicionAnclaFija.fila},${posicionAnclaFija.columna}), Fichas en mesa: ${fichasEnMesa.length}`);
    const designWidth = DESIGN_TABLE_WIDTH_PX;
    const designHeight = DESIGN_TABLE_HEIGHT_PX;
    let currentScaleFactor = canvasTransform.scale; 
    const nuevasFichasCalculadas: FichaRenderizable[] = [];
    
    fichasEnMesa.forEach((fichaLogic, index) => {
      let nx: number, ny: number;
      const nRot = fichaLogic.rotacion;
      const nActualWidth = (nRot === 0) ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
      const nActualHeight = (nRot === 0) ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;

      console.log(`[MESA] Procesando ficha ${fichaLogic.id} (idx ${index}): cuad=(${fichaLogic.posicionCuadricula.fila},${fichaLogic.posicionCuadricula.columna}), rot=${nRot}`);

      if (index === 0) {
        // La primera ficha del array fichasEnMesa (que es un extremo de la cadena)
        // se coloca en el centro del lienzo de diseño como punto de partida para el cálculo.
        nx = designWidth / 2;
        ny = designHeight / 2;
        console.log(`[MESA]   Ficha ${fichaLogic.id} (idx 0): nx=${nx}, ny=${ny} (centro del lienzo)`);
      } else {
        // Las fichas subsiguientes se posicionan RELATIVO a la ficha ANTERIORMENTE CALCULADA Y AÑADIDA a nuevasFichasCalculadas.
        const ultimaFichaCalculada = nuevasFichasCalculadas[index - 1]; 
        // Y la dirección se determina por la diferencia de posicionCuadricula con la ficha lógica anterior en el array de page.tsx
        const ultimaFichaLogica = fichasEnMesa[index - 1]; 

        const ux = ultimaFichaCalculada.x; // x de la ficha anterior en el lienzo
        const uy = ultimaFichaCalculada.y; // y de la ficha anterior en el lienzo
        const uRot = ultimaFichaCalculada.rotacion; // rotación de la ficha anterior en el lienzo

        const uActualWidth = (uRot === 0) ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
        const uActualHeight = (uRot === 0) ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;

        console.log(`[MESA]   Ficha ${fichaLogic.id} (idx ${index}): conectando a ${ultimaFichaCalculada.id} (ux=${ux}, uy=${uy}, uRot=${uRot})`);
        console.log(`[MESA]     fichaLogic.pc=(${fichaLogic.posicionCuadricula.fila},${fichaLogic.posicionCuadricula.columna}), ultimaFichaLogica.pc=(${ultimaFichaLogica.posicionCuadricula.fila},${ultimaFichaLogica.posicionCuadricula.columna})`);

        if (fichaLogic.posicionCuadricula.columna > ultimaFichaLogica.posicionCuadricula.columna) { // Derecha
          console.log(`[MESA]     Calculando Derecha: ux=${ux}, uActualWidth=${uActualWidth}, nActualWidth=${nActualWidth}`);
          nx = ux + uActualWidth / 2 + nActualWidth / 2;
          ny = uy;
          console.log(`[MESA]     Dirección: Derecha. nx=${nx}, ny=${ny}`);
        } else if (fichaLogic.posicionCuadricula.columna < ultimaFichaLogica.posicionCuadricula.columna) { // Izquierda
          console.log(`[MESA]     Calculando Izquierda: ux=${ux}, uActualWidth=${uActualWidth}, nActualWidth=${nActualWidth}`);
          nx = ux - uActualWidth / 2 - nActualWidth / 2;
          ny = uy;
          console.log(`[MESA]     Dirección: Izquierda. nx=${nx}, ny=${ny}`);
        } else if (fichaLogic.posicionCuadricula.fila > ultimaFichaLogica.posicionCuadricula.fila) { // Abajo
          nx = ux; 
          ny = uy + uActualHeight / 2 + nActualHeight / 2;
          console.log(`[MESA]     Dirección: Abajo. nxBase=${nx}, nyBase=${ny}`);
          // AJUSTE ESPECÍFICO para "T": Si la anterior (u) era horizontal y la nueva (n) es vertical
          if (uRot === 90 && nRot === 0) { 
            nx = ux + (uActualWidth / 2) - (nActualWidth / 2); // Alinear borde derecho de n con borde derecho de u
            console.log(`[MESA]       Ajuste T (Abajo H->V): nx ajustado a ${nx}`);
          }
        } else { // Arriba (fichaLogic.posicionCuadricula.fila < ultimaFichaLogica.posicionCuadricula.fila)
          nx = ux; 
          ny = uy - uActualHeight / 2 - nActualHeight / 2;
          console.log(`[MESA]     Dirección: Arriba. nxBase=${nx}, nyBase=${ny}`);
          // AJUSTE ESPECÍFICO para "T": Si la anterior (u) era horizontal y la nueva (n) es vertical
          if (uRot === 90 && nRot === 0) { 
            nx = ux - (uActualWidth / 2) + (nActualWidth / 2); // Alinear borde izquierdo de n con borde izquierdo de u
            console.log(`[MESA]       Ajuste T (Arriba H->V): nx ajustado a ${nx}`);
          }
        }
      }
      console.log(`[MESA]   Ficha ${fichaLogic.id}: nxFinal=${nx}, nyFinal=${ny}`);

      nuevasFichasCalculadas.push({ ...fichaLogic, x: nx, y: ny });
    });
    setFichasCalculadas(nuevasFichasCalculadas);

    // Después de calcular las posiciones de todas las fichas en el lienzo
    // (donde la primera ficha del array está en el centro del lienzo),
    // calculamos la traslación necesaria para que la `posicionAnclaFija`
    // aparezca en el centro del viewport.
    const updateTransform = () => {
      if (mesaRef.current) {
        const currentMesaWidth = mesaRef.current.offsetWidth;
        currentScaleFactor = currentMesaWidth / designWidth;
        
        let translateX = 0;
        let translateY = 0;

        if (nuevasFichasCalculadas.length > 0) {
          const fichaAnclaEnCalculadas = nuevasFichasCalculadas.find(
            f => f.posicionCuadricula.fila === posicionAnclaFija.fila && f.posicionCuadricula.columna === posicionAnclaFija.columna
          );

          if (fichaAnclaEnCalculadas) {
            console.log(`[MESA] Ficha Ancla encontrada: ${fichaAnclaEnCalculadas.id} en lienzo (x=${fichaAnclaEnCalculadas.x}, y=${fichaAnclaEnCalculadas.y})`);
            // Queremos que el punto (fichaAnclaEnCalculadas.x, fichaAnclaEnCalculadas.y) del lienzo
            // se mueva al centro del viewport (designWidth / 2, designHeight / 2).
            translateX = (designWidth / 2) - fichaAnclaEnCalculadas.x;
            translateY = (designHeight / 2) - fichaAnclaEnCalculadas.y;
          } else {
            // Esto podría pasar si la ficha ancla aún no está en `fichasEnMesa` o si hay un error.
            // O si `fichasEnMesa` está vacío.
            console.log(`[MESA] Ficha Ancla (${posicionAnclaFija.fila},${posicionAnclaFija.columna}) NO encontrada en nuevasFichasCalculadas. Usando translateX/Y = 0.`);
          }
        }
        
        setCanvasTransform({ x: translateX, y: translateY, scale: currentScaleFactor });
        console.log(`[MESA] updateTransform: scale=${currentScaleFactor}, translateX=${translateX}, translateY=${translateY}`);
      }
    };
    updateTransform();

    const resizeObserver = new ResizeObserver(updateTransform);
    if (mesaRef.current) {
      resizeObserver.observe(mesaRef.current);
    }
    return () => {
      if (mesaRef.current) {
        resizeObserver.unobserve(mesaRef.current);
      }
    };
  }, [fichasEnMesa, posicionAnclaFija, canvasTransform.scale, DESIGN_TABLE_HEIGHT_PX, DESIGN_TABLE_WIDTH_PX]);

  return (
    <div
      ref={mesaRef}
      className="bg-green-700 shadow-lg rounded-md relative"
      style={{
        width: 'min(calc(100vh - 220px), 90vw)',
        aspectRatio: '1 / 1',
        border: '8px solid #7e4a35',
        overflow: 'hidden', // Muy importante
      }}
    >
      {/* Líneas guía para el centro visual de la mesa */}
      <div style={{
        position: 'absolute',
        top: '0',
        bottom: '0',
        left: '50%',
        width: '1px',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        transform: 'translateX(-50%)',
        zIndex: 1, // Para que esté encima del lienzo pero debajo de las fichas si es necesario
      }} />
      <div style={{
        position: 'absolute',
        left: '0',
        right: '0',
        top: '50%',
        height: '1px',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        transform: 'translateY(-50%)',
        zIndex: 1,
      }} />
      <div // Este es el lienzo de diseño de tamaño fijo que se escalará y trasladará
        style={{
          width: `${DESIGN_TABLE_WIDTH_PX}px`,
          height: `${DESIGN_TABLE_HEIGHT_PX}px`,
          position: 'relative',
          transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`,
          // Para que la traslación funcione como se espera (mover el (0,0) del lienzo),
          transformOrigin: 'top left', 
        }}
      >
        {fichasCalculadas.map((ficha) => {
          const fichaOriginalWidth = (ficha.rotacion === 0) ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
          const fichaOriginalHeight = (ficha.rotacion === 0) ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;
          return (
            <div
              key={ficha.id}
              style={{
                position: 'absolute',
                left: `${ficha.x - fichaOriginalWidth / 2}px`, // ficha.x es el centro
                top: `${ficha.y - fichaOriginalHeight / 2}px`,  // ficha.y es el centro
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
