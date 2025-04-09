// Modern search toggle functionality with smooth animations
document.addEventListener("DOMContentLoaded", () => {
  const searchToggle = document.querySelector(".search-toggle")
  const inputContainer = document.querySelector(".InputContainer")

  if (searchToggle && inputContainer) {
    // Set initial state based on screen size
    const updateSearchVisibility = () => {
      if (window.innerWidth <= 768) {
        inputContainer.classList.remove("show")
        inputContainer.style.display = "none"
      } else {
        // On desktop, always show the search bar
        inputContainer.classList.remove("show")
        inputContainer.style.display = "flex"
      }
    }

    // Initial check
    updateSearchVisibility()

    // Toggle search on click with smooth animation
    searchToggle.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        if (!inputContainer.classList.contains("show")) {
          // Prepare for animation
          inputContainer.style.display = "flex"
          inputContainer.style.opacity = "0"
          inputContainer.style.height = "0"

          // Force reflow to ensure animation works
          void inputContainer.offsetWidth

          // Add show class to trigger animation
          inputContainer.classList.add("show")

          // Focus the input after animation completes
          setTimeout(() => {
            const searchInput = inputContainer.querySelector("input")
            if (searchInput) searchInput.focus()
          }, 300)
        } else {
          // Hide with animation
          inputContainer.classList.remove("show")

          // Clean up after animation
          setTimeout(() => {
            if (!inputContainer.classList.contains("show")) {
              inputContainer.style.display = "none"
            }
          }, 300)
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
        inputContainer.classList.remove("show")

        // Clean up after animation
        setTimeout(() => {
          if (!inputContainer.classList.contains("show")) {
            inputContainer.style.display = "none"
          }
        }, 300)
      }
    })

    // Add ripple effect to search toggle and mobile menu
    const addRippleEffect = (element) => {
      element.addEventListener("click", (e) => {
        const ripple = document.createElement("span")
        const rect = element.getBoundingClientRect()

        const size = Math.max(rect.width, rect.height)
        const x = e.clientX - rect.left - size / 2
        const y = e.clientY - rect.top - size / 2

        ripple.style.width = ripple.style.height = `${size}px`
        ripple.style.left = `${x}px`
        ripple.style.top = `${y}px`
        ripple.className = "ripple"

        // Remove existing ripples
        const existingRipple = element.querySelector(".ripple")
        if (existingRipple) {
          existingRipple.remove()
        }

        element.appendChild(ripple)

        // Remove ripple after animation
        setTimeout(() => {
          ripple.remove()
        }, 600)
      })
    }

    // Apply ripple effect to buttons
    const mobileMenu = document.querySelector(".mobile-menu")
    if (mobileMenu) addRippleEffect(mobileMenu)
    addRippleEffect(searchToggle)
  }
})
