'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { 
  IdCard, 
  Download, 
  Upload, 
  Building2, 
  User, 
  Sparkles, 
  FileText,
  ShieldCheck
} from 'lucide-react';
import { generatePdf417 } from '@/lib/pdf417/encoder';
import { createEmployeeCredential } from '@/lib/credentials/serialization';

export default function IdCardPage() {
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Form Fields
  const [companyName, setCompanyName] = useState('ACME CORPORATION');
  const [employeeName, setEmployeeName] = useState('John Doe');
  const [employeeId, setEmployeeId] = useState('EMP-000123');
  const [department, setDepartment] = useState('Engineering');
  const [role, setRole] = useState('Software Engineer');
  const [expiresAt, setExpiresAt] = useState('2027-08-09');

  // Photo & Logo state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Theme selection
  const [theme, setTheme] = useState<'slate' | 'navy' | 'emerald' | 'purple'>('navy');

  // Barcode data URL
  const [barcodeUrl, setBarcodeUrl] = useState<string>('');

  // Update PDF417 barcode for ID card
  const updateBarcode = useCallback(async () => {
    try {
      const credential = createEmployeeCredential({
        employeeId,
        name: employeeName,
        company: companyName,
        department,
        role,
        expiresAt,
      });

      const barcode = await generatePdf417({
        format: 'pdf417',
        encoding: 'employee',
        data: JSON.stringify(credential),
      });

      setBarcodeUrl(barcode.dataUrl);
    } catch (e) {}
  }, [companyName, employeeName, employeeId, department, role, expiresAt]);

  useEffect(() => {
    updateBarcode();
  }, [updateBarcode]);

  // Handle Photo Upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setAvatarUrl(url);
    }
  };

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setLogoUrl(url);
    }
  };

  // Download ID Card as PNG
  const downloadPng = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = `ID_Card_${employeeId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      alert('Failed to generate PNG image.');
    }
  };

  // Download ID Card as PDF
  const downloadPdf = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 53.98], // Standard CR80 credit card size
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, 85.6, 53.98);
      pdf.save(`ID_Card_${employeeId}.pdf`);
    } catch (e) {
      alert('Failed to generate PDF document.');
    }
  };

  const getThemeClasses = () => {
    switch (theme) {
      case 'navy':
        return 'from-slate-900 via-blue-950 to-slate-900 border-blue-500/30';
      case 'emerald':
        return 'from-slate-900 via-emerald-950 to-slate-900 border-emerald-500/30';
      case 'purple':
        return 'from-slate-900 via-purple-950 to-slate-900 border-purple-500/30';
      default:
        return 'from-slate-900 via-slate-800 to-slate-900 border-gray-700';
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <IdCard className="w-8 h-8 text-blue-400" /> Printable Employee ID Card Studio
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Customize enterprise employee ID badges embedded with high-density PDF417 barcodes. Export high-resolution PNG or print-ready PDF.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: ID Card Form & Design Controls */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" /> Badge Customization Fields
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Employee Name</label>
                <input
                  type="text"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Employee ID</label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Job Title</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Expiration Date</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Photo & Logo Upload Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-800">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Employee Photo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 border border-gray-700 cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Photo
                  </label>
                  {avatarUrl && <span className="text-[10px] text-emerald-400 font-semibold">Loaded</span>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Company Logo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 border border-gray-700 cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Logo
                  </label>
                  {logoUrl && <span className="text-[10px] text-emerald-400 font-semibold">Loaded</span>}
                </div>
              </div>
            </div>

            {/* Theme Selector */}
            <div className="pt-2 border-t border-gray-800">
              <label className="block text-xs font-semibold text-gray-300 mb-2">Badge Color Theme</label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setTheme('navy')}
                  className={`py-2 rounded-xl text-xs font-semibold border ${
                    theme === 'navy' ? 'bg-blue-600/30 border-blue-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400'
                  }`}
                >
                  Navy Blue
                </button>
                <button
                  onClick={() => setTheme('emerald')}
                  className={`py-2 rounded-xl text-xs font-semibold border ${
                    theme === 'emerald' ? 'bg-emerald-600/30 border-emerald-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400'
                  }`}
                >
                  Emerald
                </button>
                <button
                  onClick={() => setTheme('purple')}
                  className={`py-2 rounded-xl text-xs font-semibold border ${
                    theme === 'purple' ? 'bg-purple-600/30 border-purple-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400'
                  }`}
                >
                  Purple
                </button>
                <button
                  onClick={() => setTheme('slate')}
                  className={`py-2 rounded-xl text-xs font-semibold border ${
                    theme === 'slate' ? 'bg-slate-700/30 border-slate-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400'
                  }`}
                >
                  Dark Slate
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: ID Card Graphic & Export Actions */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col items-center justify-center min-h-[420px]">
            <div className="w-full flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Standard CR80 Badge Preview</span>
            </div>

            {/* Rendered ID Card Container (Dimensions ~85.6mm x 53.98mm scaled) */}
            <div
              ref={cardRef}
              className={`w-[420px] h-[260px] rounded-2xl bg-gradient-to-br ${getThemeClasses()} border shadow-2xl p-5 flex flex-col justify-between text-white relative overflow-hidden flex-shrink-0`}
            >
              {/* Background Accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2 z-10">
                <div className="flex items-center gap-2">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Logo" className="w-6 h-6 object-contain" />
                  ) : (
                    <Building2 className="w-5 h-5 text-blue-400" />
                  )}
                  <span className="font-bold text-xs tracking-wider uppercase text-white">{companyName}</span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  OFFICIAL BADGE
                </span>
              </div>

              {/* Card Body */}
              <div className="flex items-center gap-4 py-1 z-10">
                {/* Employee Photo */}
                <div className="w-20 h-24 rounded-xl bg-gray-800/80 border border-white/20 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-md">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Employee Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gray-500" />
                  )}
                </div>

                {/* Employee Info */}
                <div className="space-y-1 text-xs">
                  <h3 className="text-sm font-bold text-white leading-tight">{employeeName}</h3>
                  <p className="text-blue-400 font-semibold text-[11px]">{role}</p>
                  <p className="text-gray-300 text-[10px]">{department}</p>
                  <div className="pt-1 flex items-center gap-3 text-[10px] text-gray-400 font-mono">
                    <span>ID: {employeeId}</span>
                    <span>EXP: {expiresAt}</span>
                  </div>
                </div>
              </div>

              {/* Barcode Footer */}
              <div className="pt-1 border-t border-white/10 flex items-center justify-between z-10 bg-white/95 p-2 rounded-xl">
                {barcodeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={barcodeUrl} alt="PDF417 Barcode" className="h-9 w-full object-contain" />
                ) : (
                  <span className="text-[10px] text-gray-500">Generating PDF417...</span>
                )}
              </div>
            </div>

            {/* Export Buttons */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-[420px] mt-6">
              <button
                onClick={downloadPng}
                className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Badge PNG
              </button>
              <button
                onClick={downloadPdf}
                className="py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-xs border border-gray-700 transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4 text-purple-400" /> Download Printable PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
