import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'
import { log, showBanner } from './utils.mjs'
import fs from 'fs/promises'
import open from 'open'
import { createServer } from 'http'
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')

const app = express()
const startPort = process.env.PORT || 3000
let currentPort = startPort
const DIST_DIR = join(projectRoot, 'dist')

/**
 * Checks if the production build exists and is complete.
 * @returns {Promise<boolean>}
 */
async function checkBuildExists() {
  try {
    const requiredFiles = [
      'index.html',
      'css/style.min.css',
      'js/main.js' // Assuming main.js is a key JS file
    ]

    for (const file of requiredFiles) {
      await fs.access(join(DIST_DIR, file))
    }

    return true
  } catch {
    return false
  }
}

// Custom middleware to handle URLs without .html extension
app.use(async (req, res, next) => {
  if (req.path.endsWith('/')) {
    // Check if index.html exists in the directory
    const indexPath = join(DIST_DIR, req.path, 'index.html')
    try {
      await fs.access(indexPath)
      req.url = join(req.path, 'index.html')
    } catch {
      // Do nothing, will be handled by static server or final handler
    }
  } else if (!req.path.includes('.')) {
    // If path has no extension, check if .html version exists
    const htmlPath = join(DIST_DIR, `${req.path}.html`)
    try {
      await fs.access(htmlPath)
      req.url = `${req.path}.html`
    } catch {
      // Do nothing
    }
  }
  next()
})

// Serve static files from dist directory
app.use(express.static(DIST_DIR))

// Handle all routes by serving index.html for non-existent paths
app.use((req, res) => {
  res.sendFile(join(DIST_DIR, 'index.html'))
})

// Function to try starting server with auto port increment if needed
function startServer(port) {
  const server = createServer(app)

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      log(`Port ${port} is in use, trying port ${port + 1}...`, 'warning', 'SERVE')
      currentPort = port + 1
      startServer(currentPort)
    } else {
      log(`Server error: ${error.message}`, 'error', 'SERVE')
    }
  })

  server.listen(port, async () => {
    const url = `http://localhost:${port}`
    const urlText = `Server running at ${url}`
    const separator = '='.repeat(urlText.length + 4)

    console.log()
    console.log(chalk.green(separator))
    console.log(chalk.green.bold(`  ${urlText}  `))
    console.log(chalk.green(separator))
    console.log()

    log(`Serving files from: ${DIST_DIR}`, 'info', 'SERVE')

    // Open dashboard in default browser
    try {
      await open(`http://localhost:${port}/pages/dashboard`)
      log('Project opened in your default browser', 'success', 'SERVE')
    } catch {
      log('Could not automatically open the browser', 'warning', 'SERVE')
    }
  })
}

// Main function to start the server
async function main() {
  await showBanner(projectRoot)
  log('Starting production server...', 'info', 'SERVE')

  const buildExists = await checkBuildExists()
  if (!buildExists) {
    log('Production build not found or is incomplete.', 'error', 'SERVE')
    log(
      'Please run the build command first: npm run build or node tools/build.mjs',
      'info',
      'SERVE'
    )
    process.exit(1)
  }

  // Start the server
  startServer(currentPort)
}

main().catch((error) => {
  log(`Failed to start server: ${error.message}`, 'error', 'SERVE')
  process.exit(1)
})
