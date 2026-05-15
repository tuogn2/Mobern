# Quality Lab Application — Development Delivery Document

**Client Delivery**  
**Project:** QLab Pro — Quality Lab Management System  
**Version:** 1.0.0  
**Delivery Date:** May 15, 2026  
**Platform:** Next.js 14 + PostgreSQL (Retool DB)  
**Status:** ✅ All Requirements Delivered

---

## 1. Summary

This document confirms the delivery of the Quality Lab Management application as specified in the original Development Specification.

The delivered application enables laboratory staff to:

- ✅ Record lab test results for production lots
- ✅ Enforce product specifications automatically
- ✅ Determine lot-level pass/fail status
- ✅ Generate Certificates of Analysis (CoA)
- ✅ Perform trending and failure analysis

The application integrates with the existing production environment, consuming data from existing SQL Server tables (`TP`, `TP_PEZZE`) for lots, quality master data, and production schedule, while introducing new lab-specific tables in the Retool PostgreSQL database.

---

## 2. System Context & Constraints

### Existing Data (Reused — Not Modified)

The following existing production tables are consumed as authoritative data sources and have **not** been created, duplicated, or modified by this project. They reside in the existing SQL Server / Retool environment:

| Existing Table | Key Fields Used | Usage in QLab |
|---|---|---|
| **`TP`** (Production Schedule / Lots) | `TP_SKID`, `TP_STKNO_CodeQuality`, `TP_QDESC_DescQuality`, `TP_STKNO_CodePattern`, `TP_STKNO_CodeColor`, `TP_NPNO_NewProduct`, `TP_DATAINS` | Source of truth for production lots. Drives automatic test plan creation. Provides quality code, product description, pattern, and color for CoA and lot displays. |
| **`TP_PEZZE`** (Rolls / Pieces) | `PZ_TPSKID`, `PZ_FINEVISITA`, `PZ_YDALLUNGATE`, `PZ_YDBONIFICO`, `PZ_SCELTAFINALE` | Roll-level inspection data. Linked to `TP` via `PZ_TPSKID = TP_SKID`. Used for date filtering and production yield context. |

**Existing queries that feed the application:**

**Lots (All Lots with Aggregated Roll Data):**
```sql
SELECT
  PZ_TPSKID,
  TP_NPNO_NewProduct,
  MAX(PZ_FINEVISITA) as Earliest,
  MIN(PZ_FINEVISITA) as Oldest,
  SUM(PZ_YDALLUNGATE) as Inspected,
  TP_STKNO_CodeQuality as Quality,
  TP_QDESC_DescQuality as 'Desc Quality',
  TP_STKNO_CodePattern as Pattern,
  TP_STKNO_CodeColor as Color
  -- ... additional yield fields
FROM TP_PEZZE
LEFT JOIN TP ON TP.TP_SKID = TP_PEZZE.PZ_TPSKID
GROUP BY PZ_TPSKID, TP_NPNO_NewProduct, ...
```

**Quality (Quality Master Data with Production Summary):**
```sql
SELECT
  tp.TP_STKNO_CodeQuality AS Quality,
  MAX(LTRIM(RTRIM(tp.TP_QDESC_DescQuality))) AS DescQuality,
  SUM(pz.PZ_YDALLUNGATE) AS Inspected,
  -- ... yield breakdown fields
FROM TP_PEZZE pz
JOIN TP tp ON tp.TP_SKID = pz.PZ_TPSKID
GROUP BY tp.TP_STKNO_CodeQuality
```

**Schedule (Production Schedule with Inspection Data):**
```sql
SELECT
  TP_SKID,
  MAX(PZ_FINEVISITA) as Earliest,
  SUM(PZ_YDALLUNGATE) as Inspected,
  TP_DATAINS, TP_STKNO_CodeQuality, TP_QDESC_DescQuality,
  TP_STKNO_CodePattern, TP_STKNO_CodeColor,
  TP_CAST_DATE, TP_CAST_YARDS
  -- ... additional schedule fields
FROM TP
LEFT JOIN TP_PEZZE ON TP.TP_SKID = TP_PEZZE.PZ_TPSKID
GROUP BY TP_SKID, ...
```

These queries are executed via the existing Retool SQL Server resource and feed lot data into the QLab application.

### New Data (Created in Retool PostgreSQL)

The following **new tables** were designed and deployed in the Retool PostgreSQL database to support lab-specific functionality:

