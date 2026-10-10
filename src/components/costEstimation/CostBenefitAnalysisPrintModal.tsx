/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { X, Printer, Download, Maximize2, Minimize2, Calculator, Loader2 } from 'lucide-react';
import { exportElementToPdf } from '../../utils/pdfExport';

interface CostBenefitAnalysisPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    workOrderNo?: string;
    elrCode?: string;
    estimateNo?: string;
    schemeProjectName?: string;
    accountHead?: string;
    projectCost: number;
    existingPowerLossKw: number;
    existingEnergyLossKwh: number;
    existingPowerFactor: number;
    existingVoltageDrop: number;
    improvedPowerLossKw: number;
    improvedEnergyLossKwh: number;
    improvedPowerFactor: number;
    improvedVoltageDrop: number;
    reductionPowerLossKw: number;
    baseEnergyLossReductionKwh: number;
    loadGrowthPercent: number;
    discountRatePercent: number;
    studyPeriodYears: number;
    demandChargesRate: number;
    energyChargesRate: number;
    yearlyProjections: {
      rows: Array<{
        year: number;
        energySavingsKwh: number;
        demandSavingsKw: number;
        energyBenefit: number;
        demandBenefit: number;
        totalAnnualBenefit: number;
        pvFactor: number;
        presentValueBenefit: number;
      }>;
      totalPvBenefits: number;
      bcr: number;
      isViable: boolean;
    };
  };
}

