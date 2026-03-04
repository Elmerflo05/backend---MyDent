/**
 * Configuración de Jest para tests del backend
 */

module.exports = {
  // Entorno de ejecución
  testEnvironment: 'node',

  // Directorios de tests
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],

  // Cobertura de código
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'middlewares/**/*.js',
    'controllers/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ],

  // Umbrales de cobertura
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Timeout por defecto (10 segundos)
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks automáticamente entre tests
  clearMocks: true,

  // Restaurar mocks automáticamente
  restoreMocks: true,

  // Configuración de transformación (para módulos ES6)
  transform: {},

  // Módulos que no deben ser transformados
  transformIgnorePatterns: [
    'node_modules/(?!(supertest)/)'
  ]
};
