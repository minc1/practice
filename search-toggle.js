// Search toggle functionality for mobile devices
document.addEventListener("DOMContentLoaded", () => {
  const searchToggle = document.querySelector(".search-toggle")
  const inputContainer = document.querySelector(".InputContainer")

  if (searchToggle && inputContainer) {
    // Set initial state based on screen size
    const updateSearchVisibility = () => {
      if (window.innerWidth <= 768) {
        inputContainer.classList.remove("show")
      } else {
        // On desktop, always show the search bar
        inputContainer.classList.remove("show")
        inputContainer.style.display = "flex"
      }
    }

    // Initial check
    updateSearchVisibility()

    // Toggle search on click
    searchToggle.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        inputContainer.classList.toggle("show")

        // Add animation class if showing
        if (inputContainer.classList.contains("show")) {
          // Focus the input after animation starts
          setTimeout(() => {
            const searchInput = inputContainer.querySelector("input")
            if (searchInput) searchInput.focus()
          }, 100)
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
      }
    })
  }
})
