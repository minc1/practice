// script.js

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
    if (element && data !== undefined && data !== null) {
        if (property === 'innerHTML') {
            element.innerHTML = data;
        } else {
            element.textContent = data;
        }
    } else if (element) {
        element.textContent = ''; // Clear if data is missing
        console.warn(`Data not found or null/undefined for selector: ${selector}`);
    } else {
        console.warn(`Element not found for selector: ${selector}`);
    }
};

// Helper function to generate cards dynamically
const generateCards = (containerId, cardData) => {
    const container = select(`#${containerId}`);
    if (!container || !Array.isArray(cardData)) {
        console.error(`Card container #${containerId} not found or invalid data.`);
        if(container) container.innerHTML = '<p class="error-message" style="color: var(--danger); text-align: center;">Error loading card data.</p>';
        return;
    }
    container.innerHTML = ''; // Clear placeholder/previous cards
    cardData.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        // Use template literals for cleaner HTML structure
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
     if (!tbody || !Array.isArray(tableRowData)) {
        console.error(`Table body #${tbodyId} not found or invalid data.`);
         if(tbody) tbody.innerHTML = '<tr><td colspan="3" class="error-message" style="color: var(--danger); text-align: center;">Error loading table data.</td></tr>';
        return;
    }
    tbody.innerHTML = ''; // Clear placeholder
    tableRowData.forEach(row => {
        const tr = document.createElement('tr');
        // Use innerHTML for factor to render potential HTML tags like <strong>
        // Provide fallbacks for missing data
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
    if (!ul || !Array.isArray(listItems)) {
        console.error(`List #${ulId} not found or invalid data.`);
        if(ul) ul.innerHTML = '<li class="error-message" style="color: var(--danger);">Error loading list data.</li>';
        return;
    }
    ul.innerHTML = ''; // Clear placeholder
    listItems.forEach(item => {
        const li = document.createElement('li');
        if (useInnerHTML) {
            li.innerHTML = item || ''; // Use innerHTML if item contains HTML tags
        } else {
            li.textContent = item || '';
        }
        ul.appendChild(li);
    });
};


// --- UI Interaction Logic (Mobile Menu, Header Scroll, Back to Top) ---
// This logic remains independent of the dynamic data loading

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
// Wrap all chart and data loading logic in DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {

    // Check if Chart.js and annotation plugin are loaded
    if (typeof Chart === 'undefined') {
        console.error("Chart.js library not loaded or loaded after this script.");
        // Display error to user?
        return;
    }
    if (typeof ChartAnnotation === 'undefined') {
        console.error("Chartjs-plugin-annotation not loaded or loaded after this script.");
        // Annotations might fail, but charts could still work
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
                        // Hide tooltip for the 'Divergence' legend item dataset
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
            annotation: { // Default structure, annotations added per chart
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
        borderWidth: 1, data: [] // No line data needed for legend item
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

    // --- Color Definitions ---
    const divergenceColor = '#f44336'; // var(--danger)
    const primaryColor = '#c5a47e';    // var(--primary)
    const secondaryColor = '#1c2541';  // var(--secondary)
    const mutedColor = '#6c757d';      // var(--muted)

    // --- Fetch Data and Initialize Page ---
    fetch('data.json') // Fetch the data file
        .then(response => {
            if (!response.ok) {
                // Throw an error if the network response is not OK
                throw new Error(`HTTP error! status: ${response.status} - Could not fetch data.json`);
            }
            return response.json(); // Parse the JSON data
        })
        .then(data => {
            // --- Data Validation (Basic) ---
            if (!data || typeof data !== 'object') {
                throw new Error("Invalid data format received.");
            }
            // Check for essential top-level keys
            const requiredKeys = ['company', 'trendAnalysis', 'financialMetrics', 'investmentConsiderations', 'conclusion', 'chartData'];
            for (const key of requiredKeys) {
                if (!(key in data)) {
                    console.warn(`Warning: Missing top-level key "${key}" in data.json. Some sections might not load correctly.`);
                }
            }


            console.log("Analysis data loaded successfully.");

            // --- Populate Static Content Areas ---
            // Use || '' as fallback for potentially missing data fields
            populateElement('[data-dynamic="page-title"]', data.company?.pageTitle || 'ForensicFinancials Analysis');
            populateElement('[data-dynamic="hero-title"]', `${data.company?.name || 'Company'} (${data.company?.ticker || 'TICKER'})<br>${data.company?.analysisTitle || 'Financial Analysis'}`, 'innerHTML');
            populateElement('[data-dynamic="hero-subtitle"]', data.company?.heroSubtitle || 'Analysis details loading...');

            populateElement('[data-dynamic="trends-subtitle"]', data.trendAnalysis?.sectionSubtitle || '');
            generateCards('trends-cards-container', data.trendAnalysis?.cards || []);

            populateElement('[data-dynamic="financials-subtitle"]', data.financialMetrics?.sectionSubtitle || '');
            generateCards('financials-cards-container', data.financialMetrics?.cards || []);

            populateElement('[data-dynamic="opportunities-subtitle"]', data.investmentConsiderations?.sectionSubtitle || '');
            populateTable('opportunities-table-body', data.investmentConsiderations?.tableData || []);

            populateElement('[data-dynamic="conclusion-subtitle"]', data.conclusion?.sectionSubtitle || '');
            populateElement('[data-dynamic="verdict-title"]', data.conclusion?.verdictTitle || 'Verdict Loading...');
            populateElement('[data-dynamic="verdict-rating"]', data.conclusion?.verdictRating || 'N/A');
            // Populate conclusion paragraphs
            const paragraphsContainer = select('#verdict-paragraphs');
            if (paragraphsContainer && Array.isArray(data.conclusion?.paragraphs)) {
                paragraphsContainer.innerHTML = data.conclusion.paragraphs.map(p => `<p>${p || ''}</p>`).join('');
            } else if (paragraphsContainer) {
                 paragraphsContainer.innerHTML = '<p>Conclusion details not available.</p>';
            }
            populateElement('[data-dynamic="monitoring-title"]', data.conclusion?.monitoringPointsTitle || 'Key Monitoring Points');
            populateList('monitoring-points-list', data.conclusion?.monitoringPoints || [], true); // Use innerHTML for strong tags


            // --- Initialize Charts with Dynamic Data ---
            // Ensure chartData exists before trying to access its properties
            const chartData = data.chartData || {};
            const chartLabels = chartData.labels || [];

            // 1. Revenue Chart
            const revenueCtx = select('#revenueChart')?.getContext('2d');
            if (revenueCtx) {
                try {
                    new Chart(revenueCtx, {
                        type: 'line',
                        data: {
                            labels: chartLabels,
                            datasets: [{
                                label: 'Annual Revenue Growth (%)',
                                data: chartData.revenueGrowth || [],
                                borderColor: primaryColor,
                                backgroundColor: 'rgba(197, 164, 126, 0.1)',
                                borderWidth: 2.5, tension: 0.4, fill: true,
                                pointBackgroundColor: primaryColor,
                                pointRadius: pointRadiusCallback([]), // Use empty array if no specific highlights
                                pointHoverRadius: pointHoverRadiusCallback([]),
                                pointBorderColor: primaryColor
                            }]
                        },
                        options: JSON.parse(JSON.stringify(commonChartOptions)) // Use clone
                    });
                    console.log("Revenue chart initialized.");
                } catch (error) { console.error("Error initializing Revenue Chart:", error); }
            } else { console.warn("Canvas element #revenueChart not found."); }

            // 2. Accounts Receivable vs Revenue Chart
            const arCtx = select('#arChart')?.getContext('2d');
            if (arCtx) {
                try {
                    const arDivergenceIndices = chartData.divergenceIndices?.arChart || [];
                    const arChartOptions = JSON.parse(JSON.stringify(commonChartOptions)); // Deep clone
                    // Dynamically create annotations if they exist
                    arChartOptions.plugins.annotation = { annotations: {} };
                    if (chartData.annotations?.arChart && Array.isArray(chartData.annotations.arChart)) {
                        chartData.annotations.arChart.forEach((anno, index) => {
                            // Validate annotation data before creating
                            if (typeof anno.xVal === 'number' && typeof anno.yVal === 'number' && anno.content) {
                                arChartOptions.plugins.annotation.annotations[`arLabel${index + 1}`] =
                                    createAnnotationLabel(anno.xVal, anno.yVal, anno.content, anno.yAdj, anno.xAdj);
                            } else {
                                console.warn(`Invalid annotation data for arChart at index ${index}`);
                            }
                        });
                    }

                    new Chart(arCtx, {
                        type: 'line',
                        data: {
                            labels: chartLabels,
                            datasets: [
                                {
                                    label: 'Revenue Growth (%)',
                                    data: chartData.revenueGrowth || [],
                                    borderColor: primaryColor, backgroundColor: 'transparent', borderWidth: 2, tension: 0.4,
                                    pointBackgroundColor: primaryColor, pointRadius: pointRadiusCallback([]), pointHoverRadius: pointHoverRadiusCallback([]), pointBorderColor: primaryColor
                                },
                                {
                                    label: 'A/R Growth (%)',
                                    data: chartData.arGrowth || [],
                                    borderColor: secondaryColor, backgroundColor: 'transparent', borderWidth: 2, tension: 0.4,
                                    pointBackgroundColor: pointStyleCallback(arDivergenceIndices, secondaryColor, divergenceColor),
                                    pointRadius: pointRadiusCallback(arDivergenceIndices),
                                    pointHoverRadius: pointHoverRadiusCallback(arDivergenceIndices),
                                    pointBorderColor: pointStyleCallback(arDivergenceIndices, secondaryColor, divergenceColor)
                                },
                                createDivergenceLegend() // Add the legend item for divergence points
                            ]
                        },
                        options: arChartOptions // Use the modified options with annotations
                    });
                    console.log("A/R chart initialized.");
                } catch (error) { console.error("Error initializing A/R Chart:", error); }
            } else { console.warn("Canvas element #arChart not found."); }

            // 3. Operating Cash Flow vs Net Income Chart
            const cashFlowCtx = select('#cashFlowChart')?.getContext('2d');
            if (cashFlowCtx) {
                 try {
                    const cfDivergenceIndices = chartData.divergenceIndices?.cashFlowChart || [];
                    const cashFlowChartOptions = JSON.parse(JSON.stringify(commonChartOptions)); // Deep clone
                    // Dynamically create annotations if they exist
                    cashFlowChartOptions.plugins.annotation = { annotations: {} };
                     if (chartData.annotations?.cashFlowChart && Array.isArray(chartData.annotations.cashFlowChart)) {
                        chartData.annotations.cashFlowChart.forEach((anno, index) => {
                             if (typeof anno.xVal === 'number' && typeof anno.yVal === 'number' && anno.content) {
                                cashFlowChartOptions.plugins.annotation.annotations[`cfLabel${index + 1}`] =
                                    createAnnotationLabel(anno.xVal, anno.yVal, anno.content, anno.yAdj, anno.xAdj);
                             } else {
                                console.warn(`Invalid annotation data for cashFlowChart at index ${index}`);
                             }
                        });
                    }

                    new Chart(cashFlowCtx, {
                        type: 'line',
                        data: {
                            labels: chartLabels,
                            datasets: [
                                {
                                    label: 'Op Cash Flow Growth (%)',
                                    data: chartData.cfoGrowth || [],
                                    borderColor: primaryColor, backgroundColor: 'transparent', borderWidth: 2, tension: 0.4,
                                    pointBackgroundColor: primaryColor, pointRadius: pointRadiusCallback([]), pointHoverRadius: pointHoverRadiusCallback([]), pointBorderColor: primaryColor
                                },
                                {
                                    label: 'Net Income Growth (%)',
                                    data: chartData.niGrowth || [],
                                    borderColor: secondaryColor, backgroundColor: 'transparent', borderWidth: 2, tension: 0.4,
                                    pointBackgroundColor: pointStyleCallback(cfDivergenceIndices, secondaryColor, divergenceColor),
                                    pointRadius: pointRadiusCallback(cfDivergenceIndices),
                                    pointHoverRadius: pointHoverRadiusCallback(cfDivergenceIndices),
                                    pointBorderColor: pointStyleCallback(cfDivergenceIndices, secondaryColor, divergenceColor)
                                },
                                createDivergenceLegend() // Add the legend item
                            ]
                        },
                        options: cashFlowChartOptions // Use the modified options
                    });
                    console.log("Cash Flow chart initialized.");
                } catch (error) { console.error("Error initializing Cash Flow Chart:", error); }
            } else { console.warn("Canvas element #cashFlowChart not found."); }

            // --- Responsive Chart Adjustments ---
            // Debounced resize handler to update chart elements for different screen sizes
            let resizeTimeout;
            const handleResize = () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    const isMobile = window.innerWidth <= 768;
                    const charts = Chart.instances; // Get all active Chart.js instances

                    for (const id in charts) {
                        const chart = charts[id];
                        if (!chart || !chart.options) continue; // Skip if chart or options are invalid

                        // Adjust font sizes based on screen width
                        if (chart.options.plugins?.tooltip?.bodyFont) chart.options.plugins.tooltip.bodyFont.size = isMobile ? 11 : 12;
                        if (chart.options.scales?.x?.ticks?.font) chart.options.scales.x.ticks.font.size = isMobile ? 10 : 12;
                        if (chart.options.scales?.y?.title?.font) chart.options.scales.y.title.font.size = isMobile ? 11 : 12;
                        if (chart.options.scales?.y?.ticks?.font) chart.options.scales.y.ticks.font.size = isMobile ? 10 : 11;
                        if (chart.options.plugins?.legend?.labels?.font) chart.options.plugins.legend.labels.font.size = 10; // Keep legend font small
                        if (chart.options.plugins?.legend?.labels) { // Keep legend boxes small
                            chart.options.plugins.legend.labels.boxWidth = 8;
                            chart.options.plugins.legend.labels.boxHeight = 8;
                        }

                        // Adjust annotation label font size dynamically
                        if (chart.options.plugins?.annotation?.annotations) {
                            Object.values(chart.options.plugins.annotation.annotations).forEach(anno => {
                                if (anno.type === 'label' && anno.font) {
                                    anno.font.size = isMobile ? 9 : 10;
                                }
                            });
                        }

                        try {
                            // Resize and update the chart without animation for responsiveness
                            chart.resize();
                            chart.update('none');
                        } catch(error) {
                            console.error(`Error resizing/updating chart ${id}:`, error);
                        }
                    }
                    console.log("Charts resized/updated for responsiveness.");
                }, 250); // Debounce resize event for performance
            };

            window.addEventListener('resize', handleResize);
            // Optional: Trigger resize handler once initially if needed after data load
            // handleResize();

        })
        .catch(error => {
            // --- Graceful Error Handling ---
            console.error('Failed to load or process analysis data:', error);
            // Display a user-friendly error message on the page instead of a blank screen
            const body = select('body');
            if (body) {
                 // Replace entire body content with an error message
                 body.innerHTML = `<div style="padding: 50px; text-align: center; color: var(--danger); background-color: var(--light); min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                                    <h1><i class="fas fa-exclamation-triangle"></i> Error Loading Analysis</h1>
                                    <p style="margin-top: 15px; color: var(--text);">Could not load the required analysis data. Please check the data file path and format, or try again later.</p>
                                    <p style="margin-top: 10px;"><small style="color: var(--muted);">${error.message}</small></p>
                                  </div>`;
            }
        });

}); // End DOMContentLoaded Wrapper