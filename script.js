const DEFAULT_TICKER = "AAPL"
const DATA_PATH = "DATA/"
const DIVERGENCE_THRESHOLD = 30.0
const MOBILE_BREAKPOINT = 768;
const MAX_DATA_POINTS_MOBILE = 10;

let currentTicker = null
let revenueChartInstance = null
let arChartInstance = null
let cashFlowChartInstance = null

const isAnalysisPage = window.location.pathname.includes("analysis.html")
const isSearchPage = window.location.pathname.includes("search.html")
const isLandingPage = !isAnalysisPage && !isSearchPage

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
  container.innerHTML = ""
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
  tbody.innerHTML = ""
  if (tableRowData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" style="text-align: center; color: var(--muted);">No table data available.</td></tr>'
    return
  }
  tableRowData.forEach((row) => {
    const tr = document.createElement("tr")
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
  ul.innerHTML = ""
  if (listItems.length === 0) {
    ul.innerHTML = '<li style="color: var(--muted);">No list items available.</li>'
    return
  }
  listItems.forEach((item) => {
    const li = document.createElement("li")
    if (useInnerHTML) {
      li.innerHTML = item || ""
    } else {
      li.textContent = item || ""
    }
    ul.appendChild(li)
  })
}

const showMessage = (message, type = "loading") => {
  const messageArea = select("#loading-error-message")
  const mainContent = select("#main-content")

  if (!isAnalysisPage || !messageArea) return

  const messageP = messageArea.querySelector("p")
  if (!messageP) return

  if (message) {
    messageP.innerHTML = message
    messageArea.className = `message-area ${type}`
    messageArea.style.display = "flex"
    if (mainContent) mainContent.style.display = "none"
  } else {
    messageArea.style.display = "none"
    if (mainContent) mainContent.style.display = "block"
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
  if (!Array.isArray(data1) || !Array.isArray(data2) || data1.length !== data2.length) {
    console.warn("Invalid data for divergence calculation.");
    return []
  }
  const indices = []
  for (let i = 0; i < data1.length; i++) {
    const val1 = data1[i]
    const val2 = data2[i]
    if (typeof val1 === "number" && typeof val2 === "number" && !isNaN(val1) && !isNaN(val2)) {
      if (Math.abs(val1 - val2) > threshold) {
        indices.push(i)
      }
    }
  }
  return indices
}

const mobileMenuButton = select(".mobile-menu")
const navLinks = select(".nav-links")
const mobileMenuIcon = select(".mobile-menu i")

if (mobileMenuButton && navLinks && mobileMenuIcon) {
  on("click", ".mobile-menu", (e) => {
    navLinks.classList.toggle("show")
    mobileMenuIcon.classList.toggle("fa-bars")
    mobileMenuIcon.classList.toggle("fa-times")
    mobileMenuButton.setAttribute("aria-expanded", navLinks.classList.contains("show"))
    const headerHeight = select("#header")?.offsetHeight || 61
    navLinks.style.top = `${headerHeight}px`
  })

  on(
    "click",
    ".nav-links a",
    function (e) {
      const href = this.getAttribute("href")
      const isInternalLink = href && href.startsWith("#")

      if (navLinks.classList.contains("show")) {
        if (!isInternalLink || href === "#") {
          e.preventDefault()
        }
        navLinks.classList.remove("show")
        mobileMenuIcon.classList.remove("fa-times")
        mobileMenuIcon.classList.add("fa-bars")
        mobileMenuButton.setAttribute("aria-expanded", "false")
      }
    },
    true,
  )
} else {
    if (!mobileMenuButton) console.error("Mobile menu button not found.");
    if (!navLinks) console.error("Nav links container not found.");
    if (!mobileMenuIcon) console.error("Mobile menu icon not found.");
}

const headerSearchForm = select("#headerTickerSearchForm")
if (headerSearchForm && (isLandingPage || isSearchPage || !isAnalysisPage)) {
  headerSearchForm.addEventListener("submit", (e) => {
    console.log("Header form submitted on non-analysis page");
  })
}

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

function updateStatementsLink() {
    const link = select('#viewStatementsLink');
    if (link && currentTicker) {
        link.href = `statements.html?ticker=${currentTicker}`;
        link.style.display = 'inline-flex';
    } else if (link) {
        link.style.display = 'none';
    }
}

if (isAnalysisPage) {
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof Chart === "undefined") {
      console.error("Chart.js library is not loaded.")
      showMessage('<i class="fas fa-exclamation-triangle"></i> Chart library failed to load. Please refresh.', "error")
      return
    }
    let ChartAnnotation = window.ChartAnnotation;
    if (typeof ChartAnnotation === "undefined") {
      console.warn("Chartjs-plugin-annotation not loaded. Annotations will not be displayed.")
    } else {
        try {
            if (typeof Chart.register === 'function') {
                 Chart.register(ChartAnnotation);
                 console.log("ChartAnnotation plugin registered.");
            } else {
                console.warn("Chart.register is not a function. Plugin registration might differ for older Chart.js versions.");
            }
        } catch (error) {
            console.error("Error registering ChartAnnotation plugin:", error);
        }
    }

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
            font: { size: 10 },
            color: "#6c757d",
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              if (context.dataset.label === "Divergence") return null
              let label = context.dataset.label || ""
              if (label) label += ": "
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(1) + "%"
              }
              return label
            },
          },
          bodyFont: { size: 12 },
          backgroundColor: "rgba(0,0,0,0.8)",
          titleFont: { size: 13, weight: "bold" },
          padding: 10,
          cornerRadius: 4,
          displayColors: false,
        },
        annotation: {
          annotations: {}
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 12 },
            color: "#6c757d",
          },
        },
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: "Growth Rate (%)",
            font: { size: 12, weight: "500" },
            color: "#495057",
          },
          ticks: {
            callback: (value) => value + "%",
            font: { size: 11 },
            color: "#6c757d",
          },
          grid: { drawBorder: false, color: "rgba(0, 0, 0, 0.05)" },
        },
      },
      interaction: { mode: "index", intersect: false },
      layout: { padding: { top: 20, right: 20, bottom: 10, left: 10 } },
    }

    const divergenceColor = "#c5817e";
    const primaryColor = "#c5a47e";
    const secondaryColor = "#1c2541";
    const mutedColor = "#6c757d";

    const smallPointRadius = 2;
    const smallPointHoverRadius = 4;
    const tinyPointRadius = 3;
    const tinyPointHoverRadius = 5;

    const createAnnotationLabel = (xVal, yVal, content, yAdj = -15, xAdj = 0) => ({
        type: 'label',
        xValue: xVal,
        yValue: yVal,
        content: content,
        color: mutedColor,
        font: { size: 10, weight: '600' },
        position: 'start',
        yAdjust: yAdj,
        xAdjust: xAdj,
        backgroundColor: 'rgba(255,255,255,0.85)',
        padding: { top: 3, bottom: 3, left: 5, right: 5 },
        borderRadius: 4,
        callout: {
            display: true,
            position: 'bottom',
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.1)',
            margin: 5
        }
    });

    const createDivergenceLegend = () => ({
        label: 'Divergence',
        pointStyle: 'rectRot',
        pointRadius: 5,
        borderColor: divergenceColor,
        backgroundColor: divergenceColor,
        borderWidth: 1,
        data: [],
    });

    const pointStyleCallback = (indices = [], normalColor, highlightColor) => (context) => {
        return indices.includes(context.dataIndex) ? highlightColor : normalColor;
    };

    const loadAnalysisData = async (ticker) => {
      ticker = ticker.trim().toUpperCase()
      if (!ticker) {
        showMessage('<i class="fas fa-exclamation-circle"></i> Please enter a ticker symbol.', "error")
        return
      }

      showMessage(`<i class="fas fa-spinner fa-spin"></i> Loading analysis for ${ticker}...`, "loading")
      destroyCharts()
      const initialLink = select('#viewStatementsLink');
      if (initialLink) initialLink.style.display = 'none';

      const searchButton = select("#tickerSearchForm button")
      if (searchButton) searchButton.disabled = true

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

        if (!data || typeof data !== "object") {
          throw new Error(`Invalid data format received for ticker "${ticker}". Expected JSON object.`)
        }
        if (!data.company || !data.chartData) {
             console.warn(`Incomplete data structure for ${ticker}. Missing 'company' or 'chartData'.`);
        }

        currentTicker = ticker
        updateStatementsLink();

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
        populateList("monitoring-points-list", data.conclusion?.monitoringPoints || [], true)

        const chartData = data.chartData || {}
        let originalLabels = chartData.labels || []
        let originalRevenueGrowth = chartData.revenueGrowth || []
        let originalArGrowth = chartData.arGrowth || []
        let originalCfoGrowth = chartData.cfoGrowth || []
        let originalNiGrowth = chartData.niGrowth || []

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

        const arDivergenceIndices = calculateDivergenceIndices(displayRevenueGrowth, displayArGrowth, DIVERGENCE_THRESHOLD);
        const cfDivergenceIndices = calculateDivergenceIndices(displayCfoGrowth, displayNiGrowth, DIVERGENCE_THRESHOLD);

        const revenueCtx = select("#revenueChart")?.getContext("2d")
        if (revenueCtx && displayRevenueGrowth.length > 0) {
          try {
            revenueChartInstance = new Chart(revenueCtx, {
              type: "line",
              data: {
                labels: displayLabels,
                datasets: [
                  {
                    label: "Annual Revenue Growth (%)",
                    data: displayRevenueGrowth,
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
          console.warn("Revenue chart canvas or data not found (or sliced to empty on mobile)")
        }

        const arCtx = select("#arChart")?.getContext("2d")
        if (arCtx && displayRevenueGrowth.length > 0 && displayArGrowth.length > 0) {
          try {
            const arChartOptions = JSON.parse(JSON.stringify(commonChartOptions));

            arChartOptions.plugins.annotation = { annotations: {} };
            if (typeof ChartAnnotation !== 'undefined' && chartData.annotations?.arChart && Array.isArray(chartData.annotations.arChart)) {
                chartData.annotations.arChart.forEach((anno, index) => {
                    if (typeof anno.xVal === 'number' && anno.xVal >= 0 && anno.xVal < displayLabels.length && typeof anno.yVal === 'number' && anno.content) {
                        const adjustedXVal = isMobile && originalLabels.length > MAX_DATA_POINTS_MOBILE
                            ? Math.max(0, anno.xVal - (originalLabels.length - MAX_DATA_POINTS_MOBILE))
                            : anno.xVal;

                        if (adjustedXVal >= 0 && adjustedXVal < displayLabels.length) {
                           arChartOptions.plugins.annotation.annotations[`arLabel${index + 1}`] = createAnnotationLabel(adjustedXVal, anno.yVal, anno.content, anno.yAdj, anno.xAdj);
                        } else {
                            console.warn(`AR Annotation ${index+1} skipped: Original index ${anno.xVal} is outside the range of displayed mobile data.`);
                        }
                    } else {
                        console.warn(`Invalid or out-of-bounds annotation data at index ${index} for AR chart.`);
                    }
                });
            }

            arChartOptions.plugins.legend.labels.generateLabels = (chart) => {
                const defaultLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                defaultLabels.forEach(label => {
                    if (label.datasetIndex === 1) {
                        label.fillStyle = secondaryColor;
                        label.strokeStyle = secondaryColor;
                    } else if (label.datasetIndex === 2) {
                         label.fillStyle = divergenceColor;
                         label.strokeStyle = divergenceColor;
                    }
                });
                if (arDivergenceIndices.length === 0) {
                    return defaultLabels.filter(label => label.datasetIndex !== 2);
                }
                return defaultLabels;
            };

            arChartInstance = new Chart(arCtx, {
              type: "line",
              data: {
                labels: displayLabels,
                datasets: [
                  {
                    label: "Revenue Growth (%)",
                    data: displayRevenueGrowth,
                    borderColor: primaryColor,
                    backgroundColor: "transparent",
                    borderWidth: 2,
                    tension: 0.4,
                    pointBackgroundColor: primaryColor,
                    pointBorderColor: primaryColor,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                  },
                  {
                    label: "A/R Growth (%)",
                    data: displayArGrowth,
                    borderColor: secondaryColor,
                    backgroundColor: "transparent",
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: (context) => arDivergenceIndices.includes(context.dataIndex) ? tinyPointRadius : 0,
                    pointHoverRadius: (context) => arDivergenceIndices.includes(context.dataIndex) ? tinyPointHoverRadius : 0,
                    pointBackgroundColor: pointStyleCallback(arDivergenceIndices, secondaryColor, divergenceColor),
                    pointBorderColor: pointStyleCallback(arDivergenceIndices, secondaryColor, divergenceColor),
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
          console.warn("AR chart canvas or data not found (or sliced to empty on mobile)")
        }

        const cashFlowCtx = select("#cashFlowChart")?.getContext("2d")
        if (cashFlowCtx && displayCfoGrowth.length > 0 && displayNiGrowth.length > 0) {
          try {
            const cashFlowChartOptions = JSON.parse(JSON.stringify(commonChartOptions));

            cashFlowChartOptions.plugins.annotation = { annotations: {} };
             if (typeof ChartAnnotation !== 'undefined' && chartData.annotations?.cashFlowChart && Array.isArray(chartData.annotations.cashFlowChart)) {
                chartData.annotations.cashFlowChart.forEach((anno, index) => {
                    if (typeof anno.xVal === 'number' && anno.xVal >= 0 && anno.xVal < displayLabels.length && typeof anno.yVal === 'number' && anno.content) {
                        const adjustedXVal = isMobile && originalLabels.length > MAX_DATA_POINTS_MOBILE
                            ? Math.max(0, anno.xVal - (originalLabels.length - MAX_DATA_POINTS_MOBILE))
                            : anno.xVal;

                        if (adjustedXVal >= 0 && adjustedXVal < displayLabels.length) {
                            cashFlowChartOptions.plugins.annotation.annotations[`cfLabel${index + 1}`] = createAnnotationLabel(adjustedXVal, anno.yVal, anno.content, anno.yAdj, anno.xAdj);
                        } else {
                             console.warn(`Cash Flow Annotation ${index+1} skipped: Original index ${anno.xVal} is outside the range of displayed mobile data.`);
                        }
                    } else {
                        console.warn(`Invalid or out-of-bounds annotation data at index ${index} for Cash Flow chart.`);
                    }
                });
            }

            cashFlowChartOptions.plugins.legend.labels.generateLabels = (chart) => {
                const defaultLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                defaultLabels.forEach(label => {
                    if (label.datasetIndex === 1) {
                        label.fillStyle = secondaryColor;
                        label.strokeStyle = secondaryColor;
                    } else if (label.datasetIndex === 2) {
                         label.fillStyle = divergenceColor;
                         label.strokeStyle = divergenceColor;
                    }
                });
                if (cfDivergenceIndices.length === 0) {
                    return defaultLabels.filter(label => label.datasetIndex !== 2);
                }
                return defaultLabels;
            };

            cashFlowChartInstance = new Chart(cashFlowCtx, {
              type: "line",
              data: {
                labels: displayLabels,
                datasets: [
                  {
                    label: "Op Cash Flow Growth (%)",
                    data: displayCfoGrowth,
                    borderColor: primaryColor,
                    backgroundColor: "transparent",
                    borderWidth: 2,
                    tension: 0.4,
                    pointBackgroundColor: primaryColor,
                    pointBorderColor: primaryColor,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                  },
                  {
                    label: "Net Income Growth (%)",
                    data: displayNiGrowth,
                    borderColor: secondaryColor,
                    backgroundColor: "transparent",
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: (context) => cfDivergenceIndices.includes(context.dataIndex) ? tinyPointRadius : 0,
                    pointHoverRadius: (context) => cfDivergenceIndices.includes(context.dataIndex) ? tinyPointHoverRadius : 0,
                    pointBackgroundColor: pointStyleCallback(cfDivergenceIndices, secondaryColor, divergenceColor),
                    pointBorderColor: pointStyleCallback(cfDivergenceIndices, secondaryColor, divergenceColor),
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
          console.warn("Cash Flow chart canvas or data not found (or sliced to empty on mobile)")
        }

        handleResize()

        showMessage(null)
        window.scrollTo({ top: 0, behavior: "smooth" })

      } catch (error) {
        console.error("Error loading or processing analysis data:", error)
         if (error.message.includes("HTTP error! status: 404")) {
             window.location.href = `error-loading.html?ticker=${ticker}&error=not_found`;
        } else if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
             showMessage(`<i class="fas fa-exclamation-triangle"></i> Network error. Could not reach server for ${ticker}. Please check connection.`, "error");
        } else if (error instanceof SyntaxError) {
             showMessage(`<i class="fas fa-exclamation-triangle"></i> Error parsing data for ${ticker}. The data format might be invalid.`, "error");
        }
         else {
             showMessage(`<i class="fas fa-exclamation-triangle"></i> An unexpected error occurred while loading data for ${ticker}. Details: ${error.message}`, "error");
        }
      } finally {
        if (searchButton) searchButton.disabled = false
      }
    }

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

    let resizeTimeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
        const chartsToResize = [revenueChartInstance, arChartInstance, cashFlowChartInstance]

        chartsToResize.forEach((chart, index) => {
          if (!chart || !chart.options) return

          try {
            const tooltipBodyFontSize = isMobile ? 11 : 12;
            const axisTickFontSize = isMobile ? 10 : 12;
            const axisTitleFontSize = isMobile ? 11 : 12;
            const yAxisTickFontSize = isMobile ? 10 : 11;
            const legendLabelFontSize = 10;
            const annotationLabelFontSize = isMobile ? 9 : 10;

            if (chart.options.plugins?.tooltip?.bodyFont) chart.options.plugins.tooltip.bodyFont.size = tooltipBodyFontSize;
            if (chart.options.scales?.x?.ticks?.font) chart.options.scales.x.ticks.font.size = axisTickFontSize;
            if (chart.options.scales?.y?.title?.font) chart.options.scales.y.title.font.size = axisTitleFontSize;
            if (chart.options.scales?.y?.ticks?.font) chart.options.scales.y.ticks.font.size = yAxisTickFontSize;
            if (chart.options.plugins?.legend?.labels?.font) chart.options.plugins.legend.labels.font.size = legendLabelFontSize;
            if (chart.options.plugins?.legend?.labels) {
                 chart.options.plugins.legend.labels.boxWidth = 8;
                 chart.options.plugins.legend.labels.boxHeight = 8;
            }

            if (typeof ChartAnnotation !== 'undefined' && chart.options.plugins?.annotation?.annotations) {
                Object.values(chart.options.plugins.annotation.annotations).forEach(anno => {
                    if (anno.type === 'label' && anno.font) {
                        anno.font.size = annotationLabelFontSize;
                    }
                });
            }

            chart.resize();
            chart.update('none');
          } catch (error) {
            console.error(`Error resizing chart ${index}:`, error);
          }
        })
      }, 250)
    }
    window.addEventListener("resize", handleResize)

    const urlParams = new URLSearchParams(window.location.search)
    const tickerParam = urlParams.get("ticker")

    const initialTicker = tickerParam ? tickerParam.toUpperCase() : DEFAULT_TICKER
    if (tickerInput) {
      tickerInput.value = initialTicker
    }
    loadAnalysisData(initialTicker)
  })
}