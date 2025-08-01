module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/tests/',
    '<rootDir>/__tests__/wordpressWebhook.test.ts',
    '<rootDir>/__tests__/useNavigationRouting.test.ts',
  ],
};
