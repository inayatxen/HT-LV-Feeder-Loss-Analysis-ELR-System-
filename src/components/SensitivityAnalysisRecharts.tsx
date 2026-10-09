/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  LineChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine,
  ReferenceDot
} from 'recharts';
import { 
  FeederData, 
  FeederAnalysisSummary, 
  BifurcationConfig 
} from '../types/feeder';
import { calculateFeederAnalysis } from '../utils/elrEngine';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  SlidersHorizontal, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';

export interface GrowthScenario {
  id: string;
  name: string;
  growthRate: number; // in percent, e.g. 2.0, 5.0, 7.5, 10.0
  description: string;
  color: string;
}

export const DEFAULT_GROWTH_SCENARIOS: GrowthScenario[] = [
  { id: 'zero', name: 'Zero Growth (0%)', growthRate: 0.0, description: 'Static baseline without load growth', color: '#94a3b8' },
  { id: 'low', name: 'Low / Rural (2.0%)', growthRate: 2.0, description: 'Slow consumer addition in agricultural areas', color: '#38bdf8' },
  { id: 'std', name: 'WAPDA Standard (5.0%)', growthRate: 5.0, description: 'Official distribution planning benchmark', color: '#f59e0b' },
  { id: 'high', name: 'Fast Urban (7.5%)', growthRate: 7.5, description: 'Rapid housing & commercial expansion', color: '#ec4899' },
  { id: 'ind', name: 'Industrial Boom (10.0%)', growthRate: 10.0, description: 'Heavy continuous industrial load growth', color: '#8b5cf6' }
];

interface SensitivityAnalysisRechartsProps {
  feeder: FeederData;
  activeConductors: Record<string, string>;
  activeCapacitors: Record<string, number>;
  activeTransformerKva: number;
  activeInjectedVoltage?: number;
  activeLoadFactor?: number;
  onSetLoadFactor?: (lf: number) => void;
  bifurcationConfig: BifurcationConfig;
  existingSummary: FeederAnalysisSummary;
  proposedSummary: FeederAnalysisSummary;
}

