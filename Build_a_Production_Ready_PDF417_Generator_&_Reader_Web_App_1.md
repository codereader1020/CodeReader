# Build a Production-Ready PDF417 Generator & Reader Web App

## ROLE

You are a senior full-stack TypeScript engineer, security engineer, and barcode/data-encoding specialist.

Build a complete, production-quality web application called **PDF417 Studio**.

The application must allow users to:

1. Generate PDF417 barcodes from arbitrary data.
2. Generate structured PDF417 barcodes from employee/company ID information.
3. Read/decode existing PDF417 barcodes from uploaded images.
4. Read/decode PDF417 barcodes using a device camera where browser capabilities permit.
5. Preview generated barcodes.
6. Download generated barcodes in suitable formats.
7. Validate and inspect decoded data.
8. Support batch PDF417 generation from CSV/JSON.
9. Provide a clean developer-friendly architecture so the PDF417 functionality can later be embedded into another application.

The application should be designed around **free and open-source components** wherever possible. Do not introduce paid APIs or SaaS dependencies unless absolutely necessary.

---

# IMPORTANT ENGINEERING PRINCIPLE

Do NOT implement the PDF417 encoding/decoding algorithm from scratch unless no mature open-source implementation can satisfy the requirement.

Before implementing barcode functionality:

1. Investigate the existing open-source JavaScript/TypeScript/browser-compatible ecosystem.
2. Identify mature PDF417 encoder and decoder libraries.
3. Prefer actively maintained, permissively licensed libraries.
4. Prefer libraries that can operate entirely locally in the browser.
5. Avoid sending barcode data to external services.
6. Avoid paid barcode APIs.
7. If an existing library is imperfect, create a clean adapter around it rather than duplicating its internals.
8. Clearly isolate the barcode engine behind an internal interface so the underlying library can be replaced later.

The goal is to build the **application and intelligence layer around existing barcode technology**, not unnecessarily recreate established barcode algorithms.

---

# TECH STACK

Use:

- TypeScript
- Node.js
- Next.js
- React
- Modern CSS / Tailwind CSS if appropriate
- npm
- ESLint
- Prettier where appropriate

Use the project's existing framework and conventions if this is being added to an existing repository.

If starting from an empty repository, create a clean modern Next.js + TypeScript application.

Use strict TypeScript.

Avoid `any` except where absolutely unavoidable at external library boundaries, and isolate/cast those values safely.

---

# PRIMARY PRODUCT CONCEPT

The application has two major modes:

## MODE 1 — GENERATE

Users provide data and the application generates a PDF417 barcode.

Input options:

### A. Raw text

Example:

```text
Hello World
```

or:

```text
EMP-000123|John Doe|Engineering|Software Engineer
```

### B. JSON

Example:

```json
{
  "employeeId": "EMP-000123",
  "name": "John Doe",
  "department": "Engineering",
  "role": "Software Engineer"
}
```

### C. Structured Employee ID

Provide a form containing:

- Employee ID
- Full name
- Department
- Job title
- Company
- Email
- Phone
- Issue date
- Expiration date
- Optional employee number
- Optional custom fields

The user must be able to choose which fields are encoded.

### D. Verification URL

Allow a payload such as:

```text
https://example.com/verify/EMP-000123
```

This should be recommended as the preferred approach for real-world company IDs when sensitive employee information should not be embedded directly inside the barcode.

---

# MODE 2 — READ / DECODE

Users should be able to decode an existing PDF417 barcode.

Support:

### Image upload

Allow:

- PNG
- JPEG/JPG
- WEBP
- BMP where supported

The user should be able to drag-and-drop an image or use a file picker.

### Camera scanning

Where browser/device capabilities allow it:

- Request camera permission.
- Display camera preview.
- Attempt to detect PDF417.
- Decode detected barcode.
- Show the result.
- Allow stopping/restarting the camera.
- Handle denied camera permissions gracefully.

Do not require a proprietary external scanning API.

If browser-native barcode detection is available and supports PDF417, it may be used as an optimization, but do not make the application dependent on a browser-specific API.

Provide a fallback decoder based on the selected open-source library.

---

# GENERATOR UI

Create a polished dashboard with a simple navigation structure:

