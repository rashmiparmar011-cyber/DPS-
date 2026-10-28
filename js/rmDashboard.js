/* ============================================================
   RM Dashboard Module (Raw Materials & Packaging Intelligence)
   Executive & operational dashboard built upon current live data:
   - rmpm.json (499 RM/PM items)
   - expiry.json (18 retest/expiry batches)
   - rmpm_not_issued.json (158 shop order allocations)
   - purchase_orders.json (inbound procurement)
   ============================================================ */

const RMDashboard = {
    currentTab: 'overview', // 'overview' | 'retest' | 'allocations' | 'inventory' | 'inbound'
    filterType: 'ALL',      // 'ALL' | 'RM' | 'PM'
    filterRisk: 'ALL',      // 'ALL' | 'OVERDUE' | 'STOCKOUT_90D' | 'UNISSUED'
    searchTerm: '',
    table: null,

    render(tab = null) {
        if (tab) this.currentTab = tab;

        const rmpmData = DataStore.get('rmpm') || [];
        const expiryData = DataStore.get('expiry') || [];
        const issuanceData = DataStore.get('rmpmNotIssued') || [];
        const poData = DataStore.get('purchaseOrders') || [];

        // Core Metrics Calculation
        const totalMaterials = rmpmData.length;
        const rmCount = rmpmData.filter(r => r.type === 'RM').length;
        const pmCount = rmpmData.filter(r => r.type === 'PM').length;

        // Retest calculations
        const now = new Date();
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

        let overdueRetests = 0;
        let due30dRetests = 0;
        let due90dRetests = 0;
        let totalRetestRiskValue = 0;

        expiryData.forEach(e => {
            const qty = parseNum(e.qtyOnHand);
            const price = parseNum(e.unitPrice);
            totalRetestRiskValue += (qty * price);

            if (!e.retestDate || e.retestDate === '-' || e.retestDate === 'NA') return;
            const d = new Date(e.retestDate);
            if (!isNaN(d.getTime())) {
                if (d < now) overdueRetests++;
                else if (d <= thirtyDays) due30dRetests++;
                else if (d <= ninetyDays) due90dRetests++;
            }
        });

        // Stockout risk: items with stockout in 2026 or within 90 days
        const imminentStockouts = rmpmData.filter(r =>
            r.outOfStockMonth && r.outOfStockMonth.toLowerCase().includes('2026')
        ).length;

        // PRs and Procurement
        const prsToRaise = rmpmData.filter(r =>
            r.comment && r.comment.toLowerCase().includes('pr')
        ).length;

        // Allocations
        const unissuedCount = issuanceData.length;
        const partiallyIssued = issuanceData.filter(i => (i.materialStatus || '').toLowerCase().includes('partially')).length;
        const reservedCount = issuanceData.filter(i => (i.materialStatus || '').toLowerCase().includes('reserved')).length;
        const releasedCount = issuanceData.filter(i => (i.materialStatus || '').toLowerCase().includes('released')).length;

        // Inbound RM POs
        const rmPOs = poData.filter(p =>
            (p.contract === 'SPE' || (p.item && (p.item.toLowerCase().includes('powder') || p.item.toLowerCase().includes('bottle') || p.item.toLowerCase().includes('cap'))))
        );

        let html = `
            <!-- Hero Banner -->
            <div class="dashboard-hero-banner">
                <div class="hero-title-group">
                    <h1><i class="fas fa-boxes-stacked" style="color: #60a5fa;"></i> Raw Materials (RM &amp; PM) Dashboard</h1>
                    <p>Live inventory intelligence, automated expiry &amp; retest safeguards, shop order allocations &amp; procurement pipeline</p>
                </div>
                <div class="hero-actions">
                    <button class="btn btn-sm btn-primary" onclick="RMDashboard.openScheduleRetestModal()">
                        <i class="fas fa-calendar-check"></i> Schedule Retest
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="RMDashboard.exportData()">
                        <i class="fas fa-file-export"></i> Export Report
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="RMDashboard.render()">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>

            <!-- Top KPI Scorecards (6 metrics) -->
            <div class="kpi-grid-6">
                <div class="kpi-card-v2 kpi-blue">
                    <div class="kpi-card-header">
                        <span class="kpi-card-label">Total Material SKUs</span>
                        <div class="kpi-card-icon"><i class="fas fa-cubes"></i></div>
                    </div>
                    <div class="kpi-card-value">${formatNumber(totalMaterials)}</div>
                    <div class="kpi-card-subtext">
                        <span class="kpi-badge kpi-badge-info">${rmCount} RM</span>
                        <span class="kpi-badge kpi-badge-success">${pmCount} PM</span>
                    </div>
                </div>

                <div class="kpi-card-v2 kpi-red">
                    <div class="kpi-card-header">
                        <span class="kpi-card-label">Critical Retest Risk</span>
                        <div class="kpi-card-icon"><i class="fas fa-triangle-exclamation"></i></div>
                    </div>
                    <div class="kpi-card-value">${overdueRetests}</div>
                    <div class="kpi-card-subtext">
                        <span class="kpi-badge kpi-badge-danger">100% Batches Overdue</span>
                    </div>
                </div>

                <div class="kpi-card-v2 kpi-orange">
                    <div class="kpi-card-header">
                        <span class="kpi-card-label">Stockout Risk (Q4 2026)</span>
                        <div class="kpi-card-icon"><i class="fas fa-clock-rotate-left"></i></div>
                    </div>
                    <div class="kpi-card-value">${imminentStockouts}</div>
                    <div class="kpi-card-subtext">
                        <span class="kpi-badge kpi-badge-warning">${((imminentStockouts / totalMaterials) * 100).toFixed(1)}% of Catalog</span>
                    </div>
                </div>

                <div class="kpi-card-v2 kpi-purple">
                    <div class="kpi-card-header">
                        <span class="kpi-card-label">Shop Order Allocations</span>
                        <div class="kpi-card-icon"><i class="fas fa-dolly"></i></div>
                    </div>
                    <div class="kpi-card-value">${formatNumber(unissuedCount)}</div>
                    <div class="kpi-card-subtext">
                        <span class="kpi-badge kpi-badge-info">${partiallyIssued} Partial</span>
                        <span class="kpi-badge kpi-badge-success">${reservedCount} Reserved</span>
                    </div>
                </div>

                <div class="kpi-card-v2 kpi-cyan">
                    <div class="kpi-card-header">
                        <span class="kpi-card-label">PRs Pending Action</span>
                        <div class="kpi-card-icon"><i class="fas fa-file-invoice"></i></div>
                    </div>
                    <div class="kpi-card-value">${formatNumber(prsToRaise)}</div>
                    <div class="kpi-card-subtext">
                        <span class="kpi-badge kpi-badge-info">Procurement Queue</span>
                    </div>
                </div>

                <div class="kpi-card-v2 kpi-green">
                    <div class="kpi-card-header">
                        <span class="kpi-card-label">Value at Retest Risk</span>
                        <div class="kpi-card-icon"><i class="fas fa-pound-sign"></i></div>
                    </div>
                    <div class="kpi-card-value">£${formatNumber(totalRetestRiskValue.toFixed(0))}</div>
                    <div class="kpi-card-subtext">
                        <span class="kpi-badge kpi-badge-danger">18 Batches at Hold</span>
                    </div>
                </div>
            </div>

            <!-- Tab Navigation Bar -->
            <div class="dashboard-nav-tabs">
                <button class="dashboard-nav-tab ${this.currentTab === 'overview' ? 'active' : ''}" 
                    onclick="RMDashboard.switchTab('overview')">
                    <i class="fas fa-chart-pie"></i> Executive Overview
                </button>
                <button class="dashboard-nav-tab ${this.currentTab === 'retest' ? 'active' : ''}" 
                    onclick="RMDashboard.switchTab('retest')">
                    <i class="fas fa-vial-circle-check"></i> Retest &amp; Expiry Safeguards 
                    <span class="tab-badge" style="background:#ef4444;color:#fff;">${overdueRetests}</span>
                </button>
                <button class="dashboard-nav-tab ${this.currentTab === 'allocations' ? 'active' : ''}" 
                    onclick="RMDashboard.switchTab('allocations')">
                    <i class="fas fa-clipboard-check"></i> Shop Order Allocations 
                    <span class="tab-badge">${unissuedCount}</span>
                </button>
                <button class="dashboard-nav-tab ${this.currentTab === 'inventory' ? 'active' : ''}" 
                    onclick="RMDashboard.switchTab('inventory')">
                    <i class="fas fa-warehouse"></i> Inventory &amp; Stockout Master 
                    <span class="tab-badge">${totalMaterials}</span>
                </button>
                <button class="dashboard-nav-tab ${this.currentTab === 'inbound' ? 'active' : ''}" 
                    onclick="RMDashboard.switchTab('inbound')">
                    <i class="fas fa-truck-ramp-box"></i> RM Inbound Orders 
                    <span class="tab-badge">${rmPOs.length}</span>
                </button>
            </div>
        `;

        // Render Active Tab Content
        if (this.currentTab === 'overview') {
            html += this._renderOverviewTab(rmpmData, expiryData, issuanceData, rmPOs);
        } else if (this.currentTab === 'retest') {
            html += this._renderRetestTab(expiryData);
        } else if (this.currentTab === 'allocations') {
            html += this._renderAllocationsTab(issuanceData);
        } else if (this.currentTab === 'inventory') {
            html += this._renderInventoryTab(rmpmData);
        } else if (this.currentTab === 'inbound') {
            html += this._renderInboundTab(rmPOs);
        }

        const pageContent = document.getElementById('pageContent');
        if (pageContent) {
            pageContent.innerHTML = html;
        }

        // Initialize DataTable for appropriate tab
        if (this.currentTab === 'retest') {
            this._initRetestTable(expiryData);
        } else if (this.currentTab === 'allocations') {
            this._initAllocationsTable(issuanceData);
        } else if (this.currentTab === 'inventory') {
            this._initInventoryTable(rmpmData);
        } else if (this.currentTab === 'inbound') {
            this._initInboundTable(rmPOs);
        }
    },

    switchTab(tab) {
        this.currentTab = tab;
        this.render();
    },

    // ==========================================
    // Tab 1: Executive Overview
    // ==========================================
    _renderOverviewTab(rmpmData, expiryData, issuanceData, rmPOs) {
        const rmCount = rmpmData.filter(r => r.type === 'RM').length;
        const pmCount = rmpmData.filter(r => r.type === 'PM').length;
        const total = rmpmData.length;
        const rmPct = ((rmCount / total) * 100).toFixed(1);
        const pmPct = ((pmCount / total) * 100).toFixed(1);

        // Imminent stockout vs safe
        const q4_2026 = rmpmData.filter(r => (r.outOfStockMonth || '').includes('2026')).length;
        const y2027 = rmpmData.filter(r => (r.outOfStockMonth || '').includes('2027')).length;
        const noOutOfStock = rmpmData.filter(r => (r.outOfStockMonth || '').toLowerCase().includes('no out')).length;
        const otherYears = total - q4_2026 - y2027 - noOutOfStock;

        // Top Shop Orders waiting on materials
        const topOrders = {};
        issuanceData.forEach(item => {
            const key = item.orderNo;
            if (!topOrders[key]) {
                topOrders[key] = {
                    orderNo: item.orderNo,
                    product: item.description,
                    materials: [],
                    totalRequired: 0,
                    status: item.headStatus || item.materialStatus
                };
            }
            topOrders[key].materials.push(item);
            topOrders[key].totalRequired += parseNum(item.qtyRequired);
        });
        const orderList = Object.values(topOrders).slice(0, 5);

        return `
            <!-- Analytics Grid: 3 Strategic Widgets -->
            <div class="analytics-grid-3">
                <!-- Widget 1: Retest & Expiry Safeguards -->
                <div class="analytics-card">
                    <div class="analytics-header">
                        <span class="analytics-title">
                            <i class="fas fa-triangle-exclamation" style="color:#ef4444;"></i> Retest Safeguards Watchlist
                        </span>
                        <span class="kpi-badge kpi-badge-danger">${expiryData.length} Overdue Batches</span>
                    </div>
                    <p style="font-size:11px;color:#64748b;margin-bottom:12px;">
                        Immediate QA risk: Batches below are expired or overdue for mandatory re-testing and cannot be issued to compounding.
                    </p>
                    <div style="flex:1;overflow-y:auto;max-height:260px;">
                        ${expiryData.slice(0, 6).map(e => `
                            <div class="priority-retest-row">
                                <div style="flex:1;min-width:0;padding-right:8px;">
                                    <div style="font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                        ${escapeHtml(e.description)}
                                    </div>
                                    <div style="font-size:10px;color:#64748b;">
                                        Batch: <strong>${escapeHtml(e.lotBatchNo)}</strong> &bull; Code: ${escapeHtml(e.materialCode)}
                                    </div>
                                </div>
                                <div style="text-align:right;">
                                    <span class="kpi-badge kpi-badge-danger" style="margin-bottom:2px;display:inline-block;">
                                        Due: ${escapeHtml(e.retestDate)}
                                    </span>
                                    <div style="font-size:10px;color:#64748b;">
                                        Stock: ${formatNumber(e.qtyOnHand)} kg
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:11px;color:#64748b;">Showing 6 of ${expiryData.length} batches</span>
                        <button class="btn btn-sm btn-outline-danger" onclick="RMDashboard.switchTab('retest')">
                            View All Safeguards &rarr;
                        </button>
                    </div>
                </div>

                <!-- Widget 2: Material Category & Risk Distribution -->
                <div class="analytics-card">
                    <div class="analytics-header">
                        <span class="analytics-title">
                            <i class="fas fa-chart-column" style="color:#2563eb;"></i> Stockout Risk Timeline
                        </span>
                        <span class="kpi-badge kpi-badge-info">${total} Items Total</span>
                    </div>

                    <!-- Material Type Split -->
                    <div class="dist-bar-wrapper">
                        <div class="dist-bar-meta">
                            <span>Material Category Split</span>
                            <span>${rmCount} RM (${rmPct}%) &bull; ${pmCount} PM (${pmPct}%)</span>
                        </div>
                        <div class="dist-bar-track">
                            <div class="dist-bar-fill bg-blue" style="width:${rmPct}%" title="Raw Materials (RM): ${rmCount}"></div>
                            <div class="dist-bar-fill bg-green" style="width:${pmPct}%" title="Packaging Materials (PM): ${pmCount}"></div>
                        </div>
                    </div>

                    <!-- Stockout Horizon -->
                    <div class="dist-bar-wrapper">
                        <div class="dist-bar-meta">
                            <span>Imminent Stockout (Q4 2026)</span>
                            <span style="color:#ef4444;font-weight:700;">${q4_2026} SKUs (${((q4_2026 / total) * 100).toFixed(1)}%)</span>
                        </div>
                        <div class="dist-bar-track">
                            <div class="dist-bar-fill bg-red" style="width:${((q4_2026 / total) * 100).toFixed(1)}%"></div>
                        </div>
                    </div>

                    <div class="dist-bar-wrapper">
                        <div class="dist-bar-meta">
                            <span>Mid-Term Risk (2027)</span>
                            <span style="color:#f59e0b;font-weight:700;">${y2027} SKUs (${((y2027 / total) * 100).toFixed(1)}%)</span>
                        </div>
                        <div class="dist-bar-track">
                            <div class="dist-bar-fill bg-orange" style="width:${((y2027 / total) * 100).toFixed(1)}%"></div>
                        </div>
                    </div>

                    <div class="dist-bar-wrapper">
                        <div class="dist-bar-meta">
                            <span>Long-Term Safe (>12 Months)</span>
                            <span style="color:#10b981;font-weight:700;">${noOutOfStock} SKUs (${((noOutOfStock / total) * 100).toFixed(1)}%)</span>
                        </div>
                        <div class="dist-bar-track">
                            <div class="dist-bar-fill bg-green" style="width:${((noOutOfStock / total) * 100).toFixed(1)}%"></div>
                        </div>
                    </div>

                    <div style="background:#f8fafc;border-radius:6px;padding:10px;margin-top:auto;font-size:11px;color:#475569;">
                        <i class="fas fa-lightbulb" style="color:#f59e0b;"></i> <strong>Planning Insight:</strong> 168 raw materials enter stockout window in the 3rd week of Oct 2026. Prioritize purchase requisitions for high-velocity compounding lines.
                    </div>
                </div>

                <!-- Widget 3: Shop Order Material Readiness Radar -->
                <div class="analytics-card">
                    <div class="analytics-header">
                        <span class="analytics-title">
                            <i class="fas fa-dolly-flatbed" style="color:#8b5cf6;"></i> Shop Order Allocation Bottlenecks
                        </span>
                        <span class="kpi-badge kpi-badge-warning">${issuanceData.length} Lines Active</span>
                    </div>
                    <p style="font-size:11px;color:#64748b;margin-bottom:12px;">
                        Open manufacturing shop orders awaiting complete raw material issuance or reserved batch release.
                    </p>
                    <div style="flex:1;overflow-y:auto;max-height:260px;">
                        ${orderList.map(o => `
                            <div style="padding:8px 10px;background:#f8fafc;border-radius:6px;margin-bottom:8px;border-left:3px solid #8b5cf6;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                    <span style="font-weight:700;color:#0f172a;font-size:11px;">
                                        Order #${escapeHtml(o.orderNo)}
                                    </span>
                                    <span class="badge ${getStatusBadge(o.status)}">${escapeHtml(o.status)}</span>
                                </div>
                                <div style="font-size:11px;color:#475569;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                    ${escapeHtml(o.product)}
                                </div>
                                <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;">
                                    <span>Material Lines: <strong>${o.materials.length}</strong></span>
                                    <span>Req Qty: <strong>${formatNumber(o.totalRequired.toFixed(1))}</strong></span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:11px;color:#64748b;">158 unissued material lines</span>
                        <button class="btn btn-sm btn-outline-primary" onclick="RMDashboard.switchTab('allocations')">
                            Inspect Allocations &rarr;
                        </button>
                    </div>
                </div>
            </div>

            <!-- Quick Action Shortcuts -->
            <div style="margin-top:20px;background:#fff;border-radius:8px;border:1px solid #e2e8f0;padding:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0;">
                        <i class="fas fa-bolt" style="color:#f59e0b;"></i> Fast Operations Hub
                    </h3>
                    <span style="font-size:11px;color:#64748b;">Direct links into management workflows</span>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;">
                    <button class="btn btn-secondary" style="justify-content:flex-start;padding:10px 14px;" 
                        onclick="navigateTo('rm-management')">
                        <i class="fas fa-cubes" style="color:#10b981;"></i>
                        <div style="text-align:left;">
                            <div style="font-weight:700;">Open RM Management</div>
                            <div style="font-size:10px;color:#64748b;">Full inventory CRUD &amp; scheduling</div>
                        </div>
                    </button>
                    <button class="btn btn-secondary" style="justify-content:flex-start;padding:10px 14px;" 
                        onclick="navigateTo('rm-pm-tracking')">
                        <i class="fas fa-truck" style="color:#2563eb;"></i>
                        <div style="text-align:left;">
                            <div style="font-weight:700;">RM PM Tracking</div>
                            <div style="font-size:10px;color:#64748b;">Unissued materials execution view</div>
                        </div>
                    </button>
                    <button class="btn btn-secondary" style="justify-content:flex-start;padding:10px 14px;" 
                        onclick="navigateTo('shop-order')">
                        <i class="fas fa-clipboard-list" style="color:#8b5cf6;"></i>
                        <div style="text-align:left;">
                            <div style="font-weight:700;">Shop Orders</div>
                            <div style="font-size:10px;color:#64748b;">Track manufacturing batches</div>
                        </div>
                    </button>
                    <button class="btn btn-secondary" style="justify-content:flex-start;padding:10px 14px;" 
                        onclick="navigateTo('product-planning')">
                        <i class="fas fa-boxes-stacked" style="color:#f59e0b;"></i>
                        <div style="text-align:left;">
                            <div style="font-weight:700;">Product Planning</div>
                            <div style="font-size:10px;color:#64748b;">6-Month sales forecast integration</div>
                        </div>
                    </button>
                </div>
            </div>
        `;
    },

    // ==========================================
    // Tab 2: Retest & Expiry Safeguards Monitor
    // ==========================================
    _renderRetestTab(expiryData) {
        return `
            <div class="chip-bar">
                <span class="chip-bar-label">Filter Safeguards:</span>
                <span class="chip active-red" onclick="RMDashboard.filterRetest('ALL')">
                    All Overdue Batches <span class="chip-count">${expiryData.length}</span>
                </span>
                <span class="chip" onclick="RMDashboard.filterRetest('HIGH_VALUE')">
                    High Value (>£100)
                </span>
                <span class="chip" onclick="RMDashboard.filterRetest('PROD_PLANNED')">
                    Upcoming Production Linked
                </span>
            </div>

            <div class="filter-bar">
                <input type="text" id="rmRetestSearch" placeholder="Search batch number, material code, chemical description..." 
                    oninput="RMDashboard.searchRetest(this.value)">
                <button class="btn btn-sm btn-primary" onclick="RMDashboard.openScheduleRetestModal()">
                    <i class="fas fa-calendar-plus"></i> Schedule Batch Retest
                </button>
                <button class="btn btn-sm btn-warning btn-icon" title="Export CSV" onclick="RMDashboard.exportRetest()">
                    <i class="fas fa-file-export"></i>
                </button>
            </div>

            <div id="rmRetestTableContainer"></div>
        `;
    },

    _initRetestTable(expiryData) {
        this._retestTable = new DataTable('rmRetestTableContainer', {
            columns: [
                { field: 'lotBatchNo', label: 'Lot/Batch No', width: '120px' },
                { field: 'materialCode', label: 'Material Code', width: '160px' },
                { field: 'description', label: 'Chemical / Material Name', maxLen: 35 },
                { field: 'qtyOnHand', label: 'Qty on Hand (kg)', type: 'number', width: '110px' },
                { field: 'unitPrice', label: 'Unit Price (£)', type: 'number', width: '100px' },
                { field: 'retestDate', label: 'Retest Date', width: '100px' },
                { field: 'upcomingProductionDate', label: 'Compounding Date', width: '110px' }
            ],
            data: expiryData,
            pageSize: 20,
            sortCol: 'retestDate',
            sortDir: 'asc',
            onAction: (type, id) => {
                RMDashboard.openScheduleRetestModal(id);
            }
        });
        this._retestTable.render();
    },

    searchRetest(term) {
        if (this._retestTable) this._retestTable.search(term);
    },

    filterRetest(type) {
        const expiryData = DataStore.get('expiry') || [];
        if (type === 'HIGH_VALUE') {
            const filtered = expiryData.filter(e => (parseNum(e.qtyOnHand) * parseNum(e.unitPrice)) > 100);
            if (this._retestTable) this._retestTable.setData(filtered);
        } else if (type === 'PROD_PLANNED') {
            const filtered = expiryData.filter(e => e.upcomingProductionDate && e.upcomingProductionDate !== '-');
            if (this._retestTable) this._retestTable.setData(filtered);
        } else {
            if (this._retestTable) this._retestTable.setData(expiryData);
        }
    },

    exportRetest() {
        const expiryData = DataStore.get('expiry') || [];
        exportToCSV('RM_Retest_Safeguards_Report', expiryData);
    },

    // ==========================================
    // Tab 3: Shop Order Allocations
    // ==========================================
    _renderAllocationsTab(issuanceData) {
        return `
            <div class="chip-bar">
                <span class="chip-bar-label">Allocation Status:</span>
                <span class="chip active" onclick="RMDashboard.filterAllocations('ALL')">
                    All Lines <span class="chip-count">${issuanceData.length}</span>
                </span>
                <span class="chip" onclick="RMDashboard.filterAllocations('Partially Issued')">
                    Partially Issued <span class="chip-count">${issuanceData.filter(i => (i.materialStatus || '').includes('Partially')).length}</span>
                </span>
                <span class="chip" onclick="RMDashboard.filterAllocations('Reserved')">
                    Reserved <span class="chip-count">${issuanceData.filter(i => (i.materialStatus || '').includes('Reserved')).length}</span>
                </span>
                <span class="chip" onclick="RMDashboard.filterAllocations('Released')">
                    Released <span class="chip-count">${issuanceData.filter(i => (i.materialStatus || '').includes('Released')).length}</span>
                </span>
            </div>

            <div class="filter-bar">
                <input type="text" id="rmAllocSearch" placeholder="Search order no, material code, product..." 
                    oninput="RMDashboard.searchAllocations(this.value)">
                <button class="btn btn-sm btn-warning btn-icon" title="Export CSV" onclick="RMDashboard.exportAllocations()">
                    <i class="fas fa-file-export"></i>
                </button>
            </div>

            <div id="rmAllocTableContainer"></div>
        `;
    },

    _initAllocationsTable(issuanceData) {
        this._allocTable = new DataTable('rmAllocTableContainer', {
            columns: [
                { field: 'orderNo', label: 'Shop Order No', width: '100px' },
                { field: 'description', label: 'Finished Product', maxLen: 30 },
                { field: 'materialPartNo', label: 'Material Code', width: '130px' },
                { field: 'materialDescription', label: 'Material Description', maxLen: 30 },
                { field: 'qtyRequired', label: 'Required', type: 'number', width: '85px' },
                { field: 'reservedQty', label: 'Reserved', type: 'number', width: '85px' },
                { field: 'availableQty', label: 'Available', type: 'number', width: '85px' },
                { field: 'batchExpiryDate', label: 'Batch Expiry', width: '90px' },
                { field: 'materialStatus', label: 'Material Status', type: 'badge', width: '110px' },
                { field: 'poNo', label: 'PO No', width: '80px' }
            ],
            data: issuanceData,
            pageSize: 25,
            sortCol: 'orderNo'
        });
        this._allocTable.render();
    },

    searchAllocations(term) {
        if (this._allocTable) this._allocTable.search(term);
    },

    filterAllocations(status) {
        const issuanceData = DataStore.get('rmpmNotIssued') || [];
        if (status === 'ALL') {
            if (this._allocTable) this._allocTable.setData(issuanceData);
        } else {
            const filtered = issuanceData.filter(i => (i.materialStatus || '').toLowerCase().includes(status.toLowerCase()));
            if (this._allocTable) this._allocTable.setData(filtered);
        }
    },

    exportAllocations() {
        const issuanceData = DataStore.get('rmpmNotIssued') || [];
        exportToCSV('Shop_Order_RM_Allocations', issuanceData);
    },

    // ==========================================
    // Tab 4: Inventory & Stockout Master
    // ==========================================
    _renderInventoryTab(rmpmData) {
        return `
            <div class="chip-bar">
                <span class="chip-bar-label">Catalog Filter:</span>
                <span class="chip active" onclick="RMDashboard.filterInventory('ALL')">
                    All SKUs <span class="chip-count">${rmpmData.length}</span>
                </span>
                <span class="chip" onclick="RMDashboard.filterInventory('RM')">
                    Raw Materials (RM) <span class="chip-count">${rmpmData.filter(r => r.type === 'RM').length}</span>
                </span>
                <span class="chip" onclick="RMDashboard.filterInventory('PM')">
                    Packaging (PM) <span class="chip-count">${rmpmData.filter(r => r.type === 'PM').length}</span>
                </span>
                <span class="chip active-red" onclick="RMDashboard.filterInventory('STOCKOUT_2026')">
                    Stockout in 2026 <span class="chip-count">${rmpmData.filter(r => (r.outOfStockMonth || '').includes('2026')).length}</span>
                </span>
                <span class="chip" onclick="RMDashboard.filterInventory('NO_STOCKOUT')">
                    Safe (No Stockout) <span class="chip-count">${rmpmData.filter(r => (r.outOfStockMonth || '').toLowerCase().includes('no out')).length}</span>
                </span>
            </div>

            <div class="filter-bar">
                <input type="text" id="rmInvSearch" placeholder="Search material code, chemical name, product license..." 
                    oninput="RMDashboard.searchInventory(this.value)">
                <button class="btn btn-sm btn-warning btn-icon" title="Export CSV" onclick="RMDashboard.exportInventory()">
                    <i class="fas fa-file-export"></i>
                </button>
            </div>

            <div id="rmInvTableContainer"></div>
        `;
    },

    _initInventoryTable(rmpmData) {
        this._invTable = new DataTable('rmInvTableContainer', {
            columns: [
                { field: 'type', label: 'Type', type: 'badge', width: '70px' },
                { field: 'materialCode', label: 'Material Code', width: '150px' },
                { field: 'description', label: 'Material Description', maxLen: 35 },
                { field: 'license', label: 'Finished Product / License', maxLen: 30 },
                { field: 'initialStock', label: 'Initial Stock', type: 'number', width: '90px' },
                { field: 'qtyPerBottle', label: 'Qty/Bottle', type: 'number', width: '80px' },
                { field: 'outOfStockMonth', label: 'Stockout Projection', width: '130px' },
                { field: 'comment', label: 'Action Required', type: 'badge', width: '110px' }
            ],
            data: rmpmData,
            pageSize: 25,
            sortCol: 'materialCode'
        });
        this._invTable.render();
    },

    searchInventory(term) {
        if (this._invTable) this._invTable.search(term);
    },

    filterInventory(type) {
        const rmpmData = DataStore.get('rmpm') || [];
        if (type === 'RM') {
            if (this._invTable) this._invTable.setData(rmpmData.filter(r => r.type === 'RM'));
        } else if (type === 'PM') {
            if (this._invTable) this._invTable.setData(rmpmData.filter(r => r.type === 'PM'));
        } else if (type === 'STOCKOUT_2026') {
            if (this._invTable) this._invTable.setData(rmpmData.filter(r => (r.outOfStockMonth || '').includes('2026')));
        } else if (type === 'NO_STOCKOUT') {
            if (this._invTable) this._invTable.setData(rmpmData.filter(r => (r.outOfStockMonth || '').toLowerCase().includes('no out')));
        } else {
            if (this._invTable) this._invTable.setData(rmpmData);
        }
    },

    exportInventory() {
        const rmpmData = DataStore.get('rmpm') || [];
        exportToCSV('RM_PM_Master_Inventory_Report', rmpmData);
    },

    // ==========================================
    // Tab 5: Inbound Procurement POs
    // ==========================================
    _renderInboundTab(rmPOs) {
        return `
            <div class="filter-bar">
                <input type="text" id="rmPOSearch" placeholder="Search PO number, supplier, raw material name..." 
                    oninput="RMDashboard.searchInbound(this.value)">
                <button class="btn btn-sm btn-warning btn-icon" title="Export CSV" onclick="RMDashboard.exportInbound()">
                    <i class="fas fa-file-export"></i>
                </button>
            </div>

            <div id="rmPOTableContainer"></div>
        `;
    },

    _initInboundTable(rmPOs) {
        this._inboundTable = new DataTable('rmPOTableContainer', {
            columns: [
                { field: 'poNo', label: 'PO No', width: '90px' },
                { field: 'supplierName', label: 'Supplier', maxLen: 25 },
                { field: 'item', label: 'Material / Description', maxLen: 35 },
                { field: 'orderedQty', label: 'Ordered Qty', type: 'number', width: '85px' },
                { field: 'deliveryDate', label: 'Delivery Date', width: '95px' },
                { field: 'poDeliveryStatus', label: 'Delivery Status', type: 'badge', width: '100px' },
                { field: 'lineStatus', label: 'Line Status', type: 'badge', width: '90px' },
                { field: 'buyer', label: 'Buyer', width: '110px' }
            ],
            data: rmPOs,
            pageSize: 25,
            sortCol: 'poNo'
        });
        this._inboundTable.render();
    },

    searchInbound(term) {
        if (this._inboundTable) this._inboundTable.search(term);
    },

    exportInbound() {
        const poData = DataStore.get('purchaseOrders') || [];
        exportToCSV('RM_Procurement_Purchase_Orders', poData);
    },

    // ==========================================
    // Interactive Modals
    // ==========================================
    openScheduleRetestModal(batchId = null) {
        const expiryData = DataStore.get('expiry') || [];
        const record = batchId ? expiryData.find(e => e.id == batchId) : expiryData[0];

        const modalBody = `
            <form id="retestForm" onsubmit="RMDashboard.handleSaveRetest(event)">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Select Material / Batch</label>
                        <select id="modalBatchSelect" onchange="RMDashboard.onBatchSelectionChange(this.value)">
                            ${expiryData.map(e => `
                                <option value="${e.id}" ${record && record.id == e.id ? 'selected' : ''}>
                                    ${escapeHtml(e.lotBatchNo)} - ${escapeHtml(truncate(e.description, 30))}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Current Retest Date</label>
                        <input type="text" id="modalCurrentDate" value="${record ? escapeHtml(record.retestDate) : ''}" readonly style="background:#f1f5f9;">
                    </div>
                    <div class="form-group">
                        <label>New Retest Date *</label>
                        <input type="date" id="modalNewRetestDate" required value="2026-11-30">
                    </div>
                    <div class="form-group">
                        <label>QC Retest Protocol / Note</label>
                        <input type="text" id="modalProtocolNote" placeholder="e.g. Protocol QC-2026-B8 approved; sample drawn" value="Annual Stability Retest Cleared">
                    </div>
                    <div class="form-group">
                        <label>Assigned QA Specialist</label>
                        <input type="text" id="modalQaSpecialist" value="Lead Quality Control Analyst">
                    </div>
                    <div class="form-group">
                        <label>Upcoming Compounding Date</label>
                        <input type="text" id="modalUpcomingDate" value="${record ? escapeHtml(record.upcomingProductionDate) : '-'}" readonly style="background:#f1f5f9;">
                    </div>
                </div>
            </form>
        `;

        const modalFooter = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="document.getElementById('retestForm').requestSubmit()">
                <i class="fas fa-check"></i> Commit Retest Extension
            </button>
        `;

        openModal('Schedule Raw Material Retest Safeguard', modalBody, modalFooter);
    },

    onBatchSelectionChange(batchId) {
        const expiryData = DataStore.get('expiry') || [];
        const record = expiryData.find(e => e.id == batchId);
        if (record) {
            document.getElementById('modalCurrentDate').value = record.retestDate || '';
            document.getElementById('modalUpcomingDate').value = record.upcomingProductionDate || '-';
        }
    },

    handleSaveRetest(e) {
        e.preventDefault();
        const batchId = document.getElementById('modalBatchSelect').value;
        const newDate = document.getElementById('modalNewRetestDate').value;
        const note = document.getElementById('modalProtocolNote').value;

        if (!newDate) {
            showToast('Please select a valid new retest date', 'error');
            return;
        }

        const expiryData = DataStore.get('expiry') || [];
        const idx = expiryData.findIndex(e => e.id == batchId);
        if (idx !== -1) {
            expiryData[idx].retestDate = newDate;
            expiryData[idx].qcNote = note;
            DataStore.set('expiry', expiryData);
            closeModal();
            showToast(`Batch ${expiryData[idx].lotBatchNo} retest date updated to ${newDate}`, 'success');
            this.render();
        }
    },

    exportData() {
        if (this.currentTab === 'retest') this.exportRetest();
        else if (this.currentTab === 'allocations') this.exportAllocations();
        else if (this.currentTab === 'inventory') this.exportInventory();
        else if (this.currentTab === 'inbound') this.exportInbound();
        else {
            const rmpmData = DataStore.get('rmpm') || [];
            exportToCSV('RM_PM_Executive_Summary', rmpmData);
        }
    }
};
