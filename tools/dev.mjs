/**
 * Handles development environment setup and server
 * @module dev
 */

import { showBanner, showServerUrls } from './utils.mjs'
import { cleanDist } from './clean.mjs'
import { buildAssets } from './assets.mjs'
import { buildCss } from './css.mjs'
import { watchFiles } from './watch.mjs'
import { Listr } from 'listr2'
import { execa } from 'execa'

async function main() {
  showBanner()

  const tasks = new Listr(
    [
      {
        title: 'Initial Build',
        task: (ctx, task) =>
          task.newListr(
            [
              {
                title: 'Clean Dist Directory',
                task: async () => await cleanDist({ silent: true })
              },
              {
                title: 'Build Assets',
                task: async () => await buildAssets({ silent: true })
              },
              {
                title: 'Build CSS',
                task: async () => await buildCss({ isDev: true, silent: true })
              }
            ],
            { concurrent: true }
          )
      },
      {
        title: 'Starting Astro Dev Server',
        task: async (ctx, task) => {
          task.output = 'Launching Astro...'
          const astroBin = './node_modules/.bin/astro'
          const astroProcess = execa(astroBin, ['dev', '--host', 'localhost'])

          let serverLogs = ''
          let resolved = false

          const serverReadyPromise = new Promise((resolve, reject) => {
            const handleData = (data) => {
              const line = data.toString()
              serverLogs += line
              if (!resolved && line.includes('http://')) {
                ctx.serverLogs = serverLogs
                ctx.astroProcess = astroProcess
                resolved = true
                resolve()
              }
            }

            astroProcess.stdout.on('data', handleData)
            astroProcess.stderr.on('data', handleData)

            astroProcess.on('exit', (code) => {
              if (code !== 0 && !resolved) {
                reject(new Error(`Astro server failed to start.\n\n${serverLogs}`))
              }
            })

            astroProcess.on('error', (err) => {
              if (!resolved) reject(err)
            })
          })

          return serverReadyPromise
        }
      }
    ],
    {
      exitOnError: true,
      concurrent: false,
      rendererOptions: {
        clearOutput: true
      }
    }
  )

  try {
    const context = await tasks.run()

    showServerUrls(context.serverLogs)

    // Now that the task list is cleared, pipe the ongoing server output
    context.astroProcess.stdout.pipe(process.stdout)
    context.astroProcess.stderr.pipe(process.stderr)

    // Start watching files for changes
    watchFiles({ silent: true })

    // Handle graceful shutdown
    const cleanup = async () => {
      console.log('\nShutting down development server...')
      await context.astroProcess.kill('SIGTERM', { forceKillAfterTimeout: 2000 })
      process.exit(0)
    }

    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
  } catch (e) {
    // Listr will print the error message.
    process.exit(1)
  }
}

main()
