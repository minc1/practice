document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const $$ = sel => document.querySelectorAll(sel);

    const yearEl = $('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

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
        const container = $('metricsContainer');
        if (!container) return;
        const frag = document.createDocumentFragment();
        metricsCfg.forEach(cfg => {
            const card = document.createElement('div');
            card.className = 'metric-card';
            card.innerHTML = `<span class="metric-label">${cfg.label} (<span class="metric-year"></span>)</span><span class="metric-value" id="${cfg.id}">-</span>`;
            frag.appendChild(card);
            metricEls[cfg.id] = card.querySelector(`#${cfg.id}`);
            metricYearEls.push(...card.querySelectorAll('.metric-year'));
        });
        container.appendChild(frag);
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
        const formattedValue = v / div;
        const numberFormat = (Math.abs(formattedValue) < 10 && formattedValue !== 0) ? intl2 : intl0;
        return '$' + numberFormat.format(formattedValue) + suffix;
    }

    const fmt2 = v => (v == null || isNaN(v) ? 'N/A' : intl2.format(v));

    class ChartManager {
        constructor() {
            const css = getComputedStyle(document.documentElement);
            this.palette = [
                css.getPropertyValue('--secondary').trim() || '#1c2541',
                css.getPropertyValue('--primary').trim() || '#c5a47e',
                css.getPropertyValue('--muted').trim() || '#6c757d',
                css.getPropertyValue('--light').trim() || '#f8f9fa'
            ];
            this.gridColor = 'rgba(0, 0, 0, 0.1)';
        }
        baseOptions(minVal) {
            return {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { grid: { display: false }, ticks: { color: 'var(--text)' } },
                    y: {
                        grid: { color: this.gridColor, drawBorder: false },
                        suggestedMin: minVal,
                        ticks: { callback: v => currency(v, true), precision: 0, color: 'var(--text)' }
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

    const netIncomePointPlugin = {
        id: 'netIncomePointPlugin',
        afterDatasetsDraw(chart) {
            const idx = chart.data.datasets.findIndex(ds => ds.label === 'Net Income');
            if (idx < 0) return;
            const meta = chart.getDatasetMeta(idx);
            if (!meta || !meta.dataset) return;
            meta.dataset.draw(chart.ctx);
            if (meta.data) {
                meta.data.forEach(point => point.draw(chart.ctx));
            }
        }
    };

    if (typeof Chart !== 'undefined' && typeof Chart.register === 'function') {
        try {
            Chart.register(netIncomePointPlugin);
        } catch (e) {
            console.error("Failed to register Chart.js plugin:", e);
        }
    } else {
        console.warn("Chart.js or Chart.register not available for plugin registration.");
    }


    function hexToRGBA(hex, alpha) {
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(h => h + h).join('');
        if (c.length !== 6) return `rgba(0,0,0,${alpha})`;
        const r = parseInt(c.substr(0, 2), 16);
        const g = parseInt(c.substr(2, 2), 16);
        const b = parseInt(c.substr(4, 2), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function createLineChart({ canvasId, labels, datasets }) {
        if (charts[canvasId]) {
            charts[canvasId].destroy();
        }

        const styled = datasets.map((ds, i) => {
            const baseColor = chartMgr.palette[i] || chartMgr.palette[0];
            const alpha = i === 0 ? 0.25 : 0.07;
            return {
                ...ds,
                borderColor: baseColor,
                pointBackgroundColor: baseColor,
                borderWidth: i === 0 ? 3 : 2,
                yAxisID: 'y',
                pointRadius: 2,
                pointHoverRadius: 5,
                fill: { target: 'origin', above: hexToRGBA(baseColor, alpha), below: hexToRGBA(getComputedStyle(document.documentElement).getPropertyValue('--danger').trim() || '#c5817e', alpha) },
                order: datasets.length - i
            };
        });

        let maxAbs = 0, minVal = Infinity;
        styled.forEach(d => {
            if (d.data) {
                d.data.forEach(v => {
                    if (v != null && !isNaN(v)) {
                        const a = Math.abs(v);
                        if (a > maxAbs) maxAbs = a;
                        if (v < minVal) minVal = v;
                    }
                });
            }
        });

        const yMin = minVal >= 0 ? 0 : Math.min(minVal, -maxAbs * 0.05);
        const ctx = $(canvasId)?.getContext('2d');
        if (!ctx) {
            console.error(`Canvas context not found for ID: ${canvasId}`);
            return;
        }

        const chart = new Chart(ctx, { type: 'line', data: { labels, datasets: styled }, options: chartMgr.baseOptions(yMin) });

        const primaryMeta = chart.getDatasetMeta(0);
        if (primaryMeta && primaryMeta.data) {
             primaryMeta.data.forEach(point => point.draw(chart.ctx));
        }

        charts[canvasId] = chart;

        const chartContainer = ctx.canvas.closest('.chart-container');
        if (!chartContainer) return;
        const header = chartContainer.querySelector('.chart-header');
        if (!header) return;

        let legend = header.querySelector('.chart-legend');
        if (!legend) {
            legend = document.createElement('div');
            header.appendChild(legend);
        }
        legend.className = 'chart-legend';

        const legendItems = styled.map((ds, i) => ({ ds, idx: i })).sort((a, b) => b.ds.order - a.ds.order);
        legend.innerHTML = legendItems.map(item => `<div class="chart-legend-item" data-index="${item.idx}"><span class="chart-legend-color" style="background:${item.ds.borderColor}"></span>${item.ds.label}</div>`).join('');

        legend.onclick = e => {
            const item = e.target.closest('.chart-legend-item');
            if (!item || !charts[canvasId]) return;
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
        operatingCashFlow: v => v >= 0 ? 'highlight-positive' : 'highlight-negative',
        freeCashFlow: v => v >= 0 ? 'highlight-positive' : 'highlight-negative'
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

    if (loadButton) {
        loadButton.addEventListener('click', () => loadData(tickerInput.value));
    }
    if (tickerInput) {
        tickerInput.addEventListener('keypress', e => { if (e.key === 'Enter') loadData(tickerInput.value); });
    }

    async function loadData(tickerValue) {
        const ticker = tickerValue.trim().toUpperCase();
        if (!ticker) { showError('Please enter a valid ticker symbol'); return; }

        if (loadButton) loadButton.disabled = true;
        if (tickerInput) tickerInput.disabled = true;
        if (loadingTicker) loadingTicker.textContent = ticker;
        if (loadingElm) loadingElm.style.display = 'flex';
        if (errorElm) errorElm.style.display = 'none';
        if (dataSection) dataSection.style.display = 'none';

        try {
            const endpoints = ['income_statement_annual','cash_flow_statement_annual','balance_sheet_statement_annual'];
            const [inc, cf, bs] = await Promise.all(
                endpoints.map(e => fetchJSON(`DATA/statements/${ticker}/${e}.json`))
            );
            displayData(ticker, inc, cf, bs);
            const newUrl = `${window.location.pathname}?ticker=${ticker}`
            window.history.pushState({ path: newUrl }, "", newUrl)

        } catch (err) {
            showError(`Error loading data for ${ticker}: ${err.message}`);
        } finally {
            if (loadingElm) loadingElm.style.display = 'none';
            if (loadButton) loadButton.disabled = false;
            if (tickerInput) tickerInput.disabled = false;
        }
    }

    async function fetchJSON(url) {
        const res = await fetch(url);
        if (!res.ok) {
             if (res.status === 404) {
                 throw new Error('Financial statement data not found for this ticker.');
             } else {
                 throw new Error(`Failed to fetch data (Status: ${res.status})`);
             }
        }
        try {
            return await res.json();
        } catch (e) {
            throw new Error('Invalid data format received.');
        }
    }

    function displayData(ticker, inc, cf, bs) {
        if (!inc || !cf || !bs) {
            showError(`Incomplete data received for ${ticker}.`);
            return;
        }
        const sortByYear = (a, b) => (a.calendarYear || 0) - (b.calendarYear || 0);
        [inc, cf, bs].forEach(arr => { if (Array.isArray(arr)) arr.sort(sortByYear); });

        const companyHeaderEl = $('companyHeader');
        if (companyHeaderEl) companyHeaderEl.textContent = `${ticker} Financial Statements`;

        const latestInc = Array.isArray(inc) ? inc.at(-1) : {};
        const latestCash = Array.isArray(cf) ? cf.at(-1) : {};
        const latestBal = Array.isArray(bs) ? bs.at(-1) : {};

        if (latestInc && latestCash && latestBal) {
            metricYearEls.forEach(el => el.textContent = latestInc.calendarYear || 'N/A');
            if (metricEls.revenue) metricEls.revenue.textContent = currency(latestInc.revenue);
            if (metricEls.netIncome) metricEls.netIncome.textContent = currency(latestInc.netIncome);
            if (metricEls.freeCashFlow) metricEls.freeCashFlow.textContent = currency(latestCash.freeCashFlow);
            if (metricEls.debtEquity) metricEls.debtEquity.textContent = latestBal.totalDebt != null && latestBal.totalEquity != null && latestBal.totalEquity !== 0 ? fmt2(latestBal.totalDebt / latestBal.totalEquity) : 'N/A';
            if (metricEls.eps) metricEls.eps.textContent = fmt2(latestInc.epsdiluted != null ? latestInc.epsdiluted : latestInc.eps);
        } else {
             metricYearEls.forEach(el => el.textContent = 'N/A');
             Object.values(metricEls).forEach(el => { if(el) el.textContent = 'N/A'; });
        }


        buildCharts(inc, cf);
        buildTables(inc, cf, bs);
        if (dataSection) dataSection.style.display = 'block';
    }

    function buildCharts(inc, cf) {
        if (!Array.isArray(inc) || !Array.isArray(cf)) return;
        const years = inc.map(i => i.calendarYear).filter(y => y != null);
        if (years.length === 0) return;

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
        const tbody = rows.map(r => `<tr>${r.map(c => `<td>${c ?? 'N/A'}</td>`).join('')}</tr>`).join('');
        return `<table class="financial-table"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`;
    }

    function buildTables(inc, cf, bs) {
        if (!Array.isArray(inc) || !Array.isArray(cf) || !Array.isArray(bs)) return;

        const revInc = [...inc].reverse();
        const revBs = [...bs].reverse();
        const revCf = [...cf].reverse();

        if (incomeTableElm) {
            incomeTableElm.innerHTML = tableHTML(
                ['Year','Revenue','Gross Profit','Net Income','Diluted EPS','Operating Income'],
                revInc.map(r => [
                    r.calendarYear,
                    fmtCell(r.revenue,'revenue'),
                    currency(r.grossProfit),
                    fmtCell(r.netIncome,'netIncome'),
                    fmt2(r.epsdiluted != null ? r.epsdiluted : r.eps),
                    currency(r.operatingIncome)
                ])
            );
        }
        if (balanceTableElm) {
            balanceTableElm.innerHTML = tableHTML(
                ['Year','Total Assets','Total Debt','Total Equity','Cash','Current Assets'],
                revBs.map(r => [
                    r.calendarYear,
                    currency(r.totalAssets),
                    fmtCell(r.totalDebt,'totalDebt'),
                    fmtCell(r.totalEquity,'totalEquity'),
                    currency(r.cashAndCashEquivalents),
                    currency(r.totalCurrentAssets)
                ])
            );
        }
        if (cashTableElm) {
            cashTableElm.innerHTML = tableHTML(
                ['Year','Operating CF','Investing CF','Financing CF','Free CF','Net Change'],
                revCf.map(r => [
                    r.calendarYear,
                    fmtCell(r.operatingCashFlow,'operatingCashFlow'),
                    currency(r.netCashUsedForInvestingActivites),
                    currency(r.netCashUsedProvidedByFinancingActivities),
                    fmtCell(r.freeCashFlow,'freeCashFlow'),
                    currency(r.netChangeInCash)
                ])
            );
        }
    }

    function showError(msg) {
        if (errorElm) {
            errorElm.textContent = msg;
            errorElm.style.display = 'block';
        }
        if (dataSection) dataSection.style.display = 'none';
        console.error(msg);
    }

    (function() {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('ticker');
        if (t) {
            const input = $('ticker');
            if (input) {
                input.value = t;
                window.addEventListener('load', () => {
                    loadData(t);
                });
            }
        } else {
             if (dataSection) dataSection.style.display = 'none';
             if (loadingElm) loadingElm.style.display = 'none';
             if (errorElm) {
                 errorElm.textContent = 'No ticker specified in URL. Please enter a ticker symbol.';
                 errorElm.style.display = 'block';
             }
        }
    })();
});