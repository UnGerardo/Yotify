
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    'ipaddr.js': 'ipaddr.js/lib/ipaddr.js',
    'src/(.*)\\.js$': '<rootDir>/src/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
    '^(.*)\\.js$': '$1',
  },
};