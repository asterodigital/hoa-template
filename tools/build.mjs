/**
 * Main build script that orchestrates the entire build process
 * @module build
 */

import { fileURLToPath } from 'url'
import { log, validateOptions, createProgressIndicator, showBanner } from './utils.mjs'
import { clean } from './clean.mjs'
import { lint } from './lint.mjs'

import { buildPages } from './astro.mjs'
import { copyAssets } from './assets.mjs'
import { buildCss } from './css.mjs'
import { buildJs } from './js.mjs'

// Get the absolute path to the project root
// const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Runs the complete build process
 * @param {Object} [options] - Build options
 * @param {boolean} [options.skipLint=false] - Whether to skip linting
 * @param {boolean} [options.skipClean=false] - Whether to skip cleaning
 * @param {boolean} [options.skipFormat=false] - Whether to skip code formatting
 * @param {boolean} [options.verbose=false] - Whether to log verbose output
 * @param {boolean} [options.production=true] - Whether to build for production
 * @returns {Promise<void>}
 * @throws {Error} If build fails
 */
export async function build(options = {}) {
  // Validate and normalize options
  const opts = validateOptions(options, {
    skipLint: false,
    skipClean: false,
    skipFormat: false,
    verbose: false,
    production: true
  })

  try {
    const buildStartTime = performance.now()

    // Show professional banner with project info
    const path = await import('path')
    const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    await showBanner(projectRoot)

    log('Build process started', 'info', 'BUILD')

    // Clean output directory first if not skipped
    if (!opts.skipClean) {
      await clean({ verbose: opts.verbose })
      log('Clean completed', 'success', 'PRECHECK')
    } else {
      log('Skipping clean step', 'info', 'PRECHECK')
    }

    // Run linting if not skipped
    if (!opts.skipLint) {
      await lint(null, { verbose: opts.verbose })
      log('Lint completed', 'success', 'PRECHECK')
    } else {
      log('Skipping lint step', 'info', 'PRECHECK')
    }

    // Run remaining build steps in parallel for better performance
    log('Running parallel build steps...', 'info', 'BUILD')
    const progress = createProgressIndicator('Building assets...')

    let progressStopped = false
    const stopProgress = () => {
      if (!progressStopped) {
        progress()
        progressStopped = true
      }
    }

    const buildTasks = [
      buildCss({
        isDev: !opts.production,
        verbose: opts.verbose
      }).then(() => {
        stopProgress()
        log('CSS build completed', 'success', 'CSS')
      }),

      buildJs({
        isDev: !opts.production,
        verbose: opts.verbose
      }).then(() => {
        stopProgress()
        log('JavaScript build completed', 'success', 'JS')
      }),

      buildPages({
        skipTypeCheck: !opts.skipLint, // Skip type check since we already did it in lint phase
        verbose: opts.verbose
      }).then(() => {
        stopProgress()
        log('Astro build completed', 'success', 'ASTRO')
      }),

      copyAssets({
        verbose: opts.verbose
      }).then(() => {
        stopProgress()
        log('Assets copied', 'success', 'ASSETS')
      })
    ]

    const results = await Promise.allSettled(buildTasks)
    stopProgress() // Ensure progress is stopped even if all tasks fail

    const failures = results.filter((result) => result.status === 'rejected')

    if (failures.length > 0) {
      const errorMessages = failures.map((failure) => failure.reason.message).join('; ')
      throw new Error(`Build process failed during parallel execution: ${errorMessages}`)
    }

    const buildEndTime = performance.now()
    const totalTime = ((buildEndTime - buildStartTime) / 1000).toFixed(2)
    log(`✨ Build completed in ${totalTime}s`, 'success')
  } catch (error) {
    log('❌ Build process failed!', 'error')
    log(error.message, 'error')
    if (error.stack && opts.verbose) {
      log(`Stack trace: ${error.stack}`, 'error')
    }
    throw error
  }
}

// Execute build if script is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const skipLint = process.argv.includes('--skip-lint')
  const skipClean = process.argv.includes('--skip-clean')
  const skipFormat = process.argv.includes('--skip-format')
  const verbose = process.argv.includes('--verbose')
  const dev = process.argv.includes('--dev')

  build({
    skipLint,
    skipClean,
    skipFormat,
    verbose,
    production: !dev
  }).catch(() => {
    process.exit(1)
  })
}
