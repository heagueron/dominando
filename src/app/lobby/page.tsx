// /home/heagueron/jmu/dominando/src/app/lobby/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDominoSocket } from '@/hooks/useDominoSocket';


// Tipos para los payloads de Socket.IO (simplificados para el lobby)
interface TeUnisteAMesaPayloadLobby { // Renombrado y actualizado
  mesaId: string; // Cambiado de rondaId
  tuJugadorIdEnPartida: string;
  // estadoMesa: any; // El lobby podría no necesitar el estado completo de la mesa inicialmente
  // Podríamos añadir más info si es necesaria al unirse desde el lobby
}

export type TipoJuegoSolicitado = 'rondaUnica' | 'partidaCompleta';

export default function LobbyPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [nombreJugador, setNombreJugador] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<TipoJuegoSolicitado | null>(null);
  const [lobbyError, setLobbyError] = useState<string | null>(null); // Renombrado para evitar conflicto con error del hook
  const [authInitialized, setAuthInitialized] = useState(false); // Nuevo estado
  const tipoJuegoSolicitadoRef = useRef<TipoJuegoSolicitado | null>(null);
  const isNavigatingRef = useRef<boolean>(false); // Ref to track if navigation is in progress

  // Effect for userId and nombreJugador initialization
  useEffect(() => {
    // Este efecto debe ejecutarse solo una vez para configurar el usuario.
    console.log('[LOBBY_USER_INIT] Inicializando usuario...');
      const idFromStorage = sessionStorage.getItem('jmu_userId');
      console.log('[LOBBY_USER_INIT] sessionStorage.getItem("jmu_userId") devolvió:', idFromStorage);
      
      let currentUserId = idFromStorage;
      if (!currentUserId) {
        currentUserId = `client_${Math.random().toString(36).substring(2, 9)}`;
        console.log('[LOBBY_USER_INIT] Generado nuevo userId:', currentUserId);
        sessionStorage.setItem('jmu_userId', currentUserId);
      }
      
      const currentNombreJugador = sessionStorage.getItem('jmu_nombreJugador') || `Jugador ${currentUserId.slice(-4)}`;
      sessionStorage.setItem('jmu_nombreJugador', currentNombreJugador); // Asegurar que también se establezca si solo userId estaba presente
      
      console.log(`[LOBBY_USER_INIT] Estableciendo estado: userId=${currentUserId}, nombreJugador=${currentNombreJugador}`);
      setUserId(currentUserId);
      setNombreJugador(currentNombreJugador);
    setAuthInitialized(true); // Marcar que la inicialización ha terminado
    console.log(`[LOBBY_USER_INIT] Auth inicializada. userId=${currentUserId}, nombreJugador=${currentNombreJugador}`);
  }, []); // Array de dependencias vacío para ejecutar solo una vez al montar

  const formatPlayerNameForTitle = (name: string | null): string => {
    if (!name) return "";
    let processedName = name;
    if (name.startsWith("Jugador ")) {
      processedName = name.substring("Jugador ".length);
    }
    return processedName.slice(-4);
  };

  // Effect to update document title with player name
  useEffect(() => {
    const defaultTitle = "Lobby - Dominando"; // Título base o el que tenías antes
    if (nombreJugador) {
      const shortName = formatPlayerNameForTitle(nombreJugador);
      document.title = shortName ? `${shortName} - Lobby` : defaultTitle;
    } else {
      document.title = defaultTitle;
    }
    // Opcional: Restaurar el título original cuando el componente se desmonte
    // return () => { document.title = "Dominando"; }; // O el título global de tu app
  }, [nombreJugador]);

  // Usar el hook refactorizado
  const {
    socket, 
    isConnected, 
    socketError, 
    emitEvent, 
    registerEventHandlers, 
    unregisterEventHandlers,
    initializeSocketIfNeeded, // Nueva función del hook
  } = useDominoSocket();

  // Inicializar el socket una vez que tengamos userId y nombreJugador
  useEffect(() => {
    if (authInitialized && userId && nombreJugador) {
      console.log('[LOBBY_PAGE] Auth inicializada, llamando a initializeSocketIfNeeded.');
      initializeSocketIfNeeded(userId, nombreJugador);
    }
  }, [authInitialized, userId, nombreJugador, initializeSocketIfNeeded]);


  // Effect for game-specific socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleTeUnisteAMesaCallback = (payload: TeUnisteAMesaPayloadLobby) => {
      console.log('[LOBBY_SOCKET] Evento servidor:teUnisteAMesa recibido:', payload);
      isNavigatingRef.current = true; // Set flag before navigating
      // Usar userId y nombreJugador del closure del useEffect, que son los valores correctos para este render.
      console.log('[LOBBY_SOCKET] ANTES DE NAVEGAR A JUEGO - userId (closure):', userId, 'nombreJugador (closure):', nombreJugador);
      // Opcionalmente, podrías leer de sessionStorage aquí si hay dudas sobre la frescura del estado en el closure,
      // pero el estado de React debería ser suficiente si las dependencias del useEffect son correctas.
      tipoJuegoSolicitadoRef.current = null; // Reset ref
      setIsLoading(null);
      setLobbyError(null);
      // Usar userId y nombreJugador del closure del useEffect, que son los valores correctos para este render.
      if (userId && nombreJugador) { 
        router.push(`/juego/${payload.mesaId}?uid=${encodeURIComponent(userId)}&nombre=${encodeURIComponent(nombreJugador)}`);
      } else {
        console.error("[LOBBY_SOCKET] No se pudo navegar: userId o nombreJugador del estado de React son nulos.");
        setLobbyError("Error al preparar la navegación. Intenta de nuevo.");
      }
    };
    
    const handleErrorDePartidaCallback = (payload: { mensaje: string }) => {
      console.error('[LOBBY_SOCKET] Error de partida desde el servidor:', payload.mensaje);
      setLobbyError(`Error del servidor: ${payload.mensaje}`);
      setIsLoading(null);
      tipoJuegoSolicitadoRef.current = null; // Reset ref
      isNavigatingRef.current = false; // Reset flag on error
    };

    const eventHandlers = {
      'servidor:teUnisteAMesa': handleTeUnisteAMesaCallback,
      'servidor:errorDePartida': handleErrorDePartidaCallback,
    };
    registerEventHandlers(eventHandlers);

    return () => {
      unregisterEventHandlers(Object.keys(eventHandlers));
    };
  // Las dependencias userId y nombreJugador son correctas aquí porque
  // handleTeUnisteAMesaCallback (definido dentro de este efecto) los usa en su closure.
  // Si estos callbacks se movieran fuera y se memoizaran con useCallback,
  // entonces este useEffect podría no necesitar userId/nombreJugador directamente si los callbacks son estables.
  // registerEventHandlers y unregisterEventHandlers se asume que son estables desde el hook.
  }, [socket, router, userId, nombreJugador, registerEventHandlers, unregisterEventHandlers]);

  const handleJoinGame = useCallback((tipoJuego: TipoJuegoSolicitado) => {
    // Asegurarse que auth esté completa y el socket esté listo (aunque el hook podría no devolver socket si auth no está lista)
    if (!authInitialized || !nombreJugador || !userId ) {
      setLobbyError("El cliente no está listo. Por favor, espera un momento o recarga la página.");
      return;
    }
    // La comprobación de !socket y !emitEvent se hace implícitamente por isConnected
    console.log(`[LOBBY_SOCKET] handleJoinGame called for ${tipoJuego}`);
    setIsLoading(tipoJuego);
    setLobbyError(null);
    isNavigatingRef.current = false; // Reset navigation flag at the start of a join attempt
    tipoJuegoSolicitadoRef.current = tipoJuego; // Set the ref

    // Guardar el tipo de juego solicitado en sessionStorage INMEDIATAMENTE
    console.log(`[LOBBY_SOCKET] Guardando jmu_tipoJuegoSolicitado en sessionStorage: ${tipoJuego} (desde handleJoinGame)`);
    sessionStorage.setItem('jmu_tipoJuegoSolicitado', tipoJuego);

    if (isConnected) {
      console.log('[LOBBY_SOCKET] Socket already connected. Emitting cliente:unirseAMesa.');
      emitEvent('cliente:unirseAMesa', { juegoSolicitado: tipoJuego, nombreJugador });
    } else {
      console.log('[LOBBY_SOCKET] Socket not connected. Intentando inicializar/conectar y luego unirse.');
      // Asegurarse de que el socket se inicialice si aún no lo está
      if (userId && nombreJugador) {
        initializeSocketIfNeeded(userId, nombreJugador);
        // Aquí podrías añadir una lógica para esperar a que isConnected sea true antes de emitir,
        // o confiar en que el usuario reintente si la conexión tarda.
        // Por simplicidad, asumimos que la conexión será rápida o el usuario reintentará.
        // Una mejor UX sería deshabilitar el botón hasta que isConnected sea true después de llamar a initialize.
        setLobbyError("Conectando al servidor... Por favor, inténtalo de nuevo en unos segundos si esto falla.");
      } else {
        setLobbyError("Falta información del usuario para conectar.");
      }
    }
  }, [authInitialized, nombreJugador, userId, isConnected, emitEvent, initializeSocketIfNeeded]);

  useEffect(() => { if (socketError) setLobbyError(socketError); }, [socketError]);

  if (!authInitialized) { // Mostrar carga hasta que la inicialización del usuario termine
    return <div className="flex items-center justify-center min-h-screen">Cargando configuración del jugador...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-100">
      <header className="p-4 mb-8">
        <h1 className="text-5xl font-bold text-center text-gray-800">Lobby de Dominando</h1>
        <p className="text-xl text-gray-600 text-center mt-2">Elige tu modo de juego, {nombreJugador}</p>
      </header>
      <main className="flex flex-col items-center gap-6">
        <button
          onClick={() => handleJoinGame('rondaUnica')}
          disabled={!!isLoading}
          className="px-8 py-4 text-xl font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition duration-150 ease-in-out disabled:bg-gray-400"
        >
          {isLoading === 'rondaUnica' ? 'Uniéndote...' : 'Partida de Ronda Única'}
        </button>
        <button
          onClick={() => handleJoinGame('partidaCompleta')}
          disabled={!!isLoading}
          className="px-8 py-4 text-xl font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition duration-150 ease-in-out disabled:bg-gray-400"
        >
          {isLoading === 'partidaCompleta' ? 'Uniéndote...' : 'Partida Completa (Próximamente)'}
        </button>
        {lobbyError && <p className="text-red-500 mt-4">{lobbyError}</p>}
      </main>
      <footer className="absolute bottom-0 flex items-center justify-center w-full h-24 border-t bg-gray-100">
        <p className="text-gray-500">
          © {new Date().getFullYear()} Dominando
        </p>
      </footer>
    </div>
  );
}
