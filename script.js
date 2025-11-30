const DEFAULT_TICKER = "AAPL"
const DATA_PATH = "data/"
const DIVERGENCE_THRESHOLD = 30.0
const DEFAULT_YEARS_TO_SHOW = 10;
const MOBILE_DEFAULT_YEARS = 5;
const ICON_GAP = '6px';
const IS_TOUCH_DEVICE = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
const IS_MOBILE = window.innerWidth <= 768;

const MOBILE_YEAR_RANGES = [5, 10, 'full'];
let mobileYearRangeIndex = 0;

let currentTicker = null
let currentData = null
let showFullHistory = false
let revenueChartInstance = null
let arChartInstance = null
let cashFlowChartInstance = null

const isAnalysisPage = window.location.pathname.includes("analysis.html")
const isSearchPage = window.location.pathname.includes("search.html")
const isLandingPage = !isAnalysisPage && !isSearchPage

// --- Helper Functions ---

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

// --- Form Handling Logic (Page Specific) ---

const ctaSearchForm = select(".cta-section .search-form")
if (ctaSearchForm && isLandingPage) {
  ctaSearchForm.addEventListener("submit", (e) => {
    console.log("CTA form submitted");
  })
}

const headerSearchForm = select("#headerTickerSearchForm")
if (headerSearchForm && (isLandingPage || isSearchPage || !isAnalysisPage)) {
  headerSearchForm.addEventListener("submit", (e) => {
    console.log("Header form submitted on non-analysis page");
  })
}

const mainSearchFormOnSearchPage = select(".search-hero .search-form")
if (mainSearchFormOnSearchPage && isSearchPage) {
  mainSearchFormOnSearchPage.addEventListener("submit", (e) => {
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
  
  let ticking = false
  
  const showStickyNav = () => {
    stickySectionNav.classList.add('visible')
  }
  
  const hideStickyNav = () => {
    stickySectionNav.classList.remove('visible')
  }
  
  const updateStickyNav = () => {
    const scrollY = window.scrollY
    const windowHeight = window.innerHeight
    
    const exploreBtn = document.getElementById('exploreAnalysisBtn')
    
    if (exploreBtn) {
      const btnBottomFromTop = exploreBtn.offsetTop + exploreBtn.offsetHeight
      
      if (scrollY > btnBottomFromTop) {
        showStickyNav()
      } else {
        hideStickyNav()
      }
    }
    
    let currentSection = null
    const scrollPosition = scrollY + windowHeight / 3
    
    sectionElements.forEach(section => {
      if (section) {
        const sectionTop = section.offsetTop
        const sectionBottom = sectionTop + section.offsetHeight
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
          currentSection = section.id
        }
      }
    })
    
    navLinks.forEach(link => {
      const sectionId = link.getAttribute('data-section')
      if (sectionId === currentSection) {
        link.classList.add('active')
      } else {
        link.classList.remove('active')
      }
    })
    
    ticking = false
  }
  
  const onScrollHandler = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateStickyNav)
      ticking = true
    }
  }
  
  window.addEventListener('scroll', onScrollHandler, { passive: true })
  
  window.addEventListener('load', () => {
    hideStickyNav()
    setTimeout(updateStickyNav, 100)
  })
  
  const backToTopBtn = select('.back-to-top')
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      hideStickyNav()
    })
  }
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const sectionId = link.getAttribute('data-section')
      const targetSection = document.getElementById(sectionId)
      
      if (targetSection) {
        const stickyNavHeight = stickySectionNav.offsetHeight || 60
        const targetPosition = targetSection.offsetTop - stickyNavHeight - 10
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        })
        
        navLinks.forEach(l => l.classList.remove('active'))
        link.classList.add('active')
      }
    })
  })
}

