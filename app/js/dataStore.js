/* ============================================================
   Data Store - Central data management with localStorage persistence
   ============================================================ */

const DataStore = {
    _data: {},
    _loaded: false,

    async init() {
        if (this._loaded) return;
        
        const files = [
            { key: 'products', file: 'data/products.json' },
            { key: 'rmpm', file: 'data/rmpm.json' },
            { key: 'expiry', file: 'data/expiry.json' },
            { key: 'cmo', file: 'data/cmo.json' },
            { key: 'stock', file: 'data/stock.json' },
            { key: 'purchaseOrders', file: 'data/purchase_orders.json' },
            { key: 'shopOrders', file: 'data/shop_orders.json' },
            { key: 'rmpmNotIssued', file: 'data/rmpm_not_issued.json' },
            { key: 'production', file: 'data/production.json' },
            { key: 'thamePlanning', file: 'data/thame_planning.json' },
            { key: 'backOrders', file: 'data/back_orders.json' }
        ];

        const promises = files.map(async ({ key, file }) => {
            // Check localStorage first for user modifications
            const stored = localStorage.getItem(`dps_${key}`);
            if (stored) {
                try {
                    this._data[key] = JSON.parse(stored);
                    return;
                } catch(e) {
                    console.warn(`Failed to parse stored data for ${key}`, e);
                }
            }
            // Load from JSON file
            try {
                const response = await fetch(file);
                if (response.ok) {
                    this._data[key] = await response.json();
                } else {
                    console.warn(`Failed to load ${file}: ${response.status}`);
                    this._data[key] = [];
                }
            } catch(e) {
                console.warn(`Error loading ${file}`, e);
                this._data[key] = [];
            }
        });

        await Promise.all(promises);
        
        // Initialize custom module data from localStorage with intelligent seed defaults
        const initSeeds = {
            exportOrders: [
                {
                    id: 'SO-EXP-2026-001',
                    soNumber: 'SO-EXP-2026-001',
                    customerName: 'Medix Pharma GmbH (Germany)',
                    contactEmail: 'orders@medixpharma.de',
                    destinationCountry: 'Germany',
                    productName: 'SODIUM CHLORIDE 0.9% INFUSION 100ML',
                    partNo: '100045-EXP',
                    orderedQty: 50000,
                    unitPrice: 2.40,
                    productValue: 120000,
                    incoterm: 'CIF - Hamburg',
                    logisticsCost: 4200,
                    pharmadoxCost: 1800,
                    totalValue: 126000,
                    orderDate: '2026-10-05',
                    requestedDeliveryDate: '2026-11-20',
                    confirmedDeliveryDate: '2026-11-20',
                    exportStatus: 'In Production',
                    confirmationStatus: 'Confirmed',
                    confirmationSentDate: '2026-10-06 14:32',
                    backOrderQty: 10000,
                    backOrderDate: '2026-11-30',
                    delayAlert: 'Normal - On Track',
                    isDelayed: false,
                    productionPlanLinked: 'Batch #26B-SC100 (Primary Site)',
                    auditTrail: [
                        { date: '2026-10-05 09:15', user: 'Export Manager', event: 'Order Created', note: 'Customer PO #DE-9942 received' },
                        { date: '2026-10-06 14:32', user: 'System (Auto)', event: 'SO Confirmation Sent', note: 'Automated confirmation dispatched to orders@medixpharma.de' },
                        { date: '2026-10-10 11:00', user: 'Planner', event: 'Production Plan Integrated', note: 'Linked to batch #26B-SC100' },
                        { date: '2026-10-18 08:30', user: 'Operations', event: 'Production Started', note: 'Batch compounding initiated' }
                    ]
                },
                {
                    id: 'SO-EXP-2026-002',
                    soNumber: 'SO-EXP-2026-002',
                    customerName: 'Nordic Health AB (Sweden)',
                    contactEmail: 'supply@nordichealth.se',
                    destinationCountry: 'Sweden',
                    productName: 'METRONIDAZOLE 500MG/100ML INFUSION',
                    partNo: '100088-EXP',
                    orderedQty: 35000,
                    unitPrice: 1.95,
                    productValue: 68250,
                    incoterm: 'FOB - Southampton',
                    logisticsCost: 2850,
                    pharmadoxCost: 1500,
                    totalValue: 72600,
                    orderDate: '2026-10-08',
                    requestedDeliveryDate: '2026-11-15',
                    confirmedDeliveryDate: '2026-11-15',
                    exportStatus: 'QC Passed',
                    confirmationStatus: 'Confirmed',
                    confirmationSentDate: '2026-10-09 10:15',
                    backOrderQty: 0,
                    backOrderDate: '-',
                    delayAlert: 'Normal - QC Complete',
                    isDelayed: false,
                    productionPlanLinked: 'Batch #26B-MET500 (Primary Site)',
                    auditTrail: [
                        { date: '2026-10-08 11:20', user: 'Export Officer', event: 'Order Created', note: 'Customer PO #SE-5521 received' },
                        { date: '2026-10-09 10:15', user: 'System (Auto)', event: 'SO Confirmation Sent', note: 'Automated confirmation dispatched to supply@nordichealth.se' },
                        { date: '2026-10-22 16:45', user: 'QC Lead', event: 'QC Passed', note: 'Certificate of Analysis released' }
                    ]
                },
                {
                    id: 'SO-EXP-2026-003',
                    soNumber: 'SO-EXP-2026-003',
                    customerName: 'Laboratoires Biocare (France)',
                    contactEmail: 'appro@biocare-france.fr',
                    destinationCountry: 'France',
                    productName: 'PARACETAMOL 10MG/ML 100ML INFUSION',
                    partNo: '100112-EXP',
                    orderedQty: 60000,
                    unitPrice: 1.25,
                    productValue: 75000,
                    incoterm: 'DDP - Lyon',
                    logisticsCost: 3900,
                    pharmadoxCost: 1950,
                    totalValue: 80850,
                    orderDate: '2026-10-15',
                    requestedDeliveryDate: '2026-11-25',
                    confirmedDeliveryDate: '2026-12-05',
                    exportStatus: 'Production Scheduled',
                    confirmationStatus: 'Pending',
                    confirmationSentDate: '-',
                    backOrderQty: 20000,
                    backOrderDate: '2026-12-10',
                    delayAlert: 'ALERT: 10-day delay due to RM re-test schedule',
                    isDelayed: true,
                    productionPlanLinked: 'Batch #26B-PAR10 (Secondary Site)',
                    auditTrail: [
                        { date: '2026-10-15 14:00', user: 'Export Officer', event: 'Order Created', note: 'Tender PO #FR-8871 received' },
                        { date: '2026-10-19 11:30', user: 'System (Alert)', event: 'Delay Alert Generated', note: 'Raw material active ingredient retest pending - delivery date shifted to 05-Dec-2026' }
                    ]
                },
                {
                    id: 'SO-EXP-2026-004',
                    soNumber: 'SO-EXP-2026-004',
                    customerName: 'EuroPharm S.A. (Spain)',
                    contactEmail: 'compras@europharm.es',
                    destinationCountry: 'Spain',
                    productName: 'CIPROFLOXACIN 200MG/100ML INFUSION',
                    partNo: '100155-EXP',
                    orderedQty: 25000,
                    unitPrice: 3.10,
                    productValue: 77500,
                    incoterm: 'CIF - Barcelona',
                    logisticsCost: 3400,
                    pharmadoxCost: 1600,
                    totalValue: 82500,
                    orderDate: '2026-10-18',
                    requestedDeliveryDate: '2026-11-28',
                    confirmedDeliveryDate: '2026-11-28',
                    exportStatus: 'Order Placed',
                    confirmationStatus: 'Pending',
                    confirmationSentDate: '-',
                    backOrderQty: 5000,
                    backOrderDate: '2026-12-05',
                    delayAlert: 'Awaiting SO Confirmation',
                    isDelayed: false,
                    productionPlanLinked: 'Batch #26B-CIP200',
                    auditTrail: [
                        { date: '2026-10-18 16:30', user: 'Export Officer', event: 'Order Created', note: 'Customer contract order #ES-4412 logged' }
                    ]
                },
                {
                    id: 'SO-EXP-2026-005',
                    soNumber: 'SO-EXP-2026-005',
                    customerName: 'Al-Hikma Pharma (UAE)',
                    contactEmail: 'import@alhikma.ae',
                    destinationCountry: 'United Arab Emirates',
                    productName: 'FLUCONAZOLE 2MG/ML 100ML INFUSION',
                    partNo: '100201-EXP',
                    orderedQty: 18000,
                    unitPrice: 4.50,
                    productValue: 81000,
                    incoterm: 'CIF - Dubai',
                    logisticsCost: 5400,
                    pharmadoxCost: 2200,
                    totalValue: 88600,
                    orderDate: '2026-09-28',
                    requestedDeliveryDate: '2026-10-25',
                    confirmedDeliveryDate: '2026-10-25',
                    exportStatus: 'Delivered',
                    confirmationStatus: 'Confirmed',
                    confirmationSentDate: '2026-09-29 11:00',
                    backOrderQty: 0,
                    backOrderDate: '-',
                    delayAlert: 'Delivered Successfully',
                    isDelayed: false,
                    productionPlanLinked: 'Batch #26B-FL2',
                    auditTrail: [
                        { date: '2026-09-28 09:00', user: 'Export Manager', event: 'Order Created', note: 'Export contract order' },
                        { date: '2026-09-29 11:00', user: 'System (Auto)', event: 'SO Confirmation Sent', note: 'Customer confirmation dispatched' },
                        { date: '2026-10-12 14:00', user: 'Logistics', event: 'Customs Cleared', note: 'Airway bill AW-77123 dispatched' },
                        { date: '2026-10-24 15:30', user: 'Customer Service', event: 'Delivery Confirmed', note: 'Goods received in Dubai Central Depot' }
                    ]
                }
            ],
            cmoPartners: [
                {
                    id: 'CMO-001',
                    name: 'SyriMed Ltd',
                    contactPerson: 'David Evans',
                    email: 'd.evans@syrimed.co.uk',
                    phone: '+44 20 8953 4567',
                    fesWcsStatus: 'Connected (Live FES/WCS Sync)',
                    leadTimeDays: 45,
                    moq: 10000,
                    avgBatchCost: 18500,
                    activeContracts: 14,
                    qualityRating: '98.4%',
                    status: 'Active'
                },
                {
                    id: 'CMO-002',
                    name: 'NextPharma Göttingen',
                    contactPerson: 'Dr. Klaus Weber',
                    email: 'k.weber@nextpharma.com',
                    phone: '+49 551 382 100',
                    fesWcsStatus: 'Connected (Live FES/WCS Sync)',
                    leadTimeDays: 60,
                    moq: 25000,
                    avgBatchCost: 32000,
                    activeContracts: 8,
                    qualityRating: '99.1%',
                    status: 'Active'
                },
                {
                    id: 'CMO-003',
                    name: 'Haupt Pharma',
                    contactPerson: 'Elena Richter',
                    email: 'e.richter@haupt-pharma.com',
                    phone: '+49 8171 4140',
                    fesWcsStatus: 'Connected (Live FES/WCS Sync)',
                    leadTimeDays: 50,
                    moq: 15000,
                    avgBatchCost: 24000,
                    activeContracts: 6,
                    qualityRating: '97.8%',
                    status: 'Active'
                },
                {
                    id: 'CMO-004',
                    name: 'Recipharm Stockholm',
                    contactPerson: 'Lars Lindqvist',
                    email: 'lars.l@recipharm.com',
                    phone: '+46 8 602 5200',
                    fesWcsStatus: 'Connected (Live FES/WCS Sync)',
                    leadTimeDays: 55,
                    moq: 20000,
                    avgBatchCost: 28500,
                    activeContracts: 5,
                    qualityRating: '98.9%',
                    status: 'Active'
                },
                {
                    id: 'CMO-005',
                    name: 'Fareva Amboise',
                    contactPerson: 'Marc Dupont',
                    email: 'mdupont@fareva.com',
                    phone: '+33 2 47 23 45 00',
                    fesWcsStatus: 'Interface Configured (Manual Sync)',
                    leadTimeDays: 70,
                    moq: 30000,
                    avgBatchCost: 38000,
                    activeContracts: 3,
                    qualityRating: '96.5%',
                    status: 'Active'
                }
            ],
            cmoCostPOs: [
                {
                    id: 'CPO-2026-001',
                    poNo: 'CPO-2026-001',
                    cmoPartner: 'SyriMed Ltd',
                    costCategory: 'Temperature-Controlled Storage',
                    amount: 3450.00,
                    currency: 'GBP',
                    reason: 'Extended cold-chain holding (+28 days) for batch 24B889 pending stability test protocol',
                    isCapturedInCOGs: 'No (Hidden Cost)',
                    dateRaised: '2026-10-18',
                    status: 'Approved',
                    refShopOrder: 'SO-99214',
                    raisedBy: 'SCM Operations'
                },
                {
                    id: 'CPO-2026-002',
                    poNo: 'CPO-2026-002',
                    cmoPartner: 'NextPharma Göttingen',
                    costCategory: 'Sterility & Retest Challenge',
                    amount: 4800.00,
                    currency: 'GBP',
                    reason: 'Non-routine microbiological challenge test required for export batch clearance',
                    isCapturedInCOGs: 'No (Hidden Cost)',
                    dateRaised: '2026-10-12',
                    status: 'Approved',
                    refShopOrder: 'SO-99302',
                    raisedBy: 'QA / Regulatory'
                },
                {
                    id: 'CPO-2026-003',
                    poNo: 'CPO-2026-003',
                    cmoPartner: 'Haupt Pharma',
                    costCategory: 'Carton Over-stickering / Artwork change',
                    amount: 2150.00,
                    currency: 'GBP',
                    reason: 'Mandatory French language leaflet & tamper-evident label addition for export quota',
                    isCapturedInCOGs: 'No (Hidden Cost)',
                    dateRaised: '2026-10-20',
                    status: 'Pending Approval',
                    refShopOrder: 'SO-99411',
                    raisedBy: 'Packaging Supply'
                },
                {
                    id: 'CPO-2026-004',
                    poNo: 'CPO-2026-004',
                    cmoPartner: 'Recipharm Stockholm',
                    costCategory: 'Expedited Air Courier & Dry Ice',
                    amount: 1680.00,
                    currency: 'GBP',
                    reason: 'Urgent temperature-logged reference sample shipment directly to external release laboratory',
                    isCapturedInCOGs: 'No (Hidden Cost)',
                    dateRaised: '2026-10-22',
                    status: 'Approved',
                    refShopOrder: 'SO-99488',
                    raisedBy: 'Logistics Lead'
                }
            ],
            cmoMultiBatchPOs: [
                {
                    id: 'PO-MB-2026-001',
                    poNo: 'PO-MB-2026-001',
                    cmoPartner: 'SyriMed Ltd',
                    contract: 'CON-SYR-2026-A',
                    productName: 'GLUCOSE 5% W/V 500ML - CMO',
                    partNo: '100412-CMO',
                    totalQuantity: 45000,
                    batchesCount: 3,
                    batches: [
                        { batchNum: 'B26-01', qty: 15000, plannedDeliveryDate: '2026-11-10', actualDeliveryDate: '', status: 'In Production' },
                        { batchNum: 'B26-02', qty: 15000, plannedDeliveryDate: '2026-11-24', actualDeliveryDate: '', status: 'Scheduled' },
                        { batchNum: 'B26-03', qty: 15000, plannedDeliveryDate: '2026-12-08', actualDeliveryDate: '', status: 'Scheduled' }
                    ],
                    orderDate: '2026-10-02',
                    poSentDate: '2026-10-02 11:30',
                    poSentStatus: 'Sent Automatically',
                    status: 'Active',
                    delayStatus: 'On Time (Schedule Normal)',
                    productionPlanImpact: 'Integrated with Line 2 Production Schedule'
                },
                {
                    id: 'PO-MB-2026-002',
                    poNo: 'PO-MB-2026-002',
                    cmoPartner: 'NextPharma Göttingen',
                    contract: 'CON-NXP-2026-B',
                    productName: 'SODIUM CHLORIDE 0.9% 100ML - CMO',
                    partNo: '100234-CMO',
                    totalQuantity: 50000,
                    batchesCount: 2,
                    batches: [
                        { batchNum: 'NX-881', qty: 25000, plannedDeliveryDate: '2026-10-28', actualDeliveryDate: '', status: 'Delayed (+7 Days)' },
                        { batchNum: 'NX-882', qty: 25000, plannedDeliveryDate: '2026-11-18', actualDeliveryDate: '', status: 'Rescheduled' }
                    ],
                    orderDate: '2026-09-15',
                    poSentDate: '2026-09-15 09:15',
                    poSentStatus: 'Sent Automatically',
                    status: 'Delayed',
                    delayStatus: 'DELAYED (+7 Days): Supplier Component Shortage',
                    productionPlanImpact: 'CRITICAL: Packaging schedule shifted by +7 days in DPS Plan'
                }
            ],
            productPlans: [],
            rmRecords: []
        };

        Object.keys(initSeeds).forEach(key => {
            const stored = localStorage.getItem(`dps_${key}`);
            if (stored) {
                try {
                    this._data[key] = JSON.parse(stored);
                } catch(e) {
                    this._data[key] = initSeeds[key];
                }
            } else {
                this._data[key] = initSeeds[key];
                localStorage.setItem(`dps_${key}`, JSON.stringify(initSeeds[key]));
            }
        });
        
        this._loaded = true;
    },

    get(key) {
        return this._data[key] || [];
    },

    set(key, data) {
        this._data[key] = data;
        localStorage.setItem(`dps_${key}`, JSON.stringify(data));
    },

    add(key, record) {
        if (!this._data[key]) this._data[key] = [];
        record.id = record.id || generateId();
        record.createdAt = record.createdAt || new Date().toISOString();
        record.updatedAt = new Date().toISOString();
        this._data[key].push(record);
        this.set(key, this._data[key]);
        return record;
    },

    update(key, id, updates) {
        const arr = this._data[key] || [];
        const idx = arr.findIndex(r => r.id == id);
        if (idx === -1) return null;
        Object.assign(arr[idx], updates, { updatedAt: new Date().toISOString() });
        this.set(key, arr);
        return arr[idx];
    },

    remove(key, id) {
        const arr = this._data[key] || [];
        const idx = arr.findIndex(r => r.id == id);
        if (idx === -1) return false;
        arr.splice(idx, 1);
        this.set(key, arr);
        return true;
    },

    find(key, id) {
        return (this._data[key] || []).find(r => r.id == id);
    },

    // Cross-module queries
    getProductsForExport() {
        return (this._data.products || []).filter(p => 
            p.salesCategory && p.salesCategory.toUpperCase() === 'EXPORT'
        );
    },

    getCMOStock() {
        return this._data.cmo || [];
    },

    getNonCMOStock() {
        return this._data.stock || [];
    },

    getMaterialsByType(type) {
        return (this._data.rmpm || []).filter(r => r.type === type);
    },

    getOverdueShopOrders() {
        return (this._data.shopOrders || []).filter(o => o.overdue === 'OVERDUE');
    },

    getUnderstockProducts() {
        return (this._data.products || []).filter(p => 
            p.stockStatus && p.stockStatus.toUpperCase() === 'UNDERSTOCK'
        );
    },

    getExpiryAlerts() {
        const now = new Date();
        const threeMonths = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        return (this._data.expiry || []).filter(e => {
            if (!e.retestDate) return false;
            const d = new Date(e.retestDate);
            return !isNaN(d.getTime()) && d <= threeMonths;
        });
    },

    getProductionForProduct(productName) {
        return (this._data.production || []).filter(p => 
            p.product && p.product.toLowerCase().includes(productName.toLowerCase())
        );
    },

    getRMPMForProduct(license) {
        return (this._data.rmpm || []).filter(r => 
            r.license && r.license.toLowerCase().includes(license.toLowerCase())
        );
    }
};
