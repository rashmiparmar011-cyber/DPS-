/* ============================================================
   Reusable Components - Tables, Pagination, Filters, Forms
   ============================================================ */

// ========== DataTable Component ==========
class DataTable {
    constructor(containerId, config) {
        this.containerId = containerId;
        this.columns = config.columns || [];
        this.data = config.data || [];
        this.filteredData = [...this.data];
        this.pageSize = config.pageSize || 30;
        this.currentPage = 1;
        this.sortCol = config.sortCol || null;
        this.sortDir = config.sortDir || 'asc';
        this.onRowClick = config.onRowClick || null;
        this.onAction = config.onAction || null;
        this.columnFilters = {};
        this.searchTerm = '';
    }

    setData(data) {
        this.data = data;
        this.applyFilters();
    }

    applyFilters() {
        let result = [...this.data];

        // Global search
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            result = result.filter(row => {
                return this.columns.some(col => {
                    const val = this._getCellValue(row, col.field);
                    return val && String(val).toLowerCase().includes(term);
                });
            });
        }

        // Column filters
        Object.keys(this.columnFilters).forEach(field => {
            const filterVal = this.columnFilters[field].toLowerCase();
            if (filterVal) {
                result = result.filter(row => {
                    const val = this._getCellValue(row, field);
                    return val && String(val).toLowerCase().includes(filterVal);
                });
            }
        });

        // Sort
        if (this.sortCol) {
            result.sort((a, b) => {
                const valA = this._getCellValue(a, this.sortCol);
                const valB = this._getCellValue(b, this.sortCol);
                return compareValues(valA, valB, this.sortDir);
            });
        }

