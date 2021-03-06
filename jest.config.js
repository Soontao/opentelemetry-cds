
/**
 * @type {import("@jest/types").Config.ProjectConfig}
 */
module.exports = {
  testTimeout: 10 * 1000,
  transform: {
    ".(ts|tsx)": "ts-jest"
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!**/node_modules/**"
  ],
  coveragePathIgnorePatterns: [
    "node_modules/",
  ],
  testEnvironment: "node",
  testRegex: "/test/.*\\.test\\.ts$",
  moduleFileExtensions: [
    "ts",
    "js",
    "json"
  ],
  reporters: ["default", ["jest-junit", { outputDirectory: "coverage" }]]
};
