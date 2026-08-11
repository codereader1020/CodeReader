'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { 
  Layers, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  RefreshCw, 
  Sparkles,
  FileArchive
} from 'lucide-react';
import { generatePdf417 } from '@/lib/pdf417/encoder';
import { sanitizeCsvCell } from '@/lib/security/sanitization';

interface BatchRecord {
  id: string;
  employeeId: string;
  name: string;
  department?: string;
  role?: string;
  rawPayload: string;
  isValid: boolean;
  error?: string;
}

export default function BatchPage() {
  const [records, setRecords] = useState<BatchRecord[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [zipReady, setZipReady] = useState<Blob | null>(null);

  // Handle CSV/JSON file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setFileName(file.name);
    setZipReady(null);

    if (file.name.endsWith('.csv')) {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          parseRawRows(results.data);
        },
      });
    } else if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            parseRawRows(parsed);
          } else {
            alert('JSON file must contain an array of objects.');
          }
        } catch (err) {
          alert('Invalid JSON file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const parseRawRows = (rows: Record<string, string>[]) => {
    const parsedRecords: BatchRecord[] = rows.map((row, idx) => {
      const empId = row.employeeId || row.id || row.EMP_ID || row.EmployeeID || `EMP-${String(idx + 1).padStart(3, '0')}`;
      const name = row.name || row.fullName || row.Name || `Employee ${idx + 1}`;
      const dept = row.department || row.dept || row.Department;
      const role = row.role || row.title || row.JobTitle;

      // Construct canonical record payload
      const payloadObj = {
        type: 'company_employee_id',
        version: 1,
        employeeId: sanitizeCsvCell(empId),
        name: sanitizeCsvCell(name),
        department: dept ? sanitizeCsvCell(dept) : undefined,
        role: role ? sanitizeCsvCell(role) : undefined,
      };

      const rawPayload = JSON.stringify(payloadObj);
      const isValid = Boolean(empId && name);

      return {
        id: `row-${idx}`,
        employeeId: empId,
        name,
        department: dept,
        role,
        rawPayload,
        isValid,
        error: !isValid ? 'Missing employeeId or name.' : undefined,
      };
    });

    setRecords(parsedRecords);
  };

  // Load sample dataset for testing
  const loadSampleDataset = () => {
    const samples = [
      { employeeId: 'EMP-001', name: 'John Doe', department: 'Engineering', role: 'Software Engineer' },
      { employeeId: 'EMP-002', name: 'Jane Smith', department: 'Finance', role: 'Financial Analyst' },
      { employeeId: 'EMP-003', name: 'Michael Brown', department: 'HR', role: 'HR Manager' },
      { employeeId: 'EMP-004', name: 'Emily Davis', department: 'Marketing', role: 'Product Marketing Lead' },
      { employeeId: 'EMP-005', name: 'Robert Wilson', department: 'Operations', role: 'Operations Director' },
    ];
    setFileName('sample_employees.csv');
    parseRawRows(samples);
  };

  // Start Batch Generation
  const processBatch = async () => {
    const validRecords = records.filter((r) => r.isValid);
    if (validRecords.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: validRecords.length });

    const zip = new JSZip();
    const folder = zip.folder('generated_barcodes');
    const manifest: Array<{ employeeId: string; fileName: string; bytes: number }> = [];

    for (let i = 0; i < validRecords.length; i++) {
      const rec = validRecords[i];
      try {
        const barcode = await generatePdf417({
          format: 'pdf417',
          encoding: 'employee',
          data: rec.rawPayload,
        });

        // Convert base64 DataURL to binary blob
        const base64Data = barcode.dataUrl.replace(/^data:image\/png;base64,/, '');
        const filename = `${rec.employeeId.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
        folder?.file(filename, base64Data, { base64: true });

        manifest.push({
          employeeId: rec.employeeId,
          fileName: filename,
          bytes: barcode.dataSizeBytes,
        });
      } catch (err) {
        // Skip failed record
      }

      setProgress({ current: i + 1, total: validRecords.length });

      // Yield UI thread every 5 records to prevent UI freeze
      if (i % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    // Add manifest.json
    folder?.file('manifest.json', JSON.stringify({ generatedAt: new Date().toISOString(), total: manifest.length, records: manifest }, null, 2));

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    setZipReady(zipBlob);
    setIsProcessing(false);
  };

  const downloadZip = () => {
    if (!zipReady) return;
    saveAs(zipReady, `PDF417_Batch_${Date.now()}.zip`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Layers className="w-8 h-8 text-blue-400" /> Batch PDF417 Generator
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Upload CSV or JSON files to generate hundreds of PDF417 barcodes simultaneously. Validates data locally and exports a structured ZIP package.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload & Controls Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-400" /> Upload Data Source
            </h3>

            <div className="p-6 rounded-xl bg-gray-900/60 border border-gray-800 text-center space-y-3 relative">
              <input
                type="file"
                accept=".csv, .json"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-blue-400 mx-auto" />
              <div>
                <p className="text-xs font-semibold text-white">Select CSV or JSON File</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Supports employeeId, name, department, role</p>
              </div>
            </div>

            {fileName && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 font-semibold flex items-center justify-between">
                <span>Loaded: {fileName}</span>
                <span className="text-[10px] text-gray-400">({records.length} records)</span>
              </div>
            )}

            <button
              onClick={loadSampleDataset}
              className="w-full py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 border border-gray-700 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Load Sample Employee Dataset
            </button>
          </div>

          {/* Execution Panel */}
          {records.length > 0 && (
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Valid Records:</span>
                <span className="font-bold text-emerald-400">{records.filter((r) => r.isValid).length} / {records.length}</span>
              </div>

              {isProcessing ? (
                <div className="space-y-3 py-2">
                  <div className="flex items-center justify-between text-xs text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" /> Batch Processing...
                    </span>
                    <span className="font-mono">{progress.current} / {progress.total}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-150"
                      style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ) : zipReady ? (
                <button
                  onClick={downloadZip}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  <FileArchive className="w-4 h-4" /> Download Batch ZIP Package
                </button>
              ) : (
                <button
                  onClick={processBatch}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                >
                  <Layers className="w-4 h-4" /> Generate {records.filter((r) => r.isValid).length} Barcodes
                </button>
              )}
            </div>
          )}
        </div>

        {/* Data Table Preview */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Data Record Validation Preview ({records.length})
              </span>
            </div>

            {records.length > 0 ? (
              <div className="overflow-x-auto border border-gray-800 rounded-xl max-h-[500px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-900 text-gray-400 uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Employee ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 bg-gray-950/40 text-gray-300">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-900/40">
                        <td className="py-3 px-4">
                          {r.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-400 font-semibold">
                              <AlertCircle className="w-3.5 h-3.5" /> Invalid
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-white">{r.employeeId}</td>
                        <td className="py-3 px-4">{r.name}</td>
                        <td className="py-3 px-4 text-gray-400">{r.department || '—'}</td>
                        <td className="py-3 px-4 text-gray-400">{r.role || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-20">
                Upload a CSV/JSON file or click &quot;Load Sample Employee Dataset&quot; to preview records.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
