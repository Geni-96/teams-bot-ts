const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testMatch: ['**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: ['**/*.ts', '!**/*.d.ts'],
  coverageDirectory: '../coverage',
  resetMocks: true,
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts']
};

module.exports = config;
