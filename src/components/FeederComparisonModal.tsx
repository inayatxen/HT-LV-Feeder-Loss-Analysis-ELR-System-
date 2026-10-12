/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  ArrowLeftRight, 
  TrendingDown, 
  TrendingUp,
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Clock, 
  DollarSign, 
  Printer, 
  Maximize2, 
  Minimize2, 
  Split, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  Calculator,
  ArrowRight,
  Gauge,
  Percent,
  FileSpreadsheet
} from 'lucide-react';
import { 
  FeederData, 
  FeederAnalysisSummary, 
  BifurcationConfig 
} from '../types/feeder';
import { FladixOfficialHeader } from './FladixOfficialHeader';

interface FeederComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeder: FeederData;
  existingSummary: FeederAnalysisSummary;
  proposedSummary: FeederAnalysisSummary;
  activeTransformerKva: number;
  activeInjectedVoltage?: number;
  activeConductors: Record<string, string>;
  activeCapacitors: Record<string, number>;
  activeLoadFactor?: number;
  bifurcationConfig: BifurcationConfig;
  quickCapexEstimate: number;
  quickPaybackMonths: number | null;
  tariff: number;
  onOpenCostEstimation?: () => void;
  onOpenPrintReport?: () => void;
}

export const FeederComparisonModal: React.FC<FeederComparisonModalProps> = ({
  isOpen,
  onClose,
  feeder,
  existingSummary,
  proposedSummary,
  activeTransformerKva,
  activeInjectedVoltage,
  activeConductors,
  activeCapacitors,
  activeLoadFactor,
  bifurcationConfig,
  quickCapexEstimate,
  quickPaybackMonths,
  tariff,
  onOpenCostEstimation,
  onOpenPrintReport
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<'executive' | 'metrics_table' | 'segment_breakdown'>('executive');

  if (!isOpen) return null;

  const isHtLine = feeder.type === 'HT' || feeder.category === 'HV' || feeder.nominalVoltage >= 1000;
  const currentInjectedVoltage = activeInjectedVoltage !== undefined ? activeInjectedVoltage : feeder.nominalVoltage;

  // Loss Deltas and Percentages
  const kwLossDiff = existingSummary.totalLineLossKw - proposedSummary.totalLineLossKw;
  const kwLossReductionPercent = existingSummary.totalLineLossKw > 0
    ? (kwLossDiff / existingSummary.totalLineLossKw) * 100
    : 0;

  const totalPowerLossDiff = existingSummary.totalPowerLossKw - proposedSummary.totalPowerLossKw;
  const totalPowerLossReductionPercent = existingSummary.totalPowerLossKw > 0
    ? (totalPowerLossDiff / existingSummary.totalPowerLossKw) * 100
    : 0;

  const kwhLossDiff = existingSummary.annualEnergyLossKwh - proposedSummary.annualEnergyLossKwh;
  const kwhLossReductionPercent = existingSummary.annualEnergyLossKwh > 0
    ? (kwhLossDiff / existingSummary.annualEnergyLossKwh) * 100
    : 0;

  const existingAnnualCost = Math.round(existingSummary.annualEnergyLossKwh * tariff);
  const proposedAnnualCost = Math.round(proposedSummary.annualEnergyLossKwh * tariff);
  const moneySaved = Math.max(0, existingAnnualCost - proposedAnnualCost);
  const moneySavedPercent = existingAnnualCost > 0 ? (moneySaved / existingAnnualCost) * 100 : 0;

  // Voltage Regulation Delta
  const voltDropDiff = existingSummary.worstVoltageDropPercent - proposedSummary.worstVoltageDropPercent;
  const voltDropReliefPercent = existingSummary.worstVoltageDropPercent > 0
    ? (voltDropDiff / existingSummary.worstVoltageDropPercent) * 100
    : 0;
  const terminalVoltGain = proposedSummary.worstVoltageVolts - existingSummary.worstVoltageVolts;

  // Transformer Loading Delta
  const existingLoading = existingSummary.existingTransformerLoadingPercent;
  const proposedLoading = proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent;
  const loadingReliefDiff = existingLoading - proposedLoading;
  const loadingReliefPercent = existingLoading > 0 ? (loadingReliefDiff / existingLoading) * 100 : 0;

  // Active Interventions counts
  const reconductorCount = Object.keys(activeConductors).length;
  const totalCapacitorKvar = Object.values(activeCapacitors).reduce((acc, v) => acc + (v || 0), 0);
  const currentLf = activeLoadFactor !== undefined ? activeLoadFactor : (feeder.loadFactor || 0.60);

  // Segment-level analysis pairing
  const segmentComparisons = existingSummary.segmentResults.map(existingSeg => {
    const segId = existingSeg.segment.id;
    const proposedSeg = proposedSummary.segmentResults.find(p => p.segment.id === segId);
    const segKwSaved = proposedSeg ? existingSeg.lineLossKw - proposedSeg.lineLossKw : 0;
    const segKwReductionPct = existingSeg.lineLossKw > 0 && proposedSeg
      ? ((existingSeg.lineLossKw - proposedSeg.lineLossKw) / existingSeg.lineLossKw) * 100
      : 0;
    const isReconductored = activeConductors[segId] && activeConductors[segId] !== existingSeg.conductor.code;
    return {
      id: segId,
      fromNode: existingSeg.fromNodeId,
      toNode: existingSeg.toNodeId,
      lengthMeters: Math.round(existingSeg.lengthKm * 1000),
      existingConductor: existingSeg.conductor.code,
      proposedConductor: proposedSeg?.conductor.code || existingSeg.conductor.code,
      isReconductored,
      existingCurrent: existingSeg.currentAmps,
      proposedCurrent: proposedSeg?.currentAmps ?? existingSeg.currentAmps,
      existingLossKw: existingSeg.lineLossKw,
      proposedLossKw: proposedSeg?.lineLossKw ?? existingSeg.lineLossKw,
      lossReductionKw: segKwSaved,
      lossReductionPercent: segKwReductionPct,
      existingDropPercent: existingSeg.percentVoltDrop,
      proposedDropPercent: proposedSeg?.percentVoltDrop ?? existingSeg.percentVoltDrop,
      fedBy: proposedSeg?.fedByTransformer || 'T1'
    };
  });

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center ${isMaximized ? 'p-0' : 'p-3 sm:p-5'}`}>
      <div className={`bg-white w-full ${isMaximized ? 'h-full max-w-none rounded-none' : 'max-w-6xl rounded-2xl max-h-[94vh]'} shadow-2xl border border-slate-200 overflow-hidden flex flex-col`}>
        
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-400 shadow-inner">
              <ArrowLeftRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  Side-by-Side Feeder Comparison
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700/60 uppercase">
                  Baseline vs Proposed
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {feeder.name} ({isHtLine ? '11kV HT' : '400V LT'})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Comprehensive technical audit contrasting original baseline metrics against active system upgradations with exact delta loss percentages.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="Print Side-by-Side Comparison Dossier"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Print Dossier</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={isMaximized ? "Restore Window View" : "Maximize Full Screen"}
            >
              {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close Comparison"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Selection Tabs */}
        <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('executive')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'executive'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Executive Side-by-Side View</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('metrics_table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'metrics_table'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Table 1 Comparison Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('segment_breakdown')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'segment_breakdown'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Segment-by-Segment Loss Deltas ({segmentComparisons.length} Spans)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCostEstimation && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCostEstimation();
                }}
                className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Open Cost Estimation</span>
              </button>
            )}
            {onOpenPrintReport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrintReport();
                }}
                className="flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Dossier</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Top Loss Delta Metric Badges Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-5 rounded-2xl text-white shadow-md border border-slate-700 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/80">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs px-2">
                  DELTA AUDIT
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-100">
                  Key Loss Reductions & Relief Deltas Generated by Interventions
                </span>
              </div>
              <div className="text-xs font-mono text-slate-300">
                Tariff: <strong className="text-amber-400">Rs. {tariff.toFixed(2)}/kWh</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Delta KPI 1: Peak Line Loss Reduction */}
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold uppercase tracking-wider text-[11px]">Peak Line Loss Delta</span>
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                    -{kwLossDiff.toFixed(2)} kW
                  </span>
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Percent className="w-3 h-3" />
                  <span>{kwLossReductionPercent.toFixed(1)}% Loss Reduction</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  {existingSummary.totalLineLossKw.toFixed(2)} kW → {proposedSummary.totalLineLossKw.toFixed(2)} kW
                </div>
              </div>

              {/* Delta KPI 2: Annual Energy Saved */}
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold uppercase tracking-wider text-[11px]">Annual Energy Saved</span>
                  <Zap className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-blue-400 font-mono">
                    -{kwhLossDiff.toLocaleString()} kWh
                  </span>
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <Percent className="w-3 h-3" />
                  <span>{kwhLossReductionPercent.toFixed(1)}% Energy Relief</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  LLF: {proposedSummary.lossLoadFactor} (LF: {(currentLf * 100).toFixed(0)}%)
                </div>
              </div>

              {/* Delta KPI 3: Annual Utility Cost Reduction */}
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold uppercase tracking-wider text-[11px]">Utility Bill Savings</span>
                  <DollarSign className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                    Rs. {moneySaved.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Percent className="w-3 h-3" />
                  <span>{moneySavedPercent.toFixed(1)}% Bill Reduction</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  Annual recurring revenue saved
                </div>
              </div>

              {/* Delta KPI 4: Voltage Regulation Relief */}
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold uppercase tracking-wider text-[11px]">Voltage Regulation</span>
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-purple-400 font-mono">
                    +{voltDropDiff.toFixed(1)}%
                  </span>
                  <span className="text-xs text-slate-400">relief</span>
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <span>+{terminalVoltGain.toFixed(1)} V Boosted</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  {existingSummary.worstVoltageDropPercent.toFixed(1)}% → {proposedSummary.worstVoltageDropPercent.toFixed(1)}% drop
                </div>
              </div>
            </div>
          </div>

          {/* TAB 1: EXECUTIVE SIDE-BY-SIDE VIEW */}
          {activeTab === 'executive' && (
            <div className="space-y-6">
              
              {/* Side-by-Side Two Columns Container */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* LEFT COLUMN: EXISTING BASELINE */}
                <div className="bg-gradient-to-b from-rose-50/40 via-white to-slate-50 p-5 rounded-2xl border-2 border-slate-300 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-500 ring-4 ring-rose-100"></span>
                      <div>
                        <h4 className="text-base font-black text-slate-900 tracking-tight">
                          Existing Baseline Feeder
                        </h4>
                        <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wide">
                          Pre-Intervention Original State
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-slate-200/80 text-slate-800 text-xs font-mono font-bold">
                      Reference (100%)
                    </span>
                  </div>

                  {/* Baseline Configuration Summary */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Existing Network Architecture
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-slate-800 font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans">Topology Scheme:</span>
                        <strong>{isHtLine ? 'Single 11kV Radial Grid Bay' : 'Single Radial Feeder (T-1 Only)'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans">{isHtLine ? 'Injected Voltage:' : 'Transformer Capacity:'}</span>
                        <strong>{isHtLine ? `${(existingSummary.injectedVoltageAtNode0 ? existingSummary.injectedVoltageAtNode0 / 1000 : 11.0).toFixed(2)} kV Grid` : `${existingSummary.existingTransformerKva} kVA`}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans">Feeder Line Length:</span>
                        <strong>{existingSummary.totalCircuitLengthKm.toFixed(3)} km</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans">Operating Load Factor:</span>
                        <strong>{(existingSummary.loadFactor * 100).toFixed(0)}% (LLF: {existingSummary.lossLoadFactor})</strong>
                      </div>
                    </div>
                  </div>

                  {/* Baseline Loss Metrics Grid */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                      Baseline Performance Metrics
                    </span>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-600 block">Total Peak Line Losses</span>
                        <span className="text-xs text-slate-400">I²R Conductor resistance losses</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-lg font-black text-rose-600 block">{existingSummary.totalLineLossKw.toFixed(2)} kW</span>
                        <span className="text-[10px] text-slate-500 font-sans">{existingSummary.percentPowerLoss.toFixed(1)}% of total demand</span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-600 block">Annual Energy Loss</span>
                        <span className="text-xs text-slate-400">Total units lost in distribution</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-lg font-black text-slate-900 block">{existingSummary.annualEnergyLossKwh.toLocaleString()} kWh</span>
                        <span className="text-[10px] text-amber-700 font-bold font-sans">Rs. {existingAnnualCost.toLocaleString()}/yr</span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-600 block">Worst Voltage Drop</span>
                        <span className="text-xs text-slate-400">At Node {existingSummary.worstVoltageDropNodeId} (Terminal)</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-lg font-black text-rose-600 block">{existingSummary.worstVoltageDropPercent.toFixed(1)}%</span>
                        <span className="text-[10px] text-slate-500 font-sans">{existingSummary.worstVoltageVolts.toFixed(1)} V (Poor)</span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-600 block">{isHtLine ? 'Primary Feeder Current' : 'Main Transformer Loading'}</span>
                        <span className="text-xs text-slate-400">Source injection point</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className={`text-lg font-black block ${existingSummary.isTransformerOverloaded ? 'text-rose-600' : 'text-slate-900'}`}>
                          {isHtLine ? `${existingSummary.totalSourceCurrentAmps.toFixed(1)} A` : `${existingSummary.existingTransformerLoadingPercent}%`}
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans">
                          {existingSummary.isTransformerOverloaded ? '⚠️ Overloaded' : 'Normal Capacity'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Baseline Financials */}
                  <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between font-mono">
                    <span className="font-sans text-slate-600">Intervention CapEx:</span>
                    <strong className="text-slate-900">Rs. 0 (Baseline Reference)</strong>
                  </div>
                </div>

                {/* RIGHT COLUMN: PROPOSED INTERVENTIONS */}
                <div className="bg-gradient-to-b from-emerald-50/40 via-white to-indigo-50/20 p-5 rounded-2xl border-2 border-emerald-400 shadow-md space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
                      <div>
                        <h4 className="text-base font-black text-slate-900 tracking-tight">
                          What-If Proposed Intervention
                        </h4>
                        <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
                          Post-Intervention Upgraded State
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 text-xs font-mono font-black border border-emerald-300">
                      -{kwLossReductionPercent.toFixed(1)}% Peak Loss
                    </span>
                  </div>

                  {/* Proposed Active Packages & Configuration Summary */}
                  <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 text-xs space-y-2">
                    <span className="text-[10px] font-bold text-emerald-950 uppercase tracking-wider block">
                      Active Upgradation Interventions
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {bifurcationConfig.enabled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold border border-purple-200 text-[10px]">
                          <Split className="w-3 h-3" />
                          {isHtLine 
                            ? `Bifurcated: 2 Lines (${bifurcationConfig.extensionLengthKm || 2}km to Node ${bifurcationConfig.bifurcationNodeId})` 
                            : `Bifurcation + T-2 (${bifurcationConfig.transformerCapacityKva} kVA)`}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                          No Bifurcation
                        </span>
                      )}

                      {!isHtLine && activeTransformerKva !== feeder.existingTransformerKva && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-200 text-[10px]">
                          Augmented: {activeTransformerKva} kVA
                        </span>
                      )}

                      {reconductorCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold border border-blue-200 text-[10px]">
                          <Sparkles className="w-3 h-3" />
                          Re-conductored: {reconductorCount} Spans
                        </span>
                      )}

                      {totalCapacitorKvar > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-100 text-teal-900 font-bold border border-teal-200 text-[10px]">
                          Capacitors: {totalCapacitorKvar} kvar
                        </span>
                      )}

                      {isHtLine && activeInjectedVoltage !== undefined && activeInjectedVoltage !== feeder.nominalVoltage && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold border border-indigo-200 text-[10px]">
                          Voltage: {(activeInjectedVoltage / 1000).toFixed(2)} kV
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-800 font-mono pt-1 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans">Effective Scheme:</span>
                        <strong>{bifurcationConfig.enabled ? (isHtLine ? 'Dual Feeder Grid Injection' : 'Dual Transformer Zone (T1 + T2)') : 'Upgraded Single Radial'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans">Total Power Loss:</span>
                        <strong className="text-emerald-700">{proposedSummary.totalPowerLossKw.toFixed(2)} kW (-{totalPowerLossDiff.toFixed(2)} kW)</strong>
                      </div>
                    </div>
                  </div>

                  {/* Proposed Loss Metrics Grid */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                      Upgraded Performance Metrics
                    </span>

                    <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">Total Peak Line Losses</span>
                        <span className="text-xs text-emerald-700 font-medium">
                          ↓ {kwLossDiff.toFixed(2)} kW saved
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-lg font-black text-emerald-700 block">{proposedSummary.totalLineLossKw.toFixed(2)} kW</span>
                        <span className="text-[10px] text-emerald-700 font-bold font-sans">
                          -{kwLossReductionPercent.toFixed(1)}% reduction
                        </span>
                      </div>
                    </div>

                    <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">Annual Energy Loss</span>
                        <span className="text-xs text-emerald-700 font-medium">
                          ↓ {kwhLossDiff.toLocaleString()} kWh saved
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-lg font-black text-slate-900 block">{proposedSummary.annualEnergyLossKwh.toLocaleString()} kWh</span>
                        <span className="text-[10px] text-emerald-700 font-bold font-sans">
                          Save Rs. {moneySaved.toLocaleString()}/yr (-{moneySavedPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">Worst Voltage Drop</span>
                        <span className="text-xs text-emerald-700 font-medium">
                          ↑ Regulation relief by {voltDropDiff.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-lg font-black text-emerald-700 block">{proposedSummary.worstVoltageDropPercent.toFixed(1)}%</span>
                        <span className="text-[10px] text-emerald-800 font-bold font-sans">
                          {proposedSummary.worstVoltageVolts.toFixed(1)} V (+{terminalVoltGain.toFixed(1)} V boost)
                        </span>
                      </div>
                    </div>

                    <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">{isHtLine ? 'Primary Feeder Current' : 'T-1 & T-2 Loading'}</span>
                        <span className="text-xs text-emerald-700 font-medium">
                          {bifurcationConfig.enabled ? 'Load shared across 2 zones' : 'Reinforced thermal margins'}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-lg font-black text-emerald-700 block">
                          {isHtLine 
                            ? (proposedSummary.transformer1DemandKva 
                                ? `${(proposedSummary.transformer1DemandKva / (Math.sqrt(3) * ((bifurcationConfig.line1InjectedVoltage || currentInjectedVoltage) / 1000))).toFixed(1)} A` 
                                : `${proposedSummary.totalSourceCurrentAmps.toFixed(1)} A`)
                            : (bifurcationConfig.enabled 
                                ? `T-1: ${proposedSummary.transformer1LoadingPercent}% • T-2: ${proposedSummary.transformer2LoadingPercent}%` 
                                : `${proposedLoading}%`)}
                        </span>
                        <span className="text-[10px] text-emerald-800 font-bold font-sans">
                          {proposedSummary.isTransformerOverloaded ? 'Still High' : '✅ Within Safe Thermal Limits'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Proposed Financials & Payback */}
                  <div className="bg-gradient-to-r from-emerald-100/70 to-teal-100/50 p-3.5 rounded-xl border border-emerald-300 text-xs flex flex-wrap items-center justify-between gap-2 font-mono">
                    <div>
                      <span className="font-sans text-emerald-950 font-bold block">Estimated Project CapEx:</span>
                      <strong className="text-emerald-950 text-sm">Rs. {quickCapexEstimate.toLocaleString()}</strong>
                    </div>
                    <div className="text-right">
                      <span className="font-sans text-emerald-950 font-bold block">Simple Payback Period:</span>
                      <strong className="text-emerald-950 text-sm">
                        {quickPaybackMonths !== null ? `${quickPaybackMonths.toFixed(1)} Months (${(quickPaybackMonths / 12).toFixed(2)} Yrs)` : 'N/A'}
                      </strong>
                    </div>
                  </div>
                </div>

              </div>

              {/* Relative Loss Comparison Visual Progress Bars */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-blue-600" />
                    <span>Visual Relative Loss & Loading Comparison (Baseline 100% vs Proposed)</span>
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">
                    Lower is better for losses & drop
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Metric Bar 1: Peak Line Losses */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-700">Peak Line Losses (kW)</span>
                      <span className="font-mono text-emerald-600">
                        {proposedSummary.totalLineLossKw.toFixed(2)} kW vs {existingSummary.totalLineLossKw.toFixed(2)} kW ({kwLossReductionPercent.toFixed(1)}% reduction)
                      </span>
                    </div>
                    <div className="h-5 bg-slate-100 rounded-lg overflow-hidden flex p-0.5 border border-slate-200">
                      <div 
                        className="bg-rose-500 rounded-md text-[10px] text-white font-mono flex items-center justify-center transition-all font-bold"
                        style={{ width: `${Math.min(100, Math.max(15, (existingSummary.totalLineLossKw / (existingSummary.totalLineLossKw || 1)) * 100))}%` }}
                        title={`Baseline: ${existingSummary.totalLineLossKw.toFixed(2)} kW`}
                      >
                        Base: {existingSummary.totalLineLossKw.toFixed(1)} kW
                      </div>
                    </div>
                    <div className="h-5 bg-slate-100 rounded-lg overflow-hidden flex p-0.5 border border-slate-200 mt-1">
                      <div 
                        className="bg-emerald-500 rounded-md text-[10px] text-white font-mono flex items-center justify-center transition-all font-bold shadow-xs"
                        style={{ width: `${Math.min(100, Math.max(15, (proposedSummary.totalLineLossKw / (existingSummary.totalLineLossKw || 1)) * 100))}%` }}
                        title={`Proposed: ${proposedSummary.totalLineLossKw.toFixed(2)} kW`}
                      >
                        Proposed: {proposedSummary.totalLineLossKw.toFixed(1)} kW (-{kwLossReductionPercent.toFixed(1)}%)
                      </div>
                    </div>
                  </div>

                  {/* Metric Bar 2: Annual Energy Loss */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-700">Annual Energy Loss (kWh)</span>
                      <span className="font-mono text-blue-600">
                        {proposedSummary.annualEnergyLossKwh.toLocaleString()} vs {existingSummary.annualEnergyLossKwh.toLocaleString()} ({kwhLossReductionPercent.toFixed(1)}% energy saved)
                      </span>
                    </div>
                    <div className="h-5 bg-slate-100 rounded-lg overflow-hidden flex p-0.5 border border-slate-200">
                      <div 
                        className="bg-amber-600 rounded-md text-[10px] text-white font-mono flex items-center justify-center transition-all font-bold"
                        style={{ width: '100%' }}
                        title={`Baseline: ${existingSummary.annualEnergyLossKwh.toLocaleString()} kWh`}
                      >
                        Base: {existingSummary.annualEnergyLossKwh.toLocaleString()} kWh
                      </div>
                    </div>
                    <div className="h-5 bg-slate-100 rounded-lg overflow-hidden flex p-0.5 border border-slate-200 mt-1">
                      <div 
                        className="bg-blue-600 rounded-md text-[10px] text-white font-mono flex items-center justify-center transition-all font-bold shadow-xs"
                        style={{ width: `${Math.min(100, Math.max(15, (proposedSummary.annualEnergyLossKwh / (existingSummary.annualEnergyLossKwh || 1)) * 100))}%` }}
                        title={`Proposed: ${proposedSummary.annualEnergyLossKwh.toLocaleString()} kWh`}
                      >
                        Proposed: {proposedSummary.annualEnergyLossKwh.toLocaleString()} kWh (-{kwhLossReductionPercent.toFixed(1)}%)
                      </div>
                    </div>
                  </div>

                  {/* Metric Bar 3: Worst Voltage Drop */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-700">Worst Voltage Drop (%)</span>
                      <span className="font-mono text-purple-600">
                        {proposedSummary.worstVoltageDropPercent.toFixed(1)}% vs {existingSummary.worstVoltageDropPercent.toFixed(1)}% ({voltDropReliefPercent.toFixed(1)}% drop relief)
                      </span>
                    </div>
                    <div className="h-5 bg-slate-100 rounded-lg overflow-hidden flex p-0.5 border border-slate-200">
                      <div 
                        className="bg-rose-600 rounded-md text-[10px] text-white font-mono flex items-center justify-center transition-all font-bold"
                        style={{ width: '100%' }}
                      >
                        Base Drop: {existingSummary.worstVoltageDropPercent.toFixed(1)}%
                      </div>
                    </div>
                    <div className="h-5 bg-slate-100 rounded-lg overflow-hidden flex p-0.5 border border-slate-200 mt-1">
                      <div 
                        className="bg-purple-600 rounded-md text-[10px] text-white font-mono flex items-center justify-center transition-all font-bold shadow-xs"
                        style={{ width: `${Math.min(100, Math.max(15, (proposedSummary.worstVoltageDropPercent / (existingSummary.worstVoltageDropPercent || 1)) * 100))}%` }}
                      >
                        Proposed Drop: {proposedSummary.worstVoltageDropPercent.toFixed(1)}% (Relief: +{voltDropDiff.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: DETAILED PARAMETER COMPARISON MATRIX TABLE */}
          {activeTab === 'metrics_table' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Comprehensive WAPDA Table 1 Feeder Performance Matrix
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Contrasting baseline system values, proposed intervention state, exact delta differences, and compliance rules.
                  </p>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-blue-100 text-blue-900 font-bold border border-blue-200">
                  {feeder.name}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Parameter / Engineering Metric</th>
                      <th className="py-3 px-4">Existing Baseline</th>
                      <th className="py-3 px-4 bg-emerald-50 text-emerald-950">Proposed System</th>
                      <th className="py-3 px-4 bg-blue-50 text-blue-950">Delta Difference</th>
                      <th className="py-3 px-4 bg-purple-50 text-purple-950 font-black">Delta Loss %</th>
                      <th className="py-3 px-4">Status & WAPDA Standard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {/* Peak Line Losses */}
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-900">Peak Line Loss (kW)</td>
                      <td className="py-2.5 px-4 text-slate-600">{existingSummary.totalLineLossKw.toFixed(2)} kW</td>
                      <td className="py-2.5 px-4 bg-emerald-50/40 font-black text-emerald-900">{proposedSummary.totalLineLossKw.toFixed(2)} kW</td>
                      <td className="py-2.5 px-4 bg-blue-50/30 text-emerald-700 font-bold">-{kwLossDiff.toFixed(2)} kW</td>
                      <td className="py-2.5 px-4 bg-purple-50/30 text-emerald-700 font-black">-{kwLossReductionPercent.toFixed(1)}%</td>
                      <td className="py-2.5 px-4 font-sans text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Loss Relieved
                      </td>
                    </tr>

                    {/* Total Power Losses */}
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-900">Total System Power Loss (kW)</td>
                      <td className="py-2.5 px-4 text-slate-600">{existingSummary.totalPowerLossKw.toFixed(2)} kW</td>
                      <td className="py-2.5 px-4 bg-emerald-50/40 font-black text-emerald-900">{proposedSummary.totalPowerLossKw.toFixed(2)} kW</td>
                      <td className="py-2.5 px-4 bg-blue-50/30 text-emerald-700 font-bold">-{totalPowerLossDiff.toFixed(2)} kW</td>
                      <td className="py-2.5 px-4 bg-purple-50/30 text-emerald-700 font-black">-{totalPowerLossReductionPercent.toFixed(1)}%</td>
                      <td className="py-2.5 px-4 font-sans text-emerald-700 font-semibold">
                        {proposedSummary.percentPowerLoss.toFixed(1)}% of Demand
                      </td>
                    </tr>

                    {/* Annual Energy Loss */}
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-900">Annual Energy Loss (kWh/yr)</td>
                      <td className="py-2.5 px-4 text-slate-600">{existingSummary.annualEnergyLossKwh.toLocaleString()} kWh</td>
                      <td className="py-2.5 px-4 bg-emerald-50/40 font-black text-emerald-900">{proposedSummary.annualEnergyLossKwh.toLocaleString()} kWh</td>
                      <td className="py-2.5 px-4 bg-blue-50/30 text-emerald-700 font-bold">-{kwhLossDiff.toLocaleString()} kWh</td>
                      <td className="py-2.5 px-4 bg-purple-50/30 text-emerald-700 font-black">-{kwhLossReductionPercent.toFixed(1)}%</td>
                      <td className="py-2.5 px-4 font-sans text-amber-800 font-bold">
                        Save Rs. {moneySaved.toLocaleString()}/yr
                      </td>
                    </tr>

                    {/* Worst Voltage Drop */}
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-900">Worst Voltage Drop (%)</td>
                      <td className="py-2.5 px-4 text-rose-600 font-bold">{existingSummary.worstVoltageDropPercent.toFixed(1)}%</td>
                      <td className="py-2.5 px-4 bg-emerald-50/40 font-black text-emerald-900">{proposedSummary.worstVoltageDropPercent.toFixed(1)}%</td>
                      <td className="py-2.5 px-4 bg-blue-50/30 text-purple-700 font-bold">+{voltDropDiff.toFixed(1)}% relief</td>
                      <td className="py-2.5 px-4 bg-purple-50/30 text-purple-700 font-black">+{voltDropReliefPercent.toFixed(1)}%</td>
                      <td className="py-2.5 px-4 font-sans">
                        {proposedSummary.worstVoltageDropPercent <= 5.0 ? (
                          <span className="text-emerald-700 font-bold"><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Compliant (≤5%)</span>
                        ) : (
                          <span className="text-amber-700 font-semibold">Improved ({proposedSummary.worstVoltageVolts.toFixed(1)} V)</span>
                        )}
                      </td>
                    </tr>

                    {/* Terminal Receiving Voltage */}
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-900">Terminal Node Voltage</td>
                      <td className="py-2.5 px-4 text-rose-600 font-semibold">{existingSummary.worstVoltageVolts.toFixed(1)} V</td>
                      <td className="py-2.5 px-4 bg-emerald-50/40 font-black text-emerald-900">{proposedSummary.worstVoltageVolts.toFixed(1)} V</td>
                      <td className="py-2.5 px-4 bg-blue-50/30 text-emerald-700 font-bold">+{terminalVoltGain.toFixed(1)} V</td>
                      <td className="py-2.5 px-4 bg-purple-50/30 text-emerald-700 font-black">+{(existingSummary.worstVoltageVolts > 0 ? (terminalVoltGain / existingSummary.worstVoltageVolts) * 100 : 0).toFixed(1)}%</td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">Nominal: {feeder.nominalVoltage} V</td>
                    </tr>

                    {/* Transformer / Substation Loading */}
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{isHtLine ? 'Primary Source Current (A)' : 'Transformer 1 Loading (%)'}</td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {isHtLine ? `${existingSummary.totalSourceCurrentAmps.toFixed(1)} A` : `${existingLoading}%`}
                      </td>
                      <td className="py-2.5 px-4 bg-emerald-50/40 font-black text-emerald-900">
                        {isHtLine 
                          ? `${(proposedSummary.transformer1DemandKva ? proposedSummary.transformer1DemandKva / (Math.sqrt(3) * ((bifurcationConfig.line1InjectedVoltage || currentInjectedVoltage) / 1000)) : proposedSummary.totalSourceCurrentAmps).toFixed(1)} A` 
                          : `${proposedLoading}%`}
                      </td>
                      <td className="py-2.5 px-4 bg-blue-50/30 text-emerald-700 font-bold">
                        {isHtLine ? `-${(existingSummary.totalSourceCurrentAmps - (proposedSummary.transformer1DemandKva ? proposedSummary.transformer1DemandKva / (Math.sqrt(3) * ((bifurcationConfig.line1InjectedVoltage || currentInjectedVoltage) / 1000)) : proposedSummary.totalSourceCurrentAmps)).toFixed(1)} A` : `-${loadingReliefDiff}%`}
                      </td>
                      <td className="py-2.5 px-4 bg-purple-50/30 text-emerald-700 font-black">
                        {loadingReliefPercent > 0 ? `-${loadingReliefPercent.toFixed(1)}%` : '0.0%'}
                      </td>
                      <td className="py-2.5 px-4 font-sans">
                        {proposedLoading <= 100 ? (
                          <span className="text-emerald-700 font-semibold"><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Safe Margin</span>
                        ) : (
                          <span className="text-rose-600 font-semibold">Overloaded</span>
                        )}
                      </td>
                    </tr>

                    {/* Project CapEx & Economics */}
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-900">Estimated Project CapEx</td>
                      <td className="py-2.5 px-4 text-slate-400">Rs. 0 (Baseline)</td>
                      <td className="py-2.5 px-4 bg-emerald-50/40 font-black text-slate-900">Rs. {quickCapexEstimate.toLocaleString()}</td>
                      <td className="py-2.5 px-4 bg-blue-50/30 text-slate-900 font-bold">+Rs. {quickCapexEstimate.toLocaleString()}</td>
                      <td className="py-2.5 px-4 bg-purple-50/30 text-slate-500 font-sans">N/A</td>
                      <td className="py-2.5 px-4 font-sans font-semibold text-purple-700">
                        {quickPaybackMonths !== null ? `Payback: ${quickPaybackMonths.toFixed(1)} Mos` : 'No CapEx required'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SEGMENT-BY-SEGMENT LOSS DELTA BREAKDOWN */}
          {activeTab === 'segment_breakdown' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Segment-by-Segment Loss & Current Deltas
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Individual span comparison illustrating localized loss reductions and re-conductoring impacts.
                  </p>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-200 text-slate-800 font-bold">
                  {segmentComparisons.length} Feeder Spans
                </span>
              </div>

              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs min-w-[760px] border-collapse">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Span</th>
                      <th className="py-2.5 px-2 text-right">Length</th>
                      <th className="py-2.5 px-3">Conductor (Base → Prop)</th>
                      <th className="py-2.5 px-2 text-right">Base Current</th>
                      <th className="py-2.5 px-2 text-right">Prop Current</th>
                      <th className="py-2.5 px-3 text-right">Base Loss (kW)</th>
                      <th className="py-2.5 px-3 text-right bg-emerald-50 text-emerald-950">Prop Loss (kW)</th>
                      <th className="py-2.5 px-3 text-right bg-purple-50 text-purple-950 font-black">Loss Delta %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {segmentComparisons.map((seg, idx) => (
                      <tr key={seg.id} className={`hover:bg-slate-50/80 ${seg.isReconductored ? 'bg-amber-50/40' : ''}`}>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {seg.fromNode} → {seg.toNode}
                          {seg.fedBy === 'T2' && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 text-[9px] font-bold">T2 Zone</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600">{seg.lengthMeters} m</td>
                        <td className="py-2 px-3">
                          {seg.isReconductored ? (
                            <span className="font-bold text-amber-900 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              {seg.existingConductor} → <strong>{seg.proposedConductor}</strong>
                            </span>
                          ) : (
                            <span className="text-slate-700">{seg.existingConductor}</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600">{seg.existingCurrent.toFixed(1)} A</td>
                        <td className="py-2 px-2 text-right font-bold text-slate-900">{seg.proposedCurrent.toFixed(1)} A</td>
                        <td className="py-2 px-3 text-right text-slate-600">{seg.existingLossKw.toFixed(3)} kW</td>
                        <td className="py-2 px-3 text-right font-black text-emerald-700 bg-emerald-50/30">
                          {seg.proposedLossKw.toFixed(3)} kW
                        </td>
                        <td className="py-2 px-3 text-right font-black bg-purple-50/30">
                          {seg.lossReductionPercent > 0 ? (
                            <span className="text-emerald-700">-{seg.lossReductionPercent.toFixed(1)}%</span>
                          ) : seg.lossReductionPercent < 0 ? (
                            <span className="text-rose-600">+{Math.abs(seg.lossReductionPercent).toFixed(1)}%</span>
                          ) : (
                            <span className="text-slate-400">0.0%</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">PESCO FLADIX</span>
            <span>•</span>
            <span>Peak Loss Delta: <strong className="text-emerald-700">-{kwLossDiff.toFixed(2)} kW (-{kwLossReductionPercent.toFixed(1)}%)</strong></span>
            <span>•</span>
            <span>Energy Saved: <strong className="text-blue-700">-{kwhLossDiff.toLocaleString()} kWh/yr</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold cursor-pointer transition-colors"
            >
              Close Comparison
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