export const CostBenefitAnalysisPrintModal: React.FC<CostBenefitAnalysisPrintModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  const [isMaximized, setIsMaximized] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSavePdf = async () => {
    if (!printContentRef.current) return;
    setIsGeneratingPdf(true);
    try {
      await exportElementToPdf(printContentRef.current, {
        filename: `PESCO_CBA_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
        paperSize: 'a4',
        orientation: 'portrait',
        marginMm: 10
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${isMaximized ? 'bg-slate-950 p-0 overflow-hidden flex flex-col' : 'bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto'} print:p-0 print:bg-white print:static print:overflow-visible`}>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
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
          .no-print {
            display: none !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-watermark {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 500px !important;
            height: 500px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            pointer-events: none !important;
            z-index: 0 !important;
            opacity: 0.05 !important;
            -webkit-print-color-adjust: exact !important;
          }
          thead.print-running-header {
            display: table-header-group !important;
          }
          table.print-doc-table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* Official Watermark */}
      <div aria-hidden="true" className="print-watermark hidden print:flex items-center justify-center pointer-events-none select-none">
        <img src="/pesco-logo.svg" alt="Watermark" className="w-[500px] h-[500px] object-contain opacity-5" />
      </div>

      <div className={`bg-white w-full ${isMaximized ? 'h-full max-w-none rounded-none' : 'max-w-5xl rounded-2xl max-h-[94vh]'} flex flex-col overflow-hidden shadow-2xl print:shadow-none print:border-none print:max-h-none print:h-auto`}>
        
        {/* Action Bar */}
        <div className="p-3.5 sm:px-6 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 no-print border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm block leading-tight">
                FLADIX · Cost Benefit Analysis Report (BCR)
              </span>
              <span className="text-[11px] text-slate-400">
                Study Period: {data.studyPeriodYears} Years · Discount Rate: {data.discountRatePercent}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSavePdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/50 rounded-lg transition-colors cursor-pointer"
            >
              {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Save as PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document */}
        <div ref={printContentRef} className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 text-slate-900 bg-white" id="printable-cba-report">
          <div className="print-page-unit space-y-6 max-w-4xl mx-auto">
            <table className="w-full border-none border-collapse print-doc-table">
            <thead className="print-running-header">
              <tr>
                <th className="font-normal text-left p-0 pb-4 border-b-2 border-slate-900">
                  <div className="flex items-center justify-between gap-4">
                    <img src="/pesco-logo.svg" alt="PESCO Logo" className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 object-contain" />
                    <div className="text-center flex-1">
                      <div className="text-[11px] sm:text-xs uppercase tracking-widest font-extrabold text-slate-700 mb-0.5">
                        PESHAWAR ELECTRIC SUPPLY COMPANY (PESCO) · WAPDA
                      </div>
                      <h1 className="text-base sm:text-xl font-black text-slate-950 tracking-tight">
                        FLADIX, Feeder Loss Analysis and Data Indexing
                      </h1>
                      <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                        Economic Cost Benefit Analysis & Benefit-Cost Ratio (BCR) Report · System Rehabilitation
                      </div>
                    </div>
                    <div className="w-16 sm:w-20 shrink-0 text-center">
                      <div className="w-12 h-12 rounded-xl border-2 border-slate-900 flex flex-col items-center justify-center bg-slate-50 p-1">
                        <span className="text-[8px] font-black uppercase text-slate-900 leading-none">FLADIX</span>
                        <span className="text-[10px] font-black text-amber-600 leading-tight">BCR</span>
                      </div>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="p-0 pt-4 space-y-6">

                  {/* 11-Digit Work Order & ELR Tie-Up Header Banner */}
                  <div className="print-avoid-break bg-slate-50 border-2 border-slate-900 rounded-xl p-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-900 text-amber-400 font-mono font-black text-xs flex items-center justify-center">#</span>
                        <span className="text-xs font-bold text-slate-900">
                          11-DIGIT WORK ORDER NO: <strong className="font-mono text-slate-950 text-sm font-black tracking-wider">{data.workOrderNo || '26-14-71-26-042'}</strong>
                        </span>
                      </div>
                      <div className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                        ELR SCHEME CODE: {data.elrCode || 'ELR-71-26-042'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-sans">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Tied Estimate No:</span>
                        <strong className="font-mono text-slate-900">{data.estimateNo || 'EST-PESH-2026-00401'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Head of Account:</span>
                        <strong className="text-slate-900">{data.accountHead || '4-71 ELR Capital Loss Reduction'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Study Period:</span>
                        <strong className="font-mono text-slate-900">{data.studyPeriodYears} Years</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Economic Criterion:</span>
                        <strong className="text-emerald-700 font-bold">BCR ≥ 1.0 (Viable)</strong>
                      </div>
                    </div>
                  </div>

                  {/* Capital Cost & Parameters Summary */}
                  <div className="print-avoid-break space-y-2">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-blue-600">
                      1. Capital Investment & Economic Parameters
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Project Capital Cost:</span>
                        <strong className="text-blue-950 font-mono text-sm">Rs. {data.projectCost.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Study Period:</span>
                        <strong className="text-slate-900 font-mono">{data.studyPeriodYears} Years</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Discount Rate:</span>
                        <strong className="text-slate-900 font-mono">{data.discountRatePercent}%</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Annual Load Growth:</span>
                        <strong className="text-slate-900 font-mono">{data.loadGrowthPercent}%</strong>
                      </div>
                    </div>
                  </div>

                  {/* Baseline vs Improved */}
                  <div className="print-avoid-break grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-slate-200 rounded-lg p-3 text-xs space-y-2">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                        <span>Existing Baseline Conditions:</span>
                        <span className="text-amber-700 text-[10px]">Pre-Project</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-600 font-sans">Power Losses:</span>
                        <span>{data.existingPowerLossKw} kW</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-600 font-sans">Energy Losses:</span>
                        <span>{data.existingEnergyLossKwh.toLocaleString()} kWh</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-600 font-sans">Power Factor:</span>
                        <span>{data.existingPowerFactor}%</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-600 font-sans">Voltage Drop:</span>
                        <span>{data.existingVoltageDrop}%</span>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-lg p-3 text-xs space-y-2 bg-slate-50/70">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                        <span>Proposed Improvements (Post-Project):</span>
                        <span className="text-emerald-700 text-[10px]">Rehabilitated</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-600 font-sans">Power Losses:</span>
                        <span>{data.improvedPowerLossKw} kW</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-600 font-sans">Energy Losses:</span>
                        <span>{data.improvedEnergyLossKwh.toLocaleString()} kWh</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-600 font-sans">Power Factor:</span>
                        <span>{data.improvedPowerFactor}%</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-600 font-sans">Voltage Drop:</span>
                        <span>{data.improvedVoltageDrop}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Verdict Box */}
                  <div className={`print-avoid-break p-4 rounded-xl border-2 flex items-center justify-between text-xs font-sans ${
                    data.yearlyProjections.isViable ? 'bg-emerald-50 border-emerald-600 text-emerald-950' : 'bg-rose-50 border-rose-600 text-rose-950'
                  }`}>
                    <div>
                      <span className="text-[10px] uppercase font-extrabold tracking-wider block opacity-80">ECONOMIC VIABILITY VERDICT</span>
                      <strong className="text-base font-black">
                        {data.yearlyProjections.isViable ? '✨ VIABLE PROPOSAL (Present Value of Benefits Exceeds Capital Cost)' : '⚠️ NOT VIABLE (BCR below 1.0)'}
                      </strong>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-[10px] uppercase block">Benefit-Cost Ratio (BCR)</span>
                      <span className="text-2xl font-black">{data.yearlyProjections.bcr.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Cash Flow Table */}
                  <div className="print-avoid-break space-y-2">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-emerald-600">
                      2. Year-by-Year Discounted Benefit Cash Flow Projection
                    </h2>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-xs font-mono tabular-nums">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-200">
                            <th className="py-2.5 px-3 text-center">Year</th>
                            <th className="py-2.5 px-3 text-right">Energy Saved (kWh)</th>
                            <th className="py-2.5 px-3 text-right">Demand Saved (kW)</th>
                            <th className="py-2.5 px-3 text-right">Total Annual Benefit (Rs.)</th>
                            <th className="py-2.5 px-3 text-right">PV Factor</th>
                            <th className="py-2.5 px-3 text-right">Present Value (Rs.)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {data.yearlyProjections.rows.map(row => (
                            <tr key={row.year} className="hover:bg-slate-50">
                              <td className="py-2 px-3 text-center font-bold">Year {row.year}</td>
                              <td className="py-2 px-3 text-right">{Math.round(row.energySavingsKwh).toLocaleString()}</td>
                              <td className="py-2 px-3 text-right">{row.demandSavingsKw.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right font-bold text-blue-900">{Math.round(row.totalAnnualBenefit).toLocaleString()}</td>
                              <td className="py-2 px-3 text-right text-slate-500">{row.pvFactor.toFixed(4)}</td>
                              <td className="py-2 px-3 text-right font-black text-emerald-800 bg-emerald-50/40">
                                Rs. {Math.round(row.presentValueBenefit).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-900 text-white font-bold">
                            <td colSpan={5} className="py-3 px-3 text-right font-sans uppercase tracking-wider text-xs">
                              Total Present Value of Benefits (PV):
                            </td>
                            <td className="py-3 px-3 text-right text-amber-400 text-sm font-mono">
                              Rs. {Math.round(data.yearlyProjections.totalPvBenefits).toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="print-avoid-break pt-12 border-t-2 border-slate-900">
                    <div className="grid grid-cols-3 gap-6 text-center text-xs">
                      <div className="space-y-12">
                        <div className="border-b border-slate-400 pb-1">
                          <span className="font-bold text-slate-900 block font-mono text-[11px]">Engr. M. Inayat</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block uppercase">PREPARED BY</span>
                          <span className="text-slate-600 text-[11px] block">Sub-Divisional Officer (SDO)</span>
                          <span className="text-slate-500 text-[10px] block">PESCO Sub-Division</span>
                        </div>
                      </div>
                      <div className="space-y-12">
                        <div className="border-b border-slate-400 pb-1">
                          <span className="font-bold text-slate-900 block font-mono text-[11px]">Engr. Tariq Khan</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block uppercase">CHECKED & VERIFIED BY</span>
                          <span className="text-slate-600 text-[11px] block">Executive Engineer (XEN)</span>
                          <span className="text-slate-500 text-[10px] block">PESCO Division</span>
                        </div>
                      </div>
                      <div className="space-y-12">
                        <div className="border-b border-slate-400 pb-1">
                          <span className="font-bold text-slate-900 block font-mono text-[11px]">Engr. Abdul Rehman</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block uppercase">SANCTIONED & APPROVED BY</span>
                          <span className="text-slate-600 text-[11px] block">Superintending Engineer (SE)</span>
                          <span className="text-slate-500 text-[10px] block">PESCO Circle</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
};
