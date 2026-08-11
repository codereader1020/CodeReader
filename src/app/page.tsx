'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Barcode, 
  Scan, 
  Layers, 
  IdCard, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Lock,
  Cpu,
  FileCheck
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-10 py-4">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-blue-500/20 p-8 md:p-12">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" /> High-Performance PDF417 Engine
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Production PDF417 Generator, <span className="gradient-text">Decoder & Credential Studio</span>
          </h1>
          <p className="text-gray-300 text-base md:text-lg leading-relaxed">
            Generate standards-compliant 2D PDF417 barcodes, decode images & camera feeds, build tamper-evident digital employee IDs, and batch process credentials locally in your browser.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/generate"
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2"
            >
              <Barcode className="w-4 h-4" /> Generate Barcode
            </Link>
            <Link
              href="/read"
              className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-sm border border-gray-700 transition-all flex items-center gap-2"
            >
              <Scan className="w-4 h-4 text-blue-400" /> Decode Image / Camera
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Module 1: Generator */}
        <Link
          href="/generate"
          className="group glass-panel p-6 rounded-2xl border border-gray-800 hover:border-blue-500/40 transition-all hover:-translate-y-1"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
            <Barcode className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
            PDF417 Generator
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Encode raw text, JSON data, employee credentials, or verification URLs into high-res SVG & PNG PDF417 barcodes.
          </p>
        </Link>

        {/* Module 2: Decoder */}
        <Link
          href="/read"
          className="group glass-panel p-6 rounded-2xl border border-gray-800 hover:border-blue-500/40 transition-all hover:-translate-y-1"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
            <Scan className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
            Reader & Camera Scanner
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Decode uploaded images or use your device camera to scan barcodes and inspect formatted JSON & digital signatures.
          </p>
        </Link>

        {/* Module 3: Batch Generator */}
        <Link
          href="/batch"
          className="group glass-panel p-6 rounded-2xl border border-gray-800 hover:border-blue-500/40 transition-all hover:-translate-y-1"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
            Batch Generator
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Upload CSV or JSON files to validate records, process bulk PDF417 codes, and export compressed ZIP packages.
          </p>
        </Link>

        {/* Module 4: ID Card Studio */}
        <Link
          href="/id-card"
          className="group glass-panel p-6 rounded-2xl border border-gray-800 hover:border-blue-500/40 transition-all hover:-translate-y-1"
        >
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
            <IdCard className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
            Printable ID Card Studio
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Design employee ID badges featuring employee avatars, company logos, PDF417 codes, and export as PNG or printable PDF.
          </p>
        </Link>

        {/* Module 5: Cryptographic Credentials */}
        <Link
          href="/docs"
          className="group glass-panel p-6 rounded-2xl border border-gray-800 hover:border-blue-500/40 transition-all hover:-translate-y-1"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
            Signed Credentials
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Learn how to cryptographically sign PDF417 payload credentials using Web Crypto API HMAC-SHA256 & ECDSA.
          </p>
        </Link>

        {/* Module 6: Developer API */}
        <Link
          href="/docs"
          className="group glass-panel p-6 rounded-2xl border border-gray-800 hover:border-blue-500/40 transition-all hover:-translate-y-1"
        >
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
            Developer SDK
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Clean TypeScript facade interfaces to easily embed PDF417 encoding and decoding into your existing web projects.
          </p>
        </Link>
      </div>

      {/* Security & Architecture Statement */}
      <div className="glass-panel p-8 rounded-3xl border border-gray-800 space-y-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Privacy & Security Commitment</h2>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">
          PDF417 Studio performs all encoding, image processing, decoding, and document exports locally within your web browser using HTML5 Canvas, Web Crypto, and Web Assembly. No employee data, photos, or barcode content is ever transmitted to remote servers.
        </p>
        <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-gray-400">
          <span className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-400" /> Open-Source Engine (BWIP-JS + ZXing)
          </span>
          <span className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" /> Zero External API Calls
          </span>
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" /> Fast Client-side Processing
          </span>
        </div>
      </div>
    </div>
  );
}
