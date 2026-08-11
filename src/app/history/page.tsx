'use client';

import React, { useState, useEffect } from 'react';
import { 
  History, 
  Trash2, 
  ShieldCheck, 
  Search, 
  Barcode, 
  Scan, 
  Copy, 
  Check, 
  Clock 
} from 'lucide-react';
import { getHistory, clearHistory, removeHistoryItem, HistoryItem } from '@/lib/history';

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setItems(getHistory());
  }, []);

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all local barcode history?')) {
      clearHistory();
      setItems([]);
    }
  };

  const handleDeleteItem = (id: string) => {
    removeHistoryItem(id);
    setItems(items.filter((i) => i.id !== id));
  };

  const copyPayload = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredItems = items.filter(
    (i) =>
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.rawPayload.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <History className="w-8 h-8 text-blue-400" /> Local Barcode History
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Review your recent barcode generations and scans stored in your browser local storage.
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-4 py-2.5 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 text-xs font-semibold flex items-center gap-2 self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4" /> Clear All History
          </button>
        )}
      </div>

      {/* Privacy Notice Banner */}
      <div className="glass-panel p-4 rounded-2xl border border-gray-800 flex items-center gap-3 text-xs text-gray-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <p>
          <span className="font-semibold text-white">Local Privacy Assurance:</span> All items are stored strictly inside your browser local storage. No data is synchronized to any cloud database or third-party service.
        </p>
      </div>

      {/* Search Bar */}
      {items.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search payload or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900/80 border border-gray-800 rounded-xl pl-11 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}

      {/* History Items List */}
      {filteredItems.length > 0 ? (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="glass-panel p-4 rounded-2xl border border-gray-800 hover:border-gray-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    item.type === 'generate'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  }`}
                >
                  {item.type === 'generate' ? <Barcode className="w-5 h-5" /> : <Scan className="w-5 h-5" />}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white truncate">{item.title}</h4>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono truncate max-w-xl">{item.rawPayload}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                <button
                  onClick={() => copyPayload(item.id, item.rawPayload)}
                  className="p-2 rounded-xl bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800 text-xs flex items-center gap-1.5"
                >
                  {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === item.id ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-2 rounded-xl bg-gray-900 text-gray-400 hover:text-red-400 hover:bg-gray-800 border border-gray-800 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-2xl border border-gray-800 text-center space-y-2">
          <History className="w-10 h-10 text-gray-600 mx-auto" />
          <h4 className="text-sm font-semibold text-gray-300">No Barcode History Found</h4>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Barcodes generated or decoded will automatically appear here for quick reference.
          </p>
        </div>
      )}
    </div>
  );
}
