/* ============================================================
   Module 3: CMO Management
   - Production planning automated based on sales data, lead times, min/max stock
   - Option to raise multiple batches in single PO
   - Manual PO raised for additional costs / hidden costs not captured in COGs
   - CMO information directory linked to FES/WCS with prices, lead times, contacts
   - Automatic PO tracking, dispatch, and delay impact on production plan
   ============================================================ */

const CMOManagement = {
    currentTab: 'products', // 'products' | 'multibatch' | 'costpos' | 'directory'
    table: null,
    _productsData: [],
    _multiBatchPOs: [],
    _costPOs: [],
    _partners: [],

    render(tab = 'products') {
        this.currentTab = tab;
        const cmoData = DataStore.get('cmo');
        const multiBatchPOs = DataStore.get('cmoMultiBatchPOs') || [];
        const costPOs = DataStore.get('cmoCostPOs') || [];
        const partners = DataStore.get('cmoPartners') || [];

        this._productsData = cmoData;
        this._multiBatchPOs = multiBatchPOs;
        this._costPOs = costPOs;
        this._partners = partners;

        // Stats calculation
        const totalProducts = cmoData.length;
        const totalHiddenCosts = costPOs.reduce((sum, c) => sum + parseNum(c.amount), 0);
        const delayedPOs = multiBatchPOs.filter(p => p.status === 'Delayed').length;
        const activePartners = partners.filter(p => p.status === 'Active').length;
        const understockCMO = cmoData.filter(c => parseNum(c.mos) < 3).length;

        let html = '<div class="page-header">';
        html += '<div><h1 class="page-title">CMO Management</h1>';
        html += '<div class="page-subtitle">Contract Manufacturing operations, automated demand planning, multi-batch POs &amp; hidden cost capture</div></div>';
        html += '<select class="theme-selector"><option>Thame</option></select>';
        html += '</div>';

        // Stats cards
        html += renderStatsCards([
            { label: 'CMO Products', value: totalProducts, color: 'blue' },
            { label: 'CMO Understock (&lt;3 MOS)', value: understockCMO, color: 'red' },
            { label: 'Multi-Batch POs', value: multiBatchPOs.length, color: 'purple' },
            { label: 'Delayed POs (Prod Impact)', value: delayedPOs, color: 'orange' },
            { label: 'Hidden Costs (Non-COGs)', value: `£${formatNumber(totalHiddenCosts)}`, color: 'red' },
            { label: 'FES/WCS Linked Partners', value: activePartners, color: 'green' }
        ]);

        // Module Tabs
        html += `
            <div style="display: flex; gap: 10px; margin-bottom: 16px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px; flex-wrap: wrap;">
                <button class="btn ${this.currentTab === 'products' ? 'btn-primary' : 'btn-secondary'}" 
                    onclick="CMOManagement.render('products')">
                    <i class="fas fa-boxes"></i> CMO Stock &amp; Automated Planning
                </button>
                <button class="btn ${this.currentTab === 'multibatch' ? 'btn-primary' : 'btn-secondary'}" 
                    onclick="CMOManagement.render('multibatch')">
                    <i class="fas fa-layer-group"></i> Multi-Batch POs (${multiBatchPOs.length})
                </button>
                <button class="btn ${this.currentTab === 'costpos' ? 'btn-warning' : 'btn-secondary'}" 
                    onclick="CMOManagement.render('costpos')">
                    <i class="fas fa-file-invoice-dollar"></i> Manual POs (Hidden / Additional Costs)
                </button>
                <button class="btn ${this.currentTab === 'directory' ? 'btn-info' : 'btn-secondary'}" 
                    onclick="CMOManagement.render('directory')">
                    <i class="fas fa-building"></i> CMO Directory (FES/WCS Linked)
                </button>
                <button class="btn btn-warning" style="margin-left: auto;" onclick="navigateTo('cmo-dashboard')">
                    <i class="fas fa-gauge-high"></i> CMO Executive Dashboard &rarr;
                </button>
            </div>
        `;

        if (this.currentTab === 'products') {
            html += this._renderProductsTab();
        } else if (this.currentTab === 'multibatch') {
            html += this._renderMultiBatchTab();
        } else if (this.currentTab === 'costpos') {
            html += this._renderCostPOsTab();
        } else {
            html += this._renderDirectoryTab();
        }

        document.getElementById('pageContent').innerHTML = html;

        if (this.currentTab === 'products') {
            this._initProductsTable();
        } else if (this.currentTab === 'multibatch') {
            this._initMultiBatchTable();
        } else if (this.currentTab === 'costpos') {
            this._initCostPOTable();
        }
    },

    _renderProductsTab() {
        return `
            <div class="filter-bar">
                <input type="text" id="cmoSearch" placeholder="Search CMO part no, description, contract..." 
                    oninput="CMOManagement.search(this.value)">
                <button class="btn btn-info" onclick="CMOManagement.showAutomatedPlanModal()">
                    <i class="fas fa-calculator"></i> Run Automated Demand Planning
                </button>
                <button class="btn btn-primary" onclick="CMOManagement.showRaiseMultiBatchPOModal()">
                    <i class="fas fa-plus"></i> Raise Multi-Batch PO
                </button>
                <button class="btn btn-warning btn-icon" title="Export CSV" onclick="CMOManagement.exportProductsData()">
                    <i class="fas fa-file-export"></i>
                </button>
                <button class="btn btn-secondary btn-icon" title="Refresh" onclick="CMOManagement.render('products')">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
            <div id="cmoTableContainer"></div>
        `;
    },

    _initProductsTable() {
        const enriched = this._productsData.map(c => {
            const avg = parseNum(c.average);
            const qty = parseNum(c.qty);
            const leadTimeDays = 50; // standard CMO lead time
            const minStock = Math.round(avg * 3);
            const maxStock = Math.round(avg * 6);
            const deficit = Math.max(0, maxStock - qty);
            const batchesNeeded = deficit > 0 ? Math.ceil(deficit / 15000) : 0;

            return {
                ...c,
                avgSales: avg,
                minStock: minStock,
                maxStock: maxStock,
                batchesNeeded: batchesNeeded,
                replenishStatus: qty < minStock ? 'Order Required' : (qty > maxStock ? 'Overstock' : 'Balanced')
            };
        });

        this._enrichedProducts = enriched;

        this.table = new DataTable('cmoTableContainer', {
            columns: [
                { field: 'partNo', label: 'CMO Part No', width: '130px' },
                { field: 'description', label: 'Product Description', maxLen: 38 },
                { field: 'contract', label: 'Contract', width: '90px' },
                { field: 'qty', label: 'Qty On Hand', type: 'number', width: '90px' },
                { field: 'average', label: 'Avg Sales', type: 'number', width: '80px' },
                { field: 'minStock', label: 'Min Stock', type: 'number', width: '80px' },
                { field: 'maxStock', label: 'Max Stock', type: 'number', width: '80px' },
                { field: 'mos', label: 'MOS', type: 'number', width: '60px' },
                { field: 'batchesNeeded', label: 'Batches Needed', type: 'number', width: '90px' },
                { field: 'replenishStatus', label: 'Planning Action', type: 'badge', width: '110px' },
                { field: 'cogsUnit', label: 'Unit COGS (£)', type: 'number', width: '85px' },
                { field: 'cogsTotal', label: 'Total COGS (£)', type: 'number', width: '95px' }
            ],
            data: enriched,
            pageSize: 30,
            sortCol: 'partNo',
            onRowClick: (id) => this.showProductDetail(id)
        });
        this.table.render();
    },

    _renderMultiBatchTab() {
        return `
            <div class="alert alert-info" style="margin-bottom: 16px; padding: 12px; background: #e8f4fd; border-left: 4px solid var(--accent-blue); border-radius: 4px; font-size: 12px;">
                <i class="fas fa-layer-group"></i> <strong>Multi-Batch Procurement &amp; Delay Tracking:</strong>
                Raise a single purchase order containing multiple staged batch deliveries. Delays are automatically tracked and reflected back into the DPS master production schedule.
            </div>
            <div class="filter-bar">
                <input type="text" id="mbSearch" placeholder="Search PO number, partner, product..." 
                    oninput="CMOManagement.searchMultiBatch(this.value)">
                <button class="btn btn-primary" onclick="CMOManagement.showRaiseMultiBatchPOModal()">
                    <i class="fas fa-plus"></i> Raise Multi-Batch PO
                </button>
                <button class="btn btn-warning btn-icon" title="Export CSV" onclick="CMOManagement.exportMultiBatchData()">
                    <i class="fas fa-file-export"></i>
                </button>
                <button class="btn btn-secondary btn-icon" title="Refresh" onclick="CMOManagement.render('multibatch')">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
            <div id="cmoMultiBatchContainer"></div>
        `;
    },

    _initMultiBatchTable() {
        this.table = new DataTable('cmoMultiBatchContainer', {
            columns: [
                { field: 'poNo', label: 'PO Number', width: '120px' },
                { field: 'cmoPartner', label: 'CMO Partner', width: '140px' },
                { field: 'productName', label: 'Product Name', maxLen: 35 },
                { field: 'batchesCount', label: 'Batches Raised', type: 'number', width: '95px' },
                { field: 'totalQuantity', label: 'Total Qty', type: 'number', width: '90px' },
                { field: 'orderDate', label: 'Order Date', width: '90px' },
                { field: 'poSentStatus', label: 'PO Dispatch Status', type: 'badge', width: '120px' },
                { field: 'delayStatus', label: 'Delay / Schedule Status', type: 'badge', width: '180px' },
                { field: 'productionPlanImpact', label: 'Impact on DPS Production Plan', maxLen: 35 }
            ],
            data: this._multiBatchPOs,
            pageSize: 20,
            sortCol: 'poNo',
            onRowClick: (id) => this.showMultiBatchDetail(id)
        });
        this.table.render();
    },

    _renderCostPOsTab() {
        return `
            <div class="alert alert-warning" style="margin-bottom: 16px; padding: 12px; background: #fff8e1; border-left: 4px solid var(--accent-orange); border-radius: 4px; font-size: 12px;">
                <i class="fas fa-receipt"></i> <strong>Hidden CMO Cost Elimination:</strong>
                Manual POs raised for additional costs that are <strong>not captured as part of COGs</strong> (e.g. cold storage quarantine, sterility challenges, emergency over-labelling, re-testing, dry-ice courier). All hidden costs are tracked and auditable.
            </div>
            <div class="filter-bar">
                <input type="text" id="costSearch" placeholder="Search cost PO, partner, category..." 
                    oninput="CMOManagement.searchCostPOs(this.value)">
                <button class="btn btn-warning" onclick="CMOManagement.showRaiseCostPOModal()">
                    <i class="fas fa-plus"></i> Raise Manual Cost PO (Hidden Cost)
                </button>
                <button class="btn btn-warning btn-icon" title="Export CSV" onclick="CMOManagement.exportCostPOsData()">
                    <i class="fas fa-file-export"></i>
                </button>
                <button class="btn btn-secondary btn-icon" title="Refresh" onclick="CMOManagement.render('costpos')">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
            <div id="cmoCostPOsContainer"></div>
        `;
    },

    _initCostPOTable() {
        this.table = new DataTable('cmoCostPOsContainer', {
            columns: [
                { field: 'poNo', label: 'Cost PO No', width: '110px' },
                { field: 'cmoPartner', label: 'CMO Partner', width: '130px' },
                { field: 'costCategory', label: 'Cost Category', width: '160px' },
                { field: 'amount', label: 'Amount (£)', type: 'number', width: '95px' },
                { field: 'isCapturedInCOGs', label: 'In Standard COGs?', type: 'badge', width: '130px' },
                { field: 'reason', label: 'Justification / Reason', maxLen: 40 },
                { field: 'refShopOrder', label: 'Ref Shop Order', width: '100px' },
                { field: 'dateRaised', label: 'Date Raised', width: '90px' },
                { field: 'status', label: 'Approval Status', type: 'badge', width: '100px' },
                { field: 'raisedBy', label: 'Raised By', width: '110px' }
            ],
            data: this._costPOs,
            pageSize: 20,
            sortCol: 'poNo'
        });
        this.table.render();
    },

    _renderDirectoryTab() {
        let cardsHtml = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; margin-top: 10px;">';
        
        this._partners.forEach(p => {
            cardsHtml += `
                <div class="card" style="background: #fff; border: 1px solid var(--border-color); border-radius: 6px; padding: 16px; box-shadow: var(--shadow);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <h3 style="margin: 0; font-size: 15px; color: var(--text-primary); font-weight: 700;">${escapeHtml(p.name)}</h3>
                            <span style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(p.id)}</span>
                        </div>
                        <span class="badge ${p.fesWcsStatus.includes('Connected') ? 'badge-success' : 'badge-warning'}">
                            <i class="fas fa-plug"></i> ${p.fesWcsStatus.includes('Connected') ? 'FES/WCS Linked' : 'Manual Sync'}
                        </span>
                    </div>
                    <div style="font-size: 12px; line-height: 1.6; color: var(--text-primary); margin-bottom: 14px;">
                        <div><i class="fas fa-user" style="width: 16px; color: var(--text-secondary);"></i> <strong>Contact:</strong> ${escapeHtml(p.contactPerson)}</div>
                        <div><i class="fas fa-envelope" style="width: 16px; color: var(--text-secondary);"></i> <strong>Email:</strong> ${escapeHtml(p.email)}</div>
                        <div><i class="fas fa-phone" style="width: 16px; color: var(--text-secondary);"></i> <strong>Phone:</strong> ${escapeHtml(p.phone)}</div>
                        <div><i class="fas fa-clock" style="width: 16px; color: var(--text-secondary);"></i> <strong>Lead Time:</strong> <span class="badge badge-info">${p.leadTimeDays} Days</span></div>
                        <div><i class="fas fa-cubes" style="width: 16px; color: var(--text-secondary);"></i> <strong>MOQ:</strong> ${formatNumber(p.moq)} units</div>
                        <div><i class="fas fa-pound-sign" style="width: 16px; color: var(--text-secondary);"></i> <strong>Avg Batch Cost:</strong> £${formatNumber(p.avgBatchCost)}</div>
                        <div><i class="fas fa-star" style="width: 16px; color: #f39c12;"></i> <strong>Quality Rating:</strong> ${p.qualityRating}</div>
                    </div>
                    <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                        <button class="btn btn-sm btn-outline-primary" onclick="CMOManagement.testSync('${p.id}')">
                            <i class="fas fa-sync"></i> Sync FES/WCS
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="CMOManagement.showRaiseMultiBatchPOModal('${p.name}')">
                            <i class="fas fa-plus"></i> Raise PO
                        </button>
                    </div>
                </div>
            `;
        });

        cardsHtml += '</div>';

        return `
            <div class="alert alert-info" style="margin-bottom: 16px; padding: 12px; background: #e8f4fd; border-left: 4px solid var(--accent-blue); border-radius: 4px; font-size: 12px;">
                <i class="fas fa-network-wired"></i> <strong>FES / WCS System Integration:</strong>
                Directly connected to manufacturing execution (FES) and warehouse control (WCS) for real-time lead times, pricing updates, and automated batch status feeds.
            </div>
            <div class="filter-bar">
                <button class="btn btn-primary" onclick="CMOManagement.showAddPartnerModal()">
                    <i class="fas fa-plus"></i> Add CMO Partner
                </button>
                <button class="btn btn-success" onclick="CMOManagement.testSyncAll()">
                    <i class="fas fa-sync"></i> Refresh All FES/WCS Feeds
                </button>
                <button class="btn btn-secondary btn-icon" title="Refresh" onclick="CMOManagement.render('directory')">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
            ${cardsHtml}
        `;
    },

    search(term) {
        if (this.table) this.table.search(term);
    },

    searchMultiBatch(term) {
        if (this.table) this.table.search(term);
    },

    searchCostPOs(term) {
        if (this.table) this.table.search(term);
    },

    showProductDetail(id) {
        const record = (this._enrichedProducts || []).find(r => r.id == id);
        if (!record) return;

        const bodyHtml = `
            <div style="font-size: 13px;">
                <p><strong>CMO Part No:</strong> ${escapeHtml(record.partNo)}</p>
                <p><strong>Description:</strong> ${escapeHtml(record.description)}</p>
                <p><strong>Contract:</strong> ${escapeHtml(record.contract)}</p>
                <p><strong>Qty On Hand:</strong> ${formatNumber(record.qty)}</p>
                <p><strong>6-Month Avg Sales:</strong> ${formatNumber(record.avgSales)}</p>
                <p><strong>Months of Stock (MOS):</strong> ${record.mos}</p>
                <p><strong>Min / Max Stock Target:</strong> ${formatNumber(record.minStock)} / ${formatNumber(record.maxStock)}</p>
                <p><strong>Suggested Batches Needed:</strong> <span class="badge ${record.batchesNeeded > 0 ? 'badge-danger' : 'badge-success'}">${record.batchesNeeded} Batches</span></p>
                <p><strong>Unit COGS:</strong> £${formatNumber(record.cogsUnit)}</p>
                <p><strong>Total Inventory COGS:</strong> £${formatNumber(record.cogsTotal)}</p>
                <p><strong>Shelf Life:</strong> ${record.shelfLife} months</p>
                <p><strong>Batch / Expiry:</strong> ${escapeHtml(record.lotBatchNo)} (Exp: ${escapeHtml(record.expiryDate)})</p>
            </div>
        `;
        const footerHtml = `
            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            <button class="btn btn-primary" onclick="closeModal(); CMOManagement.showRaiseMultiBatchPOModal('', '${escapeHtml(record.description)}')">
                <i class="fas fa-plus"></i> Raise Multi-Batch PO for this Product
            </button>
        `;
        openModal('CMO Product Detail', bodyHtml, footerHtml);
    },

    showMultiBatchDetail(id) {
        const record = (this._multiBatchPOs || []).find(r => r.id == id);
        if (!record) return;

        let batchListHtml = '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Batch #</th><th>Quantity</th><th>Target Delivery</th><th>Status</th></tr></thead><tbody>';
        (record.batches || []).forEach(b => {
            batchListHtml += `<tr>
                <td><strong>${escapeHtml(b.batchNum)}</strong></td>
                <td class="text-right">${formatNumber(b.qty)}</td>
                <td>${escapeHtml(b.plannedDeliveryDate)}</td>
                <td><span class="badge ${b.status.includes('Delayed') ? 'badge-danger' : 'badge-success'}">${escapeHtml(b.status)}</span></td>
            </tr>`;
        });
        batchListHtml += '</tbody></table></div>';

        const bodyHtml = `
            <div style="font-size: 13px; margin-bottom: 12px;">
                <p><strong>PO Number:</strong> ${escapeHtml(record.poNo)}</p>
                <p><strong>CMO Partner:</strong> ${escapeHtml(record.cmoPartner)}</p>
                <p><strong>Product:</strong> ${escapeHtml(record.productName)}</p>
                <p><strong>Total Quantity:</strong> ${formatNumber(record.totalQuantity)} units across ${record.batchesCount} scheduled batches</p>
                <p><strong>PO Dispatch:</strong> <span class="badge badge-success">${escapeHtml(record.poSentStatus)} (${escapeHtml(record.poSentDate)})</span></p>
                <p><strong>Delay &amp; Impact Status:</strong> <span class="badge ${record.delayStatus.includes('DELAYED') ? 'badge-danger' : 'badge-success'}">${escapeHtml(record.delayStatus)}</span></p>
                <p><strong>Production Schedule Impact:</strong> ${escapeHtml(record.productionPlanImpact)}</p>
            </div>
            <h4 style="margin: 10px 0 6px 0;">Staged Batches in this PO:</h4>
            ${batchListHtml}
        `;

        const footerHtml = `
            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            <button class="btn btn-warning" onclick="CMOManagement.toggleDelayStatus('${record.id}')">
                <i class="fas fa-exclamation-triangle"></i> Simulate / Toggle Delay Flag
            </button>
            <button class="btn btn-success" onclick="CMOManagement.resendPO('${record.id}')">
                <i class="fas fa-paper-plane"></i> Re-Send PO to CMO
            </button>
        `;

        openModal('Multi-Batch Purchase Order - ' + record.poNo, bodyHtml, footerHtml);
    },

    toggleDelayStatus(id) {
        const pos = DataStore.get('cmoMultiBatchPOs') || [];
        const po = pos.find(p => p.id == id);
        if (!po) return;

        if (po.status === 'Delayed') {
            po.status = 'Active';
            po.delayStatus = 'On Time (Schedule Normal)';
            po.productionPlanImpact = 'Schedule aligned with DPS Master Plan';
        } else {
            po.status = 'Delayed';
            po.delayStatus = 'DELAYED (+7 Days): Supplier Component Shortage';
            po.productionPlanImpact = 'CRITICAL: Production schedule shifted by +7 days in DPS Plan';
        }
        DataStore.set('cmoMultiBatchPOs', pos);
        closeModal();
        showToast('Delay status toggled. Production schedule adjusted in DPS!', 'warning');
        this.render('multibatch');
    },

    resendPO(id) {
        closeModal();
        showToast('Purchase Order automatically re-sent to CMO EDI endpoint!', 'success');
    },

    showRaiseMultiBatchPOModal(defaultPartner = '', defaultProduct = '') {
        const partners = DataStore.get('cmoPartners') || [];
        const partnerOptions = partners.map(p => p.name);

        const bodyHtml = `
            <div style="font-size: 13px;">
                <div class="form-group">
                    <label class="form-label">CMO Partner <span class="required">*</span></label>
                    <select id="mbPartner" class="form-control">
                        ${partnerOptions.map(p => `<option value="${p}" ${p === defaultPartner ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Product Name / Part No <span class="required">*</span></label>
                    <input type="text" id="mbProduct" class="form-control" value="${escapeHtml(defaultProduct)}" placeholder="e.g. GLUCOSE 5% W/V 500ML - CMO">
                </div>
                <div class="form-group">
                    <label class="form-label">PO Number <span class="required">*</span></label>
                    <input type="text" id="mbPoNo" class="form-control" value="PO-MB-${Math.floor(1000 + Math.random() * 9000)}" readonly>
                </div>
                <div style="margin: 15px 0 8px 0; display: flex; justify-content: space-between; align-items: center;">
                    <label class="form-label" style="margin: 0;"><strong>Scheduled Batches in this PO</strong></label>
                    <button type="button" class="btn btn-sm btn-primary" onclick="CMOManagement.addBatchRow()">
                        <i class="fas fa-plus"></i> Add Batch
                    </button>
                </div>
                <div id="batchRowsContainer">
                    <div class="batch-row" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                        <input type="text" placeholder="Batch ID (e.g. B26-01)" class="form-control batch-id" value="B26-01" style="flex: 1;">
                        <input type="number" placeholder="Batch Qty" class="form-control batch-qty" value="15000" style="flex: 1;">
                        <input type="date" class="form-control batch-date" value="2026-11-15" style="flex: 1.2;">
                    </div>
                    <div class="batch-row" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                        <input type="text" placeholder="Batch ID (e.g. B26-02)" class="form-control batch-id" value="B26-02" style="flex: 1;">
                        <input type="number" placeholder="Batch Qty" class="form-control batch-qty" value="15000" style="flex: 1;">
                        <input type="date" class="form-control batch-date" value="2026-11-29" style="flex: 1.2;">
                    </div>
                </div>
                <div class="alert alert-info" style="margin-top: 10px; font-size: 11px; padding: 8px;">
                    <i class="fas fa-magic"></i> Upon confirmation, this PO will be tracked and sent automatically to the CMO, and batch delivery milestones will be integrated into the DPS production plan.
                </div>
            </div>
        `;

        const footerHtml = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-success" onclick="CMOManagement.saveMultiBatchPO()">
                <i class="fas fa-paper-plane"></i> Raise &amp; Send Multi-Batch PO
            </button>
        `;

        openModal('Raise Multi-Batch Purchase Order', bodyHtml, footerHtml);
    },

    addBatchRow() {
        const container = document.getElementById('batchRowsContainer');
        const count = container.children.length + 1;
        const row = document.createElement('div');
        row.className = 'batch-row';
        row.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;';
        row.innerHTML = `
            <input type="text" placeholder="Batch ID" class="form-control batch-id" value="B26-0${count}" style="flex: 1;">
            <input type="number" placeholder="Batch Qty" class="form-control batch-qty" value="15000" style="flex: 1;">
            <input type="date" class="form-control batch-date" value="2026-12-15" style="flex: 1.2;">
            <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">&times;</button>
        `;
        container.appendChild(row);
    },

    saveMultiBatchPO() {
        const partner = document.getElementById('mbPartner')?.value;
        const product = document.getElementById('mbProduct')?.value;
        const poNo = document.getElementById('mbPoNo')?.value;

        if (!product) {
            showToast('Please enter a product name', 'warning');
            return;
        }

        const rows = document.querySelectorAll('#batchRowsContainer .batch-row');
        const batches = [];
        let totalQty = 0;

        rows.forEach(r => {
            const batchNum = r.querySelector('.batch-id')?.value;
            const qty = parseNum(r.querySelector('.batch-qty')?.value);
            const date = r.querySelector('.batch-date')?.value;
            if (batchNum && qty > 0) {
                batches.push({
                    batchNum: batchNum,
                    qty: qty,
                    plannedDeliveryDate: date,
                    status: 'Scheduled'
                });
                totalQty += qty;
            }
        });

        if (batches.length === 0) {
            showToast('Please include at least one valid batch', 'warning');
            return;
        }

        const newPO = {
            id: poNo,
            poNo: poNo,
            cmoPartner: partner,
            contract: 'CON-CMO-' + Math.floor(100 + Math.random() * 900),
            productName: product,
            totalQuantity: totalQty,
            batchesCount: batches.length,
            batches: batches,
            orderDate: new Date().toISOString().split('T')[0],
            poSentDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
            poSentStatus: 'Sent Automatically',
            status: 'Active',
            delayStatus: 'On Time (Schedule Normal)',
            productionPlanImpact: 'Integrated with DPS Production Schedule'
        };

        const pos = DataStore.get('cmoMultiBatchPOs') || [];
        pos.unshift(newPO);
        DataStore.set('cmoMultiBatchPOs', pos);

        closeModal();
        showToast(`Multi-batch PO ${poNo} raised & sent automatically!`, 'success');
        this.render('multibatch');
    },

    showRaiseCostPOModal() {
        const partners = DataStore.get('cmoPartners') || [];
        const formFields = [
            { field: 'poNo', label: 'Cost PO Number', required: true, value: 'CPO-2026-0' + Math.floor(100 + Math.random() * 900), readonly: true },
            { field: 'cmoPartner', label: 'CMO Partner', type: 'select', required: true, options: partners.map(p => p.name) },
            { field: 'costCategory', label: 'Additional Cost Category', type: 'select', required: true, options: [
                'Temperature-Controlled Storage (Quarantine)',
                'Sterility & Retest Challenge Protocol',
                'Carton Over-stickering / Artwork change',
                'Expedited Air Courier & Dry Ice',
                'Destruction / Waste Handling Surcharge',
                'Emergency Batch Line Cleaning'
            ]},
            { field: 'amount', label: 'Amount (£)', type: 'number', required: true, placeholder: 'e.g. 2500.00' },
            { field: 'refShopOrder', label: 'Reference Shop Order / Batch', required: true, placeholder: 'e.g. SO-99411' },
            { field: 'reason', label: 'Justification (Hidden Cost to CMO)', type: 'textarea', required: true, fullWidth: true, placeholder: 'Explain why this cost was not captured as part of standard COGs...' }
        ];

        const body = renderForm(formFields);
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-warning" onclick="CMOManagement.saveCostPO()">
                <i class="fas fa-save"></i> Raise Manual Cost PO
            </button>
        `;

        openModal('Raise Manual PO for Additional Costs (Hidden to CMO)', body, footer);
    },

    saveCostPO() {
        const formFields = [
            { field: 'poNo', label: 'PO No', required: true },
            { field: 'cmoPartner', label: 'CMO Partner', required: true },
            { field: 'costCategory', label: 'Category', required: true },
            { field: 'amount', label: 'Amount', type: 'number', required: true },
            { field: 'refShopOrder', label: 'Ref Shop Order', required: true },
            { field: 'reason', label: 'Reason', required: true }
        ];
        const { data, isValid } = collectFormData(formFields);
        if (!isValid) return;

        data.id = data.poNo;
        data.currency = 'GBP';
        data.isCapturedInCOGs = 'No (Hidden Cost)';
        data.dateRaised = new Date().toISOString().split('T')[0];
        data.status = 'Approved';
        data.raisedBy = 'Supply Chain Lead';

        const costPOs = DataStore.get('cmoCostPOs') || [];
        costPOs.unshift(data);
        DataStore.set('cmoCostPOs', costPOs);

        closeModal();
        showToast(`Manual Cost PO ${data.poNo} created and logged against hidden costs!`, 'success');
        this.render('costpos');
    },

    showAutomatedPlanModal() {
        const cmoData = this._productsData;
        const understock = cmoData.filter(c => parseNum(c.mos) < 3.5);

        let rowsHtml = '';
        understock.slice(0, 15).forEach(c => {
            const avg = parseNum(c.average);
            const qty = parseNum(c.qty);
            const minStock = Math.round(avg * 3);
            const deficit = Math.max(0, minStock * 2 - qty);
            const batches = Math.ceil(deficit / 15000);

            rowsHtml += `<tr>
                <td><strong>${escapeHtml(truncate(c.description, 35))}</strong></td>
                <td>${escapeHtml(c.contract)}</td>
                <td class="text-right">${formatNumber(qty)}</td>
                <td class="text-right">${formatNumber(avg)}</td>
                <td class="text-right">${c.mos}</td>
                <td class="text-right text-danger font-weight-bold">${formatNumber(deficit)}</td>
                <td class="text-center"><span class="badge badge-warning">${batches} Batches</span></td>
            </tr>`;
        });

        const bodyHtml = `
            <div style="font-size: 13px; margin-bottom: 12px;">
                <p><strong>Automated CMO Production Planning Engine</strong></p>
                <p style="color: var(--text-secondary); font-size: 12px;">
                    Calculates required CMO orders automatically using <strong>live sales run rates</strong>, <strong>supplier lead times (45-70 days)</strong>, and <strong>safety stock thresholds (3-6 MOS)</strong>.
                </p>
            </div>
            <div class="table-wrapper" style="max-height: 300px; overflow-y: auto;">
                <table class="data-table">
                    <thead><tr>
                        <th>Product Description</th><th>Contract</th><th class="text-right">Stock</th><th class="text-right">Avg Sales</th><th class="text-right">MOS</th><th class="text-right">Required Deficit</th><th class="text-center">Batches</th>
                    </tr></thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        `;

        const footerHtml = `
            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            <button class="btn btn-primary" onclick="closeModal(); showToast('CMO Production schedule synchronized with automated forecast!', 'success');">
                <i class="fas fa-check-circle"></i> Commit to CMO Schedule
            </button>
        `;

        openModal('Automated CMO Production Plan', bodyHtml, footerHtml);
    },

    showAddPartnerModal() {
        const formFields = [
            { field: 'name', label: 'CMO Partner Name', required: true, placeholder: 'e.g. Lonza Biologics' },
            { field: 'contactPerson', label: 'Key Contact Person', required: true },
            { field: 'email', label: 'Email', required: true },
            { field: 'phone', label: 'Phone', required: true },
            { field: 'leadTimeDays', label: 'Standard Lead Time (Days)', type: 'number', required: true },
            { field: 'moq', label: 'Minimum Order Qty (MOQ)', type: 'number', required: true },
            { field: 'avgBatchCost', label: 'Avg Batch Cost (£)', type: 'number', required: true },
            { field: 'fesWcsStatus', label: 'FES/WCS Link Status', type: 'select', options: ['Connected (Live FES/WCS Sync)', 'Interface Configured (Manual Sync)', 'Pending Setup'] }
        ];

        const body = renderForm(formFields);
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="CMOManagement.savePartner()">
                <i class="fas fa-save"></i> Save Partner
            </button>
        `;

        openModal('Add CMO Partner', body, footer);
    },

    savePartner() {
        const formFields = [
            { field: 'name', label: 'Name', required: true },
            { field: 'contactPerson', label: 'Contact', required: true },
            { field: 'email', label: 'Email', required: true },
            { field: 'phone', label: 'Phone', required: true },
            { field: 'leadTimeDays', label: 'Lead Time', type: 'number', required: true },
            { field: 'moq', label: 'MOQ', type: 'number', required: true },
            { field: 'avgBatchCost', label: 'Avg Cost', type: 'number', required: true },
            { field: 'fesWcsStatus', label: 'FES/WCS' }
        ];
        const { data, isValid } = collectFormData(formFields);
        if (!isValid) return;

        data.id = 'CMO-00' + (this._partners.length + 1);
        data.status = 'Active';
        data.qualityRating = '98.0%';
        data.activeContracts = 1;

        const partners = DataStore.get('cmoPartners') || [];
        partners.push(data);
        DataStore.set('cmoPartners', partners);

        closeModal();
        showToast('CMO Partner added and linked to FES/WCS!', 'success');
        this.render('directory');
    },

    testSync(id) {
        showToast(`FES/WCS Live Ping for ${id}: Latency 24ms. Data synchronised!`, 'success');
    },

    testSyncAll() {
        showToast('All 5 CMO interfaces refreshed from FES & WCS feeds successfully!', 'success');
    },

    exportProductsData() {
        const cols = [
            { field: 'partNo', label: 'CMO Part No' },
            { field: 'description', label: 'Product Description' },
            { field: 'contract', label: 'Contract' },
            { field: 'qty', label: 'Qty On Hand' },
            { field: 'average', label: 'Avg Monthly Sales' },
            { field: 'minStock', label: 'Min Stock Level' },
            { field: 'maxStock', label: 'Max Stock Level' },
            { field: 'mos', label: 'MOS' },
            { field: 'cogsUnit', label: 'Unit COGS' },
            { field: 'cogsTotal', label: 'Total COGS' }
        ];
        exportToCSV('CMO_Products_Report', this._enrichedProducts || this._productsData, cols);
    },

    exportMultiBatchData() {
        const cols = [
            { field: 'poNo', label: 'PO Number' },
            { field: 'cmoPartner', label: 'CMO Partner' },
            { field: 'productName', label: 'Product Name' },
            { field: 'batchesCount', label: 'Batches' },
            { field: 'totalQuantity', label: 'Total Qty' },
            { field: 'orderDate', label: 'Order Date' },
            { field: 'poSentStatus', label: 'Status' },
            { field: 'delayStatus', label: 'Delay' },
            { field: 'productionPlanImpact', label: 'DPS Impact' }
        ];
        exportToCSV('CMO_MultiBatch_POs', this._multiBatchPOs, cols);
    },

    exportCostPOsData() {
        const cols = [
            { field: 'poNo', label: 'Cost PO' },
            { field: 'cmoPartner', label: 'CMO Partner' },
            { field: 'costCategory', label: 'Cost Category' },
            { field: 'amount', label: 'Amount (£)' },
            { field: 'isCapturedInCOGs', label: 'COGs Status' },
            { field: 'reason', label: 'Reason' },
            { field: 'refShopOrder', label: 'Ref Shop Order' },
            { field: 'dateRaised', label: 'Date' },
            { field: 'status', label: 'Status' }
        ];
        exportToCSV('CMO_Hidden_Cost_POs', this._costPOs, cols);
    }
};