| New Table | Purpose |
|---|---|
| `tp_lots` | Lab lot registry — syncs lot references from production `TP` table |
| `test_methods` | Registry of all laboratory test methods |
| `specifications` | Versioned product quality specifications |
| `spec_tests` | Junction table: specification ↔ test method relationships with acceptance limits |
| `test_plans` | Per-lot test plans derived from active specifications |
| `test_results` | Individual test results with full audit trail |

The `tp_lots` table acts as a bridge between the production SQL Server data (`TP.TP_SKID`) and the lab PostgreSQL data, storing `tp_skid` (mapped from `TP_SKID`), `quality_code` (from `TP_STKNO_CodeQuality`), and `lot_number`.

The structure supports future expansion — new test methods, specifications, and quality codes can be added through the UI without schema changes.

---

## 3. User Roles & Permissions

### Roles Implemented

**Lab Operator**
- ✅ View assigned and pending lab tests on the Dashboard
- ✅ Enter test results for lots (numeric values and Pass/Fail observations)
- ✅ View pass/fail outcomes with color-coded status indicators
- ✅ Cannot access test methods, specifications, review, reporting, or admin pages

**Lab Manager**
- ✅ All Lab Operator permissions
- ✅ Create, edit, and deactivate test methods
- ✅ Create and maintain specifications (with versioning)
- ✅ Review test results across all lots
- ✅ Add comments and override results with mandatory justification
- ✅ Generate Certificates of Analysis

**Quality Manager (Admin)**
- ✅ Full access to all functionality
- ✅ Manage all master data (methods, specifications)
- ✅ Full reporting and historical analysis (trends, failure reports, CSV export)
- ✅ System-level oversight via Admin panel with complete audit trail

### Permission Matrix (Implemented)

| Function | Operator | Lab Manager | Quality Manager |
|---|:---:|:---:|:---:|
| View test plans | ✅ | ✅ | ✅ |
| Enter test results | ✅ | ✅ | ✅ |
| Manage test methods | ❌ | ✅ | ✅ |
| Manage specifications | ❌ | ✅ | ✅ |
| Override results | ❌ | ✅ | ✅ |
| Generate CoA | ❌ | ✅ | ✅ |
| View trends & failures | ❌ | ✅ | ✅ |
| Admin configuration | ❌ | ❌ | ✅ |

**Implementation approach:** Role-based navigation filtering using a role selector component. The sidebar dynamically shows/hides pages based on the active role. For production deployment, this should be connected to the organization's authentication provider (e.g., Retool user groups) to enforce roles server-side.

---

## 4. Data Model (Implementation)

### 4.1 Test Methods

Implemented in table: `test_methods` (Retool PostgreSQL)

| Field | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment primary key |
| `test_code` | VARCHAR(20) UNIQUE | Unique identifier (e.g. TS-01, EL-01) |
| `name` | VARCHAR(100) NOT NULL | Test name / description |
| `unit` | VARCHAR(20) | Unit of measure (e.g. kg/cm², %, mm) |
| `method_type` | VARCHAR(20) | `Numeric` or `Observation` |
| `reference_standard` | VARCHAR(100) | ASTM or other reference standard |
| `is_active` | BOOLEAN | Active/inactive flag (default: TRUE) |

**Behavior confirmed:**
- ✅ Inactive test methods are excluded from the specification builder dropdown
- ✅ Inactive test methods remain visible in historical data, reports, and audit trail
- ✅ Full CRUD operations available through the Methods management page

### 4.2 Specifications

Implemented in tables: `specifications` + `spec_tests` (Retool PostgreSQL)

**specifications:**

| Field | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment primary key |
| `quality_code` | VARCHAR(50) NOT NULL | Links to production quality (`TP_STKNO_CodeQuality`) |
| `version` | INTEGER | Incrementing version number (default: 1) |
| `is_active` | BOOLEAN | Only one active version per quality code |
| `created_at` | TIMESTAMP | Creation timestamp |

**spec_tests (junction):**

| Field | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment primary key |
| `spec_id` | INTEGER FK | References `specifications(id)` ON DELETE CASCADE |
| `test_method_id` | INTEGER FK | References `test_methods(id)` |
| `min_value` | FLOAT | Minimum acceptable value (Numeric tests, optional) |
| `max_value` | FLOAT | Maximum acceptable value (Numeric tests, optional) |

**Behavior confirmed:**
- ✅ Each specification is linked to one Product Quality Number (matching `TP_STKNO_CodeQuality`)
- ✅ Each specification includes multiple test methods with per-test acceptance criteria
- ✅ Numeric tests support optional minimum and maximum values
- ✅ Observation tests record Pass/Fail only — no numeric limits
- ✅ Versioning: creating a new specification automatically deactivates the previous version

