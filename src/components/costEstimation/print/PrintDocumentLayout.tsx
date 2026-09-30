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

  const paddingClass = 
    marginSize === 'narrow' ? 'p-4 sm:p-6' :
    marginSize === 'wide' ? 'p-8 sm:p-12' : 
    'p-6 sm:p-8';

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
        </section>

        {/* ========================================================
            4. DETAILED BILL OF QUANTITIES (BOQ) TABLE
           ======================================================== */}
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-emerald-600 flex items-center justify-between">
            <span>3. Detailed Bill of Quantities (BOQ) & Erection Schedule</span>
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
                {estimate.items.map((item, idx) => (
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
                    PKR {estimate.charges.materialCost.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold" colSpan={2}>
                    PKR {estimate.charges.labourCost.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-blue-950 font-black text-xs font-mono">
                    PKR {(estimate.charges.materialCost + estimate.charges.labourCost).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================
            5. ABSTRACT OF COST & DEPARTMENTAL OVERHEADS
           ======================================================== */}
        <section className="space-y-2 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 border-l-4 border-slate-800 flex items-center justify-between">
            <span>4. Abstract of Cost & Departmental Overheads</span>
            <span className="text-[10px] font-mono text-slate-500 font-normal">Section D</span>
          </h2>

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

          {/* Grand Total Sanction Banner */}
          <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-3 shadow-xs">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-amber-400 font-extrabold block">
                SANCTIONED ESTIMATE GRAND TOTAL
              </span>
              <span className="text-xs text-slate-300">
                Total Route Length: <strong>{totalKm.toFixed(2)} km</strong> ({((estimate.lineDetails.htLengthKm || 0) * 10).toFixed(0)} spans HT)
              </span>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
                PKR {estimate.charges.grandTotal.toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-400 font-mono font-bold block">
                Average Rate: PKR {estimate.charges.costPerKm.toLocaleString()} / km
              </span>
            </div>
          </div>
        </section>

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

        {/* ========================================================
            8. RUNNING FOOTER BLOCK
           ======================================================== */}
        <footer className="border-t border-slate-300 pt-3 text-[10px] text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-700">
              PESCO Distribution Works · Technical Sanction & Cost Estimation Dossier (CSR-2026)
            </span>
            <span className="font-mono text-slate-600">
              Doc Ref: {estimate.projectInfo.estimateNo} ({estimate.projectInfo.revisionNo})
            </span>
            <span className="font-medium text-slate-700">
              Generated by: {estimate.projectInfo.preparedBy || 'SDO Technical'} · {new Date().toLocaleDateString('en-GB')}
            </span>
          </div>
        </footer>

      </div>
    </div>
  );
};
