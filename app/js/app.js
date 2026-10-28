/* ============================================================
   Application Main Controller & Router
   ============================================================ */

const App = {
    currentPage: 'thame',

    async init() {
        try {
            // Initialize data store from JSON files & localStorage
            await DataStore.init();

            // Set up router & hash listener
            window.addEventListener('hashchange', () => this.handleRouting());

            // Initialize route
            const initialHash = window.location.hash.replace('#', '') || 'thame';
            this.navigateTo(initialHash);

            // Update header date
            const lastUpdatedElem = document.getElementById('lastUpdated');
            if (lastUpdatedElem) {
                lastUpdatedElem.textContent = `Last Updated Date : ${getCurrentDateFormatted()} 12:00 AM`;
            }
        } catch (err) {
            console.error('Initialization error:', err);
            showToast('Error initializing application data', 'error');
        }
    },

    handleRouting() {
        const page = window.location.hash.replace('#', '') || 'rm-dashboard';
        this.navigateTo(page);
    },

    navigateTo(page) {
        this.currentPage = page;

        // Update active class in sidebar nav items
        const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
        navItems.forEach(item => {
            const dataPage = item.getAttribute('data-page');
            if (dataPage === page) {
                item.classList.add('active');
                if (page === 'thame' || page === 'manufacturing-planning') {
                    item.classList.add('active-pink');
                } else {
                    item.classList.remove('active-pink');
                }
            } else {
                item.classList.remove('active');
                item.classList.remove('active-pink');
            }
        });

        // Close modal if open
        closeModal();

        // Render target page
        switch (page) {
            case 'rm-dashboard':
                if (typeof RMDashboard !== 'undefined') {
                    RMDashboard.render();
                } else {
                    ExistingPages.renderDashboard();
                }
                break;
            case 'cmo-dashboard':
                if (typeof CMODashboard !== 'undefined') {
                    CMODashboard.render();
                } else {
                    ExistingPages.renderCMO();
                }
                break;
            case 'cmo':
                ExistingPages.renderCMO();
                break;
            case 'product-planning':
                ProductPlanning.render();
                break;
            case 'products':
            case 'data':
                ProductPlanning.render();
                break;
            case 'rm-management':
                RMManagement.render();
                break;
            case 'rm-responsibility':
                RMManagement.render();
                break;
            case 'cmo-management':
                CMOManagement.render();
                break;
            case 'export-dps':
                ExportDPS.render();
                break;
            case 'shop-order':
                ExistingPages.renderShopOrder();
                break;
            case 'rm-pm-tracking':
                ExistingPages.renderRMPMTracking();
                break;
            case 'rm-pm-dashboard':
                ExistingPages.renderDashboard();
                break;
            case 'thame':
            case 'manufacturing-planning':
                ExistingPages.renderThame();
                break;
            case 'wip':
            case 'quantity-in-progress':
                ExistingPages.renderWIP();
                break;
            case 'back-order':
                ExistingPages.renderBackOrder();
                break;
            default:
                ExistingPages.renderThame();
                break;
        }
    }
};

// Global navigate function used in HTML onclick
function navigateTo(page) {
    window.location.hash = page;
}

// Global sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

// Global accordion toggle for CMO group
function toggleAccordion(groupId) {
    const el = document.getElementById(groupId);
    if (el) {
        el.classList.toggle('collapsed');
    }
}

// Global theme dropdown / notification
function toggleThemeMenu(event) {
    if (event) event.stopPropagation();
    showToast('Theme: Mountain Peak (Dark Alpine)', 'info');
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
