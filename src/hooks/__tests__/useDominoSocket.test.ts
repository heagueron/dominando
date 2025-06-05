// /home/heagueron/jmu/dominando/src/hooks/__tests__/useDominoSocket.test.ts
import { renderHook, act } from '@testing-library/react';
import { useDominoSocket, UseDominoSocketProps } from '../useDominoSocket';
import { io, Socket } from 'socket.io-client'; // Socket type is used for mocks

// --- Mock socket.io-client ---
// Store the mock socket instance to control its behavior
let mockSocketInstance: { // Cambiado a var para evitar TDZ en la asignación desde la fábrica del mock
  id: string;
  connected: boolean;
  on: jest.Mock;
  off: jest.Mock;
  emit: jest.Mock;
  connect: jest.Mock;
  disconnect: jest.Mock;
  _handlers: Record<string, ((...args: any[]) => void)[]>;
  _triggerEvent: (event: string, ...args: any[]) => void;
}; // No la inicializamos aquí. Se asignará desde la fábrica del mock.

const mockIo = io as jest.Mock; // To check if io() itself is called

jest.mock('socket.io-client', () => {
  const actualIO = jest.requireActual('socket.io-client'); // For types like Socket.DisconnectReason
  
  // Crear el objeto socket simulado completamente DENTRO de la fábrica
  const createdInstance = { // Renombrado para claridad
    id: 'factory-created-id',
    connected: false,
    _handlers: {} as Record<string, ((...args: any[]) => void)[]>,
    on: jest.fn((event, cb) => {
      if (!createdInstance._handlers[event]) {
        createdInstance._handlers[event] = [];
      }
      createdInstance._handlers[event].push(cb);
    }),
    off: jest.fn((event, cb) => {
      if (createdInstance._handlers[event]) {
        createdInstance._handlers[event] = createdInstance._handlers[event].filter(h => h !== cb);
        if (createdInstance._handlers[event].length === 0) {
          delete createdInstance._handlers[event];
        }
      }
    }),
    emit: jest.fn(),
    connect: jest.fn(() => {
      createdInstance.connected = true;
      if (createdInstance._handlers['connect']) {
        createdInstance._handlers['connect'].forEach(h => h());
      }
    }),
    disconnect: jest.fn((reason?: Socket.DisconnectReason) => {
      createdInstance.connected = false;
      if (createdInstance._handlers['disconnect']) {
        createdInstance._handlers['disconnect'].forEach(h => h(reason || 'io client disconnect'));
      }
    }),
    _triggerEvent: (event: string, ...args: any[]) => {
      if (createdInstance._handlers[event]) {
        createdInstance._handlers[event].forEach(h => h(...args));
      }
    }
  };

  // Asignar la instancia localmente creada a la variable global
  mockSocketInstance = createdInstance; // Esta asignación es clave

  const mockedIoFunction = jest.fn(() => {
    // Cuando io() es llamado por el hook, reseteamos el estado de la instancia global
    // para simular una "nueva" conexión.
    Object.keys(createdInstance._handlers).forEach(key => delete createdInstance._handlers[key]); // Limpiar handlers del objeto original
    createdInstance.connected = false; 
    createdInstance.id = `mock-socket-id-${Math.random().toString(36).substring(7)}`;
    
    // Limpiar los contadores de llamadas de los mocks de los métodos
    createdInstance.on.mockClear();
    createdInstance.off.mockClear();
    createdInstance.emit.mockClear();
    createdInstance.connect.mockClear();
    createdInstance.disconnect.mockClear();

    return createdInstance; // Devolver la instancia que fue creada y asignada globalmente
  });

  return {
    ...actualIO, 
    io: mockedIoFunction,
  };
});
// --- End Mock socket.io-client ---

// Esta es la variable que los tests usarán para referirse al socket.
// Es la misma que mockSocketInstanceProperties.
const mockSocketReferenceForTests = mockSocketInstance!; 
// TypeScript podría quejarse aquí de que mockSocketInstance podría no estar asignada.
// Si es así, podemos usar una aserción de tipo o inicializar mockSocketReferenceForTests en beforeEach.
// Por ahora, lo dejamos así, ya que Jest debería haber ejecutado la fábrica del mock primero.


// const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001'; // Ya está definida en el hook

