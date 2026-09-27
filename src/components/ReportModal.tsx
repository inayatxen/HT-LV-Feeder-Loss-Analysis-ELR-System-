/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FeederData, 
  FeederAnalysisSummary 
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
  Award
} from 'lucide-react';
import { generateTechnicalRecommendations } from '../utils/elrEngine';
import { JobTitle, JOB_TITLE_OPTIONS } from '../types/feeder';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeder: FeederData;
  summary: FeederAnalysisSummary;
  proposedSummary: FeederAnalysisSummary;
  activeTransformerKva?: number;
  selectedJobTitle?: JobTitle;
  onUpdateJobTitle?: (title: string) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  feeder,
  summary,
  proposedSummary,
  activeTransformerKva,
  selectedJobTitle = 'Sub-Divisional Officer (SDO)',
  onUpdateJobTitle
}) => {
  const [displayMode, setDisplayMode] = useState<
    'full_report' | 'input_form_image1' | 'output_schedule_image2' | 'dual_form' | 'table1_matrix'
  >('full_report');

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 print:m-0 print:shadow-none print:border-none print:rounded-none flex flex-col max-h-[94vh] print:max-h-none">
        
        {/* Top Action Bar (hidden when printing) */}
        <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 no-print border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm block leading-tight">
                WAPDA / DISCO Feeder Loss Analysis & ELR Report
              </span>
              <span className="text-[11px] text-slate-400">
                Official Form Display & Engineering Dossier
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
            Format: <strong>WAPDA ELR Standard</strong>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div className="p-6 sm:p-10 text-slate-900 space-y-8 bg-white overflow-y-auto flex-1 print:overflow-visible print:p-0" id="printable-report">
          
          {/* Official Letterhead Header */}
          <div className="text-center border-b-2 border-slate-900 pb-5">
            <div className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">
              Water and Power Development Authority (WAPDA) / Distribution Company
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
              ENERGY LOSS REDUCTION (ELR) ENGINEERING REPORT
            </h1>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              Feeder Loading, Transformer Overloading, Line Losses & Upgradation Study
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs font-mono text-slate-500 mt-2.5">
              <span>Ref: ELR-WAPDA-{feeder.id.toUpperCase()}</span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span>Date: {today}</span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span>Category: <strong>{feeder.category === 'HV' ? '11kV High Tension (HT)' : '400V Low Tension (LT)'}</strong></span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span>Division: Peshawar City</span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Prepared by: <strong>{officerTitle}</strong>
              </span>
            </div>
          </div>

          {/* Section 1: Feeder & Network Specifications */}
          {(displayMode === 'full_report' || displayMode === 'input_form_image1' || displayMode === 'table1_matrix') && (
            <div>
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

          {/* Section 2: FORM DISPLAY - INPUT DATA FORM (image1.png) */}
          {(displayMode === 'full_report' || displayMode === 'input_form_image1' || displayMode === 'dual_form') && (
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 bg-slate-100 p-2 border-l-4 border-blue-600 flex items-center justify-between">
                <span>FORM DISPLAY A: FEEDER SPANS INPUT DATA TABLE (image1.png)</span>
                <span className="text-[10px] font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {summary.segmentResults.length} Spans Loaded
                </span>
              </h2>
              <p className="text-xs text-slate-600 mb-2">
                As recorded in WAPDA field survey for Gulbhar Colony Feeder (Ref. image1.png):
              </p>
              
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                      <th className="py-2 px-2.5 text-center w-10">#</th>
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
                        <td className="py-1.5 px-2.5 text-center text-slate-400 font-sans text-[11px]">{idx + 1}</td>
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
                      <td colSpan={3} className="py-2 px-3 text-center text-amber-400 uppercase tracking-wider font-sans text-xs">
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

          {/* Section 3: FORM DISPLAY - CALCULATED OUTPUT SCHEDULE (image2.png) */}
          {(displayMode === 'full_report' || displayMode === 'output_schedule_image2' || displayMode === 'dual_form') && (
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 bg-slate-100 p-2 border-l-4 border-emerald-600 flex items-center justify-between">
                <span>FORM DISPLAY B: CALCULATED SEGMENT LOAD FLOW & LOSS SCHEDULE (image2.png)</span>
                <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Line Loss: {summary.totalLineLossKw} kW
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
                        <td className="py-1.5 px-2 text-center font-bold text-slate-900">{seg.fromNodeId.replace('.0', '')}</td>
                        <td className="py-1.5 px-2 text-center font-bold text-slate-900">{seg.toNodeId.replace('.0', '')}</td>
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
                      <td colSpan={3} className="py-2.5 px-2 text-center text-amber-400 uppercase tracking-wider font-sans text-xs">
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

          {/* Section 4: Table 1 Upgradation Benchmark Matrix */}
          {(displayMode === 'full_report' || displayMode === 'table1_matrix') && (
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 bg-slate-100 p-2 border-l-4 border-amber-500 flex items-center justify-between">
                <span>3. Comparative Upgradation & Loss Relief Matrix (WAPDA Study Table 1)</span>
                <span className="text-[10px] font-mono text-slate-500 font-normal">Economics: PKR 38.5 / kWh</span>
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
                    <tr>
                      <td className="p-2 font-sans font-semibold text-slate-800">Transformer Capacity</td>
                      <td className="p-2 text-right">{currentTrfKva} kVA</td>
                      <td className="p-2 text-right bg-emerald-50 text-emerald-900 font-bold">{summary.proposedTransformerKva} kVA</td>
                      <td className="p-2 text-right font-sans text-emerald-700">Augmented +100 kVA</td>
                      <td className="p-2 text-right">{currentTrfKva} kVA</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-sans font-semibold text-slate-800">Transformer Loading</td>
                      <td className="p-2 text-right font-bold text-rose-700">{currentTrfLoading}%</td>
                      <td className="p-2 text-right bg-emerald-50 text-emerald-900 font-bold">{summary.proposedTransformerLoadingPercent}%</td>
                      <td className="p-2 text-right font-bold text-emerald-700">-{currentTrfLoading - summary.proposedTransformerLoadingPercent}% Overload Relieved</td>
                      <td className="p-2 text-right font-bold text-rose-800">151%</td>
                    </tr>
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

          {/* Section 5: Specific Technical Recommendations */}
          {(displayMode === 'full_report') && (
            <div>
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

          {/* Section 6: Official Approvals & Signatures */}
          <div className="pt-6 border-t-2 border-slate-900">
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

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 no-print">
          <div>
            Document: <strong>Official WAPDA ELR Form & Technical Report</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer"
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