        this.filteredData = result;
        this.currentPage = 1;
        this.render();
    }

    _getCellValue(row, field) {
        if (field.includes('.')) {
            return field.split('.').reduce((obj, key) => obj && obj[key], row);
        }
        return row[field];
    }

    _getPageData() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filteredData.slice(start, start + this.pageSize);
    }

    _getTotalPages() {
        return Math.max(1, Math.ceil(this.filteredData.length / this.pageSize));
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const pageData = this._getPageData();
        const totalPages = this._getTotalPages();

        let html = '<div class="table-container">';
        html += '<div class="table-wrapper">';
        html += '<table class="data-table">';

        // Header
        html += '<thead><tr>';
        html += '<th style="width:40px">Sr No.</th>';
        this.columns.forEach(col => {
            const sortIcon = this.sortCol === col.field
                ? (this.sortDir === 'asc' ? '▲' : '▼')
                : '⇅';
            const sortClass = this.sortCol === col.field ? 'active' : '';
            const width = col.width ? `style="width:${col.width}"` : '';
            html += `<th ${width} onclick="window._dt_${this.containerId}.sort('${col.field}')">
                ${escapeHtml(col.label)} <span class="sort-icon ${sortClass}">${sortIcon}</span>
            </th>`;
        });
        if (this.onAction) {
            html += '<th style="width:80px">Actions</th>';
        }
        html += '</tr>';

        // Filter row
        html += '<tr class="filter-row">';
        html += '<td></td>';
        this.columns.forEach(col => {
            html += '<td><input type="text" class="col-filter" placeholder="Filter..." ' +
                `data-field="${col.field}" value="${escapeHtml(this.columnFilters[col.field] || '')}" ` +
                `oninput="window._dt_${this.containerId}.filterColumn('${col.field}', this.value)"></td>`;
        });
        if (this.onAction) html += '<td></td>';
        html += '</tr></thead>';

        // Body
        html += '<tbody>';
        if (pageData.length === 0) {
            const colSpan = this.columns.length + 1 + (this.onAction ? 1 : 0);
            html += `<tr><td colspan="${colSpan}"><div class="empty-state">
                <div class="empty-icon">📋</div><p>No records found</p></div></td></tr>`;
        } else {
            const startIdx = (this.currentPage - 1) * this.pageSize;
            pageData.forEach((row, idx) => {
                const clickAttr = this.onRowClick
                    ? `onclick="window._dt_${this.containerId}.rowClick('${row.id}')" style="cursor:pointer"`
                    : '';
                html += `<tr ${clickAttr}>`;
                html += `<td>${startIdx + idx + 1}</td>`;
                this.columns.forEach(col => {
                    let val = this._getCellValue(row, col.field);
                    if (col.render) {
                        val = col.render(val, row);
                    } else if (col.type === 'number') {
                        val = formatNumber(val);
                    } else if (col.type === 'date') {
                        val = formatDate(val);
                    } else if (col.type === 'badge') {
                        const badgeClass = getStatusBadge(val);
                        val = val ? `<span class="badge ${badgeClass}">${escapeHtml(val)}</span>` : '-';
                    } else if (col.type === 'stock') {
                        const cls = getStockClass(val);
                        val = val ? `<span class="${cls}">${escapeHtml(val)}</span>` : '-';
                    } else {
                        val = val ? escapeHtml(truncate(String(val), col.maxLen || 40)) : '-';
                    }
                    html += `<td>${val}</td>`;
                });
                if (this.onAction) {
                    html += `<td class="action-cell">
                        <button class="btn btn-sm btn-primary btn-icon" title="View" 
                            onclick="event.stopPropagation(); window._dt_${this.containerId}.action('view','${row.id}')">
                            <i class="fas fa-eye"></i></button>
                        <button class="btn btn-sm btn-warning btn-icon" title="Edit"
                            onclick="event.stopPropagation(); window._dt_${this.containerId}.action('edit','${row.id}')">
                            <i class="fas fa-edit"></i></button>
                    </td>`;
                }
                html += '</tr>';
            });
        }
        html += '</tbody></table></div>';

        // Pagination
        html += `<div class="pagination-bar">
            <button onclick="window._dt_${this.containerId}.goPage(1)" ${this.currentPage <= 1 ? 'disabled' : ''}>⟪</button>
            <button onclick="window._dt_${this.containerId}.goPage(${this.currentPage - 1})" ${this.currentPage <= 1 ? 'disabled' : ''}>⟨</button>
            Page <input type="number" value="${this.currentPage}" min="1" max="${totalPages}" 
                onchange="window._dt_${this.containerId}.goPage(parseInt(this.value))">
            of ${totalPages}
            <button onclick="window._dt_${this.containerId}.goPage(${this.currentPage + 1})" ${this.currentPage >= totalPages ? 'disabled' : ''}>⟩</button>
            <button onclick="window._dt_${this.containerId}.goPage(${totalPages})" ${this.currentPage >= totalPages ? 'disabled' : ''}>⟫</button>
            &nbsp;|&nbsp;
            <select onchange="window._dt_${this.containerId}.setPageSize(parseInt(this.value))">
                ${[10,20,30,50,100].map(n => `<option value="${n}" ${this.pageSize === n ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
            &nbsp;(${this.filteredData.length} records)
        </div>`;

        html += '</div>';
        container.innerHTML = html;

        // Register global reference for event handlers
        window[`_dt_${this.containerId}`] = this;
    }

    sort(field) {
        if (this.sortCol === field) {
            this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortCol = field;
            this.sortDir = 'asc';
        }
        this.applyFilters();
    }

    filterColumn(field, value) {
        this.columnFilters[field] = value;
        this.applyFilters();
    }

    goPage(page) {
        const total = this._getTotalPages();
        this.currentPage = Math.max(1, Math.min(page, total));
        this.render();
    }

    setPageSize(size) {
        this.pageSize = size;
        this.currentPage = 1;
        this.render();
    }

    search(term) {
        this.searchTerm = term;
        this.applyFilters();
    }

    rowClick(id) {
        if (this.onRowClick) this.onRowClick(id);
    }

    action(type, id) {
        if (this.onAction) this.onAction(type, id);
    }
}

// ========== Stats Cards Builder ==========
function renderStatsCards(stats) {
    return '<div class="stats-grid">' +
        stats.map(s => `
            <div class="stat-card ${s.color || ''}">
                <div class="stat-value">${formatNumber(s.value)}</div>
                <div class="stat-label">${escapeHtml(s.label)}</div>
            </div>
        `).join('') +
        '</div>';
}

// ========== Detail View Builder ==========
function renderDetailView(title, fields, record, actions) {
    let html = '<div class="detail-panel">';
    html += `<div class="detail-header"><h3>${escapeHtml(title)}</h3>`;
    if (actions) {
        html += '<div class="btn-group">' + actions + '</div>';
    }
    html += '</div>';
    html += '<div class="detail-grid">';
    fields.forEach(f => {
        let val = record[f.field];
        if (f.render) {
            val = f.render(val, record);
        } else if (f.type === 'badge') {
            val = val ? `<span class="badge ${getStatusBadge(val)}">${escapeHtml(val)}</span>` : '-';
        } else if (f.type === 'number') {
            val = formatNumber(val);
        } else if (f.type === 'date') {
            val = formatDate(val);
        } else {
            val = val || '-';
        }
        html += `<div class="detail-field">
            <div class="field-label">${escapeHtml(f.label)}</div>
            <div class="field-value">${val}</div>
        </div>`;
    });
    html += '</div></div>';
    return html;
}

// ========== Form Builder ==========
function renderForm(fields, data = {}) {
    let html = '<div class="form-grid">';
    fields.forEach(f => {
        const val = data[f.field] || f.default || '';
        const required = f.required ? '<span class="required">*</span>' : '';
        const fullWidth = f.fullWidth ? ' full-width' : '';
        html += `<div class="form-group${fullWidth}" id="fg_${f.field}">`;
        html += `<label>${escapeHtml(f.label)} ${required}</label>`;

        if (f.type === 'select') {
            html += `<select id="field_${f.field}" ${f.required ? 'required' : ''}>`;
            html += '<option value="">-- Select --</option>';
            (f.options || []).forEach(opt => {
                const optVal = typeof opt === 'object' ? opt.value : opt;
                const optLabel = typeof opt === 'object' ? opt.label : opt;
                const selected = optVal == val ? 'selected' : '';
                html += `<option value="${escapeHtml(optVal)}" ${selected}>${escapeHtml(optLabel)}</option>`;
            });
            html += '</select>';
        } else if (f.type === 'textarea') {
            html += `<textarea id="field_${f.field}" ${f.required ? 'required' : ''} 
                placeholder="${escapeHtml(f.placeholder || '')}">${escapeHtml(val)}</textarea>`;
        } else {
            const inputType = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text';
            html += `<input type="${inputType}" id="field_${f.field}" value="${escapeHtml(val)}" 
                ${f.required ? 'required' : ''} placeholder="${escapeHtml(f.placeholder || '')}" 
                ${f.type === 'number' ? 'step="any"' : ''} ${f.readonly ? 'readonly' : ''}>`;
        }
        html += `<span class="error-text" id="err_${f.field}"></span>`;
        html += '</div>';
    });
    html += '</div>';
    return html;
}

// Collect form data
function collectFormData(fields) {
    const data = {};
    let isValid = true;

    fields.forEach(f => {
        const el = document.getElementById(`field_${f.field}`);
        const fg = document.getElementById(`fg_${f.field}`);
        const err = document.getElementById(`err_${f.field}`);
        if (!el) return;

        const val = el.value.trim();
        data[f.field] = val;

        // Clear error
        fg.classList.remove('has-error');
        if (err) err.textContent = '';

        // Validate required
        if (f.required && !val) {
            fg.classList.add('has-error');
            if (err) err.textContent = `${f.label} is required`;
            isValid = false;
            return;
        }

        // Validate number
        if (f.type === 'number' && val) {
            const num = parseFloat(val);
            if (isNaN(num)) {
                fg.classList.add('has-error');
                if (err) err.textContent = 'Must be a valid number';
                isValid = false;
            } else if (f.min !== undefined && num < f.min) {
                fg.classList.add('has-error');
                if (err) err.textContent = `Minimum value is ${f.min}`;
                isValid = false;
            }
        }
    });

    return { data, isValid };
}
