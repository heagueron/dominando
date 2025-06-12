// /home/heagueron/jmu/dominando/src/app/lobby/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDominoSocket } from '@/hooks/useDominoSocket';
import { useSession, signOut } from 'next-auth/react';
import Navbar from '@/components/layout/Navbar'; // Asumiendo que tienes un Navbar similar al de registro/login

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
  const { data: session, status: sessionStatus } = useSession();

  const [userId, setUserId] = useState<string | null>(null);
  const [nombreJugador, setNombreJugador] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<TipoJuegoSolicitado | null>(null);
  const [lobbyError, setLobbyError] = useState<string | null>(null); // Renombrado para evitar conflicto con error del hook
  const [userDataInitialized, setUserDataInitialized] = useState(false); // Para saber cuándo tenemos datos del usuario
  const tipoJuegoSolicitadoRef = useRef<TipoJuegoSolicitado | null>(null);
  const isNavigatingRef = useRef<boolean>(false); // Ref to track if navigation is in progress

  // Effect for handling NextAuth session and initializing user data
  useEffect(() => {
    console.log('[LOBBY_AUTH_EFFECT] Session status:', sessionStatus);
    if (sessionStatus === 'loading') {
      return; // No hagas nada mientras carga la sesión
    }

    if (sessionStatus === 'unauthenticated' || !session) {
      console.log('[LOBBY_AUTH_EFFECT] Usuario no autenticado, redirigiendo a signin.');
      router.push('/auth/signin?callbackUrl=/lobby');
      return;
    }

    // Usuario autenticado
    if (session && session.user) {
      const currentUserId = session.user.id;
      // Usar el nombre de la sesión, o el email como fallback, o un nombre genérico
      const currentNombreJugador = session.user.name || session.user.email || `Jugador ${currentUserId.slice(-4)}`;
      
      console.log(`[LOBBY_AUTH_EFFECT] Usuario autenticado: userId=${currentUserId}, nombreJugador=${currentNombreJugador}, isAdmin: ${session.user.is_admin}`);
      setUserId(currentUserId);
      setNombreJugador(currentNombreJugador);
      setUserDataInitialized(true); // Marcar que los datos del usuario están listos
    }
  }, [session, sessionStatus, router]);

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
    if (userDataInitialized && userId && nombreJugador) {
      console.log('[LOBBY_SOCKET_INIT] Datos de usuario listos, llamando a initializeSocketIfNeeded.');
      initializeSocketIfNeeded(userId, nombreJugador);
    }
  }, [userDataInitialized, userId, nombreJugador, initializeSocketIfNeeded]);


  // Effect for game-specific socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleTeUnisteAMesaCallback = (payload: TeUnisteAMesaPayloadLobby) => {
      console.log('[LOBBY_SOCKET] Evento servidor:teUnisteAMesa recibido:', payload);
      isNavigatingRef.current = true; // Set flag before navigating
      
      // userId y nombreJugador del estado de React deberían estar actualizados por el efecto de autenticación.
      console.log('[LOBBY_SOCKET] ANTES DE NAVEGAR A JUEGO - userId (estado):', userId, 'nombreJugador (estado):', nombreJugador);
      tipoJuegoSolicitadoRef.current = null; // Reset ref
      setIsLoading(null);
      setLobbyError(null);

      if (userId && nombreJugador) { 
        router.push(`/juego/${payload.mesaId}`); // El servidor ya conoce al usuario por su socket.id
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
  }, [socket, router, userId, nombreJugador, registerEventHandlers, unregisterEventHandlers]);

  const handleJoinGame = useCallback((tipoJuego: TipoJuegoSolicitado) => {
    // Asegurarse que los datos del usuario estén listos y tengamos la información necesaria
    if (!userDataInitialized || !nombreJugador || !userId ) {
      setLobbyError("El cliente no está listo. Por favor, espera un momento o recarga la página.");
      return;
    }
    // La comprobación de !socket y !emitEvent se hace implícitamente por isConnected
    console.log(`[LOBBY_SOCKET] handleJoinGame called for ${tipoJuego}`);
    setIsLoading(tipoJuego);
    setLobbyError(null);
    isNavigatingRef.current = false; // Reset navigation flag at the start of a join attempt
    tipoJuegoSolicitadoRef.current = tipoJuego; // Set the ref

    // Guardar el tipo de juego solicitado en sessionStorage (si aún lo necesitas para la página de juego)
    console.log(`[LOBBY_SOCKET] Guardando jmu_tipoJuegoSolicitado en sessionStorage: ${tipoJuego} (desde handleJoinGame)`);
    sessionStorage.setItem('jmu_tipoJuegoSolicitado', tipoJuego);

    if (isConnected) {
      console.log('[LOBBY_SOCKET] Socket already connected. Emitting cliente:unirseAMesa.');
      // El servidor ya debería conocer el nombre del jugador a través de la inicialización del socket
      emitEvent('cliente:unirseAMesa', { juegoSolicitado: tipoJuego /* userId y nombreJugador ya están asociados al socket en el servidor */ });
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
  }, [userDataInitialized, nombreJugador, userId, isConnected, emitEvent, initializeSocketIfNeeded]);

  useEffect(() => { if (socketError) setLobbyError(socketError); }, [socketError]);

  if (sessionStatus === 'loading' || !userDataInitialized) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <p>Cargando lobby y datos del jugador...</p>
          {/* O un componente de Spinner más elaborado */}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center">
        <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg p-6 mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
            ¡Bienvenido al Lobby, {nombreJugador}!
          </h1>
          <p className="text-gray-600 mb-1">Elige tu modo de juego para comenzar la diversión.</p>
          {session?.user?.is_admin && (
            <p className="text-sm text-blue-600 mt-1">(Rol: Administrador)</p>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="mt-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 text-sm"
          >
            Cerrar Sesión
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Card para Ronda Única */}
          <div className="bg-white shadow-lg rounded-lg p-6 flex flex-col items-center justify-between hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-2xl font-semibold mb-3 text-blue-600">Ronda Única</h2>
            <p className="text-gray-600 text-sm mb-4 text-center">
              Una partida rápida para demostrar quién es el mejor en una sola ronda. ¡Directo a la acción!
            </p>
            <button
              onClick={() => handleJoinGame('rondaUnica')}
              disabled={!!isLoading}
              className="w-full px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition duration-150 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading === 'rondaUnica' ? 'Uniéndote...' : 'Jugar Ronda Única'}
            </button>
          </div>

          {/* Card para Partida Completa */}
          <div className="bg-white shadow-lg rounded-lg p-6 flex flex-col items-center justify-between hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-2xl font-semibold mb-3 text-green-600">Partida Completa</h2>
            <p className="text-gray-600 text-sm mb-4 text-center">
              La experiencia clásica. Juega hasta alcanzar la puntuación objetivo. Estrategia y resistencia.
            </p>
            <button
              onClick={() => handleJoinGame('partidaCompleta')}
              disabled={!!isLoading || true} // Deshabilitado temporalmente hasta que esté lista
              className="w-full px-6 py-3 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition duration-150 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading === 'partidaCompleta' ? 'Uniéndote...' : 'Jugar Partida Completa'}
              {true && <span className="block text-xs mt-1">(Próximamente)</span>}
            </button>
          </div>
        </div>

        {lobbyError && (
          <p className="text-red-500 mt-6 text-center bg-red-100 border border-red-400 rounded p-3 w-full max-w-md">
            {lobbyError}
          </p>
        )}
      </main>
      <footer className="w-full py-6 text-center text-gray-500 border-t border-gray-200 mt-12">
        <p className="text-sm">
          © {new Date().getFullYear()} Dominando
        </p>
      </footer>
    </div>
  );
}
