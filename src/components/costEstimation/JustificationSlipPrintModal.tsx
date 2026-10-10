/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { X, Printer, Download, Maximize2, Minimize2, FileText, Loader2 } from 'lucide-react';
import { exportElementToPdf } from '../../utils/pdfExport';
import { FladixOfficialHeader } from '../FladixOfficialHeader';

interface JustificationSlipPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    workOrderNo?: string;
    elrCode?: string;
    estimateNo?: string;
    schemeProjectName?: string;
    accountHead?: string;
    totalCost: number;
    existingLosses5Yrs: number;
    proposalALosses: number;
    proposalBLosses: number;
    proposalCLosses: number;
    proposalDLosses: number;
    totalProposalLosses: number;
    energySavingsKwh: number;
    energyRateA: number;
    annualBenefitA: number;
    existingTrfRating: number;
    trfLoadingPresent: number;
    trfLoading5Yrs: number;
    loadingAboveRated5Yrs: number;
    peakKwSaving: number;
    transformerAnnualKwh: number;
    benefitRateB: number;
    annualBenefitB: number;
    studyPeriodYears: number;
    totalAnnualBenefit: number;
    totalStudyPeriodBenefit: number;
    benefitCostRatio: number;
    isViable: boolean;
  };
}

export const JustificationSlipPrintModal: React.FC<JustificationSlipPrintModalProps> = ({
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
        filename: `PESCO_Justification_Slip_${new Date().toISOString().slice(0, 10)}.pdf`,
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
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm block leading-tight">
                FLADIX · System Rehabilitation Justification Slip
              </span>
              <span className="text-[11px] text-slate-400">
                Project Cost: Rs. {data.totalCost.toLocaleString()} · BCR: {data.benefitCostRatio.toFixed(2)}
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
              <span>Print Slip</span>
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
        <div ref={printContentRef} className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 text-slate-900 bg-white" id="printable-justification-slip">
          <div className="print-page-unit space-y-6 max-w-4xl mx-auto">
            <table className="w-full border-none border-collapse print-doc-table">
            <thead className="print-running-header">
              <tr>
                <th className="font-normal text-left p-0 pb-2">
                  <FladixOfficialHeader
                    subtitle="Official System Rehabilitation Justification Slip · Loss Reduction & Transformer Relief"
                    badgeLabel="SLIP"
                    badgeStd="WAPDA"
                    refCode={data.estimateNo}
                    category={data.accountHead}
                    division="Peshawar City"
                  />
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
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Sanction Authority:</span>
                        <strong className="text-slate-900">SE / CE (P&E) PESCO</strong>
                      </div>
                    </div>
                  </div>

                  {/* Project Capital Cost Summary */}
                  <div className="print-avoid-break space-y-2">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-blue-600">
                      Total Cost of Proposed Rehabilitation (Project Estimate)
                    </h2>
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-700 font-sans font-bold">Total Project Cost:</span>
                      <strong className="text-blue-950 text-sm">Rs. {data.totalCost.toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Part I: Line Loss Reduction */}
                  <div className="print-avoid-break space-y-2">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-amber-50 p-2 border-l-4 border-amber-600 flex items-center justify-between">
                      <span>Part-I: Annual Energy Losses & Line Rehabilitation Benefits (Proposal A)</span>
                      <span className="text-[10px] font-mono text-amber-900">Rate: Rs. {data.energyRateA} / kWh</span>
                    </h2>

                    <div className="border border-slate-200 rounded-lg p-3 text-xs space-y-2 font-mono bg-white">
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-700 font-sans">Existing Annual Energy Losses after 5 years (E₅):</span>
                        <span className="font-bold text-slate-900">{data.existingLosses5Yrs.toLocaleString()} kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-700 font-sans">Proposal A Losses after 5 years:</span>
                        <span className="font-bold text-slate-900">{data.proposalALosses.toLocaleString()} kWh</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-900 border-t border-slate-100 pt-1.5">
                        <span className="font-sans">Annual Energy Savings (Existing - Proposal A):</span>
                        <span>{data.energySavingsKwh.toLocaleString()} kWh</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-2 text-slate-900 font-black text-sm bg-amber-50/50 p-2 rounded">
                        <span className="font-sans">Annual Benefit A ({data.energySavingsKwh.toLocaleString()} × Rs. {data.energyRateA}):</span>
                        <span className="text-amber-800">Rs. {data.annualBenefitA.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                    </div>
                  </div>

                  {/* Part II: Transformer Loading & Peak Saving */}
                  <div className="print-avoid-break space-y-2">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-purple-50 p-2 border-l-4 border-purple-600 flex items-center justify-between">
                      <span>Part-II: Transformer Loading & Peak KW Saving (Proposal B)</span>
                      <span className="text-[10px] font-mono text-purple-900">Rate: Rs. {data.benefitRateB} / kWh</span>
                    </h2>

                    <div className="border border-slate-200 rounded-lg p-3 text-xs space-y-2 font-mono bg-white">
                      <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-100">
                        <div>
                          <span className="text-slate-600 font-sans block">Existing T/F Rating:</span>
                          <strong className="text-slate-900">{data.existingTrfRating} kVA</strong>
                        </div>
                        <div>
                          <span className="text-slate-600 font-sans block">Present Loading:</span>
                          <strong className="text-slate-900">{data.trfLoadingPresent}%</strong>
                        </div>
                        <div>
                          <span className="text-slate-600 font-sans block">Loading after 5 years:</span>
                          <strong className="text-slate-900">{data.trfLoading5Yrs}%</strong>
                        </div>
                        <div>
                          <span className="text-slate-600 font-sans block">Overload above rating:</span>
                          <strong className="text-slate-900">{data.loadingAboveRated5Yrs}% (= {data.loadingAboveRated5Yrs} kVA)</strong>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-700 font-sans">Peak kW Saving (Overload kVA × power factor 0.8):</span>
                        <span className="font-bold text-slate-900">{data.peakKwSaving} kW</span>
                      </div>
                      <div className="flex justify-between font-bold text-purple-900">
                        <span className="font-sans">Annual kWh (kW × 8,760 × Load Factor 0.3):</span>
                        <span>{data.transformerAnnualKwh.toLocaleString()} kWh</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-2 text-slate-900 font-black text-sm bg-purple-50/50 p-2 rounded">
                        <span className="font-sans">Annual Benefit B ({data.transformerAnnualKwh.toLocaleString()} × Rs. {data.benefitRateB}):</span>
                        <span className="text-purple-800">Rs. {data.annualBenefitB.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                    </div>
                  </div>

                  {/* Part III: Summary & BCR Verdict */}
                  <div className={`print-avoid-break p-4 rounded-xl border-2 space-y-3 ${
                    data.isViable ? 'bg-emerald-50 border-emerald-600 text-emerald-950' : 'bg-rose-50 border-rose-600 text-rose-950'
                  }`}>
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                      <span className="text-xs uppercase font-extrabold tracking-wider">Part-III: Final Justification & Benefit / Cost Ratio (BCR)</span>
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase ${
                        data.isViable ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}>
                        {data.isViable ? 'VIABLE PROPOSAL' : 'NOT VIABLE'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div>
                        <span className="text-slate-600 font-sans block">Total Annual Benefit (A + B):</span>
                        <strong className="text-slate-900 text-sm">Rs. {data.totalAnnualBenefit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                      </div>
                      <div>
                        <span className="text-slate-600 font-sans block">{data.studyPeriodYears}-Year Total Benefit:</span>
                        <strong className="text-amber-900 text-sm">Rs. {data.totalStudyPeriodBenefit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
                      <div>
                        <span className="font-sans text-xs font-bold block">Benefit / Cost Ratio Formula: ({data.studyPeriodYears} × Annual Benefit A+B) / Project Cost</span>
                        <span className="text-[11px] opacity-80">Study Period: {data.studyPeriodYears} years with no discounting</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-xs uppercase block font-bold">BCR</span>
                        <span className="text-3xl font-black text-amber-800">{data.benefitCostRatio.toFixed(2)}</span>
                      </div>
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
