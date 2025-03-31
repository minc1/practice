// script.js

// --- Global Variables & Constants ---
const DEFAULT_TICKER = 'JD'; // Default ticker to load on page init
const DATA_PATH = 'DATA/'; // Path to the data directory
let currentTicker = null; // Keep track of the currently loaded ticker
let revenueChartInstance = null;
let arChartInstance = null;
let cashFlowChartInstance = null;

// Determine current page
const isAnalysisPage = window.location.pathname.includes('analysis.html');
const isLandingPage = !isAnalysisPage;

// --- Helper Functions ---
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

// Helper function to populate elements safely
const populateElement = (selector, data, property = 'textContent') => {
    const element = select(selector);
    if (element) {
        if (data !== undefined && data !== null) {
            if (property === 'innerHTML') {
                element.innerHTML = data;
            } else {
                element.textContent = data;
            }
        } else {
            element[property] = ''; // Clear if data is missing
            console.warn(`Data not found or null/undefined for selector: ${selector}`);
        }
    } else {
        // console.warn(`Element not found for selector: ${selector}`); // Less noisy
    }
};

// Helper function to generate cards dynamically
const generateCards = (containerId, cardData) => {
    const container = select(`#${containerId}`);
    if (!container) {
        console.error(`Card container #${containerId} not found.`);
        return;
    }
     if (!Array.isArray(cardData)) {
        console.error(`Invalid card data for #${containerId}. Expected array.`);
        container.innerHTML = '<p class="error-message" style="color: var(--danger); text-align: center;">Error loading card data.</p>';
        return;
    }
    container.innerHTML = ''; // Clear placeholder/previous cards
    if (cardData.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--muted);">No card data available.</p>';
        return;
    }
    cardData.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.innerHTML = `
            <div class="card-header">
                <h3><i class="${card.iconClass || 'fas fa-question-circle neutral'}"></i> ${card.title || 'Untitled Card'}</h3>
            </div>
            <div class="card-body">
                <ul>
                    ${(card.points && Array.isArray(card.points)) ? card.points.map(point => `<li>${point}</li>`).join('') : '<li>No points provided.</li>'}
                </ul>
            </div>
            <div class="card-footer">
                ${card.footer || ''}
            </div>
        `;
        container.appendChild(cardElement);
    });
};

// Helper function to populate table dynamically
const populateTable = (tbodyId, tableRowData) => {
    const tbody = select(`#${tbodyId}`);
    if (!tbody) {
        console.error(`Table body #${tbodyId} not found.`);
        return;
    }
    if (!Array.isArray(tableRowData)) {
        console.error(`Invalid table data for #${tbodyId}. Expected array.`);
        tbody.innerHTML = '<tr><td colspan="3" class="error-message" style="color: var(--danger); text-align: center;">Error loading table data.</td></tr>';
        return;
    }
    tbody.innerHTML = ''; // Clear placeholder
    if (tableRowData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--muted);">No table data available.</td></tr>';
        return;
    }
    tableRowData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Factor">${row.factor || '-'}</td>
            <td data-label="Opportunities">${row.opportunities || '-'}</td>
            <td data-label="Risks">${row.risks || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
};

// Helper function to populate list items dynamically
const populateList = (ulId, listItems, useInnerHTML = false) => {
    const ul = select(`#${ulId}`);
     if (!ul) {
        console.error(`List #${ulId} not found.`);
        return;
    }
    if (!Array.isArray(listItems)) {
        console.error(`Invalid list data for #${ulId}. Expected array.`);
        ul.innerHTML = '<li class="error-message" style="color: var(--danger);">Error loading list data.</li>';
        return;
    }
    ul.innerHTML = ''; // Clear placeholder
    if (listItems.length === 0) {
        ul.innerHTML = '<li style="color: var(--muted);">No list items available.</li>';
        return;
    }
    listItems.forEach(item => {
        const li = document.createElement('li');
        if (useInnerHTML) {
            li.innerHTML = item || '';
        } else {
            li.textContent = item || '';
        }
        ul.appendChild(li);
    });
};

