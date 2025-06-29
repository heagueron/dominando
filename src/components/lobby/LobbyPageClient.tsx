// LobbyPageClient.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDominoSocket } from '@/hooks/useDominoSocket';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/layout/Navbar';
import TermsConfirmationModal from '@/components/layout/TermsConfirmationModal';
import { FiUsers } from 'react-icons/fi';

import MensajeEntradaBanner from './MensajeEntradaBanner';
import { EstadoMesaPublicoCliente, GameMode } from '@/types/domino';

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
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [userDataInitialized, setUserDataInitialized] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [mesas, setMesas] = useState<EstadoMesaPublicoCliente[]>([]);

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

  // Efecto para solicitar y escuchar la lista de mesas
  useEffect(() => {
    if (isConnected) {
      console.log('[LOBBY] Socket conectado. Solicitando lista de mesas.');
      emitEvent('cliente:solicitarListaDeMesas', {});

      const handleListaMesas = (listaMesas: EstadoMesaPublicoCliente[]) => {
        console.log('[LOBBY] Recibida lista de mesas actualizada:', listaMesas.map(m => ({id: m.mesaId, nombre: m.nombre, jugadores: m.jugadores.length})));
        setMesas(listaMesas);
      };

      registerEventHandlers({ 'servidor:listaDeMesasActualizada': handleListaMesas });

      return () => {
        unregisterEventHandlers(['servidor:listaDeMesasActualizada']);
      };
    }
  }, [isConnected, emitEvent, registerEventHandlers, unregisterEventHandlers]);


  useEffect(() => {
    if (!socket) return;
    
    const handleErrorDePartidaCallback = (payload: { mensaje: string }) => {
      console.error('[LOBBY_SOCKET] Error de partida desde el servidor:', payload.mensaje);
      setLobbyError(`Error del servidor: ${payload.mensaje}`);
    };

    const eventHandlers = {
      'servidor:errorDePartida': handleErrorDePartidaCallback,
    };
    registerEventHandlers(eventHandlers);

    return () => {
      unregisterEventHandlers(Object.keys(eventHandlers));
    };
  }, [socket, registerEventHandlers, unregisterEventHandlers]);

  const handleRegresarAMesa = useCallback((mesaId: string) => {
    router.push(`/juego/${mesaId}`);
  }, [router]);

  const handleSalirDeMesaDesdeLobby = useCallback((mesaId: string) => {
    if (isConnected && userId) {
      console.log(`[LOBBY] Saliendo de la mesa ${mesaId} desde el lobby.`);
      emitEvent('cliente:salirDeMesa', { mesaId });
      // No necesitamos navegar, el servidor enviará una actualización de la lista de mesas
      // y la UI se refrescará sola.
    } else {
      setLobbyError("No se pudo comunicar la salida al servidor. Revisa tu conexión.");
    }
  }, [isConnected, userId, emitEvent]);

  const handleUnirseAMesa = useCallback((mesaId: string) => {
    if (showTermsModal) {
      alert("Por favor, confirma los términos para poder jugar.");
      return;
    }
    if (!userDataInitialized || !nombreJugador || !userId) {
      setLobbyError("Tus datos de usuario no están listos. Por favor, espera o recarga.");
      return;
    }
    console.log(`[LOBBY] Navegando para unirse a la mesa ${mesaId}`);
    setLobbyError(null);

    if (isConnected) {
      // No emitimos el evento aquí, la página del juego lo hará.
      // Solo navegamos.
      router.push(`/juego/${mesaId}`);
    }  else {
      setLobbyError("No estás conectado al servidor. Intentando reconectar...");
      initializeSocketIfNeeded(userId, nombreJugador, userImageUrl || '');
    }
  }, [showTermsModal, userDataInitialized, nombreJugador, userId, userImageUrl, isConnected, initializeSocketIfNeeded, router]);

  useEffect(() => { if (socketError) setLobbyError(socketError); }, [socketError]);

  const handleConfirmTerms = async () => {
    setIsConfirming(true);
    setLobbyError(null);
    try {
      const response = await fetch('/api/user/accept-terms', {
        method: 'POST',
      });

      if (response.ok) {
        console.log('[LOBBY_TERMS] Respuesta de la API OK. Estado:', response.status);
        await updateSession({ termsAcceptedAt: new Date() });
        console.log('[LOBBY_TERMS] Sesión actualizada en el cliente.');
        setShowTermsModal(false);
        console.log('[LOBBY_TERMS] setShowTermsModal(false) llamado.');
      } else {
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

  useEffect(() => {
    console.log('[LOBBY_STATE_OBSERVER] showTermsModal ahora es:', showTermsModal);
  }, [showTermsModal]);

  const mesasAgrupadas = useMemo(() => {
    return mesas.reduce((acc, mesa) => {
      const modo = mesa.configuracionJuego.gameMode;
      if (!acc[modo]) {
        acc[modo] = [];
      }
      acc[modo].push(mesa);
      return acc;
    }, {} as Record<GameMode, EstadoMesaPublicoCliente[]>);
  }, [mesas]);

  const miMesaActual = useMemo(() => {
    if (!userId || !mesas) return null;
    // Encuentra la mesa donde el array de jugadores incluye mi ID
    return mesas.find(mesa => mesa.jugadores.some(j => j.id === userId));
  }, [mesas, userId]);


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

        {miMesaActual && (
          <motion.div
            variants={fadeInUp}
            className="w-full max-w-5xl mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-md text-center"
          >
            <p className="text-lg text-blue-800">
              Actualmente estás en la mesa: <span className="font-bold">{miMesaActual.nombre}</span>.
            </p>
          </motion.div>
        )}

        {Object.keys(mesasAgrupadas).length > 0 ? (
          Object.entries(mesasAgrupadas).map(([modo, listaDeMesas]) => (
            <motion.div key={modo} variants={fadeInUp} className="w-full max-w-5xl mb-12">
              <h2 className="text-3xl font-semibold border-b-2 border-blue-200 pb-2 mb-6 text-gray-700">
                {modo === GameMode.FULL_GAME ? 'Partidas Completas' : 'Rondas Únicas'}
              </h2>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr className="text-gray-500 uppercase text-sm">
                      <th className="py-3 px-6 font-semibold">Nombre de Mesa</th>
                      <th className="py-3 px-6 font-semibold">Jugadores</th>
                      <th className="py-3 px-6 font-semibold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {listaDeMesas.map(mesa => (
                      <tr key={mesa.mesaId} className="hover:bg-gray-50">
                        <td className="py-4 px-6 font-medium text-gray-900">{mesa.nombre}</td>
                        <td className="py-4 px-6 text-gray-600 flex items-center">
                          {`${mesa.jugadores.length} / ${mesa.configuracionJuego.maxJugadores}`}
                          <div className="ml-3 relative group">
                            <FiUsers className="text-gray-400" />
                            <div className="absolute bottom-full mb-2 w-48 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              {mesa.jugadores.length > 0 ? mesa.jugadores.map(j => j.nombre).join(', ') : 'Mesa vacía'}
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {miMesaActual?.mesaId === mesa.mesaId ? (
                            <div className="flex justify-end items-center gap-2">
                              <button
                                onClick={() => handleSalirDeMesaDesdeLobby(mesa.mesaId)}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
                              >
                                Salir
                              </button>
                              <button
                                onClick={() => handleRegresarAMesa(mesa.mesaId)}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
                              >
                                Regresar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleUnirseAMesa(mesa.mesaId)}
                              disabled={mesa.jugadores.length >= mesa.configuracionJuego.maxJugadores || !!miMesaActual}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                              Unirse
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ))
        ) : (
          <p className="text-center text-gray-500 mt-10">No hay mesas disponibles. El servidor podría estar iniciándose.</p>
        )}

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
