// page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDominoSocket } from '@/hooks/useDominoSocket';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/layout/Navbar'; // Asumiendo que tienes un Navbar similar al de registro/login

// Tipos para los payloads de Socket.IO (simplificados para el lobby)
interface TeUnisteAMesaPayloadLobby { // Renombrado y actualizado
  mesaId: string; // Cambiado de rondaId
  tuJugadorIdEnPartida: string;
  // estadoMesa: any; // El lobby podría no necesitar el estado completo de la mesa inicialmente
  // Podríamos añadir más info si es necesaria al unirse desde el lobby
}

export type TipoJuegoSolicitado = 'rondaUnica' | 'partidaCompleta';

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.3
    }
  }
};

export default function LobbyPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [userId, setUserId] = useState<string | null>(null);
  const [nombreJugador, setNombreJugador] = useState<string | null>(null);
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null); // Estado para la imagen
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
      const currentImageUrl = session.user.image || null; // Obtener la imagen
      
      console.log(`[LOBBY_AUTH_EFFECT] Usuario autenticado: userId=${currentUserId}, nombreJugador=${currentNombreJugador}, imageUrl=${currentImageUrl}, isAdmin: ${session.user.is_admin}`);
      setUserId(currentUserId);
      setNombreJugador(currentNombreJugador);
      setUserImageUrl(currentImageUrl); // Guardar la imagen
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
    const defaultTitle = "Lobby - FullDomino"; // Título base o el que tenías antes
    if (nombreJugador) {
      const shortName = formatPlayerNameForTitle(nombreJugador);
      document.title = shortName ? `${shortName} - Lobby` : defaultTitle;
    } else {
      document.title = defaultTitle;
    }
    // Opcional: Restaurar el título original cuando el componente se desmonte
    // return () => { document.title = "FullDomino"; }; // O el título global de tu app
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
    if (userDataInitialized && userId && nombreJugador && userImageUrl !== undefined) { // Añadir userImageUrl a la condición
      console.log('[LOBBY_SOCKET_INIT] Datos de usuario listos, llamando a initializeSocketIfNeeded.');
      initializeSocketIfNeeded(userId, nombreJugador, userImageUrl); // Pasar la imagen
    }
  }, [userDataInitialized, userId, nombreJugador, userImageUrl, initializeSocketIfNeeded]);


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
    if (!userDataInitialized || !nombreJugador || !userId || userImageUrl === undefined) { // Añadir userImageUrl
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
      if (userId && nombreJugador && userImageUrl !== undefined) { // Añadir userImageUrl
        initializeSocketIfNeeded(userId, nombreJugador, userImageUrl); // Pasar la imagen
        // Aquí podrías añadir una lógica para esperar a que isConnected sea true antes de emitir,
        // o confiar en que el usuario reintente si la conexión tarda.
        // Por simplicidad, asumimos que la conexión será rápida o el usuario reintentará.
        // Una mejor UX sería deshabilitar el botón hasta que isConnected sea true después de llamar a initialize.
        setLobbyError("Conectando al servidor... Por favor, inténtalo de nuevo en unos segundos si esto falla.");
      } else {
        setLobbyError("Falta información del usuario para conectar.");
      }
    }
  }, [userDataInitialized, nombreJugador, userId, userImageUrl, isConnected, emitEvent, initializeSocketIfNeeded]);

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
    // Cambiado a bg-white para consistencia con landing/register
    <div className="min-h-screen bg-white text-gray-800 flex flex-col">
      <Navbar />
      {/* Contenedor principal con padding superior para el Navbar */}
      <main className="flex-grow pt-12 sm:pt-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center relative">
        {/* Header del Lobby */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="text-center mb-12 sm:mb-16 w-full max-w-4xl"
        >
          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 text-gray-800" // Ajustado color
          >
            FullDomino
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            className="text-lg sm:text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed" // Ajustado color
          >
            ¡Hola, {nombreJugador}! Elige tu modalidad y que comience la diversión.
          </motion.p>
          <div className="mt-4">
            {session?.user?.is_admin && (
              <p className="text-sm text-blue-600 mb-2">(Rol: Administrador)</p>
            )}
          </div>
        </motion.div>

        {/* Game Mode Cards */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid md:grid-cols-2 gap-8 sm:gap-12 w-full max-w-5xl" // Aumentado max-w y gap
        >
          {/* Card para Ronda Única */}
          <motion.div
            variants={fadeInUp}
            className="group cursor-pointer"
            onClick={() => !isLoading && handleJoinGame("rondaUnica")}
            whileHover={{ scale: !isLoading ? 1.02 : 1 }}
            whileTap={{ scale: !isLoading ? 0.98 : 1 }}
          >
            {/* Cambiado a fondo blanco y estilos más claros */}
            <div className="bg-white rounded-2xl p-8 sm:p-10 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col justify-between">
              <div>
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-center mb-4 text-blue-600">
                  Ronda Única
                </h3>
                <p className="text-gray-600 text-center text-sm sm:text-base leading-relaxed mb-6">
                  Partidas rápidas e intensas. Perfectas para cuando tienes poco tiempo pero quieres diversión garantizada.
                </p>
              </div>
              <motion.button
                disabled={!!isLoading}
                className="w-full mt-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-300 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading === 'rondaUnica' ? 'Uniéndote...' : 'Jugar Ahora'}
              </motion.button>
            </div>
          </motion.div>

          {/* Card para Partida Completa */}
          <motion.div
            variants={fadeInUp}
            className="group cursor-pointer"
            // onClick={() => !isLoading && handleGameSelect("complete-game")} // Se usará handleJoinGame
            onClick={() => !(isLoading || true) && handleJoinGame("partidaCompleta")}
            whileHover={{ scale: !(isLoading || true) ? 1.02 : 1 }}
            whileTap={{ scale: !(isLoading || true) ? 0.98 : 1 }}
          >
            <div className="bg-white rounded-2xl p-8 sm:p-10 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col justify-between">
              <div>
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-teal-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-center mb-4 text-green-600">
                  Partida Completa
                </h3>
                <p className="text-gray-600 text-center text-sm sm:text-base leading-relaxed mb-6">
                  La experiencia tradicional completa. Múltiples rondas hasta alcanzar la puntuación objetivo.
                </p>
              </div>
              <motion.button
                disabled={!!isLoading || true} // Deshabilitado temporalmente
                className="w-full mt-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors duration-300 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading === 'partidaCompleta' ? 'Uniéndote...' : 'Jugar Ahora'}
                {true && <span className="block text-xs mt-1">(Próximamente)</span>}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>

        {lobbyError && (
          <p className="text-red-500 mt-6 text-center bg-red-100 border border-red-400 rounded p-3 w-full max-w-md">
            {lobbyError}
          </p>
        )}

        {/* Statistics Section (Comentado por ahora, requiere datos del backend) */}
        {/* 
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 sm:mt-20 text-center w-full max-w-4xl"
        >
          <div className="bg-gray-50 rounded-2xl p-8 sm:p-12 border border-gray-200 shadow-lg">
            <h3 className="text-2xl sm:text-3xl font-bold mb-8 text-gray-700">
              Estadísticas del Lobby
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-2">--</div>
                <div className="text-gray-500 text-sm">Jugadores en línea</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-cyan-600 mb-2">--</div>
                <div className="text-gray-500 text-sm">Partidas activas</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-green-600 mb-2">--</div>
                <div className="text-gray-500 text-sm">Mesas esperando</div>
              </div>
            </div>
          </div>
        </motion.div>
        */}
      </main>
      {/* Footer similar al de register/login */}
      <footer className="w-full py-8 text-center text-gray-500 bg-gray-50 border-t border-gray-200 mt-12">
        <p className="text-sm">
          © {new Date().getFullYear()} FullDomino
        </p>
      </footer>
    </div>
  );
}
