/**
 * Core build system utilities
 * @module utils
 */

import spawn from 'cross-spawn'
import chalk from 'chalk'

/**
 * Log types configuration with icons and colors
 * @constant {Object}
 */
const LOG_TYPES = {
  success: { icon: '✓', color: chalk.green },
  error: { icon: '✗', color: chalk.red },
  warning: { icon: '⚠', color: chalk.yellow },
  info: { icon: 'ℹ', color: chalk.blue }
}

/**
 * Color mapping for different log contexts.
 * @constant {Object}
 */
const CONTEXT_COLORS = {
  BUILD: chalk.magentaBright,
  PRECHECK: chalk.cyanBright,
  CSS: chalk.blueBright,
  JS: chalk.yellowBright,
  ASSETS: chalk.greenBright,
  ASTRO: chalk.magenta // Astro purple
}

/**
 * Executes shell command with output streaming and error handling
 * @param {string} command - Command to execute
 * @param {string[]} args - Command arguments
 * @param {object} options - Spawn options
 * @returns {Promise<void>} - Resolves when command completes successfully
 * @throws {Error} - If command fails or is interrupted
 */
export function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options
    })

    // Handle user interruption - use once to prevent memory leaks
    const handleInterrupt = () => {
      child.kill('SIGINT')
      reject(new Error('Command interrupted by user'))
    }

    child.on('error', (error) => {
      process.removeListener('SIGINT', handleInterrupt)
      reject(new Error(`Failed to start command: ${error.message}`))
    })

    child.on('close', (code) => {
      process.removeListener('SIGINT', handleInterrupt)
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })

    process.once('SIGINT', handleInterrupt)
  })
}

/**
 * Executes shell command quietly, only showing output on error
 * @param {string} command - Command to execute
 * @param {string[]} args - Command arguments
 * @param {object} options - Spawn options
 * @returns {Promise<void>} - Resolves when command completes successfully
 * @throws {Error} - If command fails or is interrupted
 */
export function runCommandQuiet(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      ...options
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    // Handle user interruption - use once to prevent memory leaks
    const handleInterrupt = () => {
      child.kill('SIGINT')
      reject(new Error('Command interrupted by user'))
    }

    child.on('error', (error) => {
      process.removeListener('SIGINT', handleInterrupt)
      reject(new Error(`Failed to start command: ${error.message}`))
    })

    child.on('close', (code) => {
      process.removeListener('SIGINT', handleInterrupt)
      if (code === 0) {
        resolve()
      } else {
        // Only show output on error
        if (stdout.trim()) console.log(stdout)
        if (stderr.trim()) console.error(stderr)
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })

    process.once('SIGINT', handleInterrupt)
  })
}

/**
 * Logs timestamped and formatted message
 * @param {string} message - Message to log
 * @param {string} type - Log type (info, success, error, warning)
 * @param {string} [context] - Optional context label for the log
 */
export function log(message, type = 'info', context = null) {
  const timestamp = new Date().toLocaleTimeString()
  const timestampStr = chalk.gray(`[${timestamp}]`)
  const logType = LOG_TYPES[type] || LOG_TYPES.info

  // Add context if provided
  let contextStr = ''
  if (context) {
    // Use specific color for context if available, otherwise default to cyan
    const colorizer = CONTEXT_COLORS[context] || chalk.cyan
    contextStr = colorizer(`[${context}]`) + ' '
  }

  console.log(`${timestampStr} ${logType.color(logType.icon)} ${contextStr}${message}`)
}

/**
 * Validates and normalizes options object with defaults
 * @param {Object} options - Input options
 * @param {Object} defaults - Default values
 * @param {string[]} [requiredKeys] - Required option keys
 * @returns {Object} Normalized options
 * @throws {Error} If required keys are missing
 */
export function validateOptions(options = {}, defaults = {}, requiredKeys = []) {
  // Check for required keys
  for (const key of requiredKeys) {
    if (!(key in options) && !(key in defaults)) {
      throw new Error(`Required option '${key}' is missing`)
    }
  }

  // Merge with defaults
  return {
    ...defaults,
    ...options
  }
}

/**
 * Displays a professional banner with project information
 * @param {string} projectRoot - Path to project root
 * @returns {Promise<void>}
 */
export async function showBanner(projectRoot) {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')

    // Read package.json
    const packagePath = path.join(projectRoot, 'package.json')
    const packageContent = await fs.readFile(packagePath, 'utf8')
    const pkg = JSON.parse(packageContent)

    // Create banner
    const name = pkg.name || 'Unknown Project'
    const version = pkg.version || '0.0.0'
    const description = pkg.description || ''
    const author = pkg.author || ''

    // Banner design
    const bannerWidth = 60
    const border = '═'.repeat(bannerWidth)
    const title = `${name} v${version}`

    // Use purple color #9046FF
    const purpleColor = chalk.hex('#9046FF')

    console.log('')
    console.log(purpleColor(`╔${border}╗`))
    console.log(purpleColor(`║${' '.repeat(bannerWidth)}║`))
    console.log(
      purpleColor(`║${title.padStart((bannerWidth + title.length) / 2).padEnd(bannerWidth)}║`)
    )

    if (description) {
      console.log(purpleColor(`║${' '.repeat(bannerWidth)}║`))
      // Center-align description
      const maxDescLength = bannerWidth
      if (description.length > maxDescLength) {
        const words = description.split(' ')
        let line = ''
        for (const word of words) {
          if ((line + word).length > maxDescLength) {
            const centeredLine = line
              .trim()
              .padStart((bannerWidth + line.trim().length) / 2)
              .padEnd(bannerWidth)
            console.log(purpleColor(`║${centeredLine}║`))
            line = word + ' '
          } else {
            line += word + ' '
          }
        }
        if (line.trim()) {
          const centeredLine = line
            .trim()
            .padStart((bannerWidth + line.trim().length) / 2)
            .padEnd(bannerWidth)
          console.log(purpleColor(`║${centeredLine}║`))
        }
      } else {
        const centeredDesc = description
          .padStart((bannerWidth + description.length) / 2)
          .padEnd(bannerWidth)
        console.log(purpleColor(`║${centeredDesc}║`))
      }
    }

    if (author) {
      console.log(purpleColor(`║${' '.repeat(bannerWidth)}║`))
      // Remove "by" and center-align author
      const centeredAuthor = author.padStart((bannerWidth + author.length) / 2).padEnd(bannerWidth)
      console.log(purpleColor(`║${centeredAuthor}║`))
    }

    console.log(purpleColor(`║${' '.repeat(bannerWidth)}║`))
    console.log(purpleColor(`╚${border}╝`))
    console.log('')
  } catch (error) {
    // If banner fails, just continue silently
    console.log('')
  }
}

/**
 * Creates a progress indicator for long-running operations
 * @param {string} message - Progress message
 * @param {number} [interval=500] - Update interval in ms
 * @returns {Function} Stop function
 */
export function createProgressIndicator(message, interval = 500) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let frameIndex = 0

  const timer = setInterval(() => {
    process.stdout.write(`\r${chalk.blue(frames[frameIndex])} ${message}`)
    frameIndex = (frameIndex + 1) % frames.length
  }, interval)

  return () => {
    clearInterval(timer)
    // More aggressive clearing - clear entire line and move cursor
    process.stdout.write('\r') // Move to start of line
    process.stdout.write(' '.repeat(80)) // Clear with more spaces
    process.stdout.write('\r') // Move back to start
    process.stdout.clearLine(0) // Clear the entire line
    process.stdout.cursorTo(0) // Move cursor to column 0
  }
}
