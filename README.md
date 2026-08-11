# PDF417 Studio — Enterprise Barcode Generator & Reader

**PDF417 Studio** is a production-grade, privacy-first, fully client-side web application built with TypeScript, Next.js, and React for generating, decoding, validating, batch processing, and designing printable ID credentials with 2D PDF417 barcodes.

---

## 🌟 Key Features

1. **PDF417 Barcode Generator**:
   - Encode raw text, pipe-delimited data, structured JSON, employee ID credentials, or verification URLs.
   - Live vector SVG & raster PNG preview.
   - Configurable error correction levels (0–8), columns (1–30), quiet zone margins, scale resolution, and custom colors.
   - Payload density meter & scan reliability estimator.
   - One-click PNG/SVG download and copy to clipboard.

2. **PDF417 Reader & Scanner**:
   - Decode PDF417 barcodes from uploaded images (PNG, JPG, WEBP, BMP) using drag-and-drop or file picker.
   - Live camera stream barcode scanner with front/rear camera switcher.
   - Formatted JSON tree viewer and raw text inspector.
   - Automatic credential validation and Web Crypto digital signature verification.

3. **Batch Generator**:
   - Upload CSV or JSON files to validate records and generate bulk PDF417 barcodes.
   - Non-blocking asynchronous processing with visual progress indicator (`127 / 500`).
   - One-click ZIP package download containing PNG/SVG barcode images and a structured `manifest.json`.

4. **Printable ID Card Studio**:
   - Design employee ID badges with custom company logos, employee photo avatars, name, ID, department, and embedded PDF417 barcodes.
   - Export badges as high-resolution PNG or print-ready PDF (standard CR80 card dimensions).

5. **Cryptographic Credentials**:
   - Versioned Company Employee ID Credential Schema (V1).
   - Canonical JSON serialization and Web Crypto API HMAC-SHA256 digital signatures.
   - Strict status classification: `AUTHENTICATED`, `VALID`, `EXPIRED`, `UNAUTHENTICATED`, `INVALID`.

6. **100% Client-Side Privacy**:
   - All image processing, barcode matrix encoding, decoding, and PDF generation occur strictly inside your web browser. Zero external cloud API calls or tracking.

---

## 🔬 Open-Source Barcode Engine Selection

- **Encoder (`bwip-js`)**: Selected for its maturity, active maintenance, pure JS implementation, and native support for high-precision PDF417 & Compact PDF417 vector SVG and raster PNG canvas rendering.
- **Decoder (`@zxing/library` + `BarcodeDetector`)**: Leverages browser-native `BarcodeDetector` API when available with ZXing's `PDF417Reader` as a universal cross-browser fallback.
- **Adapter Architecture**: Isolated behind internal `Pdf417Encoder` and `Pdf417Decoder` interface abstractions in `src/lib/pdf417/` so the barcode engine can be swapped seamlessly.

---

## 🔒 Security & Privacy Model

> **IMPORTANT**: PDF417 provides data encoding, NOT cryptographic security.
> Encoding data into a barcode transforms string characters into an optical matrix. Anyone with a camera can scan raw barcode data.
>
> To ensure tamper-evidence, PDF417 Studio supports **Digitally Signed Credentials**:
> 1. Employee data is canonicalized (keys sorted deterministically).
> 2. Web Crypto API computes an `HMAC-SHA256` signature hash using a secret key.
> 3. Signature is embedded into the payload before PDF417 encoding.
> 4. Scanner decodes payload and verifies signature against secret key.

---

## 🚀 Quick Start & Local Running

### Prerequisites
- Node.js `v18.0.0+`
- npm `v9.0.0+`

### Installation
```bash
npm install
```

### Running Local Dev Server
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

### Typechecking & Linting
```bash
npm run typecheck
npm run lint
```

### Running Tests
```bash
npm test
```

### Production Build
```bash
npm run build
npm start
```

---

## 📁 Project Architecture

```text
src/
├── app/
│   ├── layout.tsx         # Root layout with dark dashboard theme
│   ├── page.tsx           # Dashboard landing page
│   ├── generate/page.tsx  # PDF417 Generator Module
│   ├── read/page.tsx      # PDF417 Reader & Camera Scanner
│   ├── batch/page.tsx     # Bulk CSV/JSON Batch Processor
│   ├── id-card/page.tsx   # Printable Employee ID Badge Studio
│   ├── history/page.tsx   # Local History Manager
│   └── docs/page.tsx      # Developer SDK & API Explorer
│
├── components/
│   └── layout/
│       └── AppLayout.tsx  # Responsive Sidebar & Top Header
│
├── lib/
│   ├── pdf417/
│   │   ├── types.ts       # Encoder & Decoder interfaces
│   │   ├── encoder.ts     # High-level generatePdf417 facade
│   │   ├── decoder.ts     # High-level decodePdf417 facade
│   │   └── adapters/
│   │       ├── bwipAdapter.ts  # BWIP-JS PDF417 Encoder
│   │       └── zxingAdapter.ts # ZXing + BarcodeDetector Decoder
│   │
│   ├── credentials/
│   │   ├── schema.ts       # Company Employee Credential V1 Schema
│   │   ├── serialization.ts# Canonical JSON serialization
│   │   ├── signing.ts      # Web Crypto digital signatures
│   │   └── validation.ts   # Credential parsing & validation
│   │
│   ├── security/
│   │   └── sanitization.ts # XSS & CSV injection sanitizers
│   │
│   └── history.ts         # LocalStorage history helper
```
