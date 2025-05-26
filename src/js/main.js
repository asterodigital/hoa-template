import * as bootstrap from 'bootstrap/dist/js/bootstrap.esm.js'
import SimpleBar from 'simplebar'
import { darkMode } from './layout/dark-mode.js'
import { initSidebar } from './layout/sidebar-handler.js'
import { initSidebarMini } from './layout/sidebar-mini-handler.js'
import { initNavigation } from './layout/nav-handler.js'
import { dropdownHover } from './layout/dropdown-hover.js'
import { initPasswordWrapper } from './components/password.js'

// Expose bootstrap and simplebar globally for inline scripts
window.bootstrap = bootstrap
window.SimpleBar = SimpleBar

// Create the theme module
const AsteroAdmin = (function () {
  let initialized = false

  // Initialize Bootstrap components
  function initBootstrap() {
    // Enable tooltips everywhere
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    Array.from(tooltipTriggerList).forEach((tooltipTriggerEl) => {
      new bootstrap.Tooltip(tooltipTriggerEl)
    })

    // Enable popovers everywhere
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
    Array.from(popoverTriggerList).forEach((popoverTriggerEl) => {
      new bootstrap.Popover(popoverTriggerEl)
    })
  }

  // Initialize SimpleBar on elements with data-simplebar attribute
  function initSimpleBar() {
    document.querySelectorAll('[data-simplebar]').forEach((element) => {
      new SimpleBar(element)
    })
  }

  function initializeAll() {
    if (initialized) {
      return
    }

    try {
      darkMode()
      initSidebar()
      initSidebarMini()
      initNavigation()
      dropdownHover()
      initPasswordWrapper()
      initBootstrap()
      initSimpleBar()
      initialized = true
    } catch (error) {
      console.error('Error during initialization:', error)
    }
  }

  // Public API
  return {
    init: initializeAll,
    isInitialized: () => initialized
  }
})()

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', AsteroAdmin.init)
  } else {
    AsteroAdmin.init()
  }
}

export default AsteroAdmin
