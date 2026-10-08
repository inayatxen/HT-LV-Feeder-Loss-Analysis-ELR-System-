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
  activeInjectedVoltage?: number;
  onUpdateInjectedVoltage?: (volts: number) => void;
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
  activeInjectedVoltage,
  onUpdateInjectedVoltage,
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
  const isHtLine = feeder.type === 'HT' || feeder.category === 'HV' || feeder.nominalVoltage >= 1000;
  const currentInjectedVoltage = activeInjectedVoltage !== undefined ? activeInjectedVoltage : feeder.nominalVoltage;
  const tariff = feeder.tariffPerKwh || 24.83;
  const kwSaved = Math.max(0, existingSummary.totalLineLossKw - proposedSummary.totalLineLossKw);
  const kwhSaved = Math.max(0, existingSummary.annualEnergyLossKwh - proposedSummary.annualEnergyLossKwh);
  const moneySaved = Math.round(kwhSaved * tariff);

  const currentLf = activeLoadFactor !== undefined ? activeLoadFactor : (feeder.loadFactor || 0.60);

  const l1Volt = bifurcationConfig.line1InjectedVoltage || currentInjectedVoltage;
  const l2Volt = bifurcationConfig.line2InjectedVoltage || 11000;
  const vKv1 = l1Volt / 1000;
  const vKv2 = l2Volt / 1000;

  const calculatedLine1Current = Number((proposedSummary.transformer1DemandKva ? (proposedSummary.transformer1DemandKva / (Math.sqrt(3) * vKv1)) : (proposedSummary.totalSourceCurrentAmps || 0)).toFixed(1));
  const calculatedLine2Current = Number((proposedSummary.transformer2DemandKva ? (proposedSummary.transformer2DemandKva / (Math.sqrt(3) * vKv2)) : 0).toFixed(1));

  const effectiveLine1Current = bifurcationConfig.line1InjectedCurrentAmps !== undefined 
    ? bifurcationConfig.line1InjectedCurrentAmps 
    : calculatedLine1Current;
  const effectiveLine2Current = bifurcationConfig.line2InjectedCurrentAmps !== undefined 
    ? bifurcationConfig.line2InjectedCurrentAmps 
    : calculatedLine2Current;

  const bifurcationDossier: BifurcationFourStatementDossier = useMemo(() => {
    return calculateBifurcationFourStatements(feeder, bifurcationConfig, {
      customConductors: activeConductors,
      customCapacitors: activeCapacitors,
      t1TransformerOverrideKva: activeTransformerKva,
      loadFactorOverride: activeLoadFactor
    });
  }, [feeder, bifurcationConfig, activeConductors, activeCapacitors, activeTransformerKva, activeLoadFactor]);

  const hasChanges = 
    (!isHtLine && activeTransformerKva !== feeder.existingTransformerKva) ||
    (isHtLine && activeInjectedVoltage !== undefined && activeInjectedVoltage !== feeder.nominalVoltage) ||
    Object.keys(activeConductors).length > 0 ||
    Object.keys(activeCapacitors).length > 0 ||
    (activeLoadFactor !== undefined && activeLoadFactor !== feeder.loadFactor) ||
    bifurcationConfig.line1InjectedCurrentAmps !== undefined ||
    bifurcationConfig.line2InjectedCurrentAmps !== undefined ||
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
          {isHtLine ? (
            <>
              <button
                onClick={() => onApplyPackage('bifurcation')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  bifurcationConfig.enabled
                    ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400/40'
                    : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-300'
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                <span>HT Feeder Bifurcation (Grid Extension @ Break Point)</span>
              </button>

              <button
                onClick={() => onApplyPackage('standard')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>HT Re-conductoring Plan (Panther / Dog ACSR)</span>
              </button>

              <button
                onClick={() => onApplyPackage('max')}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Grid Voltage Regulation (11.4 kV)</span>
              </button>
            </>
          ) : (
            <>
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
            </>
          )}

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
        
        {/* Panel 1: Line Bifurcation & Additional Transformer (LT) OR HT Feeder Bifurcation & Grid Line Extension (HT) */}
        <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
          bifurcationConfig.enabled 
            ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-400/30 shadow-sm' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Split className="w-4 h-4 text-purple-600" />
                {isHtLine ? '1. HT Bifurcation & Grid Line Extension' : '1. Line Bifurcation & T-2'}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={bifurcationConfig.enabled}
                  onChange={(e) => onSetBifurcation({
                    ...bifurcationConfig,
                    enabled: e.target.checked,
                    gridSourceType: bifurcationConfig.gridSourceType || 'SAME_GRID',
                    extensionLengthKm: bifurcationConfig.extensionLengthKm || 2.0,
                    extensionConductorCode: bifurcationConfig.extensionConductorCode || 'DOG',
                    line1InjectedVoltage: bifurcationConfig.line1InjectedVoltage || currentInjectedVoltage,
                    line2InjectedVoltage: bifurcationConfig.line2InjectedVoltage || 11000
                  })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <p className="text-[11px] text-slate-500 mb-2.5">
              {isHtLine 
                ? 'Bifurcate primary 11kV line & construct new feeder line extension from present/nearby grid station to the point of line break.'
                : 'Split heavily loaded line & install an Additional Distribution Transformer (T-2) at load center.'}
            </p>

            {bifurcationConfig.enabled ? (
              <div className="space-y-2 text-xs">
                {/* Bifurcation Split Node / Point of Line Break */}
                <div>
                  <label className="text-[10px] font-bold text-purple-900 block mb-1">
                    {isHtLine ? 'Point of Line Break / Cut-Off Node:' : 'Bifurcation Cut-Off Point / Split Node:'}
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
                        {n.label || `Node ${n.id}`} ({n.spotLoadKva ? `${n.spotLoadKva} kVA` : `${n.singlePhaseCustomers} 1-Ph, ${n.threePhaseCustomers} 3-Ph`})
                      </option>
                    ))}
                  </select>
                </div>

                {isHtLine ? (
                  <>
                    {/* HT Grid Source Origin */}
                    <div>
                      <label className="text-[10px] font-bold text-purple-900 block mb-1">
                        New Feeder Grid Source Origin:
                      </label>
                      <div className="grid grid-cols-2 gap-1 mb-1">
                        <button
                          type="button"
                          onClick={() => onSetBifurcation({
                            ...bifurcationConfig,
                            gridSourceType: 'SAME_GRID'
                          })}
                          className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors cursor-pointer text-center ${
                            (bifurcationConfig.gridSourceType || 'SAME_GRID') === 'SAME_GRID'
                              ? 'bg-purple-700 text-white border-purple-800'
                              : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100'
                          }`}
                        >
                          Present Grid Station
                        </button>
                        <button
                          type="button"
                          onClick={() => onSetBifurcation({
                            ...bifurcationConfig,
                            gridSourceType: 'OTHER_GRID',
                            otherGridName: bifurcationConfig.otherGridName || 'Nearby 132kV Grid'
                          })}
                          className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors cursor-pointer text-center ${
                            bifurcationConfig.gridSourceType === 'OTHER_GRID'
                              ? 'bg-purple-700 text-white border-purple-800'
                              : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100'
                          }`}
                        >
                          Other Grid Nearby
                        </button>
                      </div>

                      {bifurcationConfig.gridSourceType === 'OTHER_GRID' && (
                        <input
                          type="text"
                          value={bifurcationConfig.otherGridName || ''}
                          onChange={(e) => onSetBifurcation({
                            ...bifurcationConfig,
                            otherGridName: e.target.value
                          })}
                          placeholder="e.g. 132/11kV Warsak Grid / Hayatabad Grid"
                          className="w-full bg-white border border-purple-300 rounded px-2 py-1 text-[11px] font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      )}
                    </div>

                    {/* New Line Extension Specifications */}
                    <div className="bg-purple-100/60 p-2 rounded-lg border border-purple-200 space-y-1.5">
                      <span className="text-[10px] font-bold text-purple-950 uppercase tracking-wider block">
                        New 11kV Line Extension (Grid → Break Point)
                      </span>
                      
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="text-[9px] font-bold text-slate-600 block">Length (meters):</label>
                          <input
                            type="number"
                            min="100"
                            max="50000"
                            step="100"
                            value={bifurcationConfig.extensionLengthKm !== undefined ? Math.round(bifurcationConfig.extensionLengthKm * 1000) : 2000}
                            onChange={(e) => onSetBifurcation({
                              ...bifurcationConfig,
                              extensionLengthKm: (parseFloat(e.target.value) || 0) / 1000
                            })}
                            className="w-full bg-white border border-purple-300 rounded px-2 py-0.5 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                          />
                          <span className="text-[9px] text-purple-800 font-mono">
                            {(bifurcationConfig.extensionLengthKm || 2.0).toFixed(2)} km
                          </span>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-600 block">Conductor Size:</label>
                          <select
                            value={bifurcationConfig.extensionConductorCode || 'DOG'}
                            onChange={(e) => onSetBifurcation({
                              ...bifurcationConfig,
                              extensionConductorCode: e.target.value
                            })}
                            className="w-full bg-white border border-purple-300 rounded px-1.5 py-1 text-[11px] font-mono font-bold text-slate-900 focus:outline-none cursor-pointer"
                          >
                            <option value="DOG">DOG (100 mm²)</option>
                            <option value="PANTHER">PANTHER (200 mm²)</option>
                            <option value="OSPREY">OSPREY (200 mm²)</option>
                            <option value="WASP">WASP (80 mm²)</option>
                            <option value="RABBIT">RABBIT (50 mm²)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Independent Voltage & Current Injection for Both Lines */}
                    <div className="bg-white/90 p-2 rounded-lg border border-purple-200 space-y-2">
                      <span className="text-[10px] font-bold text-purple-950 block">
                        Grid Side Voltage & Current Injections:
                      </span>

                      {/* Line 1 Grid Bay */}
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-800">
                          <span>Proposed Line 1 (Present Grid):</span>
                          <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 text-[10px]">
                            Active: {effectiveLine1Current} A
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                          {/* Line 1 Injected Voltage */}
                          <div className="bg-white p-1.5 rounded border border-slate-200">
                            <span className="text-[9px] font-bold text-slate-600 block mb-0.5">Inj Voltage (kV):</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.05"
                                min="1.0"
                                max="33"
                                value={Number(((bifurcationConfig.line1InjectedVoltage || currentInjectedVoltage) / 1000).toFixed(2))}
                                onChange={(e) => {
                                  const v = Math.round((parseFloat(e.target.value) || 11.0) * 1000);
                                  onSetBifurcation({
                                    ...bifurcationConfig,
                                    line1InjectedVoltage: v
                                  });
                                  if (onUpdateInjectedVoltage) onUpdateInjectedVoltage(v);
                                }}
                                className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-center text-slate-900 focus:outline-none"
                              />
                              <span className="text-[10px] font-mono text-slate-500 font-bold">kV</span>
                            </div>
                            <div className="flex items-center gap-0.5 mt-1">
                              {[11000, 11200, 11400].map(v => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => {
                                    onSetBifurcation({ ...bifurcationConfig, line1InjectedVoltage: v });
                                    if (onUpdateInjectedVoltage) onUpdateInjectedVoltage(v);
                                  }}
                                  className={`flex-1 py-0.2 text-[9px] font-mono rounded cursor-pointer ${
                                    Math.abs((bifurcationConfig.line1InjectedVoltage || currentInjectedVoltage) - v) < 10
                                      ? 'bg-blue-600 text-white font-bold'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {(v / 1000).toFixed(1)}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Line 1 Injected Current */}
                          <div className="bg-white p-1.5 rounded border border-slate-200">
                            <div className="flex items-center justify-between text-[9px] font-bold text-slate-600 mb-0.5">
                              <span>Inj Current (A):</span>
                              {bifurcationConfig.line1InjectedCurrentAmps !== undefined && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSetBifurcation({
                                      ...bifurcationConfig,
                                      line1InjectedCurrentAmps: undefined
                                    });
                                  }}
                                  className="text-[8px] text-blue-600 hover:underline cursor-pointer"
                                  title="Reset to calculated downstream demand current"
                                >
                                  Auto
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.5"
                                min="1"
                                max="2000"
                                value={bifurcationConfig.line1InjectedCurrentAmps !== undefined ? bifurcationConfig.line1InjectedCurrentAmps : ''}
                                placeholder={`${calculatedLine1Current} A`}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                  onSetBifurcation({
                                    ...bifurcationConfig,
                                    line1InjectedCurrentAmps: val
                                  });
                                }}
                                className={`w-full border rounded px-1.5 py-0.5 text-xs font-mono font-bold text-center ${
                                  bifurcationConfig.line1InjectedCurrentAmps !== undefined
                                    ? 'bg-blue-50 border-blue-400 text-blue-900'
                                    : 'bg-slate-50 border-slate-300 text-slate-700'
                                }`}
                              />
                              <span className="text-[10px] font-mono text-slate-500 font-bold">A</span>
                            </div>
                            <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 mt-1">
                              <span>Calc: {calculatedLine1Current}A</span>
                              {bifurcationConfig.line1InjectedCurrentAmps !== undefined && (
                                <span className="text-blue-600 font-bold">Manual</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Line 2 Grid Bay */}
                      <div className="bg-purple-50/70 p-2 rounded-lg border border-purple-200 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-purple-950">
                          <span>Proposed Line 2 (New Grid Feeder):</span>
                          <span className="font-mono text-purple-800 bg-purple-100 px-1.5 py-0.2 rounded border border-purple-300 font-bold text-[10px]">
                            Active: {effectiveLine2Current} A
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                          {/* Line 2 Injected Voltage */}
                          <div className="bg-white p-1.5 rounded border border-purple-200">
                            <span className="text-[9px] font-bold text-purple-900 block mb-0.5">Inj Voltage (kV):</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.05"
                                min="1.0"
                                max="33"
                                value={Number(((bifurcationConfig.line2InjectedVoltage || 11000) / 1000).toFixed(2))}
                                onChange={(e) => {
                                  const v = Math.round((parseFloat(e.target.value) || 11.0) * 1000);
                                  onSetBifurcation({
                                    ...bifurcationConfig,
                                    line2InjectedVoltage: v
                                  });
                                }}
                                className="w-full bg-slate-50 border border-purple-300 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-center text-slate-900 focus:outline-none"
                              />
                              <span className="text-[10px] font-mono text-purple-700 font-bold">kV</span>
                            </div>
                            <div className="flex items-center gap-0.5 mt-1">
                              {[11000, 11200, 11400].map(v => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => onSetBifurcation({ ...bifurcationConfig, line2InjectedVoltage: v })}
                                  className={`flex-1 py-0.2 text-[9px] font-mono rounded cursor-pointer ${
                                    Math.abs((bifurcationConfig.line2InjectedVoltage || 11000) - v) < 10
                                      ? 'bg-purple-700 text-white font-bold'
                                      : 'bg-purple-100 hover:bg-purple-200 text-purple-900'
                                  }`}
                                >
                                  {(v / 1000).toFixed(1)}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Line 2 Injected Current */}
                          <div className="bg-white p-1.5 rounded border border-purple-200">
                            <div className="flex items-center justify-between text-[9px] font-bold text-purple-900 mb-0.5">
                              <span>Inj Current (A):</span>
                              {bifurcationConfig.line2InjectedCurrentAmps !== undefined && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSetBifurcation({
                                      ...bifurcationConfig,
                                      line2InjectedCurrentAmps: undefined
                                    });
                                  }}
                                  className="text-[8px] text-purple-700 hover:underline cursor-pointer"
                                  title="Reset to calculated downstream demand current"
                                >
                                  Auto
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.5"
                                min="1"
                                max="2000"
                                value={bifurcationConfig.line2InjectedCurrentAmps !== undefined ? bifurcationConfig.line2InjectedCurrentAmps : ''}
                                placeholder={`${calculatedLine2Current} A`}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                  onSetBifurcation({
                                    ...bifurcationConfig,
                                    line2InjectedCurrentAmps: val
                                  });
                                }}
                                className={`w-full border rounded px-1.5 py-0.5 text-xs font-mono font-bold text-center ${
                                  bifurcationConfig.line2InjectedCurrentAmps !== undefined
                                    ? 'bg-purple-50 border-purple-400 text-purple-900'
                                    : 'bg-slate-50 border-slate-300 text-slate-700'
                                }`}
                              />
                              <span className="text-[10px] font-mono text-purple-700 font-bold">A</span>
                            </div>
                            <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 mt-1">
                              <span>Calc: {calculatedLine2Current}A</span>
                              {bifurcationConfig.line2InjectedCurrentAmps !== undefined && (
                                <span className="text-purple-700 font-bold">Manual</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dual Feeder Split Preview */}
                    <div className="bg-white/80 p-2 rounded border border-purple-200 text-[10px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Line 1 Load:</span>
                        <span className="font-mono font-bold text-blue-700">
                          {proposedSummary.transformer1DemandKva} kVA
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-purple-900 font-semibold">Line 2 Load:</span>
                        <span className="font-mono font-bold text-purple-700">
                          {proposedSummary.transformer2DemandKva} kVA
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* LT Additional Transformer Location Node */}
                    <div>
                      <label className="text-[10px] font-bold text-purple-900 block mb-1">
                        New Additional Transformer (T-2) Substation Location:
                      </label>
                      <select
                        value={bifurcationConfig.transformerNodeId || bifurcationConfig.bifurcationNodeId}
                        onChange={(e) => onSetBifurcation({
                          ...bifurcationConfig,
                          transformerNodeId: e.target.value
                        })}
                        className="w-full bg-white border border-purple-300 rounded px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                      >
                        {feeder.nodes.map(n => (
                          <option key={n.id} value={n.id}>
                            Node {n.id} ({n.label}) {n.id === bifurcationConfig.bifurcationNodeId ? '★ Cut-Off Point' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* LT Additional Transformer Capacity */}
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
                  </>
                )}

                {/* Status persistence badge */}
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Scheme configured & calculated live.</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-2.5 rounded-lg border border-dashed border-slate-300 text-center py-4">
                <span className="text-[11px] text-slate-400 block mb-1.5">
                  {isHtLine ? 'HT Bifurcation inactive' : 'Bifurcation inactive'}
                </span>
                <button
                  type="button"
                  onClick={() => onSetBifurcation({
                    ...bifurcationConfig,
                    enabled: true,
                    bifurcationNodeId: candidateNodes[2]?.id || '3.0',
                    gridSourceType: 'SAME_GRID',
                    extensionLengthKm: 2.0,
                    extensionConductorCode: 'DOG',
                    line1InjectedVoltage: currentInjectedVoltage,
                    line2InjectedVoltage: 11000,
                    transformerCapacityKva: 100
                  })}
                  className="px-2 py-1 text-[10px] font-bold bg-purple-100 text-purple-800 rounded border border-purple-200 hover:bg-purple-200 cursor-pointer"
                >
                  {isHtLine ? 'Enable HT Feeder Bifurcation' : 'Enable Bifurcation Scheme'}
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

        {/* Panel 2: Injected Voltage (HT Line) or Transformer Capacity (LT Line) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                {isHtLine ? '2. Line 1 Grid Voltage & Current' : '2. Main Transformer (T-1)'}
              </span>
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold text-[11px]">
                {isHtLine ? `${(currentInjectedVoltage / 1000).toFixed(2)} kV` : `${activeTransformerKva} kVA`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2.5">
              {isHtLine 
                ? 'Adjust Line 1 voltage injected at Node 0 grid substation bus to observe impact on feeder tail drops & losses.'
                : 'Augment main source transformer capacity to eliminate thermal overloading.'}
            </p>

            {isHtLine ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-600">Injected kV:</span>
                  <input
                    type="number"
                    min="1.0"
                    max="132"
                    step="0.05"
                    value={Number(((bifurcationConfig.line1InjectedVoltage || currentInjectedVoltage) / 1000).toFixed(2))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 11.0;
                      const v = Math.round(val * 1000);
                      onSetBifurcation({
                        ...bifurcationConfig,
                        line1InjectedVoltage: v
                      });
                      if (onUpdateInjectedVoltage) {
                        onUpdateInjectedVoltage(v);
                      }
                    }}
                    className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-800 text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-xs font-mono font-semibold text-slate-500">kV ({(bifurcationConfig.line1InjectedVoltage || currentInjectedVoltage).toLocaleString()} V)</span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {[
                    { label: '11.0 kV', val: 11000 },
                    { label: '11.2 kV', val: 11200 },
                    { label: '11.4 kV', val: 11400 },
                    { label: '11.5 kV', val: 11500 }
                  ].map(p => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => {
                        onSetBifurcation({ ...bifurcationConfig, line1InjectedVoltage: p.val });
                        if (onUpdateInjectedVoltage) onUpdateInjectedVoltage(p.val);
                      }}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded font-bold transition-all cursor-pointer ${
                        Math.abs((bifurcationConfig.line1InjectedVoltage || currentInjectedVoltage) - p.val) < 10
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 mb-1">
                    <span>Injected Line 1 Current:</span>
                    {bifurcationConfig.line1InjectedCurrentAmps !== undefined && (
                      <button
                        type="button"
                        onClick={() => {
                          onSetBifurcation({
                            ...bifurcationConfig,
                            line1InjectedCurrentAmps: undefined
                          });
                        }}
                        className="text-[9px] text-blue-600 hover:underline cursor-pointer"
                      >
                        Auto ({calculatedLine1Current}A)
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="2000"
                      step="0.5"
                      value={bifurcationConfig.line1InjectedCurrentAmps !== undefined ? bifurcationConfig.line1InjectedCurrentAmps : ''}
                      placeholder={`${calculatedLine1Current} A (calc)`}
                      onChange={(e) => {
                        const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                        onSetBifurcation({
                          ...bifurcationConfig,
                          line1InjectedCurrentAmps: val
                        });
                      }}
                      className={`w-24 border rounded px-2 py-1 text-xs font-mono font-bold text-center ${
                        bifurcationConfig.line1InjectedCurrentAmps !== undefined
                          ? 'bg-blue-50 border-blue-400 text-blue-900'
                          : 'bg-slate-50 border-slate-300 text-slate-800'
                      }`}
                    />
                    <span className="text-xs font-mono font-semibold text-slate-500">Amperes (A)</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">{isHtLine ? 'Line 1 Current:' : 'T-1 Loading:'}</span>
            <span className={`font-mono font-bold ${
              isHtLine 
                ? 'text-blue-700' 
                : ((proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent) > 100 ? 'text-rose-600' : 'text-emerald-700')
            }`}>
              {isHtLine 
                ? `${proposedSummary.transformer1DemandKva ? (proposedSummary.transformer1DemandKva / (Math.sqrt(3) * (currentInjectedVoltage / 1000))).toFixed(1) : proposedSummary.totalSourceCurrentAmps} A` 
                : `${proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent}% ${((proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent) <= 100) ? '(Safe)' : ''}`}
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
              {isHtLine 
                ? 'Upgrade HT feeder spans to heavier ACSR Dog or Panther conductors.' 
                : 'Upgrade high-loss segments from 7/0.122" to heavier ACSR "Dog" or "Rabbit".'}
            </p>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {feeder.segments.slice(0, 3).map(seg => {
                const currentCode = activeConductors[seg.id] || seg.conductorCode;
                return (
                  <div key={seg.id} className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-700">
                      {seg.fromNodeId.replace('.0', '')} → {seg.toNodeId.replace('.0', '')}:
                    </span>
                    <select
                      value={currentCode}
                      onChange={(e) => onSetConductor(seg.id, e.target.value)}
                      className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] font-mono text-slate-800 focus:outline-none cursor-pointer"
                    >
                      {isHtLine ? (
                        <>
                          <option value="DOG">DOG (100 mm²)</option>
                          <option value="PANTHER">PANTHER (200 mm²)</option>
                          <option value="RABBIT">RABBIT (50 mm²)</option>
                          <option value="WASP">WASP (80 mm²)</option>
                          <option value="OSPREY">OSPREY (200 mm²)</option>
                          <option value="A">A (7/0.122")</option>
                        </>
                      ) : (
                        <>
                          <option value="A">7/0.122" (Original)</option>
                          <option value="WASP">7/0.170" ACSR Wasp (80 mm²)</option>
                          <option value="DOG">ACSR Dog (100mm²)</option>
                          <option value="RABBIT">ACSR Rabbit</option>
                          <option value="PU3">PVC 37/0.083"</option>
                        </>
                      )}
                    </select>
                  </div>
                );
              })}
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
              {/* Network Scheme & Bifurcation row */}
              <tr>
                <td className="py-2.5 px-4 font-sans font-medium text-slate-900">Network Scheme & Bifurcation</td>
                <td className="py-2.5 px-4 text-slate-600">
                  {isHtLine ? 'Single 11kV Radial Feeder (Grid Bay)' : 'Single Radial Feeder (T-1 Only)'}
                </td>
                <td className="py-2.5 px-4 bg-emerald-50/30 font-bold text-emerald-950">
                  {bifurcationConfig.enabled ? (
                    <span className="text-purple-800 flex items-center gap-1">
                      <Split className="w-3.5 h-3.5" />
                      {isHtLine 
                        ? `Dual HT Feeders: Line 1 + Line 2 (${bifurcationConfig.extensionLengthKm || 2.0}km ${bifurcationConfig.extensionConductorCode || 'DOG'} to Node ${bifurcationConfig.bifurcationNodeId})`
                        : `Bifurcated at Pole ${bifurcationConfig.bifurcationNodeId} (+${bifurcationConfig.transformerCapacityKva} kVA T-2)`}
                    </span>
                  ) : (
                    isHtLine ? 'Unified Radial HT Feeder' : 'Standard Unified Topology'
                  )}
                </td>
                <td className="py-2.5 px-4 text-purple-700 font-bold">
                  {bifurcationConfig.enabled ? `Relieved ${proposedSummary.bifurcationReliefKva} kVA downstream` : 'No bifurcation'}
                </td>
                <td className="py-2.5 px-4 font-sans">
                  {bifurcationConfig.enabled ? (
                    <span className="text-purple-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {isHtLine ? 'Dual HT Grid Feeder' : 'Dual Substation Zone'}
                    </span>
                  ) : (
                    <span className="text-slate-500">{isHtLine ? 'Single HT Feeder' : 'Single DT Feeding'}</span>
                  )}
                </td>
              </tr>

              {/* HT Line 1 Loading / LT Transformer 1 Loading */}
              <tr>
                <td className="py-2.5 px-4 font-sans font-medium text-slate-900">
                  {isHtLine ? 'Proposed Line 1 (Present Grid Feeder) Loading' : 'Main Transformer (T-1) Loading'}
                </td>
                <td className="py-2.5 px-4 text-slate-600">
                  {isHtLine 
                    ? `${existingSummary.totalSourceCurrentAmps} A (${existingSummary.totalSystemDemandKva} kVA)` 
                    : `${existingSummary.existingTransformerKva} kVA (${existingSummary.existingTransformerLoadingPercent}%)`}
                </td>
                <td className="py-2.5 px-4 bg-emerald-50/30 font-bold text-emerald-950">
                  {isHtLine 
                    ? `${proposedSummary.transformer1DemandKva ? (proposedSummary.transformer1DemandKva / (Math.sqrt(3) * ((bifurcationConfig.line1InjectedVoltage || currentInjectedVoltage) / 1000))).toFixed(1) : proposedSummary.totalSourceCurrentAmps} A (${proposedSummary.transformer1DemandKva || proposedSummary.totalSystemDemandKva} kVA)` 
                    : `${activeTransformerKva} kVA (${proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent}%)`}
                </td>
                <td className="py-2.5 px-4 text-emerald-600 font-bold">
                  {isHtLine 
                    ? (bifurcationConfig.enabled ? `-${(existingSummary.totalSourceCurrentAmps - (proposedSummary.transformer1DemandKva / (Math.sqrt(3) * ((bifurcationConfig.line1InjectedVoltage || currentInjectedVoltage) / 1000)))).toFixed(1)} A current relief` : 'Nominal')
                    : ((existingSummary.existingTransformerLoadingPercent - (proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent)) > 0
                        ? `-${existingSummary.existingTransformerLoadingPercent - (proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent)}% loading drop`
                        : 'Optimal')}
                </td>
                <td className="py-2.5 px-4 font-sans">
                  {isHtLine ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Normal / Substation Bay 1
                    </span>
                  ) : (
                    (proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent) <= 100 ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Normal / Safe ({proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent}%)
                      </span>
                    ) : (
                      <span className="text-rose-600 font-semibold">Overloaded ({proposedSummary.transformer1LoadingPercent}%)</span>
                    )
                  )}
                </td>
              </tr>

              {/* HT Line 2 Loading / LT Additional Transformer 2 (if active) */}
              {bifurcationConfig.enabled && (
                <tr className="bg-purple-50/20">
                  <td className="py-2.5 px-4 font-sans font-medium text-purple-950">
                    {isHtLine ? 'Proposed Line 2 (New Feeder Extension) Loading' : 'Additional Transformer (T-2)'}
                  </td>
                  <td className="py-2.5 px-4 text-slate-400">
                    {isHtLine ? 'Not Extended (0 A)' : 'Not Installed (0 kVA)'}
                  </td>
                  <td className="py-2.5 px-4 bg-emerald-50/30 font-bold text-purple-950">
                    {isHtLine 
                      ? `${proposedSummary.transformer2DemandKva ? (proposedSummary.transformer2DemandKva / (Math.sqrt(3) * ((bifurcationConfig.line2InjectedVoltage || 11000) / 1000))).toFixed(1) : 0} A (${proposedSummary.transformer2DemandKva} kVA)` 
                      : `${bifurcationConfig.transformerCapacityKva} kVA (${proposedSummary.transformer2LoadingPercent}%)`}
                  </td>
                  <td className="py-2.5 px-4 text-purple-700 font-bold">
                    Carrying {proposedSummary.transformer2DemandKva} kVA load
                  </td>
                  <td className="py-2.5 px-4 font-sans">
                    {isHtLine ? (
                      <span className="text-purple-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {bifurcationConfig.gridSourceType === 'OTHER_GRID' ? (bifurcationConfig.otherGridName || 'Nearby Grid') : 'Present Grid'} Bay
                      </span>
                    ) : (
                      (proposedSummary.transformer2LoadingPercent || 0) <= 100 ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Optimal Load Center
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold">Overloaded ({proposedSummary.transformer2LoadingPercent}%)</span>
                      )
                    )}
                  </td>
                </tr>
              )}

              {/* Grid Injected Voltage Row (for HT) */}
              {isHtLine && (
                <tr>
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-900">Grid Injected Voltage (Line 1 / Line 2)</td>
                  <td className="py-2.5 px-4 text-slate-600">{(existingSummary.injectedVoltageAtNode0 ? (existingSummary.injectedVoltageAtNode0 / 1000) : 11.0).toFixed(2)} kV</td>
                  <td className="py-2.5 px-4 bg-emerald-50/30 font-bold text-emerald-950">
                    L1: {((bifurcationConfig.line1InjectedVoltage || currentInjectedVoltage) / 1000).toFixed(2)} kV
                    {bifurcationConfig.enabled && ` / L2: ${((bifurcationConfig.line2InjectedVoltage || 11000) / 1000).toFixed(2)} kV`}
                  </td>
                  <td className="py-2.5 px-4 text-emerald-600 font-bold">
                    Regulated from Grid
                  </td>
                  <td className="py-2.5 px-4 font-sans text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Grid Regulated
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
