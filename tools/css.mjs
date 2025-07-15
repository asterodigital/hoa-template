/**
 * Handles CSS processing: SASS compilation, prefixing, RTL generation, and minification
 * @module css
 */

import { fileURLToPath } from 'url'
import { log, validateOptions } from './utils.mjs'
import { transform } from 'lightningcss'
import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'
import * as sass from 'sass-embedded'
import { URL } from 'url'
import { readFileSync } from 'fs'
import { Listr } from 'listr2'

// Get the absolute path to the project root
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Read package.json from root directory
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const year = new Date().getFullYear()
const banner = `/*!
 * Astero Admin v${pkg.version} (${pkg.homepage})
 * Copyright 2025-${year} ${pkg.author}
 * Licensed under MIT (https://github.com/asterodigital/bootstrap-admin-template/blob/master/LICENSE)
 */`

/**
 * Compiles SASS to CSS
 * @param {Object} [options] - Compilation options
 * @param {boolean} [options.verbose=false] - Whether to log verbose output
 * @param {string} [options.entryFile='src/scss/style.scss'] - Entry SASS file
 * @returns {Promise<void>}
 * @throws {Error} If compilation fails
 */
async function compileSass(options = {}) {
  const opts = {
    ...{ verbose: false, silent: false, entryFile: 'src/scss/style.scss' },
    ...options
  }
  const log = (...args) => !opts.silent && log(...args)

  log('Compiling SASS...', 'info', 'CSS')

  try {
    // Ensure the entry file exists and is properly resolved
    if (!opts.entryFile) {
      throw new Error('Entry file path is undefined or empty')
    }

    const entryFilePath = path.resolve(projectRoot, opts.entryFile)

    try {
      await fs.access(entryFilePath)
    } catch {
      throw new Error(`SASS entry file not found: ${entryFilePath}`)
    }

    // Compile SASS with development-specific settings
    const result = await sass.compileAsync(entryFilePath, {
      style: 'expanded',
      sourceMap: true,
      sourceMapIncludeSources: true,
      loadPaths: [path.join(projectRoot, 'src/scss')],
      // Use silent logger to suppress all warnings
      logger: sass.Logger.silent,
      // Additional options to suppress specific warnings
      quietDeps: true,
      warn: false
    })

    log('SASS compilation successful', 'success', 'CSS')

    // Ensure output directory exists
    const cssDir = path.join(projectRoot, 'dist/css')
    await fs.mkdir(cssDir, { recursive: true })

    // Ensure source map has correct source path
    if (result.sourceMap) {
      result.sourceMap.sources = result.sourceMap.sources.map((source) =>
        source.startsWith('/') ? source.substring(1) : source
      )
    }

    // Add sourcemap URL to CSS file
    const cssWithSourceMap = banner + '\n' + result.css + '\n/*# sourceMappingURL=style.css.map */'
    const cssOutputPath = path.join(cssDir, 'style.css')
    await fs.writeFile(cssOutputPath, cssWithSourceMap)

    if (result.sourceMap) {
      const mapOutputPath = path.join(cssDir, 'style.css.map')
      await fs.writeFile(mapOutputPath, JSON.stringify(result.sourceMap, null, 2))
    }

    // Create a reload trigger file for Astro
    const reloadFilePath = path.join(projectRoot, 'dist', '.reload-trigger')
    await fs.mkdir(path.dirname(reloadFilePath), { recursive: true })
    await fs.writeFile(reloadFilePath, `Last CSS update: ${new Date().toISOString()}`)

    if (opts.verbose) {
      log(`CSS written to ${path.relative(projectRoot, cssOutputPath)}`, 'info', 'CSS')
    }
  } catch (error) {
    log(`SASS compilation error: ${error.message}`, 'error', 'CSS')
    throw error
  }
}

/**
 * Minifies a CSS file
 * @param {string} inputPath - Path to the CSS file to minify
 * @param {Object} [options] - Minification options
 * @param {boolean} [options.verbose=false] - Whether to log verbose output
 * @returns {Promise<void>}
 * @throws {Error} If minification fails
 */
