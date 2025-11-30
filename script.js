// --- START OF FILE script.js ---

// Note: Chart.js and chartjs-plugin-annotation are loaded globally via script tags in analysis.html
// The annotation plugin auto-registers with Chart.js v3+ when loaded via CDN
// If using modules, you'd import them: import { Chart } from 'chart.js'; import annotationPlugin from 'chartjs-plugin-annotation';

const DEFAULT_TICKER = "AAPL"
const DATA_PATH = "data/"
const DIVERGENCE_THRESHOLD = 30.0
const DEFAULT_YEARS_TO_SHOW = 10; // Default number of years to show (desktop)
const MOBILE_DEFAULT_YEARS = 5; // Default for mobile
const ICON_GAP = '6px'; // Gap between icon and text in buttons
const IS_TOUCH_DEVICE = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
const IS_MOBILE = window.innerWidth <= 768;

// Mobile progressive year ranges: 5Y → 10Y → Full → 5Y
const MOBILE_YEAR_RANGES = [5, 10, 'full'];
let mobileYearRangeIndex = 0; // Tracks current range on mobile

let currentTicker = null
let currentData = null // Store fetched data
let showFullHistory = false // Unified toggle state for all charts
let revenueChartInstance = null
let arChartInstance = null
let cashFlowChartInstance = null

const isAnalysisPage = window.location.pathname.includes("analysis.html")
const isSearchPage = window.location.pathname.includes("search.html")
const isLandingPage = !isAnalysisPage && !isSearchPage

// --- Helper Functions ---

const select = (el, all = false) => {
  el = el.trim()
  if (all) {
    return [...document.querySelectorAll(el)]
  } else {
    return document.querySelector(el)
  }
}

const on = (type, el, listener, all = false) => {
  const selectEl = select(el, all)
  if (selectEl) {
    if (all) {
      selectEl.forEach((e) => e.addEventListener(type, listener))
    } else {
      selectEl.addEventListener(type, listener)
    }
  }
}

const onScroll = (el, listener) => {
  const target = el === document || el === window ? window : el
  target.addEventListener("scroll", listener)
}

const populateElement = (selector, data, property = "textContent") => {
  const element = select(selector)
  if (element) {
    if (data !== undefined && data !== null) {
      if (property === "innerHTML") {
        element.innerHTML = data
      } else {
        element.textContent = data
      }
    } else {
      // Clear content if data is null or undefined
      element[property] = ""
      console.warn(`No data provided for selector: ${selector}. Element cleared.`);
    }
  } else {
    console.warn(`Element not found for selector: ${selector}`);
  }
}

const generateCards = (containerId, cardData) => {
  const container = select(`#${containerId}`)
  if (!container) {
    console.error(`Card container not found: #${containerId}`);
    return
  }
  if (!Array.isArray(cardData)) {
    console.error(`Invalid card data for #${containerId}: Expected array, got ${typeof cardData}`);
    container.innerHTML =
      '<p class="error-message" style="color: var(--danger); text-align: center;">Error loading card data.</p>'
    return
  }
  container.innerHTML = "" // Clear previous cards
  if (cardData.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--muted);">No card data available.</p>'
    return
  }
  cardData.forEach((card) => {
    const cardElement = document.createElement("div")
    cardElement.className = "card"
    cardElement.innerHTML = `
            <div class="card-header">
                <h3><i class="${card.iconClass || "fas fa-question-circle neutral"}"></i> ${card.title || "Untitled Card"}</h3>
            </div>
            <div class="card-body">
                <ul>
                    ${card.points && Array.isArray(card.points) ? card.points.map((point) => `<li>${point || ""}</li>`).join("") : "<li>No points provided.</li>"}
                </ul>
            </div>
            ${card.footer ? `<div class="card-footer">${card.footer}</div>` : ""}
        `
    container.appendChild(cardElement)
  })
}

const populateTable = (tbodyId, tableRowData) => {
  const tbody = select(`#${tbodyId}`)
  if (!tbody) {
    console.error(`Table body not found: #${tbodyId}`);
    return
  }
  if (!Array.isArray(tableRowData)) {
     console.error(`Invalid table data for #${tbodyId}: Expected array, got ${typeof tableRowData}`);
    tbody.innerHTML =
      '<tr><td colspan="3" class="error-message" style="color: var(--danger); text-align: center;">Error loading table data.</td></tr>'
    return
  }
  tbody.innerHTML = "" // Clear previous rows
  if (tableRowData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" style="text-align: center; color: var(--muted);">No table data available.</td></tr>'
    return
  }
  tableRowData.forEach((row) => {
    const tr = document.createElement("tr")
    // Ensure data-label attributes match the <th> text for mobile view
    tr.innerHTML = `
            <td data-label="Factor">${row.factor || "-"}</td>
            <td data-label="Opportunities">${row.opportunities || "-"}</td>
            <td data-label="Risks">${row.risks || "-"}</td>
        `
    tbody.appendChild(tr)
  })
}

const populateList = (ulId, listItems, useInnerHTML = false) => {
  const ul = select(`#${ulId}`)
  if (!ul) {
     console.error(`List container not found: #${ulId}`);
    return
  }
  if (!Array.isArray(listItems)) {
    console.error(`Invalid list data for #${ulId}: Expected array, got ${typeof listItems}`);
    ul.innerHTML = '<li class="error-message" style="color: var(--danger);">Error loading list data.</li>'
    return
  }
  ul.innerHTML = "" // Clear previous items
  if (listItems.length === 0) {
    ul.innerHTML = '<li style="color: var(--muted);">No list items available.</li>'
    return
  }
  listItems.forEach((item) => {
    const li = document.createElement("li")
    if (useInnerHTML) {
      li.innerHTML = item || "" // Sanitize if using innerHTML with user data
    } else {
      li.textContent = item || ""
    }
    ul.appendChild(li)
  })
}

const showMessage = (message, type = "loading") => {
  const messageArea = select("#loading-error-message")
  const mainContent = select("#main-content")

  // Only run if on analysis page where these elements exist
  if (!isAnalysisPage || !messageArea) return

  const messageP = messageArea.querySelector("p")
  if (!messageP) return // Ensure p element exists

  if (message) {
    messageP.innerHTML = message // Use innerHTML to allow icons
    messageArea.className = `message-area ${type}` // Set class for styling
    messageArea.style.display = "flex" // Show message area
    if (mainContent) mainContent.style.display = "none" // Hide main content
  } else {
    messageArea.style.display = "none" // Hide message area
    if (mainContent) mainContent.style.display = "block" // Show main content
  }
}

