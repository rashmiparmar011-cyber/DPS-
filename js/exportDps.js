/* ============================================================
   Module 4: Export DPS (Sales Order & Export Management)
   - Customer information available, SO confirmation sent to customer from software
   - Integrated in the production plan
   - Tracking the export status in the system (changes delays to be seen with audit), alert generated
   - Back order available with dates
   - Incoterms, Logistics costs and pharmadox costs as additional costs added to SO
   ============================================================ */

const ExportDPS = {
    currentTab: 'orders', // 'orders' | 'production' | 'backorders' | 'audit'
    table: null,
    _ordersData: [],

    render(tab = 'orders') {
        this.currentTab = tab;
        const orders = DataStore.get('exportOrders') || [];
        this._ordersData = orders;

        // Statistics
        const totalOrders = orders.length;
        const totalExportValue = orders.reduce((sum, o) => sum + parseNum(o.totalValue), 0);
        const totalLogistics = orders.reduce((sum, o) => sum + parseNum(o.logisticsCost), 0);
        const totalPharmadox = orders.reduce((sum, o) => sum + parseNum(o.pharmadoxCost), 0);
        const backOrdersCount = orders.filter(o => parseNum(o.backOrderQty) > 0).length;
        const delayedCount = orders.filter(o => o.isDelayed).length;
        const pendingConfirmations = orders.filter(o => o.confirmationStatus === 'Pending').length;

        let html = '<div class="page-header">';
        html += '<div><h1 class="page-title">Export DPS</h1>';
        html += '<div class="page-subtitle">Export Sales Orders, automated customer SO confirmation, Incoterms, Pharmadox costs &amp; delay audit</div></div>';
        html += '<select class="theme-selector"><option>Thame</option></select>';
        html += '</div>';

        // Stats cards
        html += renderStatsCards([
            { label: 'Total Export Orders', value: totalOrders, color: 'blue' },
            { label: 'Total Export Value', value: `£${formatNumber(totalExportValue)}`, color: 'green' },
            { label: 'Pending SO Confirmations', value: pendingConfirmations, color: 'orange' },
            { label: 'Orders with Back Orders', value: backOrdersCount, color: 'purple' },
            { label: 'Export Delays (Audit Alerts)', value: delayedCount, color: 'red' },
            { label: 'Pharmadox Release Costs', value: `£${formatNumber(totalPharmadox)}`, color: 'blue' }
        ]);

        // Module Tabs
        html += `
            <div style="display: flex; gap: 10px; margin-bottom: 16px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px; flex-wrap: wrap;">
                <button class="btn ${this.currentTab === 'orders' ? 'btn-primary' : 'btn-secondary'}" 
                    onclick="ExportDPS.render('orders')">
                    <i class="fas fa-file-invoice"></i> Export Sales Orders (${totalOrders})
                </button>
                <button class="btn ${this.currentTab === 'production' ? 'btn-primary' : 'btn-secondary'}" 
                    onclick="ExportDPS.render('production')">
                    <i class="fas fa-industry"></i> Integrated Production Plan
                </button>
                <button class="btn ${this.currentTab === 'backorders' ? 'btn-primary' : 'btn-secondary'}" 
                    onclick="ExportDPS.render('backorders')">
                    <i class="fas fa-calendar-check"></i> Back Orders with Dates (${backOrdersCount})
                </button>
                <button class="btn ${this.currentTab === 'audit' ? 'btn-danger' : 'btn-secondary'}" 
                    onclick="ExportDPS.render('audit')">
                    <i class="fas fa-history"></i> Status Audit Trail &amp; Delay Alerts (${delayedCount})
                </button>
            </div>
        `;

        if (this.currentTab === 'orders') {
            html += this._renderOrdersTab();
        } else if (this.currentTab === 'production') {
            html += this._renderProductionTab();
        } else if (this.currentTab === 'backorders') {
            html += this._renderBackordersTab();
        } else {
            html += this._renderAuditTab();
        }

        document.getElementById('pageContent').innerHTML = html;

        if (this.currentTab === 'orders') {
            this._initOrdersTable();
        } else if (this.currentTab === 'production') {
            this._initProductionTable();
        } else if (this.currentTab === 'backorders') {
            this._initBackordersTable();
        }
    },

    _renderOrdersTab() {
        return `
            <div class="filter-bar">
                <input type="text" id="expSearch" placeholder="Search customer, order no, country, product..." 
                    oninput="ExportDPS.search(this.value)">
                <select id="expStatusFilter" onchange="ExportDPS.filterStatus(this.value)">
                    <option value="">All Export Statuses</option>
                    <option value="Order Placed">Order Placed</option>
                    <option value="Production Scheduled">Production Scheduled</option>
                    <option value="In Production">In Production</option>
                    <option value="QC Passed">QC Passed</option>
                    <option value="Delivered">Delivered</option>
                </select>
                <button class="btn btn-primary" onclick="ExportDPS.showNewOrderModal()">
                    <i class="fas fa-plus"></i> New Export Sales Order
                </button>
                <button class="btn btn-warning btn-icon" title="Export CSV" onclick="ExportDPS.exportOrdersData()">
                    <i class="fas fa-file-export"></i>
                </button>
                <button class="btn btn-secondary btn-icon" title="Refresh" onclick="ExportDPS.render('orders')">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
            <div id="exportOrdersContainer"></div>
        `;
    },

    _initOrdersTable() {
        this.table = new DataTable('exportOrdersContainer', {
            columns: [
                { field: 'soNumber', label: 'Export SO #', width: '120px' },
                { field: 'customerName', label: 'Customer', maxLen: 30 },
                { field: 'destinationCountry', label: 'Country', width: '90px' },
                { field: 'productName', label: 'Product Name', maxLen: 32 },
                { field: 'orderedQty', label: 'Qty', type: 'number', width: '75px' },
                { field: 'incoterm', label: 'Incoterms', width: '120px' },
                { field: 'logisticsCost', label: 'Logistics (£)', type: 'number', width: '85px' },
                { field: 'pharmadoxCost', label: 'Pharmadox (£)', type: 'number', width: '90px' },
                { field: 'totalValue', label: 'Total Value (£)', type: 'number', width: '95px' },
                { field: 'confirmationStatus', label: 'SO Confirmation', type: 'badge', width: '110px' },
                { field: 'exportStatus', label: 'Status', type: 'badge', width: '120px' },
                { field: 'backOrderQty', label: 'Back Order', type: 'number', width: '75px' },
                { field: 'delayAlert', label: 'Audit / Delay Alert', type: 'badge', width: '160px' }
            ],
            data: this._ordersData,
            pageSize: 20,
            sortCol: 'soNumber',
            onRowClick: (id) => this.showOrderDetail(id)
        });
        this.table.render();
    },

    _renderProductionTab() {
        return `
            <div class="alert alert-info" style="margin-bottom: 16px; padding: 12px; background: #e8f4fd; border-left: 4px solid var(--accent-blue); border-radius: 4px; font-size: 12px;">
                <i class="fas fa-link"></i> <strong>Seamless Production Plan Integration:</strong>
                Export sales order volumes are directly coupled into the DPS Master Production Schedule. Material requirements and batch packaging allocations are reserved in real-time.
            </div>
            <div id="exportProdContainer"></div>
        `;
    },

    _initProductionTable() {
        const prodData = this._ordersData.map(o => ({
            soNumber: o.soNumber,
            customerName: o.customerName,
            productName: o.productName,
            orderedQty: o.orderedQty,
            productionPlanLinked: o.productionPlanLinked || 'Batch Scheduling in Progress',
            requestedDeliveryDate: o.requestedDeliveryDate,
            confirmedDeliveryDate: o.confirmedDeliveryDate,
            exportStatus: o.exportStatus,
            manufacturingSite: 'Thame Sterile Facility Line 1'
        }));

        this.table = new DataTable('exportProdContainer', {
            columns: [
                { field: 'soNumber', label: 'Export SO #', width: '120px' },
                { field: 'customerName', label: 'Customer', maxLen: 30 },
                { field: 'productName', label: 'Product Name', maxLen: 35 },
                { field: 'orderedQty', label: 'Allocated Qty', type: 'number', width: '90px' },
                { field: 'productionPlanLinked', label: 'Linked Production Batch', width: '180px' },
                { field: 'manufacturingSite', label: 'Mfg Site / Line', width: '160px' },
                { field: 'confirmedDeliveryDate', label: 'Target Completion', width: '110px' },
                { field: 'exportStatus', label: 'Production Status', type: 'badge', width: '120px' }
            ],
            data: prodData,
            pageSize: 20,
            sortCol: 'soNumber'
        });
        this.table.render();
    },

    _renderBackordersTab() {
        return `
            <div class="alert alert-warning" style="margin-bottom: 16px; padding: 12px; background: #fff8e1; border-left: 4px solid var(--accent-orange); border-radius: 4px; font-size: 12px;">
                <i class="fas fa-boxes"></i> <strong>Export Back Order Management:</strong>
                Split fulfillment and back order dispatch schedule. Shows committed release dates so international consignees have full visibility of partial shipments.
            </div>
            <div id="exportBackordersContainer"></div>
        `;
    },

    _initBackordersTable() {
        const backorders = this._ordersData.filter(o => parseNum(o.backOrderQty) > 0);

        this.table = new DataTable('exportBackordersContainer', {
            columns: [
                { field: 'soNumber', label: 'Export SO #', width: '120px' },
                { field: 'customerName', label: 'Customer', maxLen: 30 },
                { field: 'productName', label: 'Product', maxLen: 35 },
                { field: 'orderedQty', label: 'Total Order', type: 'number', width: '90px' },
                { field: 'backOrderQty', label: 'Back Order Qty', type: 'number', width: '100px' },
                { field: 'backOrderDate', label: 'Committed Dispatch Date', width: '140px' },
                { field: 'destinationCountry', label: 'Destination', width: '100px' },
                { field: 'incoterm', label: 'Incoterms', width: '120px' }
            ],
            data: backorders,
            pageSize: 20,
            sortCol: 'soNumber'
        });
        this.table.render();
    },

    _renderAuditTab() {
        let auditHtml = '<div style="background: #fff; border: 1px solid var(--border-color); border-radius: 6px; padding: 16px;">';
        auditHtml += '<h3 style="margin-top: 0; margin-bottom: 15px; font-size: 15px;"><i class="fas fa-shield-alt"></i> Export Status Change History &amp; Delay Alert Audit Log</h3>';

        this._ordersData.forEach(o => {
            auditHtml += `
                <div style="margin-bottom: 20px; border-left: 3px solid ${o.isDelayed ? 'var(--accent-red)' : 'var(--accent-blue)'}; padding-left: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <strong>${escapeHtml(o.soNumber)} - ${escapeHtml(o.customerName)} (${escapeHtml(o.destinationCountry)})</strong>
                        <span class="badge ${o.isDelayed ? 'badge-danger' : 'badge-success'}">${escapeHtml(o.delayAlert)}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">
                        Product: ${escapeHtml(o.productName)} | Qty: ${formatNumber(o.orderedQty)} | Delivery: ${escapeHtml(o.confirmedDeliveryDate)}
                    </div>
                    <div class="table-wrapper">
                        <table class="data-table" style="font-size: 11px;">
                            <thead><tr><th>Timestamp</th><th>User / System</th><th>Event</th><th>Audit Notes</th></tr></thead>
                            <tbody>
                                ${(o.auditTrail || []).map(a => `
                                    <tr>
                                        <td style="width: 140px;">${escapeHtml(a.date)}</td>
                                        <td style="width: 130px;"><strong>${escapeHtml(a.user)}</strong></td>
                                        <td style="width: 150px;"><span class="badge badge-secondary">${escapeHtml(a.event)}</span></td>
                                        <td>${escapeHtml(a.note)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });

        auditHtml += '</div>';
        return auditHtml;
    },

    search(term) {
        if (this.table) this.table.search(term);
    },

    filterStatus(st) {
        let filtered = [...(this._ordersData || [])];
        if (st) {
            filtered = filtered.filter(o => o.exportStatus === st);
        }
        if (this.table) this.table.setData(filtered);
    },

    showOrderDetail(id) {
        const record = (this._ordersData || []).find(o => o.id == id);
        if (!record) return;

        const bodyHtml = `
            <div style="font-size: 13px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <p><strong>Export SO #:</strong> ${escapeHtml(record.soNumber)}</p>
                        <p><strong>Customer:</strong> ${escapeHtml(record.customerName)}</p>
                        <p><strong>Contact Email:</strong> ${escapeHtml(record.contactEmail)}</p>
                        <p><strong>Destination Country:</strong> ${escapeHtml(record.destinationCountry)}</p>
                        <p><strong>Product:</strong> ${escapeHtml(record.productName)}</p>
                        <p><strong>Ordered Quantity:</strong> ${formatNumber(record.orderedQty)} units</p>
                    </div>
                    <div style="background: #f9fafb; padding: 10px; border-radius: 4px; border: 1px solid var(--border-color);">
                        <h4 style="margin: 0 0 8px 0; font-size: 13px;">Financial &amp; Cost Breakdown</h4>
                        <p><strong>Product Value:</strong> £${formatNumber(record.productValue)}</p>
                        <p><strong>Incoterms:</strong> <span class="badge badge-info">${escapeHtml(record.incoterm)}</span></p>
                        <p><strong>Logistics Costs:</strong> £${formatNumber(record.logisticsCost)}</p>
                        <p><strong>Pharmadox Costs:</strong> £${formatNumber(record.pharmadoxCost)}</p>
                        <hr style="margin: 6px 0; border: none; border-top: 1px solid #ddd;">
                        <p style="font-size: 14px; color: var(--accent-blue);"><strong>Total Invoice Value:</strong> £${formatNumber(record.totalValue)}</p>
                    </div>
                </div>
                <div style="margin-bottom: 12px;">
                    <p><strong>SO Confirmation:</strong> <span class="badge ${record.confirmationStatus === 'Confirmed' ? 'badge-success' : 'badge-warning'}">${record.confirmationStatus}</span> (Sent: ${record.confirmationSentDate})</p>
                    <p><strong>Current Status:</strong> <span class="badge badge-primary">${record.exportStatus}</span></p>
                    <p><strong>Back Order Available:</strong> ${record.backOrderQty > 0 ? `${formatNumber(record.backOrderQty)} units (Dispatch Date: ${record.backOrderDate})` : 'None (Full Fulfillment)'}</p>
                    <p><strong>Production Plan Link:</strong> <span class="badge badge-secondary">${record.productionPlanLinked}</span></p>
                    <p><strong>Delay Alert:</strong> <span class="badge ${record.isDelayed ? 'badge-danger' : 'badge-success'}">${escapeHtml(record.delayAlert)}</span></p>
                </div>
            </div>
        `;

        const footerHtml = `
            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            <button class="btn btn-primary" onclick="ExportDPS.sendConfirmation('${record.id}')">
                <i class="fas fa-paper-plane"></i> Send SO Confirmation to Customer
            </button>
            <button class="btn btn-warning" onclick="ExportDPS.showUpdateStatusModal('${record.id}')">
                <i class="fas fa-edit"></i> Update Status &amp; Delay Audit
            </button>
        `;

        openModal('Export Sales Order - ' + record.soNumber, bodyHtml, footerHtml);
    },

    sendConfirmation(id) {
        const orders = DataStore.get('exportOrders') || [];
        const order = orders.find(o => o.id == id);
        if (!order) return;

        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
        order.confirmationStatus = 'Confirmed';
        order.confirmationSentDate = nowStr;
        if (!order.auditTrail) order.auditTrail = [];
        order.auditTrail.unshift({
            date: nowStr,
            user: 'Export Manager',
            event: 'SO Confirmation Dispatched',
            note: `Electronic sales order confirmation email sent to ${order.contactEmail}`
        });

        DataStore.set('exportOrders', orders);
        closeModal();
        showToast(`SO Confirmation sent to ${order.contactEmail}! Audit trail updated.`, 'success');
        this.render(this.currentTab);
    },

    showUpdateStatusModal(id) {
        const order = (this._ordersData || []).find(o => o.id == id);
        if (!order) return;

        const bodyHtml = `
            <div style="font-size: 13px;">
                <p><strong>Updating Order:</strong> ${escapeHtml(order.soNumber)} (${escapeHtml(order.customerName)})</p>
                <div class="form-group">
                    <label class="form-label">New Export Status <span class="required">*</span></label>
                    <select id="updateStatusSelect" class="form-control">
                        ${['Order Placed', 'SO Confirmed', 'Production Scheduled', 'In Production', 'QC Passed', 'Logistics/Customs', 'Delivered'].map(s => 
                            `<option value="${s}" ${s === order.exportStatus ? 'selected' : ''}>${s}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Delay Flag / Alert Status</label>
                    <select id="updateDelayFlag" class="form-control">
                        <option value="no" ${!order.isDelayed ? 'selected' : ''}>On Time - No Delay</option>
                        <option value="yes" ${order.isDelayed ? 'selected' : ''}>DELAY DETECTED (Generate System Alert)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Reason / Delay Audit Note</label>
                    <input type="text" id="updateAuditNote" class="form-control" placeholder="e.g. Vessel delay, QC release pending, customs paperwork..." value="">
                </div>
            </div>
        `;

        const footerHtml = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-success" onclick="ExportDPS.saveStatusUpdate('${order.id}')">
                <i class="fas fa-save"></i> Save Status &amp; Generate Audit Entry
            </button>
        `;

        openModal('Update Export Status &amp; Audit', bodyHtml, footerHtml);
    },

    saveStatusUpdate(id) {
        const orders = DataStore.get('exportOrders') || [];
        const order = orders.find(o => o.id == id);
        if (!order) return;

        const newStatus = document.getElementById('updateStatusSelect')?.value;
        const delayFlag = document.getElementById('updateDelayFlag')?.value === 'yes';
        const note = document.getElementById('updateAuditNote')?.value || `Status transitioned to ${newStatus}`;
        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

        order.exportStatus = newStatus;
        order.isDelayed = delayFlag;
        if (delayFlag) {
            order.delayAlert = 'ALERT: ' + note;
        } else {
            order.delayAlert = 'Normal - ' + newStatus;
        }

        if (!order.auditTrail) order.auditTrail = [];
        order.auditTrail.unshift({
            date: nowStr,
            user: 'SCM Export Lead',
            event: delayFlag ? 'Delay Alert Generated' : `Status: ${newStatus}`,
            note: note
        });

        DataStore.set('exportOrders', orders);
        closeModal();
        showToast('Export status updated and delay audit generated!', delayFlag ? 'warning' : 'success');
        this.render(this.currentTab);
    },

    showNewOrderModal() {
        const products = DataStore.get('products') || [];
        const exportProds = products.filter(p => p.salesCategory && p.salesCategory.toUpperCase() === 'EXPORT');
        const prodList = (exportProds.length > 0 ? exportProds : products).slice(0, 30);

        const bodyHtml = `
            <div style="font-size: 13px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div class="form-group">
                        <label class="form-label">SO Number <span class="required">*</span></label>
                        <input type="text" id="newSoNum" class="form-control" value="SO-EXP-2026-00${this._ordersData.length + 1}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Customer Name <span class="required">*</span></label>
                        <input type="text" id="newCustName" class="form-control" placeholder="e.g. Medix Pharma GmbH" required>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div class="form-group">
                        <label class="form-label">Customer Contact Email <span class="required">*</span></label>
                        <input type="email" id="newCustEmail" class="form-control" placeholder="e.g. orders@medix.de" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Destination Country <span class="required">*</span></label>
                        <input type="text" id="newCountry" class="form-control" placeholder="e.g. Germany" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Export Product <span class="required">*</span></label>
                    <select id="newProduct" class="form-control">
                        ${prodList.map(p => `<option value="${escapeHtml(p.description)}">${escapeHtml(p.description)}</option>`).join('')}
                    </select>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                    <div class="form-group">
                        <label class="form-label">Ordered Qty <span class="required">*</span></label>
                        <input type="number" id="newQty" class="form-control" value="25000" min="1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Unit Price (£) <span class="required">*</span></label>
                        <input type="number" id="newUnitPrice" class="form-control" value="2.50" step="0.01">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Incoterms <span class="required">*</span></label>
                        <select id="newIncoterm" class="form-control">
                            <option value="CIF - Destination Port">CIF (Cost, Insurance &amp; Freight)</option>
                            <option value="FOB - UK Port">FOB (Free On Board)</option>
                            <option value="DDP - Customer Depot">DDP (Delivered Duty Paid)</option>
                            <option value="EXW - Thame Facility">EXW (Ex Works)</option>
                            <option value="CFR - Destination Port">CFR (Cost &amp; Freight)</option>
                            <option value="DAP - Border Depot">DAP (Delivered At Place)</option>
                        </select>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div class="form-group">
                        <label class="form-label">Logistics Costs (£) <span class="required">*</span></label>
                        <input type="number" id="newLogistics" class="form-control" value="3200" step="10">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Pharmadox Costs (£) <span class="required">*</span></label>
                        <input type="number" id="newPharmadox" class="form-control" value="1500" step="10">
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div class="form-group">
                        <label class="form-label">Back Order Qty (if any)</label>
                        <input type="number" id="newBackorderQty" class="form-control" value="0" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Back Order Date</label>
                        <input type="date" id="newBackorderDate" class="form-control" value="">
                    </div>
                </div>
                <div class="alert alert-info" style="font-size: 11px; padding: 8px; margin-top: 10px;">
                    <i class="fas fa-check-double"></i> Adding this SO will automatically add Incoterms, Logistics, and Pharmadox costs, integrate demand into the DPS production plan, and enable one-click customer confirmation.
                </div>
            </div>
        `;

        const footerHtml = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="ExportDPS.saveNewOrder()">
                <i class="fas fa-save"></i> Create Export Order
            </button>
        `;

        openModal('New Export Sales Order', bodyHtml, footerHtml);
    },

    saveNewOrder() {
        const soNumber = document.getElementById('newSoNum')?.value;
        const customerName = document.getElementById('newCustName')?.value;
        const contactEmail = document.getElementById('newCustEmail')?.value;
        const destinationCountry = document.getElementById('newCountry')?.value;
        const productName = document.getElementById('newProduct')?.value;
        const qty = parseNum(document.getElementById('newQty')?.value);
        const unitPrice = parseNum(document.getElementById('newUnitPrice')?.value);
        const incoterm = document.getElementById('newIncoterm')?.value;
        const logisticsCost = parseNum(document.getElementById('newLogistics')?.value);
        const pharmadoxCost = parseNum(document.getElementById('newPharmadox')?.value);
        const backOrderQty = parseNum(document.getElementById('newBackorderQty')?.value);
        const backOrderDate = document.getElementById('newBackorderDate')?.value || '-';

        if (!customerName || !contactEmail || !destinationCountry || qty <= 0) {
            showToast('Please fill in all mandatory customer and product fields', 'warning');
            return;
        }

        const productValue = qty * unitPrice;
        const totalValue = productValue + logisticsCost + pharmadoxCost;
        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

        const newOrder = {
            id: soNumber,
            soNumber: soNumber,
            customerName: customerName,
            contactEmail: contactEmail,
            destinationCountry: destinationCountry,
            productName: productName,
            partNo: 'EXP-' + Math.floor(1000 + Math.random() * 9000),
            orderedQty: qty,
            unitPrice: unitPrice,
            productValue: productValue,
            incoterm: incoterm,
            logisticsCost: logisticsCost,
            pharmadoxCost: pharmadoxCost,
            totalValue: totalValue,
            orderDate: new Date().toISOString().split('T')[0],
            requestedDeliveryDate: '2026-12-15',
            confirmedDeliveryDate: '2026-12-15',
            exportStatus: 'Order Placed',
            confirmationStatus: 'Pending',
            confirmationSentDate: '-',
            backOrderQty: backOrderQty,
            backOrderDate: backOrderDate,
            delayAlert: 'New Order - Awaiting SO Confirmation',
            isDelayed: false,
            productionPlanLinked: `Batch #26B-EXP${Math.floor(100 + Math.random() * 900)} (Auto-Integrated)`,
            auditTrail: [
                { date: nowStr, user: 'Export Coordinator', event: 'Order Created', note: `Export SO entered with Incoterm ${incoterm}` }
            ]
        };

        const orders = DataStore.get('exportOrders') || [];
        orders.unshift(newOrder);
        DataStore.set('exportOrders', orders);

        closeModal();
        showToast(`Export Sales Order ${soNumber} created and integrated into production plan!`, 'success');
        this.render('orders');
    },

    exportOrdersData() {
        const cols = [
            { field: 'soNumber', label: 'Export SO #' },
            { field: 'customerName', label: 'Customer Name' },
            { field: 'destinationCountry', label: 'Country' },
            { field: 'productName', label: 'Product Name' },
            { field: 'orderedQty', label: 'Quantity' },
            { field: 'unitPrice', label: 'Unit Price' },
            { field: 'productValue', label: 'Product Value' },
            { field: 'incoterm', label: 'Incoterms' },
            { field: 'logisticsCost', label: 'Logistics Cost' },
            { field: 'pharmadoxCost', label: 'Pharmadox Cost' },
            { field: 'totalValue', label: 'Total Value' },
            { field: 'confirmationStatus', label: 'SO Confirmation' },
            { field: 'exportStatus', label: 'Export Status' },
            { field: 'backOrderQty', label: 'Back Order Qty' },
            { field: 'backOrderDate', label: 'Back Order Date' },
            { field: 'delayAlert', label: 'Delay Alert' }
        ];
        exportToCSV('Export_Sales_Orders', this._ordersData, cols);
    }
};
