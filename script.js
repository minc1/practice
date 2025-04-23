document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const $$ = sel => document.querySelectorAll(sel);
    const yearEl = $('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    const revealObserver = new IntersectionObserver((entries, ob) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
                ob.unobserve(e.target);
            }
        });
    }, { threshold: 0.12 });
    $$('.reveal').forEach(el => revealObserver.observe(el));
    const menuToggle = $('menuToggle');
    const navLinks = document.querySelector('.nav-links');
    if (menuToggle && navLinks) {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
            menuToggle.setAttribute('aria-expanded', navLinks.classList.contains('open'));
        });
        const links = navLinks.querySelectorAll('.nav-link');
        links.forEach(link => link.addEventListener('click', () => {
            navLinks.classList.remove('open');
            menuToggle.setAttribute('aria-expanded', 'false');
        }));
    }
    const tickerInput = $('ticker');
    if (!tickerInput) return;
    const metricsCfg = [
        { id: 'revenue', label: 'Revenue', key: 'revenue', highlight: 'revenue' },
        { id: 'netIncome', label: 'Net Income', key: 'netIncome', highlight: 'netIncome' },
        { id: 'debtEquity', label: 'Debt/Equity', key: 'debtEquity', ratio: true },
        { id: 'freeCashFlow', label: 'Free Cash Flow', key: 'freeCashFlow', highlight: 'freeCF' },
        { id: 'eps', label: 'Diluted EPS', key: 'eps', decimal: true }
    ];
    const metricEls = {};
    const metricYearEls = [];
    (() => {
        const frag = document.createDocumentFragment();
        metricsCfg.forEach(cfg => {
            const card = document.createElement('div');
            card.className = 'metric-card';
            card.innerHTML = `<span class="metric-label">${cfg.label} (<span class="metric-year"></span>)</span><span class="metric-value" id="${cfg.id}">-</span>`;
            frag.appendChild(card);
            metricEls[cfg.id] = card.querySelector(`#${cfg.id}`);
            metricYearEls.push(...card.querySelectorAll('.metric-year'));
        });
        $('metricsContainer').appendChild(frag);
    })();
    const intl0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
    const intl2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    function currency(v, abbr = false) {
        if (v == null || isNaN(v)) return 'N/A';
        const abs = Math.abs(v);
        let div = 1, suffix = '';
        if (abs >= 1e9) { div = 1e9; suffix = 'B'; }
        else if (abs >= 1e6) { div = 1e6; suffix = 'M'; }
        else if (abbr && abs >= 1e3) { div = 1e3; suffix = 'K'; }
        return '$' + intl0.format(v / div) + suffix;
    }
    const fmt2 = v => (v == null || isNaN(v) ? 'N/A' : intl2.format(v));
    class ChartManager {
        constructor() {
            const css = getComputedStyle(document.documentElement);
            this.palette = [
                css.getPropertyValue('--chart-navy').trim(),
                css.getPropertyValue('--chart-gold').trim(),
                css.getPropertyValue('--chart-gray').trim(),
                css.getPropertyValue('--chart-pastel-gold').trim()
            ];
            this.gridColor = '#6c757d33';
        }
        baseOptions(minVal) {
            return {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        grid: { color: this.gridColor, drawBorder: false },
                        suggestedMin: minVal,
                        ticks: { callback: v => currency(v, true), precision: 0 }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const p = ctx.dataset.label ? ctx.dataset.label + ': ' : '';
                                return p + currency(ctx.raw);
                            }
                        }
                    }
                },
                elements: { line: { tension: 0.35 } }
            };
        }
    }
    const chartMgr = new ChartManager();
    const charts = {};
    // Plugin: ensure 'Net Income' points draw above other datasets
    const netIncomePointPlugin = {
        id: 'netIncomePointPlugin',
        afterDatasetsDraw(chart) {
            // find Net Income series and redraw its line and points on top
            const idx = chart.data.datasets.findIndex(ds => ds.label === 'Net Income');
            if (idx < 0) return;
            const meta = chart.getDatasetMeta(idx);
            // redraw line path above others
            meta.dataset.draw(chart.ctx);
            // redraw points above all
            meta.data.forEach(point => point.draw(chart.ctx));
        }
    };
    Chart.register(netIncomePointPlugin);
    function hexToRGBA(hex, alpha) {
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(h => h + h).join('');
        const r = parseInt(c.substr(0, 2), 16);
        const g = parseInt(c.substr(2, 2), 16);
        const b = parseInt(c.substr(4, 2), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
    function createLineChart({ canvasId, labels, datasets }) {
        charts[canvasId]?.destroy();
        // Style datasets: primary (navy) most prominent with highest order and stronger fill
        const styled = datasets.map((ds, i) => {
            const baseColor = chartMgr.palette[i] || chartMgr.palette[0];
            const alpha = i === 0 ? 0.25 : 0.07;
            
            // Create gradient for all datasets
            let fill = {
                target: 'origin',
                above: (ctx) => {
                    const chart = ctx.chart;
                    const {ctx: context, chartArea} = chart;
                    if (!chartArea) return null;
                    
                    const gradient = context.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                    gradient.addColorStop(0, hexToRGBA(baseColor, 0));
                    gradient.addColorStop(0.5, hexToRGBA(baseColor, 0.15));
                    gradient.addColorStop(1, hexToRGBA(baseColor, 0.3));
                    return gradient;
                },
                below: (ctx) => {
                    const chart = ctx.chart;
                    const {ctx: context, chartArea} = chart;
                    if (!chartArea) return null;
                    
                    const gradient = context.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                    gradient.addColorStop(0, hexToRGBA('#c9302c', 0));
                    gradient.addColorStop(0.5, hexToRGBA('#c9302c', 0.15));
                    gradient.addColorStop(1, hexToRGBA('#c9302c', 0.3));
                    return gradient;
                }
            };
            
            return {
                ...ds,
                borderColor: baseColor,
                pointBackgroundColor: baseColor,
                borderWidth: i === 0 ? 3 : 2,
                yAxisID: 'y',
                pointRadius: 2,
                pointHoverRadius: 5,
                fill,
                order: datasets.length - i
            };
        });
        let maxAbs = 0, minVal = Infinity;
        styled.forEach(d => d.data.forEach(v => {
            const a = Math.abs(v);
            if (a > maxAbs) maxAbs = a;
            if (v < minVal) minVal = v;
        }));
        // If no metrics below zero, start y-axis at 0, else provide slight negative padding
        const yMin = minVal >= 0 ? 0 : Math.min(minVal, -maxAbs * 0.05);
        const ctx = $(canvasId).getContext('2d');
        const chart = new Chart(ctx, { type: 'line', data: { labels, datasets: styled }, options: chartMgr.baseOptions(yMin) });
        // Redraw primary (navy) dataset points on top of all lines
        chart.getDatasetMeta(0).data.forEach(point => point.draw(chart.ctx));
        charts[canvasId] = chart;
        const header = ctx.canvas.closest('.chart-container').querySelector('.chart-header');
        const legend = header.querySelector('.chart-legend') || header.appendChild(document.createElement('div'));
        legend.className = 'chart-legend';
        // Order legend items by dataset.order descending so primary (navy) is on the left
        const legendItems = styled.map((ds, i) => ({ ds, idx: i })).sort((a, b) => b.ds.order - a.ds.order);
        legend.innerHTML = legendItems.map(item => `<div class="chart-legend-item" data-index="${item.idx}"><span class="chart-legend-color" style="background:${item.ds.borderColor}"></span>${item.ds.label}</div>`).join('');
        legend.onclick = e => {
            const item = e.target.closest('.chart-legend-item');
            if (!item) return;
            const idx = +item.dataset.index;
            charts[canvasId].toggleDataVisibility(idx);
            item.classList.toggle('disabled');
            charts[canvasId].update();
        };
    }
    const highlightRules = {
        revenue: v => v > 0 ? 'highlight-positive' : '',
        netIncome: v => v >= 0 ? 'highlight-positive' : 'highlight-negative',
        totalDebt: v => v > 0 ? 'highlight-negative' : '',
        totalEquity: v => v >= 0 ? 'highlight-positive' : 'highlight-negative',
        operatingCF: v => v >= 0 ? 'highlight-positive' : 'highlight-negative',
        freeCF: v => v >= 0 ? 'highlight-positive' : 'highlight-negative'
    };
    function fmtCell(raw, key, formatter = currency) {
        if (raw == null || isNaN(raw)) return 'N/A';
        const baseCls = raw >= 0 ? 'positive-value' : 'negative-value';
        const hl = highlightRules[key]?.(raw) || '';
        return `<span class="${baseCls} ${hl}">${formatter(raw)}</span>`;
    }
    const loadButton = $('loadData');
    const loadingTicker = $('loadingTicker');
    const loadingElm = $('loadingIndicator');
    const dataSection = $('dataContainer');
    const errorElm = $('errorMessage');
    const incomeTableElm = $('incomeTable');
    const balanceTableElm = $('balanceSheetTable');
    const cashTableElm = $('cashFlowTable');
    loadButton.addEventListener('click', loadData);
    tickerInput.addEventListener('keypress', e => { if (e.key === 'Enter') loadData(); });
    async function loadData() {
        const ticker = tickerInput.value.trim().toUpperCase();
        if (!ticker) { showError('Please enter a valid ticker symbol'); return; }
        loadButton.disabled = tickerInput.disabled = true;
        loadingTicker.textContent = ticker;
        loadingElm.style.display = 'flex';
        errorElm.style.display = 'none';
        dataSection.style.display = 'none';
        try {
            const endpoints = ['income_statement_annual','cash_flow_statement_annual','balance_sheet_statement_annual'];
            const [inc, cf, bs] = await Promise.all(endpoints.map(e => fetchJSON(`DATA/${ticker}/${e}.json`)));
            displayData(ticker, inc, cf, bs);
        } catch (err) {
            showError(`Error loading data for ${ticker}: ${err.message}`);
        } finally {
            loadingElm.style.display = 'none';
            loadButton.disabled = tickerInput.disabled = false;
        }
    }
    async function fetchJSON(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Data not found');
        return res.json();
    }
    function displayData(ticker, inc, cf, bs) {
        const sortByYear = (a, b) => a.calendarYear - b.calendarYear;
        [inc, cf, bs].forEach(arr => arr.sort(sortByYear));
        $('companyHeader').textContent = `${ticker} Financial Analysis`;
        const latest = inc.at(-1) || {};
        const latestCash = cf.at(-1) || {};
        const latestBal = bs.at(-1) || {};
        metricYearEls.forEach(el => el.textContent = latest.calendarYear || 'N/A');
        metricEls.revenue.textContent = currency(latest.revenue);
        metricEls.netIncome.textContent = currency(latest.netIncome);
        metricEls.freeCashFlow.textContent = currency(latestCash.freeCashFlow);
        metricEls.debtEquity.textContent = latestBal.totalDebt && latestBal.totalEquity ? fmt2(latestBal.totalDebt / latestBal.totalEquity) : 'N/A';
        metricEls.eps.textContent = fmt2(latest.epsdiluted || latest.eps);
        buildCharts(inc, cf);
        buildTables(inc, cf, bs);
        // Set SEC filing link from latest income statement
        const secLinkEl = $('secLink');
        if (latest.finalLink) {
            secLinkEl.href = latest.finalLink;
            secLinkEl.textContent = `View ${latest.calendarYear || 'Latest'} SEC Filing`;
        } else {
            secLinkEl.href = '#';
            secLinkEl.textContent = 'SEC Filing Unavailable';
        }
        dataSection.style.display = 'block';
    }
    function buildCharts(inc, cf) {
        const years = inc.map(i => i.calendarYear);
        createLineChart({ 
            canvasId: 'revenueChart', 
            labels: years, 
            datasets: [{ label: 'Revenue', data: inc.map(i => i.revenue) }] 
        });
        createLineChart({ 
            canvasId: 'metricsChart', 
            labels: years, 
            datasets: [
                { label: 'Net Income', data: inc.map(i => i.netIncome) },
                { label: 'Operating Cash Flow', data: cf.map(i => i.operatingCashFlow) },
                { label: 'Free Cash Flow', data: cf.map(i => i.freeCashFlow) }
            ] 
        });
    }
    function tableHTML(headers, rows) {
        const thead = headers.map(h => `<th>${h}</th>`).join('');
        const tbody = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
        return `<table class="financial-table"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`;
    }
    function buildTables(inc, cf, bs) {
        const rev = [...inc].reverse();
        const rb = [...bs].reverse();
        const rc = [...cf].reverse();
        incomeTableElm.innerHTML = tableHTML(['Year','Revenue','Gross Profit','Net Income','Diluted EPS','Operating Income'], rev.map(r => [r.calendarYear, fmtCell(r.revenue,'revenue'), currency(r.grossProfit), fmtCell(r.netIncome,'netIncome'), fmt2(r.epsdiluted||r.eps), currency(r.operatingIncome)]));
        balanceTableElm.innerHTML = tableHTML(['Year','Total Assets','Total Debt','Total Equity','Cash','Current Assets'], rb.map(r => [r.calendarYear, currency(r.totalAssets), fmtCell(r.totalDebt,'totalDebt'), fmtCell(r.totalEquity,'totalEquity'), currency(r.cashAndCashEquivalents), currency(r.totalCurrentAssets)]));
        cashTableElm.innerHTML = tableHTML(['Year','Operating CF','Investing CF','Financing CF','Free CF','Net Change'], rc.map(r => [r.calendarYear, fmtCell(r.operatingCashFlow,'operatingCF'), currency(r.netCashUsedForInvestingActivites), currency(r.netCashUsedProvidedByFinancingActivities), fmtCell(r.freeCashFlow,'freeCF'), currency(r.netChangeInCash)]));
        
        // Build Key Investor Metrics table
        const keyMetricsTable = $('keyMetricsTable');
        if (keyMetricsTable) {
            keyMetricsTable.innerHTML = tableHTML(
                ['Year', 'Current Ratio', 'Interest Coverage', 'Return on Equity', 'Profit Margin', 'FCF/Revenue'],
                rb.map((r, i) => {
                    const incomeData = rev[i] || {};
                    const cashData = rc[i] || {};
                    
                    // Calculate metrics
                    // Current Ratio = Current Assets / Current Liabilities
                    const currentRatio = r.totalCurrentAssets && r.totalCurrentLiabilities ? 
                        r.totalCurrentAssets / r.totalCurrentLiabilities : null;
                    
                    // Interest Coverage = Operating Income / Interest Expense (or EBIT / Interest)
                    // Using operatingIncome for EBIT if interestExpense exists, otherwise null
                    const interestCoverage = incomeData.operatingIncome && incomeData.interestExpense && 
                                           incomeData.interestExpense !== 0 ? 
                        incomeData.operatingIncome / Math.abs(incomeData.interestExpense) : null;
                    
                    // Return on Equity = Net Income / Shareholders' Equity
                    const returnOnEquity = incomeData.netIncome && r.totalStockholdersEquity ? 
                        incomeData.netIncome / r.totalStockholdersEquity : null;
                    
                    // Net Profit Margin = Net Income / Revenue
                    const profitMargin = incomeData.netIncome && incomeData.revenue ? 
                        incomeData.netIncome / incomeData.revenue : null;
                    
                    // FCF to Revenue = Free Cash Flow / Revenue
                    const fcfRevenue = cashData.freeCashFlow && incomeData.revenue ? 
                        cashData.freeCashFlow / incomeData.revenue : null;
                    
                    return [
                        r.calendarYear,
                        currentRatio ? fmt2(currentRatio) : 'N/A',
                        interestCoverage ? fmt2(interestCoverage) + 'x' : 'N/A',
                        returnOnEquity ? fmt2(returnOnEquity * 100) + '%' : 'N/A',
                        profitMargin ? fmt2(profitMargin * 100) + '%' : 'N/A',
                        fcfRevenue ? fmt2(fcfRevenue * 100) + '%' : 'N/A'
                    ];
                })
            );
        }
    }
    function showError(msg) {
        errorElm.textContent = msg;
        errorElm.style.display = 'block';
    }
});

function setupSearchPage() {
    const form = document.getElementById('searchForm');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        const ticker = document.getElementById('searchTicker').value.trim().toUpperCase();
        if (!ticker) return;
        window.location.href = `analyzer.html?ticker=${encodeURIComponent(ticker)}`;
    });
}
document.addEventListener('DOMContentLoaded', setupSearchPage);

(function() {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('ticker');
    if (t) {
        const input = document.getElementById('ticker');
        if (input) {
            input.value = t;
            window.addEventListener('load', () => {
                document.getElementById('loadData')?.click();
            });
        }
    }
})();