async function minifyCSS(inputPath, options) {
  const opts = { ...{ verbose: false, silent: false }, ...options }
  const log = (...args) => !opts.silent && log(...args)
  const fileName = path.basename(inputPath)

  log(`Minifying ${fileName}...`, 'info', 'CSS')

  try {
    // Check if input file exists
    try {
      await fs.access(inputPath)
    } catch {
      throw new Error(`CSS file not found: ${inputPath}`)
    }

    const code = await fs.readFile(inputPath, 'utf8')

    // Remove existing banner if present
    const codeWithoutBanner = code.replace(/\/\*![\s\S]*?\*\/\n?/, '')

    const { code: minified } = transform({
      filename: fileName,
      code: Buffer.from(codeWithoutBanner),
      minify: true,
      // Skip source map generation for minified files
      sourceMap: false
    })

    const outputPath = inputPath.replace('.css', '.min.css')
    await fs.writeFile(outputPath, banner + '\n' + minified)

    if (opts.verbose) {
      const originalSize = code.length
      const minifiedSize = minified.length
      const savings = (((originalSize - minifiedSize) / originalSize) * 100).toFixed(2)
      log(
        `Minified ${fileName}: ${savings}% smaller (${originalSize} -> ${minifiedSize} bytes)`,
        'info',
        'CSS'
      )
    }

    log(`Minified ${fileName} -> ${path.basename(outputPath)}`, 'success', 'CSS')
  } catch (error) {
    log(`Minification error for ${inputPath}: ${error.message}`, 'error', 'CSS')
    throw error
  }
}

/**
 * Minifies all CSS files in the dist/css directory
 * @param {Object} [options] - Minification options
 * @param {boolean} [options.verbose=false] - Whether to log verbose output
 * @returns {Promise<void>}
 */
async function minifyAllCSS(options = { verbose: false }) {
  const opts = { ...{ verbose: false, silent: false }, ...options }
  const log = (...args) => !opts.silent && log(...args)
  log('Starting CSS minification...', 'info', 'CSS')

  try {
    const cssFiles = await glob('dist/css/*.css')
    const filesToMinify = cssFiles.filter((file) => !file.includes('.min.css'))

    if (filesToMinify.length === 0) {
      log('No CSS files found to minify', 'warning', 'CSS')
      return
    }

    log(`Found ${filesToMinify.length} CSS files to minify`, 'info', 'CSS')

    // Process files sequentially to avoid overwhelming the system
    for (const file of filesToMinify) {
      try {
        await minifyCSS(file, options)
      } catch (error) {
        // Log error but continue with other files
        log(`Error minifying ${file}: ${error.message}`, 'error', 'CSS')
        throw error // Re-throw the error to fail the task
      }
    }

    log('CSS minification completed', 'success', 'CSS')
  } catch (error) {
    log(`CSS minification error: ${error.message}`, 'error', 'CSS')
    throw error // Re-throw the error
  }
}

/**
 * Processes CSS files with PostCSS (adds vendor prefixes)
 * @param {string[]} files - Array of CSS file paths to process
 * @param {Object} [options] - Processing options
 * @param {boolean} [options.verbose=false] - Whether to log verbose output
 * @returns {Promise<void>}
 */
async function processWithPostcss(files, options = { verbose: false }) {
  const opts = { ...{ verbose: false, silent: false }, ...options }
  const log = (...args) => !opts.silent && log(...args)
  log('Adding vendor prefixes...', 'info', 'CSS')

  try {
    if (files.length === 0) {
      log('No CSS files to process with PostCSS', 'warning', 'CSS')
      return
    }

    const postcss = await import('postcss')
    const autoprefixer = await import('autoprefixer')

    // Get the configuration
    const configPath = path.join(projectRoot, 'config/postcss.config.mjs')
    try {
      await fs.access(configPath)
    } catch {
      throw new Error(`PostCSS config file not found: ${configPath}`)
    }

    // Convert to file URL for ESM import compatibility (especially on Windows)
    const configUrl = path.isAbsolute(configPath)
      ? new URL(
          `file://${configPath.replace(/\\/g, '/').replace(/^([a-zA-Z]):/, (_, drive) => `/${drive}:`)}`
        )
      : new URL(configPath, import.meta.url)

    const postcssConfig = await import(configUrl)
    const config = postcssConfig.default({ env: 'production' })

    // Create array of plugins from config
    const plugins = []
    if (config.plugins) {
      if (config.plugins.autoprefixer) {
        plugins.push(autoprefixer.default(config.plugins.autoprefixer))
      }
    }

    if (plugins.length === 0) {
      log('No PostCSS plugins configured, skipping', 'warning', 'CSS')
      return
    }

    for (const file of files) {
      if (opts.verbose) {
        log(`Adding vendor prefixes to ${path.basename(file)}...`, 'info', 'CSS')
      }
      try {
        const css = await fs.readFile(file, 'utf-8')
        const result = await postcss.default(plugins).process(css, { from: file, to: file })
        await fs.writeFile(file, result.css)
      } catch (error) {
        log(`Error processing ${file} with PostCSS: ${error.message}`, 'error', 'CSS')
      }
    }

    log('PostCSS processing completed', 'success', 'CSS')
  } catch (error) {
    log(`PostCSS processing error: ${error.message}`, 'error', 'CSS')
    throw error
  }
}

