/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CostEstimateRecord } from '../../types/costEstimation';
import { exportEstimateToExcelWorkbook, format11DigitWorkOrder } from '../../utils/costEngine';
import { X, Printer, Download, Maximize2, Minimize2, CheckCircle2, ShieldCheck } from 'lucide-react';

interface EstimatePrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimate: CostEstimateRecord | null;
}

export const EstimatePrintReportModal: React.FC<EstimatePrintReportModalProps> = ({
  isOpen,
  onClose,
  estimate
}) => {
  const [isMaximized, setIsMaximized] = useState(true);

  if (!isOpen || !estimate) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalKm = (estimate.lineDetails.htLengthKm || 0) + (estimate.lineDetails.ltLengthKm || 0);

  // Check whether estimate is 50 kVA, 100 kVA, 200 kVA or 1.0 KM HT H-Type Lump Sum Package
  const is1KmHtDogHTypePackage = Boolean(
    estimate.lineDetails?.is1KmHtDogHTypePackage ||
    estimate.projectInfo?.schemeProjectName?.includes('H-Type Steel Structures') ||
    estimate.projectInfo?.purposeOfWork?.includes('H-Type Steel Structures') ||
    estimate.id?.includes('1km-dog-h-type') ||
    estimate.items?.some(i => i.materialCode === '01210')
  );

  const is200KvaPackage = Boolean(
    estimate.lineDetails?.transformerCapacityKva === 200 ||
    estimate.lineDetails?.is200KvaLumpSumPackage ||
    estimate.projectInfo?.schemeProjectName?.includes('200 KVA') ||
    estimate.projectInfo?.purposeOfWork?.includes('200 KVA') ||
    estimate.id?.includes('200kva') ||
    estimate.items?.some(i => i.materialCode === '08140')
  );

  const is100KvaPackage = Boolean(
    estimate.lineDetails?.transformerCapacityKva === 100 ||
    estimate.lineDetails?.is100KvaLumpSumPackage ||
    estimate.projectInfo?.schemeProjectName?.includes('100 KVA') ||
    estimate.projectInfo?.purposeOfWork?.includes('100 KVA') ||
    estimate.id?.includes('100kva') ||
    estimate.items?.some(i => i.materialCode === '08130')
  );

  const is50KvaPackage = Boolean(
    estimate.lineDetails?.transformerCapacityKva === 50 ||
    estimate.lineDetails?.is50KvaLumpSumPackage ||
    estimate.projectInfo?.schemeProjectName?.includes('50 KVA') ||
    estimate.projectInfo?.purposeOfWork?.includes('50 KVA') ||
    estimate.id?.includes('50kva') ||
    estimate.items?.some(i => i.materialCode === '08120')
  );

  // If 50 kVA Transformer Lump Sum BOQ, replace any 25 kVA transformer item with 50 kVA Transformer store code=08120 with Material Rate=434200
  const renderedItems = estimate.items.map(item => {
    if (is50KvaPackage && (item.materialCode === '08110' || item.description?.includes('25 KVA') || (item.materialCode === '08120' && item.unitRate !== 434200))) {
      return {
        ...item,
        id: 'item-08120',
        materialId: 'mat-trf-50kva',
        materialCode: '08120',
        description: 'TRANSFORMER 50 KVA',
        specification: 'Distribution Transformer 50 kVA 11/0.415 kV Copper Wound (WAPDA Code 08120)',
        unit: 'EA',
        quantity: 1,
        unitRate: 434200,
        materialAmount: 434200,
        labourRate: 43420,
        labourAmount: 43420,
        totalAmount: 477620,
        calculationNotes: '50 kVA Transformer Installation Schedule item: 10% Labour Cost applied'
      };
    }
    return item;
  }).filter(item => {
    if ((is50KvaPackage || is100KvaPackage || is200KvaPackage) && ((estimate.lineDetails.htLengthKm || 0) === 0 && (estimate.lineDetails.ltLengthKm || 0) === 0)) {
      return item.materialCode !== '15310' && !item.description.toUpperCase().includes('STAY ROD');
    }
    return true;
  });

  const materialCost = Number(renderedItems.reduce((sum, item) => sum + (Number(item.materialAmount) || 0), 0).toFixed(2));
  const labourCost = Number(renderedItems.reduce((sum, item) => sum + (Number(item.labourAmount) || 0), 0).toFixed(2));
  
  const isLumpSumOverhead = estimate.charges.overheadBasis === 'MATERIAL' || is50KvaPackage || is100KvaPackage || is200KvaPackage || is1KmHtDogHTypePackage;
  const deptPercent = estimate.charges.departmentalOverheadPercent || 6.0;
  const contPercent = estimate.charges.contractorOverheadPercent || 10.0;
  const deptOverhead = isLumpSumOverhead
    ? Number((materialCost * (deptPercent / 100)).toFixed(2))
    : estimate.charges.departmentalOverheadAmount;
  const contOverhead = isLumpSumOverhead
    ? Number((materialCost * (contPercent / 100)).toFixed(2))
    : estimate.charges.contractorOverheadAmount;
  const totalOverheads = Number((deptOverhead + contOverhead).toFixed(2));
  const grandTotal = isLumpSumOverhead
    ? Number((materialCost + labourCost + totalOverheads + (estimate.charges.transportationCost || 0) + (estimate.charges.taxGstAmount || 0)).toFixed(2))
    : estimate.charges.grandTotal;

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
          .print-page-break {
            break-before: page !important;
            page-break-before: always !important;
          }
          .print-watermark {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 500px !important;
            max-width: 75vw !important;
            height: 500px !important;
            max-height: 75vh !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            pointer-events: none !important;
            z-index: 0 !important;
            mix-blend-mode: multiply !important;
            opacity: 0.05 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
      <div 
        aria-hidden="true" 
        className="print-watermark hidden print:flex items-center justify-center pointer-events-none select-none"
      >
        <img
          src="/pesco-logo.svg"
          alt="Official PESCO WAPDA Logo Watermark"
          className="w-[500px] h-[500px] max-w-[75vw] max-h-[75vh] object-contain opacity-5"
        />
      </div>

      <div className={`bg-white w-full ${isMaximized ? 'h-full max-w-none rounded-none' : 'max-w-5xl rounded-2xl max-h-[94vh]'} flex flex-col overflow-hidden shadow-2xl print:shadow-none print:border-none print:max-h-none print:h-auto`}>
        
        {/* Top Action Bar (Hidden on print) */}
        <div className="p-3.5 sm:px-6 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 no-print border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/pesco-logo.svg"
              alt="PESCO Logo"
              className="w-12 h-12 rounded-full border-2 border-amber-500/60 shadow-md shrink-0"
            />
            <div>
              <span className="font-bold text-xs sm:text-sm block leading-tight">
                FLADIX · Official Estimate & BOQ Dossier
              </span>
              <span className="text-[11px] text-slate-400">
                {estimate.projectInfo.estimateNo} · {estimate.projectInfo.revisionNo} ({estimate.status})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportEstimateToExcelWorkbook(estimate)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export .xlsx</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title={isMaximized ? "Restore Window" : "Full Screen"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body wrapped in table structure for repeating headers on ALL PDF pages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 text-slate-900 bg-white" id="printable-estimate">
          
          <table className="w-full border-none border-collapse print-doc-table">
            {/* ========================================================
                RUNNING HEADER FOR ALL PDF PAGES (repeats via table-header-group)
               ======================================================== */}
            <thead className="print-running-header">
              <tr>
                <th className="font-normal text-left p-0 pb-3 border-b-2 border-slate-900">
                  <div className="flex items-center justify-between gap-4">
                    <img
                      src="/pesco-logo.svg"
                      alt="PESCO Logo"
                      className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 object-contain"
                    />
                    
                    <div className="text-center flex-1">
                      <div className="text-[11px] sm:text-xs uppercase tracking-widest font-extrabold text-slate-700 mb-0.5">
                        PESHAWAR ELECTRIC SUPPLY COMPANY (PESCO) · WAPDA
                      </div>
                      <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-950 tracking-tight">
                        FLADIX, Feeder Loss Analysis and Data Indexing
                      </h1>
                      <div className="text-[11px] sm:text-xs font-semibold text-slate-600 mt-0.5">
                        Detailed Electrical Line Extension & BOQ Schedule · {estimate.type.replace(/_/g, ' ')}
                      </div>
                    </div>

                    <div className="hidden sm:flex flex-col items-center justify-center w-16 sm:w-20 shrink-0 text-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-slate-900 flex flex-col items-center justify-center bg-slate-50 p-1">
                        <span className="text-[8px] sm:text-[9px] font-black uppercase text-slate-900 leading-none">FLADIX</span>
                        <span className="text-[10px] sm:text-[11px] font-black text-amber-600 leading-tight">EST</span>
                        <span className="text-[7px] sm:text-[8px] font-bold text-slate-600 leading-none">WAPDA</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-5 text-xs font-mono text-slate-600 mt-2.5 pt-2 border-t border-slate-200">
                    <span>Est No: <strong>{estimate.projectInfo.estimateNo}</strong></span>
                    <span>·</span>
                    <span>11-Digit W.O.: <strong className="text-amber-950 bg-amber-100 px-1.5 py-0.5 rounded font-black border border-amber-300">{format11DigitWorkOrder(estimate.projectInfo.workOrderNo) || '26-14-71-26-042'}</strong></span>
                    <span>·</span>
                    <span>ELR Code: <strong className="text-blue-950">{estimate.projectInfo.elrCode || 'ELR-71-26-042'}</strong></span>
                    <span>·</span>
                    <span>Rev: <strong>{estimate.projectInfo.revisionNo}</strong></span>
                    <span>·</span>
                    <span>Date: <strong>{estimate.projectInfo.estimateDate}</strong></span>
                    <span>·</span>
                    <span>Division: <strong>{estimate.projectInfo.division}</strong></span>
                    <span>·</span>
                    <span>Status: <strong className="text-blue-900 font-bold">{estimate.status}</strong></span>
                  </div>
                </th>
              </tr>
            </thead>

            {/* Document Body Content */}
            <tbody>
              <tr>
                <td className="p-0 pt-4 space-y-6">

          {/* 2. Project & Administrative Details Table */}
          <div className="print-avoid-break space-y-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-blue-600">
              1. Project & Scheme Administrative Information
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border border-slate-200 p-3 rounded-lg bg-slate-50/50">
              <div>
                <span className="text-slate-500 block text-[11px]">Scheme / Project:</span>
                <span className="font-bold text-slate-900">{estimate.projectInfo.schemeProjectName || 'Line Extension'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Location / Village:</span>
                <span className="font-bold text-slate-900">{estimate.projectInfo.proposedLocation}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Parent Feeder:</span>
                <span className="font-bold text-slate-900">{estimate.projectInfo.feederName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">GPS Coordinates:</span>
                <span className="font-mono text-slate-900">{estimate.projectInfo.gpsLatitude}, {estimate.projectInfo.gpsLongitude}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Sub-Division:</span>
                <span className="font-medium text-slate-800">{estimate.projectInfo.subDivision}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Circle / District:</span>
                <span className="font-medium text-slate-800">{estimate.projectInfo.circle} / {estimate.projectInfo.district}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Applicant / Department:</span>
                <span className="font-medium text-slate-800">{estimate.projectInfo.applicantDepartment || 'Departmental Work'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Scope of Work:</span>
                <span className="font-bold text-blue-900">{estimate.type.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          {/* 3. Technical Line Parameters */}
          <div className="print-avoid-break space-y-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-amber-500">
              2. Technical Line & Structure Parameters
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs border border-slate-200 p-3 rounded-lg bg-white">
              <div>
                <span className="text-slate-500 block text-[11px]">HT Length:</span>
                <span className="font-mono font-bold text-slate-900">{estimate.lineDetails.htLengthKm} km</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">LT Length:</span>
                <span className="font-mono font-bold text-slate-900">{estimate.lineDetails.ltLengthKm} km</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">HT Poles:</span>
                <span className="font-mono font-bold text-slate-900">{estimate.lineDetails.htPoles} Nos</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">LT Poles:</span>
                <span className="font-mono font-bold text-slate-900">{estimate.lineDetails.ltPoles} Nos</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Stay Sets:</span>
                <span className="font-mono font-bold text-slate-900">{estimate.lineDetails.staySets} Sets</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Transformer:</span>
                <span className="font-mono font-bold text-slate-900">
                  {estimate.lineDetails.transformerCapacityKva > 0 ? `${estimate.lineDetails.transformerCapacityKva} kVA` : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Detailed BOQ Table */}
          <div className="print-avoid-break space-y-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-emerald-600 flex items-center justify-between">
              <span>
                {estimate.charges.overheadBasis === 'MATERIAL'
                  ? '3. Detailed Bill of Quantities (BOQ) Materials Schedule'
                  : '3. Detailed Bill of Quantities (BOQ) & Erection Schedule'}
              </span>
              <span className="text-[10px] font-mono text-slate-500">Standard PESCO CSR-2026</span>
            </h2>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300">
                    <th className="py-2 px-2 text-center w-8">Sr.</th>
                    <th className="py-2 px-2.5">Code</th>
                    <th className="py-2 px-3">Description & Material Specifications</th>
                    <th className="py-2 px-2 text-center">Unit</th>
                    <th className="py-2 px-2.5 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Material Rate</th>
                    <th className="py-2 px-3 text-right">Material (PKR)</th>
                    <th className="py-2 px-3 text-right">Labour (PKR)</th>
                    <th className="py-2 px-3 text-right">Total Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono tabular-nums text-[11px]">
                  {renderedItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-1.5 px-2 text-center text-slate-500 font-sans">{idx + 1}</td>
                      <td className="py-1.5 px-2.5 font-bold text-slate-900">{item.materialCode}</td>
                      <td className="py-1.5 px-3 font-sans">
                        <span className="font-bold text-slate-900 block leading-tight">{item.description}</span>
                        <span className="text-[10px] text-slate-500 block line-clamp-1">{item.specification}</span>
                      </td>
                      <td className="py-1.5 px-2 text-center font-sans text-slate-700">{item.unit}</td>
                      <td className="py-1.5 px-2.5 text-right font-bold">{item.quantity}</td>
                      <td className="py-1.5 px-3 text-right">{item.unitRate.toLocaleString()}</td>
                      <td className="py-1.5 px-3 text-right font-bold text-slate-900">{item.materialAmount.toLocaleString()}</td>
                      <td className="py-1.5 px-3 text-right text-slate-700">{item.labourAmount.toLocaleString()}</td>
                      <td className="py-1.5 px-3 text-right font-bold text-slate-950 bg-slate-50/50">{item.totalAmount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {/* BOQ Subtotal Row */}
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={6} className="py-2 px-3 text-right font-sans uppercase">
                      Subtotal (Material & Labour Prime Cost):
                    </td>
                    <td className="py-2 px-3 text-right">PKR {materialCost.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">PKR {labourCost.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-blue-950 font-black">
                      PKR {(materialCost + labourCost).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Additional Charges & Estimate Grand Summary */}
          <div className="print-avoid-break space-y-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-slate-800">
              4. Abstract of Cost & Departmental Overheads
            </h2>

            {isLumpSumOverhead ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">A. Total Material Cost (18 WAPDA Items):</span>
                    <span className="font-bold">PKR {materialCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">B. Total Labour Cost (10% on Material Cost):</span>
                    <span className="font-bold text-rose-700">PKR {labourCost.toLocaleString()}</span>
                  </div>
                  {estimate.charges.transportationCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-sans">C. Transportation & Hauling:</span>
                      <span className="font-bold">PKR {estimate.charges.transportationCost.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                    <span className="font-sans">Subtotal (Material + 10% Labour):</span>
                    <span>PKR {(materialCost + labourCost).toLocaleString()}</span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 font-mono bg-slate-50">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">C. Departmental Overhead ({deptPercent}% on Material):</span>
                    <span>PKR {deptOverhead.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">D. Contractor Overhead ({contPercent}% on Material):</span>
                    <span>PKR {contOverhead.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-blue-900">
                    <span className="font-sans">Total Over Heads (16% on Material):</span>
                    <span>PKR {totalOverheads.toLocaleString()}</span>
                  </div>
                  {estimate.charges.taxGstAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-sans">E. Applicable Taxes / GST:</span>
                      <span>PKR {estimate.charges.taxGstAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">A. Total Material Cost:</span>
                    <span className="font-bold">PKR {estimate.charges.materialCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">B. Total Labour / Erection Charges:</span>
                    <span className="font-bold">PKR {estimate.charges.labourCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">C. Transportation, Hauling & Loading:</span>
                    <span className="font-bold">PKR {estimate.charges.transportationCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                    <span className="font-sans">Base Prime Cost (A + B + C):</span>
                    <span>PKR {(estimate.charges.materialCost + estimate.charges.labourCost + estimate.charges.transportationCost).toLocaleString()}</span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 font-mono bg-slate-50">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">D. Engineering & Supervision ({estimate.charges.engineeringChargesPercent}%):</span>
                    <span>PKR {estimate.charges.engineeringChargesAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">E. Contingency Allowance ({estimate.charges.contingencyPercent}%):</span>
                    <span>PKR {estimate.charges.contingencyAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">F. Departmental Overhead ({estimate.charges.departmentalOverheadPercent}%):</span>
                    <span>PKR {estimate.charges.departmentalOverheadAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">G. Contractor Overhead ({estimate.charges.contractorOverheadPercent}%):</span>
                    <span>PKR {estimate.charges.contractorOverheadAmount.toLocaleString()}</span>
                  </div>
                  {estimate.charges.taxGstAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-sans">H. Applicable Taxes / GST:</span>
                      <span>PKR {estimate.charges.taxGstAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Grand Total Banner */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">
                  {isLumpSumOverhead ? 'NET ESTIMATED COST (GRAND TOTAL)' : 'SANCTIONED ESTIMATE TOTAL'}
                </span>
                <span className="text-xs text-slate-300">
                  {isLumpSumOverhead 
                    ? `${is50KvaPackage ? '50' : (estimate.lineDetails.transformerCapacityKva || 25)} KVA Transformer Installation Package · Material + 10% Labour + 16% Over Heads` 
                    : `Total Project Length: ${totalKm.toFixed(2)} km`}
                </span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-amber-400 font-mono">
                  PKR {grandTotal.toLocaleString()}
                </div>
                {isLumpSumOverhead ? (
                  <span className="text-[11px] text-emerald-400 font-mono font-bold">
                    Net Package Cost: PKR {grandTotal.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-400 font-mono font-bold">
                    Cost per km: PKR {estimate.charges.costPerKm.toLocaleString()} / km
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dismantle Material Estimate Section (Part-II) */}
          {estimate.dismantledItems && estimate.dismantledItems.length > 0 && (
            <div className="print-avoid-break space-y-3 pt-6 border-t-2 border-dashed border-slate-350">
              <div className="bg-slate-50 border-l-4 border-amber-600 p-2 rounded-r-lg">
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-bold">II</span>
                  <span>Part-II: Retired & Dismantled Material Credit Estimate Schedule</span>
                </h3>
                <p className="text-[10px] text-amber-800 mt-0.5">
                  Estimate prepared for the materials retired and dismantled from site. Credit value of retired materials is calculated at 1/3 (one-third) of standard CSR CSR-2026 rates.
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-[11px] font-mono tabular-nums">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-200">
                      <th className="py-1.5 px-2 text-center w-8">Sr.</th>
                      <th className="py-1.5 px-2.5">Code</th>
                      <th className="py-1.5 px-3">Retired Material Description</th>
                      <th className="py-1.5 px-2 text-center">Unit</th>
                      <th className="py-1.5 px-2.5 text-right">Qty</th>
                      <th className="py-1.5 px-3 text-right">Standard Rate</th>
                      <th className="py-1.5 px-3 text-right">Dismantled Rate (1/3)</th>
                      <th className="py-1.5 px-3 text-right">Material Credit (PKR)</th>
                      <th className="py-1.5 px-3 text-right">Dismantling Labour (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[10px]">
                    {estimate.dismantledItems.map((item, idx) => {
                      const stdRate = item.unitRate * 3; // backtrack standard rate for display
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-1 px-2 text-center text-slate-500 font-sans">{idx + 1}</td>
                          <td className="py-1 px-2.5 font-bold text-slate-900">{item.materialCode}</td>
                          <td className="py-1 px-3 font-sans">
                            <span className="font-bold text-slate-900 block leading-tight">{item.description}</span>
                            <span className="text-[9px] text-slate-500 block leading-tight">{item.specification}</span>
                          </td>
                          <td className="py-1 px-2 text-center font-sans text-slate-600">{item.unit}</td>
                          <td className="py-1 px-2.5 text-right font-bold text-slate-900">{item.quantity}</td>
                          <td className="py-1 px-3 text-right text-slate-500">{stdRate.toLocaleString()}</td>
                          <td className="py-1 px-3 text-right font-semibold text-amber-700">{item.unitRate.toLocaleString()}</td>
                          <td className="py-1 px-3 text-right font-bold text-slate-900">{item.materialAmount.toLocaleString()}</td>
                          <td className="py-1 px-3 text-right text-slate-600">{(item.labourAmount || 0).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                    {/* Totals Row */}
                    {estimate.dismantledCharges && (
                      <tr className="bg-amber-50/40 font-bold text-slate-900 border-t border-amber-200">
                        <td colSpan={7} className="py-1.5 px-3 text-right font-sans uppercase text-[10px]">
                          Total Dismantle Estimate Salvage Credit:
                        </td>
                        <td className="py-1.5 px-3 text-right text-amber-900">
                          Rs. {estimate.dismantledCharges.materialCost.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-3 text-right text-slate-700">
                          Rs. {estimate.dismantledCharges.labourCost.toLocaleString()}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Net Summary Bar */}
              {estimate.dismantledCharges && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs font-mono font-semibold flex items-center justify-between text-amber-900 print:mb-6">
                  <span>NET SALVAGE VALUE / ASSET RETIREMENT CREDIT:</span>
                  <span className="font-black text-sm">
                    Rs. {(estimate.dismantledCharges.materialCost + estimate.dismantledCharges.labourCost).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 6. Official Signatures Section */}
          <div className="print-avoid-break pt-8 border-t-2 border-slate-900">
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-12">
                <div className="border-b border-slate-400 pb-1">
                  <span className="font-bold text-slate-900 block font-mono text-[11px]">{estimate.projectInfo.preparedBy}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">PREPARED BY</span>
                  <span className="text-slate-500 text-[11px]">{estimate.projectInfo.designation || 'Sub-Divisional Officer (SDO)'}</span>
                  <span className="text-slate-400 text-[10px] block">PESCO {estimate.projectInfo.subDivision}</span>
                </div>
              </div>

              <div className="space-y-12">
                <div className="border-b border-slate-400 pb-1">
                  <span className="font-bold text-slate-900 block font-mono text-[11px]">{estimate.projectInfo.checkedBy || 'Executive Engineer'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">CHECKED & VERIFIED BY</span>
                  <span className="text-slate-500 text-[11px]">Executive Engineer (XEN)</span>
                  <span className="text-slate-400 text-[10px] block">PESCO {estimate.projectInfo.division}</span>
                </div>
              </div>

              <div className="space-y-12">
                <div className="border-b border-slate-400 pb-1">
                  <span className="font-bold text-slate-900 block font-mono text-[11px]">{estimate.projectInfo.approvedBy || 'Superintending Engineer'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">SANCTIONED & APPROVED BY</span>
                  <span className="text-slate-500 text-[11px]">Superintending Engineer (SE) / CE</span>
                  <span className="text-slate-400 text-[10px] block">PESCO {estimate.projectInfo.circle}</span>
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
  );
};
