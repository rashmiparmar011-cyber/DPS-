/* ============================================================
   Existing Pages - Thame, CMO, Shop Order, RM PM Tracking, RM PM Dashboard
   Maintains complete backward compatibility with existing DPS application
   ============================================================ */

const ExistingPages = {
    renderDashboard() {
        const products = DataStore.get('products');
        const rmpm = DataStore.get('rmpm');
        const expiry = DataStore.get('expiry');
        const cmo = DataStore.get('cmo');
        const shopOrders = DataStore.get('shopOrders');
        const exportOrders = DataStore.get('exportOrders') || [];
        const multiBatchPOs = DataStore.get('cmoMultiBatchPOs') || [];

        const totalProducts = products.length;
        const understock = products.filter(p => p.stockStatus && p.stockStatus.toUpperCase() === 'UNDERSTOCK').length;
        const overdueOrders = shopOrders.filter(o => o.overdue === 'OVERDUE').length;
        const overdueRetests = expiry.filter(e => isOverdue(e.retestDate)).length;
        const exportCount = exportOrders.length;
        const delayedPOs = multiBatchPOs.filter(p => p.status === 'Delayed').length;

        let html = '<div class="page-header">';
        html += '<div><h1 class="page-title">RM PM Dashboard</h1>';
        html += '<div class="page-subtitle">Demand Planning System — Integrated Master Control &amp; Operations Center</div></div>';
        html += '<select class="theme-selector"><option>Thame</option></select>';
        html += '</div>';

        // Stats cards
        html += renderStatsCards([
            { label: 'Total Products in Plan', value: totalProducts, color: 'blue' },
            { label: 'Understock Products', value: understock, color: 'red' },
            { label: 'Overdue Shop Orders', value: overdueOrders, color: 'orange' },
            { label: 'Overdue RM Retests', value: overdueRetests, color: 'red' },
            { label: 'Active Export Orders', value: exportCount, color: 'green' },
            { label: 'Delayed CMO Orders', value: delayedPOs, color: 'purple' }
        ]);

        // Quick Navigation to Dashboards & Modules
        html += `
            <div style="margin-bottom: 24px;">
                <h3 style="font-size: 15px; margin-bottom: 12px; color: var(--text-primary); font-weight: 700;">
                    <i class="fas fa-gauge-high" style="color:var(--accent-blue);"></i> Dedicated Executive Dashboards &amp; Planning Modules
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">
                    <div class="card" style="background: #fff; border: 1px solid var(--border-color); border-radius: 6px; padding: 16px; cursor: pointer; transition: transform 0.15s; border-top: 4px solid var(--accent-red);"
                         onclick="navigateTo('rm-dashboard')">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <i class="fas fa-boxes-stacked" style="font-size: 20px; color: var(--accent-red);"></i>
                            <h4 style="margin: 0; font-size: 14px;">RM Dashboard</h4>
                        </div>
                        <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 10px 0;">
                            Live inventory oversight, expiry safeguards, shop order allocations &amp; stockout horizons.
                        </p>
                        <span class="btn btn-sm btn-danger">Open RM Dashboard &rarr;</span>
                    </div>

                    <div class="card" style="background: #fff; border: 1px solid var(--border-color); border-radius: 6px; padding: 16px; cursor: pointer; transition: transform 0.15s; border-top: 4px solid var(--accent-purple);"
                         onclick="navigateTo('cmo-dashboard')">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <i class="fas fa-industry" style="font-size: 20px; color: var(--accent-purple);"></i>
                            <h4 style="margin: 0; font-size: 14px;">CMO Dashboard</h4>
                        </div>
                        <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 10px 0;">
                            Contract stock valuation, staged multi-batch POs, non-COGS hidden costs &amp; FES/WCS sync.
                        </p>
                        <span class="btn btn-sm btn-secondary" style="background: var(--accent-purple); color: #fff;">Open CMO Dashboard &rarr;</span>
                    </div>

                    <div class="card" style="background: #fff; border: 1px solid var(--border-color); border-radius: 6px; padding: 16px; cursor: pointer; transition: transform 0.15s; border-top: 4px solid var(--accent-blue);"
                         onclick="navigateTo('product-planning')">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <i class="fas fa-cubes-stacked" style="font-size: 20px; color: var(--accent-blue);"></i>
                            <h4 style="margin: 0; font-size: 14px;">Product Planning</h4>
                        </div>
                        <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 10px 0;">
                            Integrated sales forecast, capacity limits, min/max stock &amp; expiry date safeguards.
                        </p>
                        <span class="btn btn-sm btn-primary">Open Module &rarr;</span>
                    </div>

                    <div class="card" style="background: #fff; border: 1px solid var(--border-color); border-radius: 6px; padding: 16px; cursor: pointer; transition: transform 0.15s; border-top: 4px solid var(--accent-orange);"
                         onclick="navigateTo('export-dps')">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <i class="fas fa-globe" style="font-size: 20px; color: var(--accent-orange);"></i>
                            <h4 style="margin: 0; font-size: 14px;">Export DPS</h4>
                        </div>
                        <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 10px 0;">
                            Customer sales orders, SO confirmations, Incoterms, Pharmadox costs &amp; delay audit.
                        </p>
                        <span class="btn btn-sm btn-warning">Open Module &rarr;</span>
                    </div>
                </div>
            </div>
        `;

        // Actionable System Alerts
        html += `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="card" style="background: #fff; border: 1px solid var(--border-color); border-radius: 6px; padding: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h4 style="margin: 0; font-size: 13px;"><i class="fas fa-exclamation-triangle" style="color: var(--accent-red);"></i> Critical Retest &amp; Expiry Alerts</h4>
                        <span class="badge badge-danger">${overdueRetests} Overdue</span>
                    </div>
                    <div class="table-wrapper">
                        <table class="data-table" style="font-size: 11px;">
                            <thead><tr><th>Material</th><th>Batch</th><th>Retest Date</th><th>Action</th></tr></thead>
                            <tbody>
                                ${expiry.slice(0, 5).map(e => `
                                    <tr>
                                        <td>${escapeHtml(truncate(e.description, 25))}</td>
                                        <td><strong>${escapeHtml(e.lotBatchNo)}</strong></td>
                                        <td><span class="badge ${isOverdue(e.retestDate) ? 'badge-danger' : 'badge-warning'}">${escapeHtml(e.retestDate)}</span></td>
                                        <td><button class="btn btn-sm btn-outline-primary" onclick="navigateTo('rm-management')">View</button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card" style="background: #fff; border: 1px solid var(--border-color); border-radius: 6px; padding: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h4 style="margin: 0; font-size: 13px;"><i class="fas fa-clock" style="color: var(--accent-orange);"></i> Overdue Shop Orders</h4>
                        <span class="badge badge-warning">${overdueOrders} Overdue</span>
                    </div>
                    <div class="table-wrapper">
                        <table class="data-table" style="font-size: 11px;">
                            <thead><tr><th>Order No</th><th>Description</th><th>Qty</th><th>Status</th></tr></thead>
                            <tbody>
                                ${shopOrders.filter(o => o.overdue === 'OVERDUE').slice(0, 5).map(o => `
                                    <tr>
                                        <td><strong>${escapeHtml(o.orderNo)}</strong></td>
                                        <td>${escapeHtml(truncate(o.description, 25))}</td>
                                        <td class="text-right">${formatNumber(o.qty)}</td>
                                        <td><span class="badge badge-danger">OVERDUE</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = html;
    },

    renderShopOrder() {
        const orders = DataStore.get('shopOrders');

        let html = '<div class="page-header">';
        html += '<div><h1 class="page-title">Shop Orders</h1>';
        html += '<div class="page-subtitle">Track manufacturing execution, order progress, and overdue status</div></div>';
        html += '<select class="theme-selector"><option>Thame</option></select>';
        html += '</div>';

        html += renderStatsCards([
            { label: 'Total Shop Orders', value: orders.length, color: 'blue' },
            { label: 'Overdue Orders', value: orders.filter(o => o.overdue === 'OVERDUE').length, color: 'red' },
            { label: 'Completed Orders', value: orders.filter(o => o.status === 'Completed').length, color: 'green' },
            { label: 'Started / In Progress', value: orders.filter(o => o.status === 'Started').length, color: 'orange' }
        ]);

        html += `
            <div class="filter-bar">
                <input type="text" id="soSearch" placeholder="Search order no, part no, description..." 
                    oninput="ExistingPages.searchShopOrder(this.value)">
                <select id="soStatusFilter" onchange="ExistingPages.filterShopOrderStatus(this.value)">
                    <option value="">All Statuses</option>
                    <option value="OVERDUE">Overdue Only</option>
                    <option value="Started">Started</option>
                    <option value="Completed">Completed</option>
                </select>
                <button class="btn btn-warning btn-icon" title="Export CSV" onclick="ExistingPages.exportShopOrders()">
                    <i class="fas fa-file-export"></i>
                </button>
                <button class="btn btn-secondary btn-icon" title="Refresh" onclick="ExistingPages.renderShopOrder()">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
            <div id="shopOrderTableContainer"></div>
        `;

        document.getElementById('pageContent').innerHTML = html;

        this._soTable = new DataTable('shopOrderTableContainer', {
            columns: [
                { field: 'orderNo', label: 'Order No', width: '110px' },
                { field: 'partNo', label: 'Part No', width: '130px' },
                { field: 'description', label: 'Description', maxLen: 40 },
                { field: 'packSize', label: 'Pack Size', width: '80px' },
                { field: 'qty', label: 'Order Qty', type: 'number', width: '90px' },
                { field: 'createdDate', label: 'Created Date', width: '95px' },
                { field: 'headStatus', label: 'Head Status', type: 'badge', width: '100px' },
                { field: 'status', label: 'Status', type: 'badge', width: '90px' },
                { field: 'overdue', label: 'Overdue', type: 'badge', width: '90px' }
            ],
            data: orders,
            pageSize: 30,
            sortCol: 'orderNo'
        });
        this._soTable.render();
    },

    searchShopOrder(term) {
        if (this._soTable) this._soTable.search(term);
    },

    filterShopOrderStatus(st) {
        let orders = DataStore.get('shopOrders');
        if (st === 'OVERDUE') {
            orders = orders.filter(o => o.overdue === 'OVERDUE');
        } else if (st) {
            orders = orders.filter(o => o.status === st || o.headStatus === st);
        }
        if (this._soTable) this._soTable.setData(orders);
    },

    exportShopOrders() {
        const orders = DataStore.get('shopOrders');
        exportToCSV('Shop_Orders_Report', orders);
    },

    renderRMPMTracking() {
        const items = DataStore.get('rmpmNotIssued');

        let html = '<div class="page-header">';
        html += '<div><h1 class="page-title">RM PM Tracking</h1>';
        html += '<div class="page-subtitle">Track raw materials and packaging not yet issued for open shop orders</div></div>';
        html += '<select class="theme-selector"><option>Thame</option></select>';
        html += '</div>';

        html += renderStatsCards([
            { label: 'Unissued Material Lines', value: items.length, color: 'blue' },
            { label: 'Reserved Batches', value: items.filter(i => parseNum(i.reservedQty) > 0).length, color: 'green' },
            { label: 'Pending PO Receipt', value: items.filter(i => i.poNo && i.poNo !== '-').length, color: 'orange' }
        ]);

        html += `
            <div class="filter-bar">
                <input type="text" id="trackSearch" placeholder="Search order no, part no, material description..." 
                    oninput="ExistingPages.searchTracking(this.value)">
                <button class="btn btn-warning btn-icon" title="Export CSV" onclick="ExistingPages.exportTracking()">
                    <i class="fas fa-file-export"></i>
                </button>
                <button class="btn btn-secondary btn-icon" title="Refresh" onclick="ExistingPages.renderRMPMTracking()">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
            <div id="trackingTableContainer"></div>
        `;

        document.getElementById('pageContent').innerHTML = html;

        this._trackTable = new DataTable('trackingTableContainer', {
            columns: [
                { field: 'orderNo', label: 'Shop Order No', width: '100px' },
                { field: 'description', label: 'Finished Product', maxLen: 30 },
                { field: 'materialPartNo', label: 'Material Code', width: '110px' },
                { field: 'materialDescription', label: 'Material Description', maxLen: 30 },
                { field: 'qtyRequired', label: 'Required', type: 'number', width: '85px' },
                { field: 'reservedQty', label: 'Reserved', type: 'number', width: '85px' },
                { field: 'availableQty', label: 'Available', type: 'number', width: '85px' },
                { field: 'batchExpiryDate', label: 'Batch Expiry', width: '90px' },
                { field: 'materialStatus', label: 'Material Status', type: 'badge', width: '110px' },
                { field: 'poNo', label: 'PO No', width: '85px' }
            ],
            data: items,
            pageSize: 30,
            sortCol: 'orderNo'
        });
        this._trackTable.render();
    },

    searchTracking(term) {
        if (this._trackTable) this._trackTable.search(term);
    },

    exportTracking() {
        const items = DataStore.get('rmpmNotIssued');
        exportToCSV('RM_PM_Tracking_Report', items);
    },

    renderThame() {
        let batches = DataStore.get('thamePlanning');
        if (!batches || batches.length === 0) {
            batches = [
                { id: "TMP-2026-001", srNo: 1, description: "Zacco 5mg/5ml Oral Susp 150ml UAE", batchSize: 333, estimatedDate: "30 Oct 2026", dayOfWeek: "Friday", status: "AGREED", freezeDate: "", isFrozen: false, shopOrderId: "SO-ZAC-333", hasRmPmIssue: true, isNearExpiry: false, commentsCount: 2 },
                { id: "TMP-2026-002", srNo: 2, description: "fluxetyl (Fluoxetine Hydrochloride) 20mg/5ml Oral Solution", batchSize: 1428, estimatedDate: "30-Oct-2026", dayOfWeek: "Friday", status: "AGREED", freezeDate: "", isFrozen: false, shopOrderId: "SO-FLX-1428", hasRmPmIssue: false, isNearExpiry: false, commentsCount: 1 },
                { id: "TMP-2026-003", srNo: 3, description: "Bisoprolol Fumarate 0.5mg/ml Oral Solution 150ml (ASPIRE) UK 1's", batchSize: 1200, estimatedDate: "03-Nov-2026", dayOfWeek: "Tuesday", status: "SCHEDULED", freezeDate: "28-Oct-2026", isFrozen: true, shopOrderId: "SO-BIS-1200", hasRmPmIssue: false, isNearExpiry: false, commentsCount: 1 },
                { id: "TMP-2026-004", srNo: 4, description: "Levetiracetam 100mg/ml Oral Solution 150ml (with 3ml Syringe)", batchSize: 2000, estimatedDate: "05-Nov-2026", dayOfWeek: "Thursday", status: "SCHEDULED", freezeDate: "", isFrozen: false, shopOrderId: "SO-LEV-2000", hasRmPmIssue: true, isNearExpiry: true, commentsCount: 2 },
                { id: "TMP-2026-005", srNo: 5, description: "Itraconazole 10mg/ml Oral Solution 150ml", batchSize: 850, estimatedDate: "09-Nov-2026", dayOfWeek: "Monday", status: "SCHEDULED", freezeDate: "", isFrozen: false, shopOrderId: "SO-ITR-850", hasRmPmIssue: true, isNearExpiry: false, commentsCount: 1 },
                { id: "TMP-2026-006", srNo: 6, description: "Alfresed (Alimemazine Tartrate) 30mg/5ml Oral Syrup 100ml", batchSize: 1500, estimatedDate: "11-Nov-2026", dayOfWeek: "Wednesday", status: "SCHEDULED", freezeDate: "", isFrozen: false, shopOrderId: "SO-ALF-1500", hasRmPmIssue: false, isNearExpiry: false, commentsCount: 0 }
            ];
        }
        this._thameBatches = [...batches];
        this._selectedBatchIds = new Set();
        this.renderThameGrid();
    },

    renderThameGrid(filterQ = '', filterFrom = '', filterTo = '') {
        let batches = [...(this._thameBatches || [])];
        if (filterQ) {
            const q = filterQ.toLowerCase();
            batches = batches.filter(b => b.description.toLowerCase().includes(q) || (b.shopOrderId && b.shopOrderId.toLowerCase().includes(q)));
        }
        if (filterFrom) {
            batches = batches.filter(b => b.freezeDate && b.freezeDate >= filterFrom);
        }
        if (filterTo) {
            batches = batches.filter(b => b.freezeDate && b.freezeDate <= filterTo);
        }

        let html = `
        <div class="thame-planning-container">
            <div class="thame-header-section">
                <h1 class="thame-title">Thame Manufacturing Planning</h1>
            </div>

            <!-- Filter bar matching Image 2 -->
            <div class="thame-filter-bar">
                <div class="filter-field-group">
                    <label for="thameDesc">Description/Batch No.</label>
                    <input type="text" id="thameDesc" class="thame-input" placeholder="Description/Batch No." 
                        value="${escapeHtml(filterQ)}" oninput="ExistingPages.onThameFilterChange()">
                </div>
                <div class="filter-field-group">
                    <label for="thameFreezeFrom">Freeze Date From</label>
                    <input type="text" id="thameFreezeFrom" class="thame-input" placeholder="Freeze Date From" 
                        value="${escapeHtml(filterFrom)}" onfocus="this.type='date'" onblur="if(!this.value)this.type='text'" onchange="ExistingPages.onThameFilterChange()">
                </div>
                <div class="filter-field-group">
                    <label for="thameFreezeTo">Freeze Date To</label>
                    <input type="text" id="thameFreezeTo" class="thame-input" placeholder="Freeze Date To" 
                        value="${escapeHtml(filterTo)}" onfocus="this.type='date'" onblur="if(!this.value)this.type='text'" onchange="ExistingPages.onThameFilterChange()">
                </div>

                <div class="thame-action-buttons">
                    <button class="thame-btn btn-green-search" title="Search Batches" onclick="ExistingPages.onThameFilterChange()">
                        <i class="fas fa-search"></i>
                    </button>
                    <button class="thame-btn btn-pink-calendar" title="Freeze Batch" onclick="ExistingPages.freezeSelectedThame()">
                        <i class="fas fa-calendar-alt"></i>
                    </button>
                    <button class="thame-btn btn-blue-add" title="Add Batch" onclick="ExistingPages.showAddThameBatchModal()">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="thame-btn btn-olive-download" title="Download CSV" onclick="ExistingPages.exportThameCSV()">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="thame-btn btn-lightgreen-clear" title="Clear Filters" onclick="ExistingPages.clearThameFilters()">
                        <i class="fas fa-eraser"></i>
                    </button>
                    <button class="thame-btn btn-yellow-file" title="Summary Report" onclick="ExistingPages.exportThameSummary()">
                        <i class="fas fa-file-lines"></i>
                    </button>
                </div>
            </div>

            <!-- Bulk Selection Row -->
            <div class="thame-bulk-row">
                <label class="select-all-label">
                    <input type="checkbox" id="thameSelectAll" onchange="ExistingPages.toggleAllThameSelect(this.checked)">
                    <span>Select All</span>
                </label>
                <button class="thame-btn btn-red-delete" title="Delete Selected" onclick="ExistingPages.deleteSelectedThame()">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>

            <!-- Table matching Image 2 -->
            <div class="thame-table-wrapper">
                <div style="overflow-x: auto; flex: 1;">
                    <table class="thame-grid-table">
                        <thead>
                            <tr>
                                <th style="width: 55px; text-align: center;">Sr No.</th>
                                <th style="width: 55px; text-align: center;">select</th>
                                <th style="text-align: left;">Description</th>
                                <th style="width: 100px; text-align: center;">Batch Size</th>
                                <th style="width: 155px; text-align: center;">Estimated Date Of Manufacturing</th>
                                <th style="width: 135px; text-align: center;">Day Of Manufacturing</th>
                                <th style="width: 130px; text-align: center;">Reschedule / Agree</th>
                                <th style="width: 110px; text-align: center;">Freeze Date</th>
                                <th style="width: 85px; text-align: center;">Shop Order</th>
                                <th style="width: 85px; text-align: center;">Comments</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${batches.length === 0 ? '<tr><td colspan="10" class="text-center" style="padding: 30px; color:#64748b;">No records found</td></tr>' : batches.map((b, idx) => {
                                const isChecked = this._selectedBatchIds.has(b.id);
                                let rowClass = '';
                                if (b.hasRmPmIssue) rowClass = 'row-rm-pm-issue';
                                else if (b.isFrozen) rowClass = 'row-frozen';
                                else if (b.isNearExpiry) rowClass = 'row-stock-expiry';

                                return `
                                <tr class="${rowClass}">
                                    <td style="text-align: center; font-weight: 500;">${b.srNo || idx + 1}</td>
                                    <td style="text-align: center;">
                                        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="ExistingPages.toggleThameSelect('${b.id}', this.checked)">
                                    </td>
                                    <td style="text-align: left; font-weight: 600; color: #1e293b;">
                                        ${escapeHtml(b.description)}
                                    </td>
                                    <td style="text-align: center; font-weight: 600;">${formatNumber(b.batchSize)}</td>
                                    <td style="text-align: center; color: #334155;">${escapeHtml(b.estimatedDate || '')}</td>
                                    <td style="text-align: center; color: #475569;">${escapeHtml(b.dayOfWeek || '')}</td>
                                    <td style="text-align: center;">
                                        <div class="row-action-pair">
                                            <button class="thame-btn-sm btn-pink-refresh" title="Reschedule" onclick="ExistingPages.rescheduleThame('${b.id}')">
                                                <i class="fas fa-sync-alt" style="font-size: 11px;"></i>
                                            </button>
                                            <button class="thame-btn-sm btn-pink-agree" title="Agree Schedule" onclick="ExistingPages.agreeThame('${b.id}')">
                                                <i class="fas fa-check" style="font-size: 11px;"></i>
                                            </button>
                                        </div>
                                    </td>
                                    <td style="text-align: center;">
                                        ${b.isFrozen && b.freezeDate ? `<span class="freeze-tag">${escapeHtml(b.freezeDate)}</span>` : `<button class="btn-text-freeze" onclick="ExistingPages.toggleFreeze('${b.id}')">Freeze</button>`}
                                    </td>
                                    <td style="text-align: center;">
                                        <button class="thame-btn-sm btn-green-shoporder" title="Shop Order" onclick="ExistingPages.openLinkedShopOrder('${b.shopOrderId || ''}')">
                                            <i class="fas fa-edit" style="font-size: 11px;"></i>
                                        </button>
                                    </td>
                                    <td style="text-align: center;">
                                        <button class="thame-btn-sm btn-green-comments" title="Comments (${b.commentsCount || 0})" onclick="ExistingPages.viewThameComments('${b.id}')">
                                            <i class="fas fa-comment-dots" style="font-size: 11px;"></i>
                                        </button>
                                    </td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Footer Pagination matching Image 2 -->
                <div class="thame-table-footer">
                    <div class="thame-pagination">
                        <button class="pag-btn" disabled>|&lt;&lt;</button>
                        <button class="pag-btn" disabled>&lt;</button>
                        <span class="pag-label">Page</span>
                        <input type="number" class="pag-input" value="1" readonly>
                        <span class="pag-label">of 1</span>
                        <button class="pag-btn" disabled>&gt;</button>
                        <button class="pag-btn" disabled>&gt;&gt;|</button>
                        <div class="page-size-selector">
                            <select class="thame-select-sm">
                                <option value="1000" selected>1000</option>
                                <option value="100">100</option>
                                <option value="50">50</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bottom Status Legend matching Image 2 -->
            <div class="thame-legend-bar">
                <div class="thame-legend">
                    <div class="legend-item">
                        <span class="legend-box box-rm-pm"></span>
                        <span class="legend-text">RM PM Issue</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-box box-freeze"></span>
                        <span class="legend-text">Freeze batch</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-box box-expiry"></span>
                        <span class="legend-text">Stock Expiry</span>
                    </div>
                </div>
            </div>
        </div>
        `;

        document.getElementById('pageContent').innerHTML = html;
    },

    onThameFilterChange() {
        const q = document.getElementById('thameDesc')?.value || '';
        const from = document.getElementById('thameFreezeFrom')?.value || '';
        const to = document.getElementById('thameFreezeTo')?.value || '';
        this.renderThameGrid(q, from, to);
    },

    clearThameFilters() {
        this.renderThameGrid('', '', '');
    },

    toggleAllThameSelect(checked) {
        if (checked) {
            (this._thameBatches || []).forEach(b => this._selectedBatchIds.add(b.id));
        } else {
            this._selectedBatchIds.clear();
        }
        this.onThameFilterChange();
    },

    toggleThameSelect(id, checked) {
        if (checked) this._selectedBatchIds.add(id);
        else this._selectedBatchIds.delete(id);
    },

    toggleFreeze(id) {
        const batch = (this._thameBatches || []).find(b => b.id === id);
        if (batch) {
            batch.isFrozen = !batch.isFrozen;
            batch.freezeDate = batch.isFrozen ? getCurrentDateFormatted() : '';
            showToast(`Batch ${id} freeze status updated`, 'info');
            this.onThameFilterChange();
        }
    },

    freezeSelectedThame() {
        if (this._selectedBatchIds.size === 0) {
            showToast('Please select batches to freeze', 'warning');
            return;
        }
        const today = getCurrentDateFormatted();
        (this._thameBatches || []).forEach(b => {
            if (this._selectedBatchIds.has(b.id)) {
                b.isFrozen = true;
                b.freezeDate = today;
            }
        });
        showToast(`Frozen ${this._selectedBatchIds.size} batch(es)`, 'success');
        this.onThameFilterChange();
    },

    deleteSelectedThame() {
        if (this._selectedBatchIds.size === 0) {
            showToast('Please select batches to delete', 'warning');
            return;
        }
        this._thameBatches = (this._thameBatches || []).filter(b => !this._selectedBatchIds.has(b.id));
        this._selectedBatchIds.clear();
        showToast('Selected batches removed', 'success');
        this.onThameFilterChange();
    },

    rescheduleThame(id) {
        showToast(`Reschedule requested for batch ${id}`, 'info');
    },

    agreeThame(id) {
        const batch = (this._thameBatches || []).find(b => b.id === id);
        if (batch) {
            batch.status = 'AGREED';
            showToast(`Batch ${batch.description} schedule confirmed & agreed`, 'success');
            this.onThameFilterChange();
        }
    },

    openLinkedShopOrder(soId) {
        if (soId) {
            navigateTo('shop-order');
            setTimeout(() => {
                const search = document.getElementById('soSearch');
                if (search) {
                    search.value = soId;
                    ExistingPages.searchShopOrder(soId);
                }
            }, 100);
        } else {
            navigateTo('shop-order');
        }
    },

    viewThameComments(id) {
        const batch = (this._thameBatches || []).find(b => b.id === id);
        const comments = batch?.comments || [];
        const content = comments.length > 0 
            ? comments.map(c => `<div style="padding:8px 0; border-bottom:1px solid #eee;"><strong>${escapeHtml(c.author)} (${escapeHtml(c.role)}):</strong><div style="font-size:12px; color:#475569;">${escapeHtml(c.text)}</div><div style="font-size:10px; color:#94a3b8;">${escapeHtml(c.time)}</div></div>`).join('')
            : '<p>No comments on this batch schedule yet.</p>';
        openModal(`Comments - ${escapeHtml(batch?.description || id)}`, content, '<button class="btn btn-secondary" onclick="closeModal()">Close</button>');
    },

    showAddThameBatchModal() {
        const content = `
            <div class="form-grid">
                <div class="form-group full-width">
                    <label>Product Name</label>
                    <input type="text" id="newBatchDesc" placeholder="e.g. Zacco 5mg/5ml Oral Susp 150ml UAE" class="form-control">
                </div>
                <div class="form-group">
                    <label>Batch Size</label>
                    <input type="number" id="newBatchSize" placeholder="e.g. 1000" class="form-control">
                </div>
                <div class="form-group">
                    <label>Estimated Date</label>
                    <input type="date" id="newBatchDate" class="form-control">
                </div>
            </div>
        `;
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="ExistingPages.saveNewThameBatch()"><i class="fas fa-plus"></i> Add Batch</button>
        `;
        openModal('Add Manufacturing Batch', content, footer);
    },

    saveNewThameBatch() {
        const desc = document.getElementById('newBatchDesc')?.value;
        const size = document.getElementById('newBatchSize')?.value;
        const date = document.getElementById('newBatchDate')?.value;
        if (!desc || !size) {
            showToast('Please fill in product description and batch size', 'warning');
            return;
        }
        const newBatch = {
            id: `TMP-2026-00${(this._thameBatches?.length || 0) + 1}`,
            srNo: (this._thameBatches?.length || 0) + 1,
            description: desc,
            batchSize: Number(size),
            estimatedDate: date || getCurrentDateFormatted(),
            dayOfWeek: date ? new Date(date).toLocaleDateString('en-US', { weekday: 'long' }) : 'Friday',
            status: 'SCHEDULED',
            freezeDate: '',
            isFrozen: false,
            commentsCount: 0
        };
        this._thameBatches.push(newBatch);
        closeModal();
        showToast('New batch added to manufacturing planning', 'success');
        this.onThameFilterChange();
    },

    exportThameCSV() {
        exportToCSV('Thame_Manufacturing_Schedule', this._thameBatches || []);
    },

    exportThameSummary() {
        exportToCSV('Thame_Schedule_Summary', this._thameBatches || []);
    },

    renderWIP() {
        const batches = this._thameBatches || [
            { id: "TMP-2026-001", description: "Zacco 5mg/5ml Oral Susp 150ml UAE", batchSize: 333, workCentre: "Oral Liquids Suite 1", stage: "Compounding & Mixing", progressPct: 50 },
            { id: "TMP-2026-002", description: "fluxetyl (Fluoxetine Hydrochloride) 20mg/5ml Oral Solution", batchSize: 1428, workCentre: "Oral Liquids Suite 1", stage: "Automated Filling", progressPct: 75 },
            { id: "TMP-2026-003", description: "Bisoprolol Fumarate 0.5mg/ml Oral Solution 150ml", batchSize: 1200, workCentre: "Suite 2", stage: "Carton Packaging", progressPct: 90 }
        ];

        let html = `
        <div class="thame-planning-container">
            <div class="thame-header-section">
                <h1 class="thame-title">Quantity In Progress (WIP Tracking)</h1>
                <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Real-time shop floor execution and stage progression</p>
            </div>
            <div class="thame-table-wrapper">
                <table class="thame-grid-table">
                    <thead>
                        <tr>
                            <th style="width: 60px; text-align: center;">Sr No.</th>
                            <th style="text-align: left;">Product Description</th>
                            <th style="width: 120px; text-align: center;">Batch Size</th>
                            <th style="text-align: left;">Current Stage</th>
                            <th style="width: 150px; text-align: center;">Progress</th>
                            <th style="text-align: left;">Work Centre</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${batches.map((b, idx) => `
                        <tr>
                            <td style="text-align: center;">${idx + 1}</td>
                            <td style="font-weight: 600;">${escapeHtml(b.description)}</td>
                            <td style="text-align: center;">${formatNumber(b.batchSize)}</td>
                            <td><span class="badge badge-info">${escapeHtml(b.stage || 'In Production')}</span></td>
                            <td style="text-align: center;">
                                <div style="background:#e2e8f0; border-radius:4px; height:12px; overflow:hidden;">
                                    <div style="background:#0284c7; height:100%; width:${b.progressPct || 50}%;"></div>
                                </div>
                                <span style="font-size:10px; color:#64748b;">${b.progressPct || 50}%</span>
                            </td>
                            <td>${escapeHtml(b.workCentre || 'Oral Liquids Suite 1')}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
        document.getElementById('pageContent').innerHTML = html;
    },

    renderBackOrder() {
        const backOrders = DataStore.get('backOrders') || [
            { backOrderId: "BO-2026-001", soNumber: "SO-EXP-2026-0045", customerName: "PharmaCare Australia Pty Ltd", productName: "Levetiracetam 100mg/ml Oral Solution 150ml", orderQty: 2250, fulfilledQty: 2000, backOrderQty: 250, reasonDescription: "Primary line batch capped at 2000 units.", status: "SCHEDULED" },
            { backOrderId: "BO-2026-002", soNumber: "SO-NHS-2026-0891", customerName: "NHS Supply Chain", productName: "Alfresed (Alimemazine Tartrate) 30mg/5ml Oral Syrup 100ml", orderQty: 1800, fulfilledQty: 1500, backOrderQty: 300, reasonDescription: "Active API lot undergoing routine QA re-test.", status: "PENDING_RM" }
        ];

        let html = `
        <div class="thame-planning-container">
            <div class="thame-header-section">
                <h1 class="thame-title">Back Order Management</h1>
                <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Unified ledger of unfulfilled domestic NHS and export orders</p>
            </div>
            <div class="thame-table-wrapper">
                <table class="thame-grid-table">
                    <thead>
                        <tr>
                            <th style="width: 100px;">Back Order ID</th>
                            <th style="width: 120px;">SO Number</th>
                            <th>Customer</th>
                            <th>Product Name</th>
                            <th style="width: 90px; text-align: right;">Order Qty</th>
                            <th style="width: 90px; text-align: right;">Fulfilled</th>
                            <th style="width: 100px; text-align: right;">Back Order Qty</th>
                            <th>Reason / Resolution</th>
                            <th style="width: 110px; text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${backOrders.map(b => `
                        <tr>
                            <td style="font-weight: 600;">${escapeHtml(b.backOrderId)}</td>
                            <td>${escapeHtml(b.soNumber)}</td>
                            <td>${escapeHtml(b.customerName)}</td>
                            <td style="font-weight: 600;">${escapeHtml(b.productName)}</td>
                            <td style="text-align: right;">${formatNumber(b.orderQty)}</td>
                            <td style="text-align: right;">${formatNumber(b.fulfilledQty)}</td>
                            <td style="text-align: right; color: #e11d48; font-weight: 700;">${formatNumber(b.backOrderQty)}</td>
                            <td style="font-size: 11px;">${escapeHtml(b.reasonDescription || '-')}</td>
                            <td style="text-align: center;"><span class="badge ${b.status === 'SCHEDULED' ? 'badge-warning' : 'badge-danger'}">${escapeHtml(b.status)}</span></td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
        document.getElementById('pageContent').innerHTML = html;
    },

    renderRMResponsibility() {
        navigateTo('rm-management');
    },

    renderCMO() {
        const cmoData = DataStore.get('cmo');

        let html = '<div class="page-header">';
        html += '<div><h1 class="page-title">CMO Operations View</h1>';
        html += '<div class="page-subtitle">Standard Contract Manufacturing inventory &amp; product stock</div></div>';
        html += '<select class="theme-selector"><option>Thame</option></select>';
        html += '</div>';

        html += renderStatsCards([
            { label: 'CMO Products', value: cmoData.length, color: 'blue' },
            { label: 'Short Dated Risk', value: cmoData.filter(c => c.shortDated && c.shortDated.includes('Risk')).length, color: 'orange' },
            { label: 'Obsolete Risk', value: cmoData.filter(c => c.obsolete && c.obsolete.includes('Risk')).length, color: 'red' }
        ]);

        html += `
            <div class="filter-bar">
                <input type="text" id="cmoStdSearch" placeholder="Search CMO products..." 
                    oninput="ExistingPages.searchCMO(this.value)">
                <button class="btn btn-primary" onclick="navigateTo('cmo-dashboard')">
                    <i class="fas fa-gauge-high"></i> Open Executive CMO Dashboard
                </button>
                <button class="btn btn-warning btn-icon" title="Export CSV" onclick="ExistingPages.exportCMO()">
                    <i class="fas fa-file-export"></i>
                </button>
            </div>
            <div id="cmoStdTableContainer"></div>
        `;

        document.getElementById('pageContent').innerHTML = html;

        this._cmoStdTable = new DataTable('cmoStdTableContainer', {
            columns: [
                { field: 'partNo', label: 'Part No', width: '130px' },
                { field: 'description', label: 'Description', maxLen: 40 },
                { field: 'contract', label: 'Contract', width: '90px' },
                { field: 'qty', label: 'Quantity', type: 'number', width: '90px' },
                { field: 'average', label: 'Avg Sales', type: 'number', width: '85px' },
                { field: 'mos', label: 'MOS', type: 'number', width: '65px' },
                { field: 'cogsUnit', label: 'Unit COGS', type: 'number', width: '85px' },
                { field: 'cogsTotal', label: 'Total COGS', type: 'number', width: '95px' }
            ],
            data: cmoData,
            pageSize: 30,
            sortCol: 'partNo'
        });
        this._cmoStdTable.render();
    },

    searchCMO(term) {
        if (this._cmoStdTable) this._cmoStdTable.search(term);
    },

    exportCMO() {
        const cmoData = DataStore.get('cmo');
        exportToCSV('CMO_Stock_Report', cmoData);
    }
};
