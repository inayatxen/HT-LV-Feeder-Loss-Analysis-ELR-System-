/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  FeederData, 
  FeederAnalysisSummary,
  BifurcationConfig,
  BifurcationFourStatementDossier
} from '../types/feeder';
import { 
  SlidersHorizontal, 
  Zap, 
  Wrench, 
  Sparkles, 
  RotateCcw, 
  ArrowRight, 
  CheckCircle2, 
  TrendingDown, 
  ShieldCheck, 
  BatteryCharging,
  Gauge,
  Activity,
  GitBranch,
  Split,
  Layers,
  Flame,
  Printer
} from 'lucide-react';
import { CONDUCTOR_LIST } from '../data/conductors';
import { TRANSFORMER_CAPACITIES } from '../data/transformers';
import { calculateBifurcationFourStatements } from '../utils/elrEngine';
import { BifurcationStatementsPanel } from './BifurcationStatementsPanel';

interface WhatIfWorkbenchProps {
  feeder: FeederData;
  existingSummary: FeederAnalysisSummary;
  proposedSummary: FeederAnalysisSummary;
  activeTransformerKva: number;
  setActiveTransformerKva: (kva: number) => void;
  activeConductors: Record<string, string>;
  onSetConductor: (segmentId: string, conductorCode: string) => void;
  activeCapacitors: Record<string, number>;
  onSetCapacitor: (nodeId: string, kvar: number) => void;
  activeLoadFactor?: number;
  onSetLoadFactor: (lf: number) => void;
  bifurcationConfig: BifurcationConfig;
  onSetBifurcation: (config: BifurcationConfig) => void;
  onApplyPackage: (pkg: 'standard' | 'max' | 'capacitor_only' | 'bifurcation') => void;
  onReset: () => void;
  onOpenPrintReport?: () => void;
}

