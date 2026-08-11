'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Barcode, 
  Download, 
  Copy, 
  Check, 
  Settings2, 
  AlertTriangle, 
  Sparkles, 
  FileText, 
  Code, 
  UserCheck, 
  Link2,
  RefreshCw,
  Lock,
  IdCard
} from 'lucide-react';
import { generatePdf417 } from '@/lib/pdf417/encoder';
import { EncodedBarcode, Pdf417Options } from '@/lib/pdf417/types';
import { createEmployeeCredential } from '@/lib/credentials/serialization';
import { signCredential } from '@/lib/credentials/signing';
import { buildAamvaDriverLicensePayload } from '@/lib/credentials/aamva';
import { saveHistoryItem } from '@/lib/history';

export default function GeneratePage() {
  const [activeTab, setActiveTab] = useState<'text' | 'json' | 'employee' | 'aamva' | 'url'>('text');

  // Input states
  const [rawText, setRawText] = useState('EMP-000123|John Doe|Engineering|Software Engineer');
  const [jsonText, setJsonText] = useState(
    JSON.stringify(
      {
        employeeId: 'EMP-000123',
        name: 'John Doe',
        department: 'Engineering',
        role: 'Software Engineer',
      },
      null,
      2
    )
  );

  // Employee form state
  const [employeeFields, setEmployeeFields] = useState({
    employeeId: 'EMP-000123',
    name: 'John Doe',
    company: 'Acme Corp',
    department: 'Engineering',
    role: 'Software Engineer',
    email: 'john.doe@acme.com',
    phone: '+1 555-0199',
    issuedAt: '2026-08-09',
    expiresAt: '2027-08-09',
    employeeNumber: '10042',
    issuer: 'Acme Security',
    signKey: '',
  });

  // AAMVA Driver's License form state
  const [aamvaFields, setAamvaFields] = useState({
    firstName: 'MICHAEL',
    lastName: 'MOTORIST',
    middleName: 'MATTHEW',
    licenseNumber: '123456789',
    state: 'NY',
    dateOfBirth: '1978-08-31',
    expirationDate: '2029-08-31',
    issueDate: '2021-10-31',
    gender: 'Male',
    eyeColor: 'BLU',
    height: '069 in',
    streetAddress: '2345 ANYWHERE STREET',
    city: 'YOUR CITY',
    postalCode: '123450000',
  });

  // URL state
  const [verificationUrl, setVerificationUrl] = useState('https://example.com/verify/EMP-000123');

  // Advanced barcode options
  const [ecLevel, setEcLevel] = useState<number>(3); // 0-8
  const [columns, setColumns] = useState<number>(0); // 0 = auto
  const [compact, setCompact] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(3);
  const [padding, setPadding] = useState<number>(10);
  const [foreground, setForeground] = useState<string>('#000000');
  const [background, setBackground] = useState<string>('#ffffff');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Output states
  const [barcodeResult, setBarcodeResult] = useState<EncodedBarcode | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Compute final payload string based on active tab
  const getPayloadString = useCallback(async (): Promise<string> => {
    if (activeTab === 'text') {
      return rawText;
    }
    if (activeTab === 'json') {
      try {
        const parsed = JSON.parse(jsonText);
        return JSON.stringify(parsed);
      } catch (e) {
        throw new Error('Invalid JSON structure. Please check syntax.');
      }
    }
    if (activeTab === 'employee') {
      let credential = createEmployeeCredential(employeeFields);
      if (employeeFields.signKey.trim()) {
        credential = await signCredential(credential, employeeFields.signKey.trim());
      }
      return JSON.stringify(credential);
    }
    if (activeTab === 'aamva') {
      if (!aamvaFields.lastName || !aamvaFields.firstName || !aamvaFields.licenseNumber) {
        throw new Error('First Name, Last Name, and License Number are required for AAMVA Driver License format.');
      }
      return buildAamvaDriverLicensePayload(aamvaFields);
    }
    if (activeTab === 'url') {
      if (!verificationUrl.trim()) {
        throw new Error('Please enter a valid verification URL.');
      }
      return verificationUrl.trim();
    }
    return '';
  }, [activeTab, rawText, jsonText, employeeFields, aamvaFields, verificationUrl]);

  // Main barcode generation trigger
  const updateBarcode = useCallback(async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const payloadStr = await getPayloadString();
      if (!payloadStr) {
        setBarcodeResult(null);
        setIsGenerating(false);
        return;
      }

      const options: Pdf417Options = {
        ecLevel,
        columns,
        compact,
        scale,
        padding,
        foreground,
        background,
        outputFormat: 'png',
      };

      const result = await generatePdf417(
        {
          format: 'pdf417',
          encoding: activeTab === 'aamva' ? 'text' : activeTab,
          data: payloadStr,
        },
        options
      );

      setBarcodeResult(result);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error?.message || 'Failed to generate PDF417 barcode.');
      setBarcodeResult(null);
    } finally {
      setIsGenerating(false);
    }
  }, [getPayloadString, ecLevel, columns, compact, scale, padding, foreground, background, activeTab]);

  // Debounced live update
  useEffect(() => {
    const timer = setTimeout(() => {
      updateBarcode();
    }, 200);
    return () => clearTimeout(timer);
  }, [updateBarcode]);

  const handleSaveToHistory = () => {
    if (!barcodeResult) return;
    saveHistoryItem({
      type: 'generate',
      format: 'pdf417',
      rawPayload: barcodeResult.rawPayload,
      title: activeTab === 'aamva' ? `AAMVA License (${aamvaFields.firstName} ${aamvaFields.lastName})` : activeTab === 'employee' ? `Credential (${employeeFields.name})` : `PDF417 Barcode (${activeTab})`,
      subtitle: `${barcodeResult.dataSizeBytes} bytes • EC Level ${barcodeResult.ecLevel}`,
    });
  };

  const downloadPng = () => {
    if (!barcodeResult) return;
    handleSaveToHistory();
    const link = document.createElement('a');
    link.download = `PDF417_${Date.now()}.png`;
    link.href = barcodeResult.dataUrl;
    link.click();
  };

  const downloadSvg = () => {
    if (!barcodeResult || !barcodeResult.svgString) return;
    handleSaveToHistory();
    const blob = new Blob([barcodeResult.svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `PDF417_${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    if (!barcodeResult) return;
    try {
      const resp = await fetch(barcodeResult.dataUrl);
      const blob = await resp.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      await navigator.clipboard.writeText(barcodeResult.rawPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Barcode className="w-8 h-8 text-blue-400" /> PDF417 Barcode Generator
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Create high-precision 2D PDF417 barcodes from raw text, JSON, employee credentials, AAMVA US Driver&apos;s Licenses, or verification URLs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Form & Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Tab Selector */}
          <div className="glass-panel p-1.5 rounded-2xl border border-gray-800 flex flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'text'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Raw Text
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'json'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Code className="w-3.5 h-3.5" /> JSON
            </button>
            <button
              onClick={() => setActiveTab('employee')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'employee'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Company ID
            </button>
            <button
              onClick={() => setActiveTab('aamva')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'aamva'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <IdCard className="w-3.5 h-3.5" /> AAMVA DL
            </button>
            <button
              onClick={() => setActiveTab('url')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'url'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" /> URL
            </button>
          </div>

          {/* Form Content per Tab */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
            {activeTab === 'text' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Raw Text Input
                </label>
                <textarea
                  rows={5}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Enter text or pipe-delimited data..."
                  className="w-full bg-gray-900/80 border border-gray-800 rounded-xl p-3.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            )}

            {activeTab === 'json' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    JSON Object Payload
                  </label>
                  <button
                    onClick={() => {
                      try {
                        setJsonText(JSON.stringify(JSON.parse(jsonText), null, 2));
                      } catch (e) {}
                    }}
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Format JSON
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder='{"employeeId": "EMP-001", "name": "John Doe"}'
                  className="w-full bg-gray-900/80 border border-gray-800 rounded-xl p-3.5 text-sm text-emerald-400 placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            )}

            {activeTab === 'employee' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Employee ID <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={employeeFields.employeeId}
                      onChange={(e) => setEmployeeFields({ ...employeeFields, employeeId: e.target.value })}
                      className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={employeeFields.name}
                      onChange={(e) => setEmployeeFields({ ...employeeFields, name: e.target.value })}
                      className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Company</label>
                    <input
                      type="text"
                      value={employeeFields.company}
                      onChange={(e) => setEmployeeFields({ ...employeeFields, company: e.target.value })}
                      className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Department</label>
                    <input
                      type="text"
                      value={employeeFields.department}
                      onChange={(e) => setEmployeeFields({ ...employeeFields, department: e.target.value })}
                      className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Job Title</label>
                    <input
                      type="text"
                      value={employeeFields.role}
                      onChange={(e) => setEmployeeFields({ ...employeeFields, role: e.target.value })}
                      className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Expiration Date</label>
                    <input
                      type="date"
                      value={employeeFields.expiresAt}
                      onChange={(e) => setEmployeeFields({ ...employeeFields, expiresAt: e.target.value })}
                      className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-800/80">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <label className="text-xs font-semibold text-emerald-400">
                      Optional HMAC Secret Signing Key
                    </label>
                  </div>
                  <input
                    type="password"
                    placeholder="Enter secret key to append tamper-proof Web Crypto signature..."
                    value={employeeFields.signKey}
                    onChange={(e) => setEmployeeFields({ ...employeeFields, signKey: e.target.value })}
                    className="w-full bg-gray-900/80 border border-emerald-500/30 rounded-xl px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {activeTab === 'aamva' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                  <span className="text-xs font-bold text-purple-300 uppercase flex items-center gap-1.5">
                    <IdCard className="w-4 h-4 text-purple-400" /> US/Canada AAMVA Driver&apos;s License Payload Generator
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      First Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={aamvaFields.firstName}
                      onChange={(e) => setAamvaFields({ ...aamvaFields, firstName: e.target.value })}
                      className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-purple-500 focus:outline-none font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Last Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={aamvaFields.lastName}
                      onChange={(e) => setAamvaFields({ ...aamvaFields, lastName: e.target.value })}
                      className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-purple-500 focus:outline-none font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      License / Customer # <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={aamvaFields.licenseNumber}
                      onChange={(e) => setAamvaFields({ ...aamvaFields, licenseNumber: e.target.value })}
                      className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-purple-500 focus:outline-none font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">State / Jurisdiction</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={aamvaFields.state}
                      onChange={(e) => setAamvaFields({ ...aamvaFields, state: e.target.value })}
                      className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-purple-500 focus:outline-none font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={aamvaFields.dateOfBirth}
                      onChange={(e) => setAamvaFields({ ...aamvaFields, dateOfBirth: e.target.value })}
                      className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Expiration Date</label>
                    <input
                      type="date"
                      value={aamvaFields.expirationDate}
                      onChange={(e) => setAamvaFields({ ...aamvaFields, expirationDate: e.target.value })}
                      className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={aamvaFields.streetAddress}
                      onChange={(e) => setAamvaFields({ ...aamvaFields, streetAddress: e.target.value })}
                      className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-purple-500 focus:outline-none font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">City</label>
                    <input
                      type="text"
                      value={aamvaFields.city}
                      onChange={(e) => setAamvaFields({ ...aamvaFields, city: e.target.value })}
                      className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-purple-500 focus:outline-none font-mono uppercase"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'url' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Employee Verification URL
                </label>
                <input
                  type="url"
                  value={verificationUrl}
                  onChange={(e) => setVerificationUrl(e.target.value)}
                  placeholder="https://company.com/verify/EMP-000123"
                  className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-4 py-3 text-sm text-blue-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Advanced PDF417 Settings Toggle */}
          <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-6 py-3.5 flex items-center justify-between text-xs font-semibold text-gray-300 hover:bg-gray-800/40 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-blue-400" /> PDF417 Engine Configuration
              </span>
              <span className="text-blue-400 text-xs">{showAdvanced ? 'Hide Options' : 'Configure Parameters'}</span>
            </button>

            {showAdvanced && (
              <div className="p-6 border-t border-gray-800 space-y-5 bg-gray-900/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Error Correction Level (0 - 8)
                    </label>
                    <select
                      value={ecLevel}
                      onChange={(e) => setEcLevel(Number(e.target.value))}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value={0}>Level 0</option>
                      <option value={1}>Level 1</option>
                      <option value={2}>Level 2</option>
                      <option value={3}>Level 3 (Recommended Default)</option>
                      <option value={4}>Level 4</option>
                      <option value={5}>Level 5</option>
                      <option value={6}>Level 6 (High redundancy)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Data Columns (1 - 30)
                    </label>
                    <select
                      value={columns}
                      onChange={(e) => setColumns(Number(e.target.value))}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value={0}>Automatic (Recommended)</option>
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((col) => (
                        <option key={col} value={col}>
                          {col} {col === 1 ? 'Column' : 'Columns'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Quiet Zone Margin: {padding}px
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      value={padding}
                      onChange={(e) => setPadding(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Resolution Scale: {scale}x
                    </label>
                    <input
                      type="range"
                      min={2}
                      max={6}
                      value={scale}
                      onChange={(e) => setScale(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Barcode Live Preview & Download Controls */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col items-center justify-center min-h-[420px] relative">
            <div className="w-full flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Live Vector Preview
              </span>
              {barcodeResult && (
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    barcodeResult.qualityEstimate === 'Excellent'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : barcodeResult.qualityEstimate === 'Good'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  Quality: {barcodeResult.qualityEstimate}
                </span>
              )}
            </div>

            {isGenerating ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                <p className="text-xs text-gray-400">Rendering PDF417 vector matrix...</p>
              </div>
            ) : errorMsg ? (
              <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-2 max-w-md">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
                <h4 className="text-sm font-semibold text-red-300">Encoding Failed</h4>
                <p className="text-xs text-red-400 leading-relaxed">{errorMsg}</p>
              </div>
            ) : barcodeResult ? (
              <div className="space-y-6 w-full flex flex-col items-center">
                <div
                  className="p-4 rounded-xl shadow-2xl transition-all max-w-full overflow-x-auto flex justify-center"
                  style={{ backgroundColor: background }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={barcodeResult.dataUrl}
                    alt="PDF417 Barcode Output"
                    className="max-h-64 object-contain shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 w-full text-center text-xs text-gray-400 bg-gray-900/60 p-3 rounded-xl border border-gray-800">
                  <div>
                    <span className="block text-[10px] text-gray-500 uppercase">Payload Size</span>
                    <span className="font-semibold text-gray-200">{barcodeResult.dataSizeBytes} bytes</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-500 uppercase">EC Level</span>
                    <span className="font-semibold text-gray-200">Level {barcodeResult.ecLevel}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-500 uppercase">Dimensions</span>
                    <span className="font-semibold text-gray-200">
                      {barcodeResult.width} × {barcodeResult.height}
                    </span>
                  </div>
                </div>

                <div className="w-full space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={downloadPng}
                      className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Download PNG
                    </button>
                    <button
                      onClick={downloadSvg}
                      className="py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-xs border border-gray-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4 text-purple-400" /> Download SVG
                    </button>
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="w-full py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 font-medium text-xs border border-gray-800 transition-all flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" /> Copied to Clipboard!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-gray-400" /> Copy Image to Clipboard
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Enter input data to render PDF417 barcode.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