```text
PDF417 Studio

Generate
Read
Batch Generate
History
Settings
```

The Generate page should contain:

## Input Type

Tabs or selector:

```text
Raw Text
JSON
Employee ID
Verification URL
```

## Data Input

Provide an appropriate form depending on the selected type.

## Barcode Settings

Expose useful PDF417 configuration options without overwhelming ordinary users.

Possible options:

- Error correction level
- Columns
- Rows / automatic sizing
- Compact PDF417 where supported
- Bar width / module width
- Bar height / row height
- Quiet zone / margin
- Output format
- Foreground/background settings

Provide:

```text
Automatic / Recommended
```

as the default.

Do not expose obscure low-level settings unless the selected encoder actually supports them.

The app should prevent users from selecting impossible or invalid combinations.

---

# LIVE PREVIEW

As the input changes, update the PDF417 preview.

The preview should:

- Be centered.
- Have sufficient quiet zone.
- Maintain correct aspect ratio.
- Remain crisp.
- Not be distorted by CSS stretching.
- Show actual encoded barcode output.
- Provide zoom controls where useful.

Display a warning if the barcode becomes excessively dense or difficult to scan.

Example:

```text
Barcode quality: Good
Estimated data size: 148 bytes
```

If the encoder exposes useful metadata, display it.

---

# DOWNLOAD OPTIONS

Allow the user to export the generated barcode.

At minimum:

```text
Download PNG
Download SVG
```

If the selected encoder cannot produce SVG directly, generate a high-resolution raster image appropriately.

Also support:

```text
Copy image
```

where practical.

Do not create blurry low-resolution barcodes.

Allow the user to specify or select an appropriate output resolution.

---

# PRINTABLE ID CARD MODE

Create an optional "ID Card" mode.

This should NOT be tightly coupled to the barcode engine.

The user should be able to design a simple card containing:

- Company name
- Company logo
- Employee photo
- Employee name
- Employee ID
- Department
- Job title
- PDF417 barcode
- Optional QR code
- Expiration date

Provide a preview representing a standard ID card.

Allow:

```text
Download card as PNG
Download card as PDF
```

Keep this module modular so it can later be replaced by a much more sophisticated ID-card designer.

---

# PDF417 DATA FORMAT SYSTEM

Create a reusable internal data abstraction.

Do not allow the UI to directly depend on the underlying barcode library.

Create something conceptually similar to:

```ts
interface BarcodePayload {
  format: "pdf417";
  encoding: "text" | "json" | "employee" | "url";
  data: string | Record<string, unknown>;
}
```

Create a barcode service abstraction conceptually similar to:

```ts
interface Pdf417Encoder {
  encode(input: BarcodePayload, options?: Pdf417Options): Promise<EncodedBarcode>;
}

interface Pdf417Decoder {
  decode(input: DecodeInput): Promise<DecodedBarcode[]>;
}
```

The exact interfaces are up to you, but maintain this architectural separation.

The rest of the application must not care which PDF417 library is being used.

---

# COMPANY ID PAYLOAD FORMAT

Implement a versioned company credential format.

Do NOT simply encode arbitrary employee information in a proprietary undocumented format.

Create a clear internal structure such as:

```json
{
  "type": "company_employee_id",
  "version": 1,
  "employeeId": "EMP-000123",
  "name": "John Doe",
  "company": "Example Company",
  "department": "Engineering",
  "role": "Software Engineer",
  "issuedAt": "2026-08-09",
  "expiresAt": "2027-08-09"
}
```

However, do not require all of these fields.

Allow optional fields.

Make the format:

- Versioned
- Documented
- Extensible
- Deterministic
- Easy to parse
- Easy to validate

---

# SECURITY MODEL

This is extremely important.

Make it clear throughout the application that:

**PDF417 encoding is not encryption.**

Do not describe an ordinary PDF417 barcode as secure merely because it is difficult to read manually.

If company IDs are being created, support an optional **signed credential** architecture.

For example:

```text
Employee data
     ↓
Canonical serialization
     ↓
Digital signature
     ↓
Signed credential
     ↓
PDF417 encoding
```

And during validation:

```text
PDF417
   ↓
Decode
   ↓
Parse credential
   ↓
Verify signature
   ↓
Check expiration
   ↓
Check issuer
   ↓
VALID / INVALID
```

