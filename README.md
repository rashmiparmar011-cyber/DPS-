# BNS GROUP — Demand Planning System (DPS)

An integrated pharmaceutical Demand Planning System (DPS) built to replace manual spreadsheet planning and Python scripts, eliminating human error, stock-outs, and batch expiry write-offs.

---

## Key Modules & Capabilities

### 1. Product Planning (`app/js/productPlanning.js`)
* **Sales & Capacity Integration**: Calculates requirements based on 6-month sales velocity and production capacity.
* **Min/Max Stock Levels**: Automates Min Stock ($3 \times \text{Average Sales}$) and Max Stock ($6 \times \text{Average Sales}$) hold policies.
* **Batch Scheduling**: Computes net deficit and suggested batches based on site batch sizes.
* **Interactive Features**: Automated requirement planning algorithm modal, full CRUD, filters, search, and CSV export.

### 2. Raw Material (RM) Management (`app/js/rmManagement.js`)
* **Solves Retest/Expiry Limitations**: Overcomes Python script limitations with an integrated **Expiry & Retest Safeguard Monitor**.
* **Retest Windows**: Real-time batch alert tracking (`OVERDUE`, `DUE < 30D`, `DUE < 90D`, `VALID`).
* **Material Allocations**: Real-time reservation and issuance tracking linked to open shop orders.
* **Interactive Features**: Schedule batch retest modal, add material modal, and CSV export.

### 3. Contract Manufacturing Organization (CMO) Management (`app/js/cmoManagement.js`)
* **Automated Demand Planning**: Replenishment calculations using live sales data, lead times (45–70 days), and safety stock.
* **Multi-Batch Purchase Orders**: Ability to stage and track multiple batch delivery milestones under a single PO.
* **Capture Hidden Costs (Non-COGS)**: Tracks manual POs for costs not captured in standard COGS (cold storage, non-standard testing, over-labelling, couriers).
* **FES/WCS Linked Directory**: Directory with active contracts, lead times, MOQ, pricing, and system sync.

### 4. Export DPS (`app/js/exportDps.js`)
* **Sales Order Module**: Customer profiles, delivery schedules, and one-click electronic SO confirmation dispatch.
* **Complete Financial Costing**: Captures **Incoterms** (CIF, FOB, DDP, EXW, CFR, DAP), **Logistics Costs**, and **Pharmadox Release Costs** on every order.
* **Integrated Production Plan**: Direct linkage between international customer orders and production batch compounding/packaging.
* **Back Orders & Delay Auditing**: Committed back-order dispatch dates, delay detection, and audit trail logs.

---

## Project Structure

```
DPS-1/
├── app/
│   ├── index.html              # Main single-page application layout
│   ├── css/
│   │   └── styles.css          # BNS Group UI theme and responsive design
│   ├── js/
│   │   ├── app.js              # Application router & bootstrap
│   │   ├── utils.js            # Formatters, toasts, modals, CSV exporter
│   │   ├── dataStore.js        # Centralized data store with persistence
│   │   ├── components.js       # DataTable, pagination, stats cards, forms
│   │   ├── productPlanning.js  # Module 1: Product Planning
│   │   ├── rmManagement.js     # Module 2: RM Management
│   │   ├── cmoManagement.js    # Module 3: CMO Management
│   │   ├── exportDps.js        # Module 4: Export DPS
│   │   └── existingPages.js    # Dashboard, Shop Orders, Thame, Tracking
│   ├── data/                   # Structured JSON data extracted from spreadsheets
│   └── serve.ps1               # Lightweight local HTTP server
├── Harshada Sheets/            # Source spreadsheets (RM/PM, Open PO, Supply Chain)
├── Kajal sheets/               # Source spreadsheets (DPS_1, Stock, CMO)
├── .gitignore                  # Git ignore rules
└── README.md                   # Project documentation
```

---

## How to Run Locally

Run the included local PowerShell HTTP server:

```powershell
powershell -ExecutionPolicy Bypass -File d:\DPS-1\app\serve.ps1
```

Then open your browser at:
```
http://localhost:8080/index.html
```
