import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

// Pure lib/ logic under test — no DOM needed, so 'node' over the jsdom default.
const config = {
  coverageProvider: "v8",
  testEnvironment: "node",
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
};

export default createJestConfig(config);