Use a modern cryptographic signing mechanism supported by the platform and appropriate for the application.

Do NOT invent cryptography.

Do NOT use reversible encoding such as Base64 as a substitute for security.

Do NOT store private signing keys in client-side code.

If signing is implemented server-side, keep the private key strictly server-side and load it through environment variables/secrets.

If the project is initially only a barcode utility, implement the architecture so signing can be added later without rewriting the barcode layer.

---

# PRIVACY

The application should operate locally whenever possible.

For normal barcode generation:

```text
User input
   ↓
Browser
   ↓
PDF417 encoder
   ↓
Barcode
```

No external request should be required.

For decoding:

```text
Uploaded image
   ↓
Browser
   ↓
PDF417 decoder
   ↓
Decoded content
```

Do not upload employee information or barcode images to a third-party API.

If server processing is ever necessary, clearly isolate it and document why.

Do not log sensitive barcode payloads.

Do not send barcode contents to analytics services.

---

# DECODER RESULT VIEW

When a barcode is decoded, display:

```text
Format:
PDF417

Decoded data:

EMP-000123
John Doe
Engineering
Software Engineer
```

If the decoded data is valid JSON, also offer:

```text
Raw
Formatted JSON
```

If it matches the company's credential schema, show:

```text
Credential Type:
Company Employee ID

Version:
1

Employee ID:
EMP-000123

Name:
John Doe

Department:
Engineering

Status:
Valid
```

Do not assume that arbitrary decoded content is trustworthy.

Treat all decoded data as untrusted input.

---

# VALIDATION

Implement validation for structured credentials.

Check:

- Required fields
- Data types
- Version
- Employee ID format
- Dates
- Expiration
- Issuer
- Signature if present

Display errors clearly.

Example:

```text
INVALID CREDENTIAL

Reason:
Credential has expired.

Expired:
2027-03-12
```

or:

```text
UNVERIFIED DATA

The PDF417 barcode was decoded successfully, but the
contents could not be cryptographically verified.
```

Distinguish between:

```text
Decoded successfully
```

and:

```text
Authenticated successfully
```

These are NOT the same thing.

---

# BATCH GENERATION

Create a Batch Generate page.

Support CSV and JSON.

Example CSV:

```csv
employeeId,name,department,role
EMP-001,John Doe,Engineering,Software Engineer
EMP-002,Jane Doe,Finance,Accountant
EMP-003,Michael Smith,HR,HR Manager
```

The application should:

1. Upload file.
2. Parse it locally.
3. Preview records.
4. Validate each record.
5. Show errors before generation.
6. Generate a PDF417 for every valid record.
7. Allow downloading the generated results.

Use a sensible ZIP structure:

```text
generated/
├── EMP-001.png
├── EMP-002.png
├── EMP-003.png
└── manifest.json
```

If appropriate, also provide:

```text
SVG
```

and optionally printable ID-card output.

Avoid making hundreds of unnecessary network requests.

For large batches, process efficiently and provide progress:

```text
Generating...

127 / 500
```

---

# HISTORY

Implement a lightweight local history system if appropriate.

Use browser local storage or IndexedDB rather than a database for the initial version.

Store only what is necessary.

Do NOT store sensitive employee information indefinitely by default.

Allow:

```text
Clear history
```

and make it obvious when information is stored locally.

---

# ERROR HANDLING

Handle all common failures gracefully.

Examples:

### Invalid input

```text
Unable to generate barcode.

The supplied data is invalid.
```

### Barcode too dense

```text
This payload is too large or dense for the current settings.

Try:
- Automatic sizing
- Increasing barcode dimensions
- Reducing unnecessary data
```

### Invalid image

```text
We couldn't find a readable PDF417 barcode in this image.
```

### Multiple barcodes

If multiple PDF417 codes are detected, show all results separately.

### Camera failure

Handle:

- Permission denied
- No camera available
- Camera already in use
- Unsupported browser
- Decoder failure

Never crash the application.

---

# ACCESSIBILITY

Build the application to be usable with:

- Keyboard navigation
- Screen readers
- Appropriate labels
- Focus states
- Accessible buttons
- Accessible dialogs
- Sufficient contrast
- Clear error messaging

