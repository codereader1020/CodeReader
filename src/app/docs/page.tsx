'use client';

import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Terminal, 
  ShieldAlert, 
  Cpu, 
  Layers, 
  Key 
} from 'lucide-react';

export default function DocsPage() {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const snippets = {
    generate: `import { generatePdf417 } from '@/lib/pdf417/encoder';

const barcode = await generatePdf417(
  {
    format: 'pdf417',
    encoding: 'employee',
    data: JSON.stringify({
      type: 'company_employee_id',
      version: 1,
      employeeId: 'EMP-000123',
      name: 'John Doe',
      department: 'Engineering'
    })
  },
  {
    ecLevel: 3,
    columns: 0, // Auto
    scale: 3,
    outputFormat: 'png'
  }
);

console.log(barcode.dataUrl); // PNG Data URL
console.log(barcode.svgString); // Vector SVG markup`,

    decode: `import { decodePdf417 } from '@/lib/pdf417/decoder';

// Decode from uploaded Blob, File, Canvas, or HTMLImageElement
const results = await decodePdf417(imageFile);

results.forEach(res => {
  console.log('Decoded format:', res.format);
  console.log('Decoded text:', res.text);
});`,

    sign: `import { createEmployeeCredential } from '@/lib/credentials/serialization';
import { signCredential } from '@/lib/credentials/signing';
import { validateEmployeeCredential } from '@/lib/credentials/validation';

// 1. Create Credential
let credential = createEmployeeCredential({
  employeeId: 'EMP-000123',
  name: 'John Doe',
  department: 'Engineering',
  expiresAt: '2027-08-09'
});

// 2. Sign Credential with Secret Key via Web Crypto API (HMAC-SHA256)
credential = await signCredential(credential, 'my-secret-key');

// 3. Validate & Authenticate Decoded Barcode Payload
const validation = await validateEmployeeCredential(
  JSON.stringify(credential),
  'my-secret-key'
);

console.log('Validation Status:', validation.status); // "AUTHENTICATED"`,

    adapter: `import { setPdf417Encoder, Pdf417Encoder } from '@/lib/pdf417/encoder';

class CustomPdf417Encoder implements Pdf417Encoder {
  async encode(payload, options) {
    // Custom library or WASM binding implementation
    return { ... };
  }
}

// Inject custom adapter globally
setPdf417Encoder(new CustomPdf417Encoder());`
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Code2 className="w-8 h-8 text-blue-400" /> Developer SDK & API Documentation
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Framework-independent TypeScript API for embedding PDF417 barcode generation, decoding, and cryptographic credentials into your applications.
        </p>
      </div>

      {/* Security Principles Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
          <ShieldAlert className="w-5 h-5" /> Core Security Principle: Encoding vs Cryptography
        </div>
        <p className="text-gray-300 text-xs leading-relaxed">
          PDF417 provides data encoding, NOT cryptographic confidentiality or security. Encoding data into a barcode merely transforms characters into a 2D optical pattern. Anyone with a camera can scan raw barcode data. To prevent forgery, credentials should be digitally signed with Web Crypto HMAC or RSA/ECDSA signatures.
        </p>
      </div>

      {/* Code Snippet 1: Generator API */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" /> 1. PDF417 Barcode Generation
          </h3>
          <button
            onClick={() => copyCode('generate', snippets.generate)}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-medium bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800"
          >
            {copiedSnippet === 'generate' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedSnippet === 'generate' ? 'Copied' : 'Copy Code'}
          </button>
        </div>
        <pre className="w-full bg-gray-950 p-4 rounded-xl text-xs font-mono text-gray-200 overflow-x-auto border border-gray-800">
          {snippets.generate}
        </pre>
      </div>

      {/* Code Snippet 2: Decoder API */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" /> 2. PDF417 Barcode Decoding
          </h3>
          <button
            onClick={() => copyCode('decode', snippets.decode)}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-medium bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800"
          >
            {copiedSnippet === 'decode' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedSnippet === 'decode' ? 'Copied' : 'Copy Code'}
          </button>
        </div>
        <pre className="w-full bg-gray-950 p-4 rounded-xl text-xs font-mono text-gray-200 overflow-x-auto border border-gray-800">
          {snippets.decode}
        </pre>
      </div>

      {/* Code Snippet 3: Signed Credentials API */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" /> 3. Cryptographic Credential Signing & Validation
          </h3>
          <button
            onClick={() => copyCode('sign', snippets.sign)}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-medium bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800"
          >
            {copiedSnippet === 'sign' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedSnippet === 'sign' ? 'Copied' : 'Copy Code'}
          </button>
        </div>
        <pre className="w-full bg-gray-950 p-4 rounded-xl text-xs font-mono text-gray-200 overflow-x-auto border border-gray-800">
          {snippets.sign}
        </pre>
      </div>

      {/* Code Snippet 4: Swapping Engine Adapters */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" /> 4. Custom Engine Adapter Injection
          </h3>
          <button
            onClick={() => copyCode('adapter', snippets.adapter)}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-medium bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800"
          >
            {copiedSnippet === 'adapter' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedSnippet === 'adapter' ? 'Copied' : 'Copy Code'}
          </button>
        </div>
        <pre className="w-full bg-gray-950 p-4 rounded-xl text-xs font-mono text-gray-200 overflow-x-auto border border-gray-800">
          {snippets.adapter}
        </pre>
      </div>
    </div>
  );
}
