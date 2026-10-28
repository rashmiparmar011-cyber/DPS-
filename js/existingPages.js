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
        const products = DataStore.get('products');

        let html = '<div class="page-header">';
        html += '<div><h1 class="page-title">Thame Manufacturing Operations</h1>';
        html += '<div class="page-subtitle">Site-level demand planning, inventory levels, and production lines</div></div>';
        html += '<select class="theme-selector"><option>Thame</option></select>';
        html += '</div>';

        html += renderStatsCards([
            { label: 'Thame Products', value: products.length, color: 'blue' },
            { label: 'Good Stock Policy', value: products.filter(p => p.withinStockHoldPolicy === 'YES').length, color: 'green' },
            { label: 'Understock Warnings', value: products.filter(p => p.stockStatus === 'UNDERSTOCK').length, color: 'red' }
        ]);

        html += `
            <div class="filter-bar">
                <input type="text" id="thameSearch" placeholder="Search Thame products..." 
                    oninput="ExistingPages.searchThame(this.value)">
                <button class="btn btn-warning btn-icon" title="Export CSV" onclick="ExistingPages.exportThame()">
                    <i class="fas fa-file-export"></i>
                </button>
            </div>
            <div id="thameTableContainer"></div>
        `;

        document.getElementById('pageContent').innerHTML = html;

        this._thameTable = new DataTable('thameTableContainer', {
            columns: [
                { field: 'description', label: 'Product Name', maxLen: 45 },
                { field: 'shelfLife', label: 'Shelf Life', type: 'number', width: '80px' },
                { field: 'qtyOnHand', label: 'Qty On Hand', type: 'number', width: '95px' },
                { field: 'average', label: 'Avg Monthly', type: 'number', width: '90px' },
                { field: 'mos', label: 'MOS', type: 'number', width: '70px' },
                { field: 'stockStatus', label: 'Stock Status', type: 'stock', width: '95px' },
                { field: 'salesCategory', label: 'Category', width: '80px' },
                { field: 'withinStockHoldPolicy', label: 'Hold Policy', type: 'badge', width: '85px' }
            ],
            data: products,
            pageSize: 30,
            sortCol: 'description'
        });
        this._thameTable.render();
    },

    searchThame(term) {
        if (this._thameTable) this._thameTable.search(term);
    },

    exportThame() {
        const products = DataStore.get('products');
        exportToCSV('Thame_Operations_Report', products);
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
