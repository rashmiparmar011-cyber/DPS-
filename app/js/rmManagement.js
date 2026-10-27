/* ============================================================
   Module 2: Raw Material Management (RM Management)
   Solves limitations due to expiry dates and re-test causing mistakes
   ============================================================ */

const RMManagement = {
    currentTab: 'inventory', // 'inventory' | 'retest' | 'issuance'
    table: null,
    _allData: [],

    render(tab = 'inventory') {
        this.currentTab = tab;
        const rmpmData = DataStore.get('rmpm');
        const expiryData = DataStore.get('expiry');
        const issuanceData = DataStore.get('rmpmNotIssued');

        // Calculate statistics
        const totalMaterials = rmpmData.length;
        const rmCount = rmpmData.filter(r => r.type === 'RM').length;
        const pmCount = rmpmData.filter(r => r.type === 'PM').length;

        const now = new Date();
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

        let overdueRetest = 0;
        let due30dRetest = 0;
        let due90dRetest = 0;

        expiryData.forEach(e => {
            if (!e.retestDate || e.retestDate === '-' || e.retestDate === 'NA') return;
            const parts = e.retestDate.split('/');
            let d;
            if (parts.length === 3) {
                d = new Date(parts[2], parts[1] - 1, parts[0]);
            } else {
                d = new Date(e.retestDate);
            }
            if (!isNaN(d.getTime())) {
                if (d < now) overdueRetest++;
                else if (d <= thirtyDays) due30dRetest++;
                else if (d <= ninetyDays) due90dRetest++;
            }
        });

        const pendingIssuances = issuanceData.filter(i => 
            i.materialStatus && i.materialStatus.toLowerCase().includes('not')
        ).length;

        let html = '<div class="page-header">';
        html += '<div><h1 class="page-title">Raw Material (RM) Management</h1>';
        html += '<div class="page-subtitle">Integrated RM/PM planning with automated Expiry &amp; Retest error prevention safeguards</div></div>';
        html += '<select class="theme-selector"><option>Thame</option></select>';
        html += '</div>';

        // Stats Cards
        html += renderStatsCards([
            { label: 'Total Materials (RM/PM)', value: totalMaterials, color: 'blue' },
            { label: 'Raw Materials (RM)', value: rmCount, color: 'green' },
            { label: 'Packaging (PM)', value: pmCount, color: 'purple' },
            { label: 'Overdue Retest (Critical)', value: overdueRetest, color: 'red' },
            { label: 'Retest Due &lt;30 Days', value: due30dRetest, color: 'orange' },
            { label: 'Pending Material Issuance', value: pendingIssuances, color: 'blue' }
        ]);

        // Module Tabs
        html += `
            <div style="display: flex; gap: 10px; margin-bottom: 16px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px;">
                <button class="btn ${this.currentTab === 'inventory' ? 'btn-primary' : 'btn-secondary'}" 
                    onclick="RMManagement.render('inventory')">
                    <i class="fas fa-boxes"></i> RM/PM Inventory &amp; Planning
                </button>
                <button class="btn ${this.currentTab === 'retest' ? 'btn-danger' : 'btn-secondary'}" 
                    onclick="RMManagement.render('retest')">
                    <i class="fas fa-calendar-times"></i> Expiry &amp; Retest Safeguard Monitor (${overdueRetest + due30dRetest})
                </button>
                <button class="btn ${this.currentTab === 'issuance' ? 'btn-info' : 'btn-secondary'}" 
                    onclick="RMManagement.render('issuance')">
                    <i class="fas fa-dolly-flatbed"></i> Shop Order Material Allocations
                </button>
            </div>
        `;

        if (this.currentTab === 'inventory') {
            html += this._renderInventoryTab(rmpmData, expiryData);
        } else if (this.currentTab === 'retest') {
            html += this._renderRetestTab(expiryData);
        } else {
            html += this._renderIssuanceTab(issuanceData);
        }

        document.getElementById('pageContent').innerHTML = html;

        // Initialize DataTable according to current tab
        if (this.currentTab === 'inventory') {
            this._initInventoryTable();
        } else if (this.currentTab === 'retest') {
            this._initRetestTable();
        } else {
            this._initIssuanceTable();
        }
    },

    _renderInventoryTab(rmpmData, expiryData) {
        return `
            <div class="filter-bar">
                <input type="text" id="rmSearch" placeholder="Search material code, description, license..." 
                    oninput="RMManagement.search(this.value)">
                <select id="rmTypeFilter" onchange="RMManagement.filterType(this.value)">
                    <option value="">All Types (RM &amp; PM)</option>
                    <option value="RM">Raw Material (RM)</option>
                    <option value="PM">Packaging Material (PM)</option>
                </select>
                <button class="btn btn-primary" onclick="RMManagement.showAddModal()">
                    <i class="fas fa-plus"></i> Add Material
                </button>
                <button class="btn btn-warning btn-icon" title="Export CSV" onclick="RMManagement.exportData()">
                    <i class="fas fa-file-export"></i>
                </button>
                <button class="btn btn-secondary btn-icon" title="Refresh" onclick="RMManagement.render('inventory')">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
            <div id="rmTableContainer"></div>
        `;
    },

    _initInventoryTable() {
        const rmpmData = DataStore.get('rmpm');
        const expiryData = DataStore.get('expiry');

        const enriched = rmpmData.map(r => {
            const exp = expiryData.find(e => e.materialCode === r.materialCode);
            return {
                ...r,
                retestDate: exp ? exp.retestDate : '-',
                retestStatus: exp ? (isOverdue(exp.retestDate) ? 'OVERDUE' : 'OK') : 'NOT_APPLICABLE'
            };
        });

        this._allData = enriched;

        this.table = new DataTable('rmTableContainer', {
            columns: [
                { field: 'materialCode', label: 'Material Code', width: '120px' },
                { field: 'description', label: 'Description', maxLen: 40 },
                { field: 'type', label: 'Type', width: '60px' },
                { field: 'initialStock', label: 'Initial Stock', type: 'number', width: '90px' },
                { field: 'outOfStockMonth', label: 'OOS Month', width: '85px' },
                { field: 'sixMonthStock', label: '6M Needed', type: 'number', width: '85px' },
                { field: 'twelveMonthStock', label: '12M Needed', type: 'number', width: '85px' },
                { field: 'poNo', label: 'PO No', width: '90px' },
                { field: 'poQty', label: 'PO Qty', type: 'number', width: '75px' },
                { field: 'deliveryDate', label: 'Delivery Date', width: '90px' },
                { field: 'retestDate', label: 'Retest Date', width: '90px' },
                { field: 'retestStatus', label: 'Retest Status', type: 'badge', width: '90px' }
            ],
            data: enriched,
            pageSize: 30,
            sortCol: 'materialCode',
            onRowClick: (id) => this.showDetail(id)
        });
        this.table.render();
    },

    _renderRetestTab(expiryData) {
        return `
            <div class="alert alert-warning" style="margin-bottom: 16px; padding: 12px; background: #fff8e1; border-left: 4px solid var(--accent-orange); border-radius: 4px; font-size: 12px;">
                <i class="fas fa-shield-alt"></i> <strong>Automated Retest Risk Prevention Engine:</strong>
                Eliminates Python script limitations. Batches within 30-90 days of retest date are automatically flagged before production scheduling to avoid batch hold-ups or scrapping.
            </div>
            <div class="filter-bar">
                <input type="text" id="retestSearch" placeholder="Search batch, ingredient..." 
                    oninput="RMManagement.searchRetest(this.value)">
                <select id="retestAlertFilter" onchange="RMManagement.filterRetestAlert(this.value)">
                    <option value="">All Retest Windows</option>
                    <option value="OVERDUE">Overdue Retests</option>
                    <option value="DUE_30">Due Within 30 Days</option>
                    <option value="DUE_90">Due Within 90 Days</option>
                    <option value="VALID">Valid / Normal</option>
                </select>
                <button class="btn btn-primary" onclick="RMManagement.showScheduleRetestModal()">
                    <i class="fas fa-calendar-plus"></i> Schedule Batch Retest
                </button>
                <button class="btn btn-warning btn-icon" title="Export CSV" onclick="RMManagement.exportRetestData()">
                    <i class="fas fa-file-export"></i>
                </button>
                <button class="btn btn-secondary btn-icon" title="Refresh" onclick="RMManagement.render('retest')">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
            <div id="retestTableContainer"></div>
        `;
    },

    _initRetestTable() {
        const expiryData = DataStore.get('expiry');
        const now = new Date();
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

        const enriched = expiryData.map(e => {
            let status = 'VALID';
            let daysUntil = null;
            if (e.retestDate && e.retestDate !== '-' && e.retestDate !== 'NA') {
                const parts = e.retestDate.split('/');
                const d = parts.length === 3 ? new Date(parts[2], parts[1] - 1, parts[0]) : new Date(e.retestDate);
                if (!isNaN(d.getTime())) {
                    daysUntil = Math.round((d - now) / (1000 * 60 * 60 * 24));
                    if (d < now) status = 'OVERDUE';
                    else if (d <= thirtyDays) status = 'DUE_30';
                    else if (d <= ninetyDays) status = 'DUE_90';
                }
            }

            return {
                ...e,
                daysUntil: daysUntil !== null ? daysUntil : '-',
                retestFlag: status === 'OVERDUE' ? 'CRITICAL OVERDUE' : (status === 'DUE_30' ? 'RETEST &lt; 30D' : (status === 'DUE_90' ? 'RETEST &lt; 90D' : 'ACTIVE VALID')),
                statusCategory: status
            };
        });

        this._retestData = enriched;

        this.table = new DataTable('retestTableContainer', {
            columns: [
                { field: 'materialCode', label: 'Material Code', width: '110px' },
                { field: 'description', label: 'Ingredient / Description', maxLen: 35 },
                { field: 'lotBatchNo', label: 'Lot/Batch No', width: '120px' },
                { field: 'qtyOnHand', label: 'Qty On Hand', type: 'number', width: '90px' },
                { field: 'retestDate', label: 'Retest Date', width: '95px' },
                { field: 'daysUntil', label: 'Days Until Retest', type: 'number', width: '85px' },
                { field: 'retestFlag', label: 'Safeguard Alert', type: 'badge', width: '130px' },
                { field: 'upcomingProductionDate', label: 'Upcoming Mfg Date', width: '110px' },
                { field: 'unitPrice', label: 'Unit Price (£)', type: 'number', width: '85px' }
            ],
            data: enriched,
            pageSize: 30,
            sortCol: 'daysUntil',
            onRowClick: (id) => this.showRetestDetail(id)
        });
        this.table.render();
    },

    _renderIssuanceTab(issuanceData) {
        return `
            <div class="filter-bar">
                <input type="text" id="issuanceSearch" placeholder="Search order no, part no, material description..." 
                    oninput="RMManagement.searchIssuance(this.value)">
                <button class="btn btn-warning btn-icon" title="Export CSV" onclick="RMManagement.exportIssuanceData()">
                    <i class="fas fa-file-export"></i>
                </button>
                <button class="btn btn-secondary btn-icon" title="Refresh" onclick="RMManagement.render('issuance')">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
            <div id="issuanceTableContainer"></div>
        `;
    },

    _initIssuanceTable() {
        const issuanceData = DataStore.get('rmpmNotIssued');

        this._issuanceData = issuanceData;

        this.table = new DataTable('issuanceTableContainer', {
            columns: [
                { field: 'orderNo', label: 'Shop Order No', width: '100px' },
                { field: 'materialPartNo', label: 'Material Code', width: '110px' },
                { field: 'materialDescription', label: 'Material Description', maxLen: 35 },
                { field: 'qtyRequired', label: 'Qty Required', type: 'number', width: '90px' },
                { field: 'reservedQty', label: 'Reserved Qty', type: 'number', width: '90px' },
                { field: 'availableQty', label: 'Available Stock', type: 'number', width: '90px' },
                { field: 'batchExpiryDate', label: 'Batch Expiry', width: '90px' },
                { field: 'materialStatus', label: 'Issuance Status', type: 'badge', width: '110px' },
                { field: 'poNo', label: 'Replenishment PO', width: '90px' },
                { field: 'wscStatus', label: 'WSC Status', width: '90px' }
            ],
            data: issuanceData,
            pageSize: 30,
            sortCol: 'orderNo'
        });
        this.table.render();
    },

    search(term) {
        if (this.table) this.table.search(term);
    },

    searchRetest(term) {
        if (this.table) this.table.search(term);
    },

    searchIssuance(term) {
        if (this.table) this.table.search(term);
    },

    filterType(type) {
        let filtered = [...(this._allData || [])];
        if (type) {
            filtered = filtered.filter(r => r.type === type);
        }
        if (this.table) this.table.setData(filtered);
    },

    filterRetestAlert(cat) {
        let filtered = [...(this._retestData || [])];
        if (cat) {
            filtered = filtered.filter(r => r.statusCategory === cat);
        }
        if (this.table) this.table.setData(filtered);
    },

    showDetail(id) {
        const record = (this._allData || []).find(r => r.id == id);
        if (!record) return;

        const fields = [
            { field: 'materialCode', label: 'Material Code' },
            { field: 'description', label: 'Description' },
            { field: 'type', label: 'Type' },
            { field: 'license', label: 'License' },
            { field: 'pipCode', label: 'PIP Code' },
            { field: 'qtyPerBottle', label: 'Qty Per Bottle', type: 'number' },
            { field: 'initialStock', label: 'Initial Stock', type: 'number' },
            { field: 'outOfStockMonth', label: 'Out of Stock Month' },
            { field: 'sixMonthStock', label: '6 Month Stock Needed', type: 'number' },
            { field: 'twelveMonthStock', label: '12 Month Stock Needed', type: 'number' },
            { field: 'poNo', label: 'PO Number' },
            { field: 'poOwner', label: 'PO Owner' },
            { field: 'poQty', label: 'PO Quantity', type: 'number' },
            { field: 'deliveryDate', label: 'Expected Delivery Date' },
            { field: 'actualDeliveryDate', label: 'Actual Delivery Date' },
            { field: 'poDeliveryStatus', label: 'PO Delivery Status', type: 'badge' },
            { field: 'prQty', label: 'PR Quantity', type: 'number' },
            { field: 'prOwner', label: 'PR Owner' },
            { field: 'requestNo', label: 'Request Number' },
            { field: 'comment', label: 'Comment / Action' }
        ];

        const actions = `
            <button class="btn btn-sm btn-primary" onclick="RMManagement.showEditModal('${id}')">
                <i class="fas fa-edit"></i> Edit Material
            </button>
            <button class="btn btn-sm btn-secondary" onclick="RMManagement.render('inventory')">
                <i class="fas fa-arrow-left"></i> Back
            </button>
        `;

        let html = '<div class="page-header">';
        html += '<div><h1 class="page-title">Raw Material Details</h1>';
        html += `<div class="page-subtitle">${escapeHtml(record.materialCode)} - ${escapeHtml(record.description)}</div></div>`;
        html += '</div>';
        html += renderDetailView('Material Profile &amp; Procurement Info', fields, record, actions);

        // Show linked batch retest records
        const linkedExpiry = DataStore.get('expiry').filter(e => e.materialCode === record.materialCode);
        if (linkedExpiry.length > 0) {
            html += '<div class="detail-panel"><div class="detail-header"><h3>Active Batches &amp; Retest Dates</h3></div>';
            html += '<div class="table-wrapper"><table class="data-table"><thead><tr>';
            html += '<th>Lot/Batch No</th><th>Qty On Hand</th><th>Retest Date</th><th>Upcoming Prod Date</th><th>Unit Price</th><th>Action</th>';
            html += '</tr></thead><tbody>';
            linkedExpiry.forEach(e => {
                html += `<tr>
                    <td><strong>${escapeHtml(e.lotBatchNo)}</strong></td>
                    <td class="text-right">${formatNumber(e.qtyOnHand)}</td>
                    <td>${escapeHtml(e.retestDate)}</td>
                    <td>${escapeHtml(e.upcomingProductionDate || '-')}</td>
                    <td class="text-right">£${formatNumber(e.unitPrice)}</td>
                    <td><button class="btn btn-sm btn-warning" onclick="RMManagement.showScheduleRetestModal('${e.id}')">Reschedule</button></td>
                </tr>`;
            });
            html += '</tbody></table></div></div>';
        }

        document.getElementById('pageContent').innerHTML = html;
    },

    showRetestDetail(id) {
        const record = (this._retestData || []).find(r => r.id == id);
        if (!record) return;

        const bodyHtml = `
            <div style="font-size: 13px;">
                <p><strong>Material Code:</strong> ${escapeHtml(record.materialCode)}</p>
                <p><strong>Description:</strong> ${escapeHtml(record.description)}</p>
                <p><strong>Lot / Batch No:</strong> ${escapeHtml(record.lotBatchNo)}</p>
                <p><strong>Quantity On Hand:</strong> ${formatNumber(record.qtyOnHand)}</p>
                <p><strong>Current Retest Date:</strong> <span class="badge ${record.statusCategory === 'OVERDUE' ? 'badge-danger' : 'badge-warning'}">${escapeHtml(record.retestDate)}</span></p>
                <p><strong>Days Until Retest:</strong> ${record.daysUntil} days</p>
                <p><strong>Upcoming Production Date:</strong> ${escapeHtml(record.upcomingProductionDate || 'Not scheduled')}</p>
                <p><strong>Unit Price:</strong> £${formatNumber(record.unitPrice)}</p>
            </div>
        `;
        const footerHtml = `
            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            <button class="btn btn-primary" onclick="RMManagement.showScheduleRetestModal('${record.id}')">
                <i class="fas fa-calendar-check"></i> Record / Reschedule Retest
            </button>
        `;
        openModal('Batch Retest Details', bodyHtml, footerHtml);
    },

    showScheduleRetestModal(id) {
        const record = id ? (this._retestData || []).find(r => r.id == id) : null;
        const formFields = [
            { field: 'lotBatchNo', label: 'Lot/Batch No', required: true, value: record ? record.lotBatchNo : '' },
            { field: 'materialCode', label: 'Material Code', required: true, value: record ? record.materialCode : '' },
            { field: 'newRetestDate', label: 'New Retest Date', type: 'date', required: true },
            { field: 'retestStatus', label: 'QC Retest Result', type: 'select', options: ['Sample Drawn / Pending Lab', 'Passed - Re-certified', 'Extended 6 Months', 'Failed - Quarantined'] },
            { field: 'testedBy', label: 'QC Analyst / Lab', required: true, placeholder: 'e.g. Quality Control Lab BNS' },
            { field: 'notes', label: 'Retest Protocol Notes', type: 'textarea', fullWidth: true }
        ];

        const body = renderForm(formFields);
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-success" onclick="RMManagement.saveRetestSchedule('${id || ''}')">
                <i class="fas fa-save"></i> Save Retest Schedule
            </button>
        `;

        openModal('Schedule / Update Batch Retest', body, footer);
    },

    saveRetestSchedule(id) {
        const formFields = [
            { field: 'lotBatchNo', label: 'Lot/Batch No', required: true },
            { field: 'materialCode', label: 'Material Code', required: true },
            { field: 'newRetestDate', label: 'New Retest Date', required: true },
            { field: 'retestStatus', label: 'QC Retest Result' },
            { field: 'testedBy', label: 'QC Analyst' },
            { field: 'notes', label: 'Notes' }
        ];
        const { data, isValid } = collectFormData(formFields);
        if (!isValid) return;

        if (id) {
            const expiryData = DataStore.get('expiry');
            const item = expiryData.find(e => e.id == id);
            if (item) {
                item.retestDate = data.newRetestDate;
                item.lastQC = data.retestStatus;
                DataStore.set('expiry', expiryData);
            }
        }

        closeModal();
        showToast('Batch retest updated successfully. Production safeguard active.', 'success');
        this.render(this.currentTab);
    },

    showAddModal() {
        const formFields = [
            { field: 'materialCode', label: 'Material Code', required: true, placeholder: 'e.g. INGD-10492' },
            { field: 'description', label: 'Description', required: true, placeholder: 'Ingredient or material name' },
            { field: 'type', label: 'Type', type: 'select', required: true, options: ['RM', 'PM'] },
            { field: 'license', label: 'License Code', placeholder: 'e.g. PL 12345/6789' },
            { field: 'initialStock', label: 'Initial Stock', type: 'number', required: true },
            { field: 'outOfStockMonth', label: 'Expected OOS Month', type: 'select', options: ['Jan-27', 'Feb-27', 'Mar-27', 'Apr-27', 'May-27', 'Jun-27', 'Jul-27', 'Aug-27', 'Sep-27', 'Oct-27', 'Nov-27', 'Dec-27', 'Adequate'] },
            { field: 'sixMonthStock', label: '6-Month Stock Needed', type: 'number' },
            { field: 'twelveMonthStock', label: '12-Month Stock Needed', type: 'number' },
            { field: 'comment', label: 'Procurement Comment', type: 'textarea', fullWidth: true }
        ];

        const body = renderForm(formFields);
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="RMManagement.saveNewMaterial()">
                <i class="fas fa-save"></i> Save Material
            </button>
        `;

        openModal('Add Raw Material / Packaging Item', body, footer);
    },

    saveNewMaterial() {
        const formFields = [
            { field: 'materialCode', label: 'Material Code', required: true },
            { field: 'description', label: 'Description', required: true },
            { field: 'type', label: 'Type', required: true },
            { field: 'license', label: 'License' },
            { field: 'initialStock', label: 'Initial Stock', type: 'number', required: true },
            { field: 'outOfStockMonth', label: 'OOS Month' },
            { field: 'sixMonthStock', label: '6M Stock', type: 'number' },
            { field: 'twelveMonthStock', label: '12M Stock', type: 'number' },
            { field: 'comment', label: 'Comment' }
        ];
        const { data, isValid } = collectFormData(formFields);
        if (!isValid) return;

        const rmpmData = DataStore.get('rmpm');
        if (rmpmData.some(r => r.materialCode && r.materialCode.toLowerCase() === data.materialCode.toLowerCase())) {
            showToast('A material with this code already exists', 'warning');
            return;
        }

        data.id = rmpmData.length + 1;
        rmpmData.unshift(data);
        DataStore.set('rmpm', rmpmData);

        closeModal();
        showToast('Raw material created successfully', 'success');
        this.render('inventory');
    },

    showEditModal(id) {
        const record = (this._allData || []).find(r => r.id == id);
        if (!record) return;

        const formFields = [
            { field: 'materialCode', label: 'Material Code', required: true, readonly: true },
            { field: 'description', label: 'Description', required: true },
            { field: 'type', label: 'Type', type: 'select', required: true, options: ['RM', 'PM'] },
            { field: 'initialStock', label: 'Initial Stock', type: 'number', required: true },
            { field: 'outOfStockMonth', label: 'Out of Stock Month' },
            { field: 'sixMonthStock', label: '6M Stock Needed', type: 'number' },
            { field: 'twelveMonthStock', label: '12M Stock Needed', type: 'number' },
            { field: 'comment', label: 'Comment / Action', type: 'textarea', fullWidth: true }
        ];

        const body = renderForm(formFields, record);
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="RMManagement.saveEditMaterial('${id}')">
                <i class="fas fa-save"></i> Save Changes
            </button>
        `;

        openModal('Edit Material - ' + record.materialCode, body, footer);
    },

    saveEditMaterial(id) {
        const formFields = [
            { field: 'materialCode', label: 'Material Code', required: true },
            { field: 'description', label: 'Description', required: true },
            { field: 'type', label: 'Type', required: true },
            { field: 'initialStock', label: 'Initial Stock', type: 'number', required: true },
            { field: 'outOfStockMonth', label: 'OOS Month' },
            { field: 'sixMonthStock', label: '6M Stock', type: 'number' },
            { field: 'twelveMonthStock', label: '12M Stock', type: 'number' },
            { field: 'comment', label: 'Comment' }
        ];
        const { data, isValid } = collectFormData(formFields);
        if (!isValid) return;

        const rmpmData = DataStore.get('rmpm');
        const idx = rmpmData.findIndex(r => r.id == id);
        if (idx !== -1) {
            Object.assign(rmpmData[idx], data);
            DataStore.set('rmpm', rmpmData);
        }

        closeModal();
        showToast('Material updated successfully', 'success');
        this.render('inventory');
    },

    exportData() {
        const cols = [
            { field: 'materialCode', label: 'Material Code' },
            { field: 'description', label: 'Description' },
            { field: 'type', label: 'Type' },
            { field: 'initialStock', label: 'Initial Stock' },
            { field: 'outOfStockMonth', label: 'Out of Stock Month' },
            { field: 'sixMonthStock', label: '6M Needed' },
            { field: 'twelveMonthStock', label: '12M Needed' },
            { field: 'poNo', label: 'PO Number' },
            { field: 'poQty', label: 'PO Quantity' },
            { field: 'deliveryDate', label: 'Delivery Date' },
            { field: 'comment', label: 'Comment' }
        ];
        exportToCSV('RM_PM_Inventory_Report', this._allData || [], cols);
    },

    exportRetestData() {
        const cols = [
            { field: 'materialCode', label: 'Material Code' },
            { field: 'description', label: 'Description' },
            { field: 'lotBatchNo', label: 'Batch No' },
            { field: 'qtyOnHand', label: 'Qty On Hand' },
            { field: 'retestDate', label: 'Retest Date' },
            { field: 'daysUntil', label: 'Days Remaining' },
            { field: 'retestFlag', label: 'Status' },
            { field: 'upcomingProductionDate', label: 'Upcoming Mfg Date' },
            { field: 'unitPrice', label: 'Unit Price' }
        ];
        exportToCSV('Retest_Safeguard_Report', this._retestData || [], cols);
    },

    exportIssuanceData() {
        const cols = [
            { field: 'orderNo', label: 'Shop Order No' },
            { field: 'materialPartNo', label: 'Material Code' },
            { field: 'materialDescription', label: 'Material Description' },
            { field: 'qtyRequired', label: 'Qty Required' },
            { field: 'reservedQty', label: 'Reserved Qty' },
            { field: 'availableQty', label: 'Available Stock' },
            { field: 'batchExpiryDate', label: 'Batch Expiry' },
            { field: 'materialStatus', label: 'Status' }
        ];
        exportToCSV('Material_Allocations_Report', this._issuanceData || [], cols);
    }
};
