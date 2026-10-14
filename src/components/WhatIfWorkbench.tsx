/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
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
  Printer,
  Clock,
  DollarSign,
  Calculator,
  ArrowLeftRight,
  Compass,
  MapPin
} from 'lucide-react';
import { CONDUCTOR_LIST } from '../data/conductors';
import { TRANSFORMER_CAPACITIES } from '../data/transformers';
import { calculateBifurcationFourStatements } from '../utils/elrEngine';
import { BifurcationStatementsPanel } from './BifurcationStatementsPanel';
import { SensitivityAnalysisSection } from './SensitivityAnalysisSection';
import { EconomicAnalysisSection } from './EconomicAnalysisSection';
import { FeederComparisonModal } from './FeederComparisonModal';
import { VisualMapComponent } from './VisualMapComponent';
import { SingleLineDiagram } from './SingleLineDiagram';

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
  onOpenCostEstimation?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenKmlImport?: () => void;
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
  onOpenPrintReport,
  onOpenCostEstimation,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenKmlImport
}) => {
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [visualMode, setVisualMode] = useState<'diagram' | 'map'>('diagram');
  const [showVisualPanel, setShowVisualPanel] = useState<boolean>(true);
  const isHtLine = feeder.type === 'HT' || feeder.category === 'HV' || feeder.nominalVoltage >= 1000;
  const currentInjectedVoltage = activeInjectedVoltage !== undefined ? activeInjectedVoltage : feeder.nominalVoltage;
  const tariff = feeder.tariffPerKwh || 24.83;
  const kwSaved = Math.max(0, existingSummary.totalLineLossKw - proposedSummary.totalLineLossKw);
  const kwhSaved = Math.max(0, existingSummary.annualEnergyLossKwh - proposedSummary.annualEnergyLossKwh);
  const moneySaved = Math.round(kwhSaved * tariff);

  // Quick dynamic CapEx and Payback period for the top KPI deck
  const quickCapexEstimate = useMemo(() => {
    let cost = 0;
    if (bifurcationConfig.enabled) {
      if (isHtLine) {
        cost += (bifurcationConfig.extensionLengthKm || 2.0) * 1450000 + 850000;
      } else {
        const trCost = (bifurcationConfig.transformerCapacityKva || 100) >= 200 ? 1150000 : 680000;
        const htCost = ((bifurcationConfig.htExtensionMeters || 0) / 1000) * 1250000;
        cost += trCost + 245000 + htCost;
      }
    }
    if (!isHtLine && activeTransformerKva !== (feeder.existingTransformerKva || 100)) {
      cost += 510000;
    }
    const reconSpans = feeder.segments.filter(s => activeConductors[s.id] && activeConductors[s.id] !== s.conductorCode);
    if (reconSpans.length > 0) {
      const lenKm = reconSpans.reduce((acc, s) => acc + s.lengthKm, 0);
      cost += lenKm * 480000;
    }
    const capKvar = Object.values(activeCapacitors).reduce((acc, v) => acc + (v || 0), 0);
    if (capKvar > 0) {
      cost += capKvar * 12500;
    }
    if (cost > 0) cost *= 1.08;
    return Math.round(cost);
  }, [bifurcationConfig, isHtLine, activeTransformerKva, feeder, activeConductors, activeCapacitors]);

  const quickPaybackMonths = useMemo(() => {
    if (moneySaved <= 0 || quickCapexEstimate <= 0) return null;
    return (quickCapexEstimate / (moneySaved / 12));
  }, [quickCapexEstimate, moneySaved]);

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
      loadFactorOverride: activeLoadFactor,
      htExtensionMeters: bifurcationConfig.htExtensionMeters,
      htExtensionConductorCode: bifurcationConfig.htExtensionConductorCode
    });
  }, [feeder, bifurcationConfig, activeConductors, activeCapacitors, activeTransformerKva, activeLoadFactor, bifurcationConfig.htExtensionMeters, bifurcationConfig.htExtensionConductorCode]);

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
      {/* Workbench Header & Quick Upgrade Presets (3D Tactile Card) */}
      <div className="sticky top-0 z-10 card-3d p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 mb-1">
            <SlidersHorizontal className="w-4 h-4 stroke-[2.2]" />
            <span>ELR INTERVENTION WORKBENCH</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            System Upgradation & Loss Reduction Simulator
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Simulate technical interventions: line bifurcation with additional transformer (T-2), transformer augmentation, segment re-conductoring, shunt capacitors, and load factor duty cycle variation.
          </p>
        </div>

        {/* Quick Packages (3D Tactile Buttons) */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* History Controls */}
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 rounded-lg btn-3d-slate text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Undo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 rounded-lg btn-3d-slate text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Redo"
            >
              <RotateCcw className="w-4 h-4 rotate-180" />
            </button>
          </div>

          {/* Feeder Route Visualizer Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300 mr-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setShowVisualPanel(true);
                setVisualMode('diagram');
              }}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                showVisualPanel && visualMode === 'diagram'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Line Diagram View"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Diagram</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowVisualPanel(true);
                setVisualMode('map');
              }}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                showVisualPanel && visualMode === 'map'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Geographic Map Overlay"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
          </div>

          {/* Side-by-Side Compare Button */}
          <button
            type="button"
            onClick={() => setShowCompareModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap btn-3d-blue text-white shadow-md hover:brightness-110 active:scale-95 mr-2"
            title="Side-by-Side Baseline vs Proposed Feeder Comparison"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Compare</span>
          </button>

          {isHtLine ? (
            <>
              <button
                onClick={() => onApplyPackage('bifurcation')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  bifurcationConfig.enabled
                    ? 'btn-3d-blue text-white shadow-md'
                    : 'btn-3d-slate text-purple-200'
                }`}
              >
                <Split className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>HT Feeder Bifurcation</span>
              </button>

              <button
                onClick={() => onApplyPackage('standard')}
                className="btn-3d-amber px-3 py-1.5 text-xs font-bold text-slate-950 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950 stroke-[2.2]" />
                <span>Re-conductoring Plan</span>
              </button>

              <button
                onClick={() => onApplyPackage('max')}
                className="btn-3d-emerald px-3 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[2.2]" />
                <span>Voltage Regulation (11.4 kV)</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onApplyPackage('bifurcation')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  bifurcationConfig.enabled
                    ? 'btn-3d-blue text-white shadow-md'
                    : 'btn-3d-slate text-purple-200'
                }`}
              >
                <Split className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Bifurcation + T-2 (100 kVA)</span>
              </button>

              <button
                onClick={() => onApplyPackage('standard')}
                className="btn-3d-amber px-3 py-1.5 text-xs font-bold text-slate-950 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950 stroke-[2.2]" />
                <span>Augmentation (200 kVA)</span>
              </button>

              <button
                onClick={() => onApplyPackage('max')}
                className="btn-3d-emerald px-3 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[2.2]" />
                <span>Max Efficiency Plan</span>
              </button>
            </>
          )}

          {hasChanges && (
            <button
              onClick={onReset}
              className="btn-3d-slate px-3 py-1.5 text-xs font-bold text-rose-300 hover:text-white flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Savings Metric Highlights (3D Elevated Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card-3d bg-gradient-to-br from-emerald-50 via-teal-50/70 to-emerald-100/50 border-emerald-200 p-4 rounded-xl">
          <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider block">
            Power Loss Reduction
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono mt-1 tracking-tight">
            {kwSaved.toFixed(2)} kW
          </div>
          <span className="text-[11px] text-emerald-700 mt-1 block font-medium">
            {existingSummary.totalLineLossKw > 0 ? ((kwSaved / existingSummary.totalLineLossKw) * 100).toFixed(1) : 0}% reduction in peak losses
          </span>
        </div>

        <div className="card-3d bg-gradient-to-br from-blue-50 via-indigo-50/70 to-blue-100/50 border-blue-200 p-4 rounded-xl">
          <span className="text-xs text-blue-800 font-bold uppercase tracking-wider block">
            Annual Energy Saved
          </span>
          <div className="text-2xl sm:text-3xl font-black text-blue-950 font-mono mt-1 tracking-tight">
            {kwhSaved.toLocaleString()} kWh
          </div>
          <span className="text-[11px] text-blue-700 mt-1 block font-mono font-medium">
            LLF: {proposedSummary.lossLoadFactor} (LF: {(currentLf * 100).toFixed(0)}%)
          </span>
        </div>

        <div className="card-3d bg-gradient-to-br from-amber-50 via-orange-50/70 to-amber-100/50 border-amber-200 p-4 rounded-xl">
          <span className="text-xs text-amber-800 font-bold uppercase tracking-wider block">
            Annual Financial Benefit
          </span>
          <div className="text-2xl sm:text-3xl font-black text-amber-950 font-mono mt-1 tracking-tight">
            Rs. {moneySaved.toLocaleString()}
          </div>
          <span className="text-[11px] text-amber-700 mt-1 block font-medium">
            At statutory tariff of Rs. {tariff}/kWh
          </span>
        </div>

        <a 
          href="#economic-analysis-section"
          className="card-3d bg-gradient-to-br from-purple-50 via-indigo-50/70 to-purple-100/50 border-purple-200 hover:border-purple-400 p-4 rounded-xl transition-all block cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-900 font-bold uppercase tracking-wider block flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              Simple Payback Period
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-purple-600 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-950 font-mono mt-1 tracking-tight">
            {quickPaybackMonths !== null ? `${quickPaybackMonths.toFixed(1)} Mos` : (hasChanges ? 'Calculating...' : 'Configure')}
          </div>
          <span className="text-[11px] text-purple-700 mt-1 block font-medium">
            {quickCapexEstimate > 0 ? `CapEx: Rs. ${(quickCapexEstimate / 1000).toFixed(0)}k • View Analysis ↓` : 'View Economic Analysis ↓'}
          </span>
        </a>
      </div>

      {/* Feeder Route Topology & Geographic Visualizer Section */}
      {showVisualPanel && (
        <div className="card-3d bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {visualMode === 'map' ? <Compass className="w-4 h-4" /> : <GitBranch className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-white tracking-tight uppercase">
                    {visualMode === 'map' ? 'Geographic Feeder Route (GIS Map Overlay)' : 'Single Line Diagram (Electrical Network Topology)'}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {feeder.nodes.length} Nodes · {feeder.segments.length} Spans
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {visualMode === 'map' 
                    ? 'Geographic route overlay with coordinate pins, conductors, and what-if bifurcation points' 
                    : 'Interactive electrical single-line schematic with power flows, loading, and bifurcation split'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle Buttons */}
              <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setVisualMode('diagram')}
                  className={`px-3 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    visualMode === 'diagram' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Line Diagram View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisualMode('map')}
                  className={`px-3 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    visualMode === 'map' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Map Overlay</span>
                </button>
              </div>

              {/* Hide / Collapse Visualizer */}
              <button
                type="button"
                onClick={() => setShowVisualPanel(false)}
                className="px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-white rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                title="Hide visual panel"
              >
                Hide
              </button>
            </div>
          </div>

          <div className="p-0">
            {visualMode === 'map' ? (
              <VisualMapComponent 
                feeder={feeder} 
                bifurcationConfig={bifurcationConfig}
                onOpenKmlImport={onOpenKmlImport}
              />
            ) : (
              <div className="p-2 sm:p-4 bg-slate-950 rounded-b-xl overflow-hidden">
                <SingleLineDiagram
                  feeder={feeder}
                  summary={proposedSummary}
                  existingSummary={existingSummary}
                  bifurcationConfig={bifurcationConfig}
                  onUpdateBifurcation={onSetBifurcation}
                  bifurcationDossier={bifurcationDossier}
                  onQuickReconductor={onSetConductor}
                  onQuickCapacitor={onSetCapacitor}
                  activeCapacitors={activeCapacitors}
                  activeConductors={activeConductors}
                  onOpenPrintReport={onOpenPrintReport}
                />
              </div>
            )}
          </div>
        </div>
      )}
      {!showVisualPanel && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowVisualPanel(true)}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Show Feeder Visualizer ({visualMode === 'map' ? 'Map Overlay' : 'Line Diagram'})</span>
          </button>
        </div>
      )}

      {/* 5 Interactive Intervention Panels Grid (3D Hardware Chassis Look) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Panel 1: Line Bifurcation & Additional Transformer (LT) OR HT Feeder Bifurcation & Grid Line Extension (HT) */}
        <div className={`card-3d p-4 transition-all flex flex-col justify-between ${
          bifurcationConfig.enabled 
            ? 'bg-gradient-to-b from-purple-50/80 to-purple-100/40 border-purple-300 ring-2 ring-purple-400/40 shadow-md' 
            : ''
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
                    htExtensionMeters: bifurcationConfig.htExtensionMeters || 0,
                    htExtensionConductorCode: bifurcationConfig.htExtensionConductorCode || 'DOG',
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
                    Point of Line Break / Cut-Off Node:
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
                
                {/* Transformer connection option at cut-off point */}
                <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <label className="text-[10px] font-bold text-slate-900 block mb-1">
                    Cut-Off Node Load Connection:
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSetBifurcation({ ...bifurcationConfig, cutOffTransformerConnection: 'EXISTING' })}
                      className={`flex-1 py-1 text-[10px] font-bold rounded border ${bifurcationConfig.cutOffTransformerConnection !== 'PROPOSED' ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-slate-700 border-slate-300'}`}
                    >
                      Existing T/F
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetBifurcation({ ...bifurcationConfig, cutOffTransformerConnection: 'PROPOSED' })}
                      className={`flex-1 py-1 text-[10px] font-bold rounded border ${bifurcationConfig.cutOffTransformerConnection === 'PROPOSED' ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-slate-700 border-slate-300'}`}
                    >
                      Proposed T/F
                    </button>
                  </div>
                </div>

                {!isHtLine && (
                  <div className="bg-amber-100/60 p-2 rounded-lg border border-amber-200 space-y-1.5 mt-2">
                    <span className="text-[10px] font-bold text-amber-950 uppercase tracking-wider block">
                      Proposed HT Line Extension for T-2
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block">Length (m):</label>
                        <input
                          type="number"
                          value={bifurcationConfig.htExtensionMeters || 0}
                          onChange={(e) => onSetBifurcation({
                            ...bifurcationConfig,
                            htExtensionMeters: parseFloat(e.target.value) || 0
                          })}
                          className="w-full bg-white border border-amber-300 rounded px-2 py-0.5 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block">Conductor:</label>
                        <select
                          value={bifurcationConfig.htExtensionConductorCode || 'DOG'}
                          onChange={(e) => onSetBifurcation({
                            ...bifurcationConfig,
                            htExtensionConductorCode: e.target.value
                          })}
                          className="w-full bg-white border border-amber-300 rounded px-2 py-0.5 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                        >
                          {CONDUCTOR_LIST.map(c => (
                            <option key={c.code} value={c.code}>{c.code}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

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
                          <label className="text-[9px] font-bold text-slate-600 block">Length (km):</label>
                          <input
                            type="number"
                            min="0.1"
                            max="50"
                            step="0.1"
                            value={bifurcationConfig.extensionLengthKm !== undefined ? bifurcationConfig.extensionLengthKm : 2.0}
                            onChange={(e) => onSetBifurcation({
                              ...bifurcationConfig,
                              extensionLengthKm: parseFloat(e.target.value) || 0
                            })}
                            className="w-full bg-white border border-purple-300 rounded px-2 py-0.5 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                          />
                          <span className="text-[9px] text-purple-800 font-mono">
                            {Math.round((bifurcationConfig.extensionLengthKm || 2.0) * 1000)} meters
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
        <div className="card-3d p-4 flex flex-col justify-between">
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
        <div className="card-3d p-4 flex flex-col justify-between">
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
        <div className="card-3d p-4 flex flex-col justify-between">
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
        <div className="card-3d p-4 flex flex-col justify-between">
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
                <span className="text-slate-500">LF: {(currentLf * 100).toFixed(0)}% (0.50 – 1.00)</span>
                <span className="text-amber-700 font-bold">LLF: {proposedSummary.lossLoadFactor}</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="1.00"
                step="0.05"
                value={Math.min(1.0, Math.max(0.5, currentLf))}
                onChange={(e) => onSetLoadFactor(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            <div className="grid grid-cols-4 gap-1 text-[9px] font-semibold">
              <button
                type="button"
                onClick={() => onSetLoadFactor(0.50)}
                className={`py-0.5 rounded border transition-colors cursor-pointer ${
                  Math.abs(currentLf - 0.50) < 0.01 
                    ? 'bg-emerald-500 text-white border-emerald-600 font-bold' 
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                50% Rural
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
              <button
                type="button"
                onClick={() => onSetLoadFactor(1.00)}
                className={`py-0.5 rounded border transition-colors cursor-pointer ${
                  Math.abs(currentLf - 1.00) < 0.01 
                    ? 'bg-emerald-500 text-white border-emerald-600 font-bold' 
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                100% Flat
              </button>
            </div>
            
            <a
              href="#sensitivity-analysis-section"
              className="mt-2 block text-center text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50/80 hover:bg-indigo-100/80 py-1 rounded border border-indigo-200 transition-colors"
            >
              Open Sensitivity Simulator ↓
            </a>
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

      {/* Sensitivity Analysis Feature: Load Factor (0.50 - 1.00) & Annual Growth Dynamic Chart */}
      <div id="sensitivity-analysis-section">
        <SensitivityAnalysisSection
          feeder={feeder}
          activeConductors={activeConductors}
          activeCapacitors={activeCapacitors}
          activeTransformerKva={activeTransformerKva}
          activeInjectedVoltage={activeInjectedVoltage}
          activeLoadFactor={activeLoadFactor}
          onSetLoadFactor={onSetLoadFactor}
          bifurcationConfig={bifurcationConfig}
          existingSummary={existingSummary}
          proposedSummary={proposedSummary}
        />
      </div>

      {/* Economic Analysis Feature: Simple Payback Period (in months) comparing Annual Energy Loss savings vs Project Cost */}
      <div id="economic-analysis-section">
        <EconomicAnalysisSection
          feeder={feeder}
          existingSummary={existingSummary}
          proposedSummary={proposedSummary}
          activeTransformerKva={activeTransformerKva}
          activeConductors={activeConductors}
          activeCapacitors={activeCapacitors}
          bifurcationConfig={bifurcationConfig}
          activeLoadFactor={activeLoadFactor}
          onOpenCostEstimation={onOpenCostEstimation}
        />
      </div>

      {/* Comparison Matrix (Matching Table 1 from Paper + Proposed Benefits) */}
      <div className="card-3d-static overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <span>Table 1 Comparison & Upgradation Benefits Matrix</span>
              <span className="text-[10px] font-mono uppercase bg-slate-200/80 px-2 py-0.5 rounded-md text-slate-800 font-bold shadow-2xs border border-slate-300">
                WAPDA Standards
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive comparison of existing baseline vs proposed upgraded system.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCompareModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap bg-blue-600 hover:bg-blue-500 text-white shadow-xs active:scale-95"
            title="Open Interactive Side-by-Side Feeder Comparison"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Side-by-Side Comparison</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
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

              {/* Estimated Intervention CapEx */}
              <tr>
                <td className="py-2.5 px-4 font-sans font-medium text-slate-900">Estimated Project CapEx (PKR)</td>
                <td className="py-2.5 px-4 text-slate-600">Rs. 0 (Baseline)</td>
                <td className="py-2.5 px-4 bg-emerald-50/30 font-bold text-emerald-950">
                  Rs. {quickCapexEstimate.toLocaleString()}
                </td>
                <td className="py-2.5 px-4 text-purple-700 font-bold">
                  {quickCapexEstimate > 0 ? `${Object.keys(activeConductors).length} spans, ${bifurcationConfig.enabled ? 'bifurcation' : 'network'}` : 'No CapEx required'}
                </td>
                <td className="py-2.5 px-4 font-sans font-semibold text-purple-700">
                  <a href="#economic-analysis-section" className="hover:underline flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> View Breakdown
                  </a>
                </td>
              </tr>

              {/* Simple Payback Period */}
              <tr>
                <td className="py-2.5 px-4 font-sans font-medium text-slate-900">Simple Payback Period (Months)</td>
                <td className="py-2.5 px-4 text-slate-600">N/A (Reference)</td>
                <td className="py-2.5 px-4 bg-emerald-50/30 font-bold text-emerald-950">
                  {quickPaybackMonths !== null ? `${quickPaybackMonths.toFixed(1)} Months (${(quickPaybackMonths / 12).toFixed(2)} Yrs)` : 'N/A'}
                </td>
                <td className="py-2.5 px-4 text-emerald-600 font-bold">
                  {quickPaybackMonths !== null ? (quickPaybackMonths <= 36 ? 'High Priority (< 3 Yrs)' : 'Standard Utility Recovery') : 'Calculate Interventions'}
                </td>
                <td className="py-2.5 px-4 font-sans">
                  {quickPaybackMonths !== null && quickPaybackMonths <= 36 ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Highly Feasible (≤36 Mos)
                    </span>
                  ) : (
                    <span className="text-indigo-700 font-semibold">
                      Economic Analysis Active
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-Side Comparison Modal */}
      <FeederComparisonModal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        feeder={feeder}
        existingSummary={existingSummary}
        proposedSummary={proposedSummary}
        activeTransformerKva={activeTransformerKva}
        activeInjectedVoltage={activeInjectedVoltage}
        activeConductors={activeConductors}
        activeCapacitors={activeCapacitors}
        activeLoadFactor={activeLoadFactor}
        bifurcationConfig={bifurcationConfig}
        quickCapexEstimate={quickCapexEstimate}
        quickPaybackMonths={quickPaybackMonths}
        tariff={tariff}
        onOpenCostEstimation={onOpenCostEstimation}
        onOpenPrintReport={onOpenPrintReport}
      />
    </div>
  );
};