const destroyCharts = () => {
  if (revenueChartInstance) {
    revenueChartInstance.destroy()
    revenueChartInstance = null
  }
  if (arChartInstance) {
    arChartInstance.destroy()
    arChartInstance = null
  }
  if (cashFlowChartInstance) {
    cashFlowChartInstance.destroy()
    cashFlowChartInstance = null
  }
}

// --- Skeleton Loading Management ---
const showSkeletons = (show) => {
  const skeletonIds = [
    'revenueChartSkeleton',
    'arChartSkeleton', 
    'cashFlowChartSkeleton',
    'trendsCardsSkeleton',
    'financialsCardsSkeleton',
    'opportunitiesTableSkeleton',
    'verdictSkeleton'
  ];
  
  const contentIds = [
    { canvas: 'revenueChart', skeleton: 'revenueChartSkeleton' },
    { canvas: 'arChart', skeleton: 'arChartSkeleton' },
    { canvas: 'cashFlowChart', skeleton: 'cashFlowChartSkeleton' },
    { table: 'opportunitiesTable', skeleton: 'opportunitiesTableSkeleton' },
    { content: 'verdictContent', skeleton: 'verdictSkeleton' }
  ];
  
  if (show) {
    // Show skeletons, hide content
    skeletonIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'block';
    });
    
    contentIds.forEach(item => {
      if (item.canvas) {
        const canvas = document.getElementById(item.canvas);
        if (canvas) canvas.style.display = 'none';
      }
      if (item.table) {
        const table = document.getElementById(item.table);
        if (table) table.style.display = 'none';
      }
      if (item.content) {
        const content = document.getElementById(item.content);
        if (content) content.style.display = 'none';
      }
    });
  } else {
    // Hide skeletons, show content
    skeletonIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    
    contentIds.forEach(item => {
      if (item.canvas) {
        const canvas = document.getElementById(item.canvas);
        if (canvas) canvas.style.display = 'block';
      }
      if (item.table) {
        const table = document.getElementById(item.table);
        if (table) table.style.display = 'table';
      }
      if (item.content) {
        const content = document.getElementById(item.content);
        if (content) content.style.display = 'block';
      }
    });
  }
}

const calculateDivergenceIndices = (data1, data2, threshold) => {
  if (!Array.isArray(data1) || !Array.isArray(data2) || data1.length !== data2.length) {
    console.warn("Invalid data for divergence calculation.");
    return []
  }
  const indices = []
  for (let i = 0; i < data1.length; i++) {
    const val1 = data1[i]
    const val2 = data2[i]
    // Check if both are valid numbers before calculating difference
    if (typeof val1 === "number" && typeof val2 === "number" && !isNaN(val1) && !isNaN(val2)) {
      if (Math.abs(val1 - val2) > threshold) {
        indices.push(i)
      }
    }
  }
  return indices
}


// --- Mobile Menu Logic (Applies to all pages) ---
const mobileMenuButton = select(".mobile-menu")
const navLinks = select(".nav-links")
const mobileMenuIcon = select(".mobile-menu i")

if (mobileMenuButton && navLinks && mobileMenuIcon) {
  on("click", ".mobile-menu", (e) => {
    navLinks.classList.toggle("show")
    mobileMenuIcon.classList.toggle("fa-bars")
    mobileMenuIcon.classList.toggle("fa-times")
    mobileMenuButton.setAttribute("aria-expanded", navLinks.classList.contains("show"))
    // Dynamically set top position based on header height
    const headerHeight = select("#header")?.offsetHeight || 61 // Fallback height
    navLinks.style.top = `${headerHeight}px`
  })

  // Close mobile menu when a link is clicked
  on(
    "click",
    ".nav-links a",
    function (e) { // Use function() to get correct 'this'
      const href = this.getAttribute("href")
      const isInternalLink = href && href.startsWith("#")

      // Close menu if it's shown AND (it's an internal link OR an external link)
      if (navLinks.classList.contains("show")) {
         // If it's just a # or empty href, prevent default jump but still close
        if (!isInternalLink || href === "#") {
          e.preventDefault()
        }
        // Close the menu visually
        navLinks.classList.remove("show")
        mobileMenuIcon.classList.remove("fa-times")
        mobileMenuIcon.classList.add("fa-bars")
        mobileMenuButton.setAttribute("aria-expanded", "false")
        // Navigation will proceed naturally for external links or valid internal links
      }
    },
    true, // Listen on all nav links
  )
} else {
    if (!mobileMenuButton) console.error("Mobile menu button not found.");
    if (!navLinks) console.error("Nav links container not found.");
    if (!mobileMenuIcon) console.error("Mobile menu icon not found.");
}

// --- Form Handling Logic (Page Specific) ---

// Landing Page: CTA Search Form (Points to analysis.html via action attribute)
const ctaSearchForm = select(".cta-section .search-form")
if (ctaSearchForm && isLandingPage) {
  ctaSearchForm.addEventListener("submit", (e) => {
    // Default form submission to analysis.html is allowed
    console.log("CTA form submitted");
  })
}

// Landing Page & Search Page: Header Search Form (Points to analysis.html via action attribute)
const headerSearchForm = select("#headerTickerSearchForm") // ID used in index.html, search.html, error-loading.html
if (headerSearchForm && (isLandingPage || isSearchPage || !isAnalysisPage)) { // Apply on non-analysis pages
  headerSearchForm.addEventListener("submit", (e) => {
    // Default form submission to analysis.html is allowed
    console.log("Header form submitted on non-analysis page");
  })
}

// Search Page: Main Search Form (Points to analysis.html via action attribute)
const mainSearchFormOnSearchPage = select(".search-hero .search-form")
if (mainSearchFormOnSearchPage && isSearchPage) {
  mainSearchFormOnSearchPage.addEventListener("submit", (e) => {
    // Default form submission to analysis.html is allowed
    console.log("Search page main form submitted");
  })
}

// --- General UI Enhancements (Applies to all pages) ---

const header = select("#header")
if (header) {
  const headerScrolled = () => {
    if (window.scrollY > 50) {
      header.classList.add("scrolled")
    } else {
      header.classList.remove("scrolled")
    }
  }
  window.addEventListener("load", headerScrolled)
  onScroll(window, headerScrolled)
}

