// /home/heagueron/projects/dominando/src/app/juego/page.tsx
'use client';

import { motion } from 'framer-motion';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MesaDomino from '@/components/domino/MesaDomino';
import ManoJugadorComponent from '@/components/domino/ManoJugador';
import {
 FichaDomino,
 FichaEnMesaParaLogica,
 generarYRepartirFichas,
 ManoDeJugador as TipoManoDeJugador,
 determinarGanadorJuegoTrancado, // Importar nueva utilidad
} from '@/utils/dominoUtils';

import { DESIGN_TABLE_WIDTH_PX, DESIGN_TABLE_HEIGHT_PX, DOMINO_WIDTH_PX, DOMINO_HEIGHT_PX } from '@/utils/dominoConstants';
import {
  calcularPosicionRotacionSiguienteFicha,
  configurarPrimeraFicha,
  FILA_ANCLA_INICIAL,
  COLUMNA_BORDE_IZQUIERDO,
  COLUMNA_ANCLA_INICIAL
} from '@/utils/posicionamientoUtils';
import { determinarPrimerJugador } from '@/utils/turnosUtils';
import DebugInfoOverlay from '../../components/debug/DebugInfoOverlay';

interface FichaSeleccionadaInfo {
  idFicha: string;
  idJugadorMano: string;
}

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
    izquierda: { pos: { fila: number; columna: number }; rot: number; valorExtremo: number } | null;
    derecha: { pos: { fila: number; columna: number }; rot: number; valorExtremo: number } | null;
  }>({ izquierda: null, derecha: null });
  const [viewportDims, setViewportDims] = useState({ width: 0, height: 0 });
  const [mesaDims, setMesaDims] = useState({ width: 0, height: 0, scale: 0 });
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [playableFichaIds, setPlayableFichaIds] = useState<string[]>([]);
  const [showRotateMessage, setShowRotateMessage] = useState(false);
  const [resultadoMano, setResultadoMano] = useState<{
    ganadorId: string;
    tipoFin: 'domino' | 'trancado';
    detalle: string;
  } | null>(null);
  const [pasesConsecutivos, setPasesConsecutivos] = useState(0);


  useEffect(() => {
    const { manos, sobrantes } = generarYRepartirFichas(4, 7);
    if (manos.length === 4) {
      // Aseguramos que los elementos base estén definidos antes de usarlos,
      // especialmente si noUncheckedIndexedAccess está habilitado.
      // Creamos nuevos objetos para las manos reordenadas para evitar mutaciones directas y ser más explícitos.
      const m0 = manos[0]; // Corresponde al futuro "jugador1" (Abajo)
      const m1 = manos[1]; // Corresponde al futuro "jugador4" (Izquierda)
      const m2 = manos[2]; // Corresponde al futuro "jugador3" (Arriba)
      const m3 = manos[3]; // Corresponde al futuro "jugador2" (Derecha)

      if (!m0 || !m1 || !m2 || !m3) {
        console.error("[PAGE] Error: Faltan manos de jugadores al repartir, a pesar de manos.length === 4.");
        setManosJugadores(manos); // Fallback, aunque este estado es inesperado.
        return;
      }
      const reorderedManos: TipoManoDeJugador[] = [
        { ...m0, idJugador: "jugador1" }, // Jugador 1 (Abajo)
        { ...m3, idJugador: "jugador2" }, // Jugador 2 (Derecha) - usa manos[3] original
        { ...m2, idJugador: "jugador3" }, // Jugador 3 (Arriba) - usa manos[2] original
        { ...m1, idJugador: "jugador4" }, // Jugador 4 (Izquierda) - usa manos[1] original
      ];
      setManosJugadores(reorderedManos);
      console.log("[PAGE] Manos generadas y reordenadas:", reorderedManos);
    } else {
      setManosJugadores(manos);
      console.log("[PAGE] Manos generadas (no reordenadas):", manos);
    }
    setFichasSobrantes(sobrantes);
  }, []);

  useEffect(() => {
    if (manosJugadores.length > 0 && !currentPlayerId) {
      const primerJugador = determinarPrimerJugador(manosJugadores);
      setCurrentPlayerId(primerJugador);
      console.log(`[PAGE] Primer jugador: ${primerJugador}`);
    }
  }, [manosJugadores, currentPlayerId]);

  useEffect(() => {
    const handleResize = () => setViewportDims({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleOrientationChange = () => {
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      const isMobileThreshold = window.innerWidth < 768;
      setShowRotateMessage(isPortrait && isMobileThreshold);
    };
    handleOrientationChange();
    window.addEventListener('resize', handleOrientationChange);
    return () => window.removeEventListener('resize', handleOrientationChange);
  }, []);

  const handleMesaDimensionsChange = useCallback((width: number, height: number, scale: number) => {
    setMesaDims(prevDims =>
      (prevDims.width === width && prevDims.height === height && prevDims.scale === scale)
      ? prevDims
      : { width, height, scale }
    );
  }, []);

  useEffect(() => {
    console.log('[PLAYABLE_EFFECT] Running. Deps:', { currentPlayerId, manosL: manosJugadores.length, ancla: !!anclaFicha, ext: extremos });
    if (!currentPlayerId || manosJugadores.length === 0) {
      setPlayableFichaIds([]); return;
    }
    const manoActual = manosJugadores.find(m => m.idJugador === currentPlayerId);
    if (!manoActual) {
      setPlayableFichaIds([]); return;
    }
    const idsJugables: string[] = [];
    if (!anclaFicha) {
      idsJugables.push(...manoActual.fichas.map(f => f.id));
    } else {
      manoActual.fichas.forEach(ficha => {
        let puede = false;
        if (extremos.izquierda !== null && determinarJugada(ficha, extremos.izquierda).puedeJugar) puede = true;
        if (!puede && extremos.derecha !== null && determinarJugada(ficha, extremos.derecha).puedeJugar) puede = true;
        if (puede) idsJugables.push(ficha.id);
      });
    }
    console.log(`[PLAYABLE_EFFECT] Playable for ${currentPlayerId}:`, idsJugables);
    setPlayableFichaIds(idsJugables);
  }, [currentPlayerId, manosJugadores, anclaFicha, extremos]);

  const handleFichaClick = (idFicha: string, idJugadorMano: string) => {
    if (resultadoMano) return; // No permitir clics si la mano ha terminado
    if (idJugadorMano !== currentPlayerId) return;
    if (anclaFicha && !playableFichaIds.includes(idFicha)) return;
    setFichaSeleccionada(prev =>
      (prev && prev.idFicha === idFicha && prev.idJugadorMano === idJugadorMano)
        ? undefined
        : { idFicha, idJugadorMano }
    );
  };

  const determinarJugada = (ficha: FichaDomino, valorExtremo: number): { puedeJugar: boolean; valorConexion?: number; valorNuevoExtremo?: number } => {
    if (ficha.valorSuperior === valorExtremo) return { puedeJugar: true, valorConexion: ficha.valorSuperior, valorNuevoExtremo: ficha.valorInferior };
    if (ficha.valorInferior === valorExtremo) return { puedeJugar: true, valorConexion: ficha.valorInferior, valorNuevoExtremo: ficha.valorSuperior };
    return { puedeJugar: false };
  };

  const _avanzarTurnoAlSiguienteJugador = () => {
    if (resultadoMano || !currentPlayerId || manosJugadores.length === 0) return;
    const currentIndex = manosJugadores.findIndex(m => m.idJugador === currentPlayerId);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % manosJugadores.length;
    const siguienteJugadorId = manosJugadores[nextIndex]?.idJugador;
    if (siguienteJugadorId) {
      setCurrentPlayerId(siguienteJugadorId);
      setFichaSeleccionada(undefined);
      console.log(`[PAGE] Turno avanzado a: ${siguienteJugadorId}`);
    }
  };

  const handleFinManoPorTrancado = () => {
    const resultadoTrancado = determinarGanadorJuegoTrancado(manosJugadores);
    if (resultadoTrancado) {
      setResultadoMano({
        ganadorId: resultadoTrancado.ganadorId,
        tipoFin: 'trancado',
        detalle: `Juego Trancado. Ganador: ${resultadoTrancado.ganadorId} con ${resultadoTrancado.puntajeMinimo} puntos.`,
      });
    } else {
      console.error("[PAGE] No se pudo determinar el ganador en juego trancado.");
      // Fallback o manejo de error adicional si es necesario
    }
  };

  const handlePasarTurno = () => {
    if (resultadoMano) return;

    const nuevosPases = pasesConsecutivos + 1;
    setPasesConsecutivos(nuevosPases);

    if (nuevosPases >= manosJugadores.length) { // Asumiendo que manosJugadores.length es el número de jugadores activos
      handleFinManoPorTrancado();
    } else {
      _avanzarTurnoAlSiguienteJugador();
    }
  };

  const handleJugarFicha = (extremoElegido: 'izquierda' | 'derecha') => {
    if (resultadoMano) return; // No jugar si la mano ya terminó
    if (!fichaSeleccionada || fichaSeleccionada.idJugadorMano !== currentPlayerId) return;
    const manoDelJugador = manosJugadores.find(m => m.idJugador === fichaSeleccionada.idJugadorMano);
    if (!manoDelJugador) return;
    const fichaParaJugar = manoDelJugador.fichas.find(f => f.id === fichaSeleccionada.idFicha);
    if (!fichaParaJugar) return;
    if (anclaFicha && !playableFichaIds.includes(fichaParaJugar.id)) return;

    if (anclaFicha && extremos.izquierda !== null && extremos.izquierda === extremos.derecha) {
      const shorterEnd = (fichasIzquierda.length <= fichasDerecha.length) ? 'izquierda' : 'derecha';
      if (extremoElegido !== shorterEnd) {
        console.warn(`[PAGE] Regla: Extremos iguales. Debe jugar en ${shorterEnd}.`);
        return;
      }
    }

    const esDoble = fichaParaJugar.valorSuperior === fichaParaJugar.valorInferior;
    if (!anclaFicha) {
      const { nuevaFichaAncla, nuevosExtremos, nuevaInfoExtremos } = configurarPrimeraFicha(fichaParaJugar, esDoble);
      setAnclaFicha(nuevaFichaAncla);
      setExtremos(nuevosExtremos);
      setInfoExtremos(nuevaInfoExtremos);
    } else {
      let valorExtremoNumerico: number;
      let infoExtremoObjeto: { pos: { fila: number; columna: number }; rot: number; valorExtremo: number };
      if (extremoElegido === 'izquierda') {
        if (extremos.izquierda === null || !infoExtremos.izquierda) return;
        valorExtremoNumerico = extremos.izquierda;
        infoExtremoObjeto = infoExtremos.izquierda;
      } else {
        if (extremos.derecha === null || !infoExtremos.derecha) return;
        valorExtremoNumerico = extremos.derecha;
        infoExtremoObjeto = infoExtremos.derecha;
      }
      const jugadaDeterminada = determinarJugada(fichaParaJugar, valorExtremoNumerico);
      if (!jugadaDeterminada.puedeJugar || jugadaDeterminada.valorConexion === undefined || jugadaDeterminada.valorNuevoExtremo === undefined) return;

      const { nuevaPosicion, rotacionCalculada } = calcularPosicionRotacionSiguienteFicha(
        fichaParaJugar, infoExtremoObjeto.pos, infoExtremoObjeto.rot, extremoElegido, esDoble, jugadaDeterminada.valorConexion
      );
      const nuevaFichaEnMesa: FichaEnMesaParaLogica = { ...fichaParaJugar, posicionCuadricula: nuevaPosicion, rotacion: rotacionCalculada };
      if (extremoElegido === 'izquierda') {
        setFichasIzquierda(prev => [nuevaFichaEnMesa, ...prev]);
        setExtremos(prev => ({ ...prev, izquierda: jugadaDeterminada.valorNuevoExtremo! }));
        setInfoExtremos(prev => ({ ...prev, izquierda: { pos: nuevaPosicion, rot: rotacionCalculada, valorExtremo: jugadaDeterminada.valorNuevoExtremo! } }));
      } else {
        setFichasDerecha(prev => [...prev, nuevaFichaEnMesa]);
        setExtremos(prev => ({ ...prev, derecha: jugadaDeterminada.valorNuevoExtremo! }));
        setInfoExtremos(prev => ({ ...prev, derecha: { pos: nuevaPosicion, rot: rotacionCalculada, valorExtremo: jugadaDeterminada.valorNuevoExtremo! } }));
      }
    }

    const jugadorQueJugoId = fichaSeleccionada.idJugadorMano;
    
    // Determinar si el jugador gana ANTES de actualizar el estado de las manos
    // Necesitamos saber cómo quedará la mano del jugador después de jugar esta ficha.
    // 'manoDelJugador' y 'fichaParaJugar' ya están definidos y validados arriba.
    const manoActualizadaDelJugador = manoDelJugador.fichas.filter(f => f.id !== fichaParaJugar.id);
    const ganoPorDomino = manoActualizadaDelJugador.length === 0;

    setManosJugadores(prevManos => {
      const nuevasManos = prevManos.map(mano => {
        if (mano.idJugador === jugadorQueJugoId) {
          // Usamos la mano ya calculada para la actualización
          return { ...mano, fichas: manoActualizadaDelJugador };
        }
        return mano;
      });
      return nuevasManos;
    });

    setFichaSeleccionada(undefined);

    if (ganoPorDomino) {
      setResultadoMano({
        ganadorId: jugadorQueJugoId,
        tipoFin: 'domino',
        detalle: `¡${jugadorQueJugoId} ha dominado!`,
      });
    } else {
      setPasesConsecutivos(0); // Reset pases on a successful play
      _avanzarTurnoAlSiguienteJugador();
    }
  };

  const combinedFichasParaMesa = useMemo(() => [
    ...fichasIzquierda.slice().reverse(),
    ...(anclaFicha ? [anclaFicha] : []),
    ...fichasDerecha,
  ], [fichasIzquierda, anclaFicha, fichasDerecha]);

  const memoizedPosicionAnclaFija = useMemo(() =>
    anclaFicha ? anclaFicha.posicionCuadricula : { fila: FILA_ANCLA_INICIAL, columna: COLUMNA_ANCLA_INICIAL }
  , [anclaFicha]);

  let fichaSeleccionadaActual: FichaDomino | undefined;
  if (fichaSeleccionada) {
    const manoOrigen = manosJugadores.find(m => m.idJugador === fichaSeleccionada.idJugadorMano);
    if (manoOrigen) fichaSeleccionadaActual = manoOrigen.fichas.find(f => f.id === fichaSeleccionada.idFicha);
  }

  let puedeJugarIzquierda = false, textoBotonIzquierda = "Punta Izquierda";
  let puedeJugarDerecha = false, textoBotonDerecha = "Punta Derecha";

  if (fichaSeleccionadaActual && fichaSeleccionada && fichaSeleccionada.idJugadorMano === currentPlayerId && playableFichaIds.includes(fichaSeleccionadaActual.id)) {
    if (!anclaFicha) {
      puedeJugarIzquierda = true;
      textoBotonIzquierda = `Jugar ${fichaSeleccionadaActual.valorSuperior}-${fichaSeleccionadaActual.valorInferior}`;
    } else {
      const extremosSonIguales = extremos.izquierda !== null && extremos.izquierda === extremos.derecha;
      if (extremosSonIguales) {
        const esIzquierdaMasCorta = fichasIzquierda.length <= fichasDerecha.length;
        if (esIzquierdaMasCorta && extremos.izquierda !== null) {
          puedeJugarIzquierda = determinarJugada(fichaSeleccionadaActual, extremos.izquierda).puedeJugar;
          if(puedeJugarIzquierda) textoBotonIzquierda = `Jugar en Izquierda (${extremos.izquierda})`;
        } else if (!esIzquierdaMasCorta && extremos.derecha !== null) {
          puedeJugarDerecha = determinarJugada(fichaSeleccionadaActual, extremos.derecha).puedeJugar;
          if(puedeJugarDerecha) textoBotonDerecha = `Jugar en Derecha (${extremos.derecha})`;
        }
      } else {
        if (extremos.izquierda !== null) {
          puedeJugarIzquierda = determinarJugada(fichaSeleccionadaActual, extremos.izquierda).puedeJugar;
          if(puedeJugarIzquierda) textoBotonIzquierda = `Punta Izquierda (${extremos.izquierda})`;
        }
        if (extremos.derecha !== null) {
          puedeJugarDerecha = determinarJugada(fichaSeleccionadaActual, extremos.derecha).puedeJugar;
          if(puedeJugarDerecha) textoBotonDerecha = `Punta Derecha (${extremos.derecha})`;
        }
      }
    }
  }

  // Variable para saber si el jugador actual tiene fichas, usando el nullish coalescing operator para seguridad.
  const fichasDelJugadorActualCount = manosJugadores.find(m => m.idJugador === currentPlayerId)?.fichas?.length ?? 0;
  const mostrarPanelJuegoCerrado = anclaFicha && playableFichaIds.length === 0 && fichasDelJugadorActualCount > 0;

  // Variables para las manos de los jugadores
  // Se definen aquí para que TypeScript pueda inferir sus tipos correctamente después de la guarda de longitud.
  let mano1: TipoManoDeJugador | undefined, mano2: TipoManoDeJugador | undefined, mano3: TipoManoDeJugador | undefined, mano4: TipoManoDeJugador | undefined;
  let pIds1: string[] = [], pIds2: string[] = [], pIds3: string[] = [], pIds4: string[] = [];

  if (manosJugadores.length === 4) {
    // Sabemos que manosJugadores[i] existe debido a la guarda manosJugadores.length === 4
    // Si noUncheckedIndexedAccess está habilitado, manosJugadores[i] es de tipo TipoManoDeJugador | undefined.
    // Asignamos directamente a las variables manoX, que ya son TipoManoDeJugador | undefined.
    // Usamos la aserción no nula (!) porque la lógica (length === 4) garantiza que existen.
    mano1 = manosJugadores[0]!;
    mano2 = manosJugadores[1]!;
    mano3 = manosJugadores[2]!;
    mano4 = manosJugadores[3]!;

    // Después de las aserciones no nulas (!), TypeScript debería tratar a mano1, mano2, etc.,
    // como TipoManoDeJugador dentro de este bloque if (manosJugadores.length === 4).
    // Si el error persiste en las siguientes líneas (ej. al acceder a mano1.idJugador),
    // significa que la aserción '!' en la asignación no fue suficiente para convencer a TS
    // de que la variable 'mano1' (que es TipoManoDeJugador | undefined) es ahora definitivamente TipoManoDeJugador.
    // La guarda "manoX &&" debería ser suficiente para estrechar el tipo, por lo que la aserción explícita no debería ser necesaria.
    if (mano1 && currentPlayerId === mano1.idJugador) pIds1 = playableFichaIds;
    if (mano2 && currentPlayerId === mano2.idJugador) pIds2 = playableFichaIds;
    if (mano3 && currentPlayerId === mano3.idJugador) pIds3 = playableFichaIds;
    if (mano4 && currentPlayerId === mano4.idJugador) pIds4 = playableFichaIds;
  }

  return (
    <div className="min-h-screen bg-table-wood flex flex-col">
      {showRotateMessage && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.95)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', zIndex: 10000, padding: '20px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px' }}><path d="M16.466 7.5C15.643 4.237 13.952 2 12 2 9.239 2 7 6.477 7 12s2.239 10 5 10c.342 0 .677-.069 1-.2M10.534 16.5C11.357 19.763 13.048 22 15 22c2.761 0 5-4.477 5-10s-2.239-10-5-10c-.342 0-.677-.069-1 .2"/></svg>
          <h2 style={{ fontSize: '1.5em', marginBottom: '10px' }}>Por favor, rota tu dispositivo</h2>
          <p>Para una mejor experiencia, usa el modo horizontal.</p>
        </div>
      )}
      <main className="flex-grow relative flex justify-center items-center p-4">
        <MesaDomino
          fichasEnMesa={combinedFichasParaMesa}
          posicionAnclaFija={memoizedPosicionAnclaFija}
          onFichaClick={(id) => console.log('[MESA] Ficha en mesa clickeada:', id)}
          onMesaDimensionsChange={handleMesaDimensionsChange}
        />
        <DebugInfoOverlay
          viewportWidth={viewportDims.width} viewportHeight={viewportDims.height}
          mesaWidth={mesaDims.width} mesaHeight={mesaDims.height} mesaScale={mesaDims.scale}
          dominoConstWidth={DOMINO_WIDTH_PX} dominoConstHeight={DOMINO_HEIGHT_PX}
        />
        {currentPlayerId && <div className="absolute bottom-4 right-4 text-white bg-black bg-opacity-75 p-2 rounded shadow-lg z-10">Turno de: {currentPlayerId}</div>}

        {fichaSeleccionadaActual && fichaSeleccionada && fichaSeleccionada.idJugadorMano === currentPlayerId && (
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end p-2 bg-black bg-opacity-75 rounded shadow-lg z-10">
            <p className="text-white text-sm font-semibold">Jugar: {fichaSeleccionadaActual.valorSuperior}-{fichaSeleccionadaActual.valorInferior}</p>
            {!anclaFicha ? (
               <button className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded text-sm w-full text-center" onClick={() => handleJugarFicha('derecha')}>
                {textoBotonIzquierda}
              </button>
            ) : mostrarPanelJuegoCerrado ? ( // Cambiado de mostrarJuegoCerrado a mostrarPanelJuegoCerrado
               <div className="bg-red-600 text-white font-bold py-2 px-3 rounded text-sm w-full text-center">
                 No puedes jugar esta ficha
               </div>
            ) : (
              <div className="flex gap-2">
                {puedeJugarIzquierda && (
                  <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded text-sm" onClick={() => handleJugarFicha('izquierda')}>
                    {textoBotonIzquierda}
                  </button>
                )}
                {puedeJugarDerecha && (
                  <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded text-sm" onClick={() => handleJugarFicha('derecha')}>
                    {textoBotonDerecha}
                  </button>
                )}
              </div>
            )}
            <button onClick={() => setFichaSeleccionada(undefined)} className="text-xs text-gray-300 hover:text-white mt-1">Cancelar selección</button>
          </div>
        )}
        {/* Usar la variable precalculada fichasDelJugadorActualCount para la condición */}
        {currentPlayerId && anclaFicha && playableFichaIds.length === 0 && fichasDelJugadorActualCount > 0 && !resultadoMano && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <button onClick={handlePasarTurno} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md">
              Pasar Turno
            </button>
          </div>
        )}
      </main>

      {/* Mano del Jugador Principal (Abajo) */}
      {mano1 && (
        <motion.div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center" initial={{ y: 120 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
          <ManoJugadorComponent
            fichas={mano1.fichas}
            fichaSeleccionada={fichaSeleccionada?.idFicha}
            onFichaClick={handleFichaClick}
            idJugadorMano={mano1.idJugador}
            layoutDirection="row"
            playableFichaIds={pIds1}
          />
        </motion.div>
      )}

      {/* Mano del Jugador Izquierda (Visualmente) - jugador4 en orden de turno */}
      {mano4 && (
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-20 bg-domino-black bg-opacity-10 rounded-md max-h-[80vh]">
          <ManoJugadorComponent
            fichas={mano4.fichas}
            fichaSeleccionada={fichaSeleccionada?.idFicha}
            onFichaClick={handleFichaClick}
            idJugadorMano={mano4.idJugador}
            layoutDirection="col"
            playableFichaIds={pIds4}
          />
        </div>
      )}

      {/* Mano del Jugador Arriba (Visualmente) - jugador3 en orden de turno */}
      {mano3 && (
         <div className="fixed top-16 left-1/2 -translate-x-1/2 z-20 p-1 bg-domino-black bg-opacity-10 rounded-md max-w-[80vw]">
          <ManoJugadorComponent
            fichas={mano3.fichas}
            fichaSeleccionada={fichaSeleccionada?.idFicha}
            onFichaClick={handleFichaClick}
            idJugadorMano={mano3.idJugador}
            layoutDirection="row"
            playableFichaIds={pIds3}
          />
        </div>
      )}

      {/* Mano del Jugador Derecha (Visualmente) - jugador2 en orden de turno */}
      {mano2 && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-20 bg-domino-black bg-opacity-10 rounded-md max-h-[80vh]">
          <ManoJugadorComponent
            fichas={mano2.fichas}
            fichaSeleccionada={fichaSeleccionada?.idFicha}
            onFichaClick={handleFichaClick}
            idJugadorMano={mano2.idJugador}
            layoutDirection="col"
            playableFichaIds={pIds2}
          />
        </div>
      )}

      {resultadoMano && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
          <motion.div
            className="bg-domino-white p-6 sm:p-8 rounded-xl shadow-2xl text-center max-w-md w-full"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-domino-black">¡Mano Terminada!</h2>
            <p className="text-md sm:text-lg mb-6 text-gray-700">{resultadoMano.detalle}</p>
            {/* Aquí podrías añadir un botón para "Siguiente Mano" o "Ver Puntuaciones" */}
          </motion.div>
        </div>
      )}
    </div>
  );
}
