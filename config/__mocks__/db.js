/**
 * Mock del pool de base de datos para tests
 */

const pool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn()
};

module.exports = pool;
