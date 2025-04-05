/**
 * ForensicFinancials Main Script
 * Initializes the application and controllers
 */

const DEFAULT_TICKER = 'AAPL';
const DATA_PATH = 'DATA/';
const DIVERGENCE_THRESHOLD = 30.0;

// Determine current page
const isAnalysisPage = window.location.pathname.includes('analysis.html');
const isSearchPage = window.location.pathname.includes('search.html');
const isLandingPage = !isAnalysisPage && !isSearchPage;

// DOM Utility Functions
const select = (el, all = false) => {
  el = el.trim();
  if (all) {
    return [...document.querySelectorAll(el)];
  } else {
    return document.querySelector(el);
  }
};

const on = (type, el, listener, all = false) => {
  let selectEl = select(el, all);
  if (selectEl) {
    if (all) {
      selectEl.forEach(e => e.addEventListener(type, listener));
    } else {
      selectEl.addEventListener(type, listener);
    }
  }
};

const onScroll = (el, listener) => {
  const target = (el === document || el === window) ? window : el;
  target.addEventListener('scroll', listener);
};

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Initialize UI State Manager for all pages
  const uiStateManager = new UIStateManager();
  
  // Initialize Analysis Controller for analysis page
  if (isAnalysisPage) {
    const analysisController = new AnalysisController();
  }
  
  // Landing Page: CTA Search Form (Points to analysis.html)
  const ctaSearchForm = select('.cta-section .search-form');
  if (ctaSearchForm && isLandingPage) {
    ctaSearchForm.addEventListener('submit', function(e) {
      // Allow default form submission to analysis.html (action="analysis.html")
    });
  }
  
  // Landing Page & Search Page: Header Search Form (Points to analysis.html)
  const headerSearchForm = select('#headerTickerSearchForm');
  if (headerSearchForm && (isLandingPage || isSearchPage)) {
    headerSearchForm.addEventListener('submit', function(e) {
      // Allow default form submission to analysis.html (action="analysis.html")
    });
  }
  
  // Search Page: Main Search Form (Points to analysis.html)
  const mainSearchFormOnSearchPage = select('.search-hero .search-form');
  if (mainSearchFormOnSearchPage && isSearchPage) {
    mainSearchFormOnSearchPage.addEventListener('submit', function(e) {
      // Allow default form submission to analysis.html (action="analysis.html")
    });
  }
});
