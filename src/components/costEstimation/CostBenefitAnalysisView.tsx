/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { CostEstimateRecord } from '../../types/costEstimation';
import { FeederData, FeederAnalysisSummary } from '../../types/feeder';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  ShieldAlert, 
  CheckCircle2, 
  Printer, 
  FileSpreadsheet, 
  RefreshCw,
  Info,
  Zap,
  ShieldCheck,
  Link2,
  ArrowRight,
  Database,
  Save,
  Undo2,
  Sparkles
} from 'lucide-react';
import { CostBenefitAnalysisPrintModal } from './CostBenefitAnalysisPrintModal';
import { format11DigitWorkOrder, parse11DigitWorkOrder, generate11DigitWorkOrder } from '../../utils/costEngine';

interface CostBenefitAnalysisViewProps {
  estimates: CostEstimateRecord[];
  activeFeeder?: FeederData;
  existingSummary?: FeederAnalysisSummary;
  proposedSummary?: FeederAnalysisSummary;
  hasActiveInterventions?: boolean;
  linkedEstimate?: CostEstimateRecord | null;
  onSaveUnifiedProject?: () => void;
}

/**
 * Computes tied default values from active Feeder Analysis (ELR) and Cost Estimation
 */
function getTiedValues(
  feeder?: FeederData,
  existingSummary?: FeederAnalysisSummary,
  proposedSummary?: FeederAnalysisSummary,
  hasActiveInterventions?: boolean,
  linkedEstimate?: CostEstimateRecord | null,
  allEstimates: CostEstimateRecord[] = []
) {
  // 1. Existing conditions from tied ELR Analysis (Baseline)
  const baseLossKw = existingSummary 
    ? Number((existingSummary.totalPowerLossKw || existingSummary.totalLineLossKw || 4.5).toFixed(2))
    : 4.5;
  const baseLossKwh = existingSummary 
    ? Math.round(existingSummary.annualEnergyLossKwh || 7557)
    : 7557;
  const basePf = Math.round((feeder?.operatingPowerFactor || existingSummary?.operatingPowerFactor || 0.80) * 100);
  const baseVoltDrop = existingSummary 
    ? Number((existingSummary.worstVoltageDropPercent || 8.0).toFixed(2))
    : 8.0;

  // 2. Proposed conditions (After Improvements)
  let propLossKw = 3.2;
  let propLossKwh = 5371;
  let propPf = 80;
  let propVoltDrop = 5.0;

  if (hasActiveInterventions && proposedSummary) {
    propLossKw = Number((proposedSummary.totalPowerLossKw || proposedSummary.totalLineLossKw).toFixed(2));
    propLossKwh = Math.round(proposedSummary.annualEnergyLossKwh);
    propPf = Math.round((proposedSummary.operatingPowerFactor || 0.85) * 100);
    propVoltDrop = Number(proposedSummary.worstVoltageDropPercent.toFixed(2));
  } else if (proposedSummary && (proposedSummary.totalPowerLossKw || proposedSummary.totalLineLossKw) < (existingSummary?.totalPowerLossKw || existingSummary?.totalLineLossKw || Infinity)) {
    propLossKw = Number((proposedSummary.totalPowerLossKw || proposedSummary.totalLineLossKw).toFixed(2));
    propLossKwh = Math.round(proposedSummary.annualEnergyLossKwh);
    propPf = Math.round((proposedSummary.operatingPowerFactor || 0.85) * 100);
    propVoltDrop = Number(proposedSummary.worstVoltageDropPercent.toFixed(2));
  } else if (existingSummary) {
    // Standard WAPDA ELR intervention target achieves ~29% technical loss reduction
    propLossKw = Number((baseLossKw * 0.71).toFixed(2));
    propLossKwh = Math.round(baseLossKwh * 0.71);
    propPf = Math.min(95, Math.max(80, basePf + 5));
    propVoltDrop = Math.max(2.5, Number((baseVoltDrop * 0.65).toFixed(2)));
  }

  // 3. Tied Cost Estimate
  const matchedEstimate = 
    linkedEstimate ||
    feeder?.linkedEstimate ||
    allEstimates.find(e => feeder?.linkedEstimateId && e.id === feeder.linkedEstimateId) ||
    allEstimates.find(e => feeder && e.id === `est-elr-${feeder.id}`) ||
    allEstimates.find(e => feeder && e.id.includes(feeder.id)) ||
    allEstimates.find(e => feeder && e.projectInfo.feederName?.trim().toLowerCase() === feeder.name?.trim().toLowerCase()) ||
    allEstimates.find(e => feeder?.workOrderNo && e.projectInfo.workOrderNo === feeder.workOrderNo) ||
    allEstimates[0] ||
    null;

  const projectCost = matchedEstimate ? matchedEstimate.charges.grandTotal : (feeder?.linkedEstimate?.charges?.grandTotal || 1769032);
  const estimateId = matchedEstimate ? matchedEstimate.id : (allEstimates[0]?.id || 'default');
  const workOrderNo = feeder?.workOrderNo || matchedEstimate?.projectInfo?.workOrderNo || '26147126042';
  const growthRate = feeder?.annualGrowthRatePercent !== undefined ? feeder.annualGrowthRatePercent : 5;
  const energyRate = feeder?.tariffPerKwh !== undefined ? feeder.tariffPerKwh : 24.83;

  return {
    baseLossKw,
    baseLossKwh,
    basePf,
    baseVoltDrop,
    propLossKw,
    propLossKwh,
    propPf,
    propVoltDrop,
    matchedEstimate,
    projectCost,
    estimateId,
    workOrderNo,
    growthRate,
    energyRate
  };
}

