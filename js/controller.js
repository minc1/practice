/**
 * ForensicFinancials Controllers
 * Application logic controllers that use the component system
 */

// UI State Manager
class UIStateManager {
    constructor() {
      this.messageComponent = null;
      this.mainContent = null;
      this.init();
    }
    
    init() {
      // Initialize message component
      const messageArea = document.getElementById('loading-error-message');
      if (messageArea) {
        this.messageComponent = ComponentRegistry.register(
          'messageComponent',
          new MessageComponent('#loading-error-message')
        );
      }
      
      this.mainContent = document.getElementById('main-content');
      
      // Handle loading/error messages
      EventBus.subscribe('ui:loading', message => this.showMessage(message, 'loading'));
      EventBus.subscribe('ui:error', message => this.showMessage(message, 'error'));
      
      // Handle responsive behavior
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => this.handleResize(), 250);
      });
      
      // Initialize header behavior
      this.initHeader();
      
      // Initialize mobile menu
      this.initMobileMenu();
      
      // Initialize back-to-top button
      this.initBackToTop();
    }
    
    showMessage(message, type = 'loading') {
      if (!this.messageComponent || !this.mainContent) return;
      
      const isShowing = this.messageComponent.showMessage(message, type);
      
      if (isShowing) {
        this.mainContent.style.display = 'none';
      } else {
        this.mainContent.style.display = 'block';
      }
    }
    
    handleResize() {
      const viewportData = {
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth <= 768
      };
      
      EventBus.publish('ui:resize', viewportData);
      
      // Update header height for mobile menu
      const navLinks = document.querySelector('.nav-links');
      if (navLinks && navLinks.classList.contains('show')) {
        const headerHeight = document.getElementById('header')?.offsetHeight || 61;
        navLinks.style.top = `${headerHeight}px`;
      }
    }
    
    initHeader() {
      const header = document.getElementById('header');
      if (!header) return;
      
      const headerScrolled = () => {
        if (window.scrollY > 50) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      };
      
      window.addEventListener('load', headerScrolled);
      window.addEventListener('scroll', headerScrolled);
    }
    
    initMobileMenu() {
      const mobileMenuButton = document.querySelector('.mobile-menu');
      const navLinks = document.querySelector('.nav-links');
      const mobileMenuIcon = document.querySelector('.mobile-menu i');
      
      if (!mobileMenuButton || !navLinks || !mobileMenuIcon) return;
      
      mobileMenuButton.addEventListener('click', () => {
        navLinks.classList.toggle('show');
        mobileMenuIcon.classList.toggle('fa-bars');
        mobileMenuIcon.classList.toggle('fa-times');
        mobileMenuButton.setAttribute('aria-expanded', navLinks.classList.contains('show'));
        
        const headerHeight = document.getElementById('header')?.offsetHeight || 61;
        navLinks.style.top = `${headerHeight}px`;
      });
      
      // Close mobile menu when a link is clicked
      const navLinkElements = navLinks.querySelectorAll('a');
      navLinkElements.forEach(link => {
        link.addEventListener('click', (e) => {
          // Check if the link is internal or external
          const href = link.getAttribute('href');
          const isInternalLink = href && href.startsWith('#');
          
          // Only close if it's an internal link on the same page OR if mobile menu is open
          if (navLinks.classList.contains('show') && (isInternalLink || !href || href === '#')) {
            // If it's just a # or empty href, prevent default jump
            if (!isInternalLink || href === '#') {
              e.preventDefault();
            }
            
            navLinks.classList.remove('show');
            mobileMenuIcon.classList.remove('fa-times');
            mobileMenuIcon.classList.add('fa-bars');
            mobileMenuButton.setAttribute('aria-expanded', 'false');
          } else if (navLinks.classList.contains('show') && !isInternalLink) {
            // If it's an external link and menu is open, allow navigation but close menu visually first
            navLinks.classList.remove('show');
            mobileMenuIcon.classList.remove('fa-times');
            mobileMenuIcon.classList.add('fa-bars');
            mobileMenuButton.setAttribute('aria-expanded', 'false');
          }
        });
      });
    }
    
    initBackToTop() {
      const backToTopButton = document.querySelector('.back-to-top');
      if (!backToTopButton) return;
      
      const toggleBackToTop = () => {
        if (window.scrollY > 300) {
          backToTopButton.classList.add('visible');
        } else {
          backToTopButton.classList.remove('visible');
        }
      };
      
      window.addEventListener('load', toggleBackToTop);
      window.addEventListener('scroll', toggleBackToTop);
      
      backToTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }
  
  // Analysis Controller
  class AnalysisController {
    constructor() {
      this.currentTicker = null;
      this.components = {
        charts: {},
        dynamicContent: {},
        tables: {}
      };
      
      // Constants
      this.DEFAULT_TICKER = 'AAPL';
      this.DATA_PATH = 'DATA/';
      this.DIVERGENCE_THRESHOLD = 30.0;
      
      // Chart styling
      this.chartColors = {
        divergence: '#c5817e',
        primary: '#c5a47e',
        secondary: '#1c2541',
        muted: '#6c757d'
      };
      
      this.init();
    }
    
    init() {
      // Check if we're on the analysis page
      if (!document.getElementById('main-content')) return;
      
      // Register event listeners
      EventBus.subscribe('ui:resize', data => this.handleResize(data));
      
      // Initialize components
      this.initDynamicContent();
      this.initCharts();
      
      // Setup search form
      this.initSearchForm();
      
      // Handle browser back/forward navigation
      window.addEventListener('popstate', (event) => {
        const urlParams = new URLSearchParams(window.location.search);
        const tickerParam = urlParams.get('ticker');
        const targetTicker = tickerParam ? tickerParam.toUpperCase() : this.DEFAULT_TICKER;
        
        if (targetTicker !== this.currentTicker) {
          this.loadAnalysisData(targetTicker);
          
          const tickerInput = document.getElementById('tickerInput');
          if (tickerInput) tickerInput.value = targetTicker;
        }
      });
      
      // Initial load
      const urlParams = new URLSearchParams(window.location.search);
      const tickerParam = urlParams.get('ticker');
      const initialTicker = tickerParam ? tickerParam.toUpperCase() : this.DEFAULT_TICKER;
      
      const tickerInput = document.getElementById('tickerInput');
      if (tickerInput) {
        tickerInput.value = initialTicker;
      }
      
      this.loadAnalysisData(initialTicker);
    }
    
    initDynamicContent() {
      // Initialize dynamic content components
      const dynamicElements = document.querySelectorAll('[data-dynamic]');
      
      dynamicElements.forEach(element => {
        const key = element.getAttribute('data-dynamic');
        const property = element.tagName === 'META' ? 'content' : 
                        (key.includes('title') || key.includes('subtitle')) ? 'innerHTML' : 'textContent';
        
        this.components.dynamicContent[key] = ComponentRegistry.register(
          `dynamic-${key}`,
          new DynamicContentComponent(element, {
            property
          })
        );
      });
    }
    
    initCharts() {
      if (typeof Chart === 'undefined') {
        EventBus.publish('ui:error', '<i class="fas fa-exclamation-triangle"></i> Chart library failed to load. Please refresh.');
        return;
      }
      
      if (typeof ChartAnnotation === 'undefined') {
        console.warn('Chartjs-plugin-annotation not loaded. Annotations will not be displayed.');
      } else {
        try {
          Chart.register(ChartAnnotation);
        } catch (error) {
          console.error("Error registering ChartAnnotation plugin:", error);
        }
      }
      
      // Common chart options
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
      
      // Initialize Revenue Chart
      const revenueChartEl = document.getElementById('revenueChart');
      if (revenueChartEl) {
        this.components.charts.revenue = ComponentRegistry.register(
          'revenueChart',
          new ChartComponent('#revenueChart', {
            title: 'Revenue Growth Trend (Annual)',
            type: 'line',
            data: {
              labels: [],
              datasets: [{
                label: 'Annual Revenue Growth (%)',
                data: [],
                borderColor: this.chartColors.primary,
                backgroundColor: 'rgba(197, 164, 126, 0.1)',
                borderWidth: 2.5,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: this.chartColors.primary,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBorderColor: this.chartColors.primary
              }]
            },
            options: JSON.parse(JSON.stringify(commonChartOptions))
          })
        );
        this.components.charts.revenue.mount();
      }
      
      // Initialize AR Chart
      const arChartEl = document.getElementById('arChart');
      if (arChartEl) {
        const arChartOptions = JSON.parse(JSON.stringify(commonChartOptions));
        
        // Custom legend generator for AR chart
        arChartOptions.plugins.legend.labels.generateLabels = (chart) => {
          const defaultLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
          defaultLabels.forEach(label => {
            if (label.datasetIndex === 1) { // A/R Growth
              label.fillStyle = this.chartColors.secondary;
              label.strokeStyle = this.chartColors.secondary;
            } else if (label.datasetIndex === 2) { // Divergence Legend
              label.fillStyle = this.chartColors.divergence;
              label.strokeStyle = this.chartColors.divergence;
            }
          });
          
          // Filter out the dummy 'Divergence' dataset from the legend if no points highlighted
          const arDivergenceIndices = this.state?.arDivergenceIndices || [];
          if (arDivergenceIndices.length === 0) {
            return defaultLabels.filter(label => label.datasetIndex !== 2);
          }
          return defaultLabels;
        };
        
        this.components.charts.ar = ComponentRegistry.register(
          'arChart',
          new ChartComponent('#arChart', {
            title: 'Revenue vs. Accounts Receivable Growth (Annual)',
            type: 'line',
            data: {
              labels: [],
              datasets: [
                {
                  label: 'Revenue Growth (%)',
                  data: [],
                  borderColor: this.chartColors.primary,
                  backgroundColor: 'transparent',
                  borderWidth: 2,
                  tension: 0.4,
                  pointBackgroundColor: this.chartColors.primary,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  pointBorderColor: this.chartColors.primary
                },
                {
                  label: 'A/R Growth (%)',
                  data: [],
                  borderColor: this.chartColors.secondary,
                  backgroundColor: 'transparent',
                  borderWidth: 2,
                  tension: 0.4,
                  pointBackgroundColor: this.chartColors.secondary,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  pointBorderColor: this.chartColors.secondary
                },
                {
                  label: 'Divergence',
                  pointStyle: 'rectRot',
                  pointRadius: 5,
                  borderColor: this.chartColors.divergence,
                  backgroundColor: this.chartColors.divergence,
                  borderWidth: 1,
                  data: []
                }
              ]
            },
            options: arChartOptions
          })
        );
        this.components.charts.ar.mount();
      }
      
      // Initialize Cash Flow Chart
      const cashFlowChartEl = document.getElementById('cashFlowChart');
      if (cashFlowChartEl) {
        const cashFlowChartOptions = JSON.parse(JSON.stringify(commonChartOptions));
        
        // Custom legend generator for Cash Flow chart
        cashFlowChartOptions.plugins.legend.labels.generateLabels = (chart) => {
          const defaultLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
          defaultLabels.forEach(label => {
            if (label.datasetIndex === 1) { // Net Income Growth
              label.fillStyle = this.chartColors.secondary;
              label.strokeStyle = this.chartColors.secondary;
            } else if (label.datasetIndex === 2) { // Divergence Legend
              label.fillStyle = this.chartColors.divergence;
              label.strokeStyle = this.chartColors.divergence;
            }
          });
          
          // Filter out the dummy 'Divergence' dataset from the legend if no points highlighted
          const cfDivergenceIndices = this.state?.cfDivergenceIndices || [];
          if (cfDivergenceIndices.length === 0) {
            return defaultLabels.filter(label => label.datasetIndex !== 2);
          }
          return defaultLabels;
        };
        
        this.components.charts.cashFlow = ComponentRegistry.register(
          'cashFlowChart',
          new ChartComponent('#cashFlowChart', {
            title: 'Operating Cash Flow vs. Net Income Growth (Annual)',
            type: 'line',
            data: {
              labels: [],
              datasets: [
                {
                  label: 'Op Cash Flow Growth (%)',
                  data: [],
                  borderColor: this.chartColors.primary,
                  backgroundColor: 'transparent',
                  borderWidth: 2,
                  tension: 0.4,
                  pointBackgroundColor: this.chartColors.primary,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  pointBorderColor: this.chartColors.primary
                },
                {
                  label: 'Net Income Growth (%)',
                  data: [],
                  borderColor: this.chartColors.secondary,
                  backgroundColor: 'transparent',
                  borderWidth: 2,
                  tension: 0.4,
                  pointBackgroundColor: this.chartColors.secondary,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  pointBorderColor: this.chartColors.secondary
                },
                {
                  label: 'Divergence',
                  pointStyle: 'rectRot',
                  pointRadius: 5,
                  borderColor: this.chartColors.divergence,
                  backgroundColor: this.chartColors.divergence,
                  borderWidth: 1,
                  data: []
                }
              ]
            },
            options: cashFlowChartOptions
          })
        );
        this.components.charts.cashFlow.mount();
      }
    }
    
    initSearchForm() {
      const searchForm = document.getElementById('tickerSearchForm');
      const tickerInput = document.getElementById('tickerInput');
      
      if (searchForm && tickerInput) {
        searchForm.addEventListener('submit', (e) => {
          e.preventDefault();
          
          const ticker = tickerInput.value;
          if (ticker && ticker.toUpperCase() !== this.currentTicker) {
            this.loadAnalysisData(ticker);
            
            // Update URL without full page reload
            const newUrl = `${window.location.pathname}?ticker=${ticker.toUpperCase()}`;
            window.history.pushState({path: newUrl}, '', newUrl);
          } else if (!ticker) {
            console.warn("Ticker input is empty.");
          }
        });
      }
    }
    
    async loadAnalysisData(ticker) {
      ticker = ticker.trim().toUpperCase();
      if (!ticker) {
        EventBus.publish('ui:error', '<i class="fas fa-exclamation-circle"></i> Please enter a ticker symbol.');
        return;
      }
      
      EventBus.publish('ui:loading', `<i class="fas fa-spinner fa-spin"></i> Loading analysis for ${ticker}...`);
      
      // Clear existing chart data
      this.destroyCharts();
      
      const searchButton = document.querySelector('#tickerSearchForm button');
      if (searchButton) searchButton.disabled = true;
      
      try {
        const response = await fetch(`${this.DATA_PATH}${ticker}.json`);
        
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
        
        this.currentTicker = ticker;
        this.updateUI(data);
        
        EventBus.publish('ui:loading', null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
      } catch (error) {
        console.error("Error loading analysis data:", error);
        EventBus.publish('ui:error', `<i class="fas fa-exclamation-triangle"></i> ${error.message}`);
        this.currentTicker = null;
        
        // Clear dynamic fields on error
        this.clearDynamicContent();
      } finally {
        if (searchButton) searchButton.disabled = false;
      }
    }
    
    updateUI(data) {
      // Update dynamic content
      this.updateDynamicContent(data);
      
      // Update cards
      this.updateCards(data);
      
      // Update table
      this.updateTable(data);
      
      // Update monitoring points list
      this.updateMonitoringPoints(data);
      
      // Update verdict paragraphs
      this.updateVerdictParagraphs(data);
      
      // Update charts
      this.updateCharts(data);
    }
    
    updateDynamicContent(data) {
      const dynamicContent = this.components.dynamicContent;
      
      // Update page title
      if (dynamicContent['page-title']) {
        dynamicContent['page-title'].updateContent(data.company?.pageTitle || `ForensicFinancials | ${this.currentTicker} Analysis`);
      }
      
      // Update hero title
      if (dynamicContent['hero-title']) {
        dynamicContent['hero-title'].updateContent(`${data.company?.name || this.currentTicker} (${data.company?.ticker || this.currentTicker})<br>${data.company?.analysisTitle || 'Financial Analysis'}`);
      }
      
      // Update hero subtitle
      if (dynamicContent['hero-subtitle']) {
        dynamicContent['hero-subtitle'].updateContent(data.company?.heroSubtitle || `Analysis details for ${this.currentTicker}.`);
      }
      
      // Update section subtitles
      if (dynamicContent['trends-subtitle']) {
        dynamicContent['trends-subtitle'].updateContent(data.trendAnalysis?.sectionSubtitle || '');
      }
      
      if (dynamicContent['financials-subtitle']) {
        dynamicContent['financials-subtitle'].updateContent(data.financialMetrics?.sectionSubtitle || '');
      }
      
      if (dynamicContent['opportunities-subtitle']) {
        dynamicContent['opportunities-subtitle'].updateContent(data.investmentConsiderations?.sectionSubtitle || '');
      }
      
      if (dynamicContent['conclusion-subtitle']) {
        dynamicContent['conclusion-subtitle'].updateContent(data.conclusion?.sectionSubtitle || '');
      }
      
      // Update verdict information
      if (dynamicContent['verdict-title']) {
        dynamicContent['verdict-title'].updateContent(data.conclusion?.verdictTitle || `Verdict for ${this.currentTicker}`);
      }
      
      if (dynamicContent['verdict-rating']) {
        dynamicContent['verdict-rating'].updateContent(data.conclusion?.verdictRating || 'N/A');
      }
      
      if (dynamicContent['monitoring-title']) {
        dynamicContent['monitoring-title'].updateContent(data.conclusion?.monitoringPointsTitle || 'Key Monitoring Points');
      }
    }
    
    updateCards(data) {
      // Update trends cards
      ComponentFactory.createCardGroup('trends-cards-container', data.trendAnalysis?.cards || []);
      
      // Update financials cards
      ComponentFactory.createCardGroup('financials-cards-container', data.financialMetrics?.cards || []);
    }
    
    updateTable(data) {
      const tableData = data.investmentConsiderations?.tableData || [];
      
      if (!Array.isArray(tableData)) {
        const tbody = document.getElementById('opportunities-table-body');
        if (tbody) {
          tbody.innerHTML = '<tr><td colspan="3" class="error-message" style="color: var(--danger); text-align: center;">Error loading table data.</td></tr>';
        }
        return;
      }
      
      // Transform table data for the component
      const headers = ['Factor', 'Opportunities', 'Risks'];
      const rows = tableData.map(row => [
        row.factor || '-',
        row.opportunities || '-',
        row.risks || '-'
      ]);
      
      // Create or update table
      const tbody = document.getElementById('opportunities-table-body');
      if (tbody) {
        tbody.innerHTML = '';
        
        if (rows.length === 0) {
          tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--muted);">No table data available.</td></tr>';
        } else {
          rows.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td data-label="Factor">${row[0]}</td>
              <td data-label="Opportunities">${row[1]}</td>
              <td data-label="Risks">${row[2]}</td>
            `;
            tbody.appendChild(tr);
          });
        }
      }
    }
    
    updateMonitoringPoints(data) {
      ComponentFactory.createList('monitoring-points-list', data.conclusion?.monitoringPoints || [], true);
    }
    
    updateVerdictParagraphs(data) {
      const paragraphsContainer = document.getElementById('verdict-paragraphs');
      if (paragraphsContainer && Array.isArray(data.conclusion?.paragraphs)) {
        paragraphsContainer.innerHTML = data.conclusion.paragraphs.map(p => `<p>${p || ''}</p>`).join('');
      } else if (paragraphsContainer) {
        paragraphsContainer.innerHTML = '<p>Conclusion details not available.</p>';
      }
    }
    
    updateCharts(data) {
      const chartData = data.chartData || {};
      const chartLabels = chartData.labels || [];
      
      // Calculate divergence indices
      const arDivergenceIndices = this.calculateDivergenceIndices(
        chartData.revenueGrowth,
        chartData.arGrowth,
        this.DIVERGENCE_THRESHOLD
      );
      
      const cfDivergenceIndices = this.calculateDivergenceIndices(
        chartData.cfoGrowth,
        chartData.niGrowth,
        this.DIVERGENCE_THRESHOLD
      );
      
      // Store divergence indices in state
      this.state = {
        arDivergenceIndices,
        cfDivergenceIndices
      };
      
      // Update Revenue Chart
      if (this.components.charts.revenue) {
        this.components.charts.revenue.updateData({
          labels: chartLabels,
          datasets: [{
            label: 'Annual Revenue Growth (%)',
            data: chartData.revenueGrowth || [],
            borderColor: this.chartColors.primary,
            backgroundColor: 'rgba(197, 164, 126, 0.1)',
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: this.chartColors.primary,
            pointRadius: this.getPointRadiusCallback([]),
            pointHoverRadius: this.getPointHoverRadiusCallback([]),
            pointBorderColor: this.chartColors.primary
          }]
        });
      }
      
      // Update AR Chart
      if (this.components.charts.ar) {
        // Create annotation objects if available
        const arAnnotations = {};
        
        if (typeof ChartAnnotation !== 'undefined' && chartData.annotations?.arChart && Array.isArray(chartData.annotations.arChart)) {
          chartData.annotations.arChart.forEach((anno, index) => {
            if (typeof anno.xVal === 'number' && typeof anno.yVal === 'number' && anno.content) {
              arAnnotations[`arLabel${index + 1}`] = this.createAnnotationLabel(
                anno.xVal, anno.yVal, anno.content, anno.yAdj, anno.xAdj
              );
            }
          });
        }
        
        // Update chart options with annotations
        const arOptions = JSON.parse(JSON.stringify(this.components.charts.ar.props.options));
        arOptions.plugins.annotation.annotations = arAnnotations;
        this.components.charts.ar.updateOptions(arOptions);
        
        // Update chart data
        this.components.charts.ar.updateData({
          labels: chartLabels,
          datasets: [
            {
              label: 'Revenue Growth (%)',
              data: chartData.revenueGrowth || [],
              borderColor: this.chartColors.primary,
              backgroundColor: 'transparent',
              borderWidth: 2,
              tension: 0.4,
              pointBackgroundColor: this.chartColors.primary,
              pointRadius: this.getPointRadiusCallback([]),
              pointHoverRadius: this.getPointHoverRadiusCallback([]),
              pointBorderColor: this.chartColors.primary
            },
            {
              label: 'A/R Growth (%)',
              data: chartData.arGrowth || [],
              borderColor: this.chartColors.secondary,
              backgroundColor: 'transparent',
              borderWidth: 2,
              tension: 0.4,
              pointBackgroundColor: this.getPointStyleCallback(arDivergenceIndices, this.chartColors.secondary, this.chartColors.divergence),
              pointRadius: this.getPointRadiusCallback(arDivergenceIndices),
              pointHoverRadius: this.getPointHoverRadiusCallback(arDivergenceIndices),
              pointBorderColor: this.getPointStyleCallback(arDivergenceIndices, this.chartColors.secondary, this.chartColors.divergence)
            },
            {
              label: 'Divergence',
              pointStyle: 'rectRot',
              pointRadius: 5,
              borderColor: this.chartColors.divergence,
              backgroundColor: this.chartColors.divergence,
              borderWidth: 1,
              data: []
            }
          ]
        });
      }
      
      // Update Cash Flow Chart
      if (this.components.charts.cashFlow) {
        // Create annotation objects if available
        const cfAnnotations = {};
        
        if (typeof ChartAnnotation !== 'undefined' && chartData.annotations?.cashFlowChart && Array.isArray(chartData.annotations.cashFlowChart)) {
          chartData.annotations.cashFlowChart.forEach((anno, index) => {
            if (typeof anno.xVal === 'number' && typeof anno.yVal === 'number' && anno.content) {
              cfAnnotations[`cfLabel${index + 1}`] = this.createAnnotationLabel(
                anno.xVal, anno.yVal, anno.content, anno.yAdj, anno.xAdj
              );
            }
          });
        }
        
        // Update chart options with annotations
        const cfOptions = JSON.parse(JSON.stringify(this.components.charts.cashFlow.props.options));
        cfOptions.plugins.annotation.annotations = cfAnnotations;
        this.components.charts.cashFlow.updateOptions(cfOptions);
        
        // Update chart data
        this.components.charts.cashFlow.updateData({
          labels: chartLabels,
          datasets: [
            {
              label: 'Op Cash Flow Growth (%)',
              data: chartData.cfoGrowth || [],
              borderColor: this.chartColors.primary,
              backgroundColor: 'transparent',
              borderWidth: 2,
              tension: 0.4,
              pointBackgroundColor: this.chartColors.primary,
              pointRadius: this.getPointRadiusCallback([]),
              pointHoverRadius: this.getPointHoverRadiusCallback([]),
              pointBorderColor: this.chartColors.primary
            },
            {
              label: 'Net Income Growth (%)',
              data: chartData.niGrowth || [],
              borderColor: this.chartColors.secondary,
              backgroundColor: 'transparent',
              borderWidth: 2,
              tension: 0.4,
              pointBackgroundColor: this.getPointStyleCallback(cfDivergenceIndices, this.chartColors.secondary, this.chartColors.divergence),
              pointRadius: this.getPointRadiusCallback(cfDivergenceIndices),
              pointHoverRadius: this.getPointHoverRadiusCallback(cfDivergenceIndices),
              pointBorderColor: this.getPointStyleCallback(cfDivergenceIndices, this.chartColors.secondary, this.chartColors.divergence)
            },
            {
              label: 'Divergence',
              pointStyle: 'rectRot',
              pointRadius: 5,
              borderColor: this.chartColors.divergence,
              backgroundColor: this.chartColors.divergence,
              borderWidth: 1,
              data: []
            }
          ]
        });
      }
      
      // Handle resize for initial display
      this.handleResize({ isMobile: window.innerWidth <= 768 });
    }
    
    clearDynamicContent() {
      // Clear page title
      if (this.components.dynamicContent['page-title']) {
        this.components.dynamicContent['page-title'].updateContent('ForensicFinancials | Error');
      }
      
      // Clear hero title
      if (this.components.dynamicContent['hero-title']) {
        this.components.dynamicContent['hero-title'].updateContent('Error Loading Analysis');
      }
      
      // Clear hero subtitle
      if (this.components.dynamicContent['hero-subtitle']) {
        this.components.dynamicContent['hero-subtitle'].updateContent('Could not load data.');
      }
      
      // Clear cards
      const trendsCardsContainer = document.getElementById('trends-cards-container');
      if (trendsCardsContainer) trendsCardsContainer.innerHTML = '';
      
      const financialsCardsContainer = document.getElementById('financials-cards-container');
      if (financialsCardsContainer) financialsCardsContainer.innerHTML = '';
      
      // Clear table
      const opportunitiesTableBody = document.getElementById('opportunities-table-body');
      if (opportunitiesTableBody) opportunitiesTableBody.innerHTML = '<tr><td colspan="3">Error loading data.</td></tr>';
      
      // Clear verdict paragraphs
      const verdictParagraphs = document.getElementById('verdict-paragraphs');
      if (verdictParagraphs) verdictParagraphs.innerHTML = '';
      
      // Clear monitoring points
      const monitoringPointsList = document.getElementById('monitoring-points-list');
      if (monitoringPointsList) monitoringPointsList.innerHTML = '';
    }
    
    destroyCharts() {
      // Destroy chart instances
      Object.values(this.components.charts).forEach(chart => {
        if (chart && chart.chartInstance) {
          chart.chartInstance.destroy();
        }
      });
    }
    
    handleResize(data) {
      const isMobile = data.isMobile;
      
      // Update chart options based on screen size
      Object.values(this.components.charts).forEach(chart => {
        if (!chart || !chart.props.options) return;
        
        try {
          const options = JSON.parse(JSON.stringify(chart.props.options));
          
          // Update common options based on size
          if (options.plugins?.tooltip?.bodyFont) {
            options.plugins.tooltip.bodyFont.size = isMobile ? 11 : 12;
          }
          
          if (options.scales?.x?.ticks?.font) {
            options.scales.x.ticks.font.size = isMobile ? 10 : 12;
          }
          
          if (options.scales?.y?.title?.font) {
            options.scales.y.title.font.size = isMobile ? 11 : 12;
          }
          
          if (options.scales?.y?.ticks?.font) {
            options.scales.y.ticks.font.size = isMobile ? 10 : 11;
          }
          
          // Update annotation label font size if annotation plugin is loaded
          if (typeof ChartAnnotation !== 'undefined' && options.plugins?.annotation?.annotations) {
            Object.values(options.plugins.annotation.annotations).forEach(anno => {
              if (anno.type === 'label' && anno.font) {
                anno.font.size = isMobile ? 9 : 10;
              }
            });
          }
          
          chart.updateOptions(options);
        } catch (error) {
          console.error(`Error resizing chart:`, error);
        }
      });
    }
    
    // Utility methods
    calculateDivergenceIndices(data1, data2, threshold) {
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
    }
    
    createAnnotationLabel(xVal, yVal, content, yAdj = -15, xAdj = 0) {
      return {
        type: 'label',
        xValue: xVal,
        yValue: yVal,
        content: content,
        color: this.chartColors.muted,
        font: {
          size: window.innerWidth <= 768 ? 9 : 10,
          weight: '600'
        },
        position: 'start',
        yAdjust: yAdj,
        xAdjust: xAdj,
        backgroundColor: 'rgba(255,255,255,0.85)',
        padding: {
          top: 3,
          bottom: 3,
          left: 5,
          right: 5
        },
        borderRadius: 4,
        callout: {
          display: true,
          position: 'bottom',
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.1)',
          margin: 5
        }
      };
    }
    
    getPointStyleCallback(indices = [], normalColor, highlightColor) {
      return function(context) {
        return indices.includes(context.dataIndex) ? highlightColor : normalColor;
      };
    }
    
    getPointRadiusCallback(indices = [], normalRadius = 4, highlightRadius = 6) {
      return function(context) {
        return indices.includes(context.dataIndex) ? highlightRadius : normalRadius;
      };
    }
    
    getPointHoverRadiusCallback(indices = [], normalRadius = 6, highlightRadius = 8) {
      return function(context) {
        return indices.includes(context.dataIndex) ? highlightRadius : normalRadius;
      };
    }
  }
