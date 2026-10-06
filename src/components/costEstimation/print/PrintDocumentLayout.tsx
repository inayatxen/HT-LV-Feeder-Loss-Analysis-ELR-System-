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
  printScope?: 'full' | 'dismantle_only';
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
  id = 'printable-estimate-content',
  printScope = 'full'
}) => {
  const paddingClass = 
    marginSize === 'narrow' ? 'p-4 sm:p-6' :
    marginSize === 'wide' ? 'p-8 sm:p-12' : 
    'p-6 sm:p-8';

  // If printScope is dismantle_only, render a clean standalone dismantle estimate report
  if (printScope === 'dismantle_only' || estimate.projectInfo?.schemeProjectName?.includes('Dismantle Section Only')) {
    const dismantledItems = estimate.dismantledItems && estimate.dismantledItems.length > 0 
      ? estimate.dismantledItems 
      : estimate.items;
    const dismantledCharges = estimate.dismantledCharges || estimate.charges;

    return (
      <div 
        id={id} 
        className={`relative bg-white text-slate-900 ${paddingClass} font-sans print:p-0 print:m-0 w-full`}
        style={{ boxSizing: 'border-box' }}
      >
        {showWatermark && (
          <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
            <img src="/pesco-logo.svg" alt="Watermark" className="w-[450px] h-[450px] object-contain opacity-[0.035]" />
          </div>
        )}

        <div className="relative z-10 print-page-unit space-y-6">
          <header className="border-b-2 border-slate-900 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center text-white font-black text-xl shadow-sm">
                  ⚡
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Peshawar Electric Supply Company (PESCO)</div>
                  <h1 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight">
                    DISMANTLE MATERIAL ESTIMATE REPORT (RETIRED ASSETS)
                  </h1>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-slate-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
                  ESTIMATE NO: {estimate.projectInfo.estimateNo}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Date: {new Date().toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs font-sans">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Scheme / Project Name:</span>
              <strong className="text-slate-900">{estimate.projectInfo.schemeProjectName.replace(' (Dismantle Section Only)', '')}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Sub-Division / Division:</span>
              <strong className="text-slate-900">PESCO {estimate.projectInfo.subDivision} · {estimate.projectInfo.division}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Circle:</span>
              <strong className="text-slate-900">PESCO {estimate.projectInfo.circle}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Estimation Basis:</span>
              <strong className="text-amber-800 font-mono">1/3 CSR Salvage + 10% Labour</strong>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-amber-50 p-2 border-l-4 border-amber-600 flex items-center justify-between">
              <span>Dismantled Materials Schedule & Salvage Credit Valuation</span>
              <span className="text-[10px] font-mono text-amber-800 font-semibold">Standard Schedule of Rates (CSR-2026)</span>
            </h2>

            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold border-b-2 border-slate-300">
                    <th className="py-2.5 px-2 text-center w-8">Sr.</th>
                    <th className="py-2.5 px-2.5">Store Code</th>
                    <th className="py-2.5 px-3">Retired Material Description & Engineering Specs</th>
                    <th className="py-2.5 px-2 text-center">Unit</th>
                    <th className="py-2.5 px-2.5 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right font-mono">Std Rate (CSR)</th>
                    <th className="py-2.5 px-3 text-right font-mono">Dismantled Rate (1/3)</th>
                    <th className="py-2.5 px-3 text-right font-mono">Material Credit (PKR)</th>
                    <th className="py-2.5 px-3 text-right font-mono">Dismantling Labour (PKR)</th>
                    <th className="py-2.5 px-3 text-right font-mono">Total Credit (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px] tabular-nums">
                  {dismantledItems.map((item, idx) => {
                    const stdRate = item.unitRate * 3;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-2 text-center text-slate-500 font-sans">{idx + 1}</td>
                        <td className="py-2 px-2.5 font-bold text-slate-900">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono">
                            {item.materialCode}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans">
                          <span className="font-bold text-slate-950 block leading-tight">{item.description}</span>
                          {item.specification && (
                            <span className="text-[10px] text-slate-500 block leading-normal">
                              {item.specification}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-sans text-slate-700">{item.unit}</td>
                        <td className="py-2 px-2.5 text-right font-bold text-slate-900">{item.quantity}</td>
                        <td className="py-2 px-3 text-right text-slate-500">{stdRate.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold text-amber-700">{item.unitRate.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-900">{item.materialAmount.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-700">{(item.labourAmount || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-black text-slate-950 bg-slate-50/50">
                          {((item.materialAmount || 0) + (item.labourAmount || 0)).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-350">
                    <td colSpan={7} className="py-2.5 px-3 text-right font-sans uppercase tracking-wider text-xs">
                      Total Dismantle Estimate Salvage Credit:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black">
                      PKR {dismantledCharges.materialCost.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      PKR {dismantledCharges.labourCost.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-950 font-black text-xs font-mono bg-amber-50">
                      PKR {(dismantledCharges.materialCost + dismantledCharges.labourCost).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl flex items-center justify-between text-xs font-sans text-amber-950 font-semibold shadow-xs">
            <div>
              <span className="uppercase tracking-wider text-amber-800 font-extrabold block text-xs">NET SALVAGE VALUE / ASSET RETIREMENT CREDIT</span>
              <span className="text-slate-600 font-normal">To be adjusted against total capital expenditure during final project accounting.</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-xl text-amber-800">
                PKR {(dismantledCharges.materialCost + dismantledCharges.labourCost).toLocaleString()}
              </span>
            </div>
          </div>

          {showSignatures && (
            <section className="break-inside-avoid pt-12 border-t-2 border-slate-900" style={{ pageBreakInside: 'avoid' }}>
              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                <div className="space-y-12">
                  <div className="border-b border-slate-400 pb-1">
                    <span className="font-bold text-slate-900 block font-mono text-[11px]">{estimate.projectInfo.preparedBy || 'Engr. M. Inayat'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block uppercase">PREPARED BY</span>
                    <span className="text-slate-600 text-[11px] block">{estimate.projectInfo.designation || 'Sub-Divisional Officer (SDO)'}</span>
                    <span className="text-slate-500 text-[10px] block">PESCO {estimate.projectInfo.subDivision}</span>
                  </div>
                </div>
                <div className="space-y-12">
                  <div className="border-b border-slate-400 pb-1">
                    <span className="font-bold text-slate-900 block font-mono text-[11px]">{estimate.projectInfo.checkedBy || 'Engr. Tariq Khan'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block uppercase">CHECKED & VERIFIED BY</span>
                    <span className="text-slate-600 text-[11px] block">Executive Engineer (XEN)</span>
                    <span className="text-slate-500 text-[10px] block">PESCO {estimate.projectInfo.division}</span>
                  </div>
                </div>
                <div className="space-y-12">
                  <div className="border-b border-slate-400 pb-1">
                    <span className="font-bold text-slate-900 block font-mono text-[11px]">{estimate.projectInfo.approvedBy || 'Engr. Abdul Rehman'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block uppercase">SANCTIONED & APPROVED BY</span>
                    <span className="text-slate-600 text-[11px] block">Superintending Engineer (SE)</span>
                    <span className="text-slate-500 text-[10px] block">PESCO {estimate.projectInfo.circle}</span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

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
    <div 
      id={id} 
      className={`relative bg-white text-slate-900 ${paddingClass} font-sans print:p-0 print:m-0 w-full`}
      style={{
        boxSizing: 'border-box'
      }}
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
            className="w-[450px] h-[450px] max-w-[65vw] max-h-[65vh] object-contain opacity-[0.035]"
          />
        </div>
      )}

      <div className="relative z-10 space-y-6">

        {/* --- PAGE UNIT 1: ADMINISTRATIVE & TECHNICAL SPECS --- */}
        <div className="print-page-unit space-y-6">
          {/* ========================================================
              1. OFFICIAL HEADER BLOCK
             ======================================================== */}
          <header className="border-b-2 border-slate-900 pb-3">
            <div className="flex items-center justify-between gap-4">
              <img
                src="/pesco-logo.svg"
                alt="PESCO Official Insignia"
                className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 object-contain"
              />
              
              <div className="text-center flex-1">
                <div className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-slate-700 mb-0.5">
                  WATER AND POWER DEVELOPMENT AUTHORITY (WAPDA)
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-800 tracking-wide">
                  PESHAWAR ELECTRIC SUPPLY COMPANY (PESCO)
                </div>
                <h1 className="text-base sm:text-xl font-black text-slate-950 uppercase tracking-tight mt-1">
                  DETAILED ELECTRICAL LINE EXTENSION & BILL OF QUANTITIES (BOQ) DOSSIER
                </h1>
                <div className="text-[11px] sm:text-xs font-semibold text-slate-600 mt-0.5">
                  Technical Sanction & Erection Cost Schedule · {estimate.type.replace(/_/g, ' ')}
                </div>
              </div>

              <div className="hidden sm:flex flex-col items-center justify-center w-20 shrink-0 text-center">
                <div className="w-16 h-16 rounded-xl border-2 border-slate-900 flex flex-col items-center justify-center bg-slate-50 p-1 shadow-2xs">
                  <span className="text-[9px] font-black uppercase text-slate-900 leading-none">PESCO</span>
                  <span className="text-[12px] font-black text-amber-600 leading-tight">EST</span>
                  <span className="text-[8px] font-bold text-slate-600 leading-none">WAPDA</span>
                </div>
              </div>
            </div>

            {/* Reference Meta Sub-header */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-700 mt-3 pt-2 border-t border-slate-200 bg-slate-50/70 px-3 py-1.5 rounded-md">
              <span>Estimate No: <strong className="text-slate-950 font-bold">{estimate.projectInfo.estimateNo}</strong></span>
              <span>Revision: <strong>{estimate.projectInfo.revisionNo}</strong></span>
              <span>Date: <strong>{estimate.projectInfo.estimateDate}</strong></span>
              <span>Division: <strong>{estimate.projectInfo.division}</strong></span>
              <span>Sub-Div: <strong>{estimate.projectInfo.subDivision}</strong></span>
              <span>Status: <strong className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[11px]">{estimate.status}</strong></span>
            </div>

            {/* SLD Scheme Scope Banner */}
            <div className="mt-2 flex items-center justify-between text-xs bg-amber-50 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-md font-sans">
              <span className="font-bold flex items-center gap-1.5">
                <span>⚡ SLD Scheme Scope Variant:</span>
                <span className="font-mono bg-amber-200/70 text-amber-950 px-2 py-0.5 rounded font-black">{sldScheme}</span>
              </span>
              <span className="text-[11px] text-amber-800 italic">
                {sldScheme.includes('Comparison') ? 'Comparative multi-scheme technical evaluation' : 'Single scheme configuration layout'}
              </span>
            </div>
          </header>

          {/* ========================================================
              2. PROJECT & ADMINISTRATIVE INFORMATION
             ======================================================== */}
          <section className="space-y-2 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-blue-600 flex items-center justify-between">
              <span>1. Project & Scheme Administrative Information</span>
              <span className="text-[10px] font-mono text-slate-500 font-normal">Section A</span>
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs border border-slate-200 p-3 rounded-lg bg-slate-50/40">
              <div className="sm:col-span-2">
                <span className="text-slate-500 block text-[11px]">Scheme / Project Title:</span>
                <span className="font-bold text-slate-900 block">{estimate.projectInfo.schemeProjectName || 'Line Extension'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Location / Locality:</span>
                <span className="font-semibold text-slate-900 block">{estimate.projectInfo.proposedLocation}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Parent Feeder:</span>
                <span className="font-semibold text-slate-900 block">{estimate.projectInfo.feederName} ({estimate.projectInfo.feederCode})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Sub-Division / Jurisdiction:</span>
                <span className="font-medium text-slate-800">{estimate.projectInfo.subDivision}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Circle & District:</span>
                <span className="font-medium text-slate-800">{estimate.projectInfo.circle} / {estimate.projectInfo.district}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Applicant / Sponsoring Dept:</span>
                <span className="font-medium text-slate-800">{estimate.projectInfo.applicantDepartment || 'PESCO Departmental Works'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">GPS Coordinates:</span>
                <span className="font-mono text-slate-900">{estimate.projectInfo.gpsLatitude || 'N/A'}, {estimate.projectInfo.gpsLongitude || 'N/A'}</span>
              </div>
              {estimate.projectInfo.purposeOfWork && (
                <div className="col-span-2 sm:col-span-4 pt-1 border-t border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Engineering Justification & Scope:</span>
                  <span className="text-slate-700 italic block">{estimate.projectInfo.purposeOfWork}</span>
                </div>
              )}
            </div>
          </section>

          {/* ========================================================
              3. TECHNICAL LINE & STRUCTURE PARAMETERS
             ======================================================== */}
          <section className="space-y-2 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-amber-500 flex items-center justify-between">
              <span>2. Technical Line & Structure Parameters</span>
              <span className="text-[10px] font-mono text-slate-500 font-normal">Section B</span>
            </h2>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 text-xs border border-slate-200 p-3 rounded-lg bg-white">
              <div>
                <span className="text-slate-500 block text-[11px]">HT 11kV Length:</span>
                <span className="font-mono font-bold text-slate-900">{estimate.lineDetails.htLengthKm} km</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">LT 400V Length:</span>
                <span className="font-mono font-bold text-slate-900">{estimate.lineDetails.ltLengthKm} km</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Conductor Specification:</span>
                <span className="font-bold text-slate-900">{estimate.lineDetails.conductorSize} ({estimate.lineDetails.conductorType})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Pole / Structure:</span>
                <span className="font-bold text-slate-900">{estimate.lineDetails.poleType || 'HT Pole'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">HT Overhead Poles:</span>
                <span className="font-mono font-bold text-blue-900">{estimate.lineDetails.htPoles} Nos</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">LT Overhead Poles:</span>
                <span className="font-mono font-bold text-slate-900">{estimate.lineDetails.ltPoles} Nos</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Stay / Guy Sets:</span>
                <span className="font-mono font-bold text-slate-900">{estimate.lineDetails.staySets} Sets</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Road Crossings:</span>
                <span className="font-mono font-bold text-slate-900">{estimate.lineDetails.roadCrossings || 0}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Canal Crossings:</span>
                <span className="font-mono font-bold text-slate-900">{estimate.lineDetails.canalCrossings || 0}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Circuits Count:</span>
                <span className="font-mono font-bold text-slate-900">{estimate.lineDetails.circuitsCount || 1} Circuit</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Transformer (DT):</span>
                <span className="font-mono font-bold text-slate-900">
                  {estimate.lineDetails.transformerCapacityKva > 0 ? `${estimate.lineDetails.transformerCapacityKva} kVA` : 'Line Only'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Substation Hardware:</span>
                <span className="font-mono font-bold text-slate-900">
                  {estimate.lineDetails.transformerCount > 0 ? `${estimate.lineDetails.transformerCount} Bay(s)` : 'None'}
                </span>
              </div>
            </div>

            {estimate.lineDetails.bifurcationEnabled && (
              <div className="mt-2.5 bg-amber-50 border border-amber-300 p-3 rounded-lg text-xs space-y-1.5 font-sans">
                <div className="font-bold text-amber-950 flex items-center justify-between">
                  <span>⚡ Bifurcation & Cut-Off Point Separation Analysis</span>
                  <span className="font-mono bg-amber-200 text-amber-950 px-2 py-0.5 rounded text-[10px]">
                    Split Type: {(estimate.lineDetails.bifurcationType || 'tee_off').replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono pt-1 border-t border-amber-200">
                  <div>
                    <span className="text-slate-600 block text-[11px] font-sans">Cut-Off / Tee-Off Location:</span>
                    <strong className="text-slate-950">{estimate.lineDetails.cutOffPoleNo || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px] font-sans">Existing Line Portion:</span>
                    <strong className="text-slate-950">{estimate.lineDetails.existingPortionKm || 0} km</strong>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px] font-sans">Remaining Line Extension:</span>
                    <strong className="text-blue-900 font-bold">{estimate.lineDetails.remainingPortionKm || 0} km</strong>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* --- PAGE UNIT 2: DETAILED BOQ MATERIALS SCHEDULE --- */}
        <div className="print-page-unit space-y-6">
          {/* ========================================================
              4. DETAILED BILL OF QUANTITIES (BOQ) TABLE
             ======================================================== */}
          <section className="space-y-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-emerald-600 flex items-center justify-between">
              <span>
                {estimate.charges.overheadBasis === 'MATERIAL' 
                  ? '3. Detailed Bill of Quantities (BOQ) Materials Schedule' 
                  : '3. Detailed Bill of Quantities (BOQ) & Erection Schedule'}
              </span>
              <span className="text-[10px] font-mono text-slate-600 font-semibold">Standard WAPDA Schedule of Rates (AUP 2026)</span>
            </h2>

            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold border-b-2 border-slate-300">
                    <th className="py-2.5 px-2 text-center w-8">Sr.</th>
                    <th className="py-2.5 px-2.5">Store Code</th>
                    <th className="py-2.5 px-3">Material Description & Engineering Specifications</th>
                    <th className="py-2.5 px-2 text-center">Unit</th>
                    <th className="py-2.5 px-2.5 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Material Rate</th>
                    <th className="py-2.5 px-3 text-right">Material Cost</th>
                    <th className="py-2.5 px-3 text-right">Labour Rate</th>
                    <th className="py-2.5 px-3 text-right">Labour Cost</th>
                    <th className="py-2.5 px-3 text-right">Line Total (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono tabular-nums text-[11px]">
                  {renderedItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-2 text-center text-slate-500 font-sans">{idx + 1}</td>
                      <td className="py-2 px-2.5 font-bold text-slate-900">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono">
                          {item.materialCode}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <span className="font-bold text-slate-950 block leading-tight">{item.description}</span>
                        {item.specification && (
                          <span className="text-[10px] text-slate-500 block leading-normal line-clamp-1">
                            {item.specification}
                          </span>
                        )}
                        {item.calculationNotes && (
                          <span className="text-[9.5px] text-blue-700 block font-medium mt-0.5">
                            Calculated: {item.calculationNotes}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-sans text-slate-700">{item.unit}</td>
                      <td className="py-2 px-2.5 text-right font-bold text-slate-900">{item.quantity}</td>
                      <td className="py-2 px-3 text-right">{item.unitRate.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{item.materialAmount.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-slate-700">{item.labourRate.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-slate-700">{item.labourAmount.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-black text-slate-950 bg-slate-50/50">
                        {item.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  
                  {/* BOQ Subtotal Row */}
                  <tr className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-400">
                    <td colSpan={6} className="py-2.5 px-3 text-right font-sans uppercase tracking-wider text-xs">
                      Subtotal (Material & Labour Prime Cost):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black">
                      PKR {materialCost.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold" colSpan={2}>
                      PKR {labourCost.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-blue-950 font-black text-xs font-mono">
                      PKR {(materialCost + labourCost).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* --- PAGE UNIT 3: ABSTRACT OF COST & OVERHEADS --- */}
        <div className="print-page-unit space-y-6">
          {/* ========================================================
              5. ABSTRACT OF COST & DEPARTMENTAL OVERHEADS
             ======================================================== */}
          <section className="space-y-2 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-slate-800 flex items-center justify-between">
              <span>4. Abstract of Cost & Departmental Overheads</span>
              <span className="text-[10px] font-mono text-slate-500 font-normal">
                {isLumpSumOverhead ? 'WAPDA Lump Sum Schedule Basis' : 'Section D'}
              </span>
            </h2>

            {isLumpSumOverhead ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Direct Material & 10% Labour Costs */}
                <div className="border border-slate-300 rounded-lg p-3 text-xs space-y-2 font-mono bg-white">
                  <div className="font-bold text-slate-800 font-sans border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>Direct Package Costs (WAPDA CSR):</span>
                    <span className="text-[10px] text-blue-700 font-bold">18 Schedule Items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">A. Total Material Cost (18 Items):</span>
                    <span className="font-bold text-slate-900">PKR {materialCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">B. Total Labour Cost (10% on Material Cost):</span>
                    <span className="font-bold text-rose-700">PKR {labourCost.toLocaleString()}</span>
                  </div>
                  {estimate.charges.transportationCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-sans">C. Transportation & Hauling:</span>
                      <span className="font-bold text-slate-900">PKR {estimate.charges.transportationCost.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 font-black text-slate-950 text-xs">
                    <span className="font-sans">Subtotal (Material + 10% Labour):</span>
                    <span>PKR {(materialCost + labourCost).toLocaleString()}</span>
                  </div>
                </div>

                {/* 16% Over Heads on Material Cost */}
                <div className="border border-slate-300 rounded-lg p-3 text-xs space-y-2 font-mono bg-slate-50/70">
                  <div className="font-bold text-slate-800 font-sans border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>Departmental & Contractor Overheads:</span>
                    <span className="text-[10px] text-amber-700 font-bold">16% on Material Cost</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">C. Departmental Overhead ({deptPercent}% on Material):</span>
                    <span>PKR {deptOverhead.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">D. Contractor Overhead ({contPercent}% on Material):</span>
                    <span>PKR {contOverhead.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-blue-900">
                    <span className="font-sans">Total Over Heads (16% on Material Cost):</span>
                    <span>PKR {totalOverheads.toLocaleString()}</span>
                  </div>
                  {estimate.charges.taxGstAmount > 0 && (
                    <div className="flex justify-between font-bold text-slate-900">
                      <span className="font-sans">E. Applicable Taxes / GST:</span>
                      <span>PKR {estimate.charges.taxGstAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Prime Cost Elements */}
                <div className="border border-slate-300 rounded-lg p-3 text-xs space-y-2 font-mono bg-white">
                  <div className="font-bold text-slate-800 font-sans border-b border-slate-200 pb-1">
                    Direct Work Execution Costs:
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">A. Total Material Cost:</span>
                    <span className="font-bold text-slate-900">PKR {estimate.charges.materialCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">B. Total Labour / Erection Charges:</span>
                    <span className="font-bold text-slate-900">PKR {estimate.charges.labourCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">C. Transportation, Hauling & Loading:</span>
                    <span className="font-bold text-slate-900">PKR {estimate.charges.transportationCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 font-black text-slate-950 text-xs">
                    <span className="font-sans">Base Prime Cost (A + B + C):</span>
                    <span>PKR {(estimate.charges.materialCost + estimate.charges.labourCost + estimate.charges.transportationCost).toLocaleString()}</span>
                  </div>
                </div>

                {/* Overheads, Engineering & Taxes */}
                <div className="border border-slate-300 rounded-lg p-3 text-xs space-y-2 font-mono bg-slate-50/70">
                  <div className="font-bold text-slate-800 font-sans border-b border-slate-200 pb-1">
                    Statutory & Departmental Overheads:
                  </div>
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
                    <span className="text-slate-600 font-sans">G. Contractor Profit & Overhead ({estimate.charges.contractorOverheadPercent}%):</span>
                    <span>PKR {estimate.charges.contractorOverheadAmount.toLocaleString()}</span>
                  </div>
                  {estimate.charges.taxGstAmount > 0 && (
                    <div className="flex justify-between font-bold text-slate-900">
                      <span className="font-sans">H. Applicable Taxes / GST:</span>
                      <span>PKR {estimate.charges.taxGstAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Grand Total Sanction Banner */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-3 shadow-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-extrabold block">
                  {isLumpSumOverhead ? 'NET ESTIMATED COST (GRAND TOTAL)' : 'SANCTIONED ESTIMATE GRAND TOTAL'}
                </span>
                <span className="text-xs text-slate-300">
                  {isLumpSumOverhead
                    ? `${is50KvaPackage ? '50' : (estimate.lineDetails.transformerCapacityKva || 25)} KVA Transformer Sub-Station Installation · Material + 10% Labour + 16% Over Heads`
                    : <>Total Route Length: <strong>{totalKm.toFixed(2)} km</strong> ({((estimate.lineDetails.htLengthKm || 0) * 10).toFixed(0)} spans HT)</>}
                </span>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
                  PKR {grandTotal.toLocaleString()}
                </div>
                <span className="text-[11px] text-emerald-400 font-mono font-bold block">
                  {isLumpSumOverhead
                    ? `Net Sanctioned Package Cost: PKR ${grandTotal.toLocaleString()}`
                    : `Average Rate: PKR ${estimate.charges.costPerKm.toLocaleString()} / km`}
                </span>
              </div>
            </div>

            {/* Grand Estimated Charge Summary Box */}
            {(() => {
              const foundationCost = estimate.lineDetails.foundationEnabled ? ((estimate.lineDetails.htPoles || 0) * 11450.75 + (estimate.lineDetails.ltPoles || 0) * 7324) : 0;
              const netDismantleCost = estimate.dismantledCharges ? (estimate.dismantledCharges.materialCost + estimate.dismantledCharges.labourCost) : 0;
              const grandEstCharge = ((grandTotal + foundationCost - netDismantleCost) * 0.51) / 100;
              return (
                <div className="bg-emerald-900 text-white p-4 rounded-xl mt-3 flex items-center justify-between text-xs font-sans shadow-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-extrabold block">
                      GRAND ESTIMATED CHARGE (0.51% FORMULA)
                    </span>
                    <span className="text-[11px] text-emerald-100 font-mono">
                      (Grand Total + Foundation - Net Dismantling) × 0.51 / 100
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-emerald-300 font-mono tracking-tight">
                      PKR {grandEstCharge.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>
        </div>

        {/* --- PAGE UNIT 4: DISMANTLE ESTIMATE SECTION (RETIRED ASSETS) --- */}
        {estimate.dismantledItems && estimate.dismantledItems.length > 0 && (
          <div className="print-page-unit space-y-3">
            {/* Header for Dismantle Only Report */}
            <header className="border-b-2 border-slate-900 pb-3 mb-4">
                <div className="text-center">
                    <h1 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight">
                        DISMANTLE MATERIAL ESTIMATE REPORT
                    </h1>
                    <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                        {estimate.projectInfo.schemeProjectName} · {estimate.projectInfo.estimateNo}
                    </div>
                </div>
            </header>

            <div className="bg-slate-50 border-l-4 border-amber-600 p-3 rounded-r-lg">
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-bold">II</span>
                <span>Part-II: Dismantle Material Estimate Section (Retired Assets Credit)</span>
              </h3>
              <p className="text-[10px] text-amber-800 mt-0.5">
                Detailed separate estimate prepared for the electrical materials retired and dismantled from site. Credit salvage value of retired materials is calculated at 1/3 (one-third) of standard CSR CSR-2026 rates.
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold border-b-2 border-slate-300">
                    <th className="py-2 px-2 text-center w-8">Sr.</th>
                    <th className="py-2 px-2.5">Store Code</th>
                    <th className="py-2 px-3">Retired Material Description & Engineering Specs</th>
                    <th className="py-2 px-2 text-center">Unit</th>
                    <th className="py-2 px-2.5 text-right">Quantity</th>
                    <th className="py-2 px-3 text-right font-mono">Std Rate (CSR)</th>
                    <th className="py-2 px-3 text-right font-mono">Dismantled Rate (1/3)</th>
                    <th className="py-2 px-3 text-right font-mono">Material Credit (PKR)</th>
                    <th className="py-2 px-3 text-right font-mono">Dismantling Labour (PKR)</th>
                    <th className="py-2 px-3 text-right font-mono">Total Credit (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px] tabular-nums">
                  {estimate.dismantledItems.map((item, idx) => {
                    const stdRate = item.unitRate * 3; // backtrack standard rate
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-2 text-center text-slate-500 font-sans">{idx + 1}</td>
                        <td className="py-2 px-2.5 font-bold text-slate-900">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono">
                            {item.materialCode}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans">
                          <span className="font-bold text-slate-950 block leading-tight">{item.description}</span>
                          {item.specification && (
                            <span className="text-[10px] text-slate-500 block leading-normal line-clamp-1">
                              {item.specification}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-sans text-slate-700">{item.unit}</td>
                        <td className="py-2 px-2.5 text-right font-bold text-slate-900">{item.quantity}</td>
                        <td className="py-2 px-3 text-right text-slate-500">{stdRate.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold text-amber-700">{item.unitRate.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-900">{item.materialAmount.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-700">{(item.labourAmount || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-black text-slate-950 bg-slate-50/50">
                          {((item.materialAmount || 0) + (item.labourAmount || 0)).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* Totals Row */}
                  {estimate.dismantledCharges && (
                    <tr className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-350">
                      <td colSpan={7} className="py-2.5 px-3 text-right font-sans uppercase tracking-wider text-xs">
                        Total Dismantle Estimate Salvage Credit:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black">
                        PKR {estimate.dismantledCharges.materialCost.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold" colSpan={1}>
                        PKR {estimate.dismantledCharges.labourCost.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-950 font-black text-xs font-mono bg-amber-50">
                        PKR {(estimate.dismantledCharges.materialCost + estimate.dismantledCharges.labourCost).toLocaleString()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Net Salvage Summary Banner */}
            {estimate.dismantledCharges && (
              <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-xl flex items-center justify-between text-xs font-sans text-amber-950 font-semibold shadow-2xs">
                <div>
                  <span className="uppercase tracking-wider text-amber-800 font-extrabold block text-[10px]">NET SALVAGE VALUE / ASSET RETIREMENT CREDIT</span>
                  <span className="text-[11px] text-slate-600 font-normal">To be adjusted against total capital expenditure during final accounting.</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-lg text-amber-800">
                    PKR {(estimate.dismantledCharges.materialCost + estimate.dismantledCharges.labourCost).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- PAGE UNIT 5: AUDITED FORMULAS, SIGNATURES & OFFICIAL FOOTER --- */}
        <div className="print-page-unit space-y-6">
          {/* ========================================================
              6. AUDITED FORMULAS & CALCULATION TRANSPARENCY
             ======================================================== */}
          {showAuditSteps && estimate.calculationSteps && estimate.calculationSteps.length > 0 && (
            <section className="space-y-2 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-indigo-600 flex items-center justify-between">
                <span>5. Audited Quantity Engineering Formulas & Notes</span>
                <span className="text-[10px] font-mono text-slate-500 font-normal">WAPDA Design Specs</span>
              </h2>

              <div className="border border-slate-200 rounded-lg p-3 bg-white text-xs divide-y divide-slate-100">
                {estimate.calculationSteps.map((step, sIdx) => (
                  <div key={sIdx} className="py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <span className="font-bold text-slate-900">{step.component}: </span>
                      <span className="text-slate-600 font-mono">{step.calculation}</span>
                      {step.formula && (
                        <span className="text-[10px] text-slate-500 block italic">Formula: {step.formula}</span>
                      )}
                    </div>
                    <div className="font-bold font-mono text-blue-900 shrink-0">
                      = {step.resultQuantity} {step.unit}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ========================================================
              7. OFFICIAL SIGNATURES & SANCTION BLOCK
             ======================================================== */}
          {showSignatures && (
            <section className="break-inside-avoid pt-10 border-t-2 border-slate-900" style={{ pageBreakInside: 'avoid' }}>
              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                {/* SDO */}
                <div className="space-y-12">
                  <div className="border-b border-slate-400 pb-1">
                    <span className="font-bold text-slate-900 block font-mono text-[11px]">
                      {estimate.projectInfo.preparedBy || 'Engr. M. Inayat'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block uppercase">PREPARED BY</span>
                    <span className="text-slate-600 text-[11px] block">{estimate.projectInfo.designation || 'Sub-Divisional Officer (SDO)'}</span>
                    <span className="text-slate-500 text-[10px] block">PESCO {estimate.projectInfo.subDivision}</span>
                  </div>
                </div>

                {/* XEN */}
                <div className="space-y-12">
                  <div className="border-b border-slate-400 pb-1">
                    <span className="font-bold text-slate-900 block font-mono text-[11px]">
                      {estimate.projectInfo.checkedBy || 'Engr. Tariq Khan'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block uppercase">CHECKED & VERIFIED BY</span>
                    <span className="text-slate-600 text-[11px] block">Executive Engineer (XEN)</span>
                    <span className="text-slate-500 text-[10px] block">PESCO {estimate.projectInfo.division}</span>
                  </div>
                </div>

                {/* SE / CE */}
                <div className="space-y-12">
                  <div className="border-b border-slate-400 pb-1">
                    <span className="font-bold text-slate-900 block font-mono text-[11px]">
                      {estimate.projectInfo.approvedBy || 'Engr. Abdul Rehman'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block uppercase">SANCTIONED & APPROVED BY</span>
                    <span className="text-slate-600 text-[11px] block">Superintending Engineer (SE) / CE</span>
                    <span className="text-slate-500 text-[10px] block">PESCO {estimate.projectInfo.circle}</span>
                  </div>
                </div>
              </div>

              {/* Official Disclaimer & Verification Stamp */}
              <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-1">
                <span>Security Stamp: Verified through PESCO Technical Automation Sub-system (Audit Ref: {estimate.id})</span>
                <span>Computer Generated Engineering Document · No Manual Amendments Valid Without Re-Sanction</span>
              </div>
            </section>
          )}
        </div>

      </div>
    </div>
  );
};