// Helper to show loading/error messages
function showMessage(message, type = 'loading') {
    const messageArea = select('#loading-error-message');
    if (message) {
        messageArea.innerHTML = `
            <div class="message-box ${type}">
                ${message}
            </div>
        `;
        messageArea.style.display = 'flex';
    } else {
        messageArea.style.display = 'none';
    }
}

// Helper to destroy existing chart instances
const destroyCharts = () => {
    if (revenueChartInstance) { revenueChartInstance.destroy(); revenueChartInstance = null; }
    if (arChartInstance) { arChartInstance.destroy(); arChartInstance = null; }
    if (cashFlowChartInstance) { cashFlowChartInstance.destroy(); cashFlowChartInstance = null; }
    console.log("Previous chart instances destroyed.");
};

// --- UI Interaction Logic (Mobile Menu, Header Scroll, Back to Top) ---

// Mobile Menu Toggle
const mobileMenuButton = select('.mobile-menu');
const navLinks = select('.nav-links');
const mobileMenuIcon = select('.mobile-menu i');

if (mobileMenuButton && navLinks && mobileMenuIcon) {
    on('click', '.mobile-menu', function(e) {
        navLinks.classList.toggle('show');
        mobileMenuIcon.classList.toggle('fa-bars');
        mobileMenuIcon.classList.toggle('fa-times');
        mobileMenuButton.setAttribute('aria-expanded', navLinks.classList.contains('show'));
        // Recalculate top position dynamically in case header wraps
        const headerHeight = select('#header')?.offsetHeight || 61;
        navLinks.style.top = `${headerHeight}px`;
    });

    on('click', '.nav-links a', function(e) {
        if (navLinks.classList.contains('show')) {
            navLinks.classList.remove('show');
            mobileMenuIcon.classList.remove('fa-times');
            mobileMenuIcon.classList.add('fa-bars');
            mobileMenuButton.setAttribute('aria-expanded', 'false');
        }
    }, true);
}

// Landing page search form handling
const searchForm = select('.search-form');
if (searchForm && isLandingPage) {
    on('submit', '.search-form', function(e) {
        e.preventDefault();
        const tickerInput = this.querySelector('input[name="ticker"]');
        if (tickerInput && tickerInput.value.trim()) {
            window.location.href = `analysis.html?ticker=${tickerInput.value.trim().toUpperCase()}`;
        }
    });
}

// Header Scroll Effect
const header = select('#header');
if (header) {
    const headerScrolled = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    window.addEventListener('load', headerScrolled);
    onScroll(window, headerScrolled);
}

