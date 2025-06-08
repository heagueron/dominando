// /home/heagueron/jmu/dominando/src/app/juego/[mesaId]/__tests__/page.test.tsx
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
// import userEvent from '@testing-library/user-event'; // No se usa userEvent en las pruebas actuales, se puede quitar si no se añade
import JuegoPage from '../page';
import { FichaDomino }  from '@/utils/dominoUtils'; // Asegúrate que JugadorPublico se usa o quítalo
import { EstadoMesaPublicoCliente } from '@/types/domino';; // Asegúrate que JugadorPublico se usa o quítalo
import { FichaEnMesaParaLogica } from '@/utils/dominoUtils'; // Importar el tipo correcto
import { useDominoSocket, UseDominoSocketProps, UseDominoSocketReturn } from '@/hooks/useDominoSocket';
import { Socket } from 'socket.io-client'; // Necesario para tipar el mockSocketObject
import '@testing-library/jest-dom';
import { useParams, useRouter } from 'next/navigation';

// Constantes de prueba
const MESA_ID = 'test-mesa-123';
const USER_ID = 'user-test-id'; // Cambiado de 'user-test-id' a USER_ID para consistencia
const USER_NOMBRE = 'Jugador Test'; // Cambiado de 'JugadorTest' a USER_NOMBRE para consistencia

// Mock para el custom hook useDominoSocket
jest.mock('@/hooks/useDominoSocket');

// Mock para next/navigation
let mockRouterPush: jest.Mock;
(useParams as jest.Mock) = jest.fn();
(useRouter as jest.Mock) = jest.fn();


// Variables para controlar el mock de useDominoSocket
let mockEmitEvent: jest.Mock;
let mockConnectSocket: jest.Mock;
let mockDisconnectSocket: jest.Mock;
let mockRegisterEventHandlers: jest.Mock;
let mockUnregisterEventHandlers: jest.Mock;
let mockIsConnected: boolean;
let mockHookError: string | null;
let mockSocketObject: Partial<Socket>; // Un objeto Socket parcial para el `socket` devuelto por el hook

// Callbacks capturados del hook
let capturedOnConnect: UseDominoSocketProps['onConnect'];
let capturedOnDisconnect: UseDominoSocketProps['onDisconnect'];
let capturedOnConnectError: UseDominoSocketProps['onConnectError'];
let registeredEventHandlers: Record<string, (...args: any[]) => void> = {};

const mockUseDominoSocket = useDominoSocket as jest.MockedFunction<typeof useDominoSocket>;

// Estado base de la mesa para las pruebas
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
};

