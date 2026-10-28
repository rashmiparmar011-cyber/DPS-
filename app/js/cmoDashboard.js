/* ============================================================
   CMO Dashboard Module (Contract Manufacturing Intelligence)
   Executive & operational dashboard built upon current live data:
   - cmo.json (62 CMO finished products, £379.8k COGS)
   - cmoPartners (5 FES/WCS connected partners)
   - cmoMultiBatchPOs (Staged delivery milestones & delay impact)
   - cmoCostPOs (Non-COGS hidden cost capture)
   - purchase_orders.json (CMO procurement history)
   ============================================================ */

const CMODashboard = {
    currentTab: 'overview', // 'overview' | 'products' | 'multibatch' | 'costpos' | 'partners' | 'history'
    filterPartner: 'ALL',
    filterRisk: 'ALL',     // 'ALL' | 'UNDERSTOCK' | 'SHORT_DATED' | 'OBSOLETE'
    searchTerm: '',
    table: null,

    render(tab = null) {
        if (tab) this.currentTab = tab;

        const cmoData = DataStore.get('cmo') || [];
        const partners = DataStore.get('cmoPartners') || [];
        const multiBatchPOs = DataStore.get('cmoMultiBatchPOs') || [];
        const costPOs = DataStore.get('cmoCostPOs') || [];
        const poData = DataStore.get('purchaseOrders') || [];

        // Key Calculations
        const totalProducts = cmoData.length;
        let totalValuation = 0;
        let understockCount = 0;
        let shortDatedCount = 0;
        let obsoleteCount = 0;

        cmoData.forEach(c => {
            totalValuation += parseNum(c.cogsTotal);
            if (parseNum(c.mos) < 3.0) understockCount++;
            if (c.shortDated && c.shortDated.includes('Risk')) shortDatedCount++;
            if (c.obsolete && c.obsolete.includes('Risk')) obsoleteCount++;
        });

        // Non-COGS hidden costs
        const totalHiddenCosts = costPOs.reduce((sum, c) => sum + parseNum(c.amount), 0);

        // Multi-Batch PO stats
        const activeMultiPOs = multiBatchPOs.length;
        const delayedPOs = multiBatchPOs.filter(p => p.status === 'Delayed').length;
        let totalStagedBatches = 0;
        multiBatchPOs.forEach(p => {
            totalStagedBatches += (p.batches ? p.batches.length : (p.batchesCount || 0));
        });

        // Filter CMO specific POs from purchase_orders.json
        const cmoPOs = poData.filter(p =>
            (p.contract === 'SPE' || (p.catalog && p.catalog.includes('CMO')) || (p.supplierName && p.supplierName.toUpperCase().includes('LAXMI')))
        );

        let html = `
            <!-- Hero Banner -->
            <div class="dashboard-hero-banner" style="background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);">
                <div class="hero-title-group">
                    <h1><i class="fas fa-industry" style="color: #a78bfa;"></i> Contract Manufacturing (CMO) Dashboard</h1>
                    <p>Executive command center: contract inventory, multi-batch PO staging, non-COGS hidden cost leakage &amp; FES/WCS partner health</p>
                </div>
                <div class="hero-actions">
                    <button class="btn btn-sm btn-primary" onclick="CMODashboard.openStagePOModal()">
                        <i class="fas fa-layer-group"></i> Stage Multi-Batch PO
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="CMODashboard.openHiddenCostModal()">
                        <i class="fas fa-file-invoice-dollar"></i> Log Hidden Cost
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="CMODashboard.exportData()">
                        <i class="fas fa-file-export"></i> Export Report
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="CMODashboard.render()">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>

            <!-- Top KPI Scorecards (6 metrics) -->
            <div class="kpi-grid-6">
                <div class="kpi-card-v2 kpi-purple">
                    <div class="kpi-card-header">
                        <span class="kpi-card-label">CMO Stock Valuation</span>
                        <div class="kpi-card-icon"><i class="fas fa-sterling-sign"></i></div>
                    </div>
                    <div class="kpi-card-value">£${formatNumber(totalValuation.toFixed(0))}</div>
                    <div class="kpi-card-subtext">
                        <span class="kpi-badge kpi-badge-info">${totalProducts} Contracted SKUs</span>
                    </div>
                </div>

                <div class="kpi-card-v2 kpi-red">
                    <div class="kpi-card-header">
                        <span class="kpi-card-label">Critical Understock (&lt;3 MOS)</span>
                        <div class="kpi-card-icon"><i class="fas fa-battery-quarter"></i></div>
                    </div>
                    <div class="kpi-card-value">${understockCount}</div>
                    <div class="kpi-card-subtext">
                        <span class="kpi-badge kpi-badge-danger">${((understockCount / totalProducts) * 100).toFixed(0)}% Need Replenishment</span>
                    </div>
                </div>

                <div class="kpi-card-v2 kpi-orange">
                    <div class="kpi-card-header">
                        <span class="kpi-card-label">Delayed POs (Prod Impact)</span>
                        <div class="kpi-card-icon"><i class="fas fa-truck-fast"></i></div>
                    </div>
                    <div class="kpi-card-value">${delayedPOs}</div>
                    <div class="kpi-card-subtext">
                        <span class="kpi-badge kpi-badge-warning">${delayedPOs > 0 ? '+7D Packaging Shift' : 'All On Time'}</span>
                    </div>
                </div>

                <div class="kpi-card-v2 kpi-red">
                    <div class="kpi-card-header">
                        <span class="kpi-card-label">Hidden Costs (Non-COGS)</span>
                        <div class="kpi-card-icon"><i class="fas fa-hand-holding-dollar"></i></div>
                    </div>
                    <div class="kpi-card-value">£${formatNumber(totalHiddenCosts.toFixed(0))}</div>
                    <div class="kpi-card-subtext">
                        <span class="kpi-badge kpi-badge-danger">${costPOs.length} Uncaptured POs</span>
                    </div>
                </div>

                <div class="kpi-card-v2 kpi-green">
                    <div class="kpi-card-header">
                        <span class="kpi-card-label">FES/WCS Partner Network</span>
                        <div class="kpi-card-icon"><i class="fas fa-network-wired"></i></div>
                    </div>
                    <div class="kpi-card-value">${partners.length}</div>
                    <div class="kpi-card-subtext">
                        <span class="kpi-badge kpi-badge-success">100% Active Sync</span>
                    </div>
                </div>

                <div class="kpi-card-v2 kpi-blue">
                    <div class="kpi-card-header">
                        <span class="kpi-card-label">Staged Batch Milestones</span>
                        <div class="kpi-card-icon"><i class="fas fa-cubes"></i></div>
                    </div>
                    <div class="kpi-card-value">${totalStagedBatches}</div>
                    <div class="kpi-card-subtext">
                        <span class="kpi-badge kpi-badge-info">${activeMultiPOs} Multi-Batch POs</span>
                    </div>
                </div>
            </div>

            <!-- Tab Navigation Bar -->
            <div class="dashboard-nav-tabs">
                <button class="dashboard-nav-tab ${this.currentTab === 'overview' ? 'active' : ''}" 
                    onclick="CMODashboard.switchTab('overview')">
                    <i class="fas fa-chart-pie"></i> Executive Overview
                </button>
                <button class="dashboard-nav-tab ${this.currentTab === 'products' ? 'active' : ''}" 
                    onclick="CMODashboard.switchTab('products')">
                    <i class="fas fa-boxes"></i> Contract Inventory &amp; Stock 
                    <span class="tab-badge">${totalProducts}</span>
                </button>
                <button class="dashboard-nav-tab ${this.currentTab === 'multibatch' ? 'active' : ''}" 
                    onclick="CMODashboard.switchTab('multibatch')">
                    <i class="fas fa-layer-group"></i> Multi-Batch PO Staging 
                    <span class="tab-badge" style="background:#8b5cf6;color:#fff;">${activeMultiPOs}</span>
                </button>
                <button class="dashboard-nav-tab ${this.currentTab === 'costpos' ? 'active' : ''}" 
                    onclick="CMODashboard.switchTab('costpos')">
                    <i class="fas fa-file-invoice-dollar"></i> Non-COGS Hidden Costs 
                    <span class="tab-badge" style="background:#ef4444;color:#fff;">£${(totalHiddenCosts / 1000).toFixed(1)}k</span>
                </button>
                <button class="dashboard-nav-tab ${this.currentTab === 'partners' ? 'active' : ''}" 
                    onclick="CMODashboard.switchTab('partners')">
                    <i class="fas fa-building"></i> FES/WCS Partner Network 
                    <span class="tab-badge">${partners.length}</span>
                </button>
                <button class="dashboard-nav-tab ${this.currentTab === 'history' ? 'active' : ''}" 
                    onclick="CMODashboard.switchTab('history')">
                    <i class="fas fa-receipt"></i> CMO Procurement History 
                    <span class="tab-badge">${cmoPOs.length}</span>
                </button>
            </div>
        `;

        // Render Active Tab Content
        if (this.currentTab === 'overview') {
            html += this._renderOverviewTab(cmoData, partners, multiBatchPOs, costPOs);
        } else if (this.currentTab === 'products') {
            html += this._renderProductsTab(cmoData);
        } else if (this.currentTab === 'multibatch') {
            html += this._renderMultiBatchTab(multiBatchPOs);
        } else if (this.currentTab === 'costpos') {
            html += this._renderCostPOsTab(costPOs);
        } else if (this.currentTab === 'partners') {
            html += this._renderPartnersTab(partners);
        } else if (this.currentTab === 'history') {
            html += this._renderHistoryTab(cmoPOs);
        }

        const pageContent = document.getElementById('pageContent');
        if (pageContent) {
            pageContent.innerHTML = html;
        }

        // Initialize DataTable
        if (this.currentTab === 'products') {
            this._initProductsTable(cmoData);
        } else if (this.currentTab === 'multibatch') {
            this._initMultiBatchTable(multiBatchPOs);
        } else if (this.currentTab === 'costpos') {
            this._initCostPOTable(costPOs);
        } else if (this.currentTab === 'partners') {
            this._initPartnersTable(partners);
        } else if (this.currentTab === 'history') {
            this._initHistoryTable(cmoPOs);
        }
    },

    switchTab(tab) {
        this.currentTab = tab;
        this.render();
    },

    // ==========================================
    // Tab 1: Executive Overview
    // ==========================================
    _renderOverviewTab(cmoData, partners, multiBatchPOs, costPOs) {
        const totalHidden = costPOs.reduce((s, c) => s + parseNum(c.amount), 0);

        return `
            <!-- Analytics Grid: 3 Strategic Widgets -->
            <div class="analytics-grid-3">
                <!-- Widget 1: FES/WCS Partner Network & Capacity -->
                <div class="analytics-card">
                    <div class="analytics-header">
                        <span class="analytics-title">
                            <i class="fas fa-network-wired" style="color:#8b5cf6;"></i> FES/WCS Partner Performance
                        </span>
                        <span class="kpi-badge kpi-badge-success">${partners.length} Connected</span>
                    </div>
                    <p style="font-size:11px;color:#64748b;margin-bottom:12px;">
                        Integrated Contract Manufacturing Organizations with live inventory sync &amp; lead-time contracts.
                    </p>
                    <div style="flex:1;overflow-y:auto;max-height:280px;">
                        ${partners.map(p => `
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin-bottom:8px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                    <div style="font-weight:700;color:#0f172a;font-size:12px;">
                                        <span class="pulse-dot"></span>${escapeHtml(p.name)}
                                    </div>
                                    <span class="badge badge-success" style="font-size:9px;">${escapeHtml(p.qualityRating)} Quality</span>
                                </div>
                                <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:4px;font-size:10px;color:#475569;background:#fff;padding:6px;border-radius:4px;border:1px solid #f1f5f9;">
                                    <div>Lead: <strong>${p.leadTimeDays}d</strong></div>
                                    <div>MOQ: <strong>${formatNumber(p.moq)}</strong></div>
                                    <div>Contracts: <strong>${p.activeContracts}</strong></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:11px;color:#64748b;">Avg Lead Time: 56 Days</span>
                        <button class="btn btn-sm btn-outline-primary" onclick="CMODashboard.switchTab('partners')">
                            Directory &rarr;
                        </button>
                    </div>
                </div>

                <!-- Widget 2: Staged Multi-Batch PO Delivery Pipeline -->
                <div class="analytics-card">
                    <div class="analytics-header">
                        <span class="analytics-title">
                            <i class="fas fa-layer-group" style="color:#2563eb;"></i> Staged Multi-Batch Pipeline
                        </span>
                        <span class="kpi-badge kpi-badge-warning">${multiBatchPOs.length} Active POs</span>
                    </div>
                    <p style="font-size:11px;color:#64748b;margin-bottom:12px;">
                        Multi-batch purchase orders staging multiple batch delivery milestones under a single order.
                    </p>
                    <div style="flex:1;overflow-y:auto;max-height:280px;">
                        ${multiBatchPOs.map(po => `
                            <div class="mb-po-card ${po.status === 'Delayed' ? 'delayed' : 'ontime'}">
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
                                    <div>
                                        <strong style="color:#0f172a;font-size:12px;">${escapeHtml(po.poNo)}</strong> &bull; 
                                        <span style="color:#475569;">${escapeHtml(po.cmoPartner)}</span>
                                    </div>
                                    <span class="badge ${po.status === 'Delayed' ? 'badge-danger' : 'badge-success'}">
                                        ${escapeHtml(po.status)}
                                    </span>
                                </div>
                                <div style="font-size:11px;color:#64748b;margin-bottom:8px;">
                                    ${escapeHtml(po.productName)} (${formatNumber(po.totalQuantity)} units &bull; ${po.batchesCount} Batches)
                                </div>

                                <div class="mb-batch-track">
                                    ${(po.batches || []).map((b, idx) => `
                                        <div class="mb-batch-node ${b.status.toLowerCase().includes('delayed') ? 'delayed' : (b.status.toLowerCase().includes('prod') ? 'active' : '')}">
                                            <div style="font-weight:700;">${escapeHtml(b.batchNum)}</div>
                                            <div style="font-size:10px;color:#64748b;">${formatNumber(b.qty)} units</div>
                                            <div style="font-size:9px;margin-top:2px;">
                                                <span class="badge ${getStatusBadge(b.status)}">${escapeHtml(b.status)}</span>
                                            </div>
                                        </div>
                                        ${idx < po.batches.length - 1 ? '<span class="mb-batch-connector">&rarr;</span>' : ''}
                                    `).join('')}
                                </div>

                                ${po.status === 'Delayed' ? `
                                    <div style="background:#fee2e2;color:#991b1b;border-radius:4px;padding:6px 8px;font-size:10px;font-weight:600;margin-top:6px;">
                                        <i class="fas fa-exclamation-triangle"></i> ${escapeHtml(po.productionPlanImpact)}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:11px;color:#64748b;">Integrated with DPS Production Plan</span>
                        <button class="btn btn-sm btn-outline-primary" onclick="CMODashboard.switchTab('multibatch')">
                            Manage Multi-Batch &rarr;
                        </button>
                    </div>
                </div>

                <!-- Widget 3: Non-COGS Hidden Cost Leakage Tracker -->
                <div class="analytics-card">
                    <div class="analytics-header">
                        <span class="analytics-title">
                            <i class="fas fa-file-invoice-dollar" style="color:#ef4444;"></i> Non-COGS Cost Leakage
                        </span>
                        <span class="kpi-badge kpi-badge-danger">£${formatNumber(totalHidden.toFixed(0))} Total</span>
                    </div>
                    <p style="font-size:11px;color:#64748b;margin-bottom:12px;">
                        Captures manual POs for additional operational costs not reflected in standard unit COGS.
                    </p>
                    <div style="flex:1;overflow-y:auto;max-height:280px;">
                        ${costPOs.map(c => `
                            <div class="hidden-cost-item">
                                <div style="flex:1;padding-right:8px;">
                                    <div style="font-weight:700;color:#0f172a;font-size:11px;">
                                        ${escapeHtml(c.costCategory)}
                                    </div>
                                    <div style="font-size:10px;color:#64748b;">
                                        PO: <strong>${escapeHtml(c.poNo)}</strong> &bull; Partner: ${escapeHtml(c.cmoPartner)}
                                    </div>
                                    <div style="font-size:10px;color:#475569;margin-top:2px;">
                                        ${escapeHtml(truncate(c.reason, 38))}
                                    </div>
                                </div>
                                <div style="text-align:right;">
                                    <div style="font-size:13px;font-weight:800;color:#ef4444;">
                                        £${formatNumber(c.amount)}
                                    </div>
                                    <span class="badge ${getStatusBadge(c.status)}" style="font-size:9px;">
                                        ${escapeHtml(c.status)}
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:11px;color:#64748b;">All 4 POs logged outside standard COGS</span>
                        <button class="btn btn-sm btn-outline-danger" onclick="CMODashboard.switchTab('costpos')">
                            Audit Cost POs &rarr;
                        </button>
                    </div>
                </div>
            </div>

            <!-- Operations Navigation Hub -->
            <div style="margin-top:20px;background:#fff;border-radius:8px;border:1px solid #e2e8f0;padding:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0;">
                        <i class="fas fa-arrows-split-up-and-left" style="color:#8b5cf6;"></i> CMO Operations &amp; Planning Hub
                    </h3>
                    <span style="font-size:11px;color:#64748b;">Fast navigation to linked demand planning systems</span>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;">
                    <button class="btn btn-secondary" style="justify-content:flex-start;padding:10px 14px;" 
                        onclick="navigateTo('cmo-management')">
                        <i class="fas fa-building" style="color:#8b5cf6;"></i>
                        <div style="text-align:left;">
                            <div style="font-weight:700;">CMO Management Module</div>
                            <div style="font-size:10px;color:#64748b;">Contract management &amp; replenishment</div>
                        </div>
                    </button>
                    <button class="btn btn-secondary" style="justify-content:flex-start;padding:10px 14px;" 
                        onclick="navigateTo('cmo')">
                        <i class="fas fa-table" style="color:#2563eb;"></i>
                        <div style="text-align:left;">
                            <div style="font-weight:700;">CMO Operations View</div>
                            <div style="font-size:10px;color:#64748b;">Legacy table view</div>
                        </div>
                    </button>
                    <button class="btn btn-secondary" style="justify-content:flex-start;padding:10px 14px;" 
                        onclick="navigateTo('product-planning')">
                        <i class="fas fa-boxes-stacked" style="color:#f59e0b;"></i>
                        <div style="text-align:left;">
                            <div style="font-weight:700;">Product Planning</div>
                            <div style="font-size:10px;color:#64748b;">Sales velocity &amp; deficit plan</div>
                        </div>
                    </button>
                    <button class="btn btn-secondary" style="justify-content:flex-start;padding:10px 14px;" 
                        onclick="navigateTo('export-dps')">
                        <i class="fas fa-globe" style="color:#10b981;"></i>
                        <div style="text-align:left;">
                            <div style="font-weight:700;">Export DPS</div>
                            <div style="font-size:10px;color:#64748b;">International SOs &amp; Incoterms</div>
                        </div>
                    </button>
                </div>
            </div>
        `;
    },

    // ==========================================
    // Tab 2: Products & Replenishment Monitor
    // ==========================================
    _renderProductsTab(cmoData) {
        const understockCount = cmoData.filter(c => parseNum(c.mos) < 3.0).length;
        const shortDatedCount = cmoData.filter(c => (c.shortDated || '').includes('Risk')).length;

        return `
            <div class="chip-bar">
                <span class="chip-bar-label">Stock Status:</span>
                <span class="chip active" onclick="CMODashboard.filterProducts('ALL')">
                    All Products <span class="chip-count">${cmoData.length}</span>
                </span>
                <span class="chip active-red" onclick="CMODashboard.filterProducts('UNDERSTOCK')">
                    Understock (&lt;3 MOS) <span class="chip-count">${understockCount}</span>
                </span>
                <span class="chip active-orange" onclick="CMODashboard.filterProducts('SHORT_DATED')">
                    Short Dated Risk <span class="chip-count">${shortDatedCount}</span>
                </span>
                <span class="chip" onclick="CMODashboard.filterProducts('SAFE')">
                    Healthy Stock (&ge;3 MOS) <span class="chip-count">${cmoData.length - understockCount}</span>
                </span>
            </div>

            <div class="filter-bar">
                <input type="text" id="cmoProdSearch" placeholder="Search part number, drug name, PIP code, contract..." 
                    oninput="CMODashboard.searchProducts(this.value)">
                <button class="btn btn-sm btn-primary" onclick="CMODashboard.openReplenishmentModal()">
                    <i class="fas fa-calculator"></i> Run Replenishment Calculator
                </button>
                <button class="btn btn-sm btn-warning btn-icon" title="Export CSV" onclick="CMODashboard.exportProducts()">
                    <i class="fas fa-file-export"></i>
                </button>
            </div>

            <div id="cmoProdTableContainer"></div>
        `;
    },

    _initProductsTable(cmoData) {
        this._prodTable = new DataTable('cmoProdTableContainer', {
            columns: [
                { field: 'partNo', label: 'Part No', width: '150px' },
                { field: 'description', label: 'Finished Product Name', maxLen: 35 },
                { field: 'contract', label: 'Contract', width: '80px' },
                { field: 'qty', label: 'Stock Qty', type: 'number', width: '90px' },
                { field: 'average', label: 'Avg Monthly Sales', type: 'number', width: '110px' },
                { field: 'mos', label: 'MOS', type: 'number', width: '70px' },
                { field: 'cogsUnit', label: 'Unit COGS (£)', type: 'number', width: '95px' },
                { field: 'cogsTotal', label: 'Total Valuation (£)', type: 'number', width: '110px' },
                { field: 'shortDated', label: 'Short Dated', type: 'badge', width: '95px' },
                { field: 'obsolete', label: 'Obsolete Risk', type: 'badge', width: '95px' }
            ],
            data: cmoData,
            pageSize: 25,
            sortCol: 'mos',
            sortDir: 'asc'
        });
        this._prodTable.render();
    },

    searchProducts(term) {
        if (this._prodTable) this._prodTable.search(term);
    },

    filterProducts(type) {
        const cmoData = DataStore.get('cmo') || [];
        if (type === 'UNDERSTOCK') {
            if (this._prodTable) this._prodTable.setData(cmoData.filter(c => parseNum(c.mos) < 3.0));
        } else if (type === 'SHORT_DATED') {
            if (this._prodTable) this._prodTable.setData(cmoData.filter(c => (c.shortDated || '').includes('Risk')));
        } else if (type === 'SAFE') {
            if (this._prodTable) this._prodTable.setData(cmoData.filter(c => parseNum(c.mos) >= 3.0));
        } else {
            if (this._prodTable) this._prodTable.setData(cmoData);
        }
    },

    exportProducts() {
        const cmoData = DataStore.get('cmo') || [];
        exportToCSV('CMO_Product_Stock_Valuation', cmoData);
    },

    // ==========================================
    // Tab 3: Multi-Batch Purchase Orders
    // ==========================================
    _renderMultiBatchTab(multiBatchPOs) {
        return `
            <div class="filter-bar">
                <input type="text" id="cmoMBSearch" placeholder="Search PO number, partner, product name..." 
                    oninput="CMODashboard.searchMultiBatch(this.value)">
                <button class="btn btn-sm btn-primary" onclick="CMODashboard.openStagePOModal()">
                    <i class="fas fa-plus"></i> Stage New Multi-Batch PO
                </button>
                <button class="btn btn-sm btn-warning btn-icon" title="Export CSV" onclick="CMODashboard.exportMultiBatch()">
                    <i class="fas fa-file-export"></i>
                </button>
            </div>

            <div id="cmoMBTableContainer"></div>
        `;
    },

    _initMultiBatchTable(multiBatchPOs) {
        this._mbTable = new DataTable('cmoMBTableContainer', {
            columns: [
                { field: 'poNo', label: 'PO Number', width: '120px' },
                { field: 'cmoPartner', label: 'CMO Partner', width: '140px' },
                { field: 'productName', label: 'Product Description', maxLen: 30 },
                { field: 'totalQuantity', label: 'Total Qty', type: 'number', width: '90px' },
                { field: 'batchesCount', label: 'Batches', type: 'number', width: '70px' },
                { field: 'orderDate', label: 'Order Date', width: '90px' },
                { field: 'status', label: 'PO Status', type: 'badge', width: '90px' },
                { field: 'delayStatus', label: 'Delay Warning & Schedule Impact', maxLen: 35 }
            ],
            data: multiBatchPOs,
            pageSize: 15,
            sortCol: 'poNo'
        });
        this._mbTable.render();
    },

    searchMultiBatch(term) {
        if (this._mbTable) this._mbTable.search(term);
    },

    exportMultiBatch() {
        const multiBatchPOs = DataStore.get('cmoMultiBatchPOs') || [];
        exportToCSV('CMO_MultiBatch_POs', multiBatchPOs);
    },

    // ==========================================
    // Tab 4: Non-COGS Hidden Costs
    // ==========================================
    _renderCostPOsTab(costPOs) {
        const total = costPOs.reduce((s, c) => s + parseNum(c.amount), 0);

        return `
            <div style="background:#fff3cd;border:1px solid #ffeeba;border-radius:6px;padding:12px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <strong style="color:#856404;"><i class="fas fa-triangle-exclamation"></i> Non-COGS Expenditure Safeguard:</strong>
                    <span style="color:#856404;font-size:12px;margin-left:6px;">
                        These manual POs capture additional operational fees (Cold storage, non-standard sterility testing, carton over-labelling, express couriers) that are NOT factored into standard COGS.
                    </span>
                </div>
                <div style="font-size:16px;font-weight:800;color:#856404;">
                    Total: £${formatNumber(total)}
                </div>
            </div>

            <div class="filter-bar">
                <input type="text" id="cmoCostSearch" placeholder="Search PO number, category, partner, reason..." 
                    oninput="CMODashboard.searchCostPOs(this.value)">
                <button class="btn btn-sm btn-primary" onclick="CMODashboard.openHiddenCostModal()">
                    <i class="fas fa-plus"></i> Record Non-COGS PO
                </button>
                <button class="btn btn-sm btn-warning btn-icon" title="Export CSV" onclick="CMODashboard.exportCostPOs()">
                    <i class="fas fa-file-export"></i>
                </button>
            </div>

            <div id="cmoCostTableContainer"></div>
        `;
    },

    _initCostPOTable(costPOs) {
        this._costTable = new DataTable('cmoCostTableContainer', {
            columns: [
                { field: 'poNo', label: 'PO Number', width: '110px' },
                { field: 'cmoPartner', label: 'CMO Partner', width: '130px' },
                { field: 'costCategory', label: 'Expense Category', maxLen: 25 },
                { field: 'amount', label: 'Amount (£)', type: 'number', width: '95px' },
                { field: 'reason', label: 'Operational Rationale', maxLen: 35 },
                { field: 'refShopOrder', label: 'Ref Order', width: '90px' },
                { field: 'dateRaised', label: 'Date Raised', width: '90px' },
                { field: 'status', label: 'Approval Status', type: 'badge', width: '110px' }
            ],
            data: costPOs,
            pageSize: 15,
            sortCol: 'dateRaised'
        });
        this._costTable.render();
    },

    searchCostPOs(term) {
        if (this._costTable) this._costTable.search(term);
    },

    exportCostPOs() {
        const costPOs = DataStore.get('cmoCostPOs') || [];
        exportToCSV('CMO_Hidden_Cost_POs', costPOs);
    },

    // ==========================================
    // Tab 5: FES/WCS Partner Directory
    // ==========================================
    _renderPartnersTab(partners) {
        return `
            <div class="partner-grid">
                ${partners.map(p => `
                    <div class="partner-card">
                        <div>
                            <div class="partner-card-head">
                                <div>
                                    <span class="pulse-dot"></span>
                                    <span class="partner-card-name">${escapeHtml(p.name)}</span>
                                </div>
                                <span class="badge badge-success">${escapeHtml(p.qualityRating)}</span>
                            </div>
                            <div style="font-size:11px;color:#64748b;margin-bottom:10px;">
                                <i class="fas fa-link" style="color:#10b981;"></i> ${escapeHtml(p.fesWcsStatus)}
                            </div>

                            <div class="partner-metrics-row">
                                <div>
                                    <div class="partner-metric-val">${p.leadTimeDays} Days</div>
                                    <div class="partner-metric-label">Contract Lead Time</div>
                                </div>
                                <div>
                                    <div class="partner-metric-val">${formatNumber(p.moq)}</div>
                                    <div class="partner-metric-label">Minimum Order Qty</div>
                                </div>
                                <div>
                                    <div class="partner-metric-val">£${formatNumber(p.avgBatchCost)}</div>
                                    <div class="partner-metric-label">Avg Batch Cost</div>
                                </div>
                                <div>
                                    <div class="partner-metric-val">${p.activeContracts}</div>
                                    <div class="partner-metric-label">Active Contracts</div>
                                </div>
                            </div>

                            <div style="font-size:11px;color:#475569;line-height:1.5;">
                                <div><i class="fas fa-user" style="color:#94a3b8;width:14px;"></i> ${escapeHtml(p.contactPerson)}</div>
                                <div><i class="fas fa-envelope" style="color:#94a3b8;width:14px;"></i> ${escapeHtml(p.email)}</div>
                                <div><i class="fas fa-phone" style="color:#94a3b8;width:14px;"></i> ${escapeHtml(p.phone)}</div>
                            </div>
                        </div>

                        <div style="margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;display:flex;justify-content:flex-end;gap:6px;">
                            <button class="btn btn-sm btn-primary" onclick="CMODashboard.openStagePOForPartner('${p.name}')">
                                <i class="fas fa-plus"></i> Stage PO
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    _initPartnersTable(partners) {
        // No datatable needed for grid view
    },

    // ==========================================
    // Tab 6: Procurement History
    // ==========================================
    _renderHistoryTab(cmoPOs) {
        return `
            <div class="filter-bar">
                <input type="text" id="cmoHistSearch" placeholder="Search PO number, supplier, item..." 
                    oninput="CMODashboard.searchHistory(this.value)">
                <button class="btn btn-sm btn-warning btn-icon" title="Export CSV" onclick="CMODashboard.exportHistory()">
                    <i class="fas fa-file-export"></i>
                </button>
            </div>

            <div id="cmoHistTableContainer"></div>
        `;
    },

    _initHistoryTable(cmoPOs) {
        this._histTable = new DataTable('cmoHistTableContainer', {
            columns: [
                { field: 'poNo', label: 'PO Number', width: '90px' },
                { field: 'supplierName', label: 'CMO Supplier', maxLen: 25 },
                { field: 'item', label: 'Product Name', maxLen: 35 },
                { field: 'catalog', label: 'Catalog / Part No', width: '130px' },
                { field: 'orderedQty', label: 'Ordered Qty', type: 'number', width: '85px' },
                { field: 'deliveryDate', label: 'Delivery Date', width: '95px' },
                { field: 'poDeliveryStatus', label: 'Delivery Status', type: 'badge', width: '100px' },
                { field: 'buyer', label: 'Buyer', width: '110px' }
            ],
            data: cmoPOs,
            pageSize: 25,
            sortCol: 'poNo'
        });
        this._histTable.render();
    },

    searchHistory(term) {
        if (this._histTable) this._histTable.search(term);
    },

    exportHistory() {
        const poData = DataStore.get('purchaseOrders') || [];
        const cmoPOs = poData.filter(p => (p.contract === 'SPE' || (p.catalog && p.catalog.includes('CMO'))));
        exportToCSV('CMO_Procurement_History', cmoPOs);
    },

    // ==========================================
    // Interactive Modals
    // ==========================================
    openStagePOModal() {
        const partners = DataStore.get('cmoPartners') || [];
        const cmoData = DataStore.get('cmo') || [];

        const modalBody = `
            <form id="stagePOForm" onsubmit="CMODashboard.handleSaveMultiBatchPO(event)">
                <div class="form-grid">
                    <div class="form-group">
                        <label>CMO Partner *</label>
                        <select id="modalPartnerSelect" required>
                            ${partners.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>PO Number *</label>
                        <input type="text" id="modalPONumber" required value="PO-MB-${new Date().getFullYear()}-00${Math.floor(Math.random() * 900) + 100}">
                    </div>
                    <div class="form-group">
                        <label>Contract Ref</label>
                        <input type="text" id="modalContractRef" value="CON-SPE-2026-X">
                    </div>
                    <div class="form-group">
                        <label>CMO Product *</label>
                        <select id="modalProductSelect" required>
                            ${cmoData.slice(0, 30).map(c => `
                                <option value="${escapeHtml(c.partNo)}">${escapeHtml(c.partNo)} - ${escapeHtml(truncate(c.description, 30))}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Total Order Quantity *</label>
                        <input type="number" id="modalTotalQty" required value="30000" min="1000">
                    </div>
                    <div class="form-group">
                        <label>Staged Batches Count *</label>
                        <select id="modalBatchesCount">
                            <option value="2">2 Batches (15,000 each)</option>
                            <option value="3" selected>3 Batches (10,000 each)</option>
                            <option value="4">4 Batches (7,500 each)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Planned Batch 1 Delivery *</label>
                        <input type="date" id="modalDate1" required value="2026-11-15">
                    </div>
                    <div class="form-group">
                        <label>Planned Batch 2 Delivery *</label>
                        <input type="date" id="modalDate2" required value="2026-11-29">
                    </div>
                    <div class="form-group">
                        <label>Planned Batch 3 Delivery</label>
                        <input type="date" id="modalDate3" value="2026-12-15">
                    </div>
                    <div class="form-group">
                        <label>DPS Plan Integration Note</label>
                        <input type="text" id="modalImpactNote" value="Integrated with Secondary Packaging Line Schedule">
                    </div>
                </div>
            </form>
        `;

        const modalFooter = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="document.getElementById('stagePOForm').requestSubmit()">
                <i class="fas fa-check"></i> Stage &amp; Issue Multi-Batch PO
            </button>
        `;

        openModal('Stage Multi-Batch Purchase Order', modalBody, modalFooter);
    },

    openStagePOForPartner(partnerName) {
        this.openStagePOModal();
        const sel = document.getElementById('modalPartnerSelect');
        if (sel) sel.value = partnerName;
    },

    handleSaveMultiBatchPO(e) {
        e.preventDefault();
        const partner = document.getElementById('modalPartnerSelect').value;
        const poNo = document.getElementById('modalPONumber').value;
        const contract = document.getElementById('modalContractRef').value;
        const partNo = document.getElementById('modalProductSelect').value;
        const totalQty = parseInt(document.getElementById('modalTotalQty').value);
        const count = parseInt(document.getElementById('modalBatchesCount').value);
        const date1 = document.getElementById('modalDate1').value;
        const date2 = document.getElementById('modalDate2').value;
        const date3 = document.getElementById('modalDate3').value;
        const impact = document.getElementById('modalImpactNote').value;

        const cmoData = DataStore.get('cmo') || [];
        const prod = cmoData.find(c => c.partNo === partNo);
        const prodName = prod ? prod.description : partNo;

        const batchSize = Math.floor(totalQty / count);
        const batches = [
            { batchNum: `B-${poNo.slice(-3)}-01`, qty: batchSize, plannedDeliveryDate: date1, actualDeliveryDate: '', status: 'In Production' },
            { batchNum: `B-${poNo.slice(-3)}-02`, qty: batchSize, plannedDeliveryDate: date2, actualDeliveryDate: '', status: 'Scheduled' }
        ];
        if (count >= 3) {
            batches.push({ batchNum: `B-${poNo.slice(-3)}-03`, qty: totalQty - (batchSize * 2), plannedDeliveryDate: date3 || date2, actualDeliveryDate: '', status: 'Scheduled' });
        }

        const newPO = {
            id: poNo,
            poNo,
            cmoPartner: partner,
            contract,
            productName: prodName,
            partNo,
            totalQuantity: totalQty,
            batchesCount: count,
            batches,
            orderDate: new Date().toISOString().split('T')[0],
            poSentDate: `${new Date().toISOString().split('T')[0]} 09:00`,
            poSentStatus: 'Sent Automatically',
            status: 'Active',
            delayStatus: 'On Time (Schedule Normal)',
            productionPlanImpact: impact
        };

        const list = DataStore.get('cmoMultiBatchPOs') || [];
        list.unshift(newPO);
        DataStore.set('cmoMultiBatchPOs', list);

        closeModal();
        showToast(`Multi-batch PO ${poNo} staged with ${count} milestone batches!`, 'success');
        this.render('multibatch');
    },

    openHiddenCostModal() {
        const partners = DataStore.get('cmoPartners') || [];

        const modalBody = `
            <form id="hiddenCostForm" onsubmit="CMODashboard.handleSaveHiddenCost(event)">
                <div class="form-grid">
                    <div class="form-group">
                        <label>CMO Partner *</label>
                        <select id="modalCostPartner" required>
                            ${partners.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>PO Number *</label>
                        <input type="text" id="modalCostPO" required value="CPO-2026-00${Math.floor(Math.random() * 90) + 10}">
                    </div>
                    <div class="form-group">
                        <label>Cost Category *</label>
                        <select id="modalCostCategory" required>
                            <option value="Temperature-Controlled Storage">Temperature-Controlled Storage</option>
                            <option value="Sterility & Retest Challenge">Sterility & Retest Challenge</option>
                            <option value="Carton Over-stickering / Artwork change">Carton Over-stickering / Artwork change</option>
                            <option value="Expedited Air Courier & Dry Ice">Expedited Air Courier & Dry Ice</option>
                            <option value="Batch Quarantine & Extended Hold">Batch Quarantine & Extended Hold</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Amount (GBP £) *</label>
                        <input type="number" id="modalCostAmount" required value="2500.00" step="0.01" min="10">
                    </div>
                    <div class="form-group">
                        <label>Operational Rationale / Cause *</label>
                        <input type="text" id="modalCostReason" required placeholder="e.g. Mandatory external release lab sterility testing" value="Cold storage extension pending stability report">
                    </div>
                    <div class="form-group">
                        <label>Reference Shop Order / Batch</label>
                        <input type="text" id="modalCostRefOrder" value="SO-99501">
                    </div>
                    <div class="form-group">
                        <label>Authorizing Department</label>
                        <input type="text" id="modalCostRaisedBy" value="SCM Operations">
                    </div>
                </div>
            </form>
        `;

        const modalFooter = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="document.getElementById('hiddenCostForm').requestSubmit()">
                <i class="fas fa-check"></i> Authorize &amp; Log Hidden Cost
            </button>
        `;

        openModal('Record Non-COGS Operational Cost PO', modalBody, modalFooter);
    },

    handleSaveHiddenCost(e) {
        e.preventDefault();
        const partner = document.getElementById('modalCostPartner').value;
        const poNo = document.getElementById('modalCostPO').value;
        const category = document.getElementById('modalCostCategory').value;
        const amount = parseFloat(document.getElementById('modalCostAmount').value);
        const reason = document.getElementById('modalCostReason').value;
        const refOrder = document.getElementById('modalCostRefOrder').value;
        const raisedBy = document.getElementById('modalCostRaisedBy').value;

        const newCost = {
            id: poNo,
            poNo,
            cmoPartner: partner,
            costCategory: category,
            amount,
            currency: 'GBP',
            reason,
            isCapturedInCOGs: 'No (Hidden Cost)',
            dateRaised: new Date().toISOString().split('T')[0],
            status: 'Approved',
            refShopOrder: refOrder,
            raisedBy
        };

        const list = DataStore.get('cmoCostPOs') || [];
        list.unshift(newCost);
        DataStore.set('cmoCostPOs', list);

        closeModal();
        showToast(`Hidden Cost PO ${poNo} (£${formatNumber(amount)}) authorized and recorded!`, 'success');
        this.render('costpos');
    },

    openReplenishmentModal() {
        const cmoData = DataStore.get('cmo') || [];
        const understock = cmoData.filter(c => parseNum(c.mos) < 3.0);

        const modalBody = `
            <div style="margin-bottom:12px;font-size:12px;color:#475569;">
                The DPS algorithm evaluates 6-month average sales velocity against contract lead times (45–70 days) and standard 3-month safety stock holding policies.
            </div>
            <div class="table-wrapper" style="max-height:300px;overflow-y:auto;">
                <table class="data-table" style="font-size:11px;">
                    <thead>
                        <tr>
                            <th>Part No</th>
                            <th>Description</th>
                            <th>Avg Monthly</th>
                            <th>Current MOS</th>
                            <th>Deficit (Units)</th>
                            <th>Suggested Batches</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${understock.slice(0, 10).map(c => {
            const avg = parseNum(c.average);
            const current = parseNum(c.qty);
            const target = avg * 6;
            const deficit = Math.max(0, target - current);
            const suggestedBatches = Math.ceil(deficit / 10000);
            return `
                                <tr>
                                    <td><strong>${escapeHtml(c.partNo)}</strong></td>
                                    <td>${escapeHtml(truncate(c.description, 28))}</td>
                                    <td class="text-right">${formatNumber(avg)}</td>
                                    <td><span class="badge badge-danger">${c.mos} MOS</span></td>
                                    <td class="text-right"><strong>${formatNumber(deficit.toFixed(0))}</strong></td>
                                    <td><span class="badge badge-warning">${suggestedBatches} Batches</span></td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const modalFooter = `
            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            <button class="btn btn-primary" onclick="closeModal(); CMODashboard.openStagePOModal();">
                <i class="fas fa-layer-group"></i> Raise Replenishment PO
            </button>
        `;

        openModal('Automated CMO Replenishment Calculations', modalBody, modalFooter);
    },

    exportData() {
        if (this.currentTab === 'products') this.exportProducts();
        else if (this.currentTab === 'multibatch') this.exportMultiBatch();
        else if (this.currentTab === 'costpos') this.exportCostPOs();
        else if (this.currentTab === 'history') this.exportHistory();
        else {
            const cmoData = DataStore.get('cmo') || [];
            exportToCSV('CMO_Executive_Summary', cmoData);
        }
    }
};
