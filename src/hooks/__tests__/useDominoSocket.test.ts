// /home/heagueron/jmu/dominando/src/hooks/__tests__/useDominoSocket.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDominoSocket } from '../useDominoSocket'; // CAMBIADO: UseDominoSocketProps ya no se usa
import { io, Socket } from 'socket.io-client'; // Socket type is used for mocks
import { useDominoStore, DominoStoreState } from '@/store/dominoStore'; // NUEVO: Importar store y su tipo

// --- Mock socket.io-client ---
// Store the mock socket instance to control its behavior
type TestMockSocket = {
  id: string;
  connected: boolean;
  on: jest.Mock;
  off: jest.Mock;
  emit: jest.Mock;
  connect: jest.Mock;
  disconnect: jest.Mock;
  _handlers: Record<string, ((...args: any[]) => void)[]>;
  _triggerEvent: (event: string, ...args: unknown[]) => void;
};

// This variable will hold the single mock socket instance created by the factory.
// It's populated when the jest.mock factory runs.
// CAMBIADO: Inicializamos moduleLevelMockSocket aquí como un mock funcional completo.
const moduleLevelMockSocket: TestMockSocket = {
  id: 'initial-mock-id',
  connected: false,
  _handlers: {},
  on: jest.fn((event, cb) => {
    if (!moduleLevelMockSocket._handlers[event]) {
      moduleLevelMockSocket._handlers[event] = [];
    }
    moduleLevelMockSocket._handlers[event].push(cb);
  }),
  off: jest.fn((event, cb) => {
    if (moduleLevelMockSocket._handlers[event]) {
      moduleLevelMockSocket._handlers[event] = moduleLevelMockSocket._handlers[event].filter(h => h !== cb);
      if (moduleLevelMockSocket._handlers[event].length === 0) {
        delete moduleLevelMockSocket._handlers[event];
      }
    }
  }),
  emit: jest.fn(),
  connect: jest.fn(() => {
    moduleLevelMockSocket.connected = true;
    if (moduleLevelMockSocket._handlers['connect']) {
      moduleLevelMockSocket._handlers['connect'].forEach(h => h());
    }
  }),
  disconnect: jest.fn((reason?: Socket.DisconnectReason) => {
    moduleLevelMockSocket.connected = false;
    if (moduleLevelMockSocket._handlers['disconnect']) {
      moduleLevelMockSocket._handlers['disconnect'].forEach(h => h(reason || 'io client disconnect'));
    }
  }),
  _triggerEvent: (event: string, ...args: unknown[]) => {
    if (moduleLevelMockSocket._handlers[event]) {
      moduleLevelMockSocket._handlers[event].forEach(h => h(...args));
    }
  }
};

jest.mock('socket.io-client', () => {
  const actualIO = jest.requireActual('socket.io-client'); // For types like Socket.DisconnectReason
  
  // La variable moduleLevelMockSocket ya está inicializada arriba.
  // La función io mockeada simplemente la reseteará y la devolverá.

  const mockedIoFunction = jest.fn((_url?: string, _opts?: any) => { // Añadir parámetros para que coincida con la firma de io
    // Cuando io() es llamado, reseteamos el estado del objeto moduleLevelMockSocket preexistente
    // para simular una "nueva" conexión.
    moduleLevelMockSocket._handlers = {}; 
    moduleLevelMockSocket.connected = false; 
    moduleLevelMockSocket.id = `mock-socket-id-${Math.random().toString(36).substring(7)}`;

    // Limpiar los contadores de llamadas de los mocks de los métodos
    (moduleLevelMockSocket.on as jest.Mock).mockClear();
    (moduleLevelMockSocket.off as jest.Mock).mockClear();
    (moduleLevelMockSocket.emit as jest.Mock).mockClear();
    (moduleLevelMockSocket.connect as jest.Mock).mockClear();
    (moduleLevelMockSocket.disconnect as jest.Mock).mockClear();
    
    return moduleLevelMockSocket; // Devolver el objeto moduleLevelMockSocket, ahora reseteado
  });

  return {
    ...actualIO, 
    io: mockedIoFunction,
  };
});
// --- End Mock socket.io-client ---

