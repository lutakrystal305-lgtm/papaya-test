/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/cli.ts', '!src/index.ts', '!src/testing/**'],
  coverageDirectory: 'test-results/coverage',
  coverageReporters: ['text', 'json-summary', 'lcov'],
  clearMocks: true,
  coverageThreshold: {
    './src/cleaning/normalizers/': { branches: 100 },
    './src/generator/prng.ts': { branches: 100 },
    './src/': { lines: 80 },
  },
};
