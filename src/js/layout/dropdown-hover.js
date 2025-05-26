export const dropdownHover = () => {
  document.addEventListener('DOMContentLoaded', function () {
    // Only enable hover on non-touch devices
    if (!window.matchMedia('(hover: hover)').matches) return

    // Handle all dropdowns (including submenus)
    document
      .querySelectorAll('.navbar .dropdown, .navbar .dropdown-submenu')
      .forEach(function (dropdown) {
        let timeout
        const toggle = dropdown.querySelector('.dropdown-toggle')
        const menu = dropdown.querySelector('.dropdown-menu')

        if (!toggle || !menu) return

        // Show dropdown on hover
        dropdown.addEventListener('mouseenter', function () {
          clearTimeout(timeout)
          // Hide sibling submenus
          if (dropdown.parentElement) {
            dropdown.parentElement
              .querySelectorAll('.dropdown.show, .dropdown-submenu.show')
              .forEach(function (openDropdown) {
                if (openDropdown !== dropdown) {
                  openDropdown.classList.remove('show')
                  const openMenu = openDropdown.querySelector('.dropdown-menu')
                  if (openMenu) openMenu.classList.remove('show')
                  const openToggle = openDropdown.querySelector('.dropdown-toggle')
                  if (openToggle) openToggle.setAttribute('aria-expanded', 'false')
                }
              })
          }
          dropdown.classList.add('show')
          menu.classList.add('show')
          toggle.setAttribute('aria-expanded', 'true')
        })

        // Hide dropdown on mouseleave
        dropdown.addEventListener('mouseleave', function () {
          timeout = setTimeout(function () {
            dropdown.classList.remove('show')
            menu.classList.remove('show')
            toggle.setAttribute('aria-expanded', 'false')
          }, 150)
        })

        // Prevent click navigation for toggles with submenus
        toggle.addEventListener('click', function (e) {
          if (
            dropdown.classList.contains('dropdown-submenu') ||
            toggle.classList.contains('dropdown-toggle')
          ) {
            e.preventDefault()
          }
        })
      })
  })
}
