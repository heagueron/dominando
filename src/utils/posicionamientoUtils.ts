// /home/heagueron/projects/dominando/src/utils/posicionamientoUtils.ts
import { FichaDomino, FichaEnMesaParaLogica } from './dominoUtils';

// /home/heagueron/jmu/dominando/src/utils/posicionamientoUtils.ts
import {
  DESIGN_TABLE_WIDTH_PX,
  DESIGN_TABLE_HEIGHT_PX,
  DOMINO_WIDTH_PX,
  DOMINO_HEIGHT_PX
} from '@/utils/dominoConstants';


// Constantes de posicionamiento
export const FILA_ANCLA_INICIAL = 5;
export const COLUMNA_BORDE_IZQUIERDO = 1;
export const COLUMNA_ANCLA_INICIAL = 6;

// --- Función Auxiliar para Calcular Rotación de Fichas Horizontales No Dobles ---
export const calcularRotacionHorizontalNoDoble = (
  ficha: FichaDomino,
  extremoElegido: 'izquierda' | 'derecha',
  valorConexionEnFicha: number // El valor en `ficha` que hace match con el extremo
): number => {
  // Si jugamos en el extremo DERECHO de la cadena, el lado IZQUIERDO de la nueva ficha debe conectar.
  // Visualmente: [LadoConecta][OtroLado]
  if (extremoElegido === 'derecha') {
    if (valorConexionEnFicha === ficha.valorSuperior) {
      // Queremos que S (valorSuperior) quede a la IZQUIERDA. Rotación: -90 ([S][I])
      return -90;
    } else { // valorConexionEnFicha === ficha.valorInferior
      // Queremos que I (valorInferior) quede a la IZQUIERDA. Rotación: 90 ([I][S])
      return 90;
    }
  }
  // Si jugamos en el extremo IZQUIERDO de la cadena, el lado DERECHO de la nueva ficha debe conectar.
  // Visualmente: [OtroLado][LadoConecta]
  else { // extremoElegido === 'izquierda'
    if (valorConexionEnFicha === ficha.valorSuperior) {
      // Queremos que S (valorSuperior) quede a la DERECHA. Rotación: 90 ([I][S])
      return 90;
    } else { // valorConexionEnFicha === ficha.valorInferior
      // Queremos que I (valorInferior) quede a la DERECHA. Rotación: -90 ([S][I])
      return -90;
    }
  }
};
// --- Fin Función Auxiliar ---