describe('JuegoPage', () => {
  let mockUrlParamsGet: jest.Mock; // Definido aquí para que esté en el scope de beforeEach

  beforeEach(() => {
    mockRouterPush = jest.fn();
    (useParams as jest.Mock).mockReturnValue({ mesaId: MESA_ID });
    (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush });

    // Configuración inicial del mock de useDominoSocket
    mockEmitEvent = jest.fn();
    mockConnectSocket = jest.fn(() => {
      if (!mockIsConnected) {
        mockIsConnected = true;
        mockHookError = null;
        if (mockSocketObject) mockSocketObject.connected = true;
        const connectHandler = capturedOnConnect; // Asignar a una constante local
        if (connectHandler) { // Verificar la constante local
          act(() => {
            connectHandler(mockEmitEvent); // Usar la constante local
          });
        }
      }
    });
    mockDisconnectSocket = jest.fn(() => {
      if (mockIsConnected) {
        mockIsConnected = false;
        if (mockSocketObject) mockSocketObject.connected = false;
        const disconnectHandler = capturedOnDisconnect; // Asignar a una constante local
        if (disconnectHandler) { // Verificar la constante local
          act(() => {
            disconnectHandler('io client disconnect'); // Usar la constante local
          });
        }
      }
    });
    mockRegisterEventHandlers = jest.fn((handlers) => {
      registeredEventHandlers = { ...registeredEventHandlers, ...handlers };
    });
    mockUnregisterEventHandlers = jest.fn((eventNames: string[]) => {
      eventNames.forEach((name: string) => delete registeredEventHandlers[name]);
    });
    mockIsConnected = false;
    mockHookError = null;
    mockSocketObject = { id: `mock-socket-${Math.random()}`, connected: false };

    mockUseDominoSocket.mockImplementation((props: UseDominoSocketProps): UseDominoSocketReturn => {
      capturedOnConnect = props.onConnect;
      capturedOnDisconnect = props.onDisconnect;
      capturedOnConnectError = props.onConnectError;

      if (props.autoConnect && props.onConnect) {
        // props.onConnect está garantizado que no es undefined aquí debido a la condición.
        const onConnectCallbackFromProps = props.onConnect;
        Promise.resolve().then(() => {
          if (!mockIsConnected) {
            mockIsConnected = true;
            if (mockSocketObject) mockSocketObject.connected = true;
            mockHookError = null;
            act(() => {
                onConnectCallbackFromProps(mockEmitEvent); // Llamar directamente usando la constante derivada de props
            });
          }
        });
      }

      return {
        socket: mockSocketObject as Socket,
        isConnected: mockIsConnected,
        error: mockHookError,
        emitEvent: mockEmitEvent,
        connectSocket: mockConnectSocket,
        disconnectSocket: mockDisconnectSocket,
        registerEventHandlers: mockRegisterEventHandlers,
        unregisterEventHandlers: mockUnregisterEventHandlers,
      };
    });

    // Mock de sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
    (window.sessionStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'jmu_userId') return USER_ID;
        if (key === 'jmu_nombreJugador') return USER_NOMBRE;
        if (key === 'jmu_tipoJuegoSolicitado') return 'rondaUnica';
        return null;
    });

    // Configurar mock de URLSearchParams
    // Asumiendo que tienes un setup global para esto o lo haces aquí
    mockUrlParamsGet = jest.fn();
    const mockURLSearchParams = { get: mockUrlParamsGet };
    jest.spyOn(global, 'URLSearchParams').mockImplementation(() => mockURLSearchParams as any);
    // Resetear query params
    // Usar history.replaceState para modificar la URL de forma segura en JSDOM.
    // Esto establecerá window.location.search en "" si el pathname no contiene un query string.
    const currentPathname = window.location.pathname; // Preserva el pathname actual
    history.replaceState(null, '', currentPathname);
  });

  afterEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    (sessionStorage.getItem as jest.Mock).mockClear();
    registeredEventHandlers = {};
    capturedOnConnect = undefined;
    capturedOnDisconnect = undefined;
    capturedOnConnectError = undefined;
  });

  const simulateSuccessfulConnectionAndJoin = (initialEstadoMesa?: Partial<EstadoMesaPublicoCliente>) => {
    const teUnisteAMesaHandler = registeredEventHandlers['servidor:teUnisteAMesa'];
    if (teUnisteAMesaHandler) {
      const estadoMesaCompleto = { ...estadoMesaBase, ...initialEstadoMesa };
      act(() => {
        teUnisteAMesaHandler({
          mesaId: MESA_ID,
          tuJugadorIdEnPartida: USER_ID,
          estadoMesa: estadoMesaCompleto,
        });
      });
    } else {
      console.warn("Handler para 'servidor:teUnisteAMesa' no fue registrado por JuegoPage a través del hook.");
    }
  };
  
  const simulateReceivePlayerHand = (fichas: FichaDomino[]) => {
    const tuManoHandler = registeredEventHandlers['servidor:tuMano'];
    if (tuManoHandler) {
      act(() => {
        tuManoHandler({ fichas });
      });
    } else {
        console.warn("Handler para 'servidor:tuMano' no fue registrado.");
    }
  };

  const simulatePlayerTurn = (playableFichaIds: string[], duracionTurnoTotal: number = 15, currentPlayerId: string = USER_ID) => {
     const tuTurnoHandler = registeredEventHandlers['servidor:tuTurno'];
     if (tuTurnoHandler) {
       act(() => {
         tuTurnoHandler({
           currentPlayerId: currentPlayerId,
           playableFichaIds,
           duracionTurnoTotal,
         });
       });
     } else {
        console.warn("Handler para 'servidor:tuTurno' no fue registrado.");
     }
  };


  test('debería mostrar "Cargando..." inicialmente y luego conectar al socket', async () => {
    render(<JuegoPage />);
    expect(screen.getByText(/Cargando datos de la mesa.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockUseDominoSocket).toHaveBeenCalledWith(expect.objectContaining({
        userId: USER_ID,
        nombreJugador: USER_NOMBRE,
        autoConnect: true,
        onConnect: expect.any(Function),
      }));
    });

    await waitFor(() => {
      expect(mockEmitEvent).toHaveBeenCalledWith('cliente:unirseAMesa', {
        juegoSolicitado: 'rondaUnica',
        nombreJugador: USER_NOMBRE, // JuegoPage lo envía en su onConnect
        mesaId: MESA_ID,
      });
    });
  });

  test('debería unirse a la mesa después de conectar y emitir listoParaMano', async () => {
    render(<JuegoPage />);
    
    await waitFor(() => {
      expect(mockEmitEvent).toHaveBeenCalledWith('cliente:unirseAMesa', expect.objectContaining({
        mesaId: MESA_ID,
      }));
    });

    simulateSuccessfulConnectionAndJoin();

    expect(mockEmitEvent).toHaveBeenCalledWith('cliente:listoParaMano', {
      mesaId: MESA_ID,
      jugadorId: USER_ID,
    });
  });

  test('debería actualizar el estado de la mesa al recibir servidor:estadoMesaActualizado', async () => {
    render(<JuegoPage />);
    
    await waitFor(() => { // Esperar conexión y unión inicial
        expect(mockEmitEvent).toHaveBeenCalledWith('cliente:unirseAMesa', expect.anything());
    });
    simulateSuccessfulConnectionAndJoin(); 

    await waitFor(() => {
        const playerInfoContainers = screen.getAllByText(USER_NOMBRE);
        expect(playerInfoContainers.length).toBeGreaterThan(0);
    });

    const estadoMesaActualizadoHandler = registeredEventHandlers['servidor:estadoMesaActualizado'];
    expect(estadoMesaActualizadoHandler).toBeDefined();

    const anclaNueva: FichaEnMesaParaLogica = { id: '5-5', valorSuperior: 5, valorInferior: 5, posicionCuadricula: { fila: 7, columna: 7 }, rotacion: 0 };
    const nuevoEstado: EstadoMesaPublicoCliente = {
      ...estadoMesaBase, // Usar el base y sobreescribir
      jugadores: [{ id: USER_ID, nombre: USER_NOMBRE, estaConectado: true, ordenTurnoEnRondaActual: 0, numFichas: 6 }],
      partidaActual: {
        ...estadoMesaBase.partidaActual!,
        rondaActual: {
          ...estadoMesaBase.partidaActual!.rondaActual!,
          jugadoresRonda: [{ id: USER_ID, nombre: USER_NOMBRE, estaConectado: true, ordenTurnoEnRondaActual: 0, numFichas: 6 }],
          currentPlayerId: 'otro-jugador-id',
          anclaFicha: anclaNueva,
          extremos: { izquierda: 5, derecha: 5 },
          idUltimaFichaJugada: '5-5',
          idJugadorQueRealizoUltimaAccion: USER_ID,
        },
      },
    };

    act(() => {
      if (estadoMesaActualizadoHandler) estadoMesaActualizadoHandler({ estadoMesa: nuevoEstado });
    });
    
    await waitFor(() => expect(screen.getAllByText(USER_NOMBRE).length).toBeGreaterThan(0) );
    // Aquí podrías añadir una verificación más específica si MesaDomino renderiza la ficha '5-5'
    // Por ejemplo, si MesaDomino tuviera un testid para las fichas en mesa:
    // await waitFor(() => expect(screen.getByTestId('ficha-en-mesa-5-5')).toBeInTheDocument());
  });

  test('debería mostrar las fichas del jugador y permitir seleccionar una jugable', async () => {
    render(<JuegoPage />);
    
    await waitFor(() => { // Esperar conexión y unión inicial
        expect(mockEmitEvent).toHaveBeenCalledWith('cliente:unirseAMesa', expect.anything());
    });

    const misFichas: FichaDomino[] = [
      { id: '1-2', valorSuperior: 1, valorInferior: 2 },
      { id: '3-4', valorSuperior: 3, valorInferior: 4 },
      { id: '6-5', valorSuperior: 6, valorInferior: 5 },
    ];    
    
    const anclaFichaData: FichaEnMesaParaLogica = { id: '6-6', valorSuperior: 6, valorInferior: 6, posicionCuadricula: {fila: 7, columna: 7}, rotacion: 0 };
    
    const estadoParaActualizarConAncla: EstadoMesaPublicoCliente = {
        ...estadoMesaBase,
        jugadores: [{ id: USER_ID, nombre: USER_NOMBRE, estaConectado: true, ordenTurnoEnRondaActual: 0, numFichas: 3 }],
        partidaActual: {
            ...estadoMesaBase.partidaActual!,
            rondaActual: {
                ...estadoMesaBase.partidaActual!.rondaActual!,
                jugadoresRonda: [{ id: USER_ID, nombre: USER_NOMBRE, estaConectado: true, ordenTurnoEnRondaActual: 0, numFichas: 3 }],
                currentPlayerId: USER_ID,
                anclaFicha: anclaFichaData,
                extremos: { izquierda: 6, derecha: 6 },
            }
        }
    };

    // Simular la unión y luego la recepción del estado con ancla
    simulateSuccessfulConnectionAndJoin(estadoParaActualizarConAncla);
    simulateReceivePlayerHand(misFichas);
    simulatePlayerTurn(['6-5']); // Solo '6-5' es jugable

    await waitFor(() => {
      expect(screen.getAllByText(USER_NOMBRE).some(el => el.closest('[class*="fixed bottom-0"]'))).toBe(true);
    }, { timeout: 7000 });

    const fichaWrapper65 = await screen.findByTestId('ficha-mano-6-5');
    expect(fichaWrapper65).toBeInTheDocument();
    const fichaDominoElement65 = fichaWrapper65.firstChild as HTMLElement;
    expect(fichaDominoElement65).toBeInTheDocument();

    const consoleSpy = jest.spyOn(console, 'log');

    await act(async () => {
      fireEvent.click(fichaDominoElement65);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[JuegoPage->ManoJugadorComponent] Passing fichaSeleccionada prop: 6-5 to mano1 (local player)'));
    }, { timeout: 5000 });
    consoleSpy.mockRestore();

    await waitFor(() => {
      const updatedFichaWrapper = screen.getByTestId('ficha-mano-6-5');
      const updatedFichaElement = updatedFichaWrapper.firstChild as HTMLElement;
      expect(updatedFichaElement).toHaveClass('ring-yellow-400');
      expect(updatedFichaElement).toHaveClass('bg-yellow-200');
    }, { timeout: 5000 });
  });

  test('debería mostrar el botón "Pasar Turno" si no hay fichas jugables y es el turno del jugador', async () => {
    render(<JuegoPage />);
    
    await waitFor(() => { // Esperar conexión y unión inicial
        expect(mockEmitEvent).toHaveBeenCalledWith('cliente:unirseAMesa', expect.anything());
    });

    const anclaFichaData: FichaEnMesaParaLogica = { id: '6-6', valorSuperior: 6, valorInferior: 6, posicionCuadricula: {fila:7, columna:7}, rotacion:0 };
    simulateSuccessfulConnectionAndJoin({
        ...estadoMesaBase,
        partidaActual: {
            ...estadoMesaBase.partidaActual!,
            rondaActual: {
                ...estadoMesaBase.partidaActual!.rondaActual!,
                jugadoresRonda: [{ id: USER_ID, nombre: USER_NOMBRE, estaConectado: true, ordenTurnoEnRondaActual: 0, numFichas: 1 }],
                currentPlayerId: USER_ID, 
                anclaFicha: anclaFichaData, 
                extremos: { izquierda: 6, derecha: 6 },
            }
        }
    });
    simulateReceivePlayerHand([{ id: '1-2', valorSuperior: 1, valorInferior: 2 }]);
    simulatePlayerTurn([]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Pasar Turno/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Pasar Turno/i }));
    expect(mockEmitEvent).toHaveBeenCalledWith('cliente:pasarTurno', {
      rondaId: 'ronda-1', // Asumiendo que el rondaId es 'ronda-1' del estadoMesaBase
    });
  });
  
  test('debería manejar el temporizador de turno y su expiración', async () => {
    jest.useFakeTimers();
    render(<JuegoPage />);

    await waitFor(() => { // Esperar conexión y unión inicial
        expect(mockEmitEvent).toHaveBeenCalledWith('cliente:unirseAMesa', expect.anything());
    });

    const timestampInicio = Date.now() - 5000; 
    const duracionTurno = 15;
    simulateSuccessfulConnectionAndJoin({
        ...estadoMesaBase,
        partidaActual: {
            ...estadoMesaBase.partidaActual!,
            rondaActual: {
                ...estadoMesaBase.partidaActual!.rondaActual!,
                jugadoresRonda: [{ id: USER_ID, nombre: USER_NOMBRE, estaConectado: true, ordenTurnoEnRondaActual: 0, numFichas: 1 }],
                currentPlayerId: USER_ID, 
                duracionTurnoActual: duracionTurno,
                timestampTurnoInicio: timestampInicio,
            }
        }
    });
    simulateReceivePlayerHand([{ id: '1-2', valorSuperior: 1, valorInferior: 2 }]);
    simulatePlayerTurn(['1-2'], duracionTurno);

    // At this point, tiempoTurnoRestante should be 10.
    // We'll advance the timer and check the consequences,
    // as the direct textual display "10s" is not found in the current DOM structure.
    act(() => {
      // Advance time by 12 seconds (5 initial + 7 more)
      // Remaining time should be 15 - 5 - 7 = 3s.
      // If we were checking text: expect(screen.getByText('3s')).toBeInTheDocument();
      jest.advanceTimersByTime(7000); // Total elapsed in intervals = 5 (initial) + 7 = 12s. Remaining = 15 - 12 = 3s.
    });
    act(() => {
      jest.advanceTimersByTime(4000); // Total elapsed in intervals = 12 + 4 = 16s. Timer should have expired.
    });

    await waitFor(() => {
      expect(screen.queryByText(/\ds$/i)).not.toBeInTheDocument();
      // Para verificar que las acciones están deshabilitadas, intentamos una acción
      // que normalmente estaría habilitada si el timer no hubiera expirado.
      // Por ejemplo, si al hacer clic en una ficha jugable se muestra un panel de acciones.
      const ficha12Wrapper = screen.getByTestId('ficha-mano-1-2');
      const ficha12Element = ficha12Wrapper.firstChild as HTMLElement;
      fireEvent.click(ficha12Element);
      // Asumimos que el panel de acciones (si existe) no aparece o que la ficha no se selecciona.
      // Si la selección añade una clase, verificamos que no la tenga.
      expect(ficha12Element).not.toHaveClass('ring-yellow-400'); // O la clase que uses para selección
    });

    jest.useRealTimers();
  });

  test('debería redirigir al lobby si falta userId o nombreJugador en sessionStorage al inicio', async () => {
    (window.sessionStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'jmu_userId') return null; // Simula que falta userId
      if (key === 'jmu_nombreJugador') return USER_NOMBRE;
      return null;
    });
  
    render(<JuegoPage />);
  
    // El componente debería mostrar "Cargando..." brevemente, luego detectar el error y redirigir.
    // No podemos testear directamente el `router.push` en el mismo ciclo de render inicial
    // sin `waitFor` si la lógica de redirección está en un `useEffect`.
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/lobby');
    });
    // Verificar que el hook fue llamado, pero con props que indican que no hay auth.
    // Y, más importante, que no se intentó ninguna acción de socket como emitir.
    expect(mockUseDominoSocket).toHaveBeenCalledWith(expect.objectContaining({
      userId: null, // Porque playerAuthReady sería false
      nombreJugador: null, // Porque playerAuthReady sería false
    }));
    expect(mockEmitEvent).not.toHaveBeenCalled(); // No se debería haber intentado emitir nada
  });

});
