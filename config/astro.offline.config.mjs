/*
Astro config for relative path builds - used for ThemeForest submission
This config generates HTML with relative paths for file:// compatibility
*/

import { defineConfig } from 'astro/config'
import path from 'path'

// Custom Vite plugin to watch for asset changes and trigger HMR
const assetHmrPlugin = () => {
  return {
    name: 'asset-hmr-plugin',
    configureServer(server) {
      // Watch for changes in the dist directory
      const watcher = server.watcher

      // Add dist directory to the watcher
      watcher.add(path.resolve('./dist'))

      // Watch for the reload trigger files
      watcher.on('change', (filePath) => {
        if (filePath.includes('.reload-trigger') || filePath.includes('reload-')) {
          // Force reload all clients
          server.ws.send({ type: 'full-reload' })
        }
      })

      // Watch for asset changes
      watcher.on('add', (filePath) => {
        if (filePath.startsWith(path.resolve('./dist'))) {
          // Force reload all clients
          server.ws.send({ type: 'full-reload' })
        }
      })
    }
  }
}

// https://astro.build/config
export default defineConfig({
  devToolbar: { enabled: false }, // Disable the dev toolbar
  build: {
    // Generate individual HTML files instead of directories
    format: 'file',
    // Use relative asset references
    assets: '_astro'
  },

  srcDir: './src/html',
  cacheDir: './dist/offline',
  outDir: './dist/offline',
  trailingSlash: 'never',

  // Set base to './' for relative paths
  base: './',

  // Configure build to use relative paths
  output: 'static',

  vite: {
    plugins: [assetHmrPlugin()],
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true
        }
      }
    },
    // Define the environment variable for relative builds
    define: {
      'import.meta.env.PUBLIC_RELATIVE_PATHS': '"true"'
    },
    server: {
      watch: {
        // Include dist folder and ensure assets are watched
        ignored: ['!**/dist/**'],
        // Add additional files/directories to watch
        additionalPaths: ['src/assets/**/*', 'dist/**/*']
      },
      // Simplified HMR configuration to avoid WebSocket errors
      hmr: true
    }
  }
})