// --- Mock Zustand Store ---
jest.mock('@/store/dominoStore');
const mockUseDominoStore = useDominoStore as jest.Mock<
  unknown,
  [ ((state: DominoStoreState) => unknown) | undefined ]
>;

let mockStoreState: Partial<DominoStoreState>;

const resetMockStoreState = () => {
  // Inicializar mockSocketInstance aquí si no se hizo en el factory de socket.io-client
  // o si necesitas una instancia fresca por test.
  // Por ahora, asumimos que la instancia creada en el factory de socket.io-client es la que usaremos.
  mockStoreState = {
    socket: null, // Inicialmente null, el hook lo obtendrá del store
    isConnected: false,
    socketError: null,
    currentUserId: null,
    currentNombreJugador: null,
    // Mock de las acciones que el hook useDominoSocket podría llamar
    initializeSocket: jest.fn((userId, nombreJugador) => {
      // Simular que el store crea y conecta el socket
      console.log(`[MOCK_STORE_HOOK_TEST] initializeSocket called with ${userId}, ${nombreJugador}`);
      // La instancia mockSocketInstance ya fue creada por el mock de socket.io-client
      // y su función io() mockeada.
      // Aquí simulamos que el store la asigna y actualiza su estado.
      act(() => { // Re-introducir act aquí
        mockStoreState.socket = moduleLevelMockSocket as unknown as Socket;
        mockStoreState.isConnected = true; // Simular conexión
        mockStoreState.currentUserId = userId;
        mockStoreState.currentNombreJugador = nombreJugador;
        moduleLevelMockSocket.connected = true; // Sincronizar el estado del mock
        // moduleLevelMockSocket._triggerEvent('connect'); // Esto es más para probar el store en sí.
      });
    }),
    disconnectSocket: jest.fn(() => {
      act(() => {
        mockStoreState.isConnected = false;
        if (mockStoreState.socket) {
          (mockStoreState.socket as Socket).connected = false;
        }
        // moduleLevelMockSocket._triggerEvent('disconnect', 'io client disconnect');
      });
    }),
    emitEvent: jest.fn(),
    clearSocketError: jest.fn(() => {
      act(() => { // Añadir act aquí
        mockStoreState.socketError = null;
      });
    }),
  };

  // Configurar la implementación del mock de useDominoStore
  mockUseDominoStore.mockImplementation(
    (selector?: (state: DominoStoreState) => unknown): unknown => {
      if (selector) {
        return selector(mockStoreState as DominoStoreState);
      }
      return mockStoreState as DominoStoreState;
    }
  );
};
// --- End Mock Zustand Store ---