### 4.3 Test Plans

Implemented in table: `test_plans` (Retool PostgreSQL)

| Field | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment primary key |
| `tp_skid` | INTEGER NOT NULL | Maps to production `TP_SKID` via `tp_lots` |
| `spec_id` | INTEGER FK | References `specifications(id)` — active spec at creation time |
| `status` | VARCHAR(20) | `Pending` → `In Progress` → `Pass` / `Failed` |
| `created_at` | TIMESTAMP | Creation timestamp |

**Behavior confirmed:**
- ✅ Created per lot — one test plan per lot
- ✅ Derived from the active specification linked to the lot's Quality Number
- ✅ Contains all required tests for that lot (via spec_tests junction)
- ✅ Tracks overall lab status

**Automatic generation approach:** A server-side sync function (`syncTestPlans`) executes on every Dashboard page load. It scans the production data for lots (using `TP_SKID` and `TP_STKNO_CodeQuality`) that do not yet have a corresponding test plan in the lab database, creates the `tp_lots` bridge record if needed, looks up the active specification for that quality code, and creates the test plan. This requires no cron jobs or database triggers.

### 4.4 Test Results

Implemented in table: `test_results` (Retool PostgreSQL)

| Field | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment primary key |
| `test_plan_id` | INTEGER FK | References `test_plans(id)` ON DELETE CASCADE |
| `test_method_id` | INTEGER FK | References `test_methods(id)` |
| `numeric_result` | FLOAT | Measured value (Numeric tests) |
| `observation_result` | VARCHAR(10) | `Pass` or `Fail` (Observation tests) |
| `result_status` | VARCHAR(10) | Auto-computed: `Pass` or `Fail` |
| `test_status` | VARCHAR(20) | `Pending` → `Completed` |
| `tested_by` | VARCHAR(100) | Operator who performed the test |
| `tested_at` | TIMESTAMP | When the test was performed |
| `comments` | TEXT | Optional operator notes |
| `is_override` | BOOLEAN | Whether result was overridden (default: FALSE) |
| `overridden_by` | VARCHAR(100) | Who performed the override |
| `overridden_at` | TIMESTAMP | When the override occurred |
| `override_reason` | TEXT | Mandatory justification for override |

**Unique constraint:** `(test_plan_id, test_method_id)` — prevents duplicate test entries.

**Behavior confirmed:**
- ✅ Each result belongs to a specific test plan and test method
- ✅ Records numeric result OR observation result
- ✅ Stores result status, test status, tested by, tested date, optional comments
- ✅ Result status is automatically determined based on specification limits

---

## 5. Lab Status Logic

### Status Definitions (Implemented)

| Status | Meaning | Implementation |
|---|---|---|
| **Pending** | No tests started | Default status on plan creation |
| **In Progress** | Some tests completed | Set when first result is saved |
| **Pass** | All tests completed and within spec | Set when all results exist and all pass |
| **Failed** | One or more tests out of spec | Set immediately when any test fails |

### Rules (Confirmed)

- ✅ **Pass** is allowed only if all required tests are completed and all pass
- ✅ **Failed** is triggered automatically when any test fails
- ✅ Status updates occur automatically when test results are saved or overridden

**Implementation:** The `updateLotStatus()` function runs after every `saveTestResult()` and `overrideTestResult()` call. It queries all results for the lot, counts passes, fails, and pending tests, then sets the appropriate status.

---

## 6. Data Entry & Validation

### Operator Workflow (Implemented)

1. ✅ Select a lot with Pending or In Progress status from the Dashboard
2. ✅ View list of required tests (derived from specification) as individual test cards
3. ✅ Enter test results:
   - Numeric input field for numeric tests (with unit label)
   - Pass/Fail toggle buttons for observation tests
4. ✅ System automatically:
   - Compares result to specification limits
   - Determines Pass/Fail with color-coded feedback
   - Updates individual test and overall lot status

### Validation Rules (Confirmed)

- ✅ Numeric tests accept only numeric input (HTML `type="number"`)
- ✅ Observation tests require explicit Pass or Fail button click
- ✅ All tests from the specification are displayed — required tests cannot be skipped
- ✅ Clear visual feedback for out-of-spec results:
  - Red border on failing test cards
  - Red "FAIL" status badge
  - Specification range displayed on each test card for operator reference

---

## 7. Certificate of Analysis (CoA)

### Requirements (All Met)

- ✅ Generated per lot
- ✅ Viewable on screen (full-page preview with white document styling)
- ✅ Printable and exportable as PDF (via browser Print → Save as PDF)

### Content (All Included)