// --- Analysis Page Specific Logic ---
if (isAnalysisPage) {
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof Chart === "undefined") {
      console.error("Chart.js library is not loaded.")
      showMessage('<i class="fas fa-exclamation-triangle"></i> Chart library failed to load. Please refresh.', "error")
      return
    }
    
    console.log(`Chart.js version: ${Chart.version || 'unknown'}`)
    let isAnnotationPluginAvailable = false;
    
    if (Chart.registry && Chart.registry.plugins && Chart.registry.plugins.get('annotation')) {
      isAnnotationPluginAvailable = true;
      console.log("ChartAnnotation plugin detected via Chart.registry");
    }
    else if (window.chartjs && window.chartjs.plugins && window.chartjs.plugins.annotation) {
      isAnnotationPluginAvailable = true;
      console.log("ChartAnnotation plugin detected via window.chartjs");
    }
    else if (window.ChartAnnotation) {
      isAnnotationPluginAvailable = true;
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

    const createGradient = (ctx, colorStart, colorEnd) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, colorStart);
        gradient.addColorStop(1, colorEnd);
        return gradient;
    };

    const createConditionalGradient = (ctx, chart, datasetIndex, positiveColor, negativeColor) => {
        const dataset = chart.data.datasets[datasetIndex];
        const yScale = chart.scales.y;
        const chartArea = chart.chartArea;
        
        if (!chartArea || !yScale) {
            return positiveColor;
        }

        const hasNegative = dataset.data.some(val => val < 0);
        const hasPositive = dataset.data.some(val => val >= 0);
        
        if (!hasNegative) {
            return positiveColor;
        }
        
        if (!hasPositive) {
            return negativeColor;
        }

        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        
        const zeroPixel = yScale.getPixelForValue(0);
        const topPixel = chartArea.top;
        const bottomPixel = chartArea.bottom;
        const chartHeight = bottomPixel - topPixel;
        
        let zeroPosition = (zeroPixel - topPixel) / chartHeight;
        zeroPosition = Math.max(0, Math.min(1, zeroPosition));
        
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

    const createChartOptions = () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { 
        duration: IS_MOBILE ? 600 : 1000,
        easing: 'easeOutQuart' 
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
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
        axis: 'x'
      },
      layout: { padding: { top: 20, right: 20, bottom: 10, left: 10 } },
    });

    const divergenceColor = "#c5817e";
    const primaryColor = "#c5a47e";
    const secondaryColor = "#1c2541";
    const mutedColor = "#6c757d";

    const smallPointRadius = 3;
    const smallPointHoverRadius = 6;
    const tinyPointRadius = 4;
    const tinyPointHoverRadius = 7;


    // --- Chart Helper Functions ---

    const createAnnotationLabel = (xVal, yVal, content, yAdj = -15, xAdj = 0) => ({
        type: 'label',
        xValue: xVal,
        yValue: yVal,
        content: content,
        color: mutedColor,
        font: { size: 11, weight: '500', family: "'Inter', sans-serif" },
        position: 'start',
        yAdjust: yAdj,
        xAdjust: xAdj,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: { top: 6, bottom: 6, left: 10, right: 10 },
        borderRadius: 6,
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


    // --- Core Data Loading and Rendering ---

    const getSliceStart = () => {
      const totalLength = currentData.chartData?.labels?.length || 0;
      
      if (IS_MOBILE) {
        const currentRange = MOBILE_YEAR_RANGES[mobileYearRangeIndex];
        if (currentRange === 'full') {
          return 0;
        }
        if (totalLength > currentRange) {
          return totalLength - currentRange;
        }
        return 0;
      } else {
        if (!showFullHistory && totalLength > DEFAULT_YEARS_TO_SHOW) {
          return totalLength - DEFAULT_YEARS_TO_SHOW;
        }
        return 0;
      }
    }
    
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

      destroyCharts();

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
                  backgroundColor: 'rgba(197, 164, 126, 0.18)',
                  borderWidth: 2.5,
                  tension: 0.4,
                  fill: true,
                  pointBackgroundColor: primaryColor,
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
                  'rgba(197, 164, 126, 0.18)',
                  'rgba(197, 129, 126, 0.28)'
                );
              }
            }]
          })
        } catch (error) {
            console.error("Error creating Revenue Chart:", error);
        }
      }

      const arSliceStart = getSliceStart();
      const arLabels = originalLabels.slice(arSliceStart);
      const arRevenueGrowthData = originalRevenueGrowth.slice(arSliceStart);
      const arGrowthData = originalArGrowth.slice(arSliceStart);
      
      const arDivergenceIndices = calculateDivergenceIndices(arRevenueGrowthData, arGrowthData, DIVERGENCE_THRESHOLD);

      const arCtx = select("#arChart")?.getContext("2d")
      if (arCtx && arRevenueGrowthData.length > 0 && arGrowthData.length > 0) {
        try {
          const arChartOptions = createChartOptions();
          
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
                  backgroundColor: 'rgba(197, 164, 126, 0.15)',
                  borderWidth: 2,
                  tension: 0.4,
                  fill: true,
                  pointBackgroundColor: (context) => arDivergenceIndices.includes(context.dataIndex) ? "#ffffff" : primaryColor,
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
                  backgroundColor: 'rgba(28, 37, 65, 0.15)',
                  borderWidth: 2,
                  tension: 0.4,
                  fill: true,
                  pointRadius: (context) => arDivergenceIndices.includes(context.dataIndex) ? tinyPointRadius : smallPointRadius,
                  pointHoverRadius: (context) => arDivergenceIndices.includes(context.dataIndex) ? tinyPointHoverRadius : smallPointHoverRadius,
                  pointBackgroundColor: (context) => arDivergenceIndices.includes(context.dataIndex) ? divergenceColor : secondaryColor,
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
                chart.data.datasets[0].backgroundColor = createConditionalGradient(
                  ctx, chart, 0,
                  'rgba(197, 164, 126, 0.15)',
                  'rgba(197, 129, 126, 0.25)'
                );
                chart.data.datasets[1].backgroundColor = createConditionalGradient(
                  ctx, chart, 1,
                  'rgba(28, 37, 65, 0.15)',
                  'rgba(197, 129, 126, 0.25)'
                );
              }
            }]
          })
        } catch (error) {
          console.error("Error creating AR Chart:", error);
        }
      }

      const cfSliceStart = getSliceStart();
      const cfLabels = originalLabels.slice(cfSliceStart);
      const cfCfoGrowthData = originalCfoGrowth.slice(cfSliceStart);
      const cfNiGrowthData = originalNiGrowth.slice(cfSliceStart);
      
      const cfDivergenceIndices = calculateDivergenceIndices(cfCfoGrowthData, cfNiGrowthData, DIVERGENCE_THRESHOLD);

      const cashFlowCtx = select("#cashFlowChart")?.getContext("2d")
      if (cashFlowCtx && cfCfoGrowthData.length > 0 && cfNiGrowthData.length > 0) {
        try {
          const cashFlowChartOptions = createChartOptions();
          
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
                  backgroundColor: 'rgba(197, 164, 126, 0.15)',
                  borderWidth: 2,
                  tension: 0.4,
                  fill: true,
                  pointBackgroundColor: (context) => cfDivergenceIndices.includes(context.dataIndex) ? "#ffffff" : primaryColor,
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
                  backgroundColor: 'rgba(28, 37, 65, 0.15)',
                  borderWidth: 2,
                  tension: 0.4,
                  fill: true,
                  pointRadius: (context) => cfDivergenceIndices.includes(context.dataIndex) ? tinyPointRadius : smallPointRadius,
                  pointHoverRadius: (context) => cfDivergenceIndices.includes(context.dataIndex) ? tinyPointHoverRadius : smallPointHoverRadius,
                  pointBackgroundColor: (context) => cfDivergenceIndices.includes(context.dataIndex) ? divergenceColor : secondaryColor,
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
                chart.data.datasets[0].backgroundColor = createConditionalGradient(
                  ctx, chart, 0,
                  'rgba(197, 164, 126, 0.15)',
                  'rgba(197, 129, 126, 0.25)'
                );
                chart.data.datasets[1].backgroundColor = createConditionalGradient(
                  ctx, chart, 1,
                  'rgba(28, 37, 65, 0.15)',
                  'rgba(197, 129, 126, 0.25)'
                );
              }
            }]
          })
        } catch (error) {
          console.error("Error creating Cash Flow Chart:", error);
        }
      }
      
      handleResize();
    };

    const loadAnalysisData = async (ticker) => {
      ticker = ticker.trim().toUpperCase()
      if (!ticker) {
        showMessage('<i class="fas fa-exclamation-circle"></i> Please enter a ticker symbol.', "error")
        return
      }

      showMessage(`<i class="fas fa-spinner fa-spin"></i> Loading analysis for ${ticker}...`, "loading")
      
      showSkeletons(true);
      
      showFullHistory = false;
      mobileYearRangeIndex = 0;
      
      document.querySelectorAll('.chart-toggle-btn').forEach(btn => btn.remove());
      document.querySelectorAll('.chart-custom-legend').forEach(legend => legend.remove());

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

        currentData = await response.json()

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
        const hasToggleOption = IS_MOBILE 
            ? totalYears > MOBILE_DEFAULT_YEARS 
            : totalYears > DEFAULT_YEARS_TO_SHOW;
        
        const allToggleBtns = [];
        
        const updateAllToggleBtns = () => {
            allToggleBtns.forEach(btn => {
                if (IS_MOBILE) {
                    btn.textContent = getMobileButtonLabel();
                } else {
                    btn.textContent = showFullHistory ? "View 10Y" : "View Full";
                }
            });
        };
        
        const createChartHeaderElements = (canvasId, legendItems) => {
            const canvas = document.getElementById(canvasId);
            const chartContainer = canvas?.closest('.chart-container');
            const chartHeader = chartContainer?.querySelector('.chart-header');
            
            if (chartHeader) {
                chartHeader.style.display = "grid";
                chartHeader.style.gridTemplateColumns = hasToggleOption ? "auto 1fr auto" : "auto 1fr";
                chartHeader.style.alignItems = "center";
                chartHeader.style.gap = "16px";
                chartHeader.style.marginBottom = "12px";
                
                const titleEl = chartHeader.querySelector("h3");
                if (titleEl) {
                    titleEl.style.margin = "0";
                    titleEl.style.justifySelf = "start";
                }
                
                const legendContainer = document.createElement("div");
                legendContainer.className = "chart-custom-legend";
                legendContainer.style.display = "flex";
                legendContainer.style.alignItems = "center";
                legendContainer.style.gap = "16px";
                legendContainer.style.justifySelf = "end";
                legendContainer.style.fontSize = "0.75rem";
                legendContainer.style.fontFamily = "'Inter', sans-serif";
                legendContainer.style.color = "#6c757d";
                
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
                    
                    if (IS_MOBILE) {
                        toggleBtn.textContent = getMobileButtonLabel();
                    } else {
                        toggleBtn.textContent = "View Full";
                    }
                    
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
                    
                    toggleBtn.addEventListener("click", () => {
                        if (IS_MOBILE) {
                            mobileYearRangeIndex = (mobileYearRangeIndex + 1) % MOBILE_YEAR_RANGES.length;
                        } else {
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

        showSkeletons(false);
        
        renderCharts();
        
        showMessage(null)
        window.scrollTo({ top: 0, behavior: "smooth" })

      } catch (error) {
        console.error("Error loading or processing analysis data:", error)
        window.location.href = `error-loading.html?ticker=${ticker}&error=${encodeURIComponent(error.message)}`
      } finally {
        if (searchButton) searchButton.disabled = false
      }
    }

    // --- Event Listeners for Analysis Page ---

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

    // --- Resize Handling ---
    let resizeTimeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        const chartsToResize = [revenueChartInstance, arChartInstance, cashFlowChartInstance]

        chartsToResize.forEach((chart, index) => {
          if (!chart || !chart.options) return

          try {
            chart.resize();
            chart.update('none');
          } catch (error) {
            console.error(`Error resizing chart ${index}:`, error);
          }
        })
      }, 250)
    }
    window.addEventListener("resize", handleResize)

    // --- Initial Load ---
    const urlParams = new URLSearchParams(window.location.search)
    const tickerParam = urlParams.get("ticker")

    const initialTicker = tickerParam ? tickerParam.toUpperCase() : DEFAULT_TICKER
    if (tickerInput) {
      tickerInput.value = initialTicker
    }
    loadAnalysisData(initialTicker)
  })
}
