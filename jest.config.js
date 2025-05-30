// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './', // Path to your Next.js app
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
      testEnvironmentOptions: {
        htmlPointers: true, // Puede ayudar con ciertos comportamientos de JSDOM en Next.js
      },
  moduleNameMapper: {
    // Alias para los imports (ej. @/components/*)
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    // Forzar la resolución de React a la versión del proyecto
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
    '^react-dom/client$': '<rootDir>/node_modules/react-dom/client',
    // Puedes añadir más alias si los necesitas
  },
  // Si usas CSS Modules, puedes necesitar esto:
  // moduleNameMapper: {
  //   '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  // },
};

module.exports = createJestConfig(customJestConfig);
