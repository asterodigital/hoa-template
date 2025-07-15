/**
 * Returns the correct asset path based on environment and build type
 * @param {string} path - The asset path without leading slash
 * @returns {string} - The correct path for the current environment
 */
function getAssetPrefix(path) {
  const env = import.meta.env || {}
  const isDev = env.DEV || false
  const isRelativeBuild = env.PUBLIC_RELATIVE_PATHS === 'true'

  if (isDev) {
    return `/dist${path}`
  }

  if (isRelativeBuild) {
    // For relative builds, use relative paths
    return `.${path}`
  }

  // Default absolute paths for production
  return `${path}`
}

/**
 * Returns the correct page path based on environment and build type
 * @param {string} path - The page path
 * @returns {string} - The correct path for the current environment
 */
function getPathPrefix(path) {
  const env = import.meta.env || {}
  const isDev = env.DEV || false
  const isRelativeBuild = env.PUBLIC_RELATIVE_PATHS === 'true'

  if (isDev) {
    return `${path}`
  }

  if (isRelativeBuild) {
    // For relative builds, we'll use a simplified approach
    // Since Astro builds each page individually, we'll determine depth
    // based on the import.meta.url of the calling file

    // Special handling for root path
    if (path === '/') {
      return './index.html'
    }

    // For relative builds, we need to determine the depth dynamically
    // This is a simplified approach - we'll use a base relative path
    // and let the post-build process fix the paths
    const cleanPath = path.startsWith('/') ? path.substring(1) : path
    return `./${cleanPath}.html`
  }

  // Default absolute paths for production
  return `/pages${path}`
}

export { getAssetPrefix, getPathPrefix }
