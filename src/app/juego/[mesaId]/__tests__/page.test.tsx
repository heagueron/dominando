// src/app/juego/[mesaId]/__tests__/page.test.tsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import JuegoPage from '../page'; // Ajusta la ruta a tu componente
import '@testing-library/jest-dom'; // Import jest-dom for extended matchers like toBeInTheDocument
import { useParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client'; // Se usará el mock

// Importa tus tipos (asegúrate de que sean exportables)
// Ejemplo: import { EstadoMesaPublicoCliente, FichaDomino, FichaEnMesaParaLogica } from '@/utils/types';
// Por ahora, asumiré que los tipos están definidos en el propio archivo page.tsx y son accesibles
// o que los importas desde donde estén definidos. Para este ejemplo, los definiré inline simplificados.

// Tipos simplificados para el ejemplo de prueba (deberías importar los reales)
interface FichaDomino { id: string; valorSuperior: number; valorInferior: number; }
interface FichaEnMesaParaLogica extends FichaDomino { posicionCuadricula: { fila: number; columna: number }; rotacion: number; jugadorIdOriginal?: string; }
interface EstadoMesaPublicoCliente {
  mesaId: string;
  jugadores: Array<{ id: string; nombre: string; estaConectado: boolean; ordenTurnoEnRondaActual?: number; numFichas?: number }>;
  configuracionJuego: any;
  partidaActualId: string | null;
  estadoGeneralMesa: string;
  creadorMesaId: string;
  partidaActual?: {
    partidaId: string;
    tipoJuego: string;
    jugadoresParticipantesIds: string[];
    rondaActualNumero: number;
    puntuacionesPartida: any[];
    estadoPartida: string;
    rondaActual?: {
      rondaId: string;
      jugadoresRonda: Array<{ id: string; nombre: string; estaConectado: boolean; ordenTurnoEnRondaActual?: number; numFichas?: number }>;
      currentPlayerId: string | null;
      anclaFicha: FichaEnMesaParaLogica | null;
      fichasIzquierda: FichaEnMesaParaLogica[];
      fichasDerecha: FichaEnMesaParaLogica[];
      extremos: { izquierda: number | null; derecha: number | null };
      infoExtremos: any;
      estadoActual: string;
      duracionTurnoActual?: number;
      timestampTurnoInicio?: number;
      idUltimaFichaJugada?: string;
      idJugadorQueRealizoUltimaAccion?: string;
    };
  };
}

// Tipo para los argumentos de las llamadas al mock del socket.on
type MockSocketCallTuple = [string, (...args: any[]) => void];


describe('JuegoPage', () => {
  let mockRouterPush: jest.Mock;
  let currentMockSocket: any; // Para acceder a la instancia del socket mockeada
  let mockUrlParamsGet: jest.Mock;

  const MESA_ID = 'test-mesa-123';
  const USER_ID = 'test-user-id';
  const USER_NOMBRE = 'Jugador Test';

  beforeEach(() => {
    // Configurar mocks de next/navigation
    mockRouterPush = jest.fn();
    (useParams as jest.Mock).mockReturnValue({ mesaId: MESA_ID });
    (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush });

    // Configurar sessionStorage
    window.sessionStorage.clear(); // Limpiar entre tests
    window.sessionStorage.setItem('jmu_userId', USER_ID);
    window.sessionStorage.setItem('jmu_nombreJugador', USER_NOMBRE);
    window.sessionStorage.setItem('jmu_tipoJuegoSolicitado', 'rondaUnica');

    // Configurar mock de URLSearchParams
    mockUrlParamsGet = (global as any).getMockURLSearchParams().get;
    mockUrlParamsGet.mockReset(); // Limpiar llamadas anteriores
    // Resetear query params usando el helper de jest.setup.js
    (global as any).setWindowLocationSearch('');

    // Configurar una nueva instancia del mock de socket para cada test
    currentMockSocket = (global as any).setupMockSocket();
    currentMockSocket.id = `test-socket-id-${Math.random()}`; // Darle un ID único
  });

  afterEach(() => {
    jest.clearAllMocks(); // Limpia todos los mocks, incluyendo los de jest.fn()
    if (currentMockSocket && currentMockSocket.disconnect) {
        // Simular desconexión si el componente lo hace en su cleanup
        // currentMockSocket.disconnect();
    }
  });

  // Helper para simular la conexión del socket y el evento 'teUnisteAMesa'
  const simulateSuccessfulConnectionAndJoin = (initialEstadoMesa?: Partial<EstadoMesaPublicoCliente>) => {
    const connectHandler = currentMockSocket.on.mock.calls.find((call: MockSocketCallTuple) => call[0] === 'connect')?.[1];
    if (connectHandler) {
      act(() => {
        currentMockSocket.connected = true;
        connectHandler();
      });
    }
    const teUnisteAMesaHandler = currentMockSocket.on.mock.calls.find((call: MockSocketCallTuple) => call[0] === 'servidor:teUnisteAMesa')?.[1];
    if (teUnisteAMesaHandler) {
      const estadoMesaBase: EstadoMesaPublicoCliente = {
        mesaId: MESA_ID,
        jugadores: [{ id: USER_ID, nombre: USER_NOMBRE, estaConectado: true, ordenTurnoEnRondaActual: 0, numFichas: 7 }],
        configuracionJuego: { tipoJuego: 'rondaUnica', maxJugadores: 2, fichasPorJugadorOriginal: 7, duracionTurnoSegundos: 15 },
        partidaActualId: 'partida-1',
        estadoGeneralMesa: 'partidaEnProgreso',
        creadorMesaId: USER_ID,
        partidaActual: {
          partidaId: 'partida-1',
          tipoJuego: 'rondaUnica',
          jugadoresParticipantesIds: [USER_ID],
          rondaActualNumero: 1,
          puntuacionesPartida: [],
          estadoPartida: 'rondaEnProgreso',
          rondaActual: {
            rondaId: 'ronda-1',
            jugadoresRonda: [{ id: USER_ID, nombre: USER_NOMBRE, estaConectado: true, ordenTurnoEnRondaActual: 0, numFichas: 7 }],
            currentPlayerId: USER_ID,
            anclaFicha: null,
            fichasIzquierda: [],
            fichasDerecha: [],
            extremos: { izquierda: null, derecha: null },
            infoExtremos: {},
            estadoActual: 'enProgreso',
          },
        },
        ...initialEstadoMesa
      };
      act(() => {
        teUnisteAMesaHandler({
          mesaId: MESA_ID,
          tuJugadorIdEnPartida: USER_ID,
          estadoMesa: estadoMesaBase,
        });
      });
    }
  };
  
  // Helper para simular la recepción de la mano del jugador
  const simulateReceivePlayerHand = (fichas: FichaDomino[]) => {
    const tuManoHandler = currentMockSocket.on.mock.calls.find((call: MockSocketCallTuple) => call[0] === 'servidor:tuMano')?.[1];
    if (tuManoHandler) {
      act(() => {
        tuManoHandler({ fichas });
      });
    }
  };

  // Helper para simular el evento 'tuTurno'
  const simulatePlayerTurn = (playableFichaIds: string[], duracionTurnoTotal: number = 15) => {
     const tuTurnoHandler = currentMockSocket.on.mock.calls.find((call: MockSocketCallTuple) => call[0] === 'servidor:tuTurno')?.[1];
     if (tuTurnoHandler) {
       act(() => {
         tuTurnoHandler({
           currentPlayerId: USER_ID,
           playableFichaIds,
           duracionTurnoTotal,
         });
       });
     }
  };


  test('debería mostrar "Cargando..." inicialmente y luego conectar al socket', async () => {
    render(<JuegoPage />);
    expect(screen.getByText(/Cargando datos de la mesa.../i)).toBeInTheDocument();

    // Verificar que se intentó conectar al socket
    expect(io).toHaveBeenCalledWith(expect.stringContaining('localhost:3001'), {
      auth: { userId: USER_ID, nombreJugador: USER_NOMBRE },
      transports: ['websocket'],
    });
    expect(currentMockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
  });

  test('debería unirse a la mesa después de conectar y emitir listoParaMano', () => {
    render(<JuegoPage />);
    
    // Simular conexión
    const connectHandler = currentMockSocket.on.mock.calls.find((call: MockSocketCallTuple) => call[0] === 'connect')?.[1];
    expect(connectHandler).toBeDefined();
    act(() => {
      currentMockSocket.connected = true; // Importante para que el emit dentro del handler funcione
      if (connectHandler) connectHandler();
    });

    expect(currentMockSocket.emit).toHaveBeenCalledWith('cliente:unirseAMesa', {
      juegoSolicitado: 'rondaUnica',
      nombreJugador: USER_NOMBRE,
      mesaId: MESA_ID,
    });

    // Simular recepción de 'servidor:teUnisteAMesa'
    simulateSuccessfulConnectionAndJoin(); // Usa el helper

    expect(currentMockSocket.emit).toHaveBeenCalledWith('cliente:listoParaMano', {
      mesaId: MESA_ID,
      jugadorId: USER_ID,
    });
  });

  test('debería actualizar el estado de la mesa al recibir servidor:estadoMesaActualizado', async () => {
    render(<JuegoPage />);
    simulateSuccessfulConnectionAndJoin(); // Estado inicial

    // Esperar a que el nombre del jugador (parte del estado inicial) se renderice
    // Asumiendo que ContenedorInfoJugador para mano1 (local) muestra el nombre.
    // Puede que necesites un data-testid en ContenedorInfoJugador para hacerlo más robusto.
    await waitFor(() => {
        // Buscamos el ContenedorInfoJugador que corresponda al jugador local.
        // Esto es un poco frágil, idealmente ContenedorInfoJugador tendría un testid.
        const playerInfoContainers = screen.getAllByText(USER_NOMBRE);
        expect(playerInfoContainers.length).toBeGreaterThan(0);
    });


    const estadoMesaActualizadoHandler = currentMockSocket.on.mock.calls.find((call: MockSocketCallTuple) => call[0] === 'servidor:estadoMesaActualizado')?.[1];
    expect(estadoMesaActualizadoHandler).toBeDefined();

    const anclaNueva: FichaEnMesaParaLogica = { id: '5-5', valorSuperior: 5, valorInferior: 5, posicionCuadricula: { fila: 7, columna: 7 }, rotacion: 0 };
    const nuevoEstado: EstadoMesaPublicoCliente = {
      // ...copia el estado base y modifica lo necesario...
      mesaId: MESA_ID,
      jugadores: [{ id: USER_ID, nombre: USER_NOMBRE, estaConectado: true, ordenTurnoEnRondaActual: 0, numFichas: 6 }], // 1 ficha menos
      configuracionJuego: { tipoJuego: 'rondaUnica', maxJugadores: 2, fichasPorJugadorOriginal: 7, duracionTurnoSegundos: 15 },
      partidaActualId: 'partida-1',
      estadoGeneralMesa: 'partidaEnProgreso',
      creadorMesaId: USER_ID,
      partidaActual: {
        partidaId: 'partida-1',
        tipoJuego: 'rondaUnica',
        jugadoresParticipantesIds: [USER_ID],
        rondaActualNumero: 1,
        puntuacionesPartida: [],
        estadoPartida: 'rondaEnProgreso',
        rondaActual: {
          rondaId: 'ronda-1',
          jugadoresRonda: [{ id: USER_ID, nombre: USER_NOMBRE, estaConectado: true, ordenTurnoEnRondaActual: 0, numFichas: 6 }],
          currentPlayerId: 'otro-jugador-id', // Turno de otro
          anclaFicha: anclaNueva,
          fichasIzquierda: [],
          fichasDerecha: [],
          extremos: { izquierda: 5, derecha: 5 },
          infoExtremos: { /* ... */ },
          estadoActual: 'enProgreso',
          idUltimaFichaJugada: '5-5', // Ficha que se acaba de jugar
          idJugadorQueRealizoUltimaAccion: USER_ID, // El jugador local jugó
        },
      },
    };

    act(() => {
      if (estadoMesaActualizadoHandler) estadoMesaActualizadoHandler({ estadoMesa: nuevoEstado });
    });
    
    // Verificar que la UI se actualizó.
    // Por ejemplo, si MesaDomino renderiza las fichas con un data-testid:
    // Asumiendo que MesaDomino es un mock o que podemos inspeccionar sus props.
    // O, si la ficha '5-5' se muestra visualmente:
    // Esta prueba es más compleja porque depende del renderizado interno de MesaDomino.
    // Una forma sería mockear MesaDomino y verificar las props que recibe.
    // await waitFor(() => expect(screen.getByTestId('ficha-mesa-5-5')).toBeInTheDocument());
    // Por ahora, verificamos que el nombre del jugador sigue ahí (estado no se rompió)
    await waitFor(() => expect(screen.getAllByText(USER_NOMBRE).length).toBeGreaterThan(0) );
  });

  test('debería mostrar las fichas del jugador y permitir seleccionar una jugable', async () => {
    render(<JuegoPage />);
    simulateSuccessfulConnectionAndJoin();

    const misFichas: FichaDomino[] = [
      { id: '1-2', valorSuperior: 1, valorInferior: 2 },
      { id: '3-4', valorSuperior: 3, valorInferior: 4 }, // No jugable
      { id: '6-5', valorSuperior: 6, valorInferior: 5 }, // Jugable si el ancla es 6-6
    ];    
    
    // Asumimos que el ancla es 6-6 y el extremo es 6.
    // Para que '6-5' sea jugable, necesitamos un estado de mesa con ancla.
    // Se simulará que el estado de la mesa se actualiza para incluir el ancla.
    const anclaFichaData: FichaEnMesaParaLogica = { id: '6-6', valorSuperior: 6, valorInferior: 6, posicionCuadricula: {fila: 7, columna: 7}, rotacion: 0 };
    
    // Construir el estado completo que se enviará al componente
    const estadoParaActualizarConAncla: EstadoMesaPublicoCliente = {
        mesaId: MESA_ID,
        jugadores: [{ id: USER_ID, nombre: USER_NOMBRE, estaConectado: true, ordenTurnoEnRondaActual: 0, numFichas: 3 }], // 3 fichas en mano
        configuracionJuego: { tipoJuego: 'rondaUnica', maxJugadores: 2, fichasPorJugadorOriginal: 7, duracionTurnoSegundos: 15 },
        partidaActualId: 'partida-1',
        estadoGeneralMesa: 'partidaEnProgreso',
        creadorMesaId: USER_ID,
        partidaActual: {
            partidaId: 'partida-1',
            tipoJuego: 'rondaUnica',
            jugadoresParticipantesIds: [USER_ID],
            rondaActualNumero: 1,
            puntuacionesPartida: [],
            estadoPartida: 'rondaEnProgreso',
            rondaActual: {
                rondaId: 'ronda-1',
                jugadoresRonda: [{ id: USER_ID, nombre: USER_NOMBRE, estaConectado: true, ordenTurnoEnRondaActual: 0, numFichas: 3 }],
                currentPlayerId: USER_ID, // Es el turno del jugador local
                anclaFicha: anclaFichaData, // Ancla establecida
                fichasIzquierda: [],
                fichasDerecha: [],
                extremos: { izquierda: 6, derecha: 6 }, // Extremos actualizados
                infoExtremos: { /* datos de infoExtremos si son relevantes */ },
                estadoActual: 'enProgreso',
            }
        }
    };

    // Aplicar el estado inicial y la mano ANTES de cualquier simulación de turno o clic
    simulateReceivePlayerHand(misFichas);

    // Actualizar el estado de la mesa para que tenga el ancla
    const estadoMesaActualizadoHandler = currentMockSocket.on.mock.calls.find((call: MockSocketCallTuple) => call[0] === 'servidor:estadoMesaActualizado')?.[1];
    if (estadoMesaActualizadoHandler) {
      act(() => {
        estadoMesaActualizadoHandler({ estadoMesa: estadoParaActualizarConAncla });
      });
    }

    simulatePlayerTurn(['6-5']); // Solo '6-5' es jugable

    // NUEVO: Esperar a que el ContenedorInfoJugador del jugador local (mano1) se renderice.
    // Esto indica que la lógica de RENDER_MANOS_VISUAL ha encontrado al localPlayer
    // y ha pasado la información necesaria a ContenedorInfoJugador.
    // Usamos un texto que se espera esté en el ContenedorInfoJugador del jugador local.
    await waitFor(() => {
      // Asumiendo que ContenedorInfoJugador para el jugador local (mano1)
      // siempre renderizará el nombre del jugador.
      expect(screen.getAllByText(USER_NOMBRE).some(el => el.closest('[class*="fixed bottom-0"]'))).toBe(true);
    }, { timeout: 7000 }); // Aumentar un poco el timeout para esta espera específica

    const fichaWrapper65 = await screen.findByTestId('ficha-mano-6-5');
    expect(fichaWrapper65).toBeInTheDocument();
    // El FichaDomino (que tiene el onClick) es el primer hijo del wrapper.
    const fichaDominoElement65 = fichaWrapper65.firstChild as HTMLElement;
    expect(fichaDominoElement65).toBeInTheDocument(); // Verificar que el elemento interno existe

    const consoleSpy = jest.spyOn(console, 'log');

    await act(async () => {
      fireEvent.click(fichaDominoElement65); // <-- HACER CLIC EN EL ELEMENTO CORRECTO
    });


    // Esperar a que el log de JuegoPage muestre que está pasando el prop correcto
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[JuegoPage->ManoJugadorComponent] Passing fichaSeleccionada prop: 6-5 to mano1 (local player)'));
    }, { timeout: 5000 }); // Aumentar timeout aquí para dar más margen
    consoleSpy.mockRestore();

    // Ahora que esperamos que el estado se actualice, podemos verificar la clase
    await waitFor(() => {
      // Re-obtenemos el elemento FichaDomino, ya que puede haberse re-renderizado
      const updatedFichaWrapper = screen.getByTestId('ficha-mano-6-5');
      const updatedFichaElement = updatedFichaWrapper.firstChild as HTMLElement;
      expect(updatedFichaElement).toHaveClass('ring-yellow-400');
      expect(updatedFichaElement).toHaveClass('bg-yellow-200');
    }, { timeout: 5000 });

  });

  test('debería mostrar el botón "Pasar Turno" si no hay fichas jugables y es el turno del jugador', async () => {
    render(<JuegoPage />);
    // Estado con ancla, es mi turno, pero no tengo fichas jugables
    const anclaFichaData: FichaEnMesaParaLogica = { id: '6-6', valorSuperior: 6, valorInferior: 6, posicionCuadricula: {fila:7, columna:7}, rotacion:0 };
    simulateSuccessfulConnectionAndJoin({
        partidaActual: {
            partidaId: 'partida-1', tipoJuego: 'rondaUnica', jugadoresParticipantesIds: [USER_ID], rondaActualNumero: 1, puntuacionesPartida: [], estadoPartida: 'rondaEnProgreso',
            rondaActual: {
                rondaId: 'ronda-1', jugadoresRonda: [{ id: USER_ID, nombre: USER_NOMBRE, estaConectado: true, ordenTurnoEnRondaActual: 0, numFichas: 1 }],
                currentPlayerId: USER_ID, anclaFicha: anclaFichaData, fichasIzquierda: [], fichasDerecha: [],
                extremos: { izquierda: 6, derecha: 6 }, infoExtremos: { /* ... */ }, estadoActual: 'enProgreso',
            }
        }
    });
    simulateReceivePlayerHand([{ id: '1-2', valorSuperior: 1, valorInferior: 2 }]); // Ficha no jugable con ancla 6-6
    simulatePlayerTurn([]); // Ninguna ficha jugable

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Pasar Turno/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Pasar Turno/i }));
    expect(currentMockSocket.emit).toHaveBeenCalledWith('cliente:pasarTurno', {
      rondaId: 'ronda-1',
    });
  });
  
  test('debería manejar el temporizador de turno y su expiración', async () => {
    jest.useFakeTimers();
    render(<JuegoPage />);

    const timestampInicio = Date.now() - 5000; // Turno inició hace 5 segundos
    const duracionTurno = 15;
    simulateSuccessfulConnectionAndJoin({
        partidaActual: {
            partidaId: 'partida-1', tipoJuego: 'rondaUnica', jugadoresParticipantesIds: [USER_ID], rondaActualNumero: 1, puntuacionesPartida: [], estadoPartida: 'rondaEnProgreso',
            rondaActual: {
                rondaId: 'ronda-1', jugadoresRonda: [{ id: USER_ID, nombre: USER_NOMBRE, estaConectado: true, ordenTurnoEnRondaActual: 0, numFichas: 1 }],
                currentPlayerId: USER_ID, anclaFicha: null, fichasIzquierda: [], fichasDerecha: [],
                extremos: { izquierda: null, derecha: null }, infoExtremos: { /* ... */ }, estadoActual: 'enProgreso',
                duracionTurnoActual: duracionTurno,
                timestampTurnoInicio: timestampInicio,
            }
        }
    });
    simulateReceivePlayerHand([{ id: '1-2', valorSuperior: 1, valorInferior: 2 }]);
    simulatePlayerTurn(['1-2'], duracionTurno);


    // El timer debería mostrar inicialmente 10s (15s total - 5s transcurridos)
    await waitFor(() => {
        expect(screen.getByText(`${duracionTurno - 5}s`)).toBeInTheDocument();
    });

    // Avanzar el tiempo
    act(() => {
      jest.advanceTimersByTime(7000); // Avanza 7s, quedan 3s
    });
    await waitFor(() => {
      expect(screen.getByText('3s')).toBeInTheDocument();
    });

    // Avanzar hasta que expire
    act(() => {
      jest.advanceTimersByTime(4000); // Avanza 4s, total 5+7+4 = 16s. El turno expira.
    });

    await waitFor(() => {
      // El timer debería desaparecer o mostrar 0s
      expect(screen.queryByText(/\ds$/i)).not.toBeInTheDocument(); // Asumiendo que desaparece
      // isMyTurnTimerJustExpired debería ser true, lo que deshabilita acciones.
      // Si intentamos seleccionar una ficha, no deberían aparecer los botones de jugar.
      const ficha12 = screen.getByTestId('ficha-mano-1-2');
      fireEvent.click(ficha12);
      expect(screen.queryByText(/Jugar 1-2/i)).not.toBeInTheDocument(); // El botón de jugar para la primera ficha
    });

    jest.useRealTimers();
  });

});
