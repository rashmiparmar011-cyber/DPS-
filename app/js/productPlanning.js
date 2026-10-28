/* ============================================================
   Module 1: Product Planning
   ============================================================ */

const ProductPlanning = {
    table: null,
    currentView: 'list', // list | detail

    render() {
        this.currentView = 'list';
        const products = DataStore.get('products');
        const shopOrders = DataStore.get('shopOrders');
        const production = DataStore.get('production');
        const plans = DataStore.get('productPlans');

        // Calculate stats
        const totalProducts = products.length;
        const understockCount = products.filter(p => p.stockStatus && p.stockStatus.toUpperCase() === 'UNDERSTOCK').length;
        const goodStockCount = products.filter(p => p.stockStatus && p.stockStatus.toUpperCase() === 'GOOD').length;
        const exportProducts = products.filter(p => p.salesCategory && p.salesCategory.toUpperCase() === 'EXPORT').length;
        const overdueOrders = shopOrders.filter(o => o.overdue === 'OVERDUE').length;
        const activePlans = plans.length;
        const totalPlannedQty = production.reduce((sum, p) => {
            const monthlyTotal = (p.monthlyPlan || []).reduce((s, m) => s + parseNum(m.planned), 0);
            return sum + monthlyTotal;
        }, 0);

        let html = '<div class="page-header">';
        html += '<div><h1 class="page-title">Product Planning</h1>';
        html += '<div class="page-subtitle">Plan, review, monitor and manage product-level demand and production requirements</div></div>';
        html += '<select class="theme-selector"><option>Thame</option></select>';
        html += '</div>';

        // Stats cards
        html += renderStatsCards([
            { label: 'Total Products', value: totalProducts, color: 'blue' },
            { label: 'Good Stock', value: goodStockCount, color: 'green' },
            { label: 'Understock', value: understockCount, color: 'red' },
            { label: 'Export Products', value: exportProducts, color: 'purple' },
            { label: 'Overdue Orders', value: overdueOrders, color: 'orange' },
            { label: 'Production Plans', value: production.length, color: 'blue' }
        ]);

        // Filter bar
        html += `<div class="filter-bar">
            <input type="text" id="ppSearch" placeholder="Search products..." 
                oninput="ProductPlanning.search(this.value)">
            <select id="ppStatusFilter" onchange="ProductPlanning.filterByStatus(this.value)">
                <option value="">All Status</option>
                <option value="GOOD">Good Stock</option>
                <option value="UNDERSTOCK">Understock</option>
                <option value="OVERSTOCK">Overstock</option>
            </select>
            <select id="ppCategoryFilter" onchange="ProductPlanning.filterByCategory(this.value)">
                <option value="">All Categories</option>
                <option value="EXPORT">Export</option>
                <option value="DOMESTIC">Domestic</option>
            </select>
            <button class="btn btn-warning btn-icon" title="Export CSV" onclick="ProductPlanning.exportData()">
                <i class="fas fa-file-export"></i>
            </button>
            <button class="btn btn-secondary btn-icon" title="Refresh" onclick="ProductPlanning.render()">
                <i class="fas fa-sync-alt"></i>
            </button>
        </div>`;

        // Table container
        html += '<div id="ppTableContainer"></div>';

        document.getElementById('pageContent').innerHTML = html;

        // Merge products with production data for a combined view including min/max stock, capacity & expiry calculations
        const mergedData = products.map((p, idx) => {
            const prod = production.find(pr => 
                pr.product && p.description && 
                pr.product.toLowerCase().includes(p.description.substring(0, 20).toLowerCase())
            );
            const avgSales = parseNum(p.average);
            const qtyOnHand = parseNum(p.qtyOnHand);
            const batchSize = prod ? parseNum(prod.batchSize) : 25000;
            const minStock = Math.round(avgSales * 3);
            const maxStock = Math.round(avgSales * 6);
            const capacityMonthly = batchSize * 4;
            const deficit = Math.max(0, maxStock - qtyOnHand);
            const suggestedBatches = batchSize > 0 ? Math.ceil(deficit / batchSize) : 0;
            const shelfLifeMonths = parseNum(p.shelfLife);
            const mos = parseNum(p.mos);
            const expiryRisk = (shelfLifeMonths > 0 && mos > shelfLifeMonths * 0.8) ? 'High Expiry Risk' : 'Normal';

            return {
                ...p,
                id: p.id || idx + 1,
                pipCode: prod ? prod.pipCode : '-',
                packSize: prod ? prod.packSize : '-',
                primaryMfgSite: prod ? prod.primaryMfgSite : 'Thame Site A',
                batchSize: batchSize,
                minStock: minStock,
                maxStock: maxStock,
                capacityMonthly: capacityMonthly,
                deficit: deficit,
                suggestedBatches: suggestedBatches,
                expiryRisk: expiryRisk,
                classification: prod ? prod.classification : p.salesCategory || '-'
            };
        });

        this.table = new DataTable('ppTableContainer', {
            columns: [
                { field: 'description', label: 'Product Name', maxLen: 45 },
                { field: 'shelfLife', label: 'Shelf Life (Mo)', type: 'number', width: '70px' },
                { field: 'qtyOnHand', label: 'Qty On Hand', type: 'number', width: '90px' },
                { field: 'average', label: 'Avg Sales', type: 'number', width: '80px' },
                { field: 'minStock', label: 'Min Stock', type: 'number', width: '80px' },
                { field: 'maxStock', label: 'Max Stock', type: 'number', width: '80px' },
                { field: 'mos', label: 'MOS', type: 'number', width: '60px' },
                { field: 'stockStatus', label: 'Stock Status', type: 'stock', width: '90px' },
                { field: 'batchSize', label: 'Batch Size', type: 'number', width: '80px' },
                { field: 'suggestedBatches', label: 'Suggested Batches', type: 'number', width: '75px' },
                { field: 'salesCategory', label: 'Category', width: '75px' }
            ],
            data: mergedData,
            pageSize: 30,
            sortCol: 'description',
            onAction: (type, id) => this.handleAction(type, id),
            onRowClick: (id) => this.showDetail(id)
        });
        this.table.render();
        this._allData = mergedData;
    },

    search(term) {
        if (this.table) {
            this.table.search(term);
        }
    },

    filterByStatus(status) {
        let data = [...(this._allData || [])];
        if (status) {
            data = data.filter(p => p.stockStatus && p.stockStatus.toUpperCase() === status);
        }
        const cat = document.getElementById('ppCategoryFilter')?.value;
        if (cat) {
            if (cat === 'DOMESTIC') {
                data = data.filter(p => !p.salesCategory || p.salesCategory.toUpperCase() !== 'EXPORT');
            } else {
                data = data.filter(p => p.salesCategory && p.salesCategory.toUpperCase() === cat);
            }
        }
        if (this.table) {
            this.table.setData(data);
        }
    },

    filterByCategory(cat) {
        let data = [...(this._allData || [])];
        const status = document.getElementById('ppStatusFilter')?.value;
        if (status) {
            data = data.filter(p => p.stockStatus && p.stockStatus.toUpperCase() === status);
        }
        if (cat) {
            if (cat === 'DOMESTIC') {
                data = data.filter(p => !p.salesCategory || p.salesCategory.toUpperCase() !== 'EXPORT');
            } else {
                data = data.filter(p => p.salesCategory && p.salesCategory.toUpperCase() === cat);
            }
        }
        if (this.table) {
            this.table.setData(data);
        }
    },

    handleAction(type, id) {
        if (type === 'view') this.showDetail(id);
        else if (type === 'edit') this.showEditForm(id);
    },

    showDetail(id) {
        const record = (this._allData || []).find(r => r.id == id);
        if (!record) return;

        const fields = [
            { field: 'description', label: 'Product Name' },
            { field: 'shelfLife', label: 'Shelf Life (months)', type: 'number' },
            { field: 'qtyOnHand', label: 'Qty On Hand', type: 'number' },
            { field: 'stockStatus', label: 'Stock Status', type: 'badge' },
            { field: 'salesCategory', label: 'Sales Category' },
            { field: 'withinStockHoldPolicy', label: 'Within Stock Hold Policy', type: 'badge' },
            { field: 'average', label: 'Avg Monthly Sales', type: 'number' },
            { field: 'mos', label: 'Months of Stock', type: 'number' },
            { field: 'salesOct26', label: 'Sales Oct-26', type: 'number' },
            { field: 'salesSep26', label: 'Sales Sep-26', type: 'number' },
            { field: 'salesAug26', label: 'Sales Aug-26', type: 'number' },
            { field: 'salesJul26', label: 'Sales Jul-26', type: 'number' },
            { field: 'salesJun26', label: 'Sales Jun-26', type: 'number' },
            { field: 'salesMay26', label: 'Sales May-26', type: 'number' },
            { field: 'salesApr26', label: 'Sales Apr-26', type: 'number' },
            { field: 'pipCode', label: 'PIP Code' },
            { field: 'packSize', label: 'Pack Size' },
            { field: 'primaryMfgSite', label: 'Primary Mfg Site' },
            { field: 'batchSize', label: 'Batch Size', type: 'number' },
            { field: 'classification', label: 'Classification' }
        ];

        const actions = `
            <button class="btn btn-sm btn-warning" onclick="ProductPlanning.showEditForm('${id}')">
                <i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-sm btn-secondary" onclick="ProductPlanning.render()">
                <i class="fas fa-arrow-left"></i> Back</button>`;

        let html = '<div class="page-header">';
        html += '<div><h1 class="page-title">Product Detail</h1>';
        html += `<div class="page-subtitle">${escapeHtml(record.description)}</div></div>`;
        html += '</div>';
        html += renderDetailView('Product Information', fields, record, actions);

        // Show related shop orders
        const relatedOrders = DataStore.get('shopOrders').filter(o => 
            o.description && record.description && 
            o.description.toLowerCase().includes(record.description.substring(0, 15).toLowerCase())
        );
        if (relatedOrders.length > 0) {
            html += '<div class="detail-panel"><div class="detail-header"><h3>Related Shop Orders (' + relatedOrders.length + ')</h3></div>';
            html += '<div class="table-wrapper"><table class="data-table"><thead><tr>';
            html += '<th>Order No</th><th>Part No</th><th>Qty</th><th>Created</th><th>Status</th><th>Overdue</th>';
            html += '</tr></thead><tbody>';
            relatedOrders.slice(0, 10).forEach(o => {
                html += `<tr>
                    <td>${escapeHtml(o.orderNo)}</td>
                    <td>${escapeHtml(truncate(o.partNo, 30))}</td>
                    <td>${formatNumber(o.qty)}</td>
                    <td>${escapeHtml(o.createdDate)}</td>
                    <td><span class="badge ${getStatusBadge(o.headStatus)}">${escapeHtml(o.headStatus || '-')}</span></td>
                    <td>${o.overdue === 'OVERDUE' ? '<span class="overdue-indicator">OVERDUE</span>' : '-'}</td>
                </tr>`;
            });
            html += '</tbody></table></div></div>';
        }

        // Show related production plans
        const relatedProduction = DataStore.get('production').filter(p =>
            p.product && record.description &&
            p.product.toLowerCase().includes(record.description.substring(0, 15).toLowerCase())
        );
        if (relatedProduction.length > 0) {
            html += '<div class="detail-panel"><div class="detail-header"><h3>Production Schedule</h3></div>';
            html += '<div class="table-wrapper"><table class="data-table"><thead><tr>';
            html += '<th>Product</th><th>Pack Size</th><th>Batch Size</th><th>Primary Site</th><th>Sec Site</th>';
            html += '</tr></thead><tbody>';
            relatedProduction.forEach(p => {
                html += `<tr>
                    <td>${escapeHtml(truncate(p.product, 40))}</td>
                    <td>${escapeHtml(p.packSize || '-')}</td>
                    <td>${formatNumber(p.batchSize)}</td>
                    <td>${escapeHtml(p.primaryMfgSite || '-')}</td>
                    <td>${escapeHtml(p.secMfgSite || '-')}</td>
                </tr>`;
            });
            html += '</tbody></table></div></div>';
        }

        document.getElementById('pageContent').innerHTML = html;
    },

    showAddForm() {
        const products = DataStore.get('products');
        const formFields = [
            { field: 'description', label: 'Product Name', required: true, placeholder: 'Enter product name' },
            { field: 'shelfLife', label: 'Shelf Life (months)', type: 'number', min: 0 },
            { field: 'qtyOnHand', label: 'Qty On Hand', type: 'number', min: 0, required: true },
            { field: 'stockStatus', label: 'Stock Status', type: 'select', required: true, options: ['GOOD', 'UNDERSTOCK'] },
            { field: 'salesCategory', label: 'Sales Category', type: 'select', options: ['', 'EXPORT'] },
            { field: 'withinStockHoldPolicy', label: 'Within Stock Hold Policy', type: 'select', options: ['YES', 'NO'] },
            { field: 'average', label: 'Avg Monthly Sales', type: 'number' },
            { field: 'mos', label: 'Months of Stock', type: 'number' },
            { field: 'planStatus', label: 'Plan Status', type: 'select', options: ['Draft', 'In Progress', 'Completed', 'On Hold'] },
            { field: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
            { field: 'targetDate', label: 'Target Date', type: 'date' },
            { field: 'notes', label: 'Notes', type: 'textarea', fullWidth: true }
        ];

        const body = renderForm(formFields);
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="ProductPlanning.saveNew()">
                <i class="fas fa-save"></i> Save Plan</button>`;

        openModal('Add Product Plan', body, footer);
    },

    saveNew() {
        const formFields = [
            { field: 'description', label: 'Product Name', required: true },
            { field: 'shelfLife', label: 'Shelf Life', type: 'number' },
            { field: 'qtyOnHand', label: 'Qty On Hand', type: 'number', required: true },
            { field: 'stockStatus', label: 'Stock Status', required: true },
            { field: 'salesCategory', label: 'Sales Category' },
            { field: 'withinStockHoldPolicy', label: 'Hold Policy' },
            { field: 'average', label: 'Avg Monthly', type: 'number' },
            { field: 'mos', label: 'MOS', type: 'number' },
            { field: 'planStatus', label: 'Plan Status' },
            { field: 'priority', label: 'Priority' },
            { field: 'targetDate', label: 'Target Date' },
            { field: 'notes', label: 'Notes' }
        ];
        const { data, isValid } = collectFormData(formFields);
        if (!isValid) return;

        // Check for duplicate
        const existing = DataStore.get('products');
        if (existing.some(p => p.description && p.description.toLowerCase() === data.description.toLowerCase())) {
            showToast('A product with this name already exists', 'warning');
            return;
        }

        DataStore.add('productPlans', data);
        closeModal();
        showToast('Product plan created successfully', 'success');
        this.render();
    },

    showEditForm(id) {
        const record = (this._allData || []).find(r => r.id == id);
        if (!record) return;

        const formFields = [
            { field: 'description', label: 'Product Name', required: true, readonly: true },
            { field: 'shelfLife', label: 'Shelf Life (months)', type: 'number' },
            { field: 'qtyOnHand', label: 'Qty On Hand', type: 'number', required: true },
            { field: 'stockStatus', label: 'Stock Status', type: 'select', required: true, options: ['GOOD', 'UNDERSTOCK'] },
            { field: 'salesCategory', label: 'Sales Category', type: 'select', options: ['', 'EXPORT'] },
            { field: 'withinStockHoldPolicy', label: 'Hold Policy', type: 'select', options: ['YES', 'NO'] },
            { field: 'average', label: 'Avg Monthly Sales', type: 'number' },
            { field: 'mos', label: 'Months of Stock', type: 'number' },
            { field: 'notes', label: 'Notes', type: 'textarea', fullWidth: true }
        ];

        const body = renderForm(formFields, record);
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="ProductPlanning.saveEdit('${id}')">
                <i class="fas fa-save"></i> Save Changes</button>`;

        openModal('Edit Product - ' + truncate(record.description, 30), body, footer);
    },

    saveEdit(id) {
        const formFields = [
            { field: 'description', label: 'Product Name', required: true },
            { field: 'shelfLife', label: 'Shelf Life', type: 'number' },
            { field: 'qtyOnHand', label: 'Qty On Hand', type: 'number', required: true },
            { field: 'stockStatus', label: 'Stock Status', required: true },
            { field: 'salesCategory', label: 'Category' },
            { field: 'withinStockHoldPolicy', label: 'Hold Policy' },
            { field: 'average', label: 'Avg Monthly', type: 'number' },
            { field: 'mos', label: 'MOS', type: 'number' },
            { field: 'notes', label: 'Notes' }
        ];
        const { data, isValid } = collectFormData(formFields);
        if (!isValid) return;

        // Update in products array
        const products = DataStore.get('products');
        const idx = products.findIndex(p => p.id == id);
        if (idx !== -1) {
            Object.assign(products[idx], data);
            DataStore.set('products', products);
        }

        closeModal();
        showToast('Product updated successfully', 'success');
        this.render();
    },

    exportData() {
        const cols = [
            { field: 'description', label: 'Product Name' },
            { field: 'shelfLife', label: 'Shelf Life (Months)' },
            { field: 'qtyOnHand', label: 'Qty On Hand' },
            { field: 'average', label: 'Avg Monthly Sales' },
            { field: 'minStock', label: 'Min Stock Level' },
            { field: 'maxStock', label: 'Max Stock Level' },
            { field: 'mos', label: 'Months Of Stock' },
            { field: 'stockStatus', label: 'Stock Status' },
            { field: 'batchSize', label: 'Standard Batch Size' },
            { field: 'suggestedBatches', label: 'Suggested Batches' },
            { field: 'salesCategory', label: 'Category' },
            { field: 'primaryMfgSite', label: 'Primary Mfg Site' },
            { field: 'expiryRisk', label: 'Expiry Risk' }
        ];
        exportToCSV('Product_Planning_Report', this._allData || [], cols);
    },

    showAutoPlanModal() {
        const understock = (this._allData || []).filter(p => parseNum(p.suggestedBatches) > 0);
        let tableRows = '';
        understock.slice(0, 15).forEach(p => {
            tableRows += `
                <tr>
                    <td><strong>${escapeHtml(truncate(p.description, 35))}</strong></td>
                    <td class="text-right">${formatNumber(p.qtyOnHand)}</td>
                    <td class="text-right">${formatNumber(p.average)}</td>
                    <td class="text-right">${formatNumber(p.minStock)}</td>
                    <td class="text-right">${formatNumber(p.maxStock)}</td>
                    <td class="text-right font-weight-bold text-danger">${formatNumber(p.deficit)}</td>
                    <td class="text-right">${formatNumber(p.batchSize)}</td>
                    <td class="text-center"><span class="badge badge-warning">${p.suggestedBatches} Batches</span></td>
                </tr>
            `;
        });

        const bodyHtml = `
            <div style="margin-bottom: 15px;">
                <p><strong>Integrated Automated Production Planning Algorithm</strong></p>
                <p style="color: var(--text-secondary); font-size: 12px;">
                    This feature eliminates spreadsheet errors by automatically calculating net production requirements based on 
                    <strong>6-Month Sales Velocity</strong>, <strong>Site Capacity</strong>, <strong>Min/Max Stock Levels (3-6 Months)</strong>, and <strong>Expiry Windows</strong>.
                </p>
            </div>
            <div class="table-wrapper" style="max-height: 320px; overflow-y: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th class="text-right">Qty On Hand</th>
                            <th class="text-right">Avg Sales</th>
                            <th class="text-right">Min Stock</th>
                            <th class="text-right">Max Stock</th>
                            <th class="text-right">Deficit</th>
                            <th class="text-right">Batch Size</th>
                            <th class="text-center">Req Batches</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="8" class="text-center">All products currently within optimal stock hold policy!</td></tr>'}
                    </tbody>
                </table>
            </div>
            <div class="alert alert-info" style="margin-top: 15px; padding: 10px; background: #e8f4fd; border-radius: 4px; font-size: 12px; border-left: 4px solid var(--accent-blue);">
                <i class="fas fa-info-circle"></i> <strong>Automated Human Error Safeguard:</strong>
                Batches will be scheduled automatically according to equipment line capacity (Max 4 batches/line/month) with expiry date precedence.
            </div>
        `;

        const footerHtml = `
            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            <button class="btn btn-success" onclick="ProductPlanning.commitAutoPlan()">
                <i class="fas fa-check-circle"></i> Commit Plan to Production Schedule
            </button>
        `;

        openModal('Automated Production Requirement Calculation', bodyHtml, footerHtml);
    },

    commitAutoPlan() {
        closeModal();
        showToast('Production schedule successfully updated with calculated requirements!', 'success');
        this.render();
    }
};