/**
 * Generates RTL CSS from LTR CSS
 * @param {string} inputPath - Path to the LTR CSS file
 * @param {Object} [options] - RTL generation options
 * @param {boolean} [options.verbose=false] - Whether to log verbose output
 * @returns {Promise<void>}
 */
async function generateRtlCss(inputPath, options) {
  const opts = { ...{ verbose: false, silent: false }, ...options }
  const log = (...args) => !opts.silent && log(...args)
  const fileName = path.basename(inputPath)

  log(`Converting ${fileName} to RTL...`, 'info', 'CSS')

  try {
    const code = await fs.readFile(inputPath, 'utf8')

    // Remove existing banner if present
    const codeWithoutBanner = code.replace(/\/\*![\s\S]*?\*\/\n?/, '')

    const { code: rtlCss } = transform({
      filename: fileName,
      code: Buffer.from(codeWithoutBanner),
      transform: {
        rtl: true
      },
      // Skip source map for RTL files for now
      sourceMap: false
    })

    const outputPath = inputPath.replace('.css', '.rtl.css')
    await fs.writeFile(outputPath, banner + '\n' + rtlCss)

    if (opts.verbose) {
      log(`Generated RTL CSS: ${path.basename(outputPath)}`, 'info', 'CSS')
    }

    log(`Generated RTL CSS: ${path.basename(outputPath)}`, 'success', 'CSS')
  } catch (error) {
    log(`RTL generation error for ${inputPath}: ${error.message}`, 'error', 'CSS')
    throw error
  }
}

/**
 * Generates RTL versions for all CSS files in the dist/css directory
 * @param {Object} [options] - RTL generation options
 * @param {boolean} [options.verbose=false] - Whether to log verbose output
 * @returns {Promise<void>}
 */
async function generateAllRtlCSS(options = { verbose: false }) {
  const opts = { ...{ verbose: false, silent: false }, ...options }
  const log = (...args) => !opts.silent && log(...args)
  log('Generating RTL CSS...', 'info', 'CSS')

  try {
    const cssFiles = await glob('dist/css/*.css')
    const filesToConvert = cssFiles.filter(
      (file) => !file.includes('.rtl.css') && !file.includes('.min.css')
    )

    if (filesToConvert.length === 0) {
      log('No CSS files found for RTL conversion', 'warning', 'CSS')
      return
    }

    log(`Found ${filesToConvert.length} CSS files for RTL conversion`, 'info', 'CSS')

    for (const file of filesToConvert) {
      try {
        await generateRtlCss(file, options)
      } catch (error) {
        log(`Error generating RTL for ${file}: ${error.message}`, 'error', 'CSS')
        throw error // Re-throw the error to fail the task
      }
    }

    log('RTL CSS generation completed', 'success', 'CSS')
  } catch (error) {
    log(`RTL CSS generation error: ${error.message}`, 'error', 'CSS')
    throw error // Re-throw the error
  }
}

/**
 * Optimizes CSS with lightningcss, merging duplicate rules and selectors
 * @param {string[]} files - Array of CSS file paths to optimize
 * @param {Object} [options] - Optimization options
 * @param {boolean} [options.verbose=false] - Whether to log verbose output
 * @returns {Promise<void>}
 */
