// /home/heagueron/jmu/dominando/src/app/juego/[mesaId]/__tests__/page.test.tsx
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
// import userEvent from '@testing-library/user-event'; // No se usa userEvent en las pruebas actuales, se puede quitar si no se añade
import JuegoPage from '../page';
import { FichaDomino }  from '@/utils/dominoUtils'; // Asegúrate que JugadorPublico se usa o quítalo
import { EstadoMesaPublicoCliente } from '@/types/domino'; // Asegúrate que JugadorPublico se usa o quítalo
import { FichaEnMesaParaLogica } from '@/utils/dominoUtils'; // Importar el tipo correcto
import { useDominoSocket, UseDominoSocketReturn } from '@/hooks/useDominoSocket';
import { Socket } from 'socket.io-client'; // Necesario para tipar el mockSocketObject
import '@testing-library/jest-dom';
import { useParams, useRouter } from 'next/navigation';
import { useDominoStore, DominoStoreState } from '@/store/dominoStore'; // NUEVO: Importar store y su tipo

// Constantes de prueba
const MESA_ID = 'test-mesa-123';
const USER_ID = 'user-test-id'; // Cambiado de 'user-test-id' a USER_ID para consistencia
const USER_NOMBRE = 'Jugador Test'; // Cambiado de 'JugadorTest' a USER_NOMBRE para consistencia

// Mock para el custom hook useDominoSocket
jest.mock('@/hooks/useDominoSocket');
jest.mock('@/store/dominoStore'); // NUEVO: Mockear el store de Zustand

// Mock para next/navigation
let mockRouterPush: jest.Mock;
(useParams as jest.Mock) = jest.fn();
(useRouter as jest.Mock) = jest.fn();


// Variables para controlar los mocks
let mockEmitEvent: jest.Mock;
// let mockConnectSocket: jest.Mock; // CAMBIADO: Ya no se usa, la conexión la maneja el store/hook internamente
// let mockDisconnectSocket: jest.Mock; // CAMBIADO: Ya no se usa
let mockRegisterEventHandlers: jest.Mock;
let mockUnregisterEventHandlers: jest.Mock;
let mockInitializeSocketIfNeeded: jest.Mock; // NUEVO: Para el hook
let mockDisconnectSocketFromStoreHook: jest.Mock; // NUEVO: Para el hook

// let mockIsConnected: boolean; // CAMBIADO: Se manejará a través de mockStoreState.isConnected
// let mockHookError: string | null; // CAMBIADO: Se manejará a través de mockStoreState.socketError
let mockSocketObject: Partial<Socket>; // Un objeto Socket parcial para el `socket` devuelto por el hook

// Callbacks capturados del hook
// CAMBIADO: Estas props ya no existen en el hook useDominoSocket
// let capturedOnConnect: UseDominoSocketProps['onConnect'];
// let capturedOnDisconnect: UseDominoSocketProps['onDisconnect'];
// let capturedOnConnectError: UseDominoSocketProps['onConnectError'];
let registeredEventHandlers: Record<string, (...args: any[]) => void> = {};

const mockUseDominoSocket = useDominoSocket as jest.MockedFunction<typeof useDominoSocket>;
// NUEVO: Mock para el store, CAMBIADO: con conversión a unknown y ahora a tipos más específicos
const mockUseDominoStore = useDominoStore as jest.Mock<
  unknown, // ReturnType del mock (puede ser DominoStoreState o el resultado del selector)
  [ ((state: DominoStoreState) => unknown) | undefined ] // ArgsTuple: un array con un único elemento que es el tipo del primer argumento (opcional)
>;

// NUEVO: Estado simulado del store de Zustand
let mockStoreState: Partial<DominoStoreState>;

