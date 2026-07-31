const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  // Only this project's own tests. Without this, jest walks into mobile/ and
  // node_modules and tries to run vendored package test suites.
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
}

module.exports = createJestConfig(config)
