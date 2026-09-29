module.exports = {
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  roots: ["<rootDir>/src"],
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { isolatedModules: true }],
  },
};
