/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  FeederData, 
  FeederAnalysisSummary,
  BifurcationConfig,
  BifurcationFourStatementDossier
} from '../types/feeder';
import { 
  Printer, 
  X, 
  Download, 
  Zap, 
  ShieldAlert, 
  CheckCircle2, 
  Calendar,
  FileCheck,
  FileText,
  FileSpreadsheet,
  Table as TableIcon,
  Layers,
  ArrowRight,
  Split,
  UserCheck,
  Award,
  GitFork,
  Network,
  Settings2,
  ChevronDown,
  ChevronUp,
  LayoutTemplate,
  Sliders,
  Sparkles,
  FileCode2,
  Check,
  Activity
} from 'lucide-react';
import { 
  generateTechnicalRecommendations,
  calculateBifurcationFourStatements 
} from '../utils/elrEngine';
import { JobTitle, JOB_TITLE_OPTIONS } from '../types/feeder';
import { calculateNonOverlappingSLDLayout } from '../utils/sldLayout';
import { BifurcationStatementsPanel } from './BifurcationStatementsPanel';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeder: FeederData;
  summary: FeederAnalysisSummary;
  proposedSummary: FeederAnalysisSummary;
  activeTransformerKva?: number;
  bifurcationConfig?: BifurcationConfig;
  selectedJobTitle?: JobTitle;
  onUpdateJobTitle?: (title: string) => void;
}

