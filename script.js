// --- START OF FILE script.js ---

// Note: Chart.js and ChartAnnotation are expected to be loaded globally via script tags in analysis.html
// If using modules, you'd import them: import { Chart } from 'chart.js'; import ChartAnnotation from 'chartjs-plugin-annotation';

const DEFAULT_TICKER = "AAPL"
const DATA_PATH = "DATA/"
const DIVERGENCE_THRESHOLD = 30.0
const MOBILE_BREAKPOINT = 768; // Define mobile breakpoint width
const MAX_DATA_POINTS_MOBILE = 10; // Max data points for mobile charts

let currentTicker = null
let charts = {}; // Global object to hold chart instances

const isAnalysisPage = window.location.pathname.includes("analysis.html")
const isSearchPage = window.location.pathname.includes("search.html")
const isLandingPage = !isAnalysisPage && !isSearchPage

// --- Helper Functions ---

const hexToRGBA = (hex, alpha) => {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(h => h + h).join('');
    const r = parseInt(c.substr(0, 2), 16);
    const g = parseInt(c.substr(2, 2), 16);
    const b = parseInt(c.substr(4, 2), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

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
  Object.keys(charts).forEach(key => {
      if (charts[key]) {
          charts[key].destroy();
          charts[key] = null;
      }
  });
  charts = {}; // Reset the object
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

class ChartManager {
  constructor() {
    // Use colors defined later in the script for consistency
    this.palette = [
      "#c5a47e", // primaryColor
      "#1c2541", // secondaryColor
      "#6c757d", // mutedColor
      "#c5817e", // divergenceColor
    ];
    this.gridColor = "rgba(0, 0, 0, 0.05)";
    this.textColor = "#6c757d";
    this.titleColor = "#495057";
  }

  // Base options combining common elements
  baseOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 12 }, // Base size, adjust in resize
            color: this.textColor,
          },
        },
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: "Growth Rate (%)",
            font: { size: 12, weight: "500" }, // Base size, adjust in resize
            color: this.titleColor,
          },
          ticks: {
            callback: (value) => value + "%",
            font: { size: 11 }, // Base size, adjust in resize
            color: this.textColor,
          },
          grid: { drawBorder: false, color: this.gridColor },
        },
      },
      plugins: {
        legend: { // Base legend config, can be overridden
          position: "top",
          align: "end",
          labels: {
            boxWidth: 8,
            boxHeight: 8,
            padding: 8,
            font: { size: 10 }, // Base size, adjust in resize
            color: this.textColor,
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              // Keep existing logic: Don't show tooltip for the dummy 'Divergence' dataset
              if (context.dataset.label === "Divergence") return null
              let label = context.dataset.label || ""
              if (label) label += ": "
              if (context.parsed.y !== null) {
                  // Format as percentage with 1 decimal place
                  label += context.parsed.y.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
              } else {
                  label += 'N/A';
              }
              return label
            },
            title: (tooltipItems) => {
              // Use the label (Year) as the title
              return tooltipItems[0]?.label || '';
            }
          },
          bodyFont: { size: 12 }, // Base size, adjust in resize
          backgroundColor: "rgba(0,0,0,0.8)",
          titleFont: { size: 13, weight: "bold" },
          padding: 10,
          cornerRadius: 4,
          displayColors: true, // Show color box next to label
        },
        annotation: { // Base annotation structure, specific annotations added per chart
           annotations: {}
        }
      },
      layout: { padding: { top: 20, right: 20, bottom: 10, left: 10 } },
      elements: { line: { tension: 0.4 } } // Apply common tension
    };
  }
}

