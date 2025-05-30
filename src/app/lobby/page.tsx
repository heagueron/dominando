// /home/heagueron/jmu/dominando/src/app/lobby/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

// Definir la URL del servidor Socket.IO
const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001';

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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [nombreJugador, setNombreJugador] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<TipoJuegoSolicitado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tipoJuegoSolicitadoRef = useRef<TipoJuegoSolicitado | null>(null); // Ref to store the type of game requested
  const isNavigatingRef = useRef<boolean>(false); // Ref to track if navigation is in progress

  // Effect for userId and nombreJugador initialization
  useEffect(() => {
    // Solo inicializar si el estado userId aún no está establecido.
    // Esto ayuda a prevenir que HMR regenere IDs si el acceso a sessionStorage es inestable durante HMR.
    if (!userId) {
      console.log('[LOBBY_USER_INIT] El estado userId es nulo. Inicializando...');
      let idFromStorage = sessionStorage.getItem('jmu_userId');
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
    } else {
      console.log(`[LOBBY_USER_INIT] El estado userId ya está establecido a: ${userId}. Omitiendo inicialización.`);
    }
  }, [userId]); // Añadir userId como dependencia para controlar la re-ejecución

  // Effect for socket creation and core connection/disconnection events
  useEffect(() => {
    if (!userId || !nombreJugador) return;

    const newSocket = io(SOCKET_SERVER_URL, {
      auth: {
        userId: userId,
        nombreJugador: nombreJugador,
      },
      transports: ['websocket'],
      autoConnect: false, // We will connect manually
    });
    setSocket(newSocket);
    console.log('[LOBBY_SOCKET] Socket instance created.');

    const handleConnect = () => {
      console.log('[LOBBY_SOCKET] Successfully connected to server:', newSocket.id);
      // If a game type was requested, emit unirseAPartida
      if (tipoJuegoSolicitadoRef.current && nombreJugador) {
        console.log(`[LOBBY_SOCKET] Emitting cliente:unirseAMesa for ${tipoJuegoSolicitadoRef.current}`);
        newSocket.emit('cliente:unirseAMesa', { // Evento cambiado
          juegoSolicitado: tipoJuegoSolicitadoRef.current, 
          nombreJugador 
        });
      }
    };

    const handleConnectError = (err: Error) => {
      console.error('[LOBBY_SOCKET] Connection Error:', err.message, err);
      setError(`Error de conexión: ${err.message}. Intenta de nuevo.`);
      setIsLoading(null); // Reset loading state on error
      // newSocket.disconnect(); // Socket.IO client will attempt to reconnect by default.
                           // For a lobby, failing fast might be okay. If so, uncomment.
    };

    const handleDisconnect = (reason: Socket.DisconnectReason) => {
      console.log('[LOBBY_SOCKET] Disconnected from server:', reason);
      // if (isLoading) { // If disconnected while trying to join
      //    setError('Desconectado. Intenta de nuevo.');
      //    setIsLoading(null);
      // }
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('connect_error', handleConnectError);
    newSocket.on('disconnect', handleDisconnect);

    return () => {
      console.log(`[LOBBY_SOCKET] Cleaning up core socket. isNavigating: ${isNavigatingRef.current}`);
      newSocket.off('connect', handleConnect);
      newSocket.off('connect_error', handleConnectError);
      newSocket.off('disconnect', handleDisconnect);
      if (!isNavigatingRef.current) { // Only disconnect if not navigating away
        newSocket.disconnect();
      }
      setSocket(null); 
    };
  }, [userId, nombreJugador]); // Only re-run if userId or nombreJugador changes

  // Effect for game-specific socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleTeUnisteAMesa = (payload: TeUnisteAMesaPayloadLobby) => { // Evento y payload actualizados
      console.log('[LOBBY_SOCKET] Evento servidor:teUnisteAMesa recibido:', payload);
      // jmu_tipoJuegoSolicitado ya debería estar en sessionStorage desde handleJoinGame.
      // Solo verificamos por robustez, pero no deberíamos depender de tipoJuegoSolicitadoRef.current aquí para esto.
      // if (tipoJuegoSolicitadoRef.current) {
      //   sessionStorage.setItem('jmu_tipoJuegoSolicitado', tipoJuegoSolicitadoRef.current);
      // }
      isNavigatingRef.current = true; // Set flag before navigating
      // AÑADIR ESTE LOG:
      const userIdForNav = userId; // Usar el estado de React que debería estar actualizado
      const nombreJugadorForNav = nombreJugador;
      console.log('[LOBBY_SOCKET] ANTES DE NAVEGAR A JUEGO - userId (estado React):', userIdForNav, 'nombreJugador (estado React):', nombreJugadorForNav);
      console.log('[LOBBY_SOCKET] ANTES DE NAVEGAR A JUEGO - sessionStorage userId:', sessionStorage.getItem('jmu_userId'), 'sessionStorage nombreJugador:', sessionStorage.getItem('jmu_nombreJugador'));
      tipoJuegoSolicitadoRef.current = null; // Reset ref
      setIsLoading(null);
      setError(null);
      // Pasar userId y nombreJugador como query params
      if (userIdForNav && nombreJugadorForNav) {
        router.push(`/juego/${payload.mesaId}?uid=${encodeURIComponent(userIdForNav)}&nombre=${encodeURIComponent(nombreJugadorForNav)}`);
      } else {
        console.error("[LOBBY_SOCKET] No se pudo navegar: userId o nombreJugador del estado de React son nulos.");
        setError("Error al preparar la navegación. Intenta de nuevo.");
      }
    };
    
    const handleErrorDePartida = (payload: { mensaje: string }) => { // Nombre corregido para consistencia
      console.error('[LOBBY_SOCKET] Error de partida desde el servidor:', payload.mensaje);
      setError(`Error del servidor: ${payload.mensaje}`);
      setIsLoading(null);
      tipoJuegoSolicitadoRef.current = null; // Reset ref
      isNavigatingRef.current = false; // Reset flag on error
      // socket.disconnect(); // Consider if lobby socket should disconnect on game error
    };
    // Escuchar el nuevo evento del servidor
    socket.on('servidor:teUnisteAMesa', handleTeUnisteAMesa); // Evento cambiado
    socket.on('servidor:errorDePartida', handleErrorDePartida); 

    return () => {
      // console.log('[LOBBY_SOCKET] Cleaning up game-specific socket listeners.'); // Less critical to log this one
      socket.off('servidor:teUnisteAMesa', handleTeUnisteAMesa); // Evento cambiado
      socket.off('servidor:errorDePartida', handleErrorDePartida);
    };
  }, [socket, router]); // Re-run if socket instance or router changes

  const handleJoinGame = useCallback((tipoJuego: TipoJuegoSolicitado) => {
    if (!socket || !nombreJugador || !userId) {
      setError("El cliente no está listo. Por favor, espera un momento o recarga la página.");
      return;
    }
    
    console.log(`[LOBBY_SOCKET] handleJoinGame called for ${tipoJuego}`);
    setIsLoading(tipoJuego);
    setError(null);
    isNavigatingRef.current = false; // Reset navigation flag at the start of a join attempt
    tipoJuegoSolicitadoRef.current = tipoJuego; // Set the ref

    // Guardar el tipo de juego solicitado en sessionStorage INMEDIATAMENTE
    console.log(`[LOBBY_SOCKET] Guardando jmu_tipoJuegoSolicitado en sessionStorage: ${tipoJuego} (desde handleJoinGame)`);
    sessionStorage.setItem('jmu_tipoJuegoSolicitado', tipoJuego);

    if (socket.connected) {
      console.log('[LOBBY_SOCKET] Socket already connected. Emitting cliente:unirseAPartida.');
      socket.emit('cliente:unirseAMesa', { juegoSolicitado: tipoJuego, nombreJugador }); // Evento cambiado
    } else {
      console.log('[LOBBY_SOCKET] Socket not connected. Calling socket.connect().');
      socket.connect(); // Conectar el socket
      // La emisión se gestionará en el listener del evento 'connect' del socket
    }
  }, [socket, nombreJugador, userId]);

  if (!userId || !nombreJugador) {
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
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </main>
      <footer className="absolute bottom-0 flex items-center justify-center w-full h-24 border-t bg-gray-100">
        <p className="text-gray-500">
          © {new Date().getFullYear()} Dominando
        </p>
      </footer>
    </div>
  );
}
