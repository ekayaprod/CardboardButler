/**
 * Webpack Configuration
 *
 * This file contains the configuration for Webpack, a module bundler.
 * It handles bundling of JavaScript/TypeScript, CSS/SCSS, and asset files.
 * It provides separate configurations for development and production environments.
 */

const { resolve } = require('path');
const webpack = require('webpack');
const { CheckerPlugin } = require('awesome-typescript-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const merge = require('webpack-merge');

/**
 * Common Configuration
 * Shared settings used in both development and production builds.
 */
const commonConfig = {
  resolve: {
    // Extensions to resolve automatically
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    // Alias for React DOM to support hot reloading
    alias: { 'react-dom': '@hot-loader/react-dom' }
  },
  // Base directory for resolving entry points
  context: resolve(__dirname, 'src'),
  module: {
    rules: [
      // Rule for JavaScript files
      {
        test: /\.js$/,
        use: ['babel-loader', 'source-map-loader'],
        exclude: /node_modules/,
      },
      // Rule for TypeScript files
      {
        test: /\.tsx?$/,
        use: ['babel-loader', 'awesome-typescript-loader'],
      },
      // Rule for CSS files
      {
        test: /\.css$/,
        use: ['style-loader', { loader: 'css-loader', options: { importLoaders: 1 } }],
      },
      // Rule for SCSS/SASS files
      {
        test: /\.scss$/,
        loaders: [
          'style-loader', // Injects styles into DOM
          { loader: 'css-loader', options: { importLoaders: 1 } }, // Interprets @import and url() like import/require()
          'sass-loader', // Loads a SASS/SCSS file and compiles it to CSS
        ],
      },
      // Rule for image assets
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        use: [
          'file-loader?hash=sha512&digest=hex&name=img/[hash].[ext]',
        ],
      },
    ],
  },
  plugins: [
    // Plugin for awesome-typescript-loader to perform type checking in a separate process
    new CheckerPlugin(),
    // Generates an HTML file from the template and injects the bundle
    new HtmlWebpackPlugin({ template: '../public/index.html', }),
  ],
  performance: {
    hints: false, // Disable performance hints (e.g. asset size warnings)
  },
};

/**
 * Development Configuration
 * Settings specific to the development environment (e.g. hot reloading).
 */
const devConfig = {
  mode: 'development',
  entry: [
    'react-hot-loader/patch', // activate HMR for React
    'webpack-dev-server/client?http://localhost:8080',// bundle the client for webpack-dev-server and connect to the provided endpoint
    'webpack/hot/only-dev-server', // bundle the client for hot reloading, only- means to only hot reload for successful updates
    './index.tsx' // the entry point of our app
  ],
  devServer: {
    hot: true, // enable HMR on the server
  },
  devtool: 'cheap-module-eval-source-map', // fast source maps for dev
  plugins: [
    new webpack.HotModuleReplacementPlugin(), // enable HMR globally
    new webpack.NamedModulesPlugin(), // prints more readable module names in the browser console on HMR updates
  ],
};

/**
 * Production Configuration
 * Settings specific to the production build (e.g. optimization, minification).
 */
const prodConfig = {
  mode: 'production',
  entry: './index.tsx', // Single entry point for production
  output: {
    filename: 'cardboardbutler.[hash].min.js', // Hashed filename for cache busting
    chunkFilename: '[name].[hash].min.js',
    path: resolve(__dirname, 'dist'), // Output directory
    publicPath: '',
  },
  devtool: 'source-map', // Full source maps for production debugging
  plugins: [],
  optimization: {
    splitChunks: {
      cacheGroups: {
        default: false,
        vendors: false,
        // Create a separate vendor chunk for node_modules
        vendor: {
          name: "vendor",
          // sync + async chunks
          chunks: 'all',
          // import file path containing node_modules
          test: /node_modules/
        }
      }
    }
  }
};

/**
 * Export the appropriate configuration based on the mode argument.
 */
module.exports = (env, argv) => {
  if (argv.mode === 'production') {
    return merge(commonConfig, prodConfig);
  }
  return merge(commonConfig, devConfig);
};