const createLineChart = ({ canvasId, labels, datasets, options }) => {
    const ctx = select(`#${canvasId}`)?.getContext("2d");
    if (!ctx) {
        console.warn(`Canvas not found for chart ID: ${canvasId}`);
        return null; // Indicate chart wasn't created
    }

    // Destroy existing chart instance if it exists
    if (charts[canvasId]) {
        charts[canvasId].destroy();
        console.log(`Destroyed existing chart: ${canvasId}`);
    }

    try {
        charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: options,
        });
        console.log(`Created chart: ${canvasId}`);
        return charts[canvasId]; // Return the new instance
    } catch (error) {
        console.error(`Error creating chart ${canvasId}:`, error);
        // Display error message on canvas
        ctx.font = "14px Arial";
        ctx.fillStyle = "red";
        ctx.textAlign = "center";
        ctx.fillText("Error loading chart", ctx.canvas.width / 2, ctx.canvas.height / 2);
        charts[canvasId] = null; // Ensure no stale instance
        return null;
    }
}

const createAnnotationLabel = (xVal, yVal, content, yAdj = -15, xAdj = 0) => ({
        type: 'label',
        xValue: xVal,
        yValue: yVal,
        content: content,
        color: "#6c757d",
        font: { size: 10, weight: '600' }, // Base size, adjusted in resize
        position: 'start',
        yAdjust: yAdj,
        xAdjust: xAdj,
        backgroundColor: 'rgba(255,255,255,0.85)',
        padding: { top: 3, bottom: 3, left: 5, right: 5 },
        borderRadius: 4,
        // Optional callout line
        callout: {
            display: true,
            position: 'bottom',
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.1)',
            margin: 5 // Distance from point to label start
        }
    });

const createDivergenceLegend = () => ({
        label: 'Divergence',
        // Use a distinct point style for the legend
        pointStyle: 'rectRot', // Rotated square
        pointRadius: 5,
        borderColor: "#c5817e",
        backgroundColor: "#c5817e",
        borderWidth: 1,
        data: [], // No actual data needed for legend item
    });

const pointStyleCallback = (indices = [], normalColor, highlightColor) => (context) => {
        // Only return highlight color if the index is a divergence point
        // Otherwise, return the normal color (this is important even if radius is 0,
        // as Chart.js might still try to render something internally)
        return indices.includes(context.dataIndex) ? highlightColor : normalColor;
    };

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

