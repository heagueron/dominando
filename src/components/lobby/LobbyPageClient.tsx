// LobbyPageClient.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDominoSocket } from '@/hooks/useDominoSocket';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/layout/Navbar';
import TermsConfirmationModal from '@/components/layout/TermsConfirmationModal';
import { MatchCategory, GameMode } from '@/types/domino'; // Importamos los nuevos enums

import MensajeEntradaBanner from './MensajeEntradaBanner'; // Importamos el nuevo componente

// Tipos para los payloads de Socket.IO (simplificados para el lobby)
interface TeUnisteAMesaPayloadLobby {
  mesaId: string;
  tuJugadorIdEnPartida: string;
}

interface LobbyPageClientProps {
  randomMessage: {
    content: string;
    source: string | null;
  } | null;
}

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

export default function LobbyPageClient({ randomMessage }: LobbyPageClientProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus, update: updateSession } = useSession();

  const [userId, setUserId] = useState<string | null>(null);
  const [nombreJugador, setNombreJugador] = useState<string | null>(null); 
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<GameMode | null>(null); // Usar GameMode
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [userDataInitialized, setUserDataInitialized] = useState(false);
  const tipoJuegoSolicitadoRef = useRef<GameMode | null>(null); // Usar GameMode
  const isNavigatingRef = useRef<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    console.log('[LOBBY_AUTH_EFFECT] Session status:', sessionStatus);
    if (sessionStatus === 'loading') {
      return;
    }

    if (sessionStatus === 'unauthenticated' || !session) {
      console.log('[LOBBY_AUTH_EFFECT] Usuario no autenticado, redirigiendo a signin.');
      router.push('/auth/signin?callbackUrl=/lobby');
      return;
    }

    if (session && session.user) {
      const currentUserId = session.user.id;

      // Si `termsAcceptedAt` es null o undefined, mostramos el modal
      if (sessionStatus === 'authenticated' && !session.user.termsAcceptedAt) {
        setShowTermsModal(true);
      }
      const currentNombreJugador = session.user.name || session.user.email || `Jugador ${currentUserId.slice(-4)}`;
      const currentImageUrl = session.user.image || null;
      
      console.log(`[LOBBY_AUTH_EFFECT] Usuario autenticado: userId=${currentUserId}, nombreJugador=${currentNombreJugador}, imageUrl=${currentImageUrl}, isAdmin: ${session.user.is_admin}`);
      setUserId(currentUserId);
      setNombreJugador(currentNombreJugador);
      setUserImageUrl(currentImageUrl);
      setUserDataInitialized(true);
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

  useEffect(() => {
    const defaultTitle = "Lobby - FullDomino";
    if (nombreJugador) {
      const shortName = formatPlayerNameForTitle(nombreJugador);
      document.title = shortName ? `${shortName} - Lobby` : defaultTitle;
    } else {
      document.title = defaultTitle;
    }
  }, [nombreJugador]);

  const {
    socket, 
    isConnected, 
    socketError, 
    emitEvent, 
    registerEventHandlers, 
    unregisterEventHandlers,
    initializeSocketIfNeeded,
  } = useDominoSocket();

  useEffect(() => {
    if (userDataInitialized && userId && nombreJugador && userImageUrl !== undefined) {
      console.log('[LOBBY_SOCKET_INIT] Datos de usuario listos, llamando a initializeSocketIfNeeded.');
      initializeSocketIfNeeded(userId, nombreJugador, userImageUrl);
    }
  }, [userDataInitialized, userId, nombreJugador, userImageUrl, initializeSocketIfNeeded]);

  useEffect(() => {
    if (!socket) return;

    const handleTeUnisteAMesaCallback = (payload: TeUnisteAMesaPayloadLobby) => {
      console.log('[LOBBY_SOCKET] Evento servidor:teUnisteAMesa recibido:', payload);
      isNavigatingRef.current = true;
      
      console.log('[LOBBY_SOCKET] ANTES DE NAVEGAR A JUEGO - userId (estado):', userId, 'nombreJugador (estado):', nombreJugador);
      tipoJuegoSolicitadoRef.current = null;
      setIsLoading(null);
      setLobbyError(null);

      if (userId && nombreJugador) { 
        router.push(`/juego/${payload.mesaId}`);
      } else {
        console.error("[LOBBY_SOCKET] No se pudo navegar: userId o nombreJugador del estado de React son nulos.");
        setLobbyError("Error al preparar la navegación. Intenta de nuevo.");
      }
    };
    
    const handleErrorDePartidaCallback = (payload: { mensaje: string }) => {
      console.error('[LOBBY_SOCKET] Error de partida desde el servidor:', payload.mensaje);
      setLobbyError(`Error del servidor: ${payload.mensaje}`);
      setIsLoading(null);
      tipoJuegoSolicitadoRef.current = null;
      isNavigatingRef.current = false;
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

  const handleJoinGame = useCallback((gameMode: GameMode, matchCategory: MatchCategory) => {
    if (showTermsModal) {
      alert("Por favor, confirma los términos para poder jugar.");
      return;
    }

    if (!userDataInitialized || !nombreJugador || !userId || userImageUrl === undefined) {
      setLobbyError("El cliente no está listo. Por favor, espera un momento o recarga la página.");
      return;
    }
    console.log(`[LOBBY_SOCKET] handleJoinGame called for GameMode: ${gameMode}, MatchCategory: ${matchCategory}`);
    setIsLoading(gameMode); // isLoading sigue mostrando el modo de juego
    setLobbyError(null);
    isNavigatingRef.current = false;
    tipoJuegoSolicitadoRef.current = gameMode; // Guardar el gameMode en la ref

    console.log(`[LOBBY_SOCKET] Guardando jmu_tipoJuegoSolicitado en sessionStorage: ${gameMode} (desde handleJoinGame)`);
    sessionStorage.setItem('jmu_tipoJuegoSolicitado', gameMode); // Guardar el gameMode

    if (isConnected) {
      console.log('[LOBBY_SOCKET] Socket already connected. Emitting cliente:unirseAMesa.');
      emitEvent('cliente:unirseAMesa', { gameMode, matchCategory, nombreJugador }); // Enviar nuevos campos
    }  else {
      console.log('[LOBBY_SOCKET] Socket not connected. Intentando inicializar/conectar y luego unirse.');
      if (userId && nombreJugador && userImageUrl !== undefined) {
        initializeSocketIfNeeded(userId, nombreJugador, userImageUrl);
        setLobbyError("Conectando al servidor... Por favor, inténtalo de nuevo en unos segundos si esto falla.");
      } else {
        setLobbyError("Falta información del usuario para conectar.");
      }
    }
  }, [showTermsModal, userDataInitialized, nombreJugador, userId, userImageUrl, isConnected, emitEvent, initializeSocketIfNeeded]);

  useEffect(() => { if (socketError) setLobbyError(socketError); }, [socketError]);

  const handleConfirmTerms = async () => {
    setIsConfirming(true);
    setLobbyError(null); // Limpiar errores previos
    try {
      const response = await fetch('/api/user/accept-terms', {
        method: 'POST',
      });

      if (response.ok) {
        // Actualiza la sesión en el cliente para reflejar el cambio sin recargar
        console.log('[LOBBY_TERMS] Respuesta de la API OK. Estado:', response.status);
        await updateSession({ termsAcceptedAt: new Date() });
        console.log('[LOBBY_TERMS] Sesión actualizada en el cliente.');
        setShowTermsModal(false);
        // Este log mostrará el valor *antes* de que el re-render ocurra,
        // pero el useEffect de abajo confirmará el cambio.
        console.log('[LOBBY_TERMS] setShowTermsModal(false) llamado.');
      } else {
        // Manejar error, quizás mostrar una notificación
        const errorData = await response.json();
        console.error('[LOBBY_TERMS] Error de la API:', response.status, errorData);
        setLobbyError(`Error al confirmar términos: ${errorData.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error de red al aceptar los términos:', error);
      setLobbyError('Error de red. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Efecto para observar los cambios en el estado showTermsModal
  useEffect(() => {
    console.log('[LOBBY_STATE_OBSERVER] showTermsModal ahora es:', showTermsModal);
  }, [showTermsModal]);

  if (sessionStatus === 'loading' || !userDataInitialized) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <p>Cargando lobby y datos del jugador...</p>
        </main>
      </div>
    );
  }

  return (
    <>
      {showTermsModal && (
        <TermsConfirmationModal onConfirm={handleConfirmTerms} isConfirming={isConfirming} />
      )}
      <div className="min-h-screen bg-white text-gray-800 flex flex-col">
      <Navbar />
        <main className={`flex-grow pt-12 sm:pt-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center relative transition-all duration-300 ${showTermsModal ? 'blur-sm pointer-events-none' : ''}`}>
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="text-center mb-12 sm:mb-16 w-full max-w-4xl"
        >
          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 text-gray-800"
          >
            FullDomino
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            className="text-lg sm:text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
          >
            ¡Hola, {nombreJugador}! Elige tu modalidad y que comience la diversión.
          </motion.p>
          <div className="mt-4">
            {session?.user?.is_admin && (
              <p className="text-sm text-blue-600 mb-2">(Rol: Administrador)</p>
            )}
          </div>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid md:grid-cols-2 gap-8 sm:gap-12 w-full max-w-5xl"
        >
          <motion.div
            variants={fadeInUp}
            className="group cursor-pointer" 
            onClick={() => !isLoading && handleJoinGame(GameMode.SINGLE_ROUND, MatchCategory.FREE_PLAY)}
            whileHover={{ scale: !isLoading ? 1.02 : 1 }}
            whileTap={{ scale: !isLoading ? 0.98 : 1 }}
          >
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
                {isLoading === GameMode.SINGLE_ROUND ? 'Uniéndote...' : 'Jugar Ahora'}
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="group cursor-pointer" 
            // Habilitado para Partida Completa
            onClick={() => !isLoading && handleJoinGame(GameMode.FULL_GAME, MatchCategory.FREE_PLAY)}
            whileHover={{ scale: !isLoading ? 1.02 : 1 }}
            whileTap={{ scale: !isLoading ? 0.98 : 1 }}
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
                disabled={!!isLoading}
                className="w-full mt-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors duration-300 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading === GameMode.FULL_GAME ? 'Uniéndote...' : 'Jugar Ahora'}
                {/* {true && <span className="block text-xs mt-1">(Próximamente)</span>} */}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>

        {/* Aquí renderizamos el banner con el mensaje aleatorio */}
        {randomMessage && (
          <MensajeEntradaBanner content={randomMessage.content} source={randomMessage.source} />
        )}

        {lobbyError && (
          <p className="text-red-500 mt-6 text-center bg-red-100 border border-red-400 rounded p-3 w-full max-w-md">
            {lobbyError}
          </p>
        )}

      </main>
      <footer className="w-full py-8 text-center text-gray-500 bg-gray-50 border-t border-gray-200 mt-12">
        <p className="text-sm">
          © {new Date().getFullYear()} FullDomino
        </p>
      </footer>
      </div>
    </>
  );
}
