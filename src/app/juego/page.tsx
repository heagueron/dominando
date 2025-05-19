// /home/heagueron/projects/dominando/src/app/juego/page.tsx
'use client';

import { motion } from 'framer-motion'; // Asegúrate que React se importa completo si usas useMemo/useCallback explícitamente
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MesaDomino from '@/components/domino/MesaDomino';
import ManoJugadorComponent from '@/components/domino/ManoJugador';
import {
 FichaDomino,
 FichaEnMesaParaLogica,
 generarYRepartirFichas,
 ManoDeJugador as TipoManoDeJugador,
} from '@/utils/dominoUtils';
import { DESIGN_TABLE_WIDTH_PX, DESIGN_TABLE_HEIGHT_PX, DOMINO_WIDTH_PX, DOMINO_HEIGHT_PX } from '@/utils/dominoConstants';
//import DebugInfoOverlay from '@/components/debug/DebugInfoOverlay'; // Importar el nuevo componente
// En page.tsx
import {
  calcularPosicionRotacionSiguienteFicha,
  configurarPrimeraFicha, // Importar nueva función
  FILA_ANCLA_INICIAL, // Importar constante
  COLUMNA_BORDE_IZQUIERDO, // Importar constante
  COLUMNA_ANCLA_INICIAL // Importar constante
} from '@/utils/posicionamientoUtils';

import { determinarPrimerJugador } from '@/utils/turnosUtils'; // Nueva importación

import DebugInfoOverlay from '../../components/debug/DebugInfoOverlay';



interface FichaSeleccionadaInfo {
  idFicha: string;
  idJugadorMano: string;
}