// --- Analysis Page Specific Logic ---
if (isAnalysisPage) {
  document.addEventListener("DOMContentLoaded", () => {
    // Check if Chart.js is loaded
    if (typeof Chart === "undefined") {
      console.error("Chart.js library is not loaded.")
      showMessage('<i class="fas fa-exclamation-triangle"></i> Chart library failed to load. Please refresh.', "error")
      return
    }
    // Check if ChartAnnotation plugin is loaded
    let ChartAnnotation = window.ChartAnnotation; // Access potentially global plugin
    if (typeof ChartAnnotation === "undefined") {
      console.warn("Chartjs-plugin-annotation not loaded. Annotations will not be displayed.")
    } else {
        // Attempt to register the plugin if found
        try {
            // Chart.js v3+ uses Chart.register()
            if (typeof Chart.register === 'function') {
                 Chart.register(ChartAnnotation);
                 console.log("ChartAnnotation plugin registered.");
            } else {
                // Fallback for older Chart.js versions (less likely needed)
                console.warn("Chart.register is not a function. Plugin registration might differ for older Chart.js versions.");
            }
        } catch (error) {
            console.error("Error registering ChartAnnotation plugin:", error);
        }
    }

    const chartMgr = new ChartManager();

    const divergenceColor = "#c5817e"; // var(--danger)
    const primaryColor = "#c5a47e";    // var(--primary)
    const secondaryColor = "#1c2541";  // var(--secondary)
    const mutedColor = "#6c757d";      // var(--muted)

    // Define radii for points
    const smallPointRadius = 2;
    const smallPointHoverRadius = 4;
    // --- MODIFIED: Slightly larger divergence points ---
    const tinyPointRadius = 3; // Radius for divergence points
    const tinyPointHoverRadius = 5; // Hover radius for divergence points
    // --- END MODIFICATION ---


    // --- Core Data Loading and Rendering ---
    const loadAnalysisData = async (ticker) => {
      ticker = ticker.trim().toUpperCase()
      if (!ticker) {
        showMessage('<i class="fas fa-exclamation-circle"></i> Please enter a ticker symbol.', "error")
        return
      }

      showMessage(`<i class="fas fa-spinner fa-spin"></i> Loading analysis for ${ticker}...`, "loading")
      destroyCharts() // Clear previous charts

      const searchButton = select("#tickerSearchForm button") // Button in analysis header
      if (searchButton) searchButton.disabled = true // Disable button during load

      try {
        const response = await fetch(`${DATA_PATH}${ticker}.json`)

        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`Data file not found for ${ticker}. Redirecting to error page.`);
            // Redirect to the specific error page for unsupported tickers
            window.location.href = `error-loading.html?ticker=${ticker}`
            return // Stop execution here
          } else {
            // Handle other HTTP errors (e.g., 500 Internal Server Error)
            throw new Error(`HTTP error! status: ${response.status} - Could not fetch data for ${ticker}.`)
          }
        }

        const data = await response.json()

        // Basic data validation
        if (!data || typeof data !== "object") {
          throw new Error(`Invalid data format received for ticker "${ticker}". Expected JSON object.`)
        }
        if (!data.company || !data.chartData) {
             console.warn(`Incomplete data structure for ${ticker}. Missing 'company' or 'chartData'.`);
             // Decide how to handle: show partial data or error out?
             // For now, proceed but expect potential issues.
        }

        currentTicker = ticker // Update the currently displayed ticker

        // --- Populate Dynamic Content ---
        populateElement('[data-dynamic="page-title"]', data.company?.pageTitle || `ForensicFinancials | ${ticker} Analysis`)
        populateElement('[data-dynamic="hero-title"]', `${data.company?.name || ticker} (${data.company?.ticker || ticker})<br>${data.company?.analysisTitle || "Financial Analysis"}`, "innerHTML")
        populateElement('[data-dynamic="hero-subtitle"]', data.company?.heroSubtitle || `Analysis details for ${ticker}.`)

        populateElement('[data-dynamic="trends-subtitle"]', data.trendAnalysis?.sectionSubtitle || "")
        generateCards("trends-cards-container", data.trendAnalysis?.cards || [])

        populateElement('[data-dynamic="financials-subtitle"]', data.financialMetrics?.sectionSubtitle || "")
        generateCards("financials-cards-container", data.financialMetrics?.cards || [])

        populateElement('[data-dynamic="opportunities-subtitle"]', data.investmentConsiderations?.sectionSubtitle || "")
        populateTable("opportunities-table-body", data.investmentConsiderations?.tableData || [])

        populateElement('[data-dynamic="conclusion-subtitle"]', data.conclusion?.sectionSubtitle || "")
        populateElement('[data-dynamic="verdict-title"]', data.conclusion?.verdictTitle || `Verdict for ${ticker}`)
        populateElement('[data-dynamic="verdict-rating"]', data.conclusion?.verdictRating || "N/A")
        // Populate conclusion paragraphs
        const paragraphsContainer = select("#verdict-paragraphs")
        if (paragraphsContainer && Array.isArray(data.conclusion?.paragraphs)) {
            paragraphsContainer.innerHTML = data.conclusion.paragraphs.map(p => `<p>${p || ""}</p>`).join('');
        } else if (paragraphsContainer) {
            paragraphsContainer.innerHTML = "<p>Conclusion details not available.</p>";
        }
        populateElement('[data-dynamic="monitoring-title"]', data.conclusion?.monitoringPointsTitle || "Key Monitoring Points")
        populateList("monitoring-points-list", data.conclusion?.monitoringPoints || [], true) // Use innerHTML for monitoring points

        // --- Chart Rendering ---
        const chartData = data.chartData || {}
        let originalLabels = chartData.labels || []
        let originalRevenueGrowth = chartData.revenueGrowth || []
        let originalArGrowth = chartData.arGrowth || []
        let originalCfoGrowth = chartData.cfoGrowth || []
        let originalNiGrowth = chartData.niGrowth || []

        // --- MODIFIED: Limit data points on mobile ---
        const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
        let displayLabels = originalLabels;
        let displayRevenueGrowth = originalRevenueGrowth;
        let displayArGrowth = originalArGrowth;
        let displayCfoGrowth = originalCfoGrowth;
        let displayNiGrowth = originalNiGrowth;

        if (isMobile && originalLabels.length > MAX_DATA_POINTS_MOBILE) {
            console.log(`Mobile detected. Slicing data to last ${MAX_DATA_POINTS_MOBILE} points.`);
            const sliceStart = originalLabels.length - MAX_DATA_POINTS_MOBILE;
            displayLabels = originalLabels.slice(sliceStart);
            displayRevenueGrowth = originalRevenueGrowth.slice(sliceStart);
            displayArGrowth = originalArGrowth.slice(sliceStart);
            displayCfoGrowth = originalCfoGrowth.slice(sliceStart);
            displayNiGrowth = originalNiGrowth.slice(sliceStart);
        }
        // --- END MODIFICATION ---

        // Calculate divergence points *based on the data being displayed*
        const arDivergenceIndices = calculateDivergenceIndices(displayRevenueGrowth, displayArGrowth, DIVERGENCE_THRESHOLD);
        const cfDivergenceIndices = calculateDivergenceIndices(displayCfoGrowth, displayNiGrowth, DIVERGENCE_THRESHOLD);

        // --- REFACTORED: Chart Creation --- //

        // 1. Revenue Chart
        const revenueDatasets = [
            {
              label: "Annual Revenue Growth (%)",
              data: displayRevenueGrowth,
              borderColor: chartMgr.palette[0], // Use palette
              backgroundColor: hexToRGBA(chartMgr.palette[0], 0.1), // Light fill
              borderWidth: 2.5,
              fill: true,
              pointBackgroundColor: chartMgr.palette[0],
              pointBorderColor: chartMgr.palette[0],
              pointRadius: smallPointRadius,
              pointHoverRadius: smallPointHoverRadius,
              order: 1 // Explicit order
            },
        ];
        const revenueOptions = chartMgr.baseOptions(); // Start with base options
        // Customize Revenue chart options if needed (e.g., specific tooltips, no annotations)
        revenueOptions.plugins.tooltip.callbacks.label = (context) => {
             let label = context.dataset.label || ""
             if (label) label += ": "
             if (context.parsed.y !== null) {
                 label += context.parsed.y.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
             } else {
                 label += 'N/A';
             }
             return label
        };

        createLineChart({ canvasId: 'revenueChart', labels: displayLabels, datasets: revenueDatasets, options: revenueOptions });

        // 2. Accounts Receivable vs Revenue Chart
        const arAnnotations = {};
         if (typeof ChartAnnotation !== 'undefined' && chartData.annotations?.arChart && Array.isArray(chartData.annotations.arChart)) {
            chartData.annotations.arChart.forEach((anno, index) => {
                if (typeof anno.xVal === 'number' && anno.xVal >= 0 && anno.xVal < originalLabels.length && typeof anno.yVal === 'number' && anno.content) { // Check against original length
                    const adjustedXVal = isMobile && originalLabels.length > MAX_DATA_POINTS_MOBILE
                        ? Math.max(0, anno.xVal - (originalLabels.length - MAX_DATA_POINTS_MOBILE))
                        : anno.xVal;
                    if (adjustedXVal >= 0 && adjustedXVal < displayLabels.length) { // Check against displayed length
                        arAnnotations[`arLabel${index + 1}`] = createAnnotationLabel(adjustedXVal, anno.yVal, anno.content, anno.yAdj, anno.xAdj);
                    }
                }
            });
        }

        const arDatasets = [
            {
                label: "Revenue Growth (%)",
                data: displayRevenueGrowth,
                borderColor: chartMgr.palette[0],
                backgroundColor: "transparent",
                borderWidth: 2,
                pointRadius: 0, // Hide points for this line
                pointHoverRadius: 0,
                order: 2 // Draw below A/R
            },
            {
                label: "A/R Growth (%)",
                data: displayArGrowth,
                borderColor: chartMgr.palette[1],
                backgroundColor: "transparent",
                borderWidth: 2,
                pointRadius: (context) => arDivergenceIndices.includes(context.dataIndex) ? tinyPointRadius : 0,
                pointHoverRadius: (context) => arDivergenceIndices.includes(context.dataIndex) ? tinyPointHoverRadius : 0,
                pointBackgroundColor: pointStyleCallback(arDivergenceIndices, chartMgr.palette[1], divergenceColor),
                pointBorderColor: pointStyleCallback(arDivergenceIndices, chartMgr.palette[1], divergenceColor),
                order: 1 // Draw on top
            },
        ];
        // Add divergence legend item only if there are divergences
        if (arDivergenceIndices.length > 0) {
            arDatasets.push(createDivergenceLegend());
        }

        const arOptions = chartMgr.baseOptions();
        arOptions.plugins.annotation.annotations = arAnnotations;
        // Keep custom legend generation logic for AR chart
        arOptions.plugins.legend.labels.generateLabels = (chart) => {
            const defaultLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
            const hasDivergence = chart.data.datasets.some(ds => ds.label === 'Divergence');
            return defaultLabels.filter(label => {
                 // Filter out the dummy 'Divergence' legend item if it wasn't added
                if (label.text === 'Divergence' && !hasDivergence) return false;
                // Standard styling adjustment (optional, can be removed if base is fine)
                if (label.text === 'A/R Growth (%)') {
                    label.fillStyle = chartMgr.palette[1];
                    label.strokeStyle = chartMgr.palette[1];
                } else if (label.text === 'Divergence') {
                    label.fillStyle = divergenceColor;
                    label.strokeStyle = divergenceColor;
                }
                return true;
            });
        };

        createLineChart({ canvasId: 'arChart', labels: displayLabels, datasets: arDatasets, options: arOptions });

        // 3. Cash Flow vs Net Income Chart
        const cfAnnotations = {};
         if (typeof ChartAnnotation !== 'undefined' && chartData.annotations?.cashFlowChart && Array.isArray(chartData.annotations.cashFlowChart)) {
            chartData.annotations.cashFlowChart.forEach((anno, index) => {
                 if (typeof anno.xVal === 'number' && anno.xVal >= 0 && anno.xVal < originalLabels.length && typeof anno.yVal === 'number' && anno.content) { // Check against original length
                    const adjustedXVal = isMobile && originalLabels.length > MAX_DATA_POINTS_MOBILE
                        ? Math.max(0, anno.xVal - (originalLabels.length - MAX_DATA_POINTS_MOBILE))
                        : anno.xVal;
                     if (adjustedXVal >= 0 && adjustedXVal < displayLabels.length) { // Check against displayed length
                        cfAnnotations[`cfLabel${index + 1}`] = createAnnotationLabel(adjustedXVal, anno.yVal, anno.content, anno.yAdj, anno.xAdj);
                    }
                }
            });
        }

        const cfDatasets = [
            {
                label: "Op Cash Flow Growth (%)",
                data: displayCfoGrowth,
                borderColor: chartMgr.palette[0],
                backgroundColor: "transparent",
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 0,
                order: 2
            },
            {
                label: "Net Income Growth (%)",
                data: displayNiGrowth,
                borderColor: chartMgr.palette[1],
                backgroundColor: "transparent",
                borderWidth: 2,
                pointRadius: (context) => cfDivergenceIndices.includes(context.dataIndex) ? tinyPointRadius : 0,
                pointHoverRadius: (context) => cfDivergenceIndices.includes(context.dataIndex) ? tinyPointHoverRadius : 0,
                pointBackgroundColor: pointStyleCallback(cfDivergenceIndices, chartMgr.palette[1], divergenceColor),
                pointBorderColor: pointStyleCallback(cfDivergenceIndices, chartMgr.palette[1], divergenceColor),
                order: 1
            },
        ];
        // Add divergence legend item only if there are divergences
        if (cfDivergenceIndices.length > 0) {
            cfDatasets.push(createDivergenceLegend());
        }

        const cfOptions = chartMgr.baseOptions();
        cfOptions.plugins.annotation.annotations = cfAnnotations;
        // Keep custom legend generation logic for CF chart
        cfOptions.plugins.legend.labels.generateLabels = (chart) => {
             const defaultLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
             const hasDivergence = chart.data.datasets.some(ds => ds.label === 'Divergence');
             return defaultLabels.filter(label => {
                 if (label.text === 'Divergence' && !hasDivergence) return false;
                 if (label.text === 'Net Income Growth (%)') {
                    label.fillStyle = chartMgr.palette[1];
                    label.strokeStyle = chartMgr.palette[1];
                } else if (label.text === 'Divergence') {
                    label.fillStyle = divergenceColor;
                    label.strokeStyle = divergenceColor;
                }
                 return true;
            });
        };

        createLineChart({ canvasId: 'cashFlowChart', labels: displayLabels, datasets: cfDatasets, options: cfOptions });

        // --- END REFACTORED CHART CREATION ---

        // Adjust font sizes based on screen width after charts are created
        adjustFontSizes();

        showMessage(null); // Clear loading message
      } catch (error) {
        console.error("Error loading or processing analysis data:", error)
        // Show generic error or redirect for non-404 fetch errors or JSON parsing errors
        // Redirecting to error page provides a consistent user experience for failures
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
    // Note: This resize handler only adjusts visual elements like fonts.
    // It does NOT dynamically change the number of data points shown after initial load.
    // A page refresh or new ticker load is required to apply the mobile data limit based on current width.
    let resizeTimeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        const isMobile = window.innerWidth <= MOBILE_BREAKPOINT; // Use the same breakpoint
        const chartsToResize = [charts.revenueChart, charts.arChart, charts.cashFlowChart]

        chartsToResize.forEach((chart, index) => {
          if (!chart || !chart.options) return // Skip if chart doesn't exist

          try {
            // Adjust font sizes based on screen width
            const tooltipBodyFontSize = isMobile ? 11 : 12;
            const axisTickFontSize = isMobile ? 10 : 12;
            const axisTitleFontSize = isMobile ? 11 : 12;
            const yAxisTickFontSize = isMobile ? 10 : 11;
            const legendLabelFontSize = 10; // Keep legend font size consistent
            const annotationLabelFontSize = isMobile ? 9 : 10;

            // Update common options
            if (chart.options.plugins?.tooltip?.bodyFont) chart.options.plugins.tooltip.bodyFont.size = tooltipBodyFontSize;
            if (chart.options.scales?.x?.ticks?.font) chart.options.scales.x.ticks.font.size = axisTickFontSize;
            if (chart.options.scales?.y?.title?.font) chart.options.scales.y.title.font.size = axisTitleFontSize;
            if (chart.options.scales?.y?.ticks?.font) chart.options.scales.y.ticks.font.size = yAxisTickFontSize;
            if (chart.options.plugins?.legend?.labels?.font) chart.options.plugins.legend.labels.font.size = legendLabelFontSize;
            // Adjust legend box size if needed
            if (chart.options.plugins?.legend?.labels) {
                 chart.options.plugins.legend.labels.boxWidth = 8;
                 chart.options.plugins.legend.labels.boxHeight = 8;
            }

            // Update annotation label font size if annotation plugin is loaded and options exist
            if (typeof ChartAnnotation !== 'undefined' && chart.options.plugins?.annotation?.annotations) {
                Object.values(chart.options.plugins.annotation.annotations).forEach(anno => {
                    if (anno.type === 'label' && anno.font) {
                        anno.font.size = annotationLabelFontSize;
                    }
                });
            }

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
