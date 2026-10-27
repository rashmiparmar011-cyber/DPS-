/* ============================================================
   Application Main Controller & Router
   ============================================================ */

const App = {
    currentPage: 'product-planning',

    async init() {
        try {
            // Initialize data store from JSON files & localStorage
            await DataStore.init();

            // Set up router & hash listener
            window.addEventListener('hashchange', () => this.handleRouting());

            // Initialize route
            const initialHash = window.location.hash.replace('#', '') || 'product-planning';
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
        const page = window.location.hash.replace('#', '') || 'product-planning';
        this.navigateTo(page);
    },

    navigateTo(page) {
        this.currentPage = page;

        // Update active class in sidebar nav items
        const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
        navItems.forEach(item => {
            if (item.getAttribute('data-page') === page) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Close modal if open
        closeModal();

        // Render target page
        switch (page) {
            case 'product-planning':
                ProductPlanning.render();
                break;
            case 'rm-management':
                RMManagement.render();
                break;
            case 'cmo-management':
                CMOManagement.render();
                break;
            case 'export-dps':
                ExportDPS.render();
                break;
            case 'rm-pm-dashboard':
                ExistingPages.renderDashboard();
                break;
            case 'shop-order':
                ExistingPages.renderShopOrder();
                break;
            case 'rm-pm-tracking':
                ExistingPages.renderRMPMTracking();
                break;
            case 'thame':
                ExistingPages.renderThame();
                break;
            case 'cmo':
                ExistingPages.renderCMO();
                break;
            default:
                ProductPlanning.render();
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

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