const backToTopButton = select(".back-to-top")
if (backToTopButton) {
  const toggleBackToTop = () => {
    if (window.scrollY > 300) {
      backToTopButton.classList.add("visible")
    } else {
      backToTopButton.classList.remove("visible")
    }
  }
  window.addEventListener("load", toggleBackToTop)
  onScroll(window, toggleBackToTop)

  on("click", ".back-to-top", () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  })
}

// --- Sticky Section Navigation (Mobile) ---
const stickySectionNav = select("#stickySectionNav")
if (stickySectionNav && isAnalysisPage) {
  const sections = ['trends', 'financials', 'opportunities', 'conclusion']
  const sectionElements = sections.map(id => document.getElementById(id)).filter(Boolean)
  const navLinks = stickySectionNav.querySelectorAll('a[data-section]')
  
  let lastScrollY = 0
  let ticking = false
  
  const updateStickyNav = () => {
    const scrollY = window.scrollY
    const windowHeight = window.innerHeight
    const heroSection = select('.hero')
    const heroBottom = heroSection ? heroSection.offsetTop + heroSection.offsetHeight : 300
    
    // Show sticky nav after scrolling past hero section
    if (scrollY > heroBottom - 100) {
      stickySectionNav.classList.add('visible')
      document.body.classList.add('has-sticky-nav')
    } else {
      stickySectionNav.classList.remove('visible')
      document.body.classList.remove('has-sticky-nav')
    }
    
    // Update active section indicator
    let currentSection = null
    const scrollPosition = scrollY + windowHeight / 3 // Trigger point at 1/3 from top
    
    sectionElements.forEach(section => {
      if (section) {
        const sectionTop = section.offsetTop
        const sectionBottom = sectionTop + section.offsetHeight
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
          currentSection = section.id
        }
      }
    })
    
    // Update active class on nav links
    navLinks.forEach(link => {
      const sectionId = link.getAttribute('data-section')
      if (sectionId === currentSection) {
        link.classList.add('active')
      } else {
        link.classList.remove('active')
      }
    })
    
    lastScrollY = scrollY
    ticking = false
  }
  
  // Throttled scroll handler for performance
  const onScrollHandler = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateStickyNav)
      ticking = true
    }
  }
  
  window.addEventListener('scroll', onScrollHandler, { passive: true })
  window.addEventListener('load', updateStickyNav)
  
  // Smooth scroll on nav link click
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const sectionId = link.getAttribute('data-section')
      const targetSection = document.getElementById(sectionId)
      
      if (targetSection) {
        const headerHeight = select('#header')?.offsetHeight || 60
        const targetPosition = targetSection.offsetTop - headerHeight - 10
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        })
        
        // Update active state immediately for better feedback
        navLinks.forEach(l => l.classList.remove('active'))
        link.classList.add('active')
      }
    })
  })
}

