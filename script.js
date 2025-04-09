// --- START OF FILE script.js ---

// Note: Chart.js and ChartAnnotation are expected to be loaded globally via script tags in analysis.html
// If using modules, you'd import them: import { Chart } from 'chart.js'; import ChartAnnotation from 'chartjs-plugin-annotation';

const DEFAULT_TICKER = "AAPL"
const DATA_PATH = "DATA/"
const DIVERGENCE_THRESHOLD = 30.0
const MOBILE_BREAKPOINT = 768; // Pixels: Threshold for mobile view / data limiting
const MOBILE_DATA_POINTS = 5; // Number of data points to show on mobile

let currentTicker = null
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

const calculateDivergenceIndices = (data1, data2, threshold) => {
  // Ensure inputs are arrays and have the same length
  if (!Array.isArray(data1) || !Array.isArray(data2) || data1.length !== data2.length) {
    console.warn("Invalid data for divergence calculation. Input arrays must exist and have the same length.");
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
    } else {
        // Optional: Warn if data points are not valid numbers
        // console.warn(`Skipping divergence calculation at index ${i}: Invalid data point(s) encountered (${val1}, ${val2})`);
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


    // --- Chart Configuration ---
    const commonChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: {
            boxWidth: 8,
            boxHeight: 8,
            padding: 8,
            font: { size: 10 }, // Base size, adjusted in resize handler
            color: "#6c757d",
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              // Don't show tooltip for the dummy 'Divergence' dataset
              if (context.dataset.label === "Divergence") return null
              let label = context.dataset.label || ""
              if (label) label += ": "
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(1) + "%" // Assuming percentage data
              }
              return label
            },
          },
          bodyFont: { size: 12 }, // Base size, adjusted in resize handler
          backgroundColor: "rgba(0,0,0,0.8)",
          titleFont: { size: 13, weight: "bold" },
          padding: 10,
          cornerRadius: 4,
          displayColors: false, // Hide color box in tooltip
        },
        // Annotation plugin configuration (ensure structure exists)
        annotation: {
          annotations: {} // Annotations will be added dynamically
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 12 }, // Base size, adjusted in resize handler
            color: "#6c757d",
          },
        },
        y: {
          beginAtZero: false, // Allow negative growth rates
          title: {
            display: true,
            text: "Growth Rate (%)",
            font: { size: 12, weight: "500" }, // Base size, adjusted in resize handler
            color: "#495057",
          },
          ticks: {
            callback: (value) => value + "%", // Add '%' suffix
            font: { size: 11 }, // Base size, adjusted in resize handler
            color: "#6c757d",
          },
          grid: { drawBorder: false, color: "rgba(0, 0, 0, 0.05)" },
        },
      },
      interaction: { mode: "index", intersect: false }, // Show tooltip for all datasets on hover
      layout: { padding: { top: 20, right: 20, bottom: 10, left: 10 } }, // Add padding around chart
    }

    const divergenceColor = "#c5817e"; // var(--danger)
    const primaryColor = "#c5a47e";    // var(--primary)
    const secondaryColor = "#1c2541";  // var(--secondary)
    const mutedColor = "#6c757d";      // var(--muted)

    // Define radii for points
    const smallPointRadius = 2;
    const smallPointHoverRadius = 4;
    // --- MODIFIED: Slightly larger radius for divergence points ---
    const divergencePointRadius = 3; // Was tinyPointRadius = 2
    const divergencePointHoverRadius = 5; // Was tinyPointHoverRadius = 4
    // --- END MODIFICATION ---


    // --- Chart Helper Functions ---

    const createAnnotationLabel = (xVal, yVal, content, yAdj = -15, xAdj = 0) => ({
        type: 'label',
        xValue: xVal, // Using xValue which maps to the label (year)
        yValue: yVal,
        content: content,
        color: mutedColor,
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
        return indices.includes(context.dataIndex) ? highlightColor : normalColor;
    };


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
            window.location.href = `error-loading.html?ticker=${ticker}`
            return
          } else {
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
        const paragraphsContainer = select("#verdict-paragraphs")
        if (paragraphsContainer && Array.isArray(data.conclusion?.paragraphs)) {
            paragraphsContainer.innerHTML = data.conclusion.paragraphs.map(p => `<p>${p || ""}</p>`).join('');
        } else if (paragraphsContainer) {
            paragraphsContainer.innerHTML = "<p>Conclusion details not available.</p>";
        }
        populateElement('[data-dynamic="monitoring-title"]', data.conclusion?.monitoringPointsTitle || "Key Monitoring Points")
        populateList("monitoring-points-list", data.conclusion?.monitoringPoints || [], true) // Use innerHTML for monitoring points

        // --- Chart Data Preparation ---
        const chartData = data.chartData || {}
        const fullLabels = chartData.labels || []
        const fullRevenueGrowth = chartData.revenueGrowth || []
        const fullArGrowth = chartData.arGrowth || []
        const fullCfoGrowth = chartData.cfoGrowth || []
        const fullNiGrowth = chartData.niGrowth || []

        // --- MODIFIED: Determine if mobile view and slice data if necessary ---
        const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
        let displayLabels = fullLabels;
        let displayRevenueGrowth = fullRevenueGrowth;
        let displayArGrowth = fullArGrowth;
        let displayCfoGrowth = fullCfoGrowth;
        let displayNiGrowth = fullNiGrowth;
        let arDivergenceIndices = [];
        let cfDivergenceIndices = [];

        if (isMobile && fullLabels.length > MOBILE_DATA_POINTS) {
            console.log(`Mobile view detected. Slicing data to last ${MOBILE_DATA_POINTS} points.`);
            displayLabels = fullLabels.slice(-MOBILE_DATA_POINTS);
            displayRevenueGrowth = fullRevenueGrowth.slice(-MOBILE_DATA_POINTS);
            displayArGrowth = fullArGrowth.slice(-MOBILE_DATA_POINTS);
            displayCfoGrowth = fullCfoGrowth.slice(-MOBILE_DATA_POINTS);
            displayNiGrowth = fullNiGrowth.slice(-MOBILE_DATA_POINTS);

            // Recalculate divergence indices based *only* on the sliced data
            arDivergenceIndices = calculateDivergenceIndices(displayRevenueGrowth, displayArGrowth, DIVERGENCE_THRESHOLD);
            cfDivergenceIndices = calculateDivergenceIndices(displayCfoGrowth, displayNiGrowth, DIVERGENCE_THRESHOLD);
        } else {
            // Use full data and calculate divergence indices on full data
            arDivergenceIndices = calculateDivergenceIndices(fullRevenueGrowth, fullArGrowth, DIVERGENCE_THRESHOLD);
            cfDivergenceIndices = calculateDivergenceIndices(fullCfoGrowth, fullNiGrowth, DIVERGENCE_THRESHOLD);
        }
        // --- END MODIFICATION ---

        // --- Chart Rendering ---

        // Revenue Chart
        const revenueCtx = select("#revenueChart")?.getContext("2d")
        if (revenueCtx && displayRevenueGrowth.length > 0) { // Check if data exists after potential slice
          try {
            revenueChartInstance = new Chart(revenueCtx, {
              type: "line",
              data: {
                labels: displayLabels, // Use potentially sliced labels
                datasets: [
                  {
                    label: "Annual Revenue Growth (%)",
                    data: displayRevenueGrowth, // Use potentially sliced data
                    borderColor: primaryColor,
                    backgroundColor: "rgba(197, 164, 126, 0.1)",
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: primaryColor,
                    pointBorderColor: primaryColor,
                    pointRadius: smallPointRadius,
                    pointHoverRadius: smallPointHoverRadius,
                  },
                ],
              },
              options: JSON.parse(JSON.stringify(commonChartOptions)),
            })
          } catch (error) {
             console.error("Error creating Revenue Chart:", error);
             revenueCtx.font = "14px Arial";
             revenueCtx.fillStyle = "red";
             revenueCtx.textAlign = "center";
             revenueCtx.fillText("Error loading chart", revenueCtx.canvas.width / 2, revenueCtx.canvas.height / 2);
          }
        } else {
          console.warn("Revenue chart canvas or data (after potential slice) not found")
          if(revenueCtx) { // Clear canvas if context exists but no data
             revenueCtx.clearRect(0, 0, revenueCtx.canvas.width, revenueCtx.canvas.height);
             revenueCtx.font = "14px Arial";
             revenueCtx.fillStyle = mutedColor;
             revenueCtx.textAlign = "center";
             revenueCtx.fillText("No data available", revenueCtx.canvas.width / 2, revenueCtx.canvas.height / 2);
          }
        }

        // Accounts Receivable vs Revenue Chart
        const arCtx = select("#arChart")?.getContext("2d")
        // Check if *both* datasets have data after potential slice
        if (arCtx && displayRevenueGrowth.length > 0 && displayArGrowth.length > 0) {
          try {
            const arChartOptions = JSON.parse(JSON.stringify(commonChartOptions));

            // Add annotations - they use xValue (label), so should work with sliced data if label exists
            arChartOptions.plugins.annotation = { annotations: {} };
            if (typeof ChartAnnotation !== 'undefined' && chartData.annotations?.arChart && Array.isArray(chartData.annotations.arChart)) {
                chartData.annotations.arChart.forEach((anno, index) => {
                    // Check if the annotation's label exists in the *displayed* labels
                    if (displayLabels.includes(anno.xVal) && typeof anno.yVal === 'number' && anno.content) {
                        arChartOptions.plugins.annotation.annotations[`arLabel${index + 1}`] = createAnnotationLabel(anno.xVal, anno.yVal, anno.content, anno.yAdj, anno.xAdj);
                    } else {
                        // console.warn(`AR Annotation label "${anno.xVal}" not found in displayed labels or data invalid.`);
                    }
                });
            }

            arChartOptions.plugins.legend.labels.generateLabels = (chart) => {
                const defaultLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                defaultLabels.forEach(label => {
                    if (label.datasetIndex === 1) label.fillStyle = label.strokeStyle = secondaryColor;
                    else if (label.datasetIndex === 2) label.fillStyle = label.strokeStyle = divergenceColor;
                });
                // Use the *potentially recalculated* arDivergenceIndices
                if (arDivergenceIndices.length === 0) {
                    return defaultLabels.filter(label => label.datasetIndex !== 2);
                }
                return defaultLabels;
            };


            arChartInstance = new Chart(arCtx, {
              type: "line",
              data: {
                labels: displayLabels, // Use potentially sliced labels
                datasets: [
                  {
                    label: "Revenue Growth (%)",
                    data: displayRevenueGrowth, // Use potentially sliced data
                    borderColor: primaryColor,
                    backgroundColor: "transparent",
                    borderWidth: 2,
                    tension: 0.4,
                    pointBackgroundColor: primaryColor,
                    pointBorderColor: primaryColor,
                    pointRadius: 0, // No points on this line
                    pointHoverRadius: 0,
                  },
                  {
                    label: "A/R Growth (%)",
                    data: displayArGrowth, // Use potentially sliced data
                    borderColor: secondaryColor,
                    backgroundColor: "transparent",
                    borderWidth: 2,
                    tension: 0.4,
                    // --- MODIFIED: Use updated radii and potentially recalculated indices ---
                    pointRadius: (context) => arDivergenceIndices.includes(context.dataIndex) ? divergencePointRadius : 0,
                    pointHoverRadius: (context) => arDivergenceIndices.includes(context.dataIndex) ? divergencePointHoverRadius : 0,
                    pointBackgroundColor: pointStyleCallback(arDivergenceIndices, secondaryColor, divergenceColor),
                    pointBorderColor: pointStyleCallback(arDivergenceIndices, secondaryColor, divergenceColor),
                    // --- END MODIFICATION ---
                  },
                  createDivergenceLegend(),
                ],
              },
              options: arChartOptions,
            })
          } catch (error) {
            console.error("Error creating AR Chart:", error);
             arCtx.font = "14px Arial";
             arCtx.fillStyle = "red";
             arCtx.textAlign = "center";
             arCtx.fillText("Error loading chart", arCtx.canvas.width / 2, arCtx.canvas.height / 2);
          }
        } else {
          console.warn("AR chart canvas or data (after potential slice) not found for both datasets")
           if(arCtx) { // Clear canvas if context exists but no data
             arCtx.clearRect(0, 0, arCtx.canvas.width, arCtx.canvas.height);
             arCtx.font = "14px Arial";
             arCtx.fillStyle = mutedColor;
             arCtx.textAlign = "center";
             arCtx.fillText("No data available", arCtx.canvas.width / 2, arCtx.canvas.height / 2);
          }
        }

        // Cash Flow vs Net Income Chart
        const cashFlowCtx = select("#cashFlowChart")?.getContext("2d")
        // Check if *both* datasets have data after potential slice
        if (cashFlowCtx && displayCfoGrowth.length > 0 && displayNiGrowth.length > 0) {
          try {
            const cashFlowChartOptions = JSON.parse(JSON.stringify(commonChartOptions));

            // Add annotations - they use xValue (label), so should work with sliced data if label exists
            cashFlowChartOptions.plugins.annotation = { annotations: {} };
             if (typeof ChartAnnotation !== 'undefined' && chartData.annotations?.cashFlowChart && Array.isArray(chartData.annotations.cashFlowChart)) {
                chartData.annotations.cashFlowChart.forEach((anno, index) => {
                     // Check if the annotation's label exists in the *displayed* labels
                    if (displayLabels.includes(anno.xVal) && typeof anno.yVal === 'number' && anno.content) {
                        cashFlowChartOptions.plugins.annotation.annotations[`cfLabel${index + 1}`] = createAnnotationLabel(anno.xVal, anno.yVal, anno.content, anno.yAdj, anno.xAdj);
                    } else {
                        // console.warn(`CF Annotation label "${anno.xVal}" not found in displayed labels or data invalid.`);
                    }
                });
            }

            cashFlowChartOptions.plugins.legend.labels.generateLabels = (chart) => {
                const defaultLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                defaultLabels.forEach(label => {
                    if (label.datasetIndex === 1) label.fillStyle = label.strokeStyle = secondaryColor;
                    else if (label.datasetIndex === 2) label.fillStyle = label.strokeStyle = divergenceColor;
                });
                 // Use the *potentially recalculated* cfDivergenceIndices
                if (cfDivergenceIndices.length === 0) {
                    return defaultLabels.filter(label => label.datasetIndex !== 2);
                }
                return defaultLabels;
            };

            cashFlowChartInstance = new Chart(cashFlowCtx, {
              type: "line",
              data: {
                labels: displayLabels, // Use potentially sliced labels
                datasets: [
                  {
                    label: "Op Cash Flow Growth (%)",
                    data: displayCfoGrowth, // Use potentially sliced data
                    borderColor: primaryColor,
                    backgroundColor: "transparent",
                    borderWidth: 2,
                    tension: 0.4,
                    pointBackgroundColor: primaryColor,
                    pointBorderColor: primaryColor,
                    pointRadius: 0, // No points on this line
                    pointHoverRadius: 0,
                  },
                  {
                    label: "Net Income Growth (%)",
                    data: displayNiGrowth, // Use potentially sliced data
                    borderColor: secondaryColor,
                    backgroundColor: "transparent",
                    borderWidth: 2,
                    tension: 0.4,
                    // --- MODIFIED: Use updated radii and potentially recalculated indices ---
                    pointRadius: (context) => cfDivergenceIndices.includes(context.dataIndex) ? divergencePointRadius : 0,
                    pointHoverRadius: (context) => cfDivergenceIndices.includes(context.dataIndex) ? divergencePointHoverRadius : 0,
                    pointBackgroundColor: pointStyleCallback(cfDivergenceIndices, secondaryColor, divergenceColor),
                    pointBorderColor: pointStyleCallback(cfDivergenceIndices, secondaryColor, divergenceColor),
                    // --- END MODIFICATION ---
                  },
                  createDivergenceLegend(),
                ],
              },
              options: cashFlowChartOptions,
            })
          } catch (error) {
            console.error("Error creating Cash Flow Chart:", error);
             cashFlowCtx.font = "14px Arial";
             cashFlowCtx.fillStyle = "red";
             cashFlowCtx.textAlign = "center";
             cashFlowCtx.fillText("Error loading chart", cashFlowCtx.canvas.width / 2, cashFlowCtx.canvas.height / 2);
          }
        } else {
          console.warn("Cash Flow chart canvas or data (after potential slice) not found for both datasets")
           if(cashFlowCtx) { // Clear canvas if context exists but no data
             cashFlowCtx.clearRect(0, 0, cashFlowCtx.canvas.width, cashFlowCtx.canvas.height);
             cashFlowCtx.font = "14px Arial";
             cashFlowCtx.fillStyle = mutedColor;
             cashFlowCtx.textAlign = "center";
             cashFlowCtx.fillText("No data available", cashFlowCtx.canvas.width / 2, cashFlowCtx.canvas.height / 2);
          }
        }

        handleResize() // Initial resize call after charts are created

        showMessage(null) // Hide loading message, show content
        window.scrollTo({ top: 0, behavior: "smooth" }) // Scroll to top after load

      } catch (error) {
        console.error("Error loading or processing analysis data:", error)
        // Show generic error or redirect for non-404 fetch errors or JSON parsing errors
        window.location.href = `error-loading.html?ticker=${ticker}&error=${encodeURIComponent(error.message)}`
      } finally {
        if (searchButton) searchButton.disabled = false // Re-enable search button
      }
    }

    // --- Event Listeners for Analysis Page ---

    // Analysis Page: Header Search Form (Handles reload/update)
    const analysisHeaderSearchForm = select("#tickerSearchForm")
    const tickerInput = select("#tickerInput")
    if (analysisHeaderSearchForm && tickerInput) {
      analysisHeaderSearchForm.addEventListener("submit", (e) => {
        e.preventDefault()
        const newTicker = tickerInput.value.trim().toUpperCase()
        if (newTicker && newTicker !== currentTicker) {
          loadAnalysisData(newTicker)
          const newUrl = `${window.location.pathname}?ticker=${newTicker}`
          window.history.pushState({ path: newUrl }, "", newUrl)
        } else if (!newTicker) {
          console.warn("Ticker input is empty.")
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
      if (targetTicker !== currentTicker) {
        console.log(`Popstate event: Loading data for ${targetTicker}`);
        loadAnalysisData(targetTicker)
        if (tickerInput) tickerInput.value = targetTicker
      }
    })

    // --- Resize Handling ---
    // Note: This only adjusts visual elements like font sizes after initial load.
    // It does NOT reload data or switch between 5-year/full view on resize.
    let resizeTimeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        // Check mobile status based on the *current* window width
        const isMobileNow = window.innerWidth <= MOBILE_BREAKPOINT;
        const chartsToResize = [revenueChartInstance, arChartInstance, cashFlowChartInstance]

        chartsToResize.forEach((chart, index) => {
          if (!chart || !chart.options) return // Skip if chart doesn't exist

          try {
            // Adjust font sizes based on screen width
            const tooltipBodyFontSize = isMobileNow ? 11 : 12;
            const axisTickFontSize = isMobileNow ? 10 : 12;
            const axisTitleFontSize = isMobileNow ? 11 : 12;
            const yAxisTickFontSize = isMobileNow ? 10 : 11;
            const legendLabelFontSize = 10;
            const annotationLabelFontSize = isMobileNow ? 9 : 10;

            // Update common options
            if (chart.options.plugins?.tooltip?.bodyFont) chart.options.plugins.tooltip.bodyFont.size = tooltipBodyFontSize;
            if (chart.options.scales?.x?.ticks?.font) chart.options.scales.x.ticks.font.size = axisTickFontSize;
            if (chart.options.scales?.y?.title?.font) chart.options.scales.y.title.font.size = axisTitleFontSize;
            if (chart.options.scales?.y?.ticks?.font) chart.options.scales.y.ticks.font.size = yAxisTickFontSize;
            if (chart.options.plugins?.legend?.labels?.font) chart.options.plugins.legend.labels.font.size = legendLabelFontSize;
            if (chart.options.plugins?.legend?.labels) {
                 chart.options.plugins.legend.labels.boxWidth = 8;
                 chart.options.plugins.legend.labels.boxHeight = 8;
            }

            // Update annotation label font size
            if (typeof ChartAnnotation !== 'undefined' && chart.options.plugins?.annotation?.annotations) {
                Object.values(chart.options.plugins.annotation.annotations).forEach(anno => {
                    if (anno.type === 'label' && anno.font) {
                        anno.font.size = annotationLabelFontSize;
                    }
                });
            }

            // Resize and update the chart visuals
            chart.resize();
            chart.update('none');
          } catch (error) {
            console.error(`Error resizing chart ${index}:`, error);
          }
        })
      }, 250) // Debounce resize event
    }
    window.addEventListener("resize", handleResize)

    // --- Initial Load ---
    const urlParams = new URLSearchParams(window.location.search)
    const tickerParam = urlParams.get("ticker")
    const initialTicker = tickerParam ? tickerParam.toUpperCase() : DEFAULT_TICKER
    if (tickerInput) {
      tickerInput.value = initialTicker
    }
    loadAnalysisData(initialTicker) // Load data, potentially slicing based on initial screen width
  }) // End DOMContentLoaded for analysis page
} // End if(isAnalysisPage)