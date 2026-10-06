/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { CostEstimateRecord } from '../../../types/costEstimation';
import { exportEstimateToExcelWorkbook } from '../../../utils/costEngine';
import { exportElementToPdf } from '../../../utils/pdfExport';
import { PrintDocumentLayout } from './PrintDocumentLayout';
import { 
  X, 
  Printer, 
  Download, 
  Eye, 
  FileText, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Settings2, 
  Check, 
  Loader2, 
  AlertCircle,
  Sliders,
  CheckCircle2
} from 'lucide-react';

export interface PrintAndPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimate: CostEstimateRecord | null;
  initialMode?: 'preview' | 'print' | 'pdf';
}

export const PrintAndPdfExportModal: React.FC<PrintAndPdfExportModalProps> = ({
  isOpen,
  onClose,
  estimate,
  initialMode = 'preview'
}) => {
  // Settings State
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [paperSize, setPaperSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [marginSize, setMarginSize] = useState<'normal' | 'narrow' | 'wide'>('normal');
  const [showWatermark, setShowWatermark] = useState(true);
  const [showAuditSteps, setShowAuditSteps] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [sldScheme, setSldScheme] = useState<string>('All Combined');

  // Zoom & View State
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isMaximized, setIsMaximized] = useState(true);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // PDF Export Dialog State
  const [showPdfPrompt, setShowPdfPrompt] = useState(false);
  const [pdfFilename, setPdfFilename] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const printContentRef = useRef<HTMLDivElement>(null);

  // Initialize meaningful filename when estimate changes
  useEffect(() => {
    if (estimate) {
      const cleanNo = estimate.projectInfo.estimateNo.replace(/[^a-zA-Z0-9_-]/g, '_');
      const today = new Date().toISOString().slice(0, 10);
      setPdfFilename(`Estimate_${cleanNo}_${today}`);
    }
  }, [estimate]);

  // If opened directly in 'print' or 'pdf' mode, trigger action after modal mounts
  useEffect(() => {
    if (!isOpen || !estimate) return;

    if (initialMode === 'print') {
      const timer = setTimeout(() => {
        handleTriggerPrint();
      }, 350);
      return () => clearTimeout(timer);
    } else if (initialMode === 'pdf') {
      setShowPdfPrompt(true);
    }
  }, [isOpen, initialMode, estimate]);

  if (!isOpen || !estimate) return null;

  // Margin values in mm for CSS @page
  const marginMm = marginSize === 'narrow' ? 8 : marginSize === 'wide' ? 25 : 12;

  // Handler: Native Print with system print dialog
  const handleTriggerPrint = () => {
    try {
      window.print();
    } catch (err: any) {
      setFeedbackToast({
        message: 'Could not open system print dialog. Please ensure a printer or PDF printer is installed.',
        type: 'error'
      });
      setTimeout(() => setFeedbackToast(null), 5000);
    }
  };

  // Handler: Direct Save as PDF
  const handleSaveAsPdf = async () => {
    if (!printContentRef.current) return;

    setIsGeneratingPdf(true);
    setShowPdfPrompt(false);
    setFeedbackToast({ message: 'Rendering multi-page official PDF...', type: 'info' });

    try {
      const result = await exportElementToPdf(printContentRef.current, {
        filename: pdfFilename,
        paperSize,
        orientation,
        marginMm,
        reportTitle: `Estimate ${estimate.projectInfo.estimateNo}`,
        docReference: estimate.projectInfo.estimateNo,
        pageBreakMode: 'page_per_section'
      });

      if (result.success) {
        setFeedbackToast({
          message: `✅ PDF successfully generated & downloaded: ${result.filename} (${result.pageCount} pages)`,
          type: 'success'
        });
      } else {
        setFeedbackToast({
          message: `PDF generation failed: ${result.error || 'Unknown error'}`,
          type: 'error'
        });
      }
    } catch (error: any) {
      setFeedbackToast({
        message: `Error generating PDF: ${error.message || 'Please retry'}`,
        type: 'error'
      });
    } finally {
      setIsGeneratingPdf(false);
      setTimeout(() => setFeedbackToast(null), 5000);
    }
  };

  // Zoom helpers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 15, 175));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 15, 50));
  const handleResetZoom = () => setZoomLevel(100);

  return (
    <div className={`fixed inset-0 z-50 ${isMaximized ? 'bg-slate-950 p-0 overflow-hidden flex flex-col' : 'bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto'} print:p-0 print:bg-white print:static print:overflow-visible`}>
      
      {/* Dynamic @page CSS injected specifically for the user's selected orientation, size, and margins */}
      <style>{`
        @media print {
          @page {
            size: ${paperSize} ${orientation};
            margin: ${marginMm}mm;
          }
          *, *::before, *::after {
            overflow: visible !important;
            scrollbar-width: none !important;
          }
          html, body {
            background: white !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, [data-no-print="true"] {
            display: none !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-page-break {
            break-before: page !important;
            page-break-before: always !important;
          }
        }
      `}</style>

      {/* Main Container */}
      <div className={`bg-white w-full ${isMaximized ? 'h-full max-w-none rounded-none' : 'max-w-6xl rounded-2xl max-h-[94vh]'} flex flex-col overflow-hidden shadow-2xl print:shadow-none print:border-none print:max-h-none print:h-auto`}>
        
        {/* ========================================================
            TOP ACTION & CONTROL BAR (Hidden on print)
           ======================================================== */}
        <div className="p-3 sm:px-6 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 no-print border-b border-slate-800 shrink-0">
          
          {/* Left: Branding & Status */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm block leading-tight">
                  Official Print & PDF Export Center
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-amber-300 font-mono">
                  {paperSize.toUpperCase()} · {orientation.toUpperCase()}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {estimate.projectInfo.estimateNo} ({estimate.projectInfo.revisionNo}) · {estimate.projectInfo.schemeProjectName || 'Line Extension'}
              </span>
            </div>
          </div>

          {/* Center: Zoom & View Controls */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 p-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span 
              onClick={handleResetZoom}
              className="px-2 font-mono text-[11px] font-bold text-slate-200 cursor-pointer hover:text-amber-400 select-none"
              title="Click to reset 100%"
            >
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1" />
            <button
              type="button"
              onClick={() => setOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait')}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-200 hover:text-amber-300 rounded hover:bg-slate-700 transition-colors cursor-pointer"
              title="Toggle Orientation"
            >
              <RotateCw className="w-3 h-3" />
              <span>{orientation === 'portrait' ? 'Portrait' : 'Landscape'}</span>
            </button>
          </div>

          {/* Right: Primary Action Buttons */}
          <div className="flex items-center gap-2">
            
            {/* Quick Settings Toggle */}
            <button
              type="button"
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                showSettingsDrawer ? 'bg-amber-400 text-slate-950 border-amber-500 font-bold' : 'text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-700'
              }`}
              title="Print Setup & Page Margins"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Setup</span>
            </button>

            {/* Excel Export */}
            <button
              type="button"
              onClick={() => exportEstimateToExcelWorkbook(estimate)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
              title="Export as Excel .xlsx"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>

            {/* Save as PDF Button */}
            <button
              type="button"
              onClick={() => setShowPdfPrompt(true)}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Save formatted multi-page PDF"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Save as PDF</span>
                </>
              )}
            </button>

            {/* Physical Print Dialog Button */}
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Open System Print Dialog (Windows/Network/USB Printers)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Document</span>
            </button>

            {/* Maximize Toggle */}
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title={isMaximized ? "Restore Window" : "Full Screen"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Print Center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================
            OPTIONAL SETUP BAR (Paper, Margins, Sections)
           ======================================================== */}
        {showSettingsDrawer && (
          <div className="bg-slate-800 text-white p-3 sm:px-6 border-b border-slate-700 text-xs no-print animate-in fade-in slide-in-from-top-2 duration-150 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-4">
              
              {/* Paper Format */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">Paper Size:</span>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as any)}
                  className="bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  <option value="a4">A4 (210 × 297 mm) - Standard</option>
                  <option value="letter">Letter (8.5 × 11 in)</option>
                  <option value="legal">Legal (8.5 × 14 in)</option>
                </select>
              </div>

              {/* SLD Scheme Scope Selector */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-amber-300">SLD Scheme:</span>
                <select
                  value={sldScheme}
                  onChange={(e) => setSldScheme(e.target.value)}
                  className="bg-slate-900 border border-amber-500/80 rounded px-2.5 py-1 text-amber-300 font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  <option value="All Combined">All Combined</option>
                  <option value="Exist (Baseline Radial Feeder)">Exist (Baseline Radial Feeder)</option>
                  <option value="Proposed-1 (T-1 Line Portion)">Proposed-1 (T-1 Line Portion)</option>
                  <option value="Proposed-2 (T-2 Line Portion)">Proposed-2 (T-2 Line Portion)</option>
                  <option value="3-Scheme Comparison (Exist vs P-1 vs P-2)">3-Scheme Comparison (Exist vs P-1 vs P-2)</option>
                </select>
              </div>

              {/* Margins */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">Margins:</span>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setMarginSize('narrow')}
                    className={`px-2 py-0.5 rounded ${marginSize === 'narrow' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}`}
                  >
                    Narrow (8mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarginSize('normal')}
                    className={`px-2 py-0.5 rounded ${marginSize === 'normal' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}`}
                  >
                    Normal (12mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarginSize('wide')}
                    className={`px-2 py-0.5 rounded ${marginSize === 'wide' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}`}
                  >
                    Wide (25mm)
                  </button>
                </div>
              </div>

              {/* Content Inclusions */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWatermark}
                    onChange={(e) => setShowWatermark(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-slate-300">Watermark</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAuditSteps}
                    onChange={(e) => setShowAuditSteps(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-slate-300">Formula Audit</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSignatures}
                    onChange={(e) => setShowSignatures(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-slate-300">Signatures Block</span>
                </label>
              </div>

              <div className="text-[11px] text-slate-400 italic">
                * Selected settings will automatically adjust both screen preview, physical printer, and PDF output.
              </div>
            </div>
          </div>
        )}

        {/* Feedback Toast Banner */}
        {feedbackToast && (
          <div className={`p-2.5 px-4 text-xs font-semibold flex items-center justify-between gap-2 no-print shrink-0 ${
            feedbackToast.type === 'success' ? 'bg-emerald-600 text-white' :
            feedbackToast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'
          }`}>
            <div className="flex items-center gap-2">
              {feedbackToast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{feedbackToast.message}</span>
            </div>
            <button type="button" onClick={() => setFeedbackToast(null)} className="text-white/80 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================
            PRINT PREVIEW SCROLLABLE CANVAS
           ======================================================== */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-200/80 flex justify-center items-start print:bg-white print:p-0">
          
          {/* Scalable Paper Sheet Container */}
          <div 
            className="bg-white shadow-xl border border-slate-300 transition-transform origin-top print:shadow-none print:border-none w-full"
            style={{
              maxWidth: orientation === 'landscape' ? '1200px' : '900px',
              transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
              marginBottom: zoomLevel > 100 ? `${(zoomLevel - 100) * 15}px` : undefined
            }}
          >
            <div ref={printContentRef} id="printable-estimate-content" className="print-container">
              <PrintDocumentLayout
                estimate={estimate}
                orientation={orientation}
                paperSize={paperSize}
                marginSize={marginSize}
                showWatermark={showWatermark}
                showAuditSteps={showAuditSteps}
                showSignatures={showSignatures}
                sldScheme={sldScheme}
              />
            </div>
          </div>
        </div>

        {/* ========================================================
            SAVE AS PDF FILENAME PROMPT MODAL
           ======================================================== */}
        {showPdfPrompt && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 no-print">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Save as PDF Document</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPdfPrompt(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Filename (.pdf automatically appended):
                  </label>
                  <div className="flex items-center rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden">
                    <input
                      type="text"
                      value={pdfFilename}
                      onChange={(e) => setPdfFilename(e.target.value)}
                      placeholder="e.g. Estimate_PESH_2026_00401"
                      className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                      autoFocus
                    />
                    <span className="px-3 py-2 bg-slate-100 text-slate-500 font-mono font-semibold border-l border-slate-200">
                      .pdf
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-[11px] text-slate-600 font-mono">
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <strong className="text-slate-900">{paperSize.toUpperCase()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Orientation:</span>
                    <strong className="text-slate-900">{orientation.toUpperCase()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Margins:</span>
                    <strong className="text-slate-900">{marginSize.toUpperCase()} ({marginMm}mm)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Headers & Footers:</span>
                    <strong className="text-emerald-700 font-bold">Auto Running (Page X of Y)</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPdfPrompt(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsPdf}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