// --- Analysis Page Specific Logic ---
if (isAnalysisPage) {
  document.addEventListener("DOMContentLoaded", () => {
    // Check if Chart.js is loaded
    if (typeof Chart === "undefined") {
      console.error("Chart.js library is not loaded.")
      showMessage('<i class="fas fa-exclamation-triangle"></i> Chart library failed to load. Please refresh.', "error")
      return
    }
    
    // Log Chart.js version for diagnostics
    console.log(`Chart.js version: ${Chart.version || 'unknown'}`)
    // Check if ChartAnnotation plugin is loaded and registered
    // In Chart.js v3+, the annotation plugin auto-registers when loaded via CDN
    // Try multiple detection methods for compatibility
    let isAnnotationPluginAvailable = false;
    
    // Method 1: Check Chart.registry (Chart.js v3+)
    if (Chart.registry && Chart.registry.plugins && Chart.registry.plugins.get('annotation')) {
      isAnnotationPluginAvailable = true;
      console.log("ChartAnnotation plugin detected via Chart.registry");
    }
    // Method 2: Check if plugin is in Chart.plugins
    else if (window.chartjs && window.chartjs.plugins && window.chartjs.plugins.annotation) {
      isAnnotationPluginAvailable = true;
      console.log("ChartAnnotation plugin detected via window.chartjs");
    }
    // Method 3: Check window.ChartAnnotation (older versions)
    else if (window.ChartAnnotation) {
      isAnnotationPluginAvailable = true;
      // Try to register it manually
      try {
        Chart.register(window.ChartAnnotation);
        console.log("ChartAnnotation plugin manually registered");
      } catch (e) {
        console.warn("Failed to register ChartAnnotation:", e);
      }
    }
    
    if (!isAnnotationPluginAvailable) {
      console.warn("Chartjs-plugin-annotation not loaded. Annotations will not be displayed.");
      console.warn("Please check Network tab to verify the plugin CDN is loading correctly.");
    }


    // --- Chart Configuration ---
    // Create a gradient for the chart background
    const createGradient = (ctx, colorStart, colorEnd) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, colorStart);
        gradient.addColorStop(1, colorEnd);
        return gradient;
    };

    // Create a conditional gradient based on data values (positive = normal color, negative = red)
    const createConditionalGradient = (ctx, chart, datasetIndex, positiveColor, negativeColor) => {
        const dataset = chart.data.datasets[datasetIndex];
        const yScale = chart.scales.y;
        const chartArea = chart.chartArea;
        
        if (!chartArea || !yScale) {
            return positiveColor; // Fallback
        }

        // Find if there are any negative values in the dataset
        const hasNegative = dataset.data.some(val => val < 0);
        const hasPositive = dataset.data.some(val => val >= 0);
        
        if (!hasNegative) {
            // All positive, use positive color
            return positiveColor;
        }
        
        if (!hasPositive) {
            // All negative, use negative color
            return negativeColor;
        }

        // Mixed data: create gradient that transitions at y=0
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        
        // Calculate where y=0 is on the chart
        const zeroPixel = yScale.getPixelForValue(0);
        const topPixel = chartArea.top;
        const bottomPixel = chartArea.bottom;
        const chartHeight = bottomPixel - topPixel;
        
        // Calculate the position of zero as a percentage (0 to 1)
        let zeroPosition = (zeroPixel - topPixel) / chartHeight;
        zeroPosition = Math.max(0, Math.min(1, zeroPosition)); // Clamp between 0 and 1
        
        // Create gradient: positive color above zero, negative color below
        if (zeroPosition > 0) {
            gradient.addColorStop(0, positiveColor);
        }
        if (zeroPosition > 0 && zeroPosition < 1) {
            gradient.addColorStop(zeroPosition, positiveColor);
            gradient.addColorStop(zeroPosition, negativeColor);
        }
        if (zeroPosition < 1) {
            gradient.addColorStop(1, negativeColor);
        }
        
        return gradient;
    };

    // Factory function - returns fresh options with callbacks intact
    const createChartOptions = () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { 
        duration: IS_MOBILE ? 600 : 1000, // Faster animation on mobile
        easing: 'easeOutQuart' 
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          // Touch-friendly tooltip settings
          mode: IS_TOUCH_DEVICE ? 'nearest' : 'index',
          intersect: IS_TOUCH_DEVICE ? true : false,
          callbacks: {
            label: (context) => {
              if (context.dataset.label === "Divergence") return null;
              let label = (context.dataset.label || "").replace(/\s*\(%\)\s*/g, '');
              if (label) label += ": ";
              if (context.parsed.y !== null) label += context.parsed.y.toFixed(2) + "%";
              return label;
            },
          },
          bodyFont: { size: IS_MOBILE ? 12 : 13, family: "'Inter', sans-serif" },
          titleFont: { size: IS_MOBILE ? 12 : 14, weight: "600", family: "'Inter', sans-serif" },
          padding: IS_MOBILE ? 10 : 12,
          backgroundColor: "#ffffff",
          titleColor: "#1c2541",
          bodyColor: "#495057",
          borderColor: "rgba(0,0,0,0.1)",
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          boxPadding: IS_MOBILE ? 4 : 6,
          usePointStyle: true,
          shadowOffsetX: 0,
          shadowOffsetY: 4,
          shadowBlur: 10,
          shadowColor: "rgba(0,0,0,0.1)",
          // Keep tooltip visible longer on touch
          animation: {
            duration: IS_TOUCH_DEVICE ? 200 : 400
          }
        },
        annotation: { annotations: {} }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 11, family: "'Inter', sans-serif" },
            color: "#6c757d",
            padding: 5
          },
        },
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: "Growth Rate (%)",
            font: { size: 12, weight: "600", family: "'Inter', sans-serif" },
            color: "#495057",
            padding: { bottom: 10 }
          },
          ticks: {
            callback: (value) => value + "%",
            font: { size: 11, family: "'Inter', sans-serif" },
            color: "#6c757d",
            padding: 8
          },
          grid: { 
            drawBorder: false, 
            color: "rgba(0, 0, 0, 0.04)",
            borderDash: [5, 5]
          },
        },
      },
      interaction: { 
        mode: IS_TOUCH_DEVICE ? 'nearest' : 'index', 
        intersect: IS_TOUCH_DEVICE ? true : false,
        // Increase interaction radius for touch
        axis: 'x'
      },
      layout: { padding: { top: 20, right: 20, bottom: 10, left: 10 } },
    });

    const divergenceColor = "#c5817e"; // var(--danger)
    const primaryColor = "#c5a47e";    // var(--primary)
    const secondaryColor = "#1c2541";  // var(--secondary)
    const mutedColor = "#6c757d";      // var(--muted)

    // Define radii for points
    const smallPointRadius = 3;
    const smallPointHoverRadius = 6;
    // --- MODIFIED: Slightly larger divergence points ---
    const tinyPointRadius = 4; // Radius for divergence points
    const tinyPointHoverRadius = 7; // Hover radius for divergence points
    // --- END MODIFICATION ---


    // --- Chart Helper Functions ---

    const createAnnotationLabel = (xVal, yVal, content, yAdj = -15, xAdj = 0) => ({
        type: 'label',
        xValue: xVal,
        yValue: yVal,
        content: content,
        color: mutedColor,
        font: { size: 11, weight: '500', family: "'Inter', sans-serif" }, // Base size, adjusted in resize
        position: 'start',
        yAdjust: yAdj,
        xAdjust: xAdj,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: { top: 6, bottom: 6, left: 10, right: 10 },
        borderRadius: 6,
        // Optional callout line
        callout: {
            display: true,
            position: 'bottom',
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.1)',
            margin: 5 // Distance from point to label start
        }
    });

    // Creates a dummy dataset purely for the legend item
    const createDivergenceLegend = () => ({
        label: 'Divergence',
        // Use a distinct point style for the legend
        pointStyle: 'rectRot', // Rotated square
        pointRadius: 5,
        borderColor: divergenceColor,
        backgroundColor: divergenceColor,
        borderWidth: 1,
        data: [], // No actual data needed for legend item
    });

    // Callback to style point COLOR based on divergence (only affects visible points)
    const pointStyleCallback = (indices = [], normalColor, highlightColor) => (context) => {
        // Only return highlight color if the index is a divergence point
        // Otherwise, return the normal color (this is important even if radius is 0,
        // as Chart.js might still try to render something internally)
        return indices.includes(context.dataIndex) ? highlightColor : normalColor;
    };


    // --- Core Data Loading and Rendering ---
    // Helper to calculate slice start based on device and year range
    const getSliceStart = () => {
      const totalLength = currentData.chartData?.labels?.length || 0;
      
      if (IS_MOBILE) {
        // Mobile: Use progressive year range
        const currentRange = MOBILE_YEAR_RANGES[mobileYearRangeIndex];
        if (currentRange === 'full') {
          return 0; // Show all data
        }
        if (totalLength > currentRange) {
          return totalLength - currentRange;
        }
        return 0;
      } else {
        // Desktop: Original behavior (10Y default, toggle to full)
        if (!showFullHistory && totalLength > DEFAULT_YEARS_TO_SHOW) {
          return totalLength - DEFAULT_YEARS_TO_SHOW;
        }
        return 0;
      }
    }
    
    // Get current year range label for mobile button
    const getMobileButtonLabel = () => {
      const nextIndex = (mobileYearRangeIndex + 1) % MOBILE_YEAR_RANGES.length;
      const nextRange = MOBILE_YEAR_RANGES[nextIndex];
      if (nextRange === 'full') {
        return `View Full`;
      }
      return `View ${nextRange}Y`;
    }

    const renderCharts = () => {
      if (!currentData || !currentData.chartData) return;

      const chartData = currentData.chartData || {}
      let originalLabels = chartData.labels || []
      let originalRevenueGrowth = chartData.revenueGrowth || []
      let originalArGrowth = chartData.arGrowth || []
      let originalCfoGrowth = chartData.cfoGrowth || []
      let originalNiGrowth = chartData.niGrowth || []

      destroyCharts(); // Clear existing charts before re-rendering

      // Revenue Chart - Calculate data slice (unified state)
      const revenueSliceStart = getSliceStart();
      const revenueLabels = originalLabels.slice(revenueSliceStart);
      const revenueGrowthData = originalRevenueGrowth.slice(revenueSliceStart);

      const revenueCtx = select("#revenueChart")?.getContext("2d")
      if (revenueCtx && revenueGrowthData.length > 0) {
        try {
          revenueChartInstance = new Chart(revenueCtx, {
            type: "line",
            data: {
              labels: revenueLabels,
              datasets: [
                {
                  label: "Annual Revenue Growth (%)",
                  data: revenueGrowthData,
                  borderColor: primaryColor,
                  backgroundColor: 'rgba(197, 164, 126, 0.18)', // Initial color
                  borderWidth: 2.5,
                  tension: 0.4,
                  fill: true,
                  pointBackgroundColor: primaryColor, // Solid points
                  pointBorderColor: primaryColor,
                  pointBorderWidth: 2,
                  pointRadius: smallPointRadius,
                  pointHoverRadius: smallPointHoverRadius,
                  pointHoverBackgroundColor: primaryColor,
                  pointHoverBorderColor: "#ffffff"
                },
              ],
            },
            options: createChartOptions(),
            plugins: [{
              id: 'conditionalGradient',
              beforeDatasetsDraw: (chart) => {
                const ctx = chart.ctx;
                const dataset = chart.data.datasets[0];
                dataset.backgroundColor = createConditionalGradient(
                  ctx, 
                  chart, 
                  0, 
                  'rgba(197, 164, 126, 0.18)', // Gold for positive
                  'rgba(197, 129, 126, 0.28)'  // Red for negative
                );
              }
            }]
          })
        } catch (error) {
            console.error("Error creating Revenue Chart:", error);
        }
      }

      // Accounts Receivable vs Revenue Chart - Calculate data slice (unified state)
      const arSliceStart = getSliceStart();
      const arLabels = originalLabels.slice(arSliceStart);
      const arRevenueGrowthData = originalRevenueGrowth.slice(arSliceStart);
      const arGrowthData = originalArGrowth.slice(arSliceStart);
      
      // Calculate divergence for AR chart
      const arDivergenceIndices = calculateDivergenceIndices(arRevenueGrowthData, arGrowthData, DIVERGENCE_THRESHOLD);

      const arCtx = select("#arChart")?.getContext("2d")
      if (arCtx && arRevenueGrowthData.length > 0 && arGrowthData.length > 0) {
        try {
          const arChartOptions = createChartOptions();
          
          // Annotations Logic (Simplified for sliced data)
          arChartOptions.plugins.annotation = { annotations: {} };
          if (isAnnotationPluginAvailable && chartData.annotations?.arChart && Array.isArray(chartData.annotations.arChart)) {
              chartData.annotations.arChart.forEach((anno, index) => {
                  if (typeof anno.xVal === 'number' && anno.xVal >= 0 && anno.xVal < originalLabels.length && typeof anno.yVal === 'number' && anno.content) {
                      const adjustedXVal = anno.xVal - arSliceStart;
                      if (adjustedXVal >= 0 && adjustedXVal < arLabels.length) {
                          arChartOptions.plugins.annotation.annotations[`arLabel${index + 1}`] = createAnnotationLabel(adjustedXVal, anno.yVal, anno.content, anno.yAdj, anno.xAdj);
                      }
                  }
              });
          }

          arChartInstance = new Chart(arCtx, {
            type: "line",
            data: {
              labels: arLabels,
              datasets: [
                {
                  label: "Revenue Growth (%)",
                  data: arRevenueGrowthData,
                  borderColor: primaryColor,
                  backgroundColor: 'rgba(197, 164, 126, 0.15)', // Initial
                  borderWidth: 2,
                  tension: 0.4,
                  fill: true,
                  pointBackgroundColor: (context) => arDivergenceIndices.includes(context.dataIndex) ? "#ffffff" : primaryColor, // Hollow at divergence, solid otherwise
                  pointBorderColor: primaryColor,
                  pointBorderWidth: 2,
                  pointRadius: (context) => arDivergenceIndices.includes(context.dataIndex) ? tinyPointRadius : smallPointRadius,
                  pointHoverRadius: (context) => arDivergenceIndices.includes(context.dataIndex) ? tinyPointHoverRadius : smallPointHoverRadius,
                  pointHoverBackgroundColor: primaryColor,
                  pointHoverBorderColor: "#ffffff"
                },
                {
                  label: "A/R Growth (%)",
                  data: arGrowthData,
                  borderColor: secondaryColor,
                  backgroundColor: 'rgba(28, 37, 65, 0.15)', // Initial
                  borderWidth: 2,
                  tension: 0.4,
                  fill: true,
                  pointRadius: (context) => arDivergenceIndices.includes(context.dataIndex) ? tinyPointRadius : smallPointRadius,
                  pointHoverRadius: (context) => arDivergenceIndices.includes(context.dataIndex) ? tinyPointHoverRadius : smallPointHoverRadius,
                  pointBackgroundColor: (context) => arDivergenceIndices.includes(context.dataIndex) ? divergenceColor : secondaryColor, // Solid divergence, solid navy otherwise
                  pointBorderColor: (context) => arDivergenceIndices.includes(context.dataIndex) ? divergenceColor : secondaryColor,
                  pointBorderWidth: 2,
                  pointHoverBackgroundColor: (context) => arDivergenceIndices.includes(context.dataIndex) ? divergenceColor : secondaryColor,
                  pointHoverBorderColor: "#ffffff"
                },
                createDivergenceLegend(),
              ],
            },
            options: arChartOptions,
            plugins: [{
              id: 'conditionalGradient',
              beforeDatasetsDraw: (chart) => {
                const ctx = chart.ctx;
                // Revenue dataset (index 0)
                chart.data.datasets[0].backgroundColor = createConditionalGradient(
                  ctx, chart, 0,
                  'rgba(197, 164, 126, 0.15)', // Gold for positive
                  'rgba(197, 129, 126, 0.25)'  // Red for negative
                );
                // A/R dataset (index 1)
                chart.data.datasets[1].backgroundColor = createConditionalGradient(
                  ctx, chart, 1,
                  'rgba(28, 37, 65, 0.15)',    // Blue for positive
                  'rgba(197, 129, 126, 0.25)'  // Red for negative
                );
              }
            }]
          })
        } catch (error) {
          console.error("Error creating AR Chart:", error);
        }
      }

      // Cash Flow vs Net Income Chart - Calculate data slice (unified state)
      const cfSliceStart = getSliceStart();
      const cfLabels = originalLabels.slice(cfSliceStart);
      const cfCfoGrowthData = originalCfoGrowth.slice(cfSliceStart);
      const cfNiGrowthData = originalNiGrowth.slice(cfSliceStart);
      
      // Calculate divergence for Cash Flow chart
      const cfDivergenceIndices = calculateDivergenceIndices(cfCfoGrowthData, cfNiGrowthData, DIVERGENCE_THRESHOLD);

      const cashFlowCtx = select("#cashFlowChart")?.getContext("2d")
      if (cashFlowCtx && cfCfoGrowthData.length > 0 && cfNiGrowthData.length > 0) {
        try {
          const cashFlowChartOptions = createChartOptions();
          
          // Annotations Logic
          cashFlowChartOptions.plugins.annotation = { annotations: {} };
          if (isAnnotationPluginAvailable && chartData.annotations?.cashFlowChart && Array.isArray(chartData.annotations.cashFlowChart)) {
              chartData.annotations.cashFlowChart.forEach((anno, index) => {
                  if (typeof anno.xVal === 'number' && anno.xVal >= 0 && anno.xVal < originalLabels.length && typeof anno.yVal === 'number' && anno.content) {
                      const adjustedXVal = anno.xVal - cfSliceStart;
                      if (adjustedXVal >= 0 && adjustedXVal < cfLabels.length) {
                          cashFlowChartOptions.plugins.annotation.annotations[`cfLabel${index + 1}`] = createAnnotationLabel(adjustedXVal, anno.yVal, anno.content, anno.yAdj, anno.xAdj);
                      }
                  }
              });
          }

          cashFlowChartInstance = new Chart(cashFlowCtx, {
            type: "line",
            data: {
              labels: cfLabels,
              datasets: [
                {
                  label: "Op Cash Flow Growth (%)",
                  data: cfCfoGrowthData,
                  borderColor: primaryColor,
                  backgroundColor: 'rgba(197, 164, 126, 0.15)', // Initial
                  borderWidth: 2,
                  tension: 0.4,
                  fill: true,
                  pointBackgroundColor: (context) => cfDivergenceIndices.includes(context.dataIndex) ? "#ffffff" : primaryColor, // Hollow at divergence, solid otherwise
                  pointBorderColor: primaryColor,
                  pointBorderWidth: 2,
                  pointRadius: (context) => cfDivergenceIndices.includes(context.dataIndex) ? tinyPointRadius : smallPointRadius,
                  pointHoverRadius: (context) => cfDivergenceIndices.includes(context.dataIndex) ? tinyPointHoverRadius : smallPointHoverRadius,
                  pointHoverBackgroundColor: primaryColor,
                  pointHoverBorderColor: "#ffffff"
                },
                {
                  label: "Net Income Growth (%)",
                  data: cfNiGrowthData,
                  borderColor: secondaryColor,
                  backgroundColor: 'rgba(28, 37, 65, 0.15)', // Initial
                  borderWidth: 2,
                  tension: 0.4,
                  fill: true,
                  pointRadius: (context) => cfDivergenceIndices.includes(context.dataIndex) ? tinyPointRadius : smallPointRadius,
                  pointHoverRadius: (context) => cfDivergenceIndices.includes(context.dataIndex) ? tinyPointHoverRadius : smallPointHoverRadius,
                  pointBackgroundColor: (context) => cfDivergenceIndices.includes(context.dataIndex) ? divergenceColor : secondaryColor, // Solid divergence, solid navy otherwise
                  pointBorderColor: (context) => cfDivergenceIndices.includes(context.dataIndex) ? divergenceColor : secondaryColor,
                  pointBorderWidth: 2,
                  pointHoverBackgroundColor: (context) => cfDivergenceIndices.includes(context.dataIndex) ? divergenceColor : secondaryColor,
                  pointHoverBorderColor: "#ffffff"
                },
                createDivergenceLegend(),
              ],
            },
            options: cashFlowChartOptions,
            plugins: [{
              id: 'conditionalGradient',
              beforeDatasetsDraw: (chart) => {
                const ctx = chart.ctx;
                // CFO dataset (index 0)
                chart.data.datasets[0].backgroundColor = createConditionalGradient(
                  ctx, chart, 0,
                  'rgba(197, 164, 126, 0.15)', // Gold for positive
                  'rgba(197, 129, 126, 0.25)'  // Red for negative
                );
                // Net Income dataset (index 1)
                chart.data.datasets[1].backgroundColor = createConditionalGradient(
                  ctx, chart, 1,
                  'rgba(28, 37, 65, 0.15)',    // Blue for positive
                  'rgba(197, 129, 126, 0.25)'  // Red for negative
                );
              }
            }]
          })
        } catch (error) {
          console.error("Error creating Cash Flow Chart:", error);
        }
      }
      
      handleResize(); // Trigger resize to adjust fonts
    };

    const loadAnalysisData = async (ticker) => {
      ticker = ticker.trim().toUpperCase()
      if (!ticker) {
        showMessage('<i class="fas fa-exclamation-circle"></i> Please enter a ticker symbol.', "error")
        return
      }

      showMessage(`<i class="fas fa-spinner fa-spin"></i> Loading analysis for ${ticker}...`, "loading")
      
      // Show skeletons
      showSkeletons(true);
      
      // Reset unified state
      showFullHistory = false;
      mobileYearRangeIndex = 0; // Reset mobile range cycle
      
      // Remove existing toggle buttons and custom legends to prevent duplication
      document.querySelectorAll('.chart-toggle-btn').forEach(btn => btn.remove());
      document.querySelectorAll('.chart-custom-legend').forEach(legend => legend.remove());

      const searchButton = select("#tickerSearchForm button") // Button in analysis header
      if (searchButton) searchButton.disabled = true // Disable button during load

      try {
        const response = await fetch(`${DATA_PATH}${ticker}.json`)

        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`Data file not found for ${ticker}. Redirecting to error page.`);
            window.location.href = `error-loading.html?ticker=${ticker}`
            return
          } else {
            throw new Error(`HTTP error! status: ${response.status} - Could not fetch data for ${ticker}.`)
          }
        }

        currentData = await response.json() // Store data globally

        if (!currentData || typeof currentData !== "object") {
          throw new Error(`Invalid data format received for ticker "${ticker}". Expected JSON object.`)
        }

        currentTicker = ticker

        // --- Populate Dynamic Content ---
        populateElement('[data-dynamic="page-title"]', currentData.company?.pageTitle || `ForensicFinancials | ${ticker} Analysis`)
        populateElement('[data-dynamic="hero-title"]', `${currentData.company?.name || ticker} (${currentData.company?.ticker || ticker})<br>${currentData.company?.analysisTitle || "Financial Analysis"}`, "innerHTML")
        populateElement('[data-dynamic="hero-subtitle"]', currentData.company?.heroSubtitle || `Analysis details for ${ticker}.`)

        populateElement('[data-dynamic="trends-subtitle"]', currentData.trendAnalysis?.sectionSubtitle || "")
        generateCards("trends-cards-container", currentData.trendAnalysis?.cards || [])

        populateElement('[data-dynamic="financials-subtitle"]', currentData.financialMetrics?.sectionSubtitle || "")
        generateCards("financials-cards-container", currentData.financialMetrics?.cards || [])

        populateElement('[data-dynamic="opportunities-subtitle"]', currentData.investmentConsiderations?.sectionSubtitle || "")
        populateTable("opportunities-table-body", currentData.investmentConsiderations?.tableData || [])

        populateElement('[data-dynamic="conclusion-subtitle"]', currentData.conclusion?.sectionSubtitle || "")
        populateElement('[data-dynamic="verdict-title"]', currentData.conclusion?.verdictTitle || `Verdict for ${ticker}`)
        populateElement('[data-dynamic="verdict-rating"]', currentData.conclusion?.verdictRating || "N/A")
        
        const paragraphsContainer = select("#verdict-paragraphs")
        if (paragraphsContainer && Array.isArray(currentData.conclusion?.paragraphs)) {
            paragraphsContainer.innerHTML = currentData.conclusion.paragraphs.map(p => `<p>${p || ""}</p>`).join('');
        } else if (paragraphsContainer) {
            paragraphsContainer.innerHTML = "<p>Conclusion details not available.</p>";
        }
        populateElement('[data-dynamic="monitoring-title"]', currentData.conclusion?.monitoringPointsTitle || "Key Monitoring Points")
        populateList("monitoring-points-list", currentData.conclusion?.monitoringPoints || [], true)

        // --- Add Legends and Optional Toggle Buttons for Each Chart ---
        const chartLabels = currentData.chartData?.labels || [];
        const totalYears = chartLabels.length;
        // Mobile: show button if > 5 years, Desktop: show if > 10 years
        const hasToggleOption = IS_MOBILE 
            ? totalYears > MOBILE_DEFAULT_YEARS 
            : totalYears > DEFAULT_YEARS_TO_SHOW;
        
        // Store all toggle buttons for unified updates
        const allToggleBtns = [];
        
        // Helper function to update all toggle buttons
        const updateAllToggleBtns = () => {
            allToggleBtns.forEach(btn => {
                if (IS_MOBILE) {
                    // Mobile: show next range label using text
                    btn.textContent = getMobileButtonLabel();
                } else {
                    // Desktop: toggle between 10Y and Full using text
                    btn.textContent = showFullHistory ? "View 10Y" : "View Full";
                }
            });
        };
        
        // Helper function to create custom legend (always) and toggle button (if needed) for a specific chart
        const createChartHeaderElements = (canvasId, legendItems) => {
            const canvas = document.getElementById(canvasId);
            const chartContainer = canvas?.closest('.chart-container');
            const chartHeader = chartContainer?.querySelector('.chart-header');
            
            if (chartHeader) {
                // Desktop layout: 3-column grid: Title | Legends | Button (or just 2 columns if no button)
                chartHeader.style.display = "grid";
                chartHeader.style.gridTemplateColumns = hasToggleOption ? "auto 1fr auto" : "auto 1fr";
                chartHeader.style.alignItems = "center";
                chartHeader.style.gap = "16px";
                chartHeader.style.marginBottom = "12px";
                
                // Title is already in h3, just style it
                const titleEl = chartHeader.querySelector("h3");
                if (titleEl) {
                    titleEl.style.margin = "0";
                    titleEl.style.justifySelf = "start";
                }
                
                // Create custom legend container (always visible)
                const legendContainer = document.createElement("div");
                legendContainer.className = "chart-custom-legend";
                legendContainer.style.display = "flex";
                legendContainer.style.alignItems = "center";
                legendContainer.style.gap = "16px";
                legendContainer.style.justifySelf = "end";
                legendContainer.style.fontSize = "0.75rem";
                legendContainer.style.fontFamily = "'Inter', sans-serif";
                legendContainer.style.color = "#6c757d";
                
                // Add legend items
                legendItems.forEach(item => {
                    const legendItem = document.createElement("div");
                    legendItem.style.display = "flex";
                    legendItem.style.alignItems = "center";
                    legendItem.style.gap = "6px";
                    
                    const dot = document.createElement("span");
                    dot.style.width = "10px";
                    dot.style.height = "10px";
                    dot.style.borderRadius = "50%";
                    dot.style.backgroundColor = item.color;
                    
                    const label = document.createElement("span");
                    label.textContent = item.label;
                    
                    legendItem.appendChild(dot);
                    legendItem.appendChild(label);
                    legendContainer.appendChild(legendItem);
                });
                
                chartHeader.appendChild(legendContainer);
                
                // Create toggle button if enough data years available
                if (hasToggleOption) {
                    const toggleBtn = document.createElement("button");
                    toggleBtn.className = "chart-toggle-btn";
                    toggleBtn.style.fontSize = "0.7rem";
                    toggleBtn.style.padding = "5px 12px";
                    toggleBtn.style.backgroundColor = "#1c2541";
                    toggleBtn.style.color = "#ffffff";
                    toggleBtn.style.border = "none";
                    toggleBtn.style.borderRadius = "4px";
                    toggleBtn.style.cursor = "pointer";
                    toggleBtn.style.fontFamily = "'Inter', sans-serif";
                    toggleBtn.style.fontWeight = "500";
                    toggleBtn.style.transition = "all 0.2s ease";
                    toggleBtn.style.justifySelf = "end";
                    
                    // Set initial button label based on device (text only)
                    if (IS_MOBILE) {
                        toggleBtn.textContent = getMobileButtonLabel();
                    } else {
                        toggleBtn.textContent = "View Full";
                    }
                    
                    // Hover effects (desktop only)
                    if (!IS_MOBILE) {
                        toggleBtn.addEventListener("mouseenter", () => {
                            toggleBtn.style.backgroundColor = "#2d3f5f";
                            toggleBtn.style.transform = "translateY(-1px)";
                        });
                        toggleBtn.addEventListener("mouseleave", () => {
                            toggleBtn.style.backgroundColor = "#1c2541";
                            toggleBtn.style.transform = "translateY(0)";
                        });
                    }
                    
                    // Click handler - different behavior for mobile vs desktop
                    toggleBtn.addEventListener("click", () => {
                        if (IS_MOBILE) {
                            // Mobile: Cycle through 5Y → 10Y → Full → 5Y
                            mobileYearRangeIndex = (mobileYearRangeIndex + 1) % MOBILE_YEAR_RANGES.length;
                        } else {
                            // Desktop: Toggle between 10Y and Full
                            showFullHistory = !showFullHistory;
                        }
                        updateAllToggleBtns();
                        renderCharts();
                    });
                    
                    chartHeader.appendChild(toggleBtn);
                    allToggleBtns.push(toggleBtn);
                }
            }
        };
        
        // Create legend (always) and toggle buttons (if >10 years) for each chart
        createChartHeaderElements(
            "revenueChart",
            [{ label: "Revenue Growth", color: primaryColor }]
        );
        
        createChartHeaderElements(
            "arChart",
            [
                { label: "Revenue", color: primaryColor },
                { label: "A/R", color: secondaryColor },
                { label: "Divergence", color: divergenceColor }
            ]
        );
        
        createChartHeaderElements(
            "cashFlowChart",
            [
                { label: "CFO", color: primaryColor },
                { label: "Net Income", color: secondaryColor },
                { label: "Divergence", color: divergenceColor }
            ]
        );

        // Hide skeletons and show actual content BEFORE rendering charts
        // (Chart.js needs visible canvas to calculate dimensions)
        showSkeletons(false);
        
        renderCharts(); // Initial render
        
        showMessage(null) // Hide loading message, show content
        window.scrollTo({ top: 0, behavior: "smooth" })

      } catch (error) {
        console.error("Error loading or processing analysis data:", error)
        window.location.href = `error-loading.html?ticker=${ticker}&error=${encodeURIComponent(error.message)}`
      } finally {
        if (searchButton) searchButton.disabled = false // Re-enable search button
      }
    }

    // --- Event Listeners for Analysis Page ---

    // Analysis Page: Header Search Form (Handles reload/update)
    const analysisHeaderSearchForm = select("#tickerSearchForm") // Specific ID for analysis page header form
    const tickerInput = select("#tickerInput") // Input field in analysis page header
    if (analysisHeaderSearchForm && tickerInput) {
      analysisHeaderSearchForm.addEventListener("submit", (e) => {
        e.preventDefault() // Prevent default page reload
        const newTicker = tickerInput.value.trim().toUpperCase()
        if (newTicker && newTicker !== currentTicker) {
          loadAnalysisData(newTicker) // Load data for the new ticker
          // Update URL without full page reload for better UX
          const newUrl = `${window.location.pathname}?ticker=${newTicker}`
          window.history.pushState({ path: newUrl }, "", newUrl) // Update browser history
        } else if (!newTicker) {
          console.warn("Ticker input is empty.")
          // Optionally show a message to the user
          // showMessage('<i class="fas fa-exclamation-circle"></i> Please enter a ticker symbol.', 'error');
        } else {
            console.log(`Ticker ${newTicker} is already loaded.`);
        }
      })
    } else {
      console.error("Analysis page header search form (#tickerSearchForm) or input (#tickerInput) not found.")
    }

    // Handle browser back/forward navigation (popstate)
    window.addEventListener("popstate", (event) => {
      const urlParams = new URLSearchParams(window.location.search)
      const tickerParam = urlParams.get("ticker")
      const targetTicker = tickerParam ? tickerParam.toUpperCase() : DEFAULT_TICKER
      // Reload data only if the ticker in the URL is different from the current one
      if (targetTicker !== currentTicker) {
        console.log(`Popstate event: Loading data for ${targetTicker}`);
        loadAnalysisData(targetTicker)
        if (tickerInput) tickerInput.value = targetTicker // Update input field to match URL
      }
    })

    // --- Resize Handling ---
    // Handles chart resize on window resize
    let resizeTimeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        const chartsToResize = [revenueChartInstance, arChartInstance, cashFlowChartInstance]

        chartsToResize.forEach((chart, index) => {
          if (!chart || !chart.options) return // Skip if chart doesn't exist

          try {
            // Resize and update the chart
            chart.resize(); // Adjust canvas size
            chart.update('none'); // Redraw chart without animation
          } catch (error) {
            console.error(`Error resizing chart ${index}:`, error);
          }
        })
        // Optional: Log after resize attempt
        // if (chartsToResize.some(c => c)) { console.log("Charts resize attempt finished."); }
      }, 250) // Debounce resize event for performance
    }
    window.addEventListener("resize", handleResize)

    // --- Initial Load ---
    const urlParams = new URLSearchParams(window.location.search)
    const tickerParam = urlParams.get("ticker")

    const initialTicker = tickerParam ? tickerParam.toUpperCase() : DEFAULT_TICKER
    if (tickerInput) {
      tickerInput.value = initialTicker // Set initial value in header input on analysis page
    }
    loadAnalysisData(initialTicker) // Load data for the initial ticker (from URL or default)
  }) // End DOMContentLoaded for analysis page
} // End if(isAnalysisPage)
