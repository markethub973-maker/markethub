"use client";
import { useState } from "react";
import { exportCSV, exportExcel } from "@/lib/utils";

interface Sheet {
  name: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

interface ExportButtonsProps {
  filename: string;
  sheets: Sheet[];
  /** If true, renders a compact icon-only version */
  compact?: boolean;
  className?: string;
}

export default function ExportButtons({ filename, sheets, compact = false, className = "" }: ExportButtonsProps) {
  const [loadingExcel, setLoadingExcel] = useState(false);

  const handleExcelExport = async () => {
    setLoadingExcel(true);
    try {
      await exportExcel(filename, sheets);
    } finally {
      setLoadingExcel(false);
    }
  };

  const handleCsvExport = () => {
    // Export first sheet as CSV
    const sheet = sheets[0];
    if (sheet) exportCSV(filename, sheet.headers, sheet.rows);
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <button
          onClick={handleCsvExport}
          title="Export CSV"
          className="p-1.5 rounded hover:bg-[#F5D7A0]/30 transition-colors"
          style={{ color: "var(--color-text)", boxShadow: "0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.1)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        <button
          onClick={handleExcelExport}
          disabled={loadingExcel}
          title="Export Excel"
          className="p-1.5 rounded text-[#16a34a] hover:bg-green-50 transition-colors disabled:opacity-50"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.1)" }}
        >
          {loadingExcel ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
            </svg>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleCsvExport}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-[#E8D9C5] bg-white hover:bg-[#FFF8F0] transition-colors"
        style={{ color: "var(--color-text)", boxShadow: "0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.1)" }}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        CSV
      </button>
      <button
        onClick={handleExcelExport}
        disabled={loadingExcel}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-[#16a34a] text-white hover:bg-[#15803d] transition-colors disabled:opacity-60"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.1)" }}
      >
        {loadingExcel ? (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        Excel
      </button>
    </div>
  );
}
