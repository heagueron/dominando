// /home/heagueron/jmu/dominando/src/components/domino/MesaDomino.tsx
'use client';

import React, { useState, useEffect} from 'react';
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
  onMesaDimensionsChange?: (width: number, height: number, scale: number, translateX: number, translateY: number) => void; // Añadir translateX, translateY
  // Nuevas props para la animación
  fichaAnimandose?: { id: string; jugadorIdOrigen: string } | null;
  jugadoresInfo?: { id: string; ordenTurno?: number }[]; // Para determinar la posición visual del jugador origen
  miIdJugador?: string | null; // Para saber la posición relativa
}

const MesaDominoComponent: React.FC<MesaDominoProps & { forwardedRef: React.Ref<HTMLDivElement> }> = ({ fichasEnMesa, posicionAnclaFija, onFichaClick, onMesaDimensionsChange, forwardedRef, fichaAnimandose, jugadoresInfo, miIdJugador }) => {
  const [fichasCalculadas, setFichasCalculadas] = useState<FichaRenderizable[]>([]);
  const [canvasTransform, setCanvasTransform] = useState({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    // console.log(`[MESA] useEffect triggered. posicionAnclaFija: (${posicionAnclaFija.fila},${posicionAnclaFija.columna}), Fichas en mesa: ${fichasEnMesa.length}`);
    
    const nuevasFichasCalculadas: FichaRenderizable[] = [];
    const calculatedPositions: { [key: string]: FichaRenderizable } = {};

    const anchorPieceLogic = fichasEnMesa.find(
        f => f.posicionCuadricula.fila === posicionAnclaFija.fila && f.posicionCuadricula.columna === posicionAnclaFija.columna
    );

    if (anchorPieceLogic) {
        const anchorNx = DESIGN_TABLE_WIDTH_PX / 2;
        const anchorNy = DESIGN_TABLE_HEIGHT_PX / 2;
        const anchorCalculated: FichaRenderizable = { ...anchorPieceLogic, x: anchorNx, y: anchorNy };
        calculatedPositions[`${anchorPieceLogic.posicionCuadricula.fila},${anchorPieceLogic.posicionCuadricula.columna}`] = anchorCalculated;
        // console.log(`[MESA] ANCHOR calculated: ${anchorPieceLogic.id} at (${anchorPieceLogic.posicionCuadricula.fila},${anchorPieceLogic.posicionCuadricula.columna}) visual (${anchorNx.toFixed(2)},${anchorNy.toFixed(2)})`);
    } else if (fichasEnMesa.length > 0 && fichasEnMesa.length === 1) {
         const firstPieceLogic = fichasEnMesa[0];
         if (firstPieceLogic.posicionCuadricula.fila === posicionAnclaFija.fila && firstPieceLogic.posicionCuadricula.columna === posicionAnclaFija.columna) {
            const firstNx = DESIGN_TABLE_WIDTH_PX / 2;
            const firstNy = DESIGN_TABLE_HEIGHT_PX / 2;
            const firstCalculated: FichaRenderizable = { ...firstPieceLogic, x: firstNx, y: firstNy };
            calculatedPositions[`${firstPieceLogic.posicionCuadricula.fila},${firstPieceLogic.posicionCuadricula.columna}`] = firstCalculated;
            // console.log(`[MESA] Single piece (anchor) calculated at center: ${firstPieceLogic.id} at (${firstPieceLogic.posicionCuadricula.fila},${firstPieceLogic.posicionCuadricula.columna}) visual (${firstNx.toFixed(2)},${firstNy.toFixed(2)})`);
         } else {
            // console.warn(`[MESA] Anchor piece not found, and there are pieces on the table. This might lead to incorrect positioning.`);
         }
    } else if (fichasEnMesa.length === 0) {
        // No pieces, nothing to calculate
    } else {
        // console.warn(`[MESA] Anchor piece not found, and there are multiple pieces. Positioning may be incorrect.`);
    }

    let piecesToProcess = fichasEnMesa.filter(f =>
        !calculatedPositions[`${f.posicionCuadricula.fila},${f.posicionCuadricula.columna}`]
    );
    let safetyCounter = 0;

    while(piecesToProcess.length > 0 && safetyCounter < fichasEnMesa.length * 2) {
        safetyCounter++;
        const processedInThisIterationIds: string[] = [];

        piecesToProcess.forEach(fichaLogic => {
            const possiblePrevPositions = [
                { df: 0, dc: -1, dir: 'RightOfPrev' }, 
                { df: 0, dc: 1,  dir: 'LeftOfPrev'  }, 
                { df: -1, dc: 0, dir: 'BelowPrev'   }, 
                { df: 1, dc: 0,  dir: 'AbovePrev'   }, 
            ];

            let connectedToCalculatedPiece: FichaRenderizable | undefined;
            let ultimaFichaLogica: FichaParaLogica | undefined;
            let connectionDirection = '';


            for (const offset of possiblePrevPositions) {
                 const prevFila = fichaLogic.posicionCuadricula.fila + offset.df;
                 const prevCol = fichaLogic.posicionCuadricula.columna + offset.dc;
                 const prevPosKey = `${prevFila},${prevCol}`;
                 const calculatedPrev = calculatedPositions[prevPosKey];

                 if (calculatedPrev) {
                     connectedToCalculatedPiece = calculatedPrev;
                     ultimaFichaLogica = fichasEnMesa.find(f => f.posicionCuadricula.fila === prevFila && f.posicionCuadricula.columna === prevCol);
                     connectionDirection = offset.dir;
                     if (ultimaFichaLogica) break; 
                 }
            }

            if (connectedToCalculatedPiece && ultimaFichaLogica) {
                processedInThisIterationIds.push(fichaLogic.id);

                const ux = connectedToCalculatedPiece.x;
                const uy = connectedToCalculatedPiece.y;
                // const uRot = connectedToCalculatedPiece.rotacion; // No se usa uRot directamente aquí
                const uIsVertical = Math.abs(connectedToCalculatedPiece.rotacion % 180) === 0;
                const uActualWidth = uIsVertical ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
                const uActualHeight = uIsVertical ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;

                // const nRot = fichaLogic.rotacion; // No se usa nRot directamente aquí
                const nIsVertical = Math.abs(fichaLogic.rotacion % 180) === 0;
                const nActualWidth = nIsVertical ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
                const nActualHeight = nIsVertical ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;

                let nx: number = 0, ny: number = 0;

                switch (connectionDirection) {
                    case 'RightOfPrev': 
                        // console.log(`[MESA]     Calculating Right: ${fichaLogic.id} rel. to ${ultimaFichaLogica.id}`);
                        nx = ux + uActualWidth / 2 + nActualWidth / 2;
                        ny = uy;
                        break;
                    case 'LeftOfPrev': 
                         // console.log(`[MESA]     Calculating Left: ${fichaLogic.id} rel. to ${ultimaFichaLogica.id}`);
                         nx = ux - uActualWidth / 2 - nActualWidth / 2;
                         ny = uy;
                         break;
                    case 'BelowPrev': 
                         // console.log(`[MESA]     Calculating Down: ${fichaLogic.id} rel. to ${ultimaFichaLogica.id}`);
                         nx = ux;
                         ny = uy + uActualHeight / 2 + nActualHeight / 2;
                         if (!uIsVertical && nIsVertical) { 
                             if (ultimaFichaLogica.posicionCuadricula.fila === 7 && ultimaFichaLogica.posicionCuadricula.columna === 1 &&
                                 ! (ultimaFichaLogica.valorSuperior === ultimaFichaLogica.valorInferior) &&
                                 fichaLogic.posicionCuadricula.fila === 8 && fichaLogic.posicionCuadricula.columna === 1) {
                                 const desplazamiento = (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                                 nx = ux - desplazamiento;
                                 // console.log(`[MESA]       AJUSTE "L" ALIGN-LEFT (8,1)V from (7,1)H: nx adjusted to ${nx.toFixed(2)} (desplazado -${desplazamiento.toFixed(2)})`);
                             } else {
                                 nx = ux + uActualWidth / 2 - nActualWidth / 2;
                                 // console.log(`[MESA]       AJUSTE T (Down H->V): nx adjusted to ${nx.toFixed(2)}`);
                             }
                         } else if (uIsVertical && !nIsVertical) { 
                             nx = ux + (uActualWidth / 2) - (nActualWidth / 2); 
                             // console.log(`[MESA]       AJUSTE T-Inverted (Down V->H): nx adjusted to ${nx.toFixed(2)}`);
                             if (ultimaFichaLogica.posicionCuadricula.fila === 8 && ultimaFichaLogica.posicionCuadricula.columna === 1 &&
                                 fichaLogic.posicionCuadricula.fila === 9 && fichaLogic.posicionCuadricula.columna === 1) {
                                 const desplazamiento = (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                                 nx = ux + desplazamiento; 
                                 // console.log(`[MESA]       AJUSTE "L" ALIGN-LEFT (9,1)H from (8,1)V: nx adjusted to ${nx.toFixed(2)} (desplazado +${desplazamiento.toFixed(2)})`);
                             }
                         } else if (uIsVertical && nIsVertical) { 
                             // console.log(`[MESA]       Stacking Vertical (V->V). nx=${nx.toFixed(2)}`);
                         }
                         break;
                    case 'AbovePrev': 
                         // console.log(`[MESA]     Calculating Up: ${fichaLogic.id} rel. to ${ultimaFichaLogica.id}`);
                         nx = ux;
                         ny = uy - uActualHeight / 2 - nActualHeight / 2;
                         if (uIsVertical && !nIsVertical) { 
                            if (ultimaFichaLogica.posicionCuadricula.fila === 4 &&
                                ultimaFichaLogica.posicionCuadricula.columna === 1 && 
                                fichaLogic.posicionCuadricula.fila === 3 && 
                                fichaLogic.posicionCuadricula.columna === 1) {
                                const desplazamiento = (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                                nx = ux + desplazamiento; 
                                // console.log(`[MESA]       AJUSTE "L" ALIGN-LEFT (3,1)H from (4,1)V: nx adjusted to ${nx.toFixed(2)} (desplazado +${desplazamiento.toFixed(2)})`);
                            } else if (ultimaFichaLogica.posicionCuadricula.fila === 2 &&
                                       ultimaFichaLogica.posicionCuadricula.columna === 11 && 
                                       fichaLogic.posicionCuadricula.fila === 1 && 
                                       fichaLogic.posicionCuadricula.columna === 11) { 
                                const desplazamiento = (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                                nx = ux - desplazamiento; 
                                // console.log(`[MESA]       AJUSTE "L" ALIGN-RIGHT (1,11)H from (2,11)V: nx adjusted to ${nx.toFixed(2)} (desplazado -${desplazamiento.toFixed(2)})`);
                            } else {
                                // console.log(`[MESA]       Potencial Ajuste T (Up V->H) sin lógica específica: nx=${nx.toFixed(2)}`);
                            }
                         } else if (!uIsVertical && nIsVertical) { 
                            if (ultimaFichaLogica.posicionCuadricula.fila === 3 &&
                                ultimaFichaLogica.posicionCuadricula.columna === 11 && 
                                fichaLogic.posicionCuadricula.fila === 2 && 
                                fichaLogic.posicionCuadricula.columna === 11 &&
                                nIsVertical ) { 
                                const desplazamiento = (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                                nx = ux + desplazamiento; 
                                // console.log(`[MESA]       AJUSTE "L" ALIGN-RIGHT (2,11)V from (3,11)H: nx adjusted to ${nx.toFixed(2)} (desplazado +${desplazamiento.toFixed(2)})`);
                            } else {
                             nx = ux - uActualWidth / 2 + nActualWidth / 2; 
                             // console.log(`[MESA]       AJUSTE T (Up H->V): nx adjusted to ${nx.toFixed(2)}`);
                            }
                         } else if (uIsVertical && nIsVertical) { 
                             // console.log(`[MESA]       Stacking Vertical (Up V->V). nx=${nx.toFixed(2)}`);
                         }
                         break;
                }

                if (ultimaFichaLogica.posicionCuadricula.fila === 6 &&
                    ultimaFichaLogica.posicionCuadricula.columna === 11 &&
                    (Math.abs(ultimaFichaLogica.rotacion % 180) === 0) && // Es horizontal
                    fichaLogic.posicionCuadricula.fila === 7 &&
                    fichaLogic.posicionCuadricula.columna === 11 &&
                    (Math.abs(fichaLogic.rotacion % 180) === 90) // Es vertical
                ) {
                    const desplazamiento = DOMINO_HEIGHT_PX / 4; // Ajuste para el giro en L
                    nx = ux - desplazamiento;
                    // console.log(`[MESA]     AJUSTE "L" HORIZONTAL (7,11): ux=${ux.toFixed(2)}, nx original was ${ux.toFixed(2)}, displaced by -${desplazamiento.toFixed(2)}, new nx=${nx.toFixed(2)}`);
                }

                const fichaCalculated: FichaRenderizable = { ...fichaLogic, x: nx, y: ny };
                calculatedPositions[`${fichaLogic.posicionCuadricula.fila},${fichaLogic.posicionCuadricula.columna}`] = fichaCalculated;
                // console.log(`[MESA]   Piece ${fichaLogic.id} at (${fichaLogic.posicionCuadricula.fila},${fichaLogic.posicionCuadricula.columna}) calculated: nx=${nx.toFixed(2)}, ny=${ny.toFixed(2)}`);
            }
        });

        piecesToProcess = piecesToProcess.filter(f => !processedInThisIterationIds.includes(f.id));

        if (processedInThisIterationIds.length === 0 && piecesToProcess.length > 0) {
             console.error("[MESA] ERROR: Could not calculate positions for all pieces in this iteration. Chain might be broken or logic is missing.");
             console.log("Remaining pieces to process:", piecesToProcess.map(p => `${p.id} at (${p.posicionCuadricula.fila},${p.posicionCuadricula.columna})`));
             break; 
        }
    } 

    fichasEnMesa.forEach(originalFicha => {
        const key = `${originalFicha.posicionCuadricula.fila},${originalFicha.posicionCuadricula.columna}`;
        const calculatedFicha = calculatedPositions[key];
        if (calculatedFicha) {
            nuevasFichasCalculadas.push(calculatedFicha);
        } else {
            // console.warn(`[MESA] Did not find calculated position for ${originalFicha.id} at (${originalFicha.posicionCuadricula.fila},${originalFicha.posicionCuadricula.columna})`);
        }
    });

    setFichasCalculadas(nuevasFichasCalculadas);

    const updateTransform = () => {
      const currentMesaRef = (forwardedRef && typeof forwardedRef !== 'function') ? forwardedRef.current : null;
      if (currentMesaRef) {
        const mesaElement = currentMesaRef;
        const currentMesaWidth = mesaElement.offsetWidth;
        const currentMesaHeight = mesaElement.offsetHeight; 
        const currentScaleFactor = currentMesaWidth / DESIGN_TABLE_WIDTH_PX; 

        let translateX = 0;
        let translateY = 0;
        const fichaAnclaEnCalculadas = nuevasFichasCalculadas.find( 
            f => f.posicionCuadricula.fila === posicionAnclaFija.fila && f.posicionCuadricula.columna === posicionAnclaFija.columna
        );
        if (fichaAnclaEnCalculadas) {
            // console.log(`[MESA] Ficha Ancla found for centering: ${fichaAnclaEnCalculadas.id} in lienzo (x=${fichaAnclaEnCalculadas.x}, y=${fichaAnclaEnCalculadas.y})`);
            const viewportCenterX = mesaElement.offsetWidth / 2;
            const viewportCenterY = mesaElement.offsetHeight / 2;

            translateX = viewportCenterX - (fichaAnclaEnCalculadas.x * currentScaleFactor);
            translateY = viewportCenterY - (fichaAnclaEnCalculadas.y * currentScaleFactor);

            // const anchorVisualX = (fichaAnclaEnCalculadas.x * currentScaleFactor) + translateX;
            // const anchorVisualY = (fichaAnclaEnCalculadas.y * currentScaleFactor) + translateY;
            // console.log(`[MESA] DEBUG CENTRADO: ViewportCenter=(${viewportCenterX.toFixed(2)}, ${viewportCenterY.toFixed(2)}), AnchorVisualPos=(${anchorVisualX.toFixed(2)}, ${anchorVisualY.toFixed(2)})`);
            // console.log(`[MESA] DEBUG CENTRADO: DiffX=${(viewportCenterX - anchorVisualX).toFixed(2)}, DiffY=${(viewportCenterY - anchorVisualY).toFixed(2)}`);

        } else {
            // console.log(`[MESA] Ficha Ancla (${posicionAnclaFija.fila},${posicionAnclaFija.columna}) NOT found in nuevasFichasCalculadas. Using translateX/Y = 0.`);
        }

        setCanvasTransform({ x: translateX, y: translateY, scale: currentScaleFactor });
        // console.log(`[MESA] updateTransform: scale=${currentScaleFactor.toFixed(4)}, translateX=${translateX.toFixed(2)}, translateY=${translateY.toFixed(2)}`);
        if (onMesaDimensionsChange && mesaElement) {
          onMesaDimensionsChange(currentMesaWidth, currentMesaHeight, currentScaleFactor, translateX, translateY);
        }
      }
    };
    updateTransform();

    const resizeObserver = new ResizeObserver(updateTransform);
    const currentMesaElement = (forwardedRef && typeof forwardedRef !== 'function') ? forwardedRef.current : null;
    if (currentMesaElement) {
      resizeObserver.observe(currentMesaElement);
    }
    return () => {
      if (currentMesaElement) {
        resizeObserver.unobserve(currentMesaElement);
      }
    };
  }, [fichasEnMesa, posicionAnclaFija, onMesaDimensionsChange, forwardedRef]);

  /*console.log(`[MESA] Rendering. FichasCalculadas count: ${fichasCalculadas.length}`);
  if (fichasCalculadas.length > 0) {
    console.log(`[MESA] First fichaCalculada:`, fichasCalculadas[0]);
  }*/

  return (
    <div
      ref={forwardedRef} // Asignar la ref aquí
      className="bg-green-800 shadow-lg rounded-md relative"
      style={{
        //width: `min(85vw, ${DESIGN_TABLE_WIDTH_PX}px)`, 
        // La mesa intentará ocupar el 100% del alto de su contenedor padre (<main>),
        // y su ancho se ajustará según el aspect-ratio.
        // Si el ancho calculado excede el 100% del ancho del padre, se limitará.
        width: 'auto', // Permite que el aspect-ratio y height/maxHeight definan el ancho.
        height: '100%', // Intenta ocupar el 100% del alto del <main> (que es h-screen).
        aspectRatio: `${DESIGN_TABLE_WIDTH_PX} / ${DESIGN_TABLE_HEIGHT_PX}`,
        //maxHeight: 'calc(100vh - 20px)', 
        maxWidth: '100%', // No exceder el ancho del <main>.
        maxHeight: '100%', // No exceder el alto del <main> (aunque height: '100%' ya lo intenta).
        border: '16px ridge #996633',
        overflow: 'hidden', // Importante para que el canvas interno no desborde el contenedor estilizado
        borderRadius: '16px',
        //position: 'relative', 
      }}
    >
      <div 
        style={{
          width: `${DESIGN_TABLE_WIDTH_PX}px`, 
          height: `${DESIGN_TABLE_HEIGHT_PX}px`, 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`,
          transformOrigin: 'top left', // El origen de la transformación del canvas
        }}
      >
        {fichasCalculadas.map((ficha) => {
            const fichaOriginalWidth = (Math.abs(ficha.rotacion % 180) === 0) ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
            const fichaOriginalHeight = (Math.abs(ficha.rotacion % 180) === 0) ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;

            const esLaFichaAnimandose = fichaAnimandose && ficha.id === fichaAnimandose.id;
            // Definir un tipo para las propiedades de animación inicial
            type InitialAnimationProps = {
              x: number;
              y: number;
              opacity: number;
              scale: number;
            } | false;
            let initialAnimProps: InitialAnimationProps = false; // Por defecto, sin animación de entrada
            const targetLeft = ficha.x - fichaOriginalWidth / 2;
            const targetTop = ficha.y - fichaOriginalHeight / 2;

            if (esLaFichaAnimandose && jugadoresInfo && miIdJugador) {
              const jugadorOrigen = jugadoresInfo.find(j => j.id === fichaAnimandose.jugadorIdOrigen);
              const jugadorLocal = jugadoresInfo.find(j => j.id === miIdJugador);

              if (jugadorOrigen && jugadorLocal && typeof jugadorOrigen.ordenTurno === 'number' && typeof jugadorLocal.ordenTurno === 'number') {
                const numJugadores = jugadoresInfo.length;
                const diffTurno = (jugadorOrigen.ordenTurno - jugadorLocal.ordenTurno + numJugadores) % numJugadores;
                
                let startX = targetLeft; // Posición final por defecto
                let startY = targetTop;  // Posición final por defecto

                // Estimaciones de puntos de origen en el canvas de diseño (coordenadas del CENTRO de la ficha)
                if (numJugadores === 4) {
                  if (diffTurno === 1) { // Jugador a la derecha del local (animar desde la derecha del canvas)
                    startX = DESIGN_TABLE_WIDTH_PX + DOMINO_HEIGHT_PX / 2; // Un poco más allá del borde derecho
                    startY = DESIGN_TABLE_HEIGHT_PX / 2;
                  } else if (diffTurno === 2) { // Jugador de enfrente (animar desde arriba del canvas)
                    startX = DESIGN_TABLE_WIDTH_PX / 2; 
                    startY = -DOMINO_HEIGHT_PX / 2; // Un poco más allá del borde superior
                  } else if (diffTurno === 3) { // Jugador a la izquierda del local (animar desde la izquierda del canvas)
                    startX = -DOMINO_HEIGHT_PX / 2; // Un poco más allá del borde izquierdo
                    startY = DESIGN_TABLE_HEIGHT_PX / 2;
                  }
                } else if (numJugadores === 2) { // Lógica para 2 jugadores (enfrente)
                    if (diffTurno === 1) {
                        startX = DESIGN_TABLE_WIDTH_PX / 2; 
                        startY = -DOMINO_HEIGHT_PX / 2;
                    }
                }
                 if (diffTurno !== 0) { // Solo animar si no es el jugador local
                    // Convertir las coordenadas del centro de la ficha a top-left para el motion.div
                    initialAnimProps = { 
                        x: startX - fichaOriginalWidth / 2, 
                        y: startY - fichaOriginalHeight / 2, 
                        opacity: 0, 
                        scale: 0.7 
                    };
                 }
              }
            }

            return (
              <motion.div
                key={ficha.id}
                style={{
                  position: 'absolute',
                  // left y top se manejan por las props de animación x, y
                  width: `${fichaOriginalWidth}px`,
                  height: `${fichaOriginalHeight}px`,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                initial={initialAnimProps} // Si es false, no hay animación de entrada
                animate={{
                  x: targetLeft, 
                  y: targetTop,
                  opacity: 1,
                  scale: 1
                }}
                transition={esLaFichaAnimandose && initialAnimProps !== false ? { type: "spring", stiffness: 120, damping: 15, delay: 0.05 } : { duration: 0 }}
              >
                <FichaDomino
                  id={ficha.id}
                  valorSuperior={ficha.valorSuperior}
                  valorInferior={ficha.valorInferior}
                  rotacion={ficha.rotacion}
                  onClick={() => onFichaClick(ficha.id)}
                  sizeClass={`w-[${DOMINO_WIDTH_PX}px] h-[${DOMINO_HEIGHT_PX}px]`} // Usar las constantes directamente
                  arrastrable={false} // Las fichas en la mesa no son arrastrables por defecto
                  esEnMano={false}
                />
              </motion.div>
            );
          }
        )}
      </div>
    </div>
  );
}

const MesaDominoWithRef = React.forwardRef<HTMLDivElement, MesaDominoProps>((props, ref) => {
  return <MesaDominoComponent {...props} forwardedRef={ref} />;
});


export default React.memo(MesaDominoWithRef);