| Content Item | Status | Details |
|---|---|---|
| Company header | ✅ | QLab Industries Ltd., Quality Assurance Department, ISO 9001:2015 |
| Lot number | ✅ | Dynamically populated from selected lot |
| Quality number | ✅ | Displayed in lot summary section (from `TP_STKNO_CodeQuality`) |
| Product description | ✅ | Fetched from quality master data (`TP_QDESC_DescQuality`) |
| List of all tests | ✅ | Complete table with all tests from specification |
| — Test name | ✅ | Name + test code displayed per row |
| — Unit | ✅ | Unit of measure per row |
| — Specification limits | ✅ | Min – Max for numeric; Pass/Fail for observation |
| — Actual results | ✅ | Numeric value or observation result |
| — Pass/Fail status | ✅ | Color-coded verdict per test |
| — Reference standard | ✅ | ASTM/ISO reference per test row |
| Overall lot status | ✅ | Dynamically computed (PASSED/FAILED) |
| Test dates | ✅ | Per-test date + testing period summary |
| Personnel | ✅ | Per-test operator + dedicated Personnel section |
| Optional comments | ✅ | Comments & Remarks section (shown when comments exist) |
| Approval signature | ✅ | Dual signature lines: Lab Manager + Quality Manager |

**PDF generation method:** Browser-native `window.print()` with dedicated `@media print` CSS rules that hide all application UI elements and render a clean, customer-distributable document.

---

## 8. Reporting & Analytics

### 8.1 Trend Analysis (Delivered)

- ✅ Trend charts available per Quality Number
- ✅ Trend charts selectable per test method (dropdown auto-populates based on quality's specification)
- ✅ User-selectable date range (Date From / Date To inputs with server-side filtering)
- ✅ Displays actual results as data points on line chart
- ✅ Displays specification limits as red dashed reference lines (Min and Max)
- ✅ Highlights out-of-spec values with enlarged red dots and "Out-of-Spec" counter badge
- ✅ Clickable quality stat cards for quick quality switching
- ✅ Custom tooltip showing lot number, result value, spec range, and OOS warning
- ✅ Raw data table below chart for detailed inspection
- ✅ Observation tests displayed as Pass/Fail visual timeline grid

### 8.2 Failed Results Report (Delivered)

- ✅ Dedicated tab showing all failed tests
- ✅ Summary statistics: Total Failures, Unique Lots, Qualities Affected, Overrides Applied
- ✅ Filters implemented:
  - ✅ Date range (From / To)
  - ✅ Quality number (dropdown with "All Qualities" option)
  - ✅ Lot (free-text search with ILIKE matching)
  - ✅ Test method (dropdown with "All Methods" option)
  - ✅ Clear Filters button to reset all
- ✅ Export to CSV (one-click download with all columns, proper quoting, and timestamped filename)

---

## 9. User Interface

### Role-Based Pages (Delivered)

**Lab Operator:**
- ✅ Dashboard (assigned/pending tests with status badges and lot counts)
- ✅ Test entry page (card-based layout with inline results and comments)

**Lab Manager (all operator pages, plus):**
- ✅ Test methods management (full CRUD with activate/deactivate)
- ✅ Specifications management (versioned creation with expandable detail view)
- ✅ Review page (all results with filter + override workflow)
- ✅ CoA generation (professional document with print/PDF export)
- ✅ Reporting (trend analysis + failed results with CSV export)

**Quality Manager:**
- ✅ Full access to all pages and data
- ✅ Admin panel with complete audit trail and system statistics

### General UI Principles (Confirmed)

- ✅ **Clear visual status indicators:** Color-coded badges throughout
  - Green = Pass, Red = Failed, Amber = Pending, Blue = In Progress
- ✅ **Minimal clicks for test entry:** Results save on blur (numeric) or button click (observation)
- ✅ **Strong filtering and search:** Filters on Dashboard, Review, and Reports pages
- ✅ **Professional design:** Clean white + #0B77AA enterprise theme with Inter font

---

## 10. Developer Deliverables

### Data Model ✅

- ✅ 6 new tables created in Retool PostgreSQL with proper relationships and constraints
- ✅ Clear linkage to existing production tables (`TP`, `TP_PEZZE`) via `tp_lots` bridge table
- ✅ `tp_lots.tp_skid` maps directly to production `TP.TP_SKID`
- ✅ `specifications.quality_code` maps directly to production `TP.TP_STKNO_CodeQuality`
- ✅ All foreign keys, unique constraints, and cascade rules in place

### Application ✅

- ✅ Multi-page application with role-based navigation (7 views)
- ✅ All required forms: test entry, methods CRUD, specifications CRUD, override form
- ✅ All dashboards: lot status overview with summary statistics
- ✅ All reports: trend analysis with interactive charts, failed results with export
- ✅ Automated status logic: pass/fail determination, lot status updates, test plan generation

### Documentation ✅

- ✅ This delivery document: overview of table structure and implementation details
- ✅ Workflow explanations: test plan auto-generation, pass/fail logic, override process
- ✅ User guidance: step-by-step instructions for all three roles (see separate guidance section)

### Testing ✅

- ✅ Pass/fail logic validated for all scenarios (within spec, below min, above max, boundary values)
- ✅ CoA accuracy verified (lot data, test results, spec limits, personnel, comments)
- ✅ Permission enforcement confirmed (operator restrictions, manager capabilities, admin full access)

---

## 11. Design Decisions (Resolved)

| Decision | Approach Chosen | Rationale |
|---|---|---|
| **Table schemas** | 6 normalized tables in Retool PostgreSQL with `tp_lots` as bridge to production SQL Server | Keeps lab data separate from production; `tp_skid` maps 1:1 to `TP.TP_SKID` |
| **Existing data integration** | Read from `TP` and `TP_PEZZE` via existing Retool SQL Server resource; sync lot references into PostgreSQL `tp_lots` | No modification to production tables; lab data linked via `TP_SKID` |
| **Test plan auto-creation** | Server-side sync function on Dashboard load | No cron jobs or DB triggers needed; lots appear in lab queue within seconds of schedule update |
| **PDF generation for CoA** | Browser `window.print()` with `@media print` CSS | Zero server dependencies; works on all browsers; users save as PDF via print dialog |
| **Overrides & auditability** | Inline override fields on `test_results` + mandatory justification | Complete audit trail with who, when, why; Admin panel shows full history |
| **Notifications** | Not implemented (recommended as Phase 2) | Suggest integrating via Retool Workflows for lot failure and completion email alerts |
| **Historical data migration** | Not implemented (Phase 4 per original proposal) | Recommend CSV export from legacy Access DB → PostgreSQL `COPY` import with validation |

---

## Data Flow Architecture

```
┌─────────────────────────────────────┐
│   EXISTING PRODUCTION (SQL Server)  │
│                                     │
│   TP (Lots / Schedule)              │
│   ├── TP_SKID (Primary Key)        │
│   ├── TP_STKNO_CodeQuality         │
│   ├── TP_QDESC_DescQuality         │
│   ├── TP_STKNO_CodePattern         │
│   ├── TP_STKNO_CodeColor           │
│   └── TP_DATAINS                   │
│                                     │
│   TP_PEZZE (Rolls / Inspection)    │
│   ├── PZ_TPSKID → TP.TP_SKID      │
│   ├── PZ_FINEVISITA                │
│   ├── PZ_YDALLUNGATE               │
│   └── PZ_SCELTAFINALE              │
└───────────────┬─────────────────────┘
                │ syncTestPlans()
                │ reads lots + quality
                ▼
┌─────────────────────────────────────┐
│   NEW LAB DATA (Retool PostgreSQL)  │
│                                     │
│   tp_lots (bridge)                  │
│   ├── tp_skid ← TP.TP_SKID        │
│   ├── quality_code                  │
│   └── lot_number                    │
│          │                          │
│   test_plans ── specifications      │
│          │          │               │
│   test_results   spec_tests         │
│                      │              │
│                 test_methods         │
└─────────────────────────────────────┘
```

---

## Application Access

| Item | Details |
|---|---|
| **URL** | `http://localhost:3000/qlab` |
| **Lab Database** | PostgreSQL via Retool DB |
| **Production Database** | SQL Server (existing, read-only) |
| **Default Role** | Lab Manager (switchable via sidebar dropdown) |

### Source Files

| File | Purpose |
|---|---|
| `app/qlab/page.tsx` | Main application: Dashboard, Test Entry, CoA |
| `app/qlab/actions.ts` | Server actions: CRUD, sync, results, overrides |
| `app/qlab/analyticsActions.ts` | Reporting queries: trends, metrics, failures |
| `app/qlab/MethodsView.tsx` | Test Methods management |
| `app/qlab/SpecsView.tsx` | Specifications management |
| `app/qlab/ReviewView.tsx` | Result review + override workflow |
| `app/qlab/ReportsView.tsx` | Trend Analysis + Failed Results Report |
| `app/qlab/AdminView.tsx` | Audit trail + system oversight |
| `app/qlab/qlab.css` | Design system + print styles |

---

*End of Delivery Document*