Do not rely on color alone to communicate status.

---

# RESPONSIVE DESIGN

The application must work on:

- Desktop
- Laptop
- Tablet
- Mobile

The camera scanner should have a particularly good mobile experience.

On mobile:

```text
Generate
Read
Scan with Camera
```

should be easily accessible.

---

# PERFORMANCE

Optimize for large barcode images and batch generation.

Avoid unnecessary React re-renders.

Do not encode the barcode repeatedly if the input has not changed.

Debounce expensive preview operations where appropriate.

Use Web Workers if barcode processing becomes expensive and the chosen library permits it.

For batch generation, process records asynchronously without freezing the UI.

Never block the browser unnecessarily.

---

# SECURITY HARDENING

Treat uploaded images, JSON, CSV, and decoded barcode content as untrusted input.

Protect against:

- XSS
- HTML injection
- CSV formula injection
- malicious JSON
- oversized files
- memory exhaustion
- pathological barcode input
- unsafe URLs
- prototype pollution
- arbitrary code execution

Set reasonable upload limits.

Do not render decoded HTML directly.

For URLs, display them as text unless explicitly opened by the user.

If links are made clickable, sanitize and validate them.

---

# PROJECT STRUCTURE

Use a clean modular architecture.

A reasonable structure would be:

```text
src/
├── app/
│   ├── page.tsx
│   ├── generate/
│   ├── read/
│   ├── batch/
│   ├── history/
│   └── settings/
│
├── components/
│   ├── pdf417/
│   │   ├── Pdf417Generator.tsx
│   │   ├── Pdf417Reader.tsx
│   │   ├── BarcodePreview.tsx
│   │   ├── CameraScanner.tsx
│   │   └── BarcodeResult.tsx
│   │
│   ├── employee/
│   ├── id-card/
│   └── ui/
│
├── lib/
│   ├── pdf417/
│   │   ├── encoder.ts
│   │   ├── decoder.ts
│   │   ├── types.ts
│   │   └── adapters/
│   │
│   ├── credentials/
│   │   ├── schema.ts
│   │   ├── validation.ts
│   │   ├── serialization.ts
│   │   └── signing.ts
│   │
│   ├── import/
│   ├── export/
│   └── security/
│
├── workers/
│   └── barcode.worker.ts
│
└── tests/
```

Adapt the structure to the actual framework and repository.

Do not create meaningless files simply to satisfy this example.

---

# TESTING

Create comprehensive tests.

At minimum test:

## Encoder

- Simple text
- Unicode text
- Long text
- JSON
- Employee credential
- Empty input
- Extremely large input
- Invalid configuration

## Decoder

- Valid PDF417
- Invalid image
- Corrupted barcode
- Multiple barcodes
- Different image resolutions
- Rotated images where supported
- Low-quality images where practical

## Round-trip

This is critical.

Test:

```text
input
 ↓
encode
 ↓
PDF417 image
 ↓
decode
 ↓
output
```

The decoded content must equal the original canonical content.

Test this with many payload sizes.

## Credential validation

Test:

- Valid credential
- Expired credential
- Missing field
- Invalid version
- Tampered data
- Invalid signature
- Wrong issuer
- Malformed payload

---

# DEVELOPER API

Make the core functionality reusable.

The barcode engine should eventually be usable from another application.

Expose clean functions conceptually like:

```ts
generatePdf417({
  data: "...",
  options: {}
});
```

and:

```ts
decodePdf417(image);
```

and:

```ts
createEmployeeCredential({...});
```

and:

```ts
validateEmployeeCredential(...);
```

Do not force another application to import React components just to generate a barcode.

The core engine should remain framework-independent as much as practical.

---

# DOCUMENTATION

Create a detailed README.

Document:

1. What PDF417 is.
2. What the application does.
3. Installation.
4. Development.
5. Production build.
6. Supported formats.
7. How PDF417 generation works.
8. How PDF417 decoding works.
9. How the credential format works.
10. Security limitations.
11. Privacy model.
12. How to integrate the engine into another TypeScript application.
13. How to replace the underlying PDF417 library.
14. How to add additional barcode formats later.

Also document clearly:

> PDF417 provides data encoding, not cryptographic security.

---

