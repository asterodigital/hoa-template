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
const startPort = process.env.PORT || 3001
let currentPort = startPort
const OFFLINE_DIR = join(projectRoot, 'dist/offline')

/**
 * Checks if the offline build exists and is complete.
 * @returns {Promise<boolean>} True if build exists and is complete
 */
async function checkOfflineBuildExists() {
  try {
    const requiredFiles = ['index.html', 'css/style.min.css', 'js/main.min.js']

    for (const file of requiredFiles) {
      await fs.access(join(OFFLINE_DIR, file))
    }

    return true
  } catch {
    return false
  }
}

// CORS headers to allow local file access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

// Serve static files from offline build directory
app.use(express.static(OFFLINE_DIR))

// Handle root route explicitly
app.get('/', (req, res) => {
  res.sendFile(join(OFFLINE_DIR, 'index.html'))
})

// Function to try starting server with auto port increment if needed
function startServer(port) {
  const server = createServer(app)

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      log(`Port ${port} is in use, trying port ${port + 1}...`, 'warning', 'SERVE-OFF')
      currentPort = port + 1
      startServer(currentPort)
    } else {
      log(`Server error: ${error.message}`, 'error', 'SERVE-OFF')
    }
  })

  server.listen(port, async () => {
    const url = `http://localhost:${port}`
    const urlText = `Offline Build Server running at ${url}`
    const separator = '='.repeat(urlText.length + 4)

    console.log()
    console.log(chalk.blue(separator))
    console.log(chalk.blue.bold(`  ${urlText}  `))
    console.log(chalk.blue(separator))
    console.log()

    log(`Serving offline build from: ${OFFLINE_DIR}`, 'info', 'SERVE-OFF')
    log('This server resolves CORS issues when testing offline paths locally', 'info', 'SERVE-OFF')

    // Open in default browser
    try {
      await open(`http://localhost:${port}`)
      log('Offline build opened in your default browser', 'success', 'SERVE-OFF')
    } catch {
      log('Could not automatically open the browser', 'warning', 'SERVE-OFF')
    }
  })
}

// Main function to start the server
async function main() {
  await showBanner(projectRoot)
  log('Starting offline build server...', 'info', 'SERVE-OFF')

  const buildExists = await checkOfflineBuildExists()
  if (!buildExists) {
    log('Offline build not found or is incomplete.', 'error', 'SERVE-OFF')
    log('Please run the offline build command first: npm run build:offline', 'info', 'SERVE-OFF')
    process.exit(1)
  }

  // Start the server
  startServer(currentPort)
}

main().catch((error) => {
  log(`Failed to start offline build server: ${error.message}`, 'error', 'SERVE-OFF')
  process.exit(1)
})