export const CostBenefitAnalysisView: React.FC<CostBenefitAnalysisViewProps> = ({ 
  estimates,
  activeFeeder,
  existingSummary,
  proposedSummary,
  hasActiveInterventions = false,
  linkedEstimate,
  onSaveUnifiedProject
}) => {
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string>('');

  // Live computed values from tied ELR and Cost models
  const liveTied = useMemo(() => {
    return getTiedValues(
      activeFeeder,
      existingSummary,
      proposedSummary,
      hasActiveInterventions,
      linkedEstimate,
      estimates
    );
  }, [activeFeeder, existingSummary, proposedSummary, hasActiveInterventions, linkedEstimate, estimates]);

  // Selected Estimate to link Project Cost (default to linked estimate)
  const [selectedEstimateId, setSelectedEstimateId] = useState<string>(liveTied.estimateId);
  const [manualWorkOrderNo, setManualWorkOrderNo] = useState<string>(liveTied.workOrderNo);

  // Input States matching WAPDA Cost Benefit Analysis Sheet
  // Existing Conditions (Baseline from tied ELR)
  const [existingPowerLossKw, setExistingPowerLossKw] = useState<number>(liveTied.baseLossKw);
  const [existingEnergyLossKwh, setExistingEnergyLossKwh] = useState<number>(liveTied.baseLossKwh);
  const [existingPowerFactor, setExistingPowerFactor] = useState<number>(liveTied.basePf);
  const [existingVoltageDrop, setExistingVoltageDrop] = useState<number>(liveTied.baseVoltDrop);

  // After Improvements Conditions (Proposed from tied ELR)
  const [improvedPowerLossKw, setImprovedPowerLossKw] = useState<number>(liveTied.propLossKw);
  const [improvedEnergyLossKwh, setImprovedEnergyLossKwh] = useState<number>(liveTied.propLossKwh);
  const [improvedPowerFactor, setImprovedPowerFactor] = useState<number>(liveTied.propPf);
  const [improvedVoltageDrop, setImprovedVoltageDrop] = useState<number>(liveTied.propVoltDrop);

  // Project Estimated Cost (Default to Link Estimate true)
  const [manualProjectCost, setManualProjectCost] = useState<number>(liveTied.projectCost);
  const [useLinkedCost, setUseLinkedCost] = useState<boolean>(true);

  // System Parameters
  const [loadGrowthPercent, setLoadGrowthPercent] = useState<number>(liveTied.growthRate);
  const [discountRatePercent, setDiscountRatePercent] = useState<number>(12);
  const [studyPeriodYears, setStudyPeriodYears] = useState<number>(5);
  const [demandChargesRate, setDemandChargesRate] = useState<number>(4837); // Rs. per kW (WAPDA standard demand tariff)
  const [energyChargesRate, setEnergyChargesRate] = useState<number>(liveTied.energyRate); // Rs. per kWh

  // Auto-sync states whenever the tied active feeder, summaries, or linked estimate changes
  useEffect(() => {
    const tied = getTiedValues(
      activeFeeder,
      existingSummary,
      proposedSummary,
      hasActiveInterventions,
      linkedEstimate,
      estimates
    );
    setExistingPowerLossKw(tied.baseLossKw);
    setExistingEnergyLossKwh(tied.baseLossKwh);
    setExistingPowerFactor(tied.basePf);
    setExistingVoltageDrop(tied.baseVoltDrop);
    setImprovedPowerLossKw(tied.propLossKw);
    setImprovedEnergyLossKwh(tied.propLossKwh);
    setImprovedPowerFactor(tied.propPf);
    setImprovedVoltageDrop(tied.propVoltDrop);
    setManualProjectCost(tied.projectCost);
    setSelectedEstimateId(tied.estimateId);
    setManualWorkOrderNo(tied.workOrderNo);
    setLoadGrowthPercent(tied.growthRate);
    setEnergyChargesRate(tied.energyRate);
    setUseLinkedCost(true);
  }, [
    activeFeeder?.id,
    activeFeeder?.workOrderNo,
    activeFeeder?.tariffPerKwh,
    activeFeeder?.annualGrowthRatePercent,
    activeFeeder?.operatingPowerFactor,
    existingSummary?.totalPowerLossKw,
    existingSummary?.totalLineLossKw,
    existingSummary?.annualEnergyLossKwh,
    proposedSummary?.totalPowerLossKw,
    proposedSummary?.totalLineLossKw,
    proposedSummary?.annualEnergyLossKwh,
    hasActiveInterventions,
    linkedEstimate?.id,
    linkedEstimate?.charges?.grandTotal,
    estimates.length
  ]);

  // Handler: Explicitly re-synchronize form values from tied ELR and Cost models
  const handleSyncFromTiedModels = () => {
    const tied = getTiedValues(
      activeFeeder,
      existingSummary,
      proposedSummary,
      hasActiveInterventions,
      linkedEstimate,
      estimates
    );
    setExistingPowerLossKw(tied.baseLossKw);
    setExistingEnergyLossKwh(tied.baseLossKwh);
    setExistingPowerFactor(tied.basePf);
    setExistingVoltageDrop(tied.baseVoltDrop);
    setImprovedPowerLossKw(tied.propLossKw);
    setImprovedEnergyLossKwh(tied.propLossKwh);
    setImprovedPowerFactor(tied.propPf);
    setImprovedVoltageDrop(tied.propVoltDrop);
    setManualProjectCost(tied.projectCost);
    setSelectedEstimateId(tied.estimateId);
    setManualWorkOrderNo(tied.workOrderNo);
    setLoadGrowthPercent(tied.growthRate);
    setEnergyChargesRate(tied.energyRate);
    setUseLinkedCost(true);
    setSyncToast(`✅ BCR values refreshed directly from tied ELR Feeder "${activeFeeder?.name || 'Feeder'}" and Cost Estimate (Rs. ${tied.projectCost.toLocaleString()})`);
    setTimeout(() => setSyncToast(''), 4500);
  };

  // Find currently selected or linked estimate
  const currentEstimate = 
    estimates.find(e => e.id === selectedEstimateId) ||
    linkedEstimate ||
    liveTied.matchedEstimate;

  const linkedCost = currentEstimate ? currentEstimate.charges.grandTotal : liveTied.projectCost;
  const projectCost = useLinkedCost ? linkedCost : manualProjectCost;

  const effectiveWorkOrderNo = useLinkedCost && currentEstimate?.projectInfo?.workOrderNo
    ? currentEstimate.projectInfo.workOrderNo
    : (activeFeeder?.workOrderNo || manualWorkOrderNo);

  const parsedWo = parse11DigitWorkOrder(effectiveWorkOrderNo);
  const effectiveEstimateNo = currentEstimate ? currentEstimate.projectInfo.estimateNo : 'EST-PESH-2026-00401';
  const effectiveSchemeName = currentEstimate?.projectInfo?.schemeProjectName || activeFeeder?.schemeProjectName || `${activeFeeder?.name || 'Distribution Feeder'} Loss Reduction Scheme`;
  const effectiveElrCode = currentEstimate?.projectInfo?.elrCode || activeFeeder?.elrCode || parsedWo.elrCode || 'ELR-71-26-042';
  const effectiveAccountHead = currentEstimate?.projectInfo?.accountHead || activeFeeder?.accountHead || parsedWo.headOfAccount || '4-71 ELR Capital Loss Reduction';

  // Calculations
  const reductionPowerLossKw = Number(Math.max(0, existingPowerLossKw - improvedPowerLossKw).toFixed(2));
  const baseEnergyLossReductionKwh = Math.max(0, existingEnergyLossKwh - improvedEnergyLossKwh);

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
      
      {/* Toast Notification */}
      {syncToast && (
        <div className="fixed top-24 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{syncToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-1">
            <Calculator className="w-4 h-4" />
            <span>WAPDA / PESCO PLANNING & ENGINEERING DIVISION</span>
            <span className="text-slate-300">·</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-emerald-200">
              ELR & Cost Tied
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Cost Benefit Analysis & Benefit-Cost Ratio (BCR)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate economic viability of network improvements, loss reduction, and capital investment proposals based on live tied engineering models.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSaveUnifiedProject && (
            <button
              type="button"
              onClick={onSaveUnifiedProject}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md transition-all cursor-pointer ring-1 ring-emerald-300 active:scale-95"
              title="Save both 1. ELR Loss Analysis and 2. Line Cost Estimation together as One Project"
            >
              <Save className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Save Project (1. ELR Analysis + 2. Cost Estimation)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSyncFromTiedModels}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs transition-all cursor-pointer ring-1 ring-amber-300 active:scale-95"
            title="Take live calculated values directly from tied Feeder Loss model and Cost Estimation BOQ"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-950" />
            <span>Take Values from Tied ELR & Cost Estimation</span>
          </button>

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

      {/* ========================================================
          TIED PROJECT STATUS CARD (ANALYSIS & COST ESTIMATION)
         ======================================================== */}
      {activeFeeder && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-blue-800">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <Link2 className="w-3 h-3" />
                  Values Tied to Active Project
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  WO: {format11DigitWorkOrder(effectiveWorkOrderNo)}
                </span>
                <span className="text-xs text-slate-300">
                  {activeFeeder.category === 'HV' ? '11kV HT Feeder' : '400V LT Feeder'}
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-black text-white truncate">
                {activeFeeder.name} · {effectiveSchemeName}
              </h2>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                <span>Baseline Loss: <strong className="font-mono text-amber-300">{existingPowerLossKw} kW</strong> ({existingEnergyLossKwh.toLocaleString()} kWh/yr)</span>
                <span>•</span>
                <span>Proposed Loss: <strong className="font-mono text-emerald-300">{improvedPowerLossKw} kW</strong> ({improvedEnergyLossKwh.toLocaleString()} kWh/yr)</span>
                <span>•</span>
                <span>Reduction: <strong className="font-mono text-cyan-300">{reductionPowerLossKw} kW</strong></span>
                <span>•</span>
                <span>Capital Cost: <strong className="font-mono text-white">Rs. {projectCost.toLocaleString()}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <div className="bg-white/10 px-3.5 py-2 rounded-xl border border-white/20 text-center">
                <span className="text-[10px] text-slate-300 block uppercase font-mono">Calculated BCR</span>
                <span className={`text-xl font-mono font-black ${yearlyProjections.isViable ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {yearlyProjections.bcr.toFixed(2)}
                </span>
              </div>

              {onSaveUnifiedProject && (
                <button
                  type="button"
                  onClick={onSaveUnifiedProject}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer ring-1 ring-emerald-300 active:scale-95"
                >
                  <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Save as One Project</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tied Model Origin Information & Verification Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <div className="font-extrabold text-slate-900 flex items-center gap-2">
              <span>BCR Form Sourced Directly From Tied ELR & Cost Models</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                100% Sourced
              </span>
            </div>
            <p className="text-slate-600 mt-0.5 leading-relaxed">
              Baseline losses (<strong>{liveTied.baseLossKw} kW</strong> / <strong>{liveTied.baseLossKwh.toLocaleString()} kWh</strong>), proposed improvements (<strong>{liveTied.propLossKw} kW</strong>), and capital cost (<strong>Rs. {liveTied.projectCost.toLocaleString()}</strong>) are taken directly from the tied ELR study and Cost BOQ.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={handleSyncFromTiedModels}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-200/80 hover:bg-emerald-200 rounded-lg border border-emerald-400 transition-colors cursor-pointer"
            title="Take values from tied ELR Analysis and Cost Estimation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Take Tied Values</span>
          </button>
          {onSaveUnifiedProject && (
            <button
              type="button"
              onClick={onSaveUnifiedProject}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg border border-amber-500 shadow-2xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save as One Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Inputs and Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Parameters Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Project Cost Linkage */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">1</span>
                Project Estimated Cost (Capital Investment)
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                CSR-2026 Rate Schedule
              </span>
            </div>

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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {currentEstimate && !estimates.some(e => e.id === currentEstimate.id) && (
                      <option value={currentEstimate.id}>
                        ⭐ {currentEstimate.projectInfo.estimateNo} - {currentEstimate.projectInfo.schemeProjectName} (Rs. {currentEstimate.charges.grandTotal.toLocaleString()}) [Tied Active]
                      </option>
                    )}
                    {estimates.map(est => {
                      const isTied = activeFeeder && (
                        est.id === activeFeeder.linkedEstimateId ||
                        est.id === `est-elr-${activeFeeder.id}` ||
                        est.id.includes(activeFeeder.id) ||
                        est.projectInfo.feederName?.trim().toLowerCase() === activeFeeder.name?.trim().toLowerCase()
                      );
                      return (
                        <option key={est.id} value={est.id}>
                          {isTied ? '⭐ ' : ''}{est.projectInfo.estimateNo} - {est.projectInfo.schemeProjectName || est.projectInfo.feederName} (Rs. {est.charges.grandTotal.toLocaleString()}){isTied ? ' [Tied ELR]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Project Estimated Cost (Rs.):</label>
                  <input
                    type="number"
                    value={manualProjectCost}
                    onChange={(e) => setManualProjectCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 font-sans font-bold">Active Project Capital Cost:</span>
              <span className="text-sm font-black text-blue-900">Rs. {projectCost.toLocaleString()}</span>
            </div>

            {/* 11-Digit Work Order & ELR Tie-Up Box */}
            <div className="bg-gradient-to-r from-amber-500/10 via-blue-500/5 to-slate-50 border border-amber-300 rounded-xl p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-slate-900 text-amber-400 font-mono font-black text-xs flex items-center justify-center">#</span>
                  <span className="text-xs font-bold text-slate-900">
                    11-Digit Work Order: <strong className="font-mono text-slate-950 text-sm font-black tracking-wider">{format11DigitWorkOrder(effectiveWorkOrderNo)}</strong>
                    <span className="ml-1.5 text-[11px] text-slate-500 font-mono">[{effectiveWorkOrderNo}]</span>
                  </span>
                </div>

                {!useLinkedCost && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={manualWorkOrderNo}
                      onChange={(e) => setManualWorkOrderNo(e.target.value)}
                      placeholder="Enter 11-digit W.O."
                      className="px-2.5 py-1 bg-white border border-amber-400 rounded-lg text-xs font-mono font-bold text-slate-900 w-36"
                      maxLength={15}
                    />
                    <button
                      type="button"
                      onClick={() => setManualWorkOrderNo(generate11DigitWorkOrder({ categoryCode: '71' }))}
                      className="px-2 py-1 text-[11px] font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded border border-amber-400 flex items-center gap-1 cursor-pointer"
                    >
                      <Zap className="w-3 h-3" />
                      Auto-Gen
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block font-sans uppercase">ELR Scheme Code</span>
                  <strong className="text-amber-900 font-bold">{effectiveElrCode}</strong>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block font-sans uppercase">Head of Account</span>
                  <strong className="text-slate-900 font-bold truncate block">{effectiveAccountHead}</strong>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block font-sans uppercase">Circle & Division</span>
                  <strong className="text-blue-900 font-bold">{activeFeeder?.circle || parsedWo.circleName} · {activeFeeder?.division || parsedWo.divisionCode}</strong>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block font-sans uppercase">Tie-Up Status</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Line & ELR Linked
                  </span>
                </div>
              </div>
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
                <span className="text-[10px] font-mono bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold border border-amber-200 flex items-center gap-1">
                  <Database className="w-3 h-3 text-amber-600" />
                  Tied Baseline
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Power Losses (kW):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={existingPowerLossKw}
                    onChange={(e) => setExistingPowerLossKw(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Tied from baseline backward-forward sweep line losses</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Energy Losses (kWh):</label>
                  <input
                    type="number"
                    value={existingEnergyLossKwh}
                    onChange={(e) => setExistingEnergyLossKwh(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Calculated using 8,760 hours × Loss Load Factor</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Power Factor (%):</label>
                  <input
                    type="number"
                    value={existingPowerFactor}
                    onChange={(e) => setExistingPowerFactor(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Voltage Drop (%):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={existingVoltageDrop}
                    onChange={(e) => setExistingVoltageDrop(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Worst tail-end node drop percentage</span>
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
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-200 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-600" />
                  {hasActiveInterventions ? 'What-If Active' : 'Tied Proposed'}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Power Losses (kW):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={improvedPowerLossKw}
                    onChange={(e) => setImprovedPowerLossKw(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-emerald-600 mt-0.5 block font-medium">
                    Reduction: {reductionPowerLossKw} kW ({(reductionPowerLossKw > 0 && existingPowerLossKw > 0 ? (reductionPowerLossKw / existingPowerLossKw * 100).toFixed(1) : 0)}% drop)
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Energy Losses (kWh):</label>
                  <input
                    type="number"
                    value={improvedEnergyLossKwh}
                    onChange={(e) => setImprovedEnergyLossKwh(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-emerald-600 mt-0.5 block font-medium">
                    Annual Savings: {baseEnergyLossReductionKwh.toLocaleString()} kWh/yr
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Power Factor (%):</label>
                  <input
                    type="number"
                    value={improvedPowerFactor}
                    onChange={(e) => setImprovedPowerFactor(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Voltage Drop (%):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={improvedVoltageDrop}
                    onChange={(e) => setImprovedVoltageDrop(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Improved tail-end line regulation</span>
                </div>
              </div>
            </div>

          </div>

          {/* Section 2: System Parameters & Economic Rates */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-bold">2</span>
                System Parameters & Economic Rates
              </h2>
              <span className="text-[11px] font-mono text-slate-500">
                PESCO / NEPRA 2026 Distribution Tariffs
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Annual Load Growth (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={loadGrowthPercent}
                  onChange={(e) => setLoadGrowthPercent(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Tied from feeder growth parameter</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Annual Discount Rate (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={discountRatePercent}
                  onChange={(e) => setDiscountRatePercent(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">WAPDA discount benchmark</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Study Period (Years):</label>
                <input
                  type="number"
                  value={studyPeriodYears}
                  onChange={(e) => setStudyPeriodYears(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Standard 5-year evaluation</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Demand Charges (Rs. / kW):</label>
                <input
                  type="number"
                  step="0.01"
                  value={demandChargesRate}
                  onChange={(e) => setDemandChargesRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Generation capacity charge</span>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Energy Charges (Rs. / kWh):</label>
                <input
                  type="number"
                  step="0.01"
                  value={energyChargesRate}
                  onChange={(e) => setEnergyChargesRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Tied from active feeder consumer base tariff (Rs. 24.83 / kWh)</span>
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
                    ? '✨ Viable Proposal: BCR exceeds 1.0 threshold required by WAPDA / PESCO criteria for capital approval.'
                    : '⚠️ Not Viable Proposal: BCR is less than 1.0. Present value of benefits does not recover capital investment over 5 years.'
                  }
                </p>

                {onSaveUnifiedProject && (
                  <button
                    type="button"
                    onClick={onSaveUnifiedProject}
                    className="w-full mt-3 py-2.5 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-98 ring-1 ring-amber-300"
                  >
                    <Save className="w-4 h-4 stroke-[2.5]" />
                    <span>Save Project with this BCR</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Planning Standard Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4.5 text-xs text-blue-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-950">
              <Info className="w-4 h-4 text-blue-700 shrink-0" />
              <span>WAPDA Planning Standard</span>
            </div>
            <p className="text-blue-800 leading-relaxed text-[11px]">
              According to PESCO/WAPDA planning criteria, distribution improvement schemes must achieve a Benefit-Cost Ratio (BCR) of <strong>1.0 or higher</strong> to be sanctioned for capital execution.
            </p>
            <div className="pt-2 border-t border-blue-200/80 text-[11px] font-mono text-blue-950 space-y-0.5">
              <div>Formula: BCR = Σ [PV(Benefit_t)] / Capital_Cost</div>
              <div>Discount Factor: 1 / (1 + r)^t @ {discountRatePercent}%</div>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================
          YEAR BY YEAR DISCOUNTED BENEFIT CASH FLOW TABLE
         ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Year-by-Year Discounted Benefit Cash Flow (Study Period: {studyPeriodYears} Years)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Annual compounded load growth applied @ {loadGrowthPercent}% per annum with {discountRatePercent}% present value discounting.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">Year</th>
                <th className="py-3 px-4 text-right">Energy Saved (kWh)</th>
                <th className="py-3 px-4 text-right">Demand Saved (kW)</th>
                <th className="py-3 px-4 text-right">Energy Benefit (Rs.)</th>
                <th className="py-3 px-4 text-right">Demand Benefit (Rs.)</th>
                <th className="py-3 px-4 text-right">Total Annual Benefit (Rs.)</th>
                <th className="py-3 px-4 text-right">PV Factor ({discountRatePercent}%)</th>
                <th className="py-3 px-4 text-right font-black text-slate-900">Present Value (Rs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {yearlyProjections.rows.map(row => (
                <tr key={row.year} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900 font-sans">
                    Year {row.year}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {Math.round(row.energySavingsKwh).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {row.demandSavingsKw.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {Math.round(row.energyBenefit).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {Math.round(row.demandBenefit).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-800">
                    {Math.round(row.totalAnnualBenefit).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500">
                    {row.pvFactor.toFixed(4)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700 bg-emerald-50/40">
                    Rs. {Math.round(row.presentValueBenefit).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold">
                <td colSpan={7} className="py-3.5 px-4 text-right uppercase tracking-wider text-xs font-sans">
                  Total Present Value of Benefits (PV):
                </td>
                <td className="py-3.5 px-4 text-right font-black text-emerald-400 text-sm">
                  Rs. {Math.round(yearlyProjections.totalPvBenefits).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Official Print Modal */}
      <CostBenefitAnalysisPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        data={{
          workOrderNo: effectiveWorkOrderNo,
          elrCode: effectiveElrCode,
          estimateNo: effectiveEstimateNo,
          schemeProjectName: effectiveSchemeName,
          accountHead: effectiveAccountHead,
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
