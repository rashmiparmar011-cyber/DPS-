/* ============================================================
   Utility Functions - DPS Application
   ============================================================ */

// Toast notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };
    toast.innerHTML = `<i class="fas fa-${icons[type] || icons.info}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Modal management
function openModal(title, bodyHtml, footerHtml) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    document.getElementById('modalFooter').innerHTML = footerHtml || '';
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

function closeModalOnOverlay(e) {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
}

// Format numbers
function formatNumber(val) {
    if (val === null || val === undefined || val === '') return '-';
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return num.toLocaleString('en-GB', { maximumFractionDigits: 2 });
}

// Format dates
function formatDate(dateStr) {
    if (!dateStr || dateStr === '-' || dateStr === 'NA') return '-';
    // Try various date formats
    let d;
    if (dateStr.match(/^\d{2}-[A-Za-z]{3}-\d{2}$/)) {
        d = new Date(dateStr);
    } else if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const parts = dateStr.split('/');
        d = new Date(parts[2], parts[1] - 1, parts[0]);
    } else {
        d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mmm = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    const yyyy = d.getFullYear();
    return `${dd}-${mmm}-${yyyy}`;
}

// Check if date is overdue
function isOverdue(dateStr) {
    if (!dateStr || dateStr === '-' || dateStr === 'NA') return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return d < new Date();
}

// Get status badge class
function getStatusBadge(status) {
    if (!status) return 'badge-secondary';
    const s = status.toLowerCase();
    if (s.includes('good') || s.includes('completed') || s.includes('confirmed') || s.includes('received') || s.includes('issued') || s === 'yes') return 'badge-success';
    if (s.includes('understock') || s.includes('overdue') || s.includes('risk') || s.includes('expired') || s === 'no') return 'badge-danger';
    if (s.includes('pending') || s.includes('progress') || s.includes('started') || s.includes('partially')) return 'badge-warning';
    if (s.includes('early') || s.includes('on time')) return 'badge-info';
    return 'badge-secondary';
}

function getStockClass(status) {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s === 'good') return 'stock-good';
    if (s === 'understock') return 'stock-understock';
    if (s.includes('risk')) return 'stock-risk';
    return '';
}

// Debounce function
function debounce(fn, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Parse numeric value safely
function parseNum(val) {
    if (val === null || val === undefined || val === '') return 0;
    const n = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
}

// Truncate text
function truncate(text, maxLen = 40) {
    if (!text) return '-';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

// Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Deep clone
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

// Navigation
function navigateTo(page) {
    window.location.hash = page;
}

// Get current date formatted
function getCurrentDateFormatted() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mmm = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()];
    const yyyy = d.getFullYear();
    return `${dd}-${mmm}-${yyyy}`;
}

// Compare function for sorting
function compareValues(a, b, direction = 'asc') {
    if (a === b) return 0;
    if (a === null || a === undefined || a === '') return 1;
    if (b === null || b === undefined || b === '') return -1;
    
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    
    if (!isNaN(numA) && !isNaN(numB)) {
        return direction === 'asc' ? numA - numB : numB - numA;
    }
    
    const strA = String(a).toLowerCase();
    const strB = String(b).toLowerCase();
    if (direction === 'asc') {
        return strA < strB ? -1 : 1;
    }
    return strA > strB ? -1 : 1;
}

// Export data to CSV file download
function exportToCSV(filename, data, columns) {
    if (!data || !data.length) {
        showToast('No data available to export', 'warning');
        return;
    }
    const cols = columns || Object.keys(data[0]).map(k => ({ field: k, label: k }));
    const headers = cols.map(c => `"${(c.label || c.field).replace(/"/g, '""')}"`).join(',');
    const rows = data.map(row => {
        return cols.map(c => {
            const val = c.field.includes('.') 
                ? c.field.split('.').reduce((obj, key) => obj && obj[key], row)
                : row[c.field];
            const cleanVal = val === null || val === undefined ? '' : String(val);
            return `"${cleanVal.replace(/"/g, '""')}"`;
        }).join(',');
    });
    const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${getCurrentDateFormatted()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${data.length} records to CSV`, 'success');
}

