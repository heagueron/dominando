// /home/heagueron/projects/dominando/src/app/juego/page.tsx
'use client';

import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import MesaDomino from '@/components/domino/MesaDomino';
import ManoJugadorComponent from '@/components/domino/ManoJugador';
import {
 FichaDomino,
 generarYRepartirFichas,
 ManoDeJugador as TipoManoDeJugador,
} from '@/utils/dominoUtils';
import { DESIGN_TABLE_WIDTH_PX, DESIGN_TABLE_HEIGHT_PX } from '@/utils/dominoConstants';

interface FichaEnMesaParaLogica extends FichaDomino {
  posicionCuadricula: { fila: number; columna: number };
  rotacion: number;
}

interface FichaSeleccionadaInfo {
  idFicha: string;
  idJugadorMano: string;
}

const FILA_ANCLA_INICIAL = 5;
const COLUMNA_ANCLA_INICIAL = 6; // Ajuste para la nueva celda ancla (5,6)

// --- Función Auxiliar para Calcular Rotación de Fichas Horizontales No Dobles ---
const calcularRotacionHorizontalNoDoble = (
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

export default function JuegoPage() {
  const [manosJugadores, setManosJugadores] = useState<TipoManoDeJugador[]>([]);
  const [fichasSobrantes, setFichasSobrantes] = useState<FichaDomino[]>([]);
  
  const [anclaFicha, setAnclaFicha] = useState<FichaEnMesaParaLogica | null>(null);
  const [fichasIzquierda, setFichasIzquierda] = useState<FichaEnMesaParaLogica[]>([]);
  const [fichasDerecha, setFichasDerecha] = useState<FichaEnMesaParaLogica[]>([]);
  const [fichaSeleccionada, setFichaSeleccionada] = useState<FichaSeleccionadaInfo | undefined>();

  const [extremos, setExtremos] = useState<{ izquierda: number | null, derecha: number | null }>({
    izquierda: null,
    derecha: null,
  });

  const [infoExtremos, setInfoExtremos] = useState<{
    izquierda: { pos: { fila: number, columna: number }, rot: number } | null,
    derecha: { pos: { fila: number, columna: number }, rot: number } | null,
  }>({ izquierda: null, derecha: null });

  useEffect(() => {
    const { manos, sobrantes } = generarYRepartirFichas(4, 7);
    setManosJugadores(manos);
    console.log("[PAGE] Manos generadas:", manos);
    setFichasSobrantes(sobrantes);
  }, []);

  const handleFichaClick = (idFicha: string, idJugadorMano: string) => {
    if (fichaSeleccionada && fichaSeleccionada.idFicha === idFicha && fichaSeleccionada.idJugadorMano === idJugadorMano) {
      setFichaSeleccionada(undefined); // Deseleccionar si se hace clic en la misma ficha
    } else {
      setFichaSeleccionada({ idFicha, idJugadorMano });
    }
  };

  const determinarJugada = (
    ficha: FichaDomino,
    valorExtremo: number
  ): { puedeJugar: boolean; valorConexion?: number; valorNuevoExtremo?: number } => {
    if (ficha.valorSuperior === valorExtremo) {
      return { puedeJugar: true, valorConexion: ficha.valorSuperior, valorNuevoExtremo: ficha.valorInferior };
    }
    if (ficha.valorInferior === valorExtremo) {
      return { puedeJugar: true, valorConexion: ficha.valorInferior, valorNuevoExtremo: ficha.valorSuperior };
    }
    return { puedeJugar: false };
  };

  const handleJugarFicha = (extremoElegido: 'izquierda' | 'derecha') => {
    console.log("¡¡¡ HANDLE JUGAR FICHA INVOCADO !!!"); 
    if (!fichaSeleccionada) return;

    const manoDelJugador = manosJugadores.find(m => m.idJugador === fichaSeleccionada.idJugadorMano);
    if (!manoDelJugador) {
      console.error(`[PAGE] No se encontró la mano del jugador ${fichaSeleccionada.idJugadorMano}`);
      return;
    }
    const fichaParaJugar = manoDelJugador.fichas.find(f => f.id === fichaSeleccionada.idFicha);

    if (!fichaParaJugar) return;

    console.log(`[PAGE] ===== INICIO HANDLE JUGAR FICHA (${fichaParaJugar.id} de mano ${fichaSeleccionada.idJugadorMano}) EN EXTREMO: ${extremoElegido} =====`);

    const esDoble = fichaParaJugar.valorSuperior === fichaParaJugar.valorInferior;
    let rotacionCalculada: number = 0; 
    let nuevaPosicion: { fila: number; columna: number } = { fila: -1, columna: -1 }; 

    if (!anclaFicha) { 
      nuevaPosicion = { fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL };
      rotacionCalculada = esDoble ? 0 : -90;
      console.log(`[PAGE] PRIMERA FICHA (Ancla Definida: ${FILA_ANCLA_INICIAL},${COLUMNA_ANCLA_INICIAL}): nuevaPosicion=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotacionCalculada=${rotacionCalculada}`);
      const nuevaFichaAncla: FichaEnMesaParaLogica = {
        ...fichaParaJugar,
        posicionCuadricula: nuevaPosicion,
        rotacion: rotacionCalculada,
      };
      setAnclaFicha(nuevaFichaAncla); 
      setExtremos(esDoble ? {
          izquierda: nuevaFichaAncla.valorSuperior,
          derecha: nuevaFichaAncla.valorSuperior
        } : {
          izquierda: nuevaFichaAncla.valorSuperior,
          derecha: nuevaFichaAncla.valorInferior
        });
      setInfoExtremos({
        izquierda: { pos: nuevaPosicion, rot: rotacionCalculada },
        derecha: { pos: nuevaPosicion, rot: rotacionCalculada }
      });
    } else { 
      const valorExtremoActual = extremoElegido === 'izquierda' ? extremos.izquierda : extremos.derecha; 
      const infoExtremoActual = extremoElegido === 'izquierda' ? infoExtremos.izquierda : infoExtremos.derecha;

      if (valorExtremoActual === null || !infoExtremoActual) {
        console.error("[PAGE] Error: Extremo no válido o información de extremo faltante.");
        return;
      }

      const jugadaDeterminada = determinarJugada(fichaParaJugar, valorExtremoActual);
      if (!jugadaDeterminada.puedeJugar || jugadaDeterminada.valorConexion === undefined || jugadaDeterminada.valorNuevoExtremo === undefined) {
        console.warn(`[PAGE] Movimiento inválido intentado.`);
        return;
      }

      const uPos = infoExtremoActual.pos;
      const uRot = infoExtremoActual.rot;
      console.log(`[PAGE] Conectando a: uPos=(${uPos.fila},${uPos.columna}), uRot=${uRot}. Ficha nueva ${esDoble ? 'DOBLE' : 'NO DOBLE'}`);

      let haSidoProcesadoPorLogicaDeGiroEspecial = false;

      // --- LÓGICA DE GIROS ESPECIALES ---

      // Prioritize Case 2: Inicio de fila 7 desde (6,11)
      const condFila6 = uPos.fila === 6;
      const condCol11_giroFila7 = uPos.columna === 11; 
      const condExtremoDer = extremoElegido === 'derecha';
      const condRotVertical = (uRot === 0 || uRot === 180);
      
      console.log(`[PAGE] DEBUG (6,11)->(7,11) CHECK:`);
      console.log(`  uPos.fila === 6: ${uPos.fila} === 6 -> ${condFila6}`);
      console.log(`  uPos.columna === 11: ${uPos.columna} === 11 -> ${condCol11_giroFila7}`);
      console.log(`  extremoElegido === 'derecha': ${extremoElegido} === 'derecha' -> ${condExtremoDer}`);
      console.log(`  (uRot === 0 || uRot === 180): ${uRot} (0||180) -> ${condRotVertical}`);
      const combinedCondInicioFila7 = condFila6 && condCol11_giroFila7 && condExtremoDer && condRotVertical;
      console.log(`  Combined condition for (6,11)->(7,11): ${combinedCondInicioFila7}`);

      if (combinedCondInicioFila7) { 
        console.log(`[PAGE] DETECTADO: Inicio fila 7 desde (6,11). uRot=${uRot}, fichaParaJugar=${fichaParaJugar.valorSuperior}/${fichaParaJugar.valorInferior}, esDoble=${esDoble}`);
        nuevaPosicion = { fila: uPos.fila + 1, columna: uPos.columna }; // Celda (7,11)
        if (esDoble) {
          rotacionCalculada = 90; // Doble en (7,11) se acuesta para iniciar fila 7
          console.log(`[PAGE]   Ficha para (7,11) es DOBLE. rotCalc=90`);
        } else {
          // Para (7,11), si NO es doble, también va horizontal.
          // Si valorSuperior conecta, rotar 90. Si valorInferior conecta, rotar -90.
          if (jugadaDeterminada.valorConexion === fichaParaJugar.valorSuperior) {
            rotacionCalculada = 90;
            console.log(`[PAGE]   Ficha para (7,11) NO DOBLE. Conexion por Superior. rotCalc=90`);
          } else {
            rotacionCalculada = -90;
            console.log(`[PAGE]   Ficha para (7,11) NO DOBLE. Conexion por Inferior. rotCalc=-90`);
          }
        }
        console.log(`[PAGE]   CALCULADO para (7,11): nuevaPos=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotCalc=${rotacionCalculada}`);
        haSidoProcesadoPorLogicaDeGiroEspecial = true;
      }
      
      // Caso: Crecimiento en Fila 7 hacia la izquierda (desde (7,c) a (7,c-1))
      // Esto se verifica DESPUÉS del inicio de la fila 7, pero ANTES de los giros generales de la fila 5.
      else if (extremoElegido === 'derecha' && uPos.fila === 7 && uPos.columna > 1) {
        console.log(`[PAGE] DETECTADO: Crecimiento en Fila 7 hacia la izquierda desde (${uPos.fila},${uPos.columna})`);
        nuevaPosicion = { fila: 7, columna: uPos.columna - 1 };
        if (esDoble) {
          rotacionCalculada = 0; // Los dobles en esta línea se colocan verticalmente
          console.log(`[PAGE]   Ficha para (${nuevaPosicion.fila},${nuevaPosicion.columna}) es DOBLE. rotCalc=0`);
        } else {
          // Lógica de rotación específica para no dobles en Fila 7 creciendo hacia la izquierda
          if (jugadaDeterminada.valorConexion === fichaParaJugar.valorSuperior) {
            rotacionCalculada = 90;
          } else { 
            rotacionCalculada = -90;
          }
          console.log(`[PAGE]   Ficha para (${nuevaPosicion.fila},${nuevaPosicion.columna}) NO es DOBLE (Fila 7 Izq). valorConexion=${jugadaDeterminada.valorConexion}, fichaSup=${fichaParaJugar.valorSuperior}. rotCalc=${rotacionCalculada}`);
        }
        haSidoProcesadoPorLogicaDeGiroEspecial = true;
      }
      // Caso: Transición de (7,1) a (8,1)
      else if (extremoElegido === 'derecha' && uPos.fila === 7 && uPos.columna === 1) {
        console.log(`[PAGE] DETECTADO: Transición de (7,1) a (8,1)`);
        nuevaPosicion = { fila: 8, columna: 1 };
        if (esDoble) { // Ficha para (8,1) es doble
          rotacionCalculada = 0; // Dobles siempre verticales
          console.log(`[PAGE]   Ficha para (${nuevaPosicion.fila},${nuevaPosicion.columna}) es DOBLE. rotCalc=0`);
        } else { // Ficha para (8,1) NO es doble
          if (jugadaDeterminada.valorConexion === fichaParaJugar.valorSuperior) {
            rotacionCalculada = 0;
          } else { // jugadaDeterminada.valorConexion === fichaParaJugar.valorInferior
            rotacionCalculada = 180;
          }
          console.log(`[PAGE]   Ficha para (${nuevaPosicion.fila},${nuevaPosicion.columna}) NO DOBLE. valorConexion=${jugadaDeterminada.valorConexion}, fichaSup=${fichaParaJugar.valorSuperior}. rotCalc=${rotacionCalculada}`);
        }
        haSidoProcesadoPorLogicaDeGiroEspecial = true;
      }
      // Caso: Transición de (8,1) a (9,1) - Ficha en (9,1) siempre horizontal
      else if (extremoElegido === 'derecha' && uPos.fila === 8 && uPos.columna === 1) {
        console.log(`[PAGE] DETECTADO: Transición de (8,1) a (9,1)`);
        nuevaPosicion = { fila: 9, columna: 1 };
        // La ficha en (9,1) siempre debe ser horizontal
        if (esDoble) { 
          rotacionCalculada = 90; // Doble horizontal
          console.log(`[PAGE]   Ficha para (${nuevaPosicion.fila},${nuevaPosicion.columna}) es DOBLE. rotCalc=90`);
        } else { 
          // No doble horizontal, usar lógica de rotación horizontal
          if (jugadaDeterminada.valorConexion === fichaParaJugar.valorSuperior) {
            rotacionCalculada = -90; // [S|I] con S conectando -> [I---S] -> rot -90
          } else { // jugadaDeterminada.valorConexion === fichaParaJugar.valorInferior
            rotacionCalculada = 180;
          }
          console.log(`[PAGE]   Ficha para (${nuevaPosicion.fila},${nuevaPosicion.columna}) NO DOBLE. valorConexion=${jugadaDeterminada.valorConexion}, fichaSup=${fichaParaJugar.valorSuperior}. rotCalc=${rotacionCalculada}`);
        }
        haSidoProcesadoPorLogicaDeGiroEspecial = true;
      }
      // Caso: Crecimiento en Fila 9 hacia la derecha (desde (9,c) a (9,c+1)) - Después de (9,1)
      else if (extremoElegido === 'derecha' && uPos.fila === 9 && uPos.columna < 11) {
        console.log(`[PAGE] DETECTADO: Crecimiento en Fila 9 hacia la derecha desde (${uPos.fila},${uPos.columna})`);
        nuevaPosicion = { fila: 9, columna: uPos.columna + 1 };
        if (esDoble) {
          rotacionCalculada = 0; // Los dobles en esta línea se colocan verticalmente
          console.log(`[PAGE]   Ficha para (${nuevaPosicion.fila},${nuevaPosicion.columna}) es DOBLE. rotCalc=0`);
        } else {
          rotacionCalculada = calcularRotacionHorizontalNoDoble(
            fichaParaJugar,
            'derecha', // Jugando en el extremo lógico 'derecha' de la cadena general
            jugadaDeterminada.valorConexion! 
          );
          console.log(`[PAGE]   Ficha para (${nuevaPosicion.fila},${nuevaPosicion.columna}) NO es DOBLE (Fila 9 Der). rotCalc=${rotacionCalculada}`);
        }
        haSidoProcesadoPorLogicaDeGiroEspecial = true;
      }
      // Caso: Giro de (5,11) a (6,11) (extremo derecho de la fila 5)
      // This will only be checked if the (6,11)->(7,11) case was not met
      else if (uPos.fila === FILA_ANCLA_INICIAL && uPos.columna === 11 && extremoElegido === 'derecha') { // Nuevo límite columna 11
        console.log(`[PAGE] DETECTADO: Giro (5,11)->(6,11)`);
        nuevaPosicion = { fila: uPos.fila + 1, columna: uPos.columna }; // Celda (6,11)
        if (jugadaDeterminada.valorConexion === fichaParaJugar.valorSuperior) {
          rotacionCalculada = 0;
        } else {
          rotacionCalculada = 180;
        }
        console.log(`[PAGE] Giro en borde DERECHO (5,11)->(6,11): nuevaPos=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotCalc=${rotacionCalculada}`);
        haSidoProcesadoPorLogicaDeGiroEspecial = true;
      }
      
      // Caso 3: Giro de (5,1) a (4,1)
      else if (uPos.fila === FILA_ANCLA_INICIAL && extremoElegido === 'izquierda' && uPos.columna === 1) {
        console.log(`[PAGE] DETECTADO: Giro (5,1)->(4,1)`);
        nuevaPosicion = { fila: uPos.fila - 1, columna: uPos.columna }; 
        if (jugadaDeterminada.valorConexion === fichaParaJugar.valorInferior) {
          rotacionCalculada = 0;
        } else {
          rotacionCalculada = 180;
        }
        console.log(`[PAGE] Giro en borde IZQUIERDO (5,1)->(4,1) o inicio fila 3: nuevaPos=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotCalc=${rotacionCalculada}`);
        haSidoProcesadoPorLogicaDeGiroEspecial = true;
      }
      
      // LÓGICA DE CAMINO Y ROTACIÓN GENERAL (si no hubo giro especial)
      if (!haSidoProcesadoPorLogicaDeGiroEspecial) {
        console.log(`[PAGE] NO GIRO ESPECIAL: Entrando a lógica general.`);
        if (extremoElegido === 'derecha') { 
          if (uRot === 90 || uRot === -90) { 
            nuevaPosicion = { fila: uPos.fila, columna: uPos.columna + 1 };
          } else { 
            nuevaPosicion = { fila: uPos.fila, columna: uPos.columna + 1 };
            if (esDoble) { 
              nuevaPosicion = { fila: uPos.fila + 1, columna: uPos.columna };
            }
          }
        } else { 
          if (uRot === 90 || uRot === -90) { 
            nuevaPosicion = { fila: uPos.fila, columna: uPos.columna - 1 };
          } else { 
            nuevaPosicion = { fila: uPos.fila, columna: uPos.columna - 1 };
            if (esDoble) { 
              nuevaPosicion = { fila: uPos.fila - 1, columna: uPos.columna };
            }
          }
        }
        console.log(`[PAGE] Posición (no giro borde) calculada para nueva ficha: (${nuevaPosicion.fila},${nuevaPosicion.columna})`);

        if (esDoble) {
          rotacionCalculada = 0;
          console.log(`[PAGE]   Ficha es DOBLE (no giro borde). rotCalc=0`);
        } else {
          if ((uRot === 90 || uRot === -90) && nuevaPosicion.fila !== uPos.fila) { 
            rotacionCalculada = 0; 
            console.log(`[PAGE]   Giro T (H->V) (no giro borde): uRot=${uRot}. rotCalc=0`);
          } 
          else if ((uRot === 0 || uRot === 180) && nuevaPosicion.fila !== uPos.fila) { 
            rotacionCalculada = 0;
            console.log(`[PAGE]   Giro (V->V no-doble) (no giro borde): uRot=${uRot}. rotCalc=0`);
          } else { 
            rotacionCalculada = calcularRotacionHorizontalNoDoble(
              fichaParaJugar,
              extremoElegido,
              jugadaDeterminada.valorConexion 
            );
            console.log(`[PAGE]   Colocación Horizontal (no giro borde). rotCalc=${rotacionCalculada} (de calcularRotacionHorizontalNoDoble)`);
          }
        }
      }
      console.log(`[PAGE] FINAL antes de crear ficha: nuevaPos=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotCalc=${rotacionCalculada}`);
      console.log(`FICHA ${fichaParaJugar.valorSuperior}/${fichaParaJugar.valorInferior} FELIZMENTE ASIGNADA EN CELDA (${nuevaPosicion.fila},${nuevaPosicion.columna})!! `);
      
      const nuevaFichaEnMesa: FichaEnMesaParaLogica = {
        ...fichaParaJugar,
        posicionCuadricula: nuevaPosicion,
        rotacion: rotacionCalculada,
      };

      if (extremoElegido === 'izquierda') {
        setFichasIzquierda(prevFichas => [nuevaFichaEnMesa, ...prevFichas]); 
        setExtremos(prev => ({ ...prev, izquierda: jugadaDeterminada.valorNuevoExtremo! }));
        setInfoExtremos(prev => ({ ...prev, izquierda: { pos: nuevaPosicion, rot: rotacionCalculada } }));
      } else { 
        setFichasDerecha(prevFichas => [...prevFichas, nuevaFichaEnMesa]); 
        setExtremos(prev => ({ ...prev, derecha: jugadaDeterminada.valorNuevoExtremo! }));
        setInfoExtremos(prev => ({ ...prev, derecha: { pos: nuevaPosicion, rot: rotacionCalculada } }));
      }
    }

    if (fichaSeleccionada) {
      const { idFicha, idJugadorMano } = fichaSeleccionada;
      setManosJugadores(prevManos =>
        prevManos.map(mano =>
          mano.idJugador === idJugadorMano
            ? { ...mano, fichas: mano.fichas.filter(f => f.id !== idFicha) }
            : mano
        ));
      setFichaSeleccionada(undefined);
    }
    console.log(`[PAGE] ===== FIN HANDLE JUGAR FICHA =====`);
  };

  const combinedFichasParaMesa: FichaEnMesaParaLogica[] = [
    ...fichasIzquierda.slice().reverse(), 
    ...(anclaFicha ? [anclaFicha] : []), 
    ...fichasDerecha, 
  ];

  let fichaRealmenteSeleccionada: FichaDomino | undefined = undefined;
  if (fichaSeleccionada) {
    const manoOrigen = manosJugadores.find(m => m.idJugador === fichaSeleccionada.idJugadorMano);
    if (manoOrigen) {
      fichaRealmenteSeleccionada = manoOrigen.fichas.find(f => f.id === fichaSeleccionada.idFicha);
    }
  }

  const fichaSeleccionadaActual = fichaRealmenteSeleccionada;

  let puedeJugarIzquierda = false;
  let textoBotonIzquierda = "Punta Izquierda";
  let puedeJugarDerecha = false;
  let textoBotonDerecha = "Punta Derecha";
  let mostrarJuegoCerrado = false;

  if (fichaSeleccionadaActual) {
    if (!anclaFicha) { 
      puedeJugarIzquierda = true;
      textoBotonIzquierda = `Jugar ${fichaSeleccionadaActual.valorSuperior}-${fichaSeleccionadaActual.valorInferior}`;
      puedeJugarDerecha = false; 
    } else {
      if (extremos.izquierda !== null) {
        puedeJugarIzquierda = determinarJugada(fichaSeleccionadaActual, extremos.izquierda).puedeJugar;
        textoBotonIzquierda = `Punta Izquierda (${extremos.izquierda})`;
      } else {
         puedeJugarIzquierda = false;
      }
      if (extremos.derecha !== null) {
        puedeJugarDerecha = determinarJugada(fichaSeleccionadaActual, extremos.derecha).puedeJugar;
        textoBotonDerecha = `Punta Derecha (${extremos.derecha})`;
      } else {
        puedeJugarDerecha = false;
      }
      if (!puedeJugarIzquierda && !puedeJugarDerecha) {
        mostrarJuegoCerrado = true;
      }
    }
  }

  const manoJugador1 = manosJugadores.find(m => m.idJugador === "jugador1");
  const manoJugador2 = manosJugadores.find(m => m.idJugador === "jugador2");
  const manoJugador3 = manosJugadores.find(m => m.idJugador === "jugador3");
  const manoJugador4 = manosJugadores.find(m => m.idJugador === "jugador4");
  
  console.log(`[PAGE] VALORES DE ANCLA ANTES DE RENDERIZAR MESA: FILA_ANCLA_INICIAL=${FILA_ANCLA_INICIAL}, COLUMNA_ANCLA_INICIAL=${COLUMNA_ANCLA_INICIAL}`);

  return (
    <div className="min-h-screen bg-table-wood flex flex-col">
      <header className="bg-domino-black text-domino-white p-2 sm:p-3">
        <h1 className="text-xl sm:text-2xl font-bold text-center">Dominando</h1>
      </header>
      <main className="flex-grow relative flex justify-center items-center p-4">
        <MesaDomino
          fichasEnMesa={combinedFichasParaMesa} 
          posicionAnclaFija={anclaFicha ? anclaFicha.posicionCuadricula : { fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL }}
          onFichaClick={(id) => console.log('[MESA] Ficha en mesa clickeada:', id)}
        />
        {fichaSeleccionadaActual && (
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end p-2 bg-black bg-opacity-75 rounded shadow-lg z-10">
            <p className="text-white text-sm font-semibold">Jugar: {fichaSeleccionadaActual.valorSuperior}-{fichaSeleccionadaActual.valorInferior}</p>
            {!anclaFicha ? ( 
               <button 
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded text-sm w-full text-center"
                onClick={() => handleJugarFicha('derecha')} 
              >
                {textoBotonIzquierda} 
              </button>
            ) : mostrarJuegoCerrado ? (
              <div className="bg-red-600 text-white font-bold py-2 px-3 rounded text-sm w-full text-center">
                No se puede jugar esta ficha
              </div>
            ) : (
              <div className="flex gap-2">
                {puedeJugarIzquierda && (
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded text-sm"
                    onClick={() => handleJugarFicha('izquierda')}
                  >
                    {textoBotonIzquierda}
                  </button>
                )}
                {puedeJugarDerecha && (
                  <button
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded text-sm"
                    onClick={() => handleJugarFicha('derecha')}
                  >
                    {textoBotonDerecha}
                  </button>
                )}
              </div>
            )}
            <button onClick={() => setFichaSeleccionada(undefined)} className="text-xs text-gray-300 hover:text-white mt-1">Cancelar selección</button>
          </div>
        )}
      </main>

      {manoJugador1 && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-20 flex justify-center"
          initial={{ y: 120 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <ManoJugadorComponent
            fichas={manoJugador1.fichas}
            fichaSeleccionada={fichaSeleccionada?.idFicha}
            onFichaClick={handleFichaClick}
            idJugadorMano={manoJugador1.idJugador}
            layoutDirection="row"
          />
        </motion.div>
      )}

      {manoJugador2 && (
        <div className="fixed left-2 top-1/2 -translate-y-1/2 z-20 p-1 bg-domino-black bg-opacity-10 rounded-md max-h-[80vh]">
          <ManoJugadorComponent
            fichas={manoJugador2.fichas}
            fichaSeleccionada={fichaSeleccionada?.idFicha}
            onFichaClick={handleFichaClick}
            idJugadorMano={manoJugador2.idJugador}
            layoutDirection="col"
          />
        </div>
      )}

      {manoJugador3 && (
         <div className="fixed top-16 left-1/2 -translate-x-1/2 z-20 p-1 bg-domino-black bg-opacity-10 rounded-md max-w-[80vw]">
          <ManoJugadorComponent
            fichas={manoJugador3.fichas}
            fichaSeleccionada={fichaSeleccionada?.idFicha}
            onFichaClick={handleFichaClick}
            idJugadorMano={manoJugador3.idJugador}
            layoutDirection="row"
          />
        </div>
      )}

      {manoJugador4 && (
        <div className="fixed right-2 top-1/2 -translate-y-1/2 z-20 p-1 bg-domino-black bg-opacity-10 rounded-md max-h-[80vh]">
          <ManoJugadorComponent
            fichas={manoJugador4.fichas}
            fichaSeleccionada={fichaSeleccionada?.idFicha}
            onFichaClick={handleFichaClick}
            idJugadorMano={manoJugador4.idJugador}
            layoutDirection="col"
          />
        </div>
      )}
    </div>
  );
}
