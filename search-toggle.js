// search-toggle.js
document.addEventListener('DOMContentLoaded', () => {
  const searchToggleButton = document.querySelector('.search-toggle');
  const searchInputContainer = document.querySelector('.InputContainer'); // Use the class defined in HTML/CSS
  const searchInputField = searchInputContainer?.querySelector('.input'); // Get the input field itself

  // Check if elements exist (important for pages where they might not be)
  if (!searchToggleButton || !searchInputContainer || !searchInputField) {
      // console.warn('Search toggle elements not found on this page.');
      return; // Exit if any element is missing
  }

  const openSearch = () => {
      searchInputContainer.classList.add('show');
      searchToggleButton.setAttribute('aria-expanded', 'true');
      // Optional: Focus the input field when shown
      // Using a slight delay can help ensure the transition is complete
      setTimeout(() => {
          searchInputField.focus();
      }, 25); // Short delay
      // Add listeners to close
      document.addEventListener('keydown', handleEscapeKey);
      document.addEventListener('click', handleClickOutside);
  };

  const closeSearch = () => {
      searchInputContainer.classList.remove('show');
      searchToggleButton.setAttribute('aria-expanded', 'false');
      // Remove listeners when closed
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('click', handleClickOutside);
  };

  const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
          closeSearch();
      }
  };

  const handleClickOutside = (event) => {
      // Close if the click is outside the input container AND outside the toggle button
      if (
          !searchInputContainer.contains(event.target) &&
          !searchToggleButton.contains(event.target) &&
          searchInputContainer.classList.contains('show')
      ) {
          closeSearch();
      }
  };

  searchToggleButton.addEventListener('click', (event) => {
      event.stopPropagation(); // Prevent the click from immediately triggering handleClickOutside
      if (searchInputContainer.classList.contains('show')) {
          closeSearch();
      } else {
          openSearch();
      }
  });

   // Ensure the search bar is initially closed on page load (redundant if CSS defaults to hidden, but safe)
   searchInputContainer.classList.remove('show');
   searchToggleButton.setAttribute('aria-expanded', 'false');

});