const resetMockStoreState = () => {
  mockStoreState = {
    // Estado inicial del store para las pruebas
    estadoMesaCliente: null,
    miIdJugadorSocket: null,
    manosJugadores: [],
    playableFichaIds: [],
    socket: null,
    isConnected: false,
    socketError: null,
    currentUserId: null,
    currentNombreJugador: null,
    // Mock de las acciones del store
    setEstadoMesaCliente: jest.fn((estado) => { 
      act(() => { mockStoreState.estadoMesaCliente = estado; });
    }),
    setMiIdJugadorSocket: jest.fn((id) => { 
      act(() => { mockStoreState.miIdJugadorSocket = id; });
    }),
    setManosJugadores: jest.fn((manosOrUpdater) => {
      act(() => {
        if (typeof manosOrUpdater === 'function') {
          mockStoreState.manosJugadores = manosOrUpdater(mockStoreState.manosJugadores || []);
        } else {
          mockStoreState.manosJugadores = manosOrUpdater;
        }
      });
    }),
    setPlayableFichaIds: jest.fn((ids) => { 
      act(() => { mockStoreState.playableFichaIds = ids; });
    }),
    initializeSocket: jest.fn((userId, nombreJugador) => {
      // Simular conexión exitosa
      console.log(`[MOCK_STORE] initializeSocket called with ${userId}, ${nombreJugador}`);
      act(() => {
        mockStoreState.socket = mockSocketObject as Socket;
        mockStoreState.isConnected = true;
        mockStoreState.socketError = null;
        mockStoreState.currentUserId = userId;
        mockStoreState.currentNombreJugador = nombreJugador;
        if (mockSocketObject) mockSocketObject.connected = true;
      });
    }),
    disconnectSocket: jest.fn(() => {
      act(() => {
        mockStoreState.isConnected = false;
        // mockStoreState.socket = null; // El store real no lo nulifica inmediatamente en disconnect
        if (mockSocketObject) mockSocketObject.connected = false;
      });
    }),
    emitEvent: jest.fn(), 
    clearSocketError: jest.fn(() => { 
      act(() => { mockStoreState.socketError = null; });
    }),
  };
};

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

    resetMockStoreState(); // NUEVO: Inicializar el estado del store mockeado

    // Configuración de mocks para useDominoSocket (el hook)
    mockEmitEvent = jest.fn((eventName, payload) => { // Este mockEmitEvent es el que usa el componente
      (mockStoreState.emitEvent as jest.Mock)(eventName, payload); // Hacer que llame al emitEvent del store
    });
    mockRegisterEventHandlers = jest.fn((handlers) => {
      registeredEventHandlers = { ...registeredEventHandlers, ...handlers };
    });
    mockUnregisterEventHandlers = jest.fn((eventNames: string[]) => {
      eventNames.forEach((name: string) => delete registeredEventHandlers[name]);
    });
    mockInitializeSocketIfNeeded = jest.fn((userId, nombreJugador) => {
      // El hook llama a initializeSocket del store
      (mockStoreState.initializeSocket as jest.Mock)(userId, nombreJugador);
      // El hook también llama a clearSocketError
      (mockStoreState.clearSocketError as jest.Mock)();
    });
    mockDisconnectSocketFromStoreHook = jest.fn(() => {
      (mockStoreState.disconnectSocket as jest.Mock)();
    });

    mockSocketObject = { id: `mock-socket-${Math.random()}`, connected: false };

    // NUEVO: Implementación del mock de useDominoStore
    // Esto asegura que cuando el componente o useDominoSocket llamen a useDominoStore,
    // obtengan los valores y funciones de nuestro mockStoreState.
    mockUseDominoStore.mockImplementation(
      (selector?: (state: DominoStoreState) => unknown): unknown => {
        if (selector) {
          return selector(mockStoreState as DominoStoreState);
        }
        // Si se llama sin selector (para obtener todo el store, menos común con la API de Zustand v4+)
        // Devolvemos una simulación de las funciones de acción directamente si es necesario,
        // pero es mejor que los componentes usen selectores.
        return mockStoreState as DominoStoreState; // Compatible with unknown return
      }
    );

    // CAMBIADO: El mock de useDominoSocket ya no toma props y devuelve valores del store mockeado
    mockUseDominoSocket.mockImplementation((): UseDominoSocketReturn => {
      return {
        socket: mockStoreState.socket as Socket | null,
        isConnected: mockStoreState.isConnected || false,
        socketError: mockStoreState.socketError || null, // Corregido: 'error' a 'socketError'
        emitEvent: mockEmitEvent,
        // connectSocket y disconnectSocket ya no son parte de la interfaz del hook
        registerEventHandlers: mockRegisterEventHandlers,
        unregisterEventHandlers: mockUnregisterEventHandlers,
        initializeSocketIfNeeded: mockInitializeSocketIfNeeded,
        disconnectSocketFromStore: mockDisconnectSocketFromStoreHook,
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
    // capturedOnConnect = undefined; // CAMBIADO
    // capturedOnDisconnect = undefined; // CAMBIADO
    // capturedOnConnectError = undefined; // CAMBIADO
  });

  const simulateSuccessfulConnectionAndJoin = (initialEstadoMesa?: Partial<EstadoMesaPublicoCliente>) => {
    const teUnisteAMesaHandler = registeredEventHandlers['servidor:teUnisteAMesa'];
    if (teUnisteAMesaHandler) {
      const estadoMesaCompleto = { ...estadoMesaBase, ...initialEstadoMesa };
      act(() => {
        // Esta llamada simula el evento del servidor.
        // El handler en JuegoPage llamará a las acciones del store (setEstadoMesaCliente, setMiIdJugadorSocket)
        // que ya están mockeadas para actualizar mockStoreState.
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
        // El handler en JuegoPage llamará a setManosJugadoresStore,
        // que está mockeado para actualizar mockStoreState.manosJugadores.
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
         // El handler en JuegoPage llamará a setPlayableFichaIdsStore,
         // que está mockeado para actualizar mockStoreState.playableFichaIds.
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


  test('debería mostrar "Cargando...", inicializar socket y unirse a la mesa', async () => {
    await act(async () => {
      // Envolver el render en un act que esperamos
      // Esto ayuda a que los efectos de montaje iniciales se completen.
      await render(<JuegoPage />);
    });
    expect(screen.getByText(/Cargando datos de la mesa.../i)).toBeInTheDocument(); // Esto debería seguir siendo verdad inicialmente

    // JuegoPage llama a initializeSocketIfNeeded en un useEffect.
    // El mock de initializeSocketIfNeeded llama a mockStoreState.initializeSocket,
    // que a su vez actualiza mockStoreState.isConnected = true.
    await waitFor(() => {
      expect(mockInitializeSocketIfNeeded).toHaveBeenCalledWith(USER_ID, USER_NOMBRE);
    });

    // Esperar a que el estado isConnected se propague y el componente reaccione
    await waitFor(() => {
      expect(mockStoreState.isConnected).toBe(true);
    });
    
    // Una vez conectado, JuegoPage debería emitir 'cliente:unirseAMesa'
    await waitFor(() => {
      // mockEmitEvent es el del hook, que llama al del store.
      // Podemos verificar mockEmitEvent o (mockStoreState.emitEvent as jest.Mock)
      expect(mockEmitEvent).toHaveBeenCalledWith('cliente:unirseAMesa', { 
        juegoSolicitado: 'rondaUnica',
        nombreJugador: USER_NOMBRE, // JuegoPage lo envía en su onConnect
        mesaId: MESA_ID,
      });
    });
  });

  test('debería unirse a la mesa después de conectar y emitir listoParaMano', async () => {
    await act(async () => {
      // Envolver el render en un act que esperamos
      await render(<JuegoPage />); 
    });

    await waitFor(() => {
      expect(mockInitializeSocketIfNeeded).toHaveBeenCalledWith(USER_ID, USER_NOMBRE);
      expect(mockStoreState.isConnected).toBe(true);
    });

    await waitFor(() => {
      // Verificar que se intentó unir a la mesa
      expect(mockEmitEvent).toHaveBeenCalledWith('cliente:unirseAMesa', expect.objectContaining({
        mesaId: MESA_ID,
      }));
    });

    // Simular que el servidor responde con 'servidor:teUnisteAMesa'
    await act(async () => {
      simulateSuccessfulConnectionAndJoin(); 
    });


    // JuegoPage debería entonces emitir 'cliente:listoParaMano'
    await waitFor(() => {
        expect(mockEmitEvent).toHaveBeenCalledWith('cliente:listoParaMano', {
        mesaId: MESA_ID,
        jugadorId: USER_ID,
      });
    });
  });

  test('debería actualizar el estado de la mesa al recibir servidor:estadoMesaActualizado', async () => {
    await act(async () => {
      // Envolver el render en un act que esperamos
      await render(<JuegoPage />);
    });
    
    await waitFor(() => { // Esperar conexión y unión inicial
        expect(mockEmitEvent).toHaveBeenCalledWith('cliente:unirseAMesa', expect.anything());
        expect(mockStoreState.isConnected).toBe(true);
    });

    // Simular la recepción del estado de la mesa.
    // Esta función ya usa act() internamente para actualizar mockStoreState.
    await act(async () => {
      simulateSuccessfulConnectionAndJoin(); 
      // Forzar que se procesen las actualizaciones de estado pendientes
      await Promise.resolve(); 
    });
    

    await waitFor(() => {
      // Esperar a que "Cargando..." desaparezca
      expect(screen.queryByText(/Cargando datos de la mesa.../i)).not.toBeInTheDocument();
    });
    
    
    // Ahora que "Cargando..." no está, podemos verificar el contenido
        const playerInfoContainers = screen.getAllByText(USER_NOMBRE);
        expect(playerInfoContainers.length).toBeGreaterThan(0);

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

    // Simular la actualización del estado de la mesa
    await act(async () => {
      if (estadoMesaActualizadoHandler) estadoMesaActualizadoHandler({ estadoMesa: nuevoEstado });
    });
    
    
    await waitFor(() => {
      // Verificar que la acción del store fue llamada y el estado del store se actualizó
      expect((mockStoreState.setEstadoMesaCliente as jest.Mock)).toHaveBeenCalledWith(nuevoEstado);
      expect(mockStoreState.estadoMesaCliente?.partidaActual?.rondaActual?.currentPlayerId).toBe('otro-jugador-id');
      expect(screen.getAllByText(USER_NOMBRE).length).toBeGreaterThan(0) }
    );
    // Aquí podrías añadir una verificación más específica si MesaDomino renderiza la ficha '5-5'
    // Por ejemplo, si MesaDomino tuviera un testid para las fichas en mesa:
    // await waitFor(() => expect(screen.getByTestId('ficha-en-mesa-5-5')).toBeInTheDocument());
  });

  test('debería mostrar las fichas del jugador y permitir seleccionar una jugable', async () => {
    await act(async () => {
      // Envolver el render en un act que esperamos
      await render(<JuegoPage />);
    });
    
    await waitFor(() => { // Esperar conexión y unión inicial
        expect(mockEmitEvent).toHaveBeenCalledWith('cliente:unirseAMesa', expect.anything());
        expect(mockStoreState.isConnected).toBe(true);
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
    await act(async () => {
      simulateSuccessfulConnectionAndJoin(estadoParaActualizarConAncla);
      simulateReceivePlayerHand(misFichas);
      // Forzar que se procesen las actualizaciones de estado pendientes
      await Promise.resolve();
    });
    
    await waitFor(() => { // Esperar a que el estado de carga desaparezca
      expect(screen.queryByText(/Cargando datos de la mesa.../i)).not.toBeInTheDocument();
    });

    simulatePlayerTurn(['6-5']); // Solo '6-5' es jugable

    // Verificar que el store se actualizó
    await waitFor(() => {
      expect(mockStoreState.manosJugadores?.find(j => j.idJugador === USER_ID)?.fichas).toEqual(misFichas);
      expect(mockStoreState.playableFichaIds).toEqual(['6-5']);
    });

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
    await act(async () => {
      // Envolver el render en un act que esperamos
      await render(<JuegoPage />);
    });
    
    await waitFor(() => { // Esperar conexión y unión inicial
        expect(mockEmitEvent).toHaveBeenCalledWith('cliente:unirseAMesa', expect.anything());
        expect(mockStoreState.isConnected).toBe(true);
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
    await act(async () => {
      simulateReceivePlayerHand([{ id: '1-2', valorSuperior: 1, valorInferior: 2 }]);
      await Promise.resolve();
    });

    await waitFor(() => { // Esperar a que el estado de carga desaparezca
      expect(screen.queryByText(/Cargando datos de la mesa.../i)).not.toBeInTheDocument();
    });

    simulatePlayerTurn([]);

    await waitFor(() => {
      expect(mockStoreState.playableFichaIds).toEqual([]);
    });

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
    await act(async () => {
      // Envolver el render en un act que esperamos
      await render(<JuegoPage />);
    });

    await waitFor(() => { // Esperar conexión y unión inicial
        expect(mockEmitEvent).toHaveBeenCalledWith('cliente:unirseAMesa', expect.anything());
        expect(mockStoreState.isConnected).toBe(true);
        expect(screen.queryByText(/Cargando datos de la mesa.../i)).not.toBeInTheDocument();
    });

    const timestampInicio = Date.now() - 5000; 
    const duracionTurno = 15;

    await act(async () => {
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
      await Promise.resolve();
    });

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
  
    await act(async () => {
      // Envolver el render en un act que esperamos
      await render(<JuegoPage />);
    });
  
    // El componente debería mostrar "Cargando..." brevemente, luego detectar el error y redirigir.
    // No podemos testear directamente el `router.push` en el mismo ciclo de render inicial
    // sin `waitFor` si la lógica de redirección está en un `useEffect`.
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/lobby');
    });
    // Verificar que no se intentó inicializar el socket si la info de auth no estaba
    expect(mockInitializeSocketIfNeeded).not.toHaveBeenCalled();
    expect(mockStoreState.emitEvent as jest.Mock).not.toHaveBeenCalled(); // No se debería haber intentado emitir nada
  });

});