export type PageBreakMode = 'page_per_section' | 'compact_flow';
export type PageOrientation = 'portrait' | 'landscape' | 'auto';
export type PrintScale = 'compact' | 'standard' | 'presentation';

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  feeder,
  summary,
  proposedSummary,
  activeTransformerKva,
  bifurcationConfig,
  selectedJobTitle = 'Sub-Divisional Officer (SDO)',
  onUpdateJobTitle
}) => {
  const effectiveBifurcationConfig: BifurcationConfig = useMemo(() => {
    if (bifurcationConfig) return bifurcationConfig;
    return {
      enabled: proposedSummary.bifurcationActive || false,
      bifurcationNodeId: proposedSummary.bifurcationNodeId || '3.0',
      transformerCapacityKva: proposedSummary.additionalTransformerKva || 100,
      mode: 'ADDITIONAL_TRANSFORMER'
    };
  }, [bifurcationConfig, proposedSummary]);

  const bifurcationDossier: BifurcationFourStatementDossier = useMemo(() => {
    return calculateBifurcationFourStatements(feeder, effectiveBifurcationConfig, {
      t1TransformerOverrideKva: activeTransformerKva
    });
  }, [feeder, effectiveBifurcationConfig, activeTransformerKva]);

  const [displayMode, setDisplayMode] = useState<
    'full_report' | 'bifurcation_4_statements' | 'single_line_diagram' | 'input_form_image1' | 'output_schedule_image2' | 'dual_form' | 'table1_matrix'
  >(effectiveBifurcationConfig.enabled ? 'full_report' : 'full_report');

  // Per-Page Print Settings State
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [pageBreakMode, setPageBreakMode] = useState<PageBreakMode>('page_per_section');
  const [pageOrientation, setPageOrientation] = useState<PageOrientation>('portrait');
  const [printScale, setPrintScale] = useState<PrintScale>('standard');
  const [includePageHeaders, setIncludePageHeaders] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);

  // Per-Page Inclusion Toggles
  const [pagesToPrint, setPagesToPrint] = useState<{
    summarySpecs: boolean;
    bifurcationStatements: boolean;
    singleLineDiagram: boolean;
    inputFormImage1: boolean;
    outputScheduleImage2: boolean;
    table1Matrix: boolean;
    recommendations: boolean;
  }>({
    summarySpecs: true,
    bifurcationStatements: effectiveBifurcationConfig.enabled,
    singleLineDiagram: true,
    inputFormImage1: true,
    outputScheduleImage2: true,
    table1Matrix: true,
    recommendations: true
  });

  // Quick Preset Handlers
  const handleApplyPreset = (preset: 'all' | 'bifurcation_only' | 'sld_only' | 'forms_only' | 'summary_matrix') => {
    if (preset === 'all') {
      setDisplayMode('full_report');
      setPagesToPrint({
        summarySpecs: true,
        bifurcationStatements: effectiveBifurcationConfig.enabled,
        singleLineDiagram: true,
        inputFormImage1: true,
        outputScheduleImage2: true,
        table1Matrix: true,
        recommendations: true
      });
      setPageBreakMode('page_per_section');
    } else if (preset === 'bifurcation_only') {
      setDisplayMode('bifurcation_4_statements');
      setPagesToPrint({
        summarySpecs: false,
        bifurcationStatements: true,
        singleLineDiagram: false,
        inputFormImage1: false,
        outputScheduleImage2: false,
        table1Matrix: false,
        recommendations: false
      });
      setPageBreakMode('compact_flow');
    } else if (preset === 'sld_only') {
      setDisplayMode('single_line_diagram');
      setPagesToPrint({
        summarySpecs: false,
        bifurcationStatements: false,
        singleLineDiagram: true,
        inputFormImage1: false,
        outputScheduleImage2: false,
        table1Matrix: false,
        recommendations: false
      });
      setPageOrientation('landscape');
    } else if (preset === 'forms_only') {
      setDisplayMode('dual_form');
      setPagesToPrint({
        summarySpecs: false,
        bifurcationStatements: false,
        singleLineDiagram: false,
        inputFormImage1: true,
        outputScheduleImage2: true,
        table1Matrix: false,
        recommendations: false
      });
      setPageBreakMode('page_per_section');
    } else if (preset === 'summary_matrix') {
      setDisplayMode('full_report');
      setPagesToPrint({
        summarySpecs: true,
        bifurcationStatements: false,
        singleLineDiagram: false,
        inputFormImage1: false,
        outputScheduleImage2: false,
        table1Matrix: true,
        recommendations: true
      });
      setPageBreakMode('compact_flow');
    }
  };

  // Compute non-overlapping layout for printable diagram
  const layout = useMemo(() => {
    return calculateNonOverlappingSLDLayout(feeder);
  }, [feeder]);

  // Map segments results by "from->to"
  const segmentResultMap = useMemo(() => {
    const map = new Map<string, any>();
    summary.segmentResults.forEach(r => {
      map.set(`${r.fromNodeId}->${r.toNodeId}`, r);
      map.set(r.segment.id, r);
    });
    return map;
  }, [summary]);

  if (!isOpen) return null;

  const currentTrfKva = activeTransformerKva || summary.existingTransformerKva;
  const currentTrfLoading = Math.round((summary.totalSystemDemandKva / currentTrfKva) * 100);
  const isTrfOverloaded = currentTrfLoading > 100;
  
  const officerTitle = selectedJobTitle && selectedJobTitle.trim() ? selectedJobTitle.trim() : 'Sub-Divisional Officer (SDO)';
  const lowerTitle = officerTitle.toLowerCase();
  const isXenMatch = lowerTitle.includes('xen') || lowerTitle.includes('executive');
  const isSeMatch = lowerTitle.includes('se') || lowerTitle.includes('superintending') || lowerTitle.includes('chief') || lowerTitle.includes('director');
  const isSdoMatch = !isXenMatch && !isSeMatch;

  const recommendations = generateTechnicalRecommendations(summary, feeder);
  const tariff = feeder.tariffPerKwh || 38.5;
  const kwhSaved = Math.max(0, summary.annualEnergyLossKwh - proposedSummary.annualEnergyLossKwh);
  const annualSavings = Math.round(kwhSaved * tariff);
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Dynamic Print Scale CSS Classes
  const scaleWrapperClass = 
    printScale === 'compact' ? 'print:text-[10px] print:leading-snug' :
    printScale === 'presentation' ? 'print:text-sm print:leading-relaxed' :
    'print:text-xs print:leading-normal';

  // Export current report / tables as CSV
  const handleExportCsv = () => {
    const headers = [
      'Span #',
      'From Node',
      'To Node',
      'Length (km)',
      'Length (m)',
      '3-Ph Cust',
      '1-Ph Cust',
      'Conductor Code',
      'Current (A)',
      'Loading %',
      'Volt Drop %',
      'Voltage (V)',
      'Loss (kW)'
    ];

    const rows = summary.segmentResults.map((r, i) => [
      i + 1,
      r.fromNodeId,
      r.toNodeId,
      r.lengthKm.toFixed(3),
      r.lengthMeters,
      r.threePhaseCustomers,
      r.singlePhaseCustomers,
      r.conductor.code,
      r.currentAmps.toFixed(1),
      r.percentLoading,
      r.percentVoltDrop.toFixed(1),
      r.receivingVoltage.toFixed(1),
      r.lineLossKw.toFixed(3)
    ]);

    const content = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${feeder.id}_ELR_Report_Forms_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const enabledPagesCount = Object.values(pagesToPrint).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      
      {/* ========================================================
          DYNAMIC @MEDIA PRINT STYLES WITH PER-PAGE CONTROLS
         ======================================================== */}
      <style>{`
        @media print {
          @page {
            size: ${pageOrientation === 'landscape' ? 'landscape' : 'portrait'};
            margin: ${printScale === 'compact' ? '8mm' : '12mm'};
          }
          body {
            background: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-page-break {
            break-before: ${pageBreakMode === 'page_per_section' ? 'page' : 'auto'} !important;
            page-break-before: ${pageBreakMode === 'page_per_section' ? 'always' : 'auto'} !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>

      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 print:m-0 print:shadow-none print:border-none print:rounded-none flex flex-col max-h-[94vh] print:max-h-none print-container">
        
        {/* Top Action Bar (hidden when printing) */}
        <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 no-print border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src="/pesco-logo.svg"
              alt="PESCO Logo"
              className="w-9 h-9 rounded-full border border-amber-500/40 shadow-xs shrink-0"
            />
            <div>
              <span className="font-bold text-sm block leading-tight">
                PESCO / WAPDA Feeder Loss Analysis & ELR Report
              </span>
              <span className="text-[11px] text-slate-400">
                Peshawar Electric Supply Company · Official Form Display & Engineering Dossier
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Per-Page Settings Toggle Button */}
            <button
              type="button"
              onClick={() => setShowPrintSettings(!showPrintSettings)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                showPrintSettings
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-400/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
              }`}
              title="Configure Per-Page Print Settings, Page Breaks, Orientation and Layout"
            >
              <Settings2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Per-Page Print Settings</span>
              <span className="bg-slate-950/80 text-amber-300 px-1.5 py-0.2 rounded text-[10px] font-mono">
                {pageBreakMode === 'page_per_section' ? '1 Page/Sec' : 'Continuous'} · {enabledPagesCount} pgs
              </span>
              {showPrintSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================
            COLLAPSIBLE PER-PAGE PRINT SETTINGS CONTROL PANEL
           ======================================================== */}
        {showPrintSettings && (
          <div className="bg-slate-950 text-white p-5 border-b border-slate-800 space-y-4 no-print animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
                  Per-Page Print & PDF Customization Suite
                </h3>
              </div>
              
              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px] mr-1">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('all')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer font-medium text-[11px]"
                >
                  Full Dossier
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('bifurcation_only')}
                  className="px-2.5 py-1 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-600/80 cursor-pointer font-bold text-[11px] flex items-center gap-1"
                >
                  <Split className="w-3 h-3 text-purple-300" />
                  <span>Bifurcation 4-Statements</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('sld_only')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-800/80 cursor-pointer font-medium text-[11px]"
                >
                  SLD Blueprint (Landscape)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('forms_only')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-800/80 cursor-pointer font-medium text-[11px]"
                >
                  image1 + image2 Forms Only
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('summary_matrix')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-800/80 cursor-pointer font-medium text-[11px]"
                >
                  Summary & Matrix Only
                </button>
              </div>
            </div>

            {/* Print Parameters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              
              {/* Setting 1: Page Break Mode */}
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <label className="text-slate-200 font-bold block flex items-center justify-between">
                  <span>1. Page Break Behavior</span>
                  <span className="text-[10px] font-mono text-amber-400 font-normal">break-before: page</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPageBreakMode('page_per_section')}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      pageBreakMode === 'page_per_section'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold ring-1 ring-amber-400/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="block font-bold">1 Page Per Section</span>
                    <span className="text-[10px] text-slate-400 font-normal">Clean multi-page breaks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPageBreakMode('compact_flow')}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      pageBreakMode === 'compact_flow'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold ring-1 ring-amber-400/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="block font-bold">Continuous Flow</span>
                    <span className="text-[10px] text-slate-400 font-normal">Compact, saves paper</span>
                  </button>
                </div>
              </div>

              {/* Setting 2: Page Orientation & Scale */}
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <label className="text-slate-200 font-bold block flex items-center justify-between">
                  <span>2. Page Orientation & Scale</span>
                  <span className="text-[10px] font-mono text-amber-400 font-normal">@page {pageOrientation}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={pageOrientation}
                    onChange={(e) => setPageOrientation(e.target.value as PageOrientation)}
                    className="bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-xs text-amber-300 outline-none font-bold"
                  >
                    <option value="portrait">Portrait (Standard A4)</option>
                    <option value="landscape">Landscape (Wide SLD/Tables)</option>
                  </select>

                  <select
                    value={printScale}
                    onChange={(e) => setPrintScale(e.target.value as PrintScale)}
                    className="bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-xs text-amber-300 outline-none font-bold"
                  >
                    <option value="compact">Compact Font (85%)</option>
                    <option value="standard">Standard Font (100%)</option>
                    <option value="presentation">Large Presentation (115%)</option>
                  </select>
                </div>
              </div>

              {/* Setting 3: Header & Verification Options */}
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <label className="text-slate-200 font-bold block flex items-center justify-between">
                  <span>3. Running Header & Seals</span>
                  <span className="text-[10px] font-mono text-amber-400 font-normal">Watermark / Stamp</span>
                </label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={includePageHeaders}
                      onChange={(e) => setIncludePageHeaders(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 cursor-pointer"
                    />
                    <span>Header Stamp</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={includeSignatures}
                      onChange={(e) => setIncludeSignatures(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 cursor-pointer"
                    />
                    <span>Signature Blocks</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Checklist of Pages / Sections to Print */}
            <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  Select Specific Pages / Sections to Include in Print / PDF:
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPagesToPrint({
                      summarySpecs: true,
                      bifurcationStatements: true,
                      singleLineDiagram: true,
                      inputFormImage1: true,
                      outputScheduleImage2: true,
                      table1Matrix: true,
                      recommendations: true
                    })}
                    className="text-amber-400 hover:underline font-medium cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => setPagesToPrint({
                      summarySpecs: false,
                      bifurcationStatements: false,
                      singleLineDiagram: false,
                      inputFormImage1: false,
                      outputScheduleImage2: false,
                      table1Matrix: false,
                      recommendations: false
                    })}
                    className="text-slate-400 hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 text-xs">
                {/* Page 1 */}
                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  pagesToPrint.summarySpecs 
                    ? 'bg-amber-950/40 border-amber-500/60 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={pagesToPrint.summarySpecs}
                    onChange={(e) => setPagesToPrint(p => ({ ...p, summarySpecs: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-[11px]">Page 1</span>
                    <span className="text-[10px] text-slate-400">Executive Summary & Specs</span>
                  </div>
                </label>

                {/* Page 2: Bifurcation 4-Statements */}
                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  pagesToPrint.bifurcationStatements 
                    ? 'bg-purple-950/40 border-purple-500/60 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={pagesToPrint.bifurcationStatements}
                    onChange={(e) => setPagesToPrint(p => ({ ...p, bifurcationStatements: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-700 text-purple-500 focus:ring-purple-400 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-[11px] text-purple-300">Bifurcation</span>
                    <span className="text-[10px] text-slate-400">T-1 & T-2 4-Statements</span>
                  </div>
                </label>

                {/* Page 3: SLD */}
                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  pagesToPrint.singleLineDiagram 
                    ? 'bg-indigo-950/40 border-indigo-500/60 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={pagesToPrint.singleLineDiagram}
                    onChange={(e) => setPagesToPrint(p => ({ ...p, singleLineDiagram: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-700 text-indigo-500 focus:ring-indigo-400 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-[11px] text-indigo-300">SLD Map</span>
                    <span className="text-[10px] text-slate-400">Single Line Diagram</span>
                  </div>
                </label>

                {/* Page 4 */}
                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  pagesToPrint.inputFormImage1 
                    ? 'bg-blue-950/40 border-blue-500/60 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={pagesToPrint.inputFormImage1}
                    onChange={(e) => setPagesToPrint(p => ({ ...p, inputFormImage1: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-700 text-blue-500 focus:ring-blue-400 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-[11px] text-blue-300">Input Form</span>
                    <span className="text-[10px] text-slate-400">image1.png Spans</span>
                  </div>
                </label>

                {/* Page 5 */}
                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  pagesToPrint.outputScheduleImage2 
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={pagesToPrint.outputScheduleImage2}
                    onChange={(e) => setPagesToPrint(p => ({ ...p, outputScheduleImage2: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-[11px] text-emerald-300">Output Form</span>
                    <span className="text-[10px] text-slate-400">image2.png Loss Flow</span>
                  </div>
                </label>

                {/* Page 6 */}
                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  pagesToPrint.table1Matrix 
                    ? 'bg-amber-950/40 border-amber-500/60 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={pagesToPrint.table1Matrix}
                    onChange={(e) => setPagesToPrint(p => ({ ...p, table1Matrix: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-[11px] text-amber-300">Table 1</span>
                    <span className="text-[10px] text-slate-400">Upgradation Matrix</span>
                  </div>
                </label>

                {/* Page 7 */}
                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  pagesToPrint.recommendations 
                    ? 'bg-purple-950/40 border-purple-500/60 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={pagesToPrint.recommendations}
                    onChange={(e) => setPagesToPrint(p => ({ ...p, recommendations: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-700 text-purple-500 focus:ring-purple-400 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-[11px] text-purple-300">Signatures</span>
                    <span className="text-[10px] text-slate-400">Directives & Seal</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Form Display View Selector Bar (no-print) */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <span className="text-[11px] font-semibold text-slate-500 mr-1 hidden sm:inline">Form Display:</span>
            
            <button
              onClick={() => setDisplayMode('full_report')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === 'full_report'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Full Engineering Report</span>
            </button>

            <button
              onClick={() => setDisplayMode('bifurcation_4_statements')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === 'bifurcation_4_statements'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-300'
              }`}
            >
              <Split className="w-3.5 h-3.5 text-purple-600" />
              <span>Line Bifurcation & T-2 (4 Statements)</span>
            </button>

            <button
              onClick={() => setDisplayMode('single_line_diagram')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === 'single_line_diagram'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5 text-indigo-500" />
              <span>Single Line Diagram (SLD Print)</span>
            </button>

            <button
              onClick={() => setDisplayMode('input_form_image1')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === 'input_form_image1'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
              <span>Input Data Form (image1.png)</span>
            </button>

            <button
              onClick={() => setDisplayMode('output_schedule_image2')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === 'output_schedule_image2'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span>Calculated Output Form (image2.png)</span>
            </button>

            <button
              onClick={() => setDisplayMode('dual_form')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === 'dual_form'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Split className="w-3.5 h-3.5 text-purple-500" />
              <span>Dual Side-by-Side Form</span>
            </button>

            <button
              onClick={() => setDisplayMode('table1_matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === 'table1_matrix'
                  ? 'bg-slate-900 text-amber-400 font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>Table 1 Upgradation Matrix</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-500 hidden lg:block">
            Print Layout: <strong>{pageBreakMode === 'page_per_section' ? '1 Page Per Section' : 'Continuous'}</strong> ({pageOrientation})
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div className={`p-6 sm:p-10 text-slate-900 space-y-8 bg-white overflow-y-auto flex-1 print:overflow-visible print:p-0 ${scaleWrapperClass}`} id="printable-report">
          
          {/* ========================================================
              PAGE 1 / HEADER: OFFICIAL LETTERHEAD & EXECUTIVE SPECS
             ======================================================== */}
          {((displayMode === 'full_report' && pagesToPrint.summarySpecs) || 
            (displayMode === 'single_line_diagram' && pagesToPrint.singleLineDiagram) || 
            (displayMode === 'input_form_image1' && pagesToPrint.inputFormImage1) || 
            (displayMode === 'output_schedule_image2' && pagesToPrint.outputScheduleImage2) || 
            (displayMode === 'table1_matrix' && pagesToPrint.table1Matrix)) && (
            <div className="border-b-2 border-slate-900 pb-5 print-avoid-break">
              <div className="flex items-center justify-between gap-4">
                <img
                  src="/pesco-logo.svg"
                  alt="PESCO Logo"
                  className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 object-contain"
                />
                
                <div className="text-center flex-1">
                  {includePageHeaders && (
                    <div className="text-xs uppercase tracking-widest font-extrabold text-slate-700 mb-0.5">
                      PESHAWAR ELECTRIC SUPPLY COMPANY (PESCO) · WAPDA
                    </div>
                  )}
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                    ENERGY LOSS REDUCTION (ELR) ENGINEERING REPORT
                  </h1>
                  <div className="text-xs font-semibold text-slate-600 mt-0.5">
                    Feeder Loading, Transformer Overloading, Line Losses & Upgradation Study
                  </div>
                </div>

                <div className="hidden sm:flex flex-col items-center justify-center w-20 shrink-0 text-center">
                  <div className="w-14 h-14 rounded-xl border-2 border-slate-900 flex flex-col items-center justify-center bg-slate-50 p-1">
                    <span className="text-[9px] font-black uppercase text-slate-900 leading-none">WAPDA</span>
                    <span className="text-[11px] font-black text-amber-600 leading-tight">ELR</span>
                    <span className="text-[8px] font-bold text-slate-600 leading-none">STD</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs font-mono text-slate-600 mt-3 pt-2.5 border-t border-slate-200">
                <span>Ref: <strong>ELR-PESCO-{feeder.id.toUpperCase()}</strong></span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span>Date: <strong>{today}</strong></span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span>Category: <strong>{feeder.category === 'HV' ? '11kV High Tension (HT)' : '400V Low Tension (LT)'}</strong></span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span>Nominal Voltage: <strong>{feeder.nominalVoltage} V</strong></span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span>Division: <strong>Peshawar City</strong></span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span className="text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-300">
                  Prepared by: <strong>{officerTitle}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Section 1: Feeder & Network Specifications */}
          {pagesToPrint.summarySpecs && (displayMode === 'full_report' || displayMode === 'single_line_diagram' || displayMode === 'input_form_image1' || displayMode === 'table1_matrix') && (
            <div className="print-avoid-break">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 bg-slate-100 p-2 border-l-4 border-amber-500 flex items-center justify-between">
                <span>1. Network & Feeder Electrical Specifications</span>
                <span className="text-[10px] font-mono text-slate-500 font-normal">Base Voltage: {summary.baseVoltage}V</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                  <span className="text-slate-500 block text-[11px]">Feeder Name:</span>
                  <span className="font-bold text-slate-900">{feeder.name}</span>
                </div>
                <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                  <span className="text-slate-500 block text-[11px]">Grid Substation:</span>
                  <span className="font-bold text-slate-900">{feeder.substationName}</span>
                </div>
                <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                  <span className="text-slate-500 block text-[11px]">Transformer Capacity:</span>
                  <span className="font-mono font-bold text-slate-900">{currentTrfKva} kVA</span>
                  <span className={`text-[10px] font-bold block ${isTrfOverloaded ? 'text-rose-600' : 'text-emerald-700'}`}>
                    ({currentTrfLoading}% {isTrfOverloaded ? 'OVERLOADED' : 'NORMAL'})
                  </span>
                </div>
                <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                  <span className="text-slate-500 block text-[11px]">Connected Consumers:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {summary.totalSinglePhaseCustomers} (1Φ) + {summary.totalThreePhaseCustomers} (3Φ)
                  </span>
                  <span className="text-[10px] text-slate-500 block">Total: {summary.totalSinglePhaseCustomers + summary.totalThreePhaseCustomers}</span>
                </div>
                <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                  <span className="text-slate-500 block text-[11px]">Total Circuit Length:</span>
                  <span className="font-mono font-bold text-slate-900">{summary.totalCircuitLengthKm} km ({Math.round(summary.totalCircuitLengthKm * 1000)} m)</span>
                </div>
                <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                  <span className="text-slate-500 block text-[11px]">Feeder Peak Demand:</span>
                  <span className="font-mono font-bold text-slate-900">{summary.totalSystemDemandKva} kVA ({summary.totalSourceCurrentAmps} A)</span>
                </div>
                <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                  <span className="text-slate-500 block text-[11px]">Power Factor / Load Factor:</span>
                  <span className="font-mono font-bold text-slate-900">{summary.operatingPowerFactor} / {(summary.loadFactor * 100).toFixed(0)}% (LLF: {summary.lossLoadFactor})</span>
                </div>
                <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                  <span className="text-slate-500 block text-[11px]">Total Line Loss & Ratio:</span>
                  <span className="font-mono font-bold text-amber-700">{summary.totalLineLossKw} kW ({summary.percentPowerLoss}%)</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              PAGE 2: SINGLE LINE DIAGRAM (SLD) BLUEPRINT
             ======================================================== */}
          {pagesToPrint.singleLineDiagram && (displayMode === 'full_report' || displayMode === 'single_line_diagram') && (
            <div className="print-page-break print-avoid-break space-y-3">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-indigo-600 flex items-center justify-between">
                <span>2. Single Line Diagram (SLD) & Radial Network Topology Map</span>
                <span className="text-[10px] font-mono text-indigo-800 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Engineering Blueprint · Dedicated Page
                </span>
              </h2>

              <p className="text-xs text-slate-600">
                Schematic electrical topology showing feeding substation, distribution poles, lateral branches, branch currents, conductor codes, and cumulative voltage drops:
              </p>

              {/* High-Resolution Printable SVG Canvas Card */}
              <div className="border-2 border-slate-800 rounded-xl overflow-hidden bg-white shadow-xs">
                {/* Blueprint Drawing Header Bar */}
                <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-amber-400" />
                    <span className="font-bold tracking-wider uppercase">
                      Single Line Diagram: {feeder.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px] text-slate-300">
                    <span>Voltage: <strong>{feeder.nominalVoltage}V</strong></span>
                    <span>·</span>
                    <span>Peak Current: <strong>{summary.totalSourceCurrentAmps}A</strong></span>
                    <span>·</span>
                    <span>Spans: <strong>{summary.segmentResults.length}</strong></span>
                  </div>
                </div>

                {/* SVG Drawing Area */}
                <div className="w-full overflow-x-auto bg-slate-50/50 p-4 flex items-center justify-center">
                  <svg
                    width={layout.width}
                    height={layout.height}
                    viewBox={layout.viewBox}
                    className="w-full max-w-full h-auto select-none"
                    style={{ minHeight: '320px' }}
                  >
                    <defs>
                      <marker
                        id="print-arrow"
                        viewBox="0 0 10 10"
                        refX="6"
                        refY="5"
                        markerWidth="5"
                        markerHeight="5"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 1 L 8 5 L 0 9 z" fill="#475569" />
                      </marker>
                    </defs>

                    {/* Render Segments (Lines) */}
                    {layout.segments.map(seg => {
                      const segResult = segmentResultMap.get(`${seg.fromNodeId}->${seg.toNodeId}`);
                      const isHighDrop = segResult && segResult.percentVoltDrop > 9.0;
                      const isHighLoss = segResult && segResult.isHighLoss;
                      const isCutSegment = summary.bifurcationActive && seg.toNodeId === summary.bifurcationNodeId;
                      const isFedByT2 = segResult?.fedByTransformer === 'T2';

                      const strokeColor = isCutSegment
                        ? '#94a3b8'
                        : (isFedByT2
                            ? '#7c3aed'
                            : (isHighLoss || isHighDrop ? '#dc2626' : '#2563eb'));

                      const x1 = seg.x1;
                      const y1 = seg.y1;
                      const x2 = seg.x2;
                      const y2 = seg.y2;
                      const midX = seg.midX;
                      const midY = seg.midY;

                      return (
                        <g key={seg.id}>
                          {/* Segment line */}
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={strokeColor}
                            strokeWidth={isHighLoss ? 4 : 3}
                            strokeLinecap="round"
                            strokeDasharray={isCutSegment ? "6 6" : undefined}
                          />

                          {/* Segment Info Label Box */}
                          <g transform={`translate(${midX}, ${midY - 14})`}>
                            <rect
                              x="-40"
                              y="-11"
                              width="80"
                              height="22"
                              rx="4"
                              fill="#ffffff"
                              stroke={isFedByT2 ? '#7c3aed' : (isHighLoss ? '#dc2626' : '#64748b')}
                              strokeWidth="1.2"
                              className="filter drop-shadow-xs"
                            />
                            <text
                              x="0"
                              y="-1"
                              textAnchor="middle"
                              fill="#0f172a"
                              fontSize="8.5"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              {isCutSegment 
                                ? 'TIE OPEN' 
                                : (segResult ? `${segResult.currentAmps}A (${segResult.fedByTransformer || 'T1'})` : 'Span')}
                            </text>
                            <text
                              x="0"
                              y="8"
                              textAnchor="middle"
                              fill={isHighLoss ? '#b91c1c' : '#475569'}
                              fontSize="7.5"
                              fontFamily="monospace"
                              fontWeight="600"
                            >
                              {isCutSegment ? 'Bifurcated' : (segResult ? `${segResult.lineLossKw} kW` : '')}
                            </text>
                          </g>

                          {/* Conductor Code & Length */}
                          {segResult && (
                            <g transform={`translate(${midX}, ${midY + 15})`}>
                              <rect
                                x="-32"
                                y="-6"
                                width="64"
                                height="12"
                                rx="3"
                                fill="#f1f5f9"
                                stroke="#cbd5e1"
                                strokeWidth="0.8"
                              />
                              <text
                                x="0"
                                y="3"
                                textAnchor="middle"
                                fill="#334155"
                                fontSize="7"
                                fontFamily="monospace"
                                fontWeight="bold"
                              >
                                {segResult.conductor.code} · {Math.round(segResult.lengthKm * 1000)}m
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Render Nodes (Poles & Substations) */}
                    {layout.nodes.map(node => {
                      const x = node.x;
                      const y = node.y;
                      const isBifurcationInjectionNode = summary.bifurcationActive && node.id === summary.bifurcationNodeId;
                      const incomingSegResult = summary.segmentResults.find(r => r.toNodeId === node.id);

                      return (
                        <g key={node.id} transform={`translate(${x}, ${y})`}>
                          {/* Transformer Node */}
                          {node.isTransformerNode ? (
                            <g>
                              <rect
                                x="-24"
                                y="-24"
                                width="48"
                                height="48"
                                rx="6"
                                fill="#065f46"
                                stroke="#047857"
                                strokeWidth="2"
                              />
                              <Zap className="w-5 h-5 text-amber-300" x="-10" y="-13" />
                              <text
                                x="0"
                                y="11"
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize="8"
                                fontWeight="bold"
                                fontFamily="monospace"
                              >
                                T-1: {summary.existingTransformerKva}kVA
                              </text>
                              <text
                                x="0"
                                y="19"
                                textAnchor="middle"
                                fill="#a7f3d0"
                                fontSize="7"
                                fontFamily="monospace"
                              >
                                {summary.existingTransformerLoadingPercent}% Load
                              </text>
                            </g>
                          ) : (
                            /* Regular Distribution Pole Node */
                            <g>
                              <circle
                                r="12"
                                fill={isBifurcationInjectionNode ? '#581c87' : '#1e293b'}
                                stroke={incomingSegResult && incomingSegResult.percentVoltDrop > 9.0 ? '#dc2626' : '#475569'}
                                strokeWidth="2"
                              />
                              <text
                                x="0"
                                y="3.5"
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize="9"
                                fontWeight="bold"
                                fontFamily="monospace"
                              >
                                {node.id.replace('.0', '')}
                              </text>
                            </g>
                          )}

                          {/* Bifurcation T-2 Substation Badge */}
                          {isBifurcationInjectionNode && (
                            <g transform="translate(0, -40)">
                              <rect
                                x="-32"
                                y="-14"
                                width="64"
                                height="28"
                                rx="4"
                                fill="#581c87"
                                stroke="#a855f7"
                                strokeWidth="1.5"
                              />
                              <text
                                x="0"
                                y="-2"
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize="8"
                                fontWeight="bold"
                                fontFamily="monospace"
                              >
                                T-2 Added
                              </text>
                              <text
                                x="0"
                                y="8"
                                textAnchor="middle"
                                fill="#e9d5ff"
                                fontSize="7.5"
                                fontFamily="monospace"
                              >
                                {summary.additionalTransformerKva}kVA
                              </text>
                              <line x1="0" y1="14" x2="0" y2="28" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="2 2" />
                            </g>
                          )}

                          {/* 3-Phase Customer Badge */}
                          {node.threePhaseCustomers > 0 && (
                            <g transform="translate(-13, -13)">
                              <circle r="6.5" fill="#7c3aed" stroke="#ffffff" strokeWidth="1" />
                              <text
                                x="0"
                                y="2"
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize="6"
                                fontWeight="bold"
                              >
                                3Φ
                              </text>
                            </g>
                          )}

                          {/* Node Label Below */}
                          <text
                            x="0"
                            y={node.isTransformerNode ? 34 : 22}
                            textAnchor="middle"
                            fill="#0f172a"
                            fontSize="8.5"
                            fontWeight="bold"
                          >
                            Node {node.id.replace('.0', '')}
                          </text>

                          {/* Customer count */}
                          {!node.isTransformerNode && (
                            <text
                              x="0"
                              y="31"
                              textAnchor="middle"
                              fill="#475569"
                              fontSize="7.5"
                              fontFamily="monospace"
                            >
                              {node.singlePhaseCustomers} cust {node.threePhaseCustomers ? `+ ${node.threePhaseCustomers}(3Φ)` : ''}
                            </text>
                          )}

                          {/* Voltage drop */}
                          {incomingSegResult && (
                            <text
                              x="0"
                              y="40"
                              textAnchor="middle"
                              fill={incomingSegResult.percentVoltDrop > 9.0 ? '#dc2626' : '#0284c7'}
                              fontSize="7.5"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              -{incomingSegResult.percentVoltDrop}% ({incomingSegResult.receivingVoltage}V)
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Blueprint Drawing Legend Footer */}
                <div className="bg-slate-100 border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-700">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 rounded bg-emerald-800 border border-emerald-600 flex items-center justify-center">
                        <Zap className="w-2.5 h-2.5 text-amber-300" />
                      </div>
                      <span>Transformer Substation (T-1)</span>
                    </div>

                    {summary.bifurcationActive && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 rounded bg-purple-900 border border-purple-400 flex items-center justify-center">
                          <Zap className="w-2.5 h-2.5 text-amber-300" />
                        </div>
                        <span>Additional Transformer (T-2)</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-slate-800" />
                      <span>Distribution Pole</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[7px] font-bold">
                        3Φ
                      </div>
                      <span>3-Phase Load</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-1 bg-blue-600 rounded" />
                      <span>Standard Span</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-1 bg-red-600 rounded" />
                      <span>High Drop (&gt;9%) / Loss</span>
                    </div>
                  </div>

                  <div className="font-mono text-[10px] text-slate-500">
                    Scale: Schematic · WAPDA ELR Standards
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              PAGE 3: LINE BIFURCATION & T-2 FOUR-STATEMENT STUDY
             ======================================================== */}
          {pagesToPrint.bifurcationStatements && (displayMode === 'full_report' || displayMode === 'bifurcation_4_statements') && (
            <div className="print-page-break print-avoid-break space-y-4">
              <div className="bg-purple-50 border-l-4 border-purple-600 p-2.5 rounded-r-lg flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Split className="w-4 h-4 text-purple-700" />
                    <span>3. Line Bifurcation & Additional Transformer (T-2) Dual-Zone 4-Statement Study</span>
                  </h2>
                  <p className="text-[11px] text-purple-800 mt-0.5">
                    Portion of line with Transformer 1 (T-1) at 0 Year & 5 Years, and portion of line with Transformer 2 (T-2) at 0 Year & 5 Years.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-purple-900 font-bold bg-purple-200/80 px-2 py-0.5 rounded border border-purple-300">
                  Split @ Node {bifurcationDossier.bifurcationNodeId} · T-2: {bifurcationDossier.additionalTransformerKva} kVA · Page {pageBreakMode === 'page_per_section' ? '3' : ''}
                </span>
              </div>

              <BifurcationStatementsPanel
                dossier={bifurcationDossier}
                currencySymbol={feeder.currencySymbol || 'PKR'}
                isPrintView={true}
              />
            </div>
          )}

          {/* ========================================================
              PAGE 4: FORM DISPLAY - INPUT DATA FORM (image1.png)
             ======================================================== */}
          {pagesToPrint.inputFormImage1 && (displayMode === 'full_report' || displayMode === 'input_form_image1' || displayMode === 'dual_form') && (
            <div className="print-page-break print-avoid-break">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 bg-slate-100 p-2 border-l-4 border-blue-600 flex items-center justify-between">
                <span>FORM DISPLAY A: FEEDER SPANS INPUT DATA TABLE (image1.png)</span>
                <span className="text-[10px] font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {summary.segmentResults.length} Spans Loaded · Page {pageBreakMode === 'page_per_section' ? '3' : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-600 mb-2">
                As recorded in WAPDA field survey for Gulbhar Colony Feeder (Ref. image1.png):
              </p>
              
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-2.5 text-center">Zone</th>
                      <th className="py-2 px-3 text-center">From Node</th>
                      <th className="py-2 px-3 text-center">To Node</th>
                      <th className="py-2 px-3 text-right">Length (km)</th>
                      <th className="py-2 px-3 text-right">Length (m)</th>
                      <th className="py-2 px-3 text-right">3-Ph Customer</th>
                      <th className="py-2 px-3 text-right">1-Ph Customer</th>
                      <th className="py-2 px-3 text-left">Conductor Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                    {summary.segmentResults.map((seg, idx) => (
                      <tr key={seg.segment.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="py-1.5 px-2 text-center text-slate-400 font-sans text-[11px]">{idx + 1}</td>
                        <td className="py-1.5 px-2.5 text-center font-sans">
                          {seg.fedByTransformer === 'T2' ? (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-900">
                              T-2 Added
                            </span>
                          ) : (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-900">
                              T-1 Main
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-center font-bold text-slate-900">{seg.fromNodeId.replace('.0', '')}</td>
                        <td className="py-1.5 px-3 text-center font-bold text-slate-900">{seg.toNodeId.replace('.0', '')}</td>
                        <td className="py-1.5 px-3 text-right font-medium">{seg.lengthKm.toFixed(3)}</td>
                        <td className="py-1.5 px-3 text-right">{seg.lengthMeters}</td>
                        <td className="py-1.5 px-3 text-right font-bold text-purple-700">{seg.threePhaseCustomers}</td>
                        <td className="py-1.5 px-3 text-right font-bold text-slate-900">{seg.singlePhaseCustomers}</td>
                        <td className="py-1.5 px-3 text-left font-semibold text-slate-800 font-sans">{seg.conductor.code}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold font-mono">
                      <td colSpan={4} className="py-2 px-3 text-center text-amber-400 uppercase tracking-wider font-sans text-xs">
                        TOTALS
                      </td>
                      <td className="py-2 px-3 text-right text-amber-300">
                        {summary.totalCircuitLengthKm.toFixed(3)} km
                      </td>
                      <td className="py-2 px-3 text-right">
                        {Math.round(summary.totalCircuitLengthKm * 1000)} m
                      </td>
                      <td className="py-2 px-3 text-right text-purple-300">
                        {summary.totalThreePhaseCustomers}
                      </td>
                      <td className="py-2 px-3 text-right text-amber-300">
                        {summary.totalSinglePhaseCustomers}
                      </td>
                      <td className="py-2 px-3 text-slate-400 font-sans text-xs">
                        {summary.segmentResults.length} Spans
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================
              PAGE 4: FORM DISPLAY - CALCULATED OUTPUT SCHEDULE (image2.png)
             ======================================================== */}
          {pagesToPrint.outputScheduleImage2 && (displayMode === 'full_report' || displayMode === 'output_schedule_image2' || displayMode === 'dual_form') && (
            <div className="print-page-break print-avoid-break">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 bg-slate-100 p-2 border-l-4 border-emerald-600 flex items-center justify-between">
                <span>FORM DISPLAY B: CALCULATED SEGMENT LOAD FLOW & LOSS SCHEDULE (image2.png)</span>
                <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Line Loss: {summary.totalLineLossKw} kW · Page {pageBreakMode === 'page_per_section' ? '4' : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-600 mb-2">
                Calculated using WAPDA ELR radial distribution algorithm (Ref. image2.png):
              </p>

              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-2 text-center">Zone</th>
                      <th className="py-2 px-2 text-center">From</th>
                      <th className="py-2 px-2 text-center">To</th>
                      <th className="py-2 px-2 text-right">Length (km)</th>
                      <th className="py-2 px-2 text-right">Length (m)</th>
                      <th className="py-2 px-2 text-right">Cust (3Φ/1Φ)</th>
                      <th className="py-2 px-2 text-left">Code</th>
                      <th className="py-2 px-2 text-right bg-blue-50/80 font-bold text-blue-950">Current (A)</th>
                      <th className="py-2 px-2 text-right bg-purple-50/80 font-bold text-purple-950">Loading %</th>
                      <th className="py-2 px-2 text-right bg-rose-50/80 font-bold text-rose-950">Volt Drop %</th>
                      <th className="py-2 px-2 text-right">Voltage (V)</th>
                      <th className="py-2 px-2 text-right bg-amber-50/80 font-bold text-amber-950">Loss (kW)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                    {summary.segmentResults.map((seg, idx) => (
                      <tr key={seg.segment.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="py-1.5 px-2 text-center text-slate-400 font-sans text-[11px]">{idx + 1}</td>
                        <td className="py-1.5 px-2.5 text-center font-sans">
                          {seg.fedByTransformer === 'T2' ? (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-900">
                              T-2 Added
                            </span>
                          ) : (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-900">
                              T-1 Main
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-center font-bold text-slate-900">{seg.fromNodeId.replace('.0', '')}</td>
                        <td className="py-1.5 px-3 text-center font-bold text-slate-900">{seg.toNodeId.replace('.0', '')}</td>
                        <td className="py-1.5 px-2 text-right">{seg.lengthKm.toFixed(3)}</td>
                        <td className="py-1.5 px-2 text-right">{seg.lengthMeters}</td>
                        <td className="py-1.5 px-2 text-right text-slate-700">
                          {seg.threePhaseCustomers} / {seg.singlePhaseCustomers}
                        </td>
                        <td className="py-1.5 px-2 text-left font-sans text-slate-800">{seg.conductor.code}</td>
                        <td className="py-1.5 px-2 text-right font-bold text-blue-700 bg-blue-50/30">
                          {seg.currentAmps.toFixed(1)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-bold bg-purple-50/30">
                          <span className={seg.percentLoading >= 70 ? 'text-amber-700' : 'text-slate-800'}>
                            {seg.percentLoading}%
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-right font-bold bg-rose-50/30 text-rose-700">
                          {seg.percentVoltDrop.toFixed(1)}%
                        </td>
                        <td className="py-1.5 px-2 text-right font-semibold text-slate-900">
                          {seg.receivingVoltage.toFixed(1)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-bold text-amber-700 bg-amber-50/30">
                          {seg.lineLossKw.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold font-mono">
                      <td colSpan={4} className="py-2.5 px-2 text-center text-amber-400 uppercase tracking-wider font-sans text-xs">
                        TOTALS & PEAKS
                      </td>
                      <td className="py-2.5 px-2 text-right text-amber-300">
                        {summary.totalCircuitLengthKm.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {Math.round(summary.totalCircuitLengthKm * 1000)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-purple-300">
                        {summary.totalThreePhaseCustomers} / {summary.totalSinglePhaseCustomers}
                      </td>
                      <td className="py-2.5 px-2 text-slate-400 font-sans text-xs">Max</td>
                      <td className="py-2.5 px-2 text-right text-blue-300 font-bold">
                        {summary.totalSourceCurrentAmps} A
                      </td>
                      <td className="py-2.5 px-2 text-right text-purple-300 font-bold">
                        85%
                      </td>
                      <td className="py-2.5 px-2 text-right text-rose-300 font-bold">
                        -{summary.worstVoltageDropPercent}%
                      </td>
                      <td className="py-2.5 px-2 text-right text-white">
                        {summary.worstVoltageVolts} V
                      </td>
                      <td className="py-2.5 px-2 text-right text-amber-300 font-extrabold text-sm">
                        {summary.totalLineLossKw} kW
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================
              PAGE 5: TABLE 1 UPGRADATION BENCHMARK MATRIX
             ======================================================== */}
          {pagesToPrint.table1Matrix && (displayMode === 'full_report' || displayMode === 'table1_matrix') && (
            <div className="print-page-break print-avoid-break">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 bg-slate-100 p-2 border-l-4 border-amber-500 flex items-center justify-between">
                <span>3. Comparative Upgradation & Loss Relief Matrix (WAPDA Study Table 1)</span>
                <span className="text-[10px] font-mono text-slate-500 font-normal">Economics: PKR 38.5 / kWh · Page {pageBreakMode === 'page_per_section' ? '5' : ''}</span>
              </h2>

              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2.5">Parameter</th>
                      <th className="p-2.5 text-right">Existing System</th>
                      <th className="p-2.5 text-right bg-emerald-50 text-emerald-950 font-bold">Proposed Upgraded</th>
                      <th className="p-2.5 text-right text-emerald-800">Benefits / Net Savings</th>
                      <th className="p-2.5 text-right">After 5 Years (Unmitigated)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                    {proposedSummary.bifurcationActive && (
                      <tr className="bg-purple-50/40">
                        <td className="p-2 font-sans font-semibold text-purple-900">Line Bifurcation & T-2 Substation</td>
                        <td className="p-2 text-right text-slate-500">None (Single Radial)</td>
                        <td className="p-2 text-right bg-purple-100/70 text-purple-950 font-bold">
                          Split @ Node {proposedSummary.bifurcationNodeId} (+{proposedSummary.additionalTransformerKva} kVA T-2)
                        </td>
                        <td className="p-2 text-right font-bold text-purple-800">
                          Relieved {proposedSummary.bifurcationReliefKva} kVA Load
                        </td>
                        <td className="p-2 text-right text-slate-400">N/A</td>
                      </tr>
                    )}
                    <tr>
                      <td className="p-2 font-sans font-semibold text-slate-800">Transformer Capacity (T-1)</td>
                      <td className="p-2 text-right">{currentTrfKva} kVA</td>
                      <td className="p-2 text-right bg-emerald-50 text-emerald-900 font-bold">{proposedSummary.existingTransformerKva} kVA</td>
                      <td className="p-2 text-right font-sans text-emerald-700">
                        {proposedSummary.bifurcationActive ? 'T-1 Relieved by T-2 Substation' : 'Augmented to Match Load'}
                      </td>
                      <td className="p-2 text-right">{currentTrfKva} kVA</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-sans font-semibold text-slate-800">Main Transformer (T-1) Loading</td>
                      <td className="p-2 text-right font-bold text-rose-700">{currentTrfLoading}%</td>
                      <td className="p-2 text-right bg-emerald-50 text-emerald-900 font-bold">{proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent}%</td>
                      <td className="p-2 text-right font-bold text-emerald-700">
                        -{currentTrfLoading - (proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent)}% Overload Relieved
                      </td>
                      <td className="p-2 text-right font-bold text-rose-800">151%</td>
                    </tr>
                    {proposedSummary.bifurcationActive && (
                      <tr className="bg-purple-50/20">
                        <td className="p-2 font-sans font-semibold text-purple-900">Additional Transformer (T-2) Loading</td>
                        <td className="p-2 text-right text-slate-400">Not Installed</td>
                        <td className="p-2 text-right bg-purple-100/50 text-purple-950 font-bold">{proposedSummary.transformer2LoadingPercent}%</td>
                        <td className="p-2 text-right font-bold text-purple-800">
                          {proposedSummary.transformer2DemandKva} kVA on T-2 ({proposedSummary.additionalTransformerKva} kVA)
                        </td>
                        <td className="p-2 text-right text-slate-400">N/A</td>
                      </tr>
                    )}
                    <tr>
                      <td className="p-2 font-sans font-semibold text-slate-800">Peak Feeder Line Losses</td>
                      <td className="p-2 text-right">{summary.totalLineLossKw.toFixed(2)} kW</td>
                      <td className="p-2 text-right bg-emerald-50 text-emerald-900 font-bold">{proposedSummary.totalLineLossKw.toFixed(2)} kW</td>
                      <td className="p-2 text-right font-bold text-emerald-700">
                        -{(summary.totalLineLossKw - proposedSummary.totalLineLossKw).toFixed(2)} kW
                      </td>
                      <td className="p-2 text-right font-bold">12.555 kW</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-sans font-semibold text-slate-800">Power Loss Ratio</td>
                      <td className="p-2 text-right">{summary.percentPowerLoss}%</td>
                      <td className="p-2 text-right bg-emerald-50 text-emerald-900 font-bold">{proposedSummary.percentPowerLoss}%</td>
                      <td className="p-2 text-right font-bold text-emerald-700">
                        -{Math.max(0, summary.percentPowerLoss - proposedSummary.percentPowerLoss)}%
                      </td>
                      <td className="p-2 text-right">10%</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-sans font-semibold text-slate-800">Annual Energy Losses</td>
                      <td className="p-2 text-right">{summary.annualEnergyLossKwh.toLocaleString()} kWh</td>
                      <td className="p-2 text-right bg-emerald-50 text-emerald-900 font-bold">{proposedSummary.annualEnergyLossKwh.toLocaleString()} kWh</td>
                      <td className="p-2 text-right font-bold text-emerald-700">
                        -{kwhSaved.toLocaleString()} kWh / yr
                      </td>
                      <td className="p-2 text-right font-bold">30,445 kWh</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-sans font-semibold text-slate-800">Worst Voltage Drop</td>
                      <td className="p-2 text-right font-semibold text-rose-700">-{summary.worstVoltageDropPercent}%</td>
                      <td className="p-2 text-right bg-emerald-50 text-emerald-900 font-bold">-{proposedSummary.worstVoltageDropPercent}%</td>
                      <td className="p-2 text-right font-bold text-emerald-700">
                        +{(summary.worstVoltageDropPercent - proposedSummary.worstVoltageDropPercent).toFixed(1)}% Boosted
                      </td>
                      <td className="p-2 text-right font-bold text-rose-800">-14.8%</td>
                    </tr>
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-2 font-sans text-slate-900">Financial Revenue Impact</td>
                      <td className="p-2 text-right text-slate-900">
                        {feeder.currencySymbol} {Math.round(summary.annualEnergyLossKwh * tariff).toLocaleString()}
                      </td>
                      <td className="p-2 text-right bg-emerald-100 text-emerald-950 font-bold">
                        {feeder.currencySymbol} {Math.round(proposedSummary.annualEnergyLossKwh * tariff).toLocaleString()}
                      </td>
                      <td className="p-2 text-right text-emerald-800 font-bold font-sans">
                        +{feeder.currencySymbol} {annualSavings.toLocaleString()} / YEAR
                      </td>
                      <td className="p-2 text-right text-rose-900">
                        {feeder.currencySymbol} {Math.round(30445 * tariff).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================
              PAGE 6: RECOMMENDATIONS & OFFICIAL SIGNATURES
             ======================================================== */}
          {pagesToPrint.recommendations && (displayMode === 'full_report') && (
            <div className="print-page-break print-avoid-break space-y-4">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 bg-slate-100 p-2 border-l-4 border-amber-500">
                4. Priority Engineering Remediation Directives
              </h2>
              <div className="space-y-2.5">
                {recommendations.map((rec, i) => (
                  <div key={i} className="border border-slate-200 p-3 rounded-lg text-xs bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">
                        Directive 4.{i + 1}: {rec.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        rec.category === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rec.category}
                      </span>
                    </div>
                    <p className="text-slate-600 mb-1">{rec.description}</p>
                    <p className="text-slate-900 font-semibold bg-slate-50 p-1.5 rounded border border-slate-200">
                      Standard Operating Action: {rec.suggestedAction}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 7: Official Approvals & Signatures */}
          {includeSignatures && (
            <div className="pt-6 border-t-2 border-slate-900 print-avoid-break">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>Official Verification, Endorsement & Approval Chain</span>
                <span className="font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Active Officer: <strong>{officerTitle}</strong>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
                <div className={`p-3 rounded-xl border ${isSdoMatch ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/40' : 'bg-slate-50/50 border-slate-200'}`}>
                  <div className="h-12 border-b border-dashed border-slate-400 mb-2 flex items-center justify-center">
                    {isSdoMatch && (
                      <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        ✓ Endorsed by Active Officer
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-slate-900 block">Sub-Divisional Officer (SDO)</span>
                  <span className="text-slate-500 text-[11px]">Gulbhar Sub-Division · PESCO/WAPDA</span>
                  {isSdoMatch && (
                    <span className="text-[10px] font-bold text-amber-800 block mt-1">
                      ({officerTitle})
                    </span>
                  )}
                </div>

                <div className={`p-3 rounded-xl border ${isXenMatch ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/40' : 'bg-slate-50/50 border-slate-200'}`}>
                  <div className="h-12 border-b border-dashed border-slate-400 mb-2 flex items-center justify-center">
                    {isXenMatch && (
                      <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        ✓ Endorsed by Active Officer
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-slate-900 block">Executive Engineer (XEN)</span>
                  <span className="text-slate-500 text-[11px]">Peshawar City Division</span>
                  {isXenMatch && (
                    <span className="text-[10px] font-bold text-amber-800 block mt-1">
                      ({officerTitle})
                    </span>
                  )}
                </div>

                <div className={`p-3 rounded-xl border ${isSeMatch ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/40' : 'bg-slate-50/50 border-slate-200'}`}>
                  <div className="h-12 border-b border-dashed border-slate-400 mb-2 flex items-center justify-center">
                    {isSeMatch && (
                      <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        ✓ Endorsed by Active Officer
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-slate-900 block">
                    Superintending Engineer / Planning
                  </span>
                  <span className="text-slate-500 text-[11px]">Planning, Design & ELR Directorate</span>
                  {isSeMatch && (
                    <span className="text-[10px] font-bold text-amber-800 block mt-1">
                      ({officerTitle})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 no-print">
          <div>
            Document: <strong>Official WAPDA ELR Form & Technical Report</strong> · Per-Page Mode: <strong>{pageBreakMode === 'page_per_section' ? 'Page-by-Page' : 'Continuous'}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Print Document
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
