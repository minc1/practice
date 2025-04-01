const DEFAULT_TICKER = 'JD';
const DATA_PATH = 'DATA/';
let currentTicker = null;
let revenueChartInstance = null;
let arChartInstance = null;
let cashFlowChartInstance = null;

// --- Anomaly Thresholds ---
// Difference thresholds (Series1 Growth - Series2 Growth > Threshold)
const AR_REVENUE_DIFF_THRESHOLD = 5.0; // A/R growth exceeding Revenue growth
const NI_CFO_DIFF_THRESHOLD = 10.0;    // Net Income growth exceeding CFO growth

// Negative growth thresholds (Growth < Threshold)
const NEGATIVE_GROWTH_THRESHOLD = -10.0; // General threshold for significant decline
const NEGATIVE_AR_GROWTH_THRESHOLD = -20.0; // Specific threshold for A/R decline (potential write-offs)
// --- End Anomaly Thresholds ---


const isAnalysisPage = window.location.pathname.includes('analysis.html');
const isLandingPage = !isAnalysisPage;

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
            element[property] = '';

        }
    } else {

    }
};

const generateCards = (containerId, cardData) => {
    const container = select(`#${containerId}`);
    if (!container) {

        return;
    }
     if (!Array.isArray(cardData)) {

        container.innerHTML = '<p class="error-message" style="color: var(--danger); text-align: center;">Error loading card data.</p>';
        return;
    }
    container.innerHTML = '';
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
            ${card.footer ? `<div class="card-footer">${card.footer}</div>` : ''}
        `;
        container.appendChild(cardElement);
    });
};

const populateTable = (tbodyId, tableRowData) => {
    const tbody = select(`#${tbodyId}`);
    if (!tbody) {

        return;
    }
    if (!Array.isArray(tableRowData)) {

        tbody.innerHTML = '<tr><td colspan="3" class="error-message" style="color: var(--danger); text-align: center;">Error loading table data.</td></tr>';
        return;
    }
    tbody.innerHTML = '';
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

const populateList = (ulId, listItems, useInnerHTML = false) => {
    const ul = select(`#${ulId}`);
     if (!ul) {

        return;
    }
    if (!Array.isArray(listItems)) {

        ul.innerHTML = '<li class="error-message" style="color: var(--danger);">Error loading list data.</li>';
        return;
    }
    ul.innerHTML = '';
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

// --- Anomaly Detection Helper Functions ---
const checkGrowthDifferenceAnomaly = (series1, series2, threshold) => {
    const indices = new Set();
    if (!Array.isArray(series1) || !Array.isArray(series2) || series1.length !== series2.length) return indices;
    for (let i = 0; i < series1.length; i++) {
        const growth1 = series1[i];
        const growth2 = series2[i];
        if (typeof growth1 === 'number' && typeof growth2 === 'number') {
            if (growth1 > growth2 && (growth1 - growth2) > threshold) {
                indices.add(i);
            }
        }
    }
    return indices;
};

const checkNegativeGrowthAnomaly = (series, threshold) => {
    const indices = new Set();
    if (!Array.isArray(series)) return indices;
    for (let i = 0; i < series.length; i++) {
        const growth = series[i];
        if (typeof growth === 'number' && growth < threshold) {
            indices.add(i);
        }
    }
    return indices;
};

// --- Main Anomaly Identification Function ---
const identifyAnomalyIndices = (config) => {
    const allAnomalyIndices = new Set();

    // Check for growth difference anomalies (e.g., A/R vs Rev, NI vs CFO)
    if (config.series1 && config.series2 && config.diffThreshold) {
        const diffIndices = checkGrowthDifferenceAnomaly(config.series1, config.series2, config.diffThreshold);
        diffIndices.forEach(index => allAnomalyIndices.add(index));
    }

    // Check for negative growth anomalies in the primary series (e.g., A/R, NI)
    if (config.series1 && config.negativeThreshold1) {
        const negIndices1 = checkNegativeGrowthAnomaly(config.series1, config.negativeThreshold1);
        negIndices1.forEach(index => allAnomalyIndices.add(index));
    }

    // Check for negative growth anomalies in the secondary series (e.g., Rev, CFO)
    if (config.series2 && config.negativeThreshold2) {
        const negIndices2 = checkNegativeGrowthAnomaly(config.series2, config.negativeThreshold2);
        negIndices2.forEach(index => allAnomalyIndices.add(index));
    }

    // Add more checks here if needed in the future

    return Array.from(allAnomalyIndices); // Return unique indices as an array
};


const showMessage = (message, type = 'loading') => {
    const messageArea = select('#loading-error-message');
    const mainContent = select('#main-content');
    if (!messageArea || !mainContent) return;

    const messageP = messageArea.querySelector('p');

    if (message) {
        messageP.innerHTML = message;
        messageArea.className = `message-area ${type}`;
        messageArea.style.display = 'flex';
        mainContent.style.display = 'none';
    } else {
        messageArea.style.display = 'none';
        mainContent.style.display = 'block';
    }
};

const destroyCharts = () => {
    if (revenueChartInstance) { revenueChartInstance.destroy(); revenueChartInstance = null; }
    if (arChartInstance) { arChartInstance.destroy(); arChartInstance = null; }
    if (cashFlowChartInstance) { cashFlowChartInstance.destroy(); cashFlowChartInstance = null; }

};

const mobileMenuButton = select('.mobile-menu');
const navLinks = select('.nav-links');
const mobileMenuIcon = select('.mobile-menu i');

if (mobileMenuButton && navLinks && mobileMenuIcon) {
    on('click', '.mobile-menu', function(e) {
        navLinks.classList.toggle('show');
        mobileMenuIcon.classList.toggle('fa-bars');
        mobileMenuIcon.classList.toggle('fa-times');
        mobileMenuButton.setAttribute('aria-expanded', navLinks.classList.contains('show'));
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

const ctaSearchForm = select('.search-form');
if (ctaSearchForm && isLandingPage) {
    ctaSearchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const tickerInput = this.querySelector('input[name="ticker"]');
        if (tickerInput && tickerInput.value.trim()) {
            window.location.href = `analysis.html?ticker=${tickerInput.value.trim().toUpperCase()}`;
        }
    });
}

const headerSearchForm = select('#headerTickerSearchForm');
if (headerSearchForm && isLandingPage) {
    headerSearchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const tickerInput = this.querySelector('input[name="ticker"]');
        if (tickerInput && tickerInput.value.trim()) {
            window.location.href = `analysis.html?ticker=${tickerInput.value.trim().toUpperCase()}`;
        }
    });
}


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


if (isAnalysisPage) {
    document.addEventListener('DOMContentLoaded', function() {

        if (typeof Chart === 'undefined') {

            showMessage('<i class="fas fa-exclamation-triangle"></i> Chart library failed to load. Please refresh.', 'error');
            return;
        }
        if (typeof ChartAnnotation === 'undefined') {

        }

        try {
            if (typeof ChartAnnotation !== 'undefined') {
                 Chart.register(ChartAnnotation);

            }
        } catch (error) {

        }

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
                            if (context.dataset.label === 'Anomaly') return null;
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

        const anomalyColor = '#c5817e'; // Use a consistent name for the highlight color
        const primaryColor = '#c5a47e';
        const secondaryColor = '#1c2541';
        const mutedColor = '#6c757d';

        const createAnnotationLabel = (xVal, yVal, content, yAdj = -15, xAdj = 0) => ({
            type: 'label', xValue: xVal, yValue: yVal, content: content,
            color: mutedColor, font: { size: window.innerWidth <= 768 ? 9 : 10, weight: '600' },
            position: 'start', yAdjust: yAdj, xAdjust: xAdj,
            backgroundColor: 'rgba(255,255,255,0.85)',
            padding: { top: 3, bottom: 3, left: 5, right: 5 }, borderRadius: 4,
            callout: { display: true, position: 'bottom', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', margin: 5 }
        });

        const createAnomalyLegend = () => ({
            label: 'Anomaly',
            pointStyle: 'rectRot', pointRadius: 5,
            borderColor: anomalyColor, backgroundColor: anomalyColor,
            borderWidth: 1, data: []
        });

        // --- Point Styling Callbacks (using anomalyColor) ---
        const pointStyleCallback = (indices = [], normalColor, highlightColor = anomalyColor) => (context) => {
            return indices.includes(context.dataIndex) ? highlightColor : normalColor;
        };

        const pointRadiusCallback = (indices = [], normalRadius = 4, highlightRadius = 6) => (context) => {
            return indices.includes(context.dataIndex) ? highlightRadius : normalRadius;
        };

        const pointHoverRadiusCallback = (indices = [], normalRadius = 6, highlightRadius = 8) => (context) => {
            return indices.includes(context.dataIndex) ? highlightRadius : normalRadius;
        };


        const loadAnalysisData = async (ticker) => {
            ticker = ticker.trim().toUpperCase();
            if (!ticker) {
                showMessage('<i class="fas fa-exclamation-circle"></i> Please enter a ticker symbol.', 'error');
                return;
            }


            showMessage(`<i class="fas fa-spinner fa-spin"></i> Loading analysis for ${ticker}...`, 'loading');
            destroyCharts();

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

                if (!data || typeof data !== 'object') {
                    throw new Error(`Invalid data format received for ticker "${ticker}".`);
                }


                currentTicker = ticker;

                // --- Populate UI Elements (No changes here) ---
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
                // --- End Populate UI Elements ---

                const chartData = data.chartData || {};
                const chartLabels = chartData.labels || [];
                const revenueGrowth = chartData.revenueGrowth || [];
                const arGrowth = chartData.arGrowth || [];
                const cfoGrowth = chartData.cfoGrowth || [];
                const niGrowth = chartData.niGrowth || [];

                // --- Calculate Anomaly Indices using the new function ---
                const arRevenueAnomalyIndices = identifyAnomalyIndices({
                    series1: arGrowth,          // A/R Growth
                    series2: revenueGrowth,     // Revenue Growth
                    diffThreshold: AR_REVENUE_DIFF_THRESHOLD,
                    negativeThreshold1: NEGATIVE_AR_GROWTH_THRESHOLD, // Check for large A/R drops
                    negativeThreshold2: NEGATIVE_GROWTH_THRESHOLD     // Check for negative revenue growth
                });


                const cfoNiAnomalyIndices = identifyAnomalyIndices({
                    series1: niGrowth,          // Net Income Growth
                    series2: cfoGrowth,         // CFO Growth
                    diffThreshold: NI_CFO_DIFF_THRESHOLD,
                    negativeThreshold1: NEGATIVE_GROWTH_THRESHOLD, // Check for negative NI growth
                    negativeThreshold2: NEGATIVE_GROWTH_THRESHOLD  // Check for negative CFO growth
                });



                // --- Revenue Chart (No anomalies highlighted here) ---
                const revenueCtx = select('#revenueChart')?.getContext('2d');
                if (revenueCtx) {
                    try {
                        revenueChartInstance = new Chart(revenueCtx, {
                            type: 'line',
                            data: {
                                labels: chartLabels,
                                datasets: [{
                                    label: 'Annual Revenue Growth (%)',
                                    data: revenueGrowth,
                                    borderColor: primaryColor, backgroundColor: 'rgba(197, 164, 126, 0.1)',
                                    borderWidth: 2.5, tension: 0.4, fill: true,
                                    pointBackgroundColor: primaryColor,
                                    pointRadius: pointRadiusCallback([]), // No anomalies highlighted
                                    pointHoverRadius: pointHoverRadiusCallback([]),
                                    pointBorderColor: primaryColor
                                }]
                            },
                            options: JSON.parse(JSON.stringify(commonChartOptions))
                        });

                    } catch (error) {  }
                } else {  }

                // --- A/R vs Revenue Chart (Apply combined anomalies) ---
                const arCtx = select('#arChart')?.getContext('2d');
                if (arCtx) {
                    try {
                        const arChartOptions = JSON.parse(JSON.stringify(commonChartOptions));
                        arChartOptions.plugins.annotation = { annotations: {} };

                        arChartInstance = new Chart(arCtx, {
                            type: 'line',
                            data: {
                                labels: chartLabels,
                                datasets: [
                                    { // Revenue Growth Line
                                        label: 'Revenue Growth (%)',
                                        data: revenueGrowth,
                                        borderColor: primaryColor,
                                        backgroundColor: 'transparent',
                                        borderWidth: 2,
                                        tension: 0.4,
                                        pointBackgroundColor: pointStyleCallback(arRevenueAnomalyIndices, primaryColor), // Highlight if *any* related anomaly
                                        pointRadius: pointRadiusCallback(arRevenueAnomalyIndices),
                                        pointHoverRadius: pointHoverRadiusCallback(arRevenueAnomalyIndices),
                                        pointBorderColor: pointStyleCallback(arRevenueAnomalyIndices, primaryColor)
                                    },
                                    { // A/R Growth Line
                                        label: 'A/R Growth (%)',
                                        data: arGrowth,
                                        borderColor: secondaryColor,
                                        backgroundColor: 'transparent',
                                        borderWidth: 2,
                                        tension: 0.4,
                                        pointBackgroundColor: pointStyleCallback(arRevenueAnomalyIndices, secondaryColor), // Highlight if *any* related anomaly
                                        pointRadius: pointRadiusCallback(arRevenueAnomalyIndices),
                                        pointHoverRadius: pointHoverRadiusCallback(arRevenueAnomalyIndices),
                                        pointBorderColor: pointStyleCallback(arRevenueAnomalyIndices, secondaryColor)
                                    },
                                    createAnomalyLegend() // Legend for the anomaly highlight color
                                ]
                            },
                            options: arChartOptions
                        });

                    } catch (error) {  }
                } else {  }

                // --- CFO vs NI Chart (Apply combined anomalies) ---
                const cashFlowCtx = select('#cashFlowChart')?.getContext('2d');
                if (cashFlowCtx) {
                     try {
                        const cashFlowChartOptions = JSON.parse(JSON.stringify(commonChartOptions));
                        cashFlowChartOptions.plugins.annotation = { annotations: {} };

                        cashFlowChartInstance = new Chart(cashFlowCtx, {
                            type: 'line',
                            data: {
                                labels: chartLabels,
                                datasets: [
                                    { // CFO Growth Line
                                        label: 'Op Cash Flow Growth (%)',
                                        data: cfoGrowth,
                                        borderColor: primaryColor,
                                        backgroundColor: 'transparent',
                                        borderWidth: 2,
                                        tension: 0.4,
                                        pointBackgroundColor: pointStyleCallback(cfoNiAnomalyIndices, primaryColor), // Highlight if *any* related anomaly
                                        pointRadius: pointRadiusCallback(cfoNiAnomalyIndices),
                                        pointHoverRadius: pointHoverRadiusCallback(cfoNiAnomalyIndices),
                                        pointBorderColor: pointStyleCallback(cfoNiAnomalyIndices, primaryColor)
                                    },
                                    { // NI Growth Line
                                        label: 'Net Income Growth (%)',
                                        data: niGrowth,
                                        borderColor: secondaryColor,
                                        backgroundColor: 'transparent',
                                        borderWidth: 2,
                                        tension: 0.4,
                                        pointBackgroundColor: pointStyleCallback(cfoNiAnomalyIndices, secondaryColor), // Highlight if *any* related anomaly
                                        pointRadius: pointRadiusCallback(cfoNiAnomalyIndices),
                                        pointHoverRadius: pointHoverRadiusCallback(cfoNiAnomalyIndices),
                                        pointBorderColor: pointStyleCallback(cfoNiAnomalyIndices, secondaryColor)
                                    },
                                    createAnomalyLegend() // Legend for the anomaly highlight color
                                ]
                            },
                            options: cashFlowChartOptions
                        });

                    } catch (error) {  }
                } else {  }

                handleResize();

                showMessage(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });

            } catch (error) {

                showMessage(`<i class="fas fa-exclamation-triangle"></i> ${error.message}`, 'error');
                currentTicker = null;
            } finally {
                 if (searchButton) searchButton.disabled = false;
            }
        };


        const analysisHeaderSearchForm = select('#tickerSearchForm');
        const tickerInput = select('#tickerInput');
        if (analysisHeaderSearchForm && tickerInput) {
            analysisHeaderSearchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const ticker = tickerInput.value;
                if (ticker && ticker.toUpperCase() !== currentTicker) {
                     loadAnalysisData(ticker);
                     const newUrl = `${window.location.pathname}?ticker=${ticker.toUpperCase()}`;
                     window.history.pushState({path: newUrl}, '', newUrl);
                } else if (!ticker) {
                     showMessage('<i class="fas fa-exclamation-circle"></i> Please enter a ticker symbol.', 'error');
                }

            });
        } else {

        }

        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const isMobile = window.innerWidth <= 768;
                const chartsToResize = [revenueChartInstance, arChartInstance, cashFlowChartInstance];

                chartsToResize.forEach((chart, index) => {
                    if (!chart || !chart.options) return;

                    try {
                        // --- Responsive adjustments (No changes needed here) ---
                        if (chart.options.plugins?.tooltip?.bodyFont) chart.options.plugins.tooltip.bodyFont.size = isMobile ? 11 : 12;
                        if (chart.options.scales?.x?.ticks?.font) chart.options.scales.x.ticks.font.size = isMobile ? 10 : 12;
                        if (chart.options.scales?.y?.title?.font) chart.options.scales.y.title.font.size = isMobile ? 11 : 12;
                        if (chart.options.scales?.y?.ticks?.font) chart.options.scales.y.ticks.font.size = isMobile ? 10 : 11;
                        if (chart.options.plugins?.legend?.labels?.font) chart.options.plugins.legend.labels.font.size = 10;
                        if (chart.options.plugins?.legend?.labels) {
                            chart.options.plugins.legend.labels.boxWidth = 8;
                            chart.options.plugins.legend.labels.boxHeight = 8;
                        }
                        if (chart.options.plugins?.annotation?.annotations) {
                            Object.values(chart.options.plugins.annotation.annotations).forEach(anno => {
                                if (anno.type === 'label' && anno.font) {
                                    anno.font.size = isMobile ? 9 : 10;
                                }
                            });
                        }
                        // --- End Responsive adjustments ---

                        chart.resize();
                        chart.update('none');
                    } catch(error) {

                    }
                });
                 if (chartsToResize.some(c => c)) { }
            }, 250);
        };
        window.addEventListener('resize', handleResize);


        const urlParams = new URLSearchParams(window.location.search);
        const tickerParam = urlParams.get('ticker');

        if (tickerParam && tickerInput) {
            tickerInput.value = tickerParam.toUpperCase();
        }

        loadAnalysisData(tickerParam ? tickerParam.toUpperCase() : DEFAULT_TICKER);

    });
}