export const WhatIfWorkbench: React.FC<WhatIfWorkbenchProps> = ({
  feeder,
  existingSummary,
  proposedSummary,
  activeTransformerKva,
  setActiveTransformerKva,
  activeConductors,
  onSetConductor,
  activeCapacitors,
  onSetCapacitor,
  activeLoadFactor,
  onSetLoadFactor,
  bifurcationConfig,
  onSetBifurcation,
  onApplyPackage,
  onReset,
  onOpenPrintReport
}) => {
  const tariff = feeder.tariffPerKwh || 38.5;
  const kwSaved = Math.max(0, existingSummary.totalLineLossKw - proposedSummary.totalLineLossKw);
  const kwhSaved = Math.max(0, existingSummary.annualEnergyLossKwh - proposedSummary.annualEnergyLossKwh);
  const moneySaved = Math.round(kwhSaved * tariff);

  const currentLf = activeLoadFactor !== undefined ? activeLoadFactor : (feeder.loadFactor || 0.60);

  const bifurcationDossier: BifurcationFourStatementDossier = useMemo(() => {
    return calculateBifurcationFourStatements(feeder, bifurcationConfig, {
      customConductors: activeConductors,
      customCapacitors: activeCapacitors,
      t1TransformerOverrideKva: activeTransformerKva,
      loadFactorOverride: activeLoadFactor
    });
  }, [feeder, bifurcationConfig, activeConductors, activeCapacitors, activeTransformerKva, activeLoadFactor]);

  const hasChanges = 
    activeTransformerKva !== feeder.existingTransformerKva ||
    Object.keys(activeConductors).length > 0 ||
    Object.keys(activeCapacitors).length > 0 ||
    (activeLoadFactor !== undefined && activeLoadFactor !== feeder.loadFactor) ||
    bifurcationConfig.enabled;

  // Candidate nodes for bifurcation (nodes with incoming segments, excluding source)
  const candidateNodes = feeder.nodes.filter(n => !n.isTransformerNode && n.id !== '0.0');

  return (
    <div className="space-y-6">
      {/* Workbench Header & Quick Upgrade Presets */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 mb-1">
            <SlidersHorizontal className="w-4 h-4" />
            <span>ELR INTERVENTION WORKBENCH</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            System Upgradation & Loss Reduction Simulator
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Simulate technical interventions: line bifurcation with additional transformer (T-2), transformer augmentation, segment re-conductoring, shunt capacitors, and load factor duty cycle variation.
          </p>
        </div>

        {/* Quick Packages */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => onApplyPackage('bifurcation')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              bifurcationConfig.enabled
                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400/40'
                : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-300'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Line Bifurcation + T-2 (100 kVA @ Node 3.0)</span>
          </button>

          <button
            onClick={() => onApplyPackage('standard')}
            className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>WAPDA Augmentation (200 kVA + Cap)</span>
          </button>

          <button
            onClick={() => onApplyPackage('max')}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Maximum Efficiency Plan</span>
          </button>

          {hasChanges && (
            <button
              onClick={onReset}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
          )}
        </div>
      </div>

      {/* Savings Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-xl">
          <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider block">
            Power Loss Reduction
          </span>
          <div className="text-2xl font-black text-emerald-950 font-mono mt-1">
            {kwSaved.toFixed(2)} kW
          </div>
          <span className="text-[11px] text-emerald-700 mt-0.5 block">
            {existingSummary.totalLineLossKw > 0 ? ((kwSaved / existingSummary.totalLineLossKw) * 100).toFixed(1) : 0}% reduction in peak losses
          </span>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl">
          <span className="text-xs text-blue-800 font-semibold uppercase tracking-wider block">
            Annual Energy Saved
          </span>
          <div className="text-2xl font-black text-blue-950 font-mono mt-1">
            {kwhSaved.toLocaleString()} kWh
          </div>
          <span className="text-[11px] text-blue-700 mt-0.5 block font-mono">
            LLF: {proposedSummary.lossLoadFactor} (LF: {(currentLf * 100).toFixed(0)}%)
          </span>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-xl">
          <span className="text-xs text-amber-800 font-semibold uppercase tracking-wider block">
            Annual Financial Benefit
          </span>
          <div className="text-2xl font-black text-amber-950 font-mono mt-1">
            Rs. {moneySaved.toLocaleString()}
          </div>
          <span className="text-[11px] text-amber-700 mt-0.5 block">
            At statutory tariff of Rs. {tariff}/kWh
          </span>
        </div>
      </div>

      {/* 5 Interactive Intervention Panels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        
        {/* Panel 1: Line Bifurcation & Additional Transformer */}
        <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
          bifurcationConfig.enabled 
            ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-400/30 shadow-sm' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Split className="w-4 h-4 text-purple-600" />
                1. Line Bifurcation & T-2
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={bifurcationConfig.enabled}
                  onChange={(e) => onSetBifurcation({
                    ...bifurcationConfig,
                    enabled: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <p className="text-[11px] text-slate-500 mb-2.5">
              Split the heavily loaded line & install an Additional Distribution Transformer (T-2) at load center.
            </p>

            {bifurcationConfig.enabled ? (
              <div className="space-y-2 text-xs">
                {/* Bifurcation Split Node */}
                <div>
                  <label className="text-[10px] font-bold text-purple-900 block mb-1">
                    Bifurcation Split Pole/Node:
                  </label>
                  <select
                    value={bifurcationConfig.bifurcationNodeId}
                    onChange={(e) => onSetBifurcation({
                      ...bifurcationConfig,
                      bifurcationNodeId: e.target.value
                    })}
                    className="w-full bg-white border border-purple-300 rounded px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  >
                    {candidateNodes.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.label || `Pole ${n.id}`} ({n.singlePhaseCustomers} 1-Ph, {n.threePhaseCustomers} 3-Ph)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Additional Transformer Capacity */}
                <div>
                  <label className="text-[10px] font-bold text-purple-900 block mb-1">
                    Additional Transformer (T-2) Rating:
                  </label>
                  <select
                    value={bifurcationConfig.transformerCapacityKva}
                    onChange={(e) => onSetBifurcation({
                      ...bifurcationConfig,
                      transformerCapacityKva: Number(e.target.value)
                    })}
                    className="w-full bg-white border border-purple-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  >
                    {TRANSFORMER_CAPACITIES.map(cap => (
                      <option key={cap} value={cap}>
                        {cap} kVA (New Substation T-2)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dual Loading Preview */}
                <div className="bg-white/80 p-2 rounded border border-purple-200 text-[10px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">T-1 Load ({activeTransformerKva} kVA):</span>
                    <span className={`font-mono font-bold ${
                      (proposedSummary.transformer1LoadingPercent || 0) > 100 ? 'text-rose-600' : 'text-emerald-700'
                    }`}>
                      {proposedSummary.transformer1DemandKva} kVA ({proposedSummary.transformer1LoadingPercent}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-900 font-semibold">T-2 Load ({bifurcationConfig.transformerCapacityKva} kVA):</span>
                    <span className={`font-mono font-bold ${
                      (proposedSummary.transformer2LoadingPercent || 0) > 100 ? 'text-rose-600' : 'text-purple-700'
                    }`}>
                      {proposedSummary.transformer2DemandKva} kVA ({proposedSummary.transformer2LoadingPercent}%)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-2.5 rounded-lg border border-dashed border-slate-300 text-center py-4">
                <span className="text-[11px] text-slate-400 block mb-1.5">Bifurcation inactive</span>
                <button
                  type="button"
                  onClick={() => onSetBifurcation({
                    ...bifurcationConfig,
                    enabled: true,
                    bifurcationNodeId: candidateNodes[2]?.id || '3.0',
                    transformerCapacityKva: 100
                  })}
                  className="px-2 py-1 text-[10px] font-bold bg-purple-100 text-purple-800 rounded border border-purple-200 hover:bg-purple-200 cursor-pointer"
                >
                  Enable Bifurcation Scheme
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Backbone Relief:</span>
            <span className="font-mono font-bold text-purple-700">
              {bifurcationConfig.enabled ? `-${proposedSummary.bifurcationReliefKva} kVA` : 'None'}
            </span>
          </div>
        </div>

        {/* Panel 2: Transformer Capacity */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                2. Main Transformer (T-1)
              </span>
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold text-[11px]">
                {activeTransformerKva} kVA
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2.5">
              Augment main source transformer capacity to eliminate thermal overloading.
            </p>

            <label className="text-[10px] font-semibold text-slate-600 block mb-1">Select T-1 Rating:</label>
            <select
              value={activeTransformerKva}
              onChange={(e) => setActiveTransformerKva(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              {TRANSFORMER_CAPACITIES.map(cap => (
                <option key={cap} value={cap}>
                  {cap} kVA {cap === feeder.existingTransformerKva ? '(Installed)' : (cap === feeder.proposedTransformerKva ? '(Proposed)' : '')}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">T-1 Loading:</span>
            <span className={`font-mono font-bold ${
              (proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent) > 100 
                ? 'text-rose-600' 
                : 'text-emerald-700'
            }`}>
              {proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent}%
              {(proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent) <= 100 && ' (Safe)'}
            </span>
          </div>
        </div>

        {/* Panel 3: Re-conductoring Priority Spans */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-sky-500" />
                3. Re-conductoring
              </span>
              <span className="font-mono text-slate-400 text-[11px]">
                {Object.keys(activeConductors).length} upgraded
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2.5">
              Upgrade high-loss segments from 7/0.122" to heavier ACSR "Dog" or "Rabbit".
            </p>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-700">1.0 → 2.0:</span>
                <select
                  value={activeConductors['s-1-2'] || 'A'}
                  onChange={(e) => onSetConductor('s-1-2', e.target.value)}
                  className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="A">7/0.122" (Original)</option>
                  <option value="WASP">7/0.170" ACSR Wasp (80 mm²)</option>
                  <option value="DOG">ACSR Dog (100mm²)</option>
                  <option value="RABBIT">ACSR Rabbit</option>
                  <option value="PU3">PVC 37/0.083"</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-700">2.0 → 3.0:</span>
                <select
                  value={activeConductors['s-2-3'] || 'A'}
                  onChange={(e) => onSetConductor('s-2-3', e.target.value)}
                  className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="A">7/0.122" (Original)</option>
                  <option value="WASP">7/0.170" ACSR Wasp (80 mm²)</option>
                  <option value="DOG">ACSR Dog (100mm²)</option>
                  <option value="RABBIT">ACSR Rabbit</option>
                  <option value="PU3">PVC 37/0.083"</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Line Losses:</span>
            <div className="flex items-center gap-1 font-mono">
              <span className="text-slate-400 line-through text-[10px]">{existingSummary.totalLineLossKw}</span>
              <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
              <span className="font-bold text-emerald-700">{proposedSummary.totalLineLossKw} kW</span>
            </div>
          </div>
        </div>

        {/* Panel 4: Shunt Capacitor Placement */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4 text-purple-500" />
                4. Shunt Capacitors
              </span>
              <span className="font-mono text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded text-[10px]">
                {proposedSummary.totalCapacitorKvar} kVAR
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2.5">
              Install LT capacitors at tail-end nodes to boost voltage and eliminate reactive current.
            </p>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-700">Pole 6.0:</span>
                <select
                  value={activeCapacitors['6.0'] || 0}
                  onChange={(e) => onSetCapacitor('6.0', Number(e.target.value))}
                  className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="0">0 kVAR</option>
                  <option value="15">15 kVAR</option>
                  <option value="20">20 kVAR (Fig 4)</option>
                  <option value="30">30 kVAR</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-700">Pole 12.0:</span>
                <select
                  value={activeCapacitors['12.0'] || 0}
                  onChange={(e) => onSetCapacitor('12.0', Number(e.target.value))}
                  className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="0">0 kVAR</option>
                  <option value="10">10 kVAR</option>
                  <option value="20">20 kVAR</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Worst Drop:</span>
            <div className="flex items-center gap-1 font-mono">
              <span className="text-slate-400 line-through text-[10px]">-{existingSummary.worstVoltageDropPercent}%</span>
              <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
              <span className="font-bold text-emerald-700">-{proposedSummary.worstVoltageDropPercent}%</span>
            </div>
          </div>
        </div>

        {/* Panel 5: Load Factor & LLF Simulator */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-600" />
                5. Load Factor (LF)
              </span>
              <span className="font-mono bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                {(currentLf * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Simulate duty cycle. LLF: <code className="font-mono text-[9px] bg-slate-100 px-1 py-0.5 rounded text-slate-700">0.2LF+0.8LF²</code>
            </p>

            <div className="space-y-1 mb-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-500">LF: {(currentLf * 100).toFixed(0)}%</span>
                <span className="text-amber-700 font-bold">LLF: {proposedSummary.lossLoadFactor}</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.90"
                step="0.05"
                value={currentLf}
                onChange={(e) => onSetLoadFactor(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            <div className="grid grid-cols-3 gap-1 text-[9px] font-semibold">
              <button
                type="button"
                onClick={() => onSetLoadFactor(0.35)}
                className={`py-0.5 rounded border transition-colors cursor-pointer ${
                  Math.abs(currentLf - 0.35) < 0.01 
                    ? 'bg-emerald-500 text-white border-emerald-600 font-bold' 
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                35% Dom
              </button>
              <button
                type="button"
                onClick={() => onSetLoadFactor(0.60)}
                className={`py-0.5 rounded border transition-colors cursor-pointer ${
                  Math.abs(currentLf - 0.60) < 0.01 
                    ? 'bg-emerald-500 text-white border-emerald-600 font-bold' 
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                60% WAPDA
              </button>
              <button
                type="button"
                onClick={() => onSetLoadFactor(0.75)}
                className={`py-0.5 rounded border transition-colors cursor-pointer ${
                  Math.abs(currentLf - 0.75) < 0.01 
                    ? 'bg-emerald-500 text-white border-emerald-600 font-bold' 
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                75% Ind
              </button>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Energy Loss:</span>
            <span className="font-mono font-bold text-emerald-700">
              {proposedSummary.annualEnergyLossKwh.toLocaleString()} kWh
            </span>
          </div>
        </div>

      </div>

      {/* When Line Bifurcation & T-2 is active, render the dedicated 4-Statement Dual-Zone Analysis */}
      {bifurcationConfig.enabled && (
        <div className="space-y-4">
          <BifurcationStatementsPanel
            dossier={bifurcationDossier}
            currencySymbol={feeder.currencySymbol || 'PKR'}
            onOpenPrintReport={onOpenPrintReport}
          />
        </div>
      )}

      {/* Comparison Matrix (Matching Table 1 from Paper + Proposed Benefits) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Table 1 Comparison & Upgradation Benefits Matrix</span>
              <span className="text-[10px] font-mono uppercase bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                WAPDA Standards
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive comparison of existing baseline vs proposed upgraded system.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Parameter / Metric</th>
                <th className="py-3 px-4">Existing Baseline</th>
                <th className="py-3 px-4 bg-emerald-50/50 text-emerald-900">What-If Proposed System</th>
                <th className="py-3 px-4">Net Improvement / Savings</th>
                <th className="py-3 px-4">Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {/* Bifurcation status row */}
              <tr>
                <td className="py-2.5 px-4 font-sans font-medium text-slate-900">Network Scheme & Bifurcation</td>
                <td className="py-2.5 px-4 text-slate-600">Single Radial Feeder (T-1 Only)</td>
                <td className="py-2.5 px-4 bg-emerald-50/30 font-bold text-emerald-950">
                  {bifurcationConfig.enabled ? (
                    <span className="text-purple-800 flex items-center gap-1">
                      <Split className="w-3.5 h-3.5" />
                      Bifurcated at Pole {bifurcationConfig.bifurcationNodeId} (+{bifurcationConfig.transformerCapacityKva} kVA T-2)
                    </span>
                  ) : (
                    'Standard Unified Topology'
                  )}
                </td>
                <td className="py-2.5 px-4 text-purple-700 font-bold">
                  {bifurcationConfig.enabled ? `Relieved ${proposedSummary.bifurcationReliefKva} kVA downstream` : 'No bifurcation'}
                </td>
                <td className="py-2.5 px-4 font-sans">
                  {bifurcationConfig.enabled ? (
                    <span className="text-purple-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Dual Substation Zone
                    </span>
                  ) : (
                    <span className="text-slate-500">Single DT Feeding</span>
                  )}
                </td>
              </tr>

              {/* Transformer 1 Capacity & Loading */}
              <tr>
                <td className="py-2.5 px-4 font-sans font-medium text-slate-900">Main Transformer (T-1) Loading</td>
                <td className="py-2.5 px-4 text-slate-600">{existingSummary.existingTransformerKva} kVA ({existingSummary.existingTransformerLoadingPercent}%)</td>
                <td className="py-2.5 px-4 bg-emerald-50/30 font-bold text-emerald-950">
                  {activeTransformerKva} kVA ({proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent}%)
                </td>
                <td className="py-2.5 px-4 text-emerald-600 font-bold">
                  {(existingSummary.existingTransformerLoadingPercent - (proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent)) > 0
                    ? `-${existingSummary.existingTransformerLoadingPercent - (proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent)}% loading drop`
                    : 'Optimal'}
                </td>
                <td className="py-2.5 px-4 font-sans">
                  {(proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent) <= 100 ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Normal / Safe ({proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent}%)
                    </span>
                  ) : (
                    <span className="text-rose-600 font-semibold">Overloaded ({proposedSummary.transformer1LoadingPercent}%)</span>
                  )}
                </td>
              </tr>

              {/* Additional Transformer 2 (if active) */}
              {bifurcationConfig.enabled && (
                <tr className="bg-purple-50/20">
                  <td className="py-2.5 px-4 font-sans font-medium text-purple-950">Additional Transformer (T-2)</td>
                  <td className="py-2.5 px-4 text-slate-400">Not Installed (0 kVA)</td>
                  <td className="py-2.5 px-4 bg-emerald-50/30 font-bold text-purple-950">
                    {bifurcationConfig.transformerCapacityKva} kVA ({proposedSummary.transformer2LoadingPercent}%)
                  </td>
                  <td className="py-2.5 px-4 text-purple-700 font-bold">
                    Carrying {proposedSummary.transformer2DemandKva} kVA load
                  </td>
                  <td className="py-2.5 px-4 font-sans">
                    {(proposedSummary.transformer2LoadingPercent || 0) <= 100 ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Optimal Load Center
                      </span>
                    ) : (
                      <span className="text-rose-600 font-semibold">Overloaded ({proposedSummary.transformer2LoadingPercent}%)</span>
                    )}
                  </td>
                </tr>
              )}

              {/* Operating Load Factor */}
              <tr>
                <td className="py-2.5 px-4 font-sans font-medium text-slate-900">Operating Load Factor (LF) & LLF</td>
                <td className="py-2.5 px-4 text-slate-600">{(existingSummary.loadFactor * 100).toFixed(0)}% (LLF: {existingSummary.lossLoadFactor})</td>
                <td className="py-2.5 px-4 bg-emerald-50/30 font-bold text-emerald-950">{(currentLf * 100).toFixed(0)}% (LLF: {proposedSummary.lossLoadFactor})</td>
                <td className="py-2.5 px-4 text-slate-700">
                  {Math.abs(currentLf - existingSummary.loadFactor) > 0.001 ? `${((currentLf - existingSummary.loadFactor) * 100).toFixed(0)}% duty variance` : 'Nominal'}
                </td>
                <td className="py-2.5 px-4 font-sans text-slate-500">
                  WAPDA Distribution Code
                </td>
              </tr>

              {/* Line Losses */}
              <tr>
                <td className="py-2.5 px-4 font-sans font-medium text-slate-900">Total Line Losses (kW)</td>
                <td className="py-2.5 px-4 text-slate-600">{existingSummary.totalLineLossKw} kW</td>
                <td className="py-2.5 px-4 bg-emerald-50/30 font-bold text-emerald-950">{proposedSummary.totalLineLossKw} kW</td>
                <td className="py-2.5 px-4 text-emerald-600 font-bold">
                  -{kwSaved.toFixed(2)} kW ({existingSummary.totalLineLossKw > 0 ? ((kwSaved / existingSummary.totalLineLossKw) * 100).toFixed(1) : 0}%)
                </td>
                <td className="py-2.5 px-4 font-sans">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> Loss Reduced
                  </span>
                </td>
              </tr>

              {/* Annual Energy Loss */}
              <tr>
                <td className="py-2.5 px-4 font-sans font-medium text-slate-900">Annual Energy Loss (kWh/yr)</td>
                <td className="py-2.5 px-4 text-slate-600">{existingSummary.annualEnergyLossKwh.toLocaleString()} kWh</td>
                <td className="py-2.5 px-4 bg-emerald-50/30 font-bold text-emerald-950">{proposedSummary.annualEnergyLossKwh.toLocaleString()} kWh</td>
                <td className="py-2.5 px-4 text-emerald-600 font-bold">
                  -{kwhSaved.toLocaleString()} kWh/yr
                </td>
                <td className="py-2.5 px-4 font-sans font-bold text-amber-700">
                  Rs. {moneySaved.toLocaleString()} Saved
                </td>
              </tr>

              {/* Worst Voltage Drop */}
              <tr>
                <td className="py-2.5 px-4 font-sans font-medium text-slate-900">Worst Voltage Drop (%)</td>
                <td className="py-2.5 px-4 text-rose-600 font-semibold">{existingSummary.worstVoltageDropPercent}%</td>
                <td className="py-2.5 px-4 bg-emerald-50/30 font-bold text-emerald-950">{proposedSummary.worstVoltageDropPercent}%</td>
                <td className="py-2.5 px-4 text-emerald-600 font-bold">
                  +{(existingSummary.worstVoltageDropPercent - proposedSummary.worstVoltageDropPercent).toFixed(1)}% improvement
                </td>
                <td className="py-2.5 px-4 font-sans">
                  {proposedSummary.worstVoltageDropPercent <= 5.0 ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Compliant (≤5%)
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold">
                      Improved ({proposedSummary.worstVoltageVolts} V)
                    </span>
                  )}
                </td>
              </tr>

              {/* Terminal Node Voltage */}
              <tr>
                <td className="py-2.5 px-4 font-sans font-medium text-slate-900">Terminal Node Voltage</td>
                <td className="py-2.5 px-4 text-rose-600 font-semibold">{existingSummary.worstVoltageVolts} V</td>
                <td className="py-2.5 px-4 bg-emerald-50/30 font-bold text-emerald-950">{proposedSummary.worstVoltageVolts} V</td>
                <td className="py-2.5 px-4 text-emerald-600 font-bold">
                  +{(proposedSummary.worstVoltageVolts - existingSummary.worstVoltageVolts).toFixed(1)} V boosted
                </td>
                <td className="py-2.5 px-4 font-sans">
                  <span className="text-slate-600 text-[11px]">{feeder.nominalVoltage}V Nominal Grid</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