async function optimizeCSS(files, options = { verbose: false }) {
  const opts = { ...{ verbose: false, silent: false }, ...options }
  const log = (...args) => !opts.silent && log(...args)
  log('Optimizing CSS...', 'info', 'CSS')

  try {
    if (files.length === 0) {
      log('No CSS files to optimize', 'warning', 'CSS')
      return
    }

    for (const file of files) {
      if (opts.verbose) {
        log(`Optimizing ${path.basename(file)}...`, 'info', 'CSS')
      }
      try {
        const code = await fs.readFile(file, 'utf8')
        const { code: optimized } = transform({
          filename: file,
          code: Buffer.from(code),
          minify: false, // Ensure we are not minifying here, just optimizing
          sourceMap: false,
          visitors: {
            // Example of a visitor to merge duplicate rules - lightningcss does this by default
            Rule: {
              // This is a placeholder for more advanced optimizations if needed
            }
          }
        })

        // Check for duplicate :root selectors and merge them
        const roots = String(optimized)
          .match(/:root\s*\{[^}]*\}/g)
          ?.map((r) => r.slice(r.indexOf('{') + 1, -1).trim())
        if (roots && roots.length > 1) {
          log(`Found ${roots.length} duplicate :root selectors to merge`, 'info', 'CSS')
          const merged = roots.join('; ')
          const optimizedStr = String(optimized).replace(/:root\s*\{[^}]*\}/g, '')
          await fs.writeFile(file, `:root { ${merged} }\n` + optimizedStr)
        } else {
          await fs.writeFile(file, optimized)
        }
      } catch (error) {
        log(`Error optimizing ${file}: ${error.message}`, 'error', 'CSS')
        throw error // Re-throw the error to fail the task
      }
    }

    log('CSS optimization completed', 'success', 'CSS')
  } catch (error) {
    log(`CSS optimization error: ${error.message}`, 'error', 'CSS')
    throw error
  }
}

/**
 * Build all CSS assets
 * @param {Object} [options] - Build options
 * @param {boolean} [options.isDev=false] - Whether this is a development build
 * @param {boolean} [options.skipRtl=false] - Whether to skip RTL generation
 * @param {boolean} [options.verbose=false] - Whether to log verbose output
 * @returns {Promise<void>}
 */
export function buildCss(options = {}) {
  // Validate and normalize options
  const opts = validateOptions(
    options,
    {
      isDev: false,
      skipRtl: false,
      verbose: false,
      silent: false // Keep for standalone runs
    },
    []
  )

  // This function now returns a Listr instance to be used as a sub-task
  return new Listr(
    [
      {
        title: 'Compiling SASS to CSS',
        task: () => compileSass({ verbose: opts.verbose, silent: true })
      },
      {
        title: 'Generating RTL CSS',
        task: async () => {
          const cssFiles = (await glob('dist/css/*.css')).filter(
            (file) => !file.includes('.rtl.') && !file.includes('.min.')
          )
          if (cssFiles.length > 0) {
            await generateAllRtlCSS({ verbose: opts.verbose, silent: true })
          }
        },
        enabled: () => !opts.skipRtl
      },
      {
        title: 'Adding Vendor Prefixes',
        task: async () => {
          const allCssFiles = (await glob('dist/css/*.css')).filter(
            (file) => !file.includes('.min.')
          )
          if (allCssFiles.length > 0) {
            await processWithPostcss(allCssFiles, { verbose: opts.verbose, silent: true })
          }
        }
      },
      {
        title: 'Optimizing CSS',
        task: async () => {
          const allCssFiles = (await glob('dist/css/*.css')).filter(
            (file) => !file.includes('.min.')
          )
          if (allCssFiles.length > 0) {
            await optimizeCSS(allCssFiles, { verbose: opts.verbose, silent: true })
          }
        }
      },
      {
        title: 'Minifying CSS',
        task: () => minifyAllCSS({ verbose: opts.verbose, silent: true }),
        enabled: () => !opts.isDev
      }
    ],
    {
      // The parent Listr will control rendering and error handling
      exitOnError: true
    }
  )
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isDev = process.argv.includes('--dev')
  const skipMinification = process.argv.includes('--skip-minification')
  const skipPrefixing = process.argv.includes('--skip-prefixing')
  const skipRtl = process.argv.includes('--skip-rtl') && !process.argv.includes('--skip-rtl=false')
  const skipOptimization = process.argv.includes('--skip-optimization')
  const verbose = process.argv.includes('--verbose')

  const tasks = buildCss({
    isDev,
    skipMinification,
    skipPrefixing,
    skipRtl,
    skipOptimization,
    verbose
  })

  tasks.run().catch(() => {
    process.exit(1)
  })
}