// FILA_ANCLA_INICIAL, COLUMNA_BORDE_IZQUIERDO y COLUMNA_ANCLA_INICIAL se mueven a posicionamientoUtils.ts

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
    izquierda: { pos: { fila: number, columna: number }, rot: number, valorExtremo: number } | null,
    derecha: { pos: { fila: number, columna: number }, rot: number, valorExtremo: number } | null,
  }>({ izquierda: null, derecha: null });

  // Estado para la información de depuración
  const [viewportDims, setViewportDims] = useState({ width: 0, height: 0 });
  const [mesaDims, setMesaDims] = useState({ width: 0, height: 0, scale: 0 });
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [playableFichaIds, setPlayableFichaIds] = useState<string[]>([]);

  useEffect(() => {
    const { manos, sobrantes } = generarYRepartirFichas(4, 7);

    // Asumimos que generarYRepartirFichas devuelve las manos en el orden visual: [Bottom, Left, Top, Right]
    // Queremos que el estado manosJugadores esté ordenado según el turno (sentido anti-horario): [Bottom, Right, Top, Left]
    if (manos.length === 4) {
      const reorderedManos = [
        manos[0], // Posición Bottom (jugador1 en el turno)
        manos[3], // Posición Right (jugador2 en el turno)
        manos[2], // Posición Top (jugador3 en el turno)
        manos[1], // Posición Left (jugador4 en el turno)
      ];
      // Actualizar los IDs en las manos para que coincidan con el nuevo orden de turno (1, 2, 3, 4)
      reorderedManos[0].idJugador = "jugador1"; // Bottom es jugador1
      reorderedManos[1].idJugador = "jugador2"; // Right es jugador2
      reorderedManos[2].idJugador = "jugador3"; // Top es jugador3
      reorderedManos[3].idJugador = "jugador4"; // Left es jugador4

      setManosJugadores(reorderedManos);
      console.log("[PAGE] Manos generadas y reordenadas para el orden de turno:", reorderedManos);
    } else {
       // Manejar casos con diferente número de jugadores si es necesario, o asumir 4 jugadores
       setManosJugadores(manos); // Mantener el orden original si no son 4 jugadores
       console.log("[PAGE] Manos generadas (no reordenadas, no 4 jugadores):", manos);
    }
    setFichasSobrantes(sobrantes);
  }, []);

  // Determinar el primer jugador una vez que las manos están listas
  useEffect(() => {
    if (manosJugadores.length > 0 && !currentPlayerId) {
      const primerJugador = determinarPrimerJugador(manosJugadores);
      setCurrentPlayerId(primerJugador);
      console.log(`[PAGE] Primer jugador determinado: ${primerJugador}`);
    }
  }, [manosJugadores, currentPlayerId]);

  useEffect(() => {
    const handleResize = () => {
      setViewportDims({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Llamada inicial
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [showRotateMessage, setShowRotateMessage] = useState(false);

  useEffect(() => {
    const handleOrientationChange = () => {
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      // Usamos un umbral de ancho para considerar "móvil", puedes ajustarlo.
      const isMobileThreshold = window.innerWidth < 768; 

      if (isPortrait && isMobileThreshold) {
        setShowRotateMessage(true);
      } else {
        setShowRotateMessage(false);
      }
    };

    // Comprobar al montar
    handleOrientationChange(); 

    window.addEventListener('resize', handleOrientationChange);
    // Opcionalmente, podrías escuchar screen.orientation.onchange si necesitas una detección más precisa y está disponible.

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  const handleMesaDimensionsChange = useCallback((width: number, height: number, scale: number) => {
    setMesaDims(prevDims => {
      // Solo actualizar si los valores realmente cambian para evitar re-renders innecesarios
      if (prevDims.width === width && prevDims.height === height && prevDims.scale === scale) {
        return prevDims;
      }
      return { width, height, scale };
    });
  }, []); // setMesaDims es estable, por lo que el array de dependencias puede estar vacío

  // Efecto para calcular las fichas jugables del jugador actual
  useEffect(() => {
    if (!currentPlayerId || manosJugadores.length === 0) {
      setPlayableFichaIds([]);
      return;
    }

    const manoActual = manosJugadores.find(m => m.idJugador === currentPlayerId);
    if (!manoActual) {
      setPlayableFichaIds([]);
      return;
    }

    const idsJugables: string[] = [];
    if (!anclaFicha) { // Si es el primer turno, todas las fichas son jugables para iniciar
      idsJugables.push(...manoActual.fichas.map(f => f.id));
    } else {
      manoActual.fichas.forEach(ficha => {
        let puedeJugarEstaFicha = false;
        if (extremos.izquierda !== null) {
          if (determinarJugada(ficha, extremos.izquierda).puedeJugar) {
            puedeJugarEstaFicha = true;
          }
        }
        if (!puedeJugarEstaFicha && extremos.derecha !== null) { // Solo comprobar derecha si no pudo por la izquierda
          if (determinarJugada(ficha, extremos.derecha).puedeJugar) {
            puedeJugarEstaFicha = true;
          }
        }
        if (puedeJugarEstaFicha) idsJugables.push(ficha.id);
      });
    }
    setPlayableFichaIds(idsJugables);
    console.log(`[PAGE] Fichas jugables para ${currentPlayerId}:`, idsJugables);
  }, [currentPlayerId, manosJugadores, anclaFicha, extremos]);



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

  const avanzarTurno = () => {
    if (!currentPlayerId || manosJugadores.length === 0) return;

    const currentIndex = manosJugadores.findIndex(m => m.idJugador === currentPlayerId);
    if (currentIndex === -1) {
      console.error("[PAGE] No se pudo encontrar el jugador actual para avanzar el turno.");
      return;
    }

    const nextIndex = (currentIndex + 1) % manosJugadores.length;
    const nextPlayerId = manosJugadores[nextIndex].idJugador;
    setCurrentPlayerId(nextPlayerId);
    setFichaSeleccionada(undefined); // Deseleccionar cualquier ficha al cambiar de turno
    console.log(`[PAGE] Turno avanzado a: ${nextPlayerId}`);
  };

  const handleJugarFicha = (extremoElegido: 'izquierda' | 'derecha') => {
    console.log("¡¡¡ HANDLE JUGAR FICHA INVOCADO !!!"); 
    if (fichaSeleccionada?.idJugadorMano !== currentPlayerId) {
      console.warn(`[PAGE] Intento de jugar ficha por ${fichaSeleccionada?.idJugadorMano}, pero es turno de ${currentPlayerId}`);
      return; // Solo el jugador actual puede jugar
    }
    if (!fichaSeleccionada) return;

    const manoDelJugador = manosJugadores.find(m => m.idJugador === fichaSeleccionada.idJugadorMano);
    if (!manoDelJugador) {
      console.error(`[PAGE] No se encontró la mano del jugador ${fichaSeleccionada.idJugadorMano}`);
      return;
    }
    const fichaParaJugar = manoDelJugador.fichas.find(f => f.id === fichaSeleccionada.idFicha);

    if (!fichaParaJugar) return;

    console.log(`[PAGE] ===== INICIO HANDLE JUGAR FICHA (${fichaParaJugar.id} de mano ${fichaSeleccionada.idJugadorMano}) EN EXTREMO: ${extremoElegido} =====`);

    // --- REGLA: Si los extremos son iguales, forzar a jugar en la punta más corta ---
    // Esta lógica se mantiene como una salvaguarda del backend, aunque la UI ahora debería prevenirlo.
    if (anclaFicha && extremos.izquierda !== null && extremos.izquierda === extremos.derecha) {
      const lengthIzquierda = fichasIzquierda.length;
      const lengthDerecha = fichasDerecha.length;

      const shorterEnd = (lengthIzquierda <= lengthDerecha) ? 'izquierda' : 'derecha';
      const longerEnd = (shorterEnd === 'izquierda') ? 'derecha' : 'izquierda';

      if (extremoElegido === longerEnd) {
        console.warn(`[PAGE] Regla aplicada (salvaguarda): Los extremos son iguales (${extremos.izquierda}). Se intentó jugar en la punta más larga (${longerEnd}). Jugada abortada.`);
        // Aquí podrías añadir lógica para mostrar un mensaje al usuario en la UI si esto llegara a ocurrir
        return; // Abortar la jugada si intenta jugar en la punta más larga
      }
      console.log(`[PAGE] Regla (salvaguarda): Extremos iguales (${extremos.izquierda}). Jugando en la punta más corta (${shorterEnd}).`);
    }

    const esDoble = fichaParaJugar.valorSuperior === fichaParaJugar.valorInferior;
    let rotacionCalculada: number = 0; 
    let nuevaPosicion: { fila: number; columna: number } = { fila: -1, columna: -1 }; 

    if (!anclaFicha) { 
      const { nuevaFichaAncla, nuevosExtremos, nuevaInfoExtremos } = configurarPrimeraFicha(
        fichaParaJugar,
        esDoble
      );
      setAnclaFicha(nuevaFichaAncla);
      setExtremos(nuevosExtremos);
      setInfoExtremos(nuevaInfoExtremos);
      // La posición y rotación ya están dentro de nuevaFichaAncla, no es necesario setearlas por separado aquí.
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

      // Llamar a la función de utilidad para calcular posición y rotación
      const { nuevaPosicion: calculatedPos, rotacionCalculada: calculatedRot } = calcularPosicionRotacionSiguienteFicha(
        fichaParaJugar,
        infoExtremoActual.pos,
        infoExtremoActual.rot,
        extremoElegido,
        esDoble, // esDoble se refiere a la fichaParaJugar
        jugadaDeterminada.valorConexion! // valorConexionDeNuevaFicha
      );
      nuevaPosicion = calculatedPos;
      rotacionCalculada = calculatedRot;

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
        setInfoExtremos(prev => ({ ...prev, izquierda: { pos: nuevaPosicion, rot: rotacionCalculada, valorExtremo: jugadaDeterminada.valorNuevoExtremo! } }));
      } else { 
        setFichasDerecha(prevFichas => [...prevFichas, nuevaFichaEnMesa]); 
        setExtremos(prev => ({ ...prev, derecha: jugadaDeterminada.valorNuevoExtremo! }));
        setInfoExtremos(prev => ({ ...prev, derecha: { pos: nuevaPosicion, rot: rotacionCalculada, valorExtremo: jugadaDeterminada.valorNuevoExtremo! } }));
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
      avanzarTurno(); // Avanzar el turno después de una jugada exitosa
    }
    console.log(`[PAGE] ===== FIN HANDLE JUGAR FICHA =====`);
  };

  const combinedFichasParaMesa = useMemo(() => {
    console.log("[PAGE] Recalculando combinedFichasParaMesa");
    return [
      ...fichasIzquierda.slice().reverse(),
      ...(anclaFicha ? [anclaFicha] : []),
      ...fichasDerecha,
    ];
  }, [fichasIzquierda, anclaFicha, fichasDerecha]);

  const memoizedPosicionAnclaFija = useMemo(() => {
    console.log("[PAGE] Recalculando memoizedPosicionAnclaFija");
    return anclaFicha ? anclaFicha.posicionCuadricula : { fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL };
  }, [anclaFicha]); // FILA_ANCLA_INICIAL y COLUMNA_ANCLA_INICIAL son constantes

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

  // La lógica de los botones de jugar ahora también debe considerar si es el turno del jugador que seleccionó la ficha
  if (fichaSeleccionadaActual && fichaSeleccionada?.idJugadorMano === currentPlayerId) {
    // Solo mostrar opciones de juego si la ficha seleccionada pertenece al jugador actual
    if (!playableFichaIds.includes(fichaSeleccionadaActual.id)) {
      // Si la ficha seleccionada no es jugable, no mostrar opciones de juego para ella.
      // Esto podría ocurrir si el cálculo de playableFichaIds aún no se ha actualizado
      // o si hay alguna discrepancia. Por seguridad, no mostramos botones.
      console.warn(`[PAGE] Ficha seleccionada ${fichaSeleccionadaActual.id} no está en la lista de jugables.`);
    } else {
      if (!anclaFicha) { 
        puedeJugarIzquierda = true;
        textoBotonIzquierda = `Jugar ${fichaSeleccionadaActual.valorSuperior}-${fichaSeleccionadaActual.valorInferior}`;
        puedeJugarDerecha = false; 
      } else {
        const extremosSonIguales = extremos.izquierda !== null && extremos.izquierda === extremos.derecha;

        if (extremosSonIguales) {
          const lenIzquierda = fichasIzquierda.length;
          const lenDerecha = fichasDerecha.length;

          if (lenIzquierda <= lenDerecha) { // Izquierda es más corta o igual
            if (extremos.izquierda !== null) {
              puedeJugarIzquierda = determinarJugada(fichaSeleccionadaActual, extremos.izquierda).puedeJugar;
              textoBotonIzquierda = `Jugar en Izquierda (${extremos.izquierda})`;
            }
            puedeJugarDerecha = false; // No mostrar botón derecho
            textoBotonDerecha = `Punta Derecha (${extremos.derecha})`; // Texto de respaldo
          } else { // Derecha es más corta
            puedeJugarIzquierda = false; // No mostrar botón izquierdo
            textoBotonIzquierda = `Punta Izquierda (${extremos.izquierda})`; // Texto de respaldo
            if (extremos.derecha !== null) {
              puedeJugarDerecha = determinarJugada(fichaSeleccionadaActual, extremos.derecha).puedeJugar;
              textoBotonDerecha = `Jugar en Derecha (${extremos.derecha})`;
            }
          }
        } else { // Extremos diferentes
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
        }
      }

      if (!puedeJugarIzquierda && !puedeJugarDerecha) {
        mostrarJuegoCerrado = true;
      }
    }
  }
  // Referenciar las manos por su posición en el array reordenado, que ahora sigue el orden de turno
  const manoJugador1 = manosJugadores[0]; // Bottom (ID: jugador1)
  const manoJugador2 = manosJugadores[3]; // Left (ID: jugador4)
  const manoJugador3 = manosJugadores[2]; // Top (ID: jugador3)
  const manoJugador4 = manosJugadores[1]; // Right (ID: jugador2)
  
  // console.log(`[PAGE] VALORES DE ANCLA ANTES DE RENDERIZAR MESA: FILA_ANCLA_INICIAL=${FILA_ANCLA_INICIAL}, COLUMNA_ANCLA_INICIAL=${COLUMNA_ANCLA_INICIAL}`);

  return (
    <div className="min-h-screen bg-table-wood flex flex-col">
      {showRotateMessage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.95)', // Fondo oscuro semi-transparente
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            zIndex: 10000, // Asegurar que esté por encima de todo
            padding: '20px',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px' }}><path d="M16.466 7.5C15.643 4.237 13.952 2 12 2 9.239 2 7 6.477 7 12s2.239 10 5 10c.342 0 .677-.069 1-.2M10.534 16.5C11.357 19.763 13.048 22 15 22c2.761 0 5-4.477 5-10s-2.239-10-5-10c-.342 0-.677.069-1 .2"/></svg>
          <h2 style={{ fontSize: '1.5em', marginBottom: '10px' }}>Por favor, rota tu dispositivo</h2>
          <p>Para una mejor experiencia, usa el modo horizontal.</p>
        </div>
      )}
      {/* <header className="bg-domino-black text-domino-white p-2 sm:p-3">
        <h1 className="text-xl sm:text-2xl font-bold text-center">Dominando</h1>
      </header> */} {/* Header eliminado completamente */}
      <main className="flex-grow relative flex justify-center items-center p-4">
        <MesaDomino
          fichasEnMesa={combinedFichasParaMesa} 
          posicionAnclaFija={memoizedPosicionAnclaFija}
          onFichaClick={(id) => console.log('[MESA] Ficha en mesa clickeada:', id)}
          onMesaDimensionsChange={handleMesaDimensionsChange} // Pasar la nueva callback
        />
        <DebugInfoOverlay
          viewportWidth={viewportDims.width}
          viewportHeight={viewportDims.height}
          mesaWidth={mesaDims.width}
          mesaHeight={mesaDims.height}
          mesaScale={mesaDims.scale}
          dominoConstWidth={DOMINO_WIDTH_PX}
          dominoConstHeight={DOMINO_HEIGHT_PX}
        />
        {currentPlayerId && <div className="absolute bottom-4 right-4 text-white bg-black bg-opacity-75 p-2 rounded shadow-lg z-10">Turno de: {currentPlayerId}</div>}
        {fichaSeleccionadaActual && fichaSeleccionada && fichaSeleccionada.idJugadorMano === currentPlayerId && (
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
        {/* Botón de Pasar Turno */}
        {currentPlayerId && playableFichaIds.length === 0 && anclaFicha && ( // Solo mostrar si HAY ancla y no hay fichas jugables
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <button
              onClick={avanzarTurno}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md"
            >Pasar Turno</button>
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
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-20 bg-domino-black bg-opacity-10 rounded-md max-h-[80vh]">
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
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-20 bg-domino-black bg-opacity-10 rounded-md max-h-[80vh]">
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
