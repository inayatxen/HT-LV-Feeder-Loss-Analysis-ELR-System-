/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { CostEstimateRecord } from '../../types/costEstimation';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  ShieldAlert, 
  CheckCircle2, 
  Printer, 
  FileSpreadsheet, 
  RefreshCw,
  Info
} from 'lucide-react';
import { CostBenefitAnalysisPrintModal } from './CostBenefitAnalysisPrintModal';

interface CostBenefitAnalysisViewProps {
  estimates: CostEstimateRecord[];
}

export const CostBenefitAnalysisView: React.FC<CostBenefitAnalysisViewProps> = ({ estimates }) => {
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  // Selected Estimate to link Project Cost
  const [selectedEstimateId, setSelectedEstimateId] = useState<string>('default');

  // Input States matching WAPDA Cost Benefit Analysis Sheet
  // Existing Conditions
  const [existingPowerLossKw, setExistingPowerLossKw] = useState<number>(4.5);
  const [existingEnergyLossKwh, setExistingEnergyLossKwh] = useState<number>(7557);
  const [existingPowerFactor, setExistingPowerFactor] = useState<number>(80);
  const [existingVoltageDrop, setExistingVoltageDrop] = useState<number>(8);

  // After Improvements Conditions
  const [improvedPowerLossKw, setImprovedPowerLossKw] = useState<number>(3.2);
  const [improvedEnergyLossKwh, setImprovedEnergyLossKwh] = useState<number>(5371);
  const [improvedPowerFactor, setImprovedPowerFactor] = useState<number>(80);
  const [improvedVoltageDrop, setImprovedVoltageDrop] = useState<number>(5);

  // Project Estimated Cost (Default to 1,769,032 or linked estimate grand total)
  const [manualProjectCost, setManualProjectCost] = useState<number>(1769032);
  const [useLinkedCost, setUseLinkedCost] = useState<boolean>(false);

  // System Parameters
  const [loadGrowthPercent, setLoadGrowthPercent] = useState<number>(5);
  const [discountRatePercent, setDiscountRatePercent] = useState<number>(12);
  const [studyPeriodYears, setStudyPeriodYears] = useState<number>(5);
  const [demandChargesRate, setDemandChargesRate] = useState<number>(4837); // Rs. per kW
  const [energyChargesRate, setEnergyChargesRate] = useState<number>(24.83); // Rs. per kWh

  // Linked estimate cost computation
  const linkedEstimate = estimates.find(e => e.id === selectedEstimateId);
  const linkedCost = linkedEstimate ? linkedEstimate.charges.grandTotal : 1769032;
  const projectCost = useLinkedCost ? linkedCost : manualProjectCost;

  // Calculations
  const reductionPowerLossKw = Number((existingPowerLossKw - improvedPowerLossKw).toFixed(2));
  const baseEnergyLossReductionKwh = existingEnergyLossKwh - improvedEnergyLossKwh;

  // Year by year discounting projection over study period
  const yearlyProjections = useMemo(() => {
    const growth = loadGrowthPercent / 100;
    const discount = discountRatePercent / 100;
    const rows = [];

    let totalPvBenefits = 0;

    for (let year = 1; year <= studyPeriodYears; year++) {
      // Compounded growth factor for year t
      const growthFactor = Math.pow(1 + growth, year);
      const energySavingsKwh = baseEnergyLossReductionKwh * growthFactor;
      const demandSavingsKw = reductionPowerLossKw * growthFactor;

      const energyBenefit = energySavingsKwh * energyChargesRate;
      const demandBenefit = demandSavingsKw * demandChargesRate;
      const totalAnnualBenefit = energyBenefit + demandBenefit;

      // Present value factor: 1 / (1 + r)^t
      const pvFactor = 1 / Math.pow(1 + discount, year);
      const presentValueBenefit = totalAnnualBenefit * pvFactor;

      totalPvBenefits += presentValueBenefit;

      rows.push({
        year,
        energySavingsKwh,
        demandSavingsKw,
        energyBenefit,
        demandBenefit,
        totalAnnualBenefit,
        pvFactor,
        presentValueBenefit
      });
    }

    const bcr = projectCost > 0 ? totalPvBenefits / projectCost : 0;
    const isViable = bcr >= 1.0;

    return {
      rows,
      totalPvBenefits,
      bcr,
      isViable
    };
  }, [
    baseEnergyLossReductionKwh,
    reductionPowerLossKw,
    loadGrowthPercent,
    discountRatePercent,
    studyPeriodYears,
    energyChargesRate,
    demandChargesRate,
    projectCost
  ]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-1">
            <Calculator className="w-4 h-4" />
            <span>WAPDA / PESCO PLANNING & ENGINEERING DIVISION</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Cost Benefit Analysis & Benefit-Cost Ratio (BCR)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate economic viability of network improvements, loss reduction, and capital investment proposals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Inputs and Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Parameters Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Project Cost Linkage */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">1</span>
              Project Estimated Cost (Capital Investment)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project Cost Source:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUseLinkedCost(false)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      !useLinkedCost ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Manual Entry (Rs.)
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Project Estimated Cost (Rs.):</label>
                  <input
                    type="number"
                    value={manualProjectCost}
                    onChange={(e) => setManualProjectCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 font-sans font-bold">Active Project Capital Cost:</span>
              <span className="text-sm font-black text-blue-900">Rs. {projectCost.toLocaleString()}</span>
            </div>
          </div>

          {/* Technical Conditions: Existing vs After Improvements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Existing Conditions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-bold">E</span>
                  Existing Conditions
                </h3>
                <span className="text-[10px] font-mono bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold">Baseline</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Power Losses (kW):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={existingPowerLossKw}
                    onChange={(e) => setExistingPowerLossKw(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Energy Losses (kWh):</label>
                  <input
                    type="number"
                    value={existingEnergyLossKwh}
                    onChange={(e) => setExistingEnergyLossKwh(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Power Factor (%):</label>
                  <input
                    type="number"
                    value={existingPowerFactor}
                    onChange={(e) => setExistingPowerFactor(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Voltage Drop (%):</label>
                  <input
                    type="number"
                    value={existingVoltageDrop}
                    onChange={(e) => setExistingVoltageDrop(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* After Improvements Conditions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-bold">I</span>
                  After Improvements
                </h3>
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold">Proposed</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Power Losses (kW):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={improvedPowerLossKw}
                    onChange={(e) => setImprovedPowerLossKw(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Energy Losses (kWh):</label>
                  <input
                    type="number"
                    value={improvedEnergyLossKwh}
                    onChange={(e) => setImprovedEnergyLossKwh(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Power Factor (%):</label>
                  <input
                    type="number"
                    value={improvedPowerFactor}
                    onChange={(e) => setImprovedPowerFactor(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Voltage Drop (%):</label>
                  <input
                    type="number"
                    value={improvedVoltageDrop}
                    onChange={(e) => setImprovedVoltageDrop(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* System Parameters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-bold">2</span>
              System Parameters & Economic Rates
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Annual Load Growth (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={loadGrowthPercent}
                  onChange={(e) => setLoadGrowthPercent(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Annual Discount Rate (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={discountRatePercent}
                  onChange={(e) => setDiscountRatePercent(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Study Period (Years):</label>
                <input
                  type="number"
                  value={studyPeriodYears}
                  onChange={(e) => setStudyPeriodYears(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Demand Charges (Rs. / kW):</label>
                <input
                  type="number"
                  step="0.01"
                  value={demandChargesRate}
                  onChange={(e) => setDemandChargesRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Energy Charges (Rs. / kWh):</label>
                <input
                  type="number"
                  step="0.01"
                  value={energyChargesRate}
                  onChange={(e) => setEnergyChargesRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right 1 Col: Results & BCR Verdict Card */}
        <div className="space-y-6">
          
          <div className={`rounded-2xl border p-6 shadow-md text-white space-y-6 ${
            yearlyProjections.isViable ? 'bg-emerald-950 border-emerald-700' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <span className="text-xs uppercase tracking-widest font-bold text-slate-400">
                Economic Viability Analysis
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                yearlyProjections.isViable ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
              }`}>
                {yearlyProjections.isViable ? 'VIABLE PROPOSAL' : 'NOT VIABLE'}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-400 block">Reduction in Losses:</span>
                <span className="text-2xl font-black font-mono text-amber-400">
                  {reductionPowerLossKw} kW
                </span>
                <span className="text-[11px] text-slate-300 block mt-0.5">
                  ({baseEnergyLossReductionKwh.toLocaleString()} kWh / year baseline)
                </span>
              </div>

              <div className="pt-3 border-t border-white/10">
                <span className="text-xs text-slate-400 block">Present Value (PV) of Benefits:</span>
                <span className="text-lg font-black font-mono text-emerald-400">
                  Rs. {Math.round(yearlyProjections.totalPvBenefits).toLocaleString()}
                </span>
              </div>

              <div className="pt-3 border-t border-white/10">
                <span className="text-xs text-slate-400 block">Project Estimated Cost:</span>
                <span className="text-lg font-black font-mono text-slate-200">
                  Rs. {projectCost.toLocaleString()}
                </span>
              </div>

              <div className="pt-4 border-t-2 border-amber-400/50 bg-white/5 p-4 rounded-xl space-y-1">
                <span className="text-xs text-amber-300 font-bold block uppercase">
                  BENEFIT COST RATIO (BCR):
                </span>
                <div className="text-4xl font-black font-mono text-amber-400">
                  {yearlyProjections.bcr.toFixed(2)}
                </div>
                <p className="text-xs text-slate-300 italic pt-2">
                  {yearlyProjections.isViable 
                    ? '✨ It is a VIABLE Proposal. Present value of benefits exceeds capital investment.' 
                    : '⚠️ It is Not a Viable Proposal. BCR is less than 1.0.'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-xs text-blue-900 space-y-2 shadow-xs">
            <div className="font-bold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>WAPDA Planning Standard</span>
            </div>
            <p className="text-blue-800 leading-relaxed">
              According to PESCO/WAPDA planning criteria, distribution improvement schemes must achieve a Benefit-Cost Ratio (BCR) of <strong>1.0 or higher</strong> to be sanctioned for capital execution.
            </p>
          </div>

        </div>

      </div>

      {/* Year-by-Year Cash Flow Projection Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Year-by-Year Discounted Benefit Cash Flow (Study Period: {studyPeriodYears} Years)
        </h3>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-3 text-center">Year</th>
                <th className="py-3 px-3 text-right">Energy Saved (kWh)</th>
                <th className="py-3 px-3 text-right">Demand Saved (kW)</th>
                <th className="py-3 px-3 text-right">Energy Benefit (Rs.)</th>
                <th className="py-3 px-3 text-right">Demand Benefit (Rs.)</th>
                <th className="py-3 px-3 text-right">Total Annual Benefit (Rs.)</th>
                <th className="py-3 px-3 text-right">PV Factor ({discountRatePercent}%)</th>
                <th className="py-3 px-3 text-right">Present Value (Rs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-slate-800">
              {yearlyProjections.rows.map(row => (
                <tr key={row.year} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-center font-bold">Year {row.year}</td>
                  <td className="py-2.5 px-3 text-right">{Math.round(row.energySavingsKwh).toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right">{row.demandSavingsKw.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right">{Math.round(row.energyBenefit).toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right">{Math.round(row.demandBenefit).toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-blue-900">{Math.round(row.totalAnnualBenefit).toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-slate-500">{row.pvFactor.toFixed(4)}</td>
                  <td className="py-2.5 px-3 text-right font-black text-emerald-800 bg-emerald-50/40">
                    Rs. {Math.round(row.presentValueBenefit).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold font-mono">
                <td colSpan={7} className="py-3 px-3 text-right font-sans uppercase tracking-wider">
                  Total Present Value of Benefits (PV):
                </td>
                <td className="py-3 px-3 text-right text-amber-400 text-sm">
                  Rs. {Math.round(yearlyProjections.totalPvBenefits).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <CostBenefitAnalysisPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        data={{
          projectCost,
          existingPowerLossKw,
          existingEnergyLossKwh,
          existingPowerFactor,
          existingVoltageDrop,
          improvedPowerLossKw,
          improvedEnergyLossKwh,
          improvedPowerFactor,
          improvedVoltageDrop,
          reductionPowerLossKw,
          baseEnergyLossReductionKwh,
          loadGrowthPercent,
          discountRatePercent,
          studyPeriodYears,
          demandChargesRate,
          energyChargesRate,
          yearlyProjections
        }}
      />

    </div>
  );
};
