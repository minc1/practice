const DEFAULT_TICKER = 'AAPL';
const DATA_PATH = 'DATA/';
const DIVERGENCE_THRESHOLD = 25.0;

let currentTicker = null;
let revenueChartInstance = null;
let arChartInstance = null;
let cashFlowChartInstance = null;

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

const calculateDivergenceIndices = (data1, data2, threshold) => {
    if (!Array.isArray(data1) || !Array.isArray(data2) || data1.length !== data2.length) {
        return [];
    }
    const indices = [];
    for (let i = 0; i < data1.length; i++) {
        const val1 = data1[i];
        const val2 = data2[i];
        if (typeof val1 === 'number' && typeof val2 === 'number' && !isNaN(val1) && !isNaN(val2)) {
            if (Math.abs(val1 - val2) > threshold) {
                indices.push(i);
            }
        }
    }
    return indices;
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

        const divergenceColor = '#c5817e';
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

                const chartData = data.chartData || {};
                const chartLabels = chartData.labels || [];

                const arDivergenceIndices = calculateDivergenceIndices(
                    chartData.revenueGrowth,
                    chartData.arGrowth,
                    DIVERGENCE_THRESHOLD
                );
                const cfDivergenceIndices = calculateDivergenceIndices(
                    chartData.cfoGrowth,
                    chartData.niGrowth,
                    DIVERGENCE_THRESHOLD
                );

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
                    } catch (error) { }
                } else { }

                const arCtx = select('#arChart')?.getContext('2d');
                if (arCtx) {
                    try {
                        const arChartOptions = JSON.parse(JSON.stringify(commonChartOptions));
                        arChartOptions.plugins.annotation = { annotations: {} };
                        if (chartData.annotations?.arChart && Array.isArray(chartData.annotations.arChart)) {
                            chartData.annotations.arChart.forEach((anno, index) => {
                                if (typeof anno.xVal === 'number' && typeof anno.yVal === 'number' && anno.content) {
                                    arChartOptions.plugins.annotation.annotations[`arLabel${index + 1}`] =
                                        createAnnotationLabel(anno.xVal, anno.yVal, anno.content, anno.yAdj, anno.xAdj);
                                } else { }
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
                    } catch (error) { }
                } else { }

                const cashFlowCtx = select('#cashFlowChart')?.getContext('2d');
                if (cashFlowCtx) {
                     try {
                        const cashFlowChartOptions = JSON.parse(JSON.stringify(commonChartOptions));
                        cashFlowChartOptions.plugins.annotation = { annotations: {} };
                         if (chartData.annotations?.cashFlowChart && Array.isArray(chartData.annotations.cashFlowChart)) {
                            chartData.annotations.cashFlowChart.forEach((anno, index) => {
                                 if (typeof anno.xVal === 'number' && typeof anno.yVal === 'number' && anno.content) {
                                    cashFlowChartOptions.plugins.annotation.annotations[`cfLabel${index + 1}`] =
                                        createAnnotationLabel(anno.xVal, anno.yVal, anno.content, anno.yAdj, anno.xAdj);
                                 } else { }
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
                    } catch (error) { }
                } else { }

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

                        chart.resize();
                        chart.update('none');
                    } catch(error) {
                    }
                });
                 if (chartsToResize.some(c => c)) {}
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