describe('useDominoSocket', () => {
  // let defaultProps: UseDominoSocketProps; // CAMBIADO: El hook ya no toma props

  beforeEach(() => {
    resetMockStoreState(); // NUEVO: Resetear el estado del store mockeado

    // Asegurarse de que mockSocketInstance (la instancia del socket) esté reseteada
    // Esto es importante porque el mock de socket.io-client la reutiliza.
    if (moduleLevelMockSocket) {
      moduleLevelMockSocket.on.mockClear();
      moduleLevelMockSocket.off.mockClear();
      moduleLevelMockSocket.emit.mockClear();
      moduleLevelMockSocket.connect.mockClear();
      moduleLevelMockSocket.disconnect.mockClear();
      moduleLevelMockSocket.connected = false;
      moduleLevelMockSocket._handlers = {};
    }
  });

  test('should return initial state from store', () => {
    // Configurar el estado inicial del store
    mockStoreState.socket = null;
    mockStoreState.isConnected = false;
    mockStoreState.socketError = 'Initial error';

    const { result } = renderHook(() => useDominoSocket());

    expect(result.current.socket).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.socketError).toBe('Initial error');
  });

  test('initializeSocketIfNeeded should call initializeSocket and clearSocketError from store', () => { // Ya no necesita ser async
    const { result, rerender } = renderHook(() => useDominoSocket()); // Obtener rerender
    const testUserId = 'user1';
    const testNombreJugador = 'Player One';

    act(() => {
      result.current.initializeSocketIfNeeded(testUserId, testNombreJugador);
    });

    expect(mockStoreState.initializeSocket).toHaveBeenCalledWith(testUserId, testNombreJugador);
    expect(mockStoreState.clearSocketError).toHaveBeenCalled();

    // Después de que las acciones del store hayan modificado mockStoreState (dentro de sus propios `act`),
    // forzamos un re-render del hook para que recoja el estado actualizado.
    act(() => {
      rerender();
    });

    // Verificar que el estado del hook se actualiza si el store cambia
    expect(result.current.isConnected).toBe(true);
    expect(result.current.socket).toBe(moduleLevelMockSocket); // Esto debería ser síncrono una vez que isConnected es true
  });

  test('disconnectSocketFromStore should call disconnectSocket from store', () => {
    const { result } = renderHook(() => useDominoSocket());
    // Simular que el socket está conectado a través del store
    act(() => {
      mockStoreState.socket = moduleLevelMockSocket as unknown as Socket;
      mockStoreState.isConnected = true;
      moduleLevelMockSocket.connected = true;
    });

    act(() => {
      result.current.disconnectSocketFromStore();
    });

    expect(mockStoreState.disconnectSocket).toHaveBeenCalled();
    // Verificar que el estado del hook se actualiza si el store cambia
    expect(result.current.isConnected).toBe(false);
  });

  test('emitEvent should call socket.emit if connected', () => {
    // Simular estado conectado en el store
    mockStoreState.socket = moduleLevelMockSocket as unknown as Socket;
    mockStoreState.isConnected = true;
    moduleLevelMockSocket.connected = true; // Sincronizar el mock de la instancia

    const { result } = renderHook(() => useDominoSocket());

    act(() => {
      result.current.emitEvent('client-event', { value: 42 });
    });
    // El emitEvent del hook llama al emitEvent del store, que a su vez llama a socket.emit
    expect(mockStoreState.emitEvent).toHaveBeenCalledWith('client-event', { value: 42 });
    // Para verificar que el socket real emitió, necesitaríamos que mockStoreState.emitEvent llame a mockSocketInstance.emit
    // Vamos a añadirlo a la implementación de mockStoreState.emitEvent para este test
    (mockStoreState.emitEvent as jest.Mock).mockImplementationOnce((event, payload) => {
      if (mockStoreState.socket && mockStoreState.isConnected) {
        (mockStoreState.socket as Socket).emit(event, payload);
      }
    });
    
    act(() => {
      result.current.emitEvent('another-event', { data: 'test' });
    });
    expect(moduleLevelMockSocket.emit).toHaveBeenCalledWith('another-event', { data: 'test' });
  });

  test('emitEvent should not call socket.emit if not connected', () => {
    mockStoreState.isConnected = false;
    mockStoreState.socket = moduleLevelMockSocket as unknown as Socket; // Puede haber instancia pero no conectada
    moduleLevelMockSocket.connected = false;

    const { result } = renderHook(() => useDominoSocket());

    act(() => {
      result.current.emitEvent('client-event', { value: 42 });
    });
    expect(mockStoreState.emitEvent).toHaveBeenCalledWith('client-event', { value: 42 });
    // Y el mockSocketInstance.emit no debería haber sido llamado por el store si no está conectado
    expect(moduleLevelMockSocket.emit).not.toHaveBeenCalledWith('client-event', { value: 42 });
  });

  test('registerEventHandlers should register handlers and unregisterEventHandlers should remove them', () => {
    // Simular que el socket existe en el store
    mockStoreState.socket = moduleLevelMockSocket as unknown as Socket;
    const { result } = renderHook(() => useDominoSocket());

    const handler1 = jest.fn();
    const handler2 = jest.fn();

    act(() => {
      result.current.registerEventHandlers({
        'event1': handler1,
        'event2': handler2,
      });
    });

    expect(moduleLevelMockSocket.on).toHaveBeenCalledWith('event1', handler1);
    expect(moduleLevelMockSocket.on).toHaveBeenCalledWith('event2', handler2);

    // Simulate receiving an event
    act(() => {
      moduleLevelMockSocket._triggerEvent('event1', 'payload1');
    });
    expect(handler1).toHaveBeenCalledWith('payload1');

    act(() => {
      result.current.unregisterEventHandlers(['event1']);
    });
    expect(moduleLevelMockSocket.off).toHaveBeenCalledWith('event1', handler1);

    // Simulate event again, handler1 should not be called
    handler1.mockClear();
    act(() => {
      moduleLevelMockSocket._triggerEvent('event1', 'payload2');
    });
    expect(handler1).not.toHaveBeenCalled();

    // Event2 should still work
    act(() => {
      moduleLevelMockSocket._triggerEvent('event2', 'payload3');
    });
    expect(handler2).toHaveBeenCalledWith('payload3');
  });
  
  test('registerEventHandlers should replace existing handler for the same event', () => {
    mockStoreState.socket = moduleLevelMockSocket as unknown as Socket;
    const { result } = renderHook(() => useDominoSocket());
    const oldHandler = jest.fn();
    const newHandler = jest.fn();

    act(() => {
      result.current.registerEventHandlers({ 'eventA': oldHandler });
    });
    expect(moduleLevelMockSocket.on).toHaveBeenCalledWith('eventA', oldHandler);
    
    moduleLevelMockSocket.on.mockClear();
    moduleLevelMockSocket.off.mockClear();

    act(() => {
      result.current.registerEventHandlers({ 'eventA': newHandler });
    });
    
    // Should have unregistered the old one and registered the new one
    expect(moduleLevelMockSocket.off).toHaveBeenCalledWith('eventA', oldHandler);
    expect(moduleLevelMockSocket.on).toHaveBeenCalledWith('eventA', newHandler);

    act(() => {
      moduleLevelMockSocket._triggerEvent('eventA', 'data');
    });
    expect(oldHandler).not.toHaveBeenCalled();
    expect(newHandler).toHaveBeenCalledWith('data');
  });

  test('should cleanup socket and handlers on unmount', () => {
    mockStoreState.socket = moduleLevelMockSocket as unknown as Socket; // Simular que el socket existe
    const { result, unmount } = renderHook(() => useDominoSocket());
    const handler = jest.fn();
    act(() => {
      result.current.registerEventHandlers({ 'cleanup-event': handler });
    });
    expect(moduleLevelMockSocket.on).toHaveBeenCalledWith('cleanup-event', handler); // Corregido: usar moduleLevelMockSocket

    unmount();

    // El hook useDominoSocket tiene un useEffect que limpia los handlers registrados
    // en dynamicHandlersRef cuando el socket cambia o el componente se desmonta.
    // Si mockSocketInstance.off fue llamado, significa que la limpieza funcionó.
    expect(moduleLevelMockSocket.off).toHaveBeenCalledWith('cleanup-event', handler);
    // No podemos verificar mockSocketInstance.disconnect directamente aquí porque
    // el hook no llama a disconnect del socket directamente al desmontar,
    // sino que el store es responsable de eso.
  });

  // Las pruebas sobre cambios de props (userId, nombreJugador, autoConnect) ya no son relevantes
  // porque el hook no acepta estas props. La lógica de inicialización y conexión
  // ahora se maneja a través de `initializeSocketIfNeeded` que llama a acciones del store.

  // Podríamos añadir pruebas para verificar que el hook reacciona a cambios en el store
  // si esos cambios no son iniciados por el propio hook.
  test('should reflect changes from the store', () => {
    const { result, rerender } = renderHook(() => useDominoSocket());
    expect(result.current.isConnected).toBe(false);

    // Simular un cambio en el store (ej. conexión exitosa por otra vía)
    act(() => {
      mockStoreState.isConnected = true;
      mockStoreState.socket = moduleLevelMockSocket as unknown as Socket;
      mockStoreState.socketError = null;
    });
    rerender(); // Forzar re-render para que el hook recoja los nuevos valores del store

    expect(result.current.isConnected).toBe(true);
    expect(result.current.socket).toBe(moduleLevelMockSocket);
    expect(result.current.socketError).toBeNull();
  });

});
