// /home/heagueron/jmu/dominando/src/app/lobby/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDominoSocket } from '@/hooks/useDominoSocket'; // Asegúrate que la ruta sea correcta


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

  // Ref para el nombre del jugador para estabilizar el callback onConnect
  const nombreJugadorRefForSocket = useRef(nombreJugador);
  useEffect(() => {
    nombreJugadorRefForSocket.current = nombreJugador;
  }, [nombreJugador]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const {
    socket, 
    isConnected, 
    error: socketError, 
    emitEvent, 
    connectSocket, 
    registerEventHandlers, 
    unregisterEventHandlers 
  } = useDominoSocket({
    userId: authInitialized ? userId : null, // Solo pasar si la autenticación está inicializada
    nombreJugador: authInitialized ? nombreJugador : null, // Solo pasar si la autenticación está inicializada
    autoConnect: false, // El lobby conecta bajo demanda
    onConnect: useCallback((emitFromHook: <T = any>(eventName: string, payload: T) => void) => { // Recibe emitEvent del hook
      console.log('[LOBBY_SOCKET_HOOK_ON_CONNECT] Successfully connected to server.');
      // Usar la ref para nombreJugador para asegurar la estabilidad del callback
      if (tipoJuegoSolicitadoRef.current && nombreJugadorRefForSocket.current) {
        console.log(`[LOBBY_SOCKET_HOOK_ON_CONNECT] Emitting cliente:unirseAMesa for ${tipoJuegoSolicitadoRef.current}`);
        emitFromHook('cliente:unirseAMesa', { // Usa el emitEvent proporcionado por el hook
          juegoSolicitado: tipoJuegoSolicitadoRef.current, 
          nombreJugador: nombreJugadorRefForSocket.current 
        });
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []), // Array de dependencias vacío para que el callback sea estable.

    onConnectError: useCallback((err: Error) => {
      console.error('[LOBBY_SOCKET_HOOK_ON_CONNECT_ERROR] Connection Error:', err.message, err);
      setLobbyError(`Error de conexión: ${err.message}. Intenta de nuevo.`);
      setIsLoading(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // setLobbyError e setIsLoading son estables (vienen de useState)
  });

  // Effect for game-specific socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleTeUnisteAMesaCallback = (payload: TeUnisteAMesaPayloadLobby) => {
      console.log('[LOBBY_SOCKET] Evento servidor:teUnisteAMesa recibido:', payload);
      isNavigatingRef.current = true; // Set flag before navigating
      const userIdForNav = userId; // Usar el estado de React que debería estar actualizado
      const nombreJugadorForNav = nombreJugador;
      console.log('[LOBBY_SOCKET] ANTES DE NAVEGAR A JUEGO - userId (estado React):', userIdForNav, 'nombreJugador (estado React):', nombreJugadorForNav);
      console.log('[LOBBY_SOCKET] ANTES DE NAVEGAR A JUEGO - sessionStorage userId:', sessionStorage.getItem('jmu_userId'), 'sessionStorage nombreJugador:', sessionStorage.getItem('jmu_nombreJugador'));
      tipoJuegoSolicitadoRef.current = null; // Reset ref
      setIsLoading(null);
      setLobbyError(null);
      if (userIdForNav && nombreJugadorForNav) {
        router.push(`/juego/${payload.mesaId}?uid=${encodeURIComponent(userIdForNav)}&nombre=${encodeURIComponent(nombreJugadorForNav)}`);
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
  // userId y nombreJugador se usan en handleTeUnisteAMesaCallback.
  // Para asegurar la estabilidad de este useEffect, los callbacks internos deberían ser memoizados
  // o userId/nombreJugador deberían ser accedidos mediante refs si es posible.
  // Por ahora, mantenemos userId y nombreJugador aquí, ya que el problema principal
  // parece ser la inicialización del hook useDominoSocket en sí.
  // Si el error persiste, este es el siguiente punto a revisar para la estabilidad de los handlers.
  // registerEventHandlers y unregisterEventHandlers deberían ser estables desde el hook.
  }, [socket, router, userId, nombreJugador, registerEventHandlers, unregisterEventHandlers]);

  const handleJoinGame = useCallback((tipoJuego: TipoJuegoSolicitado) => {
    if (!socket || !nombreJugador || !userId) {
      setLobbyError("El cliente no está listo. Por favor, espera un momento o recarga la página.");
      return;
    }
    
    console.log(`[LOBBY_SOCKET] handleJoinGame called for ${tipoJuego}`);
    setIsLoading(tipoJuego);
    setLobbyError(null);
    isNavigatingRef.current = false; // Reset navigation flag at the start of a join attempt
    tipoJuegoSolicitadoRef.current = tipoJuego; // Set the ref

    // Guardar el tipo de juego solicitado en sessionStorage INMEDIATAMENTE
    console.log(`[LOBBY_SOCKET] Guardando jmu_tipoJuegoSolicitado en sessionStorage: ${tipoJuego} (desde handleJoinGame)`);
    sessionStorage.setItem('jmu_tipoJuegoSolicitado', tipoJuego);

    if (isConnected) {
      console.log('[LOBBY_SOCKET] Socket already connected. Emitting cliente:unirseAPartida.');
      emitEvent('cliente:unirseAMesa', { juegoSolicitado: tipoJuego, nombreJugador });
    } else {
      console.log('[LOBBY_SOCKET] Socket not connected. Calling socket.connect().');
      connectSocket(); // Conectar el socket. La emisión se gestionará en el onConnect del hook.
    }
  }, [socket, nombreJugador, userId, isConnected, emitEvent, connectSocket]);

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