export const calcularPosicionRotacionSiguienteFicha = (
    fichaParaJugar: FichaDomino,
    posicionFichaConexion: { fila: number; columna: number },
    rotacionFichaConexion: number,
    extremoElegido: 'izquierda' | 'derecha',
    esDobleNuevaFicha: boolean,
    valorConexionDeNuevaFicha: number
  ): { nuevaPosicion: { fila: number; columna: number }; rotacionCalculada: number } => {
    let rotacionCalculada: number = 0;
    let nuevaPosicion: { fila: number; columna: number } = { fila: -1, columna: -1 };
    
    // Usamos alias para claridad, correspondiendo a las variables originales en page.tsx
    const uPos = posicionFichaConexion;
    const uRot = rotacionFichaConexion;
    const esDoble = esDobleNuevaFicha; // esDoble se refiere a la fichaParaJugar
  
    console.log(`[POS_UTIL] Conectando a: uPos=(${uPos.fila},${uPos.columna}), uRot=${uRot}. Ficha nueva ${esDoble ? 'DOBLE' : 'NO DOBLE'}`);
  
    let haSidoProcesadoPorLogicaDeGiroEspecial = false;
  
    // --- LÓGICA DE GIROS ESPECIALES ---
    const condFila6 = uPos.fila === 6;
    const condCol11_giroFila7 = uPos.columna === 11;
    const condExtremoDer = extremoElegido === 'derecha';
    const condRotVertical = (uRot === 0 || uRot === 180);
    
    const combinedCondInicioFila7 = condFila6 && condCol11_giroFila7 && condExtremoDer && condRotVertical;
  
    if (combinedCondInicioFila7) {
      console.log(`[POS_UTIL] DETECTADO: Inicio fila 7 desde (6,11). uRot=${uRot}, fichaParaJugar=${fichaParaJugar.valorSuperior}/${fichaParaJugar.valorInferior}, esDoble=${esDoble}`);
      nuevaPosicion = { fila: uPos.fila + 1, columna: uPos.columna }; // Celda (7,11)
      if (esDoble) {
        rotacionCalculada = 90;
      } else {
        rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? 90 : -90;
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'derecha' && uPos.fila === 7 && uPos.columna > 1) {
      nuevaPosicion = { fila: 7, columna: uPos.columna - 1 };
      if (esDoble) {
        rotacionCalculada = 0;
      } else {
        rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? 90 : -90;
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'derecha' && uPos.fila === 7 && uPos.columna === 1) {
      nuevaPosicion = { fila: 8, columna: 1 };
      if (esDoble) {
        rotacionCalculada = 0;
      } else {
        rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? 0 : 180;
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'derecha' && uPos.fila === 8 && uPos.columna === 1) {
      nuevaPosicion = { fila: 9, columna: 1 };
      if (esDoble) {
        rotacionCalculada = 90;
      } else {
        rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? -90 : 90;
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'derecha' && uPos.fila === 9 && uPos.columna < 11) {
      nuevaPosicion = { fila: 9, columna: uPos.columna + 1 };
      if (esDoble) {
        rotacionCalculada = 0;
      } else {
        rotacionCalculada = calcularRotacionHorizontalNoDoble(fichaParaJugar, 'derecha', valorConexionDeNuevaFicha);
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (uPos.fila === FILA_ANCLA_INICIAL && uPos.columna === 11 && extremoElegido === 'derecha') {
      nuevaPosicion = { fila: uPos.fila + 1, columna: uPos.columna };
      rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? 0 : 180;
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'izquierda' && uPos.fila === FILA_ANCLA_INICIAL && uPos.columna > COLUMNA_BORDE_IZQUIERDO) {
      nuevaPosicion = { fila: FILA_ANCLA_INICIAL, columna: uPos.columna - 1 };
      if (esDoble) {
        rotacionCalculada = 0;
      } else {
        rotacionCalculada = calcularRotacionHorizontalNoDoble(fichaParaJugar, 'izquierda', valorConexionDeNuevaFicha);
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'izquierda' && uPos.fila === 4 && uPos.columna === 1) {
      nuevaPosicion = { fila: 3, columna: 1 };
      if (esDoble) {
        rotacionCalculada = 90;
      } else {
        rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? -90 : 90;
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'izquierda' && uPos.fila === 3 && uPos.columna < 11) {
      nuevaPosicion = { fila: 3, columna: uPos.columna + 1 };
      if (esDoble) {
        rotacionCalculada = 0;
      } else {
        rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? -90 : 90;
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'izquierda' && uPos.fila === 3 && uPos.columna === 11) {
      nuevaPosicion = { fila: 2, columna: 11 };
      if (esDoble) {
        rotacionCalculada = 0;
      } else {
        rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? 180 : 0;
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'izquierda' && uPos.fila === 2 && uPos.columna === 11) {
      nuevaPosicion = { fila: 1, columna: 11 };
      if (esDoble) {
        rotacionCalculada = 90;
      } else {
        rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? 90 : -90;
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (uPos.fila === FILA_ANCLA_INICIAL && extremoElegido === 'izquierda' && uPos.columna === 1) {
      nuevaPosicion = { fila: uPos.fila - 1, columna: uPos.columna };
      rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorInferior) ? 0 : 180;
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
  
    // LÓGICA DE CAMINO Y ROTACIÓN GENERAL (si no hubo giro especial)
    if (!haSidoProcesadoPorLogicaDeGiroEspecial) {
      console.log(`[POS_UTIL] NO GIRO ESPECIAL: Entrando a lógica general.`);
      if (extremoElegido === 'derecha') {
        nuevaPosicion = { fila: uPos.fila, columna: uPos.columna + (uRot === 0 || uRot === 180 || esDoble ? 1 : 1) }; // Simplificado, revisar si esDoble necesita ajuste de fila
        if (esDoble && !(uRot === 90 || uRot === -90)) nuevaPosicion.fila = uPos.fila + 1; // Ajuste para dobles verticales
      } else { // extremoElegido === 'izquierda'
        nuevaPosicion = { fila: uPos.fila, columna: uPos.columna - (uRot === 0 || uRot === 180 || esDoble ? 1 : 1) }; // Simplificado
        if (esDoble && !(uRot === 90 || uRot === -90)) nuevaPosicion.fila = uPos.fila - 1; // Ajuste para dobles verticales
      }
  
      if (esDoble) {
        rotacionCalculada = 0;
      } else {
        // Giro en T o continuación horizontal
        if (((uRot === 90 || uRot === -90) && nuevaPosicion.fila !== uPos.fila) || // H -> V (T-shape)
            ((uRot === 0 || uRot === 180) && nuevaPosicion.fila !== uPos.fila)) {  // V -> V (no doble)
          rotacionCalculada = 0; // Ficha se pone vertical
        } else { // Colocación Horizontal
          rotacionCalculada = calcularRotacionHorizontalNoDoble(
            fichaParaJugar,
            extremoElegido,
            valorConexionDeNuevaFicha
          );
        }
      }
    }
    console.log(`[POS_UTIL] FINAL: nuevaPos=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotCalc=${rotacionCalculada}`);
    return { nuevaPosicion, rotacionCalculada };
  };

  export const configurarPrimeraFicha = (
    fichaParaJugar: FichaDomino,
    esDoble: boolean
  ): {
    nuevaFichaAncla: FichaEnMesaParaLogica; // La ficha que se convierte en ancla
    nuevosExtremos: { izquierda: number; derecha: number }; // Los valores numéricos de los extremos
    nuevaInfoExtremos: { // Tipo corregido para incluir valorExtremo
      izquierda: { pos: { fila: number; columna: number }; rot: number; valorExtremo: number };
      derecha: { pos: { fila: number; columna: number }; rot: number; valorExtremo: number };
    };
  } => {
    const nuevaPosicion = { fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL };
    const rotacionCalculada = esDoble ? 0 : -90;
  
    const nuevaFichaAncla: FichaEnMesaParaLogica = {
      ...fichaParaJugar,
      posicionCuadricula: nuevaPosicion,
      rotacion: rotacionCalculada,
    };
  
    const nuevosExtremos = esDoble
      ? { izquierda: nuevaFichaAncla.valorSuperior, derecha: nuevaFichaAncla.valorSuperior }
      : { izquierda: nuevaFichaAncla.valorSuperior, derecha: nuevaFichaAncla.valorInferior };
  
    const nuevaInfoExtremos = { // Objeto construido correctamente con valorExtremo
      izquierda: { pos: nuevaPosicion, rot: rotacionCalculada, valorExtremo: nuevosExtremos.izquierda },
      derecha: { pos: nuevaPosicion, rot: rotacionCalculada, valorExtremo: nuevosExtremos.derecha },
    };
    
    console.log(`[POS_UTIL] PRIMERA FICHA (Ancla Definida: ${FILA_ANCLA_INICIAL},${COLUMNA_ANCLA_INICIAL}): nuevaPosicion=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotacionCalculada=${rotacionCalculada}`);
  
    return { nuevaFichaAncla, nuevosExtremos, nuevaInfoExtremos };
  };

/**
 * Calcula las coordenadas (x, y) en el lienzo de diseño para una ficha dada su posición en la cuadrícula lógica,
 * el estado actual de la ficha ancla y las cadenas de fichas a izquierda y derecha.
 * Esta función es crucial para traducir la lógica de la cuadrícula a posiciones visuales.
 * @param targetFichaPos La posición en la cuadrícula de la ficha para la cual se calculan las coordenadas.
 * @param currentAnclaFicha La ficha ancla actual en la mesa, o null si no hay.
 * @param currentFichasIzquierda Array de fichas a la izquierda del ancla.
 * @param currentFichasDerecha Array de fichas a la derecha del ancla.
 * @returns Un objeto {x, y} con las coordenadas en el lienzo de diseño, o null si no se pueden calcular.
 */
export const getDesignCanvasCoordinates = (
  targetFichaPos: { fila: number; columna: number },
  currentAnclaFicha: FichaEnMesaParaLogica | null,
  currentFichasIzquierda: FichaEnMesaParaLogica[],
  currentFichasDerecha: FichaEnMesaParaLogica[]
): { x: number; y: number } | null => {
  const todasLasFichasEnMesaParaCalculo = [
    ...currentFichasIzquierda.slice().reverse(),
    ...(currentAnclaFicha ? [currentAnclaFicha] : []),
    ...currentFichasDerecha,
  ];

  if (todasLasFichasEnMesaParaCalculo.length === 0) {
    const anclaInicialPos = currentAnclaFicha?.posicionCuadricula || { fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL };
    if (targetFichaPos.fila === anclaInicialPos.fila && targetFichaPos.columna === anclaInicialPos.columna) {
      return { x: DESIGN_TABLE_WIDTH_PX / 2, y: DESIGN_TABLE_HEIGHT_PX / 2 };
    }
    return null;
  }

  const calculatedPositions: { [key: string]: { x: number; y: number; fichaLogic: FichaEnMesaParaLogica; } } = {};
  const anclaLogicaParaCalculo = currentAnclaFicha || (todasLasFichasEnMesaParaCalculo.length === 1 ? todasLasFichasEnMesaParaCalculo[0] : null);

  if (anclaLogicaParaCalculo) {
    calculatedPositions[`${anclaLogicaParaCalculo.posicionCuadricula.fila},${anclaLogicaParaCalculo.posicionCuadricula.columna}`] = {
      x: DESIGN_TABLE_WIDTH_PX / 2,
      y: DESIGN_TABLE_HEIGHT_PX / 2,
      fichaLogic: anclaLogicaParaCalculo,
    };
  } else {
    return null;
  }
  
  let piecesToProcess = todasLasFichasEnMesaParaCalculo.filter(f =>
      !calculatedPositions[`${f.posicionCuadricula.fila},${f.posicionCuadricula.columna}`]
  );
  let iterations = 0;
  const maxIterations = todasLasFichasEnMesaParaCalculo.length * 2;

  while (piecesToProcess.length > 0 && iterations < maxIterations) {
      iterations++;
      const processedInThisIterationIds: string[] = [];

      piecesToProcess.forEach(fichaLogic => {
          const possiblePrevPositions = [
              { df: 0, dc: -1, dir: 'RightOfPrev' }, { df: 0, dc: 1,  dir: 'LeftOfPrev'  },
              { df: -1, dc: 0, dir: 'BelowPrev'   }, { df: 1, dc: 0,  dir: 'AbovePrev'   },
          ];

          let connectedToCalculated: { x: number; y: number; fichaLogic: FichaEnMesaParaLogica } | undefined;
          let connectionDirection = '';

          for (const offset of possiblePrevPositions) {
              const prevFila = fichaLogic.posicionCuadricula.fila + offset.df;
              const prevCol = fichaLogic.posicionCuadricula.columna + offset.dc;
              const prevPosKey = `${prevFila},${prevCol}`;
              const calculatedPrev = calculatedPositions[prevPosKey];

              if (calculatedPrev) {
                  connectedToCalculated = calculatedPrev;
                  connectionDirection = offset.dir;
                  break;
              }
          }

          if (connectedToCalculated) {
              const ux = connectedToCalculated.x;
              const uy = connectedToCalculated.y;
              const uIsVertical = Math.abs(connectedToCalculated.fichaLogic.rotacion % 180) === 0;
              const uActualWidth = uIsVertical ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
              const uActualHeight = uIsVertical ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;

              const nIsVertical = Math.abs(fichaLogic.rotacion % 180) === 0;
              const nActualWidth = nIsVertical ? DOMINO_WIDTH_PX : DOMINO_HEIGHT_PX;
              const nActualHeight = nIsVertical ? DOMINO_HEIGHT_PX : DOMINO_WIDTH_PX;

              let nx = 0, ny = 0;

              switch (connectionDirection) {
                  case 'RightOfPrev':
                      nx = ux + uActualWidth / 2 + nActualWidth / 2;
                      ny = uy;
                      break;
                  case 'LeftOfPrev':
                      nx = ux - uActualWidth / 2 - nActualWidth / 2;
                      ny = uy;
                      break;
                  case 'BelowPrev':
                      nx = ux;
                      ny = uy + uActualHeight / 2 + nActualHeight / 2;
                      if (!uIsVertical && nIsVertical) { 
                          if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 7 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 1 && !(connectedToCalculated.fichaLogic.valorSuperior === connectedToCalculated.fichaLogic.valorInferior) && fichaLogic.posicionCuadricula.fila === 8 && fichaLogic.posicionCuadricula.columna === 1) {
                              nx = ux - (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                          } else {
                              nx = ux + uActualWidth / 2 - nActualWidth / 2;
                          }
                      } else if (uIsVertical && !nIsVertical) {
                          nx = ux + uActualWidth / 2 - nActualWidth / 2;
                           if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 8 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 1 && fichaLogic.posicionCuadricula.fila === 9 && fichaLogic.posicionCuadricula.columna === 1) {
                              nx = ux + (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                          }
                      }
                      break;
                  case 'AbovePrev':
                      nx = ux;
                      ny = uy - uActualHeight / 2 - nActualHeight / 2;
                      if (uIsVertical && !nIsVertical) { 
                          if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 4 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 1 && fichaLogic.posicionCuadricula.fila === 3 && fichaLogic.posicionCuadricula.columna === 1) {
                              nx = ux + (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                          } else if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 2 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 11 && fichaLogic.posicionCuadricula.fila === 1 && fichaLogic.posicionCuadricula.columna === 11) {
                              nx = ux - (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                          }
                      } else if (!uIsVertical && nIsVertical) { 
                          if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 3 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 11 && fichaLogic.posicionCuadricula.fila === 2 && fichaLogic.posicionCuadricula.columna === 11) {
                              nx = ux + (DOMINO_HEIGHT_PX - DOMINO_WIDTH_PX) / 2;
                          } else {
                              nx = ux - uActualWidth / 2 + nActualWidth / 2;
                          }
                      }
                      break;
              }
              if (connectedToCalculated.fichaLogic.posicionCuadricula.fila === 6 && connectedToCalculated.fichaLogic.posicionCuadricula.columna === 11 && !uIsVertical &&
                  fichaLogic.posicionCuadricula.fila === 7 && fichaLogic.posicionCuadricula.columna === 11 && nIsVertical) {
                  nx = ux - DOMINO_HEIGHT_PX / 4;
              }

              calculatedPositions[`${fichaLogic.posicionCuadricula.fila},${fichaLogic.posicionCuadricula.columna}`] = { x: nx, y: ny, fichaLogic };
              processedInThisIterationIds.push(fichaLogic.id);
          }
      });
      piecesToProcess = piecesToProcess.filter(f => !processedInThisIterationIds.includes(f.id));
      if(processedInThisIterationIds.length === 0 && piecesToProcess.length > 0) break;
  }

  const targetKey = `${targetFichaPos.fila},${targetFichaPos.columna}`;
  if (calculatedPositions[targetKey]) {
    return { x: calculatedPositions[targetKey].x, y: calculatedPositions[targetKey].y };
  }
  return null;
};
