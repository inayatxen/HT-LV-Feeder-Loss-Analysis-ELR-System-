/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CostEstimateRecord } from '../../types/costEstimation';
import { Calculator, Printer, FileText, CheckCircle2, AlertTriangle, Layers, Info } from 'lucide-react';
import { JustificationSlipPrintModal } from './JustificationSlipPrintModal';

interface JustificationSlipViewProps {
  estimates: CostEstimateRecord[];
}

export const JustificationSlipView: React.FC<JustificationSlipViewProps> = ({ estimates }) => {
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  // Selected Estimate linkage
  const [selectedEstimateId, setSelectedEstimateId] = useState<string>('default');
  const [useLinkedCost, setUseLinkedCost] = useState<boolean>(true);
  const [manualProjectCost, setManualProjectCost] = useState<number>(1769032);

  // Section 1: Line Losses (Proposal A)
  const [existingLosses5Yrs, setExistingLosses5Yrs] = useState<number>(12308.9);
  const [proposalALosses, setProposalALosses] = useState<number>(8745.1);
  const [proposalBLosses, setProposalBLosses] = useState<number>(0);
  const [proposalCLosses, setProposalCLosses] = useState<number>(0);
  const [proposalDLosses, setProposalDLosses] = useState<number>(0);
  const [energyRateA, setEnergyRateA] = useState<number>(24.83); // Rs. per kWh

  // Section 2: Transformer Loading & Peak Saving (Proposal B / Augmentation)
  const [existingTrfRating, setExistingTrfRating] = useState<number>(100); // kVA
  const [trfLoadingPresent, setTrfLoadingPresent] = useState<number>(119); // %
  const [trfLoading5Yrs, setTrfLoading5Yrs] = useState<number>(152); // %
  const [loadingAboveRated5Yrs, setLoadingAboveRated5Yrs] = useState<number>(52); // %
  const [peakKwSaving, setPeakKwSaving] = useState<number>(41.6); // kW
  const [transformerAnnualKwh, setTransformerAnnualKwh] = useState<number>(109324.8); // kWh
  const [benefitRateB, setBenefitRateB] = useState<number>(4.39); // Rs. per kWh
  const [studyPeriodYears, setStudyPeriodYears] = useState<number>(5); // years

  // Linked cost
  const linkedEstimate = estimates.find(e => e.id === selectedEstimateId);
  const linkedCost = linkedEstimate ? linkedEstimate.charges.grandTotal : 1769032;
  const totalCost = useLinkedCost ? linkedCost : manualProjectCost;

  // Calculations
  const totalProposalLosses = proposalALosses + proposalBLosses + proposalCLosses + proposalDLosses;
  const energySavingsKwh = Math.max(0, existingLosses5Yrs - totalProposalLosses);
  const annualBenefitA = energySavingsKwh * energyRateA;

  const annualBenefitB = transformerAnnualKwh * benefitRateB;

  const totalAnnualBenefit = annualBenefitA + annualBenefitB;
  const totalStudyPeriodBenefit = totalAnnualBenefit * studyPeriodYears;
  const benefitCostRatio = totalCost > 0 ? totalStudyPeriodBenefit / totalCost : 0;
  const isViable = benefitCostRatio >= 1.0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-1">
            <FileText className="w-4 h-4" />
            <span>WAPDA / PESCO TECHNICAL SANCTION & ENGINEERING JUSTIFICATION</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Official System Rehabilitation Justification Slip
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Combined economic justification for line loss reduction (Proposal A) and transformer augmentation/relief (Proposal B).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Slip</span>
          </button>
        </div>
      </div>

      {/* Project Cost Linkage Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">★</span>
          Total Cost of Proposed Rehabilitation (Project Estimate)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Source:</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUseLinkedCost(false)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  !useLinkedCost ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Manual (Rs.)
              </button>
              <button
                type="button"
                onClick={() => setUseLinkedCost(true)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  useLinkedCost ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Link Estimate
              </button>
            </div>
          </div>

          {useLinkedCost ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Estimate:</label>
              <select
                value={selectedEstimateId}
                onChange={(e) => setSelectedEstimateId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
              >
                <option value="default">Default Sample (Rs. 1,769,032)</option>
                {estimates.map(est => (
                  <option key={est.id} value={est.id}>
                    {est.projectInfo.estimateNo} - {est.projectInfo.schemeProjectName} (Rs. {est.charges.grandTotal.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Cost (Rs.):</label>
              <input
                type="number"
                value={manualProjectCost}
                onChange={(e) => setManualProjectCost(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
              />
            </div>
          )}
        </div>
      </div>

      {/* PART I: Line Loss Reduction (Proposal A) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs flex items-center justify-center font-bold">A</span>
            Part-I: Annual Energy Losses & Line Rehabilitation Benefits
          </h2>
          <span className="text-xs font-mono bg-amber-50 text-amber-900 px-2.5 py-1 rounded font-bold">Proposal A</span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-800">Annual Energy Losses After 5 Years (Existing Baseline):</span>
            <div className="flex items-center gap-2 font-mono">
              <input
                type="number"
                step="0.1"
                value={existingLosses5Yrs}
                onChange={(e) => setExistingLosses5Yrs(Number(e.target.value))}
                className="w-32 px-2.5 py-1 bg-white border border-slate-300 rounded font-bold text-right"
              />
              <span className="text-slate-600 font-bold w-12">KWH</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4">
            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-700 font-medium">a) Annual Energy Losses (Proposal A - Reconductoring):</span>
              <div className="flex items-center gap-2 font-mono">
                <input
                  type="number"
                  step="0.1"
                  value={proposalALosses}
                  onChange={(e) => setProposalALosses(Number(e.target.value))}
                  className="w-28 px-2 py-1 bg-white border border-slate-300 rounded font-bold text-right"
                />
                <span className="text-slate-600 w-10">KWH</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-700 font-medium">b) Annual Energy Losses (Proposal B):</span>
              <div className="flex items-center gap-2 font-mono">
                <input
                  type="number"
                  step="0.1"
                  value={proposalBLosses}
                  onChange={(e) => setProposalBLosses(Number(e.target.value))}
                  className="w-28 px-2 py-1 bg-white border border-slate-300 rounded font-bold text-right"
                />
                <span className="text-slate-600 w-10">KWH</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-700 font-medium">c) Annual Energy Losses (Proposal C):</span>
              <div className="flex items-center gap-2 font-mono">
                <input
                  type="number"
                  step="0.1"
                  value={proposalCLosses}
                  onChange={(e) => setProposalCLosses(Number(e.target.value))}
                  className="w-28 px-2 py-1 bg-white border border-slate-300 rounded font-bold text-right"
                />
                <span className="text-slate-600 w-10">KWH</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-700 font-medium">d) Annual Energy Losses (Proposal D):</span>
              <div className="flex items-center gap-2 font-mono">
                <input
                  type="number"
                  step="0.1"
                  value={proposalDLosses}
                  onChange={(e) => setProposalDLosses(Number(e.target.value))}
                  className="w-28 px-2 py-1 bg-white border border-slate-300 rounded font-bold text-right"
                />
                <span className="text-slate-600 w-10">KWH</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-blue-50/60 rounded-lg border border-blue-200 font-bold text-blue-950 font-mono">
            <span>e) Total Proposed Losses (A + B + C + D):</span>
            <span>{totalProposalLosses.toFixed(1)} KWH</span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 font-bold text-emerald-950 font-mono">
            <span>f) Annual Energy Savings (Existing - Proposed):</span>
            <span className="text-emerald-700">{energySavingsKwh.toFixed(1)} KWH</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900 text-white rounded-xl font-mono">
            <div className="flex items-center gap-2 font-sans font-bold">
              <span>g) Annual Benefit A (@</span>
              <input
                type="number"
                step="0.01"
                value={energyRateA}
                onChange={(e) => setEnergyRateA(Number(e.target.value))}
                className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-amber-400 font-mono font-bold text-right text-xs"
              />
              <span>Rs / KWH):</span>
            </div>
            <span className="text-lg font-black text-amber-400">
              Rs. {annualBenefitA.toLocaleString(undefined, {minimumFractionDigits: 4, maximumFractionDigits: 4})}
            </span>
          </div>
        </div>
      </div>

      {/* PART II: Transformer Loading & Peak Saving (Proposal B) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-xs flex items-center justify-center font-bold">B</span>
            Part-II: Transformer Loading & Peak KW Saving (Augmentation Relief)
          </h2>
          <span className="text-xs font-mono bg-purple-50 text-purple-900 px-2.5 py-1 rounded font-bold">Proposal B</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-800">a) Existing Transformer Rating:</span>
            <div className="flex items-center gap-2 font-mono">
              <input
                type="number"
                value={existingTrfRating}
                onChange={(e) => setExistingTrfRating(Number(e.target.value))}
                className="w-24 px-2 py-1 bg-white border border-slate-300 rounded font-bold text-right"
              />
              <span className="text-slate-600 font-bold w-10">KVA</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-800">b) Loading of Existing T/F at Present:</span>
            <div className="flex items-center gap-2 font-mono">
              <input
                type="number"
                value={trfLoadingPresent}
                onChange={(e) => setTrfLoadingPresent(Number(e.target.value))}
                className="w-24 px-2 py-1 bg-white border border-slate-300 rounded font-bold text-right"
              />
              <span className="text-slate-600 font-bold w-12">% KVA</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-800">c) Loading of Existing T/F after 5 years:</span>
            <div className="flex items-center gap-2 font-mono">
              <input
                type="number"
                value={trfLoading5Yrs}
                onChange={(e) => setTrfLoading5Yrs(Number(e.target.value))}
                className="w-24 px-2 py-1 bg-white border border-slate-300 rounded font-bold text-right"
              />
              <span className="text-slate-600 font-bold w-12">% KVA</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-800">d) Loading above rated capacity after 5 yrs:</span>
            <div className="flex items-center gap-2 font-mono">
              <input
                type="number"
                value={loadingAboveRated5Yrs}
                onChange={(e) => setLoadingAboveRated5Yrs(Number(e.target.value))}
                className="w-24 px-2 py-1 bg-white border border-slate-300 rounded font-bold text-right"
              />
              <span className="text-slate-600 font-bold w-12">% KVA</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-800">e) PEAK K.W Saving (P.K.W.S):</span>
            <div className="flex items-center gap-2 font-mono">
              <input
                type="number"
                step="0.1"
                value={peakKwSaving}
                onChange={(e) => setPeakKwSaving(Number(e.target.value))}
                className="w-24 px-2 py-1 bg-white border border-slate-300 rounded font-bold text-right"
              />
              <span className="text-slate-600 font-bold w-10">KW</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-800">F) Annual KWH (Transformer Relief):</span>
            <div className="flex items-center gap-2 font-mono">
              <input
                type="number"
                step="0.1"
                value={transformerAnnualKwh}
                onChange={(e) => setTransformerAnnualKwh(Number(e.target.value))}
                className="w-28 px-2 py-1 bg-white border border-slate-300 rounded font-bold text-right"
              />
              <span className="text-slate-600 font-bold w-10">KWH</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-purple-950 text-white rounded-xl font-mono">
          <div className="flex items-center gap-2 font-sans font-bold text-xs">
            <span>g) Annual Benefits (@</span>
            <input
              type="number"
              step="0.01"
              value={benefitRateB}
              onChange={(e) => setBenefitRateB(Number(e.target.value))}
              className="w-20 px-2 py-1 bg-purple-900 border border-purple-700 rounded text-amber-300 font-mono font-bold text-right text-xs"
            />
            <span>Rs / KWH):</span>
          </div>
          <span className="text-lg font-black text-amber-300">
            Rs. {annualBenefitB.toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3})}
          </span>
        </div>
      </div>

      {/* PART III: Summary & Benefit / Cost Ratio Verdict */}
      <div className={`rounded-2xl border p-6 shadow-md text-white space-y-6 ${
        isViable ? 'bg-emerald-950 border-emerald-700' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <span className="text-xs uppercase tracking-widest font-bold text-slate-300">
            Part-III: Final Justification & Benefit / Cost Ratio (BCR)
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
            isViable ? 'bg-emerald-400 text-slate-950' : 'bg-rose-500 text-white'
          }`}>
            {isViable ? 'VIABLE PROPOSAL' : 'NOT VIABLE'}
          </span>
        </div>

        <div className="space-y-4 text-sm font-mono">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="font-sans text-slate-300 font-semibold">a) Benefit of A + B (Total Annual Benefits):</span>
            <span className="font-bold text-amber-400 text-base">
              Rs. {totalAnnualBenefit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/5 rounded-xl border border-white/10 font-sans">
            <div className="flex items-center gap-2 font-semibold text-slate-300 text-xs">
              <span>b) Study Period (Years):</span>
              <input
                type="number"
                min="1"
                max="30"
                value={studyPeriodYears}
                onChange={(e) => setStudyPeriodYears(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-amber-400 font-mono font-bold text-right text-xs"
              />
            </div>
            <span className="font-mono text-xs text-amber-300 font-bold">
              {studyPeriodYears}-Yr Total Benefit: Rs. {totalStudyPeriodBenefit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="font-sans text-slate-300 font-semibold">c) Total Cost of Proposed Rehabilitation:</span>
            <span className="font-bold text-slate-200 text-base">
              Rs. {totalCost.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-amber-400/10 rounded-2xl border-2 border-amber-400">
            <div>
              <span className="font-sans text-amber-300 font-black uppercase text-base block">
                d) Benefit / Cost Ratio (BCR):
              </span>
              <span className="text-[11px] text-slate-300 font-sans font-normal block">
                Formula: ({studyPeriodYears} × Annual Benefit A+B) / Project Cost = ({studyPeriodYears} × Rs. {Math.round(totalAnnualBenefit).toLocaleString()}) / Rs. {totalCost.toLocaleString()}
              </span>
            </div>
            <span className="text-3xl font-black text-amber-400">
              {benefitCostRatio.toFixed(2)}
            </span>
          </div>

          <div className="pt-2 text-xs text-slate-300 italic text-center">
            {isViable 
              ? `✨ It is a VIABLE Proposal. The {studyPeriodYears}-year total benefits exceed project costs (BCR ${benefitCostRatio.toFixed(2)} ≥ 1.0).`
              : '⚠️ It is Not a Viable Proposal. BCR is below 1.0.'}
          </div>
        </div>
      </div>

      <JustificationSlipPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        data={{
          totalCost,
          existingLosses5Yrs,
          proposalALosses,
          proposalBLosses,
          proposalCLosses,
          proposalDLosses,
          totalProposalLosses,
          energySavingsKwh,
          energyRateA,
          annualBenefitA,
          existingTrfRating,
          trfLoadingPresent,
          trfLoading5Yrs,
          loadingAboveRated5Yrs,
          peakKwSaving,
          transformerAnnualKwh,
          benefitRateB,
          annualBenefitB,
          studyPeriodYears,
          totalAnnualBenefit,
          totalStudyPeriodBenefit: totalAnnualBenefit * studyPeriodYears,
          benefitCostRatio,
          isViable
        }}
      />

    </div>
  );
};