export const SensitivityAnalysisRecharts: React.FC<SensitivityAnalysisRechartsProps> = ({
  feeder,
  activeConductors,
  activeCapacitors,
  activeTransformerKva,
  activeInjectedVoltage,
  activeLoadFactor,
  onSetLoadFactor,
  bifurcationConfig,
  existingSummary,
  proposedSummary
}) => {
  // Active selected growth scenario
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('std');
  const [customGrowthRate, setCustomGrowthRate] = useState<number>(feeder.annualGrowthRatePercent || 5.0);
  const [useCustomGrowth, setUseCustomGrowth] = useState<boolean>(false);
  
  // Horizon year (Year 1, 3, or 5)
  const [horizonYear, setHorizonYear] = useState<number>(5);
  
  // Visualization Mode:
  // 'compare': Baseline vs Proposed Upgraded System (with shaded savings area and target ceiling)
  // 'multi_growth': Multi-Growth Scenarios Overlay (plots multiple growth rates simultaneously)
  // 'savings': Net Energy Saved (kWh) & Monetary Benefit (Rs.) across Load Factor
  const [visMode, setVisMode] = useState<'compare' | 'multi_growth' | 'savings'>('compare');

  // Loss reduction target (e.g. 15% standard WAPDA / NEPRA target)
  const [targetReductionPercent, setTargetReductionPercent] = useState<number>(15.0);

  const tariff = feeder.tariffPerKwh || 24.83;

  // Active operating load factor
  const currentLf = activeLoadFactor !== undefined 
    ? Math.min(1.0, Math.max(0.5, activeLoadFactor)) 
    : (feeder.loadFactor ? Math.min(1.0, Math.max(0.5, feeder.loadFactor)) : 0.60);

  // Active growth rate for single-scenario views
  const activeGrowthRate = useCustomGrowth 
    ? customGrowthRate 
    : (DEFAULT_GROWTH_SCENARIOS.find(s => s.id === selectedScenarioId)?.growthRate ?? 5.0);

  // 11 discrete Load Factor points from 0.50 to 1.00 in steps of 0.05
  const loadFactorPoints = useMemo(() => [
    0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1.00
  ], []);

  // 1. Data for Mode 1: Baseline vs Proposed at activeGrowthRate
  const chartDataSingle = useMemo(() => {
    return loadFactorPoints.map((lf) => {
      const lfLabel = lf.toFixed(2);
      const llf = Number((0.2 * lf + 0.8 * Math.pow(lf, 2)).toFixed(4));

      // Calculate baseline
      const baseResult = calculateFeederAnalysis(feeder, {
        loadFactorOverride: lf,
        annualGrowthRate: activeGrowthRate / 100,
        growthYears: horizonYear
      });

      // Calculate proposed upgraded system
      const propResult = calculateFeederAnalysis(feeder, {
        customConductors: activeConductors,
        customCapacitors: activeCapacitors,
        transformerOverrideKva: activeTransformerKva,
        voltageOverride: activeInjectedVoltage,
        loadFactorOverride: lf,
        annualGrowthRate: activeGrowthRate / 100,
        growthYears: horizonYear,
        bifurcation: bifurcationConfig
      });

      const baseKwh = baseResult.annualEnergyLossKwh;
      const propKwh = propResult.annualEnergyLossKwh;
      const savedKwh = Math.max(0, baseKwh - propKwh);
      const reductionPercent = baseKwh > 0 ? Number(((savedKwh / baseKwh) * 100).toFixed(1)) : 0;
      const targetAllowedKwh = Math.round(baseKwh * (1 - targetReductionPercent / 100));
      const moneySaved = Math.round(savedKwh * tariff);
      const isTargetMet = reductionPercent >= targetReductionPercent;

      return {
        loadFactor: lf,
        loadFactorLabel: `${(lf * 100).toFixed(0)}% (${lfLabel})`,
        lfValue: lf,
        llf,
        baseKwh,
        propKwh,
        savedKwh,
        reductionPercent,
        targetAllowedKwh,
        moneySaved,
        isTargetMet,
        baseKw: baseResult.totalLineLossKw,
        propKw: propResult.totalLineLossKw
      };
    });
  }, [
    feeder, 
    loadFactorPoints, 
    activeGrowthRate, 
    horizonYear, 
    targetReductionPercent, 
    activeConductors, 
    activeCapacitors, 
    activeTransformerKva, 
    activeInjectedVoltage, 
    bifurcationConfig, 
    tariff
  ]);

  // 2. Data for Mode 2: Multi-Growth Scenarios Overlay
  const chartDataMultiGrowth = useMemo(() => {
    return loadFactorPoints.map((lf) => {
      const lfLabel = `${(lf * 100).toFixed(0)}% (${lf.toFixed(2)})`;
      const llf = Number((0.2 * lf + 0.8 * Math.pow(lf, 2)).toFixed(4));
      const point: Record<string, any> = {
        loadFactor: lf,
        loadFactorLabel: lfLabel,
        lfValue: lf,
        llf
      };

      DEFAULT_GROWTH_SCENARIOS.forEach(scenario => {
        const baseResult = calculateFeederAnalysis(feeder, {
          loadFactorOverride: lf,
          annualGrowthRate: scenario.growthRate / 100,
          growthYears: horizonYear
        });

        const propResult = calculateFeederAnalysis(feeder, {
          customConductors: activeConductors,
          customCapacitors: activeCapacitors,
          transformerOverrideKva: activeTransformerKva,
          voltageOverride: activeInjectedVoltage,
          loadFactorOverride: lf,
          annualGrowthRate: scenario.growthRate / 100,
          growthYears: horizonYear,
          bifurcation: bifurcationConfig
        });

        const baseKwh = baseResult.annualEnergyLossKwh;
        const propKwh = propResult.annualEnergyLossKwh;
        const savedKwh = Math.max(0, baseKwh - propKwh);

        point[`base_${scenario.id}`] = baseKwh;
        point[`prop_${scenario.id}`] = propKwh;
        point[`saved_${scenario.id}`] = savedKwh;
      });

      return point;
    });
  }, [
    feeder, 
    loadFactorPoints, 
    horizonYear, 
    activeConductors, 
    activeCapacitors, 
    activeTransformerKva, 
    activeInjectedVoltage, 
    bifurcationConfig
  ]);

  // KPI Point at active Load Factor
  const activeKpiPoint = useMemo(() => {
    // Find closest point or calculate exact
    const baseResult = calculateFeederAnalysis(feeder, {
      loadFactorOverride: currentLf,
      annualGrowthRate: activeGrowthRate / 100,
      growthYears: horizonYear
    });

    const propResult = calculateFeederAnalysis(feeder, {
      customConductors: activeConductors,
      customCapacitors: activeCapacitors,
      transformerOverrideKva: activeTransformerKva,
      voltageOverride: activeInjectedVoltage,
      loadFactorOverride: currentLf,
      annualGrowthRate: activeGrowthRate / 100,
      growthYears: horizonYear,
      bifurcation: bifurcationConfig
    });

    const baseKwh = baseResult.annualEnergyLossKwh;
    const propKwh = propResult.annualEnergyLossKwh;
    const savedKwh = Math.max(0, baseKwh - propKwh);
    const reductionPercent = baseKwh > 0 ? Number(((savedKwh / baseKwh) * 100).toFixed(1)) : 0;
    const moneySaved = Math.round(savedKwh * tariff);
    const isTargetMet = reductionPercent >= targetReductionPercent;
    const targetDelta = Number((reductionPercent - targetReductionPercent).toFixed(1));

    return {
      lf: currentLf,
      llf: Number((0.2 * currentLf + 0.8 * Math.pow(currentLf, 2)).toFixed(4)),
      baseKwh,
      propKwh,
      savedKwh,
      reductionPercent,
      moneySaved,
      isTargetMet,
      targetDelta,
      baseKw: baseResult.totalLineLossKw,
      propKw: propResult.totalLineLossKw
    };
  }, [
    feeder, 
    currentLf, 
    activeGrowthRate, 
    horizonYear, 
    targetReductionPercent, 
    activeConductors, 
    activeCapacitors, 
    activeTransformerKva, 
    activeInjectedVoltage, 
    bifurcationConfig, 
    tariff
  ]);

  // Closest label for ReferenceLine in Recharts
  const activeLfLabel = useMemo(() => {
    const closest = loadFactorPoints.reduce((prev, curr) => 
      Math.abs(curr - currentLf) < Math.abs(prev - currentLf) ? curr : prev
    );
    return `${(closest * 100).toFixed(0)}% (${closest.toFixed(2)})`;
  }, [currentLf, loadFactorPoints]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 mb-1">
            <Activity className="w-4 h-4" />
            <span>RECHARTS SENSITIVITY ENGINE</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Load Factor (X-Axis) vs Annual Energy Loss (Y-Axis)</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
              Year {horizonYear} Horizon
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Dynamic Recharts visualization demonstrating quadratic duty cycle growth (<code className="font-mono text-slate-700 font-bold">LF: 0.50 – 1.00</code>) across multiple interactive annual load growth scenarios.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setVisMode('compare')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              visMode === 'compare'
                ? 'bg-white text-sky-800 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Baseline vs Upgraded
          </button>
          <button
            type="button"
            onClick={() => setVisMode('multi_growth')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              visMode === 'multi_growth'
                ? 'bg-white text-sky-800 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Growth Scenarios Overlay
          </button>
          <button
            type="button"
            onClick={() => setVisMode('savings')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              visMode === 'savings'
                ? 'bg-white text-sky-800 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Energy Saved & PKR Return
          </button>
        </div>
      </div>

      {/* Interactive Growth Scenarios Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-slate-800">
              Select Annual Growth Scenario:
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500">Planning Horizon:</span>
            {[1, 3, 5].map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setHorizonYear(yr)}
                className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                  horizonYear === yr
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Yr {yr}
              </button>
            ))}
          </div>
        </div>

        {/* Growth Scenario Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {DEFAULT_GROWTH_SCENARIOS.map((sc) => {
            const isSelected = !useCustomGrowth && selectedScenarioId === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => {
                  setSelectedScenarioId(sc.id);
                  setUseCustomGrowth(false);
                }}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-sky-500 shadow-2xs ring-2 ring-sky-400/40'
                    : 'bg-white/80 border-slate-200 hover:bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{sc.name}</span>
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: sc.color }} 
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                  {sc.description}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Growth & Target Slider Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Custom Growth: <span className="font-mono font-bold text-amber-600">{customGrowthRate.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="15.0"
              step="0.5"
              value={customGrowthRate}
              onChange={(e) => {
                setCustomGrowthRate(parseFloat(e.target.value));
                setUseCustomGrowth(true);
              }}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Loss Target: <span className="font-mono font-bold text-emerald-700">{targetReductionPercent.toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="5.0"
              max="35.0"
              step="1.0"
              value={targetReductionPercent}
              onChange={(e) => setTargetReductionPercent(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
              activeKpiPoint.isTargetMet 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-rose-100 text-rose-800'
            }`}>
              {activeKpiPoint.isTargetMet ? '✓ TARGET MET' : '✗ SHORTFALL'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Ribbon at Active Operating Point */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-gradient-to-r from-sky-50/70 via-indigo-50/50 to-emerald-50/70 p-3 rounded-lg border border-sky-200">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Operating LF / LLF</span>
          <span className="text-sm font-bold font-mono text-slate-900">
            {(currentLf * 100).toFixed(0)}% <span className="text-xs font-normal text-slate-500">(LLF: {activeKpiPoint.llf})</span>
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-rose-600 block">Baseline Loss (Yr {horizonYear})</span>
          <span className="text-sm font-bold font-mono text-rose-950">
            {activeKpiPoint.baseKwh.toLocaleString()} <span className="text-[10px] font-normal text-rose-700">kWh/yr</span>
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-emerald-600 block">Proposed Loss (Yr {horizonYear})</span>
          <span className="text-sm font-bold font-mono text-emerald-950">
            {activeKpiPoint.propKwh.toLocaleString()} <span className="text-[10px] font-normal text-emerald-700">kWh/yr</span>
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-indigo-600 block">Net Energy Saved</span>
          <span className="text-sm font-bold font-mono text-indigo-950">
            {activeKpiPoint.savedKwh.toLocaleString()} <span className="text-[10px] font-bold text-indigo-700">({activeKpiPoint.reductionPercent}%)</span>
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-amber-600 block">Monetary Return</span>
          <span className="text-sm font-bold font-mono text-amber-950">
            Rs. {activeKpiPoint.moneySaved.toLocaleString()} <span className="text-[10px] font-normal text-amber-700">/ yr</span>
          </span>
        </div>
      </div>

      {/* RECHARTS PLOT CONTAINER */}
      <div className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner">
        {/* Plot Legend & Info Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 mb-3 border-b border-slate-800 pb-2 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold font-mono uppercase text-[11px]">
              {visMode === 'compare' && `Scenario: ${activeGrowthRate.toFixed(1)}% Annual Growth @ Year ${horizonYear}`}
              {visMode === 'multi_growth' && `Multi-Scenario Growth Overlay (0% to 10%) @ Year ${horizonYear}`}
              {visMode === 'savings' && `Net Savings Curve @ ${activeGrowthRate.toFixed(1)}% Annual Growth`}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] flex-wrap">
            {visMode === 'compare' && (
              <>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-3 h-1 bg-rose-500 rounded-sm" /> Baseline Energy Loss
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-1 bg-emerald-500 rounded-sm" /> Proposed Upgraded Loss
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-3 h-0.5 border-t border-amber-400 border-dashed" /> Target Ceiling ({targetReductionPercent}%)
                </span>
                <span className="flex items-center gap-1.5 text-sky-400">
                  <span className="w-3 h-0.5 border-t border-sky-400 border-dashed" /> Active LF
                </span>
              </>
            )}

            {visMode === 'multi_growth' && (
              <>
                {DEFAULT_GROWTH_SCENARIOS.map(s => (
                  <span key={s.id} className="flex items-center gap-1" style={{ color: s.color }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                ))}
              </>
            )}

            {visMode === 'savings' && (
              <>
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <span className="w-3 h-1 bg-indigo-500 rounded-sm" /> Energy Saved (kWh)
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-3 h-1 bg-amber-500 rounded-sm" /> Financial Return (Rs.)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Recharts Chart */}
        <div className="w-full h-[360px]">
          {visMode === 'compare' && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartDataSingle}
                margin={{ top: 20, right: 30, left: 15, bottom: 25 }}
              >
                <defs>
                  <linearGradient id="recSavingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="loadFactorLabel" 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  label={{ 
                    value: 'Operating Load Factor (LF) on X-Axis [0.50 – 1.00]', 
                    position: 'insideBottom', 
                    offset: -12, 
                    fill: '#cbd5e1', 
                    fontSize: 11,
                    fontFamily: 'monospace'
                  }}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`}
                  label={{ 
                    value: 'Annual Energy Loss (kWh/yr) on Y-Axis', 
                    angle: -90, 
                    position: 'insideLeft', 
                    offset: 0, 
                    fill: '#cbd5e1', 
                    fontSize: 11,
                    fontFamily: 'monospace'
                  }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 border border-sky-500/60 p-3 rounded-lg text-white font-mono text-xs shadow-xl space-y-1">
                          <div className="font-bold text-sky-400 border-b border-slate-700 pb-1 flex items-center justify-between gap-4">
                            <span>LF: {(d.lfValue * 100).toFixed(0)}% (LLF: {d.llf})</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] ${d.isTargetMet ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'}`}>
                              {d.isTargetMet ? '✓ TARGET MET' : '✗ SHORTFALL'}
                            </span>
                          </div>
                          <div className="text-rose-400">
                            • Baseline Loss: {d.baseKwh.toLocaleString()} kWh/yr ({d.baseKw.toFixed(1)} kW)
                          </div>
                          <div className="text-emerald-400">
                            • Proposed Loss: {d.propKwh.toLocaleString()} kWh/yr ({d.propKw.toFixed(1)} kW)
                          </div>
                          <div className="text-amber-400">
                            • Target Ceiling ({targetReductionPercent}%): {d.targetAllowedKwh.toLocaleString()} kWh/yr
                          </div>
                          <div className="text-indigo-300 font-bold pt-1 border-t border-slate-800">
                            • Energy Saved: {d.savedKwh.toLocaleString()} kWh ({d.reductionPercent}%)
                          </div>
                          <div className="text-amber-300">
                            • Annual Savings: Rs. {d.moneySaved.toLocaleString()}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                
                {/* Target Allowed Loss Line */}
                <Line
                  type="monotone"
                  dataKey="targetAllowedKwh"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Target Ceiling Loss"
                />

                {/* Shaded Savings Area */}
                <Area
                  type="monotone"
                  dataKey="savedKwh"
                  fill="url(#recSavingsGrad)"
                  stroke="none"
                />

                {/* Baseline Energy Loss Line */}
                <Line
                  type="monotone"
                  dataKey="baseKwh"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f43f5e', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#f43f5e' }}
                  name="Baseline Energy Loss"
                />

                {/* Proposed Energy Loss Line */}
                <Line
                  type="monotone"
                  dataKey="propKwh"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#10b981' }}
                  name="Proposed Upgraded Loss"
                />

                {/* Active Load Factor Reference Line */}
                <ReferenceLine 
                  x={activeLfLabel} 
                  stroke="#38bdf8" 
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {visMode === 'multi_growth' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartDataMultiGrowth}
                margin={{ top: 20, right: 30, left: 15, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="loadFactorLabel" 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  label={{ 
                    value: 'Load Factor (LF) on X-Axis [0.50 – 1.00]', 
                    position: 'insideBottom', 
                    offset: -12, 
                    fill: '#cbd5e1', 
                    fontSize: 11,
                    fontFamily: 'monospace'
                  }}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`}
                  label={{ 
                    value: 'Annual Energy Loss (kWh/yr)', 
                    angle: -90, 
                    position: 'insideLeft', 
                    offset: 0, 
                    fill: '#cbd5e1', 
                    fontSize: 11,
                    fontFamily: 'monospace'
                  }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg text-white font-mono text-xs shadow-xl space-y-1.5">
                          <div className="font-bold text-sky-400 border-b border-slate-800 pb-1">
                            Load Factor: {d.loadFactorLabel} (LLF: {d.llf})
                          </div>
                          {DEFAULT_GROWTH_SCENARIOS.map(sc => (
                            <div key={sc.id} className="flex items-center justify-between gap-4 text-[11px]" style={{ color: sc.color }}>
                              <span>• {sc.name}:</span>
                              <span className="font-bold">
                                Base: {(d[`base_${sc.id}`] || 0).toLocaleString()} kWh | Prop: {(d[`prop_${sc.id}`] || 0).toLocaleString()} kWh
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Render lines for each growth scenario */}
                {DEFAULT_GROWTH_SCENARIOS.map((sc) => (
                  <Line
                    key={sc.id}
                    type="monotone"
                    dataKey={`prop_${sc.id}`}
                    stroke={sc.color}
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: sc.color }}
                    name={sc.name}
                  />
                ))}

                <ReferenceLine 
                  x={activeLfLabel} 
                  stroke="#38bdf8" 
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {visMode === 'savings' && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartDataSingle}
                margin={{ top: 20, right: 30, left: 15, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="loadFactorLabel" 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  label={{ 
                    value: 'Load Factor (LF) on X-Axis [0.50 – 1.00]', 
                    position: 'insideBottom', 
                    offset: -12, 
                    fill: '#cbd5e1', 
                    fontSize: 11,
                    fontFamily: 'monospace'
                  }}
                />
                <YAxis 
                  yAxisId="kwh"
                  stroke="#818cf8" 
                  tick={{ fill: '#818cf8', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`}
                  label={{ 
                    value: 'Energy Saved (kWh/yr)', 
                    angle: -90, 
                    position: 'insideLeft', 
                    offset: 0, 
                    fill: '#818cf8', 
                    fontSize: 11,
                    fontFamily: 'monospace'
                  }}
                />
                <YAxis 
                  yAxisId="money"
                  orientation="right"
                  stroke="#fbbf24" 
                  tick={{ fill: '#fbbf24', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `Rs.${(val / 1000).toFixed(0)}k`}
                  label={{ 
                    value: 'Annual Financial Return (PKR)', 
                    angle: 90, 
                    position: 'insideRight', 
                    offset: 0, 
                    fill: '#fbbf24', 
                    fontSize: 11,
                    fontFamily: 'monospace'
                  }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-indigo-500/50 p-3 rounded-lg text-white font-mono text-xs shadow-xl space-y-1">
                          <div className="font-bold text-indigo-400 border-b border-slate-700 pb-1">
                            LF: {(d.lfValue * 100).toFixed(0)}% | LLF: {d.llf}
                          </div>
                          <div className="text-indigo-300 font-bold">
                            • Energy Saved: {d.savedKwh.toLocaleString()} kWh/yr ({d.reductionPercent}%)
                          </div>
                          <div className="text-amber-300 font-bold">
                            • Financial Benefit: Rs. {d.moneySaved.toLocaleString()} / yr
                          </div>
                          <div className="text-slate-400 text-[10px]">
                            @ Rs. {tariff.toFixed(2)} per kWh tariff
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  yAxisId="kwh"
                  type="monotone"
                  dataKey="savedKwh"
                  stroke="#818cf8"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#818cf8' }}
                  name="Energy Saved (kWh)"
                />
                <Line
                  yAxisId="money"
                  type="monotone"
                  dataKey="moneySaved"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#f59e0b' }}
                  name="Financial Return (Rs)"
                />
                <ReferenceLine 
                  yAxisId="kwh"
                  x={activeLfLabel} 
                  stroke="#38bdf8" 
                  strokeDasharray="3 3"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Interactive Load Factor Quick Adjuster within Component */}
      {onSetLoadFactor && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-sky-600" />
            <span className="font-bold text-slate-800">
              Interactive Load Factor Adjuster (0.50 – 1.00):
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[0.50, 0.60, 0.70, 0.80, 0.90, 1.00].map((lf) => {
              const isSelected = Math.abs(currentLf - lf) < 0.02;
              return (
                <button
                  key={lf}
                  type="button"
                  onClick={() => onSetLoadFactor(lf)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-sky-600 text-white shadow-2xs scale-105'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  LF {lf.toFixed(2)} ({(lf * 100).toFixed(0)}%)
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
