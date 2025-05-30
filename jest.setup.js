// jest.setup.js
import '@testing-library/jest-dom';

// Mockear next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

// Mockear socket.io-client
// Guardaremos una referencia a la instancia mock del socket para controlarla en las pruebas
let mockSocketInstance;
jest.mock('socket.io-client', () => {
  const actualIO = jest.requireActual('socket.io-client');
  return {
    ...actualIO,
    io: jest.fn(() => mockSocketInstance), // io() devolverá nuestra instancia mock
  };
});

// Mockear sessionStorage
const mockSessionStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    // Necesario para que el mock sea completo
    key: (index) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    }
  };
})();
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Mockear window.matchMedia (usado para showRotateMessage)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false, // Default a no landscape o no mobile
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mockear URLSearchParams y window.location.search
const mockURLSearchParamsInstance = {
  get: jest.fn(),
  // Añade otros métodos de URLSearchParams si los usas
};
Object.defineProperty(window, 'URLSearchParams', {
  writable: true,
  value: jest.fn().mockImplementation(() => mockURLSearchParamsInstance),
});

// Mockear window.location
// En lugar de borrar y reasignar, vamos a definir las propiedades que necesitamos
// y asegurarnos de que 'search' sea writable.
const originalLocation = window.location;

delete window.location; // Necesario para poder redefinir con Object.defineProperty

window.location = Object.defineProperties(
  {},
  {
    ...Object.getOwnPropertyDescriptors(originalLocation), // Copia las propiedades existentes
    assign: { configurable: true, value: jest.fn() },
    replace: { configurable: true, value: jest.fn() },
    reload: { configurable: true, value: jest.fn() },
    // Hacemos 'search' configurable y writable para poder modificarlo en los tests
    search: {
      configurable: true,
      writable: true,
      value: '', // Valor inicial
    },
  }
);

// Mockear ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

// Helper para resetear y configurar el mock del socket antes de cada test
global.setupMockSocket = () => {
  mockSocketInstance = {
    on: jest.fn(),
    emit: jest.fn(),
    // Asegúrate de que 'id' se inicializa aquí también si es necesario globalmente,
    // o que se setea correctamente en el beforeEach del test.
    // id: 'mock-socket-id-setup', // Ejemplo
    disconnect: jest.fn(),
    connect: jest.fn(), // Para simular la conexión
    connected: false,
    id: 'mock-socket-id-' + Math.random().toString(36).substring(7),
  };
  // Asegurarse de que io() en el mock de socket.io-client devuelva esta nueva instancia
  const socketIOClient = require('socket.io-client');
  socketIOClient.io.mockReturnValue(mockSocketInstance);
  return mockSocketInstance;
};

global.getMockSocketInstance = () => mockSocketInstance;
global.getMockURLSearchParams = () => mockURLSearchParamsInstance;

// Helper para modificar window.location.search en los tests
global.setWindowLocationSearch = (searchString) => {
  window.location.search = searchString;
};
