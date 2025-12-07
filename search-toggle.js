// Search toggle functionality for mobile devices
document.addEventListener("DOMContentLoaded", () => {
  const searchToggle = document.querySelector(".search-toggle")
  const inputContainer = document.querySelector(".InputContainer")
  const mobileMenu = document.querySelector(".mobile-menu")
  const navLinks = document.querySelector(".nav-links")

  if (searchToggle && inputContainer) {
    // Set initial state based on screen size
    const updateSearchVisibility = () => {
      if (window.innerWidth <= 768) {
        inputContainer.classList.remove("show")
        // Ensure proper initial state
        inputContainer.style.display = "none"
        inputContainer.style.height = "0"
      } else {
        // On desktop, always show the search bar
        inputContainer.classList.remove("show")
        inputContainer.style.display = "flex"
        inputContainer.style.height = "auto"
      }
    }

    // Initial check
    updateSearchVisibility()

    // Toggle search on click with improved animation
    searchToggle.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        const isVisible = inputContainer.classList.contains("show")

        // Close mobile menu if open when search is toggled
        if (navLinks && navLinks.classList.contains("show") && mobileMenu) {
          navLinks.classList.remove("show")
          mobileMenu.setAttribute("aria-expanded", "false")
          if (mobileMenu.querySelector("i")) {
            mobileMenu.querySelector("i").classList.remove("fa-times")
            mobileMenu.querySelector("i").classList.add("fa-bars")
          }
        }

        // Toggle visibility class
        inputContainer.classList.toggle("show")

        if (!isVisible) {
          // Show the search container first
          inputContainer.style.display = "flex"
          inputContainer.style.height = "0"

          // Trigger reflow to ensure transition works
          inputContainer.offsetHeight

          // Animate to full height
          inputContainer.style.height = "56px"

          // Focus the input after animation starts
          setTimeout(() => {
            const searchInput = inputContainer.querySelector("input")
            if (searchInput) searchInput.focus()
          }, 100)
        } else {
          // Animate to zero height
          inputContainer.style.height = "0"

          // Hide after animation completes
          setTimeout(() => {
            if (!inputContainer.classList.contains("show")) {
              inputContainer.style.display = "none"
            }
          }, 300) // Match transition duration in CSS
        }
      }
    })

    // Update on resize
    window.addEventListener("resize", () => {
      updateSearchVisibility()
    })

    // Close search when clicking outside
    document.addEventListener("click", (e) => {
      if (
        window.innerWidth <= 768 &&
        !searchToggle.contains(e.target) &&
        !inputContainer.contains(e.target) &&
        inputContainer.classList.contains("show")
      ) {
        // Hide the search container
        inputContainer.classList.remove("show")
        inputContainer.style.height = "0"

        // Hide after animation completes
        setTimeout(() => {
          inputContainer.style.display = "none"
        }, 300) // Match transition duration in CSS
      }
    })
  }
})