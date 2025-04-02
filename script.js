const DEFAULT_TICKER = 'AAPL';
const DATA_PATH = 'DATA/';
let currentTicker = null;
let revenueChartInstance = null;
let arChartInstance = null;
let cashFlowChartInstance = null;

const isAnalysisPage = window.location.pathname.includes('analysis.html');
const isLandingPage = !isAnalysisPage;

// --- Helper Functions (select, on, onScroll, populateElement, etc. - unchanged) ---
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
            console.warn(`Data not found or null/undefined for selector: ${selector}`);
        }
    } else {
        // console.warn(`Element with selector "${selector}" not found.`); // Optional: Less verbose logging
    }
};

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
        console.error(`Table body #${tbodyId} not found.`);
        return;
    }
    if (!Array.isArray(tableRowData)) {
        console.error(`Invalid table data for #${tbodyId}. Expected array.`);
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
        console.error(`List #${ulId} not found.`);
        return;
    }
    if (!Array.isArray(listItems)) {
        console.error(`Invalid list data for #${ulId}. Expected array.`);
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
    console.log("Previous chart instances destroyed.");
};

// --- Event Listeners (Mobile Menu, Search Forms, Header Scroll, Back to Top - unchanged) ---
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

// --- Analysis Page Logic ---
if (isAnalysisPage) {
    document.addEventListener('DOMContentLoaded', function() {

        // --- Chart.js and Plugin Checks (unchanged) ---
        if (typeof Chart === 'undefined') {
            console.error("Chart.js library not loaded.");
            showMessage('<i class="fas fa-exclamation-triangle"></i> Chart library failed to load. Please refresh.', 'error');
            return;
        }
        if (typeof ChartAnnotation === 'undefined') {
            console.error("Chartjs-plugin-annotation not loaded.");
        }

        try {
            if (typeof ChartAnnotation !== 'undefined') {
                 Chart.register(ChartAnnotation);
                 console.log("Chartjs-plugin-annotation registered successfully.");
            }
        } catch (error) {
            console.error("Error registering Chartjs-plugin-annotation:", error);
        }

        // --- Chart Configuration (unchanged) ---
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
                            if (context.dataset.label === 'Divergence') return null; // Hide tooltip for the dummy legend item
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
                annotation: { // Default annotation object
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

        const divergenceColor = '#c5817e'; // Danger color for divergence
        const primaryColor = '#c5a47e';
        const secondaryColor = '#1c2541';
        const mutedColor = '#6c757d';

        // --- Chart Helper Functions (unchanged) ---
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
            borderWidth: 1, data: [] // Dummy data, just for legend
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

        // --- Main Data Loading and Processing Function ---
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

                if (!data || typeof data !== 'object') {
                    throw new Error(`Invalid data format received for ticker "${ticker}".`);
                }

                console.log(`Analysis data for ${ticker} loaded successfully.`);
                currentTicker = ticker;

                // --- Populate Static Page Elements (unchanged) ---
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

                // --- Chart Data Preparation ---
                const chartData = data.chartData || {};
                const chartLabels = chartData.labels || [];
                const revenueGrowth = chartData.revenueGrowth || [];
                const arGrowth = chartData.arGrowth || [];
                const cfoGrowth = chartData.cfoGrowth || [];
                const niGrowth = chartData.niGrowth || [];

                // --- *** NEW: Divergence Calculation *** ---
                const AR_DIVERGENCE_THRESHOLD = 15.0;
                const NI_CFO_DIVERGENCE_THRESHOLD = 30.0;

                let arDivergenceIndices = [];
                let arAnnotations = {};
                let cfDivergenceIndices = [];
                let cfAnnotations = {};

                chartLabels.forEach((year, index) => {
                    // A/R vs Revenue Divergence Check
                    if (revenueGrowth[index] !== undefined && arGrowth[index] !== undefined) {
                        const diff = Math.abs(arGrowth[index] - revenueGrowth[index]);
                        if (diff >= AR_DIVERGENCE_THRESHOLD) {
                            arDivergenceIndices.push(index);
                            // Create annotation for this divergence point
                            arAnnotations[`arDiv${index}`] = createAnnotationLabel(
                                index, // xValue (index)
                                arGrowth[index], // yValue (A/R growth rate)
                                [`A/R Divergence`, `(${year})`], // Content
                                -20 // yAdjust slightly more
                            );
                            console.log(`A/R Divergence detected for ${year} (Index ${index}): AR ${arGrowth[index]}%, Rev ${revenueGrowth[index]}%, Diff ${diff.toFixed(1)}%`);
                        }
                    }

                    // NI vs CFO Divergence Check
                    if (niGrowth[index] !== undefined && cfoGrowth[index] !== undefined) {
                        const diff = Math.abs(niGrowth[index] - cfoGrowth[index]);
                        if (diff >= NI_CFO_DIVERGENCE_THRESHOLD) {
                            cfDivergenceIndices.push(index);
                            // Create annotation for this divergence point
                            cfAnnotations[`cfDiv${index}`] = createAnnotationLabel(
                                index, // xValue (index)
                                niGrowth[index], // yValue (NI growth rate)
                                [`NI/CFO Divergence`, `(${year})`], // Content
                                -20 // yAdjust slightly more
                            );
                             console.log(`NI/CFO Divergence detected for ${year} (Index ${index}): NI ${niGrowth[index]}%, CFO ${cfoGrowth[index]}%, Diff ${diff.toFixed(1)}%`);
                        }
                    }
                });
                // --- *** End of Divergence Calculation *** ---


                // --- Chart Initialization ---

                // Revenue Chart (No divergence logic needed here)
                const revenueCtx = select('#revenueChart')?.getContext('2d');
                if (revenueCtx) {
                    try {
                        revenueChartInstance = new Chart(revenueCtx, {
                            type: 'line',
                            data: {
                                labels: chartLabels,
                                datasets: [{
                                    label: 'Annual Revenue Growth (%)',
                                    data: revenueGrowth, // Use extracted data
                                    borderColor: primaryColor, backgroundColor: 'rgba(197, 164, 126, 0.1)',
                                    borderWidth: 2.5, tension: 0.4, fill: true,
                                    pointBackgroundColor: primaryColor, pointRadius: pointRadiusCallback([]), // No special highlighting
                                    pointHoverRadius: pointHoverRadiusCallback([]), pointBorderColor: primaryColor
                                }]
                            },
                            options: JSON.parse(JSON.stringify(commonChartOptions)) // Use deep copy
                        });
                        console.log("Revenue chart initialized.");
                    } catch (error) { console.error("Error initializing Revenue Chart:", error); }
                } else { console.warn("Canvas element #revenueChart not found."); }

                // A/R Chart (with calculated divergence)
                const arCtx = select('#arChart')?.getContext('2d');
                if (arCtx) {
                    try {
                        // Create a deep copy of common options and add calculated annotations
                        const arChartOptions = JSON.parse(JSON.stringify(commonChartOptions));
                        arChartOptions.plugins.annotation = { annotations: arAnnotations }; // Add calculated annotations

                        arChartInstance = new Chart(arCtx, {
                            type: 'line',
                            data: {
                                labels: chartLabels,
                                datasets: [
                                    { label: 'Revenue Growth (%)', data: revenueGrowth, borderColor: primaryColor, backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, pointBackgroundColor: primaryColor, pointRadius: pointRadiusCallback([]), pointHoverRadius: pointHoverRadiusCallback([]), pointBorderColor: primaryColor },
                                    {
                                        label: 'A/R Growth (%)',
                                        data: arGrowth,
                                        borderColor: secondaryColor,
                                        backgroundColor: 'transparent',
                                        borderWidth: 2,
                                        tension: 0.4,
                                        // *** Apply calculated divergence highlighting ***
                                        pointBackgroundColor: pointStyleCallback(arDivergenceIndices, secondaryColor, divergenceColor),
                                        pointRadius: pointRadiusCallback(arDivergenceIndices),
                                        pointHoverRadius: pointHoverRadiusCallback(arDivergenceIndices),
                                        pointBorderColor: pointStyleCallback(arDivergenceIndices, secondaryColor, divergenceColor)
                                    },
                                    createDivergenceLegend() // Add the legend item for 'Divergence'
                                ]
                            },
                            options: arChartOptions // Use the options with annotations
                        });
                        console.log("A/R chart initialized with calculated divergence.");
                    } catch (error) { console.error("Error initializing A/R Chart:", error); }
                } else { console.warn("Canvas element #arChart not found."); }

                // Cash Flow Chart (with calculated divergence)
                const cashFlowCtx = select('#cashFlowChart')?.getContext('d');
                if (cashFlowCtx) {
                     try {
                        // Create a deep copy of common options and add calculated annotations
                        const cashFlowChartOptions = JSON.parse(JSON.stringify(commonChartOptions));
                        cashFlowChartOptions.plugins.annotation = { annotations: cfAnnotations }; // Add calculated annotations

                        cashFlowChartInstance = new Chart(cashFlowCtx, {
                            type: 'line',
                            data: {
                                labels: chartLabels,
                                datasets: [
                                    { label: 'Op Cash Flow Growth (%)', data: cfoGrowth, borderColor: primaryColor, backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, pointBackgroundColor: primaryColor, pointRadius: pointRadiusCallback([]), pointHoverRadius: pointHoverRadiusCallback([]), pointBorderColor: primaryColor },
                                    {
                                        label: 'Net Income Growth (%)',
                                        data: niGrowth,
                                        borderColor: secondaryColor,
                                        backgroundColor: 'transparent',
                                        borderWidth: 2,
                                        tension: 0.4,
                                        // *** Apply calculated divergence highlighting ***
                                        pointBackgroundColor: pointStyleCallback(cfDivergenceIndices, secondaryColor, divergenceColor),
                                        pointRadius: pointRadiusCallback(cfDivergenceIndices),
                                        pointHoverRadius: pointHoverRadiusCallback(cfDivergenceIndices),
                                        pointBorderColor: pointStyleCallback(cfDivergenceIndices, secondaryColor, divergenceColor)
                                    },
                                    createDivergenceLegend() // Add the legend item for 'Divergence'
                                ]
                            },
                            options: cashFlowChartOptions // Use the options with annotations
                        });
                        console.log("Cash Flow chart initialized with calculated divergence.");
                    } catch (error) { console.error("Error initializing Cash Flow Chart:", error); }
                } else { console.warn("Canvas element #cashFlowChart not found."); }

                // --- Final Steps (unchanged) ---
                handleResize(); // Adjust chart sizes after creation
                showMessage(null); // Hide loading message
                window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top

            } catch (error) {
                console.error('Failed to load or process analysis data:', error);
                showMessage(`<i class="fas fa-exclamation-triangle"></i> ${error.message}`, 'error');
                currentTicker = null;
            } finally {
                 if (searchButton) searchButton.disabled = false; // Re-enable search button
            }
        };

        // --- Analysis Page Event Listeners (Search Form, Resize - unchanged) ---
        const analysisHeaderSearchForm = select('#tickerSearchForm');
        const tickerInput = select('#tickerInput');
        if (analysisHeaderSearchForm && tickerInput) {
            analysisHeaderSearchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const ticker = tickerInput.value;
                if (ticker && ticker.toUpperCase() !== currentTicker) {
                     loadAnalysisData(ticker);
                     // Update URL without reloading page
                     const newUrl = `${window.location.pathname}?ticker=${ticker.toUpperCase()}`;
                     window.history.pushState({path: newUrl}, '', newUrl);
                } else if (!ticker) {
                     showMessage('<i class="fas fa-exclamation-circle"></i> Please enter a ticker symbol.', 'error');
                }
            });
        } else {
            console.error("Analysis page ticker search form or input element not found.");
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
                        // Adjust font sizes based on screen width
                        if (chart.options.plugins?.tooltip?.bodyFont) chart.options.plugins.tooltip.bodyFont.size = isMobile ? 11 : 12;
                        if (chart.options.scales?.x?.ticks?.font) chart.options.scales.x.ticks.font.size = isMobile ? 10 : 12;
                        if (chart.options.scales?.y?.title?.font) chart.options.scales.y.title.font.size = isMobile ? 11 : 12;
                        if (chart.options.scales?.y?.ticks?.font) chart.options.scales.y.ticks.font.size = isMobile ? 10 : 11;
                        if (chart.options.plugins?.legend?.labels?.font) chart.options.plugins.legend.labels.font.size = 10; // Keep legend font size consistent
                        if (chart.options.plugins?.legend?.labels) { // Keep legend box size consistent
                            chart.options.plugins.legend.labels.boxWidth = 8;
                            chart.options.plugins.legend.labels.boxHeight = 8;
                        }

                        // Adjust annotation font size
                        if (chart.options.plugins?.annotation?.annotations) {
                            Object.values(chart.options.plugins.annotation.annotations).forEach(anno => {
                                if (anno.type === 'label' && anno.font) {
                                    anno.font.size = isMobile ? 9 : 10;
                                }
                            });
                        }

                        chart.resize(); // Resize canvas
                        chart.update('none'); // Update chart without animation
                    } catch(error) {
                        console.error(`Error resizing/updating chart index ${index}:`, error);
                    }
                });
                 if (chartsToResize.some(c => c)) console.log("Charts resized/updated for responsiveness.");
            }, 250); // Debounce resize event
        };
        window.addEventListener('resize', handleResize);

        // --- Initial Load ---
        const urlParams = new URLSearchParams(window.location.search);
        const tickerParam = urlParams.get('ticker');

        // Pre-fill search input if ticker is in URL
        if (tickerParam && tickerInput) {
            tickerInput.value = tickerParam.toUpperCase();
        }

        // Load data for the ticker in URL or default
        loadAnalysisData(tickerParam ? tickerParam.toUpperCase() : DEFAULT_TICKER);

    }); // End DOMContentLoaded
} // End isAnalysisPage