import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

// Pure lib/ logic under test — no DOM needed, so 'node' over the jsdom default
// (component tests opt into jsdom per-file via a `@jest-environment` docblock).
const config = {
  coverageProvider: "v8",
  testEnvironment: "node",
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  // Mirrors tsconfig.json's "@/*" path — not handled automatically by next/jest.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

export default createJestConfig(config);
