/**
 * Jest Configuration
 *
 * This file configures Jest, the testing framework used in this project.
 * It specifies how to find and transform files, manage coverage, and report results.
 */

module.exports = {
  // A list of paths to directories that Jest should use to search for files in.
  "roots": [
    "<rootDir>/src",
    "<rootDir>/tests"
  ],
  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  "moduleNameMapper": {
    // Mock static file imports (images, videos, fonts)
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/tests/__mocks__/fileMock.js",
    // Mock CSS imports
    "\\.(css|scss|less)$": "<rootDir>/tests/__mocks__/styleMock.js"
  },
  // The directory where Jest should output its coverage files
  coverageDirectory: "<rootDir>/tests/__coverage__/",
  // A map from regular expressions to paths to transformers
  "transform": {
    // Use ts-jest to transform TypeScript files
    "^.+\\.tsx?$": "ts-jest"
  },
  // A list of reporter names that Jest uses when writing coverage reports
  "reporters": ["default", "jest-junit"]
}
