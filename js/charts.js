/* ============================================================
   DPS Visual Chart Engine (Charts & Graphs Module)
   High-performance, responsive charting supporting:
   - Chart.js Canvas rendering when available
   - Built-in Native SVG interactive charts (100% offline, zero-dependency)
   - Donut charts, Bar charts, Stacked bars, Histograms, Horizon timelines
   ============================================================ */

const DPSCharts = {
    _instances: {},

    // Safe color palette for pharma & supply chain intelligence
    colors: {
        blue: '#2563eb',
        blueLight: '#60a5fa',
        blueGradient: ['#1e40af', '#3b82f6'],
        green: '#10b981',
        greenLight: '#34d399',
        greenGradient: ['#047857', '#10b981'],
        red: '#ef4444',
        redLight: '#f87171',
        redGradient: ['#b91c1c', '#ef4444'],
        orange: '#f59e0b',
        orangeLight: '#fbbf24',
        orangeGradient: ['#b45309', '#f59e0b'],
        purple: '#8b5cf6',
        purpleLight: '#a78bfa',
        purpleGradient: ['#6d28d9', '#8b5cf6'],
        cyan: '#06b6d4',
        slate: '#64748b',
        palette: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#6366f1']
    },

    // ============================================================
    // 1. Donut Chart (e.g. RM vs PM, Hidden Costs Breakdown)
    // ============================================================
    renderDonut(containerId, config) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const data = config.data || []; // [{ label, value, color }]
        const title = config.title || '';
        const subtitle = config.subtitle || '';
        const centerLabel = config.centerLabel || '';
        const centerValue = config.centerValue || '';

        const total = data.reduce((sum, d) => sum + parseNum(d.value), 0);
        if (total === 0) {
            container.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;">No data available</div>';
            return;
        }

        // Check if Chart.js is available
        if (typeof Chart !== 'undefined') {
            this._renderChartJsDonut(container, config, total);
            return;
        }

        // Native SVG Fallback (100% offline, pure SVG)
        this._renderSvgDonut(container, config, total);
    },

    _renderChartJsDonut(container, config, total) {
        const canvasId = `canvas_${container.id}`;
        container.innerHTML = `
            <div class="chart-wrapper">
                ${config.title ? `<div class="chart-header"><div class="chart-title">${escapeHtml(config.title)}</div>${config.subtitle ? `<div class="chart-subtitle">${escapeHtml(config.subtitle)}</div>` : ''}</div>` : ''}
                <div style="position:relative;height:${config.height || 220}px;display:flex;justify-content:center;align-items:center;">
                    <canvas id="${canvasId}"></canvas>
                    ${config.centerValue ? `
                        <div style="position:absolute;text-align:center;pointer-events:none;">
                            <div style="font-size:18px;font-weight:800;color:#0f172a;line-height:1.1;">${escapeHtml(config.centerValue)}</div>
                            <div style="font-size:10px;color:#64748b;text-transform:uppercase;">${escapeHtml(config.centerLabel || 'Total')}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        const ctx = document.getElementById(canvasId).getContext('2d');
        if (this._instances[canvasId]) this._instances[canvasId].destroy();

        const colors = config.data.map((d, i) => d.color || this.colors.palette[i % this.colors.palette.length]);

        this._instances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: config.data.map(d => d.label),
                datasets: [{
                    data: config.data.map(d => parseNum(d.value)),
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: config.cutout || '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 12,
                            font: { size: 11, family: "'Segoe UI', sans-serif" }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.raw || 0;
                                const pct = ((val / total) * 100).toFixed(1);
                                return ` ${context.label}: ${formatNumber(val)} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    _renderSvgDonut(container, config, total) {
        const size = 180;
        const radius = 70;
        const strokeWidth = 28;
        const center = size / 2;
        const circumference = 2 * Math.PI * radius;

        let accumulatedOffset = 0;
        const slices = config.data.map((d, i) => {
            const val = parseNum(d.value);
            const pct = val / total;
            const strokeDasharray = `${pct * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedOffset;
            accumulatedOffset += pct * circumference;
            const color = d.color || this.colors.palette[i % this.colors.palette.length];
            return { ...d, pct: (pct * 100).toFixed(1), strokeDasharray, strokeDashoffset, color };
        });

        let html = `
            <div class="chart-wrapper">
                ${config.title ? `<div class="chart-header"><div class="chart-title">${escapeHtml(config.title)}</div>${config.subtitle ? `<div class="chart-subtitle">${escapeHtml(config.subtitle)}</div>` : ''}</div>` : ''}
                <div style="display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap;padding:10px 0;">
                    <div style="position:relative;width:${size}px;height:${size}px;">
                        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
                            <circle cx="${center}" cy="${center}" r="${radius}" fill="transparent" stroke="#f1f5f9" stroke-width="${strokeWidth}" />
                            ${slices.map(s => `
                                <circle cx="${center}" cy="${center}" r="${radius}" fill="transparent"
                                    stroke="${s.color}" stroke-width="${strokeWidth}"
                                    stroke-dasharray="${s.strokeDasharray}" stroke-dashoffset="${s.strokeDashoffset}"
                                    style="transition: stroke-width 0.2s; cursor: pointer;">
                                    <title>${escapeHtml(s.label)}: ${formatNumber(s.value)} (${s.pct}%)</title>
                                </circle>
                            `).join('')}
                        </svg>
                        ${config.centerValue ? `
                            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);text-align:center;pointer-events:none;">
                                <div style="font-size:18px;font-weight:800;color:#0f172a;line-height:1.1;">${escapeHtml(config.centerValue)}</div>
                                <div style="font-size:10px;color:#64748b;text-transform:uppercase;">${escapeHtml(config.centerLabel || 'Total')}</div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Legend -->
                    <div style="display:flex;flex-direction:column;gap:6px;min-width:140px;">
                        ${slices.map(s => `
                            <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;gap:8px;">
                                <div style="display:flex;align-items:center;gap:6px;">
                                    <span style="width:10px;height:10px;border-radius:2px;background:${s.color};"></span>
                                    <span style="color:#334155;">${escapeHtml(s.label)}</span>
                                </div>
                                <strong style="color:#0f172a;">${s.pct}%</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    // ============================================================
    // 2. Vertical Column Bar Chart (e.g. Stockout Horizon, Valuation)
    // ============================================================
    renderBar(containerId, config) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const data = config.data || []; // [{ label, value, color, secondary }]
        if (!data.length) {
            container.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;">No data available</div>';
            return;
        }

        if (typeof Chart !== 'undefined') {
            this._renderChartJsBar(container, config);
            return;
        }

        this._renderSvgBar(container, config);
    },

    _renderChartJsBar(container, config) {
        const canvasId = `canvas_${container.id}`;
        container.innerHTML = `
            <div class="chart-wrapper">
                ${config.title ? `<div class="chart-header"><div class="chart-title">${escapeHtml(config.title)}</div>${config.subtitle ? `<div class="chart-subtitle">${escapeHtml(config.subtitle)}</div>` : ''}</div>` : ''}
                <div style="position:relative;height:${config.height || 260}px;">
                    <canvas id="${canvasId}"></canvas>
                </div>
            </div>
        `;

        const ctx = document.getElementById(canvasId).getContext('2d');
        if (this._instances[canvasId]) this._instances[canvasId].destroy();

        const defaultColor = config.color || this.colors.blue;
        const colors = config.data.map((d, i) => d.color || (config.colors ? config.colors[i % config.colors.length] : defaultColor));

        this._instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: config.data.map(d => d.label),
                datasets: [{
                    label: config.seriesName || 'Units',
                    data: config.data.map(d => parseNum(d.value)),
                    backgroundColor: colors,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const prefix = config.unitPrefix || '';
                                const suffix = config.unitSuffix || '';
                                return ` ${context.dataset.label}: ${prefix}${formatNumber(context.raw)}${suffix}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10, family: "'Segoe UI', sans-serif" }, color: '#64748b' }
                    },
                    y: {
                        grid: { color: '#f1f5f9' },
                        ticks: {
                            font: { size: 10, family: "'Segoe UI', sans-serif" },
                            color: '#64748b',
                            callback: function(val) {
                                const prefix = config.unitPrefix || '';
                                return prefix + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val);
                            }
                        }
                    }
                }
            }
        });
    },

    _renderSvgBar(container, config) {
        const height = config.height || 240;
        const padding = { top: 25, right: 15, bottom: 40, left: 45 };
        const width = container.clientWidth || 400;
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        const maxVal = Math.max(...config.data.map(d => parseNum(d.value))) * 1.15 || 10;
        const colWidth = Math.max(16, Math.min(48, (chartWidth / config.data.length) * 0.65));
        const colGap = chartWidth / config.data.length;

        let html = `
            <div class="chart-wrapper">
                ${config.title ? `<div class="chart-header"><div class="chart-title">${escapeHtml(config.title)}</div>${config.subtitle ? `<div class="chart-subtitle">${escapeHtml(config.subtitle)}</div>` : ''}</div>` : ''}
                <div style="position:relative;width:100%;height:${height}px;">
                    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow:visible;">
                        <!-- Horizontal Grid Lines -->
                        ${[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                            const y = padding.top + chartHeight * (1 - ratio);
                            const val = (maxVal * ratio).toFixed(0);
                            const displayVal = (config.unitPrefix || '') + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val);
                            return `
                                <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#f1f5f9" stroke-width="1" />
                                <text x="${padding.left - 6}" y="${y + 3}" font-size="9" fill="#94a3b8" text-anchor="end" font-family="'Segoe UI', sans-serif">${displayVal}</text>
                            `;
                        }).join('')}

                        <!-- Bars -->
                        ${config.data.map((d, i) => {
                            const val = parseNum(d.value);
                            const barHeight = Math.max(3, (val / maxVal) * chartHeight);
                            const x = padding.left + (i * colGap) + (colGap - colWidth) / 2;
                            const y = padding.top + chartHeight - barHeight;
                            const color = d.color || config.color || this.colors.blue;
                            const displayVal = (config.unitPrefix || '') + formatNumber(val) + (config.unitSuffix || '');

                            return `
                                <g class="svg-bar-group">
                                    <rect x="${x}" y="${y}" width="${colWidth}" height="${barHeight}" rx="4" fill="${color}" style="transition: all 0.2s; cursor: pointer;">
                                        <title>${escapeHtml(d.label)}: ${displayVal}</title>
                                    </rect>
                                    <text x="${x + colWidth / 2}" y="${y - 5}" font-size="9" font-weight="700" fill="#334155" text-anchor="middle" font-family="'Segoe UI', sans-serif">
                                        ${val > 0 ? displayVal : ''}
                                    </text>
                                    <text x="${x + colWidth / 2}" y="${padding.top + chartHeight + 16}" font-size="9" fill="#64748b" text-anchor="middle" font-family="'Segoe UI', sans-serif" transform="rotate(-15, ${x + colWidth / 2}, ${padding.top + chartHeight + 16})">
                                        ${escapeHtml(truncate(d.label, 12))}
                                    </text>
                                </g>
                            `;
                        }).join('')}
                    </svg>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    // ============================================================
    // 3. Horizontal Bar Comparison (e.g. Top Materials Demanded, MOS)
    // ============================================================
    renderHorizontalBar(containerId, config) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const data = config.data || [];
        const maxVal = Math.max(...data.map(d => parseNum(d.value))) || 1;

        let html = `
            <div class="chart-wrapper">
                ${config.title ? `<div class="chart-header"><div class="chart-title">${escapeHtml(config.title)}</div>${config.subtitle ? `<div class="chart-subtitle">${escapeHtml(config.subtitle)}</div>` : ''}</div>` : ''}
                <div style="display:flex;flex-direction:column;gap:10px;padding:6px 0;">
                    ${data.map((d, idx) => {
                        const val = parseNum(d.value);
                        const pct = Math.min(100, (val / maxVal) * 100).toFixed(1);
                        const color = d.color || config.color || this.colors.blue;
                        const subVal = d.subValue ? `<span style="font-size:10px;color:#64748b;margin-left:4px;">(${escapeHtml(d.subValue)})</span>` : '';

                        return `
                            <div style="display:flex;flex-direction:column;gap:3px;">
                                <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:600;color:#334155;">
                                    <div style="display:flex;align-items:center;gap:6px;max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                        <span style="font-size:9px;background:#e2e8f0;color:#475569;padding:1px 5px;border-radius:3px;">#${idx + 1}</span>
                                        <span>${escapeHtml(d.label)}</span>
                                        ${subVal}
                                    </div>
                                    <div style="font-weight:700;color:#0f172a;">
                                        ${(config.unitPrefix || '') + formatNumber(val) + (config.unitSuffix || '')}
                                    </div>
                                </div>
                                <div style="height:7px;background:#f1f5f9;border-radius:4px;overflow:hidden;display:flex;">
                                    <div style="width:${pct}%;background:${color};border-radius:4px;transition:width 0.4s ease;"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    // ============================================================
    // 4. MOS Risk Distribution Histogram (e.g. Understock vs Target vs Excess)
    // ============================================================
    renderMosHistogram(containerId, config) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const buckets = config.buckets || [
            { label: 'Critical (< 1 MOS)', count: 12, color: '#ef4444', desc: 'Imminent Stockout Risk' },
            { label: 'Understock (1–3 MOS)', count: 14, color: '#f59e0b', desc: 'Below 3M Safety Hold' },
            { label: 'Optimal (3–6 MOS)', count: 18, color: '#10b981', desc: 'Within Hold Policy' },
            { label: 'Excess (> 6 MOS)', count: 18, color: '#3b82f6', desc: 'Overstock Capital Hold' }
        ];

        const totalCount = buckets.reduce((s, b) => s + b.count, 0);

        let html = `
            <div class="chart-wrapper">
                ${config.title ? `<div class="chart-header"><div class="chart-title">${escapeHtml(config.title)}</div>${config.subtitle ? `<div class="chart-subtitle">${escapeHtml(config.subtitle)}</div>` : ''}</div>` : ''}
                
                <!-- Stacked Progress Strip -->
                <div style="height:14px;background:#f1f5f9;border-radius:7px;overflow:hidden;display:flex;margin-bottom:14px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.06);">
                    ${buckets.map(b => {
                        const pct = ((b.count / totalCount) * 100).toFixed(1);
                        return `<div style="width:${pct}%;background:${b.color};height:100%;transition:width 0.4s ease;" title="${b.label}: ${b.count} SKUs (${pct}%)"></div>`;
                    }).join('')}
                </div>

                <!-- 4 Bucket Metric Tiles -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;">
                    ${buckets.map(b => {
                        const pct = ((b.count / totalCount) * 100).toFixed(0);
                        return `
                            <div style="background:#fff;border:1px solid #e2e8f0;border-top:3px solid ${b.color};border-radius:6px;padding:8px 10px;">
                                <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">${escapeHtml(b.label)}</div>
                                <div style="font-size:18px;font-weight:800;color:#0f172a;margin:2px 0;">${b.count} <span style="font-size:11px;font-weight:600;color:#64748b;">(${pct}%)</span></div>
                                <div style="font-size:9px;color:${b.color};font-weight:600;">${escapeHtml(b.desc)}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    // ============================================================
    // 5. Dual-Axis / Combo Comparison (Quality Rating vs Lead Time)
    // ============================================================
    renderDualAxis(containerId, config) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const data = config.data || [];
        if (!data.length) return;

        if (typeof Chart !== 'undefined') {
            this._renderChartJsDualAxis(container, config);
            return;
        }

        // SVG fallback
        this._renderSvgDualAxis(container, config);
    },

    _renderChartJsDualAxis(container, config) {
        const canvasId = `canvas_${container.id}`;
        container.innerHTML = `
            <div class="chart-wrapper">
                ${config.title ? `<div class="chart-header"><div class="chart-title">${escapeHtml(config.title)}</div>${config.subtitle ? `<div class="chart-subtitle">${escapeHtml(config.subtitle)}</div>` : ''}</div>` : ''}
                <div style="position:relative;height:${config.height || 260}px;">
                    <canvas id="${canvasId}"></canvas>
                </div>
            </div>
        `;

        const ctx = document.getElementById(canvasId).getContext('2d');
        if (this._instances[canvasId]) this._instances[canvasId].destroy();

        this._instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: config.data.map(d => d.label),
                datasets: [
                    {
                        type: 'bar',
                        label: config.barLabel || 'Quality Rating (%)',
                        data: config.data.map(d => parseNum(d.barValue)),
                        backgroundColor: '#10b981',
                        borderRadius: 4,
                        yAxisID: 'y'
                    },
                    {
                        type: 'line',
                        label: config.lineLabel || 'Lead Time (Days)',
                        data: config.data.map(d => parseNum(d.lineValue)),
                        borderColor: '#8b5cf6',
                        backgroundColor: '#8b5cf6',
                        borderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, font: { size: 10, family: "'Segoe UI', sans-serif" } }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10, family: "'Segoe UI', sans-serif" } }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        min: 90,
                        max: 100,
                        ticks: { callback: v => v + '%' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        max: 90,
                        grid: { drawOnChartArea: false },
                        ticks: { callback: v => v + 'd' }
                    }
                }
            }
        });
    },

    _renderSvgDualAxis(container, config) {
        // Fallback visual table & meter
        let html = `
            <div class="chart-wrapper">
                ${config.title ? `<div class="chart-header"><div class="chart-title">${escapeHtml(config.title)}</div>${config.subtitle ? `<div class="chart-subtitle">${escapeHtml(config.subtitle)}</div>` : ''}</div>` : ''}
                <div style="display:flex;flex-direction:column;gap:10px;padding:6px 0;">
                    ${config.data.map(d => `
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                <strong style="color:#0f172a;font-size:12px;">${escapeHtml(d.label)}</strong>
                                <span class="badge badge-success">${d.barValue}% Quality</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;">
                                <span>Lead Time: <strong style="color:#8b5cf6;">${d.lineValue} Days</strong></span>
                                <span>Contracts: <strong>${d.contracts || '-'}</strong></span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    // ============================================================
    // 6. Grouped / Multi-Series Bar Chart
    // ============================================================
    renderGroupedBar(containerId, config) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (typeof Chart !== 'undefined') {
            this._renderChartJsGroupedBar(container, config);
            return;
        }
        this._renderSvgGroupedBar(container, config);
    },

    _renderChartJsGroupedBar(container, config) {
        const canvasId = `canvas_${container.id}`;
        container.innerHTML = `
            <div class="chart-wrapper">
                ${config.title ? `<div class="chart-header"><div class="chart-title">${escapeHtml(config.title)}</div>${config.subtitle ? `<div class="chart-subtitle">${escapeHtml(config.subtitle)}</div>` : ''}</div>` : ''}
                <div style="position:relative;height:${config.height || 260}px;">
                    <canvas id="${canvasId}"></canvas>
                </div>
            </div>
        `;

        const ctx = document.getElementById(canvasId).getContext('2d');
        if (this._instances[canvasId]) this._instances[canvasId].destroy();

        const datasets = (config.datasets || []).map(ds => ({
            label: ds.label,
            data: ds.data.map(v => parseNum(v)),
            backgroundColor: ds.color,
            borderRadius: 4
        }));

        this._instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: config.labels || [],
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, font: { size: 10, family: "'Segoe UI', sans-serif" } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const prefix = config.unitPrefix || '';
                                const suffix = config.unitSuffix || '';
                                return ` ${context.dataset.label}: ${prefix}${formatNumber(context.raw)}${suffix}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10, family: "'Segoe UI', sans-serif" }, color: '#64748b' }
                    },
                    y: {
                        grid: { color: '#f1f5f9' },
                        ticks: {
                            font: { size: 10, family: "'Segoe UI', sans-serif" },
                            color: '#64748b',
                            callback: function(val) {
                                const prefix = config.unitPrefix || '';
                                return prefix + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val);
                            }
                        }
                    }
                }
            }
        });
    },

    _renderSvgGroupedBar(container, config) {
        const datasets = config.datasets || [];
        const labels = config.labels || [];
        let html = `
            <div class="chart-wrapper">
                ${config.title ? `<div class="chart-header"><div class="chart-title">${escapeHtml(config.title)}</div>${config.subtitle ? `<div class="chart-subtitle">${escapeHtml(config.subtitle)}</div>` : ''}</div>` : ''}
                <div style="display:flex;flex-direction:column;gap:12px;padding:8px 0;">
                    ${labels.map((lbl, idx) => `
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;">
                            <div style="font-size:11px;font-weight:700;color:#0f172a;margin-bottom:6px;">${escapeHtml(lbl)}</div>
                            <div style="display:flex;flex-direction:column;gap:4px;">
                                ${datasets.map(ds => {
                                    const val = ds.data[idx] || 0;
                                    return `
                                        <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;">
                                            <span style="color:#64748b;display:flex;align-items:center;gap:4px;">
                                                <span style="width:8px;height:8px;background:${ds.color};border-radius:2px;display:inline-block;"></span>
                                                ${escapeHtml(ds.label)}
                                            </span>
                                            <strong style="color:#0f172a;">${(config.unitPrefix || '') + formatNumber(val) + (config.unitSuffix || '')}</strong>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    // ============================================================
    // 7. Funnel / Pipeline Flow Stages
    // ============================================================
    renderFunnel(containerId, config) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const stages = config.stages || [];
        let html = `
            <div class="chart-wrapper">
                ${config.title ? `<div class="chart-header"><div class="chart-title">${escapeHtml(config.title)}</div>${config.subtitle ? `<div class="chart-subtitle">${escapeHtml(config.subtitle)}</div>` : ''}</div>` : ''}
                <div style="display:flex;flex-direction:column;gap:10px;padding:10px 0;">
                    ${stages.map((st, i) => {
                        const pct = st.pct || 100;
                        const color = st.color || this.colors.blue;
                        return `
                            <div style="display:flex;align-items:center;gap:12px;">
                                <div style="min-width:130px;font-size:11px;font-weight:600;color:#334155;text-align:right;">
                                    ${escapeHtml(st.label)}
                                </div>
                                <div style="flex:1;background:#f1f5f9;border-radius:6px;height:24px;overflow:hidden;position:relative;display:flex;align-items:center;">
                                    <div style="width:${pct}%;background:${color};height:100%;border-radius:6px;transition:width 0.4s ease;"></div>
                                    <span style="position:absolute;left:10px;font-size:11px;font-weight:700;color:${pct > 40 ? '#ffffff' : '#0f172a'};">
                                        ${formatNumber(st.value)} ${st.unit || 'units'}
                                    </span>
                                </div>
                                <div style="min-width:55px;font-size:11px;font-weight:700;color:${color};text-align:right;">
                                    ${pct}%
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        container.innerHTML = html;
    }
};
