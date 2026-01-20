# Cardboard Butler

Cardboard Butler is an open-source web application designed to help board game enthusiasts decide which game to play from their collection. It integrates with BoardGameGeek (BGG) to fetch user collections and provides various filtering and sorting options.

You can view the live version here: [Cardboard Butler](https://cardboardbutler.azureedge.net)

## Overview

As board game collections grow, the "Analysis Paralysis" of choosing what to play increases. Cardboard Butler aims to solve this by providing a streamlined interface to filter games based on player count, play time, and other criteria, helping groups get to the table faster.

## Project Structure

The project is structured as follows to help navigation for developers and LLMs:

- **`src/`**: The source code for the React application.
  - **`components/`**: React components for the UI (e.g., `App.tsx`, `CollectionPage.tsx`).
  - **`services/`**: Business logic and data services (e.g., BGG API interaction, game sorting/filtering).
  - **`models/`**: TypeScript interfaces and types.
  - **`assets/`**: Static assets like images.
- **`scripts/`**: Utility scripts, primarily for the production server.
- **`tests/`**: Unit and integration tests.
- **`dist/`**: The output directory for the production build (generated).

## Installation

Ensure you have [Node.js](https://nodejs.org/) installed. This project uses [Yarn](https://yarnpkg.com/) for dependency management.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/PhilipK/CardboardButler.git
    cd CardboardButler
    ```

2.  **Install dependencies:**
    Using npm:
    ```bash
    npm install
    ```
    Or using Yarn:
    ```bash
    yarn install
    ```

## Development

To start the development server with hot reloading:

```bash
yarn start
```
or
```bash
npm start
```

The application will be available at [http://localhost:8080](http://localhost:8080).

### Available Scripts

The following scripts are defined in `package.json`:

- **`yarn start`** (or `npm start`): Runs the development server (`start-dev`).
- **`yarn run start-dev`**: Starts the Webpack Dev Server in development mode with hot reloading.
- **`yarn run build`**: Cleans the `dist` directory and creates a production-ready build using Webpack.
- **`yarn run start-prod`**: builds the project and starts a production-like Express server to serve the content from `dist`.
- **`yarn test`**: Runs Jest in watch mode for interactive testing.
- **`yarn run test-coverage`**: Runs tests with coverage reporting.
- **`yarn run test-ci`**: Runs tests once (CI mode) with coverage and JUnit reporting.

## Testing

Unit tests are written using Jest and React Testing Library.

To run tests in watch mode:
```bash
yarn test
```

To run a single pass of tests (useful for CI):
```bash
yarn run test-ci
```

## Building for Production

To create a production build:

```bash
yarn run build
```

The optimized files will be generated in the `dist/` directory.

To preview the production build locally:
```bash
yarn run start-prod
```

## Contributing

We welcome contributions! Please follow these steps:

1.  **Fork** the repository.
2.  **Create a branch** for your feature or bug fix: `git checkout -b my-new-feature`.
3.  **Commit** your changes: `git commit -am 'Add some feature'`.
4.  **Push** to the branch: `git push origin my-new-feature`.
5.  **Submit a Pull Request**.

## Support BGG

All game data is sourced from [BoardGameGeek](https://www.boardgamegeek.com).
If you enjoy using Cardboard Butler, please consider supporting BGG [here](https://boardgamegeek.com/support).

[![Build Status](https://dev.azure.com/philipkristoffersen/Cardboard%20Butler/_apis/build/status/PhilipK.CardboardButler?branchName=master)](https://dev.azure.com/philipkristoffersen/Cardboard%20Butler/_build/latest?definitionId=1&branchName=master)
