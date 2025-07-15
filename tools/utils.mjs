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
  const contextStr = context ? chalk.cyan(`[${context}]`) + ' ' : ''

  console.log(`${timestampStr} ${logType.color(logType.icon)} ${contextStr}${message}`)
}
