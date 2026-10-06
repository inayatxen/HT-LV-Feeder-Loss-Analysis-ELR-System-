/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CostEstimateRecord } from '../../../types/costEstimation';

export interface PrintDocumentLayoutProps {
  estimate: CostEstimateRecord;
  orientation?: 'portrait' | 'landscape';
  paperSize?: 'a4' | 'letter' | 'legal';
  marginSize?: 'normal' | 'narrow' | 'wide';
  showWatermark?: boolean;
  showAuditSteps?: boolean;
  showSignatures?: boolean;
  sldScheme?: string;
  id?: string;
}

export const PrintDocumentLayout: React.FC<PrintDocumentLayoutProps> = ({
  estimate,
  orientation = 'portrait',
  paperSize = 'a4',
  marginSize = 'normal',
  showWatermark = true,
  showAuditSteps = true,
  showSignatures = true,
  sldScheme = 'All Combined',
  id = 'printable-estimate-content'
}) => {
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

  // If 50 kVA Transformer Lump Sum BOQ, map correctly
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

  // Separate Standard and Dismantled items
  const standardItems = renderedItems.filter(i => !i.isDismantled);
  const dismantledItems = renderedItems.filter(i => !!i.isDismantled);

  // Prime Costs (Standard items only)
  const materialCost = Number(standardItems.reduce((sum, item) => sum + (Number(item.materialAmount) || 0), 0).toFixed(2));
  const labourCost = Number(standardItems.reduce((sum, item) => sum + (Number(item.labourAmount) || 0), 0).toFixed(2));
  
  // Dismantling Calculations
  const dismantleMaterialCredit = Number(dismantledItems.reduce((sum, item) => sum + (Number(item.materialAmount) || 0), 0).toFixed(2));
  const dismantleLabourCost = Number(dismantledItems.reduce((sum, item) => sum + (Number(item.labourAmount) || 0), 0).toFixed(2));
  const dismantleNetTotal = Number((dismantleLabourCost - dismantleMaterialCredit).toFixed(2));

  // Overheads basis & rates
  const isLumpSumOverhead = estimate.charges.overheadBasis === 'MATERIAL' || is50KvaPackage || is100KvaPackage || is200KvaPackage || is1KmHtDogHTypePackage;
  const deptPercent = estimate.charges.departmentalOverheadPercent || (isLumpSumOverhead ? 6.0 : 5.0);
  const contPercent = estimate.charges.contractorOverheadPercent || 10.0;
  const engPercent = estimate.charges.engineeringChargesPercent || (isLumpSumOverhead ? 0.0 : 2.0);
  const contigPercent = estimate.charges.contingencyPercent || (isLumpSumOverhead ? 0.0 : 3.0);
  const taxPercent = estimate.charges.taxGstPercent || 0.0;

  const basePrimeCost = Number((materialCost + labourCost + (estimate.charges.transportationCost || 0)).toFixed(2));
  const overheadBasisAmount = isLumpSumOverhead ? materialCost : basePrimeCost;

  const deptOverhead = Number((overheadBasisAmount * (deptPercent / 100)).toFixed(2));
  const contOverhead = Number((overheadBasisAmount * (contPercent / 100)).toFixed(2));
  const engOverhead = Math.round((isLumpSumOverhead ? 0 : basePrimeCost) * (engPercent / 100));
  const contigOverhead = Math.round((isLumpSumOverhead ? 0 : basePrimeCost) * (contigPercent / 100));
  const taxGstAmount = Math.round((isLumpSumOverhead ? materialCost : basePrimeCost) * (taxPercent / 100));
  const otherCharges = estimate.charges.otherChargesAmount || 0;

  const subTotal = isLumpSumOverhead 
    ? Number((materialCost + labourCost).toFixed(2)) 
    : Number((basePrimeCost + engOverhead + contigOverhead).toFixed(2));

  const rawGrandTotal = isLumpSumOverhead
    ? Number((materialCost + labourCost + deptOverhead + contOverhead + (estimate.charges.transportationCost || 0) + taxGstAmount + otherCharges).toFixed(2))
    : Number((subTotal + deptOverhead + contOverhead + taxGstAmount + otherCharges).toFixed(2));

  const grandTotal = Number((rawGrandTotal + dismantleNetTotal).toFixed(2));
  const costPerKm = Math.round(grandTotal / Math.max(0.01, totalKm));

  const paddingClass = 
    marginSize === 'narrow' ? 'p-4 sm:p-6' :
    marginSize === 'wide' ? 'p-8 sm:p-12' : 
    'p-6 sm:p-8';

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Repeating Header block for each page unit
  const renderPageHeader = (pageNum: number, totalPages: number) => {
    return (
      <header className="border-b-2 border-slate-900 pb-3 mb-4 no-print-break w-full">
        <div className="flex items-center justify-between gap-4">
          <img
            src="/pesco-logo.svg"
            alt="PESCO Official Insignia"
            className="w-12 h-12 shrink-0 object-contain"
          />
          
          <div className="text-center flex-1">
            <div className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-slate-700 mb-0.5">
              PESHAWAR ELECTRIC SUPPLY COMPANY (PESCO) · WAPDA
            </div>
            <h1 className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-tight">
              DETAILED ELECTRICAL LINE EXTENSION & BOQ DOSSIER
            </h1>
            <div className="text-[9px] font-semibold text-slate-600">
              Technical Sanction & Erection Cost Schedule
            </div>
          </div>

          <div className="flex flex-col items-end text-right shrink-0">
            <span className="font-bold text-slate-800 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[11px] font-mono">
              Page {pageNum} of {totalPages}
            </span>
          </div>
        </div>

        {/* Reference Meta Header */}
        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono text-slate-600 mt-2 pt-1 border-t border-slate-100">
          <span>Est No: <strong className="text-slate-900">{estimate.projectInfo.estimateNo}</strong></span>
          <span>Revision: <strong>{estimate.projectInfo.revisionNo}</strong></span>
          <span>Date: <strong>{estimate.projectInfo.estimateDate}</strong></span>
          <span>Sub-Div: <strong>{estimate.projectInfo.subDivision}</strong></span>
        </div>
      </header>
    );
  };

  // Repeating Footer block for each page unit
  const renderPageFooter = (pageNum: number, totalPages: number) => {
    return (
      <footer className="border-t border-slate-300 pt-3 mt-6 text-[10px] font-mono text-slate-500 w-full no-print-break">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-slate-700">
            PESCO Distribution Works · Technical Sanction & Cost Estimation Dossier (CSR-2026)
          </span>
          <span className="text-slate-600">
            Prepared by: {estimate.projectInfo.preparedBy || 'Engr. M. Inayat'} · {today}
          </span>
          <span className="font-black text-slate-950 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">
            Page {pageNum} of {totalPages}
          </span>
        </div>
      </footer>
    );
  };

  return (
    <div 
      id={id} 
      className={`relative bg-slate-100/50 text-slate-900 font-sans print:p-0 print:m-0 w-full space-y-8`}
      style={{ boxSizing: 'border-box' }}
    >
      {/* Official Watermark Background */}
      {showWatermark && (
        <div 
          aria-hidden="true" 
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0"
        >
          <img
            src="/pesco-logo.svg"
            alt="Official PESCO WAPDA Logo Watermark"
            className="w-[450px] h-[450px] max-w-[65vw] max-h-[65vh] object-contain opacity-[0.015]"
          />
        </div>
      )}

      <div className="relative z-10 w-full space-y-8">

        {/* ========================================================
            PAGE 1: ADMINISTRATIVE & TECHNICAL LINE DETAILS
           ======================================================== */}
        <div className="print-page-unit bg-white border border-slate-300 shadow-sm print:shadow-none print:border-none w-full min-h-[290mm] flex flex-col justify-between p-8 sm:p-12 print:p-0">
          <div className="space-y-6 flex-1">
            {renderPageHeader(1, 3)}

            {/* Title / Description */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-600 block">Scope of Detailed Estimate</span>
              <h2 className="text-sm sm:text-base font-black text-slate-950 uppercase leading-snug">
                {estimate.projectInfo.schemeProjectName || 'PESCO Line Upgradation Works'}
              </h2>
              {estimate.projectInfo.purposeOfWork && (
                <p className="text-xs text-slate-600 italic leading-relaxed pt-1 border-t border-slate-200/60">
                  &ldquo;{estimate.projectInfo.purposeOfWork}&rdquo;
                </p>
              )}
            </div>

            {/* Section A: Administrative Details */}
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-blue-600 flex items-center justify-between">
                <span>1. Project & Scheme Administrative Details</span>
                <span className="text-[10px] font-mono text-slate-500 font-normal">Section A</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-3 text-xs border border-slate-200 p-4 rounded-lg bg-slate-50/20">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Location / Locality:</span>
                  <span className="font-bold text-slate-900">{estimate.projectInfo.proposedLocation || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">District & Circle:</span>
                  <span className="font-semibold text-slate-900">{estimate.projectInfo.district} / {estimate.projectInfo.circle}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Parent Feeder & Code:</span>
                  <span className="font-semibold text-slate-900">{estimate.projectInfo.feederName} ({estimate.projectInfo.feederCode})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Jurisdiction Division:</span>
                  <span className="font-semibold text-slate-900">{estimate.projectInfo.division} · {estimate.projectInfo.subDivision}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Applicant Sponsoring Dept:</span>
                  <span className="font-medium text-slate-800">{estimate.projectInfo.applicantDepartment || 'Departmental Works'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">GPS Coordinates:</span>
                  <span className="font-mono text-slate-900 font-bold">{estimate.projectInfo.gpsLatitude || '34.01 N'}, {estimate.projectInfo.gpsLongitude || '71.52 E'}</span>
                </div>
              </div>
            </section>

            {/* Section B: Technical Details */}
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-amber-500 flex items-center justify-between">
                <span>2. Technical Line & Structure Parameters</span>
                <span className="text-[10px] font-mono text-slate-500 font-normal">Section B</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border border-slate-200 p-4 rounded-lg bg-white shadow-3xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">HT 11kV Route Length:</span>
                  <span className="font-mono font-bold text-blue-900">{estimate.lineDetails.htLengthKm} km</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">LT 400V Route Length:</span>
                  <span className="font-mono font-bold text-slate-900">{estimate.lineDetails.ltLengthKm} km</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Conductor Type & Size:</span>
                  <span className="font-bold text-slate-900">{estimate.lineDetails.conductorSize} ({estimate.lineDetails.conductorType})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Pole / Structure Type:</span>
                  <span className="font-bold text-slate-900">{estimate.lineDetails.poleType || 'PCC Structure'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">HT Overhead Poles:</span>
                  <span className="font-mono font-bold text-slate-900">{estimate.lineDetails.htPoles} Nos</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">LT Overhead Poles:</span>
                  <span className="font-mono font-bold text-slate-900">{estimate.lineDetails.ltPoles} Nos</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Stay / Guy Assemblies:</span>
                  <span className="font-mono font-bold text-slate-900">{estimate.lineDetails.staySets} Sets</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Transformer (DT):</span>
                  <span className="font-mono font-bold text-amber-700">
                    {estimate.lineDetails.transformerCapacityKva > 0 ? `${estimate.lineDetails.transformerCapacityKva} kVA` : 'Line Only'}
                  </span>
                </div>
              </div>

              {estimate.lineDetails.bifurcationEnabled && (
                <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-amber-950 flex items-center justify-between">
                    <span>⚡ Feeder Bifurcation / Separation Point Specification</span>
                    <span className="font-mono bg-amber-200 text-amber-950 px-2 py-0.5 rounded text-[10px] font-black">
                      {(estimate.lineDetails.bifurcationType || 'tee_off').replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs font-mono pt-1.5 border-t border-amber-200">
                    <div>
                      <span className="text-slate-600 block font-sans text-[10px]">Tee-Off Pole No:</span>
                      <strong className="text-slate-950">{estimate.lineDetails.cutOffPoleNo || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block font-sans text-[10px]">Existing Line Portion:</span>
                      <strong className="text-slate-950">{estimate.lineDetails.existingPortionKm || 0} km</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block font-sans text-[10px]">Remaining Extension:</span>
                      <strong className="text-blue-900 font-bold">{estimate.lineDetails.remainingPortionKm || 0} km</strong>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
          {renderPageFooter(1, 3)}
        </div>


        {/* ========================================================
            PAGE 2: DETAILED BOQ MATERIALS TABLE
           ======================================================== */}
        <div className="print-page-unit bg-white border border-slate-300 shadow-sm print:shadow-none print:border-none w-full min-h-[290mm] flex flex-col justify-between p-8 sm:p-12 print:p-0">
          <div className="space-y-6 flex-1">
            {renderPageHeader(2, 3)}

            <section className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-emerald-600 flex items-center justify-between">
                <span>3. Detailed Bill of Quantities (BOQ) Standard Materials Schedule</span>
                <span className="text-[10px] font-mono text-slate-600 font-bold">WAPDA Schedule of Rates (AUP 2026)</span>
              </h3>

              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold border-b-2 border-slate-300">
                      <th className="py-2 px-1.5 text-center w-8">Sr.</th>
                      <th className="py-2 px-2.5">Store Code</th>
                      <th className="py-2 px-2.5">Description & Specifications</th>
                      <th className="py-2 px-1 text-center">Unit</th>
                      <th className="py-2 px-2 text-right">Qty</th>
                      <th className="py-2 px-2.5 text-right">Material Rate</th>
                      <th className="py-2 px-2.5 text-right">Material Amount</th>
                      <th className="py-2 px-2 text-right">Labour Rate</th>
                      <th className="py-2 px-2.5 text-right">Labour Amount</th>
                      <th className="py-2 px-2.5 text-right">Total (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono tabular-nums text-[10.5px]">
                    {standardItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400 font-sans">
                          No standard materials in this section.
                        </td>
                      </tr>
                    ) : (
                      standardItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-55/60">
                          <td className="py-2 px-1.5 text-center text-slate-500 font-sans">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-bold text-slate-900">
                            <span className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px]">
                              {item.materialCode}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 font-sans leading-tight">
                            <span className="font-bold text-slate-950 block">{item.description}</span>
                            {item.specification && (
                              <span className="text-[9.5px] text-slate-500 block leading-normal line-clamp-1">
                                {item.specification}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-1 text-center font-sans text-slate-700">{item.unit}</td>
                          <td className="py-2 px-2 text-right font-bold text-slate-900">{item.quantity}</td>
                          <td className="py-2 px-2.5 text-right">{item.unitRate.toLocaleString()}</td>
                          <td className="py-2 px-2.5 text-right font-bold text-slate-900">{item.materialAmount.toLocaleString()}</td>
                          <td className="py-2 px-2 text-right text-slate-700">{item.labourRate.toLocaleString()}</td>
                          <td className="py-2 px-2.5 text-right text-slate-700">{item.labourAmount.toLocaleString()}</td>
                          <td className="py-2 px-2.5 text-right font-black text-slate-950 bg-slate-50/50">
                            {item.totalAmount.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                    
                    {/* Subtotal Row */}
                    <tr className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-400 text-[11px]">
                      <td colSpan={5} className="py-2.5 px-3 text-right font-sans uppercase">
                        Subtotal (Erection Material & Labour Prime Cost):
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-black" colSpan={2}>
                        PKR {materialCost.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold" colSpan={2}>
                        PKR {labourCost.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-blue-950 font-black font-mono">
                        PKR {(materialCost + labourCost).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          {renderPageFooter(2, 3)}
        </div>


        {/* ========================================================
            PAGE 3: DISMANTLE ESTIMATE & ABSTRACT & SIGNATURES
           ======================================================== */}
        <div className="print-page-unit bg-white border border-slate-300 shadow-sm print:shadow-none print:border-none w-full min-h-[290mm] flex flex-col justify-between p-8 sm:p-12 print:p-0">
          <div className="space-y-5 flex-1">
            {renderPageHeader(3, 3)}

            {/* Dismantle Estimate Section (Retired Assets) */}
            {dismantledItems.length > 0 && (
              <section className="space-y-1.5">
                <h3 className="text-xs font-black text-amber-950 bg-amber-50 p-2 border-l-4 border-amber-500 uppercase tracking-wider flex items-center justify-between">
                  <span>⚡ Section C: Dismantle Estimate Schedule (Retired Assets)</span>
                  <span className="text-[10px] font-mono font-normal">Retired @ 1/3 rate · Labour @ 10% erection rate</span>
                </h3>
                <div className="overflow-x-auto border border-slate-300 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-amber-50/50 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                        <th className="py-1.5 px-1.5 text-center w-8">Sr.</th>
                        <th className="py-1.5 px-2">Store Code</th>
                        <th className="py-1.5 px-2">Material Description</th>
                        <th className="py-1.5 px-1 text-center">Unit</th>
                        <th className="py-1.5 px-2 text-right">Qty</th>
                        <th className="py-1.5 px-2 text-right">Retired Rate (1/3)</th>
                        <th className="py-1.5 px-2 text-right">Material Credit</th>
                        <th className="py-1.5 px-2 text-right">Dismantle Labour (10%)</th>
                        <th className="py-1.5 px-2 text-right">Net Value (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono tabular-nums text-[10px]">
                      {dismantledItems.map((item, idx) => (
                        <tr key={item.id} className="bg-amber-50/10 hover:bg-amber-50/20">
                          <td className="py-1.5 px-1.5 text-center text-slate-500 font-sans">{idx + 1}</td>
                          <td className="py-1.5 px-2 font-bold text-slate-900">{item.materialCode}</td>
                          <td className="py-1.5 px-2 font-sans font-medium text-slate-950 leading-tight">
                            {item.description}
                          </td>
                          <td className="py-1.5 px-1 text-center font-sans text-slate-600">{item.unit}</td>
                          <td className="py-1.5 px-2 text-right font-bold text-slate-900">{item.quantity}</td>
                          <td className="py-1.5 px-2 text-right text-amber-900 font-bold">{item.unitRate.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-right text-amber-950 font-bold">-{item.materialAmount.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-right text-blue-900 font-bold">{item.labourAmount.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-right font-bold text-slate-950 bg-slate-50/40">
                            {(item.labourAmount - item.materialAmount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-amber-50 font-bold border-t border-amber-300 text-slate-950 text-[10.5px]">
                        <td colSpan={5} className="py-2 px-2 text-right font-sans uppercase">Dismantle Subtotals:</td>
                        <td colSpan={2} className="py-2 px-2 text-right text-amber-900 font-black">PKR -{dismantleMaterialCredit.toLocaleString()}</td>
                        <td colSpan={1} className="py-2 px-2 text-right text-blue-900 font-black">PKR {dismantleLabourCost.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right text-slate-950 font-black font-mono">
                          PKR {dismantleNetTotal.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Abstract of Cost */}
            <section className="space-y-1.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-slate-800 flex items-center justify-between">
                <span>4. Abstract of Cost & Departmental Overheads</span>
                <span className="text-[10px] font-mono text-slate-500 font-normal">
                  {isLumpSumOverhead ? 'Lump Sum Schedule Basis' : 'Section D'}
                </span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono tabular-nums">
                {/* Standard Erection Costs Block */}
                <div className="border border-slate-300 rounded-lg p-3 space-y-1.5 bg-white">
                  <div className="font-bold text-slate-800 font-sans border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>Erection Costs Summary:</span>
                    <span className="text-[9.5px] text-blue-700 font-bold">New Assets</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">A. Material Cost (Standard):</span>
                    <span className="font-bold text-slate-900">PKR {materialCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">B. Labour Cost (Standard):</span>
                    <span className="font-bold text-slate-900">PKR {labourCost.toLocaleString()}</span>
                  </div>
                  {estimate.charges.transportationCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-sans">C. Transportation & Hauling:</span>
                      <span>PKR {estimate.charges.transportationCost.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-black text-slate-950 text-xs">
                    <span className="font-sans">Subtotal (Standard):</span>
                    <span>PKR {(materialCost + labourCost + (estimate.charges.transportationCost || 0)).toLocaleString()}</span>
                  </div>
                </div>

                {/* Overheads, Dismantling Summary & Deductions */}
                <div className="border border-slate-300 rounded-lg p-3 space-y-1.5 bg-slate-50/70">
                  <div className="font-bold text-slate-800 font-sans border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>Overheads & Dismantling Abstract:</span>
                    <span className="text-[9.5px] text-amber-700 font-bold">Deductions & Credits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">C. Departmental Overhead ({deptPercent}%):</span>
                    <span>PKR {deptOverhead.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">D. Contractor Overhead ({contPercent}%):</span>
                    <span>PKR {contOverhead.toLocaleString()}</span>
                  </div>
                  {dismantledItems.length > 0 && (
                    <>
                      <div className="flex justify-between border-t border-dashed border-slate-300 pt-1 text-blue-900 font-bold">
                        <span className="font-sans">E. Dismantling Labour Cost (10%):</span>
                        <span>PKR {dismantleLabourCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-amber-800 font-bold">
                        <span className="font-sans">F. Retired Salvage Material Credit (1/3):</span>
                        <span>PKR -{dismantleMaterialCredit.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  {taxGstAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-sans">Taxes / GST:</span>
                      <span>PKR {taxGstAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                    <span className="font-sans">Net Overheads & Dismantle:</span>
                    <span className={dismantleNetTotal < 0 ? "text-emerald-700" : "text-blue-900"}>
                      PKR {(deptOverhead + contOverhead + taxGstAmount + dismantleNetTotal).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grand Total Sanction Banner */}
              <div className="bg-slate-900 text-white p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-amber-400 font-extrabold block">
                    NET ESTIMATED PROJECT COST (GRAND SANCTIONED TOTAL)
                  </span>
                  <span className="text-[10px] text-slate-300">
                    Distribution Work Execution Dossier · Net inclusive of New erection cost + Dismantling overhead impact
                  </span>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-tight leading-none">
                    PKR {grandTotal.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold block mt-0.5">
                    Sanction Rate: PKR {costPerKm.toLocaleString()} / km
                  </span>
                </div>
              </div>
            </section>

            {/* Formula Audit steps if requested */}
            {showAuditSteps && estimate.calculationSteps && estimate.calculationSteps.length > 0 && (
              <section className="space-y-1 font-sans">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Formulas & Quantity Auditing Steps:</h4>
                <div className="border border-slate-200 rounded-md p-2 bg-slate-50/50 text-[10px] grid grid-cols-2 gap-x-4 gap-y-1 font-mono">
                  {estimate.calculationSteps.slice(0, 6).map((step, sIdx) => (
                    <div key={sIdx} className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="text-slate-600 truncate max-w-[200px]">{step.component}:</span>
                      <strong className="text-blue-900">{step.resultQuantity} {step.unit}</strong>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Signature Block */}
            {showSignatures && (
              <section className="pt-6 border-t border-slate-300 no-print-break">
                <div className="grid grid-cols-3 gap-6 text-center text-[10px] font-sans">
                  {/* SDO */}
                  <div className="space-y-8">
                    <div className="border-b border-slate-400 pb-0.5">
                      <span className="font-bold text-slate-900 block font-mono text-[10px]">
                        {estimate.projectInfo.preparedBy || 'Engr. M. Inayat'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block uppercase">PREPARED BY</span>
                      <span className="text-slate-600 block text-[9.5px]">Sub-Divisional Officer (SDO)</span>
                      <span className="text-slate-500 block text-[9px]">PESCO {estimate.projectInfo.subDivision}</span>
                    </div>
                  </div>

                  {/* XEN */}
                  <div className="space-y-8">
                    <div className="border-b border-slate-400 pb-0.5">
                      <span className="font-bold text-slate-900 block font-mono text-[10px]">
                        {estimate.projectInfo.checkedBy || 'Engr. Tariq Khan'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block uppercase">CHECKED BY</span>
                      <span className="text-slate-600 block text-[9.5px]">Executive Engineer (XEN)</span>
                      <span className="text-slate-500 block text-[9px]">PESCO {estimate.projectInfo.division}</span>
                    </div>
                  </div>

                  {/* SE / CE */}
                  <div className="space-y-8">
                    <div className="border-b border-slate-400 pb-0.5">
                      <span className="font-bold text-slate-900 block font-mono text-[10px]">
                        {estimate.projectInfo.approvedBy || 'Engr. Abdul Rehman'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block uppercase">APPROVED BY</span>
                      <span className="text-slate-600 block text-[9.5px]">Superintending Engineer (SE)</span>
                      <span className="text-slate-500 block text-[9px]">PESCO {estimate.projectInfo.circle}</span>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
          {renderPageFooter(3, 3)}
        </div>

      </div>
    </div>
  );
};