// Back to Top Button
const backToTopButton = select('.back-to-top');
if (backToTopButton) {
    const toggleBackToTop = () => {
        if (window.scrollY > 300) {
            backToTopButton.classList.add('visible');
        } else {
            backToTopButton.classList.remove('visible');
        }
    };
    window.addEventListener('load', toggleBackToTop);
    onScroll(window, toggleBackToTop);

    on('click', '.back-to-top', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}


// --- Chart.js Implementation & Data Loading ---

document.addEventListener('DOMContentLoaded', function() {

    // Check if Chart.js and annotation plugin are loaded
    if (typeof Chart === 'undefined') {
        console.error("Chart.js library not loaded.");
        showMessage('<i class="fas fa-exclamation-triangle"></i> Chart library failed to load. Please refresh.', 'error');
        return;
    }
    if (typeof ChartAnnotation === 'undefined') {
        console.error("Chartjs-plugin-annotation not loaded.");
        // Annotations might fail, but charts could still work partially
    }

    // Register the annotation plugin
    try {
        if (typeof ChartAnnotation !== 'undefined') {
             Chart.register(ChartAnnotation);
             console.log("Chartjs-plugin-annotation registered successfully.");
        }
    } catch (error) {
        console.error("Error registering Chartjs-plugin-annotation:", error);
    }

    // --- Common Chart Configuration ---
    // (Remains the same as before)
    const commonChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: {
                    boxWidth: 8, boxHeight: 8, padding: 8,
                    font: { size: 10 }, color: '#6c757d',
                    usePointStyle: true, pointStyle: 'circle'
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        if (context.dataset.label === 'Divergence') return null;
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) {
                            label += context.parsed.y.toFixed(1) + '%';
                        }
                        return label;
                    }
                },
                bodyFont: { size: window.innerWidth <= 768 ? 11 : 12 },
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleFont: { size: 13, weight: 'bold' },
                padding: 10, cornerRadius: 4, displayColors: false
            },
            annotation: {
                annotations: {}
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    font: { size: window.innerWidth <= 768 ? 10 : 12 },
                    color: '#6c757d'
                 }
            },
            y: {
                beginAtZero: false,
                title: {
                    display: true, text: 'Growth Rate (%)',
                    font: { size: window.innerWidth <= 768 ? 11 : 12, weight: '500' },
                    color: '#495057'
                },
                ticks: {
                    callback: function(value) { return value + '%'; },
                    font: { size: window.innerWidth <= 768 ? 10 : 11 },
                    color: '#6c757d'
                },
                grid: { drawBorder: false, color: 'rgba(0, 0, 0, 0.05)' }
            }
        },
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { top: 20, right: 20, bottom: 10, left: 10 } }
    };

    // --- Chart Styling Helper Functions ---
    // (Remain the same as before)
    const divergenceColor = '#c5817e'; // var(--danger)
    const primaryColor = '#c5a47e';    // var(--primary)
    const secondaryColor = '#1c2541';  // var(--secondary)
    const mutedColor = '#6c757d';      // var(--muted)

    const createAnnotationLabel = (xVal, yVal, content, yAdj = -15, xAdj = 0) => ({
        type: 'label', xValue: xVal, yValue: yVal, content: content,
        color: mutedColor, font: { size: window.innerWidth <= 768 ? 9 : 10, weight: '600' },
        position: 'start', yAdjust: yAdj, xAdjust: xAdj,
        backgroundColor: 'rgba(255,255,255,0.85)',
        padding: { top: 3, bottom: 3, left: 5, right: 5 }, borderRadius: 4,
        callout: { display: true, position: 'bottom', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', margin: 5 }
    });

    const createDivergenceLegend = () => ({
        label: 'Divergence', pointStyle: 'rectRot', pointRadius: 5,
        borderColor: divergenceColor, backgroundColor: divergenceColor,
        borderWidth: 1, data: []
    });

    const pointStyleCallback = (indices = [], normalColor, highlightColor) => (context) => {
        return indices.includes(context.dataIndex) ? highlightColor : normalColor;
    };

    const pointRadiusCallback = (indices = [], normalRadius = 4, highlightRadius = 6) => (context) => {
        return indices.includes(context.dataIndex) ? highlightRadius : normalRadius;
    };

    const pointHoverRadiusCallback = (indices = [], normalRadius = 6, highlightRadius = 8) => (context) => {
        return indices.includes(context.dataIndex) ? highlightRadius : normalRadius;
    };


    // --- Core Data Loading and Page Population Function ---
    const loadAnalysisData = async (ticker) => {
        ticker = ticker.trim().toUpperCase();
        if (!ticker) {
            showMessage('<i class="fas fa-exclamation-circle"></i> Please enter a ticker symbol.', 'error');
            return;
        }

        console.log(`Attempting to load data for ticker: ${ticker}`);
        showMessage(`<i class="fas fa-spinner fa-spin"></i> Loading analysis for ${ticker}...`, 'loading');
        destroyCharts(); // Destroy previous charts before loading new data

        const searchButton = select('#tickerSearchForm button');
        if (searchButton) searchButton.disabled = true;

        try {
            const response = await fetch(`${DATA_PATH}${ticker}.json`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Analysis data not found for ticker "${ticker}". Please check the symbol or try another.`);
                } else {
                    throw new Error(`HTTP error! status: ${response.status} - Could not fetch data for ${ticker}.`);
                }
            }

            const data = await response.json();

            // --- Data Validation (Basic) ---
            if (!data || typeof data !== 'object') {
                throw new Error(`Invalid data format received for ticker "${ticker}".`);
            }
            // Check for essential top-level keys (optional but good practice)
            // const requiredKeys = ['company', 'trendAnalysis', 'financialMetrics', 'investmentConsiderations', 'conclusion', 'chartData'];
            // for (const key of requiredKeys) {
            //     if (!(key in data)) {
            //         console.warn(`Warning: Missing top-level key "${key}" in data for ${ticker}.`);
            //     }
            // }

            console.log(`Analysis data for ${ticker} loaded successfully.`);
            currentTicker = ticker; // Update current ticker tracker

            // --- Populate Static Content Areas ---
            populateElement('[data-dynamic="page-title"]', data.company?.pageTitle || `ForensicFinancials | ${ticker} Analysis`);
            populateElement('[data-dynamic="hero-title"]', `${data.company?.name || ticker} (${data.company?.ticker || ticker})<br>${data.company?.analysisTitle || 'Financial Analysis'}`, 'innerHTML');
            populateElement('[data-dynamic="hero-subtitle"]', data.company?.heroSubtitle || `Analysis details for ${ticker}.`);

            populateElement('[data-dynamic="trends-subtitle"]', data.trendAnalysis?.sectionSubtitle || '');
            generateCards('trends-cards-container', data.trendAnalysis?.cards || []);

            populateElement('[data-dynamic="financials-subtitle"]', data.financialMetrics?.sectionSubtitle || '');
            generateCards('financials-cards-container', data.financialMetrics?.cards || []);

            populateElement('[data-dynamic="opportunities-subtitle"]', data.investmentConsiderations?.sectionSubtitle || '');
            populateTable('opportunities-table-body', data.investmentConsiderations?.tableData || []);

            populateElement('[data-dynamic="conclusion-subtitle"]', data.conclusion?.sectionSubtitle || '');
            populateElement('[data-dynamic="verdict-title"]', data.conclusion?.verdictTitle || `Verdict for ${ticker}`);
            populateElement('[data-dynamic="verdict-rating"]', data.conclusion?.verdictRating || 'N/A');
            const paragraphsContainer = select('#verdict-paragraphs');
            if (paragraphsContainer && Array.isArray(data.conclusion?.paragraphs)) {
                paragraphsContainer.innerHTML = data.conclusion.paragraphs.map(p => `<p>${p || ''}</p>`).join('');
            } else if (paragraphsContainer) {
                 paragraphsContainer.innerHTML = '<p>Conclusion details not available.</p>';
            }
            populateElement('[data-dynamic="monitoring-title"]', data.conclusion?.monitoringPointsTitle || 'Key Monitoring Points');
            populateList('monitoring-points-list', data.conclusion?.monitoringPoints || [], true);

            // --- Initialize Charts with Dynamic Data ---
            const chartData = data.chartData || {};
            const chartLabels = chartData.labels || [];

            // 1. Revenue Chart
            const revenueCtx = select('#revenueChart')?.getContext('2d');
            if (revenueCtx) {
                try {
                    revenueChartInstance = new Chart(revenueCtx, {
                        type: 'line',
                        data: {
                            labels: chartLabels,
                            datasets: [{
                                label: 'Annual Revenue Growth (%)',
                                data: chartData.revenueGrowth || [],
                                borderColor: primaryColor, backgroundColor: 'rgba(197, 164, 126, 0.1)',
                                borderWidth: 2.5, tension: 0.4, fill: true,
                                pointBackgroundColor: primaryColor, pointRadius: pointRadiusCallback([]),
                                pointHoverRadius: pointHoverRadiusCallback([]), pointBorderColor: primaryColor
                            }]
                        },
                        options: JSON.parse(JSON.stringify(commonChartOptions))
                    });
                    console.log("Revenue chart initialized.");
                } catch (error) { console.error("Error initializing Revenue Chart:", error); }
            } else { console.warn("Canvas element #revenueChart not found."); }

            // 2. Accounts Receivable vs Revenue Chart
            const arCtx = select('#arChart')?.getContext('2d');
            if (arCtx) {
                try {
                    const arDivergenceIndices = chartData.divergenceIndices?.arChart || [];
                    const arChartOptions = JSON.parse(JSON.stringify(commonChartOptions));
                    arChartOptions.plugins.annotation = { annotations: {} };
                    if (chartData.annotations?.arChart && Array.isArray(chartData.annotations.arChart)) {
                        chartData.annotations.arChart.forEach((anno, index) => {
                            if (typeof anno.xVal === 'number' && typeof anno.yVal === 'number' && anno.content) {
                                arChartOptions.plugins.annotation.annotations[`arLabel${index + 1}`] =
                                    createAnnotationLabel(anno.xVal, anno.yVal, anno.content, anno.yAdj, anno.xAdj);
                            } else { console.warn(`Invalid annotation data for arChart at index ${index}`); }
                        });
                    }

                    arChartInstance = new Chart(arCtx, {
                        type: 'line',
                        data: {
                            labels: chartLabels,
                            datasets: [
                                { label: 'Revenue Growth (%)', data: chartData.revenueGrowth || [], borderColor: primaryColor, backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, pointBackgroundColor: primaryColor, pointRadius: pointRadiusCallback([]), pointHoverRadius: pointHoverRadiusCallback([]), pointBorderColor: primaryColor },
                                { label: 'A/R Growth (%)', data: chartData.arGrowth || [], borderColor: secondaryColor, backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, pointBackgroundColor: pointStyleCallback(arDivergenceIndices, secondaryColor, divergenceColor), pointRadius: pointRadiusCallback(arDivergenceIndices), pointHoverRadius: pointHoverRadiusCallback(arDivergenceIndices), pointBorderColor: pointStyleCallback(arDivergenceIndices, secondaryColor, divergenceColor) },
                                createDivergenceLegend()
                            ]
                        },
                        options: arChartOptions
                    });
                    console.log("A/R chart initialized.");
                } catch (error) { console.error("Error initializing A/R Chart:", error); }
            } else { console.warn("Canvas element #arChart not found."); }

            // 3. Operating Cash Flow vs Net Income Chart
            const cashFlowCtx = select('#cashFlowChart')?.getContext('2d');
            if (cashFlowCtx) {
                 try {
                    const cfDivergenceIndices = chartData.divergenceIndices?.cashFlowChart || [];
                    const cashFlowChartOptions = JSON.parse(JSON.stringify(commonChartOptions));
                    cashFlowChartOptions.plugins.annotation = { annotations: {} };
                     if (chartData.annotations?.cashFlowChart && Array.isArray(chartData.annotations.cashFlowChart)) {
                        chartData.annotations.cashFlowChart.forEach((anno, index) => {
                             if (typeof anno.xVal === 'number' && typeof anno.yVal === 'number' && anno.content) {
                                cashFlowChartOptions.plugins.annotation.annotations[`cfLabel${index + 1}`] =
                                    createAnnotationLabel(anno.xVal, anno.yVal, anno.content, anno.yAdj, anno.xAdj);
                             } else { console.warn(`Invalid annotation data for cashFlowChart at index ${index}`); }
                        });
                    }

                    cashFlowChartInstance = new Chart(cashFlowCtx, {
                        type: 'line',
                        data: {
                            labels: chartLabels,
                            datasets: [
                                { label: 'Op Cash Flow Growth (%)', data: chartData.cfoGrowth || [], borderColor: primaryColor, backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, pointBackgroundColor: primaryColor, pointRadius: pointRadiusCallback([]), pointHoverRadius: pointHoverRadiusCallback([]), pointBorderColor: primaryColor },
                                { label: 'Net Income Growth (%)', data: chartData.niGrowth || [], borderColor: secondaryColor, backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, pointBackgroundColor: pointStyleCallback(cfDivergenceIndices, secondaryColor, divergenceColor), pointRadius: pointRadiusCallback(cfDivergenceIndices), pointHoverRadius: pointHoverRadiusCallback(cfDivergenceIndices), pointBorderColor: pointStyleCallback(cfDivergenceIndices, secondaryColor, divergenceColor) },
                                createDivergenceLegend()
                            ]
                        },
                        options: cashFlowChartOptions
                    });
                    console.log("Cash Flow chart initialized.");
                } catch (error) { console.error("Error initializing Cash Flow Chart:", error); }
            } else { console.warn("Canvas element #cashFlowChart not found."); }

            // --- Responsive Chart Adjustments ---
            handleResize(); // Apply initial responsive settings

            // Hide loading message and show content
            showMessage(null);
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top after loading new data

        } catch (error) {
            console.error('Failed to load or process analysis data:', error);
            showMessage(`<i class="fas fa-exclamation-triangle"></i> ${error.message}`, 'error');
            currentTicker = null; // Reset current ticker on error
        } finally {
             if (searchButton) searchButton.disabled = false; // Re-enable search button
        }
    };


    // --- Event Listeners ---

    // Ticker Search Form Submission
    const searchForm = select('#tickerSearchForm');
    const tickerInput = select('#tickerInput');
    if (searchForm && tickerInput) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent default form submission
            const ticker = tickerInput.value;
            if (ticker && ticker.toUpperCase() !== currentTicker) { // Only load if ticker is new
                 loadAnalysisData(ticker);
            } else if (!ticker) {
                 showMessage('<i class="fas fa-exclamation-circle"></i> Please enter a ticker symbol.', 'error');
            }
            // Optionally clear input after search: tickerInput.value = '';
        });
    } else {
        console.error("Ticker search form or input element not found.");
    }

    // Debounced Resize Handler for Charts
    let resizeTimeout;
    const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const isMobile = window.innerWidth <= 768;
            // Use the globally tracked instances
            const chartsToResize = [revenueChartInstance, arChartInstance, cashFlowChartInstance];

            chartsToResize.forEach((chart, index) => {
                if (!chart || !chart.options) return; // Skip if chart is not initialized

                try {
                    // Adjust font sizes
                    if (chart.options.plugins?.tooltip?.bodyFont) chart.options.plugins.tooltip.bodyFont.size = isMobile ? 11 : 12;
                    if (chart.options.scales?.x?.ticks?.font) chart.options.scales.x.ticks.font.size = isMobile ? 10 : 12;
                    if (chart.options.scales?.y?.title?.font) chart.options.scales.y.title.font.size = isMobile ? 11 : 12;
                    if (chart.options.scales?.y?.ticks?.font) chart.options.scales.y.ticks.font.size = isMobile ? 10 : 11;
                    if (chart.options.plugins?.legend?.labels?.font) chart.options.plugins.legend.labels.font.size = 10;
                    if (chart.options.plugins?.legend?.labels) {
                        chart.options.plugins.legend.labels.boxWidth = 8;
                        chart.options.plugins.legend.labels.boxHeight = 8;
                    }

                    // Adjust annotation label font size
                    if (chart.options.plugins?.annotation?.annotations) {
                        Object.values(chart.options.plugins.annotation.annotations).forEach(anno => {
                            if (anno.type === 'label' && anno.font) {
                                anno.font.size = isMobile ? 9 : 10;
                            }
                        });
                    }

                    // Resize and update
                    chart.resize();
                    chart.update('none'); // Use 'none' to avoid jerky animations on resize
                } catch(error) {
                    console.error(`Error resizing/updating chart index ${index}:`, error);
                }
            });
             if (chartsToResize.some(c => c)) console.log("Charts resized/updated for responsiveness."); // Log only if charts exist
        }, 250); // Debounce
    };
    window.addEventListener('resize', handleResize);


    // --- Initial Load ---
    if (isAnalysisPage) {
        // Check for ticker in URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const tickerParam = urlParams.get('ticker');
        
        // Load ticker from URL or use default
        loadAnalysisData(tickerParam ? tickerParam.toUpperCase() : DEFAULT_TICKER);
    }

}); // End DOMContentLoaded Wrapper