# FUTURE-PROOFING

Design the architecture so that other barcode formats can eventually be added.

For example:

```ts
type BarcodeFormat =
  | "pdf417"
  | "qr"
  | "data-matrix";
```

Do not implement QR or Data Matrix unless needed for the current release.

However, the architecture should make future support straightforward.

Similarly, make it possible to add:

- Company verification server
- Employee database integration
- Revocation lists
- Digital signatures
- ID-card templates
- NFC credentials
- Mobile verification
- Audit logs

without rewriting the PDF417 engine.

---

# UI DESIGN

The interface should feel like a professional developer utility rather than a toy.

Use a clean dashboard.

Primary actions should be immediately obvious:

```text
Generate PDF417
Read PDF417
Batch Generate
```

The Generate page should visually prioritize:

```text
DATA
↓
BARCODE PREVIEW
↓
DOWNLOAD
```

The Reader page should prioritize:

```text
UPLOAD / CAMERA
↓
SCAN
↓
RESULT
↓
VALIDATION
```

Do not clutter the interface with unnecessary settings.

Use advanced settings in a collapsible panel.

---

# NO ARTIFICIAL DEPENDENCIES

Do not add:

- Paid barcode APIs
- Unnecessary SaaS services
- Proprietary cloud scanners
- Analytics platforms
- Authentication systems unless required
- Databases for functionality that can operate locally

The basic application must function without an external backend wherever technically possible.

---

# IMPLEMENTATION PROCESS

Do not merely generate a mock UI.

Actually implement the complete functionality.

Follow this process:

### Step 1

Inspect the existing repository.

Determine:

- Framework
- TypeScript configuration
- Existing UI system
- Existing dependencies
- Existing architecture
- Existing scripts
- Existing testing infrastructure

Do not unnecessarily replace the project's current stack.

### Step 2

Research/select the best suitable open-source PDF417 encoder and decoder libraries available for the actual runtime.

Check:

- License
- Browser support
- TypeScript compatibility
- Encoding support
- Decoding support
- Maintenance status
- Bundle size
- Performance
- Image input support

Document why the selected library was chosen.

### Step 3

Implement the core barcode abstraction.

### Step 4

Implement generation.

### Step 5

Implement decoding.

### Step 6

Implement structured employee credentials.

### Step 7

Implement validation.

### Step 8

Implement batch processing.

### Step 9

Implement camera scanning.

### Step 10

Implement ID-card preview/export.

### Step 11

Implement testing.

### Step 12

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Use the project's actual scripts if different.

Fix all errors.

Do not declare completion while TypeScript/build errors remain.

---

# QUALITY REQUIREMENTS

The finished application must NOT be:

- A fake barcode generator
- A static mockup
- A UI-only prototype
- Dependent on an external paid API
- Full of placeholder functions
- Full of TODO comments instead of implementations

The generated PDF417 must be a real, standards-compliant PDF417 barcode that can be decoded by an independent compatible scanner.

Likewise, the reader must actually decode real PDF417 images rather than merely pretending to recognize them.

---

# ACCEPTANCE TEST

Before declaring the task complete, perform this end-to-end test:

1. Enter:

```text
EMP-000123|John Doe|Engineering|Software Engineer
```

2. Generate a PDF417.
3. Display it in the UI.
4. Download it.
5. Re-upload the downloaded image into the Reader.
6. Decode it.
7. Confirm the original payload is returned.
8. Test the same process with structured JSON.
9. Test the employee credential format.
10. Test batch generation with at least several records.
11. Test camera scanning if the environment supports it.
12. Run typecheck.
13. Run lint.
14. Run tests.
15. Run production build.

Also verify that the generated barcode can be read by at least one independent PDF417-compatible decoder where practical.

---

# FINAL DELIVERABLE

When finished, provide:

1. Complete working application.
2. All source code.
3. Package/dependency configuration.
4. Tests.
5. README.
6. Example employee credential data.
7. Example CSV for batch generation.
8. Clear instructions for running locally.
9. Clear instructions for production build.
10. Explanation of which open-source PDF417 libraries were selected and why.
11. Explanation of the architecture.
12. Explanation of security/privacy considerations.

Most importantly:

**Build the actual working application, not merely the architecture or UI.**