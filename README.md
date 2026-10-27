# CertiForm Studio

> **Design once. Collect data once. Generate, issue, and verify certificates at any scale.**

CertiForm Studio is a modern, production-grade digital certificate design, public intake form, batch generation, credential issuance, and authenticity verification platform.

---

## Architecture Overview

CertiForm Studio combines:
- **Canva's Visual Designer** with normalized coordinate mapping (`0.0` to `1.0`), dynamic variable bindings, layer control, and stable inline double-click editing.
- **Google Forms' Intake Simplicity** for attendee registration, field validation, and instant/approval-based certificate issuance.
- **Spreadsheet Data Engine** with smart XLSX/CSV column mapping, validation indicators, and bidirectional synchronization across form, roster, and live preview.
- **Deterministic Document Processing** using ReportLab for crisp vector PDFs (with selectable text and vector QR codes) and Pillow for print-ready 300 DPI PNGs.
- **Cryptographic Credential Verification** with unique identifiers (e.g. `CERT-2026-000125`), Segno QR codes, public verification portals, revocation with audit tracking, and controlled reissuance snapshots.
- **Institutional Signature Management** supporting draw, upload, and cursive typography with authorization metadata.

---

## 6 Integrated Workspaces

1. **Dashboard** — Central project overview, real-time metrics (recipients, issued credentials, forms), quick launchpad, and recent activity roster.
2. **Certificate Studio** — Drag-and-drop certificate designer with zoom controls (25%–400%), alignment guides, rulers, safe margins, typography inspector, and stable inline text editing without focus loss or cursor jumps.
3. **Form Studio** — Visual question builder with stable internal IDs and dynamic variable keys (`{{field_name}}`), validation rules, public link sharing, and auto-issuance workflows.
4. **Recipient Manager** — Full spreadsheet roster with inline cell editing, XLSX/CSV smart column mapping, template generation, and bidirectional data sync.
5. **Issuance Center** — Automated preflight inspection (overflow detection, missing bindings, small QR codes), single vector PDF/PNG downloads, and background bulk generation (ZIP of individual PDFs, ZIP of PNGs, consolidated multi-page PDF).
6. **Verification Center** — Public credential verification portal (`/verify/:id`), status badges (Valid, Revoked, Expired), controlled revocation with reason, and reissuance with immutable snapshot tracking.

---

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide SVG icons, Zustand.
- **Backend**: Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy ORM (SQLite / PostgreSQL ready).
- **Document Rendering**: ReportLab (vector PDF), Pillow (high-res raster), Segno (QR codes), OpenPyXL (Excel).
- **Deployment**: Docker, Docker Compose, Nginx.

---

## Quickstart & Local Setup

### 1. Prerequisites
- Python 3.12+
- Node.js 20+ & npm

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Run automated acceptance test suite
pytest tests/test_certiform.py -v

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation and interactive Swagger UI will be available at: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at: `http://localhost:5173`

---

## Docker Compose Setup

Run the entire containerized platform with a single command:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`

---

## Acceptance Test Suite

Run the automated test suite covering all master specifications:
```bash
pytest backend/tests/test_certiform.py -v
```

Verified tests:
- `test_rendering_precision`: Vector PDF & high-res PNG export precision.
- `test_inline_editing_and_synchronization`: Bidirectional data sync across preview and roster.
- `test_batch_export_and_idempotency`: Bulk ZIP and consolidated PDF generation with retry safety.
- `test_signature_management`: Authorized signer roles and distinction from e-sign.
- `test_qr_verification_and_reissuance`: Public verification, revocation, and linked reissuance.
- `test_preflight_overflow_and_margin_check`: Automated overflow and safe margin inspection.