describe('useDominoSocket', () => {
  let defaultProps: UseDominoSocketProps;

  beforeEach(() => {
    // Reset the main io mock
    mockIo.mockClear(); // mockIo es la función io() mockeada.
    
    // El estado de mockSocketReferenceForTests (como .connected y los contadores de sus métodos)
    // se resetea por la llamada a mockedIoFunction cuando el hook llama a io() al inicio de cada test.
    // Si alguna prueba no renderiza el hook (y por lo tanto no llama a io()), 
    // podríamos necesitar un reseteo manual aquí, pero es poco común.
    // Por ahora, confiamos en que mockedIoFunction haga el reseteo.
    // Para mayor seguridad, podemos resetear explícitamente:
    mockSocketReferenceForTests.on.mockClear();
    mockSocketReferenceForTests.off.mockClear();
    mockSocketReferenceForTests.emit.mockClear();
    mockSocketReferenceForTests.connect.mockClear();
    mockSocketReferenceForTests.disconnect.mockClear();
    mockSocketReferenceForTests.connected = false;
    Object.keys(mockSocketReferenceForTests._handlers).forEach(key => delete mockSocketReferenceForTests._handlers[key]);


    defaultProps = {
      userId: 'test-user-id',
      nombreJugador: 'Test Player',
      autoConnect: true,
      onConnect: jest.fn(),
      onDisconnect: jest.fn(),
      onConnectError: jest.fn(),
    };
  });

  test('should not initialize socket if userId is null', () => {
    const { result } = renderHook(() => useDominoSocket({ ...defaultProps, userId: null }));
    expect(mockIo).not.toHaveBeenCalled();
    expect(result.current.socket).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  test('should not initialize socket if nombreJugador is null', () => {
    const { result } = renderHook(() => useDominoSocket({ ...defaultProps, nombreJugador: null }));
    expect(mockIo).not.toHaveBeenCalled();
    expect(result.current.socket).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  test('should initialize and auto-connect if userId, nombreJugador are provided and autoConnect is true', () => {
    const { result } = renderHook(() => useDominoSocket(defaultProps));

    // El hook internamente usará su propia constante SOCKET_SERVER_URL
    expect(mockIo).toHaveBeenCalledWith(expect.any(String), {
      auth: { userId: defaultProps.userId, nombreJugador: defaultProps.nombreJugador },
      transports: ['websocket'],
      autoConnect: false, // Hook controls this internally
    });
    expect(mockSocketReferenceForTests.connect).toHaveBeenCalledTimes(1);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.socket).toBe(mockSocketReferenceForTests);
    expect(defaultProps.onConnect).toHaveBeenCalledTimes(1);
  });

  test('should initialize but not auto-connect if autoConnect is false', () => {
    const { result } = renderHook(() => useDominoSocket({ ...defaultProps, autoConnect: false }));

    expect(mockIo).toHaveBeenCalledTimes(1);
    expect(mockSocketReferenceForTests.connect).not.toHaveBeenCalled();
    expect(result.current.isConnected).toBe(false);
  });

  test('connectSocket should connect the socket if not auto-connected', () => {
    const { result } = renderHook(() => useDominoSocket({ ...defaultProps, autoConnect: false }));
    expect(result.current.isConnected).toBe(false);

    act(() => {
      result.current.connectSocket();
    });

    expect(mockSocketReferenceForTests.connect).toHaveBeenCalledTimes(1);
    expect(result.current.isConnected).toBe(true);
    expect(defaultProps.onConnect).toHaveBeenCalledTimes(1);
  });
  
  test('connectSocket should not call connect if already connected', () => {
    // Initial connection via autoConnect=true
    const { result } = renderHook(() => useDominoSocket({ ...defaultProps, autoConnect: true }));
    expect(result.current.isConnected).toBe(true);
    expect(mockSocketReferenceForTests.connect).toHaveBeenCalledTimes(1); // From auto-connect

    act(() => {
      result.current.connectSocket(); // Attempt to connect again
    });

    // Should not have been called again
    expect(mockSocketReferenceForTests.connect).toHaveBeenCalledTimes(1);
  });


  test('disconnectSocket should disconnect the socket', () => {
    const { result } = renderHook(() => useDominoSocket(defaultProps)); // auto-connects
    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnectSocket();
    });

    expect(mockSocketReferenceForTests.disconnect).toHaveBeenCalledTimes(1);
    expect(result.current.isConnected).toBe(false);
    expect(defaultProps.onDisconnect).toHaveBeenCalledWith('io client disconnect');
  });

  test('should call onConnect with a working emit function when connected', () => {
    renderHook(() => useDominoSocket(defaultProps));
    expect(defaultProps.onConnect).toHaveBeenCalledTimes(1);

    const emitFromCallback = (defaultProps.onConnect as jest.Mock).mock.calls[0][0];
    expect(emitFromCallback).toBeInstanceOf(Function);

    act(() => {
      emitFromCallback('test-event', { data: 'test-payload' });
    });
    expect(mockSocketReferenceForTests.emit).toHaveBeenCalledWith('test-event', { data: 'test-payload' });
  });
  
  test('should call onDisconnect when disconnected by server or network issue', () => {
    const { result } = renderHook(() => useDominoSocket(defaultProps)); // auto-connects
    expect(result.current.isConnected).toBe(true);

    act(() => {
      // Simulate server-side disconnect or network issue triggering the 'disconnect' event
      mockSocketReferenceForTests._triggerEvent('disconnect', 'transport close');
    });
    
    expect(result.current.isConnected).toBe(false);
    expect(defaultProps.onDisconnect).toHaveBeenCalledWith('transport close');
  });


  test('should handle connection errors and call onConnectError', () => {
    const { result } = renderHook(() => useDominoSocket({ ...defaultProps, autoConnect: true }));
    const testError = new Error('Test connection error');

    act(() => {
      // Simulate the 'connect_error' event from the socket
      // This assumes the socket tried to connect due to autoConnect
      mockSocketReferenceForTests._triggerEvent('connect_error', testError);
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe(`Connection Error: ${testError.message}`);
    expect(defaultProps.onConnectError).toHaveBeenCalledWith(testError);
  });

  test('emitEvent should call socket.emit if connected', () => {
    const { result } = renderHook(() => useDominoSocket(defaultProps)); // auto-connects
    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.emitEvent('client-event', { value: 42 });
    });
    expect(mockSocketReferenceForTests.emit).toHaveBeenCalledWith('client-event', { value: 42 });
  });

  test('emitEvent should not call socket.emit if not connected', () => {
    const { result } = renderHook(() => useDominoSocket({ ...defaultProps, autoConnect: false }));
    expect(result.current.isConnected).toBe(false);

    act(() => {
      result.current.emitEvent('client-event', { value: 42 });
    });
    expect(mockSocketReferenceForTests.emit).not.toHaveBeenCalled();
  });

  test('registerEventHandlers should register handlers and unregisterEventHandlers should remove them', () => {
    const { result } = renderHook(() => useDominoSocket(defaultProps)); // auto-connects
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    act(() => {
      result.current.registerEventHandlers({
        'event1': handler1,
        'event2': handler2,
      });
    });

    expect(mockSocketReferenceForTests.on).toHaveBeenCalledWith('event1', handler1);
    expect(mockSocketReferenceForTests.on).toHaveBeenCalledWith('event2', handler2);

    // Simulate receiving an event
    act(() => {
      mockSocketReferenceForTests._triggerEvent('event1', 'payload1');
    });
    expect(handler1).toHaveBeenCalledWith('payload1');

    act(() => {
      result.current.unregisterEventHandlers(['event1']);
    });
    expect(mockSocketReferenceForTests.off).toHaveBeenCalledWith('event1', handler1);

    // Simulate event again, handler1 should not be called
    handler1.mockClear();
    act(() => {
      mockSocketReferenceForTests._triggerEvent('event1', 'payload2');
    });
    expect(handler1).not.toHaveBeenCalled();

    // Event2 should still work
    act(() => {
      mockSocketReferenceForTests._triggerEvent('event2', 'payload3');
    });
    expect(handler2).toHaveBeenCalledWith('payload3');
  });
  
  test('registerEventHandlers should replace existing handler for the same event', () => {
    const { result } = renderHook(() => useDominoSocket(defaultProps));
    const oldHandler = jest.fn();
    const newHandler = jest.fn();

    act(() => {
      result.current.registerEventHandlers({ 'eventA': oldHandler });
    });
    expect(mockSocketReferenceForTests.on).toHaveBeenCalledWith('eventA', oldHandler);
    
    (mockSocketReferenceForTests.on as jest.Mock).mockClear(); // Clear previous 'on' calls for next assertion
    (mockSocketReferenceForTests.off as jest.Mock).mockClear();

    act(() => {
      result.current.registerEventHandlers({ 'eventA': newHandler });
    });
    
    // Should have unregistered the old one and registered the new one
    expect(mockSocketReferenceForTests.off).toHaveBeenCalledWith('eventA', oldHandler);
    expect(mockSocketReferenceForTests.on).toHaveBeenCalledWith('eventA', newHandler);

    act(() => {
      mockSocketReferenceForTests._triggerEvent('eventA', 'data');
    });
    expect(oldHandler).not.toHaveBeenCalled();
    expect(newHandler).toHaveBeenCalledWith('data');
  });


  test('should cleanup socket and handlers on unmount', () => {
    const { result, unmount } = renderHook(() => useDominoSocket(defaultProps));
    const handler = jest.fn();
    act(() => {
      result.current.registerEventHandlers({ 'cleanup-event': handler });
    });
    expect(mockSocketReferenceForTests.on).toHaveBeenCalledWith('cleanup-event', handler);

    unmount();

    expect(mockSocketReferenceForTests.disconnect).toHaveBeenCalledTimes(1);
    // Check that core handlers are removed
    expect(mockSocketReferenceForTests.off).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocketReferenceForTests.off).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocketReferenceForTests.off).toHaveBeenCalledWith('connect_error', expect.any(Function));
    // Check that dynamic handler is removed
    expect(mockSocketReferenceForTests.off).toHaveBeenCalledWith('cleanup-event', handler);
  });

  test('should disconnect and cleanup if userId becomes null', () => {
    const { result, rerender } = renderHook(
      (props: UseDominoSocketProps) => useDominoSocket(props),
      { initialProps: defaultProps }
    );
    expect(result.current.isConnected).toBe(true);
    const initialSocketOffCount = (mockSocketReferenceForTests.off as jest.Mock).mock.calls.length;


    act(() => {
      rerender({ ...defaultProps, userId: null });
    });

    expect(mockSocketReferenceForTests.disconnect).toHaveBeenCalledTimes(1);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.socket).toBeNull();
    // Check that dynamic handlers were cleared (off would be called for them)
    // This is a bit indirect; the hook clears dynamicHandlersRef.current and calls disconnect.
    // The cleanup function of the useEffect is responsible for .off calls.
    // When userId becomes null, the effect re-runs, hits the early return,
    // but the *previous* effect's cleanup function runs.
    expect((mockSocketReferenceForTests.off as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(initialSocketOffCount + 3); // +3 for connect, disconnect, connect_error
  });

  test('should disconnect and cleanup if nombreJugador becomes null', () => {
    const { result, rerender } = renderHook(
      (props: UseDominoSocketProps) => useDominoSocket(props),
      { initialProps: defaultProps }
    );
    expect(result.current.isConnected).toBe(true);

    act(() => {
      rerender({ ...defaultProps, nombreJugador: null });
    });

    expect(mockSocketReferenceForTests.disconnect).toHaveBeenCalledTimes(1);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.socket).toBeNull();
  });
  
  test('should re-initialize socket if userId/nombreJugador change from null to valid values', () => {
    const initialPropsNoUser = { ...defaultProps, userId: null, nombreJugador: null, autoConnect: false };
    const { result, rerender } = renderHook<ReturnType<typeof useDominoSocket>, UseDominoSocketProps>(
      (props) => useDominoSocket(props), // props will be correctly inferred as UseDominoSocketProps here
      { initialProps: initialPropsNoUser }
    );

    expect(mockIo).not.toHaveBeenCalled(); // Not called initially
    expect(result.current.socket).toBeNull();

    // Now provide valid userId and nombreJugador
    act(() => {
      rerender({ ...defaultProps, autoConnect: true }); // autoConnect true to trigger connection
    });
    
    // El hook internamente usará su propia constante SOCKET_SERVER_URL
    expect(mockIo).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      auth: { userId: defaultProps.userId, nombreJugador: defaultProps.nombreJugador },
    }));
    expect(mockSocketReferenceForTests.connect).toHaveBeenCalledTimes(1);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.socket).toBe(mockSocketReferenceForTests);
    expect(defaultProps.onConnect).toHaveBeenCalledTimes(1);
  });
});
