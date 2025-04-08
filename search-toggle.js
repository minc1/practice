document.addEventListener('DOMContentLoaded', () => {
  const searchToggleButton = document.querySelector('.search-toggle');
  const searchInputContainer = document.querySelector('#header nav .InputContainer'); // More specific selector
  const mobileMenuButton = document.querySelector('.mobile-menu'); // To potentially close search when menu opens
  const navLinks = document.querySelector('.nav-links'); // To potentially close search when menu opens

  if (searchToggleButton && searchInputContainer) {
      searchToggleButton.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent click from bubbling up to document listener immediately
          const isShown = searchInputContainer.classList.toggle('show');
          searchToggleButton.setAttribute('aria-expanded', isShown);

          // Optional: Close mobile menu if it's open when search is toggled
          if (isShown && navLinks && navLinks.classList.contains('show')) {
               navLinks.classList.remove('show');
               const mobileMenuIcon = mobileMenuButton?.querySelector('i');
               if (mobileMenuIcon) {
                  mobileMenuIcon.classList.remove('fa-times');
                  mobileMenuIcon.classList.add('fa-bars');
               }
               if (mobileMenuButton) {
                  mobileMenuButton.setAttribute('aria-expanded', 'false');
               }
          }
      });

      // Close search if clicking outside the header nav area on mobile
      document.addEventListener('click', (e) => {
          const headerNav = document.querySelector('#header nav');
          if (window.innerWidth <= 768 && searchInputContainer.classList.contains('show')) {
              if (headerNav && !headerNav.contains(e.target)) {
                  searchInputContainer.classList.remove('show');
                  searchToggleButton.setAttribute('aria-expanded', 'false');
              }
          }
      });

       // Prevent clicks inside the search container from closing it
       searchInputContainer.addEventListener('click', (e) => {
          e.stopPropagation();
       });

  } else {
      if (!searchToggleButton) console.error("Search toggle button not found.");
      if (!searchInputContainer) console.error("Search input container not found in header nav.");
  }

  // Optional: Close search bar if mobile menu is opened
  if (mobileMenuButton && searchInputContainer && searchToggleButton) {
      mobileMenuButton.addEventListener('click', () => {
          if (searchInputContainer.classList.contains('show')) {
              searchInputContainer.classList.remove('show');
              searchToggleButton.setAttribute('aria-expanded', 'false');
          }
      });
  }
});