# CLAUDE.md — NetSuite Packing List Receipt App

## Project Overview

A **mobile-first web application** that allows warehouse and receiving staff to photograph a physical packing list (vendor delivery slip), extract line item data using AI vision, match it against an open Purchase Order in NetSuite, and submit an **Item Receipt** record — all from a phone at the dock.

This app bridges the physical receiving process with NetSuite ERP, eliminating manual data entry and reducing receiving errors.

---

## Business Context

- **Owner:** Zabe Agha (CEBA Solutions / Loop ERP)
- **Primary Users:** Warehouse staff, receiving clerks, dock supervisors
- **Target Industries:** Scrap/recycling yards, distribution, general warehousing
- **NetSuite Entities:** Multi-subsidiary environment; user must select subsidiary and location at login
- **Integration Pattern:** NetSuite REST API (TBA or OAuth 2.0 token-based authentication)

---

## Core User Flow

```
1. Login → Authenticate against NetSuite (TBA)
2. Select Subsidiary + Location (warehouse/bin location)
3. Select or Search for a Purchase Order
4. Capture packing list photo (camera or upload)
5. AI extracts line items from the image (Claude Vision API)
6. Review & match extracted items against PO lines
7. Adjust quantities if needed
8. Submit Item Receipt to NetSuite
9. Confirmation + optional PDF receipt
```

---

## Technology Stack

### Frontend
- **Framework:** React (with Vite) — mobile-first PWA
- **Styling:** Tailwind CSS
- **State Management:** Zustand (lightweight, mobile-friendly)
- **Routing:** React Router v6
- **Camera:** Native browser `getUserMedia` API / `<input type="file" capture="environment">`
- **PWA:** Vite PWA plugin (offline caching, Add to Home Screen)

### AI / Vision
- **Provider:** Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Use Case:** Image-to-structured-data extraction of packing list line items
- **Output Format:** JSON array of `{ itemDescription, partNumber, quantity, unitOfMeasure }`

### Backend / API Layer
- **Runtime:** Node.js with Express (or Next.js API routes if preferred)
- **Purpose:** Proxy NetSuite REST calls (keep credentials server-side), proxy Claude API calls
- **Hosting:** Railway, Render, or Vercel (serverless functions)

### NetSuite Integration
- **Auth Method:** Token-Based Authentication (TBA) — Consumer Key/Secret + Token Key/Secret
- **API:** NetSuite REST API (`/services/rest/record/v1/`) + SuiteQL for queries
- **Records Used:**
  - `purchaseOrder` (GET — read PO lines)
  - `itemReceipt` (POST — create receipt)
  - `subsidiary` (GET — populate dropdown)
  - `location` (GET — populate dropdown filtered by subsidiary)

---

## Project Structure

```
/
├── client/                        # React frontend (mobile PWA)
│   ├── public/
│   │   └── manifest.json          # PWA manifest
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── store/
│   │   │   └── useAppStore.js     # Zustand global state
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx      # NetSuite TBA login + subsidiary/location selection
│   │   │   ├── POSearchPage.jsx   # Search/select open Purchase Orders
│   │   │   ├── CapturePage.jsx    # Camera capture or file upload
│   │   │   ├── ReviewPage.jsx     # AI extraction review + PO line matching
│   │   │   └── ConfirmPage.jsx    # Submission result + summary
│   │   ├── components/
│   │   │   ├── LineItemRow.jsx    # Individual matched/unmatched line item
│   │   │   ├── MatchBadge.jsx     # Visual match confidence indicator
│   │   │   ├── CameraCapture.jsx  # Camera UI component
│   │   │   └── SubsidiaryPicker.jsx
│   │   ├── api/
│   │   │   ├── netsuite.js        # NetSuite REST API client (calls backend proxy)
│   │   │   └── claude.js          # Claude Vision API client (calls backend proxy)
│   │   └── utils/
│   │       └── matchItems.js      # Fuzzy matching logic for PO lines vs extracted items
│   │
├── server/                        # Express backend / API proxy
│   ├── index.js                   # Entry point
│   ├── routes/
│   │   ├── auth.js                # TBA credential validation endpoint
│   │   ├── netsuite.js            # Proxy: subsidiaries, locations, POs, item receipt POST
│   │   └── vision.js              # Proxy: Claude Vision API call
│   ├── middleware/
│   │   └── nsAuth.js              # Builds OAuth 1.0a TBA header for NetSuite requests
│   └── .env                       # NetSuite + Anthropic credentials (never committed)
│
├── CLAUDE.md                      # This file
├── package.json
└── README.md
```

---

## Authentication & Session

### Login Screen Fields
| Field | Type | Notes |
|---|---|---|
| Account ID | Text | NetSuite account number (e.g., `3550424`) |
| Consumer Key | Text (masked) | From NetSuite Integration record |
| Consumer Secret | Password | From NetSuite Integration record |
| Token Key | Text (masked) | User token |
| Token Secret | Password | User token secret |

> **UX Note:** On first use, credentials are entered manually. After successful validation, they are stored in `sessionStorage` (never `localStorage`) for the session only. On logout or tab close, credentials are cleared.

### Post-Login Selection (Required Before Proceeding)
1. **Subsidiary** — Populated via `GET /services/rest/record/v1/subsidiary?limit=100`
2. **Location** — Filtered by selected subsidiary via SuiteQL:
   ```sql
   SELECT id, name FROM location 
   WHERE subsidiary = {subsidiaryId} 
   AND isinactive = 'F'
   ORDER BY name
   ```

These selections are stored in Zustand and passed to all subsequent NetSuite API calls.

---

## Purchase Order Search & Selection

### Search Logic
- Query open POs via SuiteQL:
  ```sql
  SELECT id, tranid, entity.companyName AS vendor, trandate, status
  FROM transaction
  WHERE type = 'PurchOrd'
    AND status IN ('PurchOrd:B', 'PurchOrd:D', 'PurchOrd:E')
    AND subsidiary = {subsidiaryId}
    AND (tranid LIKE '%{query}%' OR entity.companyName LIKE '%{query}%')
  ORDER BY trandate DESC
  LIMIT 25
  ```
- Status codes: `B` = Pending Receipt, `D` = Partially Received, `E` = Pending Bill/Partially Received

### PO Line Retrieval
Once a PO is selected, fetch full line detail:
```
GET /services/rest/record/v1/purchaseOrder/{id}?expandSubResources=true
```

Extract from response:
- `item.items[]` → each line: `{ line, item.id, item.refName, quantity, quantityreceived, quantityremaining, rate, unit }`

---

## AI Vision — Packing List Extraction

### Prompt Template (sent to Claude API)
```
You are a warehouse receiving assistant. Analyze this packing list / delivery slip image and extract all line items.

Return ONLY a valid JSON array with no additional text, markdown, or explanation.

Each object in the array must have these exact keys:
{
  "lineNumber": number or null,
  "partNumber": "string or null",
  "description": "string",
  "quantity": number,
  "unitOfMeasure": "string or null"
}

Rules:
- quantity must always be a positive number
- If a field cannot be determined, use null
- description is required and must never be null
- Normalize quantities: "1 DOZ" → 12, "1/2" → 0.5
- Include ALL line items, even if partially legible
```

### Response Handling
- Parse JSON response from Claude
- Run fuzzy matching against PO lines (see below)
- Display matched and unmatched items separately for user review

---

## Item Matching Logic (`utils/matchItems.js`)

### Matching Priority (in order)
1. **Exact part number match** — `partNumber` from image matches `item.refName` or custom item field
2. **Fuzzy description match** — Levenshtein distance or token overlap between extracted `description` and PO line `item.refName` (threshold: ≥ 70% similarity)
3. **Manual match** — User selects PO line from dropdown for unmatched items

### Match Confidence Display
| Confidence | Badge Color | Label |
|---|---|---|
| Exact match | Green | ✓ Matched |
| Fuzzy match ≥ 85% | Yellow | ~ Likely Match |
| Fuzzy match 70–84% | Orange | ? Review Needed |
| No match | Red | ✗ Unmatched |

### Quantity Reconciliation
- Show: **PO Qty Remaining** vs **Extracted Qty** vs **Qty to Receive** (editable)
- Warn if Qty to Receive > Qty Remaining on PO line
- Allow over-receipt with user confirmation (some workflows require it)

---

## Item Receipt Submission

### NetSuite API Call
```
POST /services/rest/record/v1/itemReceipt
```

### Payload Structure
```json
{
  "createdFrom": {
    "id": "{purchaseOrderId}",
    "type": "purchaseOrder"
  },
  "subsidiary": { "id": "{subsidiaryId}" },
  "location": { "id": "{locationId}" },
  "trandate": "YYYY-MM-DD",
  "memo": "Received via Packing List App — PO {tranid}",
  "item": {
    "items": [
      {
        "orderLine": {lineNumber},
        "itemreceive": true,
        "quantity": {qtyToReceive},
        "location": { "id": "{locationId}" }
      }
    ]
  }
}
```

> Only include lines where `itemreceive: true` (user confirmed to receive). Lines with 0 qty or unchecked are excluded.

### Attachment
- The original packing list image is attached to the Item Receipt as a File Cabinet document:
  ```
  POST /services/rest/record/v1/file
  POST /services/rest/record/v1/itemReceipt/{id}/files
  ```
- Image is stored under File Cabinet → `Packing Lists / {YYYY-MM} / {IR_Number}.jpg`

---

## Mobile UI/UX Requirements

### Design Aesthetic
- **Theme:** Industrial utility — dark navy base with high-contrast amber/orange accents
- **Font:** `IBM Plex Mono` for data fields (feels warehouse/inventory native), `Inter` for UI chrome
- **Workflow:** Strictly linear, one action per screen — no multi-column layouts
- **Touch targets:** Minimum 48px tap targets throughout
- **Feedback:** Haptic feedback on key actions (capture, submit) via `navigator.vibrate()`
- **Loading states:** Skeleton loaders during API calls; no spinners-only states

### Page-by-Page UX Notes

**Login Page**
- Show/hide toggle on all password fields
- "Remember Account ID" toggle (stores only account ID in localStorage, never credentials)
- Clear error messages for auth failures (distinguish network vs. credential errors)

**PO Search Page**
- Sticky search bar at top
- PO cards show: PO#, Vendor, Date, Status pill, % Received progress bar
- "Recently Viewed" section (last 5 POs, stored in sessionStorage)

**Capture Page**
- Full-screen camera viewfinder with corner guides to frame document
- "Retake" and "Use Photo" buttons after capture
- Upload fallback for devices without camera access
- Show thumbnail of captured image before proceeding

**Review Page**
- Split view: Extracted items (top) matched to PO lines (bottom)
- Each row: checkbox (include/exclude), item name, PO qty remaining, extracted qty, editable receive qty
- "Unmatch" button to reassign a line
- Running total: X of Y lines matched, total units to receive
- Red banner if any lines are unmatched and unresolved

**Confirm Page**
- Show Item Receipt number (hyperlinked to NetSuite if on desktop)
- Summary table of received lines
- Share/export button (generates simple PDF summary)
- "Receive Another" → back to PO Search

---

## Backend Environment Variables (`.env`)

```bash
# NetSuite (these are defaults; user can override at login)
NS_ACCOUNT_ID=3550424
NS_CONSUMER_KEY=
NS_CONSUMER_SECRET=
NS_TOKEN_KEY=
NS_TOKEN_SECRET=

# Anthropic
ANTHROPIC_API_KEY=

# App
PORT=3001
NODE_ENV=development
SESSION_SECRET=
CORS_ORIGIN=http://localhost:5173
```

---

## NetSuite Configuration Requirements

### Integration Record (Setup > Integration)
- **Name:** Packing List Receipt App
- **Auth Type:** Token-Based Authentication (TBA)
- **Scope:** REST Web Services ✓
- **Token-Based Authentication:** Enabled ✓

### Roles / Permissions Required
The user role assigned to the token must have:
| Permission | Level |
|---|---|
| Transactions > Receive Order | Full |
| Lists > Items | View |
| Lists > Locations | View |
| Lists > Subsidiaries | View |
| Documents > Files | Full (for attachment upload) |
| REST Web Services | Full |

---

## Error Handling

| Scenario | Handling |
|---|---|
| NetSuite auth failure | Clear session, return to login with error message |
| No open POs found | Show empty state with "Check filters" guidance |
| Image too dark/blurry | Claude returns low-confidence result; show warning banner with retry option |
| Claude extraction fails | Allow manual line entry fallback |
| PO fully received | Show warning; allow override with supervisor confirmation |
| NetSuite POST failure | Show raw error from NS response; log to console; do not clear form |
| Network offline | PWA service worker serves last cached session; queue submission for retry |

---

## Phase Roadmap

### Phase 1 — MVP (Build First)
- [ ] Login with TBA credentials
- [ ] Subsidiary + Location selection
- [ ] Open PO search and selection
- [ ] Camera capture or file upload
- [ ] Claude vision extraction
- [ ] Manual review and quantity editing
- [ ] Item Receipt POST to NetSuite
- [ ] Image attachment to Item Receipt

### Phase 2 — Enhanced Matching
- [ ] Barcode/QR scan for PO lookup (via camera)
- [ ] Vendor packing list template profiles (improve extraction accuracy per vendor)
- [ ] Confidence score history + learning from corrections

### Phase 3 — Workflow Expansion
- [ ] Push notifications for PO delivery alerts
- [ ] Multi-PO receipt (split shipments)
- [ ] Bin location assignment per line item
- [ ] Integration with Loop ERP custom receiving workflows
- [ ] Offline queue with sync when back online

---

## Development Notes

- Always test NetSuite API calls against the **Sandbox** account before production
- Claude Vision works best with images taken in good lighting, document flat, no glare — add in-app guidance for this
- The TBA OAuth 1.0a signature must be generated server-side; never expose Consumer Secret or Token Secret to the browser
- NetSuite REST API base URL format: `https://{accountId}.suitetalk.api.netsuite.com/services/rest/record/v1/`
- SuiteQL endpoint: `https://{accountId}.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql`
- For multi-subsidiary orgs, always pass `subsidiary` on the Item Receipt — it does not inherit from the PO automatically in all NS configurations

---

## Key Files to Create First

1. `server/middleware/nsAuth.js` — TBA OAuth 1.0a header generator
2. `server/routes/netsuite.js` — All NS proxy routes
3. `client/src/store/useAppStore.js` — Auth + session state
4. `client/src/pages/LoginPage.jsx` — First screen, sets up everything
5. `client/src/api/netsuite.js` — Frontend API client
