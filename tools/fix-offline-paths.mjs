import fs from 'fs-extra'
import path from 'path'
import { log } from './utils.mjs'

// Function to find all HTML files recursively
function findHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      findHtmlFiles(filePath, fileList)
    } else if (file.endsWith('.html')) {
      fileList.push(path.relative('./dist/offline', filePath))
    }
  }

  return fileList
}

/**
 * Fixes relative paths in the HTML files after Astro build
 * This corrects navigation links based on the actual file depth
 */
export async function fixOfflinePaths() {
  try {
    log('Fixing relative paths in HTML files...', 'info', 'FIX-PATHS')

    const distDir = './dist/offline'
    const htmlFiles = findHtmlFiles(distDir)

    for (const htmlFile of htmlFiles) {
      const filePath = path.join(distDir, htmlFile)
      const content = fs.readFileSync(filePath, 'utf8')

      // Calculate the depth of the current file
      const depth = (htmlFile.match(/\//g) || []).length

      // Fix href attributes for proper relative paths
      let fixedContent = content

      // Calculate correct relative path prefix based on depth
      const upLevels = depth > 0 ? '../'.repeat(depth) : './'

      if (depth === 0) {
        // Root file fixes: ../path should become ./path
        fixedContent = fixedContent.replace(/href="\.\.\/([^\"]*\.html)"/g, `href="./$1"`)
        fixedContent = fixedContent.replace(/href="\.\.\/docs\.html"/g, `href="./docs.html"`)
        fixedContent = fixedContent.replace(/href="\.\.\/index\.html"/g, `href="./index.html"`)
        fixedContent = fixedContent.replace(
          /href="\.\.\/docs\/components\//g,
          `href="./docs/components/`
        )
        fixedContent = fixedContent.replace(/href="\.\.\/theme\//g, `href="./theme/`)
      } else {
        // Nested file fixes: ensure correct number of ../
        fixedContent = fixedContent.replace(/href="\.\/([^\"]*\.html)"/g, `href="${upLevels}$1"`)
        fixedContent = fixedContent.replace(/href="\.\.\/([^\"]*\.html)"/g, `href="${upLevels}$1"`)
        fixedContent = fixedContent.replace(/href="\.\/docs\.html"/g, `href="${upLevels}docs.html"`)
        fixedContent = fixedContent.replace(
          /href="\.\/index\.html"/g,
          `href="${upLevels}index.html"`
        )
        fixedContent = fixedContent.replace(
          /href="\.\/docs\/components\//g,
          `href="${upLevels}docs/components/`
        )
        fixedContent = fixedContent.replace(/href="\.\/theme\//g, `href="${upLevels}theme/`)
      }

      // Write the fixed content back
      if (fixedContent !== content) {
        fs.writeFileSync(filePath, fixedContent)
        log(`Fixed paths in ${htmlFile}`, 'success', 'FIX-PATHS')
      }
    }

    log('Relative path fixing completed', 'success', 'FIX-PATHS')
  } catch (error) {
    log(`Error fixing relative paths: ${error.message}`, 'error', 'FIX-PATHS')
    throw error
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixOfflinePaths()
